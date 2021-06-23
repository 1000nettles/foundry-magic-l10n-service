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
   * @return {string[]}
   */
  static get TARGET_LANGUAGES() {
    return [
      'en',
      'fr',
    ];
  }
}
