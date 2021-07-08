'use strict';

const AWS = require('aws-sdk');
const fs = require('fs');
const fetch = require('node-fetch');
const stream = require('stream');
const crypto = require('crypto');
const s3Zip = require('s3-zip');
const { Constants } = require('shared');

/**
 * A class to coordinate uploads and downloads to AWS S3.
 * Also coordinates zipping and unzipping.
 */
 module.exports = class S3Coordinator {

  constructor(packageName) {
    this.s3 = new AWS.S3({
      region: Constants.AWS_REGION,
      apiVersion: Constants.AWS_S3_API_VERSION,
    });

    this.packageId = `${packageName}-${crypto.randomBytes(8).toString('hex')}`;
    this.packageFile = `packages_orig/${this.packageId}.zip`;
    this.finalPackageFile = `downloads/${this.packageId}.zip`;
    this.downloadsDir = 'downloads';
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
    return `${Constants.BATCH_FILES_DIR}/${this.packageId}/input`;
  }

  getBatchFilesPackageOutputDir() {
    return `${Constants.BATCH_FILES_DIR}/${this.packageId}/output`;
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
      ContentType: 'text/plain',
    };

    return this.s3.upload(params).promise();
  }

   /**
    * Save the new translation files based on the provided translations.
    *
    * @param {object} translations
    *   The translations, broken down by language code.
    * @param {array} newLanguages
    *   The languages objects to utilize.
    *
    * @return {Promise<object>}
    *   Return a promise that once complete, specifies the files uploaded and
    *   the directory they're stored in.
    */
  async saveTranslationFiles(translations, newLanguages) {
    let files = [];
    for (const entity of Object.entries(translations)) {
      const [language, translated] = entity;
      const buffer = Buffer.from(JSON.stringify(translated, null, 2));
      const filePath = `translations/${language}.json`;
      const params = {
        Bucket: Constants.AWS_S3_BUCKET_NAME,
        Key: `${this.downloadsDir}/${this.packageId}/${filePath}`,
        Body: buffer,
        ContentEncoding: 'base64',
        ContentType: 'application/json',
      };

      await this.s3.upload(params).promise();
      files.push(filePath);
    }

    // Upload new languages file.
     const buffer = Buffer.from(JSON.stringify(newLanguages, null, 2));
     const params = {
       Bucket: Constants.AWS_S3_BUCKET_NAME,
       Key: `${this.downloadsDir}/${this.packageId}/languages.json`,
       Body: buffer,
       ContentEncoding: 'base64',
       ContentType: 'application/json',
     };

     await this.s3.upload(params).promise();
     files.push(`languages.json`);

    // Upload the files which are included in every compiled package.
     const extraFiles = [
       {
         path: './files/LICENSE',
         name: 'LICENSE',
       },
       {
         path: './files/README.md',
         name: 'README.md',
       },
     ]
     for (const file of extraFiles) {
       const fileContent = fs.readFileSync(file.path);
       const params = {
         Bucket: Constants.AWS_S3_BUCKET_NAME,
         Key: `${this.downloadsDir}/${this.packageId}/${file.name}`,
         Body: fileContent,
       };
       await this.s3.upload(params).promise();
       files.push(file.name);
     }

    return {
      directory: `${this.downloadsDir}/${this.packageId}`,
      files,
    };
  }

  async createZipFromTranslatedFiles(fileBundle) {
    const { s3WriteStream, uploadPromise } = this._uploadStream({
      Bucket: Constants.AWS_S3_BUCKET_NAME,
      Key: this.finalPackageFile,
    }, true);

    await s3Zip
      .archive({ region: Constants.AWS_REGION, bucket: Constants.AWS_S3_BUCKET_NAME, preserveFolderStructure: true }, fileBundle.directory, fileBundle.files)
      .pipe(s3WriteStream);

    const results = await uploadPromise;

    return results.Location;
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
