'use strict';

const DDBCoordinator = require('./DDBCoordinator');
const S3Coordinator = require('./S3Coordinator');
const LanguagesStringsExtractor = require('./LanguagesStringsExtractor');
const ManifestRetriever = require('./ManifestRetriever');
const ManifestValidator = require('./ManifestValidator');
const Translator = require('./Translator');
const { Constants } = require('shared');
const { v4: uuidv4 } = require('uuid');

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
    let languagesStrings;
    let languagesToTranslateTo;

    // Initialize our dependencies.
    const masterJobId = uuidv4();

    const manifestRetriever = new ManifestRetriever();
    const manifestValidator = new ManifestValidator();
    const ddbCoordinator = new DDBCoordinator();
    const s3Coordinator = new S3Coordinator(masterJobId);
    const translator = new Translator(ddbCoordinator, s3Coordinator, masterJobId);
    const languagesStringsExtractor = new LanguagesStringsExtractor();

    // 1. Determine if other jobs are processing. If there's too many, reject
    //    the request for now.
    const runningTranslations = await translator.getRunningTranslations();
    if (runningTranslations.length >= Constants.MAX_RUNNING_TRANSLATIONS) {
      console.log('Too many jobs processing, returning busy response...');
      return this._busyResponse();
    }

    // 2. Determine the manifest URL.
    try {
      manifestUrl = this._getManifestUrl(event);
    } catch (e) {
      return this._failureResponse(e.message);
    }

    // 3. Get the full manifest JSON.
    try {
      manifest = await manifestRetriever.retrieve(manifestUrl);
    } catch (e) {
      return this._failureResponse(e.message);
    }

    // 4. Ensure there's a valid `languages` section in the manifest.
    try {
      manifestValidator.validate(manifest);
    } catch (e) {
      return this._failureResponse(e.message);
    }

    // 5. Get and store the package zip.
    try {
      packageFile = await s3Coordinator.retrievePackage(manifest.download);
    } catch (e) {
      return this._failureResponse(`Could not retrieve package: ${e.message}`);
    }

    // 6. Extract the languages strings from the package, depending on which
    //    ones are listed in the manifest.
    try {
      languagesStrings = await languagesStringsExtractor
        .extract(packageFile, manifest.languages);
    } catch (e) {
      return this._failureResponse(
        `Could not extract languages strings from module: ${e.message}`
      );
    }

    // 7. Compare translations to the target translations we want.
    try {
      languagesToTranslateTo = this._getLanguagesToTranslateTo(languagesStrings);
    } catch (e) {
      return this._failureResponse(e.message);
    }

    // 8. Actually translate to the strings to the desired languages.
    try {
       await translator.translate(
        languagesStrings,
        languagesToTranslateTo,
        manifest,
      );
    } catch (e) {
      return this._failureResponse(
        `Could not translate via AWS Translate: ${e.message}`
      );
    }

    // For now, return early to only test the batching functionality.
    console.log(masterJobId);
    return this._successResponse(masterJobId);
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
   * @param {array} languagesStrings
   *   An array of languages strings.
   *
   * @return {array}
   *   The array of languages to translate to.
   *
   * @private
   */
  _getLanguagesToTranslateTo(languagesStrings) {
    const languagesToTranslateTo = Constants.TARGET_LANGUAGE_CODES.filter(target => {
      for (const translation of languagesStrings) {
        if (target === translation.lang) {
          return false;
        }
      }

      return true;
    });

    if (!languagesToTranslateTo.length) {
      throw new Error('Cannot find any target languages to translate to');
    }

    return languagesToTranslateTo;
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

  _busyResponse() {
    return {
      statusCode: 429,
      headers: {
        'Content-Type': 'application/json',
      },
      body: 'Too many jobs are processing right now, sorry!',
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
