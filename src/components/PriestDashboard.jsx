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

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    let allRequests = [];

    // 1. Fetch Baptisms
    try {
      const { data: baptisms, error: bError } = await supabase
        .from("baptisms")
        .select("*");
      
      if (!bError && baptisms) {
        const mapped = baptisms.map((b) => ({
          ...b,
          request_type: "Baptism",
          display_date: b.preferred_date || b.created_at,
          display_name: b.child_name || "N/A",
        }));
        allRequests = [...allRequests, ...mapped];
      }
    } catch (err) {
      console.warn("Could not fetch baptisms:", err);
    }

    // 2. Fetch Weddings (Wrapped safely in case table doesn't exist yet)
    try {
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
    } catch (err) {
      console.warn("Could not fetch weddings:", err);
    }

    // Sort by date (newest/upcoming first)
    allRequests.sort((a, b) => new Date(a.display_date) - new Date(b.display_date));
    
    setRequests(allRequests);
    setLoading(false);
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

      // Refresh the UI
      fetchRequests();
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
    <div className="min-h-screen bg-[#F6F5ED] flex flex-col font-sans">
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
                {/* Decorative Side Line */}
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
                  {/* Note: Adjust 'req.preferred_time' depending on your exact database column names */}
                  <div className="flex items-center gap-3 text-gray-600 text-sm">
                    <span className="text-lg">⏰</span>
                    <span>{req.preferred_time || req.wedding_time || "Time TBD"}</span>
                  </div>
                </div>

                {/* --- PENDING ACTIONS --- */}
                {activeTab === "pending" && (
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    {rejectingId === req.id ? (
                      <div className="space-y-3 animate-fade-in">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Reason for Rejection</label>
                        <textarea
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="e.g., Schedule conflict, out of town..."
                          className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#B59E74] outline-none text-sm resize-none"
                          rows="2"
                        ></textarea>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleStatusUpdate(req.id, req.request_type, "Rejected")}
                            disabled={processingId === req.id}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl uppercase tracking-widest text-xs transition-colors"
                          >
                            Confirm Reject
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
                          {processingId === req.id ? "..." : "Approve Schedule"}
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
                
                {/* --- SCHEDULED BADGE --- */}
                {activeTab === "schedule" && (
                  <div className="mt-4 flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-lg w-fit border border-green-100">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <span className="text-xs font-bold uppercase tracking-widest">Confirmed to Officiate</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default PriestDashboard;