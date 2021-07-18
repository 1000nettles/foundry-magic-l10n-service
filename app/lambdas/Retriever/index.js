const main = require('./main');

// For now, hardcode our production env values for local testing.
process.env.ROLE_ARN = 'arn:aws:iam::281848090672:role/foundry-magic-l10n-lambda-exec';
process.env.BUCKET = 'foundry-magic-l10n';

// NOT the main entry point for the Lambda, see `main.js`.
// This file exists for local testing purposes.
main.handler({
    queryStringParameters: { jobs_id: 'fe79ff68-a261-4fe1-9e69-b830deb8d333' }
  },
  null,
  () => {}
);
