import { useState } from 'react';
import Header from './Header';

function EventsPage() {
    // --- CALENDAR LOGIC & STATE ---
    const today = new Date();
    const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
    const [selectedDate, setSelectedDate] = useState(today);

    // Dynamic Dummy Events (Automatically places events in the current month so you can test them!)
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    
    const events = [
        {
            id: 1,
            date: new Date(currentYear, currentMonth, 13).toDateString(),
            title: "Community Day",
            time: "9:00 AM - 3:00 PM",
            location: "500 Terry Francine St, San Francisco",
            description: "Join us for a day of fellowship, food, and fun. All families and friends of the parish are welcome as we celebrate our vibrant community!"
        },
        {
            id: 2,
            date: new Date(currentYear, currentMonth, 20).toDateString(),
            title: "Easter Warm Up Sermon",
            time: "9:00 AM - 11:00 AM",
            location: "Main Sanctuary",
            description: "A special morning sermon to prepare our hearts and minds for the upcoming Easter celebrations. Guest speaker will be announced soon."
        },
        {
            id: 3,
            date: new Date(currentYear, currentMonth + 1, 2).toDateString(), // Next month!
            title: "The Light Project",
            time: "6:00 PM - 8:00 PM",
            location: "Parish Hall",
            description: "An evening of worship, acoustic music, and testimony aimed at the youth and young adults of our parish."
        }
    ];

    // Calendar Helpers
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
    const firstDay = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());

    // Generate the array of days for the grid
    const blanks = Array.from({ length: firstDay }, (_, i) => null);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const calendarGrid = [...blanks, ...days];

    // Handlers
    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    const handleDayClick = (day) => {
        if (day) setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
    };

    // Check if a specific day has an event
    const getEventsForDate = (dateToMatch) => {
        return events.filter(e => e.date === dateToMatch.toDateString());
    };

    const selectedEvents = getEventsForDate(selectedDate);

    // Parallax background style
    const backgroundStyle = {
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url('src/assets/Images/church1.jpg')`, // You can change this image!
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
    };

    return (
        <div className="relative min-h-screen w-full flex flex-col font-sans bg-white">
            
            <Header />

            {/* Hero Section */}
            <main style={backgroundStyle} className="relative h-[60vh] md:h-screen flex flex-col items-center justify-center text-center px-4 text-white">
                <h1 className="text-5xl md:text-7xl font-bold tracking-tight mt-16">
                    Events
                </h1>
            </main>

            {/* Floating Content Section */}
            <section className="relative w-full z-20 -mt-24 pb-32 px-6">
                <div className="bg-[#F6F5ED] rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] max-w-7xl mx-auto py-12 px-6 md:px-12 text-left">
                    
                    {/* Intro */}
                    <div className="text-center max-w-3xl mx-auto mb-12">
                        <h2 className="text-3xl md:text-4xl text-[#B59E74] font-serif uppercase tracking-widest mb-6 font-medium">
                            Church Calendar
                        </h2>
                        <p className="text-gray-600 font-serif italic text-lg">
                            Stay connected with our parish family. Select a date on the calendar below to view upcoming masses, community gatherings, and special ceremonies.
                        </p>
                    </div>

                    <hr className="border-gray-300 border-t w-full max-w-5xl mx-auto mb-12" />

                    {/* --- TWO-COLUMN CALENDAR LAYOUT --- */}
                    <div className="flex flex-col lg:flex-row gap-12 max-w-6xl mx-auto">
                        
                        {/* LEFT PANE: The Calendar */}
                        <div className="flex-1 bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-[#B59E74]/20 h-fit">
                            
                            {/* Calendar Header */}
                            <div className="flex justify-between items-center mb-6">
                                <button onClick={prevMonth} className="p-2 hover:bg-[#F6F5ED] rounded-full transition-colors text-[#B59E74]">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                                </button>
                                <h3 className="text-2xl font-serif font-bold text-gray-800">
                                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                                </h3>
                                <button onClick={nextMonth} className="p-2 hover:bg-[#F6F5ED] rounded-full transition-colors text-[#B59E74]">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                                </button>
                            </div>

                            {/* Days of Week */}
                            <div className="grid grid-cols-7 gap-2 text-center mb-4">
                                {daysOfWeek.map(day => (
                                    <div key={day} className="text-xs font-bold uppercase tracking-widest text-gray-400">
                                        {day}
                                    </div>
                                ))}
                            </div>

                            {/* Calendar Grid */}
                            <div className="grid grid-cols-7 gap-2 text-center">
                                {calendarGrid.map((day, index) => {
                                    if (!day) return <div key={`blank-${index}`} className="h-12 w-12"></div>;
                                    
                                    const thisDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                                    const isSelected = selectedDate.toDateString() === thisDate.toDateString();
                                    const hasEvent = getEventsForDate(thisDate).length > 0;
                                    const isToday = today.toDateString() === thisDate.toDateString();

                                    return (
                                        <button 
                                            key={day}
                                            onClick={() => handleDayClick(day)}
                                            className={`relative h-10 w-10 sm:h-12 sm:w-12 mx-auto flex items-center justify-center rounded-full text-sm sm:text-base font-medium transition-all duration-200
                                                ${isSelected ? 'bg-[#B59E74] text-white shadow-md' : 'text-gray-700 hover:bg-[#F6F5ED]'}
                                                ${isToday && !isSelected ? 'border-2 border-[#B59E74] text-[#B59E74]' : ''}
                                            `}
                                        >
                                            {day}
                                            {/* The Gold Event Dot! */}
                                            {hasEvent && (
                                                <span className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-[#B59E74]'}`}></span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* RIGHT PANE: Event Details */}
                        <div className="flex-1 flex flex-col gap-6">
                            
                            {/* Selected Date Header */}
                            <div className="bg-[#B59E74] p-6 rounded-2xl shadow-sm text-white flex flex-col justify-center items-center md:items-start">
                                <span className="text-sm font-bold tracking-widest uppercase opacity-80 mb-1">Schedule For</span>
                                <h3 className="text-3xl font-serif font-medium">
                                    {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                                </h3>
                            </div>

                            {/* Event Cards or Empty State */}
                            <div className="flex flex-col gap-4">
                                {selectedEvents.length > 0 ? (
                                    selectedEvents.map(event => (
                                        <div key={event.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-4 animate-fade-in-up">
                                            <h4 className="text-2xl font-bold text-gray-800">{event.title}</h4>
                                            
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-sm text-gray-600 font-serif italic">
                                                <div className="flex items-center gap-2">
                                                    <svg className="w-5 h-5 text-[#B59E74]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    {event.time}
                                                </div>
                                                <div className="hidden sm:block w-1 h-1 bg-gray-300 rounded-full"></div>
                                                <div className="flex items-center gap-2">
                                                    <svg className="w-5 h-5 text-[#B59E74]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                    {event.location}
                                                </div>
                                            </div>

                                            <p className="text-gray-700 leading-relaxed mt-2">
                                                {event.description}
                                            </p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="bg-transparent border-2 border-dashed border-[#B59E74]/30 rounded-2xl p-10 flex flex-col items-center justify-center text-center h-full min-h-[250px]">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-12 h-12 text-[#B59E74]/50 mb-4">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                                        </svg>
                                        <h4 className="text-xl font-serif text-gray-500 mb-2">No Scheduled Events</h4>
                                        <p className="text-sm text-gray-400 italic">There are no activities currently planned for this date. Check back later or view another day!</p>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </section>
        </div>
    );
}

export default EventsPage;