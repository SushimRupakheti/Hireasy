"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminApplicationStatusDto = exports.adminUpdateJobDto = exports.adminJobStatusDto = exports.adminDocumentRejectDto = exports.adminUpdateUserDto = exports.adminUserStatusDto = exports.adminAuditLogQueryDto = exports.adminApplicationListQueryDto = exports.adminJobListQueryDto = exports.adminUserListQueryDto = exports.paginationQueryDto = void 0;
const zod_1 = __importDefault(require("zod"));
const job_type_1 = require("../types/job.type");
const user_type_1 = require("../types/user.type");
const nonEmptyString = zod_1.default.string().trim().min(1);
exports.paginationQueryDto = zod_1.default.object({
    page: zod_1.default.coerce.number().int().positive().default(1),
    limit: zod_1.default.coerce.number().int().positive().max(100).default(20),
});
exports.adminUserListQueryDto = exports.paginationQueryDto.extend({
    search: nonEmptyString.optional(),
    role: zod_1.default.enum(["admin", "user", "company"]).optional(),
    status: user_type_1.userStatusSchema.optional(),
    dateFrom: zod_1.default.coerce.date().optional(),
    dateTo: zod_1.default.coerce.date().optional(),
});
exports.adminJobListQueryDto = exports.paginationQueryDto.extend({
    search: nonEmptyString.optional(),
    companyId: nonEmptyString.optional(),
    status: job_type_1.jobStatusSchema.optional(),
    roleType: nonEmptyString.optional(),
    location: nonEmptyString.optional(),
    jobDateFrom: zod_1.default.coerce.date().optional(),
    jobDateTo: zod_1.default.coerce.date().optional(),
});
exports.adminApplicationListQueryDto = exports.paginationQueryDto.extend({
    jobId: nonEmptyString.optional(),
    workerId: nonEmptyString.optional(),
    status: job_type_1.applicationStatusSchema.optional(),
});
exports.adminAuditLogQueryDto = exports.paginationQueryDto.extend({
    adminId: nonEmptyString.optional(),
    targetType: zod_1.default.enum(["user", "job", "application", "document"]).optional(),
    targetId: nonEmptyString.optional(),
    action: nonEmptyString.optional(),
});
exports.adminUserStatusDto = zod_1.default.object({
    status: user_type_1.userStatusSchema,
    reason: zod_1.default.string().trim().optional(),
});
exports.adminUpdateUserDto = zod_1.default.object({
    firstName: zod_1.default.string().trim().min(1).optional(),
    lastName: zod_1.default.string().trim().min(1).optional(),
    companyName: zod_1.default.string().trim().min(1).optional(),
    contactNo: zod_1.default.string().trim().min(1).optional(),
    address: zod_1.default.string().trim().min(1).optional(),
    interestedFields: zod_1.default.array(zod_1.default.string().trim().min(1)).optional(),
    profileImage: zod_1.default.string().nullable().optional(),
});
exports.adminDocumentRejectDto = zod_1.default.object({
    reason: zod_1.default.string().trim().min(1, "Rejection reason is required"),
});
exports.adminJobStatusDto = zod_1.default.object({
    status: job_type_1.jobStatusSchema,
    reason: zod_1.default.string().trim().optional(),
});
exports.adminUpdateJobDto = zod_1.default.object({
    roleType: zod_1.default.array(zod_1.default.string().trim().min(1)).optional(),
    numberOfWorkers: zod_1.default.coerce.number().int().positive().optional(),
    pay: zod_1.default.coerce.number().positive().optional(),
    shift: zod_1.default.array(zod_1.default.string().trim().min(1)).optional(),
    location: zod_1.default.array(zod_1.default.string().trim().min(1)).optional(),
    job_date: zod_1.default.coerce.date().optional(),
    photos: zod_1.default.array(zod_1.default.string().trim().min(1)).optional(),
    description: zod_1.default.string().trim().min(20).optional(),
});
exports.adminApplicationStatusDto = zod_1.default.object({
    status: job_type_1.applicationStatusSchema,
    reason: zod_1.default.string().trim().optional(),
});
