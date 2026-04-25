import { useState } from "react";
import { supabase } from "../../supabaseClient"; // Path updated: goes up two levels to src/
import Header from "../Header"; // Path updated: goes up one level to components/

function AdminManageUsers() {
  const [formData, setFormData] = useState({ 
    email: "", 
    password: "", 
    role: "Priest" 
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      // This calls the Supabase Edge Function we deployed earlier
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: formData,
      });

      if (error) throw error;

      setMessage({ 
        type: "success", 
        text: "Account created successfully! The user must change their password on first login." 
      });
      
      // Reset the form after success
      setFormData({ email: "", password: "", role: "Priest" });
    } catch (err) {
      setMessage({ 
        type: "error", 
        text: err.message || "An unexpected error occurred while creating the account." 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col font-sans bg-[#F6F5ED]">
      <Header />
      
      <main className="flex-1 flex items-center justify-center p-6 mt-16 lg:mt-0">
        <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up border border-gray-200">
          
          {/* Header Section */}
          <div className="bg-white px-8 py-8 text-center border-b border-gray-200">
            <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center border-2 border-[#B59E74] text-2xl mb-4">
              👤
            </div>
            <h2 className="text-2xl font-serif text-[#B59E74] font-medium uppercase tracking-widest">
              Manage Parish Staff
            </h2>
            <p className="text-sm text-gray-500 mt-2 font-serif italic">
              Create secure accounts for Priests and Ministers.
            </p>
          </div>

          {/* Form Section */}
          <form onSubmit={handleSubmit} className="p-8 space-y-5">
            {message.text && (
              <div className={`p-3 rounded-lg text-center text-sm animate-pulse ${
                message.type === 'success' 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-red-50 text-red-600 border border-red-200'
              }`}>
                {message.text}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                Email Address
              </label>
              <input 
                type="email" 
                required 
                placeholder="priest@church.com"
                className="p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700 w-full transition-shadow"
                value={formData.email} 
                onChange={(e) => setFormData({...formData, email: e.target.value})} 
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                Temporary Password
              </label>
              <input 
                type="password" 
                required 
                placeholder="••••••••"
                className="p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700 w-full transition-shadow"
                value={formData.password} 
                onChange={(e) => setFormData({...formData, password: e.target.value})} 
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                Assign Role
              </label>
              <select 
                className="p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700 w-full transition-shadow"
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
              className="w-full bg-[#B59E74] hover:bg-[#9c8760] text-white font-bold text-base py-4 rounded-xl transition-all shadow-md disabled:opacity-70 disabled:cursor-not-allowed uppercase tracking-widest"
            >
              {loading ? "Creating Account..." : "Create Staff Account"}
            </button>
          </form>

          <div className="bg-gray-50 border-t border-gray-200 p-6 text-center">
            <p className="text-xs text-gray-500 italic">
              Note: Users will be forced to change this password upon their first login.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default AdminManageUsers;