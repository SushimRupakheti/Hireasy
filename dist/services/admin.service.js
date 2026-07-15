"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const mongoose_1 = __importDefault(require("mongoose"));
const config_1 = require("../config");
const http_error_1 = require("../errors/http-error");
const audit_log_model_1 = require("../models/audit-log.model");
const job_model_1 = require("../models/job.model");
const user_model_1 = require("../models/user.model");
const userSafeProjection = "-password";
const workerPopulateFields = "firstName lastName email contactNo address interestedFields profileImage document status";
const companyPopulateFields = "companyName firstName lastName email contactNo address profileImage document status";
function assertValidObjectId(id, name) {
    if (!mongoose_1.default.isValidObjectId(id)) {
        throw new http_error_1.HttpError(400, `Invalid ${name}`);
    }
}
function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function getPagination(page, limit) {
    return { skip: (page - 1) * limit, page, limit };
}
function safeUser(user) {
    const object = user && typeof user.toObject === "function" ? user.toObject() : user || {};
    const { password, ...rest } = object;
    return rest;
}
class AdminService {
    async login(email, password) {
        const admin = await user_model_1.UserModel.findOne({ email, role: "admin" });
        if (!admin)
            throw new http_error_1.HttpError(401, "Invalid admin credentials");
        const isValid = await bcryptjs_1.default.compare(password, admin.password || "");
        if (!isValid)
            throw new http_error_1.HttpError(401, "Invalid admin credentials");
        if (admin.status === "blocked" || admin.status === "suspended") {
            throw new http_error_1.HttpError(403, "Admin account is blocked");
        }
        const token = jsonwebtoken_1.default.sign({ id: admin._id, email: admin.email, role: admin.role }, config_1.JWT_SECRET, { expiresIn: "30d" });
        return { token, user: safeUser(admin) };
    }
    async dashboard() {
        const now = new Date();
        const since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const [totalUsers, totalWorkers, totalCompanies, pendingVerifications, verifiedUsers, rejectedUsers, totalJobs, pendingJobs, activeJobs, totalApplicationsAgg, recentRegistrations, recentJobPosts,] = await Promise.all([
            user_model_1.UserModel.countDocuments(),
            user_model_1.UserModel.countDocuments({ role: "user" }),
            user_model_1.UserModel.countDocuments({ role: "company" }),
            user_model_1.UserModel.countDocuments({
                document: { $ne: null },
                $or: [
                    { "document.verification.status": "pending" },
                    { "document.verification.status": { $exists: false } },
                ],
            }),
            user_model_1.UserModel.countDocuments({ status: "verified" }),
            user_model_1.UserModel.countDocuments({ status: "rejected" }),
            job_model_1.JobModel.countDocuments(),
            job_model_1.JobModel.countDocuments({ status: "pending" }),
            job_model_1.JobModel.countDocuments({ status: { $in: ["open", "verified"] } }),
            job_model_1.JobModel.aggregate([
                { $project: { count: { $size: "$appliedWorkers" } } },
                { $group: { _id: null, total: { $sum: "$count" } } },
            ]),
            user_model_1.UserModel.find({ createdAt: { $gte: since } })
                .select(userSafeProjection)
                .sort({ createdAt: -1 })
                .limit(10)
                .lean(),
            job_model_1.JobModel.find({ createdAt: { $gte: since } })
                .populate("companyId", companyPopulateFields)
                .sort({ createdAt: -1 })
                .limit(10)
                .lean(),
        ]);
        return {
            counts: {
                totalUsers,
                totalWorkers,
                totalCompanies,
                pendingVerifications,
                verifiedUsers,
                rejectedUsers,
                totalJobs,
                pendingJobs,
                activeVerifiedJobs: activeJobs,
                totalApplications: totalApplicationsAgg[0]?.total || 0,
            },
            recentRegistrations,
            recentJobPosts,
        };
    }
    async listUsers(query) {
        const { page, limit, search, role, status, dateFrom, dateTo } = query;
        const filter = {};
        if (role)
            filter.role = role;
        if (status)
            filter.status = status;
        if (dateFrom || dateTo) {
            filter.createdAt = {};
            if (dateFrom)
                filter.createdAt.$gte = dateFrom;
            if (dateTo)
                filter.createdAt.$lte = dateTo;
        }
        if (search) {
            const pattern = new RegExp(escapeRegex(search), "i");
            filter.$or = [
                { firstName: pattern },
                { lastName: pattern },
                { companyName: pattern },
                { email: pattern },
                { contactNo: pattern },
            ];
        }
        const { skip } = getPagination(page, limit);
        const [users, total] = await Promise.all([
            user_model_1.UserModel.find(filter)
                .select(userSafeProjection)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            user_model_1.UserModel.countDocuments(filter),
        ]);
        return this.withPagination(users, total, page, limit);
    }
    async getUser(id) {
        assertValidObjectId(id, "user id");
        const user = await user_model_1.UserModel.findById(id).select(userSafeProjection).lean();
        if (!user)
            throw new http_error_1.HttpError(404, "User not found");
        const jobs = user.role === "company"
            ? await job_model_1.JobModel.find({ companyId: id }).sort({ createdAt: -1 }).lean()
            : [];
        return { user, jobs };
    }
    async updateUser(adminId, id, data) {
        assertValidObjectId(id, "user id");
        const oldUser = await user_model_1.UserModel.findById(id).select(userSafeProjection).lean();
        if (!oldUser)
            throw new http_error_1.HttpError(404, "User not found");
        const updatedUser = await user_model_1.UserModel.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true })
            .select(userSafeProjection)
            .lean();
        await this.audit(adminId, "user.updated", "user", id, oldUser, updatedUser);
        return updatedUser;
    }
    async updateUserStatus(adminId, id, status, reason) {
        assertValidObjectId(id, "user id");
        const oldUser = await user_model_1.UserModel.findById(id).select(userSafeProjection).lean();
        if (!oldUser)
            throw new http_error_1.HttpError(404, "User not found");
        const updatedUser = await user_model_1.UserModel.findByIdAndUpdate(id, { $set: { status } }, { new: true, runValidators: true })
            .select(userSafeProjection)
            .lean();
        await this.audit(adminId, `user.status.${status}`, "user", id, { status: oldUser.status }, { status }, reason);
        return updatedUser;
    }
    async deleteUser(adminId, id) {
        assertValidObjectId(id, "user id");
        const deleted = await user_model_1.UserModel.findByIdAndDelete(id).select(userSafeProjection).lean();
        if (!deleted)
            throw new http_error_1.HttpError(404, "User not found");
        await this.audit(adminId, "user.deleted", "user", id, deleted, null);
        return deleted;
    }
    async listPendingDocuments(query) {
        const { page, limit } = query;
        const filter = {
            document: { $ne: null },
            $or: [
                { "document.verification.status": "pending" },
                { "document.verification.status": { $exists: false } },
            ],
        };
        const { skip } = getPagination(page, limit);
        const [items, total] = await Promise.all([
            user_model_1.UserModel.find(filter)
                .select(userSafeProjection)
                .sort({ "document.uploadedAt": 1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            user_model_1.UserModel.countDocuments(filter),
        ]);
        return this.withPagination(items, total, page, limit);
    }
    async approveDocument(adminId, userId) {
        assertValidObjectId(userId, "user id");
        const oldUser = await user_model_1.UserModel.findById(userId).select(userSafeProjection).lean();
        if (!oldUser)
            throw new http_error_1.HttpError(404, "User not found");
        if (!oldUser.document)
            throw new http_error_1.HttpError(404, "No document found");
        const updatedUser = await user_model_1.UserModel.findByIdAndUpdate(userId, {
            $set: {
                status: "verified",
                "document.verification": {
                    status: "approved",
                    reviewedBy: adminId,
                    reviewedAt: new Date(),
                },
            },
        }, { new: true, runValidators: true })
            .select(userSafeProjection)
            .lean();
        await this.audit(adminId, "document.approved", "document", userId, oldUser.document, updatedUser?.document);
        return updatedUser;
    }
    async rejectDocument(adminId, userId, reason) {
        assertValidObjectId(userId, "user id");
        const oldUser = await user_model_1.UserModel.findById(userId).select(userSafeProjection).lean();
        if (!oldUser)
            throw new http_error_1.HttpError(404, "User not found");
        if (!oldUser.document)
            throw new http_error_1.HttpError(404, "No document found");
        const updatedUser = await user_model_1.UserModel.findByIdAndUpdate(userId, {
            $set: {
                status: "rejected",
                "document.verification": {
                    status: "rejected",
                    reason,
                    reviewedBy: adminId,
                    reviewedAt: new Date(),
                },
            },
        }, { new: true, runValidators: true })
            .select(userSafeProjection)
            .lean();
        await this.audit(adminId, "document.rejected", "document", userId, oldUser.document, updatedUser?.document, reason);
        return updatedUser;
    }
    async listJobs(query) {
        const { page, limit, search, companyId, status, roleType, location, jobDateFrom, jobDateTo, } = query;
        const filter = {};
        if (companyId) {
            assertValidObjectId(companyId, "company id");
            filter.companyId = companyId;
        }
        if (status)
            filter.status = status;
        if (roleType)
            filter.roleType = new RegExp(escapeRegex(roleType), "i");
        if (location)
            filter.location = new RegExp(escapeRegex(location), "i");
        if (jobDateFrom || jobDateTo) {
            filter.job_date = {};
            if (jobDateFrom)
                filter.job_date.$gte = jobDateFrom;
            if (jobDateTo)
                filter.job_date.$lte = jobDateTo;
        }
        if (search) {
            const pattern = new RegExp(escapeRegex(search), "i");
            filter.$or = [
                { roleType: pattern },
                { location: pattern },
                { description: pattern },
            ];
        }
        const { skip } = getPagination(page, limit);
        const [jobs, total] = await Promise.all([
            job_model_1.JobModel.find(filter)
                .populate("companyId", companyPopulateFields)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            job_model_1.JobModel.countDocuments(filter),
        ]);
        return this.withPagination(jobs, total, page, limit);
    }
    async getJob(id) {
        assertValidObjectId(id, "job id");
        const job = await job_model_1.JobModel.findById(id)
            .populate("companyId", companyPopulateFields)
            .populate("appliedWorkers.worker", workerPopulateFields)
            .lean();
        if (!job)
            throw new http_error_1.HttpError(404, "Job not found");
        return job;
    }
    async updateJob(adminId, id, data) {
        assertValidObjectId(id, "job id");
        const oldJob = await job_model_1.JobModel.findById(id).lean();
        if (!oldJob)
            throw new http_error_1.HttpError(404, "Job not found");
        const updatedJob = await job_model_1.JobModel.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true }).lean();
        await this.audit(adminId, "job.updated", "job", id, oldJob, updatedJob);
        return updatedJob;
    }
    async updateJobStatus(adminId, id, status, reason) {
        assertValidObjectId(id, "job id");
        const oldJob = await job_model_1.JobModel.findById(id).select("status").lean();
        if (!oldJob)
            throw new http_error_1.HttpError(404, "Job not found");
        const updatedJob = await job_model_1.JobModel.findByIdAndUpdate(id, { $set: { status } }, { new: true, runValidators: true }).lean();
        await this.audit(adminId, `job.status.${status}`, "job", id, oldJob, { status }, reason);
        return updatedJob;
    }
    async deleteJob(adminId, id) {
        assertValidObjectId(id, "job id");
        const deleted = await job_model_1.JobModel.findByIdAndDelete(id).lean();
        if (!deleted)
            throw new http_error_1.HttpError(404, "Job not found");
        await this.audit(adminId, "job.deleted", "job", id, deleted, null);
        return deleted;
    }
    async listApplications(query) {
        const { page, limit, jobId, workerId, status } = query;
        const filter = {};
        if (jobId) {
            assertValidObjectId(jobId, "job id");
            filter._id = jobId;
        }
        if (workerId) {
            assertValidObjectId(workerId, "worker id");
            filter["appliedWorkers.worker"] = workerId;
        }
        if (status)
            filter["appliedWorkers.status"] = status;
        const jobs = await job_model_1.JobModel.find(filter)
            .populate("companyId", companyPopulateFields)
            .populate("appliedWorkers.worker", workerPopulateFields)
            .sort({ createdAt: -1 })
            .lean();
        const applications = jobs.flatMap((job) => (job.appliedWorkers || [])
            .filter((application) => {
            if (workerId && application.worker?._id?.toString() !== workerId)
                return false;
            if (status && application.status !== status)
                return false;
            return true;
        })
            .map((application) => ({
            job: {
                _id: job._id,
                roleType: job.roleType,
                status: job.status,
                company: job.companyId,
                job_date: job.job_date,
            },
            worker: application.worker,
            status: application.status,
            appliedAt: application.appliedAt,
        })));
        const start = (page - 1) * limit;
        return this.withPagination(applications.slice(start, start + limit), applications.length, page, limit);
    }
    async updateApplicationStatus(adminId, jobId, workerId, status, reason) {
        assertValidObjectId(jobId, "job id");
        assertValidObjectId(workerId, "worker id");
        const job = await job_model_1.JobModel.findOne({
            _id: jobId,
            "appliedWorkers.worker": workerId,
        }).lean();
        if (!job)
            throw new http_error_1.HttpError(404, "Job or application not found");
        const oldApplication = job.appliedWorkers.find((application) => application.worker.toString() === workerId);
        const updatedJob = await job_model_1.JobModel.findOneAndUpdate({ _id: jobId, "appliedWorkers.worker": workerId }, { $set: { "appliedWorkers.$.status": status } }, { new: true, runValidators: true })
            .populate("appliedWorkers.worker", workerPopulateFields)
            .lean();
        await this.audit(adminId, `application.status.${status}`, "application", `${jobId}:${workerId}`, oldApplication, { worker: workerId, status }, reason);
        return updatedJob;
    }
    async listAuditLogs(query) {
        const { page, limit, adminId, targetType, targetId, action } = query;
        const filter = {};
        if (adminId) {
            assertValidObjectId(adminId, "admin id");
            filter.adminId = adminId;
        }
        if (targetType)
            filter.targetType = targetType;
        if (targetId)
            filter.targetId = targetId;
        if (action)
            filter.action = new RegExp(escapeRegex(action), "i");
        const { skip } = getPagination(page, limit);
        const [logs, total] = await Promise.all([
            audit_log_model_1.AuditLogModel.find(filter)
                .populate("adminId", "firstName lastName email role")
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            audit_log_model_1.AuditLogModel.countDocuments(filter),
        ]);
        return this.withPagination(logs, total, page, limit);
    }
    async audit(adminId, action, targetType, targetId, oldValue, newValue, reason) {
        await audit_log_model_1.AuditLogModel.create({
            adminId,
            action,
            targetType,
            targetId,
            oldValue,
            newValue,
            reason,
            timestamp: new Date(),
        });
    }
    withPagination(data, total, page, limit) {
        return {
            data,
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
}
exports.AdminService = AdminService;
