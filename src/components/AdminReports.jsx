import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../contexts/useAuth";

function EventSearchSelect({ events, value, onChange, placeholder = "-- Select an Event --" }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const selected = events.find(ev => ev.id === value?.id);
  const filtered = events.filter(ev =>
    ev.title.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else setSearch("");
  }, [open]);

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-gray-50 font-medium text-sm transition-all text-left focus:outline-none focus:ring-2 focus:ring-[#B59E74]"
      >
        <span className={selected ? "text-gray-800" : "text-gray-400"}>
          {selected
            ? `${selected.title}${selected.event_date ? ` (${new Date(selected.event_date).toLocaleDateString()})` : ""}`
            : placeholder}
        </span>
        <span className="text-gray-400 ml-2 text-xs">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-gray-200 bg-gray-50 focus-within:ring-2 focus-within:ring-[#B59E74]">
              <span className="text-gray-400 text-sm">🔍</span>
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search event..."
                className="flex-1 outline-none text-sm text-gray-700 bg-transparent"
              />
              {search && (
                <button type="button" onClick={() => setSearch("")} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
              )}
            </div>
          </div>
          <ul className="max-h-56 overflow-y-auto">
            <li
              className="px-4 py-2.5 text-sm text-gray-400 italic cursor-pointer hover:bg-gray-50"
              onClick={() => { onChange(null); setOpen(false); }}
            >
              {placeholder}
            </li>
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-sm text-gray-400 italic text-center">No events found</li>
            ) : (
              filtered.map(ev => (
                <li
                  key={ev.id}
                  onClick={() => { onChange(ev); setOpen(false); }}
                  className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-[#B59E74]/10 hover:text-[#B59E74] transition-colors ${value?.id === ev.id ? "bg-[#B59E74]/10 text-[#B59E74] font-medium" : "text-gray-700"}`}
                >
                  <span className="font-medium">{ev.title}</span>
                  {ev.event_date && (
                    <span className="text-xs text-gray-400 ml-2">{new Date(ev.event_date).toLocaleDateString()}</span>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

// Config for every service type — drives the dropdown, fetch, and table render
const SERVICE_CONFIGS = {
  baptisms: {
    label: "Baptisms",
    getName: r => `${r.child_first_name || ""} ${r.child_last_name || ""}`.trim() || "—",
    getDate: r => r.preferred_date,
    dateLabel: "Preferred Date",
  },
  confirmations: {
    label: "Confirmations",
    getName: r => `${r.child_first_name || ""} ${r.child_surname || ""}`.trim() || "—",
    getDate: r => r.date_of_confirmation,
    dateLabel: "Date of Confirmation",
  },
  holy_communions: {
    label: "Holy Communions",
    getName: r => `${r.child_first_name || ""} ${r.child_surname || ""}`.trim() || "—",
    getDate: r => r.date_of_communion,
    dateLabel: "Date of Communion",
  },
  weddings: {
    label: "Weddings",
    getName: r => {
      const groom = `${r.groom_first_name || ""} ${r.groom_last_name || ""}`.trim();
      const bride = `${r.bride_first_name || ""} ${r.bride_last_name || ""}`.trim();
      return [groom, bride].filter(Boolean).join(" & ") || "—";
    },
    getDate: r => r.preferred_date,
    dateLabel: "Wedding Date",
  },
  mass_intentions: {
    label: "Mass Intentions",
    getName: r => r.intention_type
      ? `${r.intention_type}${r.names_in_intention ? ` — ${r.names_in_intention}` : r.full_name ? ` (${r.full_name})` : ""}`
      : r.full_name || "—",
    getDate: r => r.preferred_date,
    dateLabel: "Preferred Date",
  },
  facilities_bookings: {
    label: "Facilities Bookings",
    getName: r => r.event_purpose || r.purpose || r.event_name || "—",
    getDate: r => r.start_date,
    dateLabel: "Start Date",
  },
  certifications: {
    label: "Certification Requests",
    getName: r => {
      const cert = r.certificate_type || "—";
      const requestor = `${r.requestor_first_name || ""} ${r.requestor_surname || ""}`.trim();
      return requestor ? `${cert} (${requestor})` : cert;
    },
    getDate: r => r.record_date,
    dateLabel: "Date of Sacrament",
  },
  sacraments_liturgical: {
    label: "Sacraments & Liturgical",
    getName: r => r.request_type || "—",
    getDate: r => r.request_date,
    dateLabel: "Request Date",
  },
};

const STATUS_COLOR = (s) => {
  switch ((s || "").toLowerCase()) {
    case "approved":  return "bg-green-100 text-green-700";
    case "pending":   return "bg-yellow-100 text-yellow-700";
    case "rejected":  return "bg-red-100 text-red-700";
    default:          return "bg-gray-100 text-gray-600";
  }
};

function AdminReports() {
  const { refreshRole, user } = useAuth();
  const [activeTab, setActiveTab] = useState("services");
  const [loading, setLoading] = useState(true);

  // Services tab state
  const [selectedService, setSelectedService] = useState("baptisms");
  const [sortBy, setSortBy] = useState("newest");
  const [serviceStatusFilter, setServiceStatusFilter] = useState("All");
  const [serviceData, setServiceData] = useState([]);
  const [serviceLoading, setServiceLoading] = useState(false);

  // Schedules tab state
  const [scheduleSortBy, setScheduleSortBy] = useState("newest");
  const [scheduleFilter, setScheduleFilter] = useState("all");
  const [scheduleStatusFilter, setScheduleStatusFilter] = useState("All");

  // Attendance tab state
  const [attendanceEvents, setAttendanceEvents] = useState([]);
  const [selectedAttendanceEvent, setSelectedAttendanceEvent] = useState(null);
  const [attendanceSearch, setAttendanceSearch] = useState("");
  const [attendanceData, setAttendanceData] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  const [metrics, setMetrics] = useState({
    totalReservations: 0,
    totalAttendance: 0,
    activeEvents: 0,
    totalMinistries: 0,
  });

  const [reportData, setReportData] = useState({
    schedules: [],
    ministries: [],
  });

  useEffect(() => {
    // Bust stale localStorage role cache so admin sees real-time role assignments
    if (user?.email) {
      localStorage.removeItem(`adminCache:${user.email.toLowerCase()}`);
    }
    refreshRole().catch(() => {});
    fetchAllReports();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAllReports = async () => {
    setLoading(true);
    try {
      // Metrics — counts only
      const [baps, weddings, intentions, confs, events, attendance, ministriesCount] =
        await Promise.all([
          supabase.from("baptisms").select("id"),
          supabase.from("weddings").select("id"),
          supabase.from("mass_intentions").select("id"),
          supabase.from("confirmations").select("id"),
          supabase
            .from("events")
            .select("id")
            .not("status", "in", '("Cancelled","Rejected")'),
          supabase.from("attendance").select("id"),
          // Fix: count from `ministries` table, not unique strings from events
          supabase.from("ministries").select("id").eq("is_archived", false),
        ]);

      setMetrics({
        totalReservations:
          (baps.data?.length || 0) +
          (weddings.data?.length || 0) +
          (intentions.data?.length || 0) +
          (confs.data?.length || 0),
        totalAttendance: attendance.data?.length || 0,
        activeEvents: events.data?.length || 0,
        totalMinistries: ministriesCount.data?.length || 0,
      });

      // Detail queries for schedules and ministries tabs
      const [sData, mData, evData] = await Promise.all([
        supabase
          .from("events")
          .select("title, event_class, priest_name, ministry, event_date, location, status, created_at")
          .order("event_date", { ascending: true }),
        supabase
          .from("ministries")
          .select("name, description, is_archived")
          .eq("is_archived", false)
          .order("name", { ascending: true }),
        supabase
          .from("events")
          .select("id, title, event_date, priest_name, ministry")
          .order("event_date", { ascending: false }),
      ]);

      setReportData({
        schedules: sData.data || [],
        ministries: mData.data || [],
      });
      setAttendanceEvents(evData.data || []);
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchServiceData = async (serviceKey) => {
    setServiceLoading(true);
    try {
      const { data } = await supabase.from(serviceKey).select("*");
      setServiceData(data || []);
    } catch (err) {
      console.error("fetchServiceData error:", err);
      setServiceData([]);
    } finally {
      setServiceLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "services") {
      fetchServiceData(selectedService);
      setServiceStatusFilter("All");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedService, activeTab]);

  const fetchAttendanceData = async (eventId) => {
    setAttendanceLoading(true);
    try {
      const { data } = await supabase
        .from("attendance_details")
        .select("*")
        .eq("event_id", eventId)
        .order("check_in_time", { ascending: false });
      setAttendanceData(data || []);
    } catch (err) {
      console.error("fetchAttendanceData error:", err);
      setAttendanceData([]);
    } finally {
      setAttendanceLoading(false);
    }
  };

  useEffect(() => {
    if (selectedAttendanceEvent) {
      fetchAttendanceData(selectedAttendanceEvent.id);
      setAttendanceSearch("");
    } else {
      setAttendanceData([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAttendanceEvent]);

  const handlePrint = () => window.print();


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F5ED]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B59E74]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F5ED] flex flex-col font-sans print:bg-white print:p-0">
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 pt-28 pb-12 print:max-w-full print:px-0 print:pt-0">

        {/* Breadcrumb */}
        <div className="flex gap-4 mb-6 border-b border-gray-200 pb-3 print:hidden">
          <Link to="/admin" className="text-gray-500 hover:text-[#B59E74] font-bold uppercase tracking-widest text-sm transition-colors">Dashboard</Link>
          <span className="text-gray-300">|</span>
          <span className="text-[#B59E74] font-bold uppercase tracking-widest text-sm border-b-2 border-[#B59E74] pb-3 -mb-[13px]">Reports</span>
        </div>

        {/* PRINT-ONLY OFFICIAL LETTERHEAD */}
        <div className="hidden print:block text-center mb-12">
          <h1 className="text-3xl font-serif font-bold text-black uppercase tracking-[0.2em]">
            San Pedro Bautista Church
          </h1>
          <p className="text-sm text-gray-600 uppercase tracking-widest mt-1">
            Official Parish Administrative Report
          </p>
          <div className="w-full h-1 bg-black my-4"></div>
          <div className="flex justify-between text-xs text-gray-500 italic mt-4">
            <span>
              Report Type:{" "}
              {activeTab === "services"
                ? "Service Reservations"
                : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            </span>
            <span>Date Generated: {new Date().toLocaleString()}</span>
          </div>
          <div className="w-full h-px bg-gray-300 my-6"></div>
        </div>

        {/* SCREEN-ONLY HEADER */}
        <div className="flex justify-between items-end mb-8 print:hidden">
          <div>
            <h1 className="text-3xl font-serif text-[#B59E74] uppercase tracking-widest mb-2">
              Administrative Reports
            </h1>
            <p className="text-gray-500 italic font-serif">
              Consolidated parish data and performance metrics.
            </p>
          </div>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-white border-2 border-[#B59E74] text-[#B59E74] px-6 py-2 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-[#B59E74] hover:text-white transition-all shadow-sm"
          >
            <span>🖨️</span> Print Report
          </button>
        </div>

        {/* SUMMARY METRIC CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10 print:hidden">
          {[
            { label: "Total Reservations", value: metrics.totalReservations, icon: "📅", color: "bg-blue-500" },
            { label: "Total Attendance",   value: metrics.totalAttendance,   icon: "👥", color: "bg-green-500" },
            { label: "Upcoming Events",    value: metrics.activeEvents,      icon: "⛪", color: "bg-amber-500" },
            { label: "Active Ministries",  value: metrics.totalMinistries,   icon: "✨", color: "bg-purple-500" },
          ].map((card, idx) => (
            <div
              key={idx}
              className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-all group cursor-default relative overflow-hidden"
            >
              <div
                className={`absolute top-0 right-0 w-16 h-16 ${card.color} opacity-10 rounded-bl-full transition-all group-hover:scale-150`}
              ></div>
              <div className="text-2xl mb-3">{card.icon}</div>
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                {card.label}
              </h3>
              <p className="text-3xl font-serif text-gray-800">{card.value}</p>
            </div>
          ))}
        </div>

        {/* MAIN REPORT PANEL */}
        <div className="bg-white rounded-[2rem] shadow-xl border border-gray-200 overflow-hidden print:shadow-none print:border-none print:rounded-none">

          {/* TAB NAVIGATION — all four tabs */}
          <div className="flex bg-gray-50 border-b border-gray-100 print:hidden">
            {[
              { id: "services",   label: "Service Reservations" },
              { id: "attendance", label: "Attendance" },
              { id: "schedules",  label: "Schedules" },
              { id: "ministries", label: "Ministries" },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex-1 py-5 text-xs font-bold uppercase tracking-widest transition-all ${
                  activeTab === id
                    ? "bg-white text-[#B59E74] border-b-2 border-[#B59E74]"
                    : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="p-8 print:p-0">

            {/* ── SERVICE RESERVATIONS TAB ── */}
            {activeTab === "services" && (() => {
              const cfg = SERVICE_CONFIGS[selectedService];
              const statusFiltered = serviceStatusFilter === "All"
                ? serviceData
                : serviceData.filter(r => (r.status || "").toLowerCase() === serviceStatusFilter.toLowerCase());
              const sorted = [...statusFiltered].sort((a, b) => {
                if (sortBy === "newest")         return (cfg.getDate(b) || "").localeCompare(cfg.getDate(a) || "");
                if (sortBy === "oldest")         return (cfg.getDate(a) || "").localeCompare(cfg.getDate(b) || "");
                if (sortBy === "alpha")          return (cfg.getName(a) || "").localeCompare(cfg.getName(b) || "");
                if (sortBy === "status")         return (a.status || "").localeCompare(b.status || "");
                if (sortBy === "submitted_desc") return (b.created_at || "").localeCompare(a.created_at || "");
                if (sortBy === "submitted_asc")  return (a.created_at || "").localeCompare(b.created_at || "");
                return 0;
              });

              return (
                <div>
                  {/* Controls */}
                  <div className="flex flex-col sm:flex-row gap-3 mb-8 print:hidden">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Service Type</label>
                      <select
                        value={selectedService}
                        onChange={e => setSelectedService(e.target.value)}
                        className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#B59E74]"
                      >
                        {Object.entries(SERVICE_CONFIGS).map(([key, c]) => (
                          <option key={key} value={key}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:w-48">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Filter by Status</label>
                      <select
                        value={serviceStatusFilter}
                        onChange={e => setServiceStatusFilter(e.target.value)}
                        className={`w-full p-3 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#B59E74] ${
                          serviceStatusFilter === "All"
                            ? "border-gray-200 bg-gray-50 text-gray-700"
                            : "border-[#B59E74]/40 bg-[#B59E74]/5 text-[#9c8760]"
                        }`}
                      >
                        <option value="All">All Statuses</option>
                        <option value="Pending">Pending</option>
                        <option value="Staff Approved">Staff Approved</option>
                        <option value="Priest Approved">Priest Approved</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>
                    <div className="sm:w-48">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Sort By</label>
                      <select
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value)}
                        className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#B59E74]"
                      >
                        <option value="newest">Preferred Date — Newest</option>
                        <option value="oldest">Preferred Date — Oldest</option>
                        <option value="submitted_desc">Submitted — Newest</option>
                        <option value="submitted_asc">Submitted — Oldest</option>
                        <option value="alpha">Alphabetical</option>
                        <option value="status">By Status</option>
                      </select>
                    </div>
                  </div>

                  {/* Section heading */}
                  <div className="flex items-center gap-4 mb-4">
                    <h4 className="text-sm font-bold text-[#B59E74] print:text-black uppercase tracking-widest whitespace-nowrap">
                      {cfg.label}{serviceStatusFilter !== "All" && <span className="ml-2 text-[10px] bg-[#B59E74]/10 text-[#9c8760] px-2 py-0.5 rounded-full normal-case tracking-normal font-bold">{serviceStatusFilter}</span>}
                    </h4>
                    <div className="h-px w-full bg-gray-100 print:bg-black"></div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">{sorted.length} record{sorted.length !== 1 ? "s" : ""}</span>
                  </div>

                  {/* Table */}
                  {serviceLoading ? (
                    <div className="flex justify-center py-20">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#B59E74]"></div>
                    </div>
                  ) : sorted.length === 0 ? (
                    <p className="text-center text-gray-400 italic font-serif py-20">
                      No {cfg.label.toLowerCase()} requests on record.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse border border-gray-200 print:border-black">
                        <thead>
                          <tr className="bg-gray-50 print:bg-transparent text-[10px] text-gray-500 print:text-black uppercase tracking-widest font-bold">
                            <th className="p-3 border-b border-gray-200 print:border-black border-r border-r-gray-100 print:border-r-black">#</th>
                            <th className="p-3 border-b border-gray-200 print:border-black border-r border-r-gray-100 print:border-r-black">{cfg.label}</th>
                            <th className="p-3 border-b border-gray-200 print:border-black border-r border-r-gray-100 print:border-r-black">{cfg.dateLabel}</th>
                            <th className="p-3 border-b border-gray-200 print:border-black">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sorted.map((item, idx) => {
                            const dateVal = cfg.getDate(item);
                            return (
                              <tr key={idx} className="border-b border-gray-100 print:border-black hover:bg-gray-50 transition-colors">
                                <td className="p-3 text-xs text-gray-400 border-r border-r-gray-100 print:border-r-black">{idx + 1}</td>
                                <td className="p-3 text-sm font-medium text-gray-800 print:text-black border-r border-r-gray-100 print:border-r-black">
                                  {cfg.getName(item)}
                                </td>
                                <td className="p-3 text-sm text-gray-600 print:text-black border-r border-r-gray-100 print:border-r-black">
                                  {dateVal ? new Date(dateVal).toLocaleDateString() : "—"}
                                </td>
                                <td className="p-3">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase print:bg-transparent print:text-black ${STATUS_COLOR(item.status)}`}>
                                    {item.status || "—"}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ── ATTENDANCE TAB ── */}
            {activeTab === "attendance" && (() => {
              const q = attendanceSearch.toLowerCase();
              const filtered = attendanceData.filter(item => {
                if (!q) return true;
                const name = item.full_name
                  ? item.full_name
                  : `${item.first_name || ""} ${item.last_name || ""}`.trim();
                return (
                  name.toLowerCase().includes(q) ||
                  (item.email || "").toLowerCase().includes(q)
                );
              });

              return (
                <div>
                  {/* Controls */}
                  <div className="flex flex-col sm:flex-row gap-3 mb-6 print:hidden">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Select Event</label>
                      <EventSearchSelect
                        events={attendanceEvents}
                        value={selectedAttendanceEvent}
                        onChange={setSelectedAttendanceEvent}
                      />
                    </div>
                    {selectedAttendanceEvent && (
                      <div className="sm:w-64">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Search Attendee</label>
                        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus-within:ring-2 focus-within:ring-[#B59E74]">
                          <span className="text-gray-400 text-sm">🔍</span>
                          <input
                            type="text"
                            value={attendanceSearch}
                            onChange={e => setAttendanceSearch(e.target.value)}
                            placeholder="Name or email..."
                            className="flex-1 outline-none text-sm text-gray-700 bg-transparent"
                          />
                          {attendanceSearch && (
                            <button type="button" onClick={() => setAttendanceSearch("")} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* No event selected */}
                  {!selectedAttendanceEvent ? (
                    <div className="text-center py-20 border-2 border-dashed border-gray-100 rounded-2xl">
                      <div className="text-3xl mb-3">👥</div>
                      <p className="text-gray-400 italic font-serif">Select an event above to view attendance records.</p>
                    </div>
                  ) : attendanceLoading ? (
                    <div className="flex justify-center py-20">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#B59E74]"></div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest whitespace-nowrap print:text-black">
                          {selectedAttendanceEvent.title}
                        </h4>
                        <div className="h-px w-full bg-gray-100 print:bg-black"></div>
                        <span className="text-xs text-gray-400 whitespace-nowrap print:text-black">{filtered.length} attendee{filtered.length !== 1 ? "s" : ""}</span>
                      </div>
                      <p className="text-xs text-gray-400 mb-4 print:text-black">
                        <span className="uppercase tracking-widest font-bold">Hosted by</span>{" "}
                        <span className="text-[#B59E74] font-semibold print:text-black">
                          {selectedAttendanceEvent.ministry || (selectedAttendanceEvent.priest_name ? `Fr. ${selectedAttendanceEvent.priest_name}` : "—")}
                        </span>
                        {selectedAttendanceEvent.event_date && (
                          <span className="ml-3 text-gray-300 print:text-black">
                            {new Date(selectedAttendanceEvent.event_date).toLocaleDateString()}
                          </span>
                        )}
                      </p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse border border-gray-200 print:border-black">
                          <thead>
                            <tr className="bg-gray-50 print:bg-transparent text-gray-500 print:text-black text-[10px] uppercase tracking-widest font-bold">
                              <th className="p-4 border-b border-gray-200 print:border-black">#</th>
                              <th className="p-4 border-b border-gray-200 print:border-black">Name</th>
                              <th className="p-4 border-b border-gray-200 print:border-black">Email</th>
                              <th className="p-4 border-b border-gray-200 print:border-black">Contact</th>
                              <th className="p-4 border-b border-gray-200 print:border-black">Role</th>
                              <th className="p-4 border-b border-gray-200 print:border-black">Check-In Time</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filtered.length === 0 ? (
                              <tr>
                                <td colSpan="6" className="p-20 text-center text-gray-400 italic font-serif">
                                  {attendanceSearch ? "No attendees match your search." : "No attendance records for this event."}
                                </td>
                              </tr>
                            ) : (
                              filtered.map((item, idx) => {
                                const isGuest = item.is_guest === true;
                                const displayName = isGuest && item.guest_name
                                  ? item.guest_name
                                  : item.full_name
                                    ? item.full_name
                                    : (item.first_name || item.last_name)
                                      ? `${item.first_name || ""} ${item.last_name || ""}`.trim()
                                      : item.email?.split("@")[0] || null;
                                const role = isGuest ? "guest" : (item.role || "parishioner");
                                const roleColor = {
                                  admin:       "bg-emerald-100 text-emerald-700",
                                  superadmin:  "bg-emerald-100 text-emerald-700",
                                  priest:      "bg-amber-100 text-amber-700",
                                  staff:       "bg-sky-100 text-sky-700",
                                  ministry:    "bg-purple-100 text-purple-700",
                                  parishioner: "bg-rose-100 text-rose-600",
                                  guest:       "bg-gray-100 text-gray-500",
                                }[role] || "bg-gray-100 text-gray-500";

                                return (
                                <tr key={idx} className="border-b border-gray-50 print:border-black hover:bg-gray-50 transition-colors">
                                  <td className="p-4 text-xs text-gray-400">{idx + 1}</td>
                                  <td className="p-4 text-sm font-medium text-gray-800 print:text-black capitalize">
                                    {displayName || <span className="text-gray-400 italic">—</span>}
                                  </td>
                                  <td className="p-4 text-sm text-gray-500 print:text-black lowercase">
                                    {isGuest ? "—" : (item.email || "—")}
                                  </td>
                                  <td className="p-4 text-sm text-gray-500 print:text-black">
                                    {isGuest ? (item.guest_contact || "—") : (item.contact_number || "—")}
                                  </td>
                                  <td className="p-4">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase print:bg-transparent print:text-black ${roleColor}`}>
                                      {role}
                                    </span>
                                  </td>
                                  <td className="p-4 text-sm text-gray-500 print:text-black">
                                    {item.check_in_time ? new Date(item.check_in_time).toLocaleString() : "—"}
                                  </td>
                                </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              );
            })()}

            {/* ── SCHEDULES TAB ── */}
            {activeTab === "schedules" && (() => {
              const filtered = reportData.schedules
                .filter(item => scheduleFilter === "all" ? true : item.event_class === scheduleFilter)
                .filter(item => scheduleStatusFilter === "All" ? true : (item.status || "Active") === scheduleStatusFilter);

              const sorted = [...filtered].sort((a, b) => {
                if (scheduleSortBy === "newest")       return (b.event_date || "").localeCompare(a.event_date || "");
                if (scheduleSortBy === "oldest")       return (a.event_date || "").localeCompare(b.event_date || "");
                if (scheduleSortBy === "alpha")        return (a.title || "").localeCompare(b.title || "");
                if (scheduleSortBy === "status")       return (a.status || "").localeCompare(b.status || "");
                if (scheduleSortBy === "created_desc") return (b.created_at || "").localeCompare(a.created_at || "");
                if (scheduleSortBy === "created_asc")  return (a.created_at || "").localeCompare(b.created_at || "");
                return 0;
              });

              return (
              <div>
                <div className="flex flex-col sm:flex-row gap-3 mb-5 print:hidden">
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Filter by Event Type</label>
                    <select
                      value={scheduleFilter}
                      onChange={e => setScheduleFilter(e.target.value)}
                      className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#B59E74]"
                    >
                      <option value="all">All Types</option>
                      <option value="Mass">Mass</option>
                      <option value="Parish Event">Parish Event</option>
                      <option value="Liturgical">Liturgical</option>
                      <option value="Meeting">Meeting</option>
                      <option value="Seminar / Formation">Seminar / Formation</option>
                      <option value="General Event">General Event</option>
                    </select>
                  </div>
                  <div className="sm:w-48">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Filter by Status</label>
                    <select
                      value={scheduleStatusFilter}
                      onChange={e => setScheduleStatusFilter(e.target.value)}
                      className={`w-full p-3 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#B59E74] ${
                        scheduleStatusFilter === "All"
                          ? "border-gray-200 bg-gray-50 text-gray-700"
                          : "border-[#B59E74]/40 bg-[#B59E74]/5 text-[#9c8760]"
                      }`}
                    >
                      <option value="All">All Statuses</option>
                      <option value="Active">Active</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div className="sm:w-48">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Sort By</label>
                    <select
                      value={scheduleSortBy}
                      onChange={e => setScheduleSortBy(e.target.value)}
                      className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#B59E74]"
                    >
                      <option value="newest">Event Date — Newest</option>
                      <option value="oldest">Event Date — Oldest</option>
                      <option value="created_desc">Created — Newest</option>
                      <option value="created_asc">Created — Oldest</option>
                      <option value="alpha">Alphabetical</option>
                      <option value="status">By Status</option>
                    </select>
                  </div>
                </div>
                {/* Section heading */}
                <div className="flex items-center gap-4 mb-4">
                  <h4 className="text-sm font-bold text-[#B59E74] print:text-black uppercase tracking-widest whitespace-nowrap">
                    Schedules{scheduleStatusFilter !== "All" && <span className="ml-2 text-[10px] bg-[#B59E74]/10 text-[#9c8760] px-2 py-0.5 rounded-full normal-case tracking-normal font-bold">{scheduleStatusFilter}</span>}
                  </h4>
                  <div className="h-px w-full bg-gray-100 print:bg-black"></div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">{sorted.length} record{sorted.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse border border-gray-200 print:border-black">
                  <thead>
                    <tr className="bg-gray-50 print:bg-transparent text-gray-500 print:text-black text-[10px] uppercase tracking-widest font-bold">
                      <th className="p-4 border-b border-gray-200 print:border-black">Event</th>
                      <th className="p-4 border-b border-gray-200 print:border-black">Type</th>
                      <th className="p-4 border-b border-gray-200 print:border-black">Host</th>
                      <th className="p-4 border-b border-gray-200 print:border-black">Date</th>
                      <th className="p-4 border-b border-gray-200 print:border-black">Location</th>
                      <th className="p-4 border-b border-gray-200 print:border-black">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="p-20 text-center text-gray-400 italic font-serif">
                          No events found for the selected filter.
                        </td>
                      </tr>
                    ) : (
                      sorted.map((item, idx) => (
                        <tr key={idx} className="border-b border-gray-50 print:border-black hover:bg-gray-50 transition-colors">
                          <td className="p-4 text-sm font-medium text-gray-800 print:text-black">
                            {item.title}
                          </td>
                          <td className="p-4">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-gray-100 text-gray-600 print:bg-transparent print:text-black">
                              {item.event_class || "—"}
                            </span>
                          </td>
                          <td className="p-4 text-sm text-gray-600 print:text-black">
                            {item.ministry || (item.priest_name ? `Fr. ${item.priest_name}` : "—")}
                          </td>
                          <td className="p-4 text-sm text-gray-600 print:text-black">
                            {item.event_date ? new Date(item.event_date).toLocaleDateString() : "—"}
                          </td>
                          <td className="p-4 text-sm text-gray-500 print:text-black">
                            {item.location || "—"}
                          </td>
                          <td className="p-4 text-sm print:text-black">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase print:bg-transparent ${
                              item.status === "Cancelled" || item.status === "Rejected"
                                ? "bg-red-50 text-red-600"
                                : "bg-green-50 text-green-700"
                            }`}>
                              {item.status || "Active"}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                </div>
              </div>
              );
            })()}

            {/* ── MINISTRIES TAB ── */}
            {activeTab === "ministries" && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse border border-gray-200 print:border-black">
                  <thead>
                    <tr className="bg-gray-50 print:bg-transparent text-gray-500 print:text-black text-[10px] uppercase tracking-widest font-bold">
                      <th className="p-4 border-b border-gray-200 print:border-black">Ministry Name</th>
                      <th className="p-4 border-b border-gray-200 print:border-black">Description</th>
                      <th className="p-4 border-b border-gray-200 print:border-black">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.ministries.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="p-20 text-center text-gray-400 italic font-serif">
                          No active ministries found.
                        </td>
                      </tr>
                    ) : (
                      reportData.ministries.map((item, idx) => (
                        <tr key={idx} className="border-b border-gray-50 print:border-black hover:bg-gray-50 transition-colors">
                          <td className="p-4 text-sm font-medium text-gray-800 print:text-black">
                            {item.name}
                          </td>
                          <td className="p-4 text-sm text-gray-600 print:text-black">
                            {item.description || "—"}
                          </td>
                          <td className="p-4 print:text-black">
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-green-100 text-green-700 print:bg-transparent print:text-black">
                              Active
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}

export default AdminReports;
