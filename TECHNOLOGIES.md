# Technologies to Be Used

The proposed system, **Web-Based Church Management System with QR Attendance Tracking for the Minor Basilica of San Pedro Bautista**, is developed using a modern, cloud-native technology stack to ensure reliability, scalability, accessibility, and centralized management of parish operations. The system consolidates event scheduling, QR attendance tracking, sacrament request management, ministry account management, and administrative reporting into a single, responsive web platform.

---

## Frontend Framework — React 19 and Vite 8

The frontend interface of the system is built with **React 19**, a component-based JavaScript library developed by Meta for building interactive user interfaces. React's declarative model allows each section of the application—such as dashboards, modals, forms, and tables—to be developed as independent, reusable components. This significantly improves maintainability and enables consistent behavior across all user-facing modules.

The application is bundled and served using **Vite 8**, a next-generation build tool designed for fast development and optimized production builds. Vite provides near-instant hot module replacement during development and generates highly optimized static assets for deployment. The entire system is delivered as a **Single-Page Application (SPA)**, meaning all navigation occurs client-side without full page reloads, resulting in a faster and more fluid user experience.

---

## Routing — React Router DOM v7 with HashRouter

Client-side navigation is handled by **React Router DOM v7**, the standard routing library for React applications. Because the system is deployed to **GitHub Pages**, which does not support server-side URL rewriting, **HashRouter** is used. HashRouter encodes the active route in the URL's hash fragment (e.g., `#/admin`, `#/priest-dashboard`), ensuring all routes resolve correctly on a static file host without requiring server configuration.

Route-level access control is enforced through dedicated guard components (`RequireAdmin`, `RequirePriest`) that redirect unauthorized users before the protected page renders.

---

## Styling — Tailwind CSS v3

The user interface is styled using **Tailwind CSS v3**, a utility-first CSS framework that enables rapid, consistent styling directly in markup without writing custom CSS files. Tailwind's approach eliminates naming conflicts and unused styles while enforcing a coherent design language throughout the application. The system's brand tokens—gold primary (`#B59E74`), cream background (`#F6F5ED`), card rounding, and typography styles—are applied uniformly across all components using Tailwind's utility classes and arbitrary value support.

**PostCSS** and **Autoprefixer** are included as build-time tools to process Tailwind's directives and ensure cross-browser CSS compatibility.

---

## Backend-as-a-Service — Supabase

All backend functionality is provided by **Supabase**, an open-source Backend-as-a-Service (BaaS) platform built on top of **PostgreSQL**. Supabase eliminates the need to build and maintain a separate backend server by providing a full suite of managed services accessible through its JavaScript SDK and REST API.

### Supabase Auth
User authentication is managed by **Supabase Auth**, which handles email/password sign-up, sign-in, session management, JWT issuance, and refresh token rotation. The system reads the authenticated user's identity and role on every request, enforcing role-based access control across all six user roles: `superadmin`, `admin`, `priest`, `staff`, `minister`, and `parishioner`.

### PostgreSQL Database
The system's relational data is stored in **Supabase's managed PostgreSQL 17 database**. Key tables include `profiles`, `user_roles`, `events`, `attendance`, `baptisms`, `confirmations`, `holy_communions`, `weddings`, `mass_intentions`, `facilities_bookings`, `certifications`, `sacraments_liturgical`, `priests`, `ministries`, and `notifications`. **Row-Level Security (RLS)** policies are applied at the database level to ensure each user role can only read and write data they are authorized to access.

A **PostgREST** layer automatically exposes all tables and views as RESTful API endpoints. The frontend uses Supabase's JavaScript SDK for standard operations and a direct REST helper layer (`supabaseRest.js`) for mutations that require bypassing the SDK's internal GoTrue lock during concurrent token refreshes.

### Supabase Edge Functions (Deno 2)
Server-side operations that require privileged access or third-party API calls are handled by **Supabase Edge Functions**, which run on the **Deno 2** runtime. The system deploys four edge functions:
- `create-user` — provisions a new auth account and assigns a role using the service-role key
- `delete-user` — cascade-deletes a user account from both auth and database records
- `send-request-email` — notifies a parishioner when their sacrament request is received
- `send-approval-email` — notifies a parishioner when their request is fully approved

