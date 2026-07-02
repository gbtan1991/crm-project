import { wrapEmailContentHtml } from "@/lib/email-html";
import { defaultDirectReviewHtml } from "@/lib/review-email-templates";

export function buildReviewRequestEmailContent(input: {
  businessName: string;
  customerName: string;
  reviewUrl: string;
  isUpdateRequest?: boolean;
}) {
  const subject = input.isUpdateRequest
    ? `Aktualisieren Sie Ihre Bewertung für ${input.businessName}`
    : `Wie war Ihre Erfahrung mit ${input.businessName}?`;

  const bodyHtml = wrapEmailContentHtml(
    defaultDirectReviewHtml(input.isUpdateRequest)
      .replaceAll("{{customerName}}", input.customerName)
      .replaceAll("{{businessName}}", input.businessName)
      .replaceAll("{{link}}", input.reviewUrl),
  );

  return { subject, bodyHtml };
}
