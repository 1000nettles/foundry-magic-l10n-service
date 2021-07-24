import { TargetLanguage } from '../index';

export class Constants {
  /**
   * The base level language code that we should be translating FROM.
   */
  static get BASE_LANGUAGE_CODE(): string {
    return 'en';
  }

  static get AWS_REGION(): string {
    return 'us-east-1';
  }

  static get AWS_S3_BUCKET_NAME(): string {
    const bucketName =  process.env?.BUCKET;

    if (!bucketName) {
      throw new Error('Could not retrieve the AWS S3 bucket name from environment vars');
    }

    return bucketName;
  }

  /**
   * Get the S3 API version.
   * 
   * @returns {string}
   */
  static get AWS_S3_API_VERSION(): string {
    return '2006-03-01';
  }

  /**
   * The target languages that we should be generating translations for.
   */
  static get TARGET_LANGUAGES(): Array<TargetLanguage> {
    return [
      { code: 'ar', foundryCode: 'ar', name: 'Arabic' },
      { code: 'ca', foundryCode: 'ca', name: 'Català' },
      { code: 'zh', foundryCode: 'cn', name: '中文 (Chinese)' },
      { code: 'zh-TW', foundryCode: 'zh-tw', name: 'Chinese (Traditional)' },
      { code: 'cs', foundryCode: 'cs', name: 'Čeština' },
      { code: 'en', foundryCode: 'en', name: 'English' },
      // { code: 'fi', foundryCode: 'fi', name: 'Finnish' },
      { code: 'fr', foundryCode: 'fr', name: 'Français' },
      { code: 'de', foundryCode: 'de', name: 'Deutsch (German)' },
      { code: 'it', foundryCode: 'it', name: 'Italian' },
      { code: 'ja', foundryCode: 'ja', name: '日本語 (Japanese)' },
      { code: 'ko', foundryCode: 'ko', name: '한국어 (Korean)' },
      { code: 'pl', foundryCode: 'pl', name: 'Polski' },
      { code: 'pt', foundryCode: 'pt-BR', name: 'Português (Brasil)' },
      { code: 'ru', foundryCode: 'ru', name: 'русский (Russian)' },
      { code: 'es', foundryCode: 'es', name: 'Español' },
      { code: 'sv', foundryCode: 'sv', name: 'Swedish' },
    ];
  }

  /**
   * Get the target language codes, just as strings.
   *
   * @return {Array<string>}
   *   An array of all the target language codes as strings.
   */
  static get TARGET_LANGUAGE_CODES(): Array<string> {
    const codes: string[] = [];

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
  static get SOURCE_BATCH_FILENAME(): string {
    return 'sourcebatch.html';
  }

  /**
   * The directory for the batch files.
   *
   * @return {string}
   */
  static get BATCH_FILES_DIR(): string {
    return 'batchFiles';
  }

  /**
   * The DDB table name.
   *
   * @return {string}
   */
  static get DDB_TABLE_NAME(): string {
    return 'FoundryMagicL10n';
  }

  /**
   * The newline separator for our batch file text file. Necessary to split
   * the source text this way so the translations don't intermingle.
   *
   * @return {string}
   */
  static get BATCH_NEWLINE_SEPARATOR(): string {
    return '<span translate="no">SEPARATOR</span>';
  }

  /**
   * The max number of translation batch jobs threshold.
   *
   * Do not add more translation jobs if there is more jobs than this number.
   *
   * @return {number}
   */
  static get MAX_RUNNING_TRANSLATIONS_THRESHOLD(): number {
    return 1;
  }

  static get GENERATED_LANGUAGE_FILE_SUFFIX(): string {
    return '-magicl10n'
  }

  /**
   * The value when a batch file has been completed for processing.
   *
   * @return {string}
   */
  static get AWS_TRANSLATE_BATCH_COMPLETE(): string {
    return 'COMPLETED';
  }

  /**
   * The value when a batch file is still in progress.
   *
   * @return {string}
   */
  static get AWS_TRANSLATE_BATCH_IN_PROGRESS(): string {
    return 'IN_PROGRESS';
  }

  /**
   * The constant when the job is processing.
   *
   * @return {string}
   */
  static get JOB_PROCESSING(): string {
    return 'PROCESSING';
  }

  /**
   * The constant when the job is complete.
   *
   * @return {string}
   */
  static get JOB_COMPLETE(): string {
    return 'COMPLETE';
  }
}
