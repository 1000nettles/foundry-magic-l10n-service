'use strict'

const localize = require('./localize');

exports.handler = function (event, context, callback) {
  const response = localize.execute(event);
  callback(null, response)
}
