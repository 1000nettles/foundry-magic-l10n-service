'use strict';

const AWS = require('aws-sdk');
const fetch = require('node-fetch');
const stream = require('stream');
const { Constants } = require('shared');

/**
 * A class to coordinate uploads and downloads to AWS S3.
 * Also coordinates zipping and unzipping.
 */
 module.exports = class S3Coordinator {

  constructor(masterJobsId) {
    this.s3 = new AWS.S3({
      region: Constants.AWS_REGION,
      apiVersion: Constants.AWS_S3_API_VERSION,
    });

    this.masterJobsId = masterJobsId;
    this.packageFile = `packages_orig/${this.masterJobsId}.zip`;
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

  getBatchFilesPackageInputDir() {
    return `${Constants.BATCH_FILES_DIR}/${this.masterJobsId}/input`;
  }

  getBatchFilesPackageOutputDir() {
    return `${Constants.BATCH_FILES_DIR}/${this.masterJobsId}/output`;
  }

   /**
    * Save the input batch file based on the content provided.
    *
    * @param {string} content
    *   The input batch file content.
    *
    * @return {Promise<*>}
    *   The promise pertaining to uploading to S3.
    */
  async saveBatchFile(content) {
    const buffer = Buffer.from(content);
    const filePath = `${this.getBatchFilesPackageInputDir()}/${Constants.SOURCE_BATCH_FILENAME}`;
    const params = {
      Bucket: Constants.AWS_S3_BUCKET_NAME,
      Key: filePath,
      Body: buffer,
      ContentEncoding: 'base64',
      ContentType: 'text/html',
    };

    return this.s3.upload(params).promise();
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
      Bucket: Constants.AWS_S3_BUCKET_NAME,
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
  _uploadStream({ Bucket, Key }, isPublic = false) {
    const s3WriteStream = new stream.PassThrough();
    const params = {
      Bucket,
      Key,
      Body: s3WriteStream,
    };

    if (isPublic) {
      params.ACL = 'public-read';
    }

    const uploadPromise = this.s3.upload(params).promise();

    return {
      s3WriteStream,
      uploadPromise,
    };
  }

};
