# Church System - Complete Architecture & Technical Overview

## Executive Summary

**San Pedro Bautista Parish Management System** is a web-based SPA (Single Page Application) for managing sacrament requests, event scheduling, and attendance tracking. Parishioners submit requests online (baptisms, weddings, confirmations, mass intentions, etc.), admins approve and schedule them as events, and the community checks in via QR codes. The app is fully static (no server rendering) and deployed to GitHub Pages with a Supabase backend for authentication, database, and server-side operations.

---

## I. ARCHITECTURE OVERVIEW

### High-Level Flow

```
┌─────────────────────────────────────────┐
│  GitHub Pages (Static SPA)              │
│  - React 19 + Vite 8 (HashRouter)       │
│  - Deployed to gh-pages branch          │
│  - https://...github.io/church-system/  │
└─────────────────────────────────────────┘
           ↓ HTTP REST + RLS ↓
┌─────────────────────────────────────────┐
│  Supabase Backend                       │
│  ├─ Auth (JWT sessions)                 │
│  ├─ PostgreSQL (Row-Level Security)     │
│  ├─ Deno Edge Functions (privileged ops) │
│  └─ REST API (@supabase/supabase-js)    │
└─────────────────────────────────────────┘
```

### Deployment Target

- **Static Host**: GitHub Pages at `/church-system/` path
- **Backend**: Supabase Cloud (managed PostgreSQL + Auth service)
- **Environment**: Client-side `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from `.env`
- **Client Library**: `@supabase/supabase-js` v2.100.0

---

## II. FRONTEND ARCHITECTURE

### Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Framework** | React | 19.2.4 | UI rendering & state management |
| **Build Tool** | Vite | 8.0.0 | Fast dev server & production bundling |
| **Routing** | react-router-dom | 7.13.1 | SPA navigation (HashRouter for GitHub Pages) |
| **Styling** | Tailwind CSS 3 + PostCSS | 3.4.19 | Utility-first CSS framework |
| **Backend Client** | @supabase/supabase-js | 2.100.0 | Auth, DB queries, edge function calls |
| **QR Codes** | qrcode.react | 4.2.0 | Generate QR for check-in URLs |
| **Animation** | framer-motion | 12.36.0 | Smooth transitions & motion UI |
| **Linting** | ESLint | 9.39.4 | Code quality & consistency |

### Project Structure

```
src/
├── App.jsx                          # Central route configuration (HashRouter)
├── main.jsx                         # React entry point
├── supabaseClient.js               # Singleton Supabase client (all imports go here)
├── supabaseRest.js                 # REST helper functions (direct SQL alternatives)
├── emailNotifications.js            # Email trigger helpers
├── index.css                        # Global styles
├── contexts/
│   ├── AuthContext.jsx             # Auth provider (not enforced; used for UI hints)
│   └── useAuth.js                  # Hook to access auth context
├── components/
│   ├── ChurchLandingPage.jsx        # Public home page
│   ├── AboutUsPage.jsx              # About parish
│   ├── ServicesPage.jsx             # Services overview
│   ├── EventsPage.jsx               # Public event listing (soft admin gate)
│   ├── MinistriesPage.jsx           # Ministries directory
│   ├── GivePage.jsx                 # Donations/giving
│   ├── LoginPage.jsx                # Auth entry (role-based redirect)
│   ├── Header.jsx                   # Persistent top nav (role-aware link toggle)
│   ├── Layout.jsx                   # Outlet wrapper for all routes
│   ├── RequireAdmin.jsx             # Wrapper for admin-only routes (hard gate)
│   ├── RequirePriest.jsx            # Wrapper for priest-only routes (hard gate)
│   ├── AdminDashboard.jsx           # Sacrament request approval hub (Baptisms, Weddings, etc.)
│   ├── AdminSchedules.jsx           # Event creation & editing (by admins)
│   ├── AdminAttendanceList.jsx      # Attendance report (joined view)
│   ├── AdminQRCenter.jsx            # QR generation for events
│   ├── AdminReports.jsx             # Parish statistics & trends
│   ├── PriestDashboard.jsx          # Priest-specific view (TODO)
│   ├── Auth/
│   │   ├── CheckInPage.jsx          # QR scanner entry point (auth gate)
│   │   ├── GenerateEventQR.jsx      # QR code display (for admin copy/print)
│   │   ├── AdminManageUsers.jsx     # User provisioning (calls create-user edge function)
│   │   └── UpdatePassword.jsx       # Forced password change flow
│   └── Forms/
│       ├── BaptismFormModal.jsx      # Baptism request form (template model for all)
│       ├── ConfirmationFormModal.jsx # Confirmation request form
│       ├── HolyCommunionFormModal.jsx# Holy Communion request form
│       ├── WeddingRegistryFormModal.jsx # Wedding request form
│       ├── MassIntentionFormModal.jsx    # Mass Intention request form
│       ├── SacramentsLiturgicalFormModal.jsx # Other sacraments form
│       ├── CertificationRequestFormModal.jsx # Certification request form
│       ├── FacilitiesBookingFormModal.jsx    # Facilities booking form
│       └── formHelpers.jsx           # Shared UI components (DeclarationBlock, SuccessPanel)
└── assets/Images/                   # Static parish imagery (imported as modules)
```

### Routing Map

All routes use **HashRouter** (`/#/path`) for GitHub Pages static hosting:

