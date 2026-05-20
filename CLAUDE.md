# Church System

Parish management SPA for **San Pedro Bautista Parish** (Minore Basilica). Parishioners submit sacrament requests and check in to events via QR. Admins/priests/staff approve requests, schedule events, and track attendance. Deployed as a static SPA to GitHub Pages, backed by Supabase.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite 8 (JS, JSX) |
| Routing | `react-router-dom` v7, `HashRouter` (GitHub Pages requirement) |
| Styling | Tailwind CSS v3 + PostCSS (arbitrary values, no theme extension) |
| Backend | Supabase (Auth, PostgreSQL, Edge Functions / Deno 2) |
| Auth state | Global `AuthContext` — [src/contexts/AuthContext.jsx](src/contexts/AuthContext.jsx) |
| QR | `qrcode.react` for generation; phone camera for scanning |
| Animation | `framer-motion` v12 |
| PDF | `jsPDF` v4 |
| Email | Resend API via Supabase Edge Functions |
| Deploy | `gh-pages` → `https://lambiniciojibsonpaul-art.github.io/church-system/` |

## Project Structure

```
src/
  main.jsx                  — React entry; wraps <App> in <AuthProvider>
  App.jsx                   — HashRouter + route table (all routes)
  supabaseClient.js         — Single shared Supabase client singleton
  supabaseRest.js           — Direct REST helpers (bypasses GoTrue lock)
  emailNotifications.js     — Fire-and-forget email wrappers
  contexts/
    AuthContext.jsx          — Global session/role/isAdmin state + signIn/signOut
    useAuth.js               — Hook to consume AuthContext
  data/
    ministries.js            — Ministry list (name/icon/description) + ministryNames array
  components/
    Layout.jsx               — Persistent Header + <Outlet>
    header.jsx               — Nav, auth area, RolePill, mobile menu, logout overlay
    ChurchLandingPage.jsx    — Hero + FloatingFeatures + UpcomingEvents
    FloatingFeatures.jsx     — Floating CTA cards
    UpcomingEvents.jsx       — Next 4 events from `events` table
    AboutUsPage.jsx          — Church history/mission
    ServicesPage.jsx         — Sacrament service cards → opens request modals
    EventsPage.jsx           — Ministry event board (create + view by ministry)
    MinistriesPage.jsx       — Ministry listing cards
    GivePage.jsx             — Giving/donations page
    SignInPrompt.jsx         — Modal overlay prompting guest users to sign in
    LoginPage.jsx            — Sign-in / sign-up with role-based redirect
    RequireAdmin.jsx         — Route guard; redirects if not admin
    RequirePriest.jsx        — Route guard; redirects if not priest
    AdminDashboard.jsx       — Sacrament request tabs (accept/reject/view)
    AdminSchedules.jsx       — Event CRUD calendar
    AdminReports.jsx         — Metrics dashboard + tabbed reports + print
    AdminAttendanceList.jsx  — Live attendance viewer (queries attendance_details VIEW)
    AdminQRCenter.jsx        — QR code generator UI for events
    ManageUsers.jsx          — Create / edit / delete / list user accounts
    StaffDashboard.jsx       — Staff-facing sacrament request management
    PriestDashboard.jsx      — Priest-facing assigned requests (Pending + Schedule tabs)
    Auth/
      CheckInPage.jsx         — QR check-in (geolocation + Haversine distance + attendance insert)
      GenerateEventQR.jsx     — Printable QR code encoding check-in URL
      UpdatePassword.jsx      — Forced password change after admin account creation
      AdminManageUsers.jsx    — (Legacy; superseded by ManageUsers.jsx)
    Forms/
      BaptismFormModal.jsx          → baptisms
      ConfirmationFormModal.jsx     → confirmations
      HolyCommunionFormModal.jsx    → holy_communions
      WeddingRegistryFormModal.jsx  → weddings
      MassIntentionFormModal.jsx    → mass_intentions
      FacilitiesBookingFormModal.jsx→ facilities_bookings
      CertificationRequestFormModal.jsx → certifications
      SacramentsLiturgicalFormModal.jsx → sacraments/liturgical
      formHelpers.jsx               — Reusable: Field, SuccessPanel, ModalHeader, ErrorBanner,
                                       SubmitButton, DeclarationBlock, submitRequest()
  assets/Images/              — church1.jpg, church2.jpg, church3.jpg (imported inline)

supabase/
  config.toml                 — Local CLI config (API 54321, DB 54322, Studio 54323)
  functions/
    create-user/index.ts      — Deno: provision auth user + assign role (service-role key)
    delete-user/index.ts      — Deno: admin.deleteUser() cascade
    send-request-email/index.ts  — Deno: Resend "request received" email
    send-approval-email/index.ts — Deno: Resend "request approved" email
```

