import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { restSelect } from "../supabaseRest";
import { supabase } from "../supabaseClient";
import { useAuth } from "../contexts/useAuth";

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORY_STYLES = {
  General:  { pill: "bg-blue-50 text-blue-700 border border-blue-100",    dot: "bg-blue-400"   },
  Urgent:   { pill: "bg-red-50 text-red-700 border border-red-100",       dot: "bg-red-500"    },
  Event:    { pill: "bg-green-50 text-green-700 border border-green-100", dot: "bg-green-500"  },
  Reminder: { pill: "bg-amber-50 text-amber-700 border border-amber-100", dot: "bg-amber-400"  },
  Holiday:  { pill: "bg-pink-50 text-pink-700 border border-pink-100",    dot: "bg-pink-400"   },
};

function formatDate(d) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("en-PH", {
      month: "long", day: "numeric", year: "numeric",
    });
  } catch { return ""; }
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return "Just now";
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  if (days < 7)   return `${days} days ago`;
  return formatDate(dateStr);
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AnnouncementsInbox() {
  const { user, role } = useAuth();
  const navigate = useNavigate();

  const [announcements, setAnnouncements] = useState([]);
  const [reads,         setReads]         = useState({}); // { [ann_id]: { is_dismissed } }
  const [loading,       setLoading]       = useState(true);
  const [selectedId,    setSelectedId]    = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showDetail,    setShowDetail]    = useState(false); // mobile

  // ── Auth gate ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) navigate("/login", { replace: true });
  }, [user, navigate]);

  // ── Fetch published announcements targeted to this user's role ─────────────
  const fetchAnnouncements = useCallback(async () => {
    if (!user?.id || !role) return;
    setLoading(true);
    try {
      const { data, error } = await restSelect("announcements", {
        select: "id, title, body, category, is_pinned, created_at, updated_at, target_roles",
        rawFilter: { status: "eq.Published" },
        order: "is_pinned.desc,created_at.desc",
      });
      if (error) {
        console.warn("[AnnouncementsInbox] fetch error:", error.message);
        setAnnouncements([]);
      } else {
        // ✨ FIX: Standardize the user's role to handle the mismatch
        const currentRole = String(role).toLowerCase();
        
        const filtered = (data || []).filter((ann) => {
          if (!ann.target_roles || ann.target_roles.length === 0) return true;
          
          // ✨ FIX: Smart checking that treats "minister" and "ministry" as the exact same role
          const targetRoles = ann.target_roles.map(r => String(r).toLowerCase());
          return targetRoles.includes(currentRole) || 
                 (currentRole === "minister" && targetRoles.includes("ministry")) || 
                 (currentRole === "ministry" && targetRoles.includes("minister"));
        });
        
        filtered.sort((a, b) => {
          if (a.is_pinned && !b.is_pinned) return -1;
          if (!a.is_pinned && b.is_pinned) return 1;
          return new Date(b.created_at) - new Date(a.created_at);
        });
        setAnnouncements(filtered);
      }
    } catch (e) {
      console.warn("[AnnouncementsInbox] exception:", e.message);
      setAnnouncements([]);
    }
    setLoading(false);
  }, [user?.id, role]);

  // ── Fetch read records ─────────────────────────────────────────────────────
  const fetchReads = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data } = await supabase
        .from("announcement_reads")
        .select("announcement_id, is_dismissed")
        .eq("user_id", user.id);
      const map = {};
      (data || []).forEach((r) => { map[r.announcement_id] = { is_dismissed: r.is_dismissed }; });
      setReads(map);
    } catch (e) {
      console.warn("[AnnouncementsInbox] reads fetch exception:", e.message);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id && role) {
      fetchAnnouncements();
      fetchReads();
    }
  }, [user?.id, role, fetchAnnouncements, fetchReads]);

  // Auto-select first visible item
  useEffect(() => {
    if (!loading && announcements.length > 0 && !selectedId) {
      const first = getVisible(announcements, reads)[0];
      if (first) setSelectedId(first.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, announcements]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  function getVisible(anns, readsMap) {
    return anns.filter((ann) => !readsMap[ann.id]?.is_dismissed);
  }

  function isUnread(annId) {
    return !reads[annId];
  }

  // ── Mark as read ───────────────────────────────────────────────────────────
  const markAsRead = async (annId) => {
    if (!user?.id || !isUnread(annId)) return;
    setActionLoading(true);
    try {
      await supabase.from("announcement_reads").upsert(
        { announcement_id: annId, user_id: user.id, is_dismissed: false, read_at: new Date().toISOString() },
        { onConflict: "announcement_id,user_id" }
      );
      setReads((prev) => ({ ...prev, [annId]: { is_dismissed: false } }));
      window.dispatchEvent(new CustomEvent("announcement-reads-changed"));
    } catch (e) {
      console.warn("[AnnouncementsInbox] markAsRead exception:", e.message);
    }
    setActionLoading(false);
  };

  // ── Remove (dismiss) ───────────────────────────────────────────────────────
  const removeAnnouncement = async (annId) => {
    if (!user?.id) return;
    setActionLoading(true);
    try {
      await supabase.from("announcement_reads").upsert(
        { announcement_id: annId, user_id: user.id, is_dismissed: true, read_at: new Date().toISOString() },
        { onConflict: "announcement_id,user_id" }
      );
      const nextReads = { ...reads, [annId]: { is_dismissed: true } };
      setReads(nextReads);
      window.dispatchEvent(new CustomEvent("announcement-reads-changed"));
      const remaining = getVisible(announcements, nextReads);
      setSelectedId(remaining.length > 0 ? remaining[0].id : null);
      setShowDetail(false);
    } catch (e) {
      console.warn("[AnnouncementsInbox] remove exception:", e.message);
    }
    setActionLoading(false);
  };

  // ── Select announcement ────────────────────────────────────────────────────
  const handleSelect = (annId) => {
    setSelectedId(annId);
    setShowDetail(true);
  };

  // ── Computed ───────────────────────────────────────────────────────────────
  const visible  = getVisible(announcements, reads);
  const selected = visible.find((a) => a.id === selectedId) || null;
  const catStyle = selected ? (CATEGORY_STYLES[selected.category] || CATEGORY_STYLES.General) : null;
  const unreadCount = visible.filter((a) => isUnread(a.id)).length;

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F5ED]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B59E74]" />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F6F5ED] flex flex-col font-sans">
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-24 md:pt-28 pb-12">

        {/* Page Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-[#B59E74]/20 pb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-serif text-[#B59E74] uppercase tracking-wide">
              Announcements
            </h1>
            <p className="text-gray-500 text-sm font-serif italic mt-0.5">
              Parish news, updates, and notices for you.
            </p>
          </div>
          {unreadCount > 0 && (
            <span className="inline-flex items-center gap-1.5 bg-red-500 text-white text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full self-start sm:self-auto">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              {unreadCount} Unread
            </span>
          )}
        </div>

        {/* Layout: Sidebar + Detail */}
        <div className="flex gap-4 min-h-[600px]">

          {/* ── LEFT SIDEBAR ── */}
          <div className={`
            w-full md:w-80 flex-shrink-0 bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col overflow-hidden
            ${showDetail ? "hidden md:flex" : "flex"}
          `}>

            {/* Sidebar header */}
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/60 shrink-0">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
                All Announcements
                {visible.length > 0 && (
                  <span className="ml-2 text-gray-300 font-normal normal-case tracking-normal">{visible.length}</span>
                )}
              </p>
            </div>

            {/* Announcement list */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
              {visible.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                  <div className="text-5xl mb-4">📭</div>
                  <p className="text-sm text-gray-400 italic">No announcements yet.</p>
                </div>
              ) : (
                visible.map((ann) => {
                  const unread = isUnread(ann.id);
                  const cs = CATEGORY_STYLES[ann.category] || CATEGORY_STYLES.General;
                  return (
                    <button
                      key={ann.id}
                      type="button"
                      onClick={() => handleSelect(ann.id)}
                      className={`w-full text-left px-4 py-3.5 transition-all flex gap-3 items-start
                        ${selectedId === ann.id
                          ? "bg-[#B59E74]/10 border-l-[3px] border-l-[#B59E74]"
                          : "hover:bg-gray-50 border-l-[3px] border-l-transparent"
                        }`}
                    >
                      {/* Unread / category dot */}
                      <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${unread ? "bg-red-500" : cs.dot + " opacity-40"}`} />

                      <div className="min-w-0 flex-1">
                        <p className={`text-sm leading-snug line-clamp-2 ${unread ? "font-semibold text-gray-900" : "font-medium text-gray-500"}`}>
                          {ann.is_pinned && <span className="mr-1 text-[#B59E74]">📌</span>}
                          {ann.title || "Untitled"}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${cs.pill}`}>
                            {ann.category}
                          </span>
                          <span className="text-[10px] text-gray-400">{timeAgo(ann.created_at)}</span>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* ── RIGHT DETAIL PANEL ── */}
          <div className={`
            flex-1 bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col overflow-hidden min-w-0
            ${showDetail ? "flex" : "hidden md:flex"}
          `}>
            {selected ? (
              <>
                {/* Detail header */}
                <div className="px-6 md:px-8 py-5 border-b border-gray-100 bg-gray-50/40 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowDetail(false)}
                    className="md:hidden mb-3 flex items-center gap-1.5 text-[#B59E74] text-xs font-bold uppercase tracking-widest hover:text-[#9c8760] transition-colors"
                  >
                    ← Back
                  </button>

                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        {selected.is_pinned && (
                          <span className="text-[9px] font-bold uppercase tracking-widest bg-[#B59E74]/10 text-[#B59E74] border border-[#B59E74]/20 px-2 py-0.5 rounded-full">
                            📌 Pinned
                          </span>
                        )}
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${catStyle.pill}`}>
                          {selected.category}
                        </span>
                        {isUnread(selected.id) && (
                          <span className="text-[9px] font-bold uppercase tracking-widest bg-red-50 text-red-500 border border-red-100 px-2 py-0.5 rounded-full">
                            New
                          </span>
                        )}
                      </div>
                      <h2 className="text-xl md:text-2xl font-serif text-gray-900 leading-snug">
                        {selected.title}
                      </h2>
                      <p className="text-xs text-gray-400 mt-1.5 uppercase tracking-widest">
                        {formatDate(selected.created_at)}
                        {selected.updated_at && selected.updated_at !== selected.created_at && (
                          <span className="ml-2 italic normal-case tracking-normal">
                            · Updated {timeAgo(selected.updated_at)}
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                      {isUnread(selected.id) ? (
                        <button
                          type="button"
                          onClick={() => markAsRead(selected.id)}
                          disabled={actionLoading}
                          className="flex items-center gap-1.5 bg-[#B59E74] text-white px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest transition-all hover:bg-[#9c8760] active:scale-95 disabled:opacity-50 shadow-sm"
                        >
                          ✓ Mark as Read
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => removeAnnouncement(selected.id)}
                          disabled={actionLoading}
                          className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-500 px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest transition-all hover:bg-red-50 hover:border-red-200 hover:text-red-500 active:scale-95 disabled:opacity-50"
                        >
                          🗑 Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Detail body */}
                <div className="flex-1 overflow-y-auto px-6 md:px-8 py-6">
                  <div className="font-serif text-[15px] text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {selected.body || <span className="text-gray-400 italic">No content.</span>}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-20 px-8 text-center">
                <div className="text-6xl mb-5">📬</div>
                <h3 className="text-lg font-serif text-gray-700 mb-2">
                  {visible.length === 0 ? "Your inbox is empty" : "Select an announcement"}
                </h3>
                <p className="text-sm text-gray-400 font-serif italic">
                  {visible.length === 0
                    ? "There are no announcements from the parish at this time."
                    : "Choose an announcement from the list to read it."}
                </p>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}