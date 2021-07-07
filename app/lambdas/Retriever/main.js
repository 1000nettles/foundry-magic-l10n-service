'use strict';

const App = require('./src/App');

/**
 * The main Lambda entry point.
 */
exports.handler = async function (event, context, callback) {
  const app = new App();
  app.execute(event);
  callback(null, {});
}
