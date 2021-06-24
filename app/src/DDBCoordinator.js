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

  /**
   * Save the passed items to the Translations DynamoDB table.
   * Operates in a batched fashion.
   *
   * @param {array} ddbItems
   *   The DynamoDB items to save.
   *
   * @return {Promise<void>}
   */
  async save(ddbItems) {
    const ddbItemsChunked = this._chunk(ddbItems);

    // Have to chunk our array as DynamoDB has batch processing limits.
    for (const ddbItemsChunk of ddbItemsChunked) {
      const params = {
        RequestItems: {}
      };

      params.RequestItems[this.tableName] = [];

      for (const Item of ddbItemsChunk) {
        params.RequestItems[this.tableName].push({
          PutRequest: {
            Item,
          },
        });
      }

      const result = await this.docClient.batchWrite(params).promise();
      console.log(result);
    }
  }

  /**
   * Chunk our array out for DDB batching.
   *
   * @param {array} array
   *   Array to be chunked.
   *
   * @see https://stackoverflow.com/a/8495740/823549
   * @private
   */
  _chunk(array) {
    let i;
    let j;
    let result = [];
    let chunk = 25;

    for (i = 0, j = array.length; i < j; i += chunk) {
      result.push(
        array.slice(i, i + chunk)
      );
    }

    return result;
  }
}
