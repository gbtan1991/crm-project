export function isOnboardingComplete(
  config: { onboardingCompletedAt: Date | null } | null | undefined,
): boolean {
  return config?.onboardingCompletedAt != null;
}

export function businessBasePath(businessId: string): string {
  return `/business/${businessId}`;
}

export function businessDashboardPath(businessId: string): string {
  return `${businessBasePath(businessId)}/dashboard`;
}

export function businessCustomersPath(businessId: string): string {
  return `${businessBasePath(businessId)}/customers`;
}

export function businessCustomerPath(
  businessId: string,
  customerId: string,
): string {
  return `${businessCustomersPath(businessId)}/${customerId}`;
}

export function businessBookingsPath(businessId: string): string {
  return `${businessBasePath(businessId)}/bookings`;
}

export function businessFinancePath(businessId: string): string {
  return `${businessBasePath(businessId)}/finance`;
}

export function businessFinanceDashboardPath(businessId: string): string {
  return `${businessFinancePath(businessId)}/dashboard`;
}

export function businessInvoicesPath(
  businessId: string,
  tab?: "invoices" | "templates",
): string {
  const base = `${businessFinancePath(businessId)}/invoices`;
  return tab === "templates" ? `${base}?tab=templates` : base;
}

export function businessInvoicePath(
  businessId: string,
  invoiceId: string,
): string {
  return `${businessInvoicesPath(businessId)}/${invoiceId}`;
}

export function businessInvoiceTemplatesPath(businessId: string): string {
  return businessInvoicesPath(businessId, "templates");
}

export function businessInvoiceTemplateEditPath(
  businessId: string,
  templateId: string | "new",
): string {
  return `${businessInvoiceTemplatesPath(businessId)}&edit=${templateId}`;
}

export function businessNewInvoicePath(
  businessId: string,
  customerId?: string,
): string {
  const base = `${businessInvoicesPath(businessId)}/new`;
  return customerId ? `${base}?customerId=${customerId}` : base;
}

export function businessOnboardingPath(businessId: string): string {
  return `${businessBasePath(businessId)}/onboarding`;
}

export function businessEnquiriesPath(
  businessId: string,
  tab?: "enquiries" | "forms",
): string {
  const base = `${businessBasePath(businessId)}/enquiries`;
  return tab === "forms" ? `${base}?tab=forms` : base;
}

export function businessEnquiryFormsPath(businessId: string): string {
  return businessEnquiriesPath(businessId, "forms");
}

export function businessNewEnquiryFormPath(businessId: string): string {
  return `${businessEnquiriesPath(businessId)}/forms/new`;
}

export function businessReviewsPath(businessId: string): string {
  return `${businessBasePath(businessId)}/reviews`;
}

export function businessWebsitePath(businessId: string): string {
  return `${businessBasePath(businessId)}/website`;
}
