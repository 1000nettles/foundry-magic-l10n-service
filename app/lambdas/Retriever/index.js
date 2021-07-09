const main = require('./main');

// For now, hardcode our production env values for local testing.
process.env.ROLE_ARN = 'arn:aws:iam::281848090672:role/foundry-magic-l10n-lambda-exec';
process.env.BUCKET = 'foundry-magic-l10n';

// NOT the main entry point for the Lambda, see `main.js`.
// This file exists for local testing purposes.
main.handler({
    queryStringParameters: { jobs_id: '6c4764d9-c26e-4523-accb-565565606d70' }
  },
  null,
  () => {}
);
