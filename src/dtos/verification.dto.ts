import z from "zod";

export const verificationListQueryDto = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(["pending", "approved", "rejected"]).optional(),
});

export const reviewVerificationDto = z
  .object({
    status: z.enum(["verified", "rejected"]),
    reason: z.string().trim().min(1).optional(),
  })
  .superRefine((data, context) => {
    if (data.status === "rejected" && !data.reason) {
      context.addIssue({
        code: "custom",
        path: ["reason"],
        message: "A reason is required when rejecting a verification request",
      });
    }
  });
