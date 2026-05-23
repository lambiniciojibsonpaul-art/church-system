import { useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { restSelect } from "../supabaseRest";
import church3 from "../assets/Images/church3.jpg";
import { ministryNames } from "../data/ministries";

// ----- helpers --------------------------------------------------------------

const ADMIN_CACHE_KEY = (email) => `adminCache:${email.toLowerCase()}`;
const ADMIN_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Where each role lands after a successful login
const ROLE_DESTINATIONS = {
  admin:       "/admin",
  superadmin:  "/admin",
  priest:      "/priest-dashboard",
  staff:       "/staff-dashboard",
  ministry:    "/events",
  parishioner: "/",
};

function getRoleDest(role) {
  return ROLE_DESTINATIONS[String(role || "").toLowerCase()] ?? "/";
}

function readLongTermAdminCache(email) {
  try {
    const raw = localStorage.getItem(ADMIN_CACHE_KEY(email));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.ts > ADMIN_CACHE_TTL_MS) return null;
    return parsed.role || null;
  } catch {
    return null;
  }
}

function writeLongTermAdminCache(email, role) {
  try {
    localStorage.setItem(
      ADMIN_CACHE_KEY(email),
      JSON.stringify({ role, ts: Date.now() })
    );
  } catch { /* ignore */ }
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label} timed out — check your connection and try again.`)),
        ms
      )
    ),
  ]);
}

// Password rules: 8+ chars, 1 upper, 1 lower, 1 digit, 1 special.
function validatePassword(password) {
  const minLength  = password.length >= 8;
  const hasUpper   = /[A-Z]/.test(password);
  const hasLower   = /[a-z]/.test(password);
  const hasNumber  = /\d/.test(password);
  // eslint-disable-next-line no-useless-escape
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password);
  return {
    minLength, hasUpper, hasLower, hasNumber, hasSpecial,
    valid: minLength && hasUpper && hasLower && hasNumber && hasSpecial,
  };
}

function cleanContactNumber(raw) {
  return (raw || "").trim();
}

// ----- component ------------------------------------------------------------

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectAfterLogin = new URLSearchParams(location.search).get("redirect") || null;
  const [mode, setMode] = useState("login");

  // ----- LOGIN STATE --------------------------------------------------------
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [uiState, setUiState] = useState({
    loading: false,
    error: null,
    successMsg: null,
    showSuccessOverlay: false,
    overlayPhase: "verifying",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSignIn = async () => {
    console.log("[Login] Starting sign-in flow.");
    const t0 = performance.now();

    let authSubscription;
    const sessionFromEvent = new Promise((resolve) => {
      const sub = supabase.auth.onAuthStateChange((event, sess) => {
        if (event === "SIGNED_IN" && sess) resolve(sess);
      });
      authSubscription = sub.data.subscription;
    });

    const sessionFromCall = supabase.auth
      .signInWithPassword({ email: formData.email, password: formData.password })
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

    console.log(`[Login] Auth confirmed in ${Math.round(performance.now() - t0)}ms — user=${session.user.email}`);
    setUiState((prev) => ({ ...prev, overlayPhase: "success" }));

    // --- STEP 1: Get the freshest user object to check metadata flags ---
    const { data: freshUserData } = await supabase.auth.getUser();
    const currentUser = freshUserData?.user || session.user;
    const metadata    = currentUser?.user_metadata || {};
    console.log("[Login] Metadata:", JSON.stringify(metadata));

    // ALWAYS check requires_password_change FIRST — before any caching logic
    if (
      metadata.requires_password_change === true ||
      String(metadata.requires_password_change) === "true"
    ) {
      console.log("[Login] requires_password_change flag detected → /update-password");
      navigate("/update-password", { replace: true });
      return;
    }

    // --- STEP 2: Try the long-term cache for a fast redirect ---
    const cachedRole = readLongTermAdminCache(currentUser.email);
    if (cachedRole) {
      // Refresh cache in background (don't await)
      restSelect("user_roles", {
        match: { user_id: currentUser.id },
        timeoutMs: 12000,
      }).then(({ data: fresh }) => {
        if (fresh && fresh.length > 0) {
          writeLongTermAdminCache(currentUser.email, fresh[0].role);
        }
      });

      console.log("[Login] Cache hit → navigating via cached role:", cachedRole);
      navigate(redirectAfterLogin || getRoleDest(cachedRole), { replace: true });
      return;
    }

    // --- STEP 3: No cache — query user_roles with retry ---
    let roleData     = null;
    let lastErrorMsg = null;

    for (let attempt = 1; attempt <= 2; attempt++) {
      const { data: result, error: roleError } = await restSelect("user_roles", {
        match: { user_id: currentUser.id },
        timeoutMs: 12000,
      });
      if (roleError) {
        lastErrorMsg = roleError.message;
        console.warn(`[Login] Role lookup attempt ${attempt} failed:`, roleError.message);
        continue;
      }
      roleData = result && result.length > 0 ? result[0] : null;
      break;
    }

    if (roleData) {
      writeLongTermAdminCache(currentUser.email, roleData.role);
      console.log("[Login] Role from DB:", roleData.role);
    } else {
      console.warn("[Login] No user_roles row found — defaulting to parishioner");
    }

    // Derive destination. No row → parishioner → "/". Never blindly go to /admin.
    const resolvedRole = roleData ? String(roleData.role || "").toLowerCase() : "parishioner";
    navigate(redirectAfterLogin || getRoleDest(resolvedRole), { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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

  // ----- REGISTER STATE ------------------------------------------------------
  const [registerData, setRegisterData] = useState({
    accountType: "parishioner",
    ministryGroup: "",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    contactNumber: "",
  });

  const [showPassword,      setShowPassword]      = useState(false);
  const [registerLoading,   setRegisterLoading]   = useState(false);
  const [registerError,     setRegisterError]     = useState(null);
  const [registeredEmail,   setRegisteredEmail]   = useState(null);

  const passwordCheck = validatePassword(registerData.password);

  const handleRegisterChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === "accountType" && value === "parishioner") {
      setRegisterData((prev) => ({ ...prev, accountType: value, ministryGroup: "" }));
    } else {
      setRegisterData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    }
  };

  const switchToLogin    = () => { setMode("login");    setRegisterError(null); setRegisteredEmail(null); };
  const switchToRegister = () => { setMode("register"); setUiState((prev) => ({ ...prev, error: null })); };

  const handleSignUp = async (e) => {
    e?.preventDefault?.();
    setRegisterError(null);

    if (registerData.accountType === "ministry" && !registerData.ministryGroup) {
      setRegisterError("Please select the Ministry you represent.");
      return;
    }
    if (!registerData.firstName.trim() || !registerData.lastName.trim()) {
      setRegisterError("Please enter your full name.");
      return;
    }
    if (!registerData.email.includes("@")) {
      setRegisterError("Please enter a valid email address.");
      return;
    }
    if (!passwordCheck.valid) {
      setRegisterError("Password must be at least 8 characters with an uppercase, lowercase, number, and special character.");
      return;
    }
    if (registerData.password !== registerData.confirmPassword) {
      setRegisterError("Passwords do not match.");
      return;
    }
    const contact = cleanContactNumber(registerData.contactNumber);
    if (!contact) {
      setRegisterError("Please enter a contact number.");
      return;
    }

    setRegisterLoading(true);
    try {
      console.log("[Register] Starting signup for:", registerData.email, "as", registerData.accountType);

      const { data: signupData, error: signupError } = await supabase.auth.signUp({
        email: registerData.email,
        password: registerData.password,
        options: {
          data: {
            first_name:     registerData.firstName.trim(),
            last_name:      registerData.lastName.trim(),
            contact_number: contact,
            ministry_group: registerData.accountType === "ministry" ? registerData.ministryGroup : null,
          },
        },
      });

      if (signupError) {
        if (/already registered|user already exists|already signed up/i.test(signupError.message)) {
          throw new Error("This email is already registered. Please sign in instead.");
        }
        throw signupError;
      }

      const createdUser = signupData?.user;
      if (createdUser?.id) {
        const userRole = registerData.accountType === "ministry" ? "ministry" : "parishioner";
        const { error: roleError } = await supabase
          .from("user_roles")
          .upsert({ user_id: createdUser.id, role: userRole }, { onConflict: "user_id" });

        if (roleError) throw new Error(`Failed to set up user permissions: ${roleError.message}`);
        console.log("[Register] Role assigned:", userRole);
      }

      if (signupData?.session) {
        navigate("/", { replace: true });
        return;
      }

      setRegisteredEmail(registerData.email);
    } catch (err) {
      setRegisterError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!registeredEmail) return;
    setRegisterError(null);
    setRegisterLoading(true);
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email: registeredEmail });
      if (error) throw error;
    } catch (err) {
      setRegisterError("Could not resend confirmation: " + err.message);
    } finally {
      setRegisterLoading(false);
    }
  };

  const backgroundStyle = useMemo(() => ({
    backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url('${church3}')`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundAttachment: "fixed",
  }), []);

  const passwordRule = (label, ok) => (
    <li className={`flex items-center gap-2 ${ok ? "text-green-700" : "text-gray-400"}`}>
      <span>{ok ? "✓" : "•"}</span>
      {label}
    </li>
  );

  return (
    <div className="relative min-h-screen w-full flex flex-col font-sans bg-white overflow-hidden">
      {uiState.showSuccessOverlay && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#F6F5ED] animate-fade-in">
          <div className="transform transition-all duration-700 translate-y-0 opacity-100">
            {uiState.overlayPhase === "verifying" ? (
              <>
                <div className="w-20 h-20 mx-auto rounded-full border-t-2 border-b-2 border-[#B59E74] animate-spin mb-6" />
                <h2 className="text-3xl font-serif text-[#B59E74] tracking-widest uppercase text-center">Signing You In</h2>
                <p className="text-gray-500 font-serif italic mt-3 text-center text-lg">Verifying credentials...</p>
              </>
            ) : (
              <>
                <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center bg-[#B59E74] text-white text-4xl mb-6 shadow-xl animate-bounce">
                  👑
                </div>
                <h2 className="text-3xl font-serif text-[#B59E74] tracking-widest uppercase text-center">Welcome Back</h2>
                <p className="text-gray-500 font-serif italic mt-3 text-center text-lg">Preparing your dashboard...</p>
              </>
            )}
          </div>
        </div>
      )}

      <main style={backgroundStyle} className="flex-1 flex items-center justify-center p-6 mt-16 lg:mt-0">
        <div className={`bg-[#F6F5ED] w-full ${mode === "register" ? "max-w-2xl" : "max-w-md"} rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up my-12 transition-all duration-300`}>

          {/* HEADER */}
          <div className="bg-white px-8 py-8 text-center border-b border-gray-200">
            <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center border-2 border-[#B59E74] text-2xl mb-4">⛪</div>
            <h2 className="text-2xl font-serif text-[#B59E74] font-medium uppercase tracking-widest">
              {mode === "login" ? "Parish Portal" : "Create Account"}
            </h2>
            <p className="text-sm text-gray-500 mt-2 font-serif italic">
              {mode === "login" ? "Please sign in to access your account." : "Register to request parish services."}
            </p>
          </div>

          {/* LOGIN FORM */}
          {mode === "login" && (
            <>
              <form onSubmit={handleSubmit} className="p-8 space-y-5">
                {uiState.error && (
                  <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200 text-center animate-pulse">
                    {uiState.error}
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Email Address</label>
                  <input name="email" type="email" required value={formData.email} onChange={handleInputChange}
                    className="p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700 w-full transition-shadow"
                    placeholder="name@example.com" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Password</label>
                  <div className="relative">
                    <input name="password" type={showLoginPassword ? "text" : "password"} required value={formData.password}
                      onChange={handleInputChange} minLength={6}
                      className="p-3 pr-12 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700 w-full transition-shadow"
                      placeholder="••••••••" />
                    <button type="button" onClick={() => setShowLoginPassword((v) => !v)}
                      aria-label={showLoginPassword ? "Hide password" : "Show password"}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-xs font-bold text-[#B59E74] hover:text-[#9c8760] uppercase tracking-wider">
                      {showLoginPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={uiState.loading}
                  className="w-full bg-[#B59E74] hover:bg-[#9c8760] text-white font-bold text-base py-4 rounded-xl transition-all shadow-md disabled:opacity-70 disabled:cursor-not-allowed mt-2 uppercase tracking-widest">
                  {uiState.loading ? "Processing..." : "Sign In"}
                </button>
              </form>

              <div className="bg-gray-50 border-t border-gray-200 p-6 text-center space-y-3">
                <p className="text-xs text-gray-500 font-serif italic">Don't have an account yet?</p>
                <button type="button" onClick={switchToRegister}
                  className="w-full bg-white hover:bg-gray-100 border-2 border-[#B59E74] text-[#B59E74] font-bold text-sm py-3 rounded-xl transition-all uppercase tracking-widest">
                  Create an Account
                </button>
              </div>
            </>
          )}

          {/* REGISTER — SUCCESS SCREEN */}
          {mode === "register" && registeredEmail && (
            <div className="p-8 space-y-5 text-center">
              <div className="w-20 h-20 mx-auto rounded-full bg-[#F6F5ED] flex items-center justify-center text-3xl border-2 border-[#B59E74]">📧</div>
              <h3 className="text-lg font-serif text-[#B59E74] uppercase tracking-widest">Check Your Inbox</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                A confirmation link has been sent to{" "}
                <span className="font-bold text-gray-800 break-all">{registeredEmail}</span>.
              </p>
              <p className="text-xs text-gray-400 italic leading-relaxed">
                Click the link in the email to verify your account, then return here to sign in.
                If you don't see it within a few minutes, check your spam or junk folder.
              </p>
              {registerError && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200 text-left">{registerError}</div>
              )}
              <button type="button" onClick={handleResendConfirmation} disabled={registerLoading}
                className="w-full bg-white hover:bg-gray-50 border-2 border-[#B59E74] text-[#B59E74] font-bold text-sm py-3 rounded-xl uppercase tracking-widest transition-all disabled:opacity-50">
                {registerLoading ? "Sending..." : "Resend Confirmation Email"}
              </button>
              <button type="button" onClick={switchToLogin}
                className="w-full text-xs text-gray-500 hover:text-[#B59E74] uppercase tracking-widest font-bold py-2">
                ← Back to Login
              </button>
            </div>
          )}

          {/* REGISTER — FORM */}
          {mode === "register" && !registeredEmail && (
            <form onSubmit={handleSignUp} className="p-8">
              {registerError && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200 text-center mb-6">{registerError}</div>
              )}

              {/* ACCOUNT TYPE TOGGLE */}
              <div className="mb-6 p-4 bg-white rounded-2xl border border-gray-200">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-3">Account Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
                    <input type="radio" name="accountType" value="parishioner"
                      checked={registerData.accountType === "parishioner"} onChange={handleRegisterChange}
                      className="w-4 h-4 text-[#B59E74] focus:ring-[#B59E74]" />
                    Standard Parishioner
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
                    <input type="radio" name="accountType" value="ministry"
                      checked={registerData.accountType === "ministry"} onChange={handleRegisterChange}
                      className="w-4 h-4 text-[#B59E74] focus:ring-[#B59E74]" />
                    Ministry Account
                  </label>
                </div>
                {registerData.accountType === "ministry" && (
                  <div className="mt-4 pt-4 border-t border-gray-100 animate-fade-in-up">
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-2">Select Your Ministry *</label>
                    <select name="ministryGroup" required value={registerData.ministryGroup} onChange={handleRegisterChange}
                      className="w-full p-3 rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-[#B59E74] bg-gray-50 text-sm">
                      <option value="" disabled>Choose an organization...</option>
                      {ministryNames.map(name => <option key={name} value={name}>{name}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* LEFT: Personal Info */}
                <div className="space-y-5">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">First Name</label>
                    <input name="firstName" type="text" required value={registerData.firstName} onChange={handleRegisterChange}
                      className="p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700 w-full"
                      placeholder="Juan" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Last Name</label>
                    <input name="lastName" type="text" required value={registerData.lastName} onChange={handleRegisterChange}
                      className="p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700 w-full"
                      placeholder="Dela Cruz" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Contact Number</label>
                    <input name="contactNumber" type="tel" required value={registerData.contactNumber} onChange={handleRegisterChange}
                      className="p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700 w-full"
                      placeholder="09XX XXX XXXX" />
                    <p className="text-[11px] text-gray-400 italic ml-1">Saved with your account so the parish office can reach you.</p>
                  </div>
                </div>

                {/* RIGHT: Account Info */}
                <div className="space-y-5">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Email Address</label>
                    <input name="email" type="email" required value={registerData.email} onChange={handleRegisterChange}
                      className="p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700 w-full"
                      placeholder="name@example.com" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Password</label>
                    <input name="password" type={showPassword ? "text" : "password"} required value={registerData.password}
                      onChange={handleRegisterChange}
                      className="p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700 w-full"
                      placeholder="••••••••" />
                    <ul className="text-[11px] mt-1 grid grid-cols-2 gap-y-1 ml-1">
                      {passwordRule("8+ characters", passwordCheck.minLength)}
                      {passwordRule("Uppercase letter", passwordCheck.hasUpper)}
                      {passwordRule("Lowercase letter", passwordCheck.hasLower)}
                      {passwordRule("Number", passwordCheck.hasNumber)}
                      {passwordRule("Special character", passwordCheck.hasSpecial)}
                    </ul>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Confirm Password</label>
                    <input name="confirmPassword" type={showPassword ? "text" : "password"} required
                      value={registerData.confirmPassword} onChange={handleRegisterChange}
                      className="p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700 w-full"
                      placeholder="••••••••" />
                  </div>
                  <label className="flex items-center gap-2 text-xs text-gray-600">
                    <input type="checkbox" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} className="accent-[#B59E74]" />
                    Show password
                  </label>
                </div>
              </div>

              <div className="mt-8 border-t border-gray-200 pt-6">
                <button type="submit" disabled={registerLoading}
                  className="w-full bg-[#B59E74] hover:bg-[#9c8760] text-white font-bold text-base py-4 rounded-xl transition-all shadow-md disabled:opacity-70 disabled:cursor-not-allowed uppercase tracking-widest">
                  {registerLoading ? "Creating account..." : "Sign Up"}
                </button>
                <button type="button" onClick={switchToLogin}
                  className="w-full text-xs text-gray-500 hover:text-[#B59E74] uppercase tracking-widest font-bold py-4">
                  ← Back to Login
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}

export default LoginPage;