# System Flowcharts
# Minor Basilica of San Pedro Bautista — Church Management System
# ================================================================
# Box legend:
#   +--------+   Process / Action
#   | text   |
#   +--------+
#
#   < text ? >   Decision (branches to YES / NO)
#
#   ( text )     Start / End terminal
#
#   ---->        Flow direction
# ================================================================


================================================================================
CHART 1: SYSTEM ARCHITECTURE OVERVIEW
================================================================================

                        +--------------------------+
                        |  BROWSER / MOBILE DEVICE |
                        +--------------------------+
                                    |
          +-------------------------+-------------------------+
          |                         |                         |
          v                         v                         v
  +---------------+       +------------------+      +----------------+
  |  PUBLIC PAGES |       |   AUTH PAGES     |      |  ROLE PAGES    |
  | Landing, Svcs,|       | Login / Sign-Up  |      | Admin, Priest, |
  | Events, About |       | Update Password  |      | Staff, Ministry|
  +---------------+       +------------------+      +----------------+
          |                         |                         |
          +-------------------------+-------------------------+
                                    |
                                    |  REST API / SDK / WebSocket
                                    v
          +--------------------------------------------------------+
          |              SUPABASE  (Cloud Backend)                  |
          |                                                          |
          |   +-----------------+    +----------------------------+  |
          |   |  Supabase Auth  |    |    PostgreSQL 17 Database  |  |
          |   |  JWT Sessions   |    |  Tables, Views, RLS Policies|  |
          |   +-----------------+    +----------------------------+  |
          |                                                          |
          |   +-----------------+    +----------------------------+  |
          |   |    Realtime     |    |   Edge Functions (Deno 2)  |  |
          |   |  Live push via  |    | create-user, delete-user,  |  |
          |   |  WebSocket      |    | send-email (Resend API)    |  |
          |   +-----------------+    +----------------------------+  |
          +--------------------------------------------------------+
                                    |
                                    v
                        +--------------------+
                        |    Resend API      |
                        |  (Email delivery)  |
                        +--------------------+

    DEPLOYMENT: Static SPA hosted on GitHub Pages
                All backend logic runs on Supabase hosted cloud


================================================================================
CHART 2: USER AUTHENTICATION & ROLE-BASED ROUTING
================================================================================

( USER VISITS SITE )
         |
         v
+---------------------+
| View Public Pages   |
| No login required   |
+---------------------+
         |
         | [Clicks Sign In or Sign Up]
         |
         +-------------------+-------------------+
         |                                       |
         v                                       v
  +-----------+                           +-----------+
  |  SIGN UP  |                           |  SIGN IN  |
  +-----------+                           +-----------+
         |                                       |
         v                                       v
  +----------------+                 +-------------------------+
  | Choose role:   |                 | Enter email + password  |
  | Parishioner /  |                 +-------------------------+
  | Ministry       |                           |
  +----------------+                           v
         |                            < Credentials valid? >
         |                            /                    \
         |                          NO                    YES
         |                          |                      |
         |                          v                      v
         |                  +-------------+    +--------------------+
         |                  | Show login  |    | Fetch role from    |
         |                  | error       |    | user_roles table   |
         |                  +-------------+    +--------------------+
         |                                              |
         v                                              v
  +--------------------+                  < requires_password_change? >
  | PARISHIONER:       |                  /                           \
  | Creates account    |                YES                           NO
  | Email confirmation |                 |                             |
  +--------------------+                 v                             v
         |                      +----------------+          +--------------------+
         v                      | Force redirect |          |  ROLE ROUTING      |
  ( Redirect to Home )          | /update-       |          |                    |
                                | password       |          | admin/superadmin   |
                                +----------------+          |   --> /admin       |
                                                            |                    |
  +--------------------+                                    | priest             |
  | MINISTRY:          |                                    |   --> /priest-     |
  | role = ministry    |                                    |      dashboard     |
  | approval = pending |                                    |                    |
  | pending_ministries |                                    | staff              |
  | = [selections]     |                                    |   --> /staff-      |
  +--------------------+                                    |      dashboard     |
         |                                                  |                    |
         v                                                  | minister           |
  +--------------------+                                    |   --> /events      |
  | AWAITING APPROVAL  |                                    |                    |
  | screen shown       |                                    | parishioner        |
  | Polls DB every 8s  |                                    |   --> / (home)     |
  +--------------------+                                    +--------------------+
         |
         | [Admin approves]
         v
  +--------------------+
  | role --> minister  |
  | Auto-redirect to   |
  | /events page       |
  +--------------------+


