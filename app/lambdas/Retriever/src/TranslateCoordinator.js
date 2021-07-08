'use strict';

const AWS = require('aws-sdk');
const { Constants } = require('shared');

module.exports = class TranslateCoordinator {

  constructor(ddbCoordinator) {
    AWS.config.update({ region: 'us-east-1', maxRetries: 5 });
    this.awsTranslate = new AWS.Translate();
    this.ddbCoordinator = ddbCoordinator;

    // Provide mechanism for caching our response back from listing text
    // translation jobs.
    this.listedTextTranslationJobs = null;
  }

  async doJobsExist(masterJobsId) {
    const result = await this.ddbCoordinator.getJobs(masterJobsId);
    console.log(result.Items[0].data);

    if (!result?.Items || !result.Items.length) {
      return false;
    }

    return true;
  }

  async retrieveGeneratedTranslations(masterJobsId) {
    const isMasterJobReady = await this._isMasterJobReady(masterJobsId);
    if (!isMasterJobReady) {
      return null;
    }

    return 1;

    const listedJobs = await this._getTextTranslationJobs(masterJobsId);
    for (const jobProperties of listedJobs?.TextTranslationJobPropertiesList) {

    }
  }

  async _isMasterJobReady(masterJobsId) {
    const listedJobs = await this._getTextTranslationJobs(masterJobsId);

    let allJobsComplete = true;
    for (const jobProperties of listedJobs?.TextTranslationJobPropertiesList) {
      if (jobProperties?.JobStatus !== Constants.AWS_TRANSLATE_BATCH_COMPLETE) {
        allJobsComplete = false;
        break;
      }
    }

    return allJobsComplete;
  }

  async _getTextTranslationJobs(masterJobsId) {
    if (this.listedTextTranslationJobs) {
      return this.listedTextTranslationJobs;
    }

    // Our JobName is just the ID of our master job to ensure we can actually
    // use the `list` functionality.
    const params = {
      Filter: {
        JobName: masterJobsId,
      },
    };

    const listedTextTranslationJobs = await this
      .awsTranslate
      .listTextTranslationJobs(params)
      .promise();

    if (!listedTextTranslationJobs?.TextTranslationJobPropertiesList) {
      throw new Error(`No translation jobs listed with ID ${masterJobsId} found`);
    }

    /*console.log(listedTextTranslationJobs);
    console.log(listedTextTranslationJobs.TextTranslationJobPropertiesList[0].JobDetails);
    console.log(listedTextTranslationJobs.TextTranslationJobPropertiesList[0].InputDataConfig);
    console.log(listedTextTranslationJobs.TextTranslationJobPropertiesList[0].OutputDataConfig);*/

    this.listedTextTranslationJobs = listedTextTranslationJobs;

    return this.listedTextTranslationJobs;
  }

}
