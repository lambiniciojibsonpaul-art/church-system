import { useState, useEffect } from "react";
import { restInsert, restSelect } from "../../supabaseRest";
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

  // NEW: State to hold the dynamic list of priests
  const [priests, setPriests] = useState([]);

  const [formData, setFormData] = useState({
    request_type: "",
    request_specify: "",
    address: "",
    request_date: "",
    request_time: "",
    requested_by: "",
    contact_number: "",
    preferred_priest: "", // CHANGED from minister_name to match other forms
    notes: "",
    submitter_signature: "",
    declaration_consent: false,
  });

  // NEW: Fetch priests when the modal opens
  useEffect(() => {
    const fetchPriests = async () => {
      try {
        const { data, error } = await restSelect("priests", {
          match: { is_active: true },
          order: "name.asc",
        });
        if (!error && data) {
          setPriests(data);
        }
      } catch (err) {
        console.error("Error fetching priests:", err);
      }
    };
    fetchPriests();
  }, []);

  if (!user) return <SignInPrompt onClose={onClose} serviceName="this sacrament request" />;

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleRequestTypeChange = (value) =>
    setFormData((prev) => ({
      ...prev,
      request_type: value,
      request_specify: "", 
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
        payload: {
          ...formData,
          // Map to database columns and ensure null if empty
          minister_name: formData.preferred_priest || null,
          preferred_priest: formData.preferred_priest || null, 
        },
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
                
                {/* CHANGED: Now a dynamic dropdown */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600">Preferred Minister / Priest (Optional):</label>
                  <select
                    name="preferred_priest"
                    value={formData.preferred_priest}
                    onChange={handleChange}
                    className={inputClass}
                  >
                    <option value="">No Preference / Any Available</option>
                    {priests.map((priest) => (
                      <option key={priest.id} value={priest.name}>
                        {priest.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600">Notes:</label>
                  <textarea rows="4" name="notes" value={formData.notes} onChange={handleChange} className={`${inputClass} resize-none`} placeholder="Any special instructions or additional context..." />
                </div>
              </div>
            </div>

            <hr className="border-gray-200" />

            {/* --- STATIC LIST OF REQUIREMENTS & GOOGLE DRIVE UPLOAD --- */}
            <div className="bg-[#B59E74]/10 p-6 sm:p-8 rounded-2xl border border-[#B59E74]/30 shadow-sm mt-8">
              <h3 className="text-sm md:text-base font-bold text-[#B59E74] uppercase tracking-widest mb-2 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Important Notice: Requirements
              </h3>
              <p className="text-sm text-gray-700 font-medium mb-4">
                Depending on your requested service, please ensure you secure any necessary original documents (such as permits or death certificates) prior to your schedule.
              </p>
              
              {/* UPLOAD / GOOGLE DRIVE REDIRECT BOX */}
              <div className="bg-white rounded-xl border-2 border-dashed border-[#B59E74]/50 p-6 flex flex-col items-center justify-center text-center mt-6">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-[#B59E74] mb-3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                </svg>
                <h4 className="text-sm font-bold text-gray-800 uppercase tracking-widest mb-1">Submit Your Documents</h4>
                <p className="text-xs text-gray-500 mb-4 max-w-md">
                  If your request requires documentation, please compile your scanned requirements and upload them to our secure Parish Google Drive folder.
                </p>
                <a
                  href="https://drive.google.com/drive/folders/1Vx6VT1vWZjkEcSRpMZ3e_Dq_CFPLnIls?usp=sharing" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#B59E74] hover:bg-[#9c8760] text-white px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors shadow-sm flex items-center gap-2"
                >
                  <span>📁</span> Open Upload Folder
                </a>
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
              <button type="submit" disabled={loading} className="w-full bg-[#B59E74] hover:bg-[#9c8760] text-white font-bold text-lg py-4 rounded-xl transition-colors shadow-md disabled:opacity-70 disabled:cursor-not-allowed uppercase tracking-widest">
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