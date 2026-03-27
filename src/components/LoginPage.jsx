import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Header from './Header';

function LoginPage() {
    const navigate = useNavigate();
    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    // NEW: State to trigger the beautiful transition overlay
    const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) throw error;

            // NEW ANIMATION LOGIC: Instead of navigating instantly, show the overlay!
            setShowSuccessOverlay(true);
            
            // Wait for 1.5 seconds so the user can see the welcome animation, THEN navigate
            setTimeout(() => {
                navigate('/admin');
            }, 1500);

        } catch (error) {
            setError(error.message);
            setLoading(false);
        }
    };

    const backgroundStyle = {
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url('src/assets/Images/church3.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
    };

    return (
        <div className="relative min-h-screen w-full flex flex-col font-sans bg-white overflow-hidden">
            <Header />

            {/* --- NEW SUCCESS OVERLAY ANIMATION --- */}
            <div 
                className={`fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#F6F5ED] transition-all duration-700 ease-in-out ${
                    showSuccessOverlay ? 'opacity-100 visible' : 'opacity-0 invisible'
                }`}
            >
                <div className={`transform transition-all duration-700 delay-150 ${
                    showSuccessOverlay ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
                }`}>
                    <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center bg-[#B59E74] text-white text-4xl mb-6 shadow-xl animate-bounce">
                        👑
                    </div>
                    <h2 className="text-3xl font-serif text-[#B59E74] tracking-widest uppercase text-center">
                        Welcome Back
                    </h2>
                    <p className="text-gray-500 font-serif italic mt-3 text-center text-lg">
                        Preparing your dashboard...
                    </p>
                </div>
            </div>
            {/* ------------------------------------- */}

            <main style={backgroundStyle} className="flex-1 flex items-center justify-center p-6">
                <div className="bg-[#F6F5ED] w-full max-w-md rounded-3xl shadow-2xl overflow-hidden mt-16 animate-fade-in-up">
                    
                    <div className="bg-white px-8 py-8 text-center border-b border-gray-200">
                        <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center border-2 border-[#B59E74] text-2xl mb-4">
                            ⛪
                        </div>
                        <h2 className="text-2xl font-serif text-[#B59E74] font-medium uppercase tracking-widest">
                            Admin Portal
                        </h2>
                        <p className="text-sm text-gray-500 mt-2 font-serif italic">
                            Please sign in to access the parish dashboard.
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="p-8 space-y-6">
                        {error && (
                            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200 text-center animate-pulse">
                                {error}
                            </div>
                        )}

                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Email Address</label>
                            <input 
                                type="email" 
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700 w-full transition-shadow" 
                                placeholder="admin@parish.com" 
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Password</label>
                            <input 
                                type="password" 
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700 w-full transition-shadow" 
                                placeholder="••••••••" 
                            />
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading || showSuccessOverlay}
                            className="w-full bg-[#B59E74] hover:bg-[#9c8760] text-white font-bold text-base py-4 rounded-xl transition-all shadow-md disabled:opacity-70 disabled:cursor-not-allowed mt-4 uppercase tracking-widest"
                        >
                            {loading ? 'Authenticating...' : 'Sign In'}
                        </button>
                    </form>
                </div>
            </main>
        </div>
    );
}

export default LoginPage;