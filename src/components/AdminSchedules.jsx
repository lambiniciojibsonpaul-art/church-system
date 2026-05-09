import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { restSelect, restInsert } from "../supabaseRest";
import { useAuth } from "../contexts/useAuth";
import { ministryNames } from "../data/ministries";

function AdminSchedules() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State. `ministry` replaces the old `priestName` field — the chosen
  // ministry is what now hosts the event. We map it to the existing
  // `priest_name` DB column on insert to avoid a schema migration.
  const [formData, setFormData] = useState({
    title: "",
    ministry: "",
    eventDate: "",
    eventTime: "",
    location: "Main Altar",
    description: "",
    isInside: true,
  });

  // RequireAdmin gates the route. We just fetch events.
  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    const { data } = await restSelect("events", {
      order: "event_date.asc",
      timeoutMs: 12000,
    });
    if (data) setEvents(data);
    setLoading(false);
  };

  const handleChange = (e) => {
    const value =
      e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
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
          // event_class is no longer collected from the form. We send a
          // generic default so the column (which may be NOT NULL) is
          // satisfied without polluting reports/legacy queries.
          event_class: "Event",
          // priest_name column now stores the hosting ministry name.
          priest_name: formData.ministry,
          event_date: formData.eventDate,
          event_time: formData.eventTime,
          location: formData.location,
          description: formData.description,
          is_inside: formData.isInside,
        },
      ]);

      if (error) throw new Error(error.message);

      setIsModalOpen(false);
      fetchEvents();
      setFormData({
        ...formData,
        title: "",
        ministry: "",
        eventDate: "",
        eventTime: "",
        location: "Main Altar",
        description: "",
      });
      
    } catch (error) {
      // Catch any crash so the app survives
      console.error("Database Error:", error.message);
      alert("Failed to create schedule. The system said: " + error.message);
      
    } finally {
      // 4. ALWAYS turn the loading spinner OFF, no matter what happens
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B59E74]"></div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 pt-32 pb-12">
        {/* Admin Sub-Navigation (Like the sidebar in your image, but horizontal for now!) */}
        <div className="flex gap-4 mb-8 border-b border-gray-200 pb-4">
          <Link
            to="/admin"
            className="text-gray-500 hover:text-[#B59E74] font-bold uppercase tracking-widest text-sm transition-colors"
          >
            Requests Dashboard
          </Link>
          <span className="text-gray-300">|</span>
          <Link
            to="/admin/schedules"
            className="text-[#B59E74] font-bold uppercase tracking-widest text-sm border-b-2 border-[#B59E74] pb-4 -mb-[18px]"
          >
            Schedules & Events
          </Link>
        </div>

        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-serif text-gray-800 uppercase tracking-wide">
              Parish Schedules
            </h1>
            <p className="text-gray-500 font-serif italic mt-1">
              Manage upcoming masses and custom events.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-[#B59E74] hover:bg-[#9c8760] text-white px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-sm shadow-md transition-colors flex items-center gap-2"
          >
            <span>+</span> Create Schedule
          </button>
        </div>

        {/* Events List */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8">
          {events.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              <div className="text-4xl mb-4">📅</div>
              <h3 className="text-lg font-serif">No upcoming schedules.</h3>
              <p className="text-sm">
                Click "Create Schedule" to add a new event.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((ev) => (
                <div
                  key={ev.id}
                  className="border border-gray-100 rounded-2xl p-6 hover:shadow-md transition-shadow relative overflow-hidden group"
                >
                  <div
                    className={`absolute top-0 left-0 w-1 h-full ${ev.event_class === "Mass" ? "bg-[#B59E74]" : "bg-gray-800"}`}
                  ></div>
                  <div className="flex justify-between items-start mb-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md ${ev.event_class === "Mass" ? "bg-[#B59E74]/10 text-[#B59E74]" : "bg-gray-100 text-gray-600"}`}
                    >
                      {ev.event_class}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md ${ev.is_inside ? "bg-blue-50 text-blue-600" : "bg-green-50 text-green-600"}`}
                    >
                      {ev.is_inside ? "Indoor" : "Outdoor"}
                    </span>
                  </div>
                  <h3 className="text-xl font-serif text-gray-800 font-medium leading-tight mb-1">
                    {ev.title}
                  </h3>
                  <p className="text-sm text-gray-500 font-serif italic mb-4">
                    {ev.priest_name}
                  </p>

                  <div className="space-y-2 text-sm text-gray-600 border-t border-gray-50 pt-4">
                    <div className="flex items-center gap-2">
                      <span>🗓️</span>{" "}
                      {new Date(ev.event_date).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-2">
                      <span>⏰</span> {ev.event_time}
                    </div>
                    <div className="flex items-center gap-2">
                      <span>📍</span> {ev.location}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* --- CREATE EVENT MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl relative scrollbar-hidden">
            <div className="sticky top-0 bg-white px-8 py-6 z-10 flex justify-between items-center border-b border-gray-100">
              <h2 className="text-xl font-serif text-[#B59E74] uppercase tracking-widest">
                Create New Schedule
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-600 uppercase">
                  Event Title *
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  value={formData.title}
                  onChange={handleChange}
                  className="p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#B59E74] outline-none"
                  placeholder="e.g., Sunday Morning Mass"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-600 uppercase">
                  Hosting Ministry *
                </label>
                <select
                  name="ministry"
                  required
                  value={formData.ministry}
                  onChange={handleChange}
                  className="p-3 rounded-xl border border-gray-300 outline-none"
                >
                  <option value="" disabled>
                    Select a ministry…
                  </option>
                  {ministryNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600 uppercase">
                    Date *
                  </label>
                  <input
                    type="date"
                    name="eventDate"
                    required
                    value={formData.eventDate}
                    onChange={handleChange}
                    className="p-3 rounded-xl border border-gray-300 outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600 uppercase">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    name="eventTime"
                    required
                    value={formData.eventTime}
                    onChange={handleChange}
                    className="p-3 rounded-xl border border-gray-300 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div className="flex flex-col gap-1 col-span-2">
                  <label className="text-xs font-bold text-gray-600 uppercase">
                    Location *
                  </label>
                  <input
                    type="text"
                    name="location"
                    required
                    value={formData.location}
                    onChange={handleChange}
                    className="p-3 rounded-xl border border-gray-300 outline-none"
                    placeholder="e.g., Main Altar"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600 uppercase">
                    Setting
                  </label>
                  <div className="flex items-center gap-4 mt-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="isInside"
                        checked={formData.isInside === true}
                        onChange={() =>
                          setFormData({ ...formData, isInside: true })
                        }
                        className="text-[#B59E74] focus:ring-[#B59E74]"
                      />{" "}
                      Indoor
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="isInside"
                        checked={formData.isInside === false}
                        onChange={() =>
                          setFormData({ ...formData, isInside: false })
                        }
                        className="text-[#B59E74] focus:ring-[#B59E74]"
                      />{" "}
                      Outdoor
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-600 uppercase">
                  Description (Optional)
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="3"
                  className="p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#B59E74] outline-none resize-none"
                  placeholder="Additional details..."
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#B59E74] hover:bg-[#9c8760] text-white font-bold py-4 rounded-xl uppercase tracking-widest mt-4"
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

export default AdminSchedules;