import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient"; // Corrected path for Auth folder
import Header from "../Header"; // Corrected path for Auth folder

function UpdatePassword() {
  const navigate = useNavigate();
  const [passwords, setPasswords] = useState({ newPassword: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleUpdate = async (e) => {
    e.preventDefault();
    
    if (passwords.newPassword !== passwords.confirmPassword) {
      return setError("Passwords do not match!");
    }

    if (passwords.newPassword.length < 6) {
      return setError("Password must be at least 6 characters long.");
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Update the Auth password in Supabase
      const { error: authError } = await supabase.auth.updateUser({
        password: passwords.newPassword,
      });
      if (authError) throw authError;

      // 2. Get current user ID to update the database flag
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      // 3. Update the database to set requires_password_change = false
      const { error: dbError } = await supabase
        .from("user_roles")
        .update({ requires_password_change: false })
        .eq("user_id", user.id);

      if (dbError) throw dbError;

      alert("Password updated successfully! Welcome to the Parish Portal.");
      navigate("/"); // Send them to the home page now that they are secure
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col font-sans bg-[#F6F5ED]">
      <Header />
      
      <main className="flex-1 flex items-center justify-center p-6 mt-16 lg:mt-0">
        <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up border border-gray-200">
          
          <div className="bg-white px-8 py-8 text-center border-b border-gray-200">
            <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center border-2 border-[#B59E74] text-2xl mb-4">
              🔐
            </div>
            <h2 className="text-2xl font-serif text-[#B59E74] font-medium uppercase tracking-widest">
              Security Update
            </h2>
            <p className="text-sm text-gray-500 mt-2 font-serif italic">
              Please set your permanent password to continue.
            </p>
          </div>

          <form onSubmit={handleUpdate} className="p-8 space-y-5">
            {error && (
              <div className="p-3 rounded-lg text-center text-sm bg-red-50 text-red-600 border border-red-200 animate-pulse">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                New Password
              </label>
              <input 
                type="password" 
                required 
                placeholder="••••••••"
                className="p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700 w-full transition-shadow"
                value={passwords.newPassword} 
                onChange={(e) => setPasswords({...passwords, newPassword: e.target.value})} 
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                Confirm New Password
              </label>
              <input 
                type="password" 
                required 
                placeholder="••••••••"
                className="p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700 w-full transition-shadow"
                value={passwords.confirmPassword} 
                onChange={(e) => setPasswords({...passwords, confirmPassword: e.target.value})} 
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-[#B59E74] hover:bg-[#9c8760] text-white font-bold text-base py-4 rounded-xl transition-all shadow-md disabled:opacity-70 disabled:cursor-not-allowed uppercase tracking-widest"
            >
              {loading ? "Updating..." : "Save Password"}
            </button>
          </form>

          <div className="bg-gray-50 border-t border-gray-200 p-6 text-center">
            <p className="text-xs text-gray-500 italic">
              For your security, your temporary password will be deactivated immediately.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default UpdatePassword;