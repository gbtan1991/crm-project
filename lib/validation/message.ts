import { z } from "zod";

export const sendInvoiceEmailSchema = z.object({
  subject: z.string().trim().min(1, "Subject is required.").max(500),
  bodyText: z.string().trim().min(1, "Message is required.").max(20_000),
});

export type SendInvoiceEmailInput = z.infer<typeof sendInvoiceEmailSchema>;
