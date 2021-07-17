const { S3 } = require('aws-sdk');
const unzipper = require('unzipper');
const flatten = require('flat');
const { Constants } = require('shared');

/**
 * Extract the languages strings from the specified package.
 */
module.exports = class LanguagesStringsExtractor {
  constructor() {
    /**
     * Our AWS S3 instance.
     *
     * @type {import('aws-sdk').S3}
     */
    this.s3 = new S3({
      region: Constants.AWS_REGION,
      apiVersion: Constants.AWS_S3_API_VERSION,
    });
  }

  /**
   * Extract the languages strings from the package zip file.
   *
   * @param {string} pathToPackageZip
   *   The full path to the package zip living on S3.
   * @param {import('shared').FoundryManifestLanguage[]} languages
   *   An array of Foundry manifest language objects.
   *
   * @return {Promise<import('./types/main').LanguagesStrings[]>}
   *   A promise containing the language file contents.
   */
  async extract(pathToPackageZip, languages) {
    /**
     * Our final collected languages strings.
     *
     * @type {import('./types/main').LanguagesStrings[]}
     */
    const languagesStrings = [];

    /**
     * Step 1: Get stream of the file to be extracted from the zip
     */
    await this.s3
      .getObject({ Bucket: Constants.AWS_S3_BUCKET_NAME, Key: pathToPackageZip })
      .createReadStream()
      .pipe(
        unzipper.Parse(),
      ).on('entry', async (entry) => {
        // Determine if the current iterating file is one of the language
        // files. Language files are placed in relation to where the module.json
        // or system.json file is located, so to keep things simple let's ensure
        // that the language path is CONTAINED within the full entry path. This
        // saves us from needing to first locate where the module.json file is.
        const language = languages.find((foundLanguage) => {
          const sanitizedLangPath = foundLanguage.path.replace('./', '');
          return entry.path.includes(sanitizedLangPath);
        });

        if (language === undefined) {
          entry.autodrain();
          return;
        }

        let content = await entry.buffer();

        content = content.toString('utf-8').trim();

        try {
          content = JSON.parse(content);
        } catch (e) {
          throw new Error(`"${entry.path}" is not valid JSON`);
        }

        // Some language files use objects instead of a flattened structure.
        // Let's ensure our translation files are fully flattened.
        content = flatten(content);

        languagesStrings.push({
          lang: language.lang,
          content,
        });

        entry.autodrain();
      })
      .promise();

    return languagesStrings;
  }
};
