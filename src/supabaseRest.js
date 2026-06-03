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

function parseErrorMessage(raw) {
  if (!raw) return "";
  if (typeof raw !== "string") return raw.message || String(raw);
  try {
    const parsed = JSON.parse(raw);
    return parsed.message || parsed.details || raw;
  } catch {
    return raw;
  }
}

function friendlyDatabaseError(raw, table, payload = {}) {
  const message = parseErrorMessage(raw);
  const rows = Array.isArray(payload) ? payload : [payload];
  const values = Object.assign({}, ...rows.filter(Boolean));
  const entries = Object.entries(values);
  const invalidSchedule = (() => {
    const pick = (...keys) => keys.map((key) => values[key]).find((value) => value !== undefined && value !== null && String(value).trim() !== "");
    const checks = [
      [values.start_date, values.start_time, values.end_date || values.start_date, values.end_time],
      [values.event_date, values.event_time, values.event_end_date || values.event_date, values.end_time],
      [values.preferred_date, values.preferred_time, values.preferred_date, values.end_time],
      [values.wedding_date, values.wedding_time, values.wedding_date, values.end_time],
      [values.date_of_communion, values.time_of_communion, values.date_of_communion, values.end_time],
      [values.date_of_confirmation, values.time_of_confirmation, values.date_of_confirmation, values.end_time],
      [values.request_date, values.request_time, values.request_date, values.end_time],
      [values.preferredDate, values.preferredTime, values.preferredDate, values.preferredEndTime],
    ];
    const direct = [pick("eventStartDate"), pick("eventTime"), pick("eventEndDate", "eventStartDate"), pick("endTime")];
    checks.push(direct);
    return checks.some(([startDate, startTime, endDate, endTime]) => {
      if (!startTime || !endTime) return false;
      const start = new Date(`${startDate || endDate || "1970-01-01"}T${startTime}`);
      const end = new Date(`${endDate || startDate || "1970-01-01"}T${endTime}`);
      return !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end <= start;
    });
  })();

  if (/violates check constraint|new row for relation/i.test(message)) {
    const hasInvalidContact = entries.some(([key, value]) =>
      /contact|phone/i.test(key) &&
      value !== null &&
      value !== undefined &&
      String(value).trim() !== "" &&
      !/^\d{11}$/.test(String(value).replace(/\s+/g, ""))
    );
    if (hasInvalidContact) return "Contact number must be exactly 11 digits.";

    const hasInvalidEmail = entries.some(([key, value]) =>
      /email/i.test(key) &&
      value !== null &&
      value !== undefined &&
      String(value).trim() !== "" &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim())
    );
    if (hasInvalidEmail) return "Please enter a valid email address.";

    const hasInvalidMoney = entries.some(([key, value]) =>
      /reservation_fee|offering_amount/i.test(key) &&
      (value === null || value === undefined || String(value).trim() === "" || !/^\d+(\.\d{1,2})?$/.test(String(value).trim()))
    );
    if (hasInvalidMoney) return "Amount is required and cannot be negative. Please enter 0 or a valid amount.";

    if (invalidSchedule) return "End time must be later than the start time. Please choose a later end time.";

    const hasInvalidLettersOnlyField = entries.some(([key, value]) =>
      /organization|place_of_birth|birthplace|baptism_parish|residence_parish|record_parish|church_parish|request_specify|specify_intention/i.test(key) &&
      typeof value === "string" &&
      value.trim() !== "" &&
      !/^[A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF\u00D1\u00F1' .-]+$/.test(value.trim())
    );
    if (hasInvalidLettersOnlyField) return "This field can only contain letters, spaces, apostrophes, dots, or hyphens.";

    const hasTooLongAddress = entries.some(([key, value]) =>
      /address|location/i.test(key) &&
      typeof value === "string" &&
      value.length > 255
    );
    if (hasTooLongAddress) return "Address fields must be 255 characters or less.";

    const hasInvalidNumber = entries.some(([key, value]) =>
      /expected_attendees|number_of_copies|current_age|groom_age|bride_age/i.test(key) &&
      value !== null &&
      value !== undefined &&
      String(value).trim() !== "" &&
      (!/^\d+$/.test(String(value)) || Number(value) < 0 || Number(value) > 10000)
    );
    if (hasInvalidNumber) return "Number fields must be 0 or higher and within the allowed limit.";

    const hasInvalidStatus = entries.some(([key, value]) =>
      key === "status" &&
      value &&
      !["Pending", "Approved", "Rejected", "Cancelled", "Active", "Draft", "Published", "Archived"].includes(String(value))
    );
    if (hasInvalidStatus) return "Status value is invalid. Please choose a valid status.";

    const hasTooManyDocuments = entries.some(([key, value]) =>
      key === "attached_documents" &&
      Array.isArray(value) &&
      value.length > 10
    );
    if (hasTooManyDocuments) return "You can attach up to 10 documents only.";

    const hasTooLongText = entries.some(([key, value]) =>
      /address|description|notes|purpose|remarks|requirements|equipment|request/i.test(key) &&
      typeof value === "string" &&
      value.length > 2000
    );
    if (hasTooLongText) return "One of the text fields is too long. Please shorten it and try again.";

    const hasInvalidName = entries.some(([key, value]) =>
      /name|surname|requested_by|submitter_signature|celebrant/i.test(key) &&
      typeof value === "string" &&
      value.trim() !== "" &&
      (!/^[A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF\u00D1\u00F1' .-]+$/.test(value.trim()) || value.trim().length > (/full_name|signature/i.test(key) ? 120 : 60))
    );
    if (hasInvalidName) return "Name fields can only contain letters, spaces, apostrophes, dots, or hyphens and must stay within the character limit.";

    return `Some information in ${String(table || "this form").replace(/_/g, " ")} is missing or invalid. Please review the fields and try again.`;
  }

  if (/duplicate key|already exists|already registered|already in use/i.test(message)) {
    return "This information already exists in the system. Please review the details and try again.";
  }

  if (/violates foreign key constraint/i.test(message)) {
    return "The selected related record is no longer available. Please refresh the page and try again.";
  }

  if (/permission denied|row-level security|not authorized/i.test(message)) {
    return "You do not have permission to perform this action.";
  }

  return message || "Something went wrong. Please try again.";
}

// SELECT one or many rows.
//   restSelect("user_roles", { match: { user_id: id }, single: true })
//   restSelect("events", { select: "*", order: "event_time.asc" })
export async function restSelect(table, opts = {}) {
  const {
    select = "*",
    match = {},
    rawFilter = {},
    order = null,
    single = false,
    timeoutMs = 12000,
  } = opts;

  const params = { select };
  Object.entries(match).forEach(([col, val]) => {
    params[col] = `eq.${val}`;
  });
  Object.entries(rawFilter).forEach(([col, val]) => {
    params[col] = val;
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
        error: { status: res.status, message: friendlyDatabaseError(body || res.statusText, table) },
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
      return { data: null, error: { status: res.status, message: friendlyDatabaseError(body || res.statusText, table, rows) } };
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

// DELETE rows matching the given filter.
export async function restDelete(table, match, opts = {}) {
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
      method: "DELETE",
      headers: { ...authHeaders(), Prefer: "return=representation" },
      signal: ctl.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { data: null, error: { status: res.status, message: friendlyDatabaseError(body || res.statusText, table) } };
    }
    const data = await res.json().catch(() => []);
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
      return { data: null, error: { status: res.status, message: friendlyDatabaseError(body || res.statusText, table, patch) } };
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