#### Public Routes (No Auth Required)
- `/` — Church landing page
- `/about` — About the parish
- `/services` — Services offered
- `/events` — Upcoming events (soft gate: shows admin actions if logged-in as admin)
- `/ministries` — Parish ministries
- `/give` — Donation/giving portal
- `/login` — Authentication entry

#### QR Check-In (Special)
- `/check-in/:eventId` — QR scanner page (component handles its own login gate)

#### Admin Routes (Hard-Gated by `<RequireAdmin>`)
- `/admin` — Sacrament request approval dashboard (Baptisms, Weddings, etc.)
- `/admin/schedules` — Create & manage events
- `/admin/manage-users` — Provision parish staff/admins
- `/admin/reports` — Attendance & parish statistics
- `/admin/attendance-list` — Detailed attendance report
- `/admin/qr-generator` — QR generation interface

#### Priest Routes (Hard-Gated by `<RequirePriest>`)
- `/priest-dashboard` — Priest-specific dashboard (TODO)

#### Auth Security (Special)
- `/update-password` — Forced password change (role flag cleared after completion)

### Key Frontend Patterns

#### 1. **Single Shared Supabase Client**
All components import from one singleton:
```javascript
import { supabase } from "../supabaseClient";
```
No context provider, no dependency injection—direct client usage throughout.

#### 2. **Per-Component Auth + Role Gating**
Every admin page duplicates the same auth check:
```javascript
useEffect(() => {
  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) navigate("/login");
    
    const { data: user_role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .single();
    
    if (user_role.role !== "admin") navigate("/");
  };
  checkAuth();
}, []);
```
Intentional duplication ensures consistency across admin pages.

#### 3. **Login → Role Routing → Forced Password Change**
[LoginPage.jsx](src/components/LoginPage.jsx) orchestrates:
1. User signs in with email/password
2. Query `user_roles` table to determine role
3. If `requires_password_change: true`, redirect to `/update-password`
4. Otherwise, redirect by role (admin → `/admin`, priest → `/priest-dashboard`)

The `requires_password_change` flag is set by the `create-user` edge function and cleared after `/update-password` completes.

#### 4. **Sacrament Request Forms (Modal Pattern)**
All forms in `src/components/Forms/` follow the **BaptismFormModal template**:
- Single `formData` state object with all fields
- Generic `handleChange` handler using `e.target.name`
- Local `loading`, `success`, `error` flags
- On submit: map camelCase form state → snake_case DB columns
- Call `supabase.from(table).insert([{ ...mapped payload }])`
- Display success message, auto-close after 2.5s

Example payload mapping:
```javascript
const payload = {
  baptism_type: formData.baptismType,           // camelCase → snake_case
  child_first_name: formData.childFirstName,
  preferred_date: formData.preferredDate,
  // ...
  user_id: user.id,
  submitter_email: user.email
};
await supabase.from("baptisms").insert([payload]);
```

#### 5. **QR Check-In Flow**
1. Admin generates QR in `/admin/qr-generator` → opens [GenerateEventQR.jsx](src/components/Auth/GenerateEventQR.jsx)
2. QR encodes: `<baseUrl>/#/check-in/:eventId`
3. Scanner opens [CheckInPage.jsx](src/components/Auth/CheckInPage.jsx)
4. If not authenticated → "Login Required" prompt
5. If authenticated + event exists → Check-in button inserts `(user_id, event_id)` into `attendance` table
6. Duplicate check-in caught by Postgres unique constraint → friendly error message

#### 6. **Optimistic Sacrament Status Updates**
When admin approves/rejects a sacrament request:
- Admin clicks button → modal for reason (reject) or direct approval
- Call `supabase.from(table).update({ status, rejection_remarks })` → **immediate state update**
- No re-fetch; state is updated optimistically: `setState(prev => prev.map(r => r.id === id ? {...r, status} : r))`
- Status colors: yellow (Pending), green (Approved), red (Rejected)

#### 7. **Styling Conventions**
- **Brand Palette**:
  - Primary Gold: `#B59E74` (accent) / hover `#9c8760`
  - Background Cream: `#F6F5ED`
  - Used as Tailwind arbitrary values: `bg-[#F6F5ED]`, `text-[#B59E74]`
