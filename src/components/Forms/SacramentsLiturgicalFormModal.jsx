import { useState } from "react";
import { restInsert } from "../../supabaseRest";
import { useAuth } from "../../contexts/useAuth";
import { sendRequestEmail } from "../../emailNotifications";
import SignInPrompt from "../SignInPrompt";
import { DeclarationBlock, SuccessPanel, submitRequest } from "./formHelpers";

const REQUEST_OPTIONS = [
  { value: "Mass for", label: "Mass for", needsSpecify: true },
  { value: "Sick Call", label: "Sick Call / Anointing of the Sick / Communion" },
  { value: "House/Commercial Blessing", label: "House / Commercial Establishment Blessing" },
  { value: "Funeral Mass", label: "Funeral Mass / Mass for the Dead" },
  { value: "Funeral Blessing", label: "Funeral Blessing" },
  { value: "Others", label: "Others:", needsSpecify: true },
];

function SacramentsLiturgicalFormModal({ onClose }) {
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    request_type: "",
    request_specify: "",
    address: "",
    request_date: "",
    request_time: "",
    requested_by: "",
    contact_number: "",
    minister_name: "",
    notes: "",
    submitter_signature: "",
    declaration_consent: false,
  });

  if (!user) return <SignInPrompt onClose={onClose} serviceName="this sacrament request" />;

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleRequestTypeChange = (value) =>
    setFormData((prev) => ({
      ...prev,
      request_type: value,
      request_specify: "", // reset specify text when type changes
    }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!formData.request_type) {
      setError("Please select a request type.");
      return;
    }
    if (!formData.declaration_consent) {
      setError("Please confirm the declaration before submitting.");
      return;
    }
    setLoading(true);
    try {
      await submitRequest({
        table: "sacraments_liturgical",
        payload: formData,
        user,
        serviceName: formData.request_type || "sacrament service",
        summary: `${formData.request_type}${formData.request_specify ? ` (${formData.request_specify})` : ""} on ${formData.request_date || "(date pending)"}.`,
        restInsert,
        sendRequestEmail,
      });
      setSuccess(true);
      setTimeout(onClose, 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 h-screen w-screen">
      <div className="bg-[#F6F5ED] w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl relative scrollbar-hidden">
        {/* Header */}
        <div className="sticky top-0 bg-[#F6F5ED] px-8 py-6 z-10 flex justify-between items-center border-b border-gray-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center border-2 border-[#B59E74] text-xl font-medium text-[#B59E74] shrink-0">⛪</div>
            <div>
              <h2 className="text-xl md:text-2xl font-sans font-medium text-gray-800 uppercase tracking-wide">
                Basilica Minore de <span className="font-serif">San Pedro Bautista</span>
              </h2>
              <h1 className="text-sm md:text-base text-[#B59E74] font-bold tracking-widest mt-1 uppercase">
                Request Form for Sacraments & Other Liturgical Activities Outside the Basilica
              </h1>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-600 shrink-0">✕</button>
        </div>

        {success ? (
          <SuccessPanel />
        ) : (
          <form onSubmit={handleSubmit} className="p-8 space-y-10">
            {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200">{error}</div>}

            {/* 1. REQUEST TYPE */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest border-b border-[#B59E74]/30 pb-2 mb-4">
                Please check request:
              </h3>

              <div className="flex flex-col gap-4">
                {REQUEST_OPTIONS.map((opt) => (
                  <label key={opt.value} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="request_type_radio"
                      value={opt.value}
                      checked={formData.request_type === opt.value}
                      onChange={() => handleRequestTypeChange(opt.value)}
                      className="w-5 h-5 text-[#B59E74] focus:ring-[#B59E74] border-gray-300"
                    />
                    <span className="text-sm md:text-base text-gray-700">{opt.label}</span>
                    {opt.needsSpecify && formData.request_type === opt.value && (
                      <input
                        type="text"
                        name="request_specify"
                        value={formData.request_specify}
                        onChange={handleChange}
                        className="ml-2 flex-1 p-2 border-b border-gray-400 focus:outline-none focus:border-[#B59E74] bg-transparent text-gray-700 text-sm md:text-base animate-fade-in-up"
                        placeholder={opt.value === "Others" ? "Please specify..." : "Specify intention..."}
                        autoFocus
                      />
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* 2. DETAILS */}
            <div>
              <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest border-b border-[#B59E74]/30 pb-2 mb-4">
                Please provide the following details:
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="text-xs font-bold text-gray-600">Address:</label>
                  <textarea rows="3" name="address" value={formData.address} onChange={handleChange} className={`${inputClass} resize-none`} placeholder="Complete address of the activity..." />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600">Date:</label>
                  <input type="date" name="request_date" value={formData.request_date} onChange={handleChange} required className={inputClass} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600">Time:</label>
                  <input type="time" name="request_time" value={formData.request_time} onChange={handleChange} className={inputClass} />
                </div>
                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="text-xs font-bold text-gray-600">Requested by:</label>
                  <input type="text" name="requested_by" value={formData.requested_by} onChange={handleChange} required className={inputClass} placeholder="Full Name" />
                </div>
                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="text-xs font-bold text-gray-600">Contact Nos.:</label>
                  <input type="tel" name="contact_number" value={formData.contact_number} onChange={handleChange} className={inputClass} placeholder="Phone Number/s" />
                </div>
              </div>
            </div>

            {/* 3. MINISTER & NOTES */}
            <div>
              <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest border-b border-[#B59E74]/30 pb-2 mb-4">
                Additional Details
              </h3>
              <div className="grid grid-cols-1 gap-6">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600">Name of Minister:</label>
                  <input type="text" name="minister_name" value={formData.minister_name} onChange={handleChange} className={inputClass} placeholder="If known or preferred" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600">Notes:</label>
                  <textarea rows="4" name="notes" value={formData.notes} onChange={handleChange} className={`${inputClass} resize-none`} placeholder="Any special instructions or additional context..." />
                </div>
              </div>
            </div>

            {/* DECLARATION & SIGNATURE */}
            <DeclarationBlock
              declaration="I declare that the information provided above is true and correct, and I respectfully request the sacrament or liturgical service indicated above."
              consent={formData.declaration_consent}
              signature={formData.submitter_signature}
              onChange={handleChange}
            />

            {/* SUBMIT */}
            <div className="pt-4 pb-2">
              <button type="submit" disabled={loading} className="w-full bg-[#B59E74] hover:bg-[#9c8760] text-white font-bold text-lg py-4 rounded-xl transition-colors shadow-md disabled:opacity-70 disabled:cursor-not-allowed">
                {loading ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default SacramentsLiturgicalFormModal;
