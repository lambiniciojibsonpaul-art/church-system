import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { restSelect, restUpdate, restInsert, restDelete } from "../supabaseRest";
import { useAuth } from "../contexts/useAuth";
import { sendApprovalEmail } from "../emailNotifications";

const QUERY_TIMEOUT_MS = 12000;
const PRIEST_OPTIONS = ["Priest 1", "Priest 2", "Priest 3"];

// ----------------------------------------------------------------------------
// TAB CONFIG
// One entry per request type. Each entry tells the dashboard:
//   - which DB table to fetch
//   - how to render the row in the listing table (columns)
//   - whether a priest assignment is required on approval (sacraments yes,
//     facilities/certifications no)
//   - how to label the request in the accept modal ("title" function)
// ----------------------------------------------------------------------------
const TAB_CONFIG = {
  Baptisms: {
    table: "baptisms",
    isSacrament: true,
    title: (r) => `${r.child_first_name || ""} ${r.child_last_name || ""}`.trim() || "Baptism",
    columns: [
      { label: "Child's Name", value: (r) => `${r.child_first_name || ""} ${r.child_last_name || ""}`.trim() },
      { label: "Type", value: (r) => r.baptism_type },
      { label: "Pref. Date", value: (r) => formatDate(r.preferred_date) },
      { label: "Submitter", value: (r) => r.submitter_signature || r.submitter_name },
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
      is_inside: true,
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
      { label: "Submitter", value: (r) => r.submitter_signature },
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
      is_inside: true,
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
      { label: "Submitter", value: (r) => r.submitter_signature },
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
      is_inside: true,
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
      { label: "Submitter", value: (r) => r.submitter_signature },
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
      is_inside: true,
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
      { label: "Submitter", value: (r) => r.submitter_signature || r.full_name },
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
      is_inside: true,
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
      { label: "Submitter", value: (r) => r.submitter_signature || r.requested_by },
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
      is_inside: false,
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
      { label: "Submitter", value: (r) => r.submitter_signature || `${r.requestor_first_name || ""} ${r.requestor_surname || ""}`.trim() },
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
      { label: "Submitter", value: (r) => r.submitter_signature || `${r.requestor_first_name || ""} ${r.requestor_surname || ""}`.trim() },
    ],
  },
};

const TAB_NAMES = Object.keys(TAB_CONFIG);

function formatDate(d) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return "";
  }
}

