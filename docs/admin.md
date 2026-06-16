# Admin

The admin area is the platform-owner control panel (role `ADMIN`). Admins manage tenant **businesses** and their **subscriptions**. This is **not** self-serve: there is no public sign-up, and admins provision every business.

> **Status:** Admin side is feature-complete for the current scope — dashboard analytics, business management (create / update / delete), and user management (create admin or business owner, delete) with server-side pagination. Next up: the business-side app.

See also: [`PROJECT.md`](./PROJECT.md) for the overall architecture and [`docker/docker.md`](./docker/docker.md) for running the stack.

---

## Access & Authentication

- Auth is handled by NextAuth (Credentials, email + password, JWT sessions). See `auth.ts`.
- The session carries `role` and `businessId` (see `types/next-auth.d.ts`).
- **User ↔ Business model**: a `User` can own **many** businesses (`Business.ownerId → User`, `onDelete: Cascade`); each business has exactly one owner. For business users, the session's `businessId` is their **oldest** owned business ("active" business; a switcher comes later).
- Login happens at `/`. After login, users are routed by role via `/auth/redirect`:
  - `ADMIN` → `/admin/dashboard`
  - `BUSINESS` → `/business/dashboard`
  - Helper: `getDashboardPath()` in `lib/auth/redirects.ts`.

### Two layers of protection

1. **Page guard** — `app/(admin)/admin/layout.tsx` runs `auth()` on the server and redirects non-admins away. Everything under the `(admin)` route group is protected.
2. **API guard** — `requireAdmin()` in `lib/auth/guards.ts` is called by every admin route handler. It throws a typed `ApiAuthError` (401 if unauthenticated, 403 if not an admin), which handlers map to a JSON error response.

---

## Bootstrapping the first admin

Admins are created from the CLI (no UI for it), reading credentials from the environment.

```bash
# .env
ADMIN_EMAIL=you@example.com
ADMIN_PASSWORD=at-least-8-chars
# ADMIN_NAME=Admin   # optional

npm run create-admin
```

- Script: `scripts/create-admin.ts` (run via `tsx`).
- Idempotent: re-running updates the existing user's password and forces `role = ADMIN`.
- The password is hashed with `bcryptjs` (cost 12).

---

## Routes & files

```
app/
  (admin)/
    admin/
      layout.tsx          # role guard + shell (AdminNav)
      admin-nav.tsx        # top nav: Dashboard / Businesses / Users + sign out
      table-pagination.tsx # shared pager for admin tables
      dashboard/
        page.tsx           # analytics (cards + chart)
        businesses-chart.tsx
      businesses/
        page.tsx           # businesses table (paginated)
        add-business-dialog.tsx
        business-row-actions.tsx
      users/
        page.tsx           # users table (paginated)
        add-user-dialog.tsx   # tabbed Business / Admin create dialog
        user-row-actions.tsx
  api/
    admin/
      businesses/
        route.ts           # GET (list), POST (create)
        [id]/route.ts      # PATCH (update), DELETE
      users/
        route.ts           # POST (create ADMIN or BUSINESS user)
        [id]/route.ts      # DELETE
lib/
  auth/guards.ts           # requireAdmin(), ApiAuthError
  businesses.ts            # data layer (stats, list, create, update, delete)
  pagination.ts            # page-size constants + helpers
  validation/business.ts   # business zod schemas + plan/status constants
  validation/user.ts       # createUserSchema (discriminated ADMIN/BUSINESS)
```

URLs: `/admin/dashboard`, `/admin/businesses`, `/admin/users`. (The `(admin)` route group is organizational and does not appear in the URL; the nested `admin/` segment provides the path.) The businesses and users tables are server-paginated via a `?page=` query param (`lib/pagination.ts` + `table-pagination.tsx`).

---

## Pages

### Dashboard (`/admin/dashboard`)

Simple platform analytics:

- **Stat cards** (shadcn `Card`): total businesses, total business users, active subscriptions.
- **Chart** (recharts `BarChart`, themed with `--chart-1`): new businesses per month over the trailing 6 months.

Data comes from `getAdminDashboardStats()`, which also buckets business creation dates into the last 6 calendar months (`bucketByMonth`).

### Businesses (`/admin/businesses`)

- **Table** (shadcn `Table`) of all businesses: name + slug, owner email, plan badge, status badge, created date, and a row actions menu. Shows an empty state when there are none.
- **Add business** button (top-right) → dialog.
- **Row actions** (3-dot `DropdownMenu`): Update and Delete.

