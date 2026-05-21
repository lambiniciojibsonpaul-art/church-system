import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../contexts/useAuth";

// ---- password validation (same rules as register & UpdatePassword) ----------
function validatePassword(pw) {
  const minLength  = pw.length >= 8;
  const hasUpper   = /[A-Z]/.test(pw);
  const hasLower   = /[a-z]/.test(pw);
  const hasNumber  = /\d/.test(pw);
  // eslint-disable-next-line no-useless-escape
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(pw);
  return { minLength, hasUpper, hasLower, hasNumber, hasSpecial,
    valid: minLength && hasUpper && hasLower && hasNumber && hasSpecial };
}

// ---- role display config ----------------------------------------------------
const ROLE_CONFIG = {
  superadmin: { label: "Super Admin",  dot: "bg-emerald-500", bg: "bg-emerald-50",  border: "border-emerald-200", text: "text-emerald-800" },
  admin:      { label: "Administrator",dot: "bg-emerald-500", bg: "bg-emerald-50",  border: "border-emerald-200", text: "text-emerald-800" },
  priest:     { label: "Priest",       dot: "bg-[#B59E74]",   bg: "bg-[#fdf9f3]",  border: "border-[#B59E74]/40",text: "text-[#7a6a42]"  },
  staff:      { label: "Staff",        dot: "bg-sky-400",     bg: "bg-sky-50",      border: "border-sky-200",     text: "text-sky-800"    },
  minister:   { label: "Minister",     dot: "bg-purple-400",  bg: "bg-purple-50",   border: "border-purple-200",  text: "text-purple-800" },
  ministry:   { label: "Ministry",     dot: "bg-purple-400",  bg: "bg-purple-50",   border: "border-purple-200",  text: "text-purple-800" },
  parishioner:{ label: "Parishioner",  dot: "bg-rose-400",    bg: "bg-rose-50",     border: "border-rose-200",    text: "text-rose-800"   },
};

function getRoleCfg(role) {
  return ROLE_CONFIG[String(role || "").toLowerCase()] ?? ROLE_CONFIG.parishioner;
}

function getInitials(firstName, lastName, email) {
  if (firstName || lastName) {
    return `${(firstName || "")[0] || ""}${(lastName || "")[0] || ""}`.toUpperCase() || "?";
  }
  return (email || "?")[0].toUpperCase();
}

