import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../contexts/useAuth";

function MinistriesPage() {
  const { isAdmin } = useAuth();
  
  const [ministries, setMinistries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewArchived, setViewArchived] = useState(false);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: "", icon: "⛪", description: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchMinistries();
  }, [viewArchived]);

  const fetchMinistries = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("ministries")
      .select("*")
      .eq("is_archived", viewArchived)
      .order("name", { ascending: true });

    if (!error && data) {
      setMinistries(data);
    }
    setLoading(false);
  };

  // --- HANDLERS ---
  const handleOpenAdd = () => {
    setFormData({ name: "", icon: "⛪", description: "" });
    setEditingId(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (ministry) => {
    setFormData({ name: ministry.name, icon: ministry.icon, description: ministry.description });
    setEditingId(ministry.id);
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    if (editingId) {
      // Update existing
      await supabase.from("ministries").update(formData).eq("id", editingId);
    } else {
      // Add new
      await supabase.from("ministries").insert([formData]);
    }

    setIsModalOpen(false);
    fetchMinistries();
    setSaving(false);
  };

  const toggleArchiveStatus = async (id, currentStatus) => {
    if (!window.confirm(`Are you sure you want to ${currentStatus ? "restore" : "archive"} this ministry?`)) return;
    
    await supabase.from("ministries").update({ is_archived: !currentStatus }).eq("id", id);
    fetchMinistries();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("WARNING: This will permanently delete this ministry from the database. Proceed?")) return;
    
    await supabase.from("ministries").delete().eq("id", id);
    fetchMinistries();
  };

  return (
    <div className="min-h-screen w-full flex flex-col font-sans bg-[#F6F5ED] relative">
      
      {/* --- HERO SECTION --- */}
      <section className="relative pt-32 pb-12 px-6 text-center overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none">
          <div className="absolute top-10 left-10 w-64 h-64 bg-[#B59E74]/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-64 h-64 bg-[#B59E74]/10 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="w-16 h-1 bg-[#B59E74] mx-auto mb-6"></div>
          <h1 className="text-4xl md:text-5xl font-serif text-[#B59E74] font-medium uppercase tracking-[0.2em] mb-6">
            Our Ministries
          </h1>
          <p className="text-gray-600 font-serif italic text-lg leading-relaxed">
            "For as in one body we have many members, and the members do not all have the same function, so we, though many, are one body in Christ."
          </p>
        </div>
      </section>

      {/* --- ADMIN TOOLBAR --- */}
      {isAdmin && (
        <section className="max-w-7xl mx-auto px-6 w-full mb-8 z-10">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-[#B59E74]/20 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="bg-[#B59E74]/10 text-[#B59E74] p-2 rounded-full">⚙️</span>
              <h3 className="font-bold uppercase tracking-widest text-gray-800 text-sm">Admin Controls</h3>
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
              <button
                onClick={() => setViewArchived(!viewArchived)}
                className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-bold uppercase tracking-widest text-xs transition-colors border-2 ${
                  viewArchived 
                    ? "bg-gray-800 border-gray-800 text-white hover:bg-black" 
                    : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300"
                }`}
              >
                {viewArchived ? "Back to Active" : "View Archived"}
              </button>
              <button
                onClick={handleOpenAdd}
                className="flex-1 sm:flex-none px-6 py-2.5 bg-[#B59E74] text-white border-2 border-[#B59E74] hover:bg-[#9c8760] hover:border-[#9c8760] rounded-xl font-bold uppercase tracking-widest text-xs transition-colors shadow-sm"
              >
                + Add Ministry
              </button>
            </div>
          </div>
        </section>
      )}

      {/* --- MINISTRIES GRID --- */}
      <section className="max-w-7xl mx-auto px-6 pb-24 w-full z-10">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B59E74]"></div>
          </div>
        ) : ministries.length === 0 ? (
          <div className="text-center py-20 text-gray-400 font-serif italic text-lg">
            {viewArchived ? "No archived ministries found." : "No ministries are currently listed."}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {ministries.map((ministry) => (
              <div 
                key={ministry.id} 
                className={`group bg-white p-8 rounded-[2rem] shadow-sm border transition-all duration-500 flex flex-col items-center text-center relative ${
                  viewArchived ? "border-gray-200 bg-gray-50/50" : "border-gray-100 hover:shadow-xl hover:-translate-y-2"
                }`}
              >
                {/* Admin Quick Actions Overlay */}
                {isAdmin && (
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {!viewArchived && (
                      <button onClick={() => handleOpenEdit(ministry)} className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center shadow-sm" title="Edit">
                        ✏️
                      </button>
                    )}
                    <button onClick={() => toggleArchiveStatus(ministry.id, ministry.is_archived)} className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${viewArchived ? "bg-green-50 text-green-600 hover:bg-green-100" : "bg-orange-50 text-orange-600 hover:bg-orange-100"}`} title={viewArchived ? "Restore" : "Archive"}>
                      {viewArchived ? "♻️" : "📦"}
                    </button>
                    {viewArchived && (
                      <button onClick={() => handleDelete(ministry.id)} className="w-8 h-8 rounded-full bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center shadow-sm" title="Delete Permanently">
                        🗑️
                      </button>
                    )}
                  </div>
                )}

                {/* Icon Wrapper */}
                <div className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl mb-6 transition-transform duration-500 border-2 ${
                  viewArchived ? "bg-gray-100 border-transparent grayscale" : "bg-[#F6F5ED] border-transparent group-hover:scale-110 group-hover:border-[#B59E74]"
                }`}>
                  {ministry.icon}
                </div>

                {/* Content */}
                <h3 className={`text-xl font-serif font-medium mb-4 uppercase tracking-widest transition-colors ${
                  viewArchived ? "text-gray-500" : "text-gray-800 group-hover:text-[#B59E74]"
                }`}>
                  {ministry.name}
                </h3>
                <p className="text-gray-500 leading-relaxed text-sm font-sans">
                  {ministry.description}
                </p>

                {/* Bottom Accent Line */}
                {!viewArchived && (
                  <div className="w-0 group-hover:w-12 h-0.5 bg-[#B59E74] mt-auto pt-6 transition-all duration-500"></div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* --- ADD / EDIT MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl relative overflow-hidden">
            <div className="px-8 py-6 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-serif text-[#B59E74] uppercase tracking-widest font-medium">
                {editingId ? "Edit Ministry" : "Add New Ministry"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            
            <form onSubmit={handleSave} className="p-8 space-y-5">
              <div className="flex gap-4">
                <div className="w-24">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-2">Emoji Icon</label>
                  <input type="text" required value={formData.icon} onChange={(e) => setFormData({...formData, icon: e.target.value})} className="w-full p-3 rounded-xl border border-gray-300 text-center text-2xl outline-none focus:ring-2 focus:ring-[#B59E74]" />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-2">Ministry Name</label>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="e.g., Youth Ministry" className="w-full p-3 rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-[#B59E74]" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-2">Description</label>
                <textarea required value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows="4" placeholder="Describe the ministry's purpose..." className="w-full p-3 rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-[#B59E74] resize-none"></textarea>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-3 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-xl font-bold uppercase tracking-widest text-xs transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-1 px-6 py-3 bg-[#B59E74] text-white hover:bg-[#9c8760] rounded-xl font-bold uppercase tracking-widest text-xs transition-colors shadow-md disabled:opacity-50">
                  {saving ? "Saving..." : "Save Ministry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default MinistriesPage;