const fetch = require('node-fetch');
const { S3 } = require('aws-sdk');
const { Constants } = require('shared');
const { PassThrough } = require('stream');

/**
 * A class to coordinate uploads and downloads to AWS S3.
 * Also coordinates zipping and unzipping.
 */
module.exports = class S3Coordinator {
  /**
   * Constructor for the S3Coordinator.
   *
   * @param {string} masterJobsId
   *   The "master jobs" UUID associated with the job.
   */
  constructor(masterJobsId) {
    /**
     * Our AWS S3 instance.
     *
     * @type {import('aws-sdk').S3}
     */
    this.s3 = new S3({
      region: Constants.AWS_REGION,
      apiVersion: Constants.AWS_S3_API_VERSION,
    });

    /**
     * The "master jobs" UUID associated with the job.
     *
     * @type {string}
     */
    this.masterJobsId = masterJobsId;

    /**
     * The full path to the original package file that we downloaded.
     *
     * @type {string}
     */
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
   * Get the batch files package input directory path.
   *
   * @return {string}
   */
  getBatchFilesPackageInputDir() {
    return `${Constants.BATCH_FILES_DIR}/${this.masterJobsId}/input`;
  }

  /**
   * Get the batch files package output directory path.
   *
   * @return {string}
   */
  getBatchFilesPackageOutputDir() {
    return `${Constants.BATCH_FILES_DIR}/${this.masterJobsId}/output`;
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
      { method: 'GET', timeout: 5000, size: 8388608 },
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
   * @param {object} param  A param object container
   * @param {string} param.Bucket  The S3 bucket name.
   * @param {string} param.Key  The filename (including full S3 path.)
   * @param {boolean} isPublic  If the file is to be public to the internet or not.
   *
   * @return {{uploadPromise: *, s3WriteStream: PassThrough}}
   *   Both the S3 write stream and the upload promise from S3.
   *
   * @see https://stackoverflow.com/a/50291380/823549
   *
   * @private
   */
  _uploadStream({ Bucket, Key }, isPublic = false) {
    const s3WriteStream = new PassThrough();
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
