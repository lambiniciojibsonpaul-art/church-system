import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../contexts/useAuth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_RE = /^[A-Za-zÀ-ÖØ-öø-ÿÑñ' .-]+$/;
const CONTACT_RE = /^\d{11}$/;
const NAME_MAX = 60;
const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]).{8,}$/;

// Custom searchable dropdown for the ministry sort filter in the users panel
function MinistryFilterDropdown({ value, onChange, options = [] }) {
  const [open, setOpen]     = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const filtered = options.filter(m => m.name.toLowerCase().includes(search.toLowerCase()));
  const label    = value === "All" ? "All Ministries" : value;

  return (
    <div ref={ref} className="relative w-full">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => { setOpen(v => !v); setSearch(""); }}
        className="w-full flex items-center justify-between pl-4 pr-3 py-2.5 rounded-xl border border-purple-200 bg-purple-50 text-xs font-bold text-purple-700 hover:border-purple-400 transition-colors"
      >
        <span className="truncate">{label}</span>
        <svg className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-purple-200 shadow-lg z-50 overflow-hidden">
          {/* Search inside the panel */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m1.85-5.4a7.25 7.25 0 11-14.5 0 7.25 7.25 0 0114.5 0z" />
              </svg>
              <input
                autoFocus
                type="text"
                placeholder="Search ministry..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-7 pr-3 py-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400 bg-gray-50"
              />
            </div>
          </div>

          {/* Options */}
          <div className="max-h-52 overflow-y-auto">
            <button
              type="button"
              onClick={() => { onChange("All"); setOpen(false); }}
              className={`w-full text-left px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors ${value === "All" ? "bg-purple-50 text-purple-700" : "text-gray-500 hover:bg-gray-50"}`}
            >
              All Ministries
            </button>
            {filtered.map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => { onChange(m.name); setOpen(false); }}
                className={`w-full text-left px-4 py-2.5 text-xs transition-colors ${value === m.name ? "bg-purple-50 text-purple-700 font-bold" : "text-gray-600 hover:bg-gray-50 font-medium"}`}
              >
                {m.name}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-4 py-3 text-xs text-gray-400 italic text-center">No results for &ldquo;{search}&rdquo;</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Standalone so useState is stable across parent re-renders
function MinistryChecklist({ activeMinistries = [], selected, onToggle, emptyMessage = "No active ministries found." }) {
  const [search, setSearch] = useState("");
  const filtered = activeMinistries.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-1.5">
      {activeMinistries.length > 0 && (
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m1.85-5.4a7.25 7.25 0 11-14.5 0 7.25 7.25 0 0114.5 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search ministries..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-7 pr-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-400 text-xs bg-white"
          />
        </div>
      )}
      <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-xl bg-gray-50 p-2 space-y-1">
        {filtered.length === 0 ? (
          <p className="text-xs text-gray-400 italic text-center py-4">
            {search ? `No results for "${search}"` : emptyMessage}
          </p>
        ) : (
          filtered.map(m => (
            <label
              key={m.id}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${
                selected.includes(m.name)
                  ? "bg-purple-50 border border-purple-200 text-purple-800"
                  : "hover:bg-white border border-transparent text-gray-700"
              }`}
            >
              <input
                type="checkbox"
                checked={selected.includes(m.name)}
                onChange={() => onToggle(m.name)}
                className="w-4 h-4 accent-purple-600 shrink-0"
              />
              <span className="text-xs font-medium leading-tight">{m.name}</span>
            </label>
          ))
        )}
      </div>
    </div>
  );
}

function ManageUsers() {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);

  // Filtering States
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [ministryFilter, setMinistryFilter] = useState("All");

  // Mobile tab: "users" | "create"
  const [mobileTab, setMobileTab] = useState("users");

  // Active ministries from DB (for checkboxes + filter dropdown)
  const [activeMinistries, setActiveMinistries] = useState([]);

  // Create Account State
  const [createForm, setCreateForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    contact_number: "",
    password: "",
    role: "staff",
    ministries: [],
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [createSuccess, setCreateSuccess] = useState(false);

  // Edit Modal State
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    first_name: "",
    last_name: "",
    contact_number: "",
    ministries: [],
    priest_subtitle: "",
    priest_photo_url: "",
    priest_is_leadership: false,
  });
  const [priestPhotoFile, setPriestPhotoFile] = useState(null);
  const [priestPhotoPreview, setPriestPhotoPreview] = useState("");
  const [saving, setSaving] = useState(false);

  // Role-change → Minister modal (intercepts the inline role dropdown)
  const [roleChangeModal, setRoleChangeModal] = useState(null); // { userId, newRole, userName }
  const [roleChangeMinistries, setRoleChangeMinistries] = useState([]);
  const [roleChangeLoading, setRoleChangeLoading] = useState(false);

  // Delete Modal State
  const [deletingUser, setDeletingUser] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Right panel tab: "all" users or "pending" ministry approvals
  const [usersTab, setUsersTab] = useState("all");

  useEffect(() => {
    fetchUsers();
    fetchActiveMinistries();
  }, []);

  useEffect(() => {
    if (!priestPhotoFile) {
      setPriestPhotoPreview("");
      return;
    }
    const url = URL.createObjectURL(priestPhotoFile);
    setPriestPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [priestPhotoFile]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: profiles, error: profileErr } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profileErr) throw profileErr;

      const { data: roles, error: rolesErr } = await supabase
        .from("user_roles")
        .select("*");

      if (rolesErr) throw rolesErr;

      const mergedUsers = profiles.map(profile => {
        const userRoleRow = roles?.find(r => r.user_id === profile.id);
        let assignedRole = userRoleRow ? userRoleRow.role.toLowerCase() : "parishioner";
        if (assignedRole === "user") assignedRole = "parishioner";

        return {
          ...profile,
          role: assignedRole,
          ministries: profile.ministries || [],
          approval_status: userRoleRow?.approval_status || "approved",
          pending_ministries: userRoleRow?.pending_ministries || [],
        };
      });

      setUsers(mergedUsers);
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveMinistries = async () => {
    try {
      const { data, error } = await supabase
        .from("ministries")
        .select("id, name")
        .eq("is_archived", false)
        .order("name", { ascending: true });
      if (!error && data) setActiveMinistries(data);
    } catch (err) {
      console.error("Error fetching ministries:", err);
    }
  };

  const toggleCreateMinistry = (name) => {
    setCreateForm(prev => ({
      ...prev,
      ministries: prev.ministries.includes(name)
        ? prev.ministries.filter(m => m !== name)
        : [...prev.ministries, name],
    }));
  };

  // --- ACCOUNT CREATION LOGIC ---
  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setCreateError(null);
    setCreateSuccess(false);
    setCreateLoading(true);

    const firstName = createForm.first_name.trim();
    const lastName = createForm.last_name.trim();
    const email = createForm.email.trim().toLowerCase();
    const contact = createForm.contact_number.trim();

    if (!firstName || !lastName) {
      setCreateError("First name and last name are required.");
      setCreateLoading(false);
      return;
    }
    if (!NAME_RE.test(firstName) || !NAME_RE.test(lastName)) {
      setCreateError("Names must contain letters only.");
      setCreateLoading(false);
      return;
    }
    if (firstName.length > NAME_MAX || lastName.length > NAME_MAX) {
      setCreateError(`First and last name must be ${NAME_MAX} characters or less.`);
      setCreateLoading(false);
      return;
    }
    if (!EMAIL_RE.test(email)) {
      setCreateError("Please enter a valid email address.");
      setCreateLoading(false);
      return;
    }
    if (contact && !CONTACT_RE.test(contact)) {
      setCreateError("Contact number must be exactly 11 digits.");
      setCreateLoading(false);
      return;
    }

    if (!PASSWORD_RE.test(createForm.password)) {
      setCreateError("Password must be at least 8 characters with uppercase, lowercase, number, and special character.");
      setCreateLoading(false);
      return;
    }
    if (createForm.role === "minister" && createForm.ministries.length === 0) {
      setCreateError("Please assign at least one ministry.");
      setCreateLoading(false);
      return;
    }

    try {
      // Step 1: Create auth user + assign role (edge function, service-role key)
      const { data: edgeData, error: edgeErr } = await supabase.functions.invoke("create-user", {
        body: {
          email,
          password: createForm.password,
          role: createForm.role,
          first_name: firstName,
          last_name: lastName,
          contact_number: contact,
          ministries: createForm.role === "minister" ? createForm.ministries : [],
        },
      });

      if (edgeErr) throw edgeErr;
      if (edgeData?.error) throw new Error(edgeData.error);

      const newUserId = edgeData?.user?.id;
      if (!newUserId) throw new Error("Account was created but no user ID was returned. Contact support.");

      // Step 2: Save profile details directly from the frontend.
      // The "admins_manage_profiles" RLS policy allows this for admin/superadmin roles.
      // This is the primary save path and does not depend on edge function version.
      const profilePayload = {
        id:             newUserId,
        email,
        first_name:     firstName,
        last_name:      lastName,
        contact_number: contact,
      };
      if (createForm.role === "minister" && createForm.ministries.length > 0) {
        profilePayload.ministries = createForm.ministries;
      }

      const { error: profileErr } = await supabase
        .from("profiles")
        .upsert(profilePayload, { onConflict: "id" });

      if (profileErr) throw new Error(`Account created but profile save failed: ${profileErr.message}`);

      // Step 3: Ensure priest record exists for priest role
      if (createForm.role === "priest") {
        const fullName = `${firstName} ${lastName}`.trim();
        const { error: priestErr } = await supabase
          .from("priests")
          .upsert({
            user_id: newUserId,
            name: fullName,
            first_name: firstName || null,
            last_name: lastName || null,
            is_active: true,
          }, { onConflict: "user_id" });
        if (priestErr) console.warn("[ManageUsers] priests table upsert failed:", priestErr.message);
      }

      setCreateSuccess(true);
      fetchUsers();
      setCreateForm({
        first_name: "",
        last_name: "",
        email: "",
        contact_number: "",
        password: "",
        role: "staff",
        ministries: [],
      });
      setTimeout(() => setCreateSuccess(false), 4000);
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreateLoading(false);
    }
  };

  // --- ROLE MANAGEMENT ---
  // If changing TO minister, intercept and open the ministry-assignment modal first.
  const handleRoleChange = (userId, newRole) => {
    if (newRole === "minister") {
      const targetUser = users.find(u => u.id === userId);
      const userName = `${targetUser?.first_name || ""} ${targetUser?.last_name || ""}`.trim() || "this user";
      setRoleChangeModal({ userId, newRole, userName });
      setRoleChangeMinistries([]);
      return;
    }
    applyRoleChange(userId, newRole, null);
  };

  const applyRoleChange = async (userId, newRole, ministries) => {
    try {
      const targetUser = users.find(u => u.id === userId);
      const fullName = `${targetUser?.first_name || ""} ${targetUser?.last_name || ""}`.trim() || "Unknown";

      if (newRole === "parishioner") {
        const { error } = await supabase.from("user_roles").delete().eq("user_id", userId);
        if (error) throw error;
      } else {
        const { data: updated, error: updateErr } = await supabase
          .from("user_roles")
          .update({ role: newRole })
          .eq("user_id", userId)
          .select();
        if (updateErr) throw updateErr;

        if (!updated || updated.length === 0) {
          const { error: insertErr } = await supabase
            .from("user_roles")
            .insert({ user_id: userId, role: newRole });
          if (insertErr) throw insertErr;
        }
      }

      // Save ministries to profile when role is minister
      if (newRole === "minister" && ministries) {
        await supabase
          .from("profiles")
          .update({ ministries })
          .eq("id", userId);
      }

      if (newRole === "priest") {
        const { data: existingPriest } = await supabase
          .from("priests")
          .select("user_id")
          .eq("user_id", userId)
          .maybeSingle();

        if (existingPriest) {
          await supabase.from("priests").update({
            name: fullName,
            first_name: targetUser?.first_name || null,
            last_name: targetUser?.last_name || null,
            is_active: true,
          }).eq("user_id", userId);
        } else {
          const { error: priestInsertErr } = await supabase
            .from("priests")
            .insert({
              user_id: userId,
              name: fullName,
              first_name: targetUser?.first_name || null,
              last_name: targetUser?.last_name || null,
              is_active: true,
            });
          if (!priestInsertErr) console.log(`[ManageUsers] ${fullName} added to priests table.`);
        }
      } else {
        const { error: priestDeactivateErr } = await supabase
          .from("priests")
          .update({ is_active: false, is_leadership: false })
          .eq("user_id", userId);
        if (!priestDeactivateErr) console.log(`[ManageUsers] ${fullName} deactivated in priests table.`);
      }

      setUsers(prev =>
        prev.map(u =>
          u.id === userId
            ? { ...u, role: newRole, ministries: newRole === "minister" ? (ministries ?? u.ministries) : u.ministries }
            : u
        )
      );
    } catch (err) {
      console.error("Role Update Error:", err);
      alert("Failed to update role: " + err.message);
      fetchUsers();
    }
  };

  const handleConfirmRoleWithMinistries = async () => {
    if (roleChangeMinistries.length === 0) return;
    setRoleChangeLoading(true);
    await applyRoleChange(roleChangeModal.userId, roleChangeModal.newRole, roleChangeMinistries);
    setRoleChangeLoading(false);
    setRoleChangeModal(null);
    setRoleChangeMinistries([]);
  };

  // --- PROFILE EDITING ---
  const openEditModal = async (userRecord) => {
    setEditingUser(userRecord);
    setPriestPhotoFile(null);
    setEditForm({
      first_name: userRecord.first_name || "",
      last_name: userRecord.last_name || "",
      contact_number: userRecord.contact_number || "",
      ministries: Array.isArray(userRecord.ministries) ? [...userRecord.ministries] : [],
      priest_subtitle: "",
      priest_photo_url: "",
      priest_is_leadership: false,
    });

    if (userRecord.role === "priest") {
      const { data } = await supabase
        .from("priests")
        .select("subtitle, photo_url, is_leadership")
        .eq("user_id", userRecord.id)
        .maybeSingle();

      if (data) {
        setEditForm((prev) => ({
          ...prev,
          priest_subtitle: data.subtitle || "",
          priest_photo_url: data.photo_url || "",
          priest_is_leadership: !!data.is_leadership,
        }));
      }
    }
  };

  const toggleEditMinistry = (name) => {
    setEditForm(prev => ({
      ...prev,
      ministries: prev.ministries.includes(name)
        ? prev.ministries.filter(m => m !== name)
        : [...prev.ministries, name],
    }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    if (editingUser.role === "minister" && editForm.ministries.length === 0) {
      alert("A minister must have at least one ministry assigned.");
      return;
    }

    const firstName = editForm.first_name.trim();
    const lastName = editForm.last_name.trim();
    const contact = editForm.contact_number.trim();

    if (!firstName || !lastName) {
      alert("First name and last name are required.");
      return;
    }
    if (!NAME_RE.test(firstName) || !NAME_RE.test(lastName)) {
      alert("Names must contain letters only.");
      return;
    }
    if (firstName.length > NAME_MAX || lastName.length > NAME_MAX) {
      alert(`First and last name must be ${NAME_MAX} characters or less.`);
      return;
    }
    if (contact && !CONTACT_RE.test(contact)) {
      alert("Contact number must be exactly 11 digits.");
      return;
    }

    setSaving(true);
    try {
      const updatePayload = {
        first_name: firstName,
        last_name: lastName,
        contact_number: contact,
      };
      if (editingUser.role === "minister") {
        updatePayload.ministries = editForm.ministries;
      }

      const { error } = await supabase
        .from("profiles")
        .update(updatePayload)
        .eq("id", editingUser.id);

      if (error) throw error;

      if (editingUser.role === "priest") {
        let photoUrl = editForm.priest_photo_url || null;

        if (priestPhotoFile) {
          const ext = (priestPhotoFile.name.split(".").pop() || "jpg").toLowerCase();
          const safeExt = ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";
          const path = `${editingUser.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`;

          const { error: uploadErr } = await supabase
            .storage
            .from("priest-photos")
            .upload(path, priestPhotoFile, { upsert: false, cacheControl: "3600" });
          if (uploadErr) throw new Error(`Photo upload failed: ${uploadErr.message}`);

          const { data: publicData } = supabase.storage.from("priest-photos").getPublicUrl(path);
          photoUrl = publicData?.publicUrl || photoUrl;
        }

        const fullName = `${firstName} ${lastName}`.trim();

        if (editForm.priest_is_leadership) {
          await supabase
            .from("priests")
            .update({ is_leadership: false })
            .eq("is_leadership", true)
            .neq("user_id", editingUser.id);
        }

        const { error: priestErr } = await supabase
          .from("priests")
          .upsert({
            user_id: editingUser.id,
            is_active: true,
            name: fullName,
            first_name: firstName || null,
            last_name: lastName || null,
            subtitle: editForm.priest_subtitle?.trim() || null,
            photo_url: photoUrl || null,
            is_leadership: !!editForm.priest_is_leadership,
          }, { onConflict: "user_id" });
        if (priestErr) throw priestErr;
      }

      setUsers(prev =>
        prev.map(u =>
          u.id === editingUser.id
            ? { ...u, ...updatePayload }
            : u
        )
      );
      setEditingUser(null);
    } catch (err) {
      alert("Failed to update profile: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // --- ACCOUNT DELETION LOGIC ---
  const confirmDelete = async () => {
    if (!deletingUser) return;
    setDeleteSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("delete-user", {
        body: { target_user_id: deletingUser.id },
      });
      if (error) throw error;
      setUsers(users.filter(u => u.id !== deletingUser.id));
      setDeletingUser(null);
    } catch (err) {
      alert("Failed to delete user: " + err.message);
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // --- MINISTRY APPROVAL ---
  const handleApproveMinistry = async (userId) => {
    const pendingUser = users.find(u => u.id === userId);
    const ministries = pendingUser?.pending_ministries || [];
    try {
      // Promote role to minister and clear pending status
      const { error: roleErr } = await supabase
        .from("user_roles")
        .update({ role: "minister", approval_status: "approved" })
        .eq("user_id", userId);
      if (roleErr) throw roleErr;

      // Save chosen ministries to the profile (admin RLS policy allows this)
      if (ministries.length > 0) {
        await supabase
          .from("profiles")
          .upsert({ id: userId, ministries }, { onConflict: "id" });
      }

      setUsers(prev => prev.map(u =>
        u.id === userId
          ? { ...u, role: "minister", approval_status: "approved", ministries }
          : u
      ));
    } catch (err) {
      alert("Failed to approve account: " + err.message);
    }
  };

  // --- FILTERING LOGIC ---
  const filteredUsers = users.filter(u => {
    // Pending ministry self-registrations live in the Pending tab, not the main list
    if (u.role === "ministry" && u.approval_status === "pending") return false;
    const searchStr = searchQuery.toLowerCase();
    const fullName = `${u.first_name || ""} ${u.last_name || ""}`.toLowerCase();
    const matchesSearch = fullName.includes(searchStr) || (u.email && u.email.toLowerCase().includes(searchStr));
    const matchesRole = roleFilter === "All" || u.role === roleFilter.toLowerCase();
    const matchesMinistry =
      roleFilter !== "minister" ||
      ministryFilter === "All" ||
      (Array.isArray(u.ministries) && u.ministries.includes(ministryFilter));
    return matchesSearch && matchesRole && matchesMinistry;
  });

  if (!isAdmin) {
    return <div className="min-h-screen flex items-center justify-center text-red-500 font-bold">Access Denied. Admins Only.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans md:h-screen md:overflow-hidden">
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-20 pb-6 flex flex-col md:h-full">

        <div className="shrink-0">
          <div className="flex gap-4 mb-4 border-b border-gray-200 pb-2">
            <Link to="/admin" className="text-gray-500 hover:text-[#B59E74] font-bold uppercase tracking-widest text-sm transition-colors">Dashboard</Link>
            <span className="text-gray-300">|</span>
            <span className="text-[#B59E74] font-bold uppercase tracking-widest text-sm border-b-2 border-[#B59E74] pb-2 -mb-[9px]">Staff & Accounts</span>
          </div>
          <div className="mb-4">
            <h1 className="text-2xl md:text-4xl font-serif text-gray-800 uppercase tracking-wide">Manage Accounts</h1>
            <p className="text-gray-500 font-serif italic mt-1 text-sm">Create new staff accounts, manage roles, and remove users.</p>
          </div>

          {/* Mobile tab switcher — hidden at md+ where side-by-side kicks in */}
          <div className="md:hidden flex gap-1 bg-white border border-gray-100 rounded-2xl p-1.5 shadow-sm mb-4">
            <button
              onClick={() => { setMobileTab("users"); setUsersTab("all"); }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                mobileTab === "users"
                  ? "bg-[#B59E74] text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              👥 Users
            </button>
            <button
              onClick={() => { setMobileTab("pending"); setUsersTab("pending"); }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all relative ${
                mobileTab === "pending"
                  ? "bg-amber-500 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              ⏳ Pending
              {users.filter(u => u.role === "ministry" && u.approval_status === "pending").length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {users.filter(u => u.role === "ministry" && u.approval_status === "pending").length}
                </span>
              )}
            </button>
            <button
              onClick={() => setMobileTab("create")}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                mobileTab === "create"
                  ? "bg-[#B59E74] text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              👤 Create
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 lg:gap-8 md:flex-1 md:min-h-0 md:overflow-hidden pb-4">

          {/* LEFT SIDE: CREATE ACCOUNT */}
          <div className={`${mobileTab === "create" ? "block" : "hidden"} md:block md:w-[320px] lg:w-[400px] md:shrink-0 md:h-full overflow-y-auto scrollbar-thin md:pr-1`}>
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6 sm:p-8">
              <div className="mb-6 border-b border-gray-100 pb-4">
                <div className="w-12 h-12 rounded-full bg-[#B59E74]/10 text-[#B59E74] flex items-center justify-center text-xl mb-4">👤</div>
                <h2 className="text-xl font-serif text-gray-800 font-medium uppercase tracking-widest">Create Account</h2>
                <p className="text-xs text-gray-500 italic mt-1">Generate access for staff, priests, or ministries.</p>
              </div>

              <form onSubmit={handleCreateAccount} className="space-y-4">
                {createError && <div className="p-3 bg-red-50 text-red-600 border border-red-100 rounded-xl text-xs font-bold text-center">{createError}</div>}
                {createSuccess && <div className="p-3 bg-green-50 text-green-600 border border-green-100 rounded-xl text-xs font-bold text-center">Account created successfully!</div>}

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Role *</label>
                  <select
                    value={createForm.role}
                    onChange={e => setCreateForm({ ...createForm, role: e.target.value, ministries: [] })}
                    className="p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#B59E74] text-sm font-bold text-gray-700 bg-gray-50"
                  >
                    <option value="staff">Staff</option>
                    <option value="minister">Minister</option>
                    <option value="priest">Priest</option>
                    <option value="admin">Admin</option>
                    <option value="parishioner">Parishioner</option>
                  </select>
                </div>

                {createForm.role === "minister" && (
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                      Assigned Ministries *
                      {createForm.ministries.length > 0 && (
                        <span className="ml-2 bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-[9px] font-bold">
                          {createForm.ministries.length} selected
                        </span>
                      )}
                    </label>
                    <MinistryChecklist activeMinistries={activeMinistries} selected={createForm.ministries} onToggle={toggleCreateMinistry} />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">First Name *</label>
                    <input type="text" required maxLength={NAME_MAX} value={createForm.first_name} onChange={e => setCreateForm({...createForm, first_name: e.target.value.replace(/[^a-zA-ZÀ-ÿñÑ\s'.-]/g, "")})} className="p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#B59E74] text-sm" placeholder="Juan"/>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Last Name *</label>
                    <input type="text" required maxLength={NAME_MAX} value={createForm.last_name} onChange={e => setCreateForm({...createForm, last_name: e.target.value.replace(/[^a-zA-ZÀ-ÿñÑ\s'.-]/g, "")})} className="p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#B59E74] text-sm" placeholder="Dela Cruz"/>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Email Address *</label>
                  <input type="email" required value={createForm.email} onChange={e => setCreateForm({...createForm, email: e.target.value})} className="p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#B59E74] text-sm" placeholder="name@parish.com"/>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Temporary Password *</label>
                  <input type="text" required value={createForm.password} onChange={e => setCreateForm({...createForm, password: e.target.value})} className="p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#B59E74] text-sm" placeholder="At least 6 characters"/>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Contact Number</label>
                  <input type="tel" value={createForm.contact_number} onChange={e => setCreateForm({...createForm, contact_number: e.target.value.replace(/\D/g, "").slice(0, 11)})} maxLength={11} className="p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#B59E74] text-sm" placeholder="09XX XXX XXXX"/>
                </div>

                <button type="submit" disabled={createLoading} className="w-full mt-2 bg-[#B59E74] hover:bg-[#9c8760] text-white font-bold py-3 rounded-xl text-xs uppercase tracking-widest transition-colors shadow-md disabled:opacity-50">
                  {createLoading ? "Creating..." : "Generate Account"}
                </button>
              </form>
            </div>
          </div>

          {/* RIGHT SIDE: DATABASE TABLE */}
          <div className={`${(mobileTab === "users" || mobileTab === "pending") ? "flex" : "hidden"} md:flex flex-col flex-1 bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden h-[calc(100svh-200px)] md:h-full`}>

            {/* Desktop tab bar */}
            <div className="shrink-0 hidden md:flex gap-1 p-3 border-b border-gray-100 bg-gray-50/50">
              <button
                onClick={() => setUsersTab("all")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                  usersTab === "all" ? "bg-[#B59E74] text-white shadow-sm" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`}
              >
                All Users
              </button>
              <button
                onClick={() => setUsersTab("pending")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all relative ${
                  usersTab === "pending" ? "bg-amber-500 text-white shadow-sm" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`}
              >
                Pending Ministry
                {users.filter(u => u.role === "ministry" && u.approval_status === "pending").length > 0 && (
                  <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${usersTab === "pending" ? "bg-white/30 text-white" : "bg-amber-100 text-amber-700"}`}>
                    {users.filter(u => u.role === "ministry" && u.approval_status === "pending").length}
                  </span>
                )}
              </button>
            </div>

            {/* ALL USERS — header with search/filter */}
            {usersTab === "all" && (
            <div className="shrink-0 p-5 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-start gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <span className="text-xl">🗄️</span>
                <div>
                  <h2 className="text-lg font-serif text-gray-800 font-medium uppercase tracking-widest leading-none">Users</h2>
                  <p className="text-[11px] text-gray-500 italic mt-0.5">Total Accounts: {filteredUsers.length}</p>
                </div>
              </div>

              <div className="flex flex-col gap-2 w-full sm:w-auto">
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-64">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m1.85-5.4a7.25 7.25 0 11-14.5 0 7.25 7.25 0 0114.5 0z" /></svg>
                    <input type="text" placeholder="Search name or email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#B59E74] text-sm" />
                  </div>
                  <select
                    value={roleFilter}
                    onChange={(e) => { setRoleFilter(e.target.value); setMinistryFilter("All"); }}
                    className="py-2.5 pl-4 pr-8 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#B59E74] text-sm font-bold text-gray-600 bg-white cursor-pointer outline-none"
                  >
                    <option value="All">All Roles</option>
                    <option value="admin">Admin</option>
                    <option value="staff">Staff</option>
                    <option value="minister">Minister</option>
                    <option value="priest">Priest</option>
<option value="parishioner">Parishioner</option>
                  </select>
                </div>

                {roleFilter === "minister" && (
                  <MinistryFilterDropdown
                    value={ministryFilter}
                    onChange={setMinistryFilter}
                    options={activeMinistries}
                  />
                )}
              </div>
            </div>
            )}

            <div className="flex-1 overflow-y-auto scrollbar-thin">

              {/* PENDING MINISTRY APPROVALS */}
              {usersTab === "pending" && (() => {
                const pendingUsers = users.filter(u => u.role === "ministry" && u.approval_status === "pending");
                if (loading) return <div className="flex h-full items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-400"></div></div>;
                if (pendingUsers.length === 0) return (
                  <div className="p-16 text-center">
                    <div className="text-4xl mb-4">✅</div>
                    <p className="text-gray-400 font-serif italic">No pending ministry registrations.</p>
                  </div>
                );
                return (
                  <div className="divide-y divide-gray-100">
                    {pendingUsers.map(u => (
                      <div key={u.id} className="p-5 flex flex-col gap-3 hover:bg-amber-50/40 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-serif text-gray-800 font-medium text-base leading-tight">
                              {u.first_name || u.last_name ? `${u.first_name || ""} ${u.last_name || ""}` : "Unknown Name"}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">{u.email}</p>
                            {u.contact_number && <p className="text-[11px] text-gray-400 mt-0.5">{u.contact_number}</p>}
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-1">
                              Registered {new Date(u.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
                            Pending
                          </span>
                        </div>
                        {Array.isArray(u.pending_ministries) && u.pending_ministries.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {u.pending_ministries.map((m, i) => (
                              <span key={i} className="bg-[#B59E74]/10 border border-[#B59E74]/20 text-[#9c8760] text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                                {m}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => handleApproveMinistry(u.id)}
                            className="flex-1 py-2.5 rounded-xl bg-green-50 border border-green-200 text-green-700 font-bold text-xs uppercase tracking-widest hover:bg-green-600 hover:text-white hover:border-green-600 transition-all"
                          >
                            ✓ Approve
                          </button>
                          <button
                            onClick={() => setDeletingUser(u)}
                            className="flex-1 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 font-bold text-xs uppercase tracking-widest hover:bg-red-600 hover:text-white hover:border-red-600 transition-all"
                          >
                            ✕ Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* ALL USERS TABLE */}
              {usersTab === "all" && loading ? (
                <div className="flex h-full items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#B59E74]"></div></div>
              ) : usersTab === "all" && filteredUsers.length === 0 ? (
                <div className="p-12 text-center text-gray-400 font-serif italic">No accounts found matching your filters.</div>
              ) : usersTab === "all" && (
                <>
                  {/* ── MOBILE CARD LIST (hidden md+) ── */}
                  <div className="md:hidden divide-y divide-gray-100">
                    {filteredUsers.map((u) => (
                      <div key={u.id} className="p-4 flex flex-col gap-3 hover:bg-gray-50/60 transition-colors">
                        {/* Name + email row */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-serif text-gray-800 font-medium text-sm leading-tight truncate">
                              {u.first_name || u.last_name ? `${u.first_name || ''} ${u.last_name || ''}` : "Unknown Name"}
                            </p>
                            <p className="text-[11px] text-gray-500 mt-0.5 truncate">{u.email}</p>
                            {u.contact_number && (
                              <p className="text-[11px] text-gray-400 mt-0.5">{u.contact_number}</p>
                            )}
                          </div>
                          {/* Role select */}
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            disabled={u.id === user.id}
                            className={`shrink-0 text-[10px] font-bold uppercase tracking-widest px-2 py-1.5 rounded-lg border-2 cursor-pointer outline-none transition-colors ${
                              u.role === "admin" || u.role === "superadmin" ? "bg-red-50 border-red-200 text-red-700" :
                              u.role === "staff"      ? "bg-blue-50 border-blue-200 text-blue-700" :
                              u.role === "minister"   ? "bg-purple-50 border-purple-200 text-purple-700" :
                              u.role === "priest"     ? "bg-[#B59E74]/10 border-[#B59E74]/30 text-[#B59E74]" :
                              "bg-gray-50 border-gray-200 text-gray-600"
                            } ${u.id === user.id ? "opacity-50 cursor-not-allowed" : ""}`}
                          >
                            <option value="parishioner">Parishioner</option>
                            <option value="staff">Staff</option>
                            <option value="minister">Minister</option>
                            <option value="priest">Priest</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>

                        {/* Ministry badges */}
                        {u.role === "minister" && Array.isArray(u.ministries) && u.ministries.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {u.ministries.map((m, i) => (
                              <span key={i} className="bg-purple-50 border border-purple-200 text-purple-700 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                                {m}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Actions row */}
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider mr-auto">
                            Joined {new Date(u.created_at).toLocaleDateString()}
                          </p>
                          <button
                            onClick={() => openEditModal(u)}
                            className="text-[10px] font-bold uppercase tracking-widest px-3 py-2 rounded-lg border border-[#B59E74]/40 text-[#B59E74] bg-[#B59E74]/5 hover:bg-[#B59E74]/10 transition-colors"
                          >
                            ✎ Edit
                          </button>
                          {u.id !== user.id && (
                            <button
                              onClick={() => setDeletingUser(u)}
                              className="text-[10px] font-bold uppercase tracking-widest px-3 py-2 rounded-lg border border-red-200 text-red-500 bg-red-50/50 hover:bg-red-50 transition-colors"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* ── DESKTOP TABLE (hidden below md) ── */}
                  <table className="hidden md:table w-full text-left border-collapse">
                    <thead className="bg-white sticky top-0 z-10 border-b border-gray-100 shadow-sm">
                      <tr className="text-[10px] text-gray-500 uppercase tracking-widest">
                        <th className="px-6 py-4 font-bold">User Profile</th>
                        <th className="px-6 py-4 font-bold">Contact</th>
                        <th className="px-6 py-4 font-bold">System Role</th>
                        <th className="px-6 py-4 font-bold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="px-6 py-4">
                            <p className="font-serif text-gray-800 font-medium text-base">
                              {u.first_name || u.last_name ? `${u.first_name || ''} ${u.last_name || ''}` : "Unknown Name"}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">{u.email}</p>
                            <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">Joined: {new Date(u.created_at).toLocaleDateString()}</p>
                            {u.role === "minister" && Array.isArray(u.ministries) && u.ministries.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {u.ministries.map((m, i) => (
                                  <span key={i} className="bg-purple-50 border border-purple-200 text-purple-700 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                                    {m}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">{u.contact_number || "—"}</td>
                          <td className="px-6 py-4">
                            <select
                              value={u.role}
                              onChange={(e) => handleRoleChange(u.id, e.target.value)}
                              disabled={u.id === user.id}
                              className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg border-2 cursor-pointer outline-none transition-colors ${
                                u.role === "admin" || u.role === "superadmin" ? "bg-red-50 border-red-200 text-red-700 focus:border-red-400" :
                                u.role === "staff"    ? "bg-blue-50 border-blue-200 text-blue-700 focus:border-blue-400" :
                                u.role === "minister" ? "bg-purple-50 border-purple-200 text-purple-700 focus:border-purple-400" :
                                u.role === "priest"   ? "bg-[#B59E74]/10 border-[#B59E74]/30 text-[#B59E74] focus:border-[#B59E74]" :
                                "bg-gray-50 border-gray-200 text-gray-600 focus:border-gray-400"
                              } ${u.id === user.id ? "opacity-50 cursor-not-allowed" : ""}`}
                            >
                              <option value="parishioner">Parishioner</option>
                              <option value="staff">Staff</option>
                              <option value="minister">Minister</option>
                              <option value="priest">Priest</option>
                              <option value="admin">Admin</option>
                            </select>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end items-center gap-2">
                              <button
                                onClick={() => openEditModal(u)}
                                className="text-gray-400 hover:text-[#B59E74] hover:bg-[#B59E74]/10 text-[10px] font-bold uppercase tracking-widest px-3 py-2 rounded-lg transition-colors border border-transparent hover:border-[#B59E74]/30"
                              >
                                ✎ Edit
                              </button>
                              {u.id !== user.id && (
                                <button
                                  onClick={() => setDeletingUser(u)}
                                  className="text-gray-400 hover:text-red-600 hover:bg-red-50 text-[10px] font-bold uppercase tracking-widest px-3 py-2 rounded-lg transition-colors border border-transparent hover:border-red-200"
                                >
                                  🗑️ Delete
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* --- ROLE CHANGE → MINISTER MODAL --- */}
      {roleChangeModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="bg-purple-50 px-8 py-6 border-b border-purple-100 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-serif text-purple-800 font-medium uppercase tracking-widest">Assign Ministries</h2>
                <p className="text-xs text-purple-600 italic mt-1">Changing <strong>{roleChangeModal.userName}</strong> to Minister</p>
              </div>
              <button
                onClick={() => setRoleChangeModal(null)}
                className="text-purple-400 hover:text-purple-600 text-xl"
              >✕</button>
            </div>

            <div className="p-8 space-y-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Select Ministries *
                  </label>
                  {roleChangeMinistries.length > 0 && (
                    <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                      {roleChangeMinistries.length} selected
                    </span>
                  )}
                </div>
                <MinistryChecklist
                  activeMinistries={activeMinistries}
                  selected={roleChangeMinistries}
                  onToggle={(name) =>
                    setRoleChangeMinistries(prev =>
                      prev.includes(name) ? prev.filter(m => m !== name) : [...prev, name]
                    )
                  }
                />
                {roleChangeMinistries.length === 0 && (
                  <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider">At least one ministry is required.</p>
                )}
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setRoleChangeModal(null)}
                  className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-500 font-bold text-xs uppercase tracking-widest hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRoleWithMinistries}
                  disabled={roleChangeMinistries.length === 0 || roleChangeLoading}
                  className="flex-1 py-3 rounded-xl bg-purple-600 text-white font-bold text-xs uppercase tracking-widest hover:bg-purple-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {roleChangeLoading ? "Saving..." : "Assign & Change Role"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- EDIT MODAL --- */}
      {editingUser && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="bg-[#F6F5ED] px-8 py-6 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-serif text-[#B59E74] font-medium uppercase tracking-widest">Edit User</h2>
                <p className="text-xs text-gray-500 italic mt-1">{editingUser.email}</p>
              </div>
              <button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-8 space-y-5 max-h-[75vh] overflow-y-auto">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">First Name</label>
                <input
                  type="text"
                  required
                  value={editForm.first_name}
                  maxLength={NAME_MAX}
                  onChange={(e) => setEditForm({...editForm, first_name: e.target.value.replace(/[^a-zA-ZÀ-ÿñÑ\s'.-]/g, "")})}
                  className="p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] w-full text-sm"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Last Name</label>
                <input
                  type="text"
                  required
                  value={editForm.last_name}
                  maxLength={NAME_MAX}
                  onChange={(e) => setEditForm({...editForm, last_name: e.target.value.replace(/[^a-zA-ZÀ-ÿñÑ\s'.-]/g, "")})}
                  className="p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] w-full text-sm"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Contact Number</label>
                <input
                  type="tel"
                  value={editForm.contact_number}
                  onChange={(e) => setEditForm({...editForm, contact_number: e.target.value.replace(/\D/g, "").slice(0, 11)})}
                  maxLength={11}
                  className="p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] w-full text-sm"
                />
              </div>

              {/* Ministry section — only for ministers */}
              {editingUser.role === "minister" && (
                <div className="flex flex-col gap-2 border-t border-gray-100 pt-5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Ministries *
                    </label>
                    {editForm.ministries.length > 0 && (
                      <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        {editForm.ministries.length} selected
                      </span>
                    )}
                  </div>
                  <MinistryChecklist activeMinistries={activeMinistries} selected={editForm.ministries} onToggle={toggleEditMinistry} />
                  {editForm.ministries.length === 0 && (
                    <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider">At least one ministry is required.</p>
                  )}
                </div>
              )}

              {editingUser.role === "priest" && (
                <div className="flex flex-col gap-3 border-t border-gray-100 pt-5">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Priest Subtitle</label>
                    <input
                      type="text"
                      value={editForm.priest_subtitle}
                      onChange={(e) => setEditForm({ ...editForm, priest_subtitle: e.target.value })}
                      className="p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] w-full text-sm"
                      placeholder="e.g., Parish Priest & Rector"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Priest Photo</label>
                    {(editForm.priest_photo_url || priestPhotoFile) && (
                      <div className="w-28 h-36 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                        <img
                          src={priestPhotoPreview || editForm.priest_photo_url}
                          alt="Priest preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => setPriestPhotoFile(e.target.files?.[0] || null)}
                      className="text-xs text-gray-600 file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-[#B59E74]/10 file:text-[#B59E74] file:font-bold"
                    />
                  </div>

                  <label className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!editForm.priest_is_leadership}
                      onChange={(e) => setEditForm({ ...editForm, priest_is_leadership: e.target.checked })}
                      className="w-4 h-4 accent-[#B59E74]"
                    />
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Set as Leadership Priest
                    </span>
                  </label>
                  <p className="text-[10px] text-gray-500 italic">
                    Only one priest can be the leadership priest at a time.
                  </p>
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setEditingUser(null)} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-500 font-bold text-xs uppercase tracking-widest hover:bg-gray-50 transition-all">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || (editingUser.role === "minister" && editForm.ministries.length === 0)}
                  className="flex-1 py-3 rounded-xl bg-[#B59E74] text-white font-bold text-xs uppercase tracking-widest hover:bg-[#9c8760] transition-all shadow-md disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DELETE CONFIRMATION MODAL --- */}
      {deletingUser && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="bg-red-50 px-8 py-6 border-b border-red-100 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-serif text-red-800 font-medium uppercase tracking-widest">Delete Account</h2>
                <p className="text-xs text-red-600 italic mt-1">{deletingUser.email}</p>
              </div>
              <button onClick={() => setDeletingUser(null)} className="text-red-400 hover:text-red-600 text-xl">✕</button>
            </div>

            <div className="p-8 space-y-6">
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-800 space-y-2">
                <p className="font-bold uppercase tracking-wider text-xs">⚠ Warning: Permanent Action</p>
                <p>
                  You are about to permanently delete <strong>{deletingUser.first_name} {deletingUser.last_name}</strong> from the system.
                  This action cannot be undone and will immediately revoke their access.
                </p>
              </div>
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setDeletingUser(null)} disabled={deleteSubmitting} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-500 font-bold text-xs uppercase tracking-widest hover:bg-gray-50 transition-all disabled:opacity-50">
                  Cancel
                </button>
                <button type="button" onClick={confirmDelete} disabled={deleteSubmitting} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold text-xs uppercase tracking-widest hover:bg-red-700 transition-all shadow-md disabled:opacity-50">
                  {deleteSubmitting ? "Deleting..." : "Confirm Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManageUsers;
