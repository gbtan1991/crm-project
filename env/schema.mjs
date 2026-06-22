// @ts-check
import { z } from "zod";

export const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(1),

  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  AZURE_CLIENT_ID: z.string().min(1),
  AZURE_CLIENT_SECRET: z.string().min(1),

  /** Used to encrypt OAuth tokens at rest (32+ char random string). */
  ENCRYPTION_SECRET: z.string().min(16),
});

export const serverEnv = {
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  AUTH_SECRET: process.env.AUTH_SECRET,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  AZURE_CLIENT_ID: process.env.AZURE_CLIENT_ID,
  AZURE_CLIENT_SECRET: process.env.AZURE_CLIENT_SECRET,
  ENCRYPTION_SECRET: process.env.ENCRYPTION_SECRET,
};

export const clientSchema = z.object({
  NEXT_PUBLIC_URL: z.string().url(),
});

export const clientEnv = {
  NEXT_PUBLIC_URL: process.env.NEXT_PUBLIC_URL,
};
