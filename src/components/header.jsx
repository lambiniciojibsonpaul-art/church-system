import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; 
// Note: We completely removed the ServicesDropdown import!

function Header() {
    const [isOpen, setIsOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    // Track scroll position
    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 50) {
                setScrolled(true);
            } else {
                setScrolled(false);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <header 
            className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
                scrolled ? 'bg-white shadow-md text-gray-800' : 'bg-transparent text-white'
            }`}
        >
            <div className="px-6 py-6 md:py-8">
                <nav aria-label="Main navigation" className="mx-auto max-w-7xl relative">
                    <div className="flex items-center justify-between md:justify-center">
                        
                        <Link to="/" className="text-lg font-bold tracking-wide md:hidden">
                            San Pedro Bautista
                        </Link>

                        <button
                            type="button"
                            onClick={() => setIsOpen((prev) => !prev)}
                            className={`inline-flex h-10 w-10 items-center justify-center rounded-md border md:hidden ${
                                scrolled ? 'border-gray-400 text-gray-800' : 'border-white/40 text-white'
                            }`}
                        >
                            <span className="flex flex-col gap-1.5 w-5">
                                <span className={`block h-0.5 w-full ${scrolled ? 'bg-gray-800' : 'bg-white'}`}></span>
                                <span className={`block h-0.5 w-full ${scrolled ? 'bg-gray-800' : 'bg-white'}`}></span>
                                <span className={`block h-0.5 w-full ${scrolled ? 'bg-gray-800' : 'bg-white'}`}></span>
                            </span>
                        </button>

                        <ul className="hidden items-center gap-10 text-md italic font-medium font-serif md:flex">
                            <li><Link className="hover:opacity-70 transition cursor-pointer" to="/">Home</Link></li>
                            <li><Link className="hover:opacity-70 transition cursor-pointer" to="/about">About Us</Link></li>
                            
                            {/* NEW SERVICES LINK */}
                            <li><Link className="hover:opacity-70 transition cursor-pointer" to="/services">Services</Link></li>
                            
                            
                            <li><Link className="hover:opacity-70 transition cursor-pointer" to="/events">Events</Link></li>
                            
                            <li><a className="hover:opacity-70 transition cursor-pointer" href="#give">Give</a></li>
                            <li><a className="hover:opacity-70 transition cursor-pointer" href="#visit">Visit Us</a></li>
                        </ul>
                    </div>

                    {isOpen && (
                        <ul className={`mt-4 flex flex-col gap-4 p-6 rounded-lg md:hidden ${
                            scrolled ? 'bg-gray-50' : 'bg-black/80'
                        }`}>
                            <li><Link to="/" onClick={() => setIsOpen(false)}>Home</Link></li>
                            <li><Link to="/about" onClick={() => setIsOpen(false)}>About Us</Link></li>
                            
                            {/* NEW MOBILE SERVICES LINK */}
                            <li><Link to="/services" onClick={() => setIsOpen(false)}>Services</Link></li>
                            
                            {/* NEW MOBILE EVENTS LINK */}
                            <li><Link to="/events" onClick={() => setIsOpen(false)}>Events</Link></li>
                            
                            <li><a href="#sermons" onClick={() => setIsOpen(false)}>Sermons</a></li>
                        </ul>
                    )}
                </nav>
            </div>
        </header>
    );
}

export default Header;