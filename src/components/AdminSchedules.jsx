import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { QRCodeCanvas } from "qrcode.react";
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

function MapPicker({ lat, lng, flyTarget, onChange, readOnly }) {
  const hasPin = lat !== "" && lat != null && lng !== "" && lng != null;
  return (
    <MapContainer center={[14.6380885, 121.0129013]} zoom={17} style={{ height: 260, width: "100%" }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {!readOnly && <ClickToPin onPin={onChange} />}
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

const CHURCH_ADDRESS = "69 San Pedro Bautista, San Francisco del Monte, Quezon City, 1104 Metro Manila";
const PARISH_LAT = 14.637814;
const PARISH_LNG = 121.012436;

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

function EventDetailsModal({ event, onClose }) {
  const [activePanel, setActivePanel] = useState("details");
  const [attendance, setAttendance] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const qrRef = useRef(null);
  const baseUrl = window.location.href.split("#")[0].replace(/\/$/, "");
  const checkInUrl = `${baseUrl}/#/check-in/${event.id}`;

  useEffect(() => {
    if (activePanel !== "attendance") return;
    setAttendanceLoading(true);
    restSelect("attendance_details", {
      match: { event_id: event.id },
      order: "check_in_time.desc",
      timeoutMs: 10000,
    }).then(({ data }) => {
      setAttendance(data || []);
      setAttendanceLoading(false);
    });
  }, [activePanel, event.id]);

  const handleDownloadQR = () => {
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-${event.title?.replace(/\s+/g, "-") || event.id}.png`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl relative">
        <div className="sticky top-0 bg-white px-8 py-5 border-b border-gray-100 flex justify-between items-center z-10">
          <div>
            <h2 className="text-lg font-serif text-[#B59E74] uppercase tracking-widest leading-tight">{event.title}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{event.event_class}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors">✕</button>
        </div>

        <div className="flex gap-1 px-8 pt-5">
          {["details", "qr", "attendance"].map((p) => (
            <button key={p} onClick={() => setActivePanel(p)}
              className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${activePanel === p ? "bg-[#B59E74] text-white shadow" : "text-gray-400 hover:text-gray-600 bg-gray-100"}`}>
              {p === "details" ? "Details" : p === "qr" ? "QR Code" : "Attendance"}
            </button>
          ))}
        </div>

        <div className="p-8">
          {activePanel === "details" && (
            <div className="space-y-4 text-sm text-gray-700">
              <div><span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Date</span><p>{new Date(event.event_date).toLocaleDateString()}</p></div>
              <div><span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Time</span><p>{event.event_time || "—"}</p></div>
              <div><span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Host</span><p>{event.ministry || (event.priest_name ? `Fr. ${event.priest_name}` : "—")}</p></div>
              <div><span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Setting</span><p>{event.setting || "—"}</p></div>
              <div><span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Location</span><p>{event.location || "—"}</p></div>
              {event.description && <div><span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Description</span><p className="whitespace-pre-wrap">{event.description}</p></div>}
              <div><span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Status</span>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${event.status === "Cancelled" || event.status === "Rejected" ? "bg-red-100 text-red-700" : event.status === "Pending" ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>{event.status || "Active"}</span>
              </div>
            </div>
          )}

          {activePanel === "qr" && (
            <div className="flex flex-col items-center gap-6">
              <div ref={qrRef} className="p-4 bg-white border border-gray-200 rounded-2xl shadow-sm">
                <QRCodeCanvas value={checkInUrl} size={220} />
              </div>
              <p className="text-xs text-gray-400 text-center break-all max-w-xs">{checkInUrl}</p>
              <div className="flex gap-3">
                <button onClick={handleDownloadQR} className="px-5 py-2.5 bg-[#B59E74] text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#9c8760] transition-colors">Download QR</button>
                <button onClick={() => window.print()} className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-gray-200 transition-colors">Print</button>
              </div>
            </div>
          )}

          {activePanel === "attendance" && (
            <div>
              {attendanceLoading ? (
                <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#B59E74]" /></div>
              ) : attendance.length === 0 ? (
                <div className="text-center text-gray-400 py-8"><p>No attendees checked in yet.</p></div>
              ) : (
                <div className="overflow-x-auto">
                  <p className="text-xs text-gray-400 mb-3">{attendance.length} attendee{attendance.length !== 1 ? "s" : ""}</p>
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="text-[10px] text-gray-400 uppercase tracking-widest border-b border-gray-100">
                        <th className="p-2">Name</th><th className="p-2">Check-in Time</th><th className="p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendance.map((a) => (
                        <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="p-2">
                            <p className="text-sm font-medium text-gray-800">
                              {a.is_guest
                                ? `${a.guest_name || "Guest"} (Guest)`
                                : `${a.first_name || ""} ${a.last_name || ""}`.trim() || a.email || "Parishioner"}
                            </p>
                            {!a.is_guest && a.email && <p className="text-[11px] text-gray-400">{a.email}</p>}
                          </td>
                          <td className="p-2 text-gray-500 text-sm">{a.check_in_time ? new Date(a.check_in_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                          <td className="p-2"><span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold uppercase">{a.status || "Present"}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminSchedules() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  
  const [priestNames, setPriestNames] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [activeTab, setActiveTab] = useState("Upcoming");
  const [eventSearch, setEventSearch] = useState("");
  
  // ✨ NEW: State for sorting across all tabs
  const [activeSort, setActiveSort] = useState("date_asc");

  // ✨ NEW: Smart default sorting when tabs change
  useEffect(() => {
    if (activeTab === "Past" || activeTab === "Cancelled") {
      setActiveSort("date_desc");
    } else {
      setActiveSort("date_asc");
    }
  }, [activeTab]);

  const [rejectingEvent, setRejectingEvent] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [cancellingEvent, setCancellingEvent] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [deletingEvent, setDeletingEvent] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const [mapSearch, setMapSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [flyTarget, setFlyTarget] = useState(null);
  const searchDebounceRef = useRef(null);

  const [activeMinistries, setActiveMinistries] = useState([]);
  const [viewMode, setViewMode] = useState("card"); // "card" | "table"

  const [formData, setFormData] = useState({
    title: "",
    eventClass: "Mass",
    priestName: "",
    eventStartDate: "",  // ← was eventDate
    eventEndDate: "",
    eventDate: "",
    eventTime: "",
    location: CHURCH_ADDRESS,
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
        rawFilter: { status: "not.eq.Cancelled" },
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
    const shortName = result.display_name.split(",")[0].trim();
    const addr = result.address || {};
    const city = addr.city || addr.municipality || addr.town || addr.village || addr.suburb || "";
    const province = addr.province || addr.state || "";
    const generalLocation = [city, province].filter(Boolean).join(", ") || result.display_name.split(",").slice(0, 2).join(",").trim();
    setFormData(prev => ({ ...prev, latitude: lat, longitude: lng, setting: result.display_name, location: generalLocation }));
    setFlyTarget({ lat, lng });
    setMapSearch(shortName);
    setSearchResults([]);
  };

  const handleMapClick = async (lat, lng) => {
    setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
    setFlyTarget(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
        { headers: { "Accept-Language": "en", "User-Agent": "SanPedroBautistaParish/1.0" } }
      );
      const data = await res.json();
      if (data && !data.error) {
        const shortName = data.display_name.split(",")[0].trim();
        const addr = data.address || {};
        const city = addr.city || addr.municipality || addr.town || addr.village || addr.suburb || "";
        const province = addr.province || addr.state || "";
        const generalLocation = [city, province].filter(Boolean).join(", ") || data.display_name.split(",").slice(0, 2).join(",").trim();
        setFormData(prev => ({ ...prev, latitude: lat, longitude: lng, setting: data.display_name, location: generalLocation }));
        setMapSearch(shortName);
      }
    } catch { /* non-fatal — coordinates are still saved */ }
  };

  const handleOpenEventModal = () => {
    setFormData({
      title: "",
      eventClass: "Mass",
      priestName: "",
      eventStartDate: "",  // ← was eventDate
      eventEndDate: "",
      eventDate: "",
      eventTime: "",
      location: CHURCH_ADDRESS,
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
    const _td = new Date();
    const today = `${_td.getFullYear()}-${String(_td.getMonth()+1).padStart(2,'0')}-${String(_td.getDate()).padStart(2,'0')}`;
    if (formData.eventStartDate < today) {
      alert("Error: You cannot schedule an event in the past. Please select today or a future date.");
      return;
    }

    if (formData.eventEndDate && formData.eventEndDate < formData.eventStartDate) {
      alert("Error: End date cannot be before the start date.");
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
      // Conflict if any day in the new event's range overlaps with existing event's date
      const newStart = formData.eventStartDate;
      const newEnd   = formData.eventEndDate || formData.eventStartDate;
      const evDate   = ev.event_date;
      const rangeOverlaps = evDate >= newStart && evDate <= newEnd;
      if (!rangeOverlaps || ev.event_time !== formData.eventTime) return false;
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
        event_date:      formData.eventStartDate,
        event_end_date:  formData.eventEndDate || null,
        event_time:   formData.eventTime,
        location:     formData.location,
        description:  formData.description,
        setting:      formData.setting,
        status:       "Active",
        is_public:    formData.isPublic,
        latitude:     formData.isInside ? PARISH_LAT : (formData.latitude !== "" ? parseFloat(formData.latitude) : null),
        longitude:    formData.isInside ? PARISH_LNG : (formData.longitude !== "" ? parseFloat(formData.longitude) : null),
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

  const _now = new Date();
  const today = `${_now.getFullYear()}-${String(_now.getMonth()+1).padStart(2,'0')}-${String(_now.getDate()).padStart(2,'0')}`;

  const visibleEvents = events
    .filter(ev => {
      const q = eventSearch.toLowerCase();
      if (q && !ev.title?.toLowerCase().includes(q) && !ev.location?.toLowerCase().includes(q) && !ev.setting?.toLowerCase().includes(q)) return false;
      const isCancelledOrRejected = ev.status === "Cancelled" || ev.status === "Rejected";
      if (activeTab === "All") return true;
      if (activeTab === "Active") return ev.event_date === today && !isCancelledOrRejected;
      if (activeTab === "Upcoming") return ev.event_date > today && !isCancelledOrRejected;
      if (activeTab === "Past") return ev.event_date < today && !isCancelledOrRejected;
      if (activeTab === "Pending") return ev.status === "Pending";
      if (activeTab === "Cancelled") return isCancelledOrRejected;
      return true;
    })
    .sort((a, b) => {
      // ✨ NEW: Master Sorting Logic applied to all tabs
      if (activeSort === "created_desc") {
        return String(b.created_at || "").localeCompare(String(a.created_at || ""));
      }
      if (activeSort === "created_asc") {
        return String(a.created_at || "").localeCompare(String(b.created_at || ""));
      }

      // Combine Date and Time for accurate chronological sorting
      const dateA = a.event_date || (activeSort === "date_asc" ? "9999-12-31" : "0000-00-00");
      const timeA = a.event_time || "00:00:00";
      const dateB = b.event_date || (activeSort === "date_asc" ? "9999-12-31" : "0000-00-00");
      const timeB = b.event_time || "00:00:00";
      
      const dtA = new Date(`${dateA}T${timeA}`).getTime();
      const dtB = new Date(`${dateB}T${timeB}`).getTime();

      if (activeSort === "date_desc") {
        if (isNaN(dtA) || isNaN(dtB)) return `${dateB}T${timeB}`.localeCompare(`${dateA}T${timeA}`);
        return dtB - dtA;
      }
      
      // Default: date_asc
      if (isNaN(dtA) || isNaN(dtB)) return `${dateA}T${timeA}`.localeCompare(`${dateB}T${timeB}`);
      return dtA - dtB;
    });

  const pendingCount   = events.filter(ev => ev.status === "Pending").length;
  const activeCount    = events.filter(ev => ev.event_date === today && ev.status !== "Cancelled" && ev.status !== "Rejected").length;
  const upcomingCount  = events.filter(ev => ev.event_date > today).length;
  const pastCount      = events.filter(ev => ev.event_date < today).length;
  const cancelledCount = events.filter(ev => ev.status === "Cancelled" || ev.status === "Rejected").length;

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
          
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl border border-gray-200 overflow-hidden shadow-sm bg-white">
              <button
                onClick={() => setViewMode("card")}
                title="Card view"
                className={`px-3 py-2.5 text-sm transition-colors ${viewMode === "card" ? "bg-[#B59E74] text-white" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"}`}
              >
                ⊞
              </button>
              <button
                onClick={() => setViewMode("table")}
                title="Table view"
                className={`px-3 py-2.5 text-sm transition-colors ${viewMode === "table" ? "bg-[#B59E74] text-white" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"}`}
              >
                ≡
              </button>
            </div>
            <button
              onClick={handleOpenEventModal}
              className="bg-[#B59E74] border-2 border-[#B59E74] hover:bg-[#9c8760] hover:border-[#9c8760] text-white px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-sm shadow-md transition-colors flex items-center gap-2 h-fit"
            >
              <span className="text-lg leading-none">+</span> Add Event
            </button>
          </div>
        </div>

        {/* ✨ NEW: Search bar and Sort Filter row (Available on ALL tabs) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white focus-within:ring-2 focus-within:ring-[#B59E74] w-full max-w-md shadow-sm">
            <span className="text-gray-400 text-sm">🔍</span>
            <input
              type="text"
              value={eventSearch}
              onChange={e => setEventSearch(e.target.value)}
              placeholder="Search events by title or location..."
              className="flex-1 outline-none text-sm text-gray-700 bg-transparent"
            />
            {eventSearch && (
              <button type="button" onClick={() => setEventSearch("")} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-3 animate-fade-in">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Sort By:</label>
            <div className="relative">
              <select
                value={activeSort}
                onChange={(e) => setActiveSort(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2.5 rounded-xl bg-white border border-gray-200 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] text-sm font-bold text-gray-700 cursor-pointer shadow-sm transition-colors"
              >
                <option value="date_asc">Event Date (Earliest First)</option>
                <option value="date_desc">Event Date (Latest First)</option>
                <option value="created_desc">Newest Created</option>
                <option value="created_asc">Oldest Created</option>
              </select>
              <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Time-based tabs */}
        <div className="flex gap-2 sm:gap-3 mb-6 p-2 bg-[#F6F5ED] rounded-full w-fit border border-gray-100 overflow-x-auto">
          {[
            { key: "Upcoming", label: "Upcoming", count: upcomingCount, color: "bg-blue-500" },
            { key: "Active",   label: "Active Today", count: activeCount,   color: "bg-green-500" },
            { key: "Past",     label: "Past Events",  count: pastCount,     color: null },
            { key: "Pending",  label: "Pending",      count: pendingCount,  color: "bg-red-500" },
            { key: "Cancelled",label: "Cancelled",    count: cancelledCount,color: null },
            { key: "All",      label: "All",          count: null,          color: null },
          ].map(({ key, label, count, color }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-4 sm:px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all relative whitespace-nowrap ${activeTab === key ? "bg-[#B59E74] text-white shadow-md" : "text-gray-500 hover:text-gray-700"}`}
            >
              {label}
              {count > 0 && color && (
                <span className={`absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full ${color} text-[9px] text-white`}>{count}</span>
              )}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8">
          {visibleEvents.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              <div className="text-4xl mb-4">📅</div>
              <h3 className="text-lg font-serif">
                {eventSearch
                  ? `No events matching "${eventSearch}".`
                  : activeTab === "Active" ? "No events scheduled for today."
                  : activeTab === "Upcoming" ? "No upcoming events."
                  : activeTab === "Past" ? "No past events on record."
                  : activeTab === "Pending" ? "No events awaiting approval."
                  : activeTab === "Cancelled" ? "No cancelled events."
                  : "No schedules found."}
              </h3>
              {!eventSearch && <p className="text-sm mt-1">Click "Add Event" to create a new schedule.</p>}
            </div>
          ) : viewMode === "table" ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[10px] text-gray-400 uppercase tracking-widest font-bold border-b border-gray-100">
                    <th className="p-3">Event</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Host</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Time</th>
                    <th className="p-3">Location</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleEvents.map((ev) => {
                    const isPending = ev.status === "Pending";
                    const isCancelledOrRejected = ev.status === "Cancelled" || ev.status === "Rejected";
                    const accentColor = isPending ? "bg-yellow-400" : isCancelledOrRejected ? "bg-red-400" : ev.event_class === "Mass" ? "bg-[#B59E74]" : "bg-gray-800";
                    return (
                      <tr key={ev.id} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${isCancelledOrRejected ? "opacity-70" : ""}`}>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-1 h-8 rounded-full shrink-0 ${accentColor}`} />
                            <span className={`text-sm font-medium ${isCancelledOrRejected ? "line-through text-gray-400" : "text-gray-800"}`}>{ev.title}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">{ev.event_class}</span>
                        </td>
                        <td className="p-3 text-sm text-gray-600">{ev.ministry || (ev.priest_name ? `Fr. ${ev.priest_name}` : "—")}</td>
                        <td className="p-3 text-sm text-gray-600 whitespace-nowrap">
                          {new Date(ev.event_date + "T00:00:00").toLocaleDateString()}
                          {ev.event_end_date && ev.event_end_date !== ev.event_date && (
                            <span className="text-gray-400 ml-1">→ {new Date(ev.event_end_date + "T00:00:00").toLocaleDateString()}</span>
                          )}
                        </td>
                        <td className="p-3 text-sm text-gray-600 whitespace-nowrap">{ev.event_time || "—"}</td>
                        <td className="p-3 text-sm text-gray-500 max-w-[160px] truncate">{ev.location || "—"}</td>
                        <td className="p-3">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${isPending ? "bg-yellow-100 text-yellow-700" : isCancelledOrRejected ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                            {ev.status || "Active"}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-1 flex-wrap">
                            <button onClick={() => setSelectedEvent(ev)} className="px-2 py-1 bg-[#B59E74]/10 hover:bg-[#B59E74] text-[#B59E74] hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-wide transition-colors whitespace-nowrap">View / QR / Attendance</button>
                            {isPending && (
                              <>
                                <button onClick={() => handleApprove(ev)} className="px-2 py-1 bg-green-50 hover:bg-green-600 text-green-600 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-wide transition-colors">✓</button>
                                <button onClick={() => { setRejectingEvent(ev); setRejectionReason(""); }} className="px-2 py-1 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-wide transition-colors">✕</button>
                              </>
                            )}
                            {(ev.status === "Active" || !ev.status) && (
                              <button onClick={() => { setCancellingEvent(ev); setCancelReason(""); }} className="px-2 py-1 bg-orange-50 hover:bg-orange-600 text-orange-600 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-wide transition-colors">Cancel</button>
                            )}
                            {isCancelledOrRejected && (
                              <button onClick={() => setDeletingEvent(ev)} className="px-2 py-1 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-wide transition-colors">Delete</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
                    {(isPending || isCancelledOrRejected || (activeTab !== "Upcoming" && activeTab !== "Past")) && (
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md shrink-0 ${isPending ? "bg-yellow-100 text-yellow-700" : isCancelledOrRejected ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                        {ev.status || "Active"}
                      </span>
                    )}
                    <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md bg-gray-100 text-gray-600 truncate text-right">
                      {ev.event_class}
                    </span>
                  </div>
                  
                  <h3 className={`text-xl font-serif font-medium leading-tight mb-1 ${isCancelledOrRejected ? "text-gray-500 line-through" : "text-gray-800"}`}>
                    {ev.title}
                  </h3>
                  
                  <p className="text-sm text-gray-500 font-serif italic mb-4">
                    {isPending ? "Proposed by: " : "Hosted by: "} 
                    <span className="font-semibold">{ev.ministry || (ev.priest_name ? `Fr. ${ev.priest_name}` : "")}</span>
                  </p>

                  <div className="space-y-2 text-sm text-gray-600 border-t border-gray-50 pt-4 flex-1">
                    <div className="flex items-center gap-2">
                    <span>🗓️</span>
                    {new Date(ev.event_date + "T00:00:00").toLocaleDateString()}
                      {ev.event_end_date && ev.event_end_date !== ev.event_date && (
                        <span className="text-gray-400">→ {new Date(ev.event_end_date + "T00:00:00").toLocaleDateString()}</span>
                      )}
                  </div>
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

                  <div className="mt-4 border-t border-gray-100 pt-4 flex flex-col gap-2">
                    <button onClick={() => setSelectedEvent(ev)} className="w-full bg-[#B59E74]/10 hover:bg-[#B59E74] text-[#B59E74] hover:text-white py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors">View / QR / Attendance</button>
                    <div className="flex gap-2">
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

      {/* --- EVENT DETAILS / QR / ATTENDANCE MODAL --- */}
      {selectedEvent && <EventDetailsModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />}

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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600 uppercase">Start Date *</label>
                  <input
                    type="date" name="eventStartDate" required
                    min={(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })()}
                    value={formData.eventStartDate} onChange={handleChange}
                    className="p-3 rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-[#B59E74]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600 uppercase">
                    End Date <span className="text-gray-400 normal-case font-normal text-[10px]">(optional — for multi-day)</span>
                  </label>
                  <input
                    type="date" name="eventEndDate"
                    min={formData.eventStartDate || (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })()}
                    value={formData.eventEndDate} onChange={handleChange}
                    className="p-3 rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-[#B59E74]"
                  />
                  {formData.eventEndDate && formData.eventEndDate < formData.eventStartDate && (
                    <p className="text-[10px] text-red-500 mt-0.5">End date must be on or after the start date.</p>
                  )}
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
                          {priestNames.map(name => <option key={name} value={name}>Fr. {name}</option>)}
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
                      <input type="radio" checked={formData.isInside === true} onChange={() => setFormData({ ...formData, isInside: true, setting: "", latitude: PARISH_LAT, longitude: PARISH_LNG, location: CHURCH_ADDRESS })} className="w-4 h-4 text-[#B59E74] focus:ring-[#B59E74]" />
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

              {/* ── Map pin — shown for both indoor (read-only) and outdoor ── */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-600 uppercase flex items-center gap-2">
                  📍 {formData.isInside ? "Check-in Location (Fixed)" : "Pin Location on Map"}
                  <span className="text-[10px] font-normal normal-case text-gray-400 italic">— for QR check-in geolocation (200m radius)</span>
                </label>

                {/* Indoor info banner */}
                {formData.isInside && (
                  <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 text-xs">
                    <span>🏛️</span>
                    <span>Check-in is pinned to <strong>San Pedro Bautista Parish</strong>. Parishioners must be within 200m to check in.</span>
                  </div>
                )}

                {/* Outdoor-only: search bar */}
                {!formData.isInside && (
                  <>
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

                    <p className="text-[10px] text-gray-400 italic -mt-1">
                      Search to find a location, or click directly on the map to drop a pin.
                    </p>
                  </>
                )}

                {/* Map — always shown; read-only for indoor */}
                <div className="rounded-xl overflow-hidden border border-gray-300 shadow-sm">
                  <MapPicker
                    lat={formData.isInside ? PARISH_LAT : formData.latitude}
                    lng={formData.isInside ? PARISH_LNG : formData.longitude}
                    flyTarget={formData.isInside ? null : flyTarget}
                    onChange={formData.isInside ? () => {} : handleMapClick}
                    readOnly={formData.isInside}
                  />
                </div>

                {/* Coordinates display */}
                {formData.isInside ? (
                  <div className="flex gap-3 mt-1">
                    <div className="flex-1 flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Latitude</label>
                      <input readOnly value={PARISH_LAT.toFixed(6)} className="p-2 rounded-lg border border-gray-200 bg-gray-50 text-xs text-gray-600 font-mono" />
                    </div>
                    <div className="flex-1 flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Longitude</label>
                      <input readOnly value={PARISH_LNG.toFixed(6)} className="p-2 rounded-lg border border-gray-200 bg-gray-50 text-xs text-gray-600 font-mono" />
                    </div>
                  </div>
                ) : formData.latitude !== "" ? (
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