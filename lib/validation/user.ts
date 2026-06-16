import { z } from "zod";

const name = z.string().trim().min(2, "Name must be at least 2 characters.");
const email = z
  .string()
  .trim()
  .email("Enter a valid email address.")
  .transform((value) => value.toLowerCase());
const password = z.string().min(8, "Password must be at least 8 characters.");

/**
 * Admins are platform users with no business attached.
 * Business users always come with a brand-new business that they own.
 */
export const createUserSchema = z.discriminatedUnion("role", [
  z.object({
    role: z.literal("ADMIN"),
    name,
    email,
    password,
  }),
  z.object({
    role: z.literal("BUSINESS"),
    name,
    email,
    password,
    businessName: z
      .string()
      .trim()
      .min(2, "Business name must be at least 2 characters."),
  }),
]);

export type CreateUserInput = z.infer<typeof createUserSchema>;