- **Headings**: `font-serif`, `uppercase`, `tracking-widest`
- **Body Labels**: `text-xs font-bold text-gray-500 uppercase tracking-widest`
- **Loading Spinner**: `animate-spin rounded-full h-12 w-12 border-b-2 border-[#B59E74]` on cream background
- **Cards**: `rounded-[2rem]`, `shadow-xl`, `border border-gray-100`
- **Modals**: Full-screen, fixed position, `z-[100]+`, `bg-black/60 backdrop-blur-sm` overlay

---

## III. BACKEND ARCHITECTURE (SUPABASE)

### What is Supabase?

Supabase is an open-source Firebase alternative providing:
- **Auth**: JWT-based authentication (email/password, OAuth, passwordless)
- **PostgreSQL**: Fully managed relational database with Row-Level Security (RLS)
- **REST API**: Auto-generated REST endpoints for all tables
- **Deno Edge Functions**: Serverless compute for privileged operations
- **Real-Time**: Optional WebSocket subscriptions (not used in this app)

### Supabase Client Initialization

[src/supabaseClient.js](src/supabaseClient.js):
```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

**Key Points**:
- Uses **anon key** (limited permissions via RLS policies)
- Environment variables loaded from `.env` at build time (Vite `VITE_` prefix required)
- Single instance shared across all components

### Edge Functions (Serverless)

Edge functions are Deno scripts deployed to Supabase that run server-side with the **service-role key** (unrestricted). The client invokes them via HTTP.

#### Function 1: `create-user` — User Provisioning

**Path**: [supabase/functions/create-user/index.ts](supabase/functions/create-user/index.ts)

**Purpose**: Create new Supabase auth users and assign roles (admins only).

**Why?**: Creating auth users requires the `service-role key`, which must never be exposed to the client.

**HTTP Signature**:
```
POST https://<project-ref>.supabase.co/functions/v1/create-user
Body: { email, password, role }
```

**Implementation**:
1. Validate CORS preflight (`OPTIONS` request)
2. Parse JSON body → extract email, password, role
3. Load `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from environment
4. Create service-role Supabase client
5. Call `auth.admin.createUser()` → returns new user `id`
6. Upsert row into `user_roles` table with role (normalized to lowercase)
7. Return success or error JSON

**Client Call** ([AdminManageUsers.jsx](src/components/Auth/AdminManageUsers.jsx)):
```javascript
const { data, error } = await supabase.functions.invoke('create-user', {
  body: { email, password, role }
});
if (error) throw error;
// User created + role assigned
```

#### Function 2: `send-approval-email` — Approval Notification

**Path**: [supabase/functions/send-approval-email/index.ts](supabase/functions/send-approval-email/index.ts)

**Purpose**: Send email to parishioner when their sacrament request is approved.

**Why?**: Sending emails requires API credentials (SendGrid, AWS SES, etc.) that must be server-side.

**Implementation**:
- Called via `supabase.functions.invoke()` from admin dashboard
- Receives approved request details (child name, event date, priest name, etc.)
- Sends templated HTML email to parishioner
- Returns status

#### Function 3: `send-request-email` — Request Confirmation

**Path**: [supabase/functions/send-request-email/index.ts](supabase/functions/send-request-email/index.ts)

**Purpose**: Send confirmation email to parishioner after they submit a sacrament request.

**Implementation**:
- Called from BaptismFormModal (and other form modals)
- Sends templated HTML email with request summary
- Parishioner can reference this email for follow-up

---

## IV. DATABASE SCHEMA (POSTGRESQL)

### Core Tables

#### `auth.users` (Built-in Supabase)
Managed by Supabase. Stores email, password hash, email verification status.

**Relevant Columns**:
- `id` (UUID) — Primary key
- `email` (text) — User email
- `encrypted_password` (text) — Hashed password
- `email_confirmed_at` (timestamp) — When email was verified
- `created_at` (timestamp)

#### `user_roles` — Role Assignment + Password Change Flag
Maps auth users to roles and tracks forced password changes.

**Columns**:
- `user_id` (UUID, PK, FK auth.users.id)
- `role` (text) — One of: `admin`, `priest`, `minister`, `staff`, `parishioner`
- `requires_password_change` (boolean, default false) — Set by create-user; cleared by UpdatePassword.jsx
- `created_at` (timestamp, default now())

**RLS Policies**:
- Admins can read/write all rows
- Users can read their own row
- Public: cannot read

**Insertion**: Created by `create-user` edge function or auto-trigger when auth user is created

---

### Sacrament Request Tables

Each sacrament type has its own table following the pattern:

#### `baptisms` — Baptism Requests
Stores baptism request data submitted via [BaptismFormModal.jsx](src/components/Forms/BaptismFormModal.jsx).

