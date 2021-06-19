const ModuleRetriever = require('./ModuleRetriever');

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

    const moduleRetriever = new ModuleRetriever();
    await moduleRetriever.retrieve(body.manifest_url);

    return this.successResponse();
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
