import { useEffect, useState, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";
import { supabase } from "../supabaseClient";

function Header({ forceSolidBg = false }) {
  const [isOpen, setIsOpen]               = useState(false);
  const [scrolled, setScrolled]           = useState(false);
  const [isLoggingOut, setIsLoggingOut]   = useState(false);
  const [mobileNotifsOpen, setMobileNotifsOpen] = useState(false);

  const { user, role, isAdmin, signOut } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  const isPriest      = role === "priest";
  const isStaff       = role === "staff";
  const isMinister    = role === "minister";

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

      {user && (
        <MobileNotificationDrawer
          isOpen={mobileNotifsOpen}
          onClose={() => setMobileNotifsOpen(false)}
          userId={user.id}
        />
      )}

      {/* ✨ Header: Solid uses white background + dark text, Transparent uses no background + white text */}
      <header className={`fixed top-0 w-full z-[100] transition-all duration-300 ${isSolid ? "bg-white shadow-md py-4" : "bg-transparent py-6"}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center">

          {/* Left: wordmark */}
          <div className={`flex-1 hidden lg:flex items-center ${textColor}`}>
            <div className="text-sm font-serif italic opacity-70">
              Minore Basilica of San Pedro Bautista
            </div>
          </div>

          {/* Center: nav */}
          <nav className="hidden lg:flex justify-center whitespace-nowrap shrink-0">
            {(isAdmin || isPriest || isStaff || isMinister) ? (
              <div className="flex gap-6 xl:gap-8 items-center">
                <Link to="/events"    className={navLinkClass}>Calendar</Link>
                <Link to="/services"  className={navLinkClass}>Services</Link>
                <Link to="/ministries" className={navLinkClass}>Ministries</Link>
              </div>
            ) : (
              <div className="flex gap-5 xl:gap-7 items-center">
                <Link to="/"          className={serifLinkClass}>Home</Link>
                <Link to="/about"     className={serifLinkClass}>About Us</Link>
                <Link to="/services"  className={serifLinkClass}>Services</Link>
                <Link to="/events"    className={serifLinkClass}>Calendar</Link>
                <Link to="/ministries" className={serifLinkClass}>Ministries</Link>
                <Link to="/give"      className={serifLinkClass}>Give</Link>
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
                className={`lg:hidden relative p-2 rounded-full transition-colors ${textColor}`}
                aria-label="Notifications"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <MobileUnreadDot userId={user.id} />
              </button>
            )}

            {/* Mobile hamburger */}
            <button onClick={() => setIsOpen(!isOpen)} className={`lg:hidden focus:outline-none z-50 ${textColor}`}>
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isOpen ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>
        </div>
        {/* ... [Mobile Menu content remains the same] ... */}
      </header>
    </>
  );
}

export default Header;