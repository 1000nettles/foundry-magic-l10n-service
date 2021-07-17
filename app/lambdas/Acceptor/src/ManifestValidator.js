const { Constants } = require('shared');

/**
 * The Manifest validator.
 */
module.exports = class ManifestValidator {
  /**
   * Validate the provided manifest.
   *
   * @param {import('shared').FoundryManifest} manifest
   *   The provided manifest object.
   */
  validate(manifest) {
    if (!manifest?.languages || !manifest.languages.length) {
      throw new Error('Provided manifest must specify at least one language');
    }

    const base = manifest.languages.find(
      (language) => language.lang === Constants.BASE_LANGUAGE_CODE,
    );

    if (!base) {
      throw new Error(`Language code ${base} must be provided in the manifest languages`);
    }
  }
};
