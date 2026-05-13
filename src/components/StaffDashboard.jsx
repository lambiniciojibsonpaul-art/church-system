import { useState, useEffect } from "react";
import Header from "./Header";
import { supabase } from "../supabaseClient";

function StaffDashboard() {
  const [activeTab, setActiveTab] = useState("events"); // "events" | "certificates" | "scanner"
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals & Views
  const [viewingDetails, setViewingDetails] = useState(null);
  const [activeScanner, setActiveScanner] = useState(null); // Holds the event being scanned

  useEffect(() => {
    fetchApprovedItems();
  }, []);

  const fetchApprovedItems = async () => {
    setLoading(true);
    let allItems = [];

    // 1. Fetch Approved Baptisms
    try {
      const { data: baptisms } = await supabase
        .from("baptisms")
        .select("*")
        .eq("status", "Approved");
      if (baptisms) {
        allItems = [...allItems, ...baptisms.map(b => ({ ...b, request_type: "Baptism", display_date: b.preferred_date || b.created_at, display_name: b.name_of_child || "N/A" }))];
      }
    } catch (err) { console.warn(err); }

    // 2. Fetch Approved Weddings
    try {
      const { data: weddings } = await supabase
        .from("weddings")
        .select("*")
        .eq("status", "Approved");
      if (weddings) {
        allItems = [...allItems, ...weddings.map(w => ({ ...w, request_type: "Wedding", display_date: w.wedding_date || w.created_at, display_name: `${w.groom_name || 'Groom'} & ${w.bride_name || 'Bride'}` }))];
      }
    } catch (err) { console.warn(err); }

    // 3. Fetch Standard Events
    try {
      const { data: events } = await supabase
        .from("events")
        .select("*")
        .neq("status", "Cancelled"); // Assuming events don't have "Approved" status, just active
      if (events) {
        allItems = [...allItems, ...events.map(e => ({ ...e, request_type: "Parish Event", display_date: e.event_date, display_name: e.title, preferred_time: e.event_time }))];
      }
    } catch (err) { console.warn(err); }

    // Sort by upcoming dates
    allItems.sort((a, b) => new Date(a.display_date) - new Date(b.display_date));
    setItems(allItems);
    setLoading(false);
  };

  // Filter items based on active tab
  const getVisibleItems = () => {
    if (activeTab === "certificates") {
      return items.filter(i => i.request_type === "Baptism" || i.request_type === "Wedding");
    }
    return items;
  };

  const visibleItems = getVisibleItems();

  return (
    <div className="min-h-screen bg-[#F6F5ED] flex flex-col font-sans relative">
      <Header forceSolidBg={true} />

      {/* --- MAIN DASHBOARD --- */}
      {/* Hide the main dashboard if the QR Scanner is active (Full screen mobile takeover) */}
      {!activeScanner && (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-28 sm:pt-32 pb-12">
          
          <div className="mb-8 border-b border-gray-200 pb-6">
            <h1 className="text-3xl md:text-4xl font-serif text-[#B59E74] uppercase tracking-widest font-medium">
              Staff Portal
            </h1>
            <p className="text-gray-500 font-serif italic mt-2 text-sm sm:text-base">
              Prepare for upcoming events, generate certificates, and manage attendance.
            </p>
          </div>

          {/* --- MOBILE-FRIENDLY TABS --- */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-8">
            <button
              onClick={() => setActiveTab("events")}
              className={`px-6 py-3.5 font-bold uppercase tracking-widest text-xs rounded-xl transition-all w-full sm:w-auto ${
                activeTab === "events" ? "bg-[#B59E74] text-white shadow-md" : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              📅 Approved Events
            </button>
            <button
              onClick={() => setActiveTab("certificates")}
              className={`px-6 py-3.5 font-bold uppercase tracking-widest text-xs rounded-xl transition-all w-full sm:w-auto ${
                activeTab === "certificates" ? "bg-[#B59E74] text-white shadow-md" : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              📜 Certificates
            </button>
            <button
              onClick={() => setActiveTab("scanner")}
              className={`px-6 py-3.5 font-bold uppercase tracking-widest text-xs rounded-xl transition-all w-full sm:w-auto ${
                activeTab === "scanner" ? "bg-gray-800 text-white shadow-md" : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              📷 QR & Attendance
            </button>
          </div>

          {/* --- CONTENT AREA --- */}
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B59E74]"></div>
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="bg-white rounded-3xl border border-gray-200 p-12 text-center">
              <div className="text-4xl mb-4">📭</div>
              <h3 className="text-xl font-serif text-gray-800">No events found.</h3>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {visibleItems.map((item) => (
                <div key={`${item.request_type}-${item.id}`} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col h-full relative overflow-hidden">
                  
                  {/* Decorative side line */}
                  <div className={`absolute top-0 left-0 w-1.5 h-full ${
                    item.request_type === "Wedding" ? "bg-rose-400" : 
                    item.request_type === "Baptism" ? "bg-blue-400" : "bg-[#B59E74]"
                  }`}></div>

                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md bg-gray-100 text-gray-600">
                      {item.request_type}
                    </span>
                  </div>

                  <h3 className="text-xl font-serif text-gray-800 font-medium leading-tight mb-2 pr-4">
                    {item.display_name}
                  </h3>

                  <div className="text-sm text-gray-500 flex flex-col gap-1 mb-6 flex-grow">
                    <div className="flex items-center gap-2">
                      <span>🗓️</span> {new Date(item.display_date).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-2">
                      <span>⏰</span> {item.preferred_time || item.wedding_time || "TBD"}
                    </div>
                    {item.location && (
                      <div className="flex items-center gap-2">
                        <span>📍</span> {item.location}
                      </div>
                    )}
                  </div>

                  {/* ACTION BUTTONS BASED ON TAB */}
                  <div className="mt-auto border-t border-gray-100 pt-4">
                    {activeTab === "events" && (
                      <button onClick={() => setViewingDetails(item)} className="w-full bg-gray-50 text-[#B59E74] hover:bg-[#B59E74] hover:text-white font-bold py-3 rounded-xl uppercase tracking-widest text-xs transition-colors">
                        View Deep Details
                      </button>
                    )}
                    
                    {activeTab === "certificates" && (
                      <button className="w-full bg-white border-2 border-[#B59E74] text-[#B59E74] hover:bg-[#B59E74] hover:text-white font-bold py-3 rounded-xl uppercase tracking-widest text-xs transition-colors flex items-center justify-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                        Draft Certificate
                      </button>
                    )}

                    {activeTab === "scanner" && (
                      <div className="flex gap-2">
                        <button onClick={() => setActiveScanner(item)} className="flex-1 bg-gray-800 hover:bg-black text-white font-bold py-3 rounded-xl uppercase tracking-widest text-[10px] sm:text-xs transition-colors flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H5v3a1 1 0 01-2 0V4zm14-1a1 1 0 011 1v3a1 1 0 01-2 0V5h-3a1 1 0 010-2h4zM3 20a1 1 0 001 1h4a1 1 0 000-2H5v-3a1 1 0 00-2 0v4zm14 1a1 1 0 001-1v-3a1 1 0 00-2 0v3h-3a1 1 0 000 2h4z"></path></svg>
                          Scan QR
                        </button>
                        <button className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-3 rounded-xl uppercase tracking-widest text-[10px] sm:text-xs transition-colors">
                          List
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              ))}
            </div>
          )}
        </main>
      )}

      {/* --- MOBILE FULLSCREEN QR SCANNER UI --- */}
      {activeScanner && (
        <div className="fixed inset-0 z-[9999] bg-black flex flex-col animate-fade-in">
          {/* Header */}
          <div className="p-6 pt-12 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent absolute top-0 w-full z-10">
            <div className="text-white">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#B59E74]">Scanning Attendance</span>
              <h2 className="text-lg font-bold leading-tight">{activeScanner.display_name}</h2>
            </div>
            <button onClick={() => setActiveScanner(null)} className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white">
              ✕
            </button>
          </div>

          {/* Camera Viewfinder (Placeholder for now) */}
          <div className="flex-1 flex items-center justify-center relative">
            {/* The scanning box */}
            <div className="w-64 h-64 border-2 border-white/50 rounded-3xl relative">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#B59E74] rounded-tl-2xl -mt-1 -ml-1"></div>
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#B59E74] rounded-tr-2xl -mt-1 -mr-1"></div>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#B59E74] rounded-bl-2xl -mb-1 -ml-1"></div>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#B59E74] rounded-br-2xl -mb-1 -mr-1"></div>
              {/* Scanning laser animation */}
              <div className="w-full h-0.5 bg-green-400 absolute top-1/2 shadow-[0_0_10px_2px_rgba(74,222,128,0.5)] animate-pulse"></div>
            </div>
            <p className="absolute bottom-20 text-white/70 text-sm font-bold uppercase tracking-widest text-center w-full">
              Align QR code within frame
            </p>
          </div>
        </div>
      )}

      {/* --- DEEP DETAILS MODAL --- */}
      {viewingDetails && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-[2rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <div className="p-6 md:p-8 border-b-4 border-gray-100 bg-gray-50/50 sticky top-0 z-10 flex justify-between items-start backdrop-blur-md">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest bg-gray-200 text-gray-700 px-3 py-1 rounded-md mb-3 inline-block">
                  {viewingDetails.request_type} Details
                </span>
                <h2 className="text-2xl md:text-3xl font-serif text-gray-800 font-medium">
                  {viewingDetails.display_name}
                </h2>
              </div>
              <button onClick={() => setViewingDetails(null)} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-500 shadow-sm border border-gray-200">
                ✕
              </button>
            </div>

            <div className="p-6 md:p-8 space-y-6">
              {viewingDetails.request_type === "Baptism" ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Child's Name</label>
                      <p className="font-medium text-gray-800">{viewingDetails.name_of_child || "N/A"}</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Date of Birth</label>
                      <p className="font-medium text-gray-800">{viewingDetails.date_of_birth ? new Date(viewingDetails.date_of_birth).toLocaleDateString() : "N/A"}</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mt-4">Father's Name</label>
                      <p className="font-medium text-gray-800">{viewingDetails.father_name || "N/A"}</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mt-4">Mother's Name</label>
                      <p className="font-medium text-gray-800">{viewingDetails.mother_name || "N/A"}</p>
                    </div>
                  </div>
                </>
              ) : viewingDetails.request_type === "Wedding" ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Groom's Name</label>
                      <p className="font-medium text-gray-800">{viewingDetails.groom_name || "N/A"}</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Bride's Name</label>
                      <p className="font-medium text-gray-800">{viewingDetails.bride_name || "N/A"}</p>
                    </div>
                    <div className="col-span-2 mt-4">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Contact Number</label>
                      <p className="font-medium text-gray-800">{viewingDetails.contact_number || "N/A"}</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-gray-600">Standard Parish Event details go here.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StaffDashboard;