================================================================================
CHART 3: SACRAMENT REQUEST LIFECYCLE
================================================================================

( PARISHIONER )
      |
      v
+------------------------+
| Opens service modal    |
| (Baptism, Wedding,     |
|  Mass Intention, etc.) |
+------------------------+
      |
      v
+------------------------+
| Fills request form     |
| Selects preferred      |
| priest (if required)   |
+------------------------+
      |
      v
+------------------------+
| Submits form           |
+------------------------+
      |
      +---------- INSERT into DB: status = "Pending"
      |            Fire email: send-request-email
      |            Insert notification for staff
      |
      v
+------------------------+
| STAFF reviews request  |
| on Staff Dashboard     |
+------------------------+
      |
      v
< Staff decision? >
   /           \
REJECT        ASSIGN PRIEST + APPROVE
  |                   |
  v                   v
+----------+   +-------------------------+
| status = |   | status = Staff Approved |
| Priest   |   | preferred_priest set    |
| Rejected |   +-------------------------+
+----------+          |
  |                   v
  |          +------------------------+
  |          | PRIEST reviews request |
  |          | on Priest Dashboard    |
  |          +------------------------+
  |                   |
  |                   v
  |          < Priest decision? >
  |             /           \
  |          REJECT        APPROVE
  |             |               |
  |             v               v
  |     +----------+   +-------------------------+
  |     | status = |   | status = Priest Approved|
  |     | Priest   |   +-------------------------+
  |     | Rejected |           |
  |     +----------+           v
  |          |       +------------------------+
  |          |       | ADMIN final review     |
  |          |       | on Admin Dashboard     |
  |          |       +------------------------+
  |          |               |
  |          |               v
  |          |    < Admin decision? >
  |          |    /       |        \
  |          | REJECT  CANCEL   APPROVE
  |          |    |       |        |
  |          |    v       v        v
  |          |  +------+  +------+  +------------------+
  |          |  |status|  |status|  | status = Approved|
  |          |  |=     |  |=     |  +------------------+
  |          |  |Reject|  |Cancel|         |
  |          |  +------+  +------+         +-- INSERT event on calendar
  |          |                             |
  |          |                             +-- Fire: send-approval-email
  |          |                             |
  |          |                             +-- INSERT parishioner notification
  |          |
  +----------+-----> Parishioner notified via in-app notification


================================================================================
CHART 4: QR CODE ATTENDANCE CHECK-IN FLOW
================================================================================

( ADMIN )                              ( PARISHIONER AT EVENT )
    |                                           |
    v                                           |
+-------------------+                           |
| Opens QR Center   |                           |
| /admin/qr-        |                           |
| generator         |                           |
+-------------------+                           |
    |                                           |
    v                                           |
+-------------------+                           |
| Selects event     |                           |
+-------------------+                           |
    |                                           |
    v                                           |
+-------------------+                           |
| QR Code generated |                           |
| encodes URL:      |                           |
| /#/check-in/{id}  |                           |
+-------------------+                           |
    |                                           |
    v                                           |
