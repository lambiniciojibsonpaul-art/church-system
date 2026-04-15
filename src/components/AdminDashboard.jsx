import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Header from "./Header";

const church1 = new URL("../assets/Images/church1.jpg", import.meta.url).href;
const church2 = new URL("../assets/Images/church2.jpg", import.meta.url).href;
const church3 = new URL("../assets/Images/church3.jpg", import.meta.url).href;

function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [baptisms, setBaptisms] = useState([]);
  const [selectedBaptism, setSelectedBaptism] = useState(null);

  // NEW: State to track which tab the admin is currently viewing
  const [activeTab, setActiveTab] = useState("Baptisms");

  const navigate = useNavigate();

  // The list of tabs we want to show
  const tabs = [
    "Baptisms",
    "Holy Communion",
    "Confirmation",
    "Weddings",
    "Mass Intentions",
    "Certifications",
  ];

  useEffect(() => {
    const checkUserAndFetchData = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        navigate("/login");
        return;
      }

      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .single();

      if (roleError || !roleData || roleData.role !== "admin") {
        alert("You do not have administrator privileges.");
        await supabase.auth.signOut();
        navigate("/");
        return;
      }

      setUser(session.user);

      // Fetch Baptisms (We will add the fetch code for the others later!)
      const { data: baptismData } = await supabase
        .from("baptisms")
        .select("*")
        .order("created_at", { ascending: false });

      if (baptismData) setBaptisms(baptismData);

      setLoading(false);
    };

    checkUserAndFetchData();
  }, [navigate]);

  const pendingBaptismsCount = baptisms.filter(
    (b) => b.status === "Pending",
  ).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B59E74]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Header forceSolidBg={true} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 pt-32 pb-12">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-serif text-[#B59E74] mb-2 uppercase tracking-wide">
            Parish Dashboard
          </h1>
          <p className="text-gray-500 font-serif italic">
            Welcome back. You are logged in as{" "}
            <span className="font-semibold not-italic">{user?.email}</span>
          </p>
        </div>

        {/* Stats Overview Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-2 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#B59E74]"></div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
              Pending Baptisms
            </h3>
            <p className="text-4xl text-gray-800 font-serif">
              {pendingBaptismsCount}
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-2 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#B59E74]"></div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
              Pending Weddings
            </h3>
            <p className="text-4xl text-gray-800 font-serif">0</p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-2 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#B59E74]"></div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
              Mass Intentions
            </h3>
            <p className="text-4xl text-gray-800 font-serif">0</p>
          </div>
        </div>

        {/* --- NEW TABBED INTERFACE --- */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden min-h-[500px]">
          {/* Tab Navigation Bar */}
          <div className="flex overflow-x-auto border-b border-gray-100 bg-gray-50/50 scrollbar-hidden">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`whitespace-nowrap px-8 py-4 text-sm font-bold uppercase tracking-widest transition-colors ${
                  activeTab === tab
                    ? "text-[#B59E74] border-b-2 border-[#B59E74] bg-white"
                    : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                }`}
              >
                {tab}
                {/* Add a tiny notification dot if there are pending baptisms and this is the baptism tab */}
                {tab === "Baptisms" && pendingBaptismsCount > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-[10px] text-white bg-red-500 rounded-full">
                    {pendingBaptismsCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content Area */}
          <div className="p-8">
            {/* 1. BAPTISMS TAB CONTENT */}
            {activeTab === "Baptisms" && (
              <>
                {baptisms.length === 0 ? (
                  <div className="text-center text-gray-400 mt-16">
                    <div className="text-4xl mb-4">📭</div>
                    <h3 className="text-lg font-serif">
                      No active baptism requests.
                    </h3>
                  </div>
                ) : (
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
                        {baptisms.map((bap) => (
                          <tr
                            key={bap.id}
                            className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                          >
                            <td className="p-4 font-serif text-gray-800 font-medium">
                              {bap.child_first_name} {bap.child_last_name}
                            </td>
                            <td className="p-4 text-sm text-gray-600">
                              {bap.baptism_type}
                            </td>
                            <td className="p-4 text-sm text-gray-600">
                              {new Date(
                                bap.preferred_date,
                              ).toLocaleDateString()}
                            </td>
                            <td className="p-4 text-sm text-gray-500 italic">
                              {bap.submitter_name}
                            </td>
                            <td className="p-4">
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                  bap.status === "Pending"
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-green-100 text-green-700"
                                }`}
                              >
                                {bap.status}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <button
                                onClick={() => setSelectedBaptism(bap)}
                                className="text-[#B59E74] hover:text-[#9c8760] text-sm font-bold uppercase tracking-widest transition-colors px-4 py-2 rounded hover:bg-[#B59E74]/10"
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* 2. ALL OTHER TABS CONTENT (Placeholders for now) */}
            {activeTab !== "Baptisms" && (
              <div className="text-center text-gray-400 mt-16 animate-fade-in">
                <div className="text-4xl mb-4">⏳</div>
                <h3 className="text-lg font-serif text-gray-600">
                  No {activeTab.toLowerCase()} requests yet.
                </h3>
                <p className="text-sm mt-2 max-w-md mx-auto">
                  This database table hasn't been connected yet. Once users
                  submit these forms, they will appear in this tab.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Baptism Details Modal (Unchanged) */}
      {selectedBaptism && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl relative scrollbar-hidden">
            <div className="sticky top-0 bg-white px-8 py-6 z-10 flex justify-between items-center border-b border-gray-100">
              <div>
                <h2 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest">
                  Baptism Request Details
                </h2>
                <h1 className="text-2xl font-serif text-gray-800 mt-1">
                  {selectedBaptism.child_first_name}{" "}
                  {selectedBaptism.child_middle_name}{" "}
                  {selectedBaptism.child_last_name}
                </h1>
              </div>
              <button
                onClick={() => setSelectedBaptism(null)}
                className="w-10 h-10 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-gray-50 rounded-2xl border border-gray-100">
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                    Current Status
                  </p>
                  <span
                    className={`inline-block mt-1 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                      selectedBaptism.status === "Pending"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {selectedBaptism.status}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                    Requested Schedule
                  </p>
                  <p className="text-lg font-serif text-gray-800 mt-1">
                    {selectedBaptism.baptism_type} —{" "}
                    {new Date(
                      selectedBaptism.preferred_date,
                    ).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest border-b border-gray-100 pb-2 mb-4">
                  Child's Information
                </h3>
                <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                  <div>
                    <p className="text-gray-500">Date of Birth</p>
                    <p className="font-medium text-gray-800">
                      {new Date(selectedBaptism.child_dob).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Gender</p>
                    <p className="font-medium text-gray-800">
                      {selectedBaptism.child_gender}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-500">Place of Birth</p>
                    <p className="font-medium text-gray-800">
                      {selectedBaptism.child_birthplace}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest border-b border-gray-100 pb-2 mb-4">
                  Parents' Information
                </h3>
                <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                  <div className="col-span-2">
                    <p className="text-gray-500">Father's Name</p>
                    <p className="font-medium text-gray-800">
                      {selectedBaptism.father_name}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-500">Mother's Maiden Name</p>
                    <p className="font-medium text-gray-800">
                      {selectedBaptism.mother_maiden_name}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-500">Address</p>
                    <p className="font-medium text-gray-800">
                      {selectedBaptism.address}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Contact Numbers</p>
                    <p className="font-medium text-gray-800">
                      {selectedBaptism.contact_numbers}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Marriage Status</p>
                    <p className="font-medium text-gray-800">
                      {selectedBaptism.parents_marriage_status}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest border-b border-gray-100 pb-2 mb-4">
                  Sponsors (Godparents)
                </h3>
                <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                  <div>
                    <p className="text-gray-500">Primary Godfather</p>
                    <p className="font-medium text-gray-800">
                      {selectedBaptism.godfather_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Primary Godmother</p>
                    <p className="font-medium text-gray-800">
                      {selectedBaptism.godmother_name}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-500">Additional Sponsors</p>
                    <p className="font-medium text-gray-800 whitespace-pre-wrap">
                      {selectedBaptism.additional_sponsors || "None listed"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-100 text-xs text-gray-400 flex justify-between">
                <p>Submitted by: {selectedBaptism.submitter_name}</p>
                <p>
                  Date Submitted:{" "}
                  {new Date(selectedBaptism.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
