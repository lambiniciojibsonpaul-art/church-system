import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { restSelect, restUpdate } from "../supabaseRest";
import { useAuth } from "../contexts/useAuth";

const BAPTISMS_CACHE_KEY = "adminDashboard:baptisms";
const BAPTISMS_CACHE_TTL_MS = 5 * 60 * 1000;
const QUERY_TIMEOUT_MS = 12000;

function readBaptismsCache() {
  try {
    const raw = sessionStorage.getItem(BAPTISMS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.baptisms)) return null;
    if (Date.now() - parsed.ts > BAPTISMS_CACHE_TTL_MS) return null;
    return parsed.baptisms;
  } catch {
    return null;
  }
}

function writeBaptismsCache(baptisms) {
  try {
    sessionStorage.setItem(
      BAPTISMS_CACHE_KEY,
      JSON.stringify({ baptisms, ts: Date.now() })
    );
  } catch { /* ignore */ }
}

function AdminDashboard() {
  const { user } = useAuth();
  const cachedBaptisms = readBaptismsCache();
  const [loading, setLoading] = useState(!cachedBaptisms);
  const [baptisms, setBaptisms] = useState(cachedBaptisms || []);
  const [selectedBaptism, setSelectedBaptism] = useState(null);

  const [activeTab, setActiveTab] = useState("Baptisms");
  const [activeSubTab, setActiveSubTab] = useState("Pending");

  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectingBaptism, setRejectingBaptism] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const navigate = useNavigate();

  const tabs = [
    "Baptisms",
    "Holy Communion",
    "Confirmation",
    "Weddings",
    "Mass Intentions",
    "Certifications",
  ];

  // RequireAdmin already guarantees we're a signed-in admin by the time this
  // component renders. We only need to fetch the dashboard's data.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await restSelect("baptisms", {
        order: "created_at.desc",
        timeoutMs: QUERY_TIMEOUT_MS,
      });
      if (cancelled) return;
      if (error) {
        console.warn("[AdminDashboard] baptisms fetch failed:", error.message);
      } else if (data) {
        setBaptisms(data);
        writeBaptismsCache(data);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const handleAcceptBaptism = async (id) => {
    if (!window.confirm("Are you sure you want to approve this request?")) return;
    const { error } = await restUpdate("baptisms", { id }, { status: "Approved" });
    if (error) {
      alert("Error approving request: " + error.message);
      return;
    }
    setBaptisms(prev => prev.map(b => b.id === id ? { ...b, status: "Approved" } : b));
  };

  const handleRejectBaptism = async () => {
    if (!rejectionReason.trim()) {
      alert("Please provide a reason for rejection.");
      return;
    }
    const { error } = await restUpdate(
      "baptisms",
      { id: rejectingBaptism.id },
      { status: "Rejected", rejection_remarks: rejectionReason }
    );
    if (error) {
      alert("Error rejecting request: " + error.message);
      return;
    }
    setBaptisms(prev => prev.map(b =>
      b.id === rejectingBaptism.id ? { ...b, status: "Rejected", rejection_remarks: rejectionReason } : b
    ));
    setIsRejectModalOpen(false);
    setRejectionReason("");
    setRejectingBaptism(null);
  };

  const pendingBaptismsCount = baptisms.filter(b => b.status === "Pending").length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B59E74]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 pt-32 pb-12">
        
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-serif text-[#B59E74] mb-2 uppercase tracking-wide">
              Parish Dashboard
            </h1>
            <p className="text-gray-500 font-serif italic">
              Welcome back. You are logged in as{" "}
              <span className="font-semibold not-italic">{user?.email}</span>
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate("/admin/manage-users")} className="flex items-center justify-center gap-2 bg-[#B59E74] hover:bg-[#9c8760] text-white px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-md active:scale-95">
              <span>👤</span> Staff
            </button>
            <button onClick={() => navigate("/admin/reports")} className="flex items-center justify-center gap-2 bg-white border-2 border-[#B59E74] text-[#B59E74] px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-sm hover:bg-[#B59E74] hover:text-white active:scale-95">
              <span>📊</span> Reports
            </button>
            <button onClick={() => navigate("/admin/attendance-list")} className="flex items-center justify-center gap-2 bg-white border-2 border-[#B59E74] text-[#B59E74] px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-sm hover:bg-[#B59E74] hover:text-white active:scale-95">
              <span>👥</span> Attendance
            </button>
            <button onClick={() => navigate("/admin/qr-generator")} className="flex items-center justify-center gap-2 bg-white border-2 border-[#B59E74] text-[#B59E74] px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-sm hover:bg-[#B59E74] hover:text-white active:scale-95">
              <span>🔳</span> QR Codes
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-2 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#B59E74]"></div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Pending Baptisms</h3>
            <p className="text-4xl text-gray-800 font-serif">{pendingBaptismsCount}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-2 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#B59E74]"></div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Pending Weddings</h3>
            <p className="text-4xl text-gray-800 font-serif">0</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-2 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#B59E74]"></div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Mass Intentions</h3>
            <p className="text-4xl text-gray-800 font-serif">0</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden min-h-[500px]">
          <div className="flex overflow-x-auto border-b border-gray-100 bg-gray-50/50 scrollbar-hidden">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`whitespace-nowrap px-8 py-4 text-sm font-bold uppercase tracking-widest transition-colors ${
                  activeTab === tab ? "text-[#B59E74] border-b-2 border-[#B59E74] bg-white" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                }`}
              >
                {tab}
                {tab === "Baptisms" && pendingBaptismsCount > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-[10px] text-white bg-red-500 rounded-full">
                    {pendingBaptismsCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="p-8">
            {activeTab === "Baptisms" && (
              <>
                <div className="flex justify-center gap-3 mb-8 p-2 bg-[#F6F5ED] rounded-full w-fit mx-auto border border-gray-100">
                  {["Pending", "Approved", "Rejected"].map((sub) => (
                    <button
                      key={sub}
                      onClick={() => setActiveSubTab(sub)}
                      className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-tighter transition-all ${
                        activeSubTab === sub ? "bg-[#B59E74] text-white shadow-md" : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {sub} Requests
                    </button>
                  ))}
                </div>

                <div className="overflow-x-auto animate-fade-in">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b-2 border-gray-100 text-xs text-gray-500 uppercase tracking-widest">
                        <th className="p-4 font-bold">Child's Name</th>
                        <th className="p-4 font-bold">Type</th>
                        <th className="p-4 font-bold">Pref. Date</th>
                        <th className="p-4 font-bold">Submitter</th>
                        <th className="p-4 font-bold">Status</th>
                        <th className="p-4 font-bold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {baptisms
                        .filter(b => b.status === activeSubTab)
                        .map((bap) => (
                          <tr key={bap.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                            <td className="p-4 font-serif text-gray-800 font-medium">{bap.child_first_name} {bap.child_last_name}</td>
                            <td className="p-4 text-sm text-gray-600">{bap.baptism_type}</td>
                            <td className="p-4 text-sm text-gray-600">{new Date(bap.preferred_date).toLocaleDateString()}</td>
                            <td className="p-4 text-sm text-gray-500 italic">{bap.submitter_name}</td>
                            <td className="p-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                bap.status === "Pending" ? "bg-yellow-100 text-yellow-700" : 
                                bap.status === "Approved" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                              }`}>
                                {bap.status}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex justify-end gap-2">
                                {bap.status === "Pending" && (
                                  <>
                                    <button onClick={() => handleAcceptBaptism(bap.id)} className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-600 hover:text-white transition-all" title="Accept">
                                      <span className="font-bold">✓</span>
                                    </button>
                                    <button onClick={() => { setRejectingBaptism(bap); setIsRejectModalOpen(true); }} className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all" title="Reject">
                                      <span className="font-bold">✕</span>
                                    </button>
                                  </>
                                )}
                                <button onClick={() => setSelectedBaptism(bap)} className="text-[#B59E74] hover:text-[#9c8760] text-xs font-bold uppercase tracking-widest px-3 py-2 rounded hover:bg-[#B59E74]/10 transition-colors">
                                  View
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  {baptisms.filter(b => b.status === activeSubTab).length === 0 && (
                    <div className="text-center py-20 text-gray-400 italic font-serif">
                      No {activeSubTab.toLowerCase()} requests found.
                    </div>
                  )}
                </div>
              </>
            )}

            {activeTab !== "Baptisms" && (
              <div className="text-center text-gray-400 mt-16 animate-fade-in">
                <div className="text-4xl mb-4">⏳</div>
                <h3 className="text-lg font-serif text-gray-600">No {activeTab.toLowerCase()} requests yet.</h3>
                <p className="text-sm mt-2 max-w-md mx-auto">This database table hasn't been connected yet.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* REJECTION MODAL */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up">
            <div className="bg-red-50 px-8 py-6 border-b border-red-100">
              <h2 className="text-xl font-serif text-red-800 font-medium uppercase tracking-widest">Reject Request</h2>
              <p className="text-sm text-red-600 italic">For {rejectingBaptism?.child_first_name} {rejectingBaptism?.child_last_name}</p>
            </div>
            <div className="p-8 space-y-6">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Reason for Rejection</label>
                <textarea 
                  className="p-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-red-500 outline-none h-32 text-sm resize-none"
                  placeholder="Please specify why this request cannot be approved..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setIsRejectModalOpen(false); setRejectionReason(""); }} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-500 font-bold text-xs uppercase tracking-widest hover:bg-gray-50 transition-all">
                  Cancel
                </button>
                <button onClick={handleRejectBaptism} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold text-xs uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-200">
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Baptism Details Modal */}
      {selectedBaptism && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl relative scrollbar-hidden">
            <div className="sticky top-0 bg-white px-8 py-6 z-10 flex justify-between items-center border-b border-gray-100">
              <div>
                <h2 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest">Baptism Request Details</h2>
                <h1 className="text-2xl font-serif text-gray-800 mt-1">
                  {selectedBaptism.child_first_name} {selectedBaptism.child_middle_name} {selectedBaptism.child_last_name}
                </h1>
              </div>
              <button onClick={() => setSelectedBaptism(null)} className="w-10 h-10 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-600">✕</button>
            </div>
            <div className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-gray-50 rounded-2xl border border-gray-100">
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Current Status</p>
                  <span className={`inline-block mt-1 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                    selectedBaptism.status === "Pending" ? "bg-yellow-100 text-yellow-700" : 
                    selectedBaptism.status === "Approved" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}>
                    {selectedBaptism.status}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Requested Schedule</p>
                  <p className="text-lg font-serif text-gray-800 mt-1">{selectedBaptism.baptism_type} — {new Date(selectedBaptism.preferred_date).toLocaleDateString()}</p>
                </div>
              </div>
              {selectedBaptism.rejection_remarks && (
                <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 italic text-sm rounded-r-xl">
                  <strong>Rejection Note:</strong> {selectedBaptism.rejection_remarks}
                </div>
              )}
              <div>
                <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest border-b border-gray-100 pb-2 mb-4">Child's Information</h3>
                <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                  <div><p className="text-gray-500">Date of Birth</p><p className="font-medium text-gray-800">{new Date(selectedBaptism.child_dob).toLocaleDateString()}</p></div>
                  <div><p className="text-gray-500">Gender</p><p className="font-medium text-gray-800">{selectedBaptism.child_gender}</p></div>
                  <div className="col-span-2"><p className="text-gray-500">Place of Birth</p><p className="font-medium text-gray-800">{selectedBaptism.child_birthplace}</p></div>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest border-b border-gray-100 pb-2 mb-4">Parents' Information</h3>
                <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                  <div className="col-span-2"><p className="text-gray-500">Father's Name</p><p className="font-medium text-gray-800">{selectedBaptism.father_name}</p></div>
                  <div className="col-span-2"><p className="text-gray-500">Mother's Maiden Name</p><p className="font-medium text-gray-800">{selectedBaptism.mother_maiden_name}</p></div>
                  <div className="col-span-2"><p className="text-gray-500">Address</p><p className="font-medium text-gray-800">{selectedBaptism.address}</p></div>
                  <div><p className="text-gray-500">Contact Numbers</p><p className="font-medium text-gray-800">{selectedBaptism.contact_numbers}</p></div>
                  <div><p className="text-gray-500">Marriage Status</p><p className="font-medium text-gray-800">{selectedBaptism.parents_marriage_status}</p></div>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest border-b border-gray-100 pb-2 mb-4">Sponsors (Godparents)</h3>
                <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                  <div><p className="text-gray-500">Primary Godfather</p><p className="font-medium text-gray-800">{selectedBaptism.godfather_name}</p></div>
                  <div><p className="text-gray-500">Primary Godmother</p><p className="font-medium text-gray-800">{selectedBaptism.godmother_name}</p></div>
                  <div className="col-span-2"><p className="text-gray-500">Additional Sponsors</p><p className="font-medium text-gray-800 whitespace-pre-wrap">{selectedBaptism.additional_sponsors || "None listed"}</p></div>
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-gray-100 text-xs text-gray-400 flex justify-between">
                <p>Submitted by: {selectedBaptism.submitter_name}</p>
                <p>Date Submitted: {new Date(selectedBaptism.created_at).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;