**Columns**:
- `id` (UUID, PK, default uuid_generate_v4())
- `user_id` (UUID, FK auth.users.id) — Who submitted
- `status` (text, default 'Pending') — One of: Pending, Approved, Rejected
- `rejection_remarks` (text) — If rejected, why?
- `baptism_type` (text) — Sunday, Weekday, Private, etc.
- `preferred_date` (date)
- `child_first_name`, `child_middle_name`, `child_last_name` (text)
- `child_dob` (date)
- `child_birthplace` (text)
- `child_gender` (text)
- `father_name`, `mother_maiden_name` (text)
- `address` (text)
- `contact_numbers` (text)
- `parents_marriage_status` (text) — Married in Church, Civil, Other
- `godfather_name`, `godmother_name` (text)
- `additional_sponsors` (text)
- `submitter_name`, `submitter_email` (text) — Contact info for admin follow-up
- `declaration_consent` (boolean) — Did parishioner accept terms?
- `created_at` (timestamp, default now())
- `updated_at` (timestamp, default now())

**RLS Policies**:
- Admins can read/update all rows
- Users can read only their own rows
- Public: cannot read

#### `holy_communions`, `confirmations`, `weddings`, `mass_intentions` (Same Pattern)
Each follows the baptisms schema with request-specific fields:
- `holy_communions`: `child_first_name`, `date_of_communion`, `time_of_communion`
- `confirmations`: `child_first_name`, `date_of_confirmation`, `time_of_confirmation`
- `weddings`: `groom_first_name`, `bride_first_name`, `wedding_date`, `groom_contact`, `bride_contact`
- `mass_intentions`: `intention_type`, `mass_date`, `intention_donor_name`

---

### Event Management Tables

#### `events` — Scheduled Sacraments & Mass Events
Created by admins when they approve sacrament requests. Also used for standalone mass schedules, vigils, etc.

**Columns**:
- `id` (UUID, PK, default uuid_generate_v4())
- `creator_id` (UUID, FK auth.users.id) — Admin who created
- `title` (text) — Event name (e.g., "Baptism — John Doe")
- `event_class` (text) — Baptism, Wedding, Confirmation, Holy Communion, Mass, etc.
- `event_date` (date)
- `event_time` (time)
- `location` (text) — Main Altar, Chapel, Parish Hall, etc.
- `priest_name` (text) — Which priest will officiate
- `description` (text) — Event details
- `is_inside` (boolean) — Indoor vs outdoor event
- `created_at` (timestamp, default now())
- `updated_at` (timestamp, default now())

**RLS Policies**:
- Admins can read/create/update/delete all events
- Public: can read only approved, future events
- Used for public `/events` page

---

### Attendance Tables

#### `attendance` — Check-In Records
Records when a parishioner checks in to an event via QR.

**Columns**:
- `user_id` (UUID, FK auth.users.id)
- `event_id` (UUID, FK events.id)
- `checked_in_at` (timestamp, default now())
- **Unique Constraint**: `(user_id, event_id)` — One check-in per user per event

**RLS Policies**:
- Admins can read all attendance
- Users can read their own attendance
- Users can insert their own check-in (if authenticated)

#### `attendance_details` — Read-Side VIEW
Denormalized view joining `attendance`, `auth.users`, and `events` for admin reporting.

**Columns** (joined from three tables):
- User info: `user_id`, `email`, (user display name if stored)
- Event info: `event_id`, `title`, `event_date`, `event_time`, `location`, `priest_name`
- Attendance: `checked_in_at`

**RLS Policies**: Admins can read; public cannot

**Used By**: [AdminAttendanceList.jsx](src/components/AdminAttendanceList.jsx)

---

### Other Tables (Mentioned in Code, May Be TODO)

- `certifications` — Certification requests (tab in admin dashboard)
- `facilities_bookings` — Parish hall rental requests (tab in admin dashboard)

---

### Row-Level Security (RLS) Strategy

Every table has Supabase RLS policies that enforce access control **at the database level**, not in application code:

**Pattern for Sacrament Tables**:
```sql
-- Admins can read all
CREATE POLICY "admin_read_all" ON baptisms
  FOR SELECT USING (
    (SELECT role FROM user_roles WHERE user_id = auth.uid()) = 'admin'
  );

-- Submitters can read their own
CREATE POLICY "user_read_own" ON baptisms
  FOR SELECT USING (user_id = auth.uid());

-- Only admins can update (status, remarks)
CREATE POLICY "admin_update" ON baptisms
  FOR UPDATE USING (
    (SELECT role FROM user_roles WHERE user_id = auth.uid()) = 'admin'
  );
```

This ensures:
- If a hacker steals the client anon key, they cannot query rows that aren't theirs
- Admin pages fail gracefully if someone forges a JWT with parishioner role

---

## V. WORKFLOW FLOWS

### 1. Parishioner Submits Sacrament Request

**Actors**: Parishioner, Frontend, Supabase Database

**Steps**:

