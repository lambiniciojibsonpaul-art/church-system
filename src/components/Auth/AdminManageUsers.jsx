import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function AdminManageUsers() {
  const [formData, setFormData] = useState({ 
    email: "", 
    password: "", 
    role: "Parishioner" // Changed default to Parishioner
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const email = formData.email.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      setMessage({ type: "error", text: "Please enter a valid email address." });
      return;
    }
    if (formData.password.length < 6) {
      setMessage({ type: "error", text: "Password must be at least 6 characters." });
      return;
    }

    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const { error } = await supabase.functions.invoke("create-user", {
        body: { ...formData, email },
      });

      if (error) throw error;

      setMessage({ 
        type: "success", 
        text: "Account created successfully! The user must change their password on first login." 
      });
      
      setFormData({ email: "", password: "", role: "Parishioner" });
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
      <main className="flex-1 flex items-center justify-center p-6 mt-16 lg:mt-0">
        <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-fade-in-up border border-gray-100 flex flex-col">
          
          {/* TOP NAVIGATION BAR */}
          <div className="flex items-center px-8 py-5 bg-gray-50/50 border-b border-gray-100">
            <button 
              onClick={() => navigate("/admin")}
              className="flex items-center gap-2 text-gray-400 hover:text-[#B59E74] transition-all text-xs font-bold uppercase tracking-widest group"
            >
              <span className="group-hover:-translate-x-1 transition-transform duration-200">←</span> 
              Back to Dashboard
            </button>
          </div>

          {/* HEADER SECTION */}
          <div className="px-8 pt-10 pb-8 text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-[#F6F5ED] flex items-center justify-center border-2 border-[#B59E74] text-3xl mb-6 shadow-sm">
              👤
            </div>
            <h2 className="text-2xl font-serif text-[#B59E74] font-medium uppercase tracking-[0.2em] mb-2">
              Manage Parish Staff
            </h2>
            <p className="text-sm text-gray-400 font-serif italic">
              Create secure accounts for church members and leadership.
            </p>
          </div>

          {/* FORM SECTION */}
          <form onSubmit={handleSubmit} className="px-10 pb-10 space-y-6">
            {message.text && (
              <div className={`p-4 rounded-2xl text-center text-sm font-medium transition-all ${
                message.type === 'success' 
                ? 'bg-green-50 text-green-700 border border-green-100' 
                : 'bg-red-50 text-red-600 border border-red-100'
              }`}>
                {message.text}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">
                Email Address
              </label>
              <input 
                type="email" 
                required 
                placeholder="member@church.com"
                className="w-full p-4 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#B59E74]/50 focus:border-[#B59E74] bg-gray-50/30 text-gray-700 transition-all placeholder:text-gray-300"
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
                className="w-full p-4 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#B59E74]/50 focus:border-[#B59E74] bg-gray-50/30 text-gray-700 transition-all placeholder:text-gray-300"
                value={formData.password} 
                onChange={(e) => setFormData({...formData, password: e.target.value})} 
              />
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
                <option value="parishioner">Parishioner</option>
                <option value="priest">Priest</option>
                <option value="minister">Minister</option>
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-[#B59E74] hover:bg-[#9c8760] text-white font-bold text-sm py-4 rounded-2xl transition-all shadow-lg shadow-[#B59E74]/20 disabled:opacity-70 disabled:cursor-not-allowed uppercase tracking-[0.15em] active:scale-[0.98] mt-4"
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          <div className="bg-gray-50 border-t border-gray-100 p-6 text-center">
            <p className="text-[11px] text-gray-400 italic leading-relaxed">
              Security Protocol: Users will be required to set a new password <br className="hidden md:block" /> immediately upon their first successful login.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default AdminManageUsers;
