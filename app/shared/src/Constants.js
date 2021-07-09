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
      { code: 'ar', name: 'Arabic' },
      { code: 'ca', name: 'Catalan' },
      /*{ code: 'zh', name: 'Chinese (Simplified)' },
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
      { code: 'sv', name: 'Swedish' },*/
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
   * The max number of translation batch jobs we can be running at a time.
   *
   * @return {number}
   */
  static get MAX_RUNNING_TRANSLATIONS() {
    return 4;
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