### Supabase Realtime
**Supabase Realtime** is used to push live database change events to the admin dashboard. The admin dashboard subscribes to INSERT events on the `notifications` table and automatically re-fetches pending request counts when a new notification arrives, eliminating the need for manual page refreshes.

---

## Email Notifications — Resend API

Outbound transactional emails are delivered through the **Resend API**, integrated via Supabase Edge Functions. Emails are fired asynchronously (fire-and-forget) to avoid blocking the user's form submission flow. If the `RESEND_API_KEY` secret is not configured, the edge functions return a `{skipped: true}` response silently, allowing the system to operate without email delivery when in development.

---

## QR Code Technology

The system implements two complementary QR code capabilities:

**QR Code Generation** is handled by **qrcode.react v4**, which renders a canvas-based QR code image encoding the event's unique check-in URL (`#/check-in/{eventId}`). Administrators generate and print these codes from the QR Center module for distribution at events.

**QR Code Scanning** is performed by **html5-qrcode v2**, which accesses the device's camera via the browser's MediaDevices API to decode QR codes in real time. When a parishioner scans a code, the system opens the encoded URL, verifies their authentication and proximity, and records their attendance.

---

## Geolocation and Proximity Verification

To prevent remote check-ins, the system uses the **browser's Geolocation API** to obtain the parishioner's current GPS coordinates at the moment of check-in. A **Haversine formula** calculation is then applied server-side to compute the great-circle distance between the parishioner's location and the event's registered coordinates. Check-in is only permitted if the user is within **100 meters** of the event venue. This geofencing mechanism is supported visually by **Leaflet v1.9** and **React Leaflet v5**, which render an interactive map for administrators to set or verify event locations.

---

## Animation — Framer Motion v12

UI transitions, modal entrances, and micro-interaction animations are powered by **Framer Motion v12**, a production-grade animation library for React. Its declarative `animate`, `initial`, and `exit` props allow smooth page transitions and element animations without manual DOM manipulation or CSS keyframe authoring.

---

## PDF Generation — jsPDF v4

The administrative reports module allows administrators to generate printable PDF documents of sacrament request records, event schedules, and attendance summaries. **jsPDF v4** is used for programmatic PDF creation on the client side, enabling document generation without a backend rendering service.

---

## Deployment — GitHub Pages

The production system is deployed as a static SPA to **GitHub Pages** using the `gh-pages` npm package. The `npm run deploy` command builds the application into an optimized `dist/` folder and pushes it to the `gh-pages` branch, which GitHub Pages serves at `https://lambiniciojibsonpaul-art.github.io/church-system/`. Because this is a fully static deployment, all backend logic is handled entirely by Supabase's hosted infrastructure—no web server, PHP runtime, or application server is required.

---

## Development Environment

The system is developed on **Node.js** using **npm** for package management. **ESLint v9** with the `eslint-plugin-react-hooks` and `eslint-plugin-react-refresh` plugins enforces code quality and identifies potential runtime errors during development. The **Supabase CLI v2** is used to manage local development environments, run database migrations, and deploy edge functions to the hosted Supabase project.

---

## Summary Table

| Layer | Technology | Version |
|---|---|---|
| UI Framework | React | 19 |
| Build Tool | Vite | 8 |
| Client Routing | React Router DOM (HashRouter) | 7 |
| Styling | Tailwind CSS + PostCSS | 3 |
| Animation | Framer Motion | 12 |
| Backend / Auth / DB | Supabase (PostgreSQL 17, Auth, Realtime) | 2.x |
| Edge Functions Runtime | Deno | 2 |
| Email Delivery | Resend API (via Edge Functions) | — |
| QR Generation | qrcode.react | 4 |
| QR Scanning | html5-qrcode | 2 |
| Maps / Geofencing | Leaflet + React Leaflet | 1.9 / 5 |
| PDF Export | jsPDF | 4 |
| Deployment Host | GitHub Pages | — |
| Dev / CI Tooling | Node.js, ESLint, Supabase CLI | — |
