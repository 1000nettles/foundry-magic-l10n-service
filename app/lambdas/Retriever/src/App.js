'use strict';

const DDBCoordinator = require('./DDBCoordinator');
const TranslateCoordinator = require('./TranslateCoordinator');
const S3Coordinator = require('./S3Coordinator');
const LanguagesFileGenerator = require("./LanguagesFileGenerator");

module.exports = class App {

  async execute(event) {
    let ddbCoordinator;
    let s3Coordinator;
    let translateCoordinator;
    let languagesFileGenerator;
    let translations;
    let fileBundle;
    let download;

    const masterJobsId = this._getMasterJobsId(event);

    ddbCoordinator = new DDBCoordinator();
    s3Coordinator = new S3Coordinator(masterJobsId);
    translateCoordinator = new TranslateCoordinator(ddbCoordinator, s3Coordinator);
    languagesFileGenerator = new LanguagesFileGenerator();

    // 1. Get the actual translation strings and their string IDs from the stored
    //    translation files. These have already been translated by AWS Translate.
    try {
      translations = await translateCoordinator.retrieveGeneratedTranslations(masterJobsId);
    } catch (e) {
      return this._failureResponse(e.message);
    }

    if (!translations) {
      return this._successResponse(Number(translations));
    }

    // 2. Grab the master job from DDB and extract the stored FoundryVTT
    //    manifest out of it.
    const textTranslationJobs = await ddbCoordinator.getJobs(masterJobsId);
    const manifest = textTranslationJobs?.Items[0]?.data?.Manifest;

    console.log(manifest);

    if (!manifest) {
      return this._failureResponse(`Could not retrieve stored manifest for ${masterJobsId}`);
    }

    console.log(manifest);

    // 3. Generate the languages JSON which the module author can place into
    //    their module.json / manifest file later.
    const newLanguages = languagesFileGenerator.generate(
      manifest,
      translations
    );

    console.log(newLanguages);

    // 4. Save the actual translation files to S3, so they will (eventually)
    //    be available to the module author.
    try {
      fileBundle = await s3Coordinator.saveTranslationFiles(
        translations,
        newLanguages
      );
    } catch (e) {
      return this._failureResponse(
        `Could not save new translation files: ${e.message}`
      );
    }

    console.log(fileBundle);

    // 5. Create a new zip file with the translated files for download.
    try {
      download = await s3Coordinator.createZipFromTranslatedFiles(fileBundle);
    } catch (e) {
      return this._failureResponse(
        `Could not create final zip download bundle: ${e.message}`
      );
    }

    console.log(download);

    return this._successResponse(download);
  }

  /**
   * Get the master jobs ID from the Lambda event.
   *
   * @param {object} event
   *   The event passed from the Lambda.
   *
   * @return {string}
   *   The master jobs ID associated with all of the batch jobs.
   *
   * @private
   */
  _getMasterJobsId(event) {
    const jobsId = event?.queryStringParameters?.jobs_id;
    if (!jobsId) {
      throw new Error('No Jobs ID defined in "jobs_id" query param');
    }

    return jobsId;
  }

  _successResponse(response) {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        response,
      }),
    };
  }

  _failureResponse(message) {
    console.warn(message);

    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
      body: message,
    };
  }

}
