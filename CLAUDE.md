# Church System

A parish management web app for **San Pedro Bautista Parish**. Parishioners submit sacrament requests (baptisms, weddings, mass intentions, etc.) and check in to events via QR. Admins approve requests, schedule events, and track attendance. Deployed as a static SPA to GitHub Pages, backed by Supabase.

## Tech Stack

- **Frontend**: React 19 + Vite 8 (JS, JSX) — see [package.json](package.json)
- **Routing**: `react-router-dom` v7 with `HashRouter` (required for GitHub Pages) — see [src/App.jsx](src/App.jsx)
- **Styling**: Tailwind CSS v3 + PostCSS — see [tailwind.config.js](tailwind.config.js)
- **Backend**: Supabase (Auth, Postgres, Edge Functions) — client at [src/supabaseClient.js](src/supabaseClient.js)
- **QR**: `qrcode.react` for generation; phone camera for scanning
- **Animation**: `framer-motion`
- **Lint**: ESLint flat config — [eslint.config.js](eslint.config.js)
- **Deploy**: `gh-pages` to `https://lambiniciojibsonpaul-art.github.io/church-system/`

## Project Structure

- [src/App.jsx](src/App.jsx) — central route table (public, admin, auth-security routes)
- [src/main.jsx](src/main.jsx) — React entry
- [src/supabaseClient.js](src/supabaseClient.js) — single shared Supabase client (uses `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`)
- [src/components/](src/components/) — public pages, admin pages, shared `Header.jsx`
  - [src/components/Auth/](src/components/Auth/) — auth-gated flows: `CheckInPage`, `AdminManageUsers`, `UpdatePassword`, `GenerateEventQR`
  - [src/components/Forms/](src/components/Forms/) — sacrament request modals (Baptism, Confirmation, Holy Communion, Wedding, Mass Intention, Sacraments/Liturgical)
- [src/assets/Images/](src/assets/Images/) — static imagery imported into components
- [supabase/](supabase/) — Supabase project config and edge functions
  - [supabase/functions/create-user/index.ts](supabase/functions/create-user/index.ts) — Deno edge function; uses service-role key to provision users + assign roles
  - [supabase/config.toml](supabase/config.toml) — local Supabase CLI config

## Essential Commands

```bash
npm install        # install deps
npm run dev        # vite dev server
npm run build      # production build → dist/
npm run preview    # preview built bundle
npm run lint       # eslint .
npm run deploy     # build + push dist/ to gh-pages branch
```

Supabase edge functions are deployed via the Supabase CLI (`npx supabase functions deploy create-user`). Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as function env vars in the Supabase dashboard.

## Environment

Required in `.env` (Vite exposes only `VITE_`-prefixed vars to the client):

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Database Tables (referenced in code)

- `user_roles` — `user_id`, `role` (admin / priest / minister / staff / parishioner), `requires_password_change` flag
- `events` — `id`, `title`, `event_date`, `event_time`, `location`, `priest_name`, `event_class`, `description`, `is_inside`
- `attendance` — `user_id`, `event_id` (unique constraint enforces single check-in)
- `attendance_details` — VIEW joining `attendance` to user/event details (read-side)
- Sacrament tables: `baptisms` (others reserved as TODO tabs in admin dashboard) — each has `status` ∈ {Pending, Approved, Rejected} and `rejection_remarks`

## Routing Map

Public, admin, and auth-security routes are all in [src/App.jsx](src/App.jsx). QR check-in URL format: `<baseUrl>/#/check-in/:eventId` — generated in [src/components/Auth/GenerateEventQR.jsx:7-8](src/components/Auth/GenerateEventQR.jsx#L7-L8).

## Brand / Design Tokens

- Primary: `#B59E74` (gold) / hover `#9c8760`
- Background: `#F6F5ED` (cream)
- Typography: serif headings (uppercase, wide tracking), sans-serif body, italic gray subtitles

## Additional Documentation

Check these when the work touches the noted area:

- [.claude/docs/architectural_patterns.md](.claude/docs/architectural_patterns.md) — recurring patterns: client-side role gating, Supabase mutation+optimistic-update flow, modal forms, edge function for privileged ops, HashRouter rationale, status workflows.
