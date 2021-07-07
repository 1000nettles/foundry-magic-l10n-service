'use strict';

const AWS = require('aws-sdk');
const { Constants } = require('shared');

module.exports = class DDBCoordinator {

  constructor() {
    AWS.config.update({
      region: 'us-east-1',
    });

    this.docClient = new AWS.DynamoDB.DocumentClient();
  }

  async getJobs(id) {
    const params = {
      TableName: Constants.DDB_TABLE_NAME,
      KeyConditionExpression: '#pk = :pk and #sk = :sk',
      ExpressionAttributeNames: {
        '#pk': 'pk',
        '#sk': 'sk',
      },
      ExpressionAttributeValues: {
        ':pk': 'TRANSLATION_JOBS',
        ':sk': `TRANSLATION_JOB#${id}`,
      },
    };

    const result = await this.docClient.query(params).promise();
    console.log(result);

    return result;
  }

}
