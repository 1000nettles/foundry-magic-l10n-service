const { Constants } = require('shared');

/**
 * A class to generate a "languages" file.
 *
 * This file includes the JSON block that a module / system author will replace
 * in their `module.json` manifest file.
 */
module.exports = class LanguagesFileGenerator {

  /**
   * Generate the languages JSON content to later be placed in a file.
   *
   * @param {object} manifest
   *   The module / system manifest.
   * @param {object} translations
   * The generated translations.
   * @return {array}
   *   An array of "language" objects in the format of the `language` property
   *   in FoundryVTT.
   */
  generate(manifest, translations) {
    const languageTemplate = this._getLanguageTemplate(manifest);
    const baseLanguagePath = this._getBaseLanguagePath(languageTemplate);

    // Ensure to include our base level template back in the final languages
    // output.
    const finalLanguages = [languageTemplate];

    for (const entity of Object.entries(translations)) {
      const [ language ] = entity;

      // Don't re-add the base template.
      if (languageTemplate.code === language) {
        continue;
      }

      const targetLanguage = Constants.TARGET_LANGUAGES.find(
        targetLanguage => targetLanguage.code === language,
      );

      finalLanguages.push({
        lang: targetLanguage.code,
        name: targetLanguage.name,
        path: `${baseLanguagePath}/${targetLanguage.code}.json`,
      });
    }

    return finalLanguages;
  }

  /**
   * Get the base template of how a "languages" entry looks like in the
   * author's module / system.
   *
   * @param {object} manifest
   *   The manifest object.
   *
   * @return {object}
   *   The base language template.
   *
   * @private
   */
  _getLanguageTemplate(manifest) {
    const template = manifest.languages.find(
      language => language.lang === Constants.BASE_LANGUAGE_CODE
    );

    if (!template) {
      throw new Error('Cannot find base language within manifest `languages` section.');
    }

    return template;
  }

  /**
   * Get the base language path to compose other language file paths.
   *
   * @param {object} languageTemplate
   *   The base language template object.
   *
   * @return {string}
   *   The base language path.
   *
   * @private
   */
  _getBaseLanguagePath(languageTemplate) {
    let baseTranslationPath = languageTemplate.path.split('/');
    baseTranslationPath.pop();

    return baseTranslationPath.join('/');
  }

}
