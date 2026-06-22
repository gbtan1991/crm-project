# Invoice

Invoices manage billing and payments for services rendered. Businesses can create invoices with line items, track payment status, and send invoices via email.

> Status: Feature-complete for the current scope.

See also: [`PROJECT.md`](./PROJECT.md), [`customer.md`](./customer.md).

---

## User Flows

### View invoices

- Route: `/business/{businessId}/invoices`
- Invoices are listed with server-side pagination.
- Status filter supports All, DRAFT, OPEN, PAID, OVERDUE, CANCELLED.
- Rows show invoice number, title, status, dates, totals, and customer info.

### Create invoice

- Users can create invoices manually from the Invoices page.
- Required fields: customer, title, line items.
- Line items support template service references.
- VAT rate can be configured.
- Draft invoices can be saved and updated before sending.
- Auto-generated invoice numbers (format: RE-YYYY-NNNN).

### Update invoice

- Draft invoices can be updated (title, line items, VAT rate, notes).
- Cannot update sent or paid invoices.
- Changes to draft invoices do not affect the invoice number.

### Send invoice

- Draft invoices can be sent via email.
- Email includes invoice number, title, line items, totals, and payment instructions.
- Sending creates an email sequence enrollment.
- Invoice status transitions: DRAFT → OPEN.

### Update invoice status

- Open invoices can be marked as paid (status: PAID).
- Overdue invoices can be marked as cancelled (status: CANCELLED).
- Status transitions:
  - DRAFT → OPEN (when sent)
  - OPEN → PAID (when payment received)
  - OPEN → OVERDUE (when due date passes)
  - OPEN → CANCELLED (when payment is rejected)

### Payment tracking

- Invoices track payment status automatically:
  - Paid invoices show payment date
  - Overdue invoices are flagged based on due date
  - Cancellation is manual but can be triggered when payment is declined

---

## Data Model

Primary model: `Invoice`

Important fields:

- `businessId`: tenant scope.
- `number`: unique invoice number (e.g., RE-2024-0001).
- `title`: invoice title/description.
- `customerId`: linked customer.
- `status`: invoice status (DRAFT, OPEN, PAID, OVERDUE, CANCELLED).
- `issueDate`: invoice issue date.
- `dueDate`: invoice due date.
- `vatRate`: VAT rate (e.g., 19%).
- `notes`: additional notes.
- `sentAt`, `paidAt`: payment timestamps.

Supporting models:

- `InvoiceLineItem`: line items with description, quantity, unit price, total.
- `InvoiceEmailSequence`: email sequence enrollment for invoice reminders.

---

## Main Files

- `app/(business)/business/[businessId]/(shell)/invoices/page.tsx`
- `app/(business)/business/[businessId]/(shell)/invoices/invoices-panel.tsx`
- `app/(business)/business/[businessId]/(shell)/invoices/invoices-list-panel.tsx`
- `app/(business)/business/[businessId]/(shell)/invoices/invoice-card.tsx`
- `app/(business)/business/[businessId]/(shell)/invoices/create-invoice-dialog.tsx`
- `app/(business)/business/[businessId]/(shell)/invoices/update-invoice-dialog.tsx`
- `app/(business)/business/[businessId]/(shell)/invoices/invoice-detail-dialog.tsx`
- `app/(business)/business/[businessId]/(shell)/invoices/send-invoice-dialog.tsx`
- `app/api/business/[businessId]/invoices/route.ts`
- `app/api/business/[businessId]/invoices/[id]/route.ts`
- `lib/invoices.ts`
- `lib/invoice-pdf.ts`
- `lib/invoice-email.ts`
- `lib/invoice-money.ts`
- `lib/invoice-display.ts`
- `lib/validation/invoice.ts`

---

## API

Business-owner protected endpoints:

- `GET /api/business/{businessId}/invoices`
- `POST /api/business/{businessId}/invoices`
- `GET /api/business/{businessId}/invoices/[id]`
- `PATCH /api/business/{businessId}/invoices/[id]`
- `DELETE /api/business/{businessId}/invoices/[id]`

---

## Invoice Number Format

- Format: `RE-{year}-{sequential number}`
- Example: `RE-2024-0001`, `RE-2024-0002`
- Year is based on the invoice issue date.
- Sequential number resets at the start of each year.

---

## VAT Support

- VAT rate is stored as a decimal (e.g., 0.19 for 19%).
- VAT is calculated automatically from line item totals.
- Display shows VAT amount and total with VAT.
- VAT rate can be updated for draft invoices.

---

## Line Items

Line items support:

- Description
- Quantity
- Unit price
- Total (calculated automatically)
- Template service reference (optional)

Line items are stored with a `sortOrder` field to maintain display order.

---

## Email Sending

When an invoice is sent:

- Email is sent to the customer with invoice details.
- Invoice status changes from DRAFT to OPEN.
- Customer is automatically enrolled in the invoice email sequence.
- Invoice PDF is attached to the email.

---

## Overdue Invoices

Overdue invoices are automatically detected based on the due date:

- If `dueDate < current date` and `status === OPEN`, status becomes OVERDUE.
- Overdue invoices are highlighted in the list.
- Businesses can manually mark them as CANCELLED if payment is declined.

---

## QA Checklist

- Create a draft invoice and confirm it appears with status DRAFT.
- Add line items with quantities and prices and confirm totals are calculated correctly.
- Update a draft invoice and confirm changes are saved.
- Send a draft invoice and confirm status changes to OPEN.
- Mark an open invoice as paid and confirm status changes to PAID.
- Check that overdue invoices are automatically flagged when due date passes.
- View an invoice and confirm all details (numbers, totals, dates) are correct.
- Delete a draft invoice and confirm it is removed.
- Try to update a sent invoice and confirm it is blocked.

---

## Follow-ups

- Add recurring invoice generation.
- Add payment link integration (e.g., Stripe, PayPal).
- Add invoice history and audit log.
- Add multiple payment methods support.
- Add bulk invoice operations (e.g., mark multiple as paid).