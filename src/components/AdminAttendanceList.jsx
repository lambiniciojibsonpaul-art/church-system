import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseClient";

function AdminAttendanceList() {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState("");
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  // Fetch data whenever selectedEvent changes automatically
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
            <div className="flex items-center gap-4 w-full md:w-auto">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">
                Select Event:
              </label>
              <select 
                className="p-3 rounded-xl border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-[#B59E74] outline-none min-w-[250px]"
                value={selectedEvent}
                onChange={(e) => setSelectedEvent(e.target.value)}
              >
                <option value="">-- Choose an Event --</option>
                {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
              </select>
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
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] text-gray-400 uppercase tracking-widest font-bold border-b border-gray-100">
                      <th className="p-4">Name</th>
                      <th className="p-4">Email</th>
                      <th className="p-4">Role</th>
                      <th className="p-4 text-right">Check-in Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="p-10 text-center text-gray-400 italic font-serif">
                          No one has checked in yet.
                        </td>
                      </tr>
                    ) : (
                      attendance.map((row, idx) => {
                        const isGuest = row.is_guest === true;
                        const displayName = isGuest && row.guest_name
                          ? row.guest_name
                          : row.full_name
                            ? row.full_name
                            : (row.first_name || row.last_name)
                              ? `${row.first_name || ''} ${row.last_name || ''}`.trim()
                              : row.email?.split('@')[0] || "Unknown";

                        const roleLabel = isGuest ? "Guest" : (row.role || "Parishioner");
                        const roleBadgeClass = isGuest
                          ? "bg-amber-50 text-amber-600"
                          : row.role === "admin"
                            ? "bg-red-50 text-red-600"
                            : "bg-gray-100 text-gray-600";

                        return (
                          <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                            <td className="p-4 font-medium text-gray-800 capitalize">
                              <div className="flex items-center gap-2">
                                {isGuest && <span className="text-amber-500 text-sm">👤</span>}
                                {displayName}
                              </div>
                            </td>
                            <td className="p-4 text-sm text-gray-500 lowercase">
                              {isGuest ? <span className="text-gray-300 italic">—</span> : row.email}
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
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default AdminAttendanceList;