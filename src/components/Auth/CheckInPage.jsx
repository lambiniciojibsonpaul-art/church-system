import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../../supabaseClient"; // FIXED: Changed from "../" to "../../" to reach src/
import Header from "../Header"; // FIXED: Changed from "./" to "../" to reach components/

function CheckInPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  
  const [session, setSession] = useState(null);
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("idle"); // idle, loading, success, error

  useEffect(() => {
    const initCheckIn = async () => {
      // 1. Check if user is logged in
      const { data: { session: userSession } } = await supabase.auth.getSession();
      setSession(userSession);

      if (userSession) {
        // 2. Fetch Event details to show the user what they are checking into
        const { data, error } = await supabase
          .from("events")
          .select("title, location")
          .eq("id", eventId)
          .single();
        
        if (data) setEvent(data);
        if (error) console.error("Event not found:", error.message);
      }
      setLoading(false);
    };

    initCheckIn();
  }, [eventId]);

  const handleCheckIn = async () => {
    setStatus("loading");
    try {
      // Insert record into attendance table
      const { error } = await supabase.from("attendance").insert([
        { 
          user_id: session.user.id, 
          event_id: eventId 
        }
      ]);

      if (error) {
        // Supabase Error 23505 = Unique Constraint Violation (User already checked in)
        if (error.code === "23505") {
          throw new Error("You have already checked in for this event!");
        }
        throw error;
      }

      setStatus("success");
    } catch (err) {
      alert(err.message);
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
      <Header />
      
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