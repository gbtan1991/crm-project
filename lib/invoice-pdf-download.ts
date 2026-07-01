export async function downloadInvoicePdf(
  businessId: string,
  invoiceId: string,
  filename: string,
): Promise<void> {
  const response = await fetch(
    `/api/business/${businessId}/invoices/${invoiceId}/pdf`,
  );

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(
      typeof data.error === "string" ? data.error : "Rechnungs-PDF konnte nicht heruntergeladen werden.",
    );
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  anchor.click();
  URL.revokeObjectURL(url);
}
