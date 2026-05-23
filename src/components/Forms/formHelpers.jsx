// Shared building blocks used by every sacrament request modal.
// Keep this lightweight — just presentational components used inside
// the form bodies. The actual submit / state logic stays per-form.

import { useEffect, useState } from "react";
import { restSelect } from "../../supabaseRest";
import { supabase } from "../../supabaseClient"; // ✨ NEW: Needed to fetch staff IDs and insert notifications

/**
 * Fetches the logged-in parishioner's profile once and returns their
 * name + contact so forms can pre-populate those fields.
 * Returns null while loading, then { firstName, lastName, fullName, contactNumber }.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useProfileAutofill(user) {
  const [autofill, setAutofill] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    restSelect("profiles", {
      select: "first_name,last_name,contact_number",
      match: { id: user.id },
      single: true,
      timeoutMs: 8000,
    }).then(({ data }) => {
      if (data) {
        const firstName = data.first_name || "";
        const lastName  = data.last_name  || "";
        setAutofill({
          firstName,
          lastName,
          fullName:      [firstName, lastName].filter(Boolean).join(" "),
          contactNumber: data.contact_number || "",
        });
      }
    });
  }, [user?.id]);

  return autofill;
}

export function Field({
  label,
  name,
  type = "text",
  value,
  onChange,
  options,
  required = false,
  placeholder,
  ...rest
}) {
  const baseClass =
    "p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700 w-full";

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
        {label}
      </label>

      {type === "textarea" ? (
        <textarea
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          placeholder={placeholder}
          rows={3}
          className={baseClass}
          {...rest}
        />
      ) : type === "select" ? (
        <select
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          className={baseClass}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options?.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : (
        <input
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          required={required}
          placeholder={placeholder}
          className={baseClass}
          {...rest}
        />
      )}
    </div>
  );
}

export function SuccessPanel({
  message = "Your request has been received. The parish office will review it and email you once it's been approved or if more information is needed.",
}) {
  return (
    <div className="p-12 text-center space-y-4">
      <div className="text-6xl">✅</div>
      <h3 className="text-2xl font-serif text-[#B59E74] uppercase tracking-widest">
        Request Submitted
      </h3>
      <p className="text-gray-600 leading-relaxed max-w-md mx-auto">
        {message}
      </p>
      <p className="text-xs text-gray-400 italic">
        God bless you. — San Pedro Bautista Parish
      </p>
    </div>
  );
}

export function ModalHeader({ title, subtitle, onClose }) {
  return (
    <div className="sticky top-0 bg-[#F6F5ED] px-8 py-6 flex justify-between items-start border-b border-gray-200 z-10">
      <div>
        <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em]">
          San Pedro Bautista Parish
        </p>
        <h2 className="text-2xl font-serif text-[#B59E74] uppercase tracking-wide mt-1">
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs text-gray-500 italic mt-1">{subtitle}</p>
        )}
      </div>
      <button
        onClick={onClose}
        className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 text-gray-600 shrink-0"
        aria-label="Close"
      >
        ✕
      </button>
    </div>
  );
}

export function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200">
      {message}
    </div>
  );
}

export function SubmitButton({ loading, children = "Submit Request" }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full bg-[#B59E74] hover:bg-[#9c8760] text-white font-bold py-4 rounded-xl uppercase tracking-widest transition-all shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
    >
      {loading ? "Submitting..." : children}
    </button>
  );
}

export function DeclarationBlock({ declaration, consent, signature, onChange }) {
  return (
    <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
      <label className="flex items-start gap-3 cursor-pointer mb-4">
        <input
          type="checkbox"
          name="declaration_consent"
          checked={Boolean(consent)}
          onChange={onChange}
          className="mt-1 w-5 h-5 text-[#B59E74] focus:ring-[#B59E74] rounded border-gray-300 cursor-pointer"
        />
        <span className="text-sm text-gray-700 font-serif leading-relaxed">
          {declaration}
        </span>
      </label>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-xs font-bold text-gray-500">
            Submitter's Name &amp; Digital Signature
          </label>
          <input
            type="text"
            name="submitter_signature"
            value={signature || ""}
            onChange={onChange}
            required
            placeholder="Type your full name as digital signature"
            className="p-2 border-b-2 border-gray-300 focus:outline-none focus:border-[#B59E74] bg-transparent text-gray-700 font-serif italic"
          />
        </div>
        <div className="flex flex-col gap-1 md:w-1/3">
          <label className="text-xs font-bold text-gray-500">Date</label>
          <input
            type="text"
            value={new Date().toLocaleDateString()}
            disabled
            className="p-2 border-b-2 border-gray-200 bg-transparent text-gray-500 font-serif"
          />
        </div>
      </div>
    </div>
  );
}

// Calls the submit-guest-form Edge Function which uses the service role key,
// bypassing RLS entirely for guest (unauthenticated) submissions.
const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function submitGuestViaEdgeFunction(table, payload) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/submit-guest-form`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON}`,
      "apikey": SUPABASE_ANON,
    },
    body: JSON.stringify({ table, payload }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Edge function error (${res.status})`);
  return json;
}

// Shared submit helper. Guest submissions go via Edge Function (bypasses RLS).
// Authenticated submissions go via restInsert with JWT.
// eslint-disable-next-line react-refresh/only-export-components
export async function submitRequest({
  table,
  payload,
  user,
  guestInfo = null,
  serviceName,
  summary,
  restInsert,
  sendRequestEmail,
}) {
  const cleanPayload = Object.entries(payload).reduce((acc, [key, value]) => {
    if (value === "" || value === null || value === undefined) return acc;
    acc[key] = value;
    return acc;
  }, {});

  const fullPayload = {
    ...cleanPayload,
    status: "Pending",
    ...(user ? {
      user_id: user.id,
      submitter_email: user.email || null,
      submitter_phone: user.user_metadata?.contact_number || user.phone || null,
    } : {}),
    ...(guestInfo ? {
      is_guest: true,
      guest_name: `${guestInfo.firstName} ${guestInfo.lastName}`.trim(),
      guest_contact: guestInfo.contactNumber,
    } : {}),
  };

  let submitSuccess = false;

  // Guest path: edge function uses service role — no RLS issues
  if (guestInfo && !user) {
    console.log("🟣 Taking GUEST path via edge function");
    await submitGuestViaEdgeFunction(table, fullPayload);
    submitSuccess = true;
  } else {
    // Authenticated path: direct REST with JWT
    console.log("🔵 Taking AUTHENTICATED path");
    console.log("🔵 Table:", table);
    console.log("🔵 User ID:", user?.id);
    console.log("🔵 Full payload:", fullPayload);

    const parseErr = (raw) => {
      try {
        const p = JSON.parse(raw?.message ?? raw ?? "");
        return p.message || raw?.message || String(raw);
      } catch { return raw?.message || String(raw); }
    };

    let attempt = await restInsert(table, [fullPayload]);
    console.log("🔵 Attempt 1 result:", JSON.stringify(attempt));

    if (attempt.error) {
      console.warn("⚠️ Attempt 1 failed:", attempt.error);
      const fallback = { ...fullPayload };
      delete fallback.user_id;
      delete fallback.submitter_email;
      delete fallback.submitter_phone;

      console.log("🔵 Attempt 2 payload:", fallback);
      const retry = await restInsert(table, [fallback]);
      console.log("🔵 Attempt 2 result:", JSON.stringify(retry));

      if (retry.error) {
        console.warn("⚠️ Attempt 2 failed:", retry.error);
        const minFallback = { ...fallback };
        delete minFallback.is_guest;
        delete minFallback.guest_name;
        delete minFallback.guest_contact;

        console.log("🔵 Attempt 3 payload:", minFallback);
        const lastRetry = await restInsert(table, [minFallback]);
        console.log("🔵 Attempt 3 result:", JSON.stringify(lastRetry));

        if (lastRetry.error) {
          console.error("❌ All 3 insert attempts failed. Throwing error.");
          throw new Error(parseErr(lastRetry.error));
        }
      }
    }

    submitSuccess = true;
    console.log("✅ submitSuccess = true — insert succeeded");
  }

  // ✨ TRIGGER REALTIME NOTIFICATION TO ALL STAFF/ADMINS
  if (submitSuccess) {
    console.log("✅ Calling notify_staff RPC...");
    console.log("serviceName:", serviceName);

    const submitterName = user
      ? (user.user_metadata?.first_name || user.email)
      : `${guestInfo?.firstName} ${guestInfo?.lastName}`;

    console.log("submitterName:", submitterName);

    const { data: rpcData, error: rpcError } = await supabase.rpc('notify_staff', {
      notif_title: `New ${serviceName} Request`,
      notif_message: `${submitterName} just submitted a new request.`,
      notif_link: '/staff-dashboard'
    });

    console.log("RPC result — data:", rpcData, "| error:", rpcError);

    if (rpcError) {
      alert("⚠️ Supabase Notification Error:\n" + rpcError.message + "\n\nDetails: " + rpcError.details);
      console.error("❌ RPC Error Full:", rpcError);
    } else {
      console.log("✅ notify_staff called successfully! Check notifications table.");
    }
  } else {
    console.warn("❌ submitSuccess is false — RPC never called.");
  }

  if (sendRequestEmail && user?.email) {
    sendRequestEmail({ to: user.email, serviceName, summary });
  }
}