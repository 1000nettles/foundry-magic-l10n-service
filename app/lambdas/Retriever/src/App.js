'use strict';

module.exports = class App {

  execute(event) {
    console.log('Got into retriever `execute`');
    const jobsId = this._getJobsId(event);
    return this._successResponse(jobsId);
  }

  _getJobsId(event) {
    const jobsId = event?.queryStringParameters?.jobs_id;
    if (!jobsId) {
      throw new Error('No Jobs ID defined in "jobs_id" query param');
    }

    return jobsId;
  }

  _successResponse(jobsId) {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jobsId,
      }),
    };
  }

}
