import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom"; // ✨ added useLocation
import { restSelect, restUpdate, restInsert, restDelete } from "../supabaseRest";
import { useAuth } from "../contexts/useAuth";
import { sendApprovalEmail } from "../emailNotifications";
import { supabase } from "../supabaseClient";

const QUERY_TIMEOUT_MS = 12000;

const TAB_CONFIG = {
  Baptisms: {
    table: "baptisms",
    isSacrament: true,
    title: (r) => `${r.child_first_name || ""} ${r.child_last_name || ""}`.trim() || "Baptism",
    columns: [
      { label: "Child's Name", value: (r) => `${r.child_first_name || ""} ${r.child_last_name || ""}`.trim() },
      { label: "Type", value: (r) => r.baptism_type },
      { label: "Pref. Date", value: (r) => formatDate(r.preferred_date) },
      { label: "Submitter", value: (r) => r.is_guest ? `${r.guest_name || "—"} (Guest)` : (r.submitter_signature || r.submitter_name || "—") },
    ],
    eventBuilder: (r, priest, userId) => ({
      creator_id: userId,
      title: `Baptism — ${r.child_first_name || ""} ${r.child_last_name || ""}`.trim(),
      event_class: "Baptism",
      priest_name: priest,
      event_date: r.preferred_date,
      event_time: "10:00",
      location: "Main Altar",
      description: `Baptism ceremony for ${r.child_first_name || ""} ${r.child_last_name || ""}.`,
      status: "Active",
    }),
  },
  "Holy Communion": {
    table: "holy_communions",
    isSacrament: true,
    title: (r) => `${r.child_first_name || ""} ${r.child_surname || ""}`.trim() || "Communion",
    columns: [
      { label: "Candidate", value: (r) => `${r.child_first_name || ""} ${r.child_surname || ""}`.trim() },
      { label: "Pref. Date", value: (r) => formatDate(r.date_of_communion) },
      { label: "Contact", value: (r) => r.contact_number_1 || "—" },
      { label: "Submitter", value: (r) => r.is_guest ? `${r.guest_name || "—"} (Guest)` : (r.submitter_signature || "—") },
    ],
    eventBuilder: (r, priest, userId) => ({
      creator_id: userId,
      title: `First Holy Communion — ${r.child_first_name || ""} ${r.child_surname || ""}`.trim(),
      event_class: "Holy Communion",
      priest_name: priest,
      event_date: r.date_of_communion,
      event_time: r.time_of_communion || "09:00",
      location: "Main Altar",
      description: `First Holy Communion for ${r.child_first_name || ""} ${r.child_surname || ""}.`,
      status: "Active",
    }),
  },
  Confirmation: {
    table: "confirmations",
    isSacrament: true,
    title: (r) => `${r.child_first_name || ""} ${r.child_surname || ""}`.trim() || "Confirmation",
    columns: [
      { label: "Candidate", value: (r) => `${r.child_first_name || ""} ${r.child_surname || ""}`.trim() },
      { label: "Pref. Date", value: (r) => formatDate(r.date_of_confirmation) },
      { label: "Contact", value: (r) => r.contact_number || "—" },
      { label: "Submitter", value: (r) => r.is_guest ? `${r.guest_name || "—"} (Guest)` : (r.submitter_signature || "—") },
    ],
    eventBuilder: (r, priest, userId) => ({
      creator_id: userId,
      title: `Confirmation — ${r.child_first_name || ""} ${r.child_surname || ""}`.trim(),
      event_class: "Confirmation",
      priest_name: priest,
      event_date: r.date_of_confirmation,
      event_time: r.time_of_confirmation || "10:00",
      location: "Main Altar",
      description: `Confirmation for ${r.child_first_name || ""} ${r.child_surname || ""}.`,
      status: "Active",
    }),
  },
  Weddings: {
    table: "weddings",
    isSacrament: true,
    title: (r) => `${r.groom_first_name || ""} ${r.groom_surname || ""} & ${r.bride_first_name || ""} ${r.bride_surname || ""}`.trim(),
    columns: [
      { label: "Couple", value: (r) => `${r.groom_first_name || ""} ${r.groom_surname || ""} & ${r.bride_first_name || ""} ${r.bride_surname || ""}`.trim() },
      { label: "Pref. Date", value: (r) => formatDate(r.wedding_date) },
      { label: "Contact", value: (r) => r.groom_contact || r.bride_contact || "—" },
      { label: "Submitter", value: (r) => r.is_guest ? `${r.guest_name || "—"} (Guest)` : (r.submitter_signature || "—") },
    ],
    eventBuilder: (r, priest, userId) => ({
      creator_id: userId,
      title: `Wedding — ${r.groom_first_name || ""} ${r.groom_surname || ""} & ${r.bride_first_name || ""} ${r.bride_surname || ""}`.trim(),
      event_class: "Wedding",
      priest_name: priest,
      event_date: r.wedding_date,
      event_time: r.wedding_time || "14:00",
      location: "Main Altar",
      description: `Wedding ceremony.`,
      status: "Active",
    }),
  },
  "Mass Intentions": {
    table: "mass_intentions",
    isSacrament: true,
    title: (r) => `${r.intention_type || ""} for ${r.names_in_intention || r.full_name || ""}`.trim(),
    columns: [
      { label: "Type", value: (r) => r.intention_type },
      { label: "For", value: (r) => r.names_in_intention || "—" },
      { label: "Pref. Date", value: (r) => formatDate(r.preferred_date) },
      { label: "Submitter", value: (r) => r.is_guest ? `${r.guest_name || "—"} (Guest)` : (r.submitter_signature || r.full_name || "—") },
    ],
    eventBuilder: (r, priest, userId) => ({
      creator_id: userId,
      title: `Mass Intention — ${r.intention_type || ""}`.trim(),
      event_class: "Mass",
      priest_name: priest,
      event_date: r.preferred_date,
      event_time: r.preferred_time || "06:00",
      location: r.location || "Parish Church",
      description: `Mass intention: ${r.intention_type}. For: ${r.names_in_intention || ""}.`,
      status: "Active",
    }),
  },
  "Sacraments & Liturgical": {
    table: "sacraments_liturgical",
    isSacrament: true,
    title: (r) => r.request_type || "Sacrament Service",
    columns: [
      { label: "Service", value: (r) => r.request_type },
      { label: "Date", value: (r) => formatDate(r.request_date) },
      { label: "Address", value: (r) => r.address || "—" },
      { label: "Submitter", value: (r) => r.is_guest ? `${r.guest_name || "—"} (Guest)` : (r.submitter_signature || r.requested_by || "—") },
    ],
    eventBuilder: (r, priest, userId) => ({
      creator_id: userId,
      title: `${r.request_type} — ${r.requested_by || ""}`.trim(),
      event_class: r.request_type || "Liturgical",
      priest_name: priest,
      event_date: r.request_date,
      event_time: r.request_time || "10:00",
      location: r.address || "Parish",
      description: r.notes || `${r.request_type} requested by ${r.requested_by}.`,
      status: "Active",
    }),
  },
  "Facilities Booking": {
    table: "facilities_bookings",
    isSacrament: false,
    title: (r) => `${r.facility || "Facility"} — ${r.event_type || r.event_purpose || ""}`.trim(),
    columns: [
      { label: "Facility", value: (r) => r.facility },
      { label: "Event", value: (r) => r.event_type || r.event_purpose },
      { label: "Start", value: (r) => formatDate(r.start_date) },
      { label: "Submitter", value: (r) => r.is_guest ? `${r.guest_name || "—"} (Guest)` : (r.submitter_signature || `${r.requestor_first_name || ""} ${r.requestor_surname || ""}`.trim() || "—") },
    ],
  },
  Certifications: {
    table: "certification_requests",
    isSacrament: false,
    title: (r) => `${r.certificate_type || "Certificate"} — ${r.record_holder_first_name || ""} ${r.record_holder_surname || ""}`.trim(),
    columns: [
      { label: "Type", value: (r) => r.certificate_type },
      { label: "Record Holder", value: (r) => `${r.record_holder_first_name || ""} ${r.record_holder_surname || ""}`.trim() },
      { label: "Purpose", value: (r) => r.purpose },
      { label: "Submitter", value: (r) => r.is_guest ? `${r.guest_name || "—"} (Guest)` : (r.submitter_signature || `${r.requestor_first_name || ""} ${r.requestor_surname || ""}`.trim() || "—") },
    ],
  },
};

