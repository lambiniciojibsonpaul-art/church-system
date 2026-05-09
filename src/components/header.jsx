import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";

// Routes whose hero is not a full-bleed image. Header forces a solid
// background on these so it isn't transparent against a flat page.
const SOLID_BG_PREFIXES = ["/admin", "/login", "/check-in", "/update-password"];

function Header({ forceSolidBg = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const routeForcesSolid = SOLID_BG_PREFIXES.some((p) =>
    location.pathname.startsWith(p),
  );
  // Admins always see a solid header — they're working, not browsing.
  const isSolid = scrolled || forceSolidBg || routeForcesSolid || isAdmin;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = () => {
    setIsOpen(false);
    setIsLoggingOut(true);

    // signOut is synchronous from the caller's perspective — localStorage
    // is purged immediately, the SDK call is fire-and-forget.
    signOut();

    // Hold the "Signing Out / God bless you" overlay for ~1.1s before
    // navigating away so the farewell animation actually plays.
    setTimeout(() => {
      setIsLoggingOut(false);
      navigate("/", { replace: true });
    }, 1100);
  };

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
            <div className="text-lg font-serif italic opacity-70 whitespace-nowrap">
              San Pedro Bautista
            </div>
          </div>

          {/* Public nav — hidden for admins (they only need Events + Dashboard,
              shown on the right side). */}
          {!isAdmin && (
            <nav className="hidden lg:flex gap-6 xl:gap-8 font-serif italic text-lg justify-center absolute left-1/2 transform -translate-x-1/2 whitespace-nowrap">
              <Link to="/" className="hover:text-[#B59E74] transition-colors">
                Home
              </Link>
              <Link
                to="/about"
                className="hover:text-[#B59E74] transition-colors"
              >
                About Us
              </Link>
              <Link
                to="/services"
                className="hover:text-[#B59E74] transition-colors"
              >
                Services
              </Link>
              <Link
                to="/events"
                className="hover:text-[#B59E74] transition-colors"
              >
                Events
              </Link>
              <Link
                to="/ministries"
                className="hover:text-[#B59E74] transition-colors"
              >
                Ministries
              </Link>
              <Link to="/give" className="hover:text-[#B59E74] transition-colors">
                Give
              </Link>
              <a
                href="https://www.google.com/maps/dir/?api=1&destination=69+San+Pedro+Bautista+St.%2C+San+Francisco+del+Monte%2C+Quezon+City%2C+Philippines%2C+1104"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#B59E74] transition-colors"
              >
                Visit Us
              </a>
            </nav>
          )}

          <div className="flex items-center gap-4 min-w-[120px] justify-end ml-auto lg:ml-0">
            <div className="hidden lg:flex items-center gap-3">
              {user ? (
                <>
                  {isAdmin && (
                    <>
                      <Link
                        to="/events"
                        className="text-xs font-bold uppercase tracking-widest hover:text-[#B59E74] transition-colors"
                      >
                        Events
                      </Link>
                      <Link
                        to="/admin"
                        className="text-xs font-bold uppercase tracking-widest hover:text-[#B59E74] transition-colors"
                      >
                        Dashboard
                      </Link>
                    </>
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
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
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
              {/* Public links — hidden on admin accounts */}
              {!isAdmin && (
                <>
                  <li>
                    <Link to="/" onClick={() => setIsOpen(false)}>
                      Home
                    </Link>
                  </li>
                  <li>
                    <Link to="/about" onClick={() => setIsOpen(false)}>
                      About Us
                    </Link>
                  </li>
                  <li>
                    <Link to="/services" onClick={() => setIsOpen(false)}>
                      Services
                    </Link>
                  </li>
                  <li>
                    <Link to="/events" onClick={() => setIsOpen(false)}>
                      Events
                    </Link>
                  </li>
                  <li>
                    <Link to="/ministries" onClick={() => setIsOpen(false)}>
                      Ministries
                    </Link>
                  </li>
                  <li>
                    <a
                      href="https://www.google.com/maps/dir/?api=1&destination=69+San+Pedro+Bautista+St.%2C+San+Francisco+del+Monte%2C+Quezon+City%2C+Philippines%2C+1104"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setIsOpen(false)}
                    >
                      Visit Us
                    </a>
                  </li>

                  <hr className="border-gray-300/30 my-2" />
                </>
              )}

              {user ? (
                <>
                  {isAdmin && (
                    <>
                      <li>
                        <Link
                          to="/events"
                          onClick={() => setIsOpen(false)}
                          className="block w-full text-center bg-white border-2 border-gray-800 text-gray-800 py-3 rounded-xl font-bold tracking-widest uppercase mb-2"
                        >
                          Events
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="/admin"
                          onClick={() => setIsOpen(false)}
                          className="block w-full text-center bg-gray-800 text-white py-3 rounded-xl font-bold tracking-widest uppercase mb-2"
                        >
                          Dashboard
                        </Link>
                      </li>
                    </>
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
