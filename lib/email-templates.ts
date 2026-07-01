const PARAGRAPH_STYLE =
  "margin:0 0 16px;color:#18181b;font-size:16px;line-height:1.6;";

const BUTTON_STYLE =
  "display:inline-block;background-color:#18181b;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 24px;border-radius:6px;";

const LINK_STYLE = "color:#2563eb;text-decoration:underline;";

export function defaultInvoiceEmailHtml(): string {
  return `<p style="${PARAGRAPH_STYLE}">Guten Tag {{customerName}},</p>
<p style="${PARAGRAPH_STYLE}">Anbei erhalten Sie die Rechnung {{invoiceNumber}} von {{businessName}}.</p>
<p style="${PARAGRAPH_STYLE}">
  Betrag: {{total}}<br />
  Fälligkeitsdatum: {{dueDate}}<br />
  Status: {{invoiceStatus}}
</p>
<p style="margin:0;color:#18181b;font-size:16px;line-height:1.6;">Vielen Dank für Ihr Vertrauen.</p>`;
}

export function defaultInvoiceEmailText(): string {
  return [
    "Guten Tag {{customerName}},",
    "",
    "Anbei erhalten Sie die Rechnung {{invoiceNumber}} von {{businessName}}.",
    "",
    "Betrag: {{total}}",
    "Fälligkeitsdatum: {{dueDate}}",
    "Status: {{invoiceStatus}}",
    "",
    "Vielen Dank für Ihr Vertrauen.",
  ].join("\n");
}

export function defaultInvoiceSequenceStepHtml(stepIndex = 0): string {
  if (stepIndex === 0) {
    return defaultInvoiceEmailHtml();
  }

  return `<p style="${PARAGRAPH_STYLE}">Guten Tag {{customerName}},</p>
<p style="${PARAGRAPH_STYLE}">Dies ist eine freundliche Erinnerung, dass die Rechnung {{invoiceNumber}} von {{businessName}} noch offen ist.</p>
<p style="${PARAGRAPH_STYLE}">
  Betrag: {{total}}<br />
  Fälligkeitsdatum: {{dueDate}}
</p>
<p style="margin:0;color:#18181b;font-size:16px;line-height:1.6;">Vielen Dank.</p>`;
}

export function defaultInvoiceSequenceStepText(stepIndex = 0): string {
  if (stepIndex === 0) {
    return defaultInvoiceEmailText();
  }

  return [
    "Guten Tag {{customerName}},",
    "",
    "Dies ist eine freundliche Erinnerung, dass die Rechnung {{invoiceNumber}} von {{businessName}} noch offen ist.",
    "",
    "Betrag: {{total}}",
    "Fälligkeitsdatum: {{dueDate}}",
    "",
    "Vielen Dank.",
  ].join("\n");
}

export function defaultAppointmentReminderHtml(): string {
  return `<p style="${PARAGRAPH_STYLE}">Guten Tag {{customerName}},</p>
<p style="${PARAGRAPH_STYLE}">Dies ist eine Erinnerung an Ihren Termin bei {{businessName}}.</p>
<p style="${PARAGRAPH_STYLE}">
  Termin: {{appointmentTitle}}<br />
  Datum: {{appointmentDate}}<br />
  Uhrzeit: {{appointmentTime}}
</p>
<p style="${PARAGRAPH_STYLE}">{{meetingLink}}</p>
<p style="margin:0;color:#18181b;font-size:16px;line-height:1.6;">Vielen Dank.</p>`;
}

export function defaultAppointmentReminderText(): string {
  return [
    "Guten Tag {{customerName}},",
    "",
    "Dies ist eine Erinnerung an Ihren Termin bei {{businessName}}.",
    "",
    "Termin: {{appointmentTitle}}",
    "Datum: {{appointmentDate}}",
    "Uhrzeit: {{appointmentTime}}",
    "",
    "{{meetingUrl}}",
    "",
    "Vielen Dank.",
  ].join("\n");
}

export {
  defaultDirectReviewHtml,
  defaultReviewSequenceStepHtml,
  defaultReviewSequenceStepText,
} from "@/lib/review-email-templates";
