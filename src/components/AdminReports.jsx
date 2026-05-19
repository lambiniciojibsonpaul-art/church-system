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
        totalReservations:
          (baps.data?.length || 0) +
          (weddings.data?.length || 0) +
          (intentions.data?.length || 0) +
          (confs.data?.length || 0),
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
        services: {
          baptisms: bData.data || [],
          weddings: wData.data || [],
          intentions: iData.data || [],
          confirmations: cData.data || [],
        },
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F5ED]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B59E74]"></div>
      </div>
    );
  }

  const getColSpan = () => {
    if (activeTab === "attendance") return 3;
    if (activeTab === "ministries") return 3;
    if (activeTab === "schedules") return 4;
    return 4;
  };

  return (
    <div className="min-h-screen bg-[#F6F5ED] flex flex-col font-sans print:bg-white print:p-0">
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 pt-32 pb-12 print:max-w-full print:px-0 print:pt-0">

        {/* HEADER */}
        <div className="flex justify-between items-end mb-8 print:hidden">
          <div>
            <h1 className="text-3xl font-serif text-[#B59E74] uppercase tracking-widest mb-2">
              Administrative Reports
            </h1>
            <p className="text-gray-500 italic font-serif">
              Consolidated parish data and performance metrics.
            </p>
          </div>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-white border-2 border-[#B59E74] text-[#B59E74] px-6 py-2 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-[#B59E74] hover:text-white transition-all shadow-sm"
          >
            🖨️ Print Report
          </button>
        </div>

        {/* MAIN */}
        <div className="bg-white rounded-[2rem] shadow-xl border border-gray-200 overflow-hidden print:shadow-none print:border-none print:rounded-none">

          {/* TABS */}
          <div className="flex bg-gray-50 border-b border-gray-100 print:hidden">
            {["services", "attendance", "schedules", "ministries"].map(tabId => (
              <button
                key={tabId}
                onClick={() => setActiveTab(tabId)}
                className={`flex-1 py-5 text-xs font-bold uppercase tracking-widest transition-all ${
                  activeTab === tabId
                    ? "bg-white text-[#B59E74] border-b-2 border-[#B59E74]"
                    : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                }`}
              >
                {tabId === "services" ? "Service Reservations" : tabId}
              </button>
            ))}
          </div>

          <div className="p-8">

            {activeTab !== "services" && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse border border-gray-200 print:border-black">

                  {/* ✅ FIXED HEADER */}
                  <thead>
                    <tr className="bg-gray-50 print:bg-transparent text-gray-500 print:text-black text-[10px] uppercase tracking-widest font-bold">

                      {activeTab === "attendance" && (
                        <>
                          <th className="p-4 border-b border-gray-200 print:border-black">Attendee</th>
                          <th className="p-4 border-b border-gray-200 print:border-black">Event</th>
                          <th className="p-4 border-b border-gray-200 print:border-black">Status</th>
                        </>
                      )}

                      {activeTab === "schedules" && (
                        <>
                          <th className="p-4 border-b border-gray-200 print:border-black">Event</th>
                          <th className="p-4 border-b border-gray-200 print:border-black">Priest</th>
                          <th className="p-4 border-b border-gray-200 print:border-black">Date</th>
                          <th className="p-4 border-b border-gray-200 print:border-black">Location</th>
                        </>
                      )}

                      {activeTab === "ministries" && (
                        <>
                          <th className="p-4 border-b border-gray-200 print:border-black">Event</th>
                          <th className="p-4 border-b border-gray-200 print:border-black">Ministry</th>
                          <th className="p-4 border-b border-gray-200 print:border-black">Date</th>
                        </>
                      )}

                    </tr>
                  </thead>

                  <tbody>
                    {reportData[activeTab].length === 0 ? (
                      <tr>
                        <td colSpan={getColSpan()} className="p-20 text-center text-gray-400 italic font-serif">
                          No data available.
                        </td>
                      </tr>
                    ) : (
                      reportData[activeTab].map((item, idx) => {
                        if (activeTab === "attendance") {
                          return (
                            <tr key={idx}>
                              <td className="p-4">{item.attendee_name}</td>
                              <td className="p-4">{item.events?.title || "General Event"}</td>
                              <td className="p-4">Present</td>
                            </tr>
                          );
                        }

                        if (activeTab === "schedules") {
                          return (
                            <tr key={idx}>
                              <td className="p-4">{item.title}</td>
                              <td className="p-4">{item.priest_name}</td>
                              <td className="p-4">{new Date(item.event_date).toLocaleDateString()}</td>
                              <td className="p-4">{item.location}</td>
                            </tr>
                          );
                        }

                        if (activeTab === "ministries") {
                          return (
                            <tr key={idx}>
                              <td className="p-4">{item.title}</td>
                              <td className="p-4">{item.ministry || "General"}</td>
                              <td className="p-4">{new Date(item.event_date).toLocaleDateString()}</td>
                            </tr>
                          );
                        }

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