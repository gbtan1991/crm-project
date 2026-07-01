import { z } from "zod";

export const customerStatusSchema = z.enum(["ACTIVE", "INACTIVE"]);

export const customerWriteSchema = z.object({
  companyName: z.string().trim().max(200).optional().or(z.literal("")),
  firstName: z.string().trim().max(100).optional().or(z.literal("")),
  lastName: z.string().trim().max(100).optional().or(z.literal("")),
  email: z.string().trim().email("Eine gültige E-Mail-Adresse ist erforderlich."),
  phone: z.string().trim().max(50).optional().or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  postalCode: z.string().trim().max(20).optional().or(z.literal("")),
  city: z.string().trim().max(100).optional().or(z.literal("")),
  status: customerStatusSchema.default("ACTIVE"),
  notes: z.string().trim().max(5000).optional().or(z.literal("")),
});

export type CustomerWriteInput = z.infer<typeof customerWriteSchema>;

export function normalizeCustomerInput(input: CustomerWriteInput) {
  const emptyToNull = (value?: string) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  };

  return {
    companyName: emptyToNull(input.companyName),
    firstName: emptyToNull(input.firstName),
    lastName: emptyToNull(input.lastName),
    email: input.email.trim().toLowerCase(),
    phone: emptyToNull(input.phone),
    address: emptyToNull(input.address),
    postalCode: emptyToNull(input.postalCode),
    city: emptyToNull(input.city),
    status: input.status,
    notes: emptyToNull(input.notes),
  };
}
