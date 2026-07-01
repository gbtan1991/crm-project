export function renderEmailTemplatePreview(
  template: string,
  variables: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    return variables[key] ?? match;
  });
}

export function reviewSequencePreviewVariables(businessName: string) {
  const reviewLink = "https://example.com/review/preview";
  return {
    customerName: "Maria Müller",
    businessName,
    reviewLink,
    link: reviewLink,
  };
}

export function invoiceSequencePreviewVariables(businessName: string) {
  return {
    customerName: "Maria Müller",
    businessName,
    invoiceNumber: "RE-1001",
    invoiceTitle: "Website-Relaunch",
    total: "CHF 1'250.00",
    dueDate: "31. Aug. 2026",
    issueDate: "1. Aug. 2026",
    invoiceStatus: "Offen",
  };
}

export function appointmentReminderPreviewVariables(businessName: string) {
  return {
    customerName: "Maria Müller",
    businessName,
    appointmentTitle: "Erstberatung",
    appointmentDate: "15. Aug. 2026",
    appointmentTime: "10:30",
    meetingUrl: "Meeting-Link: https://meet.example.com/preview",
    meetingLink:
      '<a href="https://meet.example.com/preview" style="color:#2563eb;text-decoration:underline;">Meeting beitreten</a>',
  };
}
