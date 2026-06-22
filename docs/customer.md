# Customers

Customer management is the business-side CRM foundation. A customer belongs to one business tenant and can be linked to bookings, invoices, messages, reviews, and enquiries.

> Status: Feature-complete for the current scope.

See also: [`PROJECT.md`](./PROJECT.md), [`appointment.md`](./appointment.md), [`enquiry.md`](./enquiry.md).

---

## User Flows

### List and search

- Route: `/business/{businessId}/customers`
- Customers are listed with server-side pagination.
- Search supports email, first name, last name, company, city, and phone.
- Rows show core contact fields plus booking and invoice counts.

### Create customer

- Users can create customers manually from the Customers page.
- Appointments and enquiries can also create customers inline.
- Customer emails are unique per business.

### View and update customer

- Route: `/business/{businessId}/customers/{customerId}`
- The detail page shows profile data, notes, activity, linked bookings, and financial context.
- Updates are validated through `customerWriteSchema`.

### Delete customer

- Customers can be deleted only when they do not have linked invoices.
- The UI disables deletion and explains the reason when invoices exist.
- The API also enforces this rule with `409 Conflict`.

### CSV import

- Users can import customers from CSV from the Customers page.
- Sample template: `/customer-import-template.csv`
- The importer accepts common English and German header aliases.
- Existing customers with the same email are skipped instead of duplicated.

---

## Data Model

Primary model: `Customer`

Important fields:

- `businessId`: tenant scope.
- `email`: required and unique per business.
- `companyName`, `firstName`, `lastName`, `phone`, address fields.
- `status`: customer lifecycle status.
- `source`: manual/imported/system origin.
- `notes`: free-form internal notes.

Important relations:

- `bookings`
- `invoices`
- `messages`
- `reviews`
- `enquiries`

---

## Main Files

- `app/(business)/business/[businessId]/(shell)/customers/page.tsx`
- `app/(business)/business/[businessId]/(shell)/customers/[customerId]/page.tsx`
- `app/(business)/business/[businessId]/(shell)/customers/[customerId]/customer-detail-view.tsx`
- `app/(business)/business/[businessId]/(shell)/customers/add-customer-dialog.tsx`
- `app/(business)/business/[businessId]/(shell)/customers/import-customers-button.tsx`
- `app/api/business/[businessId]/customers/route.ts`
- `app/api/business/[businessId]/customers/[customerId]/route.ts`
- `app/api/business/[businessId]/customers/import/route.ts`
- `lib/customers.ts`
- `lib/customer-import.ts`
- `lib/validation/customer.ts`

---

## API

Business-owner protected endpoints:

- `GET /api/business/{businessId}/customers`
- `POST /api/business/{businessId}/customers`
- `GET /api/business/{businessId}/customers/{customerId}`
- `PATCH /api/business/{businessId}/customers/{customerId}`
- `DELETE /api/business/{businessId}/customers/{customerId}`
- `POST /api/business/{businessId}/customers/import`

All routes are tenant-scoped through `businessId` and guarded by `requireBusinessOwner`.

---

## QA Checklist

- Create a customer manually.
- Search customers by email, name, phone, city, and company.
- Import customers from the sample CSV.
- Confirm duplicate emails are skipped during import.
- Open a customer detail page and update fields.
- Confirm deletion works for customers without invoices.
- Confirm deletion is blocked in UI and API for customers with invoices.
- Confirm customers are available in invoice, appointment, and enquiry linking flows.

---

## Follow-ups

- Add richer duplicate resolution during CSV import if users need merge choices.
- Add bulk actions once customer volume grows.
- Add team/staff ownership if the app introduces multiple business users per tenant.
