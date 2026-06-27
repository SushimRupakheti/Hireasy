import { Request, Response } from "express";
import z from "zod";
import {
  createJobDto,
  jobListQueryDto,
  updateApplicationStatusDto,
  updateJobDto,
  updateJobStatusDto,
} from "../types/job.type";
import { JobService } from "../services/job.service";

const jobService = new JobService();

const formatZodErrors = (error: z.ZodError) => {
  const flattened = error.flatten();
  return {
    fieldErrors: flattened.fieldErrors,
    formErrors: flattened.formErrors,
  };
};

const getParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const getAuthenticatedUser = (req: Request) => req.user as any;

const getUploadedJobPhotoPaths = (req: Request) => {
  const files = Array.isArray(req.files) ? req.files : [];
  return files.map((file) => `/upload/jobs/${file.filename}`);
};

export class JobController {
  async createJob(req: Request, res: Response) {
    try {
      const uploadedPhotos = getUploadedJobPhotoPaths(req);
      const parsedData = createJobDto.safeParse({
        ...req.body,
        ...(uploadedPhotos.length > 0 ? { photos: uploadedPhotos } : {}),
      });
      if (!parsedData.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: formatZodErrors(parsedData.error),
        });
      }

      const company = req.user as any;
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
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  }

  async getAllJobs(req: Request, res: Response) {
    try {
      const parsedQuery = jobListQueryDto.safeParse(req.query);
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
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  }

  async getJobById(req: Request, res: Response) {
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
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  }

  async getMyJobs(req: Request, res: Response) {
    try {
      const company = getAuthenticatedUser(req);
      const parsedQuery = jobListQueryDto.safeParse(req.query);

      if (!parsedQuery.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid query parameters",
          errors: formatZodErrors(parsedQuery.error),
        });
      }

      const { companyId: _ignoredCompanyId, ...query } = parsedQuery.data;
      const result = await jobService.getCompanyJobs(
        company._id.toString(),
        query
      );

      return res.status(200).json({
        success: true,
        data: result.jobs,
        pagination: result.pagination,
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  }

  async getMyApplications(req: Request, res: Response) {
    try {
      const worker = getAuthenticatedUser(req);
      if (worker.role !== "user") {
        return res.status(403).json({
          success: false,
          message: "Only workers can view job applications",
        });
      }

      const parsedQuery = jobListQueryDto.safeParse(req.query);

      if (!parsedQuery.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid query parameters",
          errors: formatZodErrors(parsedQuery.error),
        });
      }

      const { companyId: _ignoredCompanyId, ...query } = parsedQuery.data;
      const result = await jobService.getAppliedJobs(
        worker._id.toString(),
        query
      );

      return res.status(200).json({
        success: true,
        data: result.jobs,
        pagination: result.pagination,
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  }

  async updateJob(req: Request, res: Response) {
    try {
      const company = getAuthenticatedUser(req);
      const jobId = getParam(req.params.jobId);
      if (!jobId) {
        return res.status(400).json({
          success: false,
          message: "jobId is required",
        });
      }

      const uploadedPhotos = getUploadedJobPhotoPaths(req);
      const parsedData = updateJobDto.safeParse({
        ...req.body,
        ...(uploadedPhotos.length > 0 ? { photos: uploadedPhotos } : {}),
      });
      if (!parsedData.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: formatZodErrors(parsedData.error),
        });
      }

      const job = await jobService.updateJob(
        jobId,
        company._id.toString(),
        parsedData.data
      );

      return res.status(200).json({
        success: true,
        message: "Job updated successfully",
        data: job,
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  }

  async updateJobStatus(req: Request, res: Response) {
    try {
      const company = getAuthenticatedUser(req);
      const jobId = getParam(req.params.jobId);
      if (!jobId) {
        return res.status(400).json({
          success: false,
          message: "jobId is required",
        });
      }

      const parsedData = updateJobStatusDto.safeParse(req.body);
      if (!parsedData.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: formatZodErrors(parsedData.error),
        });
      }

      const job = await jobService.updateJobStatus(
        jobId,
        company._id.toString(),
        parsedData.data.status
      );

      return res.status(200).json({
        success: true,
        message: "Job status updated successfully",
        data: job,
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  }

  async deleteJob(req: Request, res: Response) {
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
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  }

  async applyToJob(req: Request, res: Response) {
    try {
      const worker = req.user as any;
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
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  }

  async withdrawApplication(req: Request, res: Response) {
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

      const job = await jobService.withdrawApplication(
        jobId,
        worker._id.toString()
      );

      return res.status(200).json({
        success: true,
        message: "Application withdrawn successfully",
        job,
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  }

  async getJobApplicants(req: Request, res: Response) {
    try {
      const company = getAuthenticatedUser(req);
      const jobId = getParam(req.params.jobId);
      if (!jobId) {
        return res.status(400).json({
          success: false,
          message: "jobId is required",
        });
      }

      const job = await jobService.getJobApplicants(
        jobId,
        company._id.toString()
      );

      return res.status(200).json({
        success: true,
        data: job,
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  }

  async updateApplicationStatus(req: Request, res: Response) {
    try {
      const company = getAuthenticatedUser(req);
      const jobId = getParam(req.params.jobId);
      const workerId = getParam(req.params.workerId);

      if (!jobId) {
        return res.status(400).json({
          success: false,
          message: "jobId is required",
        });
      }

      if (!workerId) {
        return res.status(400).json({
          success: false,
          message: "workerId is required",
        });
      }

      const parsedData = updateApplicationStatusDto.safeParse(req.body);
      if (!parsedData.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: formatZodErrors(parsedData.error),
        });
      }

      const job = await jobService.updateApplicationStatus(
        jobId,
        company._id.toString(),
        workerId,
        parsedData.data.status
      );

      return res.status(200).json({
        success: true,
        message: "Application status updated successfully",
        data: job,
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  }
}
