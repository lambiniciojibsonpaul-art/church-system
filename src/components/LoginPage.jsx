import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Header from "./Header";
import church3 from "../assets/Images/church3.jpg";

function LoginPage() {
  const navigate = useNavigate();

  // Toggle between Login and Register modes
  const [isRegistering, setIsRegistering] = useState(false);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);

  // Handle switching between forms (and clear out old text/errors)
  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    setError(null);
    setSuccessMsg(null);
    setPassword("");
    setConfirmPassword("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (isRegistering) {
        // --- REGISTRATION LOGIC ---
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match!");
        }

        const { data, error } = await supabase.auth.signUp({
          email: email,
          password: password,
        });

        if (error) throw error;

        // Success! Tell them to check their email (or they might be auto-logged in depending on Supabase settings)
        setSuccessMsg("Account created successfully! You can now sign in.");
        setIsRegistering(false); // Switch back to login view
        setPassword("");
        setConfirmPassword("");
      } else {
        // --- LOGIN LOGIC ---
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        });

        if (error) throw error;

        // Check if they are admin before doing the cool animation
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id)
          .single();

        if (roleData && roleData.role === "admin") {
          // Admin login animation
          setShowSuccessOverlay(true);
          setTimeout(() => navigate("/admin"), 1500);
        } else {
          // Normal user login - just send them to the home page!
          navigate("/");
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const backgroundStyle = {
    backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url('${church3}')`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundAttachment: "fixed",
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col font-sans bg-white overflow-hidden">
      <Header />

      {/* --- SUCCESS OVERLAY ANIMATION (Only for Admins) --- */}
      <div
        className={`fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#F6F5ED] transition-all duration-700 ease-in-out ${
          showSuccessOverlay ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
      >
        <div
          className={`transform transition-all duration-700 delay-150 ${
            showSuccessOverlay
              ? "translate-y-0 opacity-100"
              : "translate-y-10 opacity-0"
          }`}
        >
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

      <main
        style={backgroundStyle}
        className="flex-1 flex items-center justify-center p-6 mt-16 lg:mt-0"
      >
        <div className="bg-[#F6F5ED] w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up">
          {/* Header Section of the Card */}
          <div className="bg-white px-8 py-8 text-center border-b border-gray-200 transition-all duration-300">
            <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center border-2 border-[#B59E74] text-2xl mb-4">
              ⛪
            </div>
            <h2 className="text-2xl font-serif text-[#B59E74] font-medium uppercase tracking-widest">
              {isRegistering ? "Create Account" : "Parish Portal"}
            </h2>
            <p className="text-sm text-gray-500 mt-2 font-serif italic">
              {isRegistering
                ? "Join our parish community online."
                : "Please sign in to access your account."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-5">
            {/* Error & Success Messages */}
            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200 text-center animate-pulse">
                {error}
              </div>
            )}
            {successMsg && (
              <div className="bg-green-50 text-green-700 text-sm p-3 rounded-lg border border-green-200 text-center">
                {successMsg}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700 w-full transition-shadow"
                placeholder="name@example.com"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                className="p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700 w-full transition-shadow"
                placeholder="••••••••"
              />
            </div>

            {/* Extra field ONLY shows when registering */}
            {isRegistering && (
              <div className="flex flex-col gap-2 animate-fade-in-up">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={6}
                  className="p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700 w-full transition-shadow"
                  placeholder="••••••••"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#B59E74] hover:bg-[#9c8760] text-white font-bold text-base py-4 rounded-xl transition-all shadow-md disabled:opacity-70 disabled:cursor-not-allowed mt-2 uppercase tracking-widest"
            >
              {loading
                ? "Processing..."
                : isRegistering
                  ? "Sign Up"
                  : "Sign In"}
            </button>
          </form>

          {/* Footer Toggle Link */}
          <div className="bg-gray-50 border-t border-gray-200 p-6 text-center">
            <p className="text-sm text-gray-600">
              {isRegistering
                ? "Already have an account? "
                : "Don't have an account? "}
              <button
                type="button"
                onClick={toggleMode}
                className="font-bold text-[#B59E74] hover:underline focus:outline-none uppercase tracking-wide text-xs"
              >
                {isRegistering ? "Sign In Here" : "Register Here"}
              </button>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default LoginPage;
