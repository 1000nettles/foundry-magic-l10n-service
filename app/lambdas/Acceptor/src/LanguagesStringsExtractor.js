'use strict';

const AWS = require('aws-sdk');
const unzipper = require('unzipper');
const { Constants } = require('shared');

/**
 * Extract the languages strings from the specified package.
 */
module.exports = class LanguagesStringExtractor {

  constructor() {
    this.s3 = new AWS.S3({
      region: Constants.AWS_REGION,
      apiVersion: Constants.AWS_S3_API_VERSION,
    });
  }

  /**
   * Extract the languages strings from the package zip file.
   *
   * @param {string} pathToPackageZip
   *   The full path to the package zip living on S3.
   * @param {array} languages
   *   An array of Foundry manfiest language objects.
   *
   * @return {Promise<*[]>}
   *   A promise containing the language file contents.
   */
  async extract(pathToPackageZip, languages) {
    const translations = [];

    /**
     * Step 1: Get stream of the file to be extracted from the zip
     */
    await this.s3
      .getObject({ Bucket: Constants.AWS_S3_BUCKET_NAME, Key: pathToPackageZip })
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
