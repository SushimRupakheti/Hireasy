import mongoose from "mongoose";
import { JobModel } from "../models/job.model";
import {
  CreateJobDto,
  JobListQueryDto,
  JobStatus,
  UpdateJobDto,
} from "../types/job.type";
import { HttpError } from "../errors/http-error";

const companyFields = "companyName firstName lastName address profileImage";
const applicantFields =
  "firstName lastName email contactNo address interestedFields profileImage";

function assertValidId(id: string, fieldName: string) {
  if (!mongoose.isValidObjectId(id)) {
    throw new HttpError(400, `Invalid ${fieldName}`);
  }
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toPublicJob(job: Record<string, any>) {
  const { appliedWorkers = [], ...publicFields } = job;
  return {
    ...publicFields,
    applicationCount: appliedWorkers.length,
  };
}

export class JobService {
  async createJob(companyId: string, data: CreateJobDto) {
    assertValidId(companyId, "company id");

    const job = await JobModel.create({
      ...data,
      companyId,
    });

    if (!job) {
      throw new HttpError(500, "Failed to create job");
    }

    return job;
  }

  async getAllJobs(
    query: JobListQueryDto,
    additionalFilter: Record<string, any> = {}
  ) {
    const {
      page,
      limit,
      search,
      roleType,
      location,
      shift,
      status,
      companyId,
      minPay,
      maxPay,
    } = query;

    const filter: Record<string, any> = { ...additionalFilter };

    if (companyId) {
      assertValidId(companyId, "company id");
      filter.companyId = companyId;
    }
    if (roleType) filter.roleType = new RegExp(escapeRegex(roleType), "i");
    if (location) filter.location = new RegExp(escapeRegex(location), "i");
    if (shift) filter.shift = shift;
    if (status) filter.status = status;

    if (minPay !== undefined || maxPay !== undefined) {
      filter.pay = {};
      if (minPay !== undefined) filter.pay.$gte = minPay;
      if (maxPay !== undefined) filter.pay.$lte = maxPay;
    }

    if (search) {
      const searchPattern = new RegExp(escapeRegex(search), "i");
      filter.$or = [
        { roleType: searchPattern },
        { location: searchPattern },
        { description: searchPattern },
      ];
    }

    const skip = (page - 1) * limit;
    const [jobs, total] = await Promise.all([
      JobModel.find(filter)
        .populate("companyId", companyFields)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      JobModel.countDocuments(filter),
    ]);

    return {
      jobs: jobs.map((job) => toPublicJob(job as Record<string, any>)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    };
  }

  async getJobById(jobId: string) {
    assertValidId(jobId, "job id");

    const job = await JobModel.findById(jobId)
      .populate("companyId", companyFields)
      .lean();

    if (!job) {
      throw new HttpError(404, "Job not found");
    }

    return toPublicJob(job as Record<string, any>);
  }

  async getCompanyJobs(companyId: string, query: JobListQueryDto) {
    assertValidId(companyId, "company id");
    return this.getAllJobs({ ...query, companyId });
  }

  async getAppliedJobs(workerId: string, query: JobListQueryDto) {
    assertValidId(workerId, "worker id");
    return this.getAllJobs(query, { appliedWorkers: workerId });
  }

  async updateJob(jobId: string, companyId: string, data: UpdateJobDto) {
    assertValidId(jobId, "job id");
    assertValidId(companyId, "company id");

    const job = await JobModel.findOneAndUpdate(
      { _id: jobId, companyId },
      { $set: data },
      { new: true, runValidators: true }
    );

    if (!job) {
      throw new HttpError(404, "Job not found or you do not own this job");
    }

    return job;
  }

  async updateJobStatus(
    jobId: string,
    companyId: string,
    status: JobStatus
  ) {
    assertValidId(jobId, "job id");
    assertValidId(companyId, "company id");

    const job = await JobModel.findOneAndUpdate(
      { _id: jobId, companyId },
      { $set: { status } },
      { new: true, runValidators: true }
    );

    if (!job) {
      throw new HttpError(404, "Job not found or you do not own this job");
    }

    return job;
  }

  async deleteJob(jobId: string, companyId: string) {
    assertValidId(jobId, "job id");
    assertValidId(companyId, "company id");

    const job = await JobModel.findOneAndDelete({ _id: jobId, companyId });

    if (!job) {
      throw new HttpError(404, "Job not found or you do not own this job");
    }

    return job;
  }

  async applyForJob(jobId: string, workerId: string) {
    assertValidId(jobId, "job id");
    assertValidId(workerId, "worker id");

    const existingJob = await JobModel.findById(jobId).select("status");
    if (!existingJob) {
      throw new HttpError(404, "Job not found");
    }

    if (["closed", "filled", "cancelled"].includes(existingJob.status)) {
      throw new HttpError(409, `Cannot apply to a ${existingJob.status} job`);
    }

    const job = await JobModel.findByIdAndUpdate(
      jobId,
      { $addToSet: { appliedWorkers: workerId } },
      { new: true }
    );

    if (!job) {
      throw new HttpError(404, "Job not found");
    }

    return job;
  }

  async withdrawApplication(jobId: string, workerId: string) {
    assertValidId(jobId, "job id");
    assertValidId(workerId, "worker id");

    const job = await JobModel.findOneAndUpdate(
      { _id: jobId, appliedWorkers: workerId },
      { $pull: { appliedWorkers: workerId } },
      { new: true }
    );

    if (!job) {
      throw new HttpError(404, "Job or application not found");
    }

    return job;
  }

  async getJobApplicants(jobId: string, companyId: string) {
    assertValidId(jobId, "job id");
    assertValidId(companyId, "company id");

    const job = await JobModel.findOne({ _id: jobId, companyId })
      .select("roleType status appliedWorkers")
      .populate("appliedWorkers", applicantFields)
      .lean();

    if (!job) {
      throw new HttpError(404, "Job not found or you do not own this job");
    }

    return job;
  }
}
