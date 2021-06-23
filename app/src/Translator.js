'use strict';

const AWS = require('aws-sdk');
const Constants = require('./Constants');

/**
 * A class to execute the actual translation of strings.
 */
module.exports = class Translator {

  constructor() {
    AWS.config.update({ region: 'us-east-1' });
    this.awsTranslate = new AWS.Translate();
  }

  /**
   * Translate a list of Foundry translations to a list of target translations.
   *
   * @param {array} translations
   *   A list of Foundry translation contents.
   * @param {array} toTranslate
   *   A list of language codes to translate too.
   *
   * @return {Promise<*[]>}
   *   A promise containing the final translations.
   */
  async translate(translations, toTranslate) {
    const baseTranslation = this._getBaseTranslation(translations);
    let finalTranslations = {};

    for (const language of toTranslate) {
      for (const entry of Object.entries(baseTranslation.content)) {
        finalTranslations[language] = finalTranslations[language] || {};
        const [stringId, text] = entry;
        finalTranslations[language][stringId] = await this._getAWSTranslation(
          baseTranslation.lang,
          language,
          text
        );

        break;
      }
    }

    console.log(finalTranslations);

    return finalTranslations;
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
