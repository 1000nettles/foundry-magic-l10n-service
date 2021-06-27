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
      { code: 'ar', name: 'Arabic' },
      { code: 'ca', name: 'Catalan' },
      { code: 'zh', name: 'Chinese (Simplified)' },
      { code: 'zh-TW', name: 'Chinese (Traditional)' },
      { code: 'cs', name: 'Czech' },
      { code: 'en', name: 'English' },
      { code: 'fi', name: 'Finnish' },
      { code: 'fr', name: 'French' },
      { code: 'de', name: 'German' },
      { code: 'it', name: 'Italian' },
      { code: 'ja', name: 'Japanese' },
      { code: 'ko', name: 'Korean' },
      { code: 'pl', name: 'Polish' },
      { code: 'pt', name: 'Portuguese' },
      { code: 'ru', name: 'Russian' },
      { code: 'es', name: 'Spanish' },
      { code: 'sv', name: 'Swedish' },
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
