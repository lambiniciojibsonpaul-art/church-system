import Header from './Header.jsx';
import FloatingFeatures from './FloatingFeatures.jsx';

function ChurchLandingPage() {
    const backgroundStyle = {
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url('src/assets/Images/church1.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed', // Essential for the scrolling 'float' effect
    };

    return (
        <div className="relative min-h-screen w-full flex flex-col font-sans">
            
            <Header />

            {/* Hero Section */}
            <main style={backgroundStyle} className="relative h-screen flex flex-col items-center justify-center text-center px-4 text-white">
                <h1 className="text-6xl md:text-8xl font-bold tracking-tight leading-tight max-w-4xl z-10 mt-16">
                    Welcome to <br /> San Pedro Bautista Church
                </h1>
            </main>

            <FloatingFeatures />

            {/* Floating Chat Button */}
            <button className="fixed bottom-6 right-6 z-50 bg-[#B59E74] text-white px-6 py-3 rounded-md shadow-xl flex items-center gap-2 font-bold hover:bg-[#9c8760] transition">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
                </svg>
                Let's Chat!
            </button>
        </div>
    );
}

export default ChurchLandingPage;