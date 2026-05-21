import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import { useAuth } from "../../contexts/useAuth";

const ROLE_DESTINATIONS = {
  admin:       "/admin",
  superadmin:  "/admin",
  priest:      "/priest-dashboard",
  staff:       "/staff-dashboard",
  ministry:    "/events",
  minister:    "/events",
  parishioner: "/",
};

function validatePassword(password) {
  const minLength  = password.length >= 8;
  const hasUpper   = /[A-Z]/.test(password);
  const hasLower   = /[a-z]/.test(password);
  const hasNumber  = /\d/.test(password);
  // eslint-disable-next-line no-useless-escape
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password);
  return { minLength, hasUpper, hasLower, hasNumber, hasSpecial,
    valid: minLength && hasUpper && hasLower && hasNumber && hasSpecial };
}

function UpdatePassword() {
  const navigate = useNavigate();
  const { role, refreshRole } = useAuth();

  const [newPassword, setNewPassword]         = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword]       = useState(false);
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState(null);
  const [isSuccess, setIsSuccess]             = useState(false);

  const check = validatePassword(newPassword);
  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  const getDestination = (resolvedRole) => {
    const key = String(resolvedRole || "parishioner").toLowerCase();
    return ROLE_DESTINATIONS[key] ?? "/";
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError(null);

    if (!check.valid) {
      setError("Password does not meet all requirements listed below.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.updateUser({ password: newPassword });
      if (authError) throw authError;

      // Clear the requires_password_change flag from user metadata
      const { error: metaError } = await supabase.auth.updateUser({
        data: { requires_password_change: null },
      });
      if (metaError) {
        console.warn("[UpdatePassword] Failed to clear flag:", metaError.message);
      }

      // refreshRole() returns the fresh role row — use it directly to avoid
      // the stale-closure problem where `role` from the outer render is outdated.
      let destination = getDestination(role);
      try {
        const freshRow = await refreshRole();
        const freshRole = freshRow?.role ?? role;
        destination = getDestination(freshRole);
      } catch {
        // fall back to role captured at render time
      }

      setIsSuccess(true);
      setTimeout(() => navigate(destination, { replace: true }), 2500);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const rule = (label, ok) => (
    <li className={`flex items-center gap-2 transition-colors ${ok ? "text-green-700" : "text-gray-400"}`}>
      <span className="text-sm font-bold">{ok ? "✓" : "•"}</span>
      <span>{label}</span>
    </li>
  );

  return (
    <div className="relative min-h-screen w-full flex flex-col font-sans bg-[#F6F5ED]">
      <main className="flex-1 flex items-center justify-center p-6 mt-16 lg:mt-0">
        <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-fade-in-up border border-gray-100">

          {/* Header */}
          <div className="bg-white px-8 py-8 text-center border-b border-gray-200">
            <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center border-2 border-[#B59E74] text-2xl mb-4">
              {isSuccess ? "✅" : "🔐"}
            </div>
            <h2 className="text-2xl font-serif text-[#B59E74] font-medium uppercase tracking-widest">
              {isSuccess ? "Password Updated" : "Change Password"}
            </h2>
            <p className="text-sm text-gray-500 mt-2 font-serif italic">
              {isSuccess
                ? "Your password has been updated. Redirecting to your dashboard..."
                : "Your account requires a password change before continuing."}
            </p>
          </div>

          {isSuccess ? (
            <div className="p-12 text-center animate-fade-in">
              <div className="text-6xl mb-6">✨</div>
              <p className="text-gray-600 font-medium mb-8">Welcome to the Parish Portal!</p>
              <button
                onClick={() => navigate(getDestination(role), { replace: true })}
                className="bg-[#B59E74] text-white px-8 py-3 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-[#9c8760] transition-all shadow-md"
              >
                Go to Dashboard Now
              </button>
            </div>
          ) : (
            <form onSubmit={handleUpdate} className="p-8 space-y-5">
              {error && (
                <div className="p-3 rounded-lg text-center text-sm bg-red-50 text-red-600 border border-red-200">
                  {error}
                </div>
              )}

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 text-center font-medium">
                🔒 Please set a new secure password to activate your account.
              </div>

              {/* New Password */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">New Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="p-3 pr-16 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700 w-full transition-shadow"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-xs font-bold text-[#B59E74] hover:text-[#9c8760] uppercase tracking-wider"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>

                {/* Live password strength checklist */}
                {newPassword.length > 0 && (
                  <ul className="text-[11px] mt-1 grid grid-cols-2 gap-y-1 ml-1">
                    {rule("8+ characters", check.minLength)}
                    {rule("Uppercase letter", check.hasUpper)}
                    {rule("Lowercase letter", check.hasLower)}
                    {rule("Number", check.hasNumber)}
                    {rule("Special character", check.hasSpecial)}
                  </ul>
                )}
              </div>

              {/* Confirm Password */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Confirm New Password</label>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`p-3 rounded-xl border focus:outline-none focus:ring-2 bg-white text-gray-700 w-full transition-shadow ${
                    mismatch
                      ? "border-red-400 focus:ring-red-300"
                      : "border-gray-300 focus:ring-[#B59E74]"
                  }`}
                />
                {mismatch && (
                  <p className="text-[11px] text-red-500 font-bold ml-1">Passwords do not match.</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !check.valid || mismatch || confirmPassword.length === 0}
                className="w-full bg-[#B59E74] hover:bg-[#9c8760] text-white font-bold text-base py-4 rounded-xl transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest"
              >
                {loading ? "Updating..." : "Save Password & Continue"}
              </button>
            </form>
          )}

          <div className="bg-gray-50 border-t border-gray-200 p-6 text-center">
            <p className="text-xs text-gray-500 italic">
              You will remain signed in after changing your password.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default UpdatePassword;
