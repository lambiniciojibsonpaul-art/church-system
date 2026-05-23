import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../../supabaseClient";

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

function CheckInPage() {
  const { eventId } = useParams();

  const [session, setSession]           = useState(null);
  const [event, setEvent]               = useState(null);
  const [loading, setLoading]           = useState(true);
  const [status, setStatus]             = useState("idle"); // idle | loading | error

  const [guestInfo, setGuestInfo]       = useState(null);
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [guestForm, setGuestForm]       = useState({ firstName: "", lastName: "", contactNumber: "" });

  // Modal state
  const [modalType, setModalType]       = useState(null); // null | "success" | "too_far" | "duplicate" | "error" | "location_denied"
  const [errorMsg, setErrorMsg]         = useState("");
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { session: s } } = await supabase.auth.getSession();
      setSession(s);

      const { data, error } = await supabase
        .from("events")
        .select("title, location, latitude, longitude")
        .eq("id", eventId)
        .single();

      if (data) setEvent(data);
      if (error) console.error("Event not found:", error.message);
      setLoading(false);
    };
    init();
  }, [eventId]);

  const getUserLocation = () =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("location_unavailable"));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => {
          if (err.code === 1) reject(new Error("location_denied"));
          else if (err.code === 2) reject(new Error("location_unavailable"));
          else reject(new Error("location_timeout"));
        },
        { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
      );
    });

  function getDistanceInMeters(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const toRad = (d) => (d * Math.PI) / 180;
    const φ1 = toRad(lat1), φ2 = toRad(lat2);
    const Δφ = toRad(lat2 - lat1), Δλ = toRad(lon2 - lon1);
    const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  const handleCheckIn = async () => {
    setStatus("loading");
    try {
      const userLocation = await getUserLocation();

      if (!event.latitude || !event.longitude) {
        setModalType("error");
        setErrorMsg("Event location is not configured. Please contact the parish admin.");
        setStatus("error");
        return;
      }

      const distance = getDistanceInMeters(
        userLocation.lat, userLocation.lng,
        event.latitude,   event.longitude
      );

      if (distance > 150) {
        setModalType("too_far");
        setStatus("error");
        return;
      }

      if (guestInfo) {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/submit-guest-form`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON },
          body: JSON.stringify({
            table: "attendance",
            payload: {
              event_id: eventId,
              is_guest: true,
              guest_name: `${guestInfo.firstName} ${guestInfo.lastName}`.trim(),
              guest_contact: guestInfo.contactNumber || null,
            },
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (res.status === 409 || json.error === "already_checked_in") {
          setModalType("duplicate");
          setStatus("error");
          return;
        }
        if (!res.ok) throw new Error(json.error || "Check-in failed.");
      } else {
        const { error } = await supabase.from("attendance").insert([{
          user_id: session.user.id,
          event_id: eventId,
        }]);
        if (error) {
          if (error.code === "23505") {
            setModalType("duplicate");
            setStatus("error");
            return;
          }
          throw error;
        }
      }

      setModalType("success");
      setStatus("idle");
    } catch (err) {
      if (err.message === "location_denied") {
        setModalType("location_denied");
      } else if (err.message === "location_unavailable") {
        setModalType("error");
        setErrorMsg("Your device could not determine your location. Please move to an open area and try again.");
      } else if (err.message === "location_timeout") {
        setModalType("error");
        setErrorMsg("Location request timed out. Move to an open area (away from roofs or buildings) and try again.");
      } else {
        setModalType("error");
        setErrorMsg(err.message || "Something went wrong. Please try again.");
      }
      setStatus("error");
    }
  };

  const handleGuestSubmit = (e) => {
    e.preventDefault();
    setGuestInfo({ firstName: guestForm.firstName.trim(), lastName: guestForm.lastName.trim(), contactNumber: guestForm.contactNumber.trim() });
  };

  const closeModal = () => {
    setModalType(null);
    setErrorMsg("");
    if (status === "error") setStatus("idle");
  };

  // ── LOADING ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F6F5ED]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B59E74]"></div>
    </div>
  );

  // ── NOT LOGGED IN ──────────────────────────────────────────────────────────
  if (!session && !guestInfo) {
    return (
      <div className="min-h-screen bg-[#F6F5ED] flex items-center justify-center p-6">
        <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl text-center max-w-sm border border-gray-100 w-full">
          <div className="text-6xl mb-6">🔑</div>
          <h2 className="text-2xl font-serif text-[#B59E74] uppercase tracking-widest mb-2">Login Required</h2>
          <p className="text-gray-500 italic mb-8 text-sm leading-relaxed">
            Sign in to your parish account to mark your attendance, or continue as a guest.
          </p>

          {!showGuestForm ? (
            <>
              <div className="flex flex-col gap-3">
                <Link
                  to={`/login?redirect=/check-in/${eventId}`}
                  className="block w-full bg-[#B59E74] text-white font-bold py-4 rounded-2xl uppercase tracking-widest shadow-lg hover:bg-[#9c8760] transition-all text-sm"
                >
                  Sign In
                </Link>
              </div>
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">or</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              <button
                onClick={() => setShowGuestForm(true)}
                className="w-full bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 font-bold py-3 rounded-2xl uppercase tracking-widest text-xs transition-all"
              >
                Continue as Guest
              </button>
              <p className="text-[11px] text-gray-400 italic mt-3">
                Guest attendance is recorded without an account.
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-5 text-left">
                <button onClick={() => setShowGuestForm(false)} className="text-gray-400 hover:text-gray-600 text-sm">← Back</button>
                <span className="text-xs font-bold text-gray-600 uppercase tracking-widest">Guest Details</span>
              </div>
              <form onSubmit={handleGuestSubmit} className="space-y-3 text-left">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">First Name *</label>
                  <input
                    type="text" required
                    value={guestForm.firstName}
                    onChange={e => setGuestForm(p => ({ ...p, firstName: e.target.value }))}
                    placeholder="First name"
                    className="w-full p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Last Name *</label>
                  <input
                    type="text" required
                    value={guestForm.lastName}
                    onChange={e => setGuestForm(p => ({ ...p, lastName: e.target.value }))}
                    placeholder="Last name"
                    className="w-full p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Contact Number</label>
                  <input
                    type="tel"
                    value={guestForm.contactNumber}
                    onChange={e => setGuestForm(p => ({ ...p, contactNumber: e.target.value }))}
                    placeholder="e.g. 09XX XXX XXXX"
                    className="w-full p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] text-sm"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-[#B59E74] text-white font-bold py-3 rounded-2xl uppercase tracking-widest shadow-md hover:bg-[#9c8760] transition-all text-sm mt-2"
                >
                  Continue →
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── INVALID EVENT ──────────────────────────────────────────────────────────
  if (!event) {
    return (
      <div className="min-h-screen bg-[#F6F5ED] flex items-center justify-center p-6">
        <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl text-center max-w-sm">
          <div className="text-6xl mb-6">⚠️</div>
          <h2 className="text-2xl font-serif text-red-600 uppercase tracking-widest mb-4">Invalid Event</h2>
          <p className="text-gray-500 italic mb-8">This QR code is either expired or does not exist in our system.</p>
          <Link to="/" className="text-[#B59E74] font-bold uppercase text-sm tracking-widest">Return Home</Link>
        </div>
      </div>
    );
  }

  // ── CHECK-IN SCREEN ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen w-full flex flex-col font-sans bg-[#F6F5ED]">
      <main className="flex-1 flex items-center justify-center p-6 pt-24">
        <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden border border-gray-100 text-center p-10">

          <div className="w-20 h-20 mx-auto rounded-full bg-[#F6F5ED] flex items-center justify-center text-4xl mb-6 border-2 border-[#B59E74]">
            ⛪
          </div>

          <h1 className="text-2xl font-serif text-gray-800 font-medium uppercase tracking-widest mb-2">
            {event.title}
          </h1>
          <p className="text-gray-400 italic mb-6">{event.location}</p>

          {/* Guest banner */}
          {guestInfo && (
            <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-left">
              <span className="text-amber-500 text-lg shrink-0">👤</span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Checking in as Guest</p>
                <p className="text-sm text-amber-700 font-medium">{guestInfo.firstName} {guestInfo.lastName}</p>
              </div>
              <button
                onClick={() => { setGuestInfo(null); setShowGuestForm(false); }}
                className="text-amber-400 hover:text-amber-600 text-xs shrink-0"
              >
                ✕
              </button>
            </div>
          )}

          <button
            onClick={() => setShowLocationPrompt(true)}
            disabled={status === "loading"}
            className="w-full bg-[#B59E74] hover:bg-[#9c8760] text-white font-bold py-6 rounded-3xl text-xl uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 disabled:opacity-50"
          >
            {status === "loading" ? "Processing..." : "Tap to Mark Presence"}
          </button>

          <div className="mt-10 text-gray-400 text-xs uppercase tracking-widest">
            San Pedro Bautista Parish System
          </div>
        </div>
      </main>

      {/* ── LOCATION PERMISSION PROMPT ── */}
      {showLocationPrompt && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl text-center p-10 border border-gray-100">
            <div className="w-16 h-16 mx-auto rounded-full bg-[#F6F5ED] flex items-center justify-center text-3xl mb-5 border-2 border-[#B59E74]">
              📍
            </div>
            <h2 className="text-xl font-serif text-gray-800 uppercase tracking-widest mb-2">
              Allow Location Access
            </h2>
            <p className="text-gray-500 italic text-sm leading-relaxed mb-6">
              <span className="font-semibold text-gray-700">San Pedro Bautista Parish System</span> needs your location to confirm you are physically present at <span className="font-semibold text-gray-700">{event?.title}</span>.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowLocationPrompt(false);
                  setModalType("location_denied");
                }}
                className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-gray-500 font-bold text-xs uppercase tracking-widest hover:bg-gray-50 transition-all"
              >
                Don&apos;t Allow
              </button>
              <button
                onClick={() => {
                  setShowLocationPrompt(false);
                  handleCheckIn();
                }}
                className="flex-1 py-3 rounded-2xl bg-[#B59E74] hover:bg-[#9c8760] text-white font-bold text-xs uppercase tracking-widest shadow-md transition-all"
              >
                Allow
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SUCCESS MODAL ── */}
      {modalType === "success" && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl text-center p-10 border border-gray-100">
            <div className="text-7xl mb-6">✅</div>
            <h2 className="text-2xl font-serif text-green-600 uppercase tracking-widest mb-3">
              Check-in Complete!
            </h2>
            <p className="text-gray-500 italic mb-8 leading-relaxed">
              God bless! Your attendance for <span className="font-semibold text-gray-700">{event.title}</span> has been recorded.
            </p>
            <button
              onClick={closeModal}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-2xl uppercase tracking-widest shadow-md transition-all text-sm"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* ── TOO FAR MODAL ── */}
      {modalType === "too_far" && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl text-center p-10 border border-gray-100">
            <div className="text-7xl mb-6">📍</div>
            <h2 className="text-2xl font-serif text-orange-500 uppercase tracking-widest mb-3">
              Not in Location
            </h2>
            <p className="text-gray-500 italic mb-2 leading-relaxed">
              You must be within <span className="font-bold text-gray-700">150 meters</span> of the event venue to check in.
            </p>
            <p className="text-gray-400 text-sm mb-8">
              Please move closer to the event location and try again.
            </p>
            <button
              onClick={closeModal}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-2xl uppercase tracking-widest shadow-md transition-all text-sm"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* ── ALREADY CHECKED IN MODAL ── */}
      {modalType === "duplicate" && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl text-center p-10 border border-gray-100">
            <div className="text-7xl mb-6">🙏</div>
            <h2 className="text-2xl font-serif text-[#B59E74] uppercase tracking-widest mb-3">
              Already Checked In
            </h2>
            <p className="text-gray-500 italic mb-8 leading-relaxed">
              Your attendance for <span className="font-semibold text-gray-700">{event.title}</span> is already recorded. God bless!
            </p>
            <button
              onClick={closeModal}
              className="w-full bg-[#B59E74] hover:bg-[#9c8760] text-white font-bold py-4 rounded-2xl uppercase tracking-widest shadow-md transition-all text-sm"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* ── LOCATION DENIED MODAL ── */}
      {modalType === "location_denied" && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl text-center p-10 border border-gray-100">
            <div className="text-7xl mb-6">📵</div>
            <h2 className="text-2xl font-serif text-red-600 uppercase tracking-widest mb-3">
              Location Blocked
            </h2>
            <p className="text-gray-500 italic mb-4 leading-relaxed">
              Location access was denied. You must allow location permission to check in.
            </p>
            <div className="bg-blue-50 rounded-2xl p-4 text-left mb-3 space-y-1.5">
              <p className="text-xs font-bold text-blue-700 uppercase tracking-widest mb-2">iPhone / iPad (Safari)</p>
              <p className="text-xs text-gray-600">1. Open the <span className="font-semibold">Settings</span> app.</p>
              <p className="text-xs text-gray-600">2. Scroll down and tap <span className="font-semibold">Safari</span>.</p>
              <p className="text-xs text-gray-600">3. Tap <span className="font-semibold">Location</span> → select <span className="font-semibold text-green-600">Allow</span>.</p>
              <p className="text-xs text-gray-600">4. Return here and tap check-in again.</p>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4 text-left mb-4 space-y-1.5">
              <p className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-2">Android / Chrome</p>
              <p className="text-xs text-gray-500">1. Tap the <span className="font-semibold text-gray-700">lock 🔒</span> icon in the address bar.</p>
              <p className="text-xs text-gray-500">2. Tap <span className="font-semibold text-gray-700">Location</span> → set to <span className="font-semibold text-green-600">Allow</span>.</p>
              <p className="text-xs text-gray-500">3. Reload and try again.</p>
            </div>
            <p className="text-[11px] text-amber-600 italic mb-4">
              ⚠️ If you scanned the QR with a camera app, open this link in <span className="font-semibold">Safari</span> (iPhone) or <span className="font-semibold">Chrome</span> (Android) instead.
            </p>
            <button
              onClick={closeModal}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-4 rounded-2xl uppercase tracking-widest shadow-md transition-all text-sm"
            >
              Got It
            </button>
          </div>
        </div>
      )}

      {/* ── GENERIC ERROR MODAL ── */}
      {modalType === "error" && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl text-center p-10 border border-gray-100">
            <div className="text-7xl mb-6">⚠️</div>
            <h2 className="text-2xl font-serif text-red-600 uppercase tracking-widest mb-3">
              Check-in Failed
            </h2>
            <p className="text-gray-500 italic mb-8 leading-relaxed">{errorMsg}</p>
            <button
              onClick={closeModal}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-4 rounded-2xl uppercase tracking-widest shadow-md transition-all text-sm"
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CheckInPage;
