import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient"; 
import Header from "../Header"; 

function AdminManageUsers() {
  const [formData, setFormData] = useState({ 
    email: "", 
    password: "", 
    role: "Priest" 
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: formData,
      });

      if (error) throw error;

      setMessage({ 
        type: "success", 
        text: "Account created successfully! The user must change their password on first login." 
      });
      
      setFormData({ email: "", password: "", role: "Priest" });
    } catch (err) {
      setMessage({ 
        type: "error", 
        text: err.message || "An unexpected error occurred." 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col font-sans bg-[#F6F5ED]">
      {/* 1. HEADER: Added a z-index wrapper to ensure it stays on top */}
      <div className="relative z-50">
        <Header />
      </div>
      
      {/* 2. MAIN: Changed mt-16 lg:mt-0 to pt-24 lg:pt-32 to create a permanent gap */}
      <main className="flex-1 flex items-center justify-center p-6 pt-24 lg:pt-32 pb-12">
        
        {/* LANDSCAPE CONTAINER */}
        <div className="bg-white w-full max-w-5xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-fade-in-up border border-gray-100 flex flex-col md:flex-row">
          
          {/* LEFT PANEL */}
          <div className="md:w-2/5 bg-[#B59E74] p-12 text-white flex flex-col justify-center items-center text-center relative overflow-hidden">
            <div className="absolute -top-20 -left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-black/10 rounded-full blur-3xl"></div>

            <div className="relative z-10">
              <div className="w-24 h-24 mx-auto rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border-2 border-white/30 text-4xl mb-8 shadow-xl">
                👤
              </div>
              <h2 className="text-3xl font-serif font-medium uppercase tracking-[0.2em] mb-4 leading-tight">
                Staff <br /> Management
              </h2>
              <div className="w-12 h-1 bg-white/40 mx-auto mb-6"></div>
              <p className="text-white/80 font-serif italic text-lg leading-relaxed max-w-xs mx-auto">
                "Empowering our church leadership through secure digital access."
              </p>
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div className="md:w-3/5 flex flex-col relative">
            
            {/* TOP NAV BAR */}
            <div className="flex items-center px-8 py-5 bg-gray-50/50 border-b border-gray-100">
              <button 
                onClick={() => navigate("/admin")}
                className="flex items-center gap-2 text-gray-400 hover:text-[#B59E74] transition-all text-xs font-bold uppercase tracking-widest group"
              >
                <span className="group-hover:-translate-x-1 transition-transform duration-200">←</span> 
                Back to Dashboard
              </button>
            </div>

            <div className="p-10 md:p-16">
              <div className="mb-10">
                <h3 className="text-2xl font-serif text-[#B59E74] font-medium uppercase tracking-widest mb-2">
                  Create New Account
                </h3>
                <p className="text-sm text-gray-400 italic">Fill in the details to grant system access.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {message.text && (
                  <div className={`p-4 rounded-2xl text-center text-sm font-medium transition-all ${
                    message.type === 'success' 
                    ? 'bg-green-50 text-green-700 border border-green-100' 
                    : 'bg-red-50 text-red-600 border border-red-100'
                  }`}>
                    {message.text}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">
                      Email Address
                    </label>
                    <input 
                      type="email" 
                      required 
                      placeholder="priest@church.com"
                      className="w-full p-4 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#B59E74]/50 focus:border-[#B59E74] bg-gray-50/30 text-gray-700 transition-all"
                      value={formData.email} 
                      onChange={(e) => setFormData({...formData, email: e.target.value})} 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">
                      Temporary Password
                    </label>
                    <input 
                      type="password" 
                      required 
                      placeholder="••••••••"
                      className="w-full p-4 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#B59E74]/50 focus:border-[#B59E74] bg-gray-50/30 text-gray-700 transition-all"
                      value={formData.password} 
                      onChange={(e) => setFormData({...formData, password: e.target.value})} 
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">
                    Assign Role
                  </label>
                  <select 
                    className="w-full p-4 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#B59E74]/50 focus:border-[#B59E74] bg-gray-50/30 text-gray-700 transition-all appearance-none"
                    value={formData.role} 
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                  >
                    <option value="Priest">Priest</option>
                    <option value="Minister">Minister</option>
                    <option value="admin">Admin</option>
                    <option value="staff">Staff</option>
                  </select>
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-[#B59E74] hover:bg-[#9c8760] text-white font-bold text-sm py-4 rounded-2xl transition-all shadow-lg shadow-[#B59E74]/20 disabled:opacity-70 disabled:cursor-not-allowed uppercase tracking-[0.15em] active:scale-[0.98] mt-4"
                >
                  {loading ? "Creating Account..." : "Create Staff Account"}
                </button>
              </form>
            </div>

            <div className="mt-auto bg-gray-50 border-t border-gray-100 p-6 text-center">
              <p className="text-[11px] text-gray-400 italic leading-relaxed">
                Security Protocol: Users will be required to set a new password <br className="hidden md:block" /> immediately upon their first successful login.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default AdminManageUsers;