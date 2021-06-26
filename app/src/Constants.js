module.exports = class Constants {
  /**
   * The base level language code that we should be translating FROM.
   *
   * @return {string}
   */
  static get BASE_LANGUAGE_CODE() {
    return 'en';
  }

  /**
   * The target languages that we should be generating translations for.
   *
   * @return {[{code: string, name: string}, {code: string, name: string}]}
   */
  static get TARGET_LANGUAGES() {
    return [
      { code: 'en', name: 'English' },
      { code: 'cs', name: 'Czech' },
      { code: 'fr', name: 'French' },
      { code: 'cy', name: 'Welsh' },
    ];
  }

  /**
   * Get the target language codes, just as strings.
   *
   * @return {*[]}
   *   An array of all the target language codes as strings.
   */
  static get TARGET_LANGUAGE_CODES() {
    const codes = [];

    Constants.TARGET_LANGUAGES.forEach(targetLanguage => {
      codes.push(targetLanguage.code);
    });

    return codes;
  }

  /**
   * The table name of the Translations table.
   *
   * @return {string}
   */
  static get TRANSLATIONS_TABLE_NAME() {
    return 'Translations';
  }
}
