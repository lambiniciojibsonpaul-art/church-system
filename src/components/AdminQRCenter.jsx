import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import GenerateEventQR from "./Auth/GenerateEventQR";

function AdminQRCenter() {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    const { data } = await supabase
      .from("events")
      .select("id, title")
      .order("title", { ascending: true });
    setEvents(data || []);
    setLoading(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F6F5ED]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B59E74]"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F6F5ED] flex flex-col font-sans">
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 pt-32 pb-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-serif text-[#B59E74] uppercase tracking-widest mb-2">
            QR Code Generator
          </h1>
          <p className="text-gray-500 italic">Generate printable check-in codes for your events.</p>
        </div>

        <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 p-8 md:p-12">
          <div className="flex flex-col items-center gap-8">
            
            {/* Event Selection */}
            <div className="w-full max-w-md space-y-3">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block text-center">
                Select Event to Generate QR
              </label>
              <select 
                className="w-full p-4 rounded-2xl border-2 border-gray-100 focus:border-[#B59E74] outline-none bg-gray-50 text-center font-medium transition-all appearance-none cursor-pointer"
                value={selectedEvent?.id || ""}
                onChange={(e) => {
                  const event = events.find(ev => ev.id === e.target.value);
                  setSelectedEvent(event);
                }}
              >
                <option value="">-- Select an Event --</option>
                {events.map(ev => (
                  <option key={ev.id} value={ev.id}>{ev.title}</option>
                ))}
              </select>
            </div>

            {/* QR Display Area */}
            <div className="w-full flex justify-center mt-6">
              {selectedEvent ? (
                <div className="animate-fade-in">
                  <GenerateEventQR 
                    eventId={selectedEvent.id} 
                    eventTitle={selectedEvent.title} 
                  />
                </div>
              ) : (
                <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-[2rem] w-full max-w-md">
                  <div className="text-4xl mb-4">🖼️</div>
                  <p className="text-gray-400 italic">Select an event above to generate the QR code.</p>
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