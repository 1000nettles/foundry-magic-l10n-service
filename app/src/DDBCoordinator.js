'use strict';

const AWS = require('aws-sdk');
const Constants = require('./Constants');

module.exports = class DDBCoordinator {

  constructor() {
    AWS.config.update({
      region: 'us-east-1',
    });

    this.docClient = new AWS.DynamoDB.DocumentClient();
  }

  /**
   * Check if the translation from a text exists.
   *
   * @param {string} text
   *   The original, untranslated text to query for.
   *
   * @return {Promise<object>}
   *   A promise containing the record. Empty object if cannot be found.
   */
  async exists(text) {
    const params = {
      TableName: Constants.TRANSLATIONS_TABLE_NAME,
      KeyConditionExpression: '#SourceText = :SourceText',
      ExpressionAttributeNames: {
        '#SourceText': 'SourceText',
      },
      ExpressionAttributeValues: {
        ':SourceText': text,
      },
    };

    const result = await this.docClient.query(params).promise();

    return result.Count > 0;
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

      params.RequestItems[Constants.TRANSLATIONS_TABLE_NAME] = [];

      for (const Item of ddbItemsChunk) {
        params.RequestItems[Constants.TRANSLATIONS_TABLE_NAME].push({
          PutRequest: {
            Item,
          },
        });
      }

      await this.docClient.batchWrite(params).promise();
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
