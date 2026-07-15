"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobService = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const job_model_1 = require("../models/job.model");
const http_error_1 = require("../errors/http-error");
const companyFields = "companyName firstName lastName address profileImage";
const applicantFields = "firstName lastName email contactNo address interestedFields profileImage";
function assertValidId(id, fieldName) {
    if (!mongoose_1.default.isValidObjectId(id)) {
        throw new http_error_1.HttpError(400, `Invalid ${fieldName}`);
    }
}
function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function toPublicJob(job) {
    const { appliedWorkers = [], ...publicFields } = job;
    const applicationStatusCounts = appliedWorkers.reduce((counts, application) => {
        const status = application.status;
        if (status in counts)
            counts[status] += 1;
        return counts;
    }, { pending: 0, accepted: 0, rejected: 0, completed: 0 });
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
class JobService {
    async closeExpiredJobs() {
        const result = await job_model_1.JobModel.updateMany({
            job_date: { $lt: getStartOfToday() },
            status: { $in: ["pending", "open"] },
        }, { $set: { status: "closed" } });
        return result.modifiedCount;
    }
    async createJob(companyId, data) {
        assertValidId(companyId, "company id");
        const job = await job_model_1.JobModel.create({
            ...data,
            companyId,
        });
        if (!job) {
            throw new http_error_1.HttpError(500, "Failed to create job");
        }
        return job;
    }
    async getAllJobs(query, additionalFilter = {}) {
        await this.closeExpiredJobs();
        const { page, limit, search, roleType, location, shift, status, companyId, minPay, maxPay, } = query;
        const filter = { ...additionalFilter };
        if (companyId) {
            assertValidId(companyId, "company id");
            filter.companyId = companyId;
        }
        if (roleType)
            filter.roleType = new RegExp(escapeRegex(roleType), "i");
        if (location)
            filter.location = new RegExp(escapeRegex(location), "i");
        if (shift)
            filter.shift = shift;
        if (status)
            filter.status = status;
        if (minPay !== undefined || maxPay !== undefined) {
            filter.pay = {};
            if (minPay !== undefined)
                filter.pay.$gte = minPay;
            if (maxPay !== undefined)
                filter.pay.$lte = maxPay;
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
            job_model_1.JobModel.find(filter)
                .populate("companyId", companyFields)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            job_model_1.JobModel.countDocuments(filter),
        ]);
        return {
            jobs: jobs.map((job) => toPublicJob(job)),
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
    async getJobById(jobId) {
        assertValidId(jobId, "job id");
        await this.closeExpiredJobs();
        const job = await job_model_1.JobModel.findById(jobId)
            .populate("companyId", companyFields)
            .lean();
        if (!job) {
            throw new http_error_1.HttpError(404, "Job not found");
        }
        return toPublicJob(job);
    }
    async getCompanyJobs(companyId, query) {
        assertValidId(companyId, "company id");
        return this.getAllJobs({ ...query, companyId });
    }
    async getAppliedJobs(workerId, query) {
        assertValidId(workerId, "worker id");
        return this.getAllJobs(query, { "appliedWorkers.worker": workerId });
    }
    async updateJob(jobId, companyId, data) {
        assertValidId(jobId, "job id");
        assertValidId(companyId, "company id");
        const job = await job_model_1.JobModel.findOneAndUpdate({ _id: jobId, companyId }, { $set: data }, { new: true, runValidators: true });
        if (!job) {
            throw new http_error_1.HttpError(404, "Job not found or you do not own this job");
        }
        return job;
    }
    async updateJobStatus(jobId, companyId, status) {
        assertValidId(jobId, "job id");
        assertValidId(companyId, "company id");
        const job = await job_model_1.JobModel.findOneAndUpdate({ _id: jobId, companyId }, { $set: { status } }, { new: true, runValidators: true });
        if (!job) {
            throw new http_error_1.HttpError(404, "Job not found or you do not own this job");
        }
        return job;
    }
    async deleteJob(jobId, companyId) {
        assertValidId(jobId, "job id");
        assertValidId(companyId, "company id");
        const job = await job_model_1.JobModel.findOneAndDelete({ _id: jobId, companyId });
        if (!job) {
            throw new http_error_1.HttpError(404, "Job not found or you do not own this job");
        }
        return job;
    }
    async applyForJob(jobId, workerId) {
        assertValidId(jobId, "job id");
        assertValidId(workerId, "worker id");
        await this.closeExpiredJobs();
        const existingJob = await job_model_1.JobModel.findById(jobId).select("status");
        if (!existingJob) {
            throw new http_error_1.HttpError(404, "Job not found");
        }
        if (["closed", "filled", "cancelled"].includes(existingJob.status)) {
            throw new http_error_1.HttpError(409, `Cannot apply to a ${existingJob.status} job`);
        }
        const job = await job_model_1.JobModel.findOneAndUpdate({ _id: jobId, "appliedWorkers.worker": { $ne: workerId } }, { $push: { appliedWorkers: { worker: workerId, status: "pending" } } }, { new: true });
        if (!job) {
            throw new http_error_1.HttpError(409, "You have already applied to this job");
        }
        return job;
    }
    async withdrawApplication(jobId, workerId) {
        assertValidId(jobId, "job id");
        assertValidId(workerId, "worker id");
        const job = await job_model_1.JobModel.findOneAndUpdate({ _id: jobId, "appliedWorkers.worker": workerId }, { $pull: { appliedWorkers: { worker: workerId } } }, { new: true });
        if (!job) {
            throw new http_error_1.HttpError(404, "Job or application not found");
        }
        return job;
    }
    async getJobApplicants(jobId, companyId) {
        assertValidId(jobId, "job id");
        assertValidId(companyId, "company id");
        const job = await job_model_1.JobModel.findOne({ _id: jobId, companyId })
            .select("roleType status appliedWorkers")
            .populate("appliedWorkers.worker", applicantFields)
            .lean();
        if (!job) {
            throw new http_error_1.HttpError(404, "Job not found or you do not own this job");
        }
        const applicants = {
            pending: [],
            accepted: [],
            rejected: [],
            completed: [],
        };
        for (const application of job.appliedWorkers ?? []) {
            const status = application.status;
            if (!applicants[status])
                continue;
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
                completed: applicants.completed.length,
            },
            applicants,
        };
    }
    async updateApplicationStatus(jobId, companyId, workerId, status) {
        assertValidId(jobId, "job id");
        assertValidId(companyId, "company id");
        assertValidId(workerId, "worker id");
        const job = await job_model_1.JobModel.findOneAndUpdate({ _id: jobId, companyId, "appliedWorkers.worker": workerId }, { $set: { "appliedWorkers.$.status": status } }, { new: true, runValidators: true });
        if (!job) {
            throw new http_error_1.HttpError(404, "Job or application not found, or you do not own this job");
        }
        return job;
    }
}
exports.JobService = JobService;
