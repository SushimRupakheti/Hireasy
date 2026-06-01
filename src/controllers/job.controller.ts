import { Request, Response } from "express";
import z from "zod";
import { createJobDto } from "../types/job.type";
import { JobService } from "../services/job.service";

const jobService = new JobService();

const formatZodErrors = (error: z.ZodError) => {
  const flattened = error.flatten();
  return {
    fieldErrors: flattened.fieldErrors,
    formErrors: flattened.formErrors,
  };
};

export class JobController {
  async createJob(req: Request, res: Response) {
    try {
      const parsedData = createJobDto.safeParse(req.body);
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
}
