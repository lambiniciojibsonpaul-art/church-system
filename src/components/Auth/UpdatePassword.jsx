import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient"; 
import Header from "../Header"; 

function UpdatePassword() {
  const navigate = useNavigate();
  const [passwords, setPasswords] = useState({ newPassword: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleUpdate = async (e) => {
    e.preventDefault();
    console.log("Step 1: Submit button clicked");

    if (passwords.newPassword !== passwords.confirmPassword) {
      return setError("Passwords do not match!");
    }

    if (passwords.newPassword.length < 6) {
      return setError("Password must be at least 6 characters long.");
    }

    setLoading(true);
    setError(null);

    try {
      // STEP 2: UPDATE AUTH PASSWORD
      console.log("Step 2: Attempting to update Auth password...");
      const { error: authError } = await supabase.auth.updateUser({
        password: passwords.newPassword,
      });
      
      if (authError) {
        console.error("Step 2 ERROR (Auth):", authError.message);
        throw authError;
      }
      console.log("Step 2 SUCCESS: Auth password updated.");

      // STEP 3: GET USER ID
      console.log("Step 3: Fetching current user ID...");
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error("Step 3 ERROR (GetUser):", userError.message);
        throw userError;
      }
      console.log("Step 3 SUCCESS: User ID found:", user.id);

      // STEP 4: UPDATE DATABASE FLAG
      console.log("Step 4: Updating requires_password_change flag in DB...");
      const { error: dbError } = await supabase
        .from("user_roles")
        .update({ requires_password_change: false })
        .eq("user_id", user.id);

      if (dbError) {
        console.error("Step 4 ERROR (DB Update):", dbError.message);
        throw dbError;
      }
      console.log("Step 4 SUCCESS: Database flag updated.");

      // FINAL STEP: SUCCESS
      setIsSuccess(true);
      setTimeout(() => {
        navigate("/");
      }, 3000);

    } catch (err) {
      console.error("FINAL CATCH ERROR:", err.message);
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col font-sans bg-[#F6F5ED]">
      <Header />
      
      <main className="flex-1 flex items-center justify-center p-6 mt-16 lg:mt-0">
        <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-fade-in-up border border-gray-100">
          
          <div className="bg-white px-8 py-8 text-center border-b border-gray-200">
            <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center border-2 border-[#B59E74] text-2xl mb-4">
              {isSuccess ? "✅" : "🔐"}
            </div>
            <h2 className="text-2xl font-serif text-[#B59E74] font-medium uppercase tracking-widest">
              {isSuccess ? "Password Updated" : "Security Update"}
            </h2>
            <p className="text-sm text-gray-500 mt-2 font-serif italic">
              {isSuccess 
                ? "Your account is now secure. Redirecting..." 
                : "Please set your permanent password to continue."}
            </p>
          </div>

          {isSuccess ? (
            <div className="p-12 text-center animate-fade-in">
              <div className="text-6xl mb-6">✨</div>
              <p className="text-gray-600 font-medium mb-8">Welcome to the Parish Portal!</p>
              <button onClick={() => navigate("/")} className="bg-[#B59E74] text-white px-8 py-3 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-[#9c8760] transition-all shadow-md">
                Go to Home Now
              </button>
            </div>
          ) : (
            <form onSubmit={handleUpdate} className="p-8 space-y-5">
              {error && (
                <div className="p-3 rounded-lg text-center text-sm bg-red-50 text-red-600 border border-red-200 animate-pulse">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">New Password</label>
                <input 
                  type="password" required placeholder="••••••••"
                  className="p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700 w-full transition-shadow"
                  value={passwords.newPassword} 
                  onChange={(e) => setPasswords({...passwords, newPassword: e.target.value})} 
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Confirm New Password</label>
                <input 
                  type="password" required placeholder="••••••••"
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
          )}

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