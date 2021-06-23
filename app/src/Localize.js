'use strict';

const PackageRetriever = require('./PackageRetriever');
const TranslationExtractor = require('./TranslationExtractor');
const ManifestRetriever = require('./ManifestRetriever');
const ManifestValidator = require('./ManifestValidator');
const Translator = require('./Translator');
const Constants = require('./Constants');

/**
 * A class to handle the orchestration of our localization.
 */
module.exports = class Localize {

  async execute(event) {
    if (!event?.body) {
      return this._failureResponse(
        `No request body defined`
      );
    }

    let body;
    let manifest;
    let translations;

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

    // 4. Get and store the package zip.
    const packageRetriever = new PackageRetriever();
    const packageFile = await packageRetriever.retrieve(manifest.download);

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
    const translator = new Translator();

    try {
      await translator.translate(translations, toTranslate);
    } catch (e) {
      console.error(`Could not translate via AWS Translate: ${e.message}`);
    }

    return this._successResponse();
  }

  _successResponse() {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
      body: '<p>Hello world! I am the start of the FoundryVTT Magic L18n function.</p>',
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
