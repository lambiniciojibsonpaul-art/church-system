import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../contexts/useAuth";

function MinistriesPage() {
  const { role, isAdmin } = useAuth();
  const isPriest    = role === "priest";
  const isStaff     = role === "staff";
  const isMinister  = role === "minister";
  const isStaffRole = isAdmin || isPriest || isStaff || isMinister;
  
  const [ministries, setMinistries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewArchived, setViewArchived] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage]         = useState(1);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: "", icon: "⛪", description: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchMinistries();
    setPage(1);
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
    <div className={`min-h-screen w-full flex flex-col font-sans ${isStaffRole ? "bg-gray-50" : "bg-[#F6F5ED]"} relative`}>

      {/* ── STAFF / ADMIN HEADER ─────────────────────────────────────────────── */}
      {isStaffRole ? (
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-28 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-gray-200 pb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-serif text-gray-800 uppercase tracking-wide">
                Ministries
              </h1>
              <p className="text-gray-500 font-serif italic mt-1">
                {isAdmin ? "Manage parish ministries — add, edit, archive, or restore." : "Browse active parish ministries and their members."}
              </p>
            </div>

            {/* Admin controls in header */}
            {isAdmin && (
              <div className="flex gap-3 shrink-0">
                <button
                  onClick={() => setViewArchived(!viewArchived)}
                  className={`px-5 py-2.5 rounded-xl font-bold uppercase tracking-widest text-xs transition-colors border-2 ${
                    viewArchived
                      ? "bg-gray-800 border-gray-800 text-white hover:bg-black"
                      : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300"
                  }`}
                >
                  {viewArchived ? "← Active" : "Archived"}
                </button>
                <button
                  onClick={handleOpenAdd}
                  className="px-5 py-2.5 bg-[#B59E74] text-white border-2 border-[#B59E74] hover:bg-[#9c8760] rounded-xl font-bold uppercase tracking-widest text-xs transition-colors shadow-sm"
                >
                  + Add Ministry
                </button>
              </div>
            )}
          </div>

          {/* Stats strip */}
          <div className="flex items-center gap-3 mt-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              {viewArchived ? "Archived" : "Active"} ministries:
            </span>
            <span className="bg-[#B59E74]/10 text-[#B59E74] text-xs font-bold px-2.5 py-0.5 rounded-full">
              {ministries.length}
            </span>
          </div>
        </div>
      ) : (
        /* ── PUBLIC HERO SECTION ─────────────────────────────────────────────── */
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
      )}

      {/* --- MINISTRIES LIST (staff/admin) or GRID (public) --- */}
      <section className={`max-w-7xl mx-auto px-4 sm:px-6 pb-24 w-full z-10 ${isStaffRole ? "pt-2" : ""}`}>
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B59E74]"></div>
          </div>
        ) : isStaffRole ? (
          /* ── STAFF / ADMIN: searchable single-column list, no icons ── */
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">

            {/* Search bar + show rows */}
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[180px] max-w-sm">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m1.85-5.4a7.25 7.25 0 11-14.5 0 7.25 7.25 0 0114.5 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search ministries..."
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#B59E74] text-sm bg-white"
                />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Show</span>
                <select
                  value={pageSize}
                  onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                  className="text-xs font-bold border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#B59E74] text-gray-600"
                >
                  {[5, 10, 25].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>

            {/* List rows */}
            {(() => {
              const filtered = ministries.filter(m =>
                m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                m.description?.toLowerCase().includes(searchQuery.toLowerCase())
              );
              if (filtered.length === 0) return (
                <div className="py-16 text-center text-gray-400 font-serif italic">
                  {searchQuery ? `No results for "${searchQuery}"` : viewArchived ? "No archived ministries." : "No ministries listed."}
                </div>
              );
              const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
              const safePage   = Math.min(page, totalPages);
              const pageStart  = (safePage - 1) * pageSize;
              const pageData   = filtered.slice(pageStart, pageStart + pageSize);
              return (
                <>
                  <div className="divide-y divide-gray-50">
                    {pageData.map(m => (
                      <div key={m.id} className="flex items-start gap-4 px-6 py-4 hover:bg-gray-50/60 transition-colors group">
                        <div className="flex-1 min-w-0">
                          <p className={`font-serif font-medium text-base leading-tight ${viewArchived ? "text-gray-400" : "text-gray-800"}`}>
                            {m.name}
                          </p>
                          <p className="text-xs text-gray-400 mt-1 leading-relaxed line-clamp-2">
                            {m.description}
                          </p>
                        </div>
                        {isAdmin && (
                          <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!viewArchived && (
                              <button
                                onClick={() => handleOpenEdit(m)}
                                className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg border border-transparent text-[#B59E74] hover:bg-[#B59E74]/10 hover:border-[#B59E74]/30 transition-colors"
                              >
                                ✎ Edit
                              </button>
                            )}
                            <button
                              onClick={() => toggleArchiveStatus(m.id, m.is_archived)}
                              className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg border border-transparent transition-colors ${
                                viewArchived
                                  ? "text-green-600 hover:bg-green-50 hover:border-green-200"
                                  : "text-orange-500 hover:bg-orange-50 hover:border-orange-200"
                              }`}
                            >
                              {viewArchived ? "♻ Restore" : "📦 Archive"}
                            </button>
                            {viewArchived && (
                              <button
                                onClick={() => handleDelete(m.id)}
                                className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg border border-transparent text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors"
                              >
                                🗑 Delete
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {/* Pagination footer */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-gray-50/30">
                      <span className="text-[11px] text-gray-400 font-medium">
                        {pageStart + 1}–{Math.min(pageStart + pageSize, filtered.length)} of {filtered.length}
                      </span>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          disabled={safePage === 1}
                          className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          ← Prev
                        </button>
                        <button
                          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                          disabled={safePage === totalPages}
                          className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          Next →
                        </button>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        ) : (
          /* ── PUBLIC: original card grid with icons ── */
          ministries.length === 0 ? (
            <div className="text-center py-20 text-gray-400 font-serif italic text-lg">
              No ministries are currently listed.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {ministries.map((ministry) => (
                <div
                  key={ministry.id}
                  className="group bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-2 transition-all duration-500 flex flex-col items-center text-center relative"
                >
                  <div className="w-20 h-20 rounded-full bg-[#F6F5ED] flex items-center justify-center text-3xl mb-6 border-2 border-transparent group-hover:scale-110 group-hover:border-[#B59E74] transition-transform duration-500">
                    {ministry.icon}
                  </div>
                  <h3 className="text-xl font-serif font-medium mb-4 uppercase tracking-widest text-gray-800 group-hover:text-[#B59E74] transition-colors">
                    {ministry.name}
                  </h3>
                  <p className="text-gray-500 leading-relaxed text-sm font-sans">{ministry.description}</p>
                  <div className="w-0 group-hover:w-12 h-0.5 bg-[#B59E74] mt-auto pt-6 transition-all duration-500"></div>
                </div>
              ))}
            </div>
          )
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