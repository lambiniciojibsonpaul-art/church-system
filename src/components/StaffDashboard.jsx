import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "./Header";
import { supabase } from "../supabaseClient";
import { QRCodeCanvas } from "qrcode.react"; 
import jsPDF from "jspdf"; // Ensure you ran: npm install jspdf

function StaffDashboard() {
  const [activeTab, setActiveTab] = useState("events"); // "events" | "certificates" | "qr-generator"
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [viewingDetails, setViewingDetails] = useState(null);
  const [activeQR, setActiveQR] = useState(null); 

  useEffect(() => {
    fetchApprovedItems();
  }, []);

  const fetchApprovedItems = async () => {
    setLoading(true);
    let allItems = [];
    try {
      // 1. Fetch Approved Baptisms
      const { data: baptisms } = await supabase
        .from("baptisms")
        .select("*")
        .eq("status", "Approved");
      
      if (baptisms) {
        const mapped = baptisms.map((b) => ({
          ...b,
          request_type: "Baptism",
          display_date: b.preferred_date || b.created_at,
          display_name: `${b.child_first_name || ''} ${b.child_last_name || ''}`,
        }));
        allItems = [...allItems, ...mapped];
      }

      // 2. Fetch Approved Weddings
      const { data: weddings } = await supabase
        .from("weddings")
        .select("*")
        .eq("status", "Approved");
      
      if (weddings) {
        const mapped = weddings.map((w) => ({
          ...w,
          request_type: "Wedding",
          display_date: w.wedding_date || w.created_at,
          display_name: `${w.groom_name || 'Groom'} & ${w.bride_name || 'Bride'}`,
        }));
        allItems = [...allItems, ...mapped];
      }

      // 3. Fetch Standard Events
      const { data: events } = await supabase
        .from("events")
        .select("*")
        .neq("status", "Cancelled");
      if (events) {
        allItems = [...allItems, ...events.map(e => ({ 
          ...e, 
          request_type: "Parish Event", 
          display_date: e.event_date, 
          display_name: e.title, 
          preferred_time: e.event_time 
        }))];
      }

      allItems.sort((a, b) => new Date(a.display_date) - new Date(b.display_date));
      setItems(allItems);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  // --- PDF GENERATION LOGIC ---
  const generateCertificate = (item) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const centerX = pageWidth / 2;

    // 1. Formal Border
    doc.setDrawColor(181, 158, 116); // #B59E74 Gold
    doc.setLineWidth(1.5);
    doc.rect(10, 10, pageWidth - 20, 287); 
    doc.setLineWidth(0.5);
    doc.rect(12, 12, pageWidth - 24, 283);

    // 2. Header
    doc.setFont("times", "bold");
    doc.setFontSize(22);
    doc.setTextColor(181, 158, 116); 
    doc.text("Minore Basilica of San Pedro Bautista", centerX, 40, { align: "center" });
    
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.setFont("times", "italic");
    doc.text("Quezon City, Philippines", centerX, 48, { align: "center" });

    // 3. Title
    doc.setFont("times", "bold");
    doc.setFontSize(32);
    doc.setTextColor(0, 0, 0);
    const title = item.request_type === "Baptism" ? "CERTIFICATE OF BAPTISM" : "CERTIFICATE OF MARRIAGE";
    doc.text(title, centerX, 80, { align: "center" });

    // 4. Content
    doc.setFont("times", "normal");
    doc.setFontSize(16);
    doc.setTextColor(60, 60, 60);

    if (item.request_type === "Baptism") {
      doc.text("This is to certify that", centerX, 110, { align: "center" });
      doc.setFontSize(24);
      doc.setFont("times", "bold italic");
      doc.text(`${item.child_first_name} ${item.child_last_name}`, centerX, 125, { align: "center" });
      doc.setFontSize(16);
      doc.setFont("times", "normal");
      doc.text(`was baptized into the Holy Catholic Church on`, centerX, 140, { align: "center" });
      doc.setFont("times", "bold");
      doc.text(new Date(item.preferred_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }), centerX, 150, { align: "center" });
    } else {
      doc.text("This is to certify that", centerX, 110, { align: "center" });
      doc.setFontSize(24);
      doc.setFont("times", "bold italic");
      doc.text(`${item.groom_name} & ${item.bride_name}`, centerX, 125, { align: "center" });
      doc.setFontSize(16);
      doc.setFont("times", "normal");
      doc.text(`were united in the Sacrament of Holy Matrimony on`, centerX, 140, { align: "center" });
      doc.setFont("times", "bold");
      doc.text(new Date(item.wedding_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }), centerX, 150, { align: "center" });
    }

    // 5. Footer
    doc.setFontSize(12);
    doc.setFont("times", "italic");
    doc.text("Given this day under the seal of the Parish.", centerX, 180, { align: "center" });

    doc.setDrawColor(150, 150, 150);
    doc.line(40, 240, 100, 240); 
    doc.line(150, 240, 210, 240); 

    doc.setFont("times", "normal");
    doc.setFontSize(10);
    doc.text("Parish Secretary", 70, 245, { align: "center" });
    doc.text("Officiating Priest", 180, 245, { align: "center" });

    const fileName = `${item.request_type}_${item.display_name.replace(/\s+/g, '_')}.pdf`;
    doc.save(fileName);
  };

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

      {!activeQR && (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-28 sm:pt-32 pb-12">
          <div className="mb-8 border-b border-gray-200 pb-6">
            <h1 className="text-3xl md:text-4xl font-serif text-[#B59E74] uppercase tracking-widest font-medium">
              Staff Portal
            </h1>
            <p className="text-gray-500 font-serif italic mt-2 text-sm sm:text-base">
              Prepare for upcoming events, generate certificates, and manage attendance.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-8">
            <button onClick={() => setActiveTab("events")} className={`px-6 py-3.5 font-bold uppercase tracking-widest text-xs rounded-xl transition-all w-full sm:w-auto ${activeTab === "events" ? "bg-[#B59E74] text-white shadow-md" : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"}`}>📅 Approved Events</button>
            <button onClick={() => setActiveTab("certificates")} className={`px-6 py-3.5 font-bold uppercase tracking-widest text-xs rounded-xl transition-all w-full sm:w-auto ${activeTab === "certificates" ? "bg-[#B59E74] text-white shadow-md" : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"}`}>📜 Certificates</button>
            <button onClick={() => setActiveTab("qr-generator")} className={`px-6 py-3.5 font-bold uppercase tracking-widest text-xs rounded-xl transition-all w-full sm:w-auto ${activeTab === "qr-generator" ? "bg-gray-800 text-white shadow-md" : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"}`}>🔳 Generate QR</button>
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B59E74]"></div></div>
          ) : visibleItems.length === 0 ? (
            <div className="bg-white rounded-3xl border border-gray-200 p-12 text-center"><div className="text-4xl mb-4">📭</div><h3 className="text-xl font-serif text-gray-800">No events found.</h3></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {visibleItems.map((item) => (
                <div key={`${item.request_type}-${item.id}`} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col h-full relative overflow-hidden">
                  <div className={`absolute top-0 left-0 w-1.5 h-full ${item.request_type === "Wedding" ? "bg-rose-400" : item.request_type === "Baptism" ? "bg-blue-400" : "bg-[#B59E74]"}`}></div>
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md bg-gray-100 text-gray-600">{item.request_type}</span>
                  </div>
                  <h3 className="text-xl font-serif text-gray-800 font-medium leading-tight mb-2 pr-4">{item.display_name}</h3>
                  <div className="text-sm text-gray-500 flex flex-col gap-1 mb-6 flex-grow">
                    <div className="flex items-center gap-2"><span>🗓️</span> {new Date(item.display_date).toLocaleDateString()}</div>
                    <div className="flex items-center gap-2"><span>⏰</span> {item.preferred_time || item.wedding_time || "TBD"}</div>
                    {item.location && <div className="flex items-center gap-2"><span>📍</span> {item.location}</div>}
                  </div>
                  <div className="mt-auto border-t border-gray-100 pt-4">
                    {activeTab === "events" && <button onClick={() => setViewingDetails(item)} className="w-full bg-gray-50 text-[#B59E74] hover:bg-[#B59E74] hover:text-white font-bold py-3 rounded-xl uppercase tracking-widest text-xs transition-colors">View Deep Details</button>}
                    {activeTab === "certificates" && (
                      <button onClick={() => generateCertificate(item)} className="w-full bg-white border-2 border-[#B59E74] text-[#B59E74] hover:bg-[#B59E74] hover:text-white font-bold py-3 rounded-xl uppercase tracking-widest text-xs transition-colors flex items-center justify-center gap-2">
                        📜 Download Certificate
                      </button>
                    )}
                    {activeTab === "qr-generator" && (
                      <button onClick={() => setActiveQR(item)} className="w-full bg-gray-800 hover:bg-black text-white font-bold py-3 rounded-xl uppercase tracking-widest text-xs transition-colors flex items-center justify-center gap-2">
                        <span>🔳</span> Show QR Code
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      )}

      {activeQR && (
        <div className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center p-6 animate-fade-in">
          <button onClick={() => setActiveQR(null)} className="absolute top-6 right-6 w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors text-xl">✕</button>
          <div className="text-center max-w-md w-full">
            <div className="w-24 h-24 mx-auto rounded-full bg-[#F6F5ED] flex items-center justify-center border-2 border-[#B59E74] text-4xl mb-6 shadow-sm">⛪</div>
            <h2 className="text-3xl font-serif text-gray-800 font-medium uppercase tracking-widest mb-2">{activeQR.display_name}</h2>
            <p className="text-gray-500 italic mb-10">{activeQR.location || "Main Church"}</p>
            <div className="bg-white p-8 rounded-[3rem] shadow-2xl border-4 border-[#B59E74] inline-block mx-auto">
              <QRCodeCanvas value={`${window.location.origin}/#/check-in/${activeQR.id}`} size={280} level="H" includeMargin={true} />
            </div>
            <p className="mt-10 text-sm font-bold text-gray-400 uppercase tracking-[0.2em]">Scan to mark attendance</p>
          </div>
        </div>
      )}

      {viewingDetails && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-[2rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <div className="p-6 md:p-8 border-b-4 border-gray-100 bg-gray-50/50 sticky top-0 z-10 flex justify-between items-start backdrop-blur-md">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest bg-gray-200 text-gray-700 px-3 py-1 rounded-md mb-3 inline-block">{viewingDetails.request_type} Details</span>
                <h2 className="text-2xl md:text-3xl font-serif text-gray-800 font-medium">{viewingDetails.display_name}</h2>
              </div>
              <button onClick={() => setViewingDetails(null)} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-500 shadow-sm border border-gray-200">✕</button>
            </div>
            <div className="p-6 md:p-8 space-y-6">
              {viewingDetails.request_type === "Baptism" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Child's Full Name</label><p className="font-medium text-gray-800">{viewingDetails.child_first_name} {viewingDetails.child_last_name}</p></div>
                  <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Date of Birth</label><p className="font-medium text-gray-800">{viewingDetails.child_dob ? new Date(viewingDetails.child_dob).toLocaleDateString() : "N/A"}</p></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Groom's Name</label><p className="font-medium text-gray-800">{viewingDetails.groom_name || "N/A"}</p></div>
                  <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Bride's Name</label><p className="font-medium text-gray-800">{viewingDetails.bride_name || "N/A"}</p></div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StaffDashboard;