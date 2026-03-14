import Header from './Header';

function AboutUsPage() {
    // Parallax background style using church2.jpg
    const backgroundStyle = {
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url('src/assets/Images/church2.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed', // This creates the scrolling effect
    };

    // Helper component for the Pastor profiles
    const PastorProfile = ({ name, role, email }) => (
        <div className="flex flex-col text-left">
            {/* Image Placeholder */}
            <div className="w-full aspect-[3/4] bg-gray-200 mb-6 flex items-center justify-center text-gray-400 rounded-md">
                [Image Placeholder]
            </div>
            <h3 className="text-2xl text-[#B59E74] font-bold mb-2 leading-tight">
                {name.split(' ').map((part, i) => <span key={i} className="block">{part}</span>)}
            </h3>
            <p className="text-gray-500 font-serif italic mb-1">{role}</p>
            <a href={`mailto:${email}`} className="text-[#B59E74] font-serif italic underline text-sm hover:text-[#9c8760] transition-colors">
                {email}
            </a>
        </div>
    );

    return (
        <div className="relative min-h-screen w-full flex flex-col font-sans bg-white">
            
            <Header />

            {/* Hero Section */}
            <main style={backgroundStyle} className="relative h-[60vh] md:h-screen flex flex-col items-center justify-center text-center px-4 text-white">
                <h1 className="text-5xl md:text-7xl font-bold tracking-tight mt-16">
                    About Us
                </h1>
            </main>

            {/* New Floating Content Section: Mission & Our Story */}
            <section className="relative w-full z-20 -mt-24 pb-16 px-6">
                <div className="bg-[#F6F5ED] rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] max-w-7xl mx-auto py-16 px-8 md:px-20 flex flex-col items-center">
                    
                    {/* Mission Statement Block */}
                    <div className="text-center max-w-5xl mx-auto mb-16">
                        <h2 className="text-3xl md:text-4xl text-[#B59E74] font-serif uppercase tracking-widest mb-10 font-medium">
                            Our Mission
                        </h2>
                        <div className="text-gray-600 font-serif italic leading-relaxed space-y-6 text-xl md:text-2xl md:px-12">
                            <p>
                                To serve as a vibrant community center dedicated to nurturing spiritual growth, offering unconditional support, and spreading love and hope to all.
                            </p>
                        </div>
                    </div>

                    {/* Divider Line */}
                    <hr className="border-gray-200 border-t w-full max-w-4xl mb-16" />

                    {/* Our Story Block (Replaces the generic placeholders) */}
                    <div className="text-center max-w-5xl mx-auto">
                        <h2 className="text-3xl md:text-4xl text-[#B59E74] font-serif uppercase tracking-widest mb-10 font-medium">
                            Our Story
                        </h2>
                        
                        <div className="text-gray-600 font-serif italic leading-relaxed space-y-8 text-lg md:text-xl md:px-12">
                            <p>
                                Established in 1952, San Pedro Bautista Church began as a humble community chapel, born from the shared vision of local families seeking a spiritual home. What started with just fifty members has grown into a flourishing parish that has served generations in our city.
                            </p>
                            <p>
                                Through decades of service and faith, our beautiful main sanctuary was completed in 1978, a testament to the dedication and generosity of our community. Over the years, we have expanded our reach, establishing various outreach programs and community services that impact thousands.
                            </p>
                            <p>
                                With our rich history as a foundation, we continue to look towards the future with a steadfast commitment to faith, community service, and inclusivity. We invite you to be part of our ongoing story.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Our Pastors Section (Restored!) */}
            <section className="bg-white w-full pb-32 pt-12 px-6 mx-auto max-w-7xl">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-500 tracking-wide">
                        Our Pastors:
                    </h2>
                </div>

                {/* 4-Column Grid for Pastors */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 md:gap-8">
                    <PastorProfile 
                        name="Alex Gordon" 
                        role="Lead Pastor" 
                        email="Info@mysite.com" 
                    />
                    <PastorProfile 
                        name="Thomas Williams" 
                        role="Executive Pastor" 
                        email="Info@mysite.com" 
                    />
                    <PastorProfile 
                        name="Emily Bull" 
                        role="Director of Children's Ministry" 
                        email="Info@mysite.com" 
                    />
                    <PastorProfile 
                        name="Kelly Barrett" 
                        role="Marriage Preparation" 
                        email="Info@mysite.com" 
                    />
                </div>
            </section>

            {/* Floating Chat Button (Reused) */}
            

        </div>
    );
}

export default AboutUsPage;