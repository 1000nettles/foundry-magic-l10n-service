'use strict'

const Localize = require('./Localize');

exports.handler = function (event, context, callback) {
  const localize = new Localize();
  const response = localize.execute(event);
  callback(null, response)
}
