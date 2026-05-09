# Architectural Patterns

Conventions observed across multiple files in this codebase. Follow these when adding new pages, forms, or admin tooling so the new work feels consistent with what's already there.

## 1. Single Shared Supabase Client

One singleton client is created in [src/supabaseClient.js](../../src/supabaseClient.js) and imported everywhere. There is no context provider, no DI container, no React Query — components reach for `supabase` directly.

- From `src/components/Foo.jsx`: `import { supabase } from "../supabaseClient";`
- From `src/components/Auth/Foo.jsx`: `import { supabase } from "../../supabaseClient";`

When adding a component, mirror the import path depth carefully — see the explanatory comments in [src/components/Auth/CheckInPage.jsx:3-4](../../src/components/Auth/CheckInPage.jsx#L3-L4).

## 2. Per-Component Auth + Role Gating

There is **no central route guard / `<ProtectedRoute>` wrapper**. Every admin component re-runs the same gate inside its own `useEffect`:

1. `supabase.auth.getSession()` — if no session, `navigate("/login")`
2. `supabase.from("user_roles").select("role").eq("user_id", session.user.id).single()`
3. If `role !== "admin"`, redirect away (sometimes after a `signOut`)

Canonical examples:
- [src/components/AdminDashboard.jsx:33-60](../../src/components/AdminDashboard.jsx#L33-L60)
- [src/components/AdminSchedules.jsx:28-50](../../src/components/AdminSchedules.jsx#L28-L50)
- [src/components/EventsPage.jsx:35-55](../../src/components/EventsPage.jsx#L35-L55) (soft gate — sets `isAdmin` flag for conditional UI)
- [src/components/Header.jsx:14-30](../../src/components/Header.jsx#L14-L30) (also queries `user_roles` to toggle admin links)

When adding a new admin page, replicate this gate at the top of its main `useEffect`. Don't try to refactor it into a HOC unless the user asks — the duplication is intentional and consistent.

## 3. Login → Role Routing → Forced Password Change

[src/components/LoginPage.jsx:27-64](../../src/components/LoginPage.jsx#L27-L64) implements a three-step flow:

1. `signInWithPassword`
2. Read `user_roles` row (using `select("*")` defensively to survive missing columns)
3. If `requires_password_change`, redirect to `/update-password` **before** the role-based redirect.

[src/components/Auth/UpdatePassword.jsx](../../src/components/Auth/UpdatePassword.jsx) calls `supabase.auth.updateUser` then clears the `requires_password_change` flag in `user_roles`. The flag is initially set by the create-user edge function (see pattern 6).

## 4. Status Workflow: Pending → Approved / Rejected (with Remarks)

Sacrament request tables (`baptisms`, and the same model is reserved for `weddings`, `mass_intentions`, etc. as TODO tabs in [src/components/AdminDashboard.jsx:24-31](../../src/components/AdminDashboard.jsx#L24-L31)) follow this lifecycle:

- New row inserted with `status: "Pending"` from the public form modal.
- Admin Accept: `update({ status: "Approved" })` — see [src/components/AdminDashboard.jsx:70-82](../../src/components/AdminDashboard.jsx#L70-L82).
- Admin Reject: opens a modal that requires a non-empty reason, then `update({ status: "Rejected", rejection_remarks: reason })` — see [src/components/AdminDashboard.jsx:84-105](../../src/components/AdminDashboard.jsx#L84-L105).
- After the DB write, state is updated **optimistically with `setState(prev => prev.map(...))`** rather than re-fetching. New sacrament admin tabs should follow the same pattern.

Status colors throughout: yellow=Pending, green=Approved, red=Rejected.

## 5. Modal Form Submission (Sacrament Forms)

Every form in [src/components/Forms/](../../src/components/Forms/) follows the same shape — see [src/components/Forms/BaptismFormModal.jsx](../../src/components/Forms/BaptismFormModal.jsx) as the reference template:

- Single `formData` state object; one generic `handleChange` that uses `e.target.name` to update fields.
- Local `loading`, `success`, `error` flags (no global state library).
- `handleSubmit` does `supabase.from(table).insert([{ ...mapped fields }])`, sets `success`, then `setTimeout(onClose, 2500)`.
- Field naming: camelCase in component state, **snake_case at the DB column boundary** — the mapping happens explicitly inside the `insert` call (see [BaptismFormModal.jsx:42-62](../../src/components/Forms/BaptismFormModal.jsx#L42-L62)).
- Modal is always full-screen, fixed-position, `z-[100]+`, with a `bg-black/60 backdrop-blur-sm` overlay.

When adding a new sacrament form, copy this structure rather than inventing a new one.

## 6. Privileged Ops via Supabase Edge Function

Operations that require the **service-role key** (creating auth users, bulk admin actions) live in `supabase/functions/<name>/index.ts` and are invoked from the client via `supabase.functions.invoke("<name>", { body })`.

- Server: [supabase/functions/create-user/index.ts](../../supabase/functions/create-user/index.ts) — handles CORS preflight, validates input, uses `SUPABASE_SERVICE_ROLE_KEY` to call `auth.admin.createUser`, then writes role + `requires_password_change: true` to `user_roles`.
- Client: [src/components/Auth/AdminManageUsers.jsx:23-25](../../src/components/Auth/AdminManageUsers.jsx#L23-L25).
- Roles are normalized to lowercase before insertion ([create-user/index.ts:51](../../supabase/functions/create-user/index.ts#L51)).

Never put service-role keys in client code; route any new privileged op through a new edge function following this template.

## 7. QR Check-In Flow

- Admin selects an event in [src/components/AdminQRCenter.jsx](../../src/components/AdminQRCenter.jsx); [src/components/Auth/GenerateEventQR.jsx](../../src/components/Auth/GenerateEventQR.jsx) renders a QR encoding `<baseUrl>/#/check-in/:eventId`.
- The `#/` is **mandatory** — the app uses `HashRouter` so GitHub Pages can serve a single-entry SPA without server-side rewrites. Don't replace it with `BrowserRouter` unless the deploy target changes.
- Scanner (phone camera) opens [src/components/Auth/CheckInPage.jsx](../../src/components/Auth/CheckInPage.jsx). If unauthenticated → "Login Required" screen. If authed → button inserts `(user_id, event_id)` into `attendance`.
- Duplicate check-ins are caught by Postgres unique constraint (error code `23505`), surfaced as a friendly "already checked in" message — see [CheckInPage.jsx:51-54](../../src/components/Auth/CheckInPage.jsx#L51-L54). New unique-constraint flows should detect `error.code === "23505"` the same way.

## 8. Read-Side Views for Joins

When a screen needs joined data (attendance + user + event), the code queries a Postgres **VIEW** rather than doing client-side joins or `select` with relationships. Example: [src/components/AdminAttendanceList.jsx:25-30](../../src/components/AdminAttendanceList.jsx#L25-L30) reads `attendance_details`, not `attendance`.

When adding a new joined read, prefer creating a SQL view over client-side joining.

## 9. Styling Conventions

- Brand palette is repeated as Tailwind arbitrary values, not theme tokens: `[#B59E74]` (gold), `[#9c8760]` (gold hover), `[#F6F5ED]` (cream).
- Headings: `font-serif`, `uppercase`, `tracking-widest`.
- Body labels: `text-xs font-bold text-gray-500 uppercase tracking-widest`.
- Loading state across screens: a centered `animate-spin rounded-full h-12 w-12 border-b-2 border-[#B59E74]` on a cream background.
- Cards: `rounded-[2rem]` or `rounded-3xl`, `shadow-xl`, `border border-gray-100`.

Match these visual primitives when adding new screens so the parish UI stays coherent.
