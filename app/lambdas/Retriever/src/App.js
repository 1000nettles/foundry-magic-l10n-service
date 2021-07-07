'use strict';

const DDBCoordinator = require('./DDBCoordinator');
const TranslateCoordinator = require('./TranslateCoordinator');

module.exports = class App {

  async execute(event) {
    let ddbCoordinator;
    let translateCoordinator;
    let doJobsExist;
    let jobsStatus;

    ddbCoordinator = new DDBCoordinator();
    translateCoordinator = new TranslateCoordinator(ddbCoordinator);

    const jobsId = this._getJobsId(event);

    try {
      doJobsExist = await translateCoordinator.doJobsExist(jobsId);
    } catch (e) {
      return this._failureResponse(e.message);
    }

    if (!doJobsExist) {
      return this._failureResponse(`No jobs exist with ID ${jobsId}`);
    }

    try {
      jobsStatus = await translateCoordinator.getJobsStatus(jobsId);
    } catch (e) {
      return this._failureResponse(e.message);
    }

    return this._successResponse(Number(jobsStatus));
  }

  _getJobsId(event) {
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
