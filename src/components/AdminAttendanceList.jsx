import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseClient";

function EventSearchSelect({ events, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const selected = events.find(ev => ev.id.toString() === value);
  const filtered = events.filter(ev =>
    ev.title.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else setSearch("");
  }, [open]);

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative min-w-[280px]">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-[#B59E74] outline-none text-left"
      >
        <span className={selected ? "text-gray-800" : "text-gray-400"}>
          {selected ? selected.title : "-- Choose an Event --"}
        </span>
        <span className="text-gray-400 ml-2">{open ? "▲" : "▼"}</span>
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
              onClick={() => { onChange(""); setOpen(false); }}
            >
              -- Choose an Event --
            </li>
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-sm text-gray-400 italic text-center">No events found</li>
            ) : (
              filtered.map(ev => (
                <li
                  key={ev.id}
                  onClick={() => { onChange(ev.id.toString()); setOpen(false); }}
                  className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-[#B59E74]/10 hover:text-[#B59E74] transition-colors ${value === ev.id.toString() ? "bg-[#B59E74]/10 text-[#B59E74] font-medium" : "text-gray-700"}`}
                >
                  {ev.title}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function AdminAttendanceList() {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState("");
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✨ NEW: State to control sorting
  const [activeSort, setActiveSort] = useState("time_desc");

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedEvent) {
      fetchAttendance();
    }
  }, [selectedEvent]);

  const fetchEvents = async () => {
    const { data } = await supabase.from("events").select("id, title").order("title");
    setEvents(data || []);
    setLoading(false);
  };

  const fetchAttendance = async () => {
    if (!selectedEvent) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("attendance_details")
      .select("*")
      .eq("event_id", selectedEvent)
      .order("check_in_time", { ascending: false });

    if (error) {
      console.error("Fetch error:", error.message);
    } else {
      setAttendance(data || []);
    }
    setLoading(false);
  };

  // ✨ NEW: Function to safely extract a readable name for sorting
  const getDisplayName = (row) => {
    if (row.is_guest && row.guest_name) return row.guest_name.toLowerCase();
    if (row.full_name) return row.full_name.toLowerCase();
    if (row.first_name || row.last_name) return `${row.first_name || ''} ${row.last_name || ''}`.trim().toLowerCase();
    return (row.email?.split('@')[0] || "unknown").toLowerCase();
  };

  // ✨ NEW: Sorted attendance list
  const sortedAttendance = [...attendance].sort((a, b) => {
    if (activeSort === "time_desc") {
      return new Date(b.check_in_time) - new Date(a.check_in_time);
    }
    if (activeSort === "time_asc") {
      return new Date(a.check_in_time) - new Date(b.check_in_time);
    }
    if (activeSort === "name_asc") {
      return getDisplayName(a).localeCompare(getDisplayName(b));
    }
    if (activeSort === "name_desc") {
      return getDisplayName(b).localeCompare(getDisplayName(a));
    }
    return 0;
  });

  if (loading && !events.length) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F6F5ED]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B59E74]"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F6F5ED] flex flex-col font-sans">
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 pt-28 pb-12">

        {/* Breadcrumb */}
        <div className="flex gap-4 mb-6 border-b border-gray-200 pb-3">
          <Link to="/admin" className="text-gray-500 hover:text-[#B59E74] font-bold uppercase tracking-widest text-sm transition-colors">Dashboard</Link>
          <span className="text-gray-300">|</span>
          <span className="text-[#B59E74] font-bold uppercase tracking-widest text-sm border-b-2 border-[#B59E74] pb-3 -mb-[13px]">Attendance</span>
        </div>

        <div className="mb-8 text-center">
          <h1 className="text-3xl font-serif text-[#B59E74] uppercase tracking-widest mb-2">
            Live Attendance Tracker
          </h1>
          <p className="text-gray-500 italic">Real-time list of checked-in parishioners.</p>
        </div>

        <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden">
          <div className="p-8 bg-gray-50 border-b border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-col gap-2 w-full md:w-auto">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                Select Event:
              </label>
              <EventSearchSelect
                events={events}
                value={selectedEvent}
                onChange={setSelectedEvent}
              />
            </div>
            <button
              onClick={fetchAttendance}
              className="bg-[#B59E74] text-white px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-[#9c8760] transition-all shadow-md"
            >
              Refresh List
            </button>
          </div>

          <div className="p-8">
            {!selectedEvent ? (
              <div className="text-center py-20 text-gray-400 italic font-serif">
                Please select an event to view attendees.
              </div>
            ) : (
              <div className="animate-fade-in">
                {/* ✨ NEW: Sort Dropdown Container */}
                <div className="flex justify-end mb-4">
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Sort By:</label>
                    <div className="relative">
                      <select
                        value={activeSort}
                        onChange={(e) => setActiveSort(e.target.value)}
                        className="appearance-none pl-4 pr-10 py-2.5 rounded-xl bg-white border border-gray-200 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] text-sm font-bold text-gray-700 cursor-pointer shadow-sm transition-colors"
                      >
                        <option value="time_desc">Check-in Time (Latest)</option>
                        <option value="time_asc">Check-in Time (Earliest)</option>
                        <option value="name_asc">Name (A-Z)</option>
                        <option value="name_desc">Name (Z-A)</option>
                      </select>
                      <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-[10px] text-gray-400 uppercase tracking-widest font-bold border-b border-gray-100">
                        <th className="p-4">Name</th>
                        <th className="p-4">Email</th>
                        <th className="p-4">Contact</th>
                        <th className="p-4">Role</th>
                        <th className="p-4 text-right">Check-in Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedAttendance.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="p-10 text-center text-gray-400 italic font-serif">
                            No one has checked in yet.
                          </td>
                        </tr>
                      ) : (
                        sortedAttendance.map((row, idx) => {
                          const isGuest = row.is_guest === true;
                          const displayName = isGuest && row.guest_name
                            ? row.guest_name
                            : row.full_name
                              ? row.full_name
                              : (row.first_name || row.last_name)
                                ? `${row.first_name || ''} ${row.last_name || ''}`.trim()
                                : row.email?.split('@')[0] || "Unknown";

                          const roleLabel = isGuest ? "guest" : (row.role || "parishioner");
                          const roleBadgeClass = {
                            admin:       "bg-emerald-100 text-emerald-700",
                            superadmin:  "bg-emerald-100 text-emerald-700",
                            priest:      "bg-amber-100 text-amber-700",
                            staff:       "bg-sky-100 text-sky-700",
                            ministry:    "bg-purple-100 text-purple-700",
                            parishioner: "bg-rose-100 text-rose-600",
                            guest:       "bg-gray-100 text-gray-500",
                          }[roleLabel] || "bg-gray-100 text-gray-500";

                          return (
                            <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                              <td className="p-4 font-medium text-gray-800 capitalize">
                                {displayName}
                              </td>
                              <td className="p-4 text-sm text-gray-500 lowercase">
                                {isGuest ? <span className="text-gray-300 italic">—</span> : row.email}
                              </td>
                              <td className="p-4 text-sm text-gray-500">
                                {isGuest ? (row.guest_contact || "—") : (row.contact_number || "—")}
                              </td>
                              <td className="p-4">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${roleBadgeClass}`}>
                                  {roleLabel}
                                </span>
                              </td>
                              <td className="p-4 text-right text-sm text-gray-500">
                                {new Date(row.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default AdminAttendanceList;