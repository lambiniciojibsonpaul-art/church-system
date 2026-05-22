import { useState, useEffect, useRef } from "react";
import { restSelect, restInsert } from "../supabaseRest";
import { useAuth } from "../contexts/useAuth";
import { ministryNames } from "../data/ministries";
import church1 from "../assets/Images/church1.jpg";

const EVENTS_CACHE_KEY = "eventsPage:events";
const EVENTS_CACHE_TTL_MS = 5 * 60 * 1000;
const EVENTS_FETCH_TIMEOUT_MS = 12000;

const INDOOR_FACILITIES = [
  "St. Francis of Assisi Hall (2nd Floor)",
  "St. Peter of Alcantara (Peach Room)",
  "St. Margaret of Cortona (Green Room)",
  "St. Louis IX (Blue Room)",
  "Main Church",
  "Holy Cave",
  "Portiuncula Formation and Renewal Hall",
  "Brother Sun Sister Moon Garden",
  "San Damiano Garden",
  "Chamber Room"
];

function readEventsCache() {
  try {
    const raw = sessionStorage.getItem(EVENTS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.events)) return null;
    if (Date.now() - parsed.ts > EVENTS_CACHE_TTL_MS) return null;
    return parsed.events;
  } catch {
    return null;
  }
}

function writeEventsCache(events) {
  try {
    sessionStorage.setItem(
      EVENTS_CACHE_KEY,
      JSON.stringify({ events, ts: Date.now() })
    );
  } catch { /* ignore */ }
}

