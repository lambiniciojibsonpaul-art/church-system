import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { restSelect, restUpdate, restInsert, restDelete } from "../supabaseRest";
import { useAuth } from "../contexts/useAuth";
import { sendApprovalEmail } from "../emailNotifications";
import { QRCodeCanvas } from "qrcode.react";
import jsPDF from "jspdf";
import UserRepository from "./UserRepository";

function formatDate(d) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return "";
  }
}

const TAB_CONFIG = {
  Baptisms: {
    table: "baptisms",
    isSacrament: true,
    requiresPriest: true,
    title: (r) => `${r.child_first_name || ""} ${r.child_last_name || ""}`.trim() || "Baptism",
    columns: [
      { label: "Child's Name", value: (r) => `${r.child_first_name || ""} ${r.child_last_name || ""}`.trim() },
      { label: "Pref. Date", value: (r) => formatDate(r.preferred_date) },
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
      status: "Active"
    }),
  },
  "Holy Communion": {
    table: "holy_communions",
    isSacrament: true,
    requiresPriest: true,
    title: (r) => `${r.child_first_name || ""} ${r.child_surname || ""}`.trim() || "Communion",
    columns: [
      { label: "Candidate", value: (r) => `${r.child_first_name || ""} ${r.child_surname || ""}`.trim() },
      { label: "Pref. Date", value: (r) => formatDate(r.date_of_communion) },
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
      status: "Active"
    }),
  },
  Confirmation: {
    table: "confirmations",
    isSacrament: true,
    requiresPriest: true,
    title: (r) => `${r.child_first_name || ""} ${r.child_surname || ""}`.trim() || "Confirmation",
    columns: [
      { label: "Candidate", value: (r) => `${r.child_first_name || ""} ${r.child_surname || ""}`.trim() },
      { label: "Pref. Date", value: (r) => formatDate(r.date_of_confirmation) },
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
      status: "Active"
    }),
  },
  Weddings: {
    table: "weddings",
    isSacrament: true,
    requiresPriest: true,
    title: (r) => `${r.groom_first_name || ""} ${r.groom_surname || ""} & ${r.bride_first_name || ""} ${r.bride_surname || ""}`.trim(),
    columns: [
      { label: "Couple", value: (r) => `${r.groom_first_name || ""} ${r.groom_surname || ""} & ${r.bride_first_name || ""} ${r.bride_surname || ""}`.trim() },
      { label: "Pref. Date", value: (r) => formatDate(r.wedding_date) },
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
      status: "Active"
    }),
  },
  "Mass Intentions": {
    table: "mass_intentions",
    isSacrament: true,
    title: (r) => `${r.intention_type || ""} for ${r.names_in_intention || r.full_name || ""}`.trim(),
    columns: [
      { label: "For", value: (r) => r.names_in_intention || "—" },
      { label: "Pref. Date", value: (r) => formatDate(r.preferred_date) },
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
      status: "Active"
    }),
  },
  "Sacraments & Liturgical": {
    table: "sacraments_liturgical",
    isSacrament: true,
    requiresPriest: true,
    title: (r) => r.request_type || "Sacrament Service",
    columns: [
      { label: "Service", value: (r) => r.request_type },
      { label: "Date", value: (r) => formatDate(r.request_date) },
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
      status: "Active"
    }),
  },
  "Facilities Booking": {
    table: "facilities_bookings",
    isSacrament: false,
    title: (r) => `${r.facility || "Facility"} — ${r.event_type || r.event_purpose || ""}`.trim(),
    columns: [
      { label: "Facility", value: (r) => r.facility },
      { label: "Start", value: (r) => formatDate(r.start_date) },
    ],
  },
  Certifications: {
    table: "certification_requests",
    isSacrament: false,
    title: (r) => `${r.certificate_type || "Certificate"} — ${r.record_holder_first_name || ""} ${r.record_holder_surname || ""}`.trim(),
    columns: [
      { label: "Type", value: (r) => r.certificate_type },
      { label: "Record Holder", value: (r) => `${r.record_holder_first_name || ""} ${r.record_holder_surname || ""}`.trim() },
    ],
  },
};

const TAB_NAMES = Object.keys(TAB_CONFIG);

// ─── Details viewer helpers ───────────────────────────────────────────────────
const HIDDEN_FIELDS = new Set([
  "id", "created_at", "user_id", "declaration_consent",
  "_tab", "_config", "request_type", "display_date", "display_name", "preferred_time"
]);

function humanizeKey(key) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
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

