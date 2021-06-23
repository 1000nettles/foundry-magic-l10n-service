'use strict';

const AWS = require('aws-sdk');
const fetch = require('node-fetch');
const stream = require('stream');
const crypto = require('crypto');
const s3Zip = require('s3-zip');

/**
 * A class to coordinate uploads and downloads to AWS S3.
 * Also coordinates zipping and unzipping.
 */
 module.exports = class S3Coordinator {

  constructor(packageName) {
    this.packageId = `${packageName}-${crypto.randomBytes(8).toString('hex')}`;
    this.packageFile = `packages_orig/${this.packageId}.zip`;
    this.finalPackageFile = `processed/${this.packageId}.zip`;
    this.processedDir = 'processed';
    this.bucketName = 'foundry-magic-l18n';
    this.region = 'us-east-1';
    this.s3 = new AWS.S3({ region: this.region, apiVersion: '2006-03-01' });
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
    * @return {Promise<object>}
    *   Return a promise that once complete, specifies the files uploaded and
    *   the directory they're stored in.
    */
  async saveTranslationFiles(translations) {
    let files = [];
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

      await this.s3.upload(params).promise();
      files.push(`${language}.json`);
    }

    return {
      directory: `${this.processedDir}/${this.packageId}`,
      files,
    };
  }

  async createZipFromTranslatedFiles(fileBundle) {
    const { s3WriteStream, uploadPromise } = this._uploadStream({
      Bucket: this.bucketName,
      Key: this.finalPackageFile,
    });

    await s3Zip
      .archive({ region: this.region, bucket: this.bucketName}, fileBundle.directory, fileBundle.files)
      .pipe(s3WriteStream);
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
