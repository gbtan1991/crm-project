import { z } from "zod";

export const FORM_FIELD_TYPES = [
  "TEXT",
  "EMAIL",
  "PHONE",
  "TEXTAREA",
  "NUMBER",
] as const;

export const formFieldKeySchema = z
  .string()
  .trim()
  .min(1, "Field key is required.")
  .max(50)
  .regex(
    /^[a-z][a-z0-9_]*$/,
    "Field key must start with a letter and use lowercase letters, numbers, or underscores.",
  );

export const formFieldWriteSchema = z.object({
  id: z.string().uuid().optional(),
  key: formFieldKeySchema,
  label: z.string().trim().min(1, "Field label is required.").max(100),
  type: z.enum(FORM_FIELD_TYPES),
  required: z.boolean().default(false),
  placeholder: z.string().trim().max(200).optional().or(z.literal("")),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

export const formWriteSchema = z.object({
  name: z.string().trim().min(1, "Form name is required.").max(100),
  isActive: z.boolean().optional(),
  fields: z
    .array(formFieldWriteSchema)
    .min(1, "Add at least one field.")
    .refine(
      (fields) => new Set(fields.map((field) => field.key)).size === fields.length,
      "Field keys must be unique.",
    ),
});

export const enquiryStatusSchema = z.enum(["NEW", "READ", "ARCHIVED"]);

export const enquiryUpdateSchema = z.object({
  status: enquiryStatusSchema.optional(),
  customerId: z.string().uuid().nullable().optional(),
}).refine((value) => value.status !== undefined || value.customerId !== undefined, {
  message: "Nothing to update.",
});

export const enquiryCreateSchema = z.object({
  formId: z.string().uuid(),
  data: z.record(z.string(), z.unknown()),
});

export type EnquiryCreateInput = z.infer<typeof enquiryCreateSchema>;

export type FormFieldWriteInput = z.infer<typeof formFieldWriteSchema>;
export type FormWriteInput = z.infer<typeof formWriteSchema>;

export function buildEnquiryPayloadSchema(
  fields: Array<{
    key: string;
    type: (typeof FORM_FIELD_TYPES)[number];
    required: boolean;
  }>,
) {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of fields) {
    let schema: z.ZodTypeAny;

    switch (field.type) {
      case "EMAIL":
        schema = z.string().trim().email("Invalid email address.");
        break;
      case "PHONE":
        schema = z.string().trim().min(3).max(50);
        break;
      case "TEXTAREA":
        schema = z.string().trim().max(5000);
        break;
      case "NUMBER":
        schema = z.coerce.number();
        break;
      default:
        schema = z.string().trim().max(500);
    }

    if (!field.required) {
      schema = schema.optional().or(z.literal(""));
    }

    shape[field.key] = schema;
  }

  return z.object(shape).strict();
}

export const DEFAULT_FORM_FIELDS: FormFieldWriteInput[] = [
  {
    key: "name",
    label: "Name",
    type: "TEXT",
    required: true,
    placeholder: "",
    sortOrder: 0,
  },
  {
    key: "email",
    label: "Email",
    type: "EMAIL",
    required: true,
    placeholder: "",
    sortOrder: 1,
  },
  {
    key: "phone",
    label: "Phone",
    type: "PHONE",
    required: false,
    placeholder: "",
    sortOrder: 2,
  },
  {
    key: "description",
    label: "Description",
    type: "TEXTAREA",
    required: false,
    placeholder: "",
    sortOrder: 3,
  },
];
