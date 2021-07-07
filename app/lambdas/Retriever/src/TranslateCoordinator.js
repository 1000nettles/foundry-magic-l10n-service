'use strict';

module.exports = class TranslateCoordinator {


  constructor(ddbCoordinator) {
    this.ddbCoordinator = ddbCoordinator;
  }

  async getJobsStatus(jobsId) {
    return this.ddbCoordinator.getJobs(jobsId);
  }

}
