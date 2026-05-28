import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import GenerateEventQR from "./Auth/GenerateEventQR";

function AdminQRCenter() {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState("ascending");
  const [dateFilter, setDateFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    const _d = new Date();
    const today = `${_d.getFullYear()}-${String(_d.getMonth()+1).padStart(2,'0')}-${String(_d.getDate()).padStart(2,'0')}`;
    const { data } = await supabase
      .from("events")
      .select("id, title, event_date")
      .gte("event_date", today)
      .not("status", "in", '("Cancelled","Rejected")')
      .order("event_date", { ascending: true });

    setEvents(data || []);
    setLoading(false);
  };

  const getFilteredEvents = () => {
    let filtered = [...events];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dateFilter !== "all") {
      const filterStart = new Date(today);
      let filterEnd = new Date(today);

      switch (dateFilter) {
        case "week":
          filterEnd.setDate(filterEnd.getDate() + 7);
          break;
        case "month":
          filterEnd.setMonth(filterEnd.getMonth() + 1);
          break;
        case "today":
          filterEnd.setDate(filterEnd.getDate() + 1);
          break;
        default:
          break;
      }

      filtered = filtered.filter(ev => {
        const eventDate = new Date(ev.event_date);
        return eventDate >= filterStart && eventDate < filterEnd;
      });
    }

    // Apply sort
    filtered.sort((a, b) => {
      const dateA = new Date(a.event_date);
      const dateB = new Date(b.event_date);
      return sortOrder === "ascending" ? dateA - dateB : dateB - dateA;
    });

    return filtered;
  };

  const filteredEvents = getFilteredEvents();
  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginatedEvents = filteredEvents.slice(startIdx, startIdx + itemsPerPage);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [sortOrder, dateFilter]);

  const _now = new Date();
  const todayLocal = `${_now.getFullYear()}-${String(_now.getMonth()+1).padStart(2,'0')}-${String(_now.getDate()).padStart(2,'0')}`;

  const canGenerateQR = selectedEvent?.event_date ? selectedEvent.event_date <= todayLocal : false;

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F5ED]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B59E74]"></div>
      </div>
    );

  return (
    <div className="min-h-screen bg-[#F6F5ED] flex flex-col font-sans">
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 pt-28 pb-12">

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
          <div className="flex flex-col gap-8">

            {/* Filter & Sort Controls */}
            <div className="w-full space-y-4">
              {/* Date Filter Buttons */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block">
                  Filter by Date
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: "all", label: "All" },
                    { key: "today", label: "Today" },
                    { key: "week", label: "This Week" },
                    { key: "month", label: "This Month" },
                  ].map(filter => (
                    <button
                      key={filter.key}
                      onClick={() => setDateFilter(filter.key)}
                      className={`px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                        dateFilter === filter.key
                          ? "bg-[#B59E74] text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort Order Toggle */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                  Sort Order
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSortOrder("ascending")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                      sortOrder === "ascending"
                        ? "bg-[#B59E74] text-white"
                        : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    ⬆ Earliest
                  </button>
                  <button
                    onClick={() => setSortOrder("descending")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                      sortOrder === "descending"
                        ? "bg-[#B59E74] text-white"
                        : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    ⬇ Latest
                  </button>
                </div>
              </div>
            </div>

            {/* Main Content Area - Two Column Layout */}
            <div className="flex gap-8">
              {/* Left Side - Events List */}
              <div className="flex-1 min-w-0">
                <div className="space-y-3">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block">
                    Select Event
                  </label>

                  {filteredEvents.length === 0 ? (
                    <div className="text-center py-8 px-4 border border-gray-200 rounded-xl bg-gray-50">
                      <p className="text-gray-400 italic">No events found with current filters.</p>
                    </div>
                  ) : (
                    <>
                      {/* Event List */}
                      <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-200 bg-white">
                        {paginatedEvents.map(event => (
                          <button
                            key={event.id}
                            onClick={() => setSelectedEvent(event)}
                            className={`w-full p-4 text-left transition-all hover:bg-[#B59E74]/5 ${
                              selectedEvent?.id === event.id
                                ? "bg-[#B59E74]/10 border-l-4 border-[#B59E74]"
                                : ""
                            }`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-gray-800 text-sm md:text-base truncate">{event.title}</h3>
                                <p className="text-xs text-gray-500 mt-1">
                                  📅 {new Date(event.event_date).toLocaleDateString("en-US", {
                                    weekday: "short",
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric"
                                  })}
                                </p>
                              </div>
                              {selectedEvent?.id === event.id && (
                                <span className="text-[#B59E74] font-bold text-lg flex-shrink-0">✓</span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>

                      {/* Pagination Controls */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 mt-4">
                          <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className={`px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                              currentPage === 1
                                ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                          >
                            ← Prev
                          </button>

                          <div className="flex gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                              <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                                  currentPage === page
                                    ? "bg-[#B59E74] text-white"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                              >
                                {page}
                              </button>
                            ))}
                          </div>

                          <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className={`px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                              currentPage === totalPages
                                ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                          >
                            Next →
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Right Side - QR Display */}
              <div className="flex-1 min-w-0 flex items-center justify-center">
                {selectedEvent ? (
                  canGenerateQR ? (
                    <div className="animate-fade-in w-full flex justify-center">
                      <GenerateEventQR
                        eventId={selectedEvent.id}
                        eventTitle={selectedEvent.title}
                      />
                    </div>
                  ) : (
                    <div className="text-center py-12 px-6 border-2 border-dashed border-gray-200 rounded-[2rem] w-full">
                      <p className="text-gray-400 italic">
                        QR Code will be available once the event starts.
                      </p>
                    </div>
                  )
                ) : (
                  <div className="text-center py-12 px-6 border-2 border-dashed border-gray-200 rounded-[2rem] w-full">
                    <div className="text-4xl mb-4">🖼️</div>
                    <p className="text-gray-400 italic">
                      Select an event from the list to generate the QR code.
                    </p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}

export default AdminQRCenter;
