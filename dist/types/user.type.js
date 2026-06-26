"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userSchema = exports.userDocumentSchema = exports.userStatusSchema = void 0;
const zod_1 = __importDefault(require("zod"));
exports.userStatusSchema = zod_1.default.enum([
    "pending",
    "verified",
    "rejected",
    "suspended",
]);
exports.userDocumentSchema = zod_1.default.object({
    documentType: zod_1.default.enum(["resume", "company_document"]),
    filename: zod_1.default.string(),
    originalName: zod_1.default.string(),
    mimeType: zod_1.default.string(),
    size: zod_1.default.number().nonnegative(),
    uploadedAt: zod_1.default.date(),
});
exports.userSchema = zod_1.default.object({
    role: zod_1.default.enum(["user", "admin", "company"]).default("user"),
    status: exports.userStatusSchema.default("pending"),
    firstName: zod_1.default.string().optional(),
    lastName: zod_1.default.string().optional(),
    companyName: zod_1.default.string().optional(),
    email: zod_1.default.string().email('Invalid email address'),
    contactNo: zod_1.default.string(),
    address: zod_1.default.string(),
    password: zod_1.default.string().min(6),
    interestedFields: zod_1.default.array(zod_1.default.string()).optional(),
    profileImage: zod_1.default.string().nullable().optional(),
    document: exports.userDocumentSchema.nullable().optional(),
});
