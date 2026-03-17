function UpcomingEvents() {
    // Parallax background using the new image
    const backgroundStyle = {
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.4)), url('src/assets/Images/church2.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed', // This creates the scrolling effect
    };

    // Helper component for each event row
    const EventCard = ({ day, month, title, time, location }) => (
        <div className="flex flex-col md:flex-row w-full mb-6 shadow-lg hover:shadow-2xl transition-shadow duration-300">
            
            {/* Dark Blue Date Block */}
            <div className="bg-[#243E6E] w-full md:w-32 flex flex-col justify-center items-center py-6 text-white shrink-0">
                <span className="text-4xl md:text-5xl font-bold leading-none mb-1">{day}</span>
                <span className="text-sm md:text-base font-bold tracking-widest uppercase">{month}</span>
            </div>

            {/* Transparent Details Block with Borders (Glassmorphism removed) */}
            <div className="flex-1 border border-white/80 md:border-l-0 flex flex-col lg:flex-row lg:items-center justify-between p-6 gap-6 bg-transparent">
                
                {/* Event Title */}
                <h3 className="text-white font-bold text-xl md:text-2xl tracking-wide lg:w-1/3 text-left">
                    {title}
                </h3>

                {/* Info Container (Time & Location) */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 lg:gap-10">
                    
                    {/* Time */}
                    <div className="flex items-center gap-4">
                        {/* Clock Icon Placeholder */}
                        <svg className="w-8 h-8 text-white shrink-0 font-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-white font-serif italic text-sm md:text-base opacity-90 max-w-[120px] leading-tight text-left">
                            {time}
                        </span>
                    </div>

                    {/* Vertical Divider (Hidden on mobile, visible on larger screens) */}
                    <div className="hidden sm:block w-px h-12 bg-white/40"></div>

                    {/* Location */}
                    <div className="flex items-center gap-4">
                        {/* Pin Icon Placeholder */}
                        <svg className="w-8 h-8 text-white shrink-0 font-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
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
                
                {/* Section Title */}
                <h2 className="text-4xl md:text-5xl font-bold text-white mb-16 tracking-wide drop-shadow-md">
                    Upcoming Events
                </h2>
                
                {/* List of Events */}
                <div className="w-full flex flex-col gap-2">
                    <EventCard 
                        day="13" 
                        month="JULY" 
                        title="Community Day" 
                        time="9:00 AM - 3:00 PM" 
                        location="500 Terry Francine St, San Francisco" 
                    />
                    <EventCard 
                        day="20" 
                        month="JULY" 
                        title="Easter Warn Up Sermon" 
                        time="9:00 AM - 3:00 PM" 
                        location="500 Terry Francine St, San Francisco" 
                    />
                    <EventCard 
                        day="02" 
                        month="AUG" 
                        title="The Light Project" 
                        time="9:00 AM - 3:00 PM" 
                        location="500 Terry Francine St, San Francisco" 
                    />
                </div>

            </div>
        </section>
    );
}

export default UpcomingEvents;