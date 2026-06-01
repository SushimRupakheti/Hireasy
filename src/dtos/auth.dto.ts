import z from 'zod';
import { userSchema } from '../types/user.type';

const emptyStringToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => {
    if (typeof value === "string" && value.trim() === "") {
      return undefined;
    }
    return value;
  }, schema);

const interestedFieldsSchema = z.preprocess((value) => {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return value;
}, z.array(z.string().trim().min(1, "Interested field cannot be empty")).min(1, "Select at least one interested field"));

const individualRegistrationSchema = userSchema.extend({
  role: z.literal("user"),
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  interestedFields: interestedFieldsSchema,
  companyName: emptyStringToUndefined(z.undefined().optional()),
});

const companyRegistrationSchema = userSchema.extend({
  role: z.literal("company"),
  companyName: emptyStringToUndefined(z.string().trim().min(1, "Company name is required")),
  firstName: emptyStringToUndefined(z.undefined().optional()),
  lastName: emptyStringToUndefined(z.undefined().optional()),
  interestedFields: emptyStringToUndefined(z.undefined().optional()),
});

export const createUserDto = z.discriminatedUnion("role", [
  individualRegistrationSchema,
  companyRegistrationSchema,
]);

export type createUserDto=z.infer<typeof createUserDto>;

export const LoginUserDto=z.object({
    email:z.string().trim().email("Invalid email address"),
    password:z.string().min(6, "Password must be at least 6 characters long")
})
export type LoginUserDto=z.infer<typeof LoginUserDto>;

export const UpdateProfileDto = z.object({
  firstName: z.string().trim().min(1, "First name cannot be empty").optional(),
  lastName: z.string().trim().min(1, "Last name cannot be empty").optional(),
  contactNo: z.string().trim().min(1, "Contact number cannot be empty").optional(),
  address: z.string().trim().min(1, "Address cannot be empty").optional(),
  profileImage: z.string().nullable().optional(),
});

export type UpdateProfileDto = z.infer<typeof UpdateProfileDto>;
