import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { restSelect } from "../supabaseRest";
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
    overlayPhase: "verifying", // "verifying" | "success"
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const withTimeout = (promise, ms, label) =>
    Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`${label} timed out — check your connection and try again.`)), ms)
      ),
    ]);

  const ADMIN_CACHE_KEY = (email) => `adminCache:${email.toLowerCase()}`;
  const ADMIN_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

  const readLongTermAdminCache = (email) => {
    try {
      const raw = localStorage.getItem(ADMIN_CACHE_KEY(email));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (Date.now() - parsed.ts > ADMIN_CACHE_TTL_MS) return null;
      return parsed.role || null;
    } catch {
      return null;
    }
  };

  const writeLongTermAdminCache = (email, role) => {
    try {
      localStorage.setItem(
        ADMIN_CACHE_KEY(email),
        JSON.stringify({ role, ts: Date.now() })
      );
    } catch { /* ignore */ }
  };

  const handleSignIn = async () => {
    console.log("[Login] Starting sign-in flow.");
    const t0 = performance.now();

    // Race signInWithPassword's promise against the SIGNED_IN auth event.
    // The event fires reliably; the promise can hang under GoTrue lock contention.
    let authSubscription;
    const sessionFromEvent = new Promise((resolve) => {
      const sub = supabase.auth.onAuthStateChange((event, sess) => {
        if (event === "SIGNED_IN" && sess) resolve(sess);
      });
      authSubscription = sub.data.subscription;
    });

    const sessionFromCall = supabase.auth
      .signInWithPassword({
        email: formData.email,
        password: formData.password,
      })
      .then(({ data: result, error: signInError }) => {
        if (signInError) throw signInError;
        return result.session;
      });

    let session;
    try {
      session = await withTimeout(
        Promise.race([sessionFromEvent, sessionFromCall]),
        15000,
        "Sign-in"
      );
    } finally {
      authSubscription?.unsubscribe();
    }

    if (!session?.user) throw new Error("Sign-in succeeded but no session was returned.");

    const tAuth = performance.now();
    console.log(`[Login] Auth confirmed in ${Math.round(tAuth - t0)}ms — user=${session.user.email}`);

    setUiState(prev => ({ ...prev, overlayPhase: "success" }));

    // Long-term cache check: if this email has been confirmed as admin in
    // a prior session within the last 7 days, trust it and route immediately.
    // The DB verification still runs in the background.
    const cachedRole = readLongTermAdminCache(session.user.email);
    if (cachedRole) {
      console.log(`[Login] Long-term cache hit for ${session.user.email}: role="${cachedRole}". Routing immediately, verifying in background.`);
      try {
        sessionStorage.setItem(
          `userRole:${session.user.id}`,
          JSON.stringify({ role: cachedRole, ts: Date.now() })
        );
      } catch { /* ignore */ }

      // Background refresh via direct REST (bypasses SDK auth lock).
      restSelect("user_roles", {
        match: { user_id: session.user.id },
        single: true,
      }).then(({ data: fresh }) => {
        if (!fresh) return;
        writeLongTermAdminCache(session.user.email, fresh.role);
        try {
          sessionStorage.setItem(
            `userRole:${session.user.id}`,
            JSON.stringify({ role: fresh.role, ts: Date.now() })
          );
        } catch { /* ignore */ }
      });

      const dest = String(cachedRole).toLowerCase() === "admin" ? "/admin" : "/";
      navigate(dest, { replace: true });
      return;
    }

    // No cached answer — fetch via direct REST (bypasses SDK auth lock).
    let roleData = null;
    let lastErrorMsg = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      console.log(`[Login] Role lookup attempt ${attempt} (direct REST)...`);
      const { data: result, error: roleError } = await restSelect("user_roles", {
        match: { user_id: session.user.id },
        single: true,
        timeoutMs: 12000,
      });
      if (roleError) {
        lastErrorMsg = roleError.message;
        console.warn(`[Login] Role lookup attempt ${attempt} failed:`, roleError.message);
        continue;
      }
      roleData = result;
      console.log(`[Login] Role lookup attempt ${attempt} succeeded:`, roleData);
      break;
    }
    const tRole = performance.now();
    console.log(`[Login] Role phase took ${Math.round(tRole - tAuth)}ms`);

    if (!roleData && lastErrorMsg) {
      console.warn("[Login] Role lookup failed after retry:", lastErrorMsg);
    }

    if (roleData) {
      try {
        sessionStorage.setItem(
          `userRole:${session.user.id}`,
          JSON.stringify({ role: roleData.role, ts: Date.now() })
        );
      } catch { /* ignore */ }
      // Persist for 7 days so future sign-ins can skip this slow query.
      writeLongTermAdminCache(session.user.email, roleData.role);
    }

    if (roleData?.requires_password_change) {
      console.log("[Login] requires_password_change=true → /update-password");
      navigate("/update-password", { replace: true });
      return;
    }

    const role = String(roleData?.role || "").toLowerCase();
    const dest = role === "admin" ? "/admin" : "/";
    console.log(`[Login] role="${role || "(unknown)"}" → navigating to ${dest}`);
    navigate(dest, { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Optimistic: show full-screen overlay the instant the user clicks, so the
    // slow signInWithPassword network call has visible progress feedback.
    setUiState({
      loading: true,
      error: null,
      successMsg: null,
      showSuccessOverlay: true,
      overlayPhase: "verifying",
    });

    try {
      await handleSignIn();
    } catch (err) {
      setUiState({
        loading: false,
        error: err.message,
        successMsg: null,
        showSuccessOverlay: false,
        overlayPhase: "verifying",
      });
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
      {uiState.showSuccessOverlay && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#F6F5ED] animate-fade-in">
          <div className="transform transition-all duration-700 translate-y-0 opacity-100">
            {uiState.overlayPhase === "verifying" ? (
              <>
                <div className="w-20 h-20 mx-auto rounded-full border-t-2 border-b-2 border-[#B59E74] animate-spin mb-6"></div>
                <h2 className="text-3xl font-serif text-[#B59E74] tracking-widest uppercase text-center">
                  Signing You In
                </h2>
                <p className="text-gray-500 font-serif italic mt-3 text-center text-lg">
                  Verifying credentials...
                </p>
              </>
            ) : (
              <>
                <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center bg-[#B59E74] text-white text-4xl mb-6 shadow-xl animate-bounce">
                  👑
                </div>
                <h2 className="text-3xl font-serif text-[#B59E74] tracking-widest uppercase text-center">
                  Welcome Back
                </h2>
                <p className="text-gray-500 font-serif italic mt-3 text-center text-lg">
                  Preparing your dashboard...
                </p>
              </>
            )}
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