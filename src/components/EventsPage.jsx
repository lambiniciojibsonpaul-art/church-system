import { useState, useEffect } from "react";
import { restSelect, restInsert } from "../supabaseRest";
import { useAuth } from "../contexts/useAuth";
import church1 from "../assets/Images/church1.jpg";

const EVENTS_CACHE_KEY = "eventsPage:events";
const EVENTS_CACHE_TTL_MS = 5 * 60 * 1000;
const EVENTS_FETCH_TIMEOUT_MS = 12000;

function readEventsCache() {
  try {
    const raw = sessionStorage.getItem(EVENTS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.events)) return null;
    if (Date.now() - parsed.ts > EVENTS_CACHE_TTL_MS) return null;
    return parsed.events;
  } catch {
    return null;
  }
}

function writeEventsCache(events) {
  try {
    sessionStorage.setItem(
      EVENTS_CACHE_KEY,
      JSON.stringify({ events, ts: Date.now() })
    );
  } catch { /* ignore */ }
}

function EventsPage() {
  const { user, isAdmin } = useAuth();
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState(today);

  const cachedEvents = readEventsCache();
  const [events, setEvents] = useState(cachedEvents || []);
  const [loading, setLoading] = useState(!cachedEvents);

  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    eventClass: "Mass",
    priestName: "Fr. Default Priest",
    eventDate: "", // <-- NEW: Added eventDate state
    eventTime: "",
    location: "",
    description: "",
    isInside: true,
  });

  // user/isAdmin come from AuthContext. Just fetch events.
  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    const { data, error } = await restSelect("events", {
      order: "event_time.asc",
      timeoutMs: EVENTS_FETCH_TIMEOUT_MS,
    });

    if (error) {
      console.warn("Events fetch failed:", error.message, "— showing cached data if any.");
    } else if (data) {
      setEvents(data);
      writeEventsCache(data);
    }
    setLoading(false);
  };

  // --- FORM SUBMISSION HANDLERS ---
  const handleChange = (e) => {
    const value =
      e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  // NEW: Function to open modal and pre-fill the selected date
  const handleOpenModal = () => {
    const yyyy = selectedDate.getFullYear();
    const mm = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const dd = String(selectedDate.getDate()).padStart(2, "0");

    setFormData({
      ...formData,
      eventDate: `${yyyy}-${mm}-${dd}`, // Automatically sets the form date to what you clicked!
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 1. Turn loading ON
    setSubmitting(true);

    try {
      const { error } = await restInsert("events", [
        {
          creator_id: user.id,
          title: formData.title,
          event_class: formData.eventClass,
          priest_name: formData.priestName,
          event_date: formData.eventDate,
          event_time: formData.eventTime,
          location: formData.location,
          description: formData.description,
          is_inside: formData.isInside,
        },
      ]);

      if (error) throw new Error(error.message);

      // 3. If successful, clean up the UI
      setIsModalOpen(false);
      fetchEvents(); 
      setFormData({
        ...formData,
        title: "",
        eventDate: "",
        eventTime: "",
        location: "", // Reset location
        description: "",
      });
      
    } catch (error) {
      // Catch any crash so the app survives
      console.error("Database Error:", error.message);
      alert("Failed to create event. The system said: " + error.message);
      
    } finally {
      // 4. ALWAYS turn the loading spinner OFF, no matter what happens
      setSubmitting(false);
    }
  };

  // --- CALENDAR HELPERS ---
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const getDaysInMonth = (year, month) =>
    new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const daysInMonth = getDaysInMonth(
    currentDate.getFullYear(),
    currentDate.getMonth(),
  );
  const firstDay = getFirstDayOfMonth(
    currentDate.getFullYear(),
    currentDate.getMonth(),
  );

  const blanks = Array.from({ length: firstDay }, () => null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const calendarGrid = [...blanks, ...days];

  const prevMonth = () =>
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1),
    );
  const nextMonth = () =>
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1),
    );

  const handleDayClick = (day) => {
    if (day)
      setSelectedDate(
        new Date(currentDate.getFullYear(), currentDate.getMonth(), day),
      );
  };

  const getEventsForDate = (dateToMatch) => {
    return events.filter((e) => {
      const eventDate = new Date(e.event_date + "T00:00:00");
      return eventDate.toDateString() === dateToMatch.toDateString();
    });
  };

  const selectedEvents = getEventsForDate(selectedDate);

  const formatTime = (timeStr) => {
    if (!timeStr) return "";
    const [h, m] = timeStr.split(":");
    let hours = parseInt(h, 10);
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${hours}:${m} ${ampm}`;
  };

  const backgroundStyle = {
    backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url('${church1}')`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundAttachment: "fixed",
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col font-sans bg-white">
      <main
        style={backgroundStyle}
        className="relative h-[60vh] md:h-screen flex flex-col items-center justify-center text-center px-4 text-white"
      >
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mt-16">
          Events
        </h1>
      </main>

      <section className="relative w-full z-20 -mt-24 pb-32 px-6">
        <div className="bg-[#F6F5ED] rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] max-w-7xl mx-auto py-12 px-6 md:px-12 text-left">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl text-[#B59E74] font-serif uppercase tracking-widest mb-6 font-medium">
              Church Calendar
            </h2>
            <p className="text-gray-600 font-serif italic text-lg">
              Stay connected with our parish family. Select a date on the
              calendar below to view upcoming masses, community gatherings, and
              special ceremonies.
            </p>
          </div>

          <hr className="border-gray-300 border-t w-full max-w-5xl mx-auto mb-12" />

          <div className="flex flex-col lg:flex-row gap-12 max-w-6xl mx-auto">
            <div className="flex-1 bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-[#B59E74]/20 h-fit">
              <div className="flex justify-between items-center mb-6">
                <button
                  onClick={prevMonth}
                  className="p-2 hover:bg-[#F6F5ED] rounded-full transition-colors text-[#B59E74]"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2.5}
                    stroke="currentColor"
                    className="w-6 h-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 19.5L8.25 12l7.5-7.5"
                    />
                  </svg>
                </button>
                <h3 className="text-2xl font-serif font-bold text-gray-800">
                  {monthNames[currentDate.getMonth()]}{" "}
                  {currentDate.getFullYear()}
                </h3>
                <button
                  onClick={nextMonth}
                  className="p-2 hover:bg-[#F6F5ED] rounded-full transition-colors text-[#B59E74]"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2.5}
                    stroke="currentColor"
                    className="w-6 h-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8.25 4.5l7.5 7.5-7.5 7.5"
                    />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-7 gap-2 text-center mb-4">
                {daysOfWeek.map((day) => (
                  <div
                    key={day}
                    className="text-xs font-bold uppercase tracking-widest text-gray-400"
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2 text-center">
                {calendarGrid.map((day, index) => {
                  if (!day)
                    return (
                      <div key={`blank-${index}`} className="h-12 w-12"></div>
                    );

                  const thisDate = new Date(
                    currentDate.getFullYear(),
                    currentDate.getMonth(),
                    day,
                  );
                  const isSelected =
                    selectedDate.toDateString() === thisDate.toDateString();
                  const hasEvent = getEventsForDate(thisDate).length > 0;
                  const isToday =
                    today.toDateString() === thisDate.toDateString();

                  return (
                    <button
                      key={day}
                      onClick={() => handleDayClick(day)}
                      className={`relative h-10 w-10 sm:h-12 sm:w-12 mx-auto flex items-center justify-center rounded-full text-sm sm:text-base font-medium transition-all duration-200
                                                ${isSelected ? "bg-[#B59E74] text-white shadow-md" : "text-gray-700 hover:bg-[#F6F5ED]"}
                                                ${isToday && !isSelected ? "border-2 border-[#B59E74] text-[#B59E74]" : ""}
                                            `}
                    >
                      {day}
                      {hasEvent && (
                        <span
                          className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white" : "bg-[#B59E74]"}`}
                        ></span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 flex flex-col gap-6">
              <div className="bg-[#B59E74] p-6 rounded-2xl shadow-sm text-white flex flex-col md:flex-row justify-between items-center md:items-start relative overflow-hidden">
                <div className="z-10 text-center md:text-left">
                  <span className="text-sm font-bold tracking-widest uppercase opacity-80 mb-1 block">
                    Schedule For
                  </span>
                  <h3 className="text-2xl lg:text-3xl font-serif font-medium">
                    {selectedDate.toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
                  </h3>
                </div>

                {isAdmin && (
                  <button
                    onClick={handleOpenModal} // <-- NEW: Calls our updated function
                    className="mt-4 md:mt-0 z-10 bg-white text-[#B59E74] hover:bg-gray-50 px-4 py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest shadow-sm transition-transform hover:scale-105 flex items-center gap-2"
                  >
                    <span className="text-lg leading-none">+</span> Add Event
                  </button>
                )}
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl"></div>
              </div>

              <div className="flex flex-col gap-4">
                {loading ? (
                  <div className="flex justify-center py-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#B59E74]"></div>
                  </div>
                ) : selectedEvents.length > 0 ? (
                  selectedEvents.map((event) => (
                    <div
                      key={event.id}
                      className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-4 animate-fade-in-up relative overflow-hidden group"
                    >
                      <div className="absolute top-4 right-4">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md ${event.event_class === "Mass" ? "bg-[#B59E74]/10 text-[#B59E74]" : "bg-gray-100 text-gray-600"}`}
                        >
                          {event.event_class}
                        </span>
                      </div>

                      <h4 className="text-2xl font-bold text-gray-800 pr-16">
                        {event.title}
                      </h4>

                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-sm text-gray-600 font-serif italic">
                        <div className="flex items-center gap-2">
                          <svg
                            className="w-5 h-5 text-[#B59E74]"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          {formatTime(event.event_time)}
                        </div>
                        <div className="hidden sm:block w-1 h-1 bg-gray-300 rounded-full"></div>
                        <div className="flex items-center gap-2">
                          <svg
                            className="w-5 h-5 text-[#B59E74]"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                          {event.location}
                        </div>
                      </div>
                      <p className="text-gray-700 leading-relaxed mt-2 text-sm">
                        {event.description}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="bg-transparent border-2 border-dashed border-[#B59E74]/30 rounded-2xl p-10 flex flex-col items-center justify-center text-center h-full min-h-[250px]">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1}
                      stroke="currentColor"
                      className="w-12 h-12 text-[#B59E74]/50 mb-4"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                      />
                    </svg>
                    <h4 className="text-xl font-serif text-gray-500 mb-2">
                      No Scheduled Events
                    </h4>
                    <p className="text-sm text-gray-400 italic">
                      There are no activities currently planned for this date.
                      Check back later or view another day!
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- ADMIN CREATE EVENT MODAL --- */}
      {isAdmin && isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-[#F6F5ED] w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl relative scrollbar-hidden">
            <div className="sticky top-0 bg-[#F6F5ED] px-8 py-6 z-10 flex justify-between items-center border-b border-gray-200 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#B59E74]/10 border border-[#B59E74]/30 flex items-center justify-center text-xl">
                  📅
                </div>
                <div>
                  <h2 className="text-xl font-serif text-[#B59E74] font-medium uppercase tracking-widest leading-none">
                    Create Event
                  </h2>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 text-gray-500 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Event Title *
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  value={formData.title}
                  onChange={handleChange}
                  className="p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#B59E74] outline-none"
                  placeholder="e.g., Youth Ministry Assembly"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Class *
                  </label>
                  <select
                    name="eventClass"
                    value={formData.eventClass}
                    onChange={handleChange}
                    className="p-3 rounded-xl border border-gray-300 outline-none"
                  >
                    <option value="Mass">Mass</option>
                    <option value="Custom">Custom Event</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Priest *
                  </label>
                  <select
                    name="priestName"
                    value={formData.priestName}
                    onChange={handleChange}
                    className="p-3 rounded-xl border border-gray-300 outline-none"
                  >
                    <option value="Fr. Default Priest">
                      Fr. Default Priest
                    </option>
                    <option value="Fr. Guest">Guest Priest</option>
                  </select>
                </div>
              </div>

              {/* NEW: Date and Time Side-by-Side */}
              <div className="grid grid-cols-2 gap-6">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Date *
                  </label>
                  <input
                    type="date"
                    name="eventDate"
                    required
                    value={formData.eventDate}
                    onChange={handleChange}
                    className="p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#B59E74] outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Time *
                  </label>
                  <input
                    type="time"
                    name="eventTime"
                    required
                    value={formData.eventTime}
                    onChange={handleChange}
                    className="p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#B59E74] outline-none"
                  />
                </div>
              </div>

              {/* NEW: Location and Setting Side-by-Side */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Location *
                  </label>
                  <input
                    type="text"
                    name="location"
                    required
                    value={formData.location}
                    onChange={handleChange}
                    className="p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#B59E74] outline-none"
                    placeholder="e.g., Main Altar"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Setting
                  </label>
                  <div className="flex items-center gap-4 mt-2 h-full">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        name="isInside"
                        checked={formData.isInside === true}
                        onChange={() =>
                          setFormData({ ...formData, isInside: true })
                        }
                        className="w-4 h-4 text-[#B59E74] focus:ring-[#B59E74]"
                      />{" "}
                      Sa Loob
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        name="isInside"
                        checked={formData.isInside === false}
                        onChange={() =>
                          setFormData({ ...formData, isInside: false })
                        }
                        className="w-4 h-4 text-[#B59E74] focus:ring-[#B59E74]"
                      />{" "}
                      Sa Labas
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="3"
                  className="p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#B59E74] outline-none resize-none"
                  placeholder="Optional details..."
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#B59E74] hover:bg-[#9c8760] text-white font-bold py-4 rounded-xl uppercase tracking-widest mt-4 shadow-md disabled:opacity-70 transition-colors"
              >
                {submitting ? "Saving..." : "Post Schedule"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default EventsPage;