1. Parishioner clicks "Request Baptism" on public page
2. [BaptismFormModal.jsx](src/components/Forms/BaptismFormModal.jsx) mounts
3. If not logged in → [SignInPrompt.jsx](src/components/SignInPrompt.jsx) shown (sign up or login required)
4. Parishioner fills form: child name, preferred date, parent info, etc.
5. Parishioner reads + checks declaration checkbox (legal consent)
6. Click "Submit"
7. Form maps camelCase state → snake_case DB columns:
   ```javascript
   const payload = {
     baptism_type: formData.baptismType,
     child_first_name: formData.childFirstName,
     // ... 20+ fields
     user_id: user.id,
     submitter_email: user.email,
     declaration_consent: true
   };
   ```
8. `supabase.from("baptisms").insert([payload])` → row created with `status: "Pending"`
9. Trigger [emailNotifications.js](src/emailNotifications.js) → `sendRequestEmail()` → edge function `send-request-email` → Parishioner receives confirmation email
10. Form displays "✓ Success! We'll review your request soon."
11. Modal auto-closes after 2.5s

**Database Result**:
- New `baptisms` row with all details, `status: "Pending"`, `user_id` set, `created_at` = now

---

### 2. Admin Approves Sacrament Request

**Actors**: Admin, [AdminDashboard.jsx](src/components/AdminDashboard.jsx), Supabase

**Steps**:

1. Admin logs in → redirected to `/admin`
2. [AdminDashboard.jsx](src/components/AdminDashboard.jsx) loads pending requests from `baptisms` table
3. Admin clicks "Accept" button on a pending baptism request
4. Modal opens asking for:
   - Priest name (dropdown: "Priest 1", "Priest 2", "Priest 3")
5. Admin selects priest → clicks "Confirm"
6. Approval triggers two operations **atomically**:
   - **Update sacrament row**:
     ```javascript
     supabase.from("baptisms").update({
       status: "Approved",
       priest_name: selectedPriest
     }).eq("id", requestId);
     ```
   - **Create event row** in `events` table:
     ```javascript
     supabase.from("events").insert([{
       creator_id: adminUserId,
       title: "Baptism — John Doe",
       event_class: "Baptism",
       priest_name: selectedPriest,
       event_date: originalRequest.preferred_date,
       event_time: "10:00",
       location: "Main Altar",
       description: "Baptism ceremony...",
       is_inside: true
     }]);
     ```
7. State updates **optimistically** (no refetch):
   ```javascript
   setBaptisms(prev => prev.map(r => 
     r.id === requestId ? {...r, status: "Approved"} : r
   ));
   ```
8. Trigger email → edge function `send-approval-email` → Parishioner receives "Your baptism is approved for [date]"
9. Admin dashboard refreshes pending list

**Database Result**:
- `baptisms` row: `status: "Approved"`
- New `events` row created with event details

---

### 3. Admin Rejects Sacrament Request

**Actors**: Admin, [AdminDashboard.jsx](src/components/AdminDashboard.jsx), Supabase

**Steps**:

1. Admin clicks "Reject" button on pending request
2. Modal opens with textarea: "Why are you rejecting this?"
3. Admin types reason (e.g., "Documentation incomplete")
4. Admin clicks "Confirm Rejection"
5. Validation: reason cannot be empty
6. Database update:
   ```javascript
   supabase.from("baptisms").update({
     status: "Rejected",
     rejection_remarks: "Documentation incomplete"
   }).eq("id", requestId);
   ```
7. State updates optimistically:
   ```javascript
   setBaptisms(prev => prev.map(r => 
     r.id === requestId ? {...r, status: "Rejected"} : r
   ));
   ```
8. Email sent (optional) to parishioner with rejection reason
9. Request no longer appears in "Pending" tab (appears in "Rejected" tab)

**Database Result**:
- `baptisms` row: `status: "Rejected"`, `rejection_remarks: "Documentation incomplete"`

---

### 4. Admin Creates Event (Manual or From Sacrament)

**Actors**: Admin, [AdminSchedules.jsx](src/components/AdminSchedules.jsx), Supabase

**Steps**:

1. Admin navigates to `/admin/schedules`
2. [AdminSchedules.jsx](src/components/AdminSchedules.jsx) loads existing events and displays form
3. Admin fills form:
   - Event title (e.g., "Sunday Mass")
   - Event class (Mass, Vigil, Prayer Group, etc.)
   - Date, time, location, priest, description
   - Indoor/outdoor toggle
4. Admin clicks "Create Event"
5. Insert into `events`:
   ```javascript
   supabase.from("events").insert([{
     creator_id: adminId,
     title: "Sunday Mass",
     event_class: "Mass",
     event_date: selectedDate,
     event_time: "09:00",
     location: "Main Church",
     priest_name: "Priest 1",
     description: "Weekly Sunday celebration",
     is_inside: true
   }]);
   ```
