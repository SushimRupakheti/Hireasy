"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobListQueryDto = exports.updateApplicationStatusDto = exports.updateJobStatusDto = exports.updateJobDto = exports.createJobDto = exports.jobSchema = exports.applicationStatusSchema = exports.jobShiftSchema = exports.jobStatusSchema = void 0;
const zod_1 = __importDefault(require("zod"));
exports.jobStatusSchema = zod_1.default.enum([
    "pending",
    "open",
    "verified",
    "rejected",
    "closed",
    "filled",
    "cancelled",
]);
exports.jobShiftSchema = zod_1.default.string().trim().min(1, "shift cannot be empty");
exports.applicationStatusSchema = zod_1.default.enum([
    "pending",
    "accepted",
    "rejected",
    "completed",
]);
const jobDateSchema = zod_1.default.preprocess((value) => (value === null || value === "" ? undefined : value), zod_1.default.coerce.date());
const jobPhotoSchema = zod_1.default
    .string()
    .trim()
    .refine((value) => zod_1.default.string().url().safeParse(value).success ||
    value.startsWith("/upload/jobs/"), "Each photo must be a valid URL or uploaded job photo path");
const normalizeStringValues = (value) => {
    if (Array.isArray(value)) {
        return value.flatMap((item) => typeof item === "string"
            ? item.split(",").map((part) => part.trim()).filter(Boolean)
            : item);
    }
    if (typeof value === "string") {
        return value
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
    }
    return value;
};
const stringValuesSchema = (fieldName, minLength = 1, minLengthMessage = `${fieldName} cannot be empty`) => zod_1.default.preprocess(normalizeStringValues, zod_1.default
    .array(zod_1.default.string().trim().min(minLength, minLengthMessage))
    .min(1, `${fieldName} is required`));
const jobShiftValuesSchema = zod_1.default.preprocess(normalizeStringValues, zod_1.default.array(exports.jobShiftSchema).min(1, "shift is required"));
exports.jobSchema = zod_1.default.object({
    roleType: stringValuesSchema("roleType", 3, "Each roleType must be at least 3 characters"),
    numberOfWorkers: zod_1.default.coerce.number().int().positive("numberOfWorkers must be greater than 0"),
    pay: zod_1.default.coerce.number().positive("pay must be greater than 0"),
    shift: jobShiftValuesSchema,
    location: stringValuesSchema("location"),
    job_date: jobDateSchema,
    photos: zod_1.default.preprocess((value) => (typeof value === "string" ? [value] : value), zod_1.default.array(jobPhotoSchema)).optional(),
    description: zod_1.default.string().trim().min(20, "description must be at least 20 characters"),
    status: exports.jobStatusSchema.default("pending"),
});
exports.createJobDto = exports.jobSchema;
exports.updateJobDto = exports.jobSchema
    .omit({ status: true })
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update",
});
exports.updateJobStatusDto = zod_1.default.object({
    status: exports.jobStatusSchema,
});
exports.updateApplicationStatusDto = zod_1.default.object({
    status: exports.applicationStatusSchema,
});
exports.jobListQueryDto = zod_1.default.object({
    page: zod_1.default.coerce.number().int().positive().default(1),
    limit: zod_1.default.coerce.number().int().positive().max(100).default(20),
    search: zod_1.default.string().trim().min(1).optional(),
    roleType: zod_1.default.string().trim().min(1).optional(),
    location: zod_1.default.string().trim().min(1).optional(),
    shift: exports.jobShiftSchema.optional(),
    status: exports.jobStatusSchema.optional(),
    companyId: zod_1.default.string().trim().min(1).optional(),
    jobDateFrom: zod_1.default.coerce.date().optional(),
    jobDateTo: zod_1.default.coerce.date().optional(),
    minPay: zod_1.default.coerce.number().nonnegative().optional(),
    maxPay: zod_1.default.coerce.number().nonnegative().optional(),
}).refine((data) => data.minPay === undefined ||
    data.maxPay === undefined ||
    data.minPay <= data.maxPay, {
    message: "minPay cannot be greater than maxPay",
    path: ["minPay"],
});
