import z from "zod";

export const jobStatusSchema = z.enum([
  "pending",
  "open",
  "verified",
  "rejected",
  "closed",
  "filled",
  "cancelled",
]);

export const jobShiftSchema = z.string().trim().min(1, "shift cannot be empty");

export const applicationStatusSchema = z.enum([
  "pending",
  "accepted",
  "rejected",
  "completed",
]);

const jobDateSchema = z.preprocess(
  (value) => (value === null || value === "" ? undefined : value),
  z.coerce.date()
);

const jobPhotoSchema = z
  .string()
  .trim()
  .refine(
    (value) =>
      z.string().url().safeParse(value).success ||
      value.startsWith("/upload/jobs/"),
    "Each photo must be a valid URL or uploaded job photo path"
  );

const normalizeStringValues = (value: unknown) => {
  if (Array.isArray(value)) {
    return value.flatMap((item) =>
      typeof item === "string"
        ? item.split(",").map((part) => part.trim()).filter(Boolean)
        : item
    );
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return value;
};

const stringValuesSchema = (
  fieldName: string,
  minLength = 1,
  minLengthMessage = `${fieldName} cannot be empty`
) =>
  z.preprocess(
    normalizeStringValues,
    z
      .array(z.string().trim().min(minLength, minLengthMessage))
      .min(1, `${fieldName} is required`)
  );

const jobShiftValuesSchema = z.preprocess(
  normalizeStringValues,
  z.array(jobShiftSchema).min(1, "shift is required")
);

export const jobSchema = z.object({
  roleType: stringValuesSchema(
    "roleType",
    3,
    "Each roleType must be at least 3 characters"
  ),
  numberOfWorkers: z.coerce.number().int().positive("numberOfWorkers must be greater than 0"),
  pay: z.coerce.number().positive("pay must be greater than 0"),
  shift: jobShiftValuesSchema,
  location: stringValuesSchema("location"),
  job_date: jobDateSchema,
  photos: z.preprocess(
    (value) => (typeof value === "string" ? [value] : value),
    z.array(jobPhotoSchema)
  ).optional(),
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

export const updateApplicationStatusDto = z.object({
  status: applicationStatusSchema,
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
  jobDateFrom: z.coerce.date().optional(),
  jobDateTo: z.coerce.date().optional(),
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
export type UpdateApplicationStatusDto = z.infer<typeof updateApplicationStatusDto>;
export type JobListQueryDto = z.infer<typeof jobListQueryDto>;
export type JobStatus = z.infer<typeof jobStatusSchema>;
export type JobShift = z.infer<typeof jobShiftSchema>;
export type ApplicationStatus = z.infer<typeof applicationStatusSchema>;