+-------------------+     [Scan QR Code]        |
| Print QR Code     |---------------------------+
+-------------------+                           |
                                                v
                                    +-----------------------+
                                    | Opens check-in URL    |
                                    | in browser            |
                                    +-----------------------+
                                                |
                                                v
                                    < Is user logged in? >
                                       /               \
                                      NO              YES
                                      |                |
                                      v                v
                              +-----------+   +--------------------+
                              | Redirect  |   | Request device     |
                              | to /login |   | geolocation        |
                              +-----------+   +--------------------+
                                   |                   |
                                   | [after login]     v
                                   |         < Location granted? >
                                   +----------->   /          \
                                               NO            YES
                                               |              |
                                               v              v
                                       +----------+  +------------------+
                                       | Show:    |  | Get GPS coords   |
                                       | Location |  +------------------+
                                       | required |          |
                                       +----------+          v
                                                   +------------------+
                                                   | Haversine formula|
                                                   | calc distance to |
                                                   | event location   |
                                                   +------------------+
                                                           |
                                                           v
                                               < Within 100 meters? >
                                                  /               \
                                                 NO              YES
                                                 |                |
                                                 v                v
                                        +----------+  +--------------------+
                                        | Show:    |  | INSERT attendance  |
                                        | Too far  |  | (user_id, event_id)|
                                        | from     |  +--------------------+
                                        | event    |          |
                                        +----------+          v
                                                   < Duplicate entry? >
                                                    /               \
                                                  YES               NO
                                                   |                |
                                                   v                v
                                           +----------+  +--------------------+
                                           | Show:    |  | Show:              |
                                           | Already  |  | Check-in           |
                                           | checked  |  | Successful!  ✓     |
                                           | in       |  +--------------------+
                                           +----------+


================================================================================
CHART 5: MINISTRY SELF-REGISTRATION & ADMIN APPROVAL
================================================================================

( NEW USER )
      |
      v
+----------------------------+
| Opens Sign-Up form         |
| Selects role: Ministry     |
+----------------------------+
      |
      v
+----------------------------+
| Selects ministry groups    |
| (multi-select checklist)   |
+----------------------------+
      |
      v
+----------------------------+
| Submits registration       |
+----------------------------+
      |
      v
+----------------------------+
| Supabase creates auth user |
| via create-user edge fn    |
+----------------------------+
      |
      v
+----------------------------+
| INSERT user_roles:         |
|   role = "ministry"        |
|   approval_status = pending|
|   pending_ministries = [...] |
+----------------------------+
      |
      v
+----------------------------+
| User sees:                 |
| Awaiting Approval screen   |
| Session stays alive        |
| Polls DB every 8 seconds   |
+----------------------------+
      |
      |                        ( ADMIN )
      |                            |
      |                            v
      |                +---------------------+
      |                | Opens Manage Users  |
      |                | Pending Ministry tab|
      |                +---------------------+
      |                            |
      |                            v
      |                +---------------------+
      |                | Reviews pending user|
      |                | sees ministry badges|
      |                +---------------------+
      |                            |
      |                            v
      |                   < Admin decision? >
      |                    /               \
      |                 REJECT           APPROVE
      |                    |                |
      |                    v                v
      |            +----------+  +-------------------------+
      |            | delete-  |  | UPDATE user_roles:      |
      |            | user edge|  |   role = "minister"     |
      |            | function |  |   approval_status =     |
      |            | invoked  |  |   "approved"            |
      |            +----------+  +-------------------------+
      |                                  |
      |                                  v
      |                       +-------------------------+
      |                       | UPSERT profiles:        |
      |                       |   ministries =          |
      |                       |   pending_ministries    |
      |                       +-------------------------+
      |                                  |
      |     [Poll detects "approved"]    |
      +<---------------------------------+
      |
      v
+----------------------------+
| Cache role in localStorage |
| Auto-redirect to /events   |
+----------------------------+


================================================================================
CHART 6: PARISH EVENT MANAGEMENT FLOW
================================================================================

( MINISTER or ADMIN )
        |
        v
+------------------------+
| Opens Events page      |
| or Admin Dashboard     |
+------------------------+
        |
        v
+------------------------+
| Clicks: Create Event   |
+------------------------+
        |
        v
+------------------------+
| Fills event details:   |
| Title, Date, Time,     |
| Location, Ministry,    |
| GPS Coordinates        |
+------------------------+
        |
        v
