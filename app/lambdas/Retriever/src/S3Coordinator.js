'use strict';

const AWS = require('aws-sdk');
const { Constants } = require('shared');

/**
 * A class to coordinate uploads and downloads to AWS S3.
 * Also coordinates zipping and unzipping.
 */
module.exports = class S3Coordinator {

  constructor() {
    this.s3 = new AWS.S3({
      region: Constants.AWS_REGION,
      apiVersion: '2006-03-01',
    });
  }
}
