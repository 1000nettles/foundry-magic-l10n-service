'use strict';

const AWS = require('aws-sdk');
const he = require('he');
const { Constants } = require('shared');

module.exports = class TranslateCoordinator {

  constructor(ddbCoordinator, s3Coordinator) {
    AWS.config.update({ region: 'us-east-1', maxRetries: 5 });
    this.awsTranslate = new AWS.Translate();
    this.ddbCoordinator = ddbCoordinator;
    this.s3Coordinator = s3Coordinator;

    // Provide mechanism for caching our response back from listing text
    // translation jobs.
    this.listedTextTranslationJobs = null;
  }

  async getTextTranslationJobs(masterJobsId) {
    return this._getTextTranslationJobs(masterJobsId);
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

    const listedJobs = await this._getTextTranslationJobs(masterJobsId);
    let finalGeneratedTranslations = [];

    for (const jobProperties of listedJobs?.TextTranslationJobPropertiesList) {
      const s3Key = jobProperties.OutputDataConfig.S3Uri
        .replace(`s3://${Constants.AWS_S3_BUCKET_NAME}/`, '');
      const languageTranslatedTo = jobProperties.TargetLanguageCodes[0];
      const translatedFilePath = s3Key + languageTranslatedTo + '.' + Constants.SOURCE_BATCH_FILENAME;
      const fileContent = await this.s3Coordinator.readFile(translatedFilePath);

      const contentParts = fileContent.split(Constants.BATCH_NEWLINE_SEPARATOR);
      for (const contentPart of contentParts) {
        // Get the FoundryVTT translation string ID out of the HTML portion.
        let stringId;
        let sanitizedValue = contentPart.trim().replace(/<span translate="no">(.*?)<\/span>/g, (match, content) => {
          if (typeof content === undefined) {
            throw new Error(`Could not extract FoundryVTT string ID out of ${sanitizedValue}`);
          }

          stringId = content;

          // Finally, strip the HTML out of the string to get the final
          // translated value.
          return '';
        });

        // The end of the file has extra content which doesn't convert properly.
        // If we can't extract a string ID, it means we've hit it.
        if (!stringId) {
          continue;
        }

        // Finally, ensure our HTML entities are converted back to text.
        sanitizedValue = he.decode(sanitizedValue).trim();

        finalGeneratedTranslations[languageTranslatedTo] = finalGeneratedTranslations[languageTranslatedTo] || {};
        finalGeneratedTranslations[languageTranslatedTo][stringId] = sanitizedValue;
      }

      console.log('final generated translations');
      console.log(finalGeneratedTranslations);
    }

    return finalGeneratedTranslations;
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
