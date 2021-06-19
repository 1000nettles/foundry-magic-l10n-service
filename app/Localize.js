const AWS = require('aws-sdk');
const fetch = require('node-fetch');

class Localize {

  async execute(event) {
    if (!event?.body) {
      console.log('No body defined');
      return this.successResponse();
    }

    let body;

    try {
      body = JSON.parse(event.body);
    } catch (e) {
      console.log('Could not parse');
      console.log(e);
      return this.successResponse();
    }

    if (!body || !body?.manifest_url) {
      console.log('No manifest URL defined');
      return this.successResponse();
    }


    const manifest = await this.getManifestPayload(body.manifest_url);
    console.log(manifest);
    await this.getAndStoreModule(manifest.download);

    return this.successResponse();
  }

  async getManifestPayload(manifestUrl) {
    let data;

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

  async getAndStoreModule(downloadUrl) {
    const response = await fetch(
      downloadUrl,
      { method: 'GET', timeout: 5000, size: 8388608 }
    );

    const arrayBuffer = response.arrayBuffer();
    const bufferToHex = (buffer) => {
      return [...new Uint8Array(buffer)].map(x => x.toString(16).padStart(2, '0')).join('');
    };

    const params = {
      Bucket: '1000nettles-foundry-magic-l18n-orig-modules',
      Key: 'the-module.zip',
      Body: bufferToHex(arrayBuffer)
    }

    const s3 = new AWS.S3();

    const getParams = {
      Bucket: '1000nettles-foundry-magic-l18n-orig-modules',
    };
    console.log(params);
    await s3.getBucketLocation(getParams, function(err, data) {
      if (err) console.log(err, err.stack); // an error occurred
      else     console.log(data);           // successful response
    }).promise();

    await s3.putObject(params, function(err, data) {
      if (err) console.log(err, err.stack); // an error occurred
      else     console.log(data);           // successful response
    }).promise();
  }

  successResponse() {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
      body: '<p>Hello world! I am the start of the FoundryVTT Magic L18n function.</p>',
    };
  }

}

module.exports = Localize;
