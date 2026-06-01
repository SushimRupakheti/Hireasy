import z from "zod";

export const jobSchema = z.object({
  roleType: z.string().trim().min(3, "roleType must be at least 3 characters"),
  numberOfWorkers: z.coerce.number().int().positive("numberOfWorkers must be greater than 0"),
  shift: z.enum(["Morning", "Night", "Rotational", "Full Day"], {
    message: "shift must be one of: Morning, Night, Rotational, Full Day",
  }),
  location: z.string().trim().min(1, "location is required"),
  photos: z.array(z.string().url("Each photo must be a valid URL")).optional(),
  description: z.string().trim().min(20, "description must be at least 20 characters"),
});

export const createJobDto = jobSchema;

export type CreateJobDto = z.infer<typeof createJobDto>;
