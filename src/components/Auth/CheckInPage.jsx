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
  const [status, setStatus]             = useState("idle"); // idle | loading | success | error

  const [guestInfo, setGuestInfo]       = useState(null);  // { firstName, lastName } after form
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [guestForm, setGuestForm]       = useState({ firstName: "", lastName: "" });

  useEffect(() => {
    const init = async () => {
      const { data: { session: s } } = await supabase.auth.getSession();
      setSession(s);

      // Always fetch the event so guests also see it
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
    new Promise((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => reject(err)
      )
    );

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
        throw new Error("Event location is not configured.");
      }

      const distance = getDistanceInMeters(
        userLocation.lat, userLocation.lng,
        event.latitude,   event.longitude
      );

      if (distance > 100) {
        throw new Error("You are too far from the event location to check in.");
      }

      if (guestInfo) {
        // Guest — use edge function (service role, bypasses RLS)
        const res = await fetch(`${SUPABASE_URL}/functions/v1/submit-guest-form`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": SUPABASE_ANON,
          },
          body: JSON.stringify({
            table: "attendance",
            payload: {
              event_id: eventId,
              is_guest: true,
              guest_name: `${guestInfo.firstName} ${guestInfo.lastName}`.trim(),
            },
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || "Check-in failed.");
      } else {
        // Authenticated user
        const { error } = await supabase.from("attendance").insert([{
          user_id: session.user.id,
          event_id: eventId,
        }]);
        if (error) {
          if (error.code === "23505") throw new Error("You have already checked in for this event!");
          throw error;
        }
      }

      setStatus("success");
    } catch (err) {
      alert(err.message || "Location access is required to check in.");
      setStatus("error");
    }
  };

  const handleGuestSubmit = (e) => {
    e.preventDefault();
    setGuestInfo({ firstName: guestForm.firstName.trim(), lastName: guestForm.lastName.trim() });
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
                  to="/login"
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

          {status === "success" ? (
            <div className="animate-fade-in py-10">
              <div className="text-7xl mb-6">✅</div>
              <h2 className="text-2xl font-serif text-green-600 font-medium uppercase tracking-widest mb-4">
                Check-in Complete!
              </h2>
              <p className="text-gray-500 italic text-lg">God bless! Your attendance is recorded.</p>
            </div>
          ) : (
            <button
              onClick={handleCheckIn}
              disabled={status === "loading"}
              className="w-full bg-[#B59E74] hover:bg-[#9c8760] text-white font-bold py-6 rounded-3xl text-xl uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 disabled:opacity-50"
            >
              {status === "loading" ? "Processing..." : "Tap to Mark Presence"}
            </button>
          )}

          <div className="mt-10 text-gray-400 text-xs uppercase tracking-widest">
            San Pedro Bautista Parish System
          </div>
        </div>
      </main>
    </div>
  );
}

export default CheckInPage;
