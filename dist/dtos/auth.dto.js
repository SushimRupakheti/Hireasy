"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateUserStatusDto = exports.UpdateProfileDto = exports.LoginUserDto = exports.createUserDto = void 0;
const zod_1 = __importDefault(require("zod"));
const user_type_1 = require("../types/user.type");
const emptyStringToUndefined = (schema) => zod_1.default.preprocess((value) => {
    if (typeof value === "string" && value.trim() === "") {
        return undefined;
    }
    return value;
}, schema);
const interestedFieldsSchema = zod_1.default.preprocess((value) => {
    if (Array.isArray(value)) {
        return value;
    }
    if (typeof value === "string") {
        return value
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
    }
    return value;
}, zod_1.default.array(zod_1.default.string().trim().min(1, "Interested field cannot be empty")).min(1, "Select at least one interested field"));
const individualRegistrationSchema = user_type_1.userSchema.extend({
    role: zod_1.default.literal("user"),
    status: zod_1.default.literal("pending").optional().default("pending"),
    firstName: zod_1.default.string().trim().min(1, "First name is required"),
    lastName: zod_1.default.string().trim().min(1, "Last name is required"),
    interestedFields: interestedFieldsSchema,
    companyName: emptyStringToUndefined(zod_1.default.undefined().optional()),
});
const companyRegistrationSchema = user_type_1.userSchema.extend({
    role: zod_1.default.literal("company"),
    status: zod_1.default.literal("pending").optional().default("pending"),
    companyName: emptyStringToUndefined(zod_1.default.string().trim().min(1, "Company name is required")),
    firstName: emptyStringToUndefined(zod_1.default.undefined().optional()),
    lastName: emptyStringToUndefined(zod_1.default.undefined().optional()),
    interestedFields: emptyStringToUndefined(zod_1.default.undefined().optional()),
});
exports.createUserDto = zod_1.default.discriminatedUnion("role", [
    individualRegistrationSchema,
    companyRegistrationSchema,
]);
exports.LoginUserDto = zod_1.default.object({
    email: zod_1.default.string().trim().email("Invalid email address"),
    password: zod_1.default.string().min(6, "Password must be at least 6 characters long")
});
exports.UpdateProfileDto = zod_1.default.object({
    firstName: zod_1.default.string().trim().min(1, "First name cannot be empty").optional(),
    lastName: zod_1.default.string().trim().min(1, "Last name cannot be empty").optional(),
    contactNo: zod_1.default.string().trim().min(1, "Contact number cannot be empty").optional(),
    address: zod_1.default.string().trim().min(1, "Address cannot be empty").optional(),
    profileImage: zod_1.default.string().nullable().optional(),
});
exports.UpdateUserStatusDto = zod_1.default.object({
    status: user_type_1.userStatusSchema,
});
