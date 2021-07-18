const { Constants } = require('shared');
const DDBCoordinator = require('./DDBCoordinator');
const TranslateCoordinator = require('./TranslateCoordinator');
const S3Coordinator = require('./S3Coordinator');
const LanguagesFileGenerator = require('./LanguagesFileGenerator');

module.exports = class App {
  /**
   * Execute the main functionality of the application.
   *
   * @param {object} event
   *   An event passed from the lambda.
   *
   * @return {Promise<import('shared').ResponseObject>}
   *   An HTTP response structured for the lambda.
   */
  async execute(event) {
    let translations;
    let fileBundle;
    let download;

    const masterJobsId = this._getMasterJobsId(event);

    const ddbCoordinator = new DDBCoordinator();
    const s3Coordinator = new S3Coordinator(masterJobsId);
    const translateCoordinator = new TranslateCoordinator(s3Coordinator);
    const languagesFileGenerator = new LanguagesFileGenerator();

    // 1. Get the actual translation strings and their string IDs from the stored
    //    translation files. These have already been translated by AWS Translate.
    try {
      translations = await translateCoordinator.retrieveGeneratedTranslations(masterJobsId);
    } catch (e) {
      return this._failureResponse(e.message);
    }

    if (!translations) {
      return this._successResponse({ status: Constants.JOB_PROCESSING });
    }

    // 2. Grab the master job from DDB and extract the stored FoundryVTT
    //    manifest out of it.
    const textTranslationJobs = await ddbCoordinator.getJobs(masterJobsId);
    const manifest = textTranslationJobs?.Items[0]?.data?.Manifest;

    if (!manifest) {
      return this._failureResponse(`Could not retrieve stored manifest for ${masterJobsId}`);
    }

    console.log(manifest);

    // 3. Generate the languages JSON which the module author can place into
    //    their manifest file later.
    const newLanguages = languagesFileGenerator.generate(
      manifest,
      translations,
    );

    console.log(newLanguages);

    // 4. Save the actual translation files to S3, so they will (eventually)
    //    be available to the module author.
    try {
      fileBundle = await s3Coordinator.saveTranslationFiles(
        translations,
        newLanguages,
      );
    } catch (e) {
      return this._failureResponse(
        `Could not save new translation files: ${e.message}`,
      );
    }

    console.log(fileBundle);

    // 5. Create a new zip file with the translated files for download.
    try {
      download = await s3Coordinator.createZipFromTranslatedFiles(fileBundle);
    } catch (e) {
      return this._failureResponse(
        `Could not create final zip download bundle: ${e.message}`,
      );
    }

    console.log(download);

    return this._successResponse({ status: Constants.JOB_COMPLETE, download });
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

  /**
   * A succes response.
   *
   * @param {object} response The success response.
   *
   * @returns {import('shared').ResponseObject}
   */
  _successResponse(response) {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(response),
    };
  }

  /**
   * A failure response.
   *
   * @param {string|object} response The response explaining the failure.
   *
   * @returns {import('shared').ResponseObject}
   */
  _failureResponse(response) {
    console.warn(response);

    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
      body: response,
    };
  }
};
