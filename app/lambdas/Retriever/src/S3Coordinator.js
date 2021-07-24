const AWS = require('aws-sdk');
const fs = require('fs');
const stream = require('stream');
const s3Zip = require('s3-zip');
const { Constants } = require('shared');

/**
 * A class to coordinate uploads and downloads to AWS S3.
 * Also coordinates zipping and unzipping.
 */
module.exports = class S3Coordinator {
  /**
   * S3Coordinator constructor.
   *
   * @param {string} masterJobsId  The master jobs ID.
   */
  constructor(masterJobsId) {
    /**
     * Our AWS S3 instance.
     *
     * @type {import('aws-sdk').S3}
     */
    this.s3 = new AWS.S3({
      region: Constants.AWS_REGION,
      apiVersion: '2006-03-01',
    });

    this.downloadsDir = 'downloads';
    this.masterJobsId = masterJobsId;
    this.finalPackageFile = `downloads/${this.masterJobsId}.zip`;
  }

  /**
   * Read the file.
   *
   * @param {string} filePath  The file path to read from.
   *
   * @returns {Promise<string>}  The file contents.
   */
  async readFile(filePath) {
    const params = {
      Bucket: Constants.AWS_S3_BUCKET_NAME,
      Key: filePath,
    };

    const content = await this.s3.getObject(params).promise();
    return content.Body.toString('utf-8');
  }

  /**
   * Save the new translation files based on the provided translations.
   *
   * @param {object} translations
   *   The translations, broken down by language code.
   * @param {array} newLanguages
   *   The languages objects to utilize.
   *
   * @return {Promise<import('shared').S3DirectoryAndFilesBundle>}
   *   Return a promise that once complete, specifies the files uploaded and
   *   the directory they're stored in.
   */
  async saveTranslationFiles(translations, newLanguages) {
    const files = [];
    for (const entity of Object.entries(translations)) {
      const [language, translated] = entity;
      const buffer = Buffer.from(JSON.stringify(translated, null, 2));
      const filePath = this._getGeneratedFilePath(language);
      const params = {
        Bucket: Constants.AWS_S3_BUCKET_NAME,
        Key: `${this.downloadsDir}/${this.masterJobsId}/${filePath}`,
        Body: buffer,
        ContentEncoding: 'base64',
        ContentType: 'application/json',
      };

      /* eslint-disable no-await-in-loop */
      await this.s3.upload(params).promise();
      files.push(filePath);
    }

    // Upload new languages file.
    const buffer = Buffer.from(JSON.stringify(newLanguages, null, 2));
    const params = {
      Bucket: Constants.AWS_S3_BUCKET_NAME,
      Key: `${this.downloadsDir}/${this.masterJobsId}/languages.json`,
      Body: buffer,
      ContentEncoding: 'base64',
      ContentType: 'application/json',
    };

    await this.s3.upload(params).promise();
    files.push('languages.json');

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
    ];
    for (const file of extraFiles) {
      const fileContent = fs.readFileSync(file.path);
      const extraFilesParams = {
        Bucket: Constants.AWS_S3_BUCKET_NAME,
        Key: `${this.downloadsDir}/${this.masterJobsId}/${file.name}`,
        Body: fileContent,
      };
      await this.s3.upload(extraFilesParams).promise();
      files.push(file.name);
    }

    return {
      directory: `${this.downloadsDir}/${this.masterJobsId}`,
      files,
    };
  }

  /**
   * Create a zip from the translated files.
   *
   * @param {import('shared').S3DirectoryAndFilesBundle} fileBundle
   *
   * @returns {Promise<string>}  The location of the zip.
   */
  async createZipFromTranslatedFiles(fileBundle) {
    const { s3WriteStream, uploadPromise } = this._uploadStream({
      Bucket: Constants.AWS_S3_BUCKET_NAME,
      Key: this.finalPackageFile,
    }, true);

    await s3Zip
      .archive({
        region: Constants.AWS_REGION,
        bucket: Constants.AWS_S3_BUCKET_NAME,
        preserveFolderStructure: true,
      }, fileBundle.directory, fileBundle.files)
      .pipe(s3WriteStream);

    const results = await uploadPromise;

    return results.Location;
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

  /**
   * Get the generated translation language full file path.
   * 
   * @param {string} language  The language code.
   * @returns {string}
   */
  _getGeneratedFilePath(language) {
    return `translations/${language}${Constants.GENERATED_LANGUAGE_FILE_SUFFIX}.json`;
  }
};
