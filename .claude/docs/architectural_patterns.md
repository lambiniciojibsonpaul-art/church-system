# Architectural Patterns

Conventions observed across multiple files in this codebase. Follow these when adding new pages, forms, or admin tooling so the new work stays consistent.

## 1. Single Shared Supabase Client

One singleton in [src/supabaseClient.js](../../src/supabaseClient.js), imported everywhere. No context provider, no DI, no React Query.

```js
// From src/components/Foo.jsx
import { supabase } from "../supabaseClient";
// From src/components/Auth/Foo.jsx
import { supabase } from "../../supabaseClient";
```

Mirror the import path depth carefully — relative paths change one level inside `Auth/` and `Forms/`.

## 2. Global Auth State via AuthContext

[src/contexts/AuthContext.jsx](../../src/contexts/AuthContext.jsx) manages the single `onAuthStateChange` listener and exposes `{ session, user, role, isAdmin, loading, signIn, signOut, refreshRole }` to the whole tree. Consume it with `useAuth()` from [src/contexts/useAuth.js](../../src/contexts/useAuth.js).

- Role is cached 7 days in localStorage under `adminCache:${email}` to avoid repeated DB lookups.
- Falls back to `"parishioner"` if no `user_roles` row exists (never undefined/null).
- `signIn()` races SDK call against a SIGNED_IN event with a 15 s timeout.
- `signOut()` synchronously purges all Supabase localStorage keys and the role cache, then calls the SDK fire-and-forget.

**When adding a new protected page:** use `RequireAdmin` or `RequirePriest` wrappers in [src/App.jsx](../../src/App.jsx) rather than duplicating the inline gate. Existing admin components contain the old inline `useEffect` gate as a legacy pattern — don't copy it for new work.

## 3. Direct REST Helpers (GoTrue Lock Bypass)

[src/supabaseRest.js](../../src/supabaseRest.js) exposes `restSelect`, `restInsert`, `restUpdate`, `restDelete` — raw `fetch` calls to Supabase PostgREST that read the JWT directly from localStorage. Used to avoid the Supabase JS SDK's internal GoTrue lock that can deadlock during concurrent token refreshes.

All helpers accept an AbortController timeout (default 12 s). Use these instead of `supabase.from(...).insert()` inside sacrament form modals and other auth-sensitive mutation paths.

```js
import { restInsert } from "../../supabaseRest";
await restInsert("baptisms", [{ ...payload }]);
```

## 4. Login → Role Routing → Forced Password Change

[src/components/LoginPage.jsx](../../src/components/LoginPage.jsx) three-step flow:

1. `signInWithPassword`
2. Read `user_roles` row (retry once on transient failure; fall back to "parishioner")
3. If `requires_password_change` → redirect `/update-password` **before** role-based redirect

[src/components/Auth/UpdatePassword.jsx](../../src/components/Auth/UpdatePassword.jsx) calls `supabase.auth.updateUser({ password })` then clears the flag in `user_roles`. Role destinations:

```
admin/superadmin → /admin
priest           → /priest-dashboard
staff            → /staff-dashboard
ministry         → /events
parishioner      → /
```

## 5. Status Workflow: Pending → Approved / Rejected

All sacrament tables share the same lifecycle:

- Public form inserts with `status: "Pending"`.
- Admin Accept: `UPDATE status="Approved"` + optional event INSERT + `sendApprovalEmail()`.
- Admin Reject: requires non-empty reason → `UPDATE status="Rejected", rejection_remarks=reason`.
- State updated **optimistically** (`setState(prev => prev.map(...))`) — no refetch after mutation.

Status badge colors: yellow=Pending, green=Approved, red=Rejected.

## 6. Modal Form Submission (Sacrament Forms)

Reference: [src/components/Forms/BaptismFormModal.jsx](../../src/components/Forms/BaptismFormModal.jsx)

