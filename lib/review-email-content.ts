export function buildReviewRequestEmailContent(input: {
  businessName: string;
  customerName: string;
  reviewUrl: string;
  isUpdateRequest?: boolean;
}) {
  const subject = input.isUpdateRequest
    ? `Update your review for ${input.businessName}`
    : `How was your experience with ${input.businessName}?`;

  const bodyText = [
    `Hello ${input.customerName},`,
    "",
    input.isUpdateRequest
      ? `We would appreciate it if you could update your review for ${input.businessName}.`
      : `Thank you for choosing ${input.businessName}. We would love to hear about your experience.`,
    "",
    `Please click here to add your review: ${input.reviewUrl}`,
    "",
    "Thank you.",
  ].join("\n");

  return { subject, bodyText };
}