6. New event appears in list; admin can edit or delete it

**Database Result**:
- New `events` row

---

### 5. Parishioner Checks In to Event via QR

**Actors**: Parishioner, [GenerateEventQR.jsx](src/components/Auth/GenerateEventQR.jsx), [CheckInPage.jsx](src/components/Auth/CheckInPage.jsx), Supabase

**Steps**:

1. Admin navigates to `/admin/qr-generator`
2. Selects an event (e.g., "Baptism — John Doe")
3. [GenerateEventQR.jsx](src/components/Auth/GenerateEventQR.jsx) generates QR code encoding:
   ```
   https://...github.io/church-system/#/check-in/event-uuid-here
   ```
4. Admin prints or displays QR code
5. Parishioner scans with phone camera → opens [CheckInPage.jsx](src/components/Auth/CheckInPage.jsx)
6. If not logged in → "Login Required" prompt + button to go to `/login`
7. If logged in → Page displays event details + "Check In" button
8. Parishioner clicks "Check In"
9. Insert into `attendance`:
   ```javascript
   const { error } = await supabase
     .from("attendance")
     .insert([{ user_id: userId, event_id: eventId }]);
   ```
10. **Error handling**:
    - If `error.code === "23505"` (unique constraint) → "You've already checked in to this event"
    - Otherwise → "Check-in successful! Thank you for attending."
11. Button disabled after successful check-in

**Database Result**:
- New `attendance` row with `(user_id, event_id)` and `checked_in_at = now()`

---

### 6. User Forced Password Change (First Login)

**Actors**: New user, [LoginPage.jsx](src/components/LoginPage.jsx), [UpdatePassword.jsx](src/components/Auth/UpdatePassword.jsx), Supabase

**Steps**:

1. Admin provisions new user via `/admin/manage-users` → `create-user` edge function
2. Edge function sets `requires_password_change: true` in `user_roles`
3. User receives temporary password (via email or in-person)
4. User logs in with email + temporary password via [LoginPage.jsx](src/components/LoginPage.jsx)
5. Login flow:
   ```javascript
   const { data, error } = await supabase.auth.signInWithPassword({
     email, password
   });
   const { data: roleData } = await supabase
     .from("user_roles")
     .select("*")
     .eq("user_id", data.user.id)
     .single();
   
   if (roleData.requires_password_change) {
     navigate("/update-password");  // Force password change
   } else if (roleData.role === "admin") {
     navigate("/admin");
   } else if (roleData.role === "priest") {
     navigate("/priest-dashboard");
   }
   ```
6. User redirected to `/update-password`
7. [UpdatePassword.jsx](src/components/Auth/UpdatePassword.jsx) displays form:
   - Current password (temporary one)
   - New password
   - Confirm new password
8. User fills form and clicks "Update Password"
9. Call `supabase.auth.updateUser({ password: newPassword })`
10. Then update `user_roles`:
    ```javascript
    supabase.from("user_roles").update({
      requires_password_change: false
    }).eq("user_id", userId);
    ```
11. User redirected to role-appropriate dashboard (`/admin` or `/priest-dashboard`)

**Database Result**:
- `auth.users`: password hash updated
- `user_roles`: `requires_password_change: false`

---

## VI. DEPLOYMENT & DEVOPS

### Frontend Deployment (GitHub Pages)

**Process**:

1. Local development:
   ```bash
   npm install      # Install dependencies
   npm run dev      # Start Vite dev server at http://localhost:5173/
   npm run lint     # ESLint check
   ```

2. Production build:
   ```bash
   npm run build    # Vite builds → dist/ folder
                    # Output is a static SPA with index.html as entry point
   ```

3. Deploy to GitHub Pages:
   ```bash
   npm run deploy   # Runs `predeploy` (build) + `gh-pages -d dist`
                    # Pushes dist/ contents to gh-pages branch
                    # Live at: https://lambiniciojibsonpaul-art.github.io/church-system/
   ```

**Key Configuration**:
- [vite.config.js](vite.config.js): `base: '/church-system/'` — tells Vite assets live under `/church-system/` path
- [package.json](package.json): `homepage: "https://lambiniciojibsonpaul-art.github.io/church-system/"`
- All routing uses `HashRouter` (`/#/path`) for static hosting (no server-side rewrites needed)

### Backend Deployment (Supabase Cloud)

**Setup**:

1. Create Supabase project at https://supabase.com/dashboard
2. Copy `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from project settings
3. Create `.env` file in project root:
   ```
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGc...
   ```

**Edge Functions Deployment**:

```bash
# Set environment variables for the edge function
export SUPABASE_AUTH_TOKEN=<your-project-token>
export SUPABASE_DB_PASSWORD=<db-password>

# Deploy create-user function
npx supabase functions deploy create-user \
  --project-ref <your-project-ref> \
  --no-verify

