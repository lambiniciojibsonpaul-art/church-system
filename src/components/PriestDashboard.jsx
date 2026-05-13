import { useState, useEffect } from "react";
import Header from "./Header";
import { supabase } from "../supabaseClient";

function PriestDashboard() {
  const [activeTab, setActiveTab] = useState("pending"); // "pending" | "schedule"
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  // Rejection State
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  // View Details Modal State
  const [viewingDetails, setViewingDetails] = useState(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    let allRequests = [];

    try {
      // 1. Fetch Baptisms (Using actual DB columns: child_first_name, child_last_name)
      const { data: baptisms, error: bError } = await supabase
        .from("baptisms")
        .select("*");
      
      if (!bError && baptisms) {
        const mapped = baptisms.map((b) => ({
          ...b,
          request_type: "Baptism",
          display_date: b.preferred_date || b.created_at,
          display_name: `${b.child_first_name || ''} ${b.child_last_name || ''}`,
        }));
        allRequests = [...allRequests, ...mapped];
      }

      // 2. Fetch Weddings (Using actual DB columns: groom_name, bride_name)
      const { data: weddings, error: wError } = await supabase
        .from("weddings")
        .select("*");
      
      if (!wError && weddings) {
        const mapped = weddings.map((w) => ({
          ...w,
          request_type: "Wedding",
          display_date: w.wedding_date || w.created_at,
          display_name: `${w.groom_name || 'Groom'} & ${w.bride_name || 'Bride'}`,
        }));
        allRequests = [...allRequests, ...mapped];
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

  const handleStatusUpdate = async (id, type, newStatus) => {
    setProcessingId(id);
    const tableName = type === "Baptism" ? "baptisms" : "weddings";
    
    const updatePayload = { status: newStatus };
    if (newStatus === "Rejected") {
      updatePayload.rejection_remarks = rejectReason || "Schedule conflict.";
    }

    try {
      const { error } = await supabase
        .from(tableName)
        .update(updatePayload)
        .eq("id", id);

      if (error) throw error;

      // Optimistic update for a smooth UI
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
      setRejectingId(null);
      setRejectReason("");
    } catch (error) {
      alert("Error updating status: " + error.message);
    } finally {
      setProcessingId(null);
    }
  };

  const pendingRequests = requests.filter((r) => r.status === "Pending");
  const approvedRequests = requests.filter((r) => r.status === "Approved");

  const currentList = activeTab === "pending" ? pendingRequests : approvedRequests;

  return (
    <div className="min-h-screen bg-[#F6F5ED] flex flex-col font-sans relative">
      <Header forceSolidBg={true} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 pt-32 pb-12">
        {/* --- HEADER SECTION --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6 border-b border-gray-200 pb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-serif text-[#B59E74] uppercase tracking-widest font-medium">
              Priest Dashboard
            </h1>
            <p className="text-gray-500 font-serif italic mt-2 text-lg">
              Review sacrament requests and manage your officiating schedule.
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
        ) : currentList.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-16 text-center animate-fade-in-up">
            <div className="text-5xl mb-4">🕊️</div>
            <h3 className="text-2xl font-serif text-[#B59E74] uppercase tracking-widest mb-2">
              {activeTab === "pending" ? "All Caught Up!" : "No Scheduled Sacraments"}
            </h3>
            <p className="text-gray-500 font-serif italic">
              {activeTab === "pending"
                ? "There are no pending requests waiting for your approval right now."
                : "You do not have any approved sacraments scheduled yet."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in-up">
            {currentList.map((req) => (
              <div
                key={`${req.request_type}-${req.id}`}
                className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden group"
              >
                <div className={`absolute top-0 left-0 w-1.5 h-full ${req.request_type === "Wedding" ? "bg-rose-400" : "bg-blue-400"}`}></div>

                <div className="flex justify-between items-start mb-4">
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-md ${
                      req.request_type === "Wedding" 
                        ? "bg-rose-50 text-rose-600 border border-rose-100" 
                        : "bg-blue-50 text-blue-600 border border-blue-100"
                    }`}
                  >
                    {req.request_type}
                  </span>
                  <span className="text-sm font-serif italic text-gray-500">
                    Requested on {new Date(req.created_at).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="text-2xl font-serif text-gray-800 font-medium mb-1">
                  {req.display_name}
                </h3>
                
                <div className="bg-[#F6F5ED] p-4 rounded-xl mt-4 mb-6 border border-[#B59E74]/20">
                  <div className="flex items-center gap-3 text-gray-700 font-medium mb-2">
                    <span className="text-xl">📅</span>
                    <span>{new Date(req.display_date).toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-600 text-sm">
                    <span className="text-lg">⏰</span>
                    <span>{req.preferred_time || req.wedding_time || "Time TBD"}</span>
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
                            onClick={() => handleStatusUpdate(req.id, req.request_type, "Rejected")}
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
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleStatusUpdate(req.id, req.request_type, "Approved")}
                          disabled={processingId === req.id}
                          className="flex-1 bg-[#B59E74] hover:bg-[#9c8760] text-white font-bold py-3 rounded-xl uppercase tracking-widest text-sm shadow-md transition-transform hover:-translate-y-1"
                        >
                          {processingId === req.id ? "Processing..." : "Approve Schedule"}
                        </button>
                        <button
                          onClick={() => setRejectingId(req.id)}
                          className="px-6 bg-white border-2 border-red-100 text-red-500 hover:bg-red-50 hover:border-red-200 font-bold py-3 rounded-xl uppercase tracking-widest text-sm transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                )}
                
                {activeTab === "schedule" && (
                  <div className="mt-4 flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-lg w-fit border border-green-100">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      <span className="text-xs font-bold uppercase tracking-widest">Confirmed to Officiate</span>
                    </div>
                    <button
                      onClick={() => setViewingDetails(req)}
                      className="w-full bg-white border-2 border-[#B59E74] text-[#B59E74] hover:bg-[#B59E74] hover:text-white font-bold py-3 rounded-xl uppercase tracking-widest text-xs transition-colors"
                    >
                      View Full Details
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* --- VIEW DETAILS MODAL --- */}
      {viewingDetails && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-[2rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative animate-fade-in-up">
            <div className={`p-8 border-b-4 ${viewingDetails.request_type === "Wedding" ? "border-rose-400 bg-rose-50/30" : "border-blue-400 bg-blue-50/30"}`}>
              <button 
                onClick={() => setViewingDetails(null)}
                className="absolute top-6 right-6 w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors shadow-sm"
              >
                ✕
              </button>
              <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-md mb-4 inline-block ${
                  viewingDetails.request_type === "Wedding" ? "bg-rose-100 text-rose-700" : "bg-blue-100 text-blue-700"
                }`}
              >
                {viewingDetails.request_type} Details
              </span>
              <h2 className="text-3xl font-serif text-gray-800 font-medium">
                {viewingDetails.display_name}
              </h2>
            </div>

            <div className="p-8 space-y-8">
              {viewingDetails.request_type === "Baptism" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Child's Full Name</label>
                    <p className="font-medium text-gray-800">{viewingDetails.child_first_name} {viewingDetails.child_last_name}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Date of Birth</label>
                    <p className="font-medium text-gray-800">{viewingDetails.child_dob ? new Date(viewingDetails.child_dob).toLocaleDateString() : "N/A"}</p>
                  </div>
                  <div className="md:col-span-2 border-t border-gray-100 pt-4">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Father's Name</label>
                    <p className="font-medium text-gray-800">{viewingDetails.father_name || "N/A"}</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Mother's Name</label>
                    <p className="font-medium text-gray-800">{viewingDetails.mother_maiden_name || "N/A"}</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Groom's Name</label>
                    <p className="font-medium text-gray-800">{viewingDetails.groom_name || "N/A"}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Bride's Name</label>
                    <p className="font-medium text-gray-800">{viewingDetails.bride_name || "N/A"}</p>
                  </div>
                </div>
              )}
              
              {viewingDetails.remarks && (
                <div className="p-4 bg-gray-50 rounded-xl italic text-sm text-gray-600 border-l-4 border-[#B59E74]">
                  {viewingDetails.remarks}
                </div>
              )}
            </div>
            <div className="p-6 bg-gray-50 border-t border-gray-100 text-center rounded-b-[2rem]">
               <button onClick={() => setViewingDetails(null)} className="px-8 py-3 bg-[#B59E74] text-white font-bold uppercase tracking-widest rounded-full hover:bg-[#9c8760] transition-colors">
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