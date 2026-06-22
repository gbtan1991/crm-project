# Review

Reviews manage customer feedback and ratings. Businesses can request reviews from customers after bookings, track review requests, and handle review submissions.

> Status: Feature-complete for the current scope.

See also: [`PROJECT.md`](./PROJECT.md), [`customer.md`](./customer.md).

---

## User Flows

### View reviews

- Route: `/business/{businessId}/reviews`
- Reviews are listed with server-side pagination.
- Status filter supports All, REQUESTED, RECEIVED, DECLINED.
- Rows show customer, rating, content, request date, and booking reference.

### Request review

- Users request reviews from customers after completed bookings.
- Review requests include star rating selection (1-5 stars) and optional reason.
- Review requests are sent via email to customers.
- Email includes a review link with a unique token.

### Submit review

- Customers submit reviews through a public review form.
- Review form accepts star rating and optional content.
- Reviews are associated with the original booking.
- Submitted reviews are marked as RECEIVED.

### Decline review

- Customers can decline review requests.
- Declined requests are marked as DECLINED.
- Decline reason can be included.
- Declined reviews are still associated with the booking.

### Request review update

- Businesses can request updates from customers for received reviews.
- Update requests include a reason for the request.
- Customers receive an email with the update request.
- Update requests can be declined or responded to.

### View review statistics

- Businesses can view review statistics:
  - Average rating
  - Total reviews received
  - Rating distribution (1-5 stars)
  - Review count per month

---

## Data Model

Primary model: `Review`

Important fields:

- `businessId`: tenant scope.
- `customerId`: linked customer.
- `bookingId`: linked booking.
- `status`: review status (REQUESTED, RECEIVED, DECLINED).
- `rating`: star rating (1-5).
- `content`: review content/text.
- `requestedAt`: timestamp when review was requested.
- `requestReason`: reason for requesting the review (optional).
- `requestCount`: number of times review was requested.
- `respondedAt`: timestamp when review was submitted/declined.
- `createdAt`, `updatedAt`: timestamp tracking.

Supporting models:

- `Booking`: review requests are associated with bookings.
- `Customer`: review requests are linked to customers.

---

## Main Files

- `app/(business)/business/[businessId]/(shell)/reviews/page.tsx`
- `app/(business)/business/[businessId]/(shell)/reviews/reviews-panel.tsx`
- `app/(business)/business/[businessId]/(shell)/reviews/reviews-list-panel.tsx`
- `app/(business)/business/[businessId]/(shell)/reviews/review-card.tsx`
- `app/(business)/business/[businessId]/(shell)/reviews/request-review-dialog.tsx`
- `app/(business)/business/[businessId]/(shell)/reviews/request-review-update-dialog.tsx`
- `app/(business)/business/[businessId]/(shell)/reviews/review-stats-panel.tsx`
- `app/(business)/business/[businessId]/(shell)/reviews/review-detail-dialog.tsx`
- `app/api/business/[businessId]/reviews/route.ts`
- `app/api/business/[businessId]/reviews/[id]/route.ts`
- `app/review/[id]/review-form.tsx`
- `lib/reviews.ts`
- `lib/review-email-content.ts`
- `lib/messages/send-review-request-email.ts`
- `lib/validation/review.ts`

---

## API

Business-owner protected endpoints:

- `GET /api/business/{businessId}/reviews`
- `POST /api/business/{businessId}/reviews`
- `GET /api/business/{businessId}/reviews/[id]`
- `PATCH /api/business/{businessId}/reviews/[id]`
- `DELETE /api/business/{businessId}/reviews/[id]`
- `POST /api/business/{businessId}/reviews/[id]/request-update`
- `PATCH /api/business/{businessId}/reviews/[id]/decline-update`

Public endpoints:

- `POST /api/reviews/[id]/submit`
- `POST /api/reviews/[id]/decline`

---

## Review Status Workflow

1. **REQUESTED** - Review has been requested but not yet submitted
2. **RECEIVED** - Review has been submitted by the customer
3. **DECLINED** - Customer declined the review request

---

## Rating System

- Ratings are on a 1-5 star scale.
- Ratings can be null until a customer submits a review.
- Reviews with null ratings are still captured (e.g., declined reviews).

---

## Email Content

Review request emails include:

- Business name and contact information
- Booking reference (title and date)
- Star rating selection (1-5 stars)
- Optional reason for requesting the review
- Review submission link (with unique token)
- Link to decline the review request

Email templates use `{{link}}` placeholder for the review submission URL.

---

## Google Business Profile Integration

- Reviews can be integrated with Google Business Profile.
- Businesses can sync reviews from Google to MeisterFlow.
- Review status and content are synchronized.

---

## Review Update Requests

When a business requests a review update:

- The customer receives an email with the update request.
- The email includes the reason for the request.
- Customers can respond with new content or decline the request.
- Update requests are tracked with a `requestCount` field.

---

## QA Checklist

- Request a review after a booking and confirm the request appears.
- Check that the customer receives the review request email.
- Submit a review through the public review form and confirm it appears.
- Decline a review request and confirm it is marked as DECLINED.
- Request an update for a received review and confirm the customer receives the email.
- Check review statistics and confirm they show correct data.
- Filter reviews by status (REQUESTED, RECEIVED, DECLINED).
- View a review detail and confirm all information is displayed.

---

## Follow-ups

- Add review moderation and approval workflow.
- Add review responses from the business.
- Add rich media support (images, videos) in reviews.
- Add review export functionality.
- Add review scoring and analytics (e.g., sentiment analysis).
- Add review widget for embedding on the business's own website.