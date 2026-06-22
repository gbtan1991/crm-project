# MeisterFlow CRM — Project Overview

Multi-tenant booking, automation & invoicing platform. Each **business** (tenant) logs into its own isolated workspace to manage customers, bookings, invoices, and automated email sequences. A platform **admin** manages businesses and their subscriptions.

> This document is the source of truth for scope, architecture, and decisions. It reconciles the original [SOW](#appendix-deviations-from-the-sow) with the choices we've made since.

---

## 1. Tech Stack

| Concern        | Choice                                  | Notes                                                                 |
| -------------- | --------------------------------------- | --------------------------------------------------------------------- |
| Framework      | Next.js 16 (App Router, full-stack)     | Frontend + backend (route handlers / server actions).                 |
| Hosting        | **Docker** (self-hosted)                | Not Vercel. See `docs/docker/docker.md`.                              |
| Database       | **Self-hosted PostgreSQL 16.6** (Docker)| Not Supabase. Image `postgres:16.6-alpine`.                          |
| ORM            | Prisma 7 (`prisma-client`, rust-free)   | Driver adapter `@prisma/adapter-pg`. Client in `lib/generated/prisma`. |
| Auth           | **NextAuth / Auth.js** — email/password | Credentials provider, hashed passwords. No Supabase Auth.            |
| Scheduling     | **In-app cron scheduler**               | Boots from `instrumentation.ts`. Not Vercel Cron, not `pg_cron`.     |
| Queue / Cache  | **None** (no Redis)                     | The DB-backed cron table handles scheduling.                          |
| Email          | Resend                                  | White-labeled per business sending domain (e.g. `info@toproofer.com`).|
| Calendar       | Google Calendar / Outlook               | Per-business, 2-way event sync.                                       |
| UI reference   | Base44 React app                        | Design reference for the Next.js rebuild.                             |

---

## 2. Tenancy & Roles

Multi-tenancy here means: **multiple isolated business accounts**, administered centrally.

- **`ADMIN`** — platform user (us / FusionSync). Not tied to a business. Creates businesses and manages their subscriptions. This is **not** a self-serve SaaS; there is no public sign-up.
- **`BUSINESS`** — a user who **owns** one or more `Business` tenants. Sees and manages only their own business data.

A user can own **many** businesses (`Business.ownerId → User`); each business has exactly one owner. The signed-in business user's **active** business (their oldest, for now) provides the session `businessId`; all tenant-scoped data carries a `businessId`, and every business-side query is filtered by it. Admins can operate across businesses. *(A future `BusinessMember` join table can layer team/staff access onto this ownership model.)*

---

## 3. Authentication & Routing

### Login-only root
- `/` (root) is a **login page only** — no marketing/landing, no registration.
- Auth via NextAuth Credentials (email + password; passwords stored hashed, e.g. bcrypt/argon2).

### Post-login redirect by role
- `ADMIN` → `/admin/dashboard` under route group `app/(admin)`.
- `BUSINESS` → `/business/dashboard` under route group `app/(business)`.

### Route group layout
```
app/
  page.tsx              # login (root, public)
  auth/redirect/        # role-based post-login redirect
  (admin)/              # ADMIN-only; layout guards role === ADMIN
    admin/
      dashboard/
      businesses/       # create/manage businesses + subscriptions
  (business)/           # BUSINESS-only; layout guards role === BUSINESS
    business/
      dashboard/
      customers/
      bookings/
      invoices/
      sequences/
```
- Each route group's layout enforces the role and (for business) tenant scoping.
- Authenticated users hitting `/` are redirected to the right dashboard.
- The nested `admin/` and `business/` path segments avoid route conflicts because route group names do not appear in URLs.

---

## 4. Data Model

Already implemented: `User`, `Role`, `Business`, `BusinessConfig`, `Subscription`, `SubscriptionPlan`, and `SubscriptionStatus`. The rest below is the planned domain schema, built out across milestones. All tenant data is scoped by `businessId`.

### Identity & tenancy
- **`User`** — `id`, `email` (unique), `name?`, `password` (hashed), `role` (`ADMIN` | `BUSINESS`), `businesses` (the businesses they own), timestamps.
- **`Business`** (tenant) — `id`, `name`, `slug` (unique), `ownerId` (→ `User`, `onDelete: Cascade`), timestamps. Relations: one owner `User`, one `BusinessConfig`, one `Subscription`, plus all domain data.
- **`BusinessConfig`** (1:1 with `Business`) — per-business settings: calendar provider + connection tokens (Google/Outlook), Resend sending domain & verification status, timezone, booking-link settings, branding.
- **`Subscription`** (1:1 with `Business`) — `plan` (`SubscriptionPlan`, default `BASIC`), `status` (e.g. `ACTIVE`), timestamps. **Admin-managed** — no billing/self-serve flow.

### Enums
- **`Role`** — `ADMIN`, `BUSINESS` *(implemented)*
- **`SubscriptionPlan`** — `BASIC` (default; room for more tiers later)
- **`SubscriptionStatus`** — `ACTIVE` (extensible: `PAUSED`, `CANCELED`)

### Domain (built in milestones)
- **`Customer`** (opportunity) — belongs to a `Business`; created automatically (on booking) or manually. Tracks the full journey.
- **`CustomerEvent`** — journey events per customer: invoice sent, job started, job ended, etc.
- **`Booking`** — appointment record; synced 2-way with the business calendar; booking triggers the relevant automation sequence.
- **`Invoice`** — templated (e.g. website service, API service), price editable at send time; sending triggers the invoice sequence.
- **`SequenceTemplate` / `SequenceStep`** — reusable, per-business templates for booking-reminder and invoice-follow-up sequences (email channel; architecture allows more channels later).
- **`SequenceEnrollment`** — a customer's progress through a sequence (which step, next send time).
- **`CronJob`** + **`CronJobType`** — drives scheduled processing (see below).

---

## 5. Cron / Automation Scheduler

Adopted from the FusionSync AI in-app scheduler pattern (referenced from `fusionsyncai/lib/cron/`). **This replaces Vercel Cron and `pg_cron`** — no external scheduler, no extra Postgres extensions, so we keep `postgres:16.6-alpine`.

### How it works
- **`instrumentation.ts`** runs once on Node server boot and calls `startCronScheduler()` (only when `NEXT_RUNTIME === "nodejs"`).
- **`lib/cron/scheduler.ts`** runs a `setInterval` tick (~15s) calling `runDueCronJobs()`, with an in-process `ticking` guard so slow ticks don't overlap.
- **`lib/cron/jobs.ts`** — finds enabled, not-running, due jobs (`nextRunAt <= now`), **atomically claims** each (`updateMany` flips `isRunning false→true`) so a job can't run twice, executes its handler, records `lastStatus`/`lastResult`/`lastError`, reschedules `nextRunAt`, and reclaims stale runs (crash recovery).
- **`lib/cron/registry.ts`** — maps each `CronJobType` to a handler returning `{ skipped?, summary }`. Add a job type: extend the enum + add a handler; scheduler/API/UI work off this map.

### `CronJob` table (shape)
`id`, `name`, `type` (`CronJobType`), `enabled`, `intervalSeconds`, `nextRunAt?`, `lastRunAt?`, `lastStatus?`, `lastResult? (Json)`, `lastError?`, `isRunning`, `runStartedAt?`, timestamps. Indexed on `(enabled, nextRunAt)`.

### Planned job types for this project
- `PROCESS_SEQUENCES` — advance due sequence enrollments and send the next email via Resend.
- (others as needed, e.g. calendar resync, cleanup.)

> Note: jobs run **inside the app container**. With a single app instance the DB-level claim is sufficient; if we ever scale to multiple instances, the atomic claim still prevents double-execution.

---

## 6. Core Feature Summary (from SOW)

- **Multi-tenant** isolated business workspaces.
- **Calendar integration** — Google/Outlook per business, 2-way event sync. See [`calendar/calendar.md`](./calendar/calendar.md).
- **Booking system** — tracks appointments; auto-starts the booking-reminder sequence. See [`appointment.md`](./appointment.md).
- **Automation sequences** — email channel, scheduled via the cron scheduler; booking reminders & invoice follow-ups.
- **Bookkeeping & invoicing** — templated invoices, editable price at send; sending triggers the invoice sequence.
- **Customer / opportunity tracking** — auto (on booking), enquiry-linked, CSV import, or manual. See [`customer.md`](./customer.md).
- **Enquiries** — forms, public webhooks, status workflow, and customer conversion/linking. See [`enquiry.md`](./enquiry.md).
- **Reusable templates** — customizable per business.
- **White-labeled email** — Resend from each business's own domain.

---

## 7. Milestones (from SOW)

| Milestone | Scope                                                                                                                                  | Timeline   |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| **M1**    | Multi-tenant foundation: auth & per-business isolation, Google/Outlook 2-way sync, customer & opportunity model, Resend white-labeling. | Days 1–5   |
| **M2**    | Booking system + appointment tracking, automation sequence engine (email via cron), customer journey/event tracking, reusable templates. | Days 6–10  |
| **M3**    | Invoice creation (templated, editable price), invoice sequences, full docs/SOPs/setup videos, live client onboarding, handoff.          | Days 11–14 |

---

## Appendix: Deviations from the SOW

The signed SOW specified a Vercel + Supabase stack. Confirmed changes:

| Area      | SOW                          | Now                                             | Reason                          |
| --------- | ---------------------------- | ----------------------------------------------- | ------------------------------- |
| Hosting   | Vercel                       | Docker (self-hosted)                            | Client preference.              |
| Database  | Supabase Postgres            | Self-hosted Postgres 16.6 (Docker)              | No Supabase.                    |
| Auth      | (Supabase-implied)           | NextAuth credentials (email/password)           | No Supabase.                    |
| Scheduler | Vercel Cron                  | In-app cron scheduler (DB-backed)               | Off Vercel; FusionSync pattern. |
| Cache     | Vercel Redis                 | None                                            | Not needed for current scope.   |
