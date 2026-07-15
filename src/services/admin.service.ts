import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { JWT_SECRET } from "../config";
import { HttpError } from "../errors/http-error";
import { AuditLogModel, AuditTargetType } from "../models/audit-log.model";
import { JobModel } from "../models/job.model";
import { UserModel } from "../models/user.model";
import { ApplicationStatus, JobStatus } from "../types/job.type";
import { UserStatus } from "../types/user.type";

const userSafeProjection = "-password";
const workerPopulateFields =
  "firstName lastName email contactNo address interestedFields profileImage document status";
const companyPopulateFields =
  "companyName firstName lastName email contactNo address profileImage document status";

function assertValidObjectId(id: string, name: string) {
  if (!mongoose.isValidObjectId(id)) {
    throw new HttpError(400, `Invalid ${name}`);
  }
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getPagination(page: number, limit: number) {
  return { skip: (page - 1) * limit, page, limit };
}

function safeUser(user: any) {
  const object =
    user && typeof user.toObject === "function" ? user.toObject() : user || {};
  const { password, ...rest } = object;
  return rest;
}

export class AdminService {
  async login(email: string, password: string) {
    const admin = await UserModel.findOne({ email, role: "admin" });
    if (!admin) throw new HttpError(401, "Invalid admin credentials");

    const isValid = await bcrypt.compare(password, admin.password || "");
    if (!isValid) throw new HttpError(401, "Invalid admin credentials");

    if (admin.status === "blocked" || admin.status === "suspended") {
      throw new HttpError(403, "Admin account is blocked");
    }

    const token = jwt.sign(
      { id: admin._id, email: admin.email, role: admin.role },
      JWT_SECRET,
      { expiresIn: "30d" }
    );

    return { token, user: safeUser(admin) };
  }

  async dashboard() {
    const now = new Date();
    const since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      totalWorkers,
      totalCompanies,
      pendingVerifications,
      verifiedUsers,
      rejectedUsers,
      totalJobs,
      pendingJobs,
      activeJobs,
      totalApplicationsAgg,
      recentRegistrations,
      recentJobPosts,
    ] = await Promise.all([
      UserModel.countDocuments(),
      UserModel.countDocuments({ role: "user" }),
      UserModel.countDocuments({ role: "company" }),
      UserModel.countDocuments({
        document: { $ne: null },
        $or: [
          { "document.verification.status": "pending" },
          { "document.verification.status": { $exists: false } },
        ],
      }),
      UserModel.countDocuments({ status: "verified" }),
      UserModel.countDocuments({ status: "rejected" }),
      JobModel.countDocuments(),
      JobModel.countDocuments({ status: "pending" }),
      JobModel.countDocuments({ status: { $in: ["open", "verified"] } }),
      JobModel.aggregate([
        { $project: { count: { $size: "$appliedWorkers" } } },
        { $group: { _id: null, total: { $sum: "$count" } } },
      ]),
      UserModel.find({ createdAt: { $gte: since } })
        .select(userSafeProjection)
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      JobModel.find({ createdAt: { $gte: since } })
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

  async listUsers(query: any) {
    const { page, limit, search, role, status, dateFrom, dateTo } = query;
    const filter: Record<string, any> = {};
    if (role) filter.role = role;
    if (status) filter.status = status;
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = dateFrom;
      if (dateTo) filter.createdAt.$lte = dateTo;
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
      UserModel.find(filter)
        .select(userSafeProjection)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      UserModel.countDocuments(filter),
    ]);

    return this.withPagination(users, total, page, limit);
  }

  async getUser(id: string) {
    assertValidObjectId(id, "user id");
    const user = await UserModel.findById(id).select(userSafeProjection).lean();
    if (!user) throw new HttpError(404, "User not found");

    const jobs =
      user.role === "company"
        ? await JobModel.find({ companyId: id }).sort({ createdAt: -1 }).lean()
        : [];

    return { user, jobs };
  }

  async updateUser(adminId: string, id: string, data: Record<string, any>) {
    assertValidObjectId(id, "user id");
    const oldUser = await UserModel.findById(id).select(userSafeProjection).lean();
    if (!oldUser) throw new HttpError(404, "User not found");

    const updatedUser = await UserModel.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    )
      .select(userSafeProjection)
      .lean();

    await this.audit(adminId, "user.updated", "user", id, oldUser, updatedUser);
    return updatedUser;
  }

  async updateUserStatus(
    adminId: string,
    id: string,
    status: UserStatus,
    reason?: string
  ) {
    assertValidObjectId(id, "user id");
    const oldUser = await UserModel.findById(id).select(userSafeProjection).lean();
    if (!oldUser) throw new HttpError(404, "User not found");

    const updatedUser = await UserModel.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true, runValidators: true }
    )
      .select(userSafeProjection)
      .lean();

    await this.audit(
      adminId,
      `user.status.${status}`,
      "user",
      id,
      { status: oldUser.status },
      { status },
      reason
    );
    return updatedUser;
  }

  async deleteUser(adminId: string, id: string) {
    assertValidObjectId(id, "user id");
    const deleted = await UserModel.findByIdAndDelete(id).select(userSafeProjection).lean();
    if (!deleted) throw new HttpError(404, "User not found");

    await this.audit(adminId, "user.deleted", "user", id, deleted, null);
    return deleted;
  }

  async listPendingDocuments(query: any) {
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
      UserModel.find(filter)
        .select(userSafeProjection)
        .sort({ "document.uploadedAt": 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      UserModel.countDocuments(filter),
    ]);
    return this.withPagination(items, total, page, limit);
  }

  async approveDocument(adminId: string, userId: string) {
    assertValidObjectId(userId, "user id");
    const oldUser = await UserModel.findById(userId).select(userSafeProjection).lean();
    if (!oldUser) throw new HttpError(404, "User not found");
    if (!oldUser.document) throw new HttpError(404, "No document found");

    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      {
        $set: {
          status: "verified",
          "document.verification": {
            status: "approved",
            reviewedBy: adminId,
            reviewedAt: new Date(),
          },
        },
      },
      { new: true, runValidators: true }
    )
      .select(userSafeProjection)
      .lean();

    await this.audit(
      adminId,
      "document.approved",
      "document",
      userId,
      oldUser.document,
      updatedUser?.document
    );
    return updatedUser;
  }

  async rejectDocument(adminId: string, userId: string, reason: string) {
    assertValidObjectId(userId, "user id");
    const oldUser = await UserModel.findById(userId).select(userSafeProjection).lean();
    if (!oldUser) throw new HttpError(404, "User not found");
    if (!oldUser.document) throw new HttpError(404, "No document found");

    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      {
        $set: {
          status: "rejected",
          "document.verification": {
            status: "rejected",
            reason,
            reviewedBy: adminId,
            reviewedAt: new Date(),
          },
        },
      },
      { new: true, runValidators: true }
    )
      .select(userSafeProjection)
      .lean();

    await this.audit(
      adminId,
      "document.rejected",
      "document",
      userId,
      oldUser.document,
      updatedUser?.document,
      reason
    );
    return updatedUser;
  }

  async listJobs(query: any) {
    const {
      page,
      limit,
      search,
      companyId,
      status,
      roleType,
      location,
      jobDateFrom,
      jobDateTo,
    } = query;
    const filter: Record<string, any> = {};
    if (companyId) {
      assertValidObjectId(companyId, "company id");
      filter.companyId = companyId;
    }
    if (status) filter.status = status;
    if (roleType) filter.roleType = new RegExp(escapeRegex(roleType), "i");
    if (location) filter.location = new RegExp(escapeRegex(location), "i");
    if (jobDateFrom || jobDateTo) {
      filter.job_date = {};
      if (jobDateFrom) filter.job_date.$gte = jobDateFrom;
      if (jobDateTo) filter.job_date.$lte = jobDateTo;
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
      JobModel.find(filter)
        .populate("companyId", companyPopulateFields)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      JobModel.countDocuments(filter),
    ]);

    return this.withPagination(jobs, total, page, limit);
  }

  async getJob(id: string) {
    assertValidObjectId(id, "job id");
    const job = await JobModel.findById(id)
      .populate("companyId", companyPopulateFields)
      .populate("appliedWorkers.worker", workerPopulateFields)
      .lean();
    if (!job) throw new HttpError(404, "Job not found");
    return job;
  }

  async updateJob(adminId: string, id: string, data: Record<string, any>) {
    assertValidObjectId(id, "job id");
    const oldJob = await JobModel.findById(id).lean();
    if (!oldJob) throw new HttpError(404, "Job not found");

    const updatedJob = await JobModel.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    ).lean();

    await this.audit(adminId, "job.updated", "job", id, oldJob, updatedJob);
    return updatedJob;
  }

  async updateJobStatus(
    adminId: string,
    id: string,
    status: JobStatus,
    reason?: string
  ) {
    assertValidObjectId(id, "job id");
    const oldJob = await JobModel.findById(id).select("status").lean();
    if (!oldJob) throw new HttpError(404, "Job not found");

    const updatedJob = await JobModel.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true, runValidators: true }
    ).lean();

    await this.audit(
      adminId,
      `job.status.${status}`,
      "job",
      id,
      oldJob,
      { status },
      reason
    );
    return updatedJob;
  }

  async deleteJob(adminId: string, id: string) {
    assertValidObjectId(id, "job id");
    const deleted = await JobModel.findByIdAndDelete(id).lean();
    if (!deleted) throw new HttpError(404, "Job not found");

    await this.audit(adminId, "job.deleted", "job", id, deleted, null);
    return deleted;
  }

  async listApplications(query: any) {
    const { page, limit, jobId, workerId, status } = query;
    const filter: Record<string, any> = {};
    if (jobId) {
      assertValidObjectId(jobId, "job id");
      filter._id = jobId;
    }
    if (workerId) {
      assertValidObjectId(workerId, "worker id");
      filter["appliedWorkers.worker"] = workerId;
    }
    if (status) filter["appliedWorkers.status"] = status;

    const jobs = await JobModel.find(filter)
      .populate("companyId", companyPopulateFields)
      .populate("appliedWorkers.worker", workerPopulateFields)
      .sort({ createdAt: -1 })
      .lean();

    const applications = jobs.flatMap((job: any) =>
      (job.appliedWorkers || [])
        .filter((application: any) => {
          if (workerId && application.worker?._id?.toString() !== workerId) return false;
          if (status && application.status !== status) return false;
          return true;
        })
        .map((application: any) => ({
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
        }))
    );

    const start = (page - 1) * limit;
    return this.withPagination(
      applications.slice(start, start + limit),
      applications.length,
      page,
      limit
    );
  }

  async updateApplicationStatus(
    adminId: string,
    jobId: string,
    workerId: string,
    status: ApplicationStatus,
    reason?: string
  ) {
    assertValidObjectId(jobId, "job id");
    assertValidObjectId(workerId, "worker id");

    const job = await JobModel.findOne({
      _id: jobId,
      "appliedWorkers.worker": workerId,
    }).lean();
    if (!job) throw new HttpError(404, "Job or application not found");
    const oldApplication = job.appliedWorkers.find(
      (application: any) => application.worker.toString() === workerId
    );

    const updatedJob = await JobModel.findOneAndUpdate(
      { _id: jobId, "appliedWorkers.worker": workerId },
      { $set: { "appliedWorkers.$.status": status } },
      { new: true, runValidators: true }
    )
      .populate("appliedWorkers.worker", workerPopulateFields)
      .lean();

    await this.audit(
      adminId,
      `application.status.${status}`,
      "application",
      `${jobId}:${workerId}`,
      oldApplication,
      { worker: workerId, status },
      reason
    );
    return updatedJob;
  }

  async listAuditLogs(query: any) {
    const { page, limit, adminId, targetType, targetId, action } = query;
    const filter: Record<string, any> = {};
    if (adminId) {
      assertValidObjectId(adminId, "admin id");
      filter.adminId = adminId;
    }
    if (targetType) filter.targetType = targetType;
    if (targetId) filter.targetId = targetId;
    if (action) filter.action = new RegExp(escapeRegex(action), "i");

    const { skip } = getPagination(page, limit);
    const [logs, total] = await Promise.all([
      AuditLogModel.find(filter)
        .populate("adminId", "firstName lastName email role")
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLogModel.countDocuments(filter),
    ]);

    return this.withPagination(logs, total, page, limit);
  }

  private async audit(
    adminId: string,
    action: string,
    targetType: AuditTargetType,
    targetId: string,
    oldValue?: unknown,
    newValue?: unknown,
    reason?: string
  ) {
    await AuditLogModel.create({
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

  private withPagination(data: any[], total: number, page: number, limit: number) {
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
