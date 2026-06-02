// Shared building blocks used by every sacrament request modal.
// Keep this lightweight — just presentational components used inside
// the form bodies. The actual submit / state logic stays per-form.

import { useEffect, useState } from "react";
const NAME_PART_MAX = 60;
const NAME_FULL_MAX = 120;
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

/**
 * Sanitizes a form field value based on its name.
 * - Person name fields → letters, spaces, hyphens, apostrophes, dots only
 * - Phone / count fields → digits only
 * - All other fields → unchanged
 */
// eslint-disable-next-line react-refresh/only-export-components
export function applyFieldFilter(name, value) {
  // Numbers-only fields
  if (/contact_number|contactNumbers|groom_contact|bride_contact/i.test(name)) {
    return value.replace(/\D/g, "").slice(0, 11);
  }
  if (/expected_attendees|number_of_copies|groom_age|bride_age/i.test(name)) {
    return value.replace(/\D/g, "");
  }
  // Letters-only fields — split name parts (first/middle/last/maiden)
  if (/first_name|last_name|middle_name|_first$|_middle$|_last$|maiden_first|maiden_middle|maiden_last/i.test(name)) {
    return value.replace(/[^a-zA-ZÀ-ÖØ-öø-ÿ\s'-]/g, "").slice(0, NAME_PART_MAX);
  }
  // Letters-only fields (person names)
  if (
    /(^|_)(first|middle|last)_name$/.test(name) ||   // snake_case: child_first_name, etc.
    /(First|Middle|Last)Name$/.test(name) ||           // camelCase: childFirstName, etc.
    /_surname$/.test(name) ||
    /^(full_name|father_name|mother_maiden_name|fatherName|motherMaidenName|godfather_name|godmother_name|godfatherName|godmotherName|requested_by|submitter_signature|submitterName|sponsor\d+_name)$/.test(name)
  ) {
    const max = /full_name|submitter_signature/i.test(name) ? NAME_FULL_MAX : NAME_PART_MAX;
    return value.replace(/[^a-zA-ZÀ-ÿñÑ\s'.-]/g, "").slice(0, max);
  }
  return value;
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
  const loweredName = String(name || "").toLowerCase();
  const isContactField = /contact|phone/.test(loweredName);
  const isNameField = /name|requested_by|submitter_signature|celebrant/.test(loweredName);
  const mergedProps = {
    ...rest,
    ...(isContactField ? { maxLength: 11 } : {}),
    ...(isNameField ? { maxLength: /full_name|signature/.test(loweredName) ? NAME_FULL_MAX : NAME_PART_MAX } : {}),
  };

  const baseClass =
    "p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700 w-full";

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
        {label}
        {required && (
          <span className="ml-2 text-[9px] font-bold text-red-600 bg-red-50 border border-red-100 rounded-full px-2 py-0.5 align-middle">
            Required
          </span>
        )}
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
          {...mergedProps}
        />
      ) : type === "select" ? (
        <select
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          className={baseClass}
          {...mergedProps}
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
          {...mergedProps}
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
    <div data-form-error="true" className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200">
      {message}
    </div>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useScrollToError(error) {
  useEffect(() => {
    if (!error) return;

    const timer = window.setTimeout(() => {
      const errorBanner = document.querySelector('[data-form-error="true"]');
      if (errorBanner) {
        errorBanner.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 50);

    return () => window.clearTimeout(timer);
  }, [error]);
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
  if (!res.ok) throw new Error(humanizeSubmitError(json.error || `Edge function error (${res.status})`, table, payload));
  return json;
}

function humanizeSubmitError(message, table, payload = {}) {
  const text = String(message || "");
  const normalizedTable = String(table || "");

  if (/violates check constraint|new row for relation/i.test(text)) {
    if (normalizedTable === "weddings") {
      if (!payload.reservation_fee || !/^\d+(\.\d{1,2})?$/.test(String(payload.reservation_fee).trim())) {
        return "Reservation fee is required and cannot be negative. Please enter 0 or a valid amount.";
      }
    }
    if (normalizedTable === "mass_intentions") {
      if (!payload.offering_amount || !/^\d+(\.\d{1,2})?$/.test(String(payload.offering_amount).trim())) {
        return "Offering amount is required and cannot be negative. Please enter 0 or a valid amount.";
      }
    }
    if (Object.entries(payload).some(([key, value]) => /contact|phone/i.test(key) && value && !/^\d{11}$/.test(String(value).replace(/\s+/g, "")))) {
      return "Contact number must be exactly 11 digits.";
    }
    if (Object.entries(payload).some(([key, value]) => /email/i.test(key) && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim()))) {
      return "Please enter a valid email address.";
    }
    return "Some required information is missing or invalid. Please review the highlighted fields and try again.";
  }

  if (/duplicate key|already exists|already registered|already in use/i.test(text)) {
    return "This information already exists in the system. Please review the details and try again.";
  }

  return text || "Something went wrong while submitting your request. Please try again.";
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
  restInsert,
}) {
  const CONTACT_RE = /^\d{11}$/;
  const NAME_RE = /^[A-Za-zÀ-ÖØ-öø-ÿÑñ' .-]+$/;
  const PRICE_RE = /^\d+(\.\d{1,2})?$/;
  const validateFields = (obj) => {
    for (const [key, raw] of Object.entries(obj || {})) {
      if (raw === null || raw === undefined) continue;
      if (typeof raw !== "string") continue;
      const value = raw.trim();
      const k = key.toLowerCase();
      const isPriceField = k === "offering_amount" || k === "reservation_fee";

      if (isPriceField) {
        if (!value) {
          return `${key.replace(/_/g, " ")} is required.`;
        }
        if (!PRICE_RE.test(value)) {
          return `${key.replace(/_/g, " ")} must be a non-negative amount.`;
        }
      }

      if (!value) continue;

      if ((k.includes("contact") || k.includes("phone")) && !CONTACT_RE.test(value)) {
        return `${key.replace(/_/g, " ")} must be exactly 11 digits.`;
      }
      const isNameField =
        k.includes("name") ||
        k.includes("requested_by") ||
        k.includes("submitter_signature") ||
        k.includes("celebrant");
      if (isNameField && !NAME_RE.test(value)) {
        return `${key.replace(/_/g, " ")} contains invalid characters.`;
      }
      if (isNameField) {
        const max = k.includes("full_name") || k.includes("signature") ? NAME_FULL_MAX : NAME_PART_MAX;
        if (value.length > max) {
          return `${key.replace(/_/g, " ")} must be ${max} characters or less.`;
        }
      }
    }
    return null;
  };

  const payloadValidationError = validateFields(payload);
  if (payloadValidationError) throw new Error(payloadValidationError);
  if (guestInfo) {
    const guestValidationError = validateFields({
      first_name: guestInfo.firstName,
      last_name: guestInfo.lastName,
      contact_number: guestInfo.contactNumber,
    });
    if (guestValidationError) throw new Error(guestValidationError);
  }

  const cleanPayload = Object.entries(payload).reduce((acc, [key, value]) => {
    if (key === "declaration_consent" || key === "submitter_signature") return acc;
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
  let insertedRequestId = null;

  if (guestInfo && !user) {
    await submitGuestViaEdgeFunction(table, fullPayload);
    submitSuccess = true;
  } else {
    const parseErr = (raw, attemptedPayload = fullPayload) => {
      try {
        const p = JSON.parse(raw?.message ?? raw ?? "");
        return humanizeSubmitError(p.message || raw?.message || String(raw), table, attemptedPayload);
      } catch { return humanizeSubmitError(raw?.message || String(raw), table, attemptedPayload); }
    };

    let attempt = await restInsert(table, [fullPayload]);
    if (!attempt.error && Array.isArray(attempt.data) && attempt.data[0]?.id) {
      insertedRequestId = attempt.data[0].id;
    }

    if (attempt.error) {
      const fallback = { ...fullPayload };
      delete fallback.user_id;
      delete fallback.submitter_email;
      delete fallback.submitter_phone;

      const retry = await restInsert(table, [fallback]);
      if (!retry.error && Array.isArray(retry.data) && retry.data[0]?.id) {
        insertedRequestId = retry.data[0].id;
      }

      if (retry.error) {
        const minFallback = { ...fallback };
        delete minFallback.is_guest;
        delete minFallback.guest_name;
        delete minFallback.guest_contact;

        const lastRetry = await restInsert(table, [minFallback]);
        if (!lastRetry.error && Array.isArray(lastRetry.data) && lastRetry.data[0]?.id) {
          insertedRequestId = lastRetry.data[0].id;
        }
        if (lastRetry.error) throw new Error(parseErr(lastRetry.error, minFallback));
      }
    }

    submitSuccess = true;
  }

  if (submitSuccess) {
    const submitterName = user
      ? (user.user_metadata?.first_name || user.email)
      : `${guestInfo?.firstName} ${guestInfo?.lastName}`;

    const { error: rpcError } = await supabase.rpc('notify_staff', {
      notif_title: `New ${serviceName} Request`,
      notif_message: `${submitterName} submitted a new ${serviceName} request.`,
      notif_link: '/staff-dashboard',
      p_source_id: insertedRequestId,
      p_source_table: table,
    });

    if (rpcError) console.error("notify_staff error:", rpcError.message);
  }

  // Email notifications are intentionally disabled; in-app notifications are used instead.
}
