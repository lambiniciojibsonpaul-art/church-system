import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { restSelect } from "../supabaseRest";
import church3 from "../assets/Images/church3.jpg";

// ----- helpers --------------------------------------------------------------

const ADMIN_CACHE_KEY = (email) => `adminCache:${email.toLowerCase()}`;
const ADMIN_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

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
  const minLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  // eslint-disable-next-line no-useless-escape
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password);
  return {
    minLength,
    hasUpper,
    hasLower,
    hasNumber,
    hasSpecial,
    valid: minLength && hasUpper && hasLower && hasNumber && hasSpecial,
  };
}

// Loose contact-number cleanup (no E.164 needed — we're not sending SMS).
function cleanContactNumber(raw) {
  return (raw || "").trim();
}

// ----- component ------------------------------------------------------------

function LoginPage() {
  const navigate = useNavigate();

  // "login" | "register"
  const [mode, setMode] = useState("login");

  // ----- LOGIN STATE (unchanged from previous implementation) ----------------
  const [formData, setFormData] = useState({ email: "", password: "" });
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

    const tAuth = performance.now();
    console.log(`[Login] Auth confirmed in ${Math.round(tAuth - t0)}ms — user=${session.user.email}`);

    setUiState((prev) => ({ ...prev, overlayPhase: "success" }));

    // Long-term cache fast-path.
    const cachedRole = readLongTermAdminCache(session.user.email);
    if (cachedRole) {
      try {
        sessionStorage.setItem(
          `userRole:${session.user.id}`,
          JSON.stringify({ role: cachedRole, ts: Date.now() })
        );
      } catch { /* ignore */ }

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

    // No cache — query user_roles.
    let roleData = null;
    let lastErrorMsg = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      const { data: result, error: roleError } = await restSelect("user_roles", {
        match: { user_id: session.user.id },
        single: true,
        timeoutMs: 12000,
      });
      if (roleError) {
        lastErrorMsg = roleError.message;
        continue;
      }
      roleData = result;
      break;
    }
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
      writeLongTermAdminCache(session.user.email, roleData.role);
    }

    if (roleData?.requires_password_change) {
      navigate("/update-password", { replace: true });
      return;
    }

    const role = String(roleData?.role || "").toLowerCase();
    navigate(role === "admin" ? "/admin" : "/", { replace: true });
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
  // Single-step signup. User fills the form, clicks Sign Up, and gets an
  // email confirmation link from Supabase. They click the link to verify,
  // then return to log in. No client-side OTP entry.
  const [registerData, setRegisterData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    contactNumber: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState(null);
  // After successful signup we show a "check your email" success screen.
  const [registeredEmail, setRegisteredEmail] = useState(null);

  const passwordCheck = validatePassword(registerData.password);

  const handleRegisterChange = (e) => {
    const { name, value } = e.target;
    setRegisterData((prev) => ({ ...prev, [name]: value }));
  };

  const switchToLogin = () => {
    setMode("login");
    setRegisterError(null);
    setRegisteredEmail(null);
  };

  const switchToRegister = () => {
    setMode("register");
    setUiState((prev) => ({ ...prev, error: null }));
  };

  const handleSignUp = async (e) => {
    e?.preventDefault?.();
    setRegisterError(null);

    // Validate.
    if (!registerData.email.includes("@")) {
      setRegisterError("Please enter a valid email address.");
      return;
    }
    if (!passwordCheck.valid) {
      setRegisterError(
        "Password must be at least 8 characters with an uppercase, lowercase, number, and special character."
      );
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
      // signUp creates the user with the password persisted transactionally.
      // Supabase sends the confirmation email automatically (provided
      // "Confirm email" is enabled in Authentication → Providers → Email).
      const { data: signupData, error } = await supabase.auth.signUp({
        email: registerData.email,
        password: registerData.password,
        options: {
          data: { contact_number: contact },
        },
      });
      if (error) {
        if (
          /already registered|user already exists|already signed up/i.test(
            error.message
          )
        ) {
          throw new Error(
            "This email is already registered. Please sign in instead."
          );
        }
        throw error;
      }

      // If signUp returned a session, "Confirm email" is OFF in the project
      // — the user is already authenticated and verified. Send them straight
      // to the home page so they can use the app immediately.
      //
      // If no session was returned, email confirmation is required. Show the
      // "check your inbox" screen and let them confirm via the email link.
      if (signupData?.session) {
        navigate("/", { replace: true });
        return;
      }

      setRegisteredEmail(registerData.email);
    } catch (err) {
      setRegisterError(err.message);
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!registeredEmail) return;
    setRegisterError(null);
    setRegisterLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: registeredEmail,
      });
      if (error) throw error;
    } catch (err) {
      setRegisterError("Could not resend confirmation: " + err.message);
    } finally {
      setRegisterLoading(false);
    }
  };

  const backgroundStyle = useMemo(
    () => ({
      backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url('${church3}')`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundAttachment: "fixed",
    }),
    []
  );

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

      <main
        style={backgroundStyle}
        className="flex-1 flex items-center justify-center p-6 mt-16 lg:mt-0"
      >
        <div className="bg-[#F6F5ED] w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up my-12">
          {/* HEADER */}
          <div className="bg-white px-8 py-8 text-center border-b border-gray-200">
            <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center border-2 border-[#B59E74] text-2xl mb-4">
              ⛪
            </div>
            <h2 className="text-2xl font-serif text-[#B59E74] font-medium uppercase tracking-widest">
              {mode === "login" ? "Parish Portal" : "Create Account"}
            </h2>
            <p className="text-sm text-gray-500 mt-2 font-serif italic">
              {mode === "login"
                ? "Please sign in to access your account."
                : "Register to request parish services."}
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
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Email Address
                  </label>
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
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Password
                  </label>
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

              {/* SWITCH TO REGISTER */}
              <div className="bg-gray-50 border-t border-gray-200 p-6 text-center space-y-3">
                <p className="text-xs text-gray-500 font-serif italic">
                  Don't have an account yet?
                </p>
                <button
                  type="button"
                  onClick={switchToRegister}
                  className="w-full bg-white hover:bg-gray-100 border-2 border-[#B59E74] text-[#B59E74] font-bold text-sm py-3 rounded-xl transition-all uppercase tracking-widest"
                >
                  Create an Account
                </button>
              </div>
            </>
          )}

          {/* REGISTER — SUCCESS SCREEN ("check your inbox") */}
          {mode === "register" && registeredEmail && (
            <div className="p-8 space-y-5 text-center">
              <div className="w-20 h-20 mx-auto rounded-full bg-[#F6F5ED] flex items-center justify-center text-3xl border-2 border-[#B59E74]">
                📧
              </div>
              <h3 className="text-lg font-serif text-[#B59E74] uppercase tracking-widest">
                Check Your Inbox
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                A confirmation link has been sent to{" "}
                <span className="font-bold text-gray-800 break-all">{registeredEmail}</span>.
              </p>
              <p className="text-xs text-gray-400 italic leading-relaxed">
                Click the link in the email to verify your account, then return
                here to sign in. If you don't see it within a few minutes, check
                your spam or junk folder.
              </p>

              {registerError && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200 text-left">
                  {registerError}
                </div>
              )}

              <button
                type="button"
                onClick={handleResendConfirmation}
                disabled={registerLoading}
                className="w-full bg-white hover:bg-gray-50 border-2 border-[#B59E74] text-[#B59E74] font-bold text-sm py-3 rounded-xl uppercase tracking-widest transition-all disabled:opacity-50"
              >
                {registerLoading ? "Sending..." : "Resend Confirmation Email"}
              </button>

              <button
                type="button"
                onClick={switchToLogin}
                className="w-full text-xs text-gray-500 hover:text-[#B59E74] uppercase tracking-widest font-bold py-2"
              >
                ← Back to Login
              </button>
            </div>
          )}

          {/* REGISTER — FORM */}
          {mode === "register" && !registeredEmail && (
            <form onSubmit={handleSignUp} className="p-8 space-y-5">
              {registerError && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200 text-center">
                  {registerError}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Email Address
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  value={registerData.email}
                  onChange={handleRegisterChange}
                  className="p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700 w-full"
                  placeholder="name@example.com"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Password
                </label>
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={registerData.password}
                  onChange={handleRegisterChange}
                  className="p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700 w-full"
                  placeholder="••••••••"
                />
                <ul className="text-[11px] mt-1 grid grid-cols-2 gap-y-1 ml-1">
                  {passwordRule("8+ characters", passwordCheck.minLength)}
                  {passwordRule("Uppercase letter", passwordCheck.hasUpper)}
                  {passwordRule("Lowercase letter", passwordCheck.hasLower)}
                  {passwordRule("Number", passwordCheck.hasNumber)}
                  {passwordRule("Special character", passwordCheck.hasSpecial)}
                </ul>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Confirm Password
                </label>
                <input
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  required
                  value={registerData.confirmPassword}
                  onChange={handleRegisterChange}
                  className="p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700 w-full"
                  placeholder="••••••••"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  className="accent-[#B59E74]"
                />
                Show password
              </label>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Contact Number
                </label>
                <input
                  name="contactNumber"
                  type="tel"
                  required
                  value={registerData.contactNumber}
                  onChange={handleRegisterChange}
                  className="p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700 w-full"
                  placeholder="09XX XXX XXXX"
                />
                <p className="text-[11px] text-gray-400 italic ml-1">
                  Saved with your account so the parish office can reach you.
                </p>
              </div>

              <button
                type="submit"
                disabled={registerLoading}
                className="w-full bg-[#B59E74] hover:bg-[#9c8760] text-white font-bold text-base py-4 rounded-xl transition-all shadow-md disabled:opacity-70 disabled:cursor-not-allowed mt-2 uppercase tracking-widest"
              >
                {registerLoading ? "Creating account..." : "Sign Up"}
              </button>

              <button
                type="button"
                onClick={switchToLogin}
                className="w-full text-xs text-gray-500 hover:text-[#B59E74] uppercase tracking-widest font-bold py-2"
              >
                ← Back to Login
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}

export default LoginPage;
