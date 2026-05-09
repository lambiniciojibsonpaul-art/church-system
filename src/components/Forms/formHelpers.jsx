// Shared building blocks used by every sacrament request modal.
// Keep this lightweight — just presentational components used inside
// the form bodies. The actual submit / state logic stays per-form.

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

// Declaration + digital signature block. Appears at the bottom of every
// request form as a formality-style consent. The `declaration` text should
// be tailored per form (e.g. "I request the Sacrament of Baptism…").
//
// Wires through the parent form's existing handleChange via `name` attrs.
// formData must include `declaration_consent` (boolean) and
// `submitter_signature` (string).
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

// Shared submit helper. Inserts to `table` with retry-without-optional-cols,
// then fires a fire-and-forget email notification.
// eslint-disable-next-line react-refresh/only-export-components
export async function submitRequest({
  table,
  payload,
  user,
  serviceName,
  summary,
  restInsert,
  sendRequestEmail,
}) {
  const fullPayload = {
    ...payload,
    status: "Pending",
    user_id: user.id,
    submitter_email: user.email || null,
    submitter_phone:
      user.user_metadata?.contact_number || user.phone || null,
  };

  let attempt = await restInsert(table, [fullPayload]);
  if (attempt.error) {
    const fallback = { ...fullPayload };
    delete fallback.user_id;
    delete fallback.submitter_email;
    delete fallback.submitter_phone;
    const retry = await restInsert(table, [fallback]);
    if (retry.error) throw new Error(retry.error.message);
  }

  // Fire-and-forget email
  if (sendRequestEmail && user?.email) {
    sendRequestEmail({ to: user.email, serviceName, summary });
  }
}