+------------------------+
| INSERT into events     |
| status = "Active"      |
+------------------------+
        |
        +-----> Invalidate Events page cache
        |
        v
+-----------------------------------+
| Event appears on:                 |
|  - Landing page Upcoming Events   |
|  - Events board (/events)         |
|  - Admin Dashboard Events table   |
+-----------------------------------+
        |
        v
( ADMIN ) reviews Parish Events table
        |
        v
+-----------------------------------+
| Filter by computed status:        |
|  Upcoming / Active Today /        |
|  Past / Pending / Cancelled       |
+-----------------------------------+
        |
        v
+-----------------------------------+
| Sort by: Date / Status /          |
|          Title / Class            |
+-----------------------------------+
        |
        v
+-----------------------------------+
| Click VIEW on any event           |
| Opens Event Details modal         |
+-----------------------------------+
        |
        v
< Event is Upcoming or Active Today? >
    /                               \
   YES                              NO
    |                                |
    v                                v
+-------------+              +-------------+
| EDIT button |              | View only   |
| appears     |              | (read-only) |
+-------------+              +-------------+
    |
    v
+-----------------------------+
| Admin edits fields:         |
| Title, Date, Time,          |
| Location, Priest, Ministry, |
| Event Type, Description     |
+-----------------------------+
    |
    v
+-----------------------------+
| Save -> UPDATE events table |
| Reflects instantly in all   |
| views across the system     |
+-----------------------------+


================================================================================
CHART 7: QR CENTER & ATTENDANCE REPORTING
================================================================================

( ADMIN )
    |
    +-------------------------+
    |                         |
    v                         v
+-------------------+   +-------------------+
| /admin/qr-        |   | /admin/attendance |
| generator         |   | -list             |
| QR Center         |   +-------------------+
+-------------------+         |
    |                         v
    v                 +-------------------+
+-------------------+ | Select event from |
| Select event      | | dropdown          |
+-------------------+ +-------------------+
    |                         |
    v                         v
+-------------------+ +-------------------+
| QR code rendered  | | Live attendance   |
| (qrcode.react)    | | records table     |
+-------------------+ | from              |
    |                 | attendance_details|
    v                 | VIEW              |
+-------------------+ +-------------------+
| Print QR code     |         |
| for distribution  |         v
| at event          | +-------------------+
+-------------------+ | Search by name    |
                      | or email          |
                      +-------------------+
                               |
                               v
                      +-------------------+
                      | Columns shown:    |
                      | Name, Email,      |
                      | Contact, Role,    |
                      | Check-In Time     |
                      +-------------------+


================================================================================
CHART 8: ADMIN REPORTS FLOW
================================================================================

( ADMIN ) opens /admin/reports
    |
    v
+-------------------------------+
| Summary Metric Cards shown:   |
| Total Reservations            |
| Total Attendance              |
| Active Events                 |
| Active Ministries             |
+-------------------------------+
    |
    v
+-------------------------------+
| Select Report Tab             |
+-------------------------------+
    |
    +----------------+------------------+------------------+
    |                |                  |                  |
    v                v                  v                  v
+----------+  +----------+      +----------+      +----------+
| SERVICE  |  | SCHEDULES|      |ATTENDANCE|      |MINISTRIES|
|RESERVAT- |  +----------+      +----------+      +----------+
|IONS      |       |                  |                  |
+----------+       v                  v                  v
    |         +----------+      +----------+      +----------+
    v         | Filter:  |      | Select   |      | Table of |
+----------+  | Event    |      | Event    |      | all      |
| Select   |  | Type     |      | from     |      | active   |
| service  |  +----------+      | dropdown |      | minist-  |
| type     |       |            +----------+      | ries     |
+----------+       v                  |           +----------+
    |         +----------+            v
    v         | Filter:  |      +----------+
+----------+  | Status   |      | Search   |
| Filter:  |  | Active / |      | attendee |
| Status   |  | Cancelled|      | by name  |
| dropdown |  +----------+      +----------+
+----------+       |                  |
    |              v                  v
    v         +----------+      +----------+