// ---- component ---------------------------------------------------------------
function UserProfile() {
  const { user, role, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab]   = useState("profile");
  const [profile,   setProfile]     = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Edit profile
  const [editForm, setEditForm]   = useState({ first_name: "", last_name: "", contact_number: "" });
  const [editLoading, setEditLoading] = useState(false);
  const [editSuccess, setEditSuccess] = useState(false);
  const [editError,   setEditError]   = useState(null);

  // Change password
  const [pw, setPw]             = useState({ current: "", new: "", confirm: "" });
  const [showPw, setShowPw]     = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwError,   setPwError]   = useState(null);

  const check    = validatePassword(pw.new);
  const mismatch = pw.confirm.length > 0 && pw.new !== pw.confirm;

  // ---- fetch profile on mount ------------------------------------------------
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      setProfileLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (!error && data) {
        setProfile(data);
        setEditForm({
          first_name:     data.first_name     || "",
          last_name:      data.last_name      || "",
          contact_number: data.contact_number || "",
        });
      }
      setProfileLoading(false);
    })();
  }, [user?.id]);

  // ---- guards ----------------------------------------------------------------
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F5ED]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B59E74]" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;

  // ---- handlers --------------------------------------------------------------
  const handleEditSave = async (e) => {
    e.preventDefault();
    setEditError(null);
    setEditSuccess(false);
    setEditLoading(true);
    try {
      // upsert so users whose profile row was never created can still save their details
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id:             user.id,
          email:          user.email,
          first_name:     editForm.first_name,
          last_name:      editForm.last_name,
          contact_number: editForm.contact_number,
        }, { onConflict: "id" });
      if (error) throw error;
      setProfile(prev => ({ ...prev, ...editForm }));
      setEditSuccess(true);
      setTimeout(() => setEditSuccess(false), 3000);
    } catch (err) {
      setEditError(err.message);
    } finally {
      setEditLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(false);

    if (!pw.current) { setPwError("Please enter your current password."); return; }
    if (!check.valid)  { setPwError("New password does not meet all requirements."); return; }
    if (pw.new !== pw.confirm) { setPwError("New passwords do not match."); return; }

    setPwLoading(true);
    try {
      // Re-authenticate to verify current password
      const { error: reAuthErr } = await supabase.auth.signInWithPassword({
        email:    user.email,
        password: pw.current,
      });
      if (reAuthErr) throw new Error("Current password is incorrect.");

      const { error: updateErr } = await supabase.auth.updateUser({ password: pw.new });
      if (updateErr) throw updateErr;

      setPwSuccess(true);
      setPw({ current: "", new: "", confirm: "" });
      setTimeout(() => setPwSuccess(false), 4000);
    } catch (err) {
      setPwError(err.message);
    } finally {
      setPwLoading(false);
    }
  };

  // ---- derived ---------------------------------------------------------------
  const cfg        = getRoleCfg(role);
  const initials   = getInitials(profile?.first_name, profile?.last_name, user.email);
  const fullName   = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "—";
  const ministries = Array.isArray(profile?.ministries) ? profile.ministries : [];
  const joinedDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })
    : "—";

  const rule = (label, ok) => (
    <li className={`flex items-center gap-2 transition-colors ${ok ? "text-green-700" : "text-gray-400"}`}>
      <span className="text-sm font-bold">{ok ? "✓" : "•"}</span>
      <span>{label}</span>
    </li>
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans pt-24 pb-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* ── Hero card ─────────────────────────────────────────────────── */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Gold banner */}
          <div className="h-24 bg-gradient-to-r from-[#B59E74] to-[#d4bfa0]" />

          <div className="px-8 pb-8 -mt-12">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              {/* Avatar */}
              <div className="w-24 h-24 rounded-full bg-white border-4 border-white shadow-lg flex items-center justify-center shrink-0">
                <span className="text-3xl font-serif font-bold text-[#B59E74]">{initials}</span>
              </div>

              {/* Role badge */}
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full border self-start sm:self-auto ${cfg.bg} ${cfg.border}`}>
                <span className={`w-2 h-2 rounded-full animate-pulse ${cfg.dot}`} />
                <span className={`text-[11px] font-bold uppercase tracking-widest ${cfg.text}`}>{cfg.label}</span>
              </div>
            </div>

            <div className="mt-4">
              <h1 className="text-2xl font-serif text-gray-800 font-medium">{fullName}</h1>
              <p className="text-sm text-gray-500 mt-0.5">{user.email}</p>
              <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider">Member since {joinedDate}</p>
            </div>

            {/* Ministry badges — only for minister role */}
            {(role === "minister" || role === "ministry") && ministries.length > 0 && (
              <div className="mt-5 pt-5 border-t border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Assigned Ministries</p>
                <div className="flex flex-wrap gap-2">
                  {ministries.map((m, i) => (
                    <span key={i} className="bg-purple-50 border border-purple-200 text-purple-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Tabs ──────────────────────────────────────────────────────── */}
        <div className="flex gap-1 bg-white border border-gray-100 rounded-2xl p-1.5 shadow-sm w-fit">
          {["profile", "security"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                activeTab === tab
                  ? "bg-[#B59E74] text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              {tab === "profile" ? "My Profile" : "Security"}
            </button>
          ))}
        </div>

        {/* ── Profile Tab ───────────────────────────────────────────────── */}
        {activeTab === "profile" && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
            <h2 className="text-lg font-serif text-gray-800 uppercase tracking-widest mb-6 border-b border-gray-100 pb-4">
              Personal Information
            </h2>

            {profileLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#B59E74]" />
              </div>
            ) : (
              <form onSubmit={handleEditSave} className="space-y-5">
                {editError   && <div className="p-3 bg-red-50 text-red-600 border border-red-100 rounded-xl text-sm font-bold">{editError}</div>}
                {editSuccess && <div className="p-3 bg-green-50 text-green-700 border border-green-100 rounded-xl text-sm font-bold">Profile updated successfully.</div>}

                {/* Read-only email */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Email Address</label>
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-500 select-all">
                    {user.email}
                  </div>
                  <p className="text-[10px] text-gray-400 italic ml-1">Email cannot be changed here.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">First Name</label>
                    <input
                      type="text"
                      required
                      value={editForm.first_name}
                      onChange={e => setEditForm(p => ({ ...p, first_name: e.target.value }))}
                      className="p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#B59E74] text-sm"
                      placeholder="Juan"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Last Name</label>
                    <input
                      type="text"
                      required
                      value={editForm.last_name}
                      onChange={e => setEditForm(p => ({ ...p, last_name: e.target.value }))}
                      className="p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#B59E74] text-sm"
                      placeholder="Dela Cruz"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Contact Number</label>
                  <input
                    type="tel"
                    value={editForm.contact_number}
                    onChange={e => setEditForm(p => ({ ...p, contact_number: e.target.value }))}
                    className="p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#B59E74] text-sm"
                    placeholder="09XX XXX XXXX"
                  />
                </div>

                {/* Read-only role info */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">System Role</label>
                  <div className={`w-fit flex items-center gap-2 px-4 py-2 rounded-full border ${cfg.bg} ${cfg.border}`}>
                    <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                    <span className={`text-xs font-bold uppercase tracking-widest ${cfg.text}`}>{cfg.label}</span>
                  </div>
                  <p className="text-[10px] text-gray-400 italic ml-1">Role is assigned by administrators.</p>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={editLoading}
                    className="bg-[#B59E74] hover:bg-[#9c8760] text-white font-bold py-3 px-8 rounded-xl text-xs uppercase tracking-widest transition-colors shadow-sm disabled:opacity-50"
                  >
                    {editLoading ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ── Security Tab ──────────────────────────────────────────────── */}
        {activeTab === "security" && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
            <h2 className="text-lg font-serif text-gray-800 uppercase tracking-widest mb-6 border-b border-gray-100 pb-4">
              Change Password
            </h2>

            <form onSubmit={handlePasswordChange} className="space-y-5 max-w-md">
              {pwError   && <div className="p-3 bg-red-50 text-red-600 border border-red-100 rounded-xl text-sm font-bold">{pwError}</div>}
              {pwSuccess && <div className="p-3 bg-green-50 text-green-700 border border-green-100 rounded-xl text-sm font-bold">Password changed successfully.</div>}

              {/* Current password */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Current Password</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={pw.current}
                    onChange={e => setPw(p => ({ ...p, current: e.target.value }))}
                    className="p-3 pr-16 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#B59E74] w-full text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    className="absolute inset-y-0 right-0 px-3 text-[10px] font-bold text-[#B59E74] hover:text-[#9c8760] uppercase tracking-wider"
                  >
                    {showPw ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {/* New password */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">New Password</label>
                <input
                  type={showPw ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={pw.new}
                  onChange={e => setPw(p => ({ ...p, new: e.target.value }))}
                  className="p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#B59E74] w-full text-sm"
                />
                {pw.new.length > 0 && (
                  <ul className="text-[11px] mt-1 grid grid-cols-2 gap-y-1 ml-1">
                    {rule("8+ characters", check.minLength)}
                    {rule("Uppercase letter", check.hasUpper)}
                    {rule("Lowercase letter", check.hasLower)}
                    {rule("Number", check.hasNumber)}
                    {rule("Special character", check.hasSpecial)}
                  </ul>
                )}
              </div>

              {/* Confirm new password */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Confirm New Password</label>
                <input
                  type={showPw ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={pw.confirm}
                  onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))}
                  className={`p-3 rounded-xl border focus:outline-none focus:ring-2 w-full text-sm ${
                    mismatch ? "border-red-400 focus:ring-red-300" : "border-gray-200 focus:ring-[#B59E74]"
                  }`}
                />
                {mismatch && <p className="text-[11px] text-red-500 font-bold ml-1">Passwords do not match.</p>}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={pwLoading || !check.valid || mismatch || !pw.current || !pw.confirm}
                  className="bg-[#B59E74] hover:bg-[#9c8760] text-white font-bold py-3 px-8 rounded-xl text-xs uppercase tracking-widest transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {pwLoading ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserProfile;
