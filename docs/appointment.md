# Appointments

Appointments are represented by bookings in the codebase. Each booking belongs to a business and is synced with the business owner's connected Google or Outlook calendar.

> Status: Feature-complete for the current scope.

See also: [`PROJECT.md`](./PROJECT.md), [`calendar/calendar.md`](./calendar/calendar.md), [`customer.md`](./customer.md).

---

## User Flows

### View appointments

- Route: `/business/{businessId}/bookings`
- Users see upcoming and imported appointments in the business dashboard timezone.
- The page shows which timezone is being used so users do not need to think in UTC.
- Appointment cards show customer, time, location, notes, and meeting URL when available.

### Create appointment

- A connected calendar is required before users can create appointments.
- Users must select a customer.
- Users can create a new customer inline from the appointment dialog.
- Creating an appointment writes the external calendar event first, then stores the local booking.
- Meeting URLs returned by the calendar provider are saved and displayed.

### Update appointment

- Edits to title, time, customer, location, notes, and related fields are pushed to the external calendar.
- Local booking data is updated after the provider update succeeds.
- Meeting URLs are refreshed from the provider response when available.

### Delete appointment

- Deleting/cancelling an appointment deletes the external calendar event when one exists.
- Missing external events are handled gracefully, so stale provider IDs do not block local cleanup.

### Calendar sync

- Inbound sync imports calendar events into local bookings.
- Outbound sync creates, updates, and deletes provider events from MeisterFlow changes.
- Webhooks keep Google and Outlook calendar changes flowing back into the app.

---

## Data Model

Primary model: `Booking`

Important fields:

- `businessId`: tenant scope.
- `customerId`: linked customer.
- `title`, `startsAt`, `endsAt`, `location`, `notes`.
- `meetingUrl`: Google Meet, Teams, or provider meeting link.
- `source`: manual app booking or calendar import.
- `externalProvider`: Google or Outlook.
- `externalEventId`: provider event ID.
- `status`: booking lifecycle state.

Supporting models:

- `CalendarConnection`: encrypted provider tokens and sync metadata.
- `BusinessConfig.timezone`: business timezone used for display and datetime input conversion.

---

## Main Files

- `app/(business)/business/[businessId]/(shell)/bookings/page.tsx`
- `app/(business)/business/[businessId]/(shell)/bookings/bookings-panel.tsx`
- `app/(business)/business/[businessId]/(shell)/bookings/bookings-list.tsx`
- `app/(business)/business/[businessId]/(shell)/bookings/create-booking-dialog.tsx`
- `app/(business)/business/[businessId]/(shell)/bookings/booking-detail-dialog.tsx`
- `app/api/business/[businessId]/bookings/route.ts`
- `app/api/business/[businessId]/bookings/[bookingId]/route.ts`
- `lib/bookings.ts`
- `lib/calendar/events.ts`
- `lib/calendar/event-payload.ts`
- `lib/calendar/sync.ts`
- `lib/calendar/timezone.ts`
- `lib/google-calendar/events.ts`
- `lib/google-calendar/sync.ts`
- `lib/outlook-calendar/events.ts`
- `lib/outlook-calendar/sync.ts`
- `lib/validation/booking.ts`
- `lib/datetime.ts`

---

## API

Business-owner protected endpoints:

- `GET /api/business/{businessId}/bookings`
- `POST /api/business/{businessId}/bookings`
- `GET /api/business/{businessId}/bookings/{bookingId}`
- `PATCH /api/business/{businessId}/bookings/{bookingId}`
- `DELETE /api/business/{businessId}/bookings/{bookingId}`

Calendar connection and sync endpoints:

- `POST /api/google-calendar/auth`
- `GET /api/google-calendar/callback`
- `GET /api/google-calendar/status`
- `POST /api/outlook-calendar/auth`
- `GET /api/outlook-calendar/callback`
- `GET /api/outlook-calendar/status`
- `POST /api/business/{businessId}/calendar/sync`
- `GET /api/business/{businessId}/calendar/status`
- `POST /api/business/{businessId}/calendar/disconnect`
- `POST /api/calendar/webhooks/google`
- `POST /api/calendar/webhooks/outlook`

---

## Timezone Rules

- Datetimes are stored as UTC instants in the database.
- Business UI renders datetime values in `BusinessConfig.timezone`.
- Calendar timezone is detected from the connected provider where possible.
- Google returns an IANA timezone directly.
- Outlook can return Windows timezone names; these are normalized to IANA values.
- `lib/datetime.ts` converts `datetime-local` values to UTC using the business timezone.

---

## QA Checklist

- Connect Google Calendar and confirm business timezone is detected.
- Connect Outlook Calendar and confirm Windows timezone names normalize correctly.
- Create an appointment and confirm it appears in the external calendar.
- Update title, time, location, notes, and customer and confirm the calendar event changes.
- Delete an appointment and confirm the external event is removed.
- Create or import an event with a meeting URL and confirm it appears on the card and detail dialog.
- Confirm appointment times render correctly in the business timezone.
- Confirm new appointment is blocked when no calendar is connected.
- Confirm inline customer creation works from the appointment dialog.

---

## Follow-ups

- Add a dedicated business settings UI for manually overriding timezone.
- Add conflict detection if both MeisterFlow and the calendar update the same event near-simultaneously.
- Add richer recurring-event support if customers need recurrence workflows.
