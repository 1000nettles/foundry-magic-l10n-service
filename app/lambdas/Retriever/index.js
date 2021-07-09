const main = require('./main');

// For now, hardcode our production env values for local testing.
process.env.ROLE_ARN = 'arn:aws:iam::281848090672:role/foundry-magic-l10n-lambda-exec';
process.env.BUCKET = 'foundry-magic-l10n';

// NOT the main entry point for the Lambda, see `main.js`.
// This file exists for local testing purposes.
main.handler({
    queryStringParameters: { jobs_id: 'ad7544bc-9cee-4537-8a99-320d6139da85' }
  },
  null,
  () => {}
);