## Essential Commands

```bash
npm install        # install deps
npm run dev        # vite dev server
npm run build      # production build → dist/
npm run preview    # preview built bundle
npm run lint       # eslint .
npm run deploy     # build + push dist/ to gh-pages branch
```

Deploy edge functions:
```bash
npx supabase functions deploy create-user
npx supabase functions deploy delete-user
npx supabase functions deploy send-request-email
npx supabase functions deploy send-approval-email
```

## Environment Variables

**Frontend `.env`** (Vite exposes only `VITE_`-prefixed vars):
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

**Supabase Dashboard → Edge Function Secrets:**
```
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
RESEND_API_KEY=...          # optional; functions return {skipped:true} if absent
FROM_EMAIL=...              # e.g. "Parish Office <noreply@yourdomain.com>"
```

## Routing Map

All routes defined in [src/App.jsx](src/App.jsx):

| Path | Component | Guard |
|------|-----------|-------|
| `/` | ChurchLandingPage | — |
| `/about` | AboutUsPage | — |
| `/services` | ServicesPage | — |
| `/events` | EventsPage | — |
| `/login` | LoginPage | — |
| `/ministries` | MinistriesPage | — |
| `/give` | GivePage | — |
| `/check-in/:eventId` | CheckInPage | requires auth (inline) |
| `/update-password` | UpdatePassword | — |
| `/staff-dashboard` | StaffDashboard | role=staff (inline) |
| `/admin` | AdminDashboard | RequireAdmin |
| `/admin/schedules` | AdminSchedules | RequireAdmin |
| `/admin/reports` | AdminReports | RequireAdmin |
| `/admin/attendance-list` | AdminAttendanceList | RequireAdmin |
| `/admin/qr-generator` | AdminQRCenter | RequireAdmin |
| `/admin/manage-users` | ManageUsers | RequireAdmin |
| `/priest-dashboard` | PriestDashboard | RequirePriest |

**QR check-in URL:** `https://lambiniciojibsonpaul-art.github.io/church-system/#/check-in/{eventId}`
The `#/` prefix is mandatory (HashRouter for GitHub Pages).

## Database Tables

| Table | Key Columns | Notes |
|-------|-------------|-------|
| `user_roles` | `user_id`, `role`, `requires_password_change` | roles: admin/superadmin/priest/staff/ministry/parishioner |
| `profiles` | `id`, `first_name`, `last_name`, `email`, `contact_number` | parishioner profile data |
| `priests` | `id`, `user_id`, `name`, `is_active` | used in forms + admin dropdowns |
| `events` | `id`, `title`, `event_class`, `priest_name`, `event_date`, `event_time`, `location`, `description`, `is_inside`, `setting`, `ministry`, `latitude`, `longitude`, `status`, `creator_id` | status: Active/Cancelled |
| `attendance` | `id`, `user_id`, `event_id`, `check_in_time`, `status` | UNIQUE(user_id, event_id) enforces single check-in |
| `attendance_details` | VIEW | joins attendance + profiles + events; used by AdminAttendanceList |
| `baptisms` | `user_id`, `status`, `preferred_priest`, child/parent/sponsor fields, `rejection_remarks` | status: Pending/Approved/Rejected |
| `confirmations` | same lifecycle | — |
| `holy_communions` | same lifecycle | — |
| `weddings` | same lifecycle | — |
| `mass_intentions` | same lifecycle | — |
| `facilities_bookings` | same lifecycle | — |
| `certifications` | same lifecycle | — |

