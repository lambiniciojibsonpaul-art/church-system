import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { restSelect, restInsert, restUpdate, restDelete } from "../supabaseRest";
import { useAuth } from "../contexts/useAuth";

// Gold teardrop pin — avoids Vite asset path issues with default Leaflet icons
const PIN_ICON = new L.DivIcon({
  html: `<div style="width:18px;height:18px;background:#B59E74;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35)"></div>`,
  className: "",
  iconSize: [18, 18],
  iconAnchor: [9, 18],
});

function ClickToPin({ onPin }) {
  useMapEvents({ click: (e) => onPin(e.latlng.lat, e.latlng.lng) });
  return null;
}

function FlyToLocation({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], 17, { animate: true, duration: 1 });
  }, [lat, lng, map]);
  return null;
}

function MapPicker({ lat, lng, flyTarget, onChange }) {
  const hasPin = lat !== "" && lng !== "";
  return (
    <MapContainer center={[10.3562, 123.9615]} zoom={14} style={{ height: 260, width: "100%" }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <ClickToPin onPin={onChange} />
      {flyTarget && <FlyToLocation lat={flyTarget.lat} lng={flyTarget.lng} />}
      {hasPin && <Marker position={[parseFloat(lat), parseFloat(lng)]} icon={PIN_ICON} />}
    </MapContainer>
  );
}

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
  
  // State to hold the dynamic list of priests
  const [priestNames, setPriestNames] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [activeTab, setActiveTab] = useState("All");

  const [rejectingEvent, setRejectingEvent] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [cancellingEvent, setCancellingEvent] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [deletingEvent, setDeletingEvent] = useState(null);

  // Map search state
  const [mapSearch, setMapSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [flyTarget, setFlyTarget] = useState(null);
  const searchDebounceRef = useRef(null);

  const [activeMinistries, setActiveMinistries] = useState([]);

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
    isPublic: true,
    ministry: "",
    collaborators: [],
    latitude: "",
    longitude: "",
  });

  useEffect(() => {
    Promise.all([fetchEvents(), fetchPriests(), fetchActiveMinistries()]).finally(() => {
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

  const fetchActiveMinistries = async () => {
    try {
      const { data } = await restSelect("ministries", {
        select: "id,name",
        match: { is_archived: false },
        order: "name.asc",
        timeoutMs: 10000,
      });
      if (data) setActiveMinistries(data);
    } catch { /* non-fatal */ }
  };

  const fetchPriests = async () => {
    try {
      const { data, error } = await restSelect("priests", {
        match: { is_active: true },
        order: "name.asc",
        timeoutMs: 10000,
      });

      if (error) throw error;
      if (data) {
        setPriestNames(data.map(p => p.name));
      }
    } catch (err) {
      console.error("Failed to load priests:", err);
      // Fallback list
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

  const toggleCollaborator = (name) => {
    setFormData(prev => ({
      ...prev,
      collaborators: prev.collaborators.includes(name)
        ? prev.collaborators.filter(m => m !== name)
        : [...prev.collaborators, name],
    }));
  };

  const handleMapSearch = (query) => {
    setMapSearch(query);
    clearTimeout(searchDebounceRef.current);
    if (!query.trim()) { setSearchResults([]); return; }
    searchDebounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=ph&addressdetails=1`,
          { headers: { "Accept-Language": "en", "User-Agent": "SanPedroBautistaParish/1.0" } }
        );
        const data = await res.json();
        setSearchResults(data);
      } catch { setSearchResults([]); }
      finally { setSearchLoading(false); }
    }, 500);
  };

  const handleSelectResult = (result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const placeName = result.display_name.split(",")[0].trim();
    const addr = result.address || {};
    const city = addr.city || addr.municipality || addr.town || addr.village || addr.suburb || "";
    const province = addr.province || addr.state || "";
    const generalLocation = [city, province].filter(Boolean).join(", ") || result.display_name.split(",").slice(0, 2).join(",").trim();
    setFormData(prev => ({ ...prev, latitude: lat, longitude: lng, setting: placeName, location: generalLocation }));
    setFlyTarget({ lat, lng });
    setMapSearch(placeName);
    setSearchResults([]);
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
      isPublic: true,
      ministry: "",
      collaborators: [],
      latitude: "",
      longitude: "",
    });
    setMapSearch("");
    setSearchResults([]);
    setFlyTarget(null);
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

    // 1. DATE VALIDATION: Prevent past dates
    const today = new Date().toISOString().split("T")[0];
    if (formData.eventDate < today) {
      alert("Error: You cannot schedule an event in the past. Please select today or a future date.");
      return;
    }

    // 2. HOST VALIDATION — at least one of priest or ministry must be selected
    if (!formData.priestName && !formData.ministry) {
      alert("Please assign at least one host — a Hosting Priest, a Hosting Ministry, or both.");
      return;
    }

    // 3. CONFLICT DETECTION
    const conflict = events.find(ev => {
      if (ev.status === "Cancelled" || ev.status === "Rejected") return false;
      if (ev.event_date !== formData.eventDate || ev.event_time !== formData.eventTime) return false;
      // Only flag priest conflict if a priest was actually chosen
      const isSamePriest = formData.priestName && ev.priest_name === formData.priestName;
      const isSameRoom   = formData.isInside && formData.setting && ev.setting === formData.setting;
      return isSamePriest || isSameRoom;
    });

    if (conflict) {
      alert(`Scheduling Conflict! "${conflict.title}" is already booked at this time for this priest or location.`);
      return; // Stop the submission!
    }

    setSubmitting(true);

    try {
      const basePayload = {
        creator_id:   user.id,
        title:        formData.title,
        event_class:  formData.eventClass,
        priest_name:  formData.priestName  || null,
        ministry:     formData.ministry    || null,
        collaborators: formData.collaborators,
        event_date:   formData.eventDate,
        event_time:   formData.eventTime,
        location:     formData.location,
        description:  formData.description,
        setting:      formData.setting,
        status:       "Active",
        is_public:    formData.isPublic,
        latitude:     (!formData.isInside && formData.latitude !== "") ? parseFloat(formData.latitude) : null,
        longitude:    (!formData.isInside && formData.longitude !== "") ? parseFloat(formData.longitude) : null,
      };

      let { error } = await restInsert("events", [basePayload]);

      // Retry without new columns if the DB migration hasn't been run yet
      if (error && (error.code === "PGRST204" || error.message?.includes("column"))) {
        const fallback = { ...basePayload };
        delete fallback.collaborators;
        delete fallback.is_public;
        const retry = await restInsert("events", [fallback]);
        if (retry.error) throw new Error(retry.error.message);
      } else if (error) {
        throw new Error(error.message);
      }

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

              {/* ── Event info ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600 uppercase">Event Title *</label>
                  <input
                    type="text" name="title" required
                    value={formData.title} onChange={handleChange}
                    className="p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#B59E74] outline-none"
                    placeholder="e.g., Sunday Morning Mass"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600 uppercase">Event Type *</label>
                  <select
                    name="eventClass" required
                    value={formData.eventClass} onChange={handleChange}
                    className="p-3 rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-[#B59E74] font-bold text-[#B59E74]"
                  >
                    {EVENT_CLASSES.map(cls => <option key={cls} value={cls}>{cls}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600 uppercase">Date *</label>
                  <input
                    type="date" name="eventDate" required
                    min={new Date().toISOString().split('T')[0]}
                    value={formData.eventDate} onChange={handleChange}
                    className="p-3 rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-[#B59E74]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600 uppercase">Start Time *</label>
                  <input
                    type="time" name="eventTime" required
                    value={formData.eventTime} onChange={handleChange}
                    className="p-3 rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-[#B59E74]"
                  />
                </div>
              </div>

              {/* ── Hosts — at least priest OR ministry required ── */}
              {(() => {
                const priestChosen  = !!formData.priestName;
                const ministryChosen = !!formData.ministry;
                const hostChosen    = priestChosen || ministryChosen;
                return (
                  <div className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Event Hosts — At least one required
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Hosting Priest */}
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-gray-600 uppercase">Hosting Priest</label>
                        <select
                          name="priestName"
                          value={formData.priestName}
                          onChange={e => setFormData(prev => ({
                            ...prev,
                            priestName: e.target.value,
                            // selecting a priest locks out hosting ministry
                            ministry: e.target.value ? "" : prev.ministry,
                            collaborators: e.target.value ? prev.collaborators : prev.collaborators,
                          }))}
                          className="p-3 rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-[#B59E74]"
                        >
                          <option value="">Select priest…</option>
                          {priestNames.map(name => <option key={name} value={name}>{name}</option>)}
                        </select>
                      </div>

                      {/* Hosting Ministry — disabled when a priest is chosen */}
                      <div className="flex flex-col gap-1">
                        <label className={`text-xs font-bold uppercase ${priestChosen ? "text-gray-300" : "text-gray-600"}`}>
                          Hosting Ministry
                          {priestChosen && <span className="ml-2 text-[9px] normal-case italic font-normal text-gray-400">disabled — priest is the primary host</span>}
                        </label>
                        <select
                          value={formData.ministry}
                          disabled={priestChosen}
                          onChange={e => setFormData(prev => ({
                            ...prev,
                            ministry: e.target.value,
                            collaborators: prev.collaborators.filter(c => c !== e.target.value),
                          }))}
                          className={`p-3 rounded-xl border outline-none focus:ring-2 focus:ring-[#B59E74] transition-opacity ${
                            priestChosen
                              ? "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed opacity-50"
                              : "border-gray-300 bg-white"
                          }`}
                        >
                          <option value="">Select ministry…</option>
                          {activeMinistries.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Collaborating Ministries — active only when at least one host is chosen */}
                    <div className={`flex flex-col gap-1.5 transition-opacity ${hostChosen ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
                      <label className="text-xs font-bold text-gray-600 uppercase flex items-center gap-2">
                        Collaborating Ministries
                        {!hostChosen && <span className="text-[9px] normal-case italic font-normal text-gray-400">— choose a priest or ministry first</span>}
                        {formData.collaborators.length > 0 && (
                          <span className="bg-[#B59E74]/20 text-[#B59E74] px-2 py-0.5 rounded-full text-[9px] font-bold">
                            {formData.collaborators.length} selected
                          </span>
                        )}
                      </label>
                      <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-xl bg-white p-2 space-y-1">
                        {activeMinistries.filter(m => m.name !== formData.ministry).length === 0 ? (
                          <p className="text-xs text-gray-400 italic text-center py-3">No ministries available</p>
                        ) : (
                          activeMinistries.filter(m => m.name !== formData.ministry).map(m => (
                            <label
                              key={m.id}
                              className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                                formData.collaborators.includes(m.name)
                                  ? "bg-[#B59E74]/10 border border-[#B59E74]/30 text-[#7a6a42]"
                                  : "hover:bg-gray-50 border border-transparent text-gray-700"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={formData.collaborators.includes(m.name)}
                                onChange={() => toggleCollaborator(m.name)}
                                className="w-4 h-4 accent-[#B59E74] shrink-0"
                              />
                              <span className="text-xs font-medium">{m.name}</span>
                            </label>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ── Location ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600 uppercase">Setting Type</label>
                  <div className="flex items-center gap-4 mt-2">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" checked={formData.isInside === true} onChange={() => setFormData({ ...formData, isInside: true, setting: "", latitude: "", longitude: "", location: "Main Church" })} className="w-4 h-4 text-[#B59E74] focus:ring-[#B59E74]" />
                      Indoor
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" checked={formData.isInside === false} onChange={() => setFormData({ ...formData, isInside: false, setting: "", latitude: "", longitude: "", location: "" })} className="w-4 h-4 text-[#B59E74] focus:ring-[#B59E74]" />
                      Outdoor
                    </label>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600 uppercase">
                    {formData.isInside ? "Select Facility *" : "Outdoor Location *"}
                  </label>
                  {formData.isInside ? (
                    <select name="setting" required value={formData.setting} onChange={handleChange} className="p-3 rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-[#B59E74]">
                      <option value="" disabled>Select a Facility</option>
                      {INDOOR_FACILITIES.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  ) : (
                    <input type="text" name="setting" required value={formData.setting} onChange={handleChange} className="p-3 rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-[#B59E74]" placeholder="e.g., Parish Courtyard" />
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-600 uppercase">General Location *</label>
                <input
                  type="text" name="location" required
                  value={formData.location} onChange={handleChange}
                  className="p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#B59E74] outline-none"
                  placeholder="e.g., Parish Grounds"
                />
              </div>

              {/* ── Outdoor map pin ── */}
              {!formData.isInside && (
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-gray-600 uppercase flex items-center gap-2">
                    📍 Pin Location on Map
                    <span className="text-[10px] font-normal normal-case text-gray-400 italic">— for QR check-in geolocation</span>
                  </label>

                  {/* Search bar */}
                  <div className="relative">
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-300 focus-within:ring-2 focus-within:ring-[#B59E74] bg-white">
                      <span className="text-gray-400 text-sm shrink-0">🔍</span>
                      <input
                        type="text"
                        value={mapSearch}
                        onChange={e => handleMapSearch(e.target.value)}
                        placeholder="Search a location (e.g. Liloan Cebu)..."
                        className="flex-1 outline-none text-sm text-gray-700 bg-transparent min-w-0"
                      />
                      {searchLoading && (
                        <div className="w-4 h-4 border-2 border-[#B59E74] border-t-transparent rounded-full animate-spin shrink-0" />
                      )}
                      {mapSearch && !searchLoading && (
                        <button
                          type="button"
                          onClick={() => { setMapSearch(""); setSearchResults([]); }}
                          className="text-gray-400 hover:text-gray-600 text-xs shrink-0"
                        >✕</button>
                      )}
                    </div>

                    {/* Results dropdown */}
                    {searchResults.length > 0 && (
                      <div className="absolute z-[1000] top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden">
                        {searchResults.map((r, i) => (
                          <button
                            key={i}
                            type="button"
                            onMouseDown={() => handleSelectResult(r)}
                            className="w-full text-left px-4 py-3 text-sm hover:bg-[#F6F5ED] border-b border-gray-50 last:border-0 flex flex-col gap-0.5 transition-colors"
                          >
                            <span className="font-medium text-gray-800 truncate">{r.display_name.split(",")[0]}</span>
                            <span className="text-[11px] text-gray-400 truncate">{r.display_name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <p className="text-[11px] text-gray-400 italic -mt-1">
                    Search to find a location, or click directly on the map to drop a pin.
                  </p>

                  {/* Map */}
                  <div className="rounded-xl overflow-hidden border border-gray-300 shadow-sm">
                    <MapPicker
                      lat={formData.latitude}
                      lng={formData.longitude}
                      flyTarget={flyTarget}
                      onChange={(lat, lng) => {
                        setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
                        setFlyTarget(null);
                      }}
                    />
                  </div>

                  {/* Coordinates */}
                  {formData.latitude !== "" ? (
                    <div className="flex gap-3 mt-1">
                      <div className="flex-1 flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Latitude</label>
                        <input readOnly value={parseFloat(formData.latitude).toFixed(6)} className="p-2 rounded-lg border border-gray-200 bg-gray-50 text-xs text-gray-600 font-mono" />
                      </div>
                      <div className="flex-1 flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Longitude</label>
                        <input readOnly value={parseFloat(formData.longitude).toFixed(6)} className="p-2 rounded-lg border border-gray-200 bg-gray-50 text-xs text-gray-600 font-mono" />
                      </div>
                      <div className="flex items-end pb-1">
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, latitude: "", longitude: "" }));
                            setMapSearch("");
                            setFlyTarget(null);
                          }}
                          className="text-xs text-red-400 hover:text-red-600 px-2 py-2 rounded-lg hover:bg-red-50 transition-colors"
                        >✕ Clear</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-xs">
                      <span>📍</span>
                      <span>No pin set yet — search or click the map to mark the check-in location.</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-600 uppercase">Description (Optional)</label>
                <textarea
                  name="description" value={formData.description} onChange={handleChange}
                  rows="3" className="p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#B59E74] outline-none resize-none"
                  placeholder="Additional details..."
                />
              </div>

              {/* ── Visibility toggle ── */}
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

              <button
                type="submit" disabled={submitting}
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