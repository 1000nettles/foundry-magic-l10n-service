'use strict';

const AWS = require('aws-sdk');
const Constants = require('./Constants');

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
  constructor(ddbCoordinator) {
    AWS.config.update({ region: 'us-east-1' });
    this.awsTranslate = new AWS.Translate();
    this.ddbCoordinator = ddbCoordinator;
  }

  /**
   * Translate a list of Foundry translations to a list of target translations.
   *
   * @param {array} translations
   *   A list of Foundry translation contents.
   * @param {array} toTranslate
   *   A list of language codes to translate too.
   *
   * @return {Promise<{finalTranslations: {}, ddbRecords: *[]}>}
   *   A promise containing the final translations and DynamoDB records.
   */
  async translate(translations, toTranslate) {
    const baseTranslation = this._getBaseTranslation(translations);
    let finalTranslations = {};
    let ddbRecords = [];

    for (const target of toTranslate) {
      for (const entry of Object.entries(baseTranslation.content)) {
        let translated;
        finalTranslations[target] = finalTranslations[target] || {};
        const [stringId, text] = entry;

        // Check first if we have the translation already stored.
        // If we have it stored, just return it.
        const storedTranslation = await this.ddbCoordinator.get(target, text);
        if (Object.keys(storedTranslation).length > 0) {
          finalTranslations[target][stringId] = storedTranslation.Item.TargetText;

          // This `break` is for testing purposes so we don't run out of
          // AWS Translate bandwidth.
          break;
        }

        translated = await this._getAWSTranslation(
          baseTranslation.lang,
          target,
          text
        );

        finalTranslations[target][stringId] = translated;

        ddbRecords.push({
          Source: Constants.BASE_LANGUAGE_CODE,
          SourceText: text,
          Target: target,
          TargetText: translated,
        });

        // This `break` is for testing purposes so we don't run out of
        // AWS Translate bandwidth.
        break;
      }
    }

    return { finalTranslations, ddbRecords };
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
