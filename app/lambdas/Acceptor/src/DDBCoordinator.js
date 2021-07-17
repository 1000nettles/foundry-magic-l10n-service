const { config, DynamoDB } = require('aws-sdk');
const { Constants } = require('shared');

/**
 * The DynamoDB coordinator.
 */
module.exports = class DDBCoordinator {
  constructor() {
    config.update({
      region: Constants.AWS_REGION,
    });

    /**
     * Our DocumentClient instance.
     *
     * @type {import('aws-sdk').DynamoDB.DocumentClient}
     */
    this.docClient = new DynamoDB.DocumentClient();
  }

  /**
   * Check if the translation from a text exists.
   *
   * @param {string} text
   *   The original, untranslated text to query for.
   *
   * @return {Promise<boolean>}
   *   A promise showing if the record exists or not.
   */
  async exists(text) {
    const params = {
      TableName: Constants.DDB_TABLE_NAME,
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
   * @return {Promise<unknown[]>}
   */
  async save(ddbItems) {
    const ddbItemsChunked = this._chunk(ddbItems);

    // Have to chunk our array as DynamoDB has batch processing limits.
    const batchWritePromises = [];
    for (const ddbItemsChunk of ddbItemsChunked) {
      const params = {
        RequestItems: {},
      };

      params.RequestItems[Constants.DDB_TABLE_NAME] = [];

      for (const Item of ddbItemsChunk) {
        params.RequestItems[Constants.DDB_TABLE_NAME].push({
          PutRequest: {
            Item,
          },
        });
      }

      batchWritePromises.push(
        this.docClient.batchWrite(params).promise(),
      );
    }

    return Promise.all(batchWritePromises);
  }

  /**
   * Save the translation jobs.
   *
   * @param {array} jobs
   *   An array of the jobs we want to record.
   * @param {string} masterJobId
   *   The pre-generated UUID representing the master job for all translations.
   *
   * @return {Promise<*>}
   *   The result of the saving to DDB.
   */
  saveTranslationJob(jobs, masterJobId, manifest) {
    const data = {
      ID: masterJobId,
      Jobs: jobs,
      Manifest: manifest,
    };

    const params = {
      TableName: Constants.DDB_TABLE_NAME,
      Item: {
        pk: 'TRANSLATION_JOBS',
        sk: `TRANSLATION_JOB#${masterJobId}`,
        data,
      },
    };

    return this.docClient.put(params).promise();
  }

  /**
   * Chunk our array out for DDB batching.
   *
   * @param {array} array
   *   Array to be chunked.
   *
   * @see https://stackoverflow.com/a/8495740/823549
   *
   * @return {*[]}  The chunked results
   *
   * @private
   */
  _chunk(array) {
    let i;
    let j;
    const result = [];
    const chunk = 25;

    for (i = 0, j = array.length; i < j; i += chunk) {
      result.push(
        array.slice(i, i + chunk),
      );
    }

    return result;
  }
};
