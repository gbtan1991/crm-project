import { wrapEmailContentHtml } from "@/lib/email-html";
import {
  defaultDirectReviewHtml,
  defaultReviewSequenceStepText,
} from "@/lib/review-email-templates";

export function buildReviewRequestEmailContent(input: {
  businessName: string;
  customerName: string;
  reviewUrl: string;
  isUpdateRequest?: boolean;
}) {
  const subject = input.isUpdateRequest
    ? `Aktualisieren Sie Ihre Bewertung für ${input.businessName}`
    : `Wie war Ihre Erfahrung mit ${input.businessName}?`;

  const bodyText = input.isUpdateRequest
    ? [
        `Guten Tag ${input.customerName},`,
        "",
        `Wir würden uns freuen, wenn Sie Ihre Bewertung für ${input.businessName} aktualisieren könnten.`,
        "",
        `Bewertung aktualisieren: ${input.reviewUrl}`,
        "",
        "Freundliche Grüsse",
        input.businessName,
      ].join("\n")
    : [
        `Guten Tag ${input.customerName},`,
        "",
        `Vielen Dank, dass Sie sich für ${input.businessName} entschieden haben. Wir hoffen, Sie hatten eine gute Erfahrung.`,
        "",
        "Wenn Sie einen Moment Zeit haben, würden wir uns sehr über Ihr Feedback freuen. Ihre Bewertung hilft uns, uns zu verbessern, und gibt anderen Kunden eine Orientierung.",
        "",
        `Bewertung abgeben: ${input.reviewUrl}`,
        "",
        "Freundliche Grüsse",
        input.businessName,
      ].join("\n");

  const bodyHtml = wrapEmailContentHtml(
    defaultDirectReviewHtml(input.isUpdateRequest)
      .replaceAll("{{customerName}}", input.customerName)
      .replaceAll("{{businessName}}", input.businessName)
      .replaceAll("{{link}}", input.reviewUrl),
  );

  return { subject, bodyText, bodyHtml };
}

export { defaultReviewSequenceStepText };
