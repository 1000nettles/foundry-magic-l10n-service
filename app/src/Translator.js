'use strict';

const AWS = require('aws-sdk');
const Constants = require('./Constants');
const { v4: uuidv4 } = require('uuid');

/**
 * A class to execute the actual translation of strings.
 */
module.exports = class Translator {

  /**
   * Translator constructor.
   *
   * @param {DDBCoordinator} ddbCoordinator
   *   The injected DDBCoordinator instance.
   */
  constructor(ddbCoordinator, s3Coordinator) {
    AWS.config.update({ region: 'us-east-1', maxRetries: 5 });
    this.awsTranslate = new AWS.Translate();
    this.ddbCoordinator = ddbCoordinator;
    this.s3Coordinator = s3Coordinator;
  }

  /**
   * Translate a list of Foundry translations to a list of target translations.
   *
   * @param {array} translations
   *   A list of Foundry translation contents.
   * @param {array} toTranslate
   *   A list of language codes to translate too.
   * @param {string} moduleName
   *   The name of the module we're translating for.
   *
   * @return {Promise}
   *   A promise containing the result of the batch job execution. This is
   *   NOT the completion of the batch itself.
   */
  async translate(translations, toTranslate, moduleName) {
    const batchFileContent = await this._getBatchFileContent(translations);
    await this.s3Coordinator.saveBatchFile(batchFileContent);

    // TODO: if all translations are already stored, exit here and return
    // all the stored translations.

    let batchResults = [];

    for (const target of toTranslate) {
      const params = {
        ClientToken: uuidv4(),
        DataAccessRoleArn: process.env.ROLE_ARN,
        InputDataConfig: {
          ContentType: 'text/plain',
          S3Uri: `s3://${process.env.BUCKET}/${this.s3Coordinator.getBatchFilesPackageInputDir()}/`,
        },
        OutputDataConfig: {
          S3Uri: `s3://${process.env.BUCKET}/${this.s3Coordinator.getBatchFilesPackageOutputDir()}/`,
        },
        SourceLanguageCode: Constants.BASE_LANGUAGE_CODE,
        TargetLanguageCodes: [target],
        JobName: `${moduleName}-${target}-${Date.now()}`,
      };
      console.log(params);

      const batchResult = await this.awsTranslate.startTextTranslationJob(params).promise();
      console.log(batchResult);
      batchResults.push(batchResult);
    }

    return batchResults;
  }

  /**
   * Hydrate the batch file content with source text for later processing.
   *
   * @param {array} translations
   *   An array of the source translation texts that we want to include.
   *
   * @return {Promise<string>}
   *   The batch content in plain text as a string.
   *
   * @private
   */
  async _getBatchFileContent(translations) {
    const baseTranslation = this._getBaseTranslation(translations);

    let batchContent = '';
    for (const [ stringId, text ] of Object.entries(baseTranslation.content)) {
      // Check first if we have the translation already stored.
      // If we have it stored, don't include it in our batch file.
      const exists = await this.ddbCoordinator.exists(text);
      console.log(`${text} ${exists}`);
      if (!exists) {
        batchContent += text + "\n\n" + Constants.BATCH_NEWLINE_SEPARATOR + "\n\n";
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
      translation => translation.lang === Constants.BASE_LANGUAGE_CODE
    );

    if (!base) {
      throw new Error(
        `Base language code ${Constants.BASE_LANGUAGE_CODE} could not be found in the translations list`
      );
    }

    return base;
  }

  /**
   * Get the AWS Translate result for our target text.
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
      Text: text
    };

    await this.awsTranslate.translateText(params, (err, data) => {
      if (err) {
        throw new Error(
          `Error translating "${params.Text}" to ${params.TargetLanguageCode}: ${err.code} - ${err.message}`
        );
      }

      finalTranslation = data['TranslatedText'];
    }).promise();

    return finalTranslation;
  }

}
