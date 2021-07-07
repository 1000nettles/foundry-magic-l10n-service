'use strict';

const AWS = require('aws-sdk');
const { Constants } = require('shared');

module.exports = class TranslateCoordinator {


  constructor(ddbCoordinator) {
    AWS.config.update({ region: 'us-east-1', maxRetries: 5 });
    this.awsTranslate = new AWS.Translate();
    this.ddbCoordinator = ddbCoordinator;
  }

  async doJobsExist(jobsId) {
    const result = await this.ddbCoordinator.getJobs(jobsId);
    console.log(result.Items[0].data);

    if (!result?.Items || !result.Items.length) {
      return false;
    }

    return true;
  }

  async getJobsStatus(jobsId) {
    let fullyComplete = true;

    // Our JobName is just the ID of our master job to ensure we can actually
    // use the `list` functionality.
    const params = {
      Filter: {
        JobName: jobsId,
      },
    };

    const listResult = await this.awsTranslate.listTextTranslationJobs(params).promise();
    console.log(listResult);

    if (!listResult?.TextTranslationJobPropertiesList) {
      throw new Error(`No translation jobs listed with ID ${jobsId} found`);
    }

    for (const jobProperties of listResult?.TextTranslationJobPropertiesList) {
      if (jobProperties?.JobStatus !== Constants.AWS_TRANSLATE_BATCH_COMPLETE) {
        fullyComplete = false;
        break;
      }
    }

    return fullyComplete;
  }

}
