import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

function AdminReports() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("services");
  const [loading, setLoading] = useState(true);
  
  const [metrics, setMetrics] = useState({
    totalReservations: 0,
    totalAttendance: 0,
    activeEvents: 0,
    totalMinistries: 0,
  });
  
  const [reportData, setReportData] = useState({
    services: { baptisms: [], weddings: [], intentions: [], confirmations: [] },
    attendance: [],
    schedules: [],
    ministries: [],
  });

  useEffect(() => {
    fetchAllReports();
  }, []);

  const fetchAllReports = async () => {
    setLoading(true);
    try {
      const [baps, weddings, intentions, confs, events, attendance] = await Promise.all([
        supabase.from("baptisms").select("id"),
        supabase.from("weddings").select("id"),
        supabase.from("mass_intentions").select("id"),
        supabase.from("confirmations").select("id"),
        supabase.from("events").select("id, ministry"),
        supabase.from("attendance").select("id"),
      ]);

      setMetrics({
        totalReservations: (baps.data?.length || 0) + (weddings.data?.length || 0) + (intentions.data?.length || 0) + (confs.data?.length || 0),
        totalAttendance: attendance.data?.length || 0,
        activeEvents: events.data?.length || 0,
        totalMinistries: new Set(events.data?.map(e => e.ministry).filter(Boolean)).size,
      });

      const bData = await supabase.from("baptisms").select("child_first_name, child_last_name, preferred_date, status").order("preferred_date", { ascending: true });
      const wData = await supabase.from("weddings").select("groom_name, bride_name, wedding_date, status").order("wedding_date", { ascending: true });
      const iData = await supabase.from("mass_intentions").select("intention_detail, intention_date, status").order("intention_date", { ascending: true });
      const cData = await supabase.from("confirmations").select("candidate_name, confirmation_date, status").order("confirmation_date", { ascending: true });
      const sData = await supabase.from("events").select("title, priest_name, event_date, location").order("event_date", { ascending: true });
      const mData = await supabase.from("events").select("title, ministry, event_date");
      const aData = await supabase.from("attendance").select(`attendee_name, status, events(title)`);

      setReportData({
        services: { baptisms: bData.data || [], weddings: wData.data || [], intentions: iData.data || [], confirmations: cData.data || [] },
        attendance: aData.data || [],
        schedules: sData.data || [],
        ministries: mData.data || [],
      });
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // FORMAL PRINT TABLE RENDERER
  const renderServiceTable = (title, data, columns, rowRender) => {
    if (data.length === 0) return null;
    return (
      <div className="mb-10 print:mb-8">
        <div className="flex items-center gap-4 mb-3">
          <h4 className="text-sm font-bold text-[#B59E74] print:text-black uppercase tracking-widest">{title}</h4>
          <div className="h-px w-full bg-gray-100 print:bg-black"></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-gray-200 print:border-black">
            <thead>
              <tr className="bg-gray-50 print:bg-transparent text-[10px] text-gray-500 print:text-black uppercase tracking-widest font-bold">
                {columns.map((col, i) => (
                  <th key={i} className="p-3 border-b border-gray-200 print:border-black border-r print:border-r-black last:border-r-0">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((item, idx) => rowRender(item, idx))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F6F5ED]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B59E74]"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F6F5ED] flex flex-col font-sans print:bg-white print:p-0">
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 pt-32 pb-12 print:max-w-full print:px-0 print:pt-0">
        
        {/* PRINT-ONLY OFFICIAL LETTERHEAD */}
        <div className="hidden print:block text-center mb-12">
          <h1 className="text-3xl font-serif font-bold text-black uppercase tracking-[0.2em]">San Pedro Bautista Church</h1>
          <p className="text-sm text-gray-600 uppercase tracking-widest mt-1">Official Parish Administrative Report</p>
          <div className="w-full h-1 bg-black my-4"></div>
          <div className="flex justify-between text-xs text-gray-500 italic mt-4">
            <span>Report Type: {activeTab === 'services' ? 'Service Reservations' : activeTab}</span>
            <span>Date Generated: {new Date().toLocaleString()}</span>
          </div>
          <div className="w-full h-px bg-gray-300 my-6"></div>
        </div>

        {/* SCREEN-ONLY TOP SECTION */}
        <div className="flex justify-between items-end mb-8 print:hidden">
          <div>
            <h1 className="text-3xl font-serif text-[#B59E74] uppercase tracking-widest mb-2">Administrative Reports</h1>
            <p className="text-gray-500 italic font-serif">Consolidated parish data and performance metrics.</p>
          </div>
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 bg-white border-2 border-[#B59E74] text-[#B59E74] px-6 py-2 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-[#B59E74] hover:text-white transition-all shadow-sm"
          >
            <span>🖨️</span> Print Report
          </button>
        </div>

        {/* SUMMARY CARDS (HIDDEN IN PRINT) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10 print:hidden">
          {[
            { label: "Total Reservations", value: metrics.totalReservations, icon: "📅", color: "bg-blue-500" },
            { label: "Total Attendance", value: metrics.totalAttendance, icon: "👥", color: "bg-green-500" },
            { label: "Upcoming Events", value: metrics.activeEvents, icon: "⛪", color: "bg-amber-500" },
            { label: "Active Ministries", value: metrics.totalMinistries, icon: "✨", color: "bg-purple-500" },
          ].map((card, idx) => (
            <div key={idx} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-all group cursor-default relative overflow-hidden">
              <div className={`absolute top-0 right-0 w-16 h-16 ${card.color} opacity-10 rounded-bl-full transition-all group-hover:scale-150`}></div>
              <div className="text-2xl mb-3">{card.icon}</div>
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{card.label}</h3>
              <p className="text-3xl font-serif text-gray-800">{card.value}</p>
            </div>
          ))}
        </div>

        {/* MAIN REPORT AREA */}
        <div className="bg-white rounded-[2rem] shadow-xl border border-gray-200 overflow-hidden print:shadow-none print:border-none print:rounded-none">
          
          {/* TAB NAV (HIDDEN IN PRINT) */}
          <div className="flex bg-gray-50 border-b border-gray-100 print:hidden">
            {['services', 'attendance', 'schedules', 'ministries'].map((tabId) => (
              <button
                key={tabId}
                onClick={() => setActiveTab(tabId)}
                className={`flex-1 py-5 text-xs font-bold uppercase tracking-widest transition-all ${
                  activeTab === tabId 
                  ? "bg-white text-[#B59E74] border-b-2 border-[#B59E74]" 
                  : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                }`}
              >
                {tabId === 'services' ? 'Service Reservations' : tabId.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="p-8 print:p-0">
            {/* CATEGORIZED SERVICES VIEW */}
            {activeTab === "services" && (
              <div className="space-y-12">
                {renderServiceTable(
                  "Baptisms", 
                  reportData.services.baptisms, 
                  ["Child Name", "Preferred Date", "Status"], 
                  (item) => (
                    <tr className="border-b border-gray-100 print:border-black hover:bg-gray-50 transition-colors">
                      <td className="p-4 text-sm font-medium text-gray-800 print:text-black">{item.child_first_name} {item.child_last_name}</td>
                      <td className="p-4 text-sm text-gray-600 print:text-black">{new Date(item.preferred_date).toLocaleDateString()}</td>
                      <td className="p-4 text-sm font-bold print:font-normal uppercase tracking-tighter text-blue-700 print:text-black">{item.status}</td>
                    </tr>
                  )
                )}
                {renderServiceTable(
                  "Weddings", 
                  reportData.services.weddings, 
                  ["Couple", "Wedding Date", "Status"], 
                  (item) => (
                    <tr className="border-b border-gray-100 print:border-black hover:bg-gray-50 transition-colors">
                      <td className="p-4 text-sm font-medium text-gray-800 print:text-black">{item.groom_name} & {item.bride_name}</td>
                      <td className="p-4 text-sm text-gray-600 print:text-black">{new Date(item.wedding_date).toLocaleDateString()}</td>
                      <td className="p-4 text-sm font-bold print:font-normal uppercase tracking-tighter text-pink-700 print:text-black">{item.status}</td>
                    </tr>
                  )
                )}
                {renderServiceTable(
                  "Mass Intentions", 
                  reportData.services.intentions, 
                  ["Intention", "Date", "Status"], 
                  (item) => (
                    <tr className="border-b border-gray-100 print:border-black hover:bg-gray-50 transition-colors">
                      <td className="p-4 text-sm font-medium text-gray-800 print:text-black">{item.intention_detail}</td>
                      <td className="p-4 text-sm text-gray-600 print:text-black">{new Date(item.intention_date).toLocaleDateString()}</td>
                      <td className="p-4 text-sm font-bold print:font-normal uppercase tracking-tighter text-amber-700 print:text-black">{item.status}</td>
                    </tr>
                  )
                )}
                {renderServiceTable(
                  "Confirmations", 
                  reportData.services.confirmations, 
                  ["Candidate Name", "Confirmation Date", "Status"], 
                  (item) => (
                    <tr className="border-b border-gray-100 print:border-black hover:bg-gray-50 transition-colors">
                      <td className="p-4 text-sm font-medium text-gray-800 print:text-black">{item.candidate_name}</td>
                      <td className="p-4 text-sm text-gray-600 print:text-black">{new Date(item.confirmation_date).toLocaleDateString()}</td>
                      <td className="p-4 text-sm font-bold print:font-normal uppercase tracking-tighter text-purple-700 print:text-black">{item.status}</td>
                    </tr>
                  )
                )}
              </div>
            )}

            {/* OTHER TABS (Attendance, Schedules, Ministries) */}
            {activeTab !== "services" && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse border border-gray-200 print:border-black">
                  <thead>
                    <tr className="bg-gray-50 print:bg-transparent text-gray-500 print:text-black text-[10px] uppercase tracking-widest font-bold">
                      {activeTab === 'attendance' && <>{ `<th className="p-4 border-b border-gray-200 print:border-black">Attendee</th><th className="p-4 border-b border-gray-200 print:border-black">Event</th><th className="p-4 border-b border-gray-200 print:border-black">Status</th>` }</>}
                      {activeTab === 'schedules' && <>{ `<th className="p-4 border-b border-gray-200 print:border-black">Event</th><th className="p-4 border-b border-gray-200 print:border-black">Priest</th><th className="p-4 border-b border-gray-200 print:border-black">Date</th><th className="p-4 border-b border-gray-200 print:border-black">Location</th>` }</>}
                      {activeTab === 'ministries' && <>{ `<th className="p-4 border-b border-gray-200 print:border-black">Event</th><th className="p-4 border-b border-gray-200 print:border-black">Ministry</th><th className="p-4 border-b border-gray-200 print:border-black">Date</th>` }</>}
                    </tr>
                  </thead>
                  <tbody>
                    {reportData[activeTab].length === 0 ? (
                      <tr><td colSpan="4" className="p-20 text-center text-gray-400 italic font-serif">No data available.</td></tr>
                    ) : (
                      reportData[activeTab].map((item, idx) => {
                        if (activeTab === 'attendance') return (
                          <tr key={idx} className="border-b border-gray-50 print:border-black hover:bg-gray-50 transition-colors">
                            <td className="p-4 text-sm font-medium text-gray-800 print:text-black">{item.attendee_name}</td>
                            <td className="p-4 text-sm text-gray-600 print:text-black">{item.events?.title || "General Event"}</td>
                            <td className="p-4 text-sm text-gray-500 print:text-black">Present</td>
                          </tr>
                        );
                        if (activeTab === 'schedules') return (
                          <tr key={idx} className="border-b border-gray-50 print:border-black hover:bg-gray-50 transition-colors">
                            <td className="p-4 text-sm font-medium text-gray-800 print:text-black">{item.title}</td>
                            <td className="p-4 text-sm text-gray-600 print:text-black">{item.priest_name}</td>
                            <td className="p-4 text-sm text-gray-600 print:text-black">{new Date(item.event_date).toLocaleDateString()}</td>
                            <td className="p-4 text-sm text-gray-500 print:text-black">{item.location}</td>
                          </tr>
                        );
                        if (activeTab === 'ministries') return (
                          <tr key={idx} className="border-b border-gray-50 print:border-black hover:bg-gray-50 transition-colors">
                            <td className="p-4 text-sm font-medium text-gray-800 print:text-black">{item.title}</td>
                            <td className="p-4 text-sm text-gray-600 print:text-black">{item.ministry || "General"}</td>
                            <td className="p-4 text-sm text-gray-600 print:text-black">{new Date(item.event_date).toLocaleDateString()}</td>
                          </tr>
                        );
                        return null;
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

export default AdminReports;