import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

function Header({ forceSolidBg = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false); // Track admin status

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();

  // --- DEBUGGED ADMIN CHECK FUNCTION ---
  const checkAdminRole = async (userId) => {
    if (!userId) {
      console.log("Header Debug: No userId provided, setting isAdmin to false.");
      setIsAdmin(false);
      return;
    }

    console.log(`Header Debug: Checking role for user ID: ${userId}`);

    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .single();

      if (error) {
        console.error("Header Debug: Role fetch error:", error.message);
        setIsAdmin(false);
        return;
      }

      console.log("Header Debug: User role found in DB:", data?.role);

      if (data && data.role === "admin") {
        console.log("Header Debug: ACCESS GRANTED - User is Admin");
        setIsAdmin(true);
      } else {
        console.log("Header Debug: ACCESS DENIED - User is not an Admin");
        setIsAdmin(false);
      }
    } catch (err) {
      console.error("Header Debug: Unexpected error checking role:", err);
      setIsAdmin(false);
    }
  };

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);

    const checkUser = async () => {
      const { data } = await supabase.auth.getSession();
      const currentUser = data.session?.user || null;
      setUser(currentUser);
      
      if (currentUser) {
        await checkAdminRole(currentUser.id);
      } else {
        setIsAdmin(false);
      }
    };
    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Header Debug: Auth state changed. Event:", event);
        const currentUser = session?.user || null;
        setUser(currentUser);
        
        if (currentUser) {
          await checkAdminRole(currentUser.id);
        } else {
          console.log("Header Debug: Session ended, resetting isAdmin to false.");
          setIsAdmin(false);
        }
      },
    );

    return () => {
      window.removeEventListener("scroll", handleScroll);
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    setIsOpen(false);
    setIsLoggingOut(true);
    
    // Explicitly reset admin state before logging out
    setIsAdmin(false); 
    
    try {
      // Actual logout call
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Logout Error:", error.message);
    } finally {
      // Speed up wait time to 600ms and use clean navigation (no full reload)
      setTimeout(() => {
        setIsLoggingOut(false);
        navigate("/", { replace: true });
      }, 600);
    }
  };

  const isSolid = scrolled || forceSolidBg;

  return (
    <>
      {/* LOGOUT OVERLAY ANIMATION */}
      <div
        className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gray-900/95 backdrop-blur-sm transition-all duration-500 ease-in-out ${
          isLoggingOut ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
      >
        <div
          className={`transform transition-all duration-700 delay-100 ${
            isLoggingOut ? "scale-100 opacity-100" : "scale-95 opacity-0"
          }`}
        >
          <div className="w-16 h-16 mx-auto rounded-full border-t-2 border-b-2 border-[#B59E74] animate-spin mb-6"></div>
          <h2 className="text-2xl font-serif text-white tracking-widest uppercase text-center">
            Signing Out
          </h2>
          <p className="text-[#B59E74] font-serif italic mt-3 text-center text-lg">
            God bless you.
          </p>
        </div>
      </div>

      <header
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${
          isSolid
            ? "bg-white shadow-md py-4 text-gray-800"
            : "bg-transparent py-6 text-gray-800 lg:text-white"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center relative">
          <div className="w-32 hidden lg:flex items-center">
            <div className="text-sm font-serif italic opacity-70">
              San Pedro Bautista
            </div>
          </div>

          <nav className="hidden lg:flex gap-6 xl:gap-8 font-serif italic text-lg justify-center absolute left-1/2 transform -translate-x-1/2 whitespace-nowrap">
            <Link to="/" className="hover:text-[#B59E74] transition-colors">Home</Link>
            <Link to="/about" className="hover:text-[#B59E74] transition-colors">About Us</Link>
            <Link to="/services" className="hover:text-[#B59E74] transition-colors">Services</Link>
            <a href="#sermons" className="hover:text-[#B59E74] transition-colors">Sermons</a>
            <Link to="/events" className="hover:text-[#B59E74] transition-colors">Events</Link>
            <Link to="/ministries" className="hover:text-[#B59E74] transition-colors">Ministries</Link>
            <Link to="/give" className="hover:text-[#B59E74] transition-colors">Give</Link>
            <Link to="/visit" className="hover:text-[#B59E74] transition-colors">Visit Us</Link>
          </nav>

          <div className="flex items-center gap-4 min-w-[120px] justify-end ml-auto lg:ml-0">
            <div className="hidden lg:flex items-center gap-3">
              {user ? (
                <>
                  {/* CONDITIONALLY RENDER DASHBOARD: Only if isAdmin is true */}
                  {isAdmin && (
                    <Link
                      to="/admin"
                      className="text-xs font-bold uppercase tracking-widest hover:text-[#B59E74] transition-colors"
                    >
                      Dashboard
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className={`px-5 py-2 border-2 rounded-full font-sans not-italic text-xs font-bold uppercase tracking-widest transition-colors ${
                      isSolid
                        ? "border-gray-800 text-gray-800 hover:bg-gray-800 hover:text-white"
                        : "border-white text-white hover:bg-white hover:text-gray-900"
                    }`}
                  >
                    Logout
                  </button>
                </>
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

            <button
              onClick={() => setIsOpen(!isOpen)}
              className="lg:hidden focus:outline-none z-50"
            >
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

        {isOpen && (
          <div className="lg:hidden absolute top-full left-0 w-full px-4 pb-4">
            <ul
              className={`mt-2 flex flex-col gap-4 p-6 rounded-2xl shadow-xl ${
                isSolid ? "bg-gray-50" : "bg-black/90 text-white"
              }`}
            >
              <li><Link to="/" onClick={() => setIsOpen(false)}>Home</Link></li>
              <li><Link to="/about" onClick={() => setIsOpen(false)}>About Us</Link></li>
              <li><Link to="/services" onClick={() => setIsOpen(false)}>Services</Link></li>
              <li><Link to="/events" onClick={() => setIsOpen(false)}>Events</Link></li>
              <li><a href="#sermons" onClick={() => setIsOpen(false)}>Sermons</a></li>
              <li><Link to="/ministries" onClick={() => setIsOpen(false)}>Ministries</Link></li>

              <hr className="border-gray-300/30 my-2" />

              {user ? (
                <>
                  {/* CONDITIONALLY RENDER DASHBOARD IN MOBILE MENU */}
                  {isAdmin && (
                    <li>
                      <Link
                        to="/admin"
                        onClick={() => setIsOpen(false)}
                        className="block w-full text-center bg-gray-800 text-white py-3 rounded-xl font-bold tracking-widest uppercase mb-2"
                      >
                        Dashboard
                      </Link>
                    </li>
                  )}
                  <li>
                    <button
                      onClick={handleLogout}
                      className="w-full text-center border-2 border-red-500/50 text-red-400 py-3 rounded-xl font-bold tracking-widest uppercase"
                    >
                      Logout
                    </button>
                  </li>
                </>
              ) : (
                <li>
                  <Link
                    to="/login"
                    onClick={() => setIsOpen(false)}
                    className="block w-full text-center bg-[#B59E74] text-white py-3 rounded-xl font-bold tracking-widest uppercase"
                  >
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