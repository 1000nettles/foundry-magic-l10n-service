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
    const batchFileContent = await this._getBatchFileContent(languagesStrings);
    await this.s3Coordinator.saveBatchFile(batchFileContent);

    // TODO: if all translations are already stored, exit here and return
    // all the stored translations.

    const ddbJobs = [];

    for (const target of toTranslate) {
      // We need our job name to be our ID so we can `list` later.
      const jobName = this.masterJobId;
      const params = {
        ClientToken: this.masterJobId,
        DataAccessRoleArn: process.env.ROLE_ARN,
        InputDataConfig: {
          ContentType: 'text/html',
          S3Uri: `s3://${process.env.BUCKET}/${this.s3Coordinator.getBatchFilesPackageInputDir()}/`,
        },
        OutputDataConfig: {
          S3Uri: `s3://${process.env.BUCKET}/${this.s3Coordinator.getBatchFilesPackageOutputDir()}/`,
        },
        SourceLanguageCode: Constants.BASE_LANGUAGE_CODE,
        TargetLanguageCodes: [target],
        JobName: jobName,
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
   * @param {import('./types/main').LanguagesStrings[]} languagesStrings
   *   An array of the source languages strings that we want to include.
   *
   * @return {Promise<string>}
   *   The batch content in plain text as a string.
   *
   * @private
   */
  async _getBatchFileContent(languagesStrings) {
    const baseTranslation = this._getBaseTranslation(languagesStrings);
    const openingSpanTag = '<span translate="no">';
    const closingSpanTag = '</span>';
    let batchContent = '';

    for (const [stringId, text] of Object.entries(baseTranslation.content)) {
      // If the module developer has put in a blank string or object, just
      // continue.
      if (
        !stringId
        || typeof stringId !== 'string'
        || !text
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
   * Get the base level translation to translate from.
   *
   * @param {array} translations
   *   An array of translation objects.
   *
   * @return {object}
   *   The base translation object.
   *
   * @private
   */
  _getBaseTranslation(translations) {
    const base = translations.find(
      (translation) => translation.lang === Constants.BASE_LANGUAGE_CODE,
    );

    if (!base) {
      throw new Error(
        `Base language code ${Constants.BASE_LANGUAGE_CODE} could not be found in the translations list`,
      );
    }

    return base;
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
