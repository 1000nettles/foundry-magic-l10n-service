const App = require('./src/App');

/**
 * The main Lambda entry point.
 *
 * @param {object} event
 * @param {import("aws-lambda/handler").Context} context
 * @param {import("aws-lambda/handler").Callback} callback
 * @return {Promise<*>}
 */
exports.handler = async function (event, context, callback) {
  const app = new App();
  const response = await app.execute(event);
  callback(null, response);
}
