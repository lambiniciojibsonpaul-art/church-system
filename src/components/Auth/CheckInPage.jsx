import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../../supabaseClient";

function CheckInPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("idle"); // idle, loading, success, error

  useEffect(() => {
    const initCheckIn = async () => {
      const { data: { session: userSession } } = await supabase.auth.getSession();
      setSession(userSession);

      if (userSession) {
        const { data, error } = await supabase
          .from("events")
          .select("title, location, latitude, longitude") // ✅ added lat/lng
          .eq("id", eventId)
          .single();

        if (data) setEvent(data);
        if (error) console.error("Event not found:", error.message);
      }

      setLoading(false);
    };

    initCheckIn();
  }, [eventId]);

  // ✅ GET USER LOCATION (one-time ping)
  const getUserLocation = () => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        (err) => reject(err)
      );
    });
  };

  // ✅ DISTANCE CALCULATOR
  function getDistanceInMeters(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const toRad = (deg) => (deg * Math.PI) / 180;

    const φ1 = toRad(lat1);
    const φ2 = toRad(lat2);
    const Δφ = toRad(lat2 - lat1);
    const Δλ = toRad(lon2 - lon1);

    const a =
      Math.sin(Δφ / 2) ** 2 +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  const handleCheckIn = async () => {
    setStatus("loading");

    try {
      // ✅ STEP 1: Get user location
      const userLocation = await getUserLocation();

      // ✅ STEP 2: Validate event has coordinates
      if (!event.latitude || !event.longitude) {
        throw new Error("Event location is not configured.");
      }

      // ✅ STEP 3: Calculate distance
      const distance = getDistanceInMeters(
        userLocation.lat,
        userLocation.lng,
        event.latitude,
        event.longitude
      );

      const MAX_DISTANCE = 100; // meters

      if (distance > MAX_DISTANCE) {
        throw new Error("You are too far from the event location to check in.");
      }

      // ✅ STEP 4: Insert attendance
      const { error } = await supabase.from("attendance").insert([
        {
          user_id: session.user.id,
          event_id: eventId
        }
      ]);

      if (error) {
        if (error.code === "23505") {
          throw new Error("You have already checked in for this event!");
        }
        throw error;
      }

      setStatus("success");

    } catch (err) {
      alert(err.message || "Location access is required to check in.");
      setStatus("error");
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F6F5ED]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B59E74]"></div>
    </div>
  );

  // UI STATE 1: NOT LOGGED IN
  if (!session) {
    return (
      <div className="min-h-screen bg-[#F6F5ED] flex items-center justify-center p-6">
        <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl text-center max-w-sm border border-gray-100">
          <div className="text-6xl mb-6">🔑</div>
          <h2 className="text-2xl font-serif text-[#B59E74] uppercase tracking-widest mb-4">Login Required</h2>
          <p className="text-gray-500 italic mb-8">Please sign in to your parish account to mark your attendance.</p>
          <Link
            to="/login"
            className="block w-full bg-[#B59E74] text-white font-bold py-4 rounded-2xl uppercase tracking-widest shadow-lg hover:bg-[#9c8760] transition-all"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  // UI STATE 2: EVENT NOT FOUND
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
          <p className="text-gray-400 italic mb-10">{event.location}</p>

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