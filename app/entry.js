const main = require('./main');

// main.handler('{"manifest_url": "a_manifest_url"}', null, () => {});
main.handler({body: '{"manifest_url":"https://raw.githubusercontent.com/1000nettles/hey-wait/main/module.json"}'}, null, () => {});
