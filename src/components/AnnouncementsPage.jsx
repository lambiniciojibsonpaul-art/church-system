import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { restSelect, restInsert, restUpdate, restDelete } from "../supabaseRest";
import { useAuth } from "../contexts/useAuth";
import { supabase } from "../supabaseClient";

// ─── Constants ────────────────────────────────────────────────────────────────
// Status values match the SQL exactly (capitalized)
const CATEGORIES   = ["General", "Urgent", "Event", "Reminder", "Holiday"];
const STATUS_ORDER = ["Published", "Draft", "Archived"];

const CATEGORY_STYLES = {
  General:  "bg-blue-50 text-blue-700",
  Urgent:   "bg-red-50 text-red-700",
  Event:    "bg-green-50 text-green-700",
  Reminder: "bg-amber-50 text-amber-700",
  Holiday:  "bg-pink-50 text-pink-700",
};

function statusIcon(ann) {
  if (ann.status === "Draft")    return "📝";
  if (ann.status === "Archived") return "📦";
  if (ann.is_pinned)             return "📌";
  return "📣";
}

function formatDate(d) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("en-PH", {
      month: "short", day: "numeric", year: "numeric",
    });
  } catch { return ""; }
}

// ─── Empty form — matches SQL columns exactly ─────────────────────────────────
function emptyForm() {
  return {
    title:               "",
    body:                "",
    category:            "General",
    is_pinned:           false,
    notify_parishioners: false, // client-only toggle, not persisted
    status:              "Draft",
  };
}

