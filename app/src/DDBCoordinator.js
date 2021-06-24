'use strict';

const AWS = require('aws-sdk');

module.exports = class DDBCoordinator {

  constructor() {
    AWS.config.update({
      region: 'us-east-1',
    });

    this.docClient = new AWS.DynamoDB.DocumentClient();
    this.tableName = 'Translations';
  }

  async save(ddbItems) {
    for (const Item of ddbItems) {
      const params = {
        TableName: this.tableName,
        Item,
      };

      await this.docClient.put(params).promise();
    }
  }
}
