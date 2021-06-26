'use strict';

const DDBCoordinator = require('./DDBCoordinator');
const S3Coordinator = require('./S3Coordinator');
const TranslationExtractor = require('./TranslationExtractor');
const ManifestRetriever = require('./ManifestRetriever');
const ManifestValidator = require('./ManifestValidator');
const Translator = require('./Translator');
const Constants = require('./Constants');

/**
 * A class to handle the orchestration of our localization.
 */
module.exports = class App {

  async execute(event) {
    if (!event?.body) {
      return this._failureResponse(
        `No request body defined`
      );
    }

    let body;
    let manifest;
    let translations;
    let translateResult;
    let finalTranslations;
    let packageName;
    let ddbRecords;

    const ddbCoordinator = new DDBCoordinator();

    // 1. Get and validate the body of the request. Determine the manifest URL.
    try {
      body = JSON.parse(event.body);
    } catch (e) {
      return this._failureResponse(
        `Could not parse body. ${e.message}`
      );
    }

    if (!body || !body?.manifest_url) {
      return this._failureResponse('No manifest URL defined');
    }

    // 2. Get the full manifest JSON.
    const manifestRetriever = new ManifestRetriever();

    try {
      manifest = await manifestRetriever.retrieve(body.manifest_url);
    } catch (e) {
      return this._failureResponse(e.message);
    }

    // 3. Ensure there's a valid `languages` section in the manifest.
    const manifestValidator = new ManifestValidator();

    try {
      manifestValidator.validate(manifest);
    } catch (e) {
      return this._failureResponse(e.message);
    }

    packageName = manifest.name;

    // 4. Get and store the package zip.
    const s3Coordinator = new S3Coordinator(packageName);
    const packageFile = await s3Coordinator.retrievePackage(manifest.download);

    // 5. Extract the translations from the package, depending on which ones
    //    are listed in the manifest.
    const translationExtractor = new TranslationExtractor();

    try {
      translations = await translationExtractor
        .extract(packageFile, manifest.languages);
    } catch (e) {
      return this._failureResponse(
        `Could not extract translation files from module: ${e.message}`
      );
    }

    // 6. Compare translations to the target translations we want.
    const toTranslate = Constants.TARGET_LANGUAGES.filter(target => {
      for (const translation of translations) {
        if (target === translation.lang) {
          return false;
        }
      }

      return true;
    });

    if (!toTranslate.length) {
      return this._failureResponse(
        'Cannot find any target languages to translate to'
      );
    }

    // 7. Actually translate to the strings to the desired languages.
    const translator = new Translator(ddbCoordinator);

    try {
       translateResult = await translator.translate(
        translations,
        toTranslate
      );
    } catch (e) {
      return this._failureResponse(
        `Could not translate via AWS Translate: ${e.message}`
      );
    }

    finalTranslations = translateResult.finalTranslations;
    ddbRecords = translateResult.ddbRecords;

    // 8. It's a valid case that we may not have any records to actually save
    // afterwards. This means that all translations are currently in DynamoDB.
    if (ddbRecords.length) {
      try {
        await ddbCoordinator.save(ddbRecords);
      } catch (e) {
        return this._failureResponse(
          `Could not save data into Translations: ${e.message}`
        );
      }
    }

    // 9. Save the new translation files to S3.
    const fileBundle = await s3Coordinator.saveTranslationFiles(finalTranslations);

    // 10. Create a new zip file with the translated files for download.
    const download = await s3Coordinator.createZipFromTranslatedFiles(fileBundle);

    return this._successResponse(download);
  }

  _successResponse(download) {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        download,
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
