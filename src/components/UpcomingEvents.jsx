import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import church2 from "../assets/Images/church2.jpg";

const UP_PER_PAGE = 3;

function UpcomingEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  // --- FETCH DATA ON LOAD ---
  useEffect(() => {
    const fetchEvents = async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .gte("event_date", today)
        .order("event_date", { ascending: true })
        .limit(30);

      if (error) {
        console.warn("UpcomingEvents fetch failed:", error.message);
      }
      // Hide cancelled and private events from the public homepage list.
      const visible = (data || [])
        .filter((e) => (e.status || "Active") !== "Cancelled" && e.is_public !== false);
      setEvents(visible);
      setLoading(false);
    };

    fetchEvents();
  }, []);

  // Helper to format "14:30:00" to "2:30 PM"
  const formatTime = (timeStr) => {
    if (!timeStr) return "";
    const [h, m] = timeStr.split(":");
    let hours = parseInt(h, 10);
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${hours}:${m} ${ampm}`;
  };

  // Parallax background
  const backgroundStyle = {
    backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.6)), url('${church2}')`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundAttachment: "fixed",
  };

  // Helper component for each event row
  const EventCard = ({ day, month, title, time, location }) => (
    <div className="flex flex-col md:flex-row w-full mb-6 shadow-lg hover:shadow-2xl transition-shadow duration-300">
      <div className="bg-[#B59E74] w-full md:w-32 flex flex-col justify-center items-center py-6 text-white shrink-0">
        <span className="text-4xl md:text-5xl font-bold leading-none mb-1">
          {day}
        </span>
        <span className="text-sm md:text-base font-bold tracking-widest uppercase">
          {month}
        </span>
      </div>
      <div className="flex-1 border border-white/80 md:border-l-0 flex flex-col lg:flex-row lg:items-center justify-between p-6 gap-6 bg-transparent backdrop-blur-sm">
        <h3 className="text-white font-bold text-xl md:text-2xl tracking-wide lg:w-1/3 text-left">
          {title}
        </h3>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 lg:gap-10">
          <div className="flex items-center gap-4">
            <svg
              className="w-8 h-8 text-[#B59E74] shrink-0 font-light"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-white font-serif italic text-sm md:text-base opacity-90 max-w-[120px] leading-tight text-left">
              {time}
            </span>
          </div>
          <div className="hidden sm:block w-px h-12 bg-white/40"></div>
          <div className="flex items-center gap-4">
            <svg
              className="w-8 h-8 text-[#B59E74] shrink-0 font-light"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span className="text-white font-serif italic text-sm md:text-base opacity-90 max-w-[160px] leading-tight text-left">
              {location}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <section
      style={backgroundStyle}
      className="relative w-full py-24 px-6 md:px-12"
    >
      <div className="max-w-4xl mx-auto flex flex-col items-center">
        <h2 className="text-4xl md:text-5xl font-bold text-white tracking-wide drop-shadow-md text-center mb-16">
          Upcoming Events
        </h2>

        {/* Dynamic List of Events */}
        <div className="w-full flex flex-col gap-2">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin inline-block w-8 h-8 border-4 border-white border-t-transparent rounded-full"></div>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center text-white/70 py-12 font-serif italic text-lg">
              No upcoming events scheduled at this time.
            </div>
          ) : (
            <>
              {events.slice(page * UP_PER_PAGE, (page + 1) * UP_PER_PAGE).map((ev) => {
                const dateObj = new Date(ev.event_date);
                const day = dateObj.toLocaleDateString("en-US", { day: "2-digit" });
                const month = dateObj.toLocaleDateString("en-US", { month: "short" }).toUpperCase();

                return (
                  <EventCard
                    key={ev.id}
                    day={day}
                    month={month}
                    title={ev.title}
                    time={formatTime(ev.event_time)}
                    location={ev.location}
                  />
                );
              })}
              {Math.ceil(events.length / UP_PER_PAGE) > 1 && (
                <div className="flex items-center justify-between mt-6 px-1">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-white/15 text-white hover:bg-white/25 border border-white/30 backdrop-blur-sm"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                    Previous
                  </button>
                  <span className="text-white/70 text-xs font-medium tracking-widest">
                    {page + 1} / {Math.ceil(events.length / UP_PER_PAGE)}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(Math.ceil(events.length / UP_PER_PAGE) - 1, p + 1))}
                    disabled={page >= Math.ceil(events.length / UP_PER_PAGE) - 1}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-white/15 text-white hover:bg-white/25 border border-white/30 backdrop-blur-sm"
                  >
                    Next
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export default UpcomingEvents;
