import { useState, useEffect } from 'react';
import ServicesDropdown from './ServicesDropdown';

function Header() {
    const [isOpen, setIsOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [isServicesOpen, setIsServicesOpen] = useState(false);

    // Track scroll position to change header styling
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
                        <a href="#home" className="text-lg font-bold tracking-wide md:hidden">
                            San Pedro Bautista
                        </a>

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
                            <li><a className="hover:opacity-70 transition cursor-pointer" href="#home">Home</a></li>
                            <li><a className="hover:opacity-70 transition cursor-pointer" href="#about">About Us</a></li>
                            
                            {/* Services Toggle Button */}
                            <li>
                                <button 
                                    className="hover:opacity-70 transition italic font-medium font-serif focus:outline-none cursor-pointer" 
                                    onClick={() => setIsServicesOpen(!isServicesOpen)}
                                >
                                    Services
                                </button>
                            </li>
                            
                            <li><a className="hover:opacity-70 transition cursor-pointer" href="#sermons">Sermons</a></li>
                            <li><a className="hover:opacity-70 transition cursor-pointer" href="#events">Events</a></li>
                            <li><a className="hover:opacity-70 transition cursor-pointer" href="#ministries">Ministries</a></li>
                            <li><a className="hover:opacity-70 transition cursor-pointer" href="#give">Give</a></li>
                            <li><a className="hover:opacity-70 transition cursor-pointer" href="#visit">Visit Us</a></li>
                        </ul>
                    </div>

                    {isOpen && (
                        <ul className={`mt-4 flex flex-col gap-4 p-6 rounded-lg md:hidden ${
                            scrolled ? 'bg-gray-50' : 'bg-black/80'
                        }`}>
                            <li><a href="#home" onClick={() => setIsOpen(false)}>Home</a></li>
                            <li><a href="#about" onClick={() => setIsOpen(false)}>About Us</a></li>
                            <li>
                                <button 
                                    className="text-left w-full focus:outline-none" 
                                    onClick={() => {
                                        setIsServicesOpen(!isServicesOpen);
                                        setIsOpen(false); // Close mobile menu when opening services
                                    }}
                                >
                                    Services
                                </button>
                            </li>
                            <li><a href="#sermons" onClick={() => setIsOpen(false)}>Sermons</a></li>
                        </ul>
                    )}
                </nav>
            </div>

            {/* Render Services Dropdown if open */}
            {isServicesOpen && (
                <ServicesDropdown 
                    scrolled={scrolled} 
                    onClose={() => setIsServicesOpen(false)} 
                />
            )}
        </header>
    );
}

export default Header;