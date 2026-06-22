# Website

Website ticket management helps businesses track and resolve issues related to their own website. Businesses can create tickets, upload screenshots, and track progress through a structured workflow.

> Status: Feature-complete for the current scope.

See also: [`PROJECT.md`](./PROJECT.md).

---

## User Flows

### View website tickets

- Route: `/business/{businessId}/website`
- The page shows a website overview (domain, hosting, analytics) and a list of tickets.
- Tickets are displayed in card format with type, priority, status, title, and creation date.
- Only pending tickets can be edited or deleted.

### Create website ticket

- Users create tickets from the Tickets tab.
- Required fields: type, priority, title, description.
- Optional: image attachments (max 5MB, JPEG/PNG/GIF/WebP).
- Image files are sanitized, renamed with UUIDs, and stored in `/uploads/website-tickets/`.

### Update website ticket

- Users can update pending tickets.
- Editable fields: title, description, priority.
- Cannot update completed or rejected tickets.
- Status transitions: PENDING → IN_PROGRESS → NEEDS_INFO → DONE/REJECTED.

### Delete website ticket

- Users can delete pending tickets only.
- Completed or rejected tickets cannot be deleted.
- Deletion removes the ticket record and its attachments.

### View website overview

- The overview section shows website configuration status:
  - Domain configuration
  - Hosting access
  - Google Analytics integration
  - Google Search Console integration

---

## Data Model

Primary model: `WebsiteTicket`

Important fields:

- `businessId`: tenant scope.
- `type`: ticket type (UI_CHANGE, BUG, CONTENT, SEO, OTHER).
- `priority`: ticket priority (LOW, MEDIUM, HIGH).
- `status`: ticket status (PENDING, IN_PROGRESS, NEEDS_INFO, DONE, REJECTED).
- `title`: ticket title.
- `description`: detailed description.
- `createdAt`, `updatedAt`: timestamp tracking.

Supporting model:

- `WebsiteTicketAttachment`: stores uploaded images with sanitized filenames and UUIDs.

---

## Main Files

- `app/(business)/business/[businessId]/(shell)/website/website-panel.tsx`
- `app/(business)/business/[businessId]/(shell)/website/website-overview.tsx`
- `app/(business)/business/[businessId]/(shell)/website/tickets-tab.tsx`
- `app/(business)/business/[businessId]/(shell)/website/tickets-list-panel.tsx`
- `app/(business)/business/[businessId]/(shell)/website/ticket-card.tsx`
- `app/(business)/business/[businessId]/(shell)/website/create-ticket-dialog.tsx`
- `app/(business)/business/[businessId]/(shell)/website/update-ticket-dialog.tsx`
- `app/(business)/business/[businessId]/(shell)/website/website-ticket-row-actions.tsx`
- `app/api/business/[businessId]/website-tickets/route.ts`
- `app/api/business/[businessId]/website-tickets/[id]/route.ts`
- `app/api/business/[businessId]/website-tickets/[id]/attachments/[attachmentId]/route.ts`
- `lib/website-tickets.ts`
- `lib/validation/website-ticket.ts`

---

## API

Business-owner protected endpoints:

- `GET /api/business/{businessId}/website-tickets`
- `POST /api/business/{businessId}/website-tickets`
- `PATCH /api/business/{businessId}/website-tickets/[id]`
- `DELETE /api/business/{businessId}/website-tickets/[id]`
- `GET /api/business/{businessId}/website-tickets/[id]/attachments/[attachmentId]`

---

## Ticket Types

- `UI_CHANGE`: Design or UI-related requests
- `BUG`: Functional bugs or errors
- `CONTENT`: Content updates or additions
- `SEO`: Search engine optimization tasks
- `OTHER`: Unclassified or miscellaneous requests

---

## Ticket Priorities

- `LOW`: Low priority, can be addressed when convenient
- `MEDIUM`: Medium priority, requires attention
- `HIGH`: High priority, urgent attention required

---

## Ticket Status Workflow

1. **PENDING** - Initial status when ticket is created
2. **IN_PROGRESS** - Ticket is being worked on
3. **NEEDS_INFO** - Additional information is required from the requester
4. **DONE** - Ticket is completed and resolved
5. **REJECTED** - Ticket was rejected (e.g., duplicate or invalid request)

---

## File Uploads

- Maximum file size: 5MB per attachment
- Supported formats: JPEG, PNG, GIF, WebP
- Files are sanitized to remove special characters
- Filenames are renamed with UUIDs to prevent conflicts
- Storage location: `/uploads/website-tickets/`

---

## QA Checklist

- Create a ticket with all fields and confirm it appears in the list.
- Attach an image to a ticket and confirm it is displayed and accessible.
- Update a pending ticket and confirm changes are saved.
- Try to update a completed ticket and confirm it is blocked.
- Delete a pending ticket and confirm it is removed.
- Try to delete a completed ticket and confirm it is blocked.
- Create tickets of different types and priorities and confirm they are displayed correctly.
- Check the website overview and confirm it shows correct status.

---

## Follow-ups

- Add bulk ticket creation for common issues.
- Add ticket tagging or categorization for better filtering.
- Add notification emails when tickets are updated or completed.
- Add ability to assign tickets to specific team members.