"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const admin_dto_1 = require("../dtos/admin.dto");
const auth_dto_1 = require("../dtos/auth.dto");
const admin_service_1 = require("../services/admin.service");
const adminService = new admin_service_1.AdminService();
const formatZodErrors = (error) => ({
    fieldErrors: error.flatten().fieldErrors,
    formErrors: error.flatten().formErrors,
});
const param = (value) => Array.isArray(value) ? value[0] : value;
function adminId(req) {
    return req.user?._id?.toString();
}
function validationError(res, error) {
    return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: formatZodErrors(error),
    });
}
class AdminController {
    async login(req, res) {
        try {
            const parsed = auth_dto_1.LoginUserDto.safeParse(req.body);
            if (!parsed.success)
                return validationError(res, parsed.error);
            const result = await adminService.login(parsed.data.email, parsed.data.password);
            return res.status(200).json({
                success: true,
                message: "Admin login success",
                ...result,
            });
        }
        catch (error) {
            return this.fail(res, error);
        }
    }
    async dashboard(_req, res) {
        try {
            const data = await adminService.dashboard();
            return res.status(200).json({ success: true, data });
        }
        catch (error) {
            return this.fail(res, error);
        }
    }
    async listUsers(req, res) {
        try {
            const parsed = admin_dto_1.adminUserListQueryDto.safeParse(req.query);
            if (!parsed.success)
                return validationError(res, parsed.error);
            const result = await adminService.listUsers(parsed.data);
            return res.status(200).json({ success: true, ...result });
        }
        catch (error) {
            return this.fail(res, error);
        }
    }
    async listCompanies(req, res) {
        try {
            const parsed = admin_dto_1.adminUserListQueryDto.safeParse({
                ...req.query,
                role: "company",
            });
            if (!parsed.success)
                return validationError(res, parsed.error);
            const result = await adminService.listUsers(parsed.data);
            return res.status(200).json({ success: true, ...result });
        }
        catch (error) {
            return this.fail(res, error);
        }
    }
    async getUser(req, res) {
        try {
            const id = param(req.params.id);
            if (!id)
                return res.status(400).json({ success: false, message: "Missing user id" });
            const data = await adminService.getUser(id);
            return res.status(200).json({ success: true, data });
        }
        catch (error) {
            return this.fail(res, error);
        }
    }
    async getCompany(req, res) {
        return this.getUser(req, res);
    }
    async updateUserStatus(req, res) {
        try {
            const id = param(req.params.id);
            if (!id)
                return res.status(400).json({ success: false, message: "Missing user id" });
            const parsed = admin_dto_1.adminUserStatusDto.safeParse(req.body);
            if (!parsed.success)
                return validationError(res, parsed.error);
            const user = await adminService.updateUserStatus(adminId(req), id, parsed.data.status, parsed.data.reason);
            return res.status(200).json({ success: true, data: user });
        }
        catch (error) {
            return this.fail(res, error);
        }
    }
    async updateUser(req, res) {
        try {
            const id = param(req.params.id);
            if (!id)
                return res.status(400).json({ success: false, message: "Missing user id" });
            const parsed = admin_dto_1.adminUpdateUserDto.safeParse(req.body);
            if (!parsed.success)
                return validationError(res, parsed.error);
            const user = await adminService.updateUser(adminId(req), id, parsed.data);
            return res.status(200).json({ success: true, data: user });
        }
        catch (error) {
            return this.fail(res, error);
        }
    }
    async deleteUser(req, res) {
        try {
            const id = param(req.params.id);
            if (!id)
                return res.status(400).json({ success: false, message: "Missing user id" });
            await adminService.deleteUser(adminId(req), id);
            return res.status(200).json({ success: true, message: "User deleted" });
        }
        catch (error) {
            return this.fail(res, error);
        }
    }
    async pendingDocuments(req, res) {
        try {
            const parsed = admin_dto_1.paginationQueryDto.safeParse(req.query);
            if (!parsed.success)
                return validationError(res, parsed.error);
            const result = await adminService.listPendingDocuments(parsed.data);
            return res.status(200).json({ success: true, ...result });
        }
        catch (error) {
            return this.fail(res, error);
        }
    }
    async approveDocument(req, res) {
        try {
            const id = param(req.params.id);
            if (!id)
                return res.status(400).json({ success: false, message: "Missing user id" });
            const user = await adminService.approveDocument(adminId(req), id);
            return res.status(200).json({ success: true, data: user });
        }
        catch (error) {
            return this.fail(res, error);
        }
    }
    async rejectDocument(req, res) {
        try {
            const id = param(req.params.id);
            if (!id)
                return res.status(400).json({ success: false, message: "Missing user id" });
            const parsed = admin_dto_1.adminDocumentRejectDto.safeParse(req.body);
            if (!parsed.success)
                return validationError(res, parsed.error);
            const user = await adminService.rejectDocument(adminId(req), id, parsed.data.reason);
            return res.status(200).json({ success: true, data: user });
        }
        catch (error) {
            return this.fail(res, error);
        }
    }
    async listJobs(req, res) {
        try {
            const parsed = admin_dto_1.adminJobListQueryDto.safeParse(req.query);
            if (!parsed.success)
                return validationError(res, parsed.error);
            const result = await adminService.listJobs(parsed.data);
            return res.status(200).json({ success: true, ...result });
        }
        catch (error) {
            return this.fail(res, error);
        }
    }
    async getJob(req, res) {
        try {
            const id = param(req.params.id);
            if (!id)
                return res.status(400).json({ success: false, message: "Missing job id" });
            const job = await adminService.getJob(id);
            return res.status(200).json({ success: true, data: job });
        }
        catch (error) {
            return this.fail(res, error);
        }
    }
    async updateJobStatus(req, res) {
        try {
            const id = param(req.params.id);
            if (!id)
                return res.status(400).json({ success: false, message: "Missing job id" });
            const parsed = admin_dto_1.adminJobStatusDto.safeParse(req.body);
            if (!parsed.success)
                return validationError(res, parsed.error);
            const job = await adminService.updateJobStatus(adminId(req), id, parsed.data.status, parsed.data.reason);
            return res.status(200).json({ success: true, data: job });
        }
        catch (error) {
            return this.fail(res, error);
        }
    }
    async updateJob(req, res) {
        try {
            const id = param(req.params.id);
            if (!id)
                return res.status(400).json({ success: false, message: "Missing job id" });
            const parsed = admin_dto_1.adminUpdateJobDto.safeParse(req.body);
            if (!parsed.success)
                return validationError(res, parsed.error);
            const job = await adminService.updateJob(adminId(req), id, parsed.data);
            return res.status(200).json({ success: true, data: job });
        }
        catch (error) {
            return this.fail(res, error);
        }
    }
    async deleteJob(req, res) {
        try {
            const id = param(req.params.id);
            if (!id)
                return res.status(400).json({ success: false, message: "Missing job id" });
            await adminService.deleteJob(adminId(req), id);
            return res.status(200).json({ success: true, message: "Job deleted" });
        }
        catch (error) {
            return this.fail(res, error);
        }
    }
    async listApplications(req, res) {
        try {
            const parsed = admin_dto_1.adminApplicationListQueryDto.safeParse(req.query);
            if (!parsed.success)
                return validationError(res, parsed.error);
            const result = await adminService.listApplications(parsed.data);
            return res.status(200).json({ success: true, ...result });
        }
        catch (error) {
            return this.fail(res, error);
        }
    }
    async updateApplicationStatus(req, res) {
        try {
            const jobId = param(req.params.jobId);
            const workerId = param(req.params.workerId);
            if (!jobId || !workerId) {
                return res.status(400).json({
                    success: false,
                    message: "jobId and workerId are required",
                });
            }
            const parsed = admin_dto_1.adminApplicationStatusDto.safeParse(req.body);
            if (!parsed.success)
                return validationError(res, parsed.error);
            const job = await adminService.updateApplicationStatus(adminId(req), jobId, workerId, parsed.data.status, parsed.data.reason);
            return res.status(200).json({ success: true, data: job });
        }
        catch (error) {
            return this.fail(res, error);
        }
    }
    async auditLogs(req, res) {
        try {
            const parsed = admin_dto_1.adminAuditLogQueryDto.safeParse(req.query);
            if (!parsed.success)
                return validationError(res, parsed.error);
            const result = await adminService.listAuditLogs(parsed.data);
            return res.status(200).json({ success: true, ...result });
        }
        catch (error) {
            return this.fail(res, error);
        }
    }
    fail(res, error) {
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Internal Server Error",
        });
    }
}
exports.AdminController = AdminController;
