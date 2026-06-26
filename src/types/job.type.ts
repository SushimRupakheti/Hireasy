import z from "zod";

export const jobStatusSchema = z.enum([
  "pending",
  "open",
  "closed",
  "filled",
  "cancelled",
]);

export const jobShiftSchema = z.enum([
  "Morning",
  "Night",
  "Rotational",
  "Full Day",
]);

export const jobSchema = z.object({
  roleType: z.string().trim().min(3, "roleType must be at least 3 characters"),
  numberOfWorkers: z.coerce.number().int().positive("numberOfWorkers must be greater than 0"),
  pay: z.coerce.number().positive("pay must be greater than 0"),
  shift: jobShiftSchema,
  location: z.string().trim().min(1, "location is required"),
  photos: z.array(z.string().url("Each photo must be a valid URL")).optional(),
  description: z.string().trim().min(20, "description must be at least 20 characters"),
  status: jobStatusSchema.default("pending"),
});

export const createJobDto = jobSchema;

export const updateJobDto = jobSchema
  .omit({ status: true })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update",
  });

export const updateJobStatusDto = z.object({
  status: jobStatusSchema,
});

export const jobListQueryDto = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().min(1).optional(),
  roleType: z.string().trim().min(1).optional(),
  location: z.string().trim().min(1).optional(),
  shift: jobShiftSchema.optional(),
  status: jobStatusSchema.optional(),
  companyId: z.string().trim().min(1).optional(),
  minPay: z.coerce.number().nonnegative().optional(),
  maxPay: z.coerce.number().nonnegative().optional(),
}).refine(
  (data) =>
    data.minPay === undefined ||
    data.maxPay === undefined ||
    data.minPay <= data.maxPay,
  {
    message: "minPay cannot be greater than maxPay",
    path: ["minPay"],
  }
);

export type CreateJobDto = z.infer<typeof createJobDto>;
export type UpdateJobDto = z.infer<typeof updateJobDto>;
export type UpdateJobStatusDto = z.infer<typeof updateJobStatusDto>;
export type JobListQueryDto = z.infer<typeof jobListQueryDto>;
export type JobStatus = z.infer<typeof jobStatusSchema>;
export type JobShift = z.infer<typeof jobShiftSchema>;
