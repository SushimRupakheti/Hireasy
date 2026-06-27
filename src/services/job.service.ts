import mongoose from "mongoose";
import { JobModel } from "../models/job.model";
import {
  ApplicationStatus,
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
  const applicationStatusCounts = appliedWorkers.reduce(
    (counts: Record<ApplicationStatus, number>, application: any) => {
      const status = application.status as ApplicationStatus;
      if (status in counts) counts[status] += 1;
      return counts;
    },
    { pending: 0, accepted: 0, rejected: 0 }
  );

  return {
    ...publicFields,
    applicationCount: appliedWorkers.length,
    applicationStatusCounts,
  };
}

function getStartOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export class JobService {
  async closeExpiredJobs() {
    const result = await JobModel.updateMany(
      {
        job_date: { $lt: getStartOfToday() },
        status: { $in: ["pending", "open"] },
      },
      { $set: { status: "closed" } }
    );

    return result.modifiedCount;
  }

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
    await this.closeExpiredJobs();

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
    await this.closeExpiredJobs();

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
    return this.getAllJobs(query, { "appliedWorkers.worker": workerId });
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
    await this.closeExpiredJobs();

    const existingJob = await JobModel.findById(jobId).select("status");
    if (!existingJob) {
      throw new HttpError(404, "Job not found");
    }

    if (["closed", "filled", "cancelled"].includes(existingJob.status)) {
      throw new HttpError(409, `Cannot apply to a ${existingJob.status} job`);
    }

    const job = await JobModel.findOneAndUpdate(
      { _id: jobId, "appliedWorkers.worker": { $ne: workerId } },
      { $push: { appliedWorkers: { worker: workerId, status: "pending" } } },
      { new: true }
    );

    if (!job) {
      throw new HttpError(409, "You have already applied to this job");
    }

    return job;
  }

  async withdrawApplication(jobId: string, workerId: string) {
    assertValidId(jobId, "job id");
    assertValidId(workerId, "worker id");

    const job = await JobModel.findOneAndUpdate(
      { _id: jobId, "appliedWorkers.worker": workerId },
      { $pull: { appliedWorkers: { worker: workerId } } },
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
      .populate("appliedWorkers.worker", applicantFields)
      .lean();

    if (!job) {
      throw new HttpError(404, "Job not found or you do not own this job");
    }

    const applicants = {
      pending: [] as any[],
      accepted: [] as any[],
      rejected: [] as any[],
    };

    for (const application of job.appliedWorkers ?? []) {
      const status = application.status as ApplicationStatus;
      if (!applicants[status]) continue;

      applicants[status].push({
        status,
        appliedAt: application.appliedAt,
        worker: application.worker,
      });
    }

    return {
      _id: job._id,
      roleType: job.roleType,
      status: job.status,
      applicationCount: job.appliedWorkers?.length ?? 0,
      applicationStatusCounts: {
        pending: applicants.pending.length,
        accepted: applicants.accepted.length,
        rejected: applicants.rejected.length,
      },
      applicants,
    };
  }

  async updateApplicationStatus(
    jobId: string,
    companyId: string,
    workerId: string,
    status: ApplicationStatus
  ) {
    assertValidId(jobId, "job id");
    assertValidId(companyId, "company id");
    assertValidId(workerId, "worker id");

    const job = await JobModel.findOneAndUpdate(
      { _id: jobId, companyId, "appliedWorkers.worker": workerId },
      { $set: { "appliedWorkers.$.status": status } },
      { new: true, runValidators: true }
    );

    if (!job) {
      throw new HttpError(404, "Job or application not found, or you do not own this job");
    }

    return job;
  }
}
