function ServicesDropdown({ onClose }) {
    // Helper component for the individual forms/icons
    const ServiceItem = ({ title, tempIcon }) => (
        <div className="flex flex-col items-center gap-3 w-40">
            {/* Black Square Placeholder */}
            <div className="w-20 h-20 md:w-24 md:h-24 bg-white rounded-3xl flex items-center justify-center text-white text-3xl shadow-md">
                {tempIcon}
            </div>
            <span className="text-sm font-medium text-center leading-tight">
                {title}
            </span>
        </div>
    );

    return (
        // 1. Changed to 'items-center' to perfectly center the modal on screen, removed top padding
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 h-screen w-screen">
            
            {/* 2. Removed max-h, overflow-y-auto. Added overflow-hidden to keep the rounded corners clean */}
            <div className="bg-[#DCDCDC] w-full max-w-5xl rounded-3xl overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.6)] border border-gray-400 flex flex-col relative">
                
                {/* 3. Removed sticky class since it no longer scrolls */}
                <div className="bg-[#DCDCDC] px-8 py-5 z-10 flex justify-between items-start border-b border-black/10">
                    <h2 className="text-3xl md:text-4xl tracking-widest font-light uppercase text-black">
                        Services
                    </h2>
                    <button 
                        onClick={onClose}
                        className="w-8 h-8 border border-black flex items-center justify-center hover:bg-black hover:text-white transition-colors text-black bg-white"
                        aria-label="Close Services Panel"
                    >
                        ✕
                    </button>
                </div>

                {/* Content Section - Tightened up vertical padding/gaps to fit without scrolling */}
                <div className="px-8 pb-8 pt-6 text-black">
                    <div className="flex flex-col gap-6 md:gap-8">
                        {/* Row of 3 */}
                        <div className="flex flex-wrap justify-center gap-6 md:gap-24">
                            <ServiceItem title="Baptist Form" tempIcon="💧" />
                            <ServiceItem title="Holy Communion Form" tempIcon="🍞" />
                            <ServiceItem title="Confirmation Form" tempIcon="🕊️" />
                        </div>
                        
                        {/* Row of 2 */}
                        <div className="flex flex-wrap justify-center gap-6 md:gap-24">
                            <ServiceItem title="Wedding Registration form" tempIcon="💍" />
                            <ServiceItem title="Sacraments & Liturgical Request Form" tempIcon="⛪" />
                        </div>
                    </div>

                    {/* Divider Line */}
                    <hr className="border-black border-t-2 my-6 md:my-8 mx-auto max-w-4xl" />

                    {/* Bottom Section */}
                    <div className="flex flex-col pb-2">
                        {/* Row of 3 */}
                        <div className="flex flex-wrap justify-center gap-6 md:gap-24">
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