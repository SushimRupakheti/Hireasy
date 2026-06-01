import { JobModel } from "../models/job.model";
import { CreateJobDto } from "../types/job.type";
import { HttpError } from "../errors/http-error";

export class JobService {
  async createJob(companyId: string, data: CreateJobDto) {
    const job = await JobModel.create({
      ...data,
      companyId,
    });

    if (!job) {
      throw new HttpError(500, "Failed to create job");
    }

    return job;
  }
}
