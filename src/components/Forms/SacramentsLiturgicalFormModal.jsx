import { useState, useEffect } from "react";
import { restInsert, restSelect } from "../../supabaseRest";
import { useAuth } from "../../contexts/useAuth";
import { sendRequestEmail } from "../../emailNotifications";
import DocumentUploader from "../DocumentUploader";
import SignInPrompt from "../SignInPrompt";
import { DeclarationBlock, SuccessPanel, submitRequest, useProfileAutofill, applyFieldFilter } from "./formHelpers";

// Helper function to generate time slots between 8:30 AM and 5:30 PM
function generateTimeSlots() {
  const slots = [];
  for (let hour = 8; hour <= 17; hour++) {
    const mins = hour === 8 ? ["30"] : ["00", "30"];
    for (let min of mins) {
      const time24 = `${hour.toString().padStart(2, "0")}:${min}`;
      const suffix = hour >= 12 ? "PM" : "AM";
      const displayHour = hour > 12 ? hour - 12 : hour;
      const displayTime = `${displayHour}:${min} ${suffix}`;
      slots.push({ value: time24, label: displayTime });
    }
  }
  return slots;
}

const TIME_SLOTS = generateTimeSlots();

const REQUEST_OPTIONS = [
  { value: "Mass for", label: "Mass for", needsSpecify: true },
  { value: "Sick Call", label: "Sick Call / Anointing of the Sick / Communion" },
  { value: "House/Commercial Blessing", label: "House / Commercial Establishment Blessing" },
  { value: "Funeral Mass", label: "Funeral Mass / Mass for the Dead" },
  { value: "Funeral Blessing", label: "Funeral Blessing" },
  { value: "Others", label: "Others:", needsSpecify: true },
];

