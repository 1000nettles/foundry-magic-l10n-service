const AWS = require('aws-sdk');
const { Constants } = require('shared');

module.exports = class DDBCoordinator {
  constructor() {
    AWS.config.update({
      region: Constants.AWS_REGION,
    });

    this.docClient = new AWS.DynamoDB.DocumentClient();
  }

  getJobs(id) {
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

    return this.docClient.query(params).promise();
  }
};
