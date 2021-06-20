'use strict';

const AWS = require('aws-sdk');
const fetch = require('node-fetch');
const stream = require('stream');
const crypto = require("crypto");

/**
 * A class to retrieve the FoundryVTT packages (modules and systems.)
 */
 module.exports = class PackageRetriever {

  constructor() {
    this.packageFilename = crypto.randomBytes(20).toString('hex') + '.zip';
    this.bucketName = 'foundry-magic-l18n';
    this.packageDir = 'packages_orig';
  }

  /**
   * The entry point for module retrieval functionality.
   * 
   * @param {string} manifestUrl
   *   The URL to the FoundryVTT module / system manifest file.
   */
  async retrieve(manifestUrl) {
    const manifest = await this._getManifest(manifestUrl);
    await this._downloadAndSave(manifest.download);
  }

  /**
   * Get the manifest.
   * 
   * @param {string} manifestUrl
   *   The URL to the FoundryVTT module / system manifest file.
   * 
   * @returns {JSON}
   *   The manifest file in JSON format.
   */
  async _getManifest(manifestUrl) {
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

  /**
   * Download a Foundry system / module and save it to S3.
   * 
   * @param {string} downloadUrl
   *   The URL to download the FoundryVTT module / system from.
   *
   * @returns {Promise}
   *   The S3 uploading promise.
   */
  async _downloadAndSave(downloadUrl) {
    const response = await fetch(
      downloadUrl,
      { method: 'GET', timeout: 5000, size: 8388608 }
    );

    const { s3WriteStream, uploadPromise } = this._uploadStream({
      Bucket: this.bucketName,
      Key: `${this.packageDir}/${this.packageFilename}`,
    });

    await response.body.pipe(s3WriteStream);

    return uploadPromise;
  }

  /**
   * Upload the currently running steam.
   * 
   * Solution found here: https://stackoverflow.com/a/50291380/823549
   */
  _uploadStream({ Bucket, Key }) {
    const s3 = new AWS.S3();
    const s3WriteStream = new stream.PassThrough();
    const uploadPromise = s3.upload({
      Bucket,
      Key,
      Body: s3WriteStream,
    }).promise();

    return {
      s3WriteStream,
      uploadPromise,
    };
  }

};
