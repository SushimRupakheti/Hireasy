"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobListQueryDto = exports.updateJobStatusDto = exports.updateJobDto = exports.createJobDto = exports.jobSchema = exports.jobShiftSchema = exports.jobStatusSchema = void 0;
const zod_1 = __importDefault(require("zod"));
exports.jobStatusSchema = zod_1.default.enum([
    "pending",
    "open",
    "closed",
    "filled",
    "cancelled",
]);
exports.jobShiftSchema = zod_1.default.enum([
    "Morning",
    "Night",
    "Rotational",
    "Full Day",
]);
exports.jobSchema = zod_1.default.object({
    roleType: zod_1.default.string().trim().min(3, "roleType must be at least 3 characters"),
    numberOfWorkers: zod_1.default.coerce.number().int().positive("numberOfWorkers must be greater than 0"),
    pay: zod_1.default.coerce.number().positive("pay must be greater than 0"),
    shift: exports.jobShiftSchema,
    location: zod_1.default.string().trim().min(1, "location is required"),
    photos: zod_1.default.array(zod_1.default.string().url("Each photo must be a valid URL")).optional(),
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
exports.jobListQueryDto = zod_1.default.object({
    page: zod_1.default.coerce.number().int().positive().default(1),
    limit: zod_1.default.coerce.number().int().positive().max(100).default(20),
    search: zod_1.default.string().trim().min(1).optional(),
    roleType: zod_1.default.string().trim().min(1).optional(),
    location: zod_1.default.string().trim().min(1).optional(),
    shift: exports.jobShiftSchema.optional(),
    status: exports.jobStatusSchema.optional(),
    companyId: zod_1.default.string().trim().min(1).optional(),
    minPay: zod_1.default.coerce.number().nonnegative().optional(),
    maxPay: zod_1.default.coerce.number().nonnegative().optional(),
}).refine((data) => data.minPay === undefined ||
    data.maxPay === undefined ||
    data.minPay <= data.maxPay, {
    message: "minPay cannot be greater than maxPay",
    path: ["minPay"],
});
