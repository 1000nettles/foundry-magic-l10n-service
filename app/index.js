const main = require('./main');

// NOT the main entry point for the Lambda, see `main.js`.
// This file exists for local testing purposes.
main.handler({
    queryStringParameters: { manifest_url: 'https://raw.githubusercontent.com/1000nettles/hey-wait/main/module.json' }
  },
  null,
  () => {}
);
