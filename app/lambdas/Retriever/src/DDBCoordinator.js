const AWS = require('aws-sdk');
const { Constants } = require('shared');

/**
 * The DynamoDB coordinator.
 */
module.exports = class DDBCoordinator {
  constructor() {
    AWS.config.update({
      region: Constants.AWS_REGION,
    });

    /**
     * Our DocumentClient instance.
     *
     * @type {import('aws-sdk').DynamoDB.DocumentClient}
     */
    this.docClient = new AWS.DynamoDB.DocumentClient();
  }

  /**
   * Get the jobs by ID.
   *
   * @param {string} id  The ID to get the job for.
   *
   * @return {Promise<*>}
   */
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
