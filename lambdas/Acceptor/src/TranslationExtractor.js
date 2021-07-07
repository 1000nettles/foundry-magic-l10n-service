'use strict';

const AWS = require('aws-sdk');
const unzipper = require('unzipper');

/**
 * Extract the translations from the specified package.
 */
module.exports = class TranslationExtractor {

  constructor() {
    this.bucketName = 'foundry-magic-l18n';
  }

  /**
   * Extract the translation files contents.
   *
   * @param {string} pathToPackageZip
   *   The full path to the package zip living on S3.
   * @param {array} languages
   *   An array of language objects from the manifest.
   *
   * @return {Promise<*[]>}
   *   A promise containing the language file contents.
   */
  async extract(pathToPackageZip, languages) {
    const s3 = new AWS.S3({ apiVersion: '2006-03-01' });
    const translations = [];

    /**
     * Step 1: Get stream of the file to be extracted from the zip
     */
    await s3
      .getObject({ Bucket: this.bucketName, Key: pathToPackageZip })
      .createReadStream()
      .pipe(
        unzipper.Parse()
      ).on('entry', async (entry) => {
        // Determine if the current iterating file is one of the language
        // files.
        const language = languages.find(language => language.path === entry.path);
        if (language === undefined) {
          entry.autodrain();
          return;
        }

        let content = await entry.buffer();

        translations.push({
          lang: language.lang,
          content: JSON.parse(content.toString('utf-8')),
        });

        entry.autodrain();
      })
      .promise();

    return translations;
  }

}