Data comes from `listBusinessesForAdmin()` (paginated).

### Users (`/admin/users`)

- **Table** of all users (admins and business owners): name, email, role badge, businesses (label like `Acme +2 more`), created date, and a row actions menu.
- **Add user** button (top-right) → tabbed dialog (see below).
- **Row actions**: Delete (disabled for your own account; deleting an owner also cascades their businesses).

Data comes from `listUsersForAdmin()` (paginated).

---

## Business operations

### Create (`POST /api/admin/businesses`)

Triggered by the **Add business** dialog (`add-business-dialog.tsx`). Collects: business name, owner name, owner email, temporary password.

`createBusiness()` provisions the whole tenant in one step:

- A `Business` with an auto-generated **unique slug** (slugified name, numeric suffix on collision).
- Its `BusinessConfig` (defaults).
- Its `Subscription` (defaults to `BASIC` / `ACTIVE`).
- The first `BUSINESS` user, with a bcrypt-hashed password.

Rejects (409) if a user with that email already exists.

### Update (`PATCH /api/admin/businesses/[id]`)

Triggered by the **Update** action (`business-row-actions.tsx`). Editable fields: business name, owner email, plan, status.

`updateBusiness()` runs a transaction that updates the business name, upserts the subscription (plan + status), and updates the owner user's email. Rejects (409) if the new email belongs to another user, (404) if the business is missing.

### Delete (`DELETE /api/admin/businesses/[id]`)

Triggered by the **Delete** action with an `AlertDialog` confirmation. `deleteBusiness()` deletes the business; its `BusinessConfig` and `Subscription` are removed automatically via `onDelete: Cascade`. The **owner user is kept** (they may own other businesses).

---

## User operations

### Create (`POST /api/admin/users`)

Triggered by the **Add user** dialog (`add-user-dialog.tsx`), which has shadcn `Tabs` at the top — **Business** (default) and **Admin** — and one underlying form keyed by the active tab.

- **Business**: business name, owner name, email, temporary password → `createBusiness()` (same provisioning path as Add business: business + config + subscription + a `BUSINESS` owner user).
- **Admin**: name, email, temporary password → `createAdmin()` (a standalone `ADMIN` user, no business).

The route validates with `createUserSchema` (a zod `discriminatedUnion` on `role`) and rejects (409) if the email already exists.

### Delete (`DELETE /api/admin/users/[id]`)

Triggered by the **Delete** row action. `deleteUser()` guards against deleting your own account and the last remaining admin. Deleting a business owner cascades their owned businesses.

---

## Validation

`lib/validation/business.ts` (zod):

- `createBusinessSchema` — name, ownerName, ownerEmail (lowercased), ownerPassword (min 8).
- `updateBusinessSchema` — name, ownerEmail, plan, status.
- `SUBSCRIPTION_PLANS` / `SUBSCRIPTION_STATUSES` — plain string-literal arrays used by both the zod enums and the client `Select` inputs.

> These constants mirror the Prisma `SubscriptionPlan` / `SubscriptionStatus` enums. They are duplicated as plain literals so the file stays safe to import from client components (no generated-client import). **When you add a plan/status to the Prisma enum, update these arrays too.**

`lib/validation/user.ts` (zod):

- `createUserSchema` — a `discriminatedUnion` on `role`. `ADMIN` requires name, email, password; `BUSINESS` additionally requires `businessName`.

---

## UI components

shadcn/ui (new-york) components added as TSX under `components/ui/`, themed by the ported Base44 design tokens (see `app/globals.css`):

`button`, `input`, `label`, `card`, `table`, `dialog`, `badge`, `dropdown-menu`, `alert-dialog`, `select`, `tabs`, `sonner`.

Toasts use `sonner`; the `<Toaster />` is mounted in the root `app/layout.tsx`. Mutations show success/error toasts and call `router.refresh()` to revalidate the server-rendered list.

---

## Extending the admin

- **New admin page**: add a folder under `app/(admin)/admin/<name>/page.tsx` and a link in `admin-nav.tsx`. The layout guard covers it automatically.
- **New admin API**: create a route handler and call `await requireAdmin()` at the top; map `ApiAuthError` to a response (copy the pattern in `app/api/admin/businesses/route.ts`).
- **New tenant fields**: extend the Prisma schema, run `npx prisma generate && npx prisma db push`, then update the zod schemas, data layer, and dialogs.
