import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient'; 

function UpcomingEvents() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    // --- FETCH DATA ON LOAD ---
    useEffect(() => {
        const fetchEvents = async () => {
            const today = new Date().toISOString().split('T')[0];
            const { data, error } = await supabase
                .from('events')
                .select('*')
                .gte('event_date', today)
                .order('event_date', { ascending: true })
                .limit(4); // Show the next 4 upcoming events

            if (data) setEvents(data);
            setLoading(false);
        };

        fetchEvents();
    }, []);

    // Helper to format "14:30:00" to "2:30 PM"
    const formatTime = (timeStr) => {
        if (!timeStr) return '';
        const [h, m] = timeStr.split(':');
        let hours = parseInt(h, 10);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        return `${hours}:${m} ${ampm}`;
    };

    // Parallax background
    const backgroundStyle = {
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.6)), url('src/assets/Images/church2.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
    };

    // Helper component for each event row
    const EventCard = ({ day, month, title, time, location }) => (
        <div className="flex flex-col md:flex-row w-full mb-6 shadow-lg hover:shadow-2xl transition-shadow duration-300">
            <div className="bg-[#B59E74] w-full md:w-32 flex flex-col justify-center items-center py-6 text-white shrink-0">
                <span className="text-4xl md:text-5xl font-bold leading-none mb-1">{day}</span>
                <span className="text-sm md:text-base font-bold tracking-widest uppercase">{month}</span>
            </div>
            <div className="flex-1 border border-white/80 md:border-l-0 flex flex-col lg:flex-row lg:items-center justify-between p-6 gap-6 bg-transparent backdrop-blur-sm">
                <h3 className="text-white font-bold text-xl md:text-2xl tracking-wide lg:w-1/3 text-left">
                    {title}
                </h3>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 lg:gap-10">
                    <div className="flex items-center gap-4">
                        <svg className="w-8 h-8 text-[#B59E74] shrink-0 font-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-white font-serif italic text-sm md:text-base opacity-90 max-w-[120px] leading-tight text-left">
                            {time}
                        </span>
                    </div>
                    <div className="hidden sm:block w-px h-12 bg-white/40"></div>
                    <div className="flex items-center gap-4">
                        <svg className="w-8 h-8 text-[#B59E74] shrink-0 font-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
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
        <section style={backgroundStyle} className="relative w-full py-24 px-6 md:px-12">
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
                        events.map(ev => {
                            const dateObj = new Date(ev.event_date);
                            const day = dateObj.toLocaleDateString('en-US', { day: '2-digit' });
                            const month = dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
                            
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
                        })
                    )}
                </div>
            </div>
        </section>
    );
}

export default UpcomingEvents;