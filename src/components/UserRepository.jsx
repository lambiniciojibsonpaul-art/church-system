import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../contexts/useAuth";

const BUCKET = "user-documents";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_RE = /^[A-Za-zÀ-ÖØ-öø-ÿÑñ' .-]+$/;
const CONTACT_RE = /^\d{11}$/;
const NAME_MAX = 60;
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const ALLOWED_UPLOAD_MIME_TYPES = new Set(["image/jpeg", "image/png", "application/pdf"]);
const ALLOWED_UPLOAD_EXTENSIONS = new Set(["jpg", "jpeg", "png", "pdf"]);

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

// ─── Create User Modal ────────────────────────────────────────────────────────
function validateUploadFile(file) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  const hasAllowedExt = ALLOWED_UPLOAD_EXTENSIONS.has(ext);
  const hasAllowedType = ALLOWED_UPLOAD_MIME_TYPES.has(file.type);

  if ((!file.type && !hasAllowedExt) || (file.type && !hasAllowedType) || !hasAllowedExt) {
    return "Only JPEG, PNG, or PDF files can be uploaded.";
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return "File must not exceed 50MB.";
  }
  return null;
}

function CreateUserModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", contact_number: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const firstName = form.first_name.trim();
    const lastName = form.last_name.trim();
    const email = form.email.trim().toLowerCase();
    const contact = form.contact_number.trim();

    if (!firstName || !lastName) {
      setError("First name and last name are required.");
      return;
    }
    if (!NAME_RE.test(firstName) || !NAME_RE.test(lastName)) {
      setError("Names must contain letters only.");
      return;
    }
    if (firstName.length > NAME_MAX || lastName.length > NAME_MAX) {
      setError(`First name and last name must be ${NAME_MAX} characters or less.`);
      return;
    }
    if (email && !EMAIL_RE.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (contact && !CONTACT_RE.test(contact)) {
      setError("Contact number must be exactly 11 digits.");
      return;
    }

    setLoading(true);
    try {
      const newId = crypto.randomUUID();
      const { error: insertErr } = await supabase.from("profiles").upsert({
        id: newId,
        first_name: firstName || null,
        last_name: lastName || null,
        email: email || null,
        contact_number: contact || null,
        is_manual_entry: true,
      }, { onConflict: "id", ignoreDuplicates: false });

      if (insertErr) throw insertErr;

      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
        <div className="bg-[#F6F5ED] px-8 py-6 border-b border-[#B59E74]/20 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-serif text-gray-800 font-medium uppercase tracking-widest">
              Add to Repository
            </h2>
            <p className="text-xs text-gray-500 italic mt-1">
              Create a document folder for this person.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors text-lg"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 border border-red-100 rounded-xl text-xs font-bold text-center">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">First Name</label>
                <input
                type="text"
                maxLength={NAME_MAX}
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value.replace(/[^a-zA-ZÀ-ÖØ-öø-ÿÑñ' .-]/g, "") })}
                className="p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#B59E74] focus:border-[#B59E74] text-sm bg-white placeholder-gray-300"
                placeholder="Juan"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Last Name</label>
                <input
                type="text"
                maxLength={NAME_MAX}
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value.replace(/[^a-zA-ZÀ-ÖØ-öø-ÿÑñ' .-]/g, "") })}
                className="p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#B59E74] focus:border-[#B59E74] text-sm bg-white placeholder-gray-300"
                placeholder="Dela Cruz"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              Email Address <span className="text-gray-400 normal-case font-normal">(optional)</span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#B59E74] focus:border-[#B59E74] text-sm bg-white placeholder-gray-300"
              placeholder="name@email.com"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              Contact Number <span className="text-gray-400 normal-case font-normal">(optional)</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={form.contact_number}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, "");
                setForm({ ...form, contact_number: val });
              }}
              className="p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#B59E74] focus:border-[#B59E74] text-sm bg-white placeholder-gray-300"
              placeholder="09XX XXX XXXX"
              maxLength={11}
            />
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2.5">
            <span className="text-amber-500 text-sm shrink-0 mt-0.5">ℹ</span>
            <p className="text-[11px] text-amber-700 leading-relaxed">
              This creates a <strong>document folder only</strong> — not a system account.
              This person will not be able to log in.
            </p>
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-500 font-bold text-xs uppercase tracking-widest hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-xl bg-[#B59E74] hover:bg-[#9c8760] text-white font-bold text-xs uppercase tracking-widest transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                  Creating…
                </span>
              ) : (
                "Create Folder"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Edit User Modal ──────────────────────────────────────────────────────────
function EditUserModal({ user, getUserName, onClose, onSuccess }) {
  const [form, setForm] = useState({
    first_name: user.first_name || "",
    last_name: user.last_name || "",
    email: user.email || "",
    contact_number: user.contact_number || "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const hasChanges =
    form.first_name.trim() !== (user.first_name || "") ||
    form.last_name.trim() !== (user.last_name || "") ||
    form.email.trim() !== (user.email || "") ||
    form.contact_number.trim() !== (user.contact_number || "");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const firstName = form.first_name.trim();
    const lastName = form.last_name.trim();
    const email = form.email.trim().toLowerCase();
    const contact = form.contact_number.trim();

    if (!firstName || !lastName) {
      setError("First name and last name are required.");
      return;
    }
    if (!NAME_RE.test(firstName) || !NAME_RE.test(lastName)) {
      setError("Names must contain letters only.");
      return;
    }
    if (firstName.length > NAME_MAX || lastName.length > NAME_MAX) {
      setError(`First name and last name must be ${NAME_MAX} characters or less.`);
      return;
    }
    if (email && !EMAIL_RE.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (contact && !CONTACT_RE.test(contact)) {
      setError("Contact number must be exactly 11 digits.");
      return;
    }

    setLoading(true);
    try {
      const { error: updateErr } = await supabase
        .from("profiles")
        .update({
          first_name: firstName || null,
          last_name: lastName || null,
          email: email || null,
          contact_number: contact || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (updateErr) throw updateErr;

      setSuccess(true);
      onSuccess();
      setTimeout(() => onClose(), 900);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-[#F6F5ED] px-8 py-6 border-b border-[#B59E74]/20 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-serif text-gray-800 font-medium uppercase tracking-widest">
              Edit Details
            </h2>
            <p className="text-xs text-gray-500 italic mt-1">
              Updating record for <span className="font-semibold text-gray-700">{getUserName(user)}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors text-lg"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-5">

          {/* Success banner */}
          {success && (
            <div className="p-3 bg-green-50 text-green-700 border border-green-100 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-2">
              <span>✓</span> Details updated successfully!
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div className="p-3 bg-red-50 text-red-600 border border-red-100 rounded-xl text-xs font-bold text-center">
              {error}
            </div>
          )}

          {/* Name row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                First Name
              </label>
              <input
                type="text"
                maxLength={NAME_MAX}
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value.replace(/[^a-zA-ZÀ-ÖØ-öø-ÿÑñ' .-]/g, "") })}
                className="p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#B59E74] focus:border-[#B59E74] text-sm bg-white placeholder-gray-300"
                placeholder="Juan"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                Last Name
              </label>
              <input
                type="text"
                maxLength={NAME_MAX}
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value.replace(/[^a-zA-ZÀ-ÖØ-öø-ÿÑñ' .-]/g, "") })}
                className="p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#B59E74] focus:border-[#B59E74] text-sm bg-white placeholder-gray-300"
                placeholder="Dela Cruz"
              />
            </div>
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              Email Address
              <span className="text-gray-400 normal-case font-normal ml-1">(optional)</span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#B59E74] focus:border-[#B59E74] text-sm bg-white placeholder-gray-300"
              placeholder="name@email.com"
            />
          </div>

          {/* Contact Number */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              Contact Number
              <span className="text-gray-400 normal-case font-normal ml-1">(optional)</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={form.contact_number}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, "");
                setForm({ ...form, contact_number: val });
              }}
              className="p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#B59E74] focus:border-[#B59E74] text-sm bg-white placeholder-gray-300"
              placeholder="09XX XXX XXXX"
              maxLength={11}
            />
          </div>

          {/* Note for non-manual entries */}
          {!user.is_manual_entry && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-start gap-2.5">
              <span className="text-blue-400 text-sm shrink-0 mt-0.5">ℹ</span>
              <p className="text-[11px] text-blue-700 leading-relaxed">
                This is a <strong>registered account</strong>. Only contact details can be overridden here —
                the user may update their own name and email through their profile.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-500 font-bold text-xs uppercase tracking-widest hover:bg-gray-50 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !hasChanges || success}
              className="flex-1 py-3 rounded-xl bg-[#B59E74] hover:bg-[#9c8760] text-white font-bold text-xs uppercase tracking-widest transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                  Saving…
                </span>
              ) : success ? (
                "✓ Saved"
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function UserRepository() {
  const { user: staffUser } = useAuth();

  // Users list
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);

  // Search
  const [search, setSearch] = useState("");

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

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // ── Fetch users ───────────────────────────────────────────────────────────
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, first_name, last_name, email, contact_number, updated_at, is_manual_entry");

      if (error) throw error;

      const sorted = (data || []).sort((a, b) => {
        const nameA = getUserName(a).toLowerCase();
        const nameB = getUserName(b).toLowerCase();
        return nameA.localeCompare(nameB);
      });

      setUsers(sorted);
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
    const fileError = validateUploadFile(file);
    if (fileError) {
      alert(fileError);
      e.target.value = "";
      setPendingFile(null);
      return;
    }
    setPendingFile(file);
    if (!displayName.trim()) setDisplayName(file.name.replace(/\.[^.]+$/, ""));
  };

  // ── Upload ────────────────────────────────────────────────────────────────
  const handleUpload = async (userId) => {
    if (!pendingFile) return alert("Please select a file first.");
    if (!displayName.trim()) return alert("Please enter a name for this document.");
    const fileError = validateUploadFile(pendingFile);
    if (fileError) return alert(fileError);
    setUploading(true);

    const ext = pendingFile.name.split(".").pop()?.toLowerCase();
    const storagePath = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: storageErr } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, pendingFile, { upsert: false });

    if (storageErr) {
      setUploading(false);
      return alert("Upload failed: " + storageErr.message);
    }

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

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getUserName = (u) => {
    const full = [u.first_name, u.last_name].filter(Boolean).join(" ").trim();
    if (full) return full;
    if (u.full_name?.trim()) return u.full_name.trim();
    return u.email || "Unknown";
  };

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      getUserName(u).toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q)
    );
  });

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="animate-fade-in-up">

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-sm">🔍</span>
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-[#B59E74] focus:border-[#B59E74] outline-none text-sm bg-white"
          />
        </div>

        <p className="text-xs text-gray-400 font-medium shrink-0">
          <span className="text-gray-700 font-bold">{filteredUsers.length}</span>{" "}
          {filteredUsers.length === 1 ? "user" : "users"}
        </p>

        <button
          onClick={() => setShowCreateModal(true)}
          className="shrink-0 flex items-center gap-2 px-4 py-3 bg-[#B59E74] hover:bg-[#9c8760] text-white rounded-2xl text-xs font-bold uppercase tracking-widest transition-colors shadow-sm"
        >
          <span className="text-base leading-none">＋</span>
          <span className="hidden sm:inline">Add Person</span>
        </button>
      </div>

      {/* ── User list ── */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">

        {/* Header */}
        <div className="grid grid-cols-[1fr_auto] px-6 py-3 border-b border-gray-100 bg-gray-50/60">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">User</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Actions</span>
        </div>

        {/* Body */}
        {usersLoading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#B59E74]" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12 text-gray-400 italic font-serif">
            {search ? "No users match your search." : "No users found."}
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {filteredUsers.map((u) => {
              const isExpanded    = expandedUserId === u.id;
              const userDocs      = documents[u.id] || [];
              const isDocsLoading = docsLoading[u.id];

              const initials = getUserName(u)
                .split(" ")
                .map((w) => w[0])
                .slice(0, 2)
                .join("")
                .toUpperCase();

              return (
                <li key={u.id}>

                  {/* ── User row ── */}
                  <div className={`flex items-center gap-4 px-6 py-4 transition-colors ${
                    isExpanded ? "bg-[#F6F5ED]" : "hover:bg-gray-50/60"
                  }`}>

                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-[#B59E74]/15 border border-[#B59E74]/30 flex items-center justify-center shrink-0">
                      <span className="text-[11px] font-bold text-[#B59E74]">{initials}</span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-800 text-sm leading-tight">
                          {getUserName(u)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        <span className="text-xs text-gray-400 truncate">
                          {u.email || "—"}
                        </span>
                        {u.contact_number && (
                          <span className="text-xs text-gray-400">
                            📞 {u.contact_number}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Edit button */}
                      <button
                        onClick={() => setEditingUser(u)}
                        className="flex flex-col items-center justify-center gap-0.5 text-gray-400 hover:text-blue-500 transition-colors"
                        title="Edit user details"
                      >
                        <span className="text-base">✏️</span>
                        <span className="text-[9px] font-bold uppercase tracking-widest">Edit</span>
                      </button>

                      {/* Expand / documents button */}
                      <button
                        onClick={() => handleToggleExpand(u.id)}
                        className={`flex flex-col items-center justify-center gap-0.5 transition-all ${
                          isExpanded ? "text-[#B59E74]" : "text-gray-400 hover:text-[#B59E74]"
                        }`}
                        title={isExpanded ? "Close" : "Manage documents"}
                      >
                        <span className="text-base">{isExpanded ? "✕" : "↗"}</span>
                        <span className="text-[9px] font-bold uppercase tracking-widest">
                          {isExpanded ? "Close" : "Docs"}
                        </span>
                      </button>
                    </div>
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
                            onChange={handleFileChange} accept="image/jpeg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf" />

                          <p className="text-[11px] text-gray-500 font-serif italic -mt-2">
                            JPEG, PNG, or PDF only. Maximum file size is 50MB.
                          </p>

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

      {/* ── Create User Modal ── */}
      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={fetchUsers}
        />
      )}

      {/* ── Edit User Modal ── */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          getUserName={getUserName}
          onClose={() => setEditingUser(null)}
          onSuccess={fetchUsers}
        />
      )}
    </div>
  );
}
