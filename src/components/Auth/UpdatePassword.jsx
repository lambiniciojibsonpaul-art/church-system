import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import { useAuth } from "../../contexts/useAuth";

// Maps role → where to send the user after they set their new password
const ROLE_DESTINATIONS = {
  admin:       "/admin",
  superadmin:  "/admin",
  priest:      "/priest-dashboard",
  staff:       "/staff-dashboard",
  ministry:    "/events",
  parishioner: "/",
};

function UpdatePassword() {
  const navigate = useNavigate();
  const { role, refreshRole } = useAuth();

  const [passwords, setPasswords] = useState({ newPassword: "", confirmPassword: "" });
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const getDestination = (resolvedRole) => {
    const key = String(resolvedRole || "parishioner").toLowerCase();
    return ROLE_DESTINATIONS[key] ?? "/";
  };

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
      // 1. Update the password
      const { error: authError } = await supabase.auth.updateUser({
        password: passwords.newPassword,
      });
      if (authError) throw authError;

      // 2. Clear the requires_password_change flag
      const { error: metaError } = await supabase.auth.updateUser({
        data: { requires_password_change: null },
      });
      if (metaError) {
        console.warn("[UpdatePassword] Failed to clear flag:", metaError.message);
        // Non-fatal — password changed successfully, just flag cleanup failed
      }

      // 3. Re-fetch the role so we redirect to the right dashboard.
      //    refreshRole updates AuthContext state and returns the row.
      let destination = getDestination(role); // optimistic: use role already in context
      try {
        await refreshRole();
        // After refresh, `role` in context is updated; re-derive from it
        destination = getDestination(role);
      } catch {
        // If refresh fails, fall back to whatever was in context before
      }

      setIsSuccess(true);

      setTimeout(() => {
        navigate(destination, { replace: true });
      }, 2500);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col font-sans bg-[#F6F5ED]">
      <main className="flex-1 flex items-center justify-center p-6 mt-16 lg:mt-0">
        <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-fade-in-up border border-gray-100">

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
                <div className="p-3 rounded-lg text-center text-sm bg-red-50 text-red-600 border border-red-200 animate-pulse">
                  {error}
                </div>
              )}

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 text-center font-medium">
                🔒 Please set a new password to activate your account.
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">New Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700 w-full transition-shadow"
                  value={passwords.newPassword}
                  onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Confirm New Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700 w-full transition-shadow"
                  value={passwords.confirmPassword}
                  onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#B59E74] hover:bg-[#9c8760] text-white font-bold text-base py-4 rounded-xl transition-all shadow-md disabled:opacity-70 disabled:cursor-not-allowed uppercase tracking-widest"
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