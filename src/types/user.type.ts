import z from 'zod';

export const userSchema=z.object({
    role: z.enum(["user", "admin", "company"]).default("user"),
    firstName: z.string().optional(),
    lastName:z.string().optional(),
    companyName: z.string().optional(),
    email:z.string().email('Invalid email address'),
    contactNo:z.string(),
    address:z.string(),  
    password:z.string().min(6),
    interestedFields: z.array(z.string()).optional(),
    profileImage: z.string().nullable().optional(),
});

export type UserType=z.infer<typeof userSchema>;