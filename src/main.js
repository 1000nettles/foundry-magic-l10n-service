'use strict'

const localize = require('./localize');

exports.handler = function (event, context, callback) {
  const response = localize.getResponse();
  callback(null, response)
}
