import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../contexts/useAuth";

function PriestDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("schedule"); // "pending" | "schedule"
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  
  // Priest Identity State
  const [priestName, setPriestName] = useState(null);

  // Rejection State
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  // View Details Modal State
  const [viewingDetails, setViewingDetails] = useState(null);

  useEffect(() => {
    if (user) {
      fetchPriestIdentityAndRequests();
    }
  }, [user]);

  const fetchPriestIdentityAndRequests = async () => {
    setLoading(true);
    try {
      // 1. Find this user's official priest name from the database
      const { data: priestData, error: priestError } = await supabase
        .from("priests")
        .select("name")
        .eq("user_id", user.id)
        .maybeSingle(); // FIX: Changed from .single() to .maybeSingle()

      if (priestError || !priestData) {
        console.warn("Could not find official priest name for this user.");
        setLoading(false);
        return;
      }

      const officialName = priestData.name;
      setPriestName(officialName);

      // 2. Fetch requests assigned ONLY to this priest across all sacrament tables
      let allRequests = [];

      // A. Baptisms
      const { data: baptisms } = await supabase
        .from("baptisms")
        .select("*")
        .eq("preferred_priest", officialName);
      
      if (baptisms) {
        allRequests = [...allRequests, ...baptisms.map(b => ({
          ...b,
          request_type: "Baptism",
          display_date: b.preferred_date || b.created_at,
          display_name: `${b.child_first_name || ''} ${b.child_last_name || ''}`.trim(),
        }))];
      }

      // B. Weddings
      const { data: weddings } = await supabase
        .from("weddings")
        .select("*")
        .eq("preferred_priest", officialName);
      
      if (weddings) {
        allRequests = [...allRequests, ...weddings.map(w => ({
          ...w,
          request_type: "Wedding",
          display_date: w.preferred_date || w.wedding_date || w.created_at,
          display_name: `${w.groom_first_name || 'Groom'} & ${w.bride_first_name || 'Bride'}`,
        }))];
      }

      // C. Holy Communions
      const { data: communions } = await supabase
        .from("holy_communions")
        .select("*")
        .eq("preferred_priest", officialName);
      
      if (communions) {
        allRequests = [...allRequests, ...communions.map(c => ({
          ...c,
          request_type: "Holy Communion",
          display_date: c.date_of_communion || c.created_at,
          display_name: `${c.child_first_name || ''} ${c.child_surname || ''}`.trim(),
        }))];
      }

      // D. Confirmations
      const { data: confirmations } = await supabase
        .from("confirmations")
        .select("*")
        .eq("preferred_priest", officialName);
      
      if (confirmations) {
        allRequests = [...allRequests, ...confirmations.map(c => ({
          ...c,
          request_type: "Confirmation",
          display_date: c.date_of_confirmation || c.created_at,
          display_name: `${c.child_first_name || ''} ${c.child_surname || ''}`.trim(),
        }))];
      }

      // E. Sacraments Liturgical
      const { data: liturgical } = await supabase
        .from("sacraments_liturgical")
        .select("*")
        .eq("preferred_priest", officialName);
      
      if (liturgical) {
        allRequests = [...allRequests, ...liturgical.map(l => ({
          ...l,
          request_type: l.request_type || "Liturgical Service",
          display_date: l.request_date || l.created_at,
          display_name: `${l.request_type || 'Service'} requested by ${l.requested_by || 'Parishioner'}`,
        }))];
      }

      // Sort by date (Upcoming first)
      allRequests.sort((a, b) => new Date(a.display_date) - new Date(b.display_date));
      setRequests(allRequests);
      
    } catch (err) {
      console.error("Error fetching requests:", err);
    } finally {
      setLoading(false);
    }
  };

  const getTableName = (type) => {
    switch (type) {
      case "Baptism": return "baptisms";
      case "Wedding": return "weddings";
      case "Holy Communion": return "holy_communions";
      case "Confirmation": return "confirmations";
      default: return "sacraments_liturgical";
    }
  };

  const handleStatusUpdate = async (req, newStatus) => {
    const id = req.id;
    const type = req.request_type;
    setProcessingId(id);
    const tableName = getTableName(type);

    const updatePayload = { status: newStatus };
    if (newStatus === "Priest Rejected") {
      updatePayload.rejection_remarks = rejectReason || "Schedule conflict.";
    }

    try {
      const { error } = await supabase
        .from(tableName)
        .update(updatePayload)
        .eq("id", id);

      if (error) throw error;

      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
      setRejectingId(null);
      setRejectReason("");

      if (newStatus === "Priest Approved") {
        await supabase.rpc('notify_admin', {
          notif_title: `Priest Approved: ${type}`,
          notif_message: `Fr. ${priestName} has accepted the ${type} request for "${req.display_name}". Awaiting your final confirmation.`,
          notif_link: '/admin',
          p_source_id: id,
          p_source_table: tableName,
        });
        if (req.user_id) {
          await supabase.rpc('notify_parishioner', {
            target_user_id: req.user_id,
            notif_title: `Your ${type} Request — Priest Confirmed`,
            notif_message: `Fr. ${priestName} has accepted your request and it is now awaiting the admin's final confirmation.`,
            notif_link: '/profile',
            p_source_id: id,
            p_source_table: tableName,
          });
        }
      }

      if (newStatus === "Priest Rejected") {
        if (req.user_id) {
          await supabase.rpc('notify_parishioner', {
            target_user_id: req.user_id,
            notif_title: `Your ${type} Request — Being Reassigned`,
            notif_message: `The assigned priest was unable to accommodate your request. Our staff will reassign it to another available priest shortly.`,
            notif_link: '/profile',
            p_source_id: id,
            p_source_table: tableName,
          });
        }
      }

      if (newStatus === "Completed") {
        if (req.user_id) {
          await supabase.rpc('notify_parishioner', {
            target_user_id: req.user_id,
            notif_title: `Your ${type} — Completed`,
            notif_message: `Fr. ${priestName} has marked your ${type} request as completed.`,
            notif_link: '/profile',
            p_source_id: id,
            p_source_table: tableName,
          });
        }
      }
    } catch (error) {
      alert("Error updating status: " + error.message);
    } finally {
      setProcessingId(null);
    }
  };

  const [priestSortBy, setPriestSortBy] = useState("submitted_desc");
  const [priestViewMode, setPriestViewMode] = useState("card"); // "card" | "table"
  const [scheduleFilter, setScheduleFilter] = useState("All");

  const todayKey = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
  })();

  const pendingRequests  = requests.filter((r) => r.status === "Staff Approved");
  const approvedRequests = requests.filter((r) =>
    r.status === "Priest Approved" || r.status === "Approved" || r.status === "Completed"
  );

  const filteredApproved = approvedRequests.filter((r) => {
    const d = String(r.display_date || "").split("T")[0];
    if (scheduleFilter === "Active")   return d === todayKey && r.status !== "Completed";
    if (scheduleFilter === "Upcoming") return d > todayKey && r.status !== "Completed";
    if (scheduleFilter === "Past")     return d < todayKey || r.status === "Completed";
    return true;
  });

  const sortList = (list) => [...list].sort((a, b) => {
    if (priestSortBy === "date_asc")       return new Date(a.display_date) - new Date(b.display_date);
    if (priestSortBy === "date_desc")      return new Date(b.display_date) - new Date(a.display_date);
    if (priestSortBy === "submitted_desc") return new Date(b.created_at) - new Date(a.created_at);
    if (priestSortBy === "submitted_asc")  return new Date(a.created_at) - new Date(b.created_at);
    return 0;
  });

  const currentList = sortList(activeTab === "pending" ? pendingRequests : filteredApproved);

  return (
    <div className="min-h-screen bg-[#F6F5ED] flex flex-col font-sans relative">
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 pt-32 pb-12">
        {/* --- HEADER SECTION --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6 border-b border-gray-200 pb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-serif text-[#B59E74] uppercase tracking-widest font-medium">
              Priest Dashboard
            </h1>
            <p className="text-gray-500 font-serif italic mt-2 text-lg">
              {priestName ? `Welcome, Fr. ${priestName}. Review your assigned requests and schedule.` : "Loading profile..."}
            </p>
          </div>
        </div>

        {/* --- CUSTOM TABS --- */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setActiveTab("pending")}
            className={`px-6 py-3 font-bold uppercase tracking-widest text-sm rounded-full transition-all ${
              activeTab === "pending"
                ? "bg-[#B59E74] text-white shadow-md"
                : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            Pending Requests
            {pendingRequests.length > 0 && (
              <span className="ml-2 bg-red-500 text-white px-2 py-0.5 rounded-full text-[10px]">
                {pendingRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("schedule")}
            className={`px-6 py-3 font-bold uppercase tracking-widest text-sm rounded-full transition-all ${
              activeTab === "schedule"
                ? "bg-[#B59E74] text-white shadow-md"
                : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            My Schedule
          </button>
        </div>

        {/* --- CONTENT AREA --- */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B59E74]"></div>
          </div>
        ) : !priestName ? (
           <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-16 text-center animate-fade-in-up">
            <div className="text-5xl mb-4">⚠️</div>
            <h3 className="text-2xl font-serif text-gray-800 uppercase tracking-widest mb-2">
              Profile Not Linked
            </h3>
            <p className="text-gray-500 font-serif italic">
              Your account is marked as a priest, but your official name has not been set up in the database yet. Please contact the administrator.
            </p>
          </div>
        ) : (
          <div className="animate-fade-in-up">
          <div className="flex justify-end mb-4 gap-2 flex-wrap items-center">
            {activeTab === "schedule" && (
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Filter:</label>
                <div className="relative">
                  <select value={scheduleFilter} onChange={e => setScheduleFilter(e.target.value)}
                    className="appearance-none pl-4 pr-10 py-2.5 rounded-xl bg-[#F6F5ED] border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#B59E74] text-sm font-bold uppercase tracking-widest text-gray-700 cursor-pointer">
                    {["All", "Active", "Upcoming", "Past"].map((f) => (
                      <option key={f} value={f}>{f} Events</option>
                    ))}
                  </select>
                  <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                </div>
                {scheduleFilter !== "All" && (
                  <button onClick={() => setScheduleFilter("All")} className="text-xs text-gray-400 hover:text-gray-600 font-bold uppercase tracking-widest transition-colors whitespace-nowrap">✕ Clear</button>
                )}
              </div>
            )}
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Sort</label>
              <select
                value={priestSortBy}
                onChange={e => setPriestSortBy(e.target.value)}
                className="p-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#B59E74]"
              >
                <option value="date_asc">Preferred Date — Oldest</option>
                <option value="date_desc">Preferred Date — Newest</option>
                <option value="submitted_desc">Submitted — Newest</option>
                <option value="submitted_asc">Submitted — Oldest</option>
              </select>
            </div>
            <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-white">
              <button
                onClick={() => setPriestViewMode("card")}
                title="Card view"
                className={`px-3 py-2.5 text-sm transition-colors ${priestViewMode === "card" ? "bg-[#B59E74] text-white" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"}`}
              >⊞</button>
              <button
                onClick={() => setPriestViewMode("table")}
                title="Table view"
                className={`px-3 py-2.5 text-sm transition-colors ${priestViewMode === "table" ? "bg-[#B59E74] text-white" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"}`}
              >≡</button>
            </div>
          </div>
          {currentList.length === 0 ? (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-16 text-center mt-4">
              <div className="text-5xl mb-4">🕊️</div>
              <h3 className="text-2xl font-serif text-[#B59E74] uppercase tracking-widest mb-2">
                {activeTab === "pending" ? "All Caught Up!" : scheduleFilter !== "All" ? `No ${scheduleFilter} Sacraments` : "No Scheduled Sacraments"}
              </h3>
              <p className="text-gray-500 font-serif italic">
                {activeTab === "pending"
                  ? "There are no staff-approved requests assigned to you right now."
                  : scheduleFilter !== "All"
                    ? `Nothing scheduled matches the "${scheduleFilter}" filter.`
                    : "You do not have any approved sacraments scheduled yet."}
              </p>
            </div>
          ) : priestViewMode === "table" ? (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[10px] text-gray-400 uppercase tracking-widest font-bold border-b border-gray-100">
                    <th className="p-3">Type</th>
                    <th className="p-3">Name / Subject</th>
                    <th className="p-3">Preferred Date</th>
                    <th className="p-3">Time</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentList.map((req) => {
                    const typeColor = req.request_type === "Wedding" ? "bg-rose-50 text-rose-600" : req.request_type === "Baptism" ? "bg-blue-50 text-blue-600" : req.request_type === "Holy Communion" ? "bg-amber-50 text-amber-600" : req.request_type === "Confirmation" ? "bg-red-50 text-red-600" : "bg-[#F6F5ED] text-[#B59E74]";
                    const isPending = req.status === "Pending" || !req.status;
                    const isCompleted = req.status === "Completed";
                    const isToday = String(req.display_date || "").split("T")[0] === todayKey;
                    const timeVal = req.time_of_communion || req.time_of_confirmation || req.request_time || req.wedding_time || "—";
                    return (
                      <tr key={`${req.request_type}-${req.id}`} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="p-3">
                          <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md whitespace-nowrap ${typeColor}`}>{req.request_type}</span>
                        </td>
                        <td className="p-3">
                          <p className="text-sm font-medium text-gray-800">{req.display_name}</p>
                          <button onClick={() => setViewingDetails(req)} className="text-[10px] font-bold uppercase tracking-widest text-[#B59E74] hover:text-[#9c8760] transition-colors">Details →</button>
                        </td>
                        <td className="p-3 text-sm text-gray-600 whitespace-nowrap">{new Date(req.display_date).toLocaleDateString()}</td>
                        <td className="p-3 text-sm text-gray-500 whitespace-nowrap">{timeVal}</td>
                        <td className="p-3">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${isCompleted ? "bg-gray-100 text-gray-500" : isPending ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>
                            {req.status || "Pending"}
                          </span>
                        </td>
                        <td className="p-3">
                          {activeTab === "pending" && rejectingId === req.id ? (
                            <div className="flex gap-1 min-w-[180px]">
                              <button onClick={() => handleStatusUpdate(req, "Priest Rejected")} disabled={processingId === req.id} className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[10px] font-bold uppercase tracking-wide transition-colors">Confirm</button>
                              <button onClick={() => { setRejectingId(null); setRejectReason(""); }} className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-colors">Cancel</button>
                            </div>
                          ) : (
                            <div className="flex gap-1">
                              {activeTab === "pending" && (
                                <>
                                  <button onClick={() => handleStatusUpdate(req, "Priest Approved")} disabled={processingId === req.id} className="px-2 py-1 bg-green-50 hover:bg-green-600 text-green-700 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-wide transition-colors">✓</button>
                                  <button onClick={() => setRejectingId(req.id)} className="px-2 py-1 bg-red-50 hover:bg-red-600 text-red-700 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-wide transition-colors">✕</button>
                                </>
                              )}
                              {activeTab === "schedule" && isToday && !isCompleted && (
                                <button onClick={() => handleStatusUpdate(req, "Completed")} disabled={processingId === req.id} className="px-2 py-1 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-wide transition-colors whitespace-nowrap">✓ Done</button>
                              )}
                              <button onClick={() => setViewingDetails(req)} className="px-2 py-1 bg-gray-50 hover:bg-[#B59E74] text-gray-600 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-wide transition-colors">View</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {currentList.map((req) => {
              const isToday = String(req.display_date || "").split("T")[0] === todayKey;
              const isCompleted = req.status === "Completed";
              return (
              <div
                key={`${req.request_type}-${req.id}`}
                className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden group"
              >
                <div className={`absolute top-0 left-0 w-1.5 h-full ${
                  req.request_type === "Wedding" ? "bg-rose-400" : 
                  req.request_type === "Baptism" ? "bg-blue-400" : 
                  req.request_type === "Holy Communion" ? "bg-amber-400" : 
                  req.request_type === "Confirmation" ? "bg-red-500" : "bg-[#B59E74]"
                }`}></div>

                <div className="flex justify-between items-start mb-4">
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-md border ${
                      req.request_type === "Wedding" ? "bg-rose-50 text-rose-600 border-rose-100" : 
                      req.request_type === "Baptism" ? "bg-blue-50 text-blue-600 border-blue-100" :
                      req.request_type === "Holy Communion" ? "bg-amber-50 text-amber-600 border-amber-100" :
                      req.request_type === "Confirmation" ? "bg-red-50 text-red-600 border-red-100" :
                      "bg-[#F6F5ED] text-[#B59E74] border-[#B59E74]/30"
                    }`}
                  >
                    {req.request_type}
                  </span>
                  <span className="text-sm font-serif italic text-gray-500">
                    Requested on {new Date(req.created_at).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="text-2xl font-serif text-gray-800 font-medium mb-1 truncate">
                  {req.display_name}
                </h3>
                
                <div className="bg-[#F6F5ED] p-4 rounded-xl mt-4 mb-6 border border-[#B59E74]/20">
                  <div className="flex items-center gap-3 text-gray-700 font-medium mb-2">
                    <span className="text-xl">📅</span>
                    <span>{new Date(req.display_date).toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-600 text-sm">
                    <span className="text-lg">⏰</span>
                    <span>{req.time_of_communion || req.time_of_confirmation || req.request_time || req.wedding_time || "Time TBD"}</span>
                  </div>
                </div>

                {activeTab === "pending" && (
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    {rejectingId === req.id ? (
                      <div className="space-y-3 animate-fade-in">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                          Reason for Rejection / Reschedule
                        </label>
                        <textarea
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="e.g., Schedule conflict, please reschedule..."
                          className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#B59E74] outline-none text-sm resize-none"
                          rows="2"
                        ></textarea>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleStatusUpdate(req, "Priest Rejected")}
                            disabled={processingId === req.id}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl uppercase tracking-widest text-xs transition-colors"
                          >
                            {processingId === req.id ? "Processing..." : "Confirm Rejection"}
                          </button>
                          <button
                            onClick={() => { setRejectingId(null); setRejectReason(""); }}
                            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-2.5 rounded-xl uppercase tracking-widest text-xs transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-3 flex-col sm:flex-row">
                        <button
                          onClick={() => setViewingDetails(req)}
                          className="w-full sm:flex-1 bg-gray-50 border-2 border-[#B59E74] text-[#B59E74] hover:bg-[#B59E74] hover:text-white font-bold py-3 rounded-xl uppercase tracking-widest text-xs transition-colors"
                        >
                          View Details
                        </button>
                        <div className="flex gap-2 w-full sm:flex-1">
                          <button
                            onClick={() => handleStatusUpdate(req, "Priest Approved")}
                            disabled={processingId === req.id}
                            className="flex-1 bg-[#B59E74] hover:bg-[#9c8760] text-white font-bold py-3 rounded-xl uppercase tracking-widest text-xs shadow-md transition-transform hover:-translate-y-1"
                          >
                            {processingId === req.id ? "..." : "Approve"}
                          </button>
                          <button
                            onClick={() => setRejectingId(req.id)}
                            className="px-4 bg-white border-2 border-red-100 text-red-500 hover:bg-red-50 hover:border-red-200 font-bold py-3 rounded-xl uppercase tracking-widest text-xs transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {activeTab === "schedule" && (
                  <div className="mt-4 flex flex-col gap-3">
                    {isCompleted ? (
                      <div className="flex items-center gap-2 text-gray-500 bg-gray-100 px-4 py-2 rounded-lg w-fit border border-gray-200">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                        <span className="text-xs font-bold uppercase tracking-widest">Completed</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-lg w-fit border border-green-100">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        <span className="text-xs font-bold uppercase tracking-widest">{req.status === "Approved" ? "Admin Confirmed" : "Pending Admin Approval"}</span>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setViewingDetails(req)}
                        className="flex-1 bg-white border-2 border-[#B59E74] text-[#B59E74] hover:bg-[#B59E74] hover:text-white font-bold py-3 rounded-xl uppercase tracking-widest text-xs transition-colors"
                      >
                        View Full Details
                      </button>
                      {isToday && !isCompleted && (
                        <button
                          onClick={() => handleStatusUpdate(req, "Completed")}
                          disabled={processingId === req.id}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl uppercase tracking-widest text-xs transition-colors shadow-md"
                        >
                          {processingId === req.id ? "..." : "✓ Event Done"}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
              );
            })}
          </div>
          )}
          </div>
        )}
      </main>

      {/* --- VIEW DETAILS MODAL --- */}
      {viewingDetails && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-[2rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative animate-fade-in-up">
            <div className={`p-8 border-b-4 sticky top-0 z-10 backdrop-blur-md ${
              viewingDetails.request_type === "Wedding" ? "border-rose-400 bg-rose-50/90" : 
              viewingDetails.request_type === "Baptism" ? "border-blue-400 bg-blue-50/90" :
              viewingDetails.request_type === "Holy Communion" ? "border-amber-400 bg-amber-50/90" :
              viewingDetails.request_type === "Confirmation" ? "border-red-500 bg-red-50/90" :
              "border-[#B59E74] bg-[#F6F5ED]/90"
            }`}>
              <button 
                onClick={() => setViewingDetails(null)}
                className="absolute top-6 right-6 w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors shadow-sm"
              >
                ✕
              </button>
              <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-md mb-4 inline-block bg-white/60`}>
                {viewingDetails.request_type} Details
              </span>
              <h2 className="text-3xl font-serif text-gray-800 font-medium">
                {viewingDetails.display_name}
              </h2>
            </div>

            <div className="p-8 space-y-8">
              
              {/* Dynamic Details based on Request Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* --- BAPTISM, COMMUNION, CONFIRMATION FIELDS --- */}
                {(viewingDetails.request_type === "Baptism" || viewingDetails.request_type === "Holy Communion" || viewingDetails.request_type === "Confirmation") && (
                  <>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Child's Full Name</label>
                      <p className="font-medium text-gray-800">{viewingDetails.child_first_name} {viewingDetails.child_middle_name} {viewingDetails.child_surname || viewingDetails.child_last_name}</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Date of Birth</label>
                      <p className="font-medium text-gray-800">{viewingDetails.date_of_birth || viewingDetails.child_dob ? new Date(viewingDetails.date_of_birth || viewingDetails.child_dob).toLocaleDateString() : "N/A"}</p>
                    </div>
                    <div className="md:col-span-2 border-t border-gray-100 pt-4">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Father's Name</label>
                      <p className="font-medium text-gray-800">{viewingDetails.father_name || "N/A"}</p>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Mother's Maiden Name</label>
                      <p className="font-medium text-gray-800">{viewingDetails.mother_maiden_name || "N/A"}</p>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Contact Number</label>
                      <p className="font-medium text-gray-800">{viewingDetails.contact_numbers || viewingDetails.contact_number_1 || viewingDetails.contact_number || "N/A"}</p>
                    </div>
                  </>
                )}

                {/* --- WEDDING FIELDS --- */}
                {viewingDetails.request_type === "Wedding" && (
                  <>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Groom's Name</label>
                      <p className="font-medium text-gray-800">{viewingDetails.groom_first_name} {viewingDetails.groom_last_name}</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Bride's Name</label>
                      <p className="font-medium text-gray-800">{viewingDetails.bride_first_name} {viewingDetails.bride_last_name}</p>
                    </div>
                    <div className="md:col-span-2 border-t border-gray-100 pt-4">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Groom Contact</label>
                      <p className="font-medium text-gray-800">{viewingDetails.groom_contact || "N/A"}</p>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Bride Contact</label>
                      <p className="font-medium text-gray-800">{viewingDetails.bride_contact || "N/A"}</p>
                    </div>
                  </>
                )}

                {/* --- LITURGICAL FIELDS --- */}
                {(viewingDetails.request_type !== "Baptism" && viewingDetails.request_type !== "Wedding" && viewingDetails.request_type !== "Holy Communion" && viewingDetails.request_type !== "Confirmation") && (
                   <>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Requested By</label>
                      <p className="font-medium text-gray-800">{viewingDetails.requested_by || "N/A"}</p>
                    </div>
                    <div className="md:col-span-2 border-t border-gray-100 pt-4">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Location / Address</label>
                      <p className="font-medium text-gray-800">{viewingDetails.address || "Parish Grounds"}</p>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Contact Number</label>
                      <p className="font-medium text-gray-800">{viewingDetails.contact_number || "N/A"}</p>
                    </div>
                  </>
                )}
              </div>
              
              {/* Optional General Remarks / Notes */}
              {(viewingDetails.notes || viewingDetails.remarks) && (
                <div className="p-4 bg-gray-50 rounded-xl italic text-sm text-gray-600 border-l-4 border-[#B59E74]">
                  <strong>Notes: </strong> {viewingDetails.notes || viewingDetails.remarks}
                </div>
              )}

              {/* Status Specific Messages */}
              {viewingDetails.status === "Rejected" && viewingDetails.rejection_remarks && (
                 <div className="p-4 bg-red-50 rounded-xl text-sm text-red-700 border border-red-100">
                  <strong>Rejection Reason: </strong> {viewingDetails.rejection_remarks}
                </div>
              )}
            </div>
            
            <div className="p-6 bg-gray-50 border-t border-gray-100 text-center rounded-b-[2rem]">
               <button onClick={() => setViewingDetails(null)} className="px-8 py-3 bg-[#B59E74] text-white font-bold uppercase tracking-widest rounded-full hover:bg-[#9c8760] transition-colors shadow-sm">
                 Close Details
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PriestDashboard;