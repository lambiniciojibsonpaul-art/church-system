import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Header from "./Header";
import church3 from "../assets/Images/church3.jpg";

function LoginPage() {
  const navigate = useNavigate();

  // 1. CLEANED STATE: Removed isRegistering and confirmPassword
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [uiState, setUiState] = useState({
    loading: false,
    error: null,
    successMsg: null,
    showSuccessOverlay: false,
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSignIn = async () => {
    // 1. Verify Credentials
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: formData.email,
      password: formData.password,
    });

    if (signInError) throw signInError;

    // 2. SNAPPIER FEEDBACK: Show overlay immediately while we check roles in background
    setUiState(prev => ({ ...prev, showSuccessOverlay: true, loading: false }));

    // 3. Fetch role safely (using * to prevent column-missing crashes)
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("*") 
      .eq("user_id", data.user.id)
      .single();

    if (roleError && roleError.code !== 'PGRST116') {
      console.error("Role Fetch Error:", roleError.message);
    }

    // Intercept for first-time login password change
    if (roleData?.requires_password_change) {
      navigate("/update-password");
      return;
    }

    // 4. Shortened transition (800ms) for a professional feel
    setTimeout(() => {
      if (roleData?.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/");
      }
    }, 800);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUiState({ loading: true, error: null, successMsg: null, showSuccessOverlay: false });

    try {
      await handleSignIn();
    } catch (err) {
      // If sign in fails, error shows and loading turns off immediately
      setUiState(prev => ({ ...prev, error: err.message, loading: false }));
    } finally {
      // ensures spinner never gets stuck
      setUiState(prev => ({ ...prev, loading: false }));
    }
  };

  const backgroundStyle = useMemo(() => ({
    backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url('${church3}')`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundAttachment: "fixed",
  }), []);

  return (
    <div className="relative min-h-screen w-full flex flex-col font-sans bg-white overflow-hidden">
      <Header />

      {uiState.showSuccessOverlay && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#F6F5ED] animate-fade-in">
          <div className="transform transition-all duration-700 translate-y-0 opacity-100">
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
      )}

      <main style={backgroundStyle} className="flex-1 flex items-center justify-center p-6 mt-16 lg:mt-0">
        <div className="bg-[#F6F5ED] w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up">
          <div className="bg-white px-8 py-8 text-center border-b border-gray-200">
            <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center border-2 border-[#B59E74] text-2xl mb-4">
              ⛪
            </div>
            <h2 className="text-2xl font-serif text-[#B59E74] font-medium uppercase tracking-widest">
              Parish Portal
            </h2>
            <p className="text-sm text-gray-500 mt-2 font-serif italic">
              Please sign in to access your account.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-5">
            {uiState.error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200 text-center animate-pulse">
                {uiState.error}
              </div>
            )}
            {uiState.successMsg && (
              <div className="bg-green-50 text-green-700 text-sm p-3 rounded-lg border border-green-200 text-center">
                {uiState.successMsg}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Email Address</label>
              <input
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className="p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700 w-full transition-shadow"
                placeholder="name@example.com"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Password</label>
              <input
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleInputChange}
                minLength={6}
                className="p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700 w-full transition-shadow"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={uiState.loading}
              className="w-full bg-[#B59E74] hover:bg-[#9c8760] text-white font-bold text-base py-4 rounded-xl transition-all shadow-md disabled:opacity-70 disabled:cursor-not-allowed mt-2 uppercase tracking-widest"
            >
              {uiState.loading ? "Processing..." : "Sign In"}
            </button>
          </form>

          {/* --- UPDATED FOOTER SECTION --- */}
          <div className="bg-gray-50 border-t border-gray-200 p-6 text-center">
            <p className="text-xs text-gray-500 font-serif italic leading-relaxed">
              Need an account? Please contact the <br className="block sm:hidden" /> 
              <span className="text-[#B59E74] font-bold not-italic uppercase tracking-tighter">
                Parish Administrator
              </span> 
              to request system access.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default LoginPage;