const TAB_NAMES = Object.keys(TAB_CONFIG);
const ALL_SERVICES = "All Services";

const EVENTS_PAGE_CACHE_KEY = "eventsPage:events";
function bustEventsPageCache() {
  try { sessionStorage.removeItem(EVENTS_PAGE_CACHE_KEY); } catch { /* ignore */ }
}

function extractRecordDate(r) {
  return r.preferred_date || r.wedding_date || r.date_of_confirmation ||
    r.date_of_communion || r.request_date || r.start_date || null;
}

function extractRecordSubmitter(r) {
  const name = (
    r.guest_name || r.submitter_signature || r.submitter_name ||
    r.full_name || r.requested_by ||
    [r.requestor_first_name, r.requestor_surname].filter(Boolean).join(" ") || "—"
  );
  return r.is_guest ? `${name} (Guest)` : name;
}

const ALL_SERVICES_COLUMNS = [
  { label: "Service",   value: (r) => r._tab },
  { label: "Title",     value: (r) => r._config.title(r) },
  { label: "Date",      value: (r) => formatDate(extractRecordDate(r)) },
  { label: "Submitter", value: (r) => extractRecordSubmitter(r) },
];

const ALL_SERVICES_CONFIG = {
  table: null,
  isSacrament: false,
  columns: ALL_SERVICES_COLUMNS,
  title: (r) => r._config.title(r),
};

function formatDate(d) {
  if (!d) return "";
  try { return new Date(d).toLocaleDateString(); } catch { return ""; }
}

