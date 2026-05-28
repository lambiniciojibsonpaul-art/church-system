import { useEffect, useState, useRef, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";
import { supabase } from "../supabaseClient";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const SOLID_BG_PREFIXES = [
  "/admin",
  "/priest-dashboard",
  "/staff-dashboard",
  "/profile",
  "/login",
  "/check-in",
  "/update-password",
  "/ministries",
  "/events",
  "/services",
  "/announcements",
];

const ROLE_CONFIG = {
  admin: {
    label: "Administrator",
    dot: "bg-emerald-500",
    solidText: "text-gray-700",
    solidBorder: "border-gray-200",
    solidBg: "bg-white",
    ghostText: "text-white",
    ghostBorder: "border-white/25",
    ghostBg: "bg-white/10 backdrop-blur-md",
  },
  priest: {
    label: "Priest",
    dot: "bg-[#B59E74]",
    solidText: "text-[#7a6a42]",
    solidBorder: "border-[#B59E74]/30",
    solidBg: "bg-[#faf8f4]",
    ghostText: "text-white",
    ghostBorder: "border-white/25",
    ghostBg: "bg-white/10 backdrop-blur-md",
  },
  staff: {
    label: "Staff",
    dot: "bg-sky-400",
    solidText: "text-slate-600",
    solidBorder: "border-slate-200",
    solidBg: "bg-white",
    ghostText: "text-white",
    ghostBorder: "border-white/25",
    ghostBg: "bg-white/10 backdrop-blur-md",
  },
  minister: {
    label: "Minister",
    dot: "bg-purple-400",
    solidText: "text-purple-700",
    solidBorder: "border-purple-200",
    solidBg: "bg-purple-50",
    ghostText: "text-white",
    ghostBorder: "border-white/25",
    ghostBg: "bg-white/10 backdrop-blur-md",
  },
  parishioner: {
    label: "Parishioner",
    dot: "bg-rose-400",
    solidText: "text-rose-700",
    solidBorder: "border-rose-200",
    solidBg: "bg-rose-50",
    ghostText: "text-white",
    ghostBorder: "border-white/25",
    ghostBg: "bg-white/10 backdrop-blur-md",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// ROLE PILL
// ─────────────────────────────────────────────────────────────────────────────
function RolePill({ role, isSolid }) {
  const cfg = ROLE_CONFIG[role];
  if (!cfg) return null;
  const bg     = isSolid ? cfg.solidBg     : cfg.ghostBg;
  const border = isSolid ? cfg.solidBorder : cfg.ghostBorder;
  const text   = isSolid ? cfg.solidText   : cfg.ghostText;
  return (
    <div className={`flex items-center gap-2 px-3.5 py-2 rounded-full border shadow-sm transition-all duration-300 ${bg} ${border}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 animate-pulse ${cfg.dot}`} />
      <span className={`font-sans not-italic text-[10px] font-bold uppercase tracking-[0.12em] ${text}`}>
        {cfg.label}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED NOTIFICATION LOGIC HOOK
// ─────────────────────────────────────────────────────────────────────────────
function useNotifications(userId, role) {
  const [notifications, setNotifications] = useState([]);
  const [dismissedIds, setDismissedIds] = useState([]);
  const navigate = useNavigate();

  const dismissedKey = userId ? `notif-dismissed-${userId}` : null;

  useEffect(() => {
    if (!dismissedKey) {
      setDismissedIds([]);
      return;
    }
    try {
      const raw = localStorage.getItem(dismissedKey);
      const parsed = raw ? JSON.parse(raw) : [];
      setDismissedIds(Array.isArray(parsed) ? parsed : []);
    } catch {
      setDismissedIds([]);
    }
  }, [dismissedKey]);

  const persistDismissed = (ids) => {
    setDismissedIds(ids);
    if (!dismissedKey) return;
    try {
      localStorage.setItem(dismissedKey, JSON.stringify(ids));
    } catch {
      // ignore storage failures
    }
  };

  const isAnnouncementNotif = (n) =>
    n?.source_table === "announcements" || n?.link === "/announcements";

  const isDismissed = (n) => dismissedIds.includes(n.id);

  const sanitizeLinkForRole = (notif) => {
    const link = notif?.link || "";
    const sourceTable = notif?.source_table || "";
    const roleHome = {
      admin: "/admin",
      superadmin: "/admin",
      staff: "/staff-dashboard",
      priest: "/priest-dashboard",
      minister: "/profile",
      parishioner: "/profile",
    };
    const allowedPrefixByRole = {
      admin: ["/admin", "/profile"],
      superadmin: ["/admin", "/profile"],
      staff: ["/staff-dashboard", "/profile"],
      priest: ["/priest-dashboard", "/profile"],
      minister: ["/profile"],
      parishioner: ["/profile"],
    };
    const routeForSource = {
      events: role === "admin" || role === "superadmin" ? "/admin/schedules" : (roleHome[role] || "/profile"),
    };
    if (link === "/announcements" || sourceTable === "announcements") return null;
    const fallback = routeForSource[sourceTable] || roleHome[role] || "/profile";
    if (!link) return fallback;
    const allowed = allowedPrefixByRole[role] || ["/profile"];
    if (allowed.some((prefix) => link.startsWith(prefix))) return link;
    return fallback;
  };

  useEffect(() => {
    if (!userId) return;

    const fetchNotifications = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (data) {
        setNotifications(
          data.filter((n) => !isAnnouncementNotif(n)).filter((n) => !isDismissed(n))
        );
      }
    };

    fetchNotifications();

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => fetchNotifications()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [userId, dismissedIds]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleNotificationClick = async (notif, onClose) => {
    if (!notif.is_read) {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notif.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
    }
    onClose?.();
    const link = sanitizeLinkForRole(notif);
    if (link) {
      navigate(link, {
        state: {
          highlightId: notif.source_id,
          highlightTable: notif.source_table,
        },
      });
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    const { error } = await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
    if (error) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const clearRead = async () => {
    const readIds = notifications.filter((n) => n.is_read).map((n) => n.id);
    if (readIds.length === 0) return;
    const { error } = await supabase.from("notifications").delete().in("id", readIds);
    if (error) {
      persistDismissed(Array.from(new Set([...dismissedIds, ...readIds])));
    } else {
      persistDismissed(dismissedIds.filter((id) => !readIds.includes(id)));
    }
    setNotifications((prev) => prev.filter((n) => !readIds.includes(n.id)));
  };

  return { notifications, unreadCount, handleNotificationClick, markAllAsRead, clearRead };
}

// ─────────────────────────────────────────────────────────────────────────────
// ANNOUNCEMENT UNREAD COUNT HOOK
// ─────────────────────────────────────────────────────────────────────────────
function useAnnouncementUnread(userId, userRole) {
  const [count, setCount] = useState(0);

  const fetchCount = useCallback(async () => {
    if (!userId || !userRole) { setCount(0); return; }
    const effectiveRole = userRole === "minister" ? "ministry" : userRole;
    try {
      const { data: anns } = await supabase
        .from("announcements")
        .select("id, target_roles")
        .eq("status", "Published");
      if (!anns?.length) { setCount(0); return; }
      const targeted = anns
        .filter((a) => !a.target_roles?.length || a.target_roles.includes(effectiveRole))
        .map((a) => a.id);
      if (!targeted.length) { setCount(0); return; }
      const { data: reads } = await supabase
        .from("announcement_reads")
        .select("announcement_id")
        .eq("user_id", userId)
        .in("announcement_id", targeted);
      setCount(targeted.length - (reads?.length || 0));
    } catch {
      setCount(0);
    }
  }, [userId, userRole]);

  useEffect(() => {
    fetchCount();
    const ch = supabase
      .channel(`ann-unread-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "announcement_reads", filter: `user_id=eq.${userId}` },
        fetchCount
      )
      .subscribe();
    const handleReadsChanged = () => fetchCount();
    window.addEventListener("announcement-reads-changed", handleReadsChanged);
    return () => {
      window.removeEventListener("announcement-reads-changed", handleReadsChanged);
      supabase.removeChannel(ch);
    };
  }, [userId, userRole, fetchCount]);

  return count;
}

// ─────────────────────────────────────────────────────────────────────────────
// TIME AGO HELPER
// ─────────────────────────────────────────────────────────────────────────────
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
  return new Date(dateStr).toLocaleDateString();
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION LIST
// ─────────────────────────────────────────────────────────────────────────────
function NotificationList({ notifications, unreadCount, onNotifClick, onMarkAll, onClearRead }) {
  return (
    <>
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-600 uppercase tracking-widest">
            Notifications
          </span>
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center h-4 min-w-[1rem] px-1 rounded-full bg-red-500 text-[9px] font-bold text-white">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button onClick={onMarkAll} className="text-[10px] font-bold uppercase tracking-widest text-[#B59E74] hover:text-[#9c8760] transition-colors">
              Mark all read
            </button>
          )}
          {notifications.some((n) => n.is_read) && (
            <button onClick={onClearRead} className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-red-400 transition-colors">
              Clear read
            </button>
          )}
        </div>
      </div>

      <div className="overflow-y-auto divide-y divide-gray-50 flex-1">
        {notifications.length === 0 ? (
          <div className="p-10 text-center">
            <div className="text-4xl mb-3">🔔</div>
            <p className="text-sm text-gray-400 italic font-serif">You're all caught up!</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <button
              key={notif.id}
              onClick={() => onNotifClick(notif)}
              className={`w-full text-left px-4 py-3.5 hover:bg-gray-50 transition-colors ${
                !notif.is_read ? "bg-[#faf8f2]" : "bg-white"
              }`}
            >
              <div className="flex justify-between items-start gap-2 mb-1">
                <span className={`text-sm font-serif leading-snug ${!notif.is_read ? "font-semibold text-[#B59E74]" : "text-gray-600"}`}>
                  {notif.title}
                </span>
                {!notif.is_read && (
                  <span className="w-2 h-2 rounded-full bg-[#B59E74] shrink-0 mt-1.5" />
                )}
              </div>
              <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{notif.message}</p>
              <span className="text-[10px] text-gray-400 uppercase tracking-wider mt-1.5 block">
                {timeAgo(notif.created_at)}
              </span>
            </button>
          ))
        )}
      </div>

      {notifications.length > 0 && (
        <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 text-center shrink-0">
          <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
            {notifications.length} notification{notifications.length === 1 ? "" : "s"} · {unreadCount} unread
          </span>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DESKTOP NOTIFICATION BELL
// ─────────────────────────────────────────────────────────────────────────────
function NotificationBell({ isSolid, userId }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { role } = useAuth();
  const { notifications, unreadCount, handleNotificationClick, markAllAsRead, clearRead } =
    useNotifications(userId, role);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-full transition-all ${
          isSolid 
            ? "hover:bg-gray-100 text-gray-900" 
            : "hover:bg-white/10 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
        }`}
        aria-label="Notifications"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm ring-2 ring-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[110] animate-fade-in-up flex flex-col max-h-[420px]">
          <NotificationList
            notifications={notifications}
            unreadCount={unreadCount}
            onNotifClick={(notif) => handleNotificationClick(notif, () => setIsOpen(false))}
            onMarkAll={markAllAsRead}
            onClearRead={clearRead}
          />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MOBILE NOTIFICATION DRAWER
// ─────────────────────────────────────────────────────────────────────────────
function MobileNotificationDrawer({ isOpen, onClose, userId }) {
  const { role } = useAuth();
  const { notifications, unreadCount, handleNotificationClick, markAllAsRead, clearRead } =
    useNotifications(userId, role);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9998] flex flex-col">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl flex flex-col" style={{ maxHeight: "85vh" }}>
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>
        <div className="flex items-center justify-between px-5 pb-3 pt-1 shrink-0 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-[#B59E74]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="text-sm font-bold text-gray-700 uppercase tracking-widest">
              Notifications
            </span>
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1.5 rounded-full bg-red-500 text-[10px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors text-sm font-bold">
            ✕
          </button>
        </div>
        <div className="flex flex-col overflow-hidden flex-1 min-h-0">
          <NotificationList
            notifications={notifications}
            unreadCount={unreadCount}
            onNotifClick={(notif) => handleNotificationClick(notif, onClose)}
            onMarkAll={markAllAsRead}
            onClearRead={clearRead}
          />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TINY COMPONENT: just watches unread count for the mobile bell dot
// ─────────────────────────────────────────────────────────────────────────────
function MobileUnreadDot({ userId }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!userId) return;
    const fetchCount = async () => {
      const dismissedKey = `notif-dismissed-${userId}`;
      let dismissedIds = [];
      try {
        const raw = localStorage.getItem(dismissedKey);
        dismissedIds = raw ? JSON.parse(raw) : [];
      } catch {
        dismissedIds = [];
      }

      const { data } = await supabase
        .from("notifications")
        .select("id,is_read,source_table,link")
        .eq("user_id", userId)
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(100);
      const filtered = (data || []).filter(
        (n) =>
          !dismissedIds.includes(n.id) &&
          n.source_table !== "announcements" &&
          n.link !== "/announcements"
      );
      setCount(filtered.length);
    };
    fetchCount();

    const channel = supabase
      .channel(`mobile-dot-${userId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      }, fetchCount)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [userId]);

  if (count === 0) return null;
  return (
    <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm ring-2 ring-white">
      {count > 9 ? "9+" : count}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN HEADER
// ─────────────────────────────────────────────────────────────────────────────
function Header({ forceSolidBg = false }) {
  const [isOpen, setIsOpen]               = useState(false);
  const [scrolled, setScrolled]           = useState(false);
  const [isLoggingOut, setIsLoggingOut]   = useState(false);
  const [mobileNotifsOpen, setMobileNotifsOpen] = useState(false);
  const [mobileCalendarOpen, setMobileCalendarOpen] = useState(false); // ✨ NEW: Mobile dropdown state

  const { user, role, isAdmin, signOut } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  const isPriest    = role === "priest";
  const isStaff     = role === "staff";
  const isMinister  = role === "minister";

  const annUnread = useAnnouncementUnread(user?.id, role);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = () => {
    setIsOpen(false);
    setIsLoggingOut(true);
    signOut();
    setTimeout(() => {
      setIsLoggingOut(false);
      navigate("/", { replace: true });
    }, 600);
  };

  const isSolidRoute = SOLID_BG_PREFIXES.some((p) => location.pathname.startsWith(p));
  const isSolid = scrolled || forceSolidBg || isSolidRoute;

  const textColor = isSolid ? "text-gray-900" : "text-white";
  const navLinkClass = `text-[11px] font-bold uppercase tracking-widest transition-colors hover:text-[#B59E74] ${textColor}`;
  const serifLinkClass = `hover:text-[#B59E74] transition-colors font-serif italic text-lg ${textColor}`;

  const displayName =
    user?.user_metadata?.full_name ||
    [user?.user_metadata?.first_name, user?.user_metadata?.last_name].filter(Boolean).join(" ") ||
    user?.email?.split("@")[0] || "";

  return (
    <>
      {/* LOGOUT OVERLAY */}
      <div className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gray-900/95 backdrop-blur-sm transition-all duration-500 ease-in-out ${isLoggingOut ? "opacity-100 visible" : "opacity-0 invisible"}`}>
        <div className={`transform transition-all duration-700 delay-100 ${isLoggingOut ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}>
          <div className="w-16 h-16 mx-auto rounded-full border-t-2 border-b-2 border-[#B59E74] animate-spin mb-6" />
          <h2 className="text-2xl font-serif text-white tracking-widest uppercase text-center">Signing Out</h2>
          <p className="text-[#B59E74] font-serif italic mt-3 text-center text-lg">God bless you.</p>
        </div>
      </div>

      {/* MOBILE NOTIFICATION DRAWER */}
      {user && (
        <MobileNotificationDrawer
          isOpen={mobileNotifsOpen}
          onClose={() => setMobileNotifsOpen(false)}
          userId={user.id}
        />
      )}

      <header className={`fixed top-0 w-full z-[100] transition-all duration-300 ${isSolid ? "bg-white shadow-md py-4" : "bg-transparent py-6"}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center">

          {/* Left: wordmark (Clickable Home) */}
          <Link to="/" className={`flex-1 hidden lg:flex items-center font-serif italic ${textColor} opacity-80 hover:opacity-100 transition-opacity`}>
            Minore Basilica of San Pedro Bautista
          </Link>

          {/* Center: nav */}
          <nav className="hidden lg:flex justify-center whitespace-nowrap shrink-0">
            {(isAdmin || isPriest || isStaff || isMinister) ? (
              <div className="flex gap-6 xl:gap-8 items-center">
                {/* ✨ Desktop Dropdown for Staff/Admin */}
                <div className="relative group">
                  <button className={`${navLinkClass} flex items-center gap-1.5`}>
                    Calendar <span className="text-[8px]">▼</span>
                  </button>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 pt-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="bg-white text-gray-800 shadow-xl border border-gray-100 rounded-xl py-2 flex flex-col min-w-[180px]">
                      <Link to="/events" className="px-5 py-3 text-[11px] font-bold uppercase tracking-widest hover:bg-[#F6F5ED] hover:text-[#B59E74] transition-colors text-left">Parish Events</Link>
                      <Link to="/services" className="px-5 py-3 text-[11px] font-bold uppercase tracking-widest hover:bg-[#F6F5ED] hover:text-[#B59E74] transition-colors text-left">Request Services</Link>
                    </div>
                  </div>
                </div>

                <Link to="/ministries" className={navLinkClass}>Ministries</Link>
                {user && !isAdmin && (
                  <Link to="/announcements" className={`${navLinkClass} relative`}>
                    Announcements
                    {annUnread > 0 && (
                      <span className="absolute -top-1 -right-2 h-2 w-2 rounded-full bg-red-500" />
                    )}
                  </Link>
                )}
              </div>
            ) : (
              <div className="flex gap-5 xl:gap-7 items-center">
                {/* ✨ Removed Home Link here */}
                <Link to="/about" className={serifLinkClass}>About Us</Link>
                
                {/* ✨ Desktop Dropdown for Parishioner/Guest */}
                <div className="relative group">
                  <button className={`${serifLinkClass} flex items-center gap-1.5`}>
                    Calendar <span className="text-[10px] not-italic font-sans">▼</span>
                  </button>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 pt-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="bg-white text-gray-800 shadow-xl border border-gray-100 rounded-xl py-2 flex flex-col min-w-[180px]">
                      <Link to="/events" className="px-5 py-3 text-[11px] font-bold uppercase tracking-widest hover:bg-[#F6F5ED] hover:text-[#B59E74] font-sans not-italic transition-colors text-left">Events Calendar</Link>
                      <Link to="/services" className="px-5 py-3 text-[11px] font-bold uppercase tracking-widest hover:bg-[#F6F5ED] hover:text-[#B59E74] font-sans not-italic transition-colors text-left">Parish Services</Link>
                    </div>
                  </div>
                </div>

                <Link to="/ministries" className={serifLinkClass}>Ministries</Link>
                <Link to="/give"       className={serifLinkClass}>Give</Link>
                {user && (
                  <Link to="/announcements" className={`${serifLinkClass} relative`}>
                    Announcements
                    {annUnread > 0 && (
                      <span className="absolute -top-1 -right-2 h-2 w-2 rounded-full bg-red-500" />
                    )}
                  </Link>
                )}
                <a href="https://www.google.com/maps/dir/?api=1&destination=69+San+Pedro+Bautista+St.%2C+San+Francisco+del+Monte%2C+Quezon+City%2C+Philippines%2C+1104" target="_blank" rel="noopener noreferrer" className={serifLinkClass}>Visit Us</a>
              </div>
            )}
          </nav>

          {/* Right: auth area */}
          <div className="flex-1 flex items-center justify-end gap-3">
            <div className="hidden lg:flex items-center gap-3">
              {user ? (
                <div className="flex items-center gap-3">
                  <NotificationBell isSolid={isSolid} userId={user.id} />
                  
                  {(isAdmin || isPriest || isStaff) && (
                    <Link to={isAdmin ? "/admin" : isPriest ? "/priest-dashboard" : "/staff-dashboard"} className={navLinkClass}>Dashboard</Link>
                  )}
                  
                  <Link to="/profile" className={navLinkClass}>Profile</Link>
                  
                  <RolePill role={role} isSolid={isSolid} />
                  
                  <button onClick={handleLogout} className={`text-[11px] font-bold uppercase tracking-widest transition-colors hover:text-red-400 ${textColor}`}>
                    Sign out
                  </button>
                </div>
              ) : (
                <Link to="/login" className={`px-6 py-2 border-2 rounded-full font-sans not-italic text-sm font-bold uppercase tracking-widest transition-all ${
                    isSolid 
                    ? "border-[#B59E74] text-[#B59E74] hover:bg-[#B59E74] hover:text-white" 
                    : "border-white text-white hover:bg-white hover:text-gray-900"
                  }`}>
                  Login
                </Link>
              )}
            </div>

            {/* Mobile Actions */}
            {user && (
              <button
                onClick={() => { setIsOpen(false); setMobileNotifsOpen(true); }}
                className={`lg:hidden relative p-2 rounded-full transition-colors ${
                  isSolid 
                    ? "text-gray-900" 
                    : "text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                }`}
                aria-label="Notifications"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <MobileUnreadDot userId={user.id} />
              </button>
            )}

            {/* Mobile hamburger */}
            <button onClick={() => setIsOpen(!isOpen)} className={`lg:hidden focus:outline-none z-50 ${
                isSolid ? "text-gray-900" : "text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
              }`}>
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isOpen ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isOpen && (
          <div className="lg:hidden absolute top-full left-0 w-full px-4 pb-4">
            <ul className={`mt-2 flex flex-col gap-4 p-6 rounded-2xl shadow-xl ${isSolid ? "bg-gray-50" : "bg-black/90 text-white"}`}>
              {(isAdmin || isPriest || isStaff || isMinister) ? (
                <>
                  {/* ✨ Mobile Dropdown for Staff/Admin */}
                  <li>
                    <button onClick={() => setMobileCalendarOpen(!mobileCalendarOpen)} className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-widest hover:text-[#B59E74] transition-colors">
                      Calendar <span>{mobileCalendarOpen ? "▲" : "▼"}</span>
                    </button>
                    {mobileCalendarOpen && (
                      <div className="flex flex-col gap-3 mt-3 pl-4 border-l-2 border-[#B59E74]/30">
                        <Link to="/events" onClick={() => { setIsOpen(false); setMobileCalendarOpen(false); }} className="text-[10px] font-bold uppercase tracking-widest hover:text-[#B59E74] transition-colors">Events Calendar</Link>
                        <Link to="/services" onClick={() => { setIsOpen(false); setMobileCalendarOpen(false); }} className="text-[10px] font-bold uppercase tracking-widest hover:text-[#B59E74] transition-colors">Request Services</Link>
                      </div>
                    )}
                  </li>
                  <li><Link to="/ministries" onClick={() => { setIsOpen(false); setMobileCalendarOpen(false); }} className="text-xs font-bold uppercase tracking-widest hover:text-[#B59E74] transition-colors">Ministries</Link></li>
                  {user && !isAdmin && (
                    <li>
                      <Link to="/announcements" onClick={() => { setIsOpen(false); setMobileCalendarOpen(false); }} className="relative inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest hover:text-[#B59E74] transition-colors">
                        Announcements
                        {annUnread > 0 && <span className="h-2 w-2 rounded-full bg-red-500 flex-shrink-0" />}
                      </Link>
                    </li>
                  )}
                </>
              ) : (
                <>
                  {/* ✨ Mobile Dropdown for Parishioner/Guest */}
                  <li><Link to="/about"      onClick={() => { setIsOpen(false); setMobileCalendarOpen(false); }}>About Us</Link></li>
                  <li>
                    <button onClick={() => setMobileCalendarOpen(!mobileCalendarOpen)} className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-widest hover:text-[#B59E74] transition-colors">
                      Calendar <span>{mobileCalendarOpen ? "▲" : "▼"}</span>
                    </button>
                    {mobileCalendarOpen && (
                      <div className="flex flex-col gap-3 mt-3 pl-4 border-l-2 border-[#B59E74]/30">
                        <Link to="/events" onClick={() => { setIsOpen(false); setMobileCalendarOpen(false); }} className="text-[10px] font-bold uppercase tracking-widest hover:text-[#B59E74] transition-colors">Events Calendar</Link>
                        <Link to="/services" onClick={() => { setIsOpen(false); setMobileCalendarOpen(false); }} className="text-[10px] font-bold uppercase tracking-widest hover:text-[#B59E74] transition-colors">Parish Services</Link>
                      </div>
                    )}
                  </li>
                  <li><Link to="/ministries" onClick={() => { setIsOpen(false); setMobileCalendarOpen(false); }}>Ministries</Link></li>
                  {user && (
                    <li>
                      <Link to="/announcements" onClick={() => { setIsOpen(false); setMobileCalendarOpen(false); }} className="relative inline-flex items-center gap-1.5">
                        Announcements
                        {annUnread > 0 && <span className="h-2 w-2 rounded-full bg-red-500 flex-shrink-0" />}
                      </Link>
                    </li>
                  )}
                </>
              )}

              <hr className="border-gray-300/30 my-2" />

              {user ? (
                <>
                  {/* Mobile role row */}
                  <li className="flex items-center gap-3 px-1 py-1">
                    <span className={`w-2 h-2 rounded-full shrink-0 animate-pulse ${ROLE_CONFIG[role]?.dot ?? "bg-gray-400"}`} />
                    <div className="flex flex-col leading-none">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        {ROLE_CONFIG[role]?.label ?? role}
                      </span>
                      <span className="font-serif italic text-sm mt-0.5">{displayName}</span>
                    </div>
                  </li>

                  {/* Mobile Notification Button */}
                  <li>
                    <button 
                      onClick={() => { setIsOpen(false); setMobileNotifsOpen(true); setMobileCalendarOpen(false); }} 
                      className="w-full flex items-center justify-center gap-2 bg-[#B59E74] text-white py-3 rounded-xl font-bold tracking-widest uppercase text-xs"
                    >
                      <span>🔔</span> Notifications
                    </button>
                  </li>

                  <li>
                    <Link to="/profile" onClick={() => { setIsOpen(false); setMobileCalendarOpen(false); }} className="block w-full text-center bg-white border-2 border-[#B59E74] text-[#B59E74] py-3 rounded-xl font-bold tracking-widest uppercase text-xs">
                      My Profile
                    </Link>
                  </li>

                  <hr className="border-gray-300/30" />

                  {isAdmin && (
                    <li>
                      <Link to="/admin" onClick={() => { setIsOpen(false); setMobileCalendarOpen(false); }} className="block w-full text-center bg-gray-800 text-white py-3 rounded-xl font-bold tracking-widest uppercase">
                        Admin Dashboard
                      </Link>
                    </li>
                  )}
                  {isPriest && (
                    <li>
                      <Link to="/priest-dashboard" onClick={() => { setIsOpen(false); setMobileCalendarOpen(false); }} className="block w-full text-center bg-[#B59E74] text-white py-3 rounded-xl font-bold tracking-widest uppercase">
                        Priest Dashboard
                      </Link>
                    </li>
                  )}
                  {isStaff && (
                    <li>
                      <Link to="/staff-dashboard" onClick={() => { setIsOpen(false); setMobileCalendarOpen(false); }} className="block w-full text-center bg-gray-800 text-white py-3 rounded-xl font-bold tracking-widest uppercase">
                        Staff Portal
                      </Link>
                    </li>
                  )}
                  <li>
                    <button
                      onClick={handleLogout}
                      className="w-full text-center border-2 border-red-400/50 text-red-400 py-3 rounded-xl font-bold tracking-widest uppercase"
                    >
                      Sign Out
                    </button>
                  </li>
                </>
              ) : (
                <li>
                  <Link to="/login" onClick={() => { setIsOpen(false); setMobileCalendarOpen(false); }} className="block w-full text-center bg-[#B59E74] text-white py-3 rounded-xl font-bold tracking-widest uppercase">
                    Login
                  </Link>
                </li>
              )}
            </ul>
          </div>
        )}
      </header>
    </>
  );
}

export default Header;
