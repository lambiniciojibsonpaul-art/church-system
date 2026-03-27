import { useState } from 'react';
import Header from './Header';

// Import your shiny new components!
import BaptismFormModal from './Forms/BaptismFormModal';
import HolyCommunionFormModal from './Forms/HolyCommunionFormModal';
import WeddingRegistryFormModal from './Forms/WeddingRegistryFormModal';
import SacramentsLiturgicalFormModal from './Forms/SacramentsLiturgicalFormModal';
import MassIntentionFormModal from './Forms/MassIntentionFormModal';
import ConfirmationFormModal from './Forms/ConfirmationFormModal';

function ServicesPage() {
    // States for the Modals
    const [isBaptismModalOpen, setIsBaptismModalOpen] = useState(false);
    const [isCommunionModalOpen, setIsCommunionModalOpen] = useState(false);
    const [isWeddingModalOpen, setIsWeddingModalOpen] = useState(false);
    const [isLiturgicalModalOpen, setIsLiturgicalModalOpen] = useState(false);
    const [isMassIntentionModalOpen, setIsMassIntentionModalOpen] = useState(false);
    const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);

    const backgroundStyle = {
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url('src/assets/Images/church3.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
    };

    const ServiceCard = ({ title, tempIcon, onClick }) => (
        <div 
            onClick={onClick}
            className="group flex flex-col items-center justify-center gap-4 p-6 bg-white rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:-translate-y-2 hover:shadow-xl hover:border-[#B59E74]/30 transition-all duration-300 h-full"
        >
            <div className="w-16 h-16 md:w-20 md:h-20 bg-[#F6F5ED] rounded-full flex items-center justify-center text-3xl md:text-4xl shadow-inner group-hover:scale-110 transition-transform duration-300 shrink-0">
                {tempIcon}
            </div>
            <span className="text-sm md:text-base font-serif font-medium text-center leading-tight text-gray-800 group-hover:text-[#B59E74] transition-colors">
                {title}
            </span>
        </div>
    );

    return (
        <div className="relative min-h-screen w-full flex flex-col font-sans bg-white">
            
            <Header />

            {/* Hero Section */}
            <main style={backgroundStyle} className="relative h-[60vh] md:h-screen flex flex-col items-center justify-center text-center px-4 text-white">
                <h1 className="text-5xl md:text-7xl font-bold tracking-tight mt-16">
                    Services
                </h1>
            </main>

            {/* Floating Content Section */}
            <section className="relative w-full z-20 -mt-24 pb-32 px-6">
                <div className="bg-[#F6F5ED] rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] max-w-7xl mx-auto py-16 px-8 md:px-16 text-left">
                    
                    <div className="text-center max-w-4xl mx-auto mb-16">
                        <h2 className="text-3xl md:text-4xl text-[#B59E74] font-serif uppercase tracking-widest mb-8 font-medium">
                            How We Can Serve You
                        </h2>
                        <p className="text-gray-600 font-serif italic leading-relaxed text-xl">
                            Whether you are preparing for a major life milestone, seeking spiritual guidance, or organizing an event within our parish, our community is here to support you every step of the way.
                        </p>
                    </div>

                    <hr className="border-gray-300 border-t w-full max-w-5xl mx-auto mb-16" />

                    {/* --- SACRAMENTAL SERVICES SECTION --- */}
                    <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 mb-20 items-center">
                        <div className="lg:w-1/3 flex flex-col gap-4 text-center lg:text-left">
                            <h3 className="text-3xl text-[#B59E74] font-serif">Sacramental Services</h3>
                            <p className="text-gray-700 font-serif leading-relaxed text-lg">
                                Sacraments are visible signs of God's grace. From welcoming a new life into the church through Baptism to uniting couples in Holy Matrimony, we are honored to celebrate these sacred rites with you and your family.
                            </p>
                        </div>

                        <div className="lg:w-2/3 flex flex-col gap-4 md:gap-6 w-full">
                            
                            {/* Top Row: 3 Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                                <ServiceCard 
                                    title="Baptism Form" 
                                    tempIcon="💧" 
                                    onClick={() => setIsBaptismModalOpen(true)} 
                                />
                                <ServiceCard 
                                    title="Holy Communion" 
                                    tempIcon="🍞" 
                                    onClick={() => setIsCommunionModalOpen(true)}
                                />
                                <ServiceCard 
                                    title="Confirmation" 
                                    tempIcon="🕊️" 
                                    onClick={() => setIsConfirmationModalOpen(true)}
                                />
                            </div>
                            
                            {/* Bottom Row: 2 Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 md:w-2/3 mx-auto w-full">
                                <ServiceCard 
                                    title="Wedding Registry" 
                                    tempIcon="💍" 
                                    onClick={() => setIsWeddingModalOpen(true)}
                                />
                                <ServiceCard 
                                    title="Sacraments & Liturgical Request" 
                                    tempIcon="⛪" 
                                    onClick={() => setIsLiturgicalModalOpen(true)}
                                />
                            </div>
                        </div>
                    </div>

                    <hr className="border-gray-300 border-t w-full max-w-5xl mx-auto mb-16" />

                    {/* --- GENERAL REQUESTS SECTION --- */}
                    <div className="flex flex-col lg:flex-row-reverse gap-12 lg:gap-16 items-center">
                        <div className="lg:w-1/3 flex flex-col gap-4 text-center lg:text-left">
                            <h3 className="text-3xl text-[#B59E74] font-serif">General Requests</h3>
                            <p className="text-gray-700 font-serif leading-relaxed text-lg">
                                For administrative needs, facility bookings, and special mass intentions, our parish office is ready to assist. Please select the appropriate form below to submit your request directly to our team.
                            </p>
                        </div>
                        <div className="lg:w-2/3 grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 w-full">
                            <ServiceCard 
                                title="Mass Intention" 
                                tempIcon="🕯️" 
                                onClick={() => setIsMassIntentionModalOpen(true)}
                            />
                            <ServiceCard title="Facilities Booking" tempIcon="📅" />
                            <ServiceCard title="Certification Request" tempIcon="📜" />
                        </div>
                    </div>
                </div>
            </section>

            {/* --- RENDER ALL MODAL COMPONENTS --- */}
            {isBaptismModalOpen && <BaptismFormModal onClose={() => setIsBaptismModalOpen(false)} />}
            {isCommunionModalOpen && <HolyCommunionFormModal onClose={() => setIsCommunionModalOpen(false)} />}
            {isWeddingModalOpen && <WeddingRegistryFormModal onClose={() => setIsWeddingModalOpen(false)} />}
            {isLiturgicalModalOpen && <SacramentsLiturgicalFormModal onClose={() => setIsLiturgicalModalOpen(false)} />}
            {isMassIntentionModalOpen && <MassIntentionFormModal onClose={() => setIsMassIntentionModalOpen(false)} />}
            {isConfirmationModalOpen && <ConfirmationFormModal onClose={() => setIsConfirmationModalOpen(false)} />}

        </div>
    );
}

export default ServicesPage;