// ─── Main Component ───────────────────────────────────────────────────────────
function AnnouncementsPage() {
  const { user }  = useAuth();
  const navigate  = useNavigate();

  const [announcements,     setAnnouncements]     = useState([]);
  const [loading,           setLoading]           = useState(true);
  const [saving,            setSaving]            = useState(false);
  const [error,             setError]             = useState(null);
  const [selectedId,        setSelectedId]        = useState(null);
  const [form,              setForm]              = useState(emptyForm());
  const [isDirty,           setIsDirty]           = useState(false);
  const [deletingAnn,       setDeletingAnn]       = useState(null);
  const [deleteSubmitting,  setDeleteSubmitting]  = useState(false);
  const [toast,             setToast]             = useState(null);

  // ── Fetch all announcements ────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error: fetchErr } = await restSelect("announcements", {
        order: "created_at.desc",
      });
      if (cancelled) return;
      if (fetchErr) {
        setError("Failed to load announcements.");
        console.warn("[AnnouncementsPage] fetch error:", fetchErr.message);
      } else {
        setAnnouncements(Array.isArray(data) ? data : []);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Toast helper ───────────────────────────────────────────────────────────
  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  }, []);

  // ── Select announcement to edit ────────────────────────────────────────────
  const selectAnnouncement = useCallback((ann) => {
    setSelectedId(ann.id);
    setForm({
      title:               ann.title               || "",
      body:                ann.body                || "",
      category:            ann.category            || "General",
      is_pinned:           ann.is_pinned           || false,
      notify_parishioners: false,  // always reset on open — never re-notify
      status:              ann.status              || "Draft",
    });
    setIsDirty(false);
  }, []);

  // ── New announcement ───────────────────────────────────────────────────────
  const handleNew = useCallback(() => {
    setSelectedId(null);
    setForm(emptyForm());
    setIsDirty(false);
  }, []);

  // ── Field change ───────────────────────────────────────────────────────────
  const handleChange = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  }, []);

  // ── Save Draft ─────────────────────────────────────────────────────────────
  const handleSaveDraft = async () => {
    if (!form.title.trim()) { showToast("Title is required.", "error"); return; }
    setSaving(true);

    // Only columns that exist in the SQL schema
    const payload = {
      title:      form.title.trim(),
      body:       form.body.trim(),
      category:   form.category,
      is_pinned:  form.is_pinned,
      status:     "Draft",
      updated_at: new Date().toISOString(),
    };

    if (selectedId) {
      const { error: updateErr } = await restUpdate(
        "announcements", { id: selectedId }, payload
      );
      if (updateErr) {
        setSaving(false);
        showToast("Error saving draft: " + updateErr.message, "error");
        return;
      }
      setAnnouncements((prev) =>
        prev.map((a) => a.id === selectedId ? { ...a, ...payload } : a)
      );
      showToast("Draft saved.");
    } else {
      const { data, error: insertErr } = await restInsert("announcements", [{
        ...payload,
        created_by: user?.id,   // SQL column is created_by, not creator_id
      }]);
      if (insertErr) {
        setSaving(false);
        showToast("Error saving draft: " + insertErr.message, "error");
        return;
      }
      const created = Array.isArray(data) ? data[0] : null;
      if (created) {
        setAnnouncements((prev) => [created, ...prev]);
        setSelectedId(created.id);
        setForm((prev) => ({ ...prev, status: "Draft" }));
      }
      showToast("Draft saved.");
    }

    setIsDirty(false);
    setSaving(false);
  };

  // ── Publish ────────────────────────────────────────────────────────────────
  const handlePublish = async () => {
    if (!form.title.trim()) { showToast("Title is required.", "error"); return; }
    if (!form.body.trim())  { showToast("Body / message is required.", "error"); return; }
    setSaving(true);

    // Only columns that exist in the SQL schema
    const payload = {
      title:      form.title.trim(),
      body:       form.body.trim(),
      category:   form.category,
      is_pinned:  form.is_pinned,
      status:     "Published",
      updated_at: new Date().toISOString(),
    };

    let savedId = selectedId;

    if (selectedId) {
      const { error: updateErr } = await restUpdate(
        "announcements", { id: selectedId }, payload
      );
      if (updateErr) {
        setSaving(false);
        showToast("Error publishing: " + updateErr.message, "error");
        return;
      }
      setAnnouncements((prev) =>
        prev.map((a) => a.id === selectedId ? { ...a, ...payload } : a)
      );
    } else {
      const { data, error: insertErr } = await restInsert("announcements", [{
        ...payload,
        created_by: user?.id,   // SQL column is created_by
      }]);
      if (insertErr) {
        setSaving(false);
        showToast("Error publishing: " + insertErr.message, "error");
        return;
      }
      const created = Array.isArray(data) ? data[0] : null;
      if (created) {
        savedId = created.id;
        setAnnouncements((prev) => [created, ...prev]);
        setSelectedId(created.id);
      }
    }

    // Fire notify_all_parishioners RPC if toggle is on
    if (form.notify_parishioners) {
      try {
        const { error: rpcErr } = await supabase.rpc("notify_all_parishioners", {
          notif_title:    form.title.trim(),
          notif_message:  form.body.trim().slice(0, 200),
          notif_link:     "/announcements",
          p_source_id:    savedId,
          p_source_table: "announcements",
        });
        
        // ✨ NEW: Force an alert if the database rejects the notification
        if (rpcErr) {
          alert("⚠️ Notification Failed:\n" + rpcErr.message);
          console.error("RPC Error Details:", rpcErr);
        }
      } catch (e) {
        alert("⚠️ System Exception while notifying:\n" + e.message);
        console.error("[AnnouncementsPage] notify RPC exception:", e);
      }
    }

    // Reset notify toggle after publish — prevent accidental re-notify on next edit
    setForm((prev) => ({ ...prev, notify_parishioners: false, status: "Published" }));
    setIsDirty(false);
    setSaving(false);
    showToast(
      form.notify_parishioners
        ? "Published & parishioners notified! 🔔"
        : "Announcement published."
    );
  };

  // ── Archive ────────────────────────────────────────────────────────────────
  const handleArchive = useCallback(async () => {
    if (!selectedId) return;
    setSaving(true);
    const { error: updateErr } = await restUpdate(
      "announcements", { id: selectedId }, {
        status:     "Archived",
        updated_at: new Date().toISOString(),
      }
    );
    if (updateErr) {
      setSaving(false);
      showToast("Error archiving: " + updateErr.message, "error");
      return;
    }
    setAnnouncements((prev) =>
      prev.map((a) => a.id === selectedId ? { ...a, status: "Archived" } : a)
    );
    setForm((prev) => ({ ...prev, status: "Archived" }));
    setIsDirty(false);
    setSaving(false);
    showToast("Announcement archived.");
  }, [selectedId, showToast]);

  // ── Delete ─────────────────────────────────────────────────────────────────
  const confirmDelete = useCallback(async () => {
    if (!deletingAnn) return;
    setDeleteSubmitting(true);
    const { error: deleteErr } = await restDelete("announcements", { id: deletingAnn.id });
    if (deleteErr) {
      setDeleteSubmitting(false);
      showToast("Error deleting: " + deleteErr.message, "error");
      return;
    }
    setAnnouncements((prev) => prev.filter((a) => a.id !== deletingAnn.id));
    if (selectedId === deletingAnn.id) {
      setSelectedId(null);
      setForm(emptyForm());
    }
    setDeletingAnn(null);
    setDeleteSubmitting(false);
    showToast("Announcement deleted.");
  }, [deletingAnn, selectedId, showToast]);

  // ── Derived: grouped by status ─────────────────────────────────────────────
  const grouped = {
    Published: announcements.filter((a) => a.status === "Published"),
    Draft:     announcements.filter((a) => a.status === "Draft"),
    Archived:  announcements.filter((a) => a.status === "Archived"),
  };

  const selectedAnn = selectedId
    ? announcements.find((a) => a.id === selectedId)
    : null;

  const formStatus = form.status;

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B59E74]" />
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-28 md:pt-32 pb-12">

        {/* ── Page Header ── */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-200 pb-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-serif text-[#B59E74] mb-2 uppercase tracking-wide">
              📣 Announcements
            </h1>
            <p className="text-gray-500 font-serif italic">
              Create and manage announcements visible to parishioners.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate("/admin")}
              className="flex items-center justify-center gap-2 bg-white border-2 border-[#B59E74] text-[#B59E74] px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-sm hover:bg-[#B59E74] hover:text-white active:scale-95"
            >
              ← Dashboard
            </button>
            <button
              onClick={handleNew}
              className="flex items-center justify-center gap-2 bg-[#B59E74] border-2 border-[#B59E74] text-white px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-sm hover:bg-[#9c8760] active:scale-95"
            >
              ＋ New Announcement
            </button>
          </div>
        </div>

        {/* ── Error Banner ── */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-sm text-red-700 font-serif">
            ⚠ {error}
          </div>
        )}

        {/* ── Split Panel ── */}
        <div className="flex gap-5 min-h-[680px]">

          {/* ── LEFT: Announcement List ── */}
          <div className="w-72 flex-shrink-0 bg-white rounded-3xl shadow-sm border border-gray-200 overflow-y-auto flex flex-col">
            {STATUS_ORDER.map((status) => {
              const items = grouped[status];
              return (
                <div key={status}>
                  {/* Section label */}
                  <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                      {status}
                    </span>
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#F6F5ED] text-[#B59E74] text-[10px] font-bold">
                      {items.length}
                    </span>
                  </div>

                  {/* Items */}
                  {items.length === 0 ? (
                    <p className="px-4 py-3 text-xs text-gray-400 italic">
                      No {status.toLowerCase()} announcements.
                    </p>
                  ) : (
                    items.map((ann) => (
                      <button
                        key={ann.id}
                        type="button"
                        onClick={() => selectAnnouncement(ann)}
                        className={`w-full text-left px-4 py-3 border-b border-gray-50 transition-all flex gap-3 items-start
                          ${selectedId === ann.id
                            ? "bg-[#B59E74]/10 border-l-4 border-l-[#B59E74]"
                            : "hover:bg-gray-50 border-l-4 border-l-transparent"
                          }`}
                      >
                        <span className="text-base mt-0.5 flex-shrink-0">{statusIcon(ann)}</span>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-serif leading-snug truncate
                            ${selectedId === ann.id ? "text-[#7a6530] font-semibold" : "text-gray-800"}`}>
                            {ann.title || "Untitled"}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {ann.created_at ? formatDate(ann.created_at) : "—"}
                          </p>
                          {ann.category && (
                            <span className={`inline-block mt-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${CATEGORY_STYLES[ann.category] || "bg-gray-100 text-gray-600"}`}>
                              {ann.category}
                            </span>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              );
            })}
          </div>

          {/* ── RIGHT: Form Panel ── */}
          <div className="flex-1 bg-white rounded-3xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">

            {/* Form header */}
            <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between gap-4 bg-gray-50/50">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  {!selectedId ? "New Announcement" : `Editing — ${selectedAnn?.title || "Untitled"}`}
                </p>
                <h2 className="text-lg font-serif text-[#B59E74] truncate mt-0.5">
                  {!selectedId ? "Create Announcement" : "Edit Announcement"}
                </h2>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {isDirty && (
                  <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                    Unsaved
                  </span>
                )}
                <StatusPill status={formStatus} />
                {selectedId && (
                  <button
                    type="button"
                    onClick={() => setDeletingAnn(selectedAnn)}
                    className="ml-1 text-red-400 hover:text-red-600 text-xs font-bold uppercase tracking-widest px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>

            {/* Form body */}
            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-5">

              {/* Title */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-1.5">
                  Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                  placeholder="e.g. Holy Week Schedule 2026"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] focus:border-[#B59E74] text-sm transition-colors font-serif"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-1.5">
                  Category
                </label>
                <div className="relative w-56">
                  <select
                    value={form.category}
                    onChange={(e) => handleChange("category", e.target.value)}
                    className="appearance-none w-full px-4 pr-10 py-3 rounded-xl border-2 border-gray-200 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] text-sm font-bold text-gray-700 cursor-pointer transition-colors"
                  >
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Body */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-1.5">
                  Body / Message <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={form.body}
                  onChange={(e) => handleChange("body", e.target.value)}
                  placeholder="Write the full announcement here. This will be displayed to all parishioners."
                  rows={8}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] focus:border-[#B59E74] text-sm transition-colors resize-y font-serif leading-relaxed"
                />
              </div>

              {/* Toggles */}
              <div className="bg-[#FAFAF6] border border-gray-100 rounded-2xl divide-y divide-gray-100">

                {/* Pin to top */}
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📌</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Pin to top</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Shows first on the parishioners' announcements page.
                      </p>
                    </div>
                  </div>
                  <Toggle
                    checked={form.is_pinned}
                    onChange={(v) => handleChange("is_pinned", v)}
                  />
                </div>

                {/* Notify parishioners */}
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">🔔</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Notify all parishioners</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Sends a bell alert to every registered parishioner on publish.
                      </p>
                    </div>
                  </div>
                  <Toggle
                    checked={form.notify_parishioners}
                    onChange={(v) => handleChange("notify_parishioners", v)}
                  />
                </div>
              </div>

              {/* Notify warning */}
              {form.notify_parishioners && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700 font-serif flex gap-2">
                  <span className="text-base flex-shrink-0">ℹ️</span>
                  <span>
                    Every registered parishioner will receive a notification bell alert when you
                    click <strong>Publish</strong>. This cannot be undone — make sure the
                    announcement is final.
                  </span>
                </div>
              )}

            </div>

            {/* Form actions footer */}
            <div className="px-8 py-5 border-t border-gray-100 bg-gray-50/50 flex flex-wrap items-center gap-3">

              {/* Save Draft */}
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={saving}
                className="flex items-center gap-2 bg-white border-2 border-[#B59E74] text-[#B59E74] px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all hover:bg-[#B59E74]/10 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                💾 Save Draft
              </button>

              {/* Publish / Update */}
              <button
                type="button"
                onClick={handlePublish}
                disabled={saving}
                className="flex items-center gap-2 bg-[#B59E74] border-2 border-[#B59E74] text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all hover:bg-[#9c8760] active:scale-95 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <span className="inline-block w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    {formStatus === "Published" ? "Updating…" : "Publishing…"}
                  </>
                ) : (
                  formStatus === "Published" ? "✓ Update" : "📤 Publish"
                )}
              </button>

              {/* Archive — visible for Published and Draft */}
              {selectedId && formStatus !== "Archived" && (
                <button
                  type="button"
                  onClick={handleArchive}
                  disabled={saving}
                  className="flex items-center gap-2 bg-white border-2 border-gray-200 text-gray-500 px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all hover:bg-gray-50 hover:border-gray-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
                >
                  📦 Archive
                </button>
              )}

              {/* Republish — visible for Archived */}
              {selectedId && formStatus === "Archived" && (
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={saving}
                  className="flex items-center gap-2 bg-white border-2 border-gray-200 text-gray-500 px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all hover:bg-gray-50 hover:border-gray-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
                >
                  📤 Republish
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* ── DELETE MODAL ──────────────────────────────────────────────────────── */}
      {deletingAnn && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up">
            <div className="bg-red-50 px-8 py-6 border-b border-red-100">
              <h2 className="text-xl font-serif text-red-800 font-medium uppercase tracking-widest">
                Delete Announcement
              </h2>
              <p className="text-sm text-red-600 italic mt-1 truncate">
                {deletingAnn.title || "Untitled"}
              </p>
            </div>
            <div className="p-8 space-y-5">
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-800 space-y-1">
                <p className="font-bold uppercase tracking-wider text-xs">⚠ This cannot be undone</p>
                <p>
                  This will permanently remove the announcement from the database.
                  Parishioners will no longer be able to see it.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeletingAnn(null)}
                  disabled={deleteSubmitting}
                  className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-500 font-bold text-xs uppercase tracking-widest hover:bg-gray-50 transition-all disabled:opacity-50"
                >
                  Keep It
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleteSubmitting}
                  className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold text-xs uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleteSubmitting ? "Deleting…" : "Delete Permanently"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TOAST ─────────────────────────────────────────────────────────────── */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[400] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-xl text-sm font-bold tracking-wide animate-fade-in-up
          ${toast.type === "error" ? "bg-red-600 text-white" : "bg-[#B59E74] text-white"}`}
        >
          <span>{toast.type === "error" ? "⚠" : "✓"}</span>
          {toast.message}
        </div>
      )}
    </div>
  );
}

// ─── Toggle ───────────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#B59E74] focus:ring-offset-2
        ${checked ? "bg-[#B59E74]" : "bg-gray-200"}`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
          ${checked ? "translate-x-5" : "translate-x-0"}`}
      />
    </button>
  );
}

// ─── Status Pill ──────────────────────────────────────────────────────────────
function StatusPill({ status }) {
  const cls =
    status === "Published" ? "bg-green-50 text-green-700 border-green-200" :
    status === "Draft"     ? "bg-amber-50 text-amber-700 border-amber-200" :
    status === "Archived"  ? "bg-gray-100 text-gray-500 border-gray-200"   :
                             "bg-gray-100 text-gray-500 border-gray-200";
  const label =
    status === "Published" ? "● Published" :
    status === "Draft"     ? "◌ Draft"     :
    status === "Archived"  ? "▪ Archived"  : status;
  return (
    <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border ${cls}`}>
      {label}
    </span>
  );
}

export default AnnouncementsPage;