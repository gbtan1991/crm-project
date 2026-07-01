import { z } from "zod";

const name = z.string().trim().min(2, "Name muss mindestens 2 Zeichen lang sein.");
const email = z
  .string()
  .trim()
  .email("Geben Sie eine gültige E-Mail-Adresse ein.")
  .transform((value) => value.toLowerCase());
const password = z.string().min(8, "Passwort muss mindestens 8 Zeichen lang sein.");

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
      .min(2, "Firmenname muss mindestens 2 Zeichen lang sein."),
  }),
]);

export type CreateUserInput = z.infer<typeof createUserSchema>;
