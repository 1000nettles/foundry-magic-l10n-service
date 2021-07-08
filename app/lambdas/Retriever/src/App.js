'use strict';

const DDBCoordinator = require('./DDBCoordinator');
const TranslateCoordinator = require('./TranslateCoordinator');
const S3Coordinator = require('./S3Coordinator');

module.exports = class App {

  async execute(event) {
    let ddbCoordinator;
    let s3Coordinator;
    let translateCoordinator;
    let doJobsExist;
    let masterJobsStatus;

    ddbCoordinator = new DDBCoordinator();
    s3Coordinator = new S3Coordinator();
    translateCoordinator = new TranslateCoordinator(ddbCoordinator, s3Coordinator);

    const masterJobsId = this._getMasterJobsId(event);

    try {
      doJobsExist = await translateCoordinator.doJobsExist(masterJobsId);
    } catch (e) {
      return this._failureResponse(e.message);
    }

    if (!doJobsExist) {
      return this._failureResponse(`No master jobs exists with ID ${masterJobsId}`);
    }

    try {
      masterJobsStatus = await translateCoordinator.retrieveGeneratedTranslations(masterJobsId);
    } catch (e) {
      return this._failureResponse(e.message);
    }

    if (!masterJobsStatus) {
      return this._successResponse(Number(masterJobsStatus));
    }

    // If we have a success status, this means we're ready to create the
    // translation bundle.


    return this._successResponse(Number(masterJobsStatus));
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
