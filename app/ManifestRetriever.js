'use strict';

const fetch = require('node-fetch');

/**
 * A class to retrieve the FoundryVTT package manifest file.
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
    );

    if (!response.ok) {
      throw new Error('Could not retrieve manifest payload');
    }

    const responseText = await response.text();
    return JSON.parse(responseText);
  }
}