- Single `formData` state; one generic `handleChange` via `e.target.name`.
- Local `loading / success / error` flags (no global state library).
- Submit calls `submitRequest()` from [src/components/Forms/formHelpers.jsx](../../src/components/Forms/formHelpers.jsx), which calls `restInsert(table, [payload])`, fires `sendRequestEmail()`, and shows `SuccessPanel` then auto-closes after 2.5 s.
- **camelCase in state → snake_case at DB boundary** (mapping happens explicitly inside the insert payload object).
- Auth gate: check `useAuth()` at top of component; render `<SignInPrompt>` overlay if no session.
- Modal always: `fixed inset-0 z-[100]+`, `bg-black/60 backdrop-blur-sm`, full-screen.
- Every form includes `<DeclarationBlock>` (consent checkbox + signature + auto-filled date) from `formHelpers.jsx`.

Reusable helpers in `formHelpers.jsx`: `Field`, `SuccessPanel`, `ModalHeader`, `ErrorBanner`, `SubmitButton`, `DeclarationBlock`, `submitRequest()`.

When adding a new form, copy BaptismFormModal structure and swap the table name and field list.

## 7. Fire-and-Forget Email Notifications

[src/emailNotifications.js](../../src/emailNotifications.js) exports two helpers:

- `sendRequestEmail({ to, serviceName, summary })` — "We received your request"
- `sendApprovalEmail({ to, serviceName, eventDate, eventTime, location, priestName })` — "Your request has been approved"

Both are `void` calls — never `await` them in form submission paths. If `RESEND_API_KEY` is absent from the edge function environment, the function returns `{ skipped: true }` (safe no-op). Edge functions are `send-request-email` and `send-approval-email` in `supabase/functions/`.

## 8. Privileged Ops via Edge Functions

Operations needing the service-role key live in `supabase/functions/<name>/index.ts` (Deno 2) and are called from the client via `supabase.functions.invoke("<name>", { body })`.

| Function | Purpose | Called from |
|----------|---------|-------------|
| `create-user` | `auth.admin.createUser` + upsert role + set `requires_password_change` | ManageUsers.jsx |
| `delete-user` | `auth.admin.deleteUser` cascade | ManageUsers.jsx |
| `send-request-email` | Resend "received" email | emailNotifications.js |
| `send-approval-email` | Resend "approved" email | emailNotifications.js |

Never put service-role keys in client code. Route all new privileged operations through a new edge function following `create-user/index.ts` as template (CORS preflight, input validation, service-role client).

## 9. QR Check-In Flow

1. Admin: `AdminQRCenter` → selects event → renders `GenerateEventQR` → print.
2. QR encodes: `${baseUrl}/#/check-in/${eventId}`. The `#/` is mandatory (HashRouter).
3. Scanner opens `CheckInPage` → auth gate → Geolocation API → Haversine distance ≤ 100 m → `INSERT (user_id, event_id) INTO attendance`.
4. Unique constraint `(user_id, event_id)` catches duplicates → error code `23505` → friendly "Already checked in" message.

For new flows that rely on unique DB constraints as business-logic guards, detect `error.code === "23505"` the same way.

## 10. Read-Side Views for Joins

When a screen needs joined data, query a Postgres **VIEW** rather than doing client-side joins. Example: `AdminAttendanceList` reads `attendance_details` VIEW (attendance + profiles + events join) — not the raw `attendance` table.

When adding a new screen that needs joined data: create a SQL VIEW, query it from the component.

## 11. Styling Conventions

Brand palette used as Tailwind arbitrary values (not theme tokens):

```
[#B59E74]   gold primary
[#9c8760]   gold hover
[#F6F5ED]   cream background
```

- Headings: `font-serif uppercase tracking-widest`
- Labels: `text-xs font-bold text-gray-500 uppercase tracking-widest`
- Loading spinner: `animate-spin rounded-full h-12 w-12 border-b-2 border-[#B59E74]` centered on cream
- Cards: `rounded-[2rem]` or `rounded-3xl shadow-xl border border-gray-100`
- Role dots: admin=`bg-emerald-500`, priest=`bg-[#B59E74]`, staff=`bg-sky-400`, parishioner=`bg-rose-400`

Match these primitives when adding new screens.

## 12. HashRouter & GitHub Pages

The app uses `HashRouter` so GitHub Pages can serve a static SPA without server-side rewrites. All navigation uses hash-prefixed paths (`/#/path`). **Do not replace HashRouter with BrowserRouter** unless the deploy target changes to a host that supports SPA rewrites. The homepage in `package.json` must match the GitHub Pages subdirectory (`/church-system/`).
