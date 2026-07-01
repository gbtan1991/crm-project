import { z } from "zod";

export const sendInvoiceEmailSchema = z.object({
  subject: z.string().trim().min(1, "Betreff ist erforderlich.").max(500),
  bodyText: z.string().trim().min(1, "Nachricht ist erforderlich.").max(20_000),
  bodyHtml: z.string().trim().max(20_000).optional().or(z.literal("")),
});

export type SendInvoiceEmailInput = z.infer<typeof sendInvoiceEmailSchema>;
