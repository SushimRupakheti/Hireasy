import z from "zod";
import { applicationStatusSchema, jobStatusSchema } from "../types/job.type";
import { userStatusSchema } from "../types/user.type";

const nonEmptyString = z.string().trim().min(1);

export const paginationQueryDto = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const adminUserListQueryDto = paginationQueryDto.extend({
  search: nonEmptyString.optional(),
  role: z.enum(["admin", "user", "company"]).optional(),
  status: userStatusSchema.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

export const adminJobListQueryDto = paginationQueryDto.extend({
  search: nonEmptyString.optional(),
  companyId: nonEmptyString.optional(),
  status: jobStatusSchema.optional(),
  roleType: nonEmptyString.optional(),
  location: nonEmptyString.optional(),
  jobDateFrom: z.coerce.date().optional(),
  jobDateTo: z.coerce.date().optional(),
});

export const adminApplicationListQueryDto = paginationQueryDto.extend({
  jobId: nonEmptyString.optional(),
  workerId: nonEmptyString.optional(),
  status: applicationStatusSchema.optional(),
});

export const adminAuditLogQueryDto = paginationQueryDto.extend({
  adminId: nonEmptyString.optional(),
  targetType: z.enum(["user", "job", "application", "document"]).optional(),
  targetId: nonEmptyString.optional(),
  action: nonEmptyString.optional(),
});

export const adminUserStatusDto = z.object({
  status: userStatusSchema,
  reason: z.string().trim().optional(),
});

export const adminUpdateUserDto = z.object({
  firstName: z.string().trim().min(1).optional(),
  lastName: z.string().trim().min(1).optional(),
  companyName: z.string().trim().min(1).optional(),
  contactNo: z.string().trim().min(1).optional(),
  address: z.string().trim().min(1).optional(),
  interestedFields: z.array(z.string().trim().min(1)).optional(),
  profileImage: z.string().nullable().optional(),
});

export const adminDocumentRejectDto = z.object({
  reason: z.string().trim().min(1, "Rejection reason is required"),
});

export const adminJobStatusDto = z.object({
  status: jobStatusSchema,
  reason: z.string().trim().optional(),
});

export const adminUpdateJobDto = z.object({
  roleType: z.array(z.string().trim().min(1)).optional(),
  numberOfWorkers: z.coerce.number().int().positive().optional(),
  pay: z.coerce.number().positive().optional(),
  shift: z.array(z.string().trim().min(1)).optional(),
  location: z.array(z.string().trim().min(1)).optional(),
  job_date: z.coerce.date().optional(),
  photos: z.array(z.string().trim().min(1)).optional(),
  description: z.string().trim().min(20).optional(),
});

export const adminApplicationStatusDto = z.object({
  status: applicationStatusSchema,
  reason: z.string().trim().optional(),
});
