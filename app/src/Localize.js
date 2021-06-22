'use strict';

const PackageRetriever = require('./PackageRetriever');
const TranslationExtractor = require('./TranslationExtractor');
const ManifestRetriever = require('./ManifestRetriever');
const Translator = require('./Translator');

/**
 * A class to handle the orchestration of our localization.
 */
module.exports = class Localize {

  constructor() {
    /**
     * The target locales that we should be generating translations for.
     */
    this.targetLocales = [
      'en',
      'fr',
    ];
  }

  async execute(event) {
    if (!event?.body) {
      console.log('No body defined');
      return this._successResponse();
    }

    let body;

    // 1. Get and validate the body of the request. Determine the manifest URL.
    try {
      body = JSON.parse(event.body);
    } catch (e) {
      console.log('Could not parse');
      console.log(e);
      return this._successResponse();
    }

    if (!body || !body?.manifest_url) {
      console.log('No manifest URL defined');
      return this._successResponse();
    }

    // 2. Get the full manifest JSON.
    const manifestRetriever = new ManifestRetriever();
    const manifest = await manifestRetriever.retrieve(body.manifest_url);

    // TODO: ensure manifest has valid "languages" section.

    // 3. Get and store the package zip.
    const packageRetriever = new PackageRetriever();
    const packageFile = await packageRetriever.retrieve(manifest.download);

    // 4. Extract the translations from the package, depending on which ones
    //    are listed in the manifest.
    const translationExtractor = new TranslationExtractor();
    const translations = await translationExtractor
      .extract(packageFile, manifest.languages);

    console.log(translations);

    // 5. Compare translations to the target translations we want.
    const toTranslate = this.targetLocales.filter(target => {
      for (const translation of translations) {
        if (target === translation.lang) {
          return false;
        }
      }

      return true;
    });

    console.log(toTranslate);

    if (!toTranslate.length) {
      return this._successResponse();
    }

    const translator = new Translator();
    await translator.translate(translations, toTranslate);

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

}
