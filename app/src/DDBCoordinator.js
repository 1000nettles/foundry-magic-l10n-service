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

  async save(data) {
    for (const datum of data) {
      const params = {
        TableName: this.tableName,
        Item: datum,
      };

      console.log('about to put document');
      console.log(params);

      const result = await this.docClient.put(params).promise();
      console.log(result);
    }
  }
}
