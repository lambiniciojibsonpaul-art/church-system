import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { restSelect, restInsert, restUpdate, restDelete } from "../supabaseRest";
import { useAuth } from "../contexts/useAuth";

const EVENT_CLASSES = [
  "Mass",
  "Parish Event",
  "Liturgical",
  "Meeting",
  "Seminar / Formation",
  "General Event"
];

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

function AdminSchedules() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  
  // NEW: State to hold the dynamic list of priests
  const [priestNames, setPriestNames] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [activeTab, setActiveTab] = useState("All");

  const [rejectingEvent, setRejectingEvent] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [cancellingEvent, setCancellingEvent] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [deletingEvent, setDeletingEvent] = useState(null);

  const [formData, setFormData] = useState({
    title: "",
    eventClass: "Mass", 
    priestName: "",
    eventDate: "",
    eventTime: "",
    location: "Main Church",
    description: "",
    isInside: true, 
    setting: "", 
  });

  useEffect(() => {
    // Fetch both events and priests when the component mounts
    Promise.all([fetchEvents(), fetchPriests()]).finally(() => {
      setLoading(false);
    });
  }, []);

  const fetchEvents = async () => {
    try {
      const { data, error } = await restSelect("events", {
        order: "event_date.asc",
        timeoutMs: 12000,
      });
      
      if (error) throw error;
      if (data) setEvents(data);
    } catch (err) {
      console.error("Failed to load events:", err);
    }
  };

  // NEW: Function to fetch priests from the database
  const fetchPriests = async () => {
    try {
      const { data, error } = await restSelect("priests", {
        match: { is_active: true }, // Only get active priests
        order: "name.asc",
        timeoutMs: 10000,
      });

      if (error) throw error;
      if (data) {
        // Extract just the names into a simple array
        setPriestNames(data.map(p => p.name));
      }
    } catch (err) {
      console.error("Failed to load priests:", err);
      // Fallback list just in case the database fetch fails
      setPriestNames([
        "Rev. Fr. Pedro Bautista",
        "Rev. Fr. Juan Dela Cruz",
        "Rev. Fr. Michael Smith",
        "Rev. Fr. Antonio Luna",
        "Rev. Fr. Gabriel Santos"
      ]);
    }
  };

  const handleChange = (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleOpenEventModal = () => {
    setFormData({
      title: "",
      eventClass: "Mass",
      priestName: "",
      eventDate: "",
      eventTime: "",
      location: "Main Church",
      description: "",
      isInside: true,
      setting: "", 
    });
    setIsModalOpen(true);
  };

  // --- ACTIONS ---
  const handleApprove = async (eventToApprove) => {
    try {
      const { error } = await restUpdate("events", { id: eventToApprove.id }, { status: "Active" });
      if (error) throw new Error(error.message);
      setEvents(events.map(ev => ev.id === eventToApprove.id ? { ...ev, status: "Active" } : ev));
    } catch (err) {
      alert("Failed to approve event: " + err.message);
    }
  };

  const confirmReject = async () => {
    if (!rejectionReason.trim()) return alert("Please provide a reason.");
    try {
      const { error } = await restUpdate("events", { id: rejectingEvent.id }, { status: "Rejected", cancellation_remarks: rejectionReason });
      if (error) throw new Error(error.message);
      setEvents(events.map(ev => ev.id === rejectingEvent.id ? { ...ev, status: "Rejected", cancellation_remarks: rejectionReason } : ev));
      setRejectingEvent(null);
      setRejectionReason("");
    } catch (err) {
      alert("Failed to reject event: " + err.message);
    }
  };

  const confirmCancel = async () => {
    if (!cancelReason.trim()) return alert("Please provide a reason.");
    try {
      const { error } = await restUpdate("events", { id: cancellingEvent.id }, { status: "Cancelled", cancellation_remarks: cancelReason });
      if (error) throw new Error(error.message);
      setEvents(events.map(ev => ev.id === cancellingEvent.id ? { ...ev, status: "Cancelled", cancellation_remarks: cancelReason } : ev));
      setCancellingEvent(null);
      setCancelReason("");
    } catch (err) {
      alert("Failed to cancel event: " + err.message);
    }
  };

  const confirmDelete = async () => {
    try {
      const { error } = await restDelete("events", { id: deletingEvent.id });
      if (error) throw new Error(error.message);
      setEvents(events.filter(ev => ev.id !== deletingEvent.id));
      setDeletingEvent(null);
    } catch (err) {
      alert("Failed to delete event: " + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { error } = await restInsert("events", [
        {
          creator_id: user.id,
          title: formData.title,
          event_class: formData.eventClass, 
          priest_name: formData.priestName, 
          event_date: formData.eventDate,
          event_time: formData.eventTime,
          location: formData.location,
          description: formData.description,
          setting: formData.setting, 
          status: "Active"
        },
      ]);

      if (error) throw new Error(error.message);

      setIsModalOpen(false);
      fetchEvents();
      
    } catch (error) {
      console.error("Database Error:", error.message);
      alert("Failed to create schedule: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // --- BULLET-PROOF CHRONOLOGICAL SORTING ---
  const visibleEvents = events
    .filter(ev => {
      const status = ev.status || "Active";
      if (activeTab === "All") return true;
      return status === activeTab;
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

  const pendingCount = events.filter(ev => ev.status === "Pending").length;

  if (loading)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B59E74]"></div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 pt-32 pb-12">
        
        <div className="flex gap-4 mb-8 border-b border-gray-200 pb-4">
          <Link to="/admin" className="text-gray-500 hover:text-[#B59E74] font-bold uppercase tracking-widest text-sm transition-colors">Requests Dashboard</Link>
          <span className="text-gray-300">|</span>
          <Link to="/admin/schedules" className="text-[#B59E74] font-bold uppercase tracking-widest text-sm border-b-2 border-[#B59E74] pb-4 -mb-[18px]">Schedules & Events</Link>
        </div>

        {/* --- HEADER --- */}
        <div className="flex flex-col md:flex-row justify-between md:items-end mb-8 gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-serif text-gray-800 uppercase tracking-wide">Parish Schedules</h1>
            <p className="text-gray-500 font-serif italic mt-1">Manage parish events, review ministry proposals, and assign priests.</p>
          </div>
          
          <button 
            onClick={handleOpenEventModal} 
            className="bg-[#B59E74] border-2 border-[#B59E74] hover:bg-[#9c8760] hover:border-[#9c8760] text-white px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-sm shadow-md transition-colors flex items-center gap-2 h-fit"
          >
            <span className="text-lg leading-none">+</span> Add Event
          </button>
        </div>

        <div className="flex gap-2 sm:gap-4 mb-6 p-2 bg-[#F6F5ED] rounded-full w-fit border border-gray-100 overflow-x-auto">
          {["All", "Pending", "Active", "Cancelled", "Rejected"].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 sm:px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all relative ${activeTab === tab ? "bg-[#B59E74] text-white shadow-md" : "text-gray-500 hover:text-gray-700"}`}>
              {tab}
              {tab === "Pending" && pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] text-white">{pendingCount}</span>
              )}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8">
          {visibleEvents.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              <div className="text-4xl mb-4">📅</div>
              <h3 className="text-lg font-serif">No {activeTab !== "All" ? activeTab.toLowerCase() : ""} schedules found.</h3>
              <p className="text-sm">Click "Add Event" to create a new schedule.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleEvents.map((ev) => {
                const isPending = ev.status === "Pending";
                const isCancelledOrRejected = ev.status === "Cancelled" || ev.status === "Rejected";

                return (
                <div key={ev.id} className={`border border-gray-100 rounded-2xl p-6 transition-all relative flex flex-col h-full ${isPending ? "bg-yellow-50/30 border-yellow-200" : isCancelledOrRejected ? "bg-red-50/30 border-red-100 opacity-80" : "hover:shadow-md"}`}>
                  <div className={`absolute top-0 left-0 w-1.5 h-full rounded-l-2xl ${isPending ? "bg-yellow-400" : isCancelledOrRejected ? "bg-red-400" : ev.event_class === "Mass" ? "bg-[#B59E74]" : "bg-gray-800"}`}></div>
                  
                  <div className="flex justify-between items-start mb-3 gap-2">
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md shrink-0 ${isPending ? "bg-yellow-100 text-yellow-700" : isCancelledOrRejected ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                      {ev.status || "Active"}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md bg-gray-100 text-gray-600 truncate text-right">
                      {ev.event_class}
                    </span>
                  </div>
                  
                  <h3 className={`text-xl font-serif font-medium leading-tight mb-1 ${isCancelledOrRejected ? "text-gray-500 line-through" : "text-gray-800"}`}>
                    {ev.title}
                  </h3>
                  
                  <p className="text-sm text-gray-500 font-serif italic mb-4">
                    {isPending ? "Proposed by: " : "Hosted by: "} 
                    <span className="font-semibold">{ev.priest_name}</span>
                  </p>

                  <div className="space-y-2 text-sm text-gray-600 border-t border-gray-50 pt-4 flex-1">
                    <div className="flex items-center gap-2"><span>🗓️</span> {new Date(ev.event_date).toLocaleDateString()}</div>
                    <div className="flex items-center gap-2"><span>⏰</span> {ev.event_time}</div>
                    
                    {ev.setting && <div className="flex items-center gap-2"><span>🚪</span> {ev.setting}</div>}
                    <div className="flex items-center gap-2"><span>📍</span> {ev.location}</div>
                    
                    {ev.description && (
                      <div className="mt-3 text-xs text-gray-500 border-l-2 border-gray-200 pl-2 whitespace-pre-wrap">
                        {ev.description}
                      </div>
                    )}
                    
                    {isCancelledOrRejected && ev.cancellation_remarks && (
                      <div className="mt-3 text-xs bg-red-100 text-red-700 p-2 rounded-lg">
                        <strong>Reason:</strong> {ev.cancellation_remarks}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 border-t border-gray-100 pt-4 flex gap-2">
                    {isPending && (
                      <>
                        <button onClick={() => handleApprove(ev)} className="flex-1 bg-green-50 hover:bg-green-600 text-green-600 hover:text-white py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors">✓ Accept</button>
                        <button onClick={() => { setRejectingEvent(ev); setRejectionReason(""); }} className="flex-1 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors">✕ Reject</button>
                      </>
                    )}
                    {(ev.status === "Active" || !ev.status) && (
                      <button onClick={() => { setCancellingEvent(ev); setCancelReason(""); }} className="w-full bg-orange-50 hover:bg-orange-600 text-orange-600 hover:text-white py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors">Cancel Event</button>
                    )}
                    {isCancelledOrRejected && (
                      <button onClick={() => setDeletingEvent(ev)} className="w-full bg-red-50 hover:bg-red-600 text-red-600 hover:text-white py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors">Delete Permanently</button>
                    )}
                  </div>
                </div>
              )})}
            </div>
          )}
        </div>
      </main>

      {/* --- REJECT MODAL --- */}
      {rejectingEvent && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up">
            <div className="bg-red-50 px-8 py-6 border-b border-red-100">
              <h2 className="text-xl font-serif text-red-800 font-medium uppercase tracking-widest">Reject Proposal</h2>
              <p className="text-sm text-red-600 italic">For {rejectingEvent.title}</p>
            </div>
            <div className="p-8 space-y-6">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Reason for Rejection *</label>
                <textarea className="p-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-red-500 outline-none h-32 text-sm resize-none" placeholder="Tell the ministry why this was rejected..." value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setRejectingEvent(null)} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-500 font-bold text-xs uppercase tracking-widest hover:bg-gray-50 transition-all">Cancel</button>
                <button onClick={confirmReject} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold text-xs uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-200">Reject</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- CANCEL EVENT MODAL --- */}
      {cancellingEvent && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up">
            <div className="bg-orange-50 px-8 py-6 border-b border-orange-100">
              <h2 className="text-xl font-serif text-orange-800 font-medium uppercase tracking-widest">Cancel Event</h2>
              <p className="text-sm text-orange-700 italic">For {cancellingEvent.title}</p>
            </div>
            <div className="p-8 space-y-6">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Cancellation Reason *</label>
                <textarea className="p-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-orange-500 outline-none h-32 text-sm resize-none" placeholder="Why is this active event being cancelled?" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setCancellingEvent(null)} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-500 font-bold text-xs uppercase tracking-widest hover:bg-gray-50 transition-all">Keep Active</button>
                <button onClick={confirmCancel} className="flex-1 py-3 rounded-xl bg-orange-600 text-white font-bold text-xs uppercase tracking-widest hover:bg-orange-700 transition-all shadow-lg shadow-orange-200">Confirm Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- DELETE MODAL --- */}
      {deletingEvent && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up">
            <div className="bg-red-50 px-8 py-6 border-b border-red-100">
              <h2 className="text-xl font-serif text-red-800 font-medium uppercase tracking-widest">Delete Record</h2>
              <p className="text-sm text-red-700 italic">For {deletingEvent.title}</p>
            </div>
            <div className="p-8 space-y-6">
              <p className="text-sm text-gray-600">This will permanently remove this event from the database. This action cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeletingEvent(null)} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-500 font-bold text-xs uppercase tracking-widest hover:bg-gray-50 transition-all">Keep Record</button>
                <button onClick={confirmDelete} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold text-xs uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-200">Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- CREATE EVENT MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl relative scrollbar-hidden">
            <div className="sticky top-0 bg-white px-8 py-6 z-10 flex justify-between items-center border-b border-gray-100">
              <h2 className="text-xl font-serif text-[#B59E74] uppercase tracking-widest">
                Create New Schedule
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600 uppercase">
                    Event Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    required
                    value={formData.title}
                    onChange={handleChange}
                    className="p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#B59E74] outline-none"
                    placeholder="e.g., Sunday Morning Mass"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600 uppercase">
                    Event Type *
                  </label>
                  <select
                    name="eventClass"
                    required
                    value={formData.eventClass}
                    onChange={handleChange}
                    className="p-3 rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-[#B59E74] font-bold text-[#B59E74]"
                  >
                    {EVENT_CLASSES.map((cls) => (
                      <option key={cls} value={cls}>
                        {cls}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-600 uppercase">
                  Hosting Priest / Lead *
                </label>
                <select
                  name="priestName"
                  required
                  value={formData.priestName}
                  onChange={handleChange}
                  className="p-3 rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-[#B59E74]"
                >
                  <option value="" disabled>Select a priest...</option>
                  {priestNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600 uppercase">Date *</label>
                  <input
                    type="date"
                    name="eventDate"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={formData.eventDate}
                    onChange={handleChange}
                    className="p-3 rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-[#B59E74]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600 uppercase">Start Time *</label>
                  <input
                    type="time"
                    name="eventTime"
                    required
                    value={formData.eventTime}
                    onChange={handleChange}
                    className="p-3 rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-[#B59E74]"
                  />
                </div>
              </div>

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
                <label className="text-xs font-bold text-gray-600 uppercase">
                  General Location *
                </label>
                <input
                  type="text"
                  name="location"
                  required
                  value={formData.location}
                  onChange={handleChange}
                  className="p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#B59E74] outline-none"
                  placeholder="e.g., Parish Grounds"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-600 uppercase">Description (Optional)</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="3"
                  className="p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#B59E74] outline-none resize-none"
                  placeholder="Additional details..."
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#B59E74] hover:bg-[#9c8760] text-white font-bold py-4 rounded-xl uppercase tracking-widest mt-4 shadow-md transition-colors disabled:opacity-70"
              >
                {submitting ? "Saving..." : "Post Schedule"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminSchedules;