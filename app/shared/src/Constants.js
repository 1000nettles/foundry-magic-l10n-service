module.exports = class Constants {
  /**
   * The base level language code that we should be translating FROM.
   *
   * @return {string}
   */
  static get BASE_LANGUAGE_CODE() {
    return 'en';
  }

  static get AWS_REGION() {
    return 'us-east-1';
  }

  static get AWS_S3_BUCKET_NAME() {
    const bucketName =  process.env?.BUCKET;

    if (!bucketName) {
      throw new Error('Could not retrieve the AWS S3 bucket name from environment vars');
    }

    return bucketName;
  }

  static get AWS_S3_API_VERSION() {
    return '2006-03-01';
  }

  /**
   * The target languages that we should be generating translations for.
   *
   * @return {[{code: string, name: string}, {code: string, name: string}]}
   */
  static get TARGET_LANGUAGES() {
    return [
      { code: 'ar', foundryCode: 'ar', name: 'Arabic' },
      { code: 'zh', foundryCode: 'cn', name: '中文 (Chinese)' },
      //{ code: 'zh-TW', name: 'Chinese (Traditional)' },
      //{ code: 'cs', name: 'Czech' },
      { code: 'en', foundryCode: 'en', name: 'English' },
      //{ code: 'fi', name: 'Finnish' },
      { code: 'fr', foundryCode: 'fr', name: 'Français' },
      { code: 'de', foundryCode: 'de', name: 'Deutsch (German)' },
      { code: 'it', foundryCode: 'it', name: 'Italian' },
      { code: 'ja', foundryCode: 'ja', name: '日本語 (Japanese)' },
      { code: 'ko', foundryCode: 'ko', name: '한국어 (Korean)' },
      //{ code: 'pl', name: 'Polish' },
      { code: 'pt', foundryCode: 'pt-BR', name: 'Português (Brasil)' },
      { code: 'ru', foundryCode: 'ru', name: 'русский (Russian)' },
      { code: 'es', foundryCode: 'es', name: 'Español' },
      //{ code: 'sv', name: 'Swedish' },
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
   * The filename of the "source batch" HTML file.
   *
   * @return {string}
   */
  static get SOURCE_BATCH_FILENAME() {
    return 'sourcebatch.html';
  }

  /**
   * The directory for the batch files.
   *
   * @return {string}
   */
  static get BATCH_FILES_DIR() {
    return 'batchFiles';
  }

  /**
   * The DDB table name.
   *
   * @return {string}
   */
  static get DDB_TABLE_NAME() {
    return 'FoundryMagicL10n';
  }

  /**
   * The newline separator for our batch file text file. Necessary to split
   * the source text this way so the translations don't intermingle.
   *
   * @return {string}
   */
  static get BATCH_NEWLINE_SEPARATOR() {
    return '<span translate="no">SEPARATOR</span>';
  }

  /**
   * The max number of translation batch jobs threshold.
   *
   * Do not add more translation jobs if there is more jobs than this number.
   *
   * @return {number}
   */
  static get MAX_RUNNING_TRANSLATIONS_THRESHOLD() {
    return 1;
  }

  /**
   * The value when a batch file has been completed for processing.
   *
   * @return {string}
   */
  static get AWS_TRANSLATE_BATCH_COMPLETE() {
    return 'COMPLETED';
  }

  /**
   * The value when a batch file is still in progress.
   *
   * @return {string}
   */
  static get AWS_TRANSLATE_BATCH_IN_PROGRESS() {
    return 'IN_PROGRESS';
  }

  static get JOB_PROCESSING() {
    return 'PROCESSING';
  }

  static get JOB_COMPLETE() {
    return 'COMPLETE';
  }
}
