'use strict';

const DDBCoordinator = require('./DDBCoordinator');
const S3Coordinator = require('./S3Coordinator');
const TranslationExtractor = require('./TranslationExtractor');
const ManifestRetriever = require('./ManifestRetriever');
const ManifestValidator = require('./ManifestValidator');
const Translator = require('./Translator');
const { Constants } = require('shared');
const LanguagesFileGenerator = require('./LanguagesFileGenerator');

/**
 * A class to handle the orchestration of our localization.
 */
module.exports = class App {

  /**
   * Execute the main functionality of the application.
   *
   * @param {object} event
   *   An event passed from the lambda.
   *
   * @return {object}
   *   An HTTP response structured for the lambda.
   */
  async execute(event) {
    let manifestUrl;
    let manifest;
    let packageFile;
    let translations;
    let toTranslateTo;
    let translateResult;
    let finalTranslations;
    let ddbRecords;
    let fileBundle;
    let download;

    // Initialize our dependencies.
    const manifestRetriever = new ManifestRetriever();
    const manifestValidator = new ManifestValidator();
    const ddbCoordinator = new DDBCoordinator();
    const translationExtractor = new TranslationExtractor();
    const languagesFileGenerator = new LanguagesFileGenerator();

    // 1. Determine the manifest URL.
    try {
      manifestUrl = this._getManifestUrl(event);
    } catch (e) {
      return this._failureResponse(e.message);
    }

    // 2. Get the full manifest JSON.
    try {
      manifest = await manifestRetriever.retrieve(manifestUrl);
    } catch (e) {
      return this._failureResponse(e.message);
    }

    // 3. Ensure there's a valid `languages` section in the manifest.
    try {
      manifestValidator.validate(manifest);
    } catch (e) {
      return this._failureResponse(e.message);
    }

    // 4. Get and store the package zip.
    const s3Coordinator = new S3Coordinator(manifest.name);
    const translator = new Translator(ddbCoordinator, s3Coordinator);

    try {
      packageFile = await s3Coordinator.retrievePackage(manifest.download);
    } catch (e) {
      return this._failureResponse(`Could not retrieve package: ${e.message}`);
    }

    // 5. Extract the translations from the package, depending on which ones
    //    are listed in the manifest.
    try {
      translations = await translationExtractor
        .extract(packageFile, manifest.languages);
    } catch (e) {
      return this._failureResponse(
        `Could not extract translation files from module: ${e.message}`
      );
    }

    // 6. Compare translations to the target translations we want.
    try {
      toTranslateTo = this._getLanguagesToTranslateTo(translations);
    } catch (e) {
      return this._failureResponse(e.message);
    }

    // 7. Actually translate to the strings to the desired languages.
    try {
       translateResult = await translator.translate(
        translations,
        toTranslateTo,
        manifest.name,
      );
    } catch (e) {
      return this._failureResponse(
        `Could not translate via AWS Translate: ${e.message}`
      );
    }

    // For now, return early to only test the batching functionality.

    console.log(translateResult);
    return this._successResponse(translateResult);

    finalTranslations = translateResult.finalTranslations;
    ddbRecords = translateResult.ddbRecords;

    // 8. It's a valid case that we may not have any records to actually save
    // afterwards. This means that all translations are currently in DynamoDB.
    // Disable so we can test batching...
    /*if (ddbRecords.length) {
      try {
        await ddbCoordinator.save(ddbRecords);
      } catch (e) {
        return this._failureResponse(
          `Could not save data into Translations: ${e.message}`
        );
      }
    }*/

    // 9. Generate the new manifest with translation files.
    const newLanguages = languagesFileGenerator.generate(manifest, finalTranslations);
    console.log(newLanguages);

    console.log('final translations');
    console.log(finalTranslations);
    // 10. Save the new translation files to S3.
    try {
      fileBundle = await s3Coordinator.saveTranslationFiles(
        finalTranslations,
        newLanguages
      );
    } catch (e) {
      return this._failureResponse(
        `Could not save new translation files: ${e.message}`
      );
    }

    // 11. Create a new zip file with the translated files for download.
    try {
      download = await s3Coordinator.createZipFromTranslatedFiles(fileBundle);
    } catch (e) {
      return this._failureResponse(
        `Could not create final zip download bundle: ${e.message}`
      );
    }

    console.log(download);

    return this._successResponse(download);
  }

  /**
   * Get the passed manifest URL.
   *
   * @param {object} event
   *   The event from the lambda.
   *
   * @return {string}
   *   The manifest URL.
   *
   * @private
   */
  _getManifestUrl(event) {
    const manifestUrl = event?.queryStringParameters?.manifest_url;
    if (!manifestUrl) {
      throw new Error('No manifest URL defined in "manifest_url" query param');
    }

    return manifestUrl;
  }

  /**
   * Given existing languages within the module, which ones are missing for
   * us to translate to?
   *
   * @param {array} translations
   *   An array of FoundryVTT translations.
   *
   * @return {array}
   *   The array of languages to translate to.
   *
   * @private
   */
  _getLanguagesToTranslateTo(translations) {
    const toTranslateTo = Constants.TARGET_LANGUAGE_CODES.filter(target => {
      for (const translation of translations) {
        if (target === translation.lang) {
          return false;
        }
      }

      return true;
    });

    if (!toTranslateTo.length) {
      throw new Error('Cannot find any target translations to translate to');
    }

    return toTranslateTo;
  }

  _successResponse(jobsId) {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jobsId,
      }),
    };
  }

  _failureResponse(message) {
    console.warn(message);

    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
      body: message,
    };
  }

}
