import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../contexts/useAuth";

const BUCKET = "user-documents";
const PAGE_SIZE = 5;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatBytes(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType) {
  if (!mimeType) return "📄";
  if (mimeType.startsWith("image/")) return "🖼️";
  if (mimeType === "application/pdf") return "📑";
  if (mimeType.includes("word") || mimeType.includes("document")) return "📝";
  if (mimeType.includes("sheet") || mimeType.includes("excel")) return "📊";
  return "📄";
}

const ROLE_FILTERS = [
  { label: "All", value: "all" },
  { label: "Parishioners", value: "parishioner" },
  { label: "Staff", value: "staff" },
  { label: "Admin", value: "admin" },
  { label: "Priests", value: "priest" },
  { label: "Ministry", value: "ministry" },
];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function UserRepository() {
  const { user: staffUser } = useAuth();

  // Users list
  const [users, setUsers] = useState([]);
  const [userRoles, setUserRoles] = useState({}); // { userId: role }
  const [usersLoading, setUsersLoading] = useState(true);

  // Filters + search + pagination
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Expanded user state
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [documents, setDocuments] = useState({});
  const [docsLoading, setDocsLoading] = useState({});

  // Upload state
  const [pendingFile, setPendingFile] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef();

  // Rename state
  const [renamingDoc, setRenamingDoc] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [renaming, setRenaming] = useState(false);

  // ── Fetch users + their roles ─────────────────────────────────────────────
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      // 1. Fetch profiles
      const profilesRes = await supabase
        .from("profiles")
        .select("id, full_name, first_name, email, updated_at")
        .order("updated_at", { ascending: false });

      if (profilesRes.error) throw profilesRes.error;
      setUsers(profilesRes.data || []);

      // 2. Fetch roles — try with ministry column first, fall back without it
      let rolesData = [];
      const rolesWithMinistry = await supabase
        .from("user_roles")
        .select("user_id, role, ministry");

      if (rolesWithMinistry.error) {
        // ministry column might not exist yet — retry without it
        console.warn("UserRepository: ministry column missing, retrying without it:", rolesWithMinistry.error.message);
        const rolesBasic = await supabase
          .from("user_roles")
          .select("user_id, role");
        if (rolesBasic.error) {
          console.error("UserRepository: could not read user_roles:", rolesBasic.error.message);
        } else {
          rolesData = rolesBasic.data || [];
        }
      } else {
        rolesData = rolesWithMinistry.data || [];
      }

      // 3. Build role map: userId → { role, ministry }
      const roleMap = {};
      rolesData.forEach((r) => {
        roleMap[r.user_id] = {
          role: (r.role || "parishioner").toLowerCase(),
          ministry: r.ministry || null,
        };
      });
      setUserRoles(roleMap);

    } catch (err) {
      console.error("UserRepository: failed to fetch users:", err);
    }
    setUsersLoading(false);
  };

  // ── Fetch docs for a user ─────────────────────────────────────────────────
  const fetchDocs = useCallback(async (userId) => {
    setDocsLoading((prev) => ({ ...prev, [userId]: true }));
    const { data, error } = await supabase
      .from("user_documents")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setDocuments((prev) => ({ ...prev, [userId]: error ? [] : data || [] }));
    setDocsLoading((prev) => ({ ...prev, [userId]: false }));
  }, []);

  // ── Toggle expand ─────────────────────────────────────────────────────────
  const handleToggleExpand = async (userId) => {
    if (expandedUserId === userId) {
      setExpandedUserId(null);
      setPendingFile(null);
      setDisplayName("");
      return;
    }
    setExpandedUserId(userId);
    setPendingFile(null);
    setDisplayName("");
    if (!documents[userId]) await fetchDocs(userId);
  };

  // ── File picked ───────────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    if (!displayName.trim()) setDisplayName(file.name.replace(/\.[^.]+$/, ""));
  };

  // ── Upload ────────────────────────────────────────────────────────────────
  const handleUpload = async (userId) => {
    if (!pendingFile) return alert("Please select a file first.");
    if (!displayName.trim()) return alert("Please enter a name for this document.");
    setUploading(true);

    const ext = pendingFile.name.split(".").pop();
    const storagePath = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: storageErr } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, pendingFile, { upsert: false });

    if (storageErr) { setUploading(false); return alert("Upload failed: " + storageErr.message); }

    const { error: dbErr } = await supabase.from("user_documents").insert({
      user_id: userId,
      uploaded_by: staffUser.id,
      display_name: displayName.trim(),
      storage_path: storagePath,
      mime_type: pendingFile.type || null,
      size_bytes: pendingFile.size || null,
    });

    if (dbErr) {
      await supabase.storage.from(BUCKET).remove([storagePath]);
      setUploading(false);
      return alert("Failed to save document record: " + dbErr.message);
    }

    setPendingFile(null);
    setDisplayName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    await fetchDocs(userId);
    setUploading(false);
  };

  // ── View ──────────────────────────────────────────────────────────────────
  const handleView = async (doc) => {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(doc.storage_path, 120);
    if (error) return alert("Could not open file: " + error.message);
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (doc, userId) => {
    if (!window.confirm(`Delete "${doc.display_name}"? This cannot be undone.`)) return;
    await supabase.storage.from(BUCKET).remove([doc.storage_path]);
    await supabase.from("user_documents").delete().eq("id", doc.id);
    await fetchDocs(userId);
  };

  // ── Rename ────────────────────────────────────────────────────────────────
  const handleRenameSubmit = async (doc, userId) => {
    if (!renameValue.trim()) return;
    setRenaming(true);
    const { error } = await supabase
      .from("user_documents")
      .update({ display_name: renameValue.trim(), updated_at: new Date().toISOString() })
      .eq("id", doc.id);
    if (!error) await fetchDocs(userId);
    setRenamingDoc(null);
    setRenameValue("");
    setRenaming(false);
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const getUserName = (u) => {
    if (u.full_name?.trim()) return u.full_name.trim();
    if (u.first_name?.trim()) return u.first_name.trim();
    return u.email || "Unknown User";
  };

  const getRoleInfo = (userId) => userRoles[userId] || { role: "parishioner", ministry: null };

  const getRoleBadgeStyle = (role) => {
    switch ((role || "").toLowerCase()) {
      case "admin":      return "bg-red-100 text-red-600 border-red-200";
      case "staff":      return "bg-blue-100 text-blue-600 border-blue-200";
      case "superadmin": return "bg-purple-100 text-purple-600 border-purple-200";
      default:           return "bg-gray-100 text-gray-500 border-gray-200";
    }
  };

  // Filter pipeline
  const filteredUsers = users.filter((u) => {
    const name  = getUserName(u).toLowerCase();
    const email = (u.email || "").toLowerCase();
    const q     = search.toLowerCase();
    const matchesSearch = name.includes(q) || email.includes(q);

    if (!matchesSearch) return false;
    if (roleFilter === "all") return true;

    const { role, ministry } = getRoleInfo(u.id);
    if (roleFilter === "ministry") return !!ministry;
    return (role || "parishioner").toLowerCase() === roleFilter;
  });

  // Pagination
  const totalPages   = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const safePage     = Math.min(currentPage, totalPages);
  const pagedUsers   = filteredUsers.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Reset to page 1 when filter/search changes
  const handleSearch = (val) => { setSearch(val); setCurrentPage(1); };
  const handleFilter = (val) => { setRoleFilter(val); setCurrentPage(1); };

  // Pagination window (show up to 5 page buttons)
  const pageWindow = () => {
    const delta = 2;
    const start = Math.max(1, safePage - delta);
    const end   = Math.min(totalPages, safePage + delta);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="animate-fade-in-up">

      {/* ── Controls row ── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6 items-start sm:items-center justify-between">

        {/* Search */}
        <div className="relative w-full sm:max-w-xs">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-sm">🔍</span>
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-[#B59E74] focus:border-[#B59E74] outline-none text-sm bg-white"
          />
        </div>

        {/* Role filter pills */}
        <div className="flex flex-wrap gap-2">
          {ROLE_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => handleFilter(f.value)}
              className={`px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest border transition-all ${
                roleFilter === f.value
                  ? "bg-[#B59E74] text-white border-[#B59E74] shadow-sm"
                  : "bg-white text-gray-500 border-gray-200 hover:border-[#B59E74] hover:text-[#B59E74]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <p className="text-xs text-gray-400 mb-3 font-medium">
        Showing <span className="text-gray-600 font-bold">{pagedUsers.length}</span> of{" "}
        <span className="text-gray-600 font-bold">{filteredUsers.length}</span> users
        {roleFilter !== "all" && (
          <span className="ml-1 text-[#B59E74] font-bold">
            · {ROLE_FILTERS.find((f) => f.value === roleFilter)?.label}
          </span>
        )}
      </p>

      {/* ── Table shell ── */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">

        {/* Header */}
        <div className="grid grid-cols-[1fr_auto] px-6 py-3 border-b border-gray-100 bg-gray-50/60">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">User Profile</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Actions</span>
        </div>

        {/* Body */}
        {usersLoading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#B59E74]" />
          </div>
        ) : pagedUsers.length === 0 ? (
          <div className="text-center py-12 text-gray-400 italic font-serif">
            {search || roleFilter !== "all"
              ? "No users match your search or filter."
              : "No users found."}
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {pagedUsers.map((u) => {
              const isExpanded  = expandedUserId === u.id;
              const userDocs    = documents[u.id] || [];
              const isDocsLoading = docsLoading[u.id];
              const { role, ministry } = getRoleInfo(u.id);

              return (
                <li key={u.id}>

                  {/* ── User row ── */}
                  <div className={`grid grid-cols-[1fr_auto] items-center px-6 py-4 transition-colors ${
                    isExpanded ? "bg-[#F6F5ED]" : "hover:bg-gray-50/60"
                  }`}>

                    {/* Profile */}
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="font-semibold text-gray-800 text-sm leading-tight truncate">
                        {getUserName(u)}
                      </span>
                      <span className="text-xs text-gray-400 truncate">{u.email || "—"}</span>

                      {/* Badges row */}
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                          Joined:{" "}
                          {u.updated_at ? new Date(u.updated_at).toLocaleDateString() : "—"}
                        </span>

                        {/* Role badge */}
                        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${getRoleBadgeStyle(role)}`}>
                          {role || "parishioner"}
                        </span>

                        {/* Ministry badge */}
                        {ministry && (
                          <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-purple-100 text-purple-600 border border-purple-200">
                            {ministry}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action button */}
                    <button
                      onClick={() => handleToggleExpand(u.id)}
                      className={`flex flex-col items-center justify-center gap-0.5 ml-4 transition-all ${
                        isExpanded ? "text-[#B59E74]" : "text-gray-400 hover:text-[#B59E74]"
                      }`}
                    >
                      <span className="text-base">{isExpanded ? "✕" : "↗"}</span>
                      <span className="text-[9px] font-bold uppercase tracking-widest">
                        {isExpanded ? "Close" : "Edit"}
                      </span>
                    </button>
                  </div>

                  {/* ── Expanded panel ── */}
                  {isExpanded && (
                    <div className="bg-[#F6F5ED] border-t border-[#B59E74]/20 px-6 pt-4 pb-6">
                      <div className="max-w-2xl mx-auto space-y-4">

                        {/* Document list */}
                        <div className="bg-white rounded-2xl border border-gray-200 p-4 min-h-[80px]">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">
                            Archived Documents
                            {!isDocsLoading && (
                              <span className="ml-2 text-[#B59E74]">({userDocs.length})</span>
                            )}
                          </p>

                          {isDocsLoading ? (
                            <div className="flex justify-center py-4">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#B59E74]" />
                            </div>
                          ) : userDocs.length === 0 ? (
                            <p className="text-xs text-gray-400 italic py-2">No documents uploaded yet.</p>
                          ) : (
                            <ul className="space-y-2">
                              {userDocs.map((doc) => (
                                <li key={doc.id} className="flex items-center justify-between gap-3 group">
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <span className="text-base shrink-0">{getFileIcon(doc.mime_type)}</span>
                                    {renamingDoc?.id === doc.id ? (
                                      <div className="flex items-center gap-2 flex-1">
                                        <input
                                          autoFocus
                                          value={renameValue}
                                          onChange={(e) => setRenameValue(e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter") handleRenameSubmit(doc, u.id);
                                            if (e.key === "Escape") { setRenamingDoc(null); setRenameValue(""); }
                                          }}
                                          className="flex-1 text-sm border-b-2 border-[#B59E74] outline-none bg-transparent py-0.5"
                                          placeholder="New name…"
                                        />
                                        <button onClick={() => handleRenameSubmit(doc, u.id)} disabled={renaming}
                                          className="text-[10px] font-bold uppercase tracking-wide text-green-600 hover:text-green-700 disabled:opacity-50">
                                          {renaming ? "…" : "Save"}
                                        </button>
                                        <button onClick={() => { setRenamingDoc(null); setRenameValue(""); }}
                                          className="text-[10px] font-bold uppercase tracking-wide text-gray-400 hover:text-gray-600">
                                          Cancel
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="min-w-0">
                                        <button onClick={() => handleView(doc)}
                                          className="text-sm font-medium text-[#B59E74] underline underline-offset-2 hover:text-[#9c8760] transition-colors truncate block max-w-[280px] text-left"
                                          title={doc.display_name}>
                                          {doc.display_name}
                                        </button>
                                        {doc.size_bytes && (
                                          <span className="text-[10px] text-gray-400">{formatBytes(doc.size_bytes)}</span>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {renamingDoc?.id !== doc.id && (
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                      <button onClick={() => handleView(doc)}
                                        className="px-2 py-1 text-[10px] font-bold uppercase tracking-wide rounded-lg bg-gray-50 hover:bg-[#B59E74] text-gray-500 hover:text-white transition-colors">
                                        ↗ View
                                      </button>
                                      <button onClick={() => { setRenamingDoc(doc); setRenameValue(doc.display_name); }}
                                        className="px-2 py-1 text-[10px] font-bold uppercase tracking-wide rounded-lg bg-gray-50 hover:bg-blue-500 text-gray-500 hover:text-white transition-colors">
                                        ✏ Rename
                                      </button>
                                      <button onClick={() => handleDelete(doc, u.id)}
                                        className="px-2 py-1 text-[10px] font-bold uppercase tracking-wide rounded-lg bg-red-50 hover:bg-red-500 text-red-500 hover:text-white transition-colors">
                                        ✕
                                      </button>
                                    </div>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        {/* Upload section */}
                        <div className="border-2 border-dashed border-[#B59E74]/40 rounded-2xl bg-white p-6 flex flex-col items-center gap-4 text-center">
                          <div className="text-[#B59E74] text-3xl">☁</div>
                          <p className="text-xs font-bold uppercase tracking-widest text-gray-600">
                            Submit Your Documents
                          </p>

                          <input ref={fileInputRef} type="file" className="hidden"
                            onChange={handleFileChange} accept="*/*" />

                          {pendingFile && (
                            <div className="w-full bg-[#F6F5ED] rounded-xl px-4 py-3 flex items-center justify-between gap-2 text-left">
                              <div className="flex items-center gap-2 min-w-0">
                                <span>{getFileIcon(pendingFile.type)}</span>
                                <div className="min-w-0">
                                  <p className="text-xs font-medium text-gray-700 truncate">{pendingFile.name}</p>
                                  <p className="text-[10px] text-gray-400">{formatBytes(pendingFile.size)}</p>
                                </div>
                              </div>
                              <button onClick={() => { setPendingFile(null); setDisplayName(""); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                                className="text-gray-400 hover:text-red-500 transition-colors text-sm shrink-0">✕</button>
                            </div>
                          )}

                          {pendingFile && (
                            <div className="w-full">
                              <input type="text" placeholder="Name of File" value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") handleUpload(u.id); }}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#B59E74] focus:border-[#B59E74] outline-none text-sm bg-white" />
                            </div>
                          )}

                          <div className="flex gap-2 w-full justify-center">
                            <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                              className="flex items-center gap-2 px-5 py-3 bg-[#B59E74] hover:bg-[#9c8760] text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-colors disabled:opacity-50">
                              <span>📁</span>
                              {pendingFile ? "Change File" : "Open Upload Folder"}
                            </button>

                            {pendingFile && (
                              <button onClick={() => handleUpload(u.id)} disabled={uploading || !displayName.trim()}
                                className="flex items-center gap-2 px-5 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-200">
                                {uploading ? (
                                  <><span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" /> Uploading…</>
                                ) : <>☁ Upload</>}
                              </button>
                            )}
                          </div>
                        </div>

                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          {/* Prev */}
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold uppercase tracking-widest text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            ← Prev
          </button>

          {/* Page number buttons */}
          <div className="flex items-center gap-1.5">
            {/* First page shortcut */}
            {pageWindow()[0] > 1 && (
              <>
                <button onClick={() => setCurrentPage(1)}
                  className="w-9 h-9 rounded-xl border border-gray-200 text-xs font-bold text-gray-500 hover:bg-gray-50 transition-all">
                  1
                </button>
                {pageWindow()[0] > 2 && (
                  <span className="text-gray-400 text-xs px-1">…</span>
                )}
              </>
            )}

            {pageWindow().map((p) => (
              <button
                key={p}
                onClick={() => setCurrentPage(p)}
                className={`w-9 h-9 rounded-xl text-xs font-bold transition-all border ${
                  p === safePage
                    ? "bg-[#B59E74] text-white border-[#B59E74] shadow-sm"
                    : "border-gray-200 text-gray-600 hover:border-[#B59E74] hover:text-[#B59E74]"
                }`}
              >
                {p}
              </button>
            ))}

            {/* Last page shortcut */}
            {pageWindow()[pageWindow().length - 1] < totalPages && (
              <>
                {pageWindow()[pageWindow().length - 1] < totalPages - 1 && (
                  <span className="text-gray-400 text-xs px-1">…</span>
                )}
                <button onClick={() => setCurrentPage(totalPages)}
                  className="w-9 h-9 rounded-xl border border-gray-200 text-xs font-bold text-gray-500 hover:bg-gray-50 transition-all">
                  {totalPages}
                </button>
              </>
            )}
          </div>

          {/* Next */}
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold uppercase tracking-widest text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}