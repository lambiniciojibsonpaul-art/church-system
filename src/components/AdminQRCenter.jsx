import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import GenerateEventQR from "./Auth/GenerateEventQR";

function EventSearchSelect({ events, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const selected = events.find(ev => ev.id.toString() === (value?.toString() || ""));
  const filtered = events.filter(ev =>
    ev.title.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else setSearch("");
  }, [open]);

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-4 rounded-2xl border-2 border-gray-100 focus:border-[#B59E74] outline-none bg-gray-50 font-medium transition-all text-left"
      >
        <span className={selected ? "text-gray-800" : "text-gray-400"}>
          {selected ? selected.title : "-- Select an Event --"}
        </span>
        <span className="text-gray-400 ml-2">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-gray-200 bg-gray-50 focus-within:ring-2 focus-within:ring-[#B59E74]">
              <span className="text-gray-400 text-sm">🔍</span>
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search event..."
                className="flex-1 outline-none text-sm text-gray-700 bg-transparent"
              />
              {search && (
                <button type="button" onClick={() => setSearch("")} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
              )}
            </div>
          </div>
          <ul className="max-h-56 overflow-y-auto">
            <li
              className="px-4 py-2.5 text-sm text-gray-400 italic cursor-pointer hover:bg-gray-50"
              onClick={() => { onChange(null); setOpen(false); }}
            >
              -- Select an Event --
            </li>
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-sm text-gray-400 italic text-center">No events found</li>
            ) : (
              filtered.map(ev => (
                <li
                  key={ev.id}
                  onClick={() => { onChange(ev); setOpen(false); }}
                  className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-[#B59E74]/10 hover:text-[#B59E74] transition-colors ${value?.id === ev.id ? "bg-[#B59E74]/10 text-[#B59E74] font-medium" : "text-gray-700"}`}
                >
                  {ev.title}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function AdminQRCenter() {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("events")
      .select("id, title, event_date")
      .gte("event_date", today)
      .not("status", "in", '("Cancelled","Rejected")')
      .order("event_date", { ascending: true });

    setEvents(data || []);
    setLoading(false);
  };

  const now = new Date();
  const eventTime = selectedEvent?.event_date
    ? new Date(selectedEvent.event_date)
    : null;

  const canGenerateQR = eventTime ? now >= eventTime : false;

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F5ED]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B59E74]"></div>
      </div>
    );

  return (
    <div className="min-h-screen bg-[#F6F5ED] flex flex-col font-sans">
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 pt-28 pb-12">

        {/* Breadcrumb */}
        <div className="flex gap-4 mb-6 border-b border-gray-200 pb-3">
          <Link to="/admin" className="text-gray-500 hover:text-[#B59E74] font-bold uppercase tracking-widest text-sm transition-colors">Dashboard</Link>
          <span className="text-gray-300">|</span>
          <span className="text-[#B59E74] font-bold uppercase tracking-widest text-sm border-b-2 border-[#B59E74] pb-3 -mb-[13px]">QR Codes</span>
        </div>

        <div className="text-center mb-12">
          <h1 className="text-3xl font-serif text-[#B59E74] uppercase tracking-widest mb-2">
            QR Code Generator
          </h1>
          <p className="text-gray-500 italic">
            Generate printable check-in codes for your events.
          </p>
        </div>

        <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 p-8 md:p-12">
          <div className="flex flex-col items-center gap-8">

            {/* Event Selection */}
            <div className="w-full max-w-md space-y-3">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block text-center">
                Select Event to Generate QR
              </label>
              <EventSearchSelect
                events={events}
                value={selectedEvent}
                onChange={setSelectedEvent}
              />
            </div>

            {/* QR Display Area */}
            <div className="w-full flex justify-center mt-6">
              {selectedEvent ? (
                canGenerateQR ? (
                  <div className="animate-fade-in">
                    <GenerateEventQR
                      eventId={selectedEvent.id}
                      eventTitle={selectedEvent.title}
                    />
                  </div>
                ) : (
                  <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-[2rem] w-full max-w-md">
                    <p className="text-gray-400 italic">
                      QR Code will be available once the event starts.
                    </p>
                  </div>
                )
              ) : (
                <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-[2rem] w-full max-w-md">
                  <div className="text-4xl mb-4">🖼️</div>
                  <p className="text-gray-400 italic">
                    Select an event above to generate the QR code.
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}

export default AdminQRCenter;