# Function is now live at:
# https://<project-ref>.supabase.co/functions/v1/create-user
```

**Environment Variables** (set in Supabase Dashboard → Functions → Settings):
- `SUPABASE_URL` — Supabase URL (e.g., `https://your-project.supabase.co`)
- `SUPABASE_SERVICE_ROLE_KEY` — Service role key (never expose to client)
- Email API credentials (SendGrid API key, AWS SES, etc.) if using email functions

---

## VII. SECURITY ARCHITECTURE

### Authentication (JWT-Based)

1. User signs up or admin creates account
2. Supabase Auth issues JWT token (stored in browser localStorage)
3. Every API request includes JWT in `Authorization: Bearer <token>` header
4. Supabase server validates JWT signature → extracts `sub` (user ID)
5. RLS policies check user role/permissions at database level

### Authorization (Role-Based Access Control + RLS)

**Roles**:
- `admin` — Full system access
- `priest` — Priest-specific dashboard (limited)
- `minister` — Coordinator role (reserved)
- `staff` — Parish staff (reserved)
- `parishioner` — Public user (default)

**Enforcement**:
- Frontend: Per-component `useEffect` checks role before rendering admin UI
- Backend: RLS policies enforce role checks at SQL level
- Edge functions: Use service-role key (unrestricted) only for privileged ops, validate input

### API Key Management

**Client-Side (Anon Key)**:
- Low-privileged public/parishioner access
- Limited by RLS policies
- Safe to expose in client code (embedded in `package.json`)

**Server-Side (Service-Role Key)**:
- **NEVER** exposed to client
- Only used in edge functions (server-side Deno runtime)
- Used for: Creating auth users, sending emails, admin bulk operations

### Data Privacy

- Email addresses: Accessible only to self + admins
- Sacrament requests: Only submitter + admins can read details
- Attendance: Only event attendees + admins can read
- Row-Level Security (RLS) enforced at database level (not just application code)

---

## VIII. MONITORING & DEBUGGING

### Development

**Vite Dev Server** (`npm run dev`):
- Hot Module Replacement (HMR) — changes live-reload instantly
- Dev tools in browser console
- Vite preview server for local testing

**ESLint** (`npm run lint`):
- Checks code quality, unused variables, undefined functions
- Flat config in [eslint.config.js](eslint.config.js)

**Supabase Studio**:
- Access at https://supabase.com/dashboard
- Browse tables, edit data directly
- View RLS policies, logs
- Monitor function invocations

### Production Debugging

**Error Tracking**:
- Browser console errors visible to developers
- Supabase edge function logs in dashboard (Logs tab)
- GitHub Pages access logs in repository

**Database Queries**:
- Supabase Query Performance tab shows slow queries
- Check RLS policy logs if permissions denied

---

## IX. COMPONENT INTERACTION DIAGRAM

