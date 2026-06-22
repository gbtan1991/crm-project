# Enquiries

Enquiries capture lead/contact submissions for a business. Businesses can define reusable forms, receive submissions through internal UI or public webhooks, and convert/link enquiries to customers.

> Status: Feature-complete for the current scope.

See also: [`PROJECT.md`](./PROJECT.md), [`customer.md`](./customer.md).

---

## User Flows

### View enquiries

- Route: `/business/{businessId}/enquiries`
- The page has two tabs: Enquiries and Forms.
- Status filter supports All, New, Read, and Archived.
- Opening a new enquiry marks it as read.
- Cards show form name, excerpt, received time, status, and linked customer when present.

### Add enquiry manually

- Users can manually add an enquiry from an active form.
- The form fields are generated from the selected form configuration.
- Input is validated through the same schema rules used by webhooks.

### Update enquiry

- Users can change status from the list card or detail dialog.
- Users can link an enquiry to an existing customer.
- Users can create a new customer from the enquiry detail dialog and link it immediately.
- Linked customer state is stored on the enquiry.

### Delete enquiry

- Users can delete enquiries from the list card.
- Deleting an enquiry does not delete linked customers.

### Manage forms

- Route: `/business/{businessId}/enquiries?tab=forms`
- Users can create, edit, activate/deactivate, and delete forms.
- Each form has a public webhook URL.
- Each form card shows a sample JSON request body based on its configured fields.

---

## Data Model

Primary models:

- `Form`
- `FormField`
- `Enquiry`

Important `Form` fields:

- `businessId`: tenant scope.
- `name`: unique per business.
- `webhookToken`: unique public token for submissions.
- `isActive`: inactive forms reject webhook submissions.

Important `FormField` fields:

- `key`: JSON payload key.
- `label`: UI label.
- `type`: text, email, phone, textarea, or number.
- `required`: validation rule.
- `sortOrder`: display order.

Important `Enquiry` fields:

- `businessId`: tenant scope.
- `formId`: source form.
- `customerId`: optional linked customer.
- `status`: `NEW`, `READ`, or `ARCHIVED`.
- `data`: submitted JSON payload.

---

## Webhooks

Webhook URL format:

```text
{NEXT_PUBLIC_URL}/api/webhooks/enquiries/{webhookToken}
```

Supported methods:

- `POST`: create an enquiry.
- `OPTIONS`: CORS/preflight support.

Request body:

```json
{
  "name": "Alex Muller",
  "email": "alex@example.com",
  "phone": "+49 30 123456",
  "description": "I would like to book an appointment next week."
}
```

Rules:

- Body must be a JSON object.
- Only configured form field keys are accepted.
- Required fields must be present.
- Email and number fields are type-validated.
- Inactive or missing forms return an error.
- Successful requests return `{ "ok": true, "enquiryId": "..." }`.

---

## Main Files

- `app/(business)/business/[businessId]/(shell)/enquiries/page.tsx`
- `app/(business)/business/[businessId]/(shell)/enquiries/enquiries-tab-nav.tsx`
- `app/(business)/business/[businessId]/(shell)/enquiries/enquiries-status-filter.tsx`
- `app/(business)/business/[businessId]/(shell)/enquiries/enquiries-list-panel.tsx`
- `app/(business)/business/[businessId]/(shell)/enquiries/enquiry-card.tsx`
- `app/(business)/business/[businessId]/(shell)/enquiries/enquiry-detail-dialog.tsx`
- `app/(business)/business/[businessId]/(shell)/enquiries/add-enquiry-dialog.tsx`
- `app/(business)/business/[businessId]/(shell)/enquiries/forms-list-panel.tsx`
- `app/(business)/business/[businessId]/(shell)/enquiries/form-editor.tsx`
- `app/(business)/business/[businessId]/(shell)/enquiries/forms/new/page.tsx`
- `app/api/business/[businessId]/enquiries/route.ts`
- `app/api/business/[businessId]/enquiries/[enquiryId]/route.ts`
- `app/api/business/[businessId]/forms/route.ts`
- `app/api/business/[businessId]/forms/[formId]/route.ts`
- `app/api/webhooks/enquiries/[token]/route.ts`
- `lib/enquiries.ts`
- `lib/forms.ts`
- `lib/form-webhook.ts`
- `lib/enquiry-display.ts`
- `lib/validation/form.ts`

---

## API

Business-owner protected endpoints:

- `GET /api/business/{businessId}/enquiries`
- `POST /api/business/{businessId}/enquiries`
- `GET /api/business/{businessId}/enquiries/{enquiryId}`
- `PATCH /api/business/{businessId}/enquiries/{enquiryId}`
- `DELETE /api/business/{businessId}/enquiries/{enquiryId}`
- `GET /api/business/{businessId}/forms`
- `POST /api/business/{businessId}/forms`
- `GET /api/business/{businessId}/forms/{formId}`
- `PATCH /api/business/{businessId}/forms/{formId}`
- `DELETE /api/business/{businessId}/forms/{formId}`

Public endpoint:

- `POST /api/webhooks/enquiries/{token}`
- `OPTIONS /api/webhooks/enquiries/{token}`

---

## QA Checklist

- Create a form with required and optional fields.
- Confirm `?tab=forms` highlights the Forms tab.
- Copy the webhook URL and submit the sample JSON payload.
- Confirm invalid or extra fields are rejected.
- Add an enquiry manually from an active form.
- Filter enquiries by New, Read, and Archived.
- Open a new enquiry and confirm it becomes Read.
- Link an enquiry to an existing customer.
- Create a customer from an enquiry and confirm it is linked.
- Delete an enquiry and confirm the linked customer remains.

---

## Follow-ups

- Add rate limiting or bot protection to public webhook endpoints before broad public exposure.
- Add per-form embed snippets if customers want copy-paste website integration.
- Add notification emails or inbox events when new enquiries arrive.