function EventsPage() {
  const { user, role, isAdmin } = useAuth();
  const isMinistry = role === "ministry";
  const isPriest   = role === "priest";
  const isStaff    = role === "staff";
  const isMinister = role === "minister";
  // All internal/staff roles share the admin calendar UI
  const isStaffRole = isAdmin || isPriest || isStaff || isMinister;

  const today = new Date();
  const [currentDate, setCurrentDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState(today);

  const cachedEvents = readEventsCache();
  const [events, setEvents] = useState(cachedEvents || []);
  const [loading, setLoading] = useState(!cachedEvents);
  
  const [viewMode, setViewMode] = useState("Active");

  // Ministries this user belongs to — used to filter private events
  const [userMinistries, setUserMinistries] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [isCollaborating, setIsCollaborating] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [formData, setFormData] = useState({
    title: "",
    ministry: "",
    collaborators: [],
    eventDate: "",
    eventTime: "",
    location: "",
    description: "",
    isInside: true,
    setting: "",
    isPublic: true,
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  // Fetch the current user's ministry memberships for private-event filtering
  useEffect(() => {
    if (!user?.id || (role !== "minister" && role !== "ministry")) return;
    const ministries = [];
    // ministry role stores their group in user_metadata
    if (role === "ministry" && user.user_metadata?.ministry_group) {
      ministries.push(user.user_metadata.ministry_group);
    }
    // minister role stores ministries array in profile
    restSelect("profiles", { select: "ministries", match: { id: user.id }, single: true, timeoutMs: 8000 })
      .then(({ data }) => {
        if (Array.isArray(data?.ministries)) {
          setUserMinistries([...new Set([...ministries, ...data.ministries])]);
        } else if (ministries.length) {
          setUserMinistries(ministries);
        }
      });
  }, [user?.id, role]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  const fetchEvents = async () => {
    try {
      const { data, error } = await restSelect("events", {
        order: "event_time.asc",
        timeoutMs: EVENTS_FETCH_TIMEOUT_MS,
      });

      if (error) {
        console.warn("Events fetch failed:", error.message);
      } else if (data) {
        setEvents(data);
        writeEventsCache(data);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const toggleCollaborator = (ministryName) => {
    setFormData((prev) => {
      const currentList = prev.collaborators;
      if (currentList.includes(ministryName)) {
        return { ...prev, collaborators: currentList.filter(name => name !== ministryName) };
      } else {
        return { ...prev, collaborators: [...currentList, ministryName] };
      }
    });
  };

  const handleOpenModal = () => {
    const yyyy = selectedDate.getFullYear();
    const mm = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const dd = String(selectedDate.getDate()).padStart(2, "0");

    setFormData({
      ...formData,
      eventDate: `${yyyy}-${mm}-${dd}`,
      isInside: true,
      setting: "",
      isPublic: true,
    });
    setIsCollaborating(false);
    setIsDropdownOpen(false);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isCollaborating && formData.collaborators.length === 0) {
      alert("Please select at least one collaborating ministry, or uncheck the Collaboration box.");
      return;
    }

    setSubmitting(true);

    try {
      const finalDescription = isCollaborating && formData.collaborators.length > 0
        ? `${formData.description}\n\n🤝 In collaboration with: ${formData.collaborators.join(", ")}`
        : formData.description;

      const evPayload = {
        creator_id:   user.id,
        title:        formData.title,
        event_class:  "Parish Event",
        priest_name:  formData.ministry,
        ministry:     formData.ministry,
        collaborators: isCollaborating ? formData.collaborators : [],
        event_date:   formData.eventDate,
        event_time:   formData.eventTime,
        location:     formData.location,
        description:  finalDescription,
        setting:      formData.setting,
        is_public:    formData.isPublic,
        status:       isMinistry ? "Pending" : "Active",
      };

      let { error } = await restInsert("events", [evPayload]);

      // Retry without new columns if DB migration hasn't been run yet
      if (error && (error.code === "PGRST204" || error.message?.includes("column"))) {
        const fallback = { ...evPayload };
        delete fallback.collaborators;
        delete fallback.is_public;
        const retry = await restInsert("events", [fallback]);
        if (retry.error) throw new Error(retry.error.message);
      } else if (error) {
        throw new Error(error.message);
      }

      if (isMinistry) {
        alert("Event submitted successfully! It is now pending approval from the Admin.");
      }

      setIsModalOpen(false);
      fetchEvents();
      setFormData({
        title: "",
        ministry: "",
        collaborators: [],
        eventDate: "",
        eventTime: "",
        location: "",
        description: "",
        isInside: true,
        setting: "",
        isPublic: true,
      });
      setIsCollaborating(false);
      
    } catch (error) {
      console.error("Database Error:", error.message);
      alert("Failed to create event. The system said: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // --- CALENDAR HELPERS ---
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthNames = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();
  const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const firstDay = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());
  const blanks = Array.from({ length: firstDay }, () => null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const calendarGrid = [...blanks, ...days];

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const handleDayClick = (day) => {
    if (day) setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
  };

  // --- BULLET-PROOF CHRONOLOGICAL SORTING FOR CALENDAR PAGE ---
  const isCancelledView = isStaffRole && viewMode === "Cancelled";

  const canSeeEvent = (e) => {
    // Admin, priest, and staff see all events including private ones
    if (isAdmin || isPriest || isStaff) return true;
    // Public or no flag (backward compat) — visible to all
    if (e.is_public !== false) return true;
    // Private: minister/ministry role can only see if their ministry is the host or collaborator
    const permitted = [
      e.ministry,
      ...(Array.isArray(e.collaborators) ? e.collaborators : []),
    ].filter(Boolean);
    return userMinistries.some(m => permitted.includes(m));
  };

  const visibleEvents = events
    .filter((e) => {
      const status = e.status || "Active";
      if (isCancelledView ? status !== "Cancelled" : status !== "Active") return false;
      return canSeeEvent(e);
    })
    .sort((a, b) => {
      const dateA = a.event_date || "9999-12-31";
      const timeA = a.event_time || "23:59:59";
      const dateB = b.event_date || "9999-12-31";
      const timeB = b.event_time || "23:59:59";
      
      const dtA = new Date(`${dateA}T${timeA}`).getTime();
      const dtB = new Date(`${dateB}T${timeB}`).getTime();
      
      if (isNaN(dtA) || isNaN(dtB)) {
        return `${dateA}T${timeA}`.localeCompare(`${dateB}T${timeB}`);
      }
      return dtA - dtB;
    });

  const getEventsForDate = (dateToMatch) => {
    return visibleEvents.filter((e) => {
      const eventDate = new Date(e.event_date + "T00:00:00");
      return eventDate.toDateString() === dateToMatch.toDateString();
    });
  };

  const selectedEvents = getEventsForDate(selectedDate);
  
  const formatTime = (timeStr) => {
    if (!timeStr) return "";
    const [h, m] = timeStr.split(":");
    let hours = parseInt(h, 10);
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${hours}:${m} ${ampm}`;
  };

  const backgroundStyle = {
    backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url('${church1}')`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundAttachment: "fixed",
  };

  return (
    <div className={`relative min-h-screen w-full flex flex-col font-sans ${isStaffRole || isMinistry ? "bg-gray-50" : "bg-white"}`}>
      {!isStaffRole && !isMinistry && (
        <main style={backgroundStyle} className="relative h-[60vh] md:h-screen flex flex-col items-center justify-center text-center px-4 text-white">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mt-16">Events</h1>
        </main>
      )}

      <section className={isStaffRole || isMinistry ? "w-full px-6 pt-32 pb-12" : "relative w-full z-20 -mt-24 pb-32 px-6"}>
        <div className={isStaffRole || isMinistry ? "max-w-7xl mx-auto" : "bg-[#F6F5ED] rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] max-w-7xl mx-auto py-12 px-6 md:px-12 text-left"}>
          {isStaffRole || isMinistry ? (
            <div className="mb-8">
              <h1 className="text-3xl md:text-4xl font-serif text-[#B59E74] mb-2 uppercase tracking-wide">Parish Events</h1>
              <p className="text-gray-500 font-serif italic">
                {isAdmin ? "Manage and review parish events. Select a date to see what's scheduled."
                  : isMinistry ? "View the parish calendar and propose events for your ministry."
                  : "View and browse parish events. Select a date to see what's scheduled."}
              </p>
            </div>
          ) : (
            <>
              <div className="text-center max-w-3xl mx-auto mb-12">
                <h2 className="text-3xl md:text-4xl text-[#B59E74] font-serif uppercase tracking-widest mb-6 font-medium">Church Calendar</h2>
                <p className="text-gray-600 font-serif italic text-lg">Stay connected with our parish family. Select a date on the calendar below to view upcoming masses, community gatherings, and special ceremonies.</p>
              </div>
              <hr className="border-gray-300 border-t w-full max-w-5xl mx-auto mb-12" />
            </>
          )}

          <div className="flex flex-col lg:flex-row gap-12 max-w-6xl mx-auto">
            <div className="flex-1 bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-[#B59E74]/20 h-fit">
              <div className="flex justify-between items-center mb-6">
                <button onClick={prevMonth} className="p-2 hover:bg-[#F6F5ED] rounded-full transition-colors text-[#B59E74]"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg></button>
                <h3 className="text-2xl font-serif font-bold text-gray-800">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
                <button onClick={nextMonth} className="p-2 hover:bg-[#F6F5ED] rounded-full transition-colors text-[#B59E74]"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg></button>
              </div>

              <div className="grid grid-cols-7 gap-2 text-center mb-4">
                {daysOfWeek.map((day) => (<div key={day} className="text-xs font-bold uppercase tracking-widest text-gray-400">{day}</div>))}
              </div>

              <div className="grid grid-cols-7 gap-2 text-center">
                {calendarGrid.map((day, index) => {
                  if (!day) return <div key={`blank-${index}`} className="h-12 w-12"></div>;
                  const thisDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                  const isSelected = selectedDate.toDateString() === thisDate.toDateString();
                  const hasEvent = getEventsForDate(thisDate).length > 0;
                  const isToday = today.toDateString() === thisDate.toDateString();

                  return (
                    <button key={day} onClick={() => handleDayClick(day)} className={`relative h-10 w-10 sm:h-12 sm:w-12 mx-auto flex items-center justify-center rounded-full text-sm sm:text-base font-medium transition-all duration-200 ${isSelected ? "bg-[#B59E74] text-white shadow-md" : "text-gray-700 hover:bg-[#F6F5ED]"} ${isToday && !isSelected ? "border-2 border-[#B59E74] text-[#B59E74]" : ""}`}>
                      {day}
                      <span className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white" : hasEvent ? "bg-[#B9554A]" : "bg-[#86efac]"}`}></span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 flex flex-col gap-6">
              {isStaffRole && (
                <>
                  {/* Mobile dropdown */}
                  <div className="relative sm:hidden">
                    <select
                      value={viewMode}
                      onChange={(e) => setViewMode(e.target.value)}
                      className="appearance-none w-full pl-4 pr-10 py-3 rounded-xl bg-[#F6F5ED] border border-gray-100 focus:outline-none focus:ring-2 focus:ring-[#B59E74] text-sm font-bold uppercase tracking-widest text-gray-700 cursor-pointer"
                    >
                      <option value="Active">Active Events</option>
                      <option value="Cancelled">Cancelled Events</option>
                    </select>
                    <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  {/* Desktop pill tabs */}
                  <div className="hidden sm:flex items-center justify-start gap-2 p-1.5 bg-[#F6F5ED] rounded-full w-fit border border-gray-100">
                    {[{ key: "Active", label: "Active Events" }, { key: "Cancelled", label: "Cancelled Events" }].map((opt) => (
                      <button key={opt.key} type="button" onClick={() => setViewMode(opt.key)} className={`flex-none px-4 sm:px-6 py-2 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-tighter transition-all ${viewMode === opt.key ? (opt.key === "Cancelled" ? "bg-orange-600 text-white shadow-md" : "bg-[#B59E74] text-white shadow-md") : "text-gray-500 hover:text-gray-700"}`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              )}

              <div className="bg-[#B59E74] p-6 rounded-2xl shadow-sm text-white flex flex-col md:flex-row justify-between items-center md:items-start relative overflow-hidden">
                <div className="z-10 text-center md:text-left">
                  <span className="text-sm font-bold tracking-widest uppercase opacity-80 mb-1 block">Schedule For</span>
                  <h3 className="text-2xl lg:text-3xl font-serif font-medium">{selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</h3>
                </div>
                {isMinistry && (
                  <button onClick={handleOpenModal} className="mt-4 md:mt-0 z-10 bg-white text-[#B59E74] hover:bg-gray-50 px-4 py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest shadow-sm transition-transform hover:scale-105 flex items-center gap-2">
                    <span className="text-lg leading-none">+</span> Propose Event
                  </button>
                )}
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl"></div>
              </div>

              <div className="flex flex-col gap-3">
                {loading ? (
                  <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#B59E74]"></div></div>
                ) : selectedEvents.length > 0 ? (
                  isStaffRole ? (
                    /* ── STAFF / ADMIN: compact list rows ── */
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                      {selectedEvents.map((event, idx) => {
                        const cancelled = (event.status || "Active") === "Cancelled";
                        return (
                          <div key={event.id} className={`flex items-start gap-4 px-5 py-4 hover:bg-gray-50/60 transition-colors ${idx !== 0 ? "border-t border-gray-50" : ""}`}>
                            <div className="flex-1 min-w-0">
                              <p className={`font-serif font-medium text-base leading-tight ${cancelled ? "text-gray-400 line-through" : "text-gray-800"}`}>{event.title}</p>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5">
                                {event.event_time  && <span className="text-[11px] text-gray-400">{formatTime(event.event_time)}</span>}
                                {event.location    && <span className="text-[11px] text-gray-400">{event.location}</span>}
                                {event.priest_name && <span className="text-[11px] text-gray-400 italic">Host: {event.priest_name}</span>}
                              </div>
                              {event.description && <p className="text-[11px] text-gray-400 mt-1 leading-relaxed line-clamp-2">{event.description}</p>}
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              {cancelled && <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md bg-orange-600 text-white">Cancelled</span>}
                              {event.is_public === false && <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md bg-gray-700 text-white">🔒 Private</span>}
                              {event.setting && <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 truncate max-w-[120px]">{event.setting}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* ── PUBLIC: original decorative cards ── */
                    selectedEvents.map((event) => {
                      const cancelled = (event.status || "Active") === "Cancelled";
                      return (
                        <div key={event.id} className={`p-6 rounded-2xl shadow-sm flex flex-col gap-4 animate-fade-in-up relative overflow-hidden group ${cancelled ? "bg-orange-50/40 border border-orange-200" : "bg-white border border-gray-100"}`}>
                          <div className="absolute top-4 right-4 flex flex-col items-end gap-1">
                            {cancelled && <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md bg-orange-600 text-white">Cancelled</span>}
                            {event.is_public === false && <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md bg-gray-700 text-white flex items-center gap-1">🔒 Private</span>}
                            {event.setting && <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md bg-blue-50 text-blue-600 truncate max-w-[150px]">{event.setting}</span>}
                          </div>
                          <h4 className={`text-2xl font-bold pr-24 ${cancelled ? "text-gray-500 line-through decoration-orange-400/70" : "text-gray-800"}`}>{event.title}</h4>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-sm text-gray-600 font-serif italic">
                            <div className="flex items-center gap-2"><svg className="w-5 h-5 text-[#B59E74]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>{formatTime(event.event_time)}</div>
                            <div className="hidden sm:block w-1 h-1 bg-gray-300 rounded-full"></div>
                            <div className="flex items-center gap-2"><svg className="w-5 h-5 text-[#B59E74]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>{event.location || "Parish"}</div>
                          </div>
                          {event.priest_name && (
                            <div className="flex items-center gap-2 text-sm text-gray-700 font-medium border-t border-gray-100 pt-3">
                              <svg className="w-5 h-5 text-[#B59E74]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-5.13a4 4 0 11-8 0 4 4 0 018 0zm6 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                              <span className="text-gray-500 italic mr-1">Hosted by:</span>{event.priest_name}
                            </div>
                          )}
                          {event.description && <p className="text-gray-700 leading-relaxed mt-1 text-sm whitespace-pre-wrap">{event.description}</p>}
                        </div>
                      );
                    })
                  )
                ) : (
                  <div className="bg-transparent border-2 border-dashed border-[#B59E74]/30 rounded-2xl p-10 flex flex-col items-center justify-center text-center h-full min-h-[250px]">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-12 h-12 text-[#B59E74]/50 mb-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
                    <h4 className="text-xl font-serif text-gray-500 mb-2">{isCancelledView ? "No Cancelled Events" : "No Scheduled Events"}</h4>
                    <p className="text-sm text-gray-400 italic">{isCancelledView ? "Nothing has been cancelled for this date." : "There are no activities currently planned for this date."}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- ADD EVENT MODAL (With Checkbox Collaboration) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl relative scrollbar-hidden">
            <div className="sticky top-0 bg-white px-8 py-6 z-10 flex justify-between items-center border-b border-gray-100">
              <h2 className="text-xl font-serif text-[#B59E74] uppercase tracking-widest font-medium">
                {isMinistry ? "Propose Ministry Event" : "Create New Event"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-600">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              {isMinistry && (
                <div className="bg-blue-50 text-blue-700 p-4 rounded-xl text-sm border border-blue-100 mb-6 font-medium">
                  ℹ️ Events proposed by ministries will be sent to the Parish Office for approval before appearing on the public calendar.
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-600 uppercase">Event Title *</label>
                <input type="text" name="title" required value={formData.title} onChange={handleChange} className="p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#B59E74] outline-none" placeholder="e.g., Youth Retreat 2026" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600 uppercase">Hosting Ministry *</label>
                  <select name="ministry" required value={formData.ministry} onChange={handleChange} className="p-3 rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-[#B59E74]">
                    <option value="" disabled>Select your ministry…</option>
                    {ministryNames.map((name) => (<option key={name} value={name}>{name}</option>))}
                  </select>
                </div>
                
                {/* CUSTOM CHECKBOX COLLABORATION DROPDOWN */}
                <div className="flex flex-col gap-1 relative" ref={dropdownRef}>
                  <label className="text-xs font-bold text-gray-600 uppercase flex items-center gap-2 h-[18px]">
                    <input type="checkbox" checked={isCollaborating} onChange={(e) => { setIsCollaborating(e.target.checked); if (!e.target.checked) setFormData({...formData, collaborators: []}); }} className="accent-[#B59E74]" />
                    Collaboration
                  </label>
                  
                  {isCollaborating ? (
                    <div className="relative">
                      <div onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="w-full p-3 rounded-xl border border-gray-300 bg-white cursor-pointer min-h-[50px] flex items-center justify-between transition-colors hover:border-[#B59E74]">
                        <div className="flex-1 truncate text-sm text-gray-700">
                          {formData.collaborators.length === 0 ? "Select partner ministries..." : `${formData.collaborators.length} ministry selected`}
                        </div>
                        <svg className={`w-4 h-4 text-gray-500 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                      </div>

                      {isDropdownOpen && (
                        <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto animate-fade-in">
                          {ministryNames.filter(m => m !== formData.ministry).map((name) => {
                            const isChecked = formData.collaborators.includes(name);
                            return (
                              <label key={name} className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0 transition-colors">
                                <input type="checkbox" checked={isChecked} onChange={() => toggleCollaborator(name)} className="w-4 h-4 text-[#B59E74] bg-gray-100 border-gray-300 rounded focus:ring-[#B59E74] focus:ring-2" />
                                <span className="text-sm text-gray-700 flex-1">{name}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl border border-gray-100 bg-gray-50 text-gray-400 text-sm italic">Hosting solely</div>
                  )}
                </div>
              </div>

              {/* Show selected pills directly under the dropdown if they have chosen any */}
              {isCollaborating && formData.collaborators.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.collaborators.map(partner => (
                    <span key={partner} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F6F5ED] text-[#B59E74] text-[11px] font-bold uppercase tracking-widest border border-[#B59E74]/30 animate-fade-in-up">
                      {partner}
                      <button type="button" onClick={() => toggleCollaborator(partner)} className="hover:text-red-500 focus:outline-none">✕</button>
                    </span>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600 uppercase">Date *</label>
                  <input type="date" name="eventDate" required min={new Date().toISOString().split('T')[0]} value={formData.eventDate} onChange={handleChange} className="p-3 rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-[#B59E74]" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600 uppercase">Time *</label>
                  <input type="time" name="eventTime" required value={formData.eventTime} onChange={handleChange} className="p-3 rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-[#B59E74]" />
                </div>
              </div>

              {/* DYNAMIC INDOOR/OUTDOOR TOGGLE */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600 uppercase">Setting Type</label>
                  <div className="flex items-center gap-4 mt-2 h-full">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input 
                        type="radio" 
                        checked={formData.isInside === true} 
                        onChange={() => setFormData({ ...formData, isInside: true, setting: "" })} 
                        className="w-4 h-4 text-[#B59E74] focus:ring-[#B59E74]" 
                      /> 
                      Indoor
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input 
                        type="radio" 
                        checked={formData.isInside === false} 
                        onChange={() => setFormData({ ...formData, isInside: false, setting: "" })} 
                        className="w-4 h-4 text-[#B59E74] focus:ring-[#B59E74]" 
                      /> 
                      Outdoor
                    </label>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600 uppercase">
                    {formData.isInside ? "Select Facility *" : "Outdoor Location *"}
                  </label>
                  {formData.isInside ? (
                    <select 
                      name="setting" 
                      required 
                      value={formData.setting} 
                      onChange={handleChange} 
                      className="p-3 rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-[#B59E74]"
                    >
                      <option value="" disabled>Select a Facility</option>
                      {INDOOR_FACILITIES.map(facility => (
                        <option key={facility} value={facility}>{facility}</option>
                      ))}
                    </select>
                  ) : (
                    <input 
                      type="text" 
                      name="setting" 
                      required 
                      value={formData.setting} 
                      onChange={handleChange} 
                      className="p-3 rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-[#B59E74]" 
                      placeholder="e.g., Parish Courtyard" 
                    />
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-600 uppercase">General Address *</label>
                <input type="text" name="location" required value={formData.location} onChange={handleChange} className="p-3 rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-[#B59E74]" placeholder="e.g., San Pedro Bautista" />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-600 uppercase">Event Description</label>
                <textarea name="description" value={formData.description} onChange={handleChange} rows="3" className="p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#B59E74] outline-none resize-none" placeholder="Provide details about the event..."></textarea>
              </div>

              {/* ── VISIBILITY TOGGLE ── */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div>
                  <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    {formData.isPublic ? "🌐 Public Event" : "🔒 Private Event"}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {formData.isPublic
                      ? "Visible to all parishioners on the calendar"
                      : "Only the hosting ministry and collaborators will see this"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, isPublic: !prev.isPublic }))}
                  className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none ${formData.isPublic ? "bg-[#B59E74]" : "bg-gray-300"}`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${formData.isPublic ? "translate-x-7" : "translate-x-1"}`} />
                </button>
              </div>

              {!formData.isPublic && (
                <div className="flex items-start gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-700">
                  <span className="shrink-0 mt-0.5">🔒</span>
                  <span>
                    This event will only appear on the calendar for ministers assigned to the <strong>Hosting Ministry</strong>
                    {isCollaborating && formData.collaborators.length > 0 && (
                      <> and <strong>{formData.collaborators.join(", ")}</strong></>
                    )}.
                  </span>
                </div>
              )}

              <button type="submit" disabled={submitting} className="w-full bg-[#B59E74] hover:bg-[#9c8760] text-white font-bold py-4 rounded-xl uppercase tracking-widest mt-4 shadow-md transition-colors disabled:opacity-70">
                {submitting ? "Saving..." : isMinistry ? "Submit for Approval" : "Post Event to Calendar"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default EventsPage;