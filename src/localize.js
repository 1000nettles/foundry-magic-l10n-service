const fetch = require('node-fetch');
const StreamZip = require('node-stream-zip');

class Localize {

  async execute(event) {
    if (!event?.body) {
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
    await this.getDownload(manifest.download);

    return this.successResponse();
  }

  async getManifestPayload(manifestUrl) {
    /*http.request(manifestUrl, { method: 'HEAD' }, (res) => {
      console.log(res.statusCode);
    }).on('error', (err) => {
      console.error(err);
    }).end();*/

    let data;

    const response = await fetch(
      manifestUrl,
      { method: 'GET', timeout: 5000, size: 8388608 }
    );

    if (!response.ok) {
      throw new Error('Could not retrieve manifest payload');
    }

    return await response.json();
  }

  async getDownload(downloadUrl) {
    const zip = new StreamZip.async({ file: downloadUrl });
    const data = await zip.entryData('src/lang/en.json');
    console.log(data);
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