function SacramentsLiturgicalFormModal({ onClose, guestInfo = null, onGuest }) {
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
    end_time: "",
    requested_by_first: "",
    requested_by_middle: "",
    requested_by_last: "",
    contact_number: "",
    preferred_priest: "", // CHANGED from minister_name to match other forms
    notes: "",
    submitter_signature: "",
    declaration_consent: false,
    documentPaths: [], // ✨ NEW: State to hold the uploaded file paths
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

  const autofill = useProfileAutofill(user);
  useEffect(() => {
    if (!autofill || guestInfo) return;
    setFormData(prev => ({
      ...prev,
      requested_by_first:   prev.requested_by_first   || autofill.firstName,
      requested_by_last:    prev.requested_by_last    || autofill.lastName,
      contact_number:       prev.contact_number       || autofill.contactNumber,
      submitter_signature:  prev.submitter_signature  || autofill.fullName,
    }));
  }, [autofill, guestInfo]);

  useEffect(() => {
    if (!guestInfo) return;
    const fullName = `${guestInfo.firstName} ${guestInfo.lastName}`.trim();
    setFormData(prev => ({
      ...prev,
      requested_by_first:   prev.requested_by_first   || guestInfo.firstName,
      requested_by_last:    prev.requested_by_last    || guestInfo.lastName,
      contact_number:       prev.contact_number       || guestInfo.contactNumber,
      submitter_signature:  prev.submitter_signature  || fullName,
    }));
  }, [guestInfo]);

  if (!user && !guestInfo) return <SignInPrompt onClose={onClose} serviceName="this sacrament request" onGuest={onGuest} />;

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === "checkbox" ? checked : applyFieldFilter(name, value) }));
  };

  const handleRequestTypeChange = (value) =>
    setFormData((prev) => ({
      ...prev,
      request_type: value,
      request_specify: "", 
    }));

  // ✨ NEW: Handles receiving the uploaded file paths from DocumentUploader
  const handleUploadComplete = (uploadedFiles) => {
    const paths = uploadedFiles.map(file => file.path);
    setFormData(prev => ({ ...prev, documentPaths: paths }));
  };

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
      const requestedByFull = [formData.requested_by_first, formData.requested_by_middle, formData.requested_by_last].filter(Boolean).join(" ");
      
      // ✨ FIX: Add documentPaths and declaration_consent to the exclusion list
      const { 
        requested_by_first, 
        requested_by_middle, 
        requested_by_last, 
        documentPaths, 
        declaration_consent, 
        ...restForm 
      } = formData;

      await submitRequest({
        table: "sacraments_liturgical",
        payload: {
          ...restForm,
          requested_by: requestedByFull,
          end_time: formData.end_time || null,
          minister_name: formData.preferred_priest || null,
          preferred_priest: formData.preferred_priest || null,
          // Safely map the stripped array into the correct DB column
          attached_documents: documentPaths.length > 0 ? documentPaths : null,
        },
        user,
        guestInfo,
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

  const inputClass = "p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700 w-full";

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
            {guestInfo && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
                <span className="text-amber-500 text-lg shrink-0">👤</span>
                <div>
                  <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Guest Submission</p>
                  <p className="text-xs text-amber-600 mt-0.5">{guestInfo.firstName} {guestInfo.lastName} · {guestInfo.contactNumber}</p>
                </div>
              </div>
            )}
            {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200">{error}</div>}

            {/* 1. REQUEST TYPE */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest border-b border-[#B59E74]/30 pb-2 mb-4">
                Please check request: <span className="text-[11px] text-gray-400 normal-case">(Lagyan ng tsek ang hiling:)</span>
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
                Please provide the following details: <span className="text-[11px] text-gray-400 normal-case">(Ibigay ang sumusunod na detalye:)</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="text-xs font-bold text-gray-600">Address <span className="text-[11px] text-gray-400 normal-case font-normal">(Tirahan):</span></label>
                  <textarea rows="3" name="address" value={formData.address} onChange={handleChange} className={`${inputClass} resize-none`} placeholder="Complete address of the activity..." />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600">Date: <span className="text-[11px] text-gray-400 normal-case font-normal">(Petsa)</span></label>
                  <input type="date" name="request_date" value={formData.request_date} onChange={handleChange} required min={new Date().toISOString().split("T")[0]} className={inputClass} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600">Time: <span className="text-[11px] text-gray-400 normal-case font-normal">(Oras)</span></label>
                  <select name="request_time" value={formData.request_time} onChange={handleChange} required className={inputClass}>
                    <option value="" disabled>Select Time</option>
                    {TIME_SLOTS.map((slot) => (
                      <option key={slot.value} value={slot.value}>{slot.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600">End Time <span className="text-[11px] text-gray-400 normal-case font-normal">(Oras ng Katapusan)</span></label>
                  <select name="end_time" value={formData.end_time} onChange={handleChange} className={inputClass}>
                    <option value="">— Optional —</option>
                    {TIME_SLOTS.map((slot) => (
                      <option key={slot.value} value={slot.value}>{slot.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="text-xs font-bold text-gray-600">Requested by <span className="text-[11px] text-gray-400 normal-case font-normal">(Hiniling ni):</span></label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input type="text" name="requested_by_first" value={formData.requested_by_first} onChange={handleChange} required className={inputClass} placeholder="First Name" />
                    <input type="text" name="requested_by_middle" value={formData.requested_by_middle} onChange={handleChange} className={inputClass} placeholder="Middle Name" />
                    <input type="text" name="requested_by_last" value={formData.requested_by_last} onChange={handleChange} required className={inputClass} placeholder="Surname" />
                  </div>
                </div>
                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="text-xs font-bold text-gray-600">Contact Nos. <span className="text-[11px] text-gray-400 normal-case font-normal">(Numero ng Telepono):</span></label>
                  <input type="tel" name="contact_number" value={formData.contact_number} onChange={handleChange} maxLength={11} className={inputClass} placeholder="Phone Number/s" />
                </div>
              </div>
            </div>

            {/* 3. MINISTER & NOTES */}
            <div>
              <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest border-b border-[#B59E74]/30 pb-2 mb-4">
                Additional Details <span className="text-[11px] text-gray-400 normal-case">(Karagdagang Detalye)</span>
              </h3>
              <div className="grid grid-cols-1 gap-6">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600">Preferred Minister / Priest (Optional): <span className="text-[11px] text-gray-400 normal-case font-normal">(Nais na Pari - Opsyonal)</span></label>
                  <select
                    name="preferred_priest"
                    value={formData.preferred_priest}
                    onChange={handleChange}
                    className={inputClass}
                  >
                    <option value="">No Preference / Any Available</option>
                    {priests.map((priest) => (
                      <option key={priest.id} value={priest.name}>
                        Fr. {priest.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600">Notes: <span className="text-[11px] text-gray-400 normal-case font-normal">(Tala)</span></label>
                  <textarea rows="4" name="notes" value={formData.notes} onChange={handleChange} className={`${inputClass} resize-none`} placeholder="Any special instructions or additional context..." />
                </div>
              </div>
            </div>

            <hr className="border-gray-200" />

            {/* --- STATIC LIST OF REQUIREMENTS & DOCUMENT UPLOADER --- */}
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
              
              {/* ✨ THE MAGIC: Replaced Google Drive Link with DocumentUploader */}
              <div className="mt-6 flex-grow flex flex-col justify-end">
                <DocumentUploader 
                  folderPath="sacraments" 
                  onUploadComplete={handleUploadComplete} 
                />
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
