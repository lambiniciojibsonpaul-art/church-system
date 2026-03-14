function ServicesDropdown({ onClose }) {
    // Helper component with slightly reduced icon size and text gap
    const ServiceItem = ({ title, tempIcon }) => (
        <div className="flex flex-col items-center gap-2 w-36">
            {/* Locked to w-20 h-20 to prevent it from ballooning on desktop */}
            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-3xl shadow-sm">
                {tempIcon}
            </div>
            <span className="text-sm font-medium text-center leading-tight">
                {title}
            </span>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 h-screen w-screen">
            
            <div className="bg-[#E4E4E4] w-full max-w-5xl rounded-3xl overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.6)] border border-gray-400 flex flex-col relative">
                
                {/* Header Section - Reduced vertical padding (py-4 instead of py-5) */}
                <div className="bg-[#E4E4E4] px-8 py-4 z-10 flex justify-between items-center border-b border-black/10">
                    <h2 className="text-2xl md:text-3xl font-serif tracking-widest uppercase text-black">
                        Services
                    </h2>
                    <button 
                        onClick={onClose}
                        className="w-8 h-8 border border-black flex items-center justify-center hover:bg-black hover:text-white transition-colors text-black bg-transparent rounded-md"
                        aria-label="Close Services Panel"
                    >
                        ✕
                    </button>
                </div>

                {/* Content Section - Reduced top and bottom padding */}
                <div className="px-8 pb-6 pt-4 text-black">
                    
                    {/* --- CATEGORY 1: Sacramental Services --- */}
                    {/* Reduced gap between rows to gap-4 */}
                    <div className="flex flex-col gap-4">
                        <h3 className="text-base font-serif italic text-center text-gray-700 tracking-wider uppercase mb-1">
                            Sacramental Services
                        </h3>
                        
                        {/* Row of 3 */}
                        <div className="flex flex-wrap justify-center gap-4 md:gap-16">
                            <ServiceItem title="Baptism Form" tempIcon="💧" />
                            <ServiceItem title="Holy Communion Form" tempIcon="🍞" />
                            <ServiceItem title="Confirmation Form" tempIcon="🕊️" />
                        </div>
                        
                        {/* Row of 2 */}
                        <div className="flex flex-wrap justify-center gap-4 md:gap-16">
                            <ServiceItem title="Wedding Registration Form" tempIcon="💍" />
                            <ServiceItem title="Sacraments & Liturgical Request" tempIcon="⛪" />
                        </div>
                    </div>

                    {/* --- CATEGORY 2: General Requests --- */}
                    {/* Reduced margin-top to mt-6 instead of mt-10 */}
                    <div className="flex flex-col mt-6 pb-2">
                        <h3 className="text-base font-serif italic text-center text-gray-700 tracking-wider uppercase mb-3">
                            General Requests
                        </h3>
                        
                        {/* Row of 3 */}
                        <div className="flex flex-wrap justify-center gap-4 md:gap-16">
                            <ServiceItem title="Mass Intention Form" tempIcon="🕯️" />
                            <ServiceItem title="Facilities Reservation Form" tempIcon="📅" />
                            <ServiceItem title="Certification Request Form" tempIcon="📜" />
                        </div>
                    </div>
                    
                </div>
            </div>
        </div>
    );
}

export default ServicesDropdown;