// ----------------------------------------------------------------------------
// COMPONENT
// ----------------------------------------------------------------------------
function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation(); // ✨ NEW

  const [loading, setLoading] = useState(true);

  // ✨ NEW: highlight state for notification-driven scroll+glow
  const [highlightId, setHighlightId] = useState(null);

  const [requests, setRequests] = useState(
    Object.fromEntries(TAB_NAMES.map((t) => [t, []]))
  );
  const [activeTab, setActiveTab] = useState(ALL_SERVICES);
  const [activeSubTab, setActiveSubTab] = useState("All");

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("date_desc");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedRequest, setSelectedRequest] = useState(null);

  const [rejectingRequest, setRejectingRequest] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const [acceptingRequest, setAcceptingRequest] = useState(null);
  const [acceptSubmitting, setAcceptSubmitting] = useState(false);

  const [cancellingRequest, setCancellingRequest] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  const [deletingRequest, setDeletingRequest] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsSearchQuery, setEventsSearchQuery] = useState("");
  const [eventsSortBy, setEventsSortBy] = useState("date_desc");
  const [eventsFilter, setEventsFilter] = useState("All");
  const [eventsPageSize, setEventsPageSize] = useState(10);
  const [eventsCurrentPage, setEventsCurrentPage] = useState(1);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [cancellingEvent, setCancellingEvent] = useState(null);
  const [eventCancelReason, setEventCancelReason] = useState("");
  const [cancelEventSubmitting, setCancelEventSubmitting] = useState(false);
  const [deletingEvent, setDeletingEvent] = useState(null);
  const [deleteEventSubmitting, setDeleteEventSubmitting] = useState(false);

  // ── Initial data fetch ───────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const entries = Object.entries(TAB_CONFIG);
      const [tabResults] = await Promise.all([
        Promise.allSettled(
          entries.map(([, cfg]) =>
            restSelect(cfg.table, { order: "created_at.desc", timeoutMs: QUERY_TIMEOUT_MS })
          )
        ),
      ]);
      if (cancelled) return;

      const merged = {};
      entries.forEach(([tabName], idx) => {
        const r = tabResults[idx];
        if (r.status === "fulfilled" && r.value?.data) {
          merged[tabName] = r.value.data;
        } else {
          merged[tabName] = [];
          if (r.status === "fulfilled" && r.value?.error)
            console.warn(`[AdminDashboard] ${tabName} fetch error:`, r.value.error.message);
        }
      });
      setRequests(merged);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  // Re-fetch all request tables when a new admin notification arrives
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel("admin-dashboard-new-requests")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, () => {
        const entries = Object.entries(TAB_CONFIG);
        Promise.allSettled(
          entries.map(([, cfg]) =>
            restSelect(cfg.table, { order: "created_at.desc", timeoutMs: QUERY_TIMEOUT_MS })
          )
        ).then((tabResults) => {
          const merged = {};
          entries.forEach(([tabName], idx) => {
            const r = tabResults[idx];
            if (r.status === "fulfilled" && r.value?.data) merged[tabName] = r.value.data;
          });
          setRequests(prev => ({ ...prev, ...merged }));
        });
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user?.id]);

  // ── Events fetch ─────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await restSelect("events", {
        order: "event_date.desc", timeoutMs: QUERY_TIMEOUT_MS,
      });
      if (cancelled) return;
      if (error) console.warn("[AdminDashboard] events fetch error:", error.message);
      setEvents(Array.isArray(data) ? data : []);
      setEventsLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  // ✨ NEW: Handle notification click → switch tab → scroll → highlight → open modal
  useEffect(() => {
    if (!location.state?.highlightId || loading) return;

    const { highlightId: targetId, highlightTable } = location.state;

    // Find which tab owns this table
    const targetTab = Object.entries(TAB_CONFIG).find(
      ([, cfg]) => cfg.table === highlightTable
    )?.[0];

    if (!targetTab) return;

    // Switch to the correct tab and show all statuses so the row is visible
    setActiveTab(targetTab);
    setActiveSubTab("All");

    // Poll for the row to appear in the DOM after tab switch + render
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      const rowEl = document.getElementById(`request-row-${targetId}`);

      if (rowEl) {
        clearInterval(interval);

        // Scroll the row into the center of the viewport
        rowEl.scrollIntoView({ behavior: "smooth", block: "center" });

        // Trigger the gold glow highlight
        setHighlightId(targetId);

        // Open the details modal after scroll settles
        setTimeout(() => {
          const targetReq = (requests[targetTab] || []).find((r) => r.id === targetId);
          if (targetReq) {
            setSelectedRequest({
              ...targetReq,
              _tab: targetTab,
              _config: TAB_CONFIG[targetTab],
            });
          }
        }, 700);

        // Remove highlight after 2.5s
        setTimeout(() => setHighlightId(null), 2500);

        // Clear location state so a page refresh doesn't re-trigger
        window.history.replaceState({}, document.title);
      }

      // Give up after 3 seconds (30 × 100ms)
      if (attempts > 30) clearInterval(interval);
    }, 100);

    return () => clearInterval(interval);
  }, [location.state, loading, requests]);

  // ── Derived values ───────────────────────────────────────────────────────
  const isAllServices = activeTab === ALL_SERVICES;
  const activeConfig = isAllServices ? ALL_SERVICES_CONFIG : TAB_CONFIG[activeTab];
  const activeData = isAllServices
    ? TAB_NAMES.flatMap((t) =>
        (requests[t] || []).map((r) => ({ ...r, _tab: t, _config: TAB_CONFIG[t] }))
      ).sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")))
    : requests[activeTab] || [];

  const statusFiltered = activeSubTab === "All"
    ? activeData
    : activeData.filter((r) => r.status === activeSubTab);

  const trimmedQuery = searchQuery.trim().toLowerCase();
  const searchedData = trimmedQuery
    ? statusFiltered.filter((r) =>
        activeConfig.columns.some((col) => {
          const v = col.value(r);
          return v && String(v).toLowerCase().includes(trimmedQuery);
        })
      )
    : statusFiltered;

  const titleOf = (r) => String((r._config || activeConfig).title?.(r) || "").toLowerCase();
  const dateKeyOf = (r) => extractRecordDate(r) || r.created_at || "";

  const filteredData = [...searchedData].sort((a, b) => {
    if (sortBy === "title") return titleOf(a).localeCompare(titleOf(b));
    if (sortBy === "status") {
      const sa = String(a.status || "").localeCompare(String(b.status || ""));
      if (sa !== 0) return sa;
      return String(dateKeyOf(b)).localeCompare(String(dateKeyOf(a)));
    }
    if (sortBy === "date_asc") {
      const da = dateKeyOf(a), db = dateKeyOf(b);
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return String(da).localeCompare(String(db));
    }
    if (sortBy === "submitted_desc") return String(b.created_at || "").localeCompare(String(a.created_at || ""));
    if (sortBy === "submitted_asc")  return String(a.created_at || "").localeCompare(String(b.created_at || ""));
    return String(dateKeyOf(b)).localeCompare(String(dateKeyOf(a)));
  });

  const totalRecords = filteredData.length;
  const totalPages   = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safePage     = Math.min(currentPage, totalPages);
  const pageStart    = (safePage - 1) * pageSize;
  const pageEnd      = Math.min(pageStart + pageSize, totalRecords);
  const pageData     = filteredData.slice(pageStart, pageEnd);

  const pendingCount = (tab) =>
    (requests[tab] || []).filter((r) => r.status === "Staff Approved").length;
  const totalPending = TAB_NAMES.reduce((sum, t) => sum + pendingCount(t), 0);

  useEffect(() => { setCurrentPage(1); }, [activeTab, activeSubTab, searchQuery, sortBy, pageSize]);

  // ── Events derived values ────────────────────────────────────────────────
  const todayKey = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
  })();

  const ministryEvents      = events.filter((ev) => !ev.source_table);
  const eventsTimeFiltered  = ministryEvents.filter((ev) => {
    const d = String(ev.event_date || "");
    const s = ev.status || "Active";
    if (eventsFilter === "Cancelled") return s === "Cancelled";
    if (eventsFilter === "Upcoming")  return d && d >= todayKey;
    if (eventsFilter === "Past")      return d && d <  todayKey;
    return true;
  });
  const eventsTrimmedQuery  = eventsSearchQuery.trim().toLowerCase();
  const eventsSearchedData  = eventsTrimmedQuery
    ? eventsTimeFiltered.filter((ev) =>
        [ev.title, ev.event_class, ev.priest_name, ev.location, ev.description]
          .filter(Boolean).some((v) => String(v).toLowerCase().includes(eventsTrimmedQuery))
      )
    : eventsTimeFiltered;
  const eventsSortedData = [...eventsSearchedData].sort((a, b) => {
    if (eventsSortBy === "title") return String(a.title||"").toLowerCase().localeCompare(String(b.title||"").toLowerCase());
    if (eventsSortBy === "class") {
      const ca = String(a.event_class||"").localeCompare(String(b.event_class||""));
      if (ca !== 0) return ca;
      return String(b.event_date||"").localeCompare(String(a.event_date||""));
    }
    if (eventsSortBy === "date_asc") {
      const da = String(a.event_date||""), db = String(b.event_date||"");
      if (!da && !db) return 0; if (!da) return 1; if (!db) return -1;
      return da.localeCompare(db);
    }
    if (eventsSortBy === "created_desc") return String(b.created_at||"").localeCompare(String(a.created_at||""));
    if (eventsSortBy === "created_asc")  return String(a.created_at||"").localeCompare(String(b.created_at||""));
    return String(b.event_date||"").localeCompare(String(a.event_date||""));
  });

  const eventsTotal      = eventsSortedData.length;
  const eventsTotalPages = Math.max(1, Math.ceil(eventsTotal / eventsPageSize));
  const eventsSafePage   = Math.min(eventsCurrentPage, eventsTotalPages);
  const eventsPageStart  = (eventsSafePage - 1) * eventsPageSize;
  const eventsPageEnd    = Math.min(eventsPageStart + eventsPageSize, eventsTotal);
  const eventsPageData   = eventsSortedData.slice(eventsPageStart, eventsPageEnd);

  useEffect(() => { setEventsCurrentPage(1); }, [eventsSearchQuery, eventsSortBy, eventsFilter, eventsPageSize]);

  const resolveTabFor    = (req) => req?._tab || activeTab;
  const resolveConfigFor = (req) => req?._config || TAB_CONFIG[resolveTabFor(req)] || activeConfig;

  // ── Accept handlers ──────────────────────────────────────────────────────
  const openAcceptModal  = (req) => { setAcceptingRequest(req); };
  const closeAcceptModal = () => { setAcceptingRequest(null); setAcceptSubmitting(false); };

  const confirmAccept = async () => {
    if (!acceptingRequest) return;
    const reqTab    = resolveTabFor(acceptingRequest);
    const reqConfig = resolveConfigFor(acceptingRequest);
    setAcceptSubmitting(true);

    const { error: updateErr } = await restUpdate(reqConfig.table, { id: acceptingRequest.id }, { status: "Approved" });
    if (updateErr) { setAcceptSubmitting(false); alert("Error approving request: " + updateErr.message); return; }

    if (reqConfig.isSacrament && reqConfig.eventBuilder) {
      const eventPayload = {
        ...reqConfig.eventBuilder(acceptingRequest, acceptingRequest.preferred_priest || "", user?.id || null),
        source_table: reqConfig.table, source_id: acceptingRequest.id,
      };
      if (eventPayload?.event_date) {
        let { error: eventErr } = await restInsert("events", [eventPayload]);
        if (eventErr && (eventErr.code === "PGRST204" || eventErr.message?.includes("column"))) {
          const fallback = { ...eventPayload };
          delete fallback.collaborators; delete fallback.is_public;
          const retry = await restInsert("events", [fallback]);
          eventErr = retry.error;
        }
        if (eventErr) {
          console.warn("[AdminDashboard] event creation failed:", eventErr.message);
          alert("Request approved, but the calendar event could not be created: " + eventErr.message + "\n\nYou can add it manually from the Schedules page.");
        }
      }
    }

    if (acceptingRequest.submitter_email) {
      sendApprovalEmail({
        to: acceptingRequest.submitter_email,
        serviceName: reqTab.toLowerCase(),
        eventDate: formatDate(
          acceptingRequest.preferred_date || acceptingRequest.wedding_date ||
          acceptingRequest.date_of_confirmation || acceptingRequest.date_of_communion ||
          acceptingRequest.start_date || acceptingRequest.request_date
        ),
        eventTime: acceptingRequest.preferred_time || acceptingRequest.wedding_time ||
          acceptingRequest.time_of_confirmation || acceptingRequest.time_of_communion ||
          acceptingRequest.start_time || "",
        location: acceptingRequest.location || "Parish",
        priestName: acceptingRequest.preferred_priest || "",
      });
    }

    if (acceptingRequest.user_id) {
      await supabase.rpc('notify_parishioner', {
        target_user_id: acceptingRequest.user_id,
        notif_title: `Your ${reqTab} Request — Fully Approved! ✓`,
        notif_message: `Great news! Your request has been fully approved by the parish admin. Please coordinate with the parish office for next steps.`,
        notif_link: '/profile',
        p_source_id: acceptingRequest.id,
        p_source_table: reqConfig.table,
      });
    }

    setRequests((prev) => ({
      ...prev,
      [reqTab]: prev[reqTab].map((r) => r.id === acceptingRequest.id ? { ...r, status: "Approved" } : r),
    }));
    closeAcceptModal();
  };

  // ── Reject handlers ──────────────────────────────────────────────────────
  const openRejectModal  = (req) => { setRejectingRequest(req); setRejectionReason(""); };
  const closeRejectModal = () => { setRejectingRequest(null); setRejectionReason(""); };

  const confirmReject = async () => {
    if (!rejectingRequest) return;
    if (!rejectionReason.trim()) { alert("Please provide a reason for rejection."); return; }
    const reqTab    = resolveTabFor(rejectingRequest);
    const reqConfig = resolveConfigFor(rejectingRequest);
    const { error } = await restUpdate(reqConfig.table, { id: rejectingRequest.id }, { status: "Rejected", rejection_remarks: rejectionReason });
    if (error) { alert("Error rejecting request: " + error.message); return; }

    if (rejectingRequest.user_id) {
      await supabase.rpc('notify_parishioner', {
        target_user_id: rejectingRequest.user_id,
        notif_title: `Your ${reqTab} Request — Not Approved`,
        notif_message: `We regret to inform you that your request was not approved by the parish admin. Reason: ${rejectionReason}. Please contact the parish office for more information.`,
        notif_link: '/profile',
        p_source_id: rejectingRequest.id,
        p_source_table: reqConfig.table,
      });
    }

    setRequests((prev) => ({
      ...prev,
      [reqTab]: prev[reqTab].map((r) =>
        r.id === rejectingRequest.id ? { ...r, status: "Rejected", rejection_remarks: rejectionReason } : r
      ),
    }));
    closeRejectModal();
  };

  // ── Cancel handlers ──────────────────────────────────────────────────────
  const openCancelModal  = (req) => { setCancellingRequest(req); setCancelReason(""); };
  const closeCancelModal = () => { setCancellingRequest(null); setCancelReason(""); setCancelSubmitting(false); };

  const confirmCancel = async () => {
    if (!cancellingRequest) return;
    if (!cancelReason.trim()) { alert("Please provide a reason for cancellation."); return; }
    const reqTab    = resolveTabFor(cancellingRequest);
    const reqConfig = resolveConfigFor(cancellingRequest);
    setCancelSubmitting(true);
    const { error } = await restUpdate(reqConfig.table, { id: cancellingRequest.id }, { status: "Cancelled", rejection_remarks: cancelReason });
    if (error) { setCancelSubmitting(false); alert("Error cancelling request: " + error.message); return; }

    if (reqConfig.isSacrament) {
      let removed = 0;
      const { data: bySource, error: srcErr } = await restDelete("events", { source_table: reqConfig.table, source_id: cancellingRequest.id });
      if (!srcErr && Array.isArray(bySource)) removed = bySource.length;
      if (removed === 0 && reqConfig.eventBuilder) {
        const legacy = reqConfig.eventBuilder(cancellingRequest, "", null);
        if (legacy?.event_date && legacy?.event_class && legacy?.title) {
          const { data: byHeur, error: heurErr } = await restDelete("events", { event_class: legacy.event_class, event_date: legacy.event_date, title: legacy.title });
          if (heurErr) console.warn("[AdminDashboard] legacy event delete failed:", heurErr.message);
          else if (Array.isArray(byHeur)) removed = byHeur.length;
        }
      }
      if (removed === 0) console.warn("[AdminDashboard] no calendar event matched this cancellation", srcErr ? `(source delete error: ${srcErr.message})` : "");
    }

    setRequests((prev) => ({
      ...prev,
      [reqTab]: prev[reqTab].map((r) =>
        r.id === cancellingRequest.id ? { ...r, status: "Cancelled", rejection_remarks: cancelReason } : r
      ),
    }));
    closeCancelModal();
  };

  // ── Delete handlers ──────────────────────────────────────────────────────
  const openDeleteModal  = (req) => setDeletingRequest(req);
  const closeDeleteModal = () => { setDeletingRequest(null); setDeleteSubmitting(false); };

  const confirmDelete = async () => {
    if (!deletingRequest) return;
    const reqTab    = resolveTabFor(deletingRequest);
    const reqConfig = resolveConfigFor(deletingRequest);
    setDeleteSubmitting(true);
    const { error } = await restDelete(reqConfig.table, { id: deletingRequest.id });
    if (error) { setDeleteSubmitting(false); alert("Error deleting request: " + error.message); return; }
    setRequests((prev) => ({ ...prev, [reqTab]: prev[reqTab].filter((r) => r.id !== deletingRequest.id) }));
    closeDeleteModal();
  };

  // ── Event cancel/delete handlers ─────────────────────────────────────────
  const openCancelEventModal  = (ev) => { setCancellingEvent(ev); setEventCancelReason(""); };
  const closeCancelEventModal = () => { setCancellingEvent(null); setEventCancelReason(""); setCancelEventSubmitting(false); };

  const confirmCancelEvent = async () => {
    if (!cancellingEvent) return;
    if (!eventCancelReason.trim()) { alert("Please provide a reason for cancellation."); return; }
    setCancelEventSubmitting(true);
    const { error } = await restUpdate("events", { id: cancellingEvent.id }, { status: "Cancelled", cancellation_remarks: eventCancelReason });
    if (error) { setCancelEventSubmitting(false); alert("Error cancelling event: " + error.message); return; }
    setEvents((prev) => prev.map((ev) => ev.id === cancellingEvent.id ? { ...ev, status: "Cancelled", cancellation_remarks: eventCancelReason } : ev));
    bustEventsPageCache();
    closeCancelEventModal();
  };

  const closeDeleteEventModal = () => { setDeletingEvent(null); setDeleteEventSubmitting(false); };

  const confirmDeleteEvent = async () => {
    if (!deletingEvent) return;
    setDeleteEventSubmitting(true);
    const { error } = await restDelete("events", { id: deletingEvent.id });
    if (error) { setDeleteEventSubmitting(false); alert("Error deleting event: " + error.message); return; }
    setEvents((prev) => prev.filter((ev) => ev.id !== deletingEvent.id));
    bustEventsPageCache();
    closeDeleteEventModal();
  };

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B59E74]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-28 md:pt-32 pb-12">

        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-200 pb-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-serif text-[#B59E74] mb-2 uppercase tracking-wide">Parish Dashboard</h1>
            <p className="text-gray-500 font-serif italic">
              Welcome back, <span className="font-semibold not-italic">{user?.user_metadata?.full_name || [user?.user_metadata?.first_name, user?.user_metadata?.last_name].filter(Boolean).join(" ") || user?.email?.split("@")[0] || "Admin"}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/admin/manage-users" className="flex items-center justify-center gap-2 bg-white border-2 border-[#B59E74] text-[#B59E74] px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-sm hover:bg-[#B59E74] hover:text-white active:scale-95">
              <span>👤</span> Manage Accounts
            </Link>
            <button onClick={() => navigate("/admin/schedules")} className="flex items-center justify-center gap-2 bg-white border-2 border-[#B59E74] text-[#B59E74] px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-sm hover:bg-[#B59E74] hover:text-white active:scale-95"><span>📅</span> Schedules</button>
            <button onClick={() => navigate("/admin/reports")} className="flex items-center justify-center gap-2 bg-white border-2 border-[#B59E74] text-[#B59E74] px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-sm hover:bg-[#B59E74] hover:text-white active:scale-95"><span>📊</span> Reports</button>
            <button onClick={() => navigate("/admin/attendance-list")} className="flex items-center justify-center gap-2 bg-white border-2 border-[#B59E74] text-[#B59E74] px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-sm hover:bg-[#B59E74] hover:text-white active:scale-95"><span>👥</span> Attendance</button>
            <button onClick={() => navigate("/admin/qr-generator")} className="flex items-center justify-center gap-2 bg-white border-2 border-[#B59E74] text-[#B59E74] px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-sm hover:bg-[#B59E74] hover:text-white active:scale-95"><span>🔳</span> QR Codes</button>
            <button
              onClick={() => navigate("/admin/announcements")}
              className="flex items-center justify-center gap-2 bg-white border-2 border-[#B59E74] text-[#B59E74] px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-sm hover:bg-[#B59E74] hover:text-white active:scale-95"
            >
              <span>📣</span> Announcements
            </button>
          </div>
        </div>

        {/* Total pending banner */}
        <div className="mb-6 bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#B59E74]"></div>
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Awaiting Admin Approval (Staff Approved)</h3>
            <p className="text-3xl text-gray-800 font-serif mt-1">{totalPending}</p>
          </div>
          <div className="text-4xl text-[#B59E74]/30">📋</div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {TAB_NAMES.map((tab) => (
            <StatCard key={tab} label={`Pending ${tab}`} count={pendingCount(tab)} active={activeTab === tab}
              onClick={() => { setActiveTab(tab); setActiveSubTab("Staff Approved"); }} />
          ))}
        </div>

        {/* Requests table container */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden min-h-[500px]">

          {/* Service selector header */}
          <div className="border-b border-gray-100 bg-gray-50/50 px-4 sm:px-6 py-4 md:py-5 flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">Viewing:</label>
              <div className="relative flex-1 md:flex-none">
                <select value={activeTab}
                  onChange={(e) => { const next = e.target.value; setActiveTab(next); setActiveSubTab(next === ALL_SERVICES ? "All" : "Pending"); }}
                  className="appearance-none w-full pl-4 pr-12 py-3 rounded-xl bg-white border-2 border-[#B59E74]/40 hover:border-[#B59E74] focus:outline-none focus:ring-2 focus:ring-[#B59E74] text-sm font-bold uppercase tracking-widest text-[#B59E74] cursor-pointer transition-colors md:min-w-[260px]"
                >
                  <option value={ALL_SERVICES}>{ALL_SERVICES}{totalPending > 0 ? `  •  ${totalPending} pending` : ""}</option>
                  {TAB_NAMES.map((tab) => {
                    const count = pendingCount(tab);
                    return <option key={tab} value={tab}>{tab}{count > 0 ? `  •  ${count} pending` : ""}</option>;
                  })}
                </select>
                <svg className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B59E74]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            {(() => {
              const badgeCount = isAllServices ? totalPending : pendingCount(activeTab);
              if (badgeCount === 0) return null;
              return (
                <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-red-600">
                  <span className="inline-flex items-center justify-center w-6 h-6 text-[11px] text-white bg-red-500 rounded-full">{badgeCount}</span>
                  staff-approved request{badgeCount === 1 ? "" : "s"} awaiting your approval
                </span>
              );
            })()}
          </div>

          <div className="p-4 sm:p-6 md:p-8">

            {/* Sub-tabs */}
            <div className="mb-6 md:mb-8">
              <div className="relative sm:hidden">
                <select value={activeSubTab} onChange={(e) => setActiveSubTab(e.target.value)}
                  className="appearance-none w-full pl-4 pr-10 py-3 rounded-xl bg-[#F6F5ED] border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#B59E74] text-sm font-bold uppercase tracking-widest text-gray-700 cursor-pointer">
                  {["All", "Pending", "Staff Approved", "Approved", "Rejected", "Cancelled"].map((sub) => (
                    <option key={sub} value={sub}>{sub} Requests</option>
                  ))}
                </select>
                <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              <div className="hidden sm:flex justify-center gap-1 sm:gap-3 p-1.5 sm:p-2 bg-[#F6F5ED] rounded-full w-full sm:w-fit mx-auto border border-gray-100">
                {["All", "Pending", "Staff Approved", "Approved", "Rejected", "Cancelled"].map((sub) => (
                  <button key={sub} onClick={() => setActiveSubTab(sub)}
                    className={`flex-1 sm:flex-none px-3 sm:px-6 py-2 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-tighter transition-all ${activeSubTab === sub ? "bg-[#B59E74] text-white shadow-md" : "text-gray-500 hover:text-gray-700"}`}>
                    {sub} Requests
                  </button>
                ))}
              </div>
            </div>

            {/* Search + sort + page size */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
              <div className="relative flex-1">
                <svg className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m1.85-5.4a7.25 7.25 0 11-14.5 0 7.25 7.25 0 0114.5 0z" />
                </svg>
                <input type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isAllServices ? "Search all services…" : `Search ${activeTab.toLowerCase()}…`}
                  className="w-full pl-11 pr-10 py-3 rounded-xl bg-white border-2 border-gray-200 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] focus:border-[#B59E74] text-sm transition-colors" />
                {searchQuery && (
                  <button type="button" onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors" aria-label="Clear search">✕</button>
                )}
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">Sort</label>
                <div className="relative">
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                    className="appearance-none pl-4 pr-10 py-3 rounded-xl bg-white border-2 border-gray-200 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] text-sm font-bold text-gray-700 cursor-pointer transition-colors">
                    <option value="date_desc">Preferred Date — Newest</option>
                    <option value="date_asc">Preferred Date — Oldest</option>
                    <option value="submitted_desc">Submitted — Newest</option>
                    <option value="submitted_asc">Submitted — Oldest</option>
                    <option value="status">Status</option>
                    <option value="title">Title (A–Z)</option>
                  </select>
                  <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">Show</label>
                <div className="relative">
                  <select value={pageSize} onChange={(e) => setPageSize(Math.min(25, Number(e.target.value) || 10))}
                    className="appearance-none pl-4 pr-10 py-3 rounded-xl bg-white border-2 border-gray-200 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] text-sm font-bold text-gray-700 cursor-pointer transition-colors">
                    {[5, 10, 25].map((n) => <option key={n} value={n}>{n} rows</option>)}
                  </select>
                  <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto animate-fade-in">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-100 text-xs text-gray-500 uppercase tracking-widest">
                    {activeConfig.columns.map((col) => <th key={col.label} className="p-4 font-bold">{col.label}</th>)}
                    <th className="p-4 font-bold">Status</th>
                    <th className="p-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageData.map((req) => (
                    // ✨ NEW: id for DOM targeting, dynamic highlight classes
                    <tr
                      id={`request-row-${req.id}`}
                      key={`${req._tab || activeTab}:${req.id}`}
                      className={`border-b transition-all duration-500
                        ${highlightId === req.id
                          ? "bg-[#B59E74]/10 border-[#B59E74]/40"
                          : "border-gray-50 hover:bg-gray-50"
                        }`}
                    >
                      {activeConfig.columns.map((col, i) => (
                        <td key={col.label} className={`p-4 text-sm ${i === 0 ? "font-serif text-gray-800 font-medium" : "text-gray-600"}`}>
                          {col.value(req) || "—"}
                        </td>
                      ))}
                      <td className="p-4"><StatusBadge status={req.status} /></td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          {req.status === "Staff Approved" && (
                            <>
                              <button onClick={() => openAcceptModal(req)} className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-600 hover:text-white transition-all" title="Accept"><span className="font-bold">✓</span></button>
                              <button onClick={() => openRejectModal(req)} className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all" title="Reject"><span className="font-bold">✕</span></button>
                            </>
                          )}
                          <button onClick={() => setSelectedRequest(req)} className="text-[#B59E74] hover:text-[#9c8760] text-xs font-bold uppercase tracking-widest px-3 py-2 rounded hover:bg-[#B59E74]/10 transition-colors">View</button>
                          {req.status === "Approved" && (
                            <button onClick={() => openCancelModal(req)} className="text-orange-600 hover:text-white hover:bg-orange-600 text-xs font-bold uppercase tracking-widest px-3 py-2 rounded bg-orange-50 transition-colors">Cancel</button>
                          )}
                          {(req.status === "Cancelled" || req.status === "Rejected") && (
                            <button onClick={() => openDeleteModal(req)} className="text-red-600 hover:text-white hover:bg-red-600 text-xs font-bold uppercase tracking-widest px-3 py-2 rounded bg-red-50 transition-colors">Delete</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3 animate-fade-in">
              {pageData.map((req) => {
                const [primaryCol, ...restCols] = activeConfig.columns;
                return (
                  // ✨ NEW: id for DOM targeting, dynamic highlight classes
                  <div
                    id={`request-row-${req.id}`}
                    key={`${req._tab || activeTab}:${req.id}`}
                    className={`border rounded-2xl p-4 shadow-sm transition-all duration-500
                      ${highlightId === req.id
                        ? "border-[#B59E74] bg-[#B59E74]/10 shadow-[#B59E74]/20"
                        : "border-gray-100 bg-white"
                      }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] uppercase tracking-widest text-gray-400">{primaryCol.label}</p>
                        <p className="font-serif text-gray-800 font-medium text-base break-words">{primaryCol.value(req) || "—"}</p>
                      </div>
                      <StatusBadge status={req.status} />
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-2 mb-4">
                      {restCols.map((col) => (
                        <div key={col.label} className="min-w-0">
                          <p className="text-[10px] uppercase tracking-widest text-gray-400">{col.label}</p>
                          <p className="text-sm text-gray-700 break-words">{col.value(req) || "—"}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-50">
                      {req.status === "Staff Approved" && (
                        <>
                          <button onClick={() => openAcceptModal(req)} className="flex-1 min-w-[100px] py-2.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-600 hover:text-white text-xs font-bold uppercase tracking-widest transition-all">✓ Accept</button>
                          <button onClick={() => openRejectModal(req)} className="flex-1 min-w-[100px] py-2.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-600 hover:text-white text-xs font-bold uppercase tracking-widest transition-all">✕ Reject</button>
                        </>
                      )}
                      <button onClick={() => setSelectedRequest(req)} className="flex-1 min-w-[100px] py-2.5 rounded-lg border border-[#B59E74]/40 text-[#B59E74] hover:bg-[#B59E74]/10 text-xs font-bold uppercase tracking-widest transition-all">View</button>
                      {req.status === "Approved" && (
                        <button onClick={() => openCancelModal(req)} className="flex-1 min-w-[100px] py-2.5 rounded-lg bg-orange-50 text-orange-700 hover:bg-orange-600 hover:text-white text-xs font-bold uppercase tracking-widest transition-all">Cancel</button>
                      )}
                      {(req.status === "Cancelled" || req.status === "Rejected") && (
                        <button onClick={() => openDeleteModal(req)} className="flex-1 min-w-[100px] py-2.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-600 hover:text-white text-xs font-bold uppercase tracking-widest transition-all">Delete</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {totalRecords === 0 && (
              <div className="text-center py-16 md:py-20 text-gray-400 italic font-serif">
                {trimmedQuery
                  ? `No requests match "${searchQuery.trim()}"${activeSubTab === "All" ? "" : ` in ${activeSubTab.toLowerCase()}`}.`
                  : activeSubTab === "All" ? "No requests found." : `No ${activeSubTab.toLowerCase()} requests found.`}
              </div>
            )}

            {totalRecords > 0 && (
              <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-xs text-gray-500 font-medium tracking-wide">
                  Showing <span className="font-bold text-gray-700">{pageStart + 1}</span>–<span className="font-bold text-gray-700">{pageEnd}</span> of <span className="font-bold text-gray-700">{totalRecords}</span>{trimmedQuery ? " (filtered)" : ""}
                </p>
                <div className="flex items-center justify-center gap-2">
                  <button type="button" onClick={() => setCurrentPage(1)} disabled={safePage === 1} className="px-3 py-2 text-xs font-bold uppercase tracking-widest rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors" aria-label="First page">«</button>
                  <button type="button" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={safePage === 1} className="px-3 py-2 text-xs font-bold uppercase tracking-widest rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Prev</button>
                  <span className="px-3 py-2 text-xs font-bold tracking-widest text-gray-700">Page {safePage} / {totalPages}</span>
                  <button type="button" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} className="px-3 py-2 text-xs font-bold uppercase tracking-widest rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Next</button>
                  <button type="button" onClick={() => setCurrentPage(totalPages)} disabled={safePage === totalPages} className="px-3 py-2 text-xs font-bold uppercase tracking-widest rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors" aria-label="Last page">»</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Parish Events Table ─────────────────────────────────────────── */}
        <div className="mt-8 bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden min-h-[400px]">
          <div className="border-b border-gray-100 bg-gray-50/50 px-4 sm:px-6 py-4 md:py-5 flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-2xl">📅</span>
              <div className="min-w-0">
                <h2 className="text-base md:text-lg font-serif text-[#B59E74] font-medium uppercase tracking-widest leading-tight">Parish Events</h2>
                <p className="text-xs text-gray-500 italic truncate">Events scheduled by ministries on the parish calendar.</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#B59E74]">
              <span className="inline-flex items-center justify-center w-6 h-6 text-[11px] text-white bg-[#B59E74] rounded-full">{ministryEvents.length}</span>
              total event{ministryEvents.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="p-4 sm:p-6 md:p-8">
            <div className="flex justify-center gap-1 sm:gap-3 mb-6 md:mb-8 p-1.5 sm:p-2 bg-[#F6F5ED] rounded-full w-full sm:w-fit mx-auto border border-gray-100">
              {["All", "Upcoming", "Past", "Cancelled"].map((f) => {
                const active = eventsFilter === f;
                const activeCls = f === "Cancelled" ? "bg-orange-600 text-white shadow-md" : "bg-[#B59E74] text-white shadow-md";
                return (
                  <button key={f} onClick={() => setEventsFilter(f)} className={`flex-1 sm:flex-none px-3 sm:px-6 py-2 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-tighter transition-all ${active ? activeCls : "text-gray-500 hover:text-gray-700"}`}>
                    <span className="sm:hidden">{f}</span>
                    <span className="hidden sm:inline">{f} Events</span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
              <div className="relative flex-1">
                <svg className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m1.85-5.4a7.25 7.25 0 11-14.5 0 7.25 7.25 0 0114.5 0z" />
                </svg>
                <input type="search" value={eventsSearchQuery} onChange={(e) => setEventsSearchQuery(e.target.value)} placeholder="Search events…" className="w-full pl-11 pr-10 py-3 rounded-xl bg-white border-2 border-gray-200 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] focus:border-[#B59E74] text-sm transition-colors" />
                {eventsSearchQuery && <button type="button" onClick={() => setEventsSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors" aria-label="Clear search">✕</button>}
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">Sort</label>
                <div className="relative">
                  <select value={eventsSortBy} onChange={(e) => setEventsSortBy(e.target.value)} className="appearance-none pl-4 pr-10 py-3 rounded-xl bg-white border-2 border-gray-200 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] text-sm font-bold text-gray-700 cursor-pointer transition-colors">
                    <option value="date_desc">Event Date — Newest</option>
                    <option value="date_asc">Event Date — Oldest</option>
                    <option value="created_desc">Created — Newest</option>
                    <option value="created_asc">Created — Oldest</option>
                    <option value="title">Title (A–Z)</option>
                    <option value="class">Class</option>
                  </select>
                  <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">Show</label>
                <div className="relative">
                  <select value={eventsPageSize} onChange={(e) => setEventsPageSize(Math.min(25, Number(e.target.value) || 10))} className="appearance-none pl-4 pr-10 py-3 rounded-xl bg-white border-2 border-gray-200 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] text-sm font-bold text-gray-700 cursor-pointer transition-colors">
                    {[5, 10, 25].map((n) => <option key={n} value={n}>{n} rows</option>)}
                  </select>
                  <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>

            {eventsLoading && <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#B59E74]"></div></div>}

            {!eventsLoading && (
              <div className="hidden md:block overflow-x-auto animate-fade-in">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-gray-100 text-xs text-gray-500 uppercase tracking-widest">
                      <th className="p-4 font-bold">Title</th><th className="p-4 font-bold">Date</th><th className="p-4 font-bold">Time</th>
                      <th className="p-4 font-bold">Class</th><th className="p-4 font-bold">Hosted By</th><th className="p-4 font-bold">Location</th>
                      <th className="p-4 font-bold">Status</th><th className="p-4 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eventsPageData.map((ev) => (
                      <tr key={ev.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="p-4 text-sm font-serif text-gray-800 font-medium">{ev.title || "—"}</td>
                        <td className="p-4 text-sm text-gray-600">{formatDate(ev.event_date)}</td>
                        <td className="p-4 text-sm text-gray-600">{ev.event_time || "—"}</td>
                        <td className="p-4 text-sm text-gray-600">{ev.event_class || "—"}</td>
                        <td className="p-4 text-sm text-gray-600">{ev.priest_name || "—"}</td>
                        <td className="p-4 text-sm text-gray-600">{ev.location || "—"}</td>
                        <td className="p-4"><StatusBadge status={ev.status || "Active"} /></td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => setSelectedEvent(ev)} className="text-[#B59E74] hover:text-[#9c8760] text-xs font-bold uppercase tracking-widest px-3 py-2 rounded hover:bg-[#B59E74]/10 transition-colors">View</button>
                            {(ev.status || "Active") !== "Cancelled" && <button onClick={() => openCancelEventModal(ev)} className="text-orange-600 hover:text-white hover:bg-orange-600 text-xs font-bold uppercase tracking-widest px-3 py-2 rounded bg-orange-50 transition-colors">Cancel</button>}
                            {(ev.status || "Active") === "Cancelled" && <button onClick={() => setDeletingEvent(ev)} className="text-red-600 hover:text-white hover:bg-red-600 text-xs font-bold uppercase tracking-widest px-3 py-2 rounded bg-red-50 transition-colors">Delete</button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!eventsLoading && (
              <div className="md:hidden space-y-3 animate-fade-in">
                {eventsPageData.map((ev) => (
                  <div key={ev.id} className="border border-gray-100 rounded-2xl p-4 bg-white shadow-sm">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0 flex-1"><p className="text-[10px] uppercase tracking-widest text-gray-400">Title</p><p className="font-serif text-gray-800 font-medium text-base break-words">{ev.title || "—"}</p></div>
                      <StatusBadge status={ev.status || "Active"} />
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-2 mb-4">
                      <div className="min-w-0"><p className="text-[10px] uppercase tracking-widest text-gray-400">Date</p><p className="text-sm text-gray-700 break-words">{formatDate(ev.event_date) || "—"}</p></div>
                      <div className="min-w-0"><p className="text-[10px] uppercase tracking-widest text-gray-400">Time</p><p className="text-sm text-gray-700 break-words">{ev.event_time || "—"}</p></div>
                      <div className="min-w-0"><p className="text-[10px] uppercase tracking-widest text-gray-400">Class</p><p className="text-sm text-gray-700 break-words">{ev.event_class || "—"}</p></div>
                      <div className="min-w-0"><p className="text-[10px] uppercase tracking-widest text-gray-400">Hosted By</p><p className="text-sm text-gray-700 break-words">{ev.priest_name || "—"}</p></div>
                      <div className="col-span-2 min-w-0"><p className="text-[10px] uppercase tracking-widest text-gray-400">Location</p><p className="text-sm text-gray-700 break-words">{ev.location || "—"}</p></div>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-50">
                      <button onClick={() => setSelectedEvent(ev)} className="flex-1 min-w-[100px] py-2.5 rounded-lg border border-[#B59E74]/40 text-[#B59E74] hover:bg-[#B59E74]/10 text-xs font-bold uppercase tracking-widest transition-all">View</button>
                      {(ev.status || "Active") !== "Cancelled" && <button onClick={() => openCancelEventModal(ev)} className="flex-1 min-w-[100px] py-2.5 rounded-lg bg-orange-50 text-orange-700 hover:bg-orange-600 hover:text-white text-xs font-bold uppercase tracking-widest transition-all">Cancel</button>}
                      {(ev.status || "Active") === "Cancelled" && <button onClick={() => setDeletingEvent(ev)} className="flex-1 min-w-[100px] py-2.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-600 hover:text-white text-xs font-bold uppercase tracking-widest transition-all">Delete</button>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!eventsLoading && eventsTotal === 0 && (
              <div className="text-center py-16 md:py-20 text-gray-400 italic font-serif">
                {eventsTrimmedQuery ? `No events match "${eventsSearchQuery.trim()}".` : eventsFilter === "Upcoming" ? "No upcoming events." : eventsFilter === "Past" ? "No past events." : eventsFilter === "Cancelled" ? "No cancelled events." : "No events found."}
              </div>
            )}

            {!eventsLoading && eventsTotal > 0 && (
              <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-xs text-gray-500 font-medium tracking-wide">
                  Showing <span className="font-bold text-gray-700">{eventsPageStart + 1}</span>–<span className="font-bold text-gray-700">{eventsPageEnd}</span> of <span className="font-bold text-gray-700">{eventsTotal}</span>{eventsTrimmedQuery ? " (filtered)" : ""}
                </p>
                <div className="flex items-center justify-center gap-2">
                  <button type="button" onClick={() => setEventsCurrentPage(1)} disabled={eventsSafePage === 1} className="px-3 py-2 text-xs font-bold uppercase tracking-widest rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors" aria-label="First page">«</button>
                  <button type="button" onClick={() => setEventsCurrentPage((p) => Math.max(1, p - 1))} disabled={eventsSafePage === 1} className="px-3 py-2 text-xs font-bold uppercase tracking-widest rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Prev</button>
                  <span className="px-3 py-2 text-xs font-bold tracking-widest text-gray-700">Page {eventsSafePage} / {eventsTotalPages}</span>
                  <button type="button" onClick={() => setEventsCurrentPage((p) => Math.min(eventsTotalPages, p + 1))} disabled={eventsSafePage === eventsTotalPages} className="px-3 py-2 text-xs font-bold uppercase tracking-widest rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Next</button>
                  <button type="button" onClick={() => setEventsCurrentPage(eventsTotalPages)} disabled={eventsSafePage === eventsTotalPages} className="px-3 py-2 text-xs font-bold uppercase tracking-widest rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors" aria-label="Last page">»</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── MODALS ─────────────────────────────────────────────────────────── */}

      {/* ACCEPT */}
      {acceptingRequest && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up">
            <div className="bg-green-50 px-8 py-6 border-b border-green-100">
              <h2 className="text-xl font-serif text-green-800 font-medium uppercase tracking-widest">Approve Request</h2>
              <p className="text-sm text-green-700 italic">For {resolveConfigFor(acceptingRequest).title(acceptingRequest)}</p>
            </div>
            <div className="p-8 space-y-6">
              <div className="bg-gray-50 rounded-2xl p-4 text-sm text-gray-600 space-y-1 border border-gray-100">
                <div><span className="text-gray-400 uppercase text-[10px] tracking-widest mr-2">Tab</span>{resolveTabFor(acceptingRequest)}</div>
              </div>
              {resolveConfigFor(acceptingRequest).isSacrament && (
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Assigned Priest</label>
                  <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50 text-sm text-gray-700 font-medium">
                    {acceptingRequest.preferred_priest || <span className="text-gray-400 italic">No priest assigned by staff yet</span>}
                  </div>
                  <p className="text-xs text-gray-400 italic">Assigned by staff — this priest will host the event on the parish calendar.</p>
                </div>
              )}
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-700 font-serif">
                ℹ️ The <strong>parishioner</strong> will be notified that their request has been fully approved by the parish admin.
              </div>
              <div className="flex gap-3">
                <button onClick={closeAcceptModal} disabled={acceptSubmitting} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-500 font-bold text-xs uppercase tracking-widest hover:bg-gray-50 transition-all disabled:opacity-50">Cancel</button>
                <button onClick={confirmAccept} disabled={acceptSubmitting} className="flex-1 py-3 rounded-xl bg-green-600 text-white font-bold text-xs uppercase tracking-widest hover:bg-green-700 transition-all shadow-lg shadow-green-200 disabled:opacity-50 disabled:cursor-not-allowed">
                  {acceptSubmitting ? "Approving…" : resolveConfigFor(acceptingRequest).isSacrament ? "Approve & Schedule" : "Approve"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REJECT */}
      {rejectingRequest && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up">
            <div className="bg-red-50 px-8 py-6 border-b border-red-100">
              <h2 className="text-xl font-serif text-red-800 font-medium uppercase tracking-widest">Reject Request</h2>
              <p className="text-sm text-red-600 italic">For {activeConfig.title(rejectingRequest)}</p>
            </div>
            <div className="p-8 space-y-6">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Reason for Rejection</label>
                <textarea className="p-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-red-500 outline-none h-32 text-sm resize-none" placeholder="Please specify why this request cannot be approved..." value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} />
              </div>
              <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-700 font-serif">
                ℹ️ The <strong>parishioner</strong> will be notified of this rejection and the reason provided.
              </div>
              <div className="flex gap-3">
                <button onClick={closeRejectModal} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-500 font-bold text-xs uppercase tracking-widest hover:bg-gray-50 transition-all">Cancel</button>
                <button onClick={confirmReject} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold text-xs uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-200">Confirm Rejection</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL */}
      {cancellingRequest && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up">
            <div className="bg-orange-50 px-6 sm:px-8 py-6 border-b border-orange-100">
              <h2 className="text-xl font-serif text-orange-800 font-medium uppercase tracking-widest">Cancel Request</h2>
              <p className="text-sm text-orange-700 italic">For {activeConfig.title(cancellingRequest)}</p>
            </div>
            <div className="p-6 sm:p-8 space-y-6">
              <p className="text-sm text-gray-600">This request is currently <span className="font-bold">Approved</span>. Cancelling will mark it as <span className="font-bold">Cancelled</span> and record your reason.</p>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Reason for Cancellation *</label>
                <textarea className="p-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-orange-500 outline-none h-32 text-sm resize-none" placeholder="Please specify why this approved request needs to be cancelled..." value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
              </div>
              <div className="flex gap-3">
                <button onClick={closeCancelModal} disabled={cancelSubmitting} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-500 font-bold text-xs uppercase tracking-widest hover:bg-gray-50 transition-all disabled:opacity-50">Keep Approved</button>
                <button onClick={confirmCancel} disabled={cancelSubmitting || !cancelReason.trim()} className="flex-1 py-3 rounded-xl bg-orange-600 text-white font-bold text-xs uppercase tracking-widest hover:bg-orange-700 transition-all shadow-lg shadow-orange-200 disabled:opacity-50 disabled:cursor-not-allowed">
                  {cancelSubmitting ? "Cancelling…" : "Confirm Cancellation"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE REQUEST */}
      {deletingRequest && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up">
            <div className="bg-red-50 px-6 sm:px-8 py-6 border-b border-red-100">
              <h2 className="text-xl font-serif text-red-800 font-medium uppercase tracking-widest">Delete Request</h2>
              <p className="text-sm text-red-700 italic">For {activeConfig.title(deletingRequest)}</p>
            </div>
            <div className="p-6 sm:p-8 space-y-6">
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-800 space-y-2">
                <p className="font-bold uppercase tracking-wider text-xs">⚠ Warning — this cannot be undone</p>
                <p>This will permanently remove the record from the <span className="font-mono font-bold">{resolveConfigFor(deletingRequest)?.table || "database"}</span> table.</p>
              </div>
              <p className="text-sm text-gray-600">If you want to keep a record of this request, leave it in its current list instead.</p>
              <div className="flex gap-3">
                <button onClick={closeDeleteModal} disabled={deleteSubmitting} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-500 font-bold text-xs uppercase tracking-widest hover:bg-gray-50 transition-all disabled:opacity-50">Keep Record</button>
                <button onClick={confirmDelete} disabled={deleteSubmitting} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold text-xs uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-200 disabled:opacity-50 disabled:cursor-not-allowed">
                  {deleteSubmitting ? "Deleting…" : "Delete Permanently"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW DETAILS */}
      {selectedRequest && <DetailsModal request={selectedRequest} tabName={selectedRequest._tab || activeTab} onClose={() => setSelectedRequest(null)} />}

      {/* EVENT DETAILS */}
      {selectedEvent && <DetailsModal request={selectedEvent} tabName="Parish Event" onClose={() => setSelectedEvent(null)} />}

      {/* CANCEL EVENT */}
      {cancellingEvent && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up">
            <div className="bg-orange-50 px-6 sm:px-8 py-6 border-b border-orange-100">
              <h2 className="text-xl font-serif text-orange-800 font-medium uppercase tracking-widest">Cancel Event</h2>
              <p className="text-sm text-orange-700 italic">{cancellingEvent.title || "Untitled event"}</p>
            </div>
            <div className="p-6 sm:p-8 space-y-6">
              <p className="text-sm text-gray-600">Cancelling marks this event as <span className="font-bold">Cancelled</span> on the parish calendar.</p>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Reason for Cancellation *</label>
                <textarea className="p-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-orange-500 outline-none h-32 text-sm resize-none" placeholder="Please specify why this event is being cancelled..." value={eventCancelReason} onChange={(e) => setEventCancelReason(e.target.value)} />
              </div>
              <div className="flex gap-3">
                <button onClick={closeCancelEventModal} disabled={cancelEventSubmitting} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-500 font-bold text-xs uppercase tracking-widest hover:bg-gray-50 transition-all disabled:opacity-50">Keep Active</button>
                <button onClick={confirmCancelEvent} disabled={cancelEventSubmitting || !eventCancelReason.trim()} className="flex-1 py-3 rounded-xl bg-orange-600 text-white font-bold text-xs uppercase tracking-widest hover:bg-orange-700 transition-all shadow-lg shadow-orange-200 disabled:opacity-50 disabled:cursor-not-allowed">
                  {cancelEventSubmitting ? "Cancelling…" : "Confirm Cancellation"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE EVENT */}
      {deletingEvent && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up">
            <div className="bg-red-50 px-6 sm:px-8 py-6 border-b border-red-100">
              <h2 className="text-xl font-serif text-red-800 font-medium uppercase tracking-widest">Delete Event</h2>
              <p className="text-sm text-red-700 italic">{deletingEvent.title || "Untitled event"}</p>
            </div>
            <div className="p-6 sm:p-8 space-y-6">
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-800 space-y-2">
                <p className="font-bold uppercase tracking-wider text-xs">⚠ Warning — this cannot be undone</p>
                <p>This will permanently remove the event from the parish calendar.</p>
              </div>
              <p className="text-sm text-gray-600">If the event was created from an approved sacrament request, the source request will not be affected — only the calendar entry is removed.</p>
              <div className="flex gap-3">
                <button onClick={closeDeleteEventModal} disabled={deleteEventSubmitting} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-500 font-bold text-xs uppercase tracking-widest hover:bg-gray-50 transition-all disabled:opacity-50">Keep Event</button>
                <button onClick={confirmDeleteEvent} disabled={deleteEventSubmitting} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold text-xs uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-200 disabled:opacity-50 disabled:cursor-not-allowed">
                  {deleteEventSubmitting ? "Deleting…" : "Delete Permanently"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// HELPERS
// ----------------------------------------------------------------------------
function StatCard({ label, count, active, onClick }) {
  return (
    <button onClick={onClick} type="button" className={`text-left bg-white p-5 rounded-2xl shadow-sm border flex flex-col gap-2 relative overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5 ${active ? "border-[#B59E74] ring-2 ring-[#B59E74]/20" : "border-gray-100"}`}>
      <div className="absolute top-0 left-0 w-1 h-full bg-[#B59E74]"></div>
      <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest leading-snug">{label}</h3>
      <div className="flex items-baseline gap-2">
        <p className="text-3xl text-gray-800 font-serif">{count}</p>
        {count > 0 && <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest">{count === 1 ? "1 new" : `${count} new`}</span>}
      </div>
    </button>
  );
}

function StatusBadge({ status }) {
  const cls =
    status === "Pending"        ? "bg-yellow-100 text-yellow-700" :
    status === "Staff Approved" ? "bg-blue-100 text-blue-700"     :
    status === "Approved"       ? "bg-green-100 text-green-700"   :
    status === "Active"         ? "bg-emerald-100 text-emerald-700":
    status === "Cancelled"      ? "bg-orange-100 text-orange-700" :
                                  "bg-red-100 text-red-700";
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${cls}`}>{status}</span>
  );
}

const HIDDEN_FIELDS = new Set(["id","created_at","user_id","declaration_consent","_tab","_config"]);

function humanizeKey(key) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatValue(key, val) {
  if (val == null || val === "") return null;
  if (typeof val === "boolean") return val ? "Yes" : "No";
  if (key.match(/_date|_dob$/i) || key === "preferred_date" || key === "wedding_date") {
    try { const d = new Date(val); if (!isNaN(d)) return d.toLocaleDateString(); } catch { /* ignore */ }
  }
  return String(val);
}

function DetailsModal({ request, tabName, onClose }) {
  const entries = Object.entries(request)
    .filter(([k, v]) => !HIDDEN_FIELDS.has(k) && v !== null && v !== "" && v !== false)
    .map(([k, v]) => [k, formatValue(k, v)])
    .filter(([, v]) => v !== null);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl relative scrollbar-hidden">
        <div className="sticky top-0 bg-white px-8 py-6 z-10 flex justify-between items-center border-b border-gray-100">
          <div>
            <h2 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest">{tabName} Request Details</h2>
            <h1 className="text-2xl font-serif text-gray-800 mt-1">Request #{String(request.id).slice(0, 8)}</h1>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-600">✕</button>
        </div>
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
            {entries.map(([key, val]) => (
              <div key={key} className={key === "additional_notes" || key === "notes" || key === "request_details" || key === "intention_detail" || key === "rejection_remarks" ? "md:col-span-2" : ""}>
                <p className="text-xs uppercase tracking-widest text-gray-400">{humanizeKey(key)}</p>
                <p className="text-gray-800 font-medium mt-1 whitespace-pre-wrap break-words">{val}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;