import { Request, Response } from "express";
import z from "zod";
import {
  adminApplicationListQueryDto,
  adminApplicationStatusDto,
  adminAuditLogQueryDto,
  adminDocumentRejectDto,
  adminJobListQueryDto,
  adminJobStatusDto,
  adminUpdateJobDto,
  adminUpdateUserDto,
  adminUserListQueryDto,
  adminUserStatusDto,
  paginationQueryDto,
} from "../dtos/admin.dto";
import { LoginUserDto } from "../dtos/auth.dto";
import { AdminService } from "../services/admin.service";

const adminService = new AdminService();

const formatZodErrors = (error: z.ZodError) => ({
  fieldErrors: error.flatten().fieldErrors,
  formErrors: error.flatten().formErrors,
});

const param = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

function adminId(req: Request) {
  return (req.user as any)?._id?.toString();
}

function validationError(res: Response, error: z.ZodError) {
  return res.status(400).json({
    success: false,
    message: "Validation failed",
    errors: formatZodErrors(error),
  });
}

export class AdminController {
  async login(req: Request, res: Response) {
    try {
      const parsed = LoginUserDto.safeParse(req.body);
      if (!parsed.success) return validationError(res, parsed.error);

      const result = await adminService.login(
        parsed.data.email,
        parsed.data.password
      );
      return res.status(200).json({
        success: true,
        message: "Admin login success",
        ...result,
      });
    } catch (error: any) {
      return this.fail(res, error);
    }
  }

  async dashboard(_req: Request, res: Response) {
    try {
      const data = await adminService.dashboard();
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return this.fail(res, error);
    }
  }

  async listUsers(req: Request, res: Response) {
    try {
      const parsed = adminUserListQueryDto.safeParse(req.query);
      if (!parsed.success) return validationError(res, parsed.error);
      const result = await adminService.listUsers(parsed.data);
      return res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      return this.fail(res, error);
    }
  }

  async listCompanies(req: Request, res: Response) {
    try {
      const parsed = adminUserListQueryDto.safeParse({
        ...req.query,
        role: "company",
      });
      if (!parsed.success) return validationError(res, parsed.error);
      const result = await adminService.listUsers(parsed.data);
      return res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      return this.fail(res, error);
    }
  }

  async getUser(req: Request, res: Response) {
    try {
      const id = param(req.params.id);
      if (!id) return res.status(400).json({ success: false, message: "Missing user id" });
      const data = await adminService.getUser(id);
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return this.fail(res, error);
    }
  }

  async getCompany(req: Request, res: Response) {
    return this.getUser(req, res);
  }

  async updateUserStatus(req: Request, res: Response) {
    try {
      const id = param(req.params.id);
      if (!id) return res.status(400).json({ success: false, message: "Missing user id" });
      const parsed = adminUserStatusDto.safeParse(req.body);
      if (!parsed.success) return validationError(res, parsed.error);

      const user = await adminService.updateUserStatus(
        adminId(req),
        id,
        parsed.data.status,
        parsed.data.reason
      );
      return res.status(200).json({ success: true, data: user });
    } catch (error: any) {
      return this.fail(res, error);
    }
  }

  async updateUser(req: Request, res: Response) {
    try {
      const id = param(req.params.id);
      if (!id) return res.status(400).json({ success: false, message: "Missing user id" });
      const parsed = adminUpdateUserDto.safeParse(req.body);
      if (!parsed.success) return validationError(res, parsed.error);

      const user = await adminService.updateUser(adminId(req), id, parsed.data);
      return res.status(200).json({ success: true, data: user });
    } catch (error: any) {
      return this.fail(res, error);
    }
  }

  async deleteUser(req: Request, res: Response) {
    try {
      const id = param(req.params.id);
      if (!id) return res.status(400).json({ success: false, message: "Missing user id" });
      await adminService.deleteUser(adminId(req), id);
      return res.status(200).json({ success: true, message: "User deleted" });
    } catch (error: any) {
      return this.fail(res, error);
    }
  }

  async pendingDocuments(req: Request, res: Response) {
    try {
      const parsed = paginationQueryDto.safeParse(req.query);
      if (!parsed.success) return validationError(res, parsed.error);
      const result = await adminService.listPendingDocuments(parsed.data);
      return res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      return this.fail(res, error);
    }
  }

