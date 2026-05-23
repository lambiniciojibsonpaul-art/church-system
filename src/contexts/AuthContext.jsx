// Single source of truth for authentication and role state.
//
// Mounts ONE supabase.auth.onAuthStateChange listener for the entire app.
// Initialises state synchronously from localStorage so every consumer (Header,
// AdminDashboard, EventsPage, etc.) gets the correct user/role on first render
// without flicker.
//
// Data queries against `user_roles` go through the direct REST helper to
// bypass the supabase-js GoTrue auth lock that can stall queries during
// concurrent token refreshes.

import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import { restSelect } from "../supabaseRest";

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext(null);

const ROLE_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const SIGN_IN_TIMEOUT_MS = 15000;

// Any authenticated user with no row in user_roles is treated as a parishioner.
const DEFAULT_ROLE = "parishioner";

// ---- localStorage helpers --------------------------------------------------

function readStoredSession() {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith("sb-") || !key.includes("auth-token")) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const sess = parsed?.currentSession || parsed;
      if (sess?.user?.id) return sess;
    }
  } catch { /* ignore */ }
  return null;
}

function readCachedRole(email) {
  if (!email) return null;
  try {
    const raw = localStorage.getItem(`adminCache:${email.toLowerCase()}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.ts > ROLE_CACHE_TTL_MS) return null;
    const role = parsed.role ? String(parsed.role).toLowerCase() : null;
    return role || null;
  } catch {
    return null;
  }
}

function writeCachedRole(email, role) {
  if (!email) return;
  try {
    localStorage.setItem(
      `adminCache:${email.toLowerCase()}`,
      JSON.stringify({ role, ts: Date.now() })
    );
  } catch { /* ignore */ }
}

function clearCachedRole(email) {
  if (!email) return;
  try {
    localStorage.removeItem(`adminCache:${email.toLowerCase()}`);
  } catch { /* ignore */ }
}

function purgeSupabaseLocalStorage() {
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith("sb-") || key.includes("supabase.auth"))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch { /* ignore */ }
}

// ---- Provider --------------------------------------------------------------

export function AuthProvider({ children }) {
  const initialSession = readStoredSession();
  const initialUser    = initialSession?.user || null;
  // Fall back to DEFAULT_ROLE if the cache is empty (e.g. first load after
  // clearing storage, or the user has no user_roles row yet).
  const initialRole    = readCachedRole(initialUser?.email) ?? (initialUser ? DEFAULT_ROLE : null);

  const [session, setSession] = useState(initialSession);
  const [user,    setUser]    = useState(initialUser);
  const [role,    setRole]    = useState(initialRole);
  // True until the first session+role resolution completes. Consumers gating
  // protected routes should wait for `loading === false` before redirecting.
  const [loading, setLoading] = useState(true);

  const isAdmin = role === "admin" || role === "superadmin";

  // Fetch role from the database. Updates state and cache. Returns the row.
  // If the user exists but has no user_roles row (406 / empty result),
  // we fall back to DEFAULT_ROLE so they always get a valid role.
  const refreshRole = useCallback(async (userId, email) => {
    if (!userId) return null;

    // FIX: Removed `single: true` to prevent 406 errors when zero rows exist.
    // It will now return an empty array [] if no role is found.
    const { data, error } = await restSelect("user_roles", {
      select: "role",
      match: { user_id: userId },
      timeoutMs: 12000,
    });

    if (error) {
      console.warn("[Auth] role refresh failed:", error.message);
      // On a transient network/RLS failure keep the cached role rather than
      // downgrading. If there is no cache yet, fall back to DEFAULT_ROLE so
      // the user still gets a usable session.
      const fallback = readCachedRole(email) ?? DEFAULT_ROLE;
      setRole(fallback);
      return null;
    }

    // Extract the first row if it exists, otherwise undefined
    const roleRow = data && data.length > 0 ? data[0] : null;

    // `roleRow` is null when the user has no row in user_roles.
    const normalised = roleRow?.role
      ? String(roleRow.role).toLowerCase()
      : DEFAULT_ROLE;

    setRole(normalised);
    if (email) writeCachedRole(email, normalised);
    return roleRow ?? { role: normalised };
  }, []);

  // Mount-time: sync session from SDK (background) and subscribe to changes.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        const currentSession = data?.session || null;
        setSession(currentSession);
        setUser(currentSession?.user || null);
        if (currentSession?.user) {
          await refreshRole(currentSession.user.id, currentSession.user.email);
        } else {
          setRole(null);
        }
      } catch (err) {
        console.warn("[Auth] getSession failed:", err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        console.log("[Auth] state change:", event, newSession?.user?.email || "(no user)");
        setSession(newSession);
        setUser(newSession?.user || null);

        if (newSession?.user) {
          // Fire-and-forget — listeners must return synchronously.
          refreshRole(newSession.user.id, newSession.user.email);
        } else {
          setRole(null);
        }
      }
    );

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, [refreshRole]);

  // signIn: race signInWithPassword's promise against the SIGNED_IN event.
  // Returns { session, role }.
  const signIn = useCallback(async (email, password) => {
    let authSubscription;
    const sessionFromEvent = new Promise((resolve) => {
      const sub = supabase.auth.onAuthStateChange((evt, sess) => {
        if (evt === "SIGNED_IN" && sess) resolve(sess);
      });
      authSubscription = sub.data.subscription;
    });

    const sessionFromCall = supabase.auth
      .signInWithPassword({ email, password })
      .then(({ data, error }) => {
        if (error) throw error;
        return data.session;
      });

    const timeout = new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error("Sign-in timed out — check your connection and try again.")),
        SIGN_IN_TIMEOUT_MS
      )
    );

    let signedInSession;
    try {
      signedInSession = await Promise.race([sessionFromEvent, sessionFromCall, timeout]);
    } finally {
      authSubscription?.unsubscribe();
    }

    if (!signedInSession?.user) {
      throw new Error("Sign-in succeeded but no session was returned.");
    }

    const roleRow = await refreshRole(
      signedInSession.user.id,
      signedInSession.user.email
    );

    // refreshRole already set state and cache; derive the string for the caller.
    const resolvedRole = roleRow
      ? String(roleRow.role || "").toLowerCase()
      : DEFAULT_ROLE;

    return {
      session: signedInSession,
      role: resolvedRole,
    };
  }, [refreshRole]);

  // signOut: synchronous localStorage purge + fire-and-forget SDK call.
  // Cannot hang. Caller is responsible for navigation and any UI animation.
  const signOut = useCallback(() => {
    const email = user?.email;
    purgeSupabaseLocalStorage();
    if (email) clearCachedRole(email);
    try { sessionStorage.clear(); } catch { /* ignore */ }

    supabase.auth.signOut({ scope: "local" }).catch((err) =>
      console.error("[Auth] signOut error (non-blocking):", err.message)
    );

    setSession(null);
    setUser(null);
    setRole(null);
  }, [user]);

  const value = useMemo(
    () => ({
      session,
      user,
      role,
      isAdmin,
      loading,
      signIn,
      signOut,
      refreshRole: () => (user ? refreshRole(user.id, user.email) : null),
    }),
    [session, user, role, isAdmin, loading, signIn, signOut, refreshRole]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}