// ─── Component ────────────────────────────────────────────────────────────────
function StaffDashboard() {
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState("requests");
  const [highlightId, setHighlightId] = useState(null);

  // Role guard
  useEffect(() => {
    if (!authLoading && role && role !== "staff" && role !== "admin" && role !== "superadmin") {
      navigate("/", { replace: true });
    }
  }, [authLoading, role, navigate]);

  const [priestNames, setPriestNames] = useState([]);

  // Approved items
  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [viewingDetails, setViewingDetails] = useState(null);
  const [activeQR, setActiveQR] = useState(null);

  // ── NEW: Filter/Sort/Search state for events/certificates/qr tabs ──
  const [itemsSearch, setItemsSearch] = useState("");
  const [itemsFilterType, setItemsFilterType] = useState("All");
  const [itemsSortBy, setItemsSortBy] = useState("date_asc");

  // Pending requests
  const [requests, setRequests] = useState({});
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [activeServiceTab, setActiveServiceTab] = useState("All Services");
  const [staffSortBy, setStaffSortBy] = useState("submitted_asc");

  // Approval/Rejection Modals
  const [staffViewMode, setStaffViewMode] = useState("card"); // "card" | "table"

  const [acceptingRequest, setAcceptingRequest] = useState(null);
  const [assignedPriest, setAssignedPriest] = useState("");
  const [acceptSubmitting, setAcceptSubmitting] = useState(false);

  // Reject modal
  const [rejectingRequest, setRejectingRequest] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectSubmitting, setRejectSubmitting] = useState(false);

  // Revoke modal
  const [cancellingItem, setCancellingItem] = useState(null);
  const [cancelItemReason, setCancelItemReason] = useState("");
  const [cancelItemSubmitting, setCancelItemSubmitting] = useState(false);

  const refetchTimerRef = useRef(null);

  useEffect(() => {
    fetchPendingRequests();
    fetchApprovedItems();
    fetchPriests();
  }, []);

  // Reset filters when switching tabs
  useEffect(() => {
    setItemsSearch("");
    setItemsFilterType("All");
    setItemsSortBy("date_asc");
  }, [activeTab]);

  // Real-time refetch on new notification — debounced to prevent burst queries
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel("staff-dashboard-new-requests")
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, () => {
        clearTimeout(refetchTimerRef.current);
        refetchTimerRef.current = setTimeout(() => fetchPendingRequests(), 800);
      })
      .subscribe();
    return () => {
      clearTimeout(refetchTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Notification-driven highlight + scroll + modal
  useEffect(() => {
    if (!location.state?.highlightId || requestsLoading) return;
    const { highlightId: targetId, highlightTable } = location.state;
    const targetTab = Object.entries(TAB_CONFIG).find(([, cfg]) => cfg.table === highlightTable)?.[0];
    if (!targetTab) return;

    setActiveTab("requests");
    setActiveServiceTab(targetTab);

    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      const cardEl = document.getElementById(`request-card-${targetId}`);
      if (cardEl) {
        clearInterval(interval);
        cardEl.scrollIntoView({ behavior: "smooth", block: "center" });
        setHighlightId(targetId);
        setTimeout(() => {
          const allReqs = Object.values(requests).flat();
          const targetReq = allReqs.find((r) => r.id === targetId);
          if (targetReq) {
            setViewingDetails({
              ...targetReq,
              request_type: targetTab,
              display_name: TAB_CONFIG[targetTab].title(targetReq),
            });
          }
        }, 700);
        setTimeout(() => setHighlightId(null), 2500);
        window.history.replaceState({}, document.title);
      }
      if (attempts > 30) clearInterval(interval);
    }, 100);
    return () => clearInterval(interval);
  }, [location.state, requestsLoading, requests]);

  // ── Fetchers ─────────────────────────────────────────────────────────────
  const fetchPriests = async () => {
    try {
      const { data, error } = await restSelect("priests", { match: { is_active: true }, order: "name.asc", timeoutMs: 10000 });
      if (error) throw error;
      if (data) setPriestNames(data.map(p => p.name));
    } catch (err) { console.error("Failed to load priests:", err); }
  };

  const fetchPendingRequests = async () => {
    setRequestsLoading(true);
    const entries = Object.entries(TAB_CONFIG);
    const results = await Promise.allSettled(
      entries.map(async ([, cfg]) => {
        if (cfg.requiresPriest) {
          const [pendingRes, priestRejectedRes] = await Promise.all([
            restSelect(cfg.table, { match: { status: "Pending" }, order: "created_at.asc", timeoutMs: 12000 }),
            restSelect(cfg.table, { match: { status: "Priest Rejected" }, order: "created_at.asc", timeoutMs: 12000 }),
          ]);
          return { data: [...(pendingRes.data || []), ...(priestRejectedRes.data || [])] };
        }
        return restSelect(cfg.table, { match: { status: "Pending" }, order: "created_at.asc", timeoutMs: 12000 });
      })
    );
    const merged = {};
    entries.forEach(([tabName], idx) => {
      const r = results[idx];
      merged[tabName] = (r.status === "fulfilled" && r.value?.data) ? r.value.data : [];
    });
    setRequests(merged);
    setRequestsLoading(false);
  };

  const fetchApprovedItems = async () => {
    setItemsLoading(true);
    let allItems = [];
    try {
      const { data: baptisms } = await supabase.from("baptisms").select("*").eq("status", "Approved");
      if (baptisms) allItems = [...allItems, ...baptisms.map((b) => ({
        ...b, request_type: "Baptism", display_date: b.preferred_date || b.created_at,
        display_name: `${b.child_first_name || ""} ${b.child_last_name || ""}`,
      }))];

      const { data: weddings } = await supabase.from("weddings").select("*").eq("status", "Approved");
      if (weddings) allItems = [...allItems, ...weddings.map((w) => ({
        ...w, request_type: "Wedding", display_date: w.wedding_date || w.created_at,
        display_name: `${w.groom_first_name || ""} ${w.groom_surname || ""}`.trim() + ` & ${w.bride_first_name || ""} ${w.bride_surname || ""}`.trim() || "Wedding",
      }))];

      const { data: events } = await supabase.from("events").select("*").eq("status", "Active");
      if (events) allItems = [...allItems, ...events.map(e => ({
        ...e, request_type: "Parish Event", display_date: e.event_date,
        display_name: e.title, preferred_time: e.event_time,
      }))];

      allItems.sort((a, b) => new Date(a.display_date) - new Date(b.display_date));
      setItems(allItems);
    } catch (err) { console.error("Fetch error:", err); }
    finally { setItemsLoading(false); }
  };

  // ── Approval handlers ─────────────────────────────────────────────────────
  const resolveTabFor    = (req) => req._tab || activeServiceTab;
  const resolveConfigFor = (req) => req._config || TAB_CONFIG[resolveTabFor(req)];

  const confirmAccept = async () => {
    if (!acceptingRequest) return;
    const reqTab    = resolveTabFor(acceptingRequest);
    const reqConfig = resolveConfigFor(acceptingRequest);
    if (reqConfig.isSacrament && !assignedPriest) return alert("Please assign a priest before approving.");
    setAcceptSubmitting(true);

    const { error: updateErr } = await restUpdate(reqConfig.table, { id: acceptingRequest.id }, { status: "Staff Approved", preferred_priest: assignedPriest || null });
    if (updateErr) { setAcceptSubmitting(false); return alert("Error approving request: " + updateErr.message); }

    if (acceptingRequest.submitter_email) {
      sendApprovalEmail({
        to: acceptingRequest.submitter_email,
        serviceName: reqTab.toLowerCase(),
        eventDate: formatDate(acceptingRequest.preferred_date || acceptingRequest.wedding_date || acceptingRequest.date_of_confirmation || acceptingRequest.date_of_communion || acceptingRequest.start_date || acceptingRequest.request_date),
        eventTime: acceptingRequest.preferred_time || acceptingRequest.wedding_time || acceptingRequest.time_of_confirmation || acceptingRequest.time_of_communion || acceptingRequest.start_time || "",
        location: acceptingRequest.location || "Parish",
        priestName: assignedPriest,
      });
    }

    const requestTitle = reqConfig.title(acceptingRequest);

    if (reqConfig.requiresPriest) {
      const { data: priestUserData } = await supabase
        .from("priests").select("user_id").eq("name", assignedPriest).maybeSingle();
      if (priestUserData?.user_id) {
        await supabase.rpc('notify_parishioner', {
          target_user_id: priestUserData.user_id,
          notif_title: `New ${reqTab} Request Assigned`,
          notif_message: `A ${reqTab} request "${requestTitle}" has been assigned to you. Please review and accept or decline in your dashboard.`,
          notif_link: '/priest-dashboard',
          p_source_id: acceptingRequest.id,
          p_source_table: reqConfig.table,
        });
      }
      if (acceptingRequest.user_id) {
        await supabase.rpc('notify_parishioner', {
          target_user_id: acceptingRequest.user_id,
          notif_title: `Your ${reqTab} Request — Sent to Priest`,
          notif_message: `Your request has been reviewed by staff and forwarded to Fr. ${assignedPriest} for scheduling confirmation.`,
          notif_link: '/profile',
          p_source_id: acceptingRequest.id,
          p_source_table: reqConfig.table,
        });
      }
    } else {
      await supabase.rpc('notify_admin', {
        notif_title: `Staff Approved: ${reqTab}`,
        notif_message: `Staff approved "${requestTitle}". Please review for final approval.`,
        notif_link: '/admin',
        p_source_id: acceptingRequest.id,
        p_source_table: reqConfig.table,
      });
      if (acceptingRequest.user_id) {
        await supabase.rpc('notify_parishioner', {
          target_user_id: acceptingRequest.user_id,
          notif_title: `Your ${reqTab} Request — Staff Approved`,
          notif_message: `Your request has been reviewed and approved by our staff. It is now pending final admin confirmation.`,
          notif_link: '/profile',
          p_source_id: acceptingRequest.id,
          p_source_table: reqConfig.table,
        });
      }
    }

    setRequests((prev) => ({ ...prev, [reqTab]: prev[reqTab].filter((r) => r.id !== acceptingRequest.id) }));
    fetchApprovedItems();
    setAcceptingRequest(null);
    setAssignedPriest("");
    setAcceptSubmitting(false);
  };

  const confirmReject = async () => {
    if (!rejectingRequest) return;
    if (!rejectionReason.trim()) return alert("Please provide a reason for rejection.");
    const reqTab    = resolveTabFor(rejectingRequest);
    const reqConfig = resolveConfigFor(rejectingRequest);
    setRejectSubmitting(true);

    const { error } = await restUpdate(reqConfig.table, { id: rejectingRequest.id }, { status: "Rejected", rejection_remarks: rejectionReason });
    if (error) { setRejectSubmitting(false); return alert("Error rejecting request: " + error.message); }

    if (rejectingRequest.user_id) {
      await supabase.rpc("notify_parishioner", {
        target_user_id: rejectingRequest.user_id,
        notif_title: `Your ${reqTab} Request — Not Approved`,
        notif_message: `We regret to inform you that your request could not be approved. Reason: ${rejectionReason}`,
        notif_link: "/profile",
        p_source_id: rejectingRequest.id,
        p_source_table: reqConfig.table,
      });
    }

    setRequests((prev) => ({ ...prev, [reqTab]: prev[reqTab].filter((r) => r.id !== rejectingRequest.id) }));
    setRejectingRequest(null);
    setRejectionReason("");
    setRejectSubmitting(false);
  };

  const confirmCancelItem = async () => {
    if (!cancellingItem) return;
    if (!cancelItemReason.trim()) return alert("Please provide a reason for cancellation.");
    setCancelItemSubmitting(true);

    let tableName = "";
    if (cancellingItem.request_type === "Baptism")      tableName = "baptisms";
    else if (cancellingItem.request_type === "Wedding") tableName = "weddings";
    else if (cancellingItem.request_type === "Parish Event") tableName = "events";

    try {
      const payload = tableName === "events"
        ? { status: "Cancelled", cancellation_remarks: cancelItemReason }
        : { status: "Cancelled", rejection_remarks: cancelItemReason };
      const { error } = await restUpdate(tableName, { id: cancellingItem.id }, payload);
      if (error) throw new Error(error.message);
      if (tableName !== "events") await restDelete("events", { source_table: tableName, source_id: cancellingItem.id });
      setItems(items.filter(i => !(i.id === cancellingItem.id && i.request_type === cancellingItem.request_type)));
      setCancellingItem(null);
      setCancelItemReason("");
    } catch (err) {
      console.error("Cancellation error:", err.message);
      alert("Failed to cancel item: " + err.message);
    } finally { setCancelItemSubmitting(false); }
  };

  // ── Certificate PDF ───────────────────────────────────────────────────────
  const generateCertificate = (item) => {
    const doc       = new jsPDF("p", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    const centerX   = pageWidth / 2;

    doc.setDrawColor(181, 158, 116); doc.setLineWidth(1.5);
    doc.rect(10, 10, pageWidth - 20, 287);
    doc.setLineWidth(0.5);
    doc.rect(12, 12, pageWidth - 24, 283);

    doc.setFont("times", "bold"); doc.setFontSize(22); doc.setTextColor(181, 158, 116);
    doc.text("Minore Basilica of San Pedro Bautista", centerX, 40, { align: "center" });
    doc.setFontSize(12); doc.setTextColor(100, 100, 100); doc.setFont("times", "italic");
    doc.text("Quezon City, Philippines", centerX, 48, { align: "center" });
    doc.setFont("times", "bold"); doc.setFontSize(32); doc.setTextColor(0, 0, 0);
    doc.text(item.request_type === "Baptism" ? "CERTIFICATE OF BAPTISM" : "CERTIFICATE OF MARRIAGE", centerX, 80, { align: "center" });
    doc.setFont("times", "normal"); doc.setFontSize(16); doc.setTextColor(60, 60, 60);

    if (item.request_type === "Baptism") {
      doc.text("This is to certify that", centerX, 110, { align: "center" });
      doc.setFontSize(24); doc.setFont("times", "bold italic");
      doc.text(`${item.child_first_name} ${item.child_last_name}`, centerX, 125, { align: "center" });
      doc.setFontSize(16); doc.setFont("times", "normal");
      doc.text("was baptized into the Holy Catholic Church on", centerX, 140, { align: "center" });
      doc.setFont("times", "bold");
      doc.text(new Date(item.preferred_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }), centerX, 150, { align: "center" });
    } else {
      doc.text("This is to certify that", centerX, 110, { align: "center" });
      doc.setFontSize(24); doc.setFont("times", "bold italic");
      doc.text(`${item.groom_name} & ${item.bride_name}`, centerX, 125, { align: "center" });
      doc.setFontSize(16); doc.setFont("times", "normal");
      doc.text("were united in the Sacrament of Holy Matrimony on", centerX, 140, { align: "center" });
      doc.setFont("times", "bold");
      doc.text(new Date(item.wedding_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }), centerX, 150, { align: "center" });
    }

    doc.setFontSize(12); doc.setFont("times", "italic");
    doc.text("Given this day under the seal of the Parish.", centerX, 180, { align: "center" });
    doc.setDrawColor(150, 150, 150);
    doc.line(40, 240, 100, 240); doc.line(150, 240, 210, 240);
    doc.setFont("times", "normal"); doc.setFontSize(10);
    doc.text("Parish Secretary", 70, 245, { align: "center" });
    doc.text("Officiating Priest", 180, 245, { align: "center" });

    doc.save(`${item.request_type}_${item.display_name.replace(/\s+/g, "_")}.pdf`);
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  // ── NEW: Type options per tab ─────────────────────────────────────────────
  const getTypeOptionsForTab = () => {
    if (activeTab === "certificates") return ["All", "Baptism", "Wedding"];
    return ["All", "Baptism", "Wedding", "Parish Event"];
  };

  // ── NEW: getVisibleItems with filter + sort + search ──────────────────────
  const getVisibleItems = () => {
    let result = [...items];

    // Base filter by tab
    if (activeTab === "certificates") {
      result = result.filter(i => i.request_type === "Baptism" || i.request_type === "Wedding");
    }

    // Type filter
    if (itemsFilterType !== "All") {
      result = result.filter(i => i.request_type === itemsFilterType);
    }

    // Search filter
    if (itemsSearch.trim()) {
      const q = itemsSearch.toLowerCase();
      result = result.filter(i =>
        (i.display_name || "").toLowerCase().includes(q) ||
        (i.request_type || "").toLowerCase().includes(q) ||
        (i.location || "").toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      if (itemsSortBy === "date_asc")  return new Date(a.display_date) - new Date(b.display_date);
      if (itemsSortBy === "date_desc") return new Date(b.display_date) - new Date(a.display_date);
      if (itemsSortBy === "name_asc")  return (a.display_name || "").localeCompare(b.display_name || "");
      if (itemsSortBy === "name_desc") return (b.display_name || "").localeCompare(a.display_name || "");
      return 0;
    });

    return result;
  };

  const totalPending = TAB_NAMES.reduce((sum, t) => sum + (requests[t]?.length || 0), 0);

  const pendingData = (activeServiceTab === "All Services"
    ? TAB_NAMES.flatMap(t => (requests[t] || []).map(r => ({ ...r, _tab: t, _config: TAB_CONFIG[t] })))
    : (requests[activeServiceTab] || []).map(r => ({ ...r, _tab: activeServiceTab, _config: TAB_CONFIG[activeServiceTab] }))
  ).sort((a, b) => {
    if (staffSortBy === "submitted_asc")   return new Date(a.created_at) - new Date(b.created_at);
    if (staffSortBy === "submitted_desc")  return new Date(b.created_at) - new Date(a.created_at);
    if (staffSortBy === "date_desc")       return new Date(b.display_date || b.created_at) - new Date(a.display_date || a.created_at);
    if (staffSortBy === "date_asc")        return new Date(a.display_date || a.created_at) - new Date(b.display_date || b.created_at);
    return 0;
  });

  const getViewingEntries = () => {
    if (!viewingDetails) return [];
    return Object.entries(viewingDetails)
      .filter(([k, v]) => !HIDDEN_FIELDS.has(k) && v !== null && v !== "" && v !== false)
      .map(([k, v]) => [k, formatValue(k, v)])
      .filter(([, v]) => v !== null);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F6F5ED] flex flex-col font-sans relative">

      {!activeQR && (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-28 sm:pt-32 pb-12">

          {/* Page header */}
          <div className="mb-8 border-b border-gray-200 pb-6 flex justify-between items-end">
            <div>
              <h1 className="text-3xl md:text-4xl font-serif text-[#B59E74] uppercase tracking-widest font-medium">Staff Portal</h1>
              <p className="text-gray-500 font-serif italic mt-2 text-sm sm:text-base">Review requests, generate certificates, and manage attendance.</p>
            </div>
            {totalPending > 0 && (
              <div className="hidden sm:flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-xl border border-red-100">
                <span className="font-bold text-lg">{totalPending}</span>
                <span className="text-xs uppercase tracking-widest font-bold">Pending<br/>Requests</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 sm:gap-4 mb-8">
            <button onClick={() => setActiveTab("requests")} className={`px-6 py-3.5 font-bold uppercase tracking-widest text-xs rounded-xl transition-all relative ${activeTab === "requests" ? "bg-[#B59E74] text-white shadow-md" : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"}`}>
              🔔 Pending Requests
              {totalPending > 0 && <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white shadow-sm">{totalPending}</span>}
            </button>
            <button onClick={() => setActiveTab("events")} className={`px-6 py-3.5 font-bold uppercase tracking-widest text-xs rounded-xl transition-all ${activeTab === "events" ? "bg-[#B59E74] text-white shadow-md" : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"}`}>📅 Approved Events</button>
            <button onClick={() => setActiveTab("certificates")} className={`px-6 py-3.5 font-bold uppercase tracking-widest text-xs rounded-xl transition-all ${activeTab === "certificates" ? "bg-[#B59E74] text-white shadow-md" : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"}`}>📜 Certificates</button>
            <button onClick={() => setActiveTab("qr-generator")} className={`px-6 py-3.5 font-bold uppercase tracking-widest text-xs rounded-xl transition-all ${activeTab === "qr-generator" ? "bg-gray-800 text-white shadow-md" : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"}`}>🔳 Generate QR</button>
            <button onClick={() => setActiveTab("user-repository")} className={`px-6 py-3.5 font-bold uppercase tracking-widest text-xs rounded-xl transition-all ${activeTab === "user-repository" ? "bg-[#B59E74] text-white shadow-md" : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"}`}>🗂️ Users Repository</button>
          </div>

          {/* Unified white card */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6 sm:p-8">

          {/* --- PENDING REQUESTS VIEW --- */}
          {activeTab === "requests" && (
            <div className="animate-fade-in-up">
              <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4 border-b border-gray-100 pb-6">
                <h2 className="text-xl font-serif text-gray-800 font-medium uppercase tracking-widest">Awaiting Approval</h2>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <select
                  value={activeServiceTab}
                  onChange={(e) => setActiveServiceTab(e.target.value)}
                  className="w-full sm:w-auto p-3 rounded-xl border-2 border-[#B59E74]/40 hover:border-[#B59E74] outline-none focus:ring-2 focus:ring-[#B59E74] text-sm font-bold uppercase tracking-widest text-[#B59E74] cursor-pointer"
                >
                  <option value="All Services">All Services ({totalPending})</option>
                  {TAB_NAMES.map(tab => (
                    <option key={tab} value={tab}>{tab} ({(requests[tab] || []).length})</option>
                  ))}
                </select>
                <select
                  value={staffSortBy}
                  onChange={e => setStaffSortBy(e.target.value)}
                  className="w-full sm:w-auto p-3 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#B59E74] cursor-pointer"
                >
                  <option value="submitted_asc">Submitted — Oldest</option>
                  <option value="submitted_desc">Submitted — Newest</option>
                  <option value="date_asc">Preferred Date — Oldest</option>
                  <option value="date_desc">Preferred Date — Newest</option>
                </select>
                <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-white shrink-0">
                  <button
                    onClick={() => setStaffViewMode("card")}
                    title="Card view"
                    className={`px-3 py-2.5 text-sm transition-colors ${staffViewMode === "card" ? "bg-[#B59E74] text-white" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"}`}
                  >⊞</button>
                  <button
                    onClick={() => setStaffViewMode("table")}
                    title="Table view"
                    className={`px-3 py-2.5 text-sm transition-colors ${staffViewMode === "table" ? "bg-[#B59E74] text-white" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"}`}
                  >≡</button>
                </div>
                </div>
              </div>

              {requestsLoading ? (
                <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B59E74]"></div></div>
              ) : pendingData.length === 0 ? (
                <div className="text-center py-16 text-gray-400 italic font-serif">
                  No pending requests for {activeServiceTab}.
                </div>
              ) : staffViewMode === "table" ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-[10px] text-gray-400 uppercase tracking-widest font-bold border-b border-gray-100">
                        <th className="p-3">Type</th>
                        <th className="p-3">Name / Subject</th>
                        <th className="p-3">Key Info</th>
                        <th className="p-3">Submitted</th>
                        <th className="p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingData.map((req) => (
                        <tr
                          id={`request-card-${req.id}`}
                          key={`${req._tab}-${req.id}`}
                          className={`border-b border-gray-50 transition-all duration-500 ${highlightId === req.id ? "bg-[#B59E74]/10" : "hover:bg-gray-50"}`}
                        >
                          <td className="p-3">
                            <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md bg-[#B59E74]/10 text-[#B59E74] whitespace-nowrap">{req._tab}</span>
                            {req.status === "Priest Rejected" && <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md bg-orange-100 text-orange-700 whitespace-nowrap">⚠️ Priest Declined</span>}
                          </div>
                          </td>
                          <td className="p-3">
                            <p className="text-sm font-medium text-gray-800">{req._config.title(req)}</p>
                            <button
                              onClick={() => setViewingDetails({ ...req, request_type: req._tab, display_name: req._config.title(req) })}
                              className="text-[10px] font-bold uppercase tracking-widest text-[#B59E74] hover:text-[#9c8760] transition-colors mt-0.5"
                            >Details →</button>
                          </td>
                          <td className="p-3">
                            <div className="flex flex-col gap-0.5">
                              {req._config.columns.map(col => (
                                <span key={col.label} className="text-xs text-gray-500">
                                  <span className="font-bold text-gray-400">{col.label}:</span> {col.value(req) || "—"}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="p-3 text-xs text-gray-400 whitespace-nowrap">{new Date(req.created_at).toLocaleDateString()}</td>
                          <td className="p-3">
                            <div className="flex gap-1">
                              <button onClick={() => setAcceptingRequest(req)} className="px-2 py-1 bg-green-50 hover:bg-green-600 text-green-700 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-wide transition-colors">✓</button>
                              <button onClick={() => setRejectingRequest(req)} className="px-2 py-1 bg-red-50 hover:bg-red-600 text-red-700 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-wide transition-colors">✕</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingData.map((req) => (
                    <div
                      id={`request-card-${req.id}`}
                      key={`${req._tab}-${req.id}`}
                      className={`border rounded-2xl p-6 flex flex-col transition-all duration-500
                        ${highlightId === req.id
                          ? "border-[#B59E74] bg-[#B59E74]/10 shadow-lg shadow-[#B59E74]/20 scale-[1.01]"
                          : "border-gray-100 bg-gray-50/50 hover:bg-white hover:shadow-md"
                        }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md bg-[#B59E74]/10 text-[#B59E74]">{req._tab}</span>
                        <span className="text-xs text-gray-400 font-serif">{new Date(req.created_at).toLocaleDateString()}</span>
                      </div>

                      <div className="mb-4">
                        <h3 className="text-lg font-serif text-gray-800 font-medium leading-tight">{req._config.title(req)}</h3>
                        <button
                          onClick={() => setViewingDetails({ ...req, request_type: req._tab, display_name: req._config.title(req) })}
                          className="text-[10px] font-bold uppercase tracking-widest text-[#B59E74] hover:text-[#9c8760] transition-colors mt-1"
                        >
                          View Full Details →
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-6 text-sm bg-white p-4 rounded-xl border border-gray-100">
                        {req._config.columns.map(col => (
                          <div key={col.label}>
                            <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-0.5">{col.label}</p>
                            <p className="font-medium text-gray-700">{col.value(req) || "—"}</p>
                          </div>
                        ))}
                      </div>

                      {req.status === "Priest Rejected" && (
                        <div className="mb-3 p-3 bg-orange-50 border border-orange-200 rounded-xl text-xs text-orange-700">
                          <p className="font-bold uppercase tracking-widest mb-0.5">⚠️ Priest Declined — Reassign Required</p>
                          {req.rejection_remarks && <p className="italic mt-0.5">Reason: {req.rejection_remarks}</p>}
                          <p className="mt-1 text-orange-600">Please select a different priest below.</p>
                        </div>
                      )}
                      <div className="mt-auto flex gap-2 pt-4 border-t border-gray-200">
                        <button onClick={() => setAcceptingRequest(req)} className="flex-1 bg-green-50 hover:bg-green-600 text-green-700 hover:text-white py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors">✓ {req.status === "Priest Rejected" ? "Reassign" : "Accept"}</button>
                        <button onClick={() => setRejectingRequest(req)} className="flex-1 bg-red-50 hover:bg-red-600 text-red-700 hover:text-white py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors">✕ Reject</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

            {/* ── APPROVED EVENTS / CERTIFICATES / QR ── */}
            {(activeTab === "events" || activeTab === "certificates" || activeTab === "qr-generator") && (
              itemsLoading ? (
                <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B59E74]"></div></div>
              ) : (
                <div className="animate-fade-in-up">

                  {/* ── NEW: Filter / Sort / Search Toolbar ── */}
                  <div className="flex flex-col sm:flex-row gap-3 mb-6 pb-6 border-b border-gray-100">

                    {/* Search */}
                    <div className="relative flex-1 min-w-0">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">🔍</span>
                      <input
                        type="text"
                        placeholder="Search by name or location…"
                        value={itemsSearch}
                        onChange={e => setItemsSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B59E74] focus:bg-white transition-colors"
                      />
                    </div>

                    {/* Type filter */}
                    <select
                      value={itemsFilterType}
                      onChange={e => setItemsFilterType(e.target.value)}
                      className="py-2.5 px-3 rounded-xl border-2 border-[#B59E74]/40 hover:border-[#B59E74] text-sm font-bold uppercase tracking-widest text-[#B59E74] focus:outline-none focus:ring-2 focus:ring-[#B59E74] cursor-pointer bg-white shrink-0"
                    >
                      {getTypeOptionsForTab().map(opt => (
                        <option key={opt} value={opt}>{opt === "All" ? `All Types` : opt}</option>
                      ))}
                    </select>

                    {/* Sort */}
                    <select
                      value={itemsSortBy}
                      onChange={e => setItemsSortBy(e.target.value)}
                      className="py-2.5 px-3 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#B59E74] cursor-pointer shrink-0"
                    >
                      <option value="date_asc">Date — Oldest First</option>
                      <option value="date_desc">Date — Newest First</option>
                      <option value="name_asc">Name — A → Z</option>
                      <option value="name_desc">Name — Z → A</option>
                    </select>

                    {/* Results count + view toggle */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-gray-400 font-medium whitespace-nowrap hidden sm:inline">
                        {getVisibleItems().length} result{getVisibleItems().length !== 1 ? "s" : ""}
                      </span>
                      <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-white">
                        <button
                          onClick={() => setStaffViewMode("card")}
                          title="Card view"
                          className={`px-3 py-2.5 text-sm transition-colors ${staffViewMode === "card" ? "bg-[#B59E74] text-white" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"}`}
                        >⊞</button>
                        <button
                          onClick={() => setStaffViewMode("table")}
                          title="Table view"
                          className={`px-3 py-2.5 text-sm transition-colors ${staffViewMode === "table" ? "bg-[#B59E74] text-white" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"}`}
                        >≡</button>
                      </div>
                    </div>
                  </div>

                  {/* Active filter chips */}
                  {(itemsFilterType !== "All" || itemsSearch.trim()) && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {itemsFilterType !== "All" && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#B59E74]/10 border border-[#B59E74]/30 text-xs font-bold text-[#B59E74] uppercase tracking-wide">
                          {itemsFilterType}
                          <button onClick={() => setItemsFilterType("All")} className="hover:text-[#9c8760] transition-colors">✕</button>
                        </span>
                      )}
                      {itemsSearch.trim() && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 border border-gray-200 text-xs font-bold text-gray-600 uppercase tracking-wide">
                          "{itemsSearch}"
                          <button onClick={() => setItemsSearch("")} className="hover:text-gray-800 transition-colors">✕</button>
                        </span>
                      )}
                      <button
                        onClick={() => { setItemsFilterType("All"); setItemsSearch(""); setItemsSortBy("date_asc"); }}
                        className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors"
                      >
                        Clear all
                      </button>
                    </div>
                  )}

                  {getVisibleItems().length === 0 ? (
                    <div className="bg-white rounded-3xl border border-gray-200 p-12 text-center">
                      <div className="text-4xl mb-4">📭</div>
                      <h3 className="text-xl font-serif text-gray-800">No records match your filters.</h3>
                      <button
                        onClick={() => { setItemsFilterType("All"); setItemsSearch(""); }}
                        className="mt-4 text-sm text-[#B59E74] hover:underline font-medium"
                      >
                        Clear filters
                      </button>
                    </div>
                  ) : staffViewMode === "table" ? (
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="text-[10px] text-gray-400 uppercase tracking-widest font-bold border-b border-gray-100">
                            <th className="p-3">Type</th><th className="p-3">Name / Subject</th>
                            <th className="p-3">Date</th><th className="p-3">Time</th>
                            {activeTab === "events" && <th className="p-3">Location</th>}
                            <th className="p-3">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getVisibleItems().map((item) => (
                            <tr key={`${item.request_type}-${item.id}`} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                              <td className="p-3"><span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 whitespace-nowrap">{item.request_type}</span></td>
                              <td className="p-3 text-sm font-medium text-gray-800">{item.display_name}</td>
                              <td className="p-3 text-sm text-gray-600 whitespace-nowrap">{new Date(item.display_date).toLocaleDateString()}</td>
                              <td className="p-3 text-sm text-gray-500 whitespace-nowrap">{item.preferred_time || item.wedding_time || "—"}</td>
                              {activeTab === "events" && <td className="p-3 text-sm text-gray-500 max-w-[160px] truncate">{item.location || "—"}</td>}
                              <td className="p-3">
                                <div className="flex gap-1">
                                  {activeTab === "events" && <button onClick={() => setViewingDetails(item)} className="px-2 py-1 bg-gray-50 hover:bg-[#B59E74] text-gray-600 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-wide transition-colors">View</button>}
                                  {activeTab === "certificates" && <button onClick={() => generateCertificate(item)} className="px-2 py-1 bg-[#B59E74]/10 hover:bg-[#B59E74] text-[#B59E74] hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-wide transition-colors">📜 Download</button>}
                                  {activeTab === "qr-generator" && <button onClick={() => setActiveQR(item)} className="px-2 py-1 bg-gray-800 hover:bg-black text-white rounded-lg text-[10px] font-bold uppercase tracking-wide transition-colors">🔳 QR</button>}
                                  <button onClick={() => { setCancellingItem(item); setCancelItemReason(""); }} className="px-2 py-1 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-wide transition-colors" title="Revoke">✕</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                      {getVisibleItems().map((item) => (
                        <div key={`${item.request_type}-${item.id}`} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col h-full relative overflow-hidden group hover:shadow-md transition-shadow">
                          <div className={`absolute top-0 left-0 w-1.5 h-full ${item.request_type === "Wedding" ? "bg-rose-400" : item.request_type === "Baptism" ? "bg-blue-400" : "bg-[#B59E74]"}`}></div>
                          <div className="flex justify-between items-start mb-3">
                            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md bg-gray-100 text-gray-600">{item.request_type}</span>
                          </div>
                          <h3 className="text-xl font-serif text-gray-800 font-medium leading-tight mb-2 pr-4">{item.display_name}</h3>
                          <div className="text-sm text-gray-500 flex flex-col gap-1 mb-6 flex-grow">
                            <div className="flex items-center gap-2"><span>🗓️</span> {new Date(item.display_date).toLocaleDateString()}</div>
                            <div className="flex items-center gap-2"><span>⏰</span> {item.preferred_time || item.wedding_time || "TBD"}</div>
                            {item.location && <div className="flex items-center gap-2"><span>📍</span> {item.location}</div>}
                          </div>
                          <div className="mt-auto border-t border-gray-100 pt-4 flex gap-2">
                            {activeTab === "events" && <button onClick={() => setViewingDetails(item)} className="flex-1 bg-gray-50 text-[#B59E74] hover:bg-[#B59E74] hover:text-white font-bold py-3 rounded-xl uppercase tracking-widest text-xs transition-colors">View Details</button>}
                            {activeTab === "certificates" && <button onClick={() => generateCertificate(item)} className="flex-1 bg-white border-2 border-[#B59E74] text-[#B59E74] hover:bg-[#B59E74] hover:text-white font-bold py-3 rounded-xl uppercase tracking-widest text-xs transition-colors flex items-center justify-center gap-2">📜 Download</button>}
                            {activeTab === "qr-generator" && <button onClick={() => setActiveQR(item)} className="flex-1 bg-gray-800 hover:bg-black text-white font-bold py-3 rounded-xl uppercase tracking-widest text-xs transition-colors flex items-center justify-center gap-2"><span>🔳</span> Show QR</button>}
                            <button onClick={() => { setCancellingItem(item); setCancelItemReason(""); }} className="bg-red-50 hover:bg-red-600 text-red-600 hover:text-white px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center" title="Revoke / Cancel">✕ Revoke</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            )}

            {/* ── USERS REPOSITORY ── */}
            {activeTab === "user-repository" && (
              <div className="animate-fade-in-up">
                <div className="mb-6 border-b border-gray-200 pb-4">
                  <h2 className="text-xl font-serif text-gray-800 font-medium uppercase tracking-widest">Users Repository</h2>
                  <p className="text-sm text-gray-400 italic mt-1">Upload and manage archived documents per parishioner.</p>
                </div>
                <UserRepository />
              </div>
            )}

          </div>
        </main>
      )}

      {/* ── QR FULLSCREEN ── */}
      {activeQR && (
        <div className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center p-6 animate-fade-in">
          <button onClick={() => setActiveQR(null)} className="absolute top-6 right-6 w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors text-xl">✕</button>
          <div className="text-center max-w-md w-full">
            <div className="w-24 h-24 mx-auto rounded-full bg-[#F6F5ED] flex items-center justify-center border-2 border-[#B59E74] text-4xl mb-6 shadow-sm">⛪</div>
            <h2 className="text-3xl font-serif text-gray-800 font-medium uppercase tracking-widest mb-2">{activeQR.display_name}</h2>
            <p className="text-gray-500 italic mb-10">{activeQR.location || "Main Church"}</p>
            <div className="bg-white p-8 rounded-[3rem] shadow-2xl border-4 border-[#B59E74] inline-block mx-auto">
              <QRCodeCanvas value={`${window.location.href.split("#")[0].replace(/\/$/, "")}/#/check-in/${activeQR.id}`} size={280} level="H" includeMargin={true} />
            </div>
            <p className="mt-10 text-sm font-bold text-gray-400 uppercase tracking-[0.2em]">Scan to mark attendance</p>
          </div>
        </div>
      )}

      {/* ── MODALS ── */}

      {/* Accept */}
      {acceptingRequest && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="bg-green-50 px-8 py-6 border-b border-green-100">
              <h2 className="text-xl font-serif text-green-800 font-medium uppercase tracking-widest">Approve Request</h2>
              <p className="text-sm text-green-700 italic">For {resolveConfigFor(acceptingRequest).title(acceptingRequest)}</p>
            </div>
            <div className="p-8 space-y-6">
              {resolveConfigFor(acceptingRequest).isSacrament && (
                <div className="flex flex-col gap-2">
                  {acceptingRequest.preferred_priest && (
                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700">
                      <span className="font-bold uppercase tracking-widest">Parishioner's Preferred Priest:</span>{" "}
                      {acceptingRequest.preferred_priest}
                      <span className="block mt-0.5 text-blue-500 italic font-normal">This is only a preference — your selection below is final.</span>
                    </div>
                  )}
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Assign Priest *</label>
                  <select value={assignedPriest} onChange={(e) => setAssignedPriest(e.target.value)} className="p-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none text-sm bg-white">
                    <option value="" disabled>Select a priest…</option>
                    {priestNames.map((p) => (<option key={p} value={p}>{p}</option>))}
                  </select>
                  <p className="text-xs text-gray-400 italic mt-1">The assigned priest will host this on the parish events calendar.</p>
                </div>
              )}
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-700 font-serif">
                {resolveConfigFor(acceptingRequest).requiresPriest
                  ? <>ℹ️ Approving will notify <strong>Fr. {assignedPriest || "the assigned priest"}</strong> to confirm the schedule. The parishioner will be notified once the priest accepts.</>
                  : <>ℹ️ Approving will notify the <strong>admin</strong> for final confirmation and notify the <strong>parishioner</strong> that their request is under review.</>
                }
              </div>
              <div className="flex gap-3">
                <button onClick={() => setAcceptingRequest(null)} disabled={acceptSubmitting} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-500 font-bold text-xs uppercase tracking-widest hover:bg-gray-50 transition-all disabled:opacity-50">Cancel</button>
                <button onClick={confirmAccept} disabled={acceptSubmitting || (resolveConfigFor(acceptingRequest).isSacrament && !assignedPriest)} className="flex-1 py-3 rounded-xl bg-green-600 text-white font-bold text-xs uppercase tracking-widest hover:bg-green-700 transition-all shadow-lg shadow-green-200 disabled:opacity-50 disabled:cursor-not-allowed">
                  {acceptSubmitting ? "Approving…" : "Approve"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject */}
      {rejectingRequest && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="bg-red-50 px-8 py-6 border-b border-red-100">
              <h2 className="text-xl font-serif text-red-800 font-medium uppercase tracking-widest">Reject Request</h2>
              <p className="text-sm text-red-600 italic">For {resolveConfigFor(rejectingRequest).title(rejectingRequest)}</p>
            </div>
            <div className="p-8 space-y-6">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Reason for Rejection *</label>
                <textarea className="p-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-red-500 outline-none h-32 text-sm resize-none" placeholder="Please specify why this request cannot be approved..." value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} />
              </div>
              <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-700 font-serif">
                ℹ️ The <strong>parishioner</strong> will be notified of this rejection and the reason provided.
              </div>
              <div className="flex gap-3">
                <button onClick={() => setRejectingRequest(null)} disabled={rejectSubmitting} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-500 font-bold text-xs uppercase tracking-widest hover:bg-gray-50 transition-all disabled:opacity-50">Cancel</button>
                <button onClick={confirmReject} disabled={rejectSubmitting || !rejectionReason.trim()} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold text-xs uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-200 disabled:opacity-50 disabled:cursor-not-allowed">
                  {rejectSubmitting ? "Rejecting..." : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Revoke */}
      {cancellingItem && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="bg-orange-50 px-8 py-6 border-b border-orange-100">
              <h2 className="text-xl font-serif text-orange-800 font-medium uppercase tracking-widest">Revoke Approval</h2>
              <p className="text-sm text-orange-700 italic">For {cancellingItem.display_name}</p>
            </div>
            <div className="p-8 space-y-6">
              <p className="text-sm text-gray-600">This item is currently approved. Revoking it will mark it as <span className="font-bold">Cancelled</span> and remove it from active records.</p>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Reason for Cancellation *</label>
                <textarea className="p-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-orange-500 outline-none h-32 text-sm resize-none" placeholder="Please specify why this is being revoked..." value={cancelItemReason} onChange={(e) => setCancelItemReason(e.target.value)} />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setCancellingItem(null)} disabled={cancelItemSubmitting} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-500 font-bold text-xs uppercase tracking-widest hover:bg-gray-50 transition-all disabled:opacity-50">Keep Active</button>
                <button onClick={confirmCancelItem} disabled={cancelItemSubmitting || !cancelItemReason.trim()} className="flex-1 py-3 rounded-xl bg-orange-600 text-white font-bold text-xs uppercase tracking-widest hover:bg-orange-700 transition-all shadow-lg shadow-orange-200 disabled:opacity-50 disabled:cursor-not-allowed">
                  {cancelItemSubmitting ? "Revoking..." : "Confirm Revoke"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Details */}
      {viewingDetails && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-[2rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <div className="p-6 md:p-8 border-b-4 border-gray-100 bg-gray-50/50 sticky top-0 z-10 flex justify-between items-start backdrop-blur-md">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest bg-gray-200 text-gray-700 px-3 py-1 rounded-md mb-3 inline-block">{viewingDetails.request_type} Details</span>
                <h2 className="text-2xl md:text-3xl font-serif text-gray-800 font-medium">{viewingDetails.display_name}</h2>
              </div>
              <button onClick={() => setViewingDetails(null)} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-500 shadow-sm border border-gray-200 hover:bg-gray-100 transition-colors">✕</button>
            </div>
            <div className="p-6 md:p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {getViewingEntries().map(([key, val]) => (
                  <div key={key} className={key === "additional_notes" || key === "notes" || key === "request_details" || key === "intention_detail" || key === "rejection_remarks" ? "md:col-span-2" : ""}>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">{humanizeKey(key)}</p>
                    <p className="font-medium text-gray-800 whitespace-pre-wrap break-words">{val}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default StaffDashboard;