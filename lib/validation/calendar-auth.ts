import { z } from "zod";

export const calendarAuthRequestSchema = z.object({
  businessId: z.string().uuid(),
  redirectPath: z.string().min(1).optional(),
});
