import z from 'zod';

export const userStatusSchema = z.enum([
    "pending",
    "verified",
    "rejected",
    "blocked",
    "suspended",
]);

export const documentVerificationSchema = z.object({
    status: z.enum(["pending", "approved", "rejected"]).default("pending"),
    reason: z.string().optional(),
    reviewedBy: z.string().optional(),
    reviewedAt: z.date().optional(),
});

export const userDocumentSchema = z.object({
    documentType: z.enum(["resume", "company_document"]),
    filename: z.string(),
    originalName: z.string(),
    mimeType: z.string(),
    size: z.number().nonnegative(),
    uploadedAt: z.date(),
    verification: documentVerificationSchema.optional(),
});

export const userSchema=z.object({
    role: z.enum(["user", "admin", "company"]).default("user"),
    status: userStatusSchema.default("pending"),
    firstName: z.string().optional(),
    lastName:z.string().optional(),
    companyName: z.string().optional(),
    email:z.string().email('Invalid email address'),
    contactNo:z.string(),
    address:z.string(),  
    password:z.string().min(6),
    interestedFields: z.array(z.string()).optional(),
    profileImage: z.string().nullable().optional(),
    document: userDocumentSchema.nullable().optional(),
});

export type UserType=z.infer<typeof userSchema>;
export type UserStatus=z.infer<typeof userStatusSchema>;
export type UserDocument=z.infer<typeof userDocumentSchema>;