## Authentication & Role Flow

```
SignUp → email confirmation → login
Login → signInWithPassword
      → check requires_password_change → /update-password (clears flag)
      → read user_roles → cache role 7 days in localStorage (adminCache:${email})
      → navigate to role destination:
          admin/superadmin → /admin
          priest           → /priest-dashboard
          staff            → /staff-dashboard
          ministry         → /events
          parishioner      → /
```

**AuthContext** ([src/contexts/AuthContext.jsx](src/contexts/AuthContext.jsx)) manages all session state globally. Components read session/user/role/isAdmin via `useAuth()`. Role defaults to "parishioner" if no `user_roles` row exists.

**RequireAdmin / RequirePriest** wrappers in App.jsx enforce route-level role gating. Individual admin components also gate inline (legacy pattern).

## Sacrament Request Lifecycle

```
Public form submit → INSERT status="Pending" + sendRequestEmail() fire-and-forget
Admin reviews → Accept: UPDATE status="Approved" + INSERT event + sendApprovalEmail()
              → Reject: UPDATE status="Rejected" + rejection_remarks (required)
State updated optimistically (no refetch after mutation).
```

## QR Check-In Lifecycle

```
Admin: AdminQRCenter → select event → GenerateEventQR → print QR
Parishioner: scan QR → CheckInPage opens
  → auth gate (must be logged in)
  → Geolocation API (one-time permission)
  → Haversine distance check (must be ≤ 100m from event lat/lon)
  → INSERT (user_id, event_id) into attendance
  → UNIQUE constraint violation (23505) → "Already checked in"
Admin: AdminAttendanceList → SELECT attendance_details VIEW by event
```

## REST Helper Layer

[src/supabaseRest.js](src/supabaseRest.js) provides `restSelect`, `restInsert`, `restUpdate`, `restDelete` — direct fetch calls to Supabase PostgREST that read the JWT from localStorage. Used to bypass the Supabase JS SDK's GoTrue internal lock that can hang during concurrent token refreshes. Always prefer these helpers for data mutations inside form modals and auth-sensitive operations.

## Email Notifications

[src/emailNotifications.js](src/emailNotifications.js) exports `sendRequestEmail()` and `sendApprovalEmail()` — both are fire-and-forget wrappers that call the respective edge functions. Never await them in form submission paths. If `RESEND_API_KEY` is not set, edge functions return `{skipped:true}` silently.

## Roles & Permissions Matrix

| Role | Can Access |
|------|-----------|
| admin / superadmin | All `/admin/*` routes, ManageUsers, all sacrament tabs |
| priest | `/priest-dashboard` (assigned requests by preferred_priest name) |
| staff | `/staff-dashboard` (sacrament request viewing/assistance) |
| ministry | `/events` (create + view ministry events) |
| parishioner | Public pages + form modals (requires login for submission) |

## Brand / Design Tokens

- **Gold primary**: `#B59E74` / hover `#9c8760`
- **Cream background**: `#F6F5ED`
- Headings: `font-serif uppercase tracking-widest`
- Body labels: `text-xs font-bold text-gray-500 uppercase tracking-widest`
- Cards: `rounded-[2rem]` or `rounded-3xl`, `shadow-xl`, `border border-gray-100`
- Inputs: `rounded-xl p-3 border border-gray-300 focus:ring-2 focus:ring-[#B59E74]`
- Buttons: `rounded-xl font-bold py-3 px-6 tracking-widest uppercase`
- Modals: `fixed inset-0 z-[100]+`, `bg-black/60 backdrop-blur-sm`
- Loading spinner: `animate-spin rounded-full h-12 w-12 border-b-2 border-[#B59E74]` centered on cream
- Role dot colors: admin=emerald-500, priest=#B59E74, staff=sky-400, parishioner=rose-400

## Additional Documentation

| File | When to Read |
|------|-------------|
| [.claude/docs/architectural_patterns.md](.claude/docs/architectural_patterns.md) | Before adding any new page, form, admin tab, or auth flow — covers all recurring patterns |
