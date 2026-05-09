// Direct REST API helpers that bypass the supabase-js client.
//
// supabase-js v2 maintains a global GoTrue auth lock. Under certain conditions
// (token refresh in flight, multi-tab, slow network) every query through the
// SDK queues behind that lock and can hang indefinitely. These helpers make
// raw HTTPS requests to PostgREST using the JWT read directly from
// localStorage, so they cannot be blocked by the SDK's internal state.
//
// Auth (sign-in, sign-out) still goes through supabase-js because it must
// manage the session lifecycle. Only the data queries bypass it.

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

function readAccessToken() {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith("sb-") || !key.includes("auth-token")) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const token = parsed?.access_token || parsed?.currentSession?.access_token;
      if (token) return token;
    }
  } catch { /* ignore */ }
  return null;
}

function authHeaders() {
  const token = readAccessToken();
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token || SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
  };
}

function buildUrl(table, params = {}) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.append(k, v);
  });
  return url.toString();
}

// SELECT one or many rows.
//   restSelect("user_roles", { match: { user_id: id }, single: true })
//   restSelect("events", { select: "*", order: "event_time.asc" })
export async function restSelect(table, opts = {}) {
  const {
    select = "*",
    match = {},
    order = null,
    single = false,
    timeoutMs = 12000,
  } = opts;

  const params = { select };
  Object.entries(match).forEach(([col, val]) => {
    params[col] = `eq.${val}`;
  });
  if (order) params.order = order;

  const url = buildUrl(table, params);
  const headers = authHeaders();
  if (single) headers.Accept = "application/vnd.pgrst.object+json";

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);

  try {
    const res = await fetch(url, { headers, signal: ctl.signal });
    clearTimeout(timer);

    if (!res.ok) {
      // 406 with single=true means "no rows" — return null without error.
      if (single && res.status === 406) return { data: null, error: null };
      const body = await res.text().catch(() => "");
      return {
        data: null,
        error: { status: res.status, message: body || res.statusText },
      };
    }

    const data = await res.json();
    return { data, error: null };
  } catch (err) {
    clearTimeout(timer);
    return {
      data: null,
      error: {
        message: err.name === "AbortError" ? `Request timed out after ${timeoutMs}ms` : err.message,
      },
    };
  }
}

// INSERT rows. Returns inserted rows when prefer="return=representation".
export async function restInsert(table, rows, opts = {}) {
  const { timeoutMs = 12000 } = opts;
  const url = buildUrl(table);
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { ...authHeaders(), Prefer: "return=representation" },
      body: JSON.stringify(Array.isArray(rows) ? rows : [rows]),
      signal: ctl.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { data: null, error: { status: res.status, message: body || res.statusText } };
    }
    const data = await res.json();
    return { data, error: null };
  } catch (err) {
    clearTimeout(timer);
    return {
      data: null,
      error: {
        message: err.name === "AbortError" ? `Request timed out after ${timeoutMs}ms` : err.message,
      },
    };
  }
}

// UPDATE rows matching the given filter. patch is the partial row.
export async function restUpdate(table, match, patch, opts = {}) {
  const { timeoutMs = 12000 } = opts;
  const params = {};
  Object.entries(match).forEach(([col, val]) => {
    params[col] = `eq.${val}`;
  });
  const url = buildUrl(table, params);
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "PATCH",
      headers: { ...authHeaders(), Prefer: "return=representation" },
      body: JSON.stringify(patch),
      signal: ctl.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { data: null, error: { status: res.status, message: body || res.statusText } };
    }
    const data = await res.json();
    return { data, error: null };
  } catch (err) {
    clearTimeout(timer);
    return {
      data: null,
      error: {
        message: err.name === "AbortError" ? `Request timed out after ${timeoutMs}ms` : err.message,
      },
    };
  }
}
