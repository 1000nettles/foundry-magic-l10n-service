'use strict';

const PackageRetriever = require('./PackageRetriever');

/**
 * A class to handle the orchestration of our localization.
 */
module.exports = class Localize {

  async execute(event) {
    if (!event?.body) {
      console.log('No body defined');
      return this._successResponse();
    }

    let body;

    try {
      body = JSON.parse(event.body);
    } catch (e) {
      console.log('Could not parse');
      console.log(e);
      return this._successResponse();
    }

    if (!body || !body?.manifest_url) {
      console.log('No manifest URL defined');
      return this._successResponse();
    }

    const packageRetriever = new PackageRetriever();
    await packageRetriever.retrieve(body.manifest_url);

    return this._successResponse();
  }

  _successResponse() {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
      body: '<p>Hello world! I am the start of the FoundryVTT Magic L18n function.</p>',
    };
  }

}
