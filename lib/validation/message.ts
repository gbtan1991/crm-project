import { z } from "zod";

export const sendInvoiceEmailSchema = z.object({
  subject: z.string().trim().min(1, "Betreff ist erforderlich.").max(500),
  bodyHtml: z.string().trim().min(1, "HTML-Text ist erforderlich.").max(20_000),
});

export type SendInvoiceEmailInput = z.infer<typeof sendInvoiceEmailSchema>;
