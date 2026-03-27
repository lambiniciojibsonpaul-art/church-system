import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Header from './Header'; 

function AdminDashboard() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // PROTECTED ROUTE LOGIC: Check if user is logged in AND is an admin
    useEffect(() => {
        const checkUser = async () => {
            // 1. Check if there is an active session
            const { data: { session } } = await supabase.auth.getSession();
            
            if (!session) {
                navigate('/login');
                return;
            }

            // 2. TRUE ADMIN CHECK: Look up the user's role in our new database table
            const { data: roleData, error } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', session.user.id)
                .single(); // We only expect one row per user

            // If there's an error, no role is found, or the role is NOT 'admin', kick them out!
            if (error || !roleData || roleData.role !== 'admin') {
                console.error("Access Denied: Not an Admin");
                alert("You do not have administrator privileges.");
                await supabase.auth.signOut(); // Log them out
                navigate('/'); // Send them to the home page
                return;
            }

            // 3. If they pass both checks, let them in!
            setUser(session.user);
            setLoading(false);
        };
        
        checkUser();
    }, [navigate]);

    // Show a quick loading state while Supabase checks the session & role
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B59E74]"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            
            <Header forceSolidBg={true} />

            <main className="flex-1 max-w-7xl w-full mx-auto px-6 pt-32 pb-12">
                
                <div className="mb-8">
                    <h1 className="text-3xl md:text-4xl font-serif text-[#B59E74] mb-2 uppercase tracking-wide">
                        Parish Dashboard
                    </h1>
                    <p className="text-gray-500 font-serif italic">
                        Welcome back. You are logged in as <span className="font-semibold not-italic">{user?.email}</span>
                    </p>
                </div>
                
                {/* Stats Overview Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-2 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-[#B59E74]"></div>
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Pending Baptisms</h3>
                        <p className="text-4xl text-gray-800 font-serif">0</p>
                    </div>
                    
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-2 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-[#B59E74]"></div>
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Pending Weddings</h3>
                        <p className="text-4xl text-gray-800 font-serif">0</p>
                    </div>
                    
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-2 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-[#B59E74]"></div>
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Mass Intentions</h3>
                        <p className="text-4xl text-gray-800 font-serif">0</p>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8 min-h-[400px] flex items-center justify-center">
                    <div className="text-center text-gray-400">
                        <div className="text-4xl mb-4">📭</div>
                        <h3 className="text-lg font-serif">No active requests yet.</h3>
                        <p className="text-sm mt-1">When users submit forms from the website, they will appear here.</p>
                    </div>
                </div>

            </main>
        </div>
    );
}

export default AdminDashboard;