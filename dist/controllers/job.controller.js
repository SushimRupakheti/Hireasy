"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobController = void 0;
const job_type_1 = require("../types/job.type");
const job_service_1 = require("../services/job.service");
const jobService = new job_service_1.JobService();
const formatZodErrors = (error) => {
    const flattened = error.flatten();
    return {
        fieldErrors: flattened.fieldErrors,
        formErrors: flattened.formErrors,
    };
};
const getParam = (value) => Array.isArray(value) ? value[0] : value;
const getAuthenticatedUser = (req) => req.user;
class JobController {
    async createJob(req, res) {
        try {
            const parsedData = job_type_1.createJobDto.safeParse(req.body);
            if (!parsedData.success) {
                return res.status(400).json({
                    success: false,
                    message: "Validation failed",
                    errors: formatZodErrors(parsedData.error),
                });
            }
            const company = req.user;
            if (!company?._id) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized",
                });
            }
            const job = await jobService.createJob(company._id.toString(), parsedData.data);
            return res.status(201).json({
                success: true,
                message: "Job posted successfully",
                job,
            });
        }
        catch (error) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Internal Server Error",
            });
        }
    }
    async getAllJobs(req, res) {
        try {
            const parsedQuery = job_type_1.jobListQueryDto.safeParse(req.query);
            if (!parsedQuery.success) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid query parameters",
                    errors: formatZodErrors(parsedQuery.error),
                });
            }
            const result = await jobService.getAllJobs(parsedQuery.data);
            return res.status(200).json({
                success: true,
                data: result.jobs,
                pagination: result.pagination,
            });
        }
        catch (error) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Internal Server Error",
            });
        }
    }
    async getJobById(req, res) {
        try {
            const jobId = getParam(req.params.jobId);
            if (!jobId) {
                return res.status(400).json({
                    success: false,
                    message: "jobId is required",
                });
            }
            const job = await jobService.getJobById(jobId);
            return res.status(200).json({ success: true, data: job });
        }
        catch (error) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Internal Server Error",
            });
        }
    }
    async getMyJobs(req, res) {
        try {
            const company = getAuthenticatedUser(req);
            const parsedQuery = job_type_1.jobListQueryDto.safeParse(req.query);
            if (!parsedQuery.success) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid query parameters",
                    errors: formatZodErrors(parsedQuery.error),
                });
            }
            const { companyId: _ignoredCompanyId, ...query } = parsedQuery.data;
            const result = await jobService.getCompanyJobs(company._id.toString(), query);
            return res.status(200).json({
                success: true,
                data: result.jobs,
                pagination: result.pagination,
            });
        }
        catch (error) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Internal Server Error",
            });
        }
    }
    async getMyApplications(req, res) {
        try {
            const worker = getAuthenticatedUser(req);
            if (worker.role !== "user") {
                return res.status(403).json({
                    success: false,
                    message: "Only workers can view job applications",
                });
            }
            const parsedQuery = job_type_1.jobListQueryDto.safeParse(req.query);
            if (!parsedQuery.success) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid query parameters",
                    errors: formatZodErrors(parsedQuery.error),
                });
            }
            const { companyId: _ignoredCompanyId, ...query } = parsedQuery.data;
            const result = await jobService.getAppliedJobs(worker._id.toString(), query);
            return res.status(200).json({
                success: true,
                data: result.jobs,
                pagination: result.pagination,
            });
        }
        catch (error) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Internal Server Error",
            });
        }
    }
    async updateJob(req, res) {
        try {
            const company = getAuthenticatedUser(req);
            const jobId = getParam(req.params.jobId);
            if (!jobId) {
                return res.status(400).json({
                    success: false,
                    message: "jobId is required",
                });
            }
            const parsedData = job_type_1.updateJobDto.safeParse(req.body);
            if (!parsedData.success) {
                return res.status(400).json({
                    success: false,
                    message: "Validation failed",
                    errors: formatZodErrors(parsedData.error),
                });
            }
            const job = await jobService.updateJob(jobId, company._id.toString(), parsedData.data);
            return res.status(200).json({
                success: true,
                message: "Job updated successfully",
                data: job,
            });
        }
        catch (error) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Internal Server Error",
            });
        }
    }
    async updateJobStatus(req, res) {
        try {
            const company = getAuthenticatedUser(req);
            const jobId = getParam(req.params.jobId);
            if (!jobId) {
                return res.status(400).json({
                    success: false,
                    message: "jobId is required",
                });
            }
            const parsedData = job_type_1.updateJobStatusDto.safeParse(req.body);
            if (!parsedData.success) {
                return res.status(400).json({
                    success: false,
                    message: "Validation failed",
                    errors: formatZodErrors(parsedData.error),
                });
            }
            const job = await jobService.updateJobStatus(jobId, company._id.toString(), parsedData.data.status);
            return res.status(200).json({
                success: true,
                message: "Job status updated successfully",
                data: job,
            });
        }
        catch (error) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Internal Server Error",
            });
        }
    }
    async deleteJob(req, res) {
        try {
            const company = getAuthenticatedUser(req);
            const jobId = getParam(req.params.jobId);
            if (!jobId) {
                return res.status(400).json({
                    success: false,
                    message: "jobId is required",
                });
            }
            await jobService.deleteJob(jobId, company._id.toString());
            return res.status(200).json({
                success: true,
                message: "Job deleted successfully",
            });
        }
        catch (error) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Internal Server Error",
            });
        }
    }
    async applyToJob(req, res) {
        try {
            const worker = req.user;
            if (!worker?._id) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized",
                });
            }
            if (worker.role !== "user") {
                return res.status(403).json({
                    success: false,
                    message: "Only workers can apply to jobs",
                });
            }
            const jobId = getParam(req.params.jobId);
            if (!jobId) {
                return res.status(400).json({
                    success: false,
                    message: "jobId is required",
                });
            }
            const job = await jobService.applyForJob(jobId, worker._id.toString());
            return res.status(200).json({
                success: true,
                message: "Applied to job successfully",
                job,
            });
        }
        catch (error) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Internal Server Error",
            });
        }
    }
    async withdrawApplication(req, res) {
        try {
            const worker = getAuthenticatedUser(req);
            if (worker.role !== "user") {
                return res.status(403).json({
                    success: false,
                    message: "Only workers can withdraw job applications",
                });
            }
            const jobId = getParam(req.params.jobId);
            if (!jobId) {
                return res.status(400).json({
                    success: false,
                    message: "jobId is required",
                });
            }
            const job = await jobService.withdrawApplication(jobId, worker._id.toString());
            return res.status(200).json({
                success: true,
                message: "Application withdrawn successfully",
                job,
            });
        }
        catch (error) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Internal Server Error",
            });
        }
    }
    async getJobApplicants(req, res) {
        try {
            const company = getAuthenticatedUser(req);
            const jobId = getParam(req.params.jobId);
            if (!jobId) {
                return res.status(400).json({
                    success: false,
                    message: "jobId is required",
                });
            }
            const job = await jobService.getJobApplicants(jobId, company._id.toString());
            return res.status(200).json({
                success: true,
                data: job,
            });
        }
        catch (error) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Internal Server Error",
            });
        }
    }
}
exports.JobController = JobController;
