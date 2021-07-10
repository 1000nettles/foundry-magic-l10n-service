const main = require('./main');

// For now, hardcode our production env values for local testing.
process.env.ROLE_ARN = 'arn:aws:iam::281848090672:role/foundry-magic-l10n-lambda-exec';
process.env.BUCKET = 'foundry-magic-l10n';

// NOT the main entry point for the Lambda, see `main.js`.
// This file exists for local testing purposes.
main.handler({
    queryStringParameters: { manifest_url: 'https://github.com/League-of-Foundry-Developers/foundryvtt-forien-quest-log/releases/download/0.7.2/module.json' }
  },
  null,
  () => {}
);
