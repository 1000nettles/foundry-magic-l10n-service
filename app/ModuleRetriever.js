const AWS = require('aws-sdk');
const fetch = require('node-fetch');
const stream = require('stream');
const fs = require('fs');
const crypto = require("crypto");

class ModuleRetriever {

  async retrieve(manifestUrl) {
    const manifest = await this._getManifestPayload(manifestUrl);
    await this._downloadAndSave(manifest.download);
  }

  async _getManifestPayload(manifestUrl) {
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

  async _downloadAndSave(downloadUrl) {
    const tmpModuleName = crypto.randomBytes(20).toString('hex') + '.zip';

    const response = await fetch(
      downloadUrl,
      { method: 'GET', timeout: 5000, size: 8388608 }
    );

    const dest = fs.createWriteStream(`/tmp/${tmpModuleName}`);
    await response.body.pipe(dest);

    const { writeStream, promise } = this._uploadStream({
      Bucket: '1000nettles-foundry-magic-l18n-orig-modules',
      Key: tmpModuleName,
    });

    const readStream = fs.createReadStream(`/tmp/${tmpModuleName}`);

    readStream.pipe(writeStream);
    return promise;
  }

  /**
   * Upload the currently running steam.
   * 
   * Solution found here: https://stackoverflow.com/a/50291380/823549
   */
  _uploadStream({ Bucket, Key }) {
    const s3 = new AWS.S3();
    const passThru = new stream.PassThrough();
    return {
      writeStream: passThru,
      promise: s3.upload({ Bucket, Key, Body: passThru }).promise(),
    };
  }

};

module.exports = ModuleRetriever;
