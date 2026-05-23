import { useEffect, useState, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";
import { supabase } from "../supabaseClient"; // ✨ NEW: Needed for bell notifications

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

/** Pill: pulsing dot · ROLE LABEL */
function RolePill({ role, isSolid }) {
  const cfg = ROLE_CONFIG[role];
  if (!cfg) return null;

  const bg     = isSolid ? cfg.solidBg     : cfg.ghostBg;
  const border = isSolid ? cfg.solidBorder : cfg.ghostBorder;
  const text   = isSolid ? cfg.solidText   : cfg.ghostText;

  return (
    <div className={`flex items-center gap-2 px-3.5 py-2 rounded-full border shadow-sm transition-all duration-300 ${bg} ${border}`}>
      {/* live status dot */}
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 animate-pulse ${cfg.dot}`} />

      {/* role label */}
      <span className={`font-sans not-italic text-[10px] font-bold uppercase tracking-[0.12em] ${text}`}>
        {cfg.label}
      </span>
    </div>
  );
}

// ✨ NEW: Interactive Notification Bell Component
function NotificationBell({ isSolid }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch initial notifications & listen for new ones
  useEffect(() => {
    if (!user?.id) return;

    // 1. Fetch the 10 most recent notifications for this user
    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (data) setNotifications(data);
    };

    fetchNotifications();

    // 2. Realtime listener to update the badge when a new one arrives!
    const channel = supabase
      .channel('header-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          setNotifications((prev) => [payload.new, ...prev].slice(0, 10));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleNotificationClick = async (notif) => {
    // Mark as read in DB if it's currently unread
    if (!notif.is_read) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', notif.id);
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
    }
    
    setIsOpen(false);
    
    // Redirect if a link exists
    if (notif.link) navigate(notif.link);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className={`relative p-2 rounded-full transition-colors ${isSolid ? "hover:bg-gray-100 text-gray-600" : "hover:bg-white/10 text-white"}`}
        aria-label="Notifications"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        
        {/* Red Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-3 w-3 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white shadow-sm ring-2 ring-white">
            {/* The ring color should ideally match the header bg, but white looks fine in solid mode */}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[110] animate-fade-in-up">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Notifications</span>
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-400 italic">No notifications yet.</div>
            ) : (
              <div className="flex flex-col">
                {notifications.map((notif) => (
                  <button 
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`w-full text-left p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors ${!notif.is_read ? 'bg-[#F6F5ED]/50' : 'opacity-70'}`}
                  >
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <strong className={`text-sm font-serif ${!notif.is_read ? 'text-[#B59E74]' : 'text-gray-700'}`}>
                        {notif.title}
                      </strong>
                      {!notif.is_read && <span className="w-2 h-2 rounded-full bg-[#B59E74] shrink-0 mt-1.5" />}
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2">{notif.message}</p>
                    <span className="text-[9px] text-gray-400 uppercase tracking-wider mt-2 block">
                      {new Date(notif.created_at).toLocaleDateString()}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


function Header({ forceSolidBg = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const { user, role, isAdmin, signOut } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  const isPriest      = role === "priest";
  const isStaff       = role === "staff";
  const isMinister    = role === "minister";
  const isParishioner = role === "parishioner";

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

  const displayName = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(" ")[0]
    : user?.email?.split("@")[0] ?? "";

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

      <header className={`fixed top-0 w-full z-[100] transition-all duration-300 ${isSolid ? "bg-white shadow-md py-4 text-gray-800" : "bg-transparent py-6 text-gray-800 lg:text-white"}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center">

          {/* Left: wordmark — flex-1 so it balances the right side */}
          <div className="flex-1 hidden lg:flex items-center">
            <div className="text-sm font-serif italic opacity-70">
              Minore Basilica of San Pedro Bautista
            </div>
          </div>

          {/* Center: nav */}
          <nav className="hidden lg:flex justify-center whitespace-nowrap shrink-0">
            {(isAdmin || isPriest || isStaff || isMinister) ? (
              /* Staff nav — sans-serif, uppercase, matching dashboard style */
              <div className="flex gap-6 xl:gap-8 items-center">
                <Link to="/events"     className={`text-[11px] font-bold uppercase tracking-widest transition-colors hover:text-[#B59E74] ${isSolid ? "text-gray-600" : "text-white"}`}>Events</Link>
                <Link to="/services"   className={`text-[11px] font-bold uppercase tracking-widest transition-colors hover:text-[#B59E74] ${isSolid ? "text-gray-600" : "text-white"}`}>Services</Link>
                <Link to="/ministries" className={`text-[11px] font-bold uppercase tracking-widest transition-colors hover:text-[#B59E74] ${isSolid ? "text-gray-600" : "text-white"}`}>Ministries</Link>
              </div>
            ) : (
              /* Public nav — serif italic */
              <div className="flex gap-5 xl:gap-7 font-serif italic text-lg items-center">
                <Link to="/"           className="hover:text-[#B59E74] transition-colors">Home</Link>
                <Link to="/about"      className="hover:text-[#B59E74] transition-colors">About Us</Link>
                <Link to="/services"   className="hover:text-[#B59E74] transition-colors">Services</Link>
                <Link to="/events"     className="hover:text-[#B59E74] transition-colors">Events</Link>
                <Link to="/ministries" className="hover:text-[#B59E74] transition-colors">Ministries</Link>
                <Link to="/give"       className="hover:text-[#B59E74] transition-colors">Give</Link>
                <a
                  href="https://www.google.com/maps/dir/?api=1&destination=69+San+Pedro+Bautista+St.%2C+San+Francisco+del+Monte%2C+Quezon+City%2C+Philippines%2C+1104"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#B59E74] transition-colors"
                >
                  Visit Us
                </a>
              </div>
            )}
          </nav>

          {/* Right: auth area — flex-1 + justify-end mirrors the left side */}
          <div className="flex-1 flex items-center justify-end gap-3">
            <div className="hidden lg:flex items-center gap-3">
              {user ? (
                <div className="flex items-center gap-3">

                  {/* ✨ NEW: Notification Bell for logged-in users */}
                  <NotificationBell isSolid={isSolid} />

                  {/* Dashboard link — subtle, low-weight */}
                  {(isAdmin || isPriest || isStaff) && (
                    <Link
                      to={isAdmin ? "/admin" : isPriest ? "/priest-dashboard" : "/staff-dashboard"}
                      className={`text-[11px] font-bold uppercase tracking-widest transition-colors hover:text-[#B59E74] ${isSolid ? "text-gray-500" : "text-white"}`}
                    >
                      Dashboard
                    </Link>
                  )}

                  {/* Profile link */}
                  <Link
                    to="/profile"
                    className={`text-[11px] font-bold uppercase tracking-widest transition-colors hover:text-[#B59E74] ${isSolid ? "text-gray-500" : "text-white"}`}
                  >
                    Profile
                  </Link>

                  {/* Role + name pill */}
                  <RolePill role={role} isSolid={isSolid} />

                  {/* Sign out */}
                  <button
                    onClick={handleLogout}
                    className={`text-[11px] font-bold uppercase tracking-widest transition-colors hover:text-red-400 ${isSolid ? "text-gray-500" : "text-white"}`}
                  >
                    Sign out
                  </button>

                </div>
              ) : (
                <Link
                  to="/login"
                  className={`px-6 py-2 border-2 rounded-full font-sans not-italic text-sm font-bold uppercase tracking-widest transition-colors ${
                    isSolid
                      ? "border-[#B59E74] text-[#B59E74] hover:bg-[#B59E74] hover:text-white"
                      : "border-gray-800 lg:border-white text-gray-800 lg:text-white hover:bg-white hover:text-gray-900"
                  }`}
                >
                  Login
                </Link>
              )}
            </div>

            {/* Mobile hamburger */}
            <button onClick={() => setIsOpen(!isOpen)} className="lg:hidden focus:outline-none z-50">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
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
                  <li><Link to="/events"     onClick={() => setIsOpen(false)} className="text-xs font-bold uppercase tracking-widest hover:text-[#B59E74] transition-colors">Events</Link></li>
                  <li><Link to="/services"   onClick={() => setIsOpen(false)} className="text-xs font-bold uppercase tracking-widest hover:text-[#B59E74] transition-colors">Services</Link></li>
                  <li><Link to="/ministries" onClick={() => setIsOpen(false)} className="text-xs font-bold uppercase tracking-widest hover:text-[#B59E74] transition-colors">Ministries</Link></li>
                </>
              ) : (
                <>
                  <li><Link to="/"           onClick={() => setIsOpen(false)}>Home</Link></li>
                  <li><Link to="/about"      onClick={() => setIsOpen(false)}>About Us</Link></li>
                  <li><Link to="/services"   onClick={() => setIsOpen(false)}>Services</Link></li>
                  <li><Link to="/events"     onClick={() => setIsOpen(false)}>Events</Link></li>
                  <li><Link to="/ministries" onClick={() => setIsOpen(false)}>Ministries</Link></li>
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

                  {/* ✨ NEW: Mobile Notification Bell (Simplified) */}
                  <li>
                    <button 
                      onClick={() => alert("Notifications are currently only visible on desktop!")} 
                      className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold tracking-widest uppercase text-xs"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                      Notifications
                    </button>
                  </li>

                  <li>
                    <Link to="/profile" onClick={() => setIsOpen(false)} className="block w-full text-center bg-white border-2 border-[#B59E74] text-[#B59E74] py-3 rounded-xl font-bold tracking-widest uppercase text-xs">
                      My Profile
                    </Link>
                  </li>

                  <hr className="border-gray-300/30" />

                  {isAdmin && (
                    <li>
                      <Link to="/admin" onClick={() => setIsOpen(false)} className="block w-full text-center bg-gray-800 text-white py-3 rounded-xl font-bold tracking-widest uppercase">
                        Admin Dashboard
                      </Link>
                    </li>
                  )}
                  {isPriest && (
                    <li>
                      <Link to="/priest-dashboard" onClick={() => setIsOpen(false)} className="block w-full text-center bg-[#B59E74] text-white py-3 rounded-xl font-bold tracking-widest uppercase">
                        Priest Dashboard
                      </Link>
                    </li>
                  )}
                  {isStaff && (
                    <li>
                      <Link to="/staff-dashboard" onClick={() => setIsOpen(false)} className="block w-full text-center bg-gray-800 text-white py-3 rounded-xl font-bold tracking-widest uppercase">
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
                  <Link to="/login" onClick={() => setIsOpen(false)} className="block w-full text-center bg-[#B59E74] text-white py-3 rounded-xl font-bold tracking-widest uppercase">
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