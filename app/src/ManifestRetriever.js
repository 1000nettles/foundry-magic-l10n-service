'use strict';

const fetch = require('node-fetch');

/**
 * A class to retrievePackage the FoundryVTT package manifest file.
 */
module.exports = class ManifestRetriever {
  /**
   * Get the manifest.
   *
   * @param {string} manifestUrl
   *   The URL to the FoundryVTT module / system manifest file.
   *
   * @returns {JSON}
   *   The manifest file in JSON format.
   */
   async retrieve(manifestUrl) {
    const response = await fetch(
      manifestUrl,
      { method: 'GET', timeout: 5000, size: 8388608 }
    ).catch(err => {
      throw new Error(`Could not retrieve manifest from "${manifestUrl}" - ${err.message}`)
    });

    if (!response.ok) {
      throw new Error(`Could not retrieve manifest from "${manifestUrl}"`);
    }

    const responseText = await response.text();

    try {
      return JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Provided manifest is not valid JSON: ${e.message}`);
    }
  }
}
