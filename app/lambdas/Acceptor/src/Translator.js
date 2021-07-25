const { config, Translate } = require('aws-sdk');
const { Constants } = require('shared');

/**
 * A class to execute the actual translation of strings.
 */
module.exports = class Translator {
  /**
   * Translator constructor.
   *
   * @param {import("./DDBCoordinator")} ddbCoordinator
   * @param {import("./S3Coordinator")} s3Coordinator
   * @param {string} masterJobId A UUID representing the master job.
   */
  constructor(ddbCoordinator, s3Coordinator, masterJobId) {
    config.update({ region: 'us-east-1', maxRetries: 5 });

    /**
     * Our AWS Translate instance.
     *
     * @type {import('aws-sdk').Translate}
     */
    this.awsTranslate = new Translate();
    this.ddbCoordinator = ddbCoordinator;
    this.s3Coordinator = s3Coordinator;

    this.masterJobId = masterJobId;
  }

  /**
   *
   * @return {Promise<Translate.TextTranslationJobProperties[]|*[]>}
   */
  async getRunningTranslations() {
    const params = {
      Filter: {
        JobStatus: Constants.AWS_TRANSLATE_BATCH_IN_PROGRESS,
      },
    };

    const listedTextTranslationJobs = await this
      .awsTranslate
      .listTextTranslationJobs(params)
      .promise();

    if (!listedTextTranslationJobs?.TextTranslationJobPropertiesList) {
      return [];
    }

    return listedTextTranslationJobs?.TextTranslationJobPropertiesList;
  }

  /**
   * Translate a list of Foundry translations to a list of target translations.
   *
   * @param {import('./types/main').LanguagesStrings[]} languagesStrings
   *   A list of Foundry translation contents.
   * @param {string[]} toTranslate
   *   A list of language codes to translate too.
   * @param {object} manifest
   *   The full module manifest object.
   *
   * @return {Promise}
   *   A promise containing the result of the batch job execution. This is
   *   NOT the completion of the batch itself.
   */
  async translate(languagesStrings, toTranslate, manifest) {
    // TODO: if all translations are already stored, exit here and return
    // all the stored translations.

    const ddbJobs = [];

    for (const target of toTranslate) {
      const batchFileContent = await this._getBatchFileContent(target, languagesStrings);

      // If we have no content, do not create a translation file and start
      // the translation job. This may mean that there already exists a
      // translation file with all the applicable translations.
      if (!batchFileContent) {
        continue;
      }

      await this.s3Coordinator.saveBatchFile(batchFileContent, target);

      // We need our job name to be our ID so we can `list` later.
      const jobName = this.masterJobId;
      const params = {
        ClientToken: this.masterJobId,
        DataAccessRoleArn: process.env.ROLE_ARN,
        InputDataConfig: {
          ContentType: 'text/html',
          S3Uri: `s3://${process.env.BUCKET}/${this.s3Coordinator.getBatchFilesPackageInputDir()}/${target}/`,
        },
        OutputDataConfig: {
          S3Uri: `s3://${process.env.BUCKET}/${this.s3Coordinator.getBatchFilesPackageOutputDir()}/${target}`,
        },
        SourceLanguageCode: Constants.BASE_LANGUAGE_CODE,
        TargetLanguageCodes: [target],
        JobName: jobName,
        ParallelDataNames: [`en_to_${target}`],
      };

      /* eslint-disable no-await-in-loop */
      const batchResult = await this.awsTranslate.startTextTranslationJob(params).promise();

      ddbJobs.push({
        source: Constants.BASE_LANGUAGE_CODE,
        target,
        jobName,
        jobId: batchResult.JobId,
      });
    }

    return this.ddbCoordinator.saveTranslationJob(ddbJobs, this.masterJobId, manifest);
  }

  /**
   * Hydrate the batch file content with source text for later processing.
   *
   * @param {string} targetLanguage The target language code
   * @param {import('./types/main').LanguagesStrings[]} languagesStrings
   *   An array of the source languages strings that we want to include.
   *
   * @return {Promise<string>}
   *   The batch content in plain text as a string.
   *
   * @private
   */
  async _getBatchFileContent(targetLanguage, languagesStrings) {
    const baseLanguagesStrings = this._getBaseLanguagesStrings(languagesStrings);

    const languagesStringIdsToTranslate = this._getLanguagesStringIdsToTranslate(
      targetLanguage,
      languagesStrings,
    );

    const openingSpanTag = '<span translate="no">';
    const closingSpanTag = '</span>';
    let batchContent = '';

    for (const stringId of languagesStringIdsToTranslate) {
      // Don't translate a string that has already been translated by human
      // translation.
      const text = baseLanguagesStrings.content?.[stringId];

      // If the module developer has put in a blank string or object, just
      // continue.
      if (
        !text
        || typeof text !== 'string'
      ) {
        continue;
      }

      // Check first if we have the translation already stored.
      // If we have it stored, don't include it in our batch file.
      // const exists = await this.ddbCoordinator.exists(text);
      const exists = false;

      // Ensure dynamically injected string vars (contained in { }) are not
      // translated by AWS.
      const finalText = text.replace(/{([^}]+)}/g, (match) => openingSpanTag + match + closingSpanTag);

      if (!exists) {
        batchContent += `${openingSpanTag
          + stringId
          + closingSpanTag
        }<p>${
          finalText
        }</p>`
          + `\n\n${
            Constants.BATCH_NEWLINE_SEPARATOR
          }\n\n`;
      }
    }

    return batchContent;
  }

  /**
   * Get the base level languages strings to translate from.
   *
   * @param {import('./types/main').LanguagesStrings[]} languagesStrings
   *   An array of languages strings objects.
   *
   * @return {import('./types/main').LanguagesStrings}
   *
   * @private
   */
  _getBaseLanguagesStrings(languagesStrings) {
    const base = languagesStrings.find(
      (currentLanguagesStrings) => currentLanguagesStrings.lang === Constants.BASE_LANGUAGE_CODE,
    );

    if (!base) {
      throw new Error(
        `Base language code ${Constants.BASE_LANGUAGE_CODE} could not be found in the languages strings list`,
      );
    }

    return base;
  }

  /**
   * Get the languages string IDs to translate.
   * 
   * If there are existing translation files, it will ignore the existing
   * translations / string IDs.
   * 
   * @param {string} targetLanguage The target language code
   * @param {import('./types/main').LanguagesStrings[]} languagesStrings
   *   An array of the source languages strings that we want to include.
   *
   * @returns {array}
   * 
   * @private
   */
  _getLanguagesStringIdsToTranslate(targetLanguage, languagesStrings) {
    const baseLanguagesStrings = this._getBaseLanguagesStrings(languagesStrings);
    const targetLanguagesStrings = languagesStrings.find(
      (targetLanguagesStrings) => targetLanguagesStrings.lang === targetLanguage,
    );
    
    if (targetLanguagesStrings) {
      const targetLanguagesStringsKeys = Object.keys(targetLanguagesStrings.content);

      // Get all the keys of string IDs we want to translate. AKA, any languages
      // strings that do not exist in the existing target translation file.
      return Object.keys(baseLanguagesStrings.content)
        .filter(value => !targetLanguagesStringsKeys.includes(value));
    }

    return Object.keys(baseLanguagesStrings.content);
  }

  /**
   * Get the AWS Translate result for our target text.
   *
   * @param {string} source
   *   The source language code. (The language to translate FROM.)
   * @param {string} target
   *   The target language code. (The language to translate TO.)
   * @param {string} text
   *   The text to translate.
   *
   * @return {Promise<string>}
   *   A promise containing the final translated string.
   *
   * @private
   */
  async _getAWSTranslation(source, target, text) {
    let finalTranslation;

    const params = {
      SourceLanguageCode: source,
      TargetLanguageCode: target,
      Text: text,
    };

    await this.awsTranslate.translateText(params, (err, data) => {
      if (err) {
        throw new Error(
          `Error translating "${params.Text}" to ${params.TargetLanguageCode}: ${err.code} - ${err.message}`,
        );
      }

      finalTranslation = data.TranslatedText;
    }).promise();

    return finalTranslation;
  }
};
