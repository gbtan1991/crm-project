import { z } from "zod";

export const FORM_FIELD_TYPES = [
  "TEXT",
  "EMAIL",
  "PHONE",
  "TEXTAREA",
  "NUMBER",
  "JSON",
] as const;

export const FORM_FIELD_TYPE_LABELS: Record<(typeof FORM_FIELD_TYPES)[number], string> = {
  TEXT: "Text",
  EMAIL: "E-Mail",
  PHONE: "Telefon",
  TEXTAREA: "Textbereich",
  NUMBER: "Zahl",
  JSON: "JSON (Mehrfachauswahl / Array)",
};

export const JSON_FIELD_MAX_ARRAY_LENGTH = 50;
export const JSON_FIELD_MAX_STRING_LENGTH = 500;
export const JSON_FIELD_MAX_OBJECT_KEYS = 20;

const jsonPrimitiveSchema = z.union([
  z.string().trim().max(JSON_FIELD_MAX_STRING_LENGTH),
  z.number().finite(),
  z.boolean(),
]);

export const jsonFieldValueSchema = z.union([
  z.array(jsonPrimitiveSchema).max(JSON_FIELD_MAX_ARRAY_LENGTH),
  z
    .record(z.string().trim().min(1).max(100), jsonPrimitiveSchema)
    .refine(
      (value) => Object.keys(value).length <= JSON_FIELD_MAX_OBJECT_KEYS,
      `Maximal ${JSON_FIELD_MAX_OBJECT_KEYS} Schlüssel erlaubt.`,
    ),
  jsonPrimitiveSchema,
]);

export const formFieldKeySchema = z
  .string()
  .trim()
  .min(1, "Feldschlüssel ist erforderlich.")
  .max(50)
  .regex(
    /^[a-zA-Z][a-zA-Z0-9_]*$/,
    "Feldschlüssel muss mit einem Buchstaben beginnen und nur Buchstaben, Zahlen oder Unterstriche enthalten.",
  );

export const formFieldWriteSchema = z.object({
  id: z.string().uuid().optional(),
  key: formFieldKeySchema,
  label: z.string().trim().min(1, "Feldbezeichnung ist erforderlich.").max(100),
  type: z.enum(FORM_FIELD_TYPES),
  required: z.boolean().default(false),
  placeholder: z.string().trim().max(200).optional().or(z.literal("")),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

export const formWriteSchema = z.object({
  name: z.string().trim().min(1, "Formularname ist erforderlich.").max(100),
  isActive: z.boolean().optional(),
  fields: z
    .array(formFieldWriteSchema)
    .min(1, "Fügen Sie mindestens ein Feld hinzu.")
    .refine(
      (fields) => new Set(fields.map((field) => field.key)).size === fields.length,
      "Feldschlüssel müssen eindeutig sein.",
    ),
});

export const enquiryStatusSchema = z.enum(["NEW", "READ", "ARCHIVED"]);

export const enquiryUpdateSchema = z.object({
  status: enquiryStatusSchema.optional(),
  customerId: z.string().uuid().nullable().optional(),
}).refine((value) => value.status !== undefined || value.customerId !== undefined, {
  message: "Nichts zu aktualisieren.",
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
  options?: { includeJsonFields?: boolean },
) {
  const activeFields =
    options?.includeJsonFields === false
      ? fields.filter((field) => field.type !== "JSON")
      : fields;

  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of activeFields) {
    let schema: z.ZodTypeAny;

    switch (field.type) {
      case "EMAIL":
        schema = z.string().trim().email("Ungültige E-Mail-Adresse.");
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
      case "JSON":
        schema = jsonFieldValueSchema;
        if (field.required) {
          schema = schema.refine(
            (value) => {
              if (Array.isArray(value)) return value.length > 0;
              if (value !== null && typeof value === "object") {
                return Object.keys(value).length > 0;
              }
              return value !== null && value !== undefined && value !== "";
            },
            { message: `${field.key} ist erforderlich.` },
          );
        } else {
          schema = schema.optional();
        }
        shape[field.key] = schema;
        continue;
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
    placeholder: "Ihr Name",
    sortOrder: 0,
  },
  {
    key: "email",
    label: "E-Mail",
    type: "EMAIL",
    required: true,
    placeholder: "Ihre E-Mail",
    sortOrder: 1,
  },
  {
    key: "phone",
    label: "Telefon",
    type: "PHONE",
    required: false,
    placeholder: "+49 ...",
    sortOrder: 2,
  },
  {
    key: "description",
    label: "Beschreibung",
    type: "TEXTAREA",
    required: false,
    placeholder: "Kurze Beschreibung der Anfrage",
    sortOrder: 3,
  },
];