+----------+  | Sort by: |      | Attendee |
| Sort by: |  | Date /   |      | table:   |
| Date /   |  | Title /  |      | Name,    |
| Name /   |  | Status / |      | Email,   |
| Status / |  | Class    |      | Contact, |
| Submitter|  +----------+      | Role,    |
+----------+       |            | Check-In |
    |              |            +----------+
    v              v                  |
+---------------------------------------------+
|          Results Table (all tabs)            |
+---------------------------------------------+
                    |
                    v
          +-----------------+
          | Print Report    |
          | (official       |
          | letterhead)     |
          +-----------------+


================================================================================
CHART 9: USER ROLES & ACCESSIBLE PAGES
================================================================================

  +---------------+      +-----------------------------------------------+
  |     ROLE      |      |             ACCESSIBLE PAGES                  |
  +---------------+      +-----------------------------------------------+
  | superadmin    | ---> | /admin, /admin/schedules, /admin/reports,      |
  | admin         |      | /admin/attendance-list, /admin/qr-generator,   |
  |               |      | /admin/manage-users + all public pages         |
  +---------------+      +-----------------------------------------------+
  | priest        | ---> | /priest-dashboard + all public pages           |
  +---------------+      +-----------------------------------------------+
  | staff         | ---> | /staff-dashboard + all public pages            |
  +---------------+      +-----------------------------------------------+
  | minister      | ---> | /events (create & manage) + all public pages   |
  +---------------+      +-----------------------------------------------+
  | parishioner   | ---> | / (home), /about, /services, /events,          |
  |               |      | /ministries, /give, /check-in/:eventId         |
  +---------------+      +-----------------------------------------------+
  | guest         | ---> | Public pages only (no check-in, no forms)      |
  +---------------+      +-----------------------------------------------+


================================================================================
CHART 10: DATABASE TABLES OVERVIEW
================================================================================

  +----------------+    +----------------+    +----------------+
  |  profiles      |    |  user_roles    |    |  priests       |
  +----------------+    +----------------+    +----------------+
  | id (PK)        |<-->| user_id (FK)   |    | id (PK)        |
  | first_name     |    | role           |    | user_id (FK)   |
  | last_name      |    | approval_status|    | name           |
  | email          |    | pending_minis- |    | is_active      |
  | contact_number |    | tries (JSONB)  |    +----------------+
  | ministries     |    | req_pwd_change |
  +-------+--------+    +----------------+
          |
          |--------------------------------------------+
          |                                            |
          v                                            v
  +----------------+                         +------------------+
  |  events        |                         |  attendance      |
  +----------------+                         +------------------+
  | id (PK)        |<----------------------->| id (PK)          |
  | title          |                         | user_id (FK)     |
  | event_class    |                         | event_id (FK)    |
  | event_date     |                         | check_in_time    |
  | event_time     |                         | status           |
  | location       |                         +------------------+
  | status         |
  | priest_name    |     SACRAMENT TABLES (all share same lifecycle):
  | ministry       |
  | source_table   |     +----------------+  +----------------+
  | source_id      |     | baptisms       |  | confirmations  |
  | creator_id(FK) |     +----------------+  +----------------+
  +----------------+     | id (PK)        |  | id (PK)        |
                         | user_id (FK)   |  | user_id (FK)   |
                         | status         |  | status         |
  +----------------+     | preferred_     |  | preferred_     |
  | notifications  |     | priest         |  | priest         |
  +----------------+     | rejection_     |  | rejection_     |
  | id (PK)        |     | remarks        |  | remarks        |
  | user_id (FK)   |     | ...form fields |  | ...form fields |
  | title          |     +----------------+  +----------------+
  | message        |
  | link           |     Same structure applies to:
  | is_read        |     weddings, holy_communions, mass_intentions,
  +----------------+     facilities_bookings, certifications,
                         sacraments_liturgical
