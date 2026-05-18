import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../contexts/useAuth";

function ManageUsers() {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  
  // Filtering States
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");

  // Create Account State
  const [createForm, setCreateForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    contact_number: "",
    password: "",
    role: "staff" 
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [createSuccess, setCreateSuccess] = useState(false);

  // Edit Modal State
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ first_name: "", last_name: "", contact_number: "" });
  const [saving, setSaving] = useState(false);

  // Delete Modal State
  const [deletingUser, setDeletingUser] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

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
        
        // NEW FIX: Catch legacy "user" roles from the database and treat them as "parishioner"
        if (assignedRole === "user") {
          assignedRole = "parishioner";
        }

        return {
          ...profile,
          role: assignedRole
        };
      });

      setUsers(mergedUsers);
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  // --- ACCOUNT CREATION LOGIC ---
  // --- ACCOUNT CREATION LOGIC ---
  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setCreateError(null);
    setCreateSuccess(false);
    setCreateLoading(true);

    if (createForm.password.length < 6) {
      setCreateError("Password must be at least 6 characters.");
      setCreateLoading(false);
      return;
    }

    try {
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: createForm.email,
        password: createForm.password,
        options: {
          data: {
            first_name: createForm.first_name,
            last_name: createForm.last_name,
            contact_number: createForm.contact_number,
            requires_password_change: true // ✨ ADDED THIS FLAG HERE!
          }
        }
      });

      if (authErr) throw authErr;

      const newUserId = authData.user?.id;

      if (newUserId) {
        // Only assign a special role if they are NOT a basic parishioner
        if (createForm.role !== "parishioner") {
          const { error: roleErr } = await supabase
            .from("user_roles")
            .upsert({ user_id: newUserId, role: createForm.role });
          
          if (roleErr) throw roleErr;
        }

        setCreateSuccess(true);
        fetchUsers();
        setCreateForm({
          first_name: "",
          last_name: "",
          email: "",
          contact_number: "",
          password: "",
          role: "staff"
        });
        
        setTimeout(() => setCreateSuccess(false), 4000);
      }
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreateLoading(false);
    }
  };

  // --- ROLE MANAGEMENT ---
  const handleRoleChange = async (userId, newRole) => {
    try {
      // 1. Find the user's name from your local state so we can add them to the priests table
      const targetUser = users.find(u => u.id === userId);
      const fullName = `${targetUser?.first_name || ""} ${targetUser?.last_name || ""}`.trim() || "Unknown Priest";

      if (newRole === "parishioner") {
        // Delete the special role row
        const { error } = await supabase.from("user_roles").delete().eq("user_id", userId);
        if (error) throw error;
      } else {
        // Upsert the new role.
        const { error } = await supabase
          .from("user_roles")
          .upsert({ user_id: userId, role: newRole }, { onConflict: 'user_id' });
        
        if (error) throw error;
      }
      
      // ✨ THE ULTIMATE PRIEST LIFECYCLE FIX ✨
      
      if (newRole === "priest") {
        const { error: priestAddErr } = await supabase
                  .from("priests")
                  .upsert({ 
                    user_id: userId, 
                    name: fullName 
                  }, { onConflict: 'user_id' });
          
        if (priestAddErr) console.warn("Could not activate priest profile:", priestAddErr.message);
        
      } else {
        // 2. THEY STOPPED BEING A PRIEST: Completely DELETE them from the priests table
        const { error: priestRemoveErr } = await supabase
          .from("priests")
          .delete() // 💥 FIX: Hard delete instead of just deactivating
          .eq("user_id", userId);
          
        if (priestRemoveErr) {
          console.warn("Could not remove priest profile:", priestRemoveErr.message);
        } else {
          console.log(`Successfully wiped ${fullName} from the priests table.`);
        }
      }

      // If no error, update the UI
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      
    } catch (err) {
      console.error("Role Update Error:", err);
      alert("Failed to update role: " + err.message);
      
      // If it fails, instantly fetch the real data again to reset the UI
      fetchUsers(); 
    }
  };

  // --- PROFILE EDITING ---
  const openEditModal = (userRecord) => {
    setEditingUser(userRecord);
    setEditForm({
      first_name: userRecord.first_name || "",
      last_name: userRecord.last_name || "",
      contact_number: userRecord.contact_number || ""
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: editForm.first_name,
          last_name: editForm.last_name,
          contact_number: editForm.contact_number
        })
        .eq("id", editingUser.id);

      if (error) throw error;

      setUsers(users.map(u => u.id === editingUser.id ? { ...u, ...editForm } : u));
      setEditingUser(null);
    } catch (err) {
      alert("Failed to update profile: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // --- ACCOUNT DELETION LOGIC ---
  // --- ACCOUNT DELETION LOGIC ---
  const confirmDelete = async () => {
    if (!deletingUser) return;
    setDeleteSubmitting(true);
    try {
      // NEW FIX: Call the Edge Function instead of the raw SQL RPC
      const { data, error } = await supabase.functions.invoke("delete-user", {
        body: { target_user_id: deletingUser.id },
      });

      if (error) throw error;

      // Remove the user from the local UI state
      setUsers(users.filter(u => u.id !== deletingUser.id));
      setDeletingUser(null);
    } catch (err) {
      alert("Failed to delete user: " + err.message);
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // --- FILTERING LOGIC ---
  const filteredUsers = users.filter(u => {
    const searchStr = searchQuery.toLowerCase();
    const fullName = `${u.first_name || ""} ${u.last_name || ""}`.toLowerCase();
    
    const matchesSearch = fullName.includes(searchStr) || (u.email && u.email.toLowerCase().includes(searchStr));
    const matchesRole = roleFilter === "All" || u.role === roleFilter.toLowerCase();

    return matchesSearch && matchesRole;
  });

  if (!isAdmin) {
    return <div className="min-h-screen flex items-center justify-center text-red-500 font-bold">Access Denied. Admins Only.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans h-screen overflow-hidden">
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-24 pb-6 flex flex-col h-full">
        
        <div className="shrink-0">
          <div className="flex gap-4 mb-4 border-b border-gray-200 pb-2">
            <Link to="/admin" className="text-gray-500 hover:text-[#B59E74] font-bold uppercase tracking-widest text-sm transition-colors">Dashboard</Link>
            <span className="text-gray-300">|</span>
            <span className="text-[#B59E74] font-bold uppercase tracking-widest text-sm border-b-2 border-[#B59E74] pb-2 -mb-[9px]">Staff & Accounts</span>
          </div>

          <div className="mb-6">
            <h1 className="text-3xl md:text-4xl font-serif text-gray-800 uppercase tracking-wide">Manage Accounts</h1>
            <p className="text-gray-500 font-serif italic mt-1">Create new staff accounts, manage roles, and remove users.</p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 flex-1 min-h-0 overflow-hidden pb-4">
          
          {/* LEFT SIDE: CREATE ACCOUNT */}
          <div className="lg:w-[400px] shrink-0 h-full overflow-y-auto scrollbar-thin pr-1">
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6 sm:p-8">
              <div className="mb-6 border-b border-gray-100 pb-4">
                <div className="w-12 h-12 rounded-full bg-[#B59E74]/10 text-[#B59E74] flex items-center justify-center text-xl mb-4">
                  👤
                </div>
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
                    onChange={e => setCreateForm({...createForm, role: e.target.value})}
                    className="p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#B59E74] text-sm font-bold text-gray-700 bg-gray-50"
                  >
                    <option value="staff">Staff</option>
                    <option value="minister">Minister</option>
                    <option value="priest">Priest</option>
                    <option value="admin">Admin</option>
                    <option value="parishioner">Parishioner</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">First Name *</label>
                    <input type="text" required value={createForm.first_name} onChange={e => setCreateForm({...createForm, first_name: e.target.value})} className="p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#B59E74] text-sm" placeholder="Juan"/>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Last Name *</label>
                    <input type="text" required value={createForm.last_name} onChange={e => setCreateForm({...createForm, last_name: e.target.value})} className="p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#B59E74] text-sm" placeholder="Dela Cruz"/>
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
                  <input type="tel" value={createForm.contact_number} onChange={e => setCreateForm({...createForm, contact_number: e.target.value})} className="p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#B59E74] text-sm" placeholder="09XX XXX XXXX"/>
                </div>

                <button type="submit" disabled={createLoading} className="w-full mt-2 bg-[#B59E74] hover:bg-[#9c8760] text-white font-bold py-3 rounded-xl text-xs uppercase tracking-widest transition-colors shadow-md disabled:opacity-50">
                  {createLoading ? "Creating..." : "Generate Account"}
                </button>
              </form>
            </div>
          </div>

          {/* RIGHT SIDE: DATABASE TABLE */}
          <div className="flex-1 flex flex-col h-full bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
            
            <div className="shrink-0 p-5 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <span className="text-xl">🗄️</span>
                <div>
                  <h2 className="text-lg font-serif text-gray-800 font-medium uppercase tracking-widest leading-none">Database</h2>
                  <p className="text-[11px] text-gray-500 italic mt-0.5">Total Accounts: {filteredUsers.length}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m1.85-5.4a7.25 7.25 0 11-14.5 0 7.25 7.25 0 0114.5 0z" /></svg>
                  <input type="text" placeholder="Search name or email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#B59E74] text-sm" />
                </div>
                
                <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="py-2.5 pl-4 pr-8 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#B59E74] text-sm font-bold text-gray-600 bg-white cursor-pointer outline-none">
                  <option value="All">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="staff">Staff</option>
                  <option value="minister">Minister</option>
                  <option value="priest">Priest</option>
                  <option value="parishioner">Parishioner</option>
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {loading ? (
                <div className="flex h-full items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#B59E74]"></div></div>
              ) : (
                <table className="w-full text-left border-collapse min-w-[700px]">
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
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {u.contact_number || "—"}
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            disabled={u.id === user.id}
                            className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg border-2 cursor-pointer outline-none transition-colors ${
                              u.role === "admin" || u.role === "superadmin" ? "bg-red-50 border-red-200 text-red-700 focus:border-red-400" :
                              u.role === "staff" ? "bg-blue-50 border-blue-200 text-blue-700 focus:border-blue-400" :
                              u.role === "minister" ? "bg-purple-50 border-purple-200 text-purple-700 focus:border-purple-400" :
                              u.role === "priest" ? "bg-[#B59E74]/10 border-[#B59E74]/30 text-[#B59E74] focus:border-[#B59E74]" :
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
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan="4" className="p-12 text-center text-gray-400 font-serif italic">
                          No accounts found matching your filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* --- EDIT MODAL --- */}
      {editingUser && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up">
            <div className="bg-[#F6F5ED] px-8 py-6 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-serif text-[#B59E74] font-medium uppercase tracking-widest">Edit User</h2>
                <p className="text-xs text-gray-500 italic mt-1">{editingUser.email}</p>
              </div>
              <button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-8 space-y-5">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">First Name</label>
                <input
                  type="text"
                  required
                  value={editForm.first_name}
                  onChange={(e) => setEditForm({...editForm, first_name: e.target.value})}
                  className="p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] w-full text-sm"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Last Name</label>
                <input
                  type="text"
                  required
                  value={editForm.last_name}
                  onChange={(e) => setEditForm({...editForm, last_name: e.target.value})}
                  className="p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] w-full text-sm"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Contact Number</label>
                <input
                  type="tel"
                  value={editForm.contact_number}
                  onChange={(e) => setEditForm({...editForm, contact_number: e.target.value})}
                  className="p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] w-full text-sm"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setEditingUser(null)} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-500 font-bold text-xs uppercase tracking-widest hover:bg-gray-50 transition-all">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl bg-[#B59E74] text-white font-bold text-xs uppercase tracking-widest hover:bg-[#9c8760] transition-all shadow-md disabled:opacity-50">
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DELETE CONFIRMATION MODAL --- */}
      {deletingUser && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up">
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