'use strict';

const AWS = require('aws-sdk');
const fetch = require('node-fetch');
const stream = require('stream');
const crypto = require('crypto');

/**
 * A class to coordinate uploads and downloads to AWS S3.
 * Also coordinates zipping and unzipping.
 */
 module.exports = class S3Coordinator {

  constructor(packageName) {
    this.packageId = `${packageName}-${crypto.randomBytes(8).toString('hex')}`;
    this.packageFile = `packages_orig/${this.packageId}.zip`;
    this.processedDir = 'processed';
    this.bucketName = 'foundry-magic-l18n';
    this.s3 = new AWS.S3({ apiVersion: '2006-03-01' });
  }

  /**
   * The entry point for module retrieval functionality.
   *
   * @param {string} downloadUrl
   *   The URL to the FoundryVTT module / system manifest file.
   */
  async retrievePackage(downloadUrl) {
    await this._downloadAndSave(downloadUrl);
    return this.packageFile;
  }

   /**
    * Save the new translation files based on the provided translations.
    *
    * @param {object} translations
    *   The translations, broken down by language code.
    *
    * @return {Promise<void>}
    *   Return a promise that once complete, specifies that the uploading is
    *   finished.
    */
  async saveTranslationFiles(translations) {
    for (const entity of Object.entries(translations)) {
      const [language, translated] = entity;
      const buffer = Buffer.from(JSON.stringify(translated));
      const params = {
        Bucket: this.bucketName,
        Key: `${this.processedDir}/${this.packageId}/${language}.json`,
        Body: buffer,
        ContentEncoding: 'base64',
        ContentType: 'application/json',
      };

      await this.s3.upload(params, function (err, data) {
        if (err) {
          throw err;
        }
      });
    }
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
      Key: this.packageFile,
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
    const s3WriteStream = new stream.PassThrough();
    const uploadPromise = this.s3.upload({
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
