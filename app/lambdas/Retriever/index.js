const main = require('./main');

// For now, hardcode our production env values for local testing.
process.env.ROLE_ARN = 'arn:aws:iam::281848090672:role/foundry-magic-l18n-lambda-exec';
process.env.BUCKET = 'foundry-magic-l18n';

// NOT the main entry point for the Lambda, see `main.js`.
// This file exists for local testing purposes.
main.handler({
    queryStringParameters: { jobs_id: '6ef30258-fffb-4351-9bc2-5b9e2c03c118' }
  },
  null,
  () => {}
);
