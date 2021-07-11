const { Constants } = require('shared');

module.exports = class ManifestValidator {
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