  async approveDocument(req: Request, res: Response) {
    try {
      const id = param(req.params.id);
      if (!id) return res.status(400).json({ success: false, message: "Missing user id" });
      const user = await adminService.approveDocument(adminId(req), id);
      return res.status(200).json({ success: true, data: user });
    } catch (error: any) {
      return this.fail(res, error);
    }
  }

  async rejectDocument(req: Request, res: Response) {
    try {
      const id = param(req.params.id);
      if (!id) return res.status(400).json({ success: false, message: "Missing user id" });
      const parsed = adminDocumentRejectDto.safeParse(req.body);
      if (!parsed.success) return validationError(res, parsed.error);
      const user = await adminService.rejectDocument(
        adminId(req),
        id,
        parsed.data.reason
      );
      return res.status(200).json({ success: true, data: user });
    } catch (error: any) {
      return this.fail(res, error);
    }
  }

  async listJobs(req: Request, res: Response) {
    try {
      const parsed = adminJobListQueryDto.safeParse(req.query);
      if (!parsed.success) return validationError(res, parsed.error);
      const result = await adminService.listJobs(parsed.data);
      return res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      return this.fail(res, error);
    }
  }

  async getJob(req: Request, res: Response) {
    try {
      const id = param(req.params.id);
      if (!id) return res.status(400).json({ success: false, message: "Missing job id" });
      const job = await adminService.getJob(id);
      return res.status(200).json({ success: true, data: job });
    } catch (error: any) {
      return this.fail(res, error);
    }
  }

  async updateJobStatus(req: Request, res: Response) {
    try {
      const id = param(req.params.id);
      if (!id) return res.status(400).json({ success: false, message: "Missing job id" });
      const parsed = adminJobStatusDto.safeParse(req.body);
      if (!parsed.success) return validationError(res, parsed.error);
      const job = await adminService.updateJobStatus(
        adminId(req),
        id,
        parsed.data.status,
        parsed.data.reason
      );
      return res.status(200).json({ success: true, data: job });
    } catch (error: any) {
      return this.fail(res, error);
    }
  }

  async updateJob(req: Request, res: Response) {
    try {
      const id = param(req.params.id);
      if (!id) return res.status(400).json({ success: false, message: "Missing job id" });
      const parsed = adminUpdateJobDto.safeParse(req.body);
      if (!parsed.success) return validationError(res, parsed.error);
      const job = await adminService.updateJob(adminId(req), id, parsed.data);
      return res.status(200).json({ success: true, data: job });
    } catch (error: any) {
      return this.fail(res, error);
    }
  }

  async deleteJob(req: Request, res: Response) {
    try {
      const id = param(req.params.id);
      if (!id) return res.status(400).json({ success: false, message: "Missing job id" });
      await adminService.deleteJob(adminId(req), id);
      return res.status(200).json({ success: true, message: "Job deleted" });
    } catch (error: any) {
      return this.fail(res, error);
    }
  }

  async listApplications(req: Request, res: Response) {
    try {
      const parsed = adminApplicationListQueryDto.safeParse(req.query);
      if (!parsed.success) return validationError(res, parsed.error);
      const result = await adminService.listApplications(parsed.data);
      return res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      return this.fail(res, error);
    }
  }

  async updateApplicationStatus(req: Request, res: Response) {
    try {
      const jobId = param(req.params.jobId);
      const workerId = param(req.params.workerId);
      if (!jobId || !workerId) {
        return res.status(400).json({
          success: false,
          message: "jobId and workerId are required",
        });
      }
      const parsed = adminApplicationStatusDto.safeParse(req.body);
      if (!parsed.success) return validationError(res, parsed.error);
      const job = await adminService.updateApplicationStatus(
        adminId(req),
        jobId,
        workerId,
        parsed.data.status,
        parsed.data.reason
      );
      return res.status(200).json({ success: true, data: job });
    } catch (error: any) {
      return this.fail(res, error);
    }
  }

  async auditLogs(req: Request, res: Response) {
    try {
      const parsed = adminAuditLogQueryDto.safeParse(req.query);
      if (!parsed.success) return validationError(res, parsed.error);
      const result = await adminService.listAuditLogs(parsed.data);
      return res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      return this.fail(res, error);
    }
  }

  private fail(res: Response, error: any) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
}