```
┌─────────────────────────────────────────────────────────────────┐
│                      App.jsx (Routes)                           │
├─────────────────────────────────────────────────────────────────┤
│                      Layout.jsx (Outlet)                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Header.jsx (Persistent Nav)               │   │
│  │  - Displays user role + admin links (conditionally)    │   │
│  │  - Queries user_roles for role display                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │            Page Component (Route)                        │   │
│  │                                                          │   │
│  │  PUBLIC PAGES:                                          │   │
│  │  ├─ ChurchLandingPage.jsx                              │   │
│  │  ├─ EventsPage.jsx (soft admin gate)                  │   │
│  │  ├─ LoginPage.jsx                                      │   │
│  │  ├─ MinistriesPage.jsx                                │   │
│  │  │                                                     │   │
│  │  ADMIN PAGES (gated by RequireAdmin):                 │   │
│  │  ├─ AdminDashboard.jsx                                │   │
│  │  │  ├─ Tabs: Baptisms, Weddings, Confirmations, etc. │   │
│  │  │  ├─ Accept / Reject buttons                        │   │
│  │  │  │  └─ Approve modal (select priest)              │   │
│  │  │  │  └─ Updates baptisms.status → "Approved"       │   │
│  │  │  │  └─ Inserts event row                          │   │
│  │  │  │  └─ Sends approval email                       │   │
│  │  │  └─ Reject modal (enter remarks)                  │   │
│  │  │     └─ Updates baptisms.status → "Rejected"       │   │
│  │  ├─ AdminSchedules.jsx                                │   │
│  │  │  └─ Create / edit events                           │   │
│  │  ├─ AdminAttendanceList.jsx                           │   │
│  │  │  └─ Queries attendance_details VIEW                │   │
│  │  ├─ AdminQRCenter.jsx                                 │   │
│  │  │  └─ Select event → GenerateEventQR.jsx             │   │
│  │  │     └─ Display QR encoding /#/check-in/:eventId    │   │
│  │  ├─ AdminManageUsers.jsx                              │   │
│  │  │  └─ Email + password form                          │   │
│  │  │     └─ Calls create-user edge function             │   │
│  │  │     └─ User provisioned with role                  │   │
│  │  │     └─ requires_password_change: true              │   │
│  │  │                                                     │   │
│  │  SPECIAL ROUTES:                                      │   │
│  │  ├─ CheckInPage.jsx (/#/check-in/:eventId)            │   │
│  │  │  ├─ Scanned from QR (phone camera)                │   │
│  │  │  ├─ Auth gate (login required)                     │   │
│  │  │  └─ Inserts attendance(user_id, event_id)          │   │
│  │  ├─ UpdatePassword.jsx (forced password change)       │   │
│  │  │  └─ Updates auth.users password                    │   │
│  │  │  └─ Clears requires_password_change flag           │   │
│  │  │                                                     │   │
│  │  MODALS (triggered from various pages):               │   │
│  │  ├─ BaptismFormModal.jsx                              │   │
│  │  ├─ WeddingRegistryFormModal.jsx                      │   │
│  │  ├─ ConfirmationFormModal.jsx                         │   │
│  │  ├─ HolyCommunionFormModal.jsx                        │   │
│  │  ├─ MassIntentionFormModal.jsx                        │   │
│  │  └─ [SacramentsLiturgical/Certification/Facilities]  │   │
│  │     └─ All follow BaptismFormModal pattern             │   │
│  │     └─ Fill form → submit → insert to DB              │   │
│  │     └─ Send confirmation email                        │   │
│  │     └─ Auto-close after 2.5s                          │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## X. SUMMARY TABLE

| Aspect | Technology | Purpose | Status |
|--------|-----------|---------|--------|
| **Frontend Framework** | React 19 | UI rendering | Active |
| **Build Tool** | Vite 8 | Dev & production builds | Active |
| **Routing** | react-router-dom 7 + HashRouter | SPA navigation for GitHub Pages | Active |
| **Styling** | Tailwind CSS 3 + PostCSS | Utility CSS framework | Active |
| **Backend DB** | Supabase PostgreSQL | User data, requests, events, attendance | Active |
| **Auth** | Supabase Auth (JWT) | Email/password + role-based access | Active |
| **Serverless Compute** | Supabase Deno Edge Functions | User provisioning, email sending | Active |
| **Client Library** | @supabase/supabase-js 2.100 | Query builder + auth SDK | Active |
| **QR Generation** | qrcode.react 4.2 | Generate check-in QR codes | Active |
| **Animation** | framer-motion 12.36 | Smooth UI transitions | Active |
| **Linting** | ESLint 9.39 | Code quality checks | Active |
| **Deployment (Frontend)** | GitHub Pages | Static SPA hosting | Active |
| **Deployment (Backend)** | Supabase Cloud | Managed DB + Auth + Functions | Active |

---

## XI. QUICK REFERENCE

### Key Files at a Glance

| File | Purpose |
|------|---------|
| [src/App.jsx](src/App.jsx) | Central route configuration |
| [src/supabaseClient.js](src/supabaseClient.js) | Singleton Supabase client |
| [src/components/LoginPage.jsx](src/components/LoginPage.jsx) | Auth entry + role-based redirect |
| [src/components/AdminDashboard.jsx](src/components/AdminDashboard.jsx) | Request approval hub |
| [src/components/Forms/BaptismFormModal.jsx](src/components/Forms/BaptismFormModal.jsx) | Sacrament request form template |
| [src/components/Auth/CheckInPage.jsx](src/components/Auth/CheckInPage.jsx) | QR check-in page |
| [src/components/Auth/GenerateEventQR.jsx](src/components/Auth/GenerateEventQR.jsx) | QR code generator |
| [supabase/functions/create-user/index.ts](supabase/functions/create-user/index.ts) | User provisioning edge function |
| [supabase/functions/send-approval-email/index.ts](supabase/functions/send-approval-email/index.ts) | Approval notification |
| [supabase/functions/send-request-email/index.ts](supabase/functions/send-request-email/index.ts) | Request confirmation email |
| [tailwind.config.js](tailwind.config.js) | Brand palette & theme config |
| [vite.config.js](vite.config.js) | Base path for GitHub Pages |

### Common Commands

```bash
# Development
npm install                    # Install dependencies
npm run dev                    # Start dev server (http://localhost:5173/)
npm run lint                   # Run ESLint

# Production
npm run build                  # Build to dist/
npm run preview               # Preview production build locally
npm run deploy                # Build + push to gh-pages branch

# Supabase
npx supabase functions deploy create-user --project-ref <ref>  # Deploy edge function
npx supabase db pull          # Pull remote schema locally (if using local Supabase)
```

---

**Document Version**: 1.0 | **Last Updated**: May 2026 | **System**: Church Parish Management (San Pedro Bautista)