// ----------------------------------------------------------------------------
// COMPONENT
// ----------------------------------------------------------------------------
function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  // requests is keyed by tab name, value is array of records.
  const [requests, setRequests] = useState(
    Object.fromEntries(TAB_NAMES.map((t) => [t, []]))
  );
  const [activeTab, setActiveTab] = useState("Baptisms");
  const [activeSubTab, setActiveSubTab] = useState("Pending");

  // Search + pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // View modal
  const [selectedRequest, setSelectedRequest] = useState(null);

  // Reject modal
  const [rejectingRequest, setRejectingRequest] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Accept modal
  const [acceptingRequest, setAcceptingRequest] = useState(null);
  const [assignedPriest, setAssignedPriest] = useState("");
  const [acceptSubmitting, setAcceptSubmitting] = useState(false);

  // Cancel modal
  const [cancellingRequest, setCancellingRequest] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  // Delete modal (cancelled requests only — hard-deletes the row)
  const [deletingRequest, setDeletingRequest] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Fetch all 8 tables in parallel on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const entries = Object.entries(TAB_CONFIG);
      const results = await Promise.allSettled(
        entries.map(([, cfg]) =>
          restSelect(cfg.table, {
            order: "created_at.desc",
            timeoutMs: QUERY_TIMEOUT_MS,
          })
        )
      );
      if (cancelled) return;

      const merged = {};
      entries.forEach(([tabName], idx) => {
        const r = results[idx];
        if (r.status === "fulfilled" && r.value?.data) {
          merged[tabName] = r.value.data;
        } else {
          merged[tabName] = [];
          if (r.status === "fulfilled" && r.value?.error) {
            console.warn(`[AdminDashboard] ${tabName} fetch error:`, r.value.error.message);
          }
        }
      });
      setRequests(merged);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ----------------------- Derived values -----------------------
  const activeConfig = TAB_CONFIG[activeTab];
  const activeData = requests[activeTab] || [];
  const statusFiltered =
    activeSubTab === "All"
      ? activeData
      : activeData.filter((r) => r.status === activeSubTab);
  const trimmedQuery = searchQuery.trim().toLowerCase();
  const filteredData = trimmedQuery
    ? statusFiltered.filter((r) =>
        activeConfig.columns.some((col) => {
          const v = col.value(r);
          return v && String(v).toLowerCase().includes(trimmedQuery);
        })
      )
    : statusFiltered;
  const totalRecords = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, totalRecords);
  const pageData = filteredData.slice(pageStart, pageEnd);
  const pendingCount = (tab) =>
    (requests[tab] || []).filter((r) => r.status === "Pending").length;
  const totalPending = TAB_NAMES.reduce((sum, t) => sum + pendingCount(t), 0);

  // Reset to page 1 whenever the visible slice could shift.
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, activeSubTab, searchQuery, pageSize]);

  // ----------------------- Accept handlers -----------------------
  const openAcceptModal = (req) => {
    setAcceptingRequest(req);
    setAssignedPriest("");
  };
  const closeAcceptModal = () => {
    setAcceptingRequest(null);
    setAssignedPriest("");
    setAcceptSubmitting(false);
  };

  const confirmAccept = async () => {
    if (!acceptingRequest) return;
    if (activeConfig.isSacrament && !assignedPriest) {
      alert("Please assign a priest before approving.");
      return;
    }

    setAcceptSubmitting(true);

    // 1. Update request status to Approved.
    const { error: updateErr } = await restUpdate(
      activeConfig.table,
      { id: acceptingRequest.id },
      { status: "Approved" }
    );
    if (updateErr) {
      setAcceptSubmitting(false);
      alert("Error approving request: " + updateErr.message);
      return;
    }

    // 2. For sacraments, also create a calendar event with the priest.
    if (activeConfig.isSacrament && activeConfig.eventBuilder) {
      const eventPayload = {
        ...activeConfig.eventBuilder(
          acceptingRequest,
          assignedPriest,
          user?.id || null
        ),
        source_table: activeConfig.table,
        source_id: acceptingRequest.id,
      };
      if (eventPayload?.event_date) {
        const { error: eventErr } = await restInsert("events", [eventPayload]);
        if (eventErr) {
          console.warn("[AdminDashboard] event creation failed:", eventErr.message);
          alert(
            "Request approved, but the calendar event could not be created: " +
              eventErr.message +
              "\n\nYou can add it manually from the Schedules page."
          );
        }
      }
    }

    // 3. Approval email.
    if (acceptingRequest.submitter_email) {
      sendApprovalEmail({
        to: acceptingRequest.submitter_email,
        serviceName: activeTab.toLowerCase(),
        eventDate: formatDate(
          acceptingRequest.preferred_date ||
            acceptingRequest.wedding_date ||
            acceptingRequest.date_of_confirmation ||
            acceptingRequest.date_of_communion ||
            acceptingRequest.start_date ||
            acceptingRequest.request_date
        ),
        eventTime:
          acceptingRequest.preferred_time ||
          acceptingRequest.wedding_time ||
          acceptingRequest.time_of_confirmation ||
          acceptingRequest.time_of_communion ||
          acceptingRequest.start_time ||
          "",
        location: acceptingRequest.location || "Parish",
        priestName: assignedPriest,
      });
    }

    // 4. Sync local state.
    setRequests((prev) => ({
      ...prev,
      [activeTab]: prev[activeTab].map((r) =>
        r.id === acceptingRequest.id ? { ...r, status: "Approved" } : r
      ),
    }));
    closeAcceptModal();
  };

  // ----------------------- Reject handlers -----------------------
  const openRejectModal = (req) => {
    setRejectingRequest(req);
    setRejectionReason("");
  };
  const closeRejectModal = () => {
    setRejectingRequest(null);
    setRejectionReason("");
  };

  const confirmReject = async () => {
    if (!rejectingRequest) return;
    if (!rejectionReason.trim()) {
      alert("Please provide a reason for rejection.");
      return;
    }
    const { error } = await restUpdate(
      activeConfig.table,
      { id: rejectingRequest.id },
      { status: "Rejected", rejection_remarks: rejectionReason }
    );
    if (error) {
      alert("Error rejecting request: " + error.message);
      return;
    }
    setRequests((prev) => ({
      ...prev,
      [activeTab]: prev[activeTab].map((r) =>
        r.id === rejectingRequest.id
          ? { ...r, status: "Rejected", rejection_remarks: rejectionReason }
          : r
      ),
    }));
    closeRejectModal();
  };

  // ----------------------- Cancel handlers -----------------------
  const openCancelModal = (req) => {
    setCancellingRequest(req);
    setCancelReason("");
  };
  const closeCancelModal = () => {
    setCancellingRequest(null);
    setCancelReason("");
    setCancelSubmitting(false);
  };

  const confirmCancel = async () => {
    if (!cancellingRequest) return;
    if (!cancelReason.trim()) {
      alert("Please provide a reason for cancellation.");
      return;
    }
    setCancelSubmitting(true);
    const { error } = await restUpdate(
      activeConfig.table,
      { id: cancellingRequest.id },
      { status: "Cancelled", rejection_remarks: cancelReason }
    );
    if (error) {
      setCancelSubmitting(false);
      alert("Error cancelling request: " + error.message);
      return;
    }

    // Remove the calendar event created at approval time, if any.
    // 1. Try the source-id link (works for events created after the migration).
    // 2. Fall back to event_class + event_date + title — covers legacy events
    //    approved before source_table/source_id existed, or cases where the
    //    columns were never added.
    if (activeConfig.isSacrament) {
      let removed = 0;
      const { data: bySource, error: srcErr } = await restDelete("events", {
        source_table: activeConfig.table,
        source_id: cancellingRequest.id,
      });
      if (!srcErr && Array.isArray(bySource)) removed = bySource.length;

      if (removed === 0 && activeConfig.eventBuilder) {
        const legacy = activeConfig.eventBuilder(cancellingRequest, "", null);
        if (legacy?.event_date && legacy?.event_class && legacy?.title) {
          const { data: byHeur, error: heurErr } = await restDelete("events", {
            event_class: legacy.event_class,
            event_date: legacy.event_date,
            title: legacy.title,
          });
          if (heurErr) {
            console.warn("[AdminDashboard] legacy event delete failed:", heurErr.message);
          } else if (Array.isArray(byHeur)) {
            removed = byHeur.length;
          }
        }
      }

      if (removed === 0) {
        console.warn(
          "[AdminDashboard] no calendar event matched this cancellation",
          srcErr ? `(source delete error: ${srcErr.message})` : ""
        );
      }
    }

    setRequests((prev) => ({
      ...prev,
      [activeTab]: prev[activeTab].map((r) =>
        r.id === cancellingRequest.id
          ? { ...r, status: "Cancelled", rejection_remarks: cancelReason }
          : r
      ),
    }));
    closeCancelModal();
  };

  // ----------------------- Delete handlers -----------------------
  const openDeleteModal = (req) => setDeletingRequest(req);
  const closeDeleteModal = () => {
    setDeletingRequest(null);
    setDeleteSubmitting(false);
  };

  const confirmDelete = async () => {
    if (!deletingRequest) return;
    setDeleteSubmitting(true);
    const { error } = await restDelete(activeConfig.table, {
      id: deletingRequest.id,
    });
    if (error) {
      setDeleteSubmitting(false);
      alert("Error deleting request: " + error.message);
      return;
    }
    setRequests((prev) => ({
      ...prev,
      [activeTab]: prev[activeTab].filter((r) => r.id !== deletingRequest.id),
    }));
    closeDeleteModal();
  };

  // ----------------------- Render -----------------------
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
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-serif text-[#B59E74] mb-2 uppercase tracking-wide">
              Parish Dashboard
            </h1>
            <p className="text-gray-500 font-serif italic">
              Welcome back. You are logged in as{" "}
              <span className="font-semibold not-italic">{user?.email}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => navigate("/admin/manage-users")} className="flex items-center justify-center gap-2 bg-[#B59E74] hover:bg-[#9c8760] text-white px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-md active:scale-95">
              <span>👤</span> Staff
            </button>
            <button onClick={() => navigate("/admin/reports")} className="flex items-center justify-center gap-2 bg-white border-2 border-[#B59E74] text-[#B59E74] px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-sm hover:bg-[#B59E74] hover:text-white active:scale-95">
              <span>📊</span> Reports
            </button>
            <button onClick={() => navigate("/admin/attendance-list")} className="flex items-center justify-center gap-2 bg-white border-2 border-[#B59E74] text-[#B59E74] px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-sm hover:bg-[#B59E74] hover:text-white active:scale-95">
              <span>👥</span> Attendance
            </button>
            <button onClick={() => navigate("/admin/qr-generator")} className="flex items-center justify-center gap-2 bg-white border-2 border-[#B59E74] text-[#B59E74] px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-sm hover:bg-[#B59E74] hover:text-white active:scale-95">
              <span>🔳</span> QR Codes
            </button>
          </div>
        </div>

        {/* Total pending banner */}
        <div className="mb-6 bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#B59E74]"></div>
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
              Total Pending Across All Forms
            </h3>
            <p className="text-3xl text-gray-800 font-serif mt-1">{totalPending}</p>
          </div>
          <div className="text-4xl text-[#B59E74]/30">📋</div>
        </div>

        {/* Stat cards — one per form (8 cards, clickable to jump to tab) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {TAB_NAMES.map((tab) => (
            <StatCard
              key={tab}
              label={`Pending ${tab}`}
              count={pendingCount(tab)}
              active={activeTab === tab}
              onClick={() => {
                setActiveTab(tab);
                setActiveSubTab("Pending");
              }}
            />
          ))}
        </div>

        {/* Tabs container */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden min-h-[500px]">
          {/* Request-type selector (dropdown) */}
          <div className="border-b border-gray-100 bg-gray-50/50 px-4 sm:px-6 py-4 md:py-5 flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">
                Viewing:
              </label>
              <div className="relative flex-1 md:flex-none">
                <select
                  value={activeTab}
                  onChange={(e) => {
                    setActiveTab(e.target.value);
                    setActiveSubTab("Pending");
                  }}
                  className="appearance-none w-full pl-4 pr-12 py-3 rounded-xl bg-white border-2 border-[#B59E74]/40 hover:border-[#B59E74] focus:outline-none focus:ring-2 focus:ring-[#B59E74] text-sm font-bold uppercase tracking-widest text-[#B59E74] cursor-pointer transition-colors md:min-w-[260px]"
                >
                  {TAB_NAMES.map((tab) => {
                    const count = pendingCount(tab);
                    return (
                      <option key={tab} value={tab}>
                        {tab}{count > 0 ? `  •  ${count} pending` : ""}
                      </option>
                    );
                  })}
                </select>
                {/* Custom chevron */}
                <svg
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B59E74]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {pendingCount(activeTab) > 0 && (
              <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-red-600">
                <span className="inline-flex items-center justify-center w-6 h-6 text-[11px] text-white bg-red-500 rounded-full">
                  {pendingCount(activeTab)}
                </span>
                pending request{pendingCount(activeTab) === 1 ? "" : "s"} in this tab
              </span>
            )}
          </div>

          <div className="p-4 sm:p-6 md:p-8">
            {/* Sub-tabs */}
            <div className="flex justify-center gap-1 sm:gap-3 mb-6 md:mb-8 p-1.5 sm:p-2 bg-[#F6F5ED] rounded-full w-full sm:w-fit mx-auto border border-gray-100">
              {["All", "Pending", "Approved", "Rejected", "Cancelled"].map((sub) => (
                <button
                  key={sub}
                  onClick={() => setActiveSubTab(sub)}
                  className={`flex-1 sm:flex-none px-3 sm:px-6 py-2 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-tighter transition-all ${
                    activeSubTab === sub
                      ? "bg-[#B59E74] text-white shadow-md"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <span className="sm:hidden">{sub}</span>
                  <span className="hidden sm:inline">{sub} Requests</span>
                </button>
              ))}
            </div>

            {/* Search + page size */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
              <div className="relative flex-1">
                <svg
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m1.85-5.4a7.25 7.25 0 11-14.5 0 7.25 7.25 0 0114.5 0z" />
                </svg>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search ${activeTab.toLowerCase()}…`}
                  className="w-full pl-11 pr-10 py-3 rounded-xl bg-white border-2 border-gray-200 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] focus:border-[#B59E74] text-sm transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                    aria-label="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">
                  Show
                </label>
                <div className="relative">
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="appearance-none pl-4 pr-10 py-3 rounded-xl bg-white border-2 border-gray-200 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] text-sm font-bold text-gray-700 cursor-pointer transition-colors"
                  >
                    {[5, 10, 25].map((n) => (
                      <option key={n} value={n}>{n} rows</option>
                    ))}
                  </select>
                  <svg
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Table (desktop) */}
            <div className="hidden md:block overflow-x-auto animate-fade-in">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-100 text-xs text-gray-500 uppercase tracking-widest">
                    {activeConfig.columns.map((col) => (
                      <th key={col.label} className="p-4 font-bold">
                        {col.label}
                      </th>
                    ))}
                    <th className="p-4 font-bold">Status</th>
                    <th className="p-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageData.map((req) => (
                    <tr
                      key={req.id}
                      className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                    >
                      {activeConfig.columns.map((col, i) => (
                        <td
                          key={col.label}
                          className={`p-4 text-sm ${
                            i === 0
                              ? "font-serif text-gray-800 font-medium"
                              : "text-gray-600"
                          }`}
                        >
                          {col.value(req) || "—"}
                        </td>
                      ))}
                      <td className="p-4">
                        <StatusBadge status={req.status} />
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          {req.status === "Pending" && (
                            <>
                              <button
                                onClick={() => openAcceptModal(req)}
                                className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-600 hover:text-white transition-all"
                                title="Accept"
                              >
                                <span className="font-bold">✓</span>
                              </button>
                              <button
                                onClick={() => openRejectModal(req)}
                                className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all"
                                title="Reject"
                              >
                                <span className="font-bold">✕</span>
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => setSelectedRequest(req)}
                            className="text-[#B59E74] hover:text-[#9c8760] text-xs font-bold uppercase tracking-widest px-3 py-2 rounded hover:bg-[#B59E74]/10 transition-colors"
                          >
                            View
                          </button>
                          {req.status === "Approved" && (
                            <button
                              onClick={() => openCancelModal(req)}
                              className="text-orange-600 hover:text-white hover:bg-orange-600 text-xs font-bold uppercase tracking-widest px-3 py-2 rounded bg-orange-50 transition-colors"
                            >
                              Cancel
                            </button>
                          )}
                          {(req.status === "Cancelled" || req.status === "Rejected") && (
                            <button
                              onClick={() => openDeleteModal(req)}
                              className="text-red-600 hover:text-white hover:bg-red-600 text-xs font-bold uppercase tracking-widest px-3 py-2 rounded bg-red-50 transition-colors"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Card list (mobile) */}
            <div className="md:hidden space-y-3 animate-fade-in">
              {pageData.map((req) => {
                const [primaryCol, ...restCols] = activeConfig.columns;
                return (
                  <div
                    key={req.id}
                    className="border border-gray-100 rounded-2xl p-4 bg-white shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] uppercase tracking-widest text-gray-400">
                          {primaryCol.label}
                        </p>
                        <p className="font-serif text-gray-800 font-medium text-base break-words">
                          {primaryCol.value(req) || "—"}
                        </p>
                      </div>
                      <StatusBadge status={req.status} />
                    </div>

                    <div className="grid grid-cols-2 gap-x-3 gap-y-2 mb-4">
                      {restCols.map((col) => (
                        <div key={col.label} className="min-w-0">
                          <p className="text-[10px] uppercase tracking-widest text-gray-400">
                            {col.label}
                          </p>
                          <p className="text-sm text-gray-700 break-words">
                            {col.value(req) || "—"}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-50">
                      {req.status === "Pending" && (
                        <>
                          <button
                            onClick={() => openAcceptModal(req)}
                            className="flex-1 min-w-[100px] py-2.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-600 hover:text-white text-xs font-bold uppercase tracking-widest transition-all"
                          >
                            ✓ Accept
                          </button>
                          <button
                            onClick={() => openRejectModal(req)}
                            className="flex-1 min-w-[100px] py-2.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-600 hover:text-white text-xs font-bold uppercase tracking-widest transition-all"
                          >
                            ✕ Reject
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setSelectedRequest(req)}
                        className="flex-1 min-w-[100px] py-2.5 rounded-lg border border-[#B59E74]/40 text-[#B59E74] hover:bg-[#B59E74]/10 text-xs font-bold uppercase tracking-widest transition-all"
                      >
                        View
                      </button>
                      {req.status === "Approved" && (
                        <button
                          onClick={() => openCancelModal(req)}
                          className="flex-1 min-w-[100px] py-2.5 rounded-lg bg-orange-50 text-orange-700 hover:bg-orange-600 hover:text-white text-xs font-bold uppercase tracking-widest transition-all"
                        >
                          Cancel
                        </button>
                      )}
                      {(req.status === "Cancelled" || req.status === "Rejected") && (
                        <button
                          onClick={() => openDeleteModal(req)}
                          className="flex-1 min-w-[100px] py-2.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-600 hover:text-white text-xs font-bold uppercase tracking-widest transition-all"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {totalRecords === 0 && (
              <div className="text-center py-16 md:py-20 text-gray-400 italic font-serif">
                {trimmedQuery
                  ? `No requests match "${searchQuery.trim()}"${
                      activeSubTab === "All" ? "" : ` in ${activeSubTab.toLowerCase()}`
                    }.`
                  : activeSubTab === "All"
                  ? "No requests found."
                  : `No ${activeSubTab.toLowerCase()} requests found.`}
              </div>
            )}

            {/* Pagination footer */}
            {totalRecords > 0 && (
              <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-xs text-gray-500 font-medium tracking-wide">
                  Showing <span className="font-bold text-gray-700">{pageStart + 1}</span>–
                  <span className="font-bold text-gray-700">{pageEnd}</span> of{" "}
                  <span className="font-bold text-gray-700">{totalRecords}</span>
                  {trimmedQuery ? " (filtered)" : ""}
                </p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(1)}
                    disabled={safePage === 1}
                    className="px-3 py-2 text-xs font-bold uppercase tracking-widest rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    aria-label="First page"
                  >
                    «
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    className="px-3 py-2 text-xs font-bold uppercase tracking-widest rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Prev
                  </button>
                  <span className="px-3 py-2 text-xs font-bold tracking-widest text-gray-700">
                    Page {safePage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
                    className="px-3 py-2 text-xs font-bold uppercase tracking-widest rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={safePage === totalPages}
                    className="px-3 py-2 text-xs font-bold uppercase tracking-widest rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    aria-label="Last page"
                  >
                    »
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ACCEPT / ASSIGN PRIEST MODAL */}
      {acceptingRequest && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up">
            <div className="bg-green-50 px-8 py-6 border-b border-green-100">
              <h2 className="text-xl font-serif text-green-800 font-medium uppercase tracking-widest">Approve Request</h2>
              <p className="text-sm text-green-700 italic">
                For {activeConfig.title(acceptingRequest)}
              </p>
            </div>
            <div className="p-8 space-y-6">
              <div className="bg-gray-50 rounded-2xl p-4 text-sm text-gray-600 space-y-1 border border-gray-100">
                <div>
                  <span className="text-gray-400 uppercase text-[10px] tracking-widest mr-2">Tab</span>
                  {activeTab}
                </div>
              </div>

              {activeConfig.isSacrament && (
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Assign Priest *
                  </label>
                  <select
                    value={assignedPriest}
                    onChange={(e) => setAssignedPriest(e.target.value)}
                    className="p-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none text-sm bg-white"
                  >
                    <option value="" disabled>Select a priest…</option>
                    {PRIEST_OPTIONS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 italic mt-1">
                    The selected priest will host this on the parish events calendar.
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={closeAcceptModal}
                  disabled={acceptSubmitting}
                  className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-500 font-bold text-xs uppercase tracking-widest hover:bg-gray-50 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAccept}
                  disabled={acceptSubmitting || (activeConfig.isSacrament && !assignedPriest)}
                  className="flex-1 py-3 rounded-xl bg-green-600 text-white font-bold text-xs uppercase tracking-widest hover:bg-green-700 transition-all shadow-lg shadow-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {acceptSubmitting ? "Approving…" : activeConfig.isSacrament ? "Approve & Schedule" : "Approve"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {rejectingRequest && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up">
            <div className="bg-red-50 px-8 py-6 border-b border-red-100">
              <h2 className="text-xl font-serif text-red-800 font-medium uppercase tracking-widest">Reject Request</h2>
              <p className="text-sm text-red-600 italic">
                For {activeConfig.title(rejectingRequest)}
              </p>
            </div>
            <div className="p-8 space-y-6">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Reason for Rejection
                </label>
                <textarea
                  className="p-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-red-500 outline-none h-32 text-sm resize-none"
                  placeholder="Please specify why this request cannot be approved..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={closeRejectModal}
                  className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-500 font-bold text-xs uppercase tracking-widest hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmReject}
                  className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold text-xs uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-200"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL MODAL */}
      {cancellingRequest && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up">
            <div className="bg-orange-50 px-6 sm:px-8 py-6 border-b border-orange-100">
              <h2 className="text-xl font-serif text-orange-800 font-medium uppercase tracking-widest">
                Cancel Request
              </h2>
              <p className="text-sm text-orange-700 italic">
                For {activeConfig.title(cancellingRequest)}
              </p>
            </div>
            <div className="p-6 sm:p-8 space-y-6">
              <p className="text-sm text-gray-600">
                This request is currently <span className="font-bold">Approved</span>. Cancelling will mark it as
                {" "}<span className="font-bold">Cancelled</span> and record your reason. Any calendar event already created
                must be removed from the Schedules page manually.
              </p>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Reason for Cancellation *
                </label>
                <textarea
                  className="p-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-orange-500 outline-none h-32 text-sm resize-none"
                  placeholder="Please specify why this approved request needs to be cancelled..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={closeCancelModal}
                  disabled={cancelSubmitting}
                  className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-500 font-bold text-xs uppercase tracking-widest hover:bg-gray-50 transition-all disabled:opacity-50"
                >
                  Keep Approved
                </button>
                <button
                  onClick={confirmCancel}
                  disabled={cancelSubmitting || !cancelReason.trim()}
                  className="flex-1 py-3 rounded-xl bg-orange-600 text-white font-bold text-xs uppercase tracking-widest hover:bg-orange-700 transition-all shadow-lg shadow-orange-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cancelSubmitting ? "Cancelling…" : "Confirm Cancellation"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingRequest && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up">
            <div className="bg-red-50 px-6 sm:px-8 py-6 border-b border-red-100">
              <h2 className="text-xl font-serif text-red-800 font-medium uppercase tracking-widest">
                Delete Request
              </h2>
              <p className="text-sm text-red-700 italic">
                For {activeConfig.title(deletingRequest)}
              </p>
            </div>
            <div className="p-6 sm:p-8 space-y-6">
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-800 space-y-2">
                <p className="font-bold uppercase tracking-wider text-xs">⚠ Warning — this cannot be undone</p>
                <p>
                  This will permanently remove the record from the{" "}
                  <span className="font-mono font-bold">{activeConfig.table}</span> table in the database.
                  All submitted information will be lost.
                </p>
              </div>
              <p className="text-sm text-gray-600">
                If you want to keep a record of this request, leave it in its current list instead. Delete only when you
                are certain the record is no longer needed.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={closeDeleteModal}
                  disabled={deleteSubmitting}
                  className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-500 font-bold text-xs uppercase tracking-widest hover:bg-gray-50 transition-all disabled:opacity-50"
                >
                  Keep Record
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleteSubmitting}
                  className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold text-xs uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleteSubmitting ? "Deleting…" : "Delete Permanently"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW DETAILS MODAL */}
      {selectedRequest && (
        <DetailsModal
          request={selectedRequest}
          tabName={activeTab}
          onClose={() => setSelectedRequest(null)}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// HELPERS
// ----------------------------------------------------------------------------
function StatCard({ label, count, active, onClick }) {
  return (
    <button
      onClick={onClick}
      type="button"
      className={`text-left bg-white p-5 rounded-2xl shadow-sm border flex flex-col gap-2 relative overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5 ${
        active ? "border-[#B59E74] ring-2 ring-[#B59E74]/20" : "border-gray-100"
      }`}
    >
      <div className="absolute top-0 left-0 w-1 h-full bg-[#B59E74]"></div>
      <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest leading-snug">
        {label}
      </h3>
      <div className="flex items-baseline gap-2">
        <p className="text-3xl text-gray-800 font-serif">{count}</p>
        {count > 0 && (
          <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest">
            {count === 1 ? "1 new" : `${count} new`}
          </span>
        )}
      </div>
    </button>
  );
}

function StatusBadge({ status }) {
  const cls =
    status === "Pending"
      ? "bg-yellow-100 text-yellow-700"
      : status === "Approved"
      ? "bg-green-100 text-green-700"
      : status === "Cancelled"
      ? "bg-orange-100 text-orange-700"
      : "bg-red-100 text-red-700";
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${cls}`}>
      {status}
    </span>
  );
}

// Generic details viewer — shows every non-empty field of the request,
// pretty-formatted. Skips internal columns (id, timestamps).
const HIDDEN_FIELDS = new Set([
  "id",
  "created_at",
  "user_id",
  "declaration_consent",
]);

function humanizeKey(key) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatValue(key, val) {
  if (val == null || val === "") return null;
  if (typeof val === "boolean") return val ? "Yes" : "No";
  if (key.match(/_date|_dob$/i) || key === "preferred_date" || key === "wedding_date") {
    try {
      const d = new Date(val);
      if (!isNaN(d)) return d.toLocaleDateString();
    } catch { /* ignore */ }
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
            <h2 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest">
              {tabName} Request Details
            </h2>
            <h1 className="text-2xl font-serif text-gray-800 mt-1">
              Request #{String(request.id).slice(0, 8)}
            </h1>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-600"
          >
            ✕
          </button>
        </div>
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
            {entries.map(([key, val]) => (
              <div key={key} className={key === "additional_notes" || key === "notes" || key === "request_details" || key === "intention_detail" || key === "rejection_remarks" ? "md:col-span-2" : ""}>
                <p className="text-xs uppercase tracking-widest text-gray-400">
                  {humanizeKey(key)}
                </p>
                <p className="text-gray-800 font-medium mt-1 whitespace-pre-wrap break-words">
                  {val}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
