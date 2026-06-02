import { useState, useEffect } from "react";
import { restInsert } from "../../supabaseRest";
import { useAuth } from "../../contexts/useAuth";
import { sendRequestEmail } from "../../emailNotifications";
import SignInPrompt from "../SignInPrompt";
import { DeclarationBlock, SuccessPanel, submitRequest, useProfileAutofill, applyFieldFilter, useScrollToError } from "./formHelpers";

const CERT_TYPES = [
  "Baptismal Certificate",
  "Confirmation Certificate",
  "Marriage Certificate",
  "Certificate of No Marriage Record",
  "Other",
];

const PURPOSES = [
  "School Requirement",
  "Wedding",
  "Job Application",
  "Visa / Travel",
  "Personal Records",
  "Other",
];

const DELIVERY_METHODS = ["Pickup at Parish Office", "Email Scan"];

function CertificationRequestFormModal({ onClose, guestInfo = null, onGuest }) {
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  useScrollToError(error);

  const [formData, setFormData] = useState({
    requestor_first_name: "",
    requestor_middle_name: "",
    requestor_surname: "",
    relationship_to_record: "Self",
    address: "",
    contact_number: "",
    email_address: "",
    certificate_type: "",
    certificate_other: "",
    record_holder_first_name: "",
    record_holder_middle_name: "",
    record_holder_surname: "",
    record_date: "",
    record_parish: "",
    father_first_name: "",
    father_middle_name: "",
    father_last_name: "",
    mother_maiden_first: "",
    mother_maiden_middle: "",
    mother_maiden_last: "",
    purpose: "",
    purpose_other: "",
    number_of_copies: "1",
    delivery_method: "",
    additional_notes: "",
    submitter_signature: "",
    declaration_consent: false,
  });

  const autofill = useProfileAutofill(user);
  useEffect(() => {
    if (!autofill || guestInfo) return;
    setFormData(prev => ({
      ...prev,
      requestor_first_name: prev.requestor_first_name || autofill.firstName,
      requestor_surname:    prev.requestor_surname    || autofill.lastName,
      contact_number:       prev.contact_number       || autofill.contactNumber,
      submitter_signature:  prev.submitter_signature  || autofill.fullName,
    }));
  }, [autofill, guestInfo]);

  useEffect(() => {
    if (!guestInfo) return;
    const fullName = `${guestInfo.firstName} ${guestInfo.lastName}`.trim();
    setFormData(prev => ({
      ...prev,
      requestor_first_name: prev.requestor_first_name || guestInfo.firstName,
      requestor_surname:    prev.requestor_surname    || guestInfo.lastName,
      contact_number:       prev.contact_number       || guestInfo.contactNumber,
      submitter_signature:  prev.submitter_signature  || fullName,
    }));
  }, [guestInfo]);

  if (!user && !guestInfo) return <SignInPrompt onClose={onClose} serviceName="a certification request" onGuest={onGuest} />;

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === "checkbox" ? checked : applyFieldFilter(name, value) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!formData.declaration_consent) {
      setError("Please confirm the declaration before submitting.");
      return;
    }
    setLoading(true);
    try {
      const finalCert = formData.certificate_type === "Other" ? formData.certificate_other : formData.certificate_type;
      const finalPurpose = formData.purpose === "Other" ? formData.purpose_other : formData.purpose;
      const fatherFull = [formData.father_first_name, formData.father_middle_name, formData.father_last_name].filter(Boolean).join(" ");
      const motherFull = [formData.mother_maiden_first, formData.mother_maiden_middle, formData.mother_maiden_last].filter(Boolean).join(" ");
      const payload = { ...formData };
      delete payload.father_first_name;
      delete payload.father_middle_name;
      delete payload.father_last_name;
      delete payload.mother_maiden_first;
      delete payload.mother_maiden_middle;
      delete payload.mother_maiden_last;
      delete payload.declaration_consent;
      await submitRequest({
        table: "certification_requests",
        payload: {
          ...payload,
          father_name: fatherFull,
          mother_maiden_name: motherFull,
          certificate_type: finalCert,
          purpose: finalPurpose,
          number_of_copies: formData.number_of_copies === "" ? 1 : Number(formData.number_of_copies),
        },
        user,
        guestInfo,
        serviceName: "certification",
        summary: `${finalCert} for ${formData.record_holder_first_name} ${formData.record_holder_surname}.`,
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
      <div className="bg-[#F6F5ED] w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl relative scrollbar-hidden">
        {/* Header */}
        <div className="sticky top-0 bg-[#F6F5ED] px-8 py-6 z-10 flex justify-between items-center border-b border-gray-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center border-2 border-[#B59E74] text-xl font-medium text-[#B59E74] shrink-0">📜</div>
            <div>
              <h2 className="text-xl md:text-2xl font-sans font-medium text-gray-800 uppercase tracking-wide">
                Basilica Minore de <span className="font-serif">San Pedro Bautista</span>
              </h2>
              <h1 className="text-2xl md:text-3xl text-[#B59E74] font-serif font-medium mt-1 uppercase">
                Certification Request Form
              </h1>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-600 shrink-0" aria-label="Close">✕</button>
        </div>

        {success ? (
          <SuccessPanel message="Your certification request has been received. The parish office typically processes requests within 3-5 working days. You will be emailed when your certificate is ready." />
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
            {error && <div data-form-error="true" className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200">{error}</div>}

            {/* INFO PANEL */}
            <div className="bg-white p-6 rounded-xl border border-[#B59E74]/30 shadow-sm">
              <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest mb-3 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                </svg>
                Important Notes
              </h3>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-y-2 text-sm text-gray-600 font-serif">
                <li>• Processing typically takes 3–5 working days.</li>
                <li>• A valid government ID is required upon pickup.</li>
                <li>• Provide accurate details to avoid delays.</li>
                <li>• A small documentary fee may apply.</li>
              </ul>
            </div>

            <p className="text-xs text-gray-500 italic leading-relaxed text-center max-w-2xl mx-auto border-t pt-4 border-gray-200">
              Instructions: Answer all the blanks accordingly using ALL CAPS. Please write legibly. Provide details exactly as recorded in the parish register.
              <br />
              <span className="text-[11px] text-gray-400">
                Panuto: Sagutan ang mga blanko ng tama sa pamamagitan ng pagsusulat gamit ang MALALAKING LETRA. Sumulat ng maayos. Ibigay ang mga detalye nang ayon sa nakasulat sa talaan ng parokya.
              </span>
            </p>

            {/* A. REQUESTOR INFORMATION */}
            <div>
              <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest border-b border-[#B59E74]/30 pb-2 mb-4">
                A. Requestor Information <span className="text-[11px] text-gray-400 normal-case">(Impormasyon ng Humihiling)</span>
              </h3>
              <div className="grid grid-cols-1 gap-6">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600">Full Name <span className="text-[11px] text-gray-400 normal-case font-normal">(Buong Pangalan)</span></label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input type="text" name="requestor_first_name" value={formData.requestor_first_name} onChange={handleChange} required className={inputClass} placeholder="First Name" />
                    <input type="text" name="requestor_middle_name" value={formData.requestor_middle_name} onChange={handleChange} className={inputClass} placeholder="Middle Name" />
                    <input type="text" name="requestor_surname" value={formData.requestor_surname} onChange={handleChange} required className={inputClass} placeholder="Surname" />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600">Relationship to Record Holder <span className="text-[11px] text-gray-400 normal-case font-normal">(Kaugnayan sa Pangalan sa Talaan)</span></label>
                  <input type="text" name="relationship_to_record" value={formData.relationship_to_record} onChange={handleChange} required className={inputClass} placeholder="Self / Parent / Spouse / Child / Other" />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600">Address <span className="text-[11px] text-gray-400 normal-case font-normal">(Tirahan)</span></label>
                  <textarea rows="2" name="address" value={formData.address} onChange={handleChange} className={`${inputClass} resize-none`} placeholder="Street, Barangay, City" />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600">Contact Number <span className="text-[11px] text-gray-400 normal-case font-normal">(Numero ng Telepono)</span></label>
                  <input type="tel" name="contact_number" value={formData.contact_number} onChange={handleChange} required maxLength={11} className={inputClass} placeholder="09XX XXX XXXX" />
                </div>
              </div>
            </div>

            {/* B. CERTIFICATE DETAILS */}
            <div>
              <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest border-b border-[#B59E74]/30 pb-2 mb-4">
                B. Certificate Details <span className="text-[11px] text-gray-400 normal-case">(Detalye ng Sertipiko)</span>
              </h3>
              <div className="grid grid-cols-1 gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-600">Certificate Type <span className="text-[11px] text-gray-400 normal-case font-normal">(Uri ng Sertipiko)</span></label>
                    <select name="certificate_type" value={formData.certificate_type} onChange={handleChange} required className={inputClass}>
                      <option value="" disabled>Select a certificate…</option>
                      {CERT_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  {formData.certificate_type === "Other" && (
                    <div className="flex flex-col gap-1 animate-fade-in-up">
                      <label className="text-xs font-bold text-gray-600">Specify Certificate <span className="text-[11px] text-gray-400 normal-case font-normal">(Ipaliwanag ang Uri ng Sertipiko)</span></label>
                      <input type="text" name="certificate_other" value={formData.certificate_other} onChange={handleChange} required className={inputClass} />
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600">Name on the Record <span className="text-[11px] text-gray-400 normal-case font-normal">(Pangalan sa Talaan — exact spelling)</span></label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input type="text" name="record_holder_first_name" value={formData.record_holder_first_name} onChange={handleChange} required className={inputClass} placeholder="First Name" />
                    <input type="text" name="record_holder_middle_name" value={formData.record_holder_middle_name} onChange={handleChange} className={inputClass} placeholder="Middle Name" />
                    <input type="text" name="record_holder_surname" value={formData.record_holder_surname} onChange={handleChange} required className={inputClass} placeholder="Surname" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-600">Date of Sacrament <span className="text-[11px] text-gray-400 normal-case font-normal">(Petsa ng Sakramento)</span></label>
                    <input type="date" name="record_date" value={formData.record_date} onChange={handleChange} className={inputClass} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-600">Parish Where Sacrament Was Received <span className="text-[11px] text-gray-400 normal-case font-normal">(Parokya kung saan natanggap ang Sakramento)</span></label>
                    <input type="text" name="record_parish" value={formData.record_parish} onChange={handleChange} className={inputClass} placeholder="e.g., San Pedro Bautista Parish, Quezon City" />
                  </div>
                </div>

                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-600">Father's Name <span className="text-[11px] text-gray-400 normal-case font-normal">(Pangalan ng Ama)</span></label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <input type="text" name="father_first_name" value={formData.father_first_name} onChange={handleChange} className={inputClass} placeholder="First Name" required />
                      <input type="text" name="father_middle_name" value={formData.father_middle_name} onChange={handleChange} className={inputClass} placeholder="Middle Name" />
                      <input type="text" name="father_last_name" value={formData.father_last_name} onChange={handleChange} className={inputClass} placeholder="Surname" required />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-600">Mother's Maiden Name <span className="text-[11px] text-gray-400 normal-case font-normal">(Pangalan ng Ina sa Pagkadalaga)</span></label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <input type="text" name="mother_maiden_first" value={formData.mother_maiden_first} onChange={handleChange} className={inputClass} placeholder="First Name" required />
                      <input type="text" name="mother_maiden_middle" value={formData.mother_maiden_middle} onChange={handleChange} className={inputClass} placeholder="Middle Name" />
                      <input type="text" name="mother_maiden_last" value={formData.mother_maiden_last} onChange={handleChange} className={inputClass} placeholder="Surname" required />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* C. PURPOSE & DELIVERY */}
            <div>
              <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest border-b border-[#B59E74]/30 pb-2 mb-4">
                C. Purpose & Delivery <span className="text-[11px] text-gray-400 normal-case">(Layunin at Paghahatid)</span>
              </h3>
              <div className="grid grid-cols-1 gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-600">Purpose <span className="text-[11px] text-gray-400 normal-case font-normal">(Layunin)</span></label>
                    <select name="purpose" value={formData.purpose} onChange={handleChange} required className={inputClass}>
                      <option value="" disabled>Select purpose…</option>
                      {PURPOSES.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  {formData.purpose === "Other" && (
                    <div className="flex flex-col gap-1 animate-fade-in-up">
                      <label className="text-xs font-bold text-gray-600">Specify Purpose <span className="text-[11px] text-gray-400 normal-case font-normal">(Ipaliwanag ang Layunin)</span></label>
                      <input type="text" name="purpose_other" value={formData.purpose_other} onChange={handleChange} required className={inputClass} />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-600">Number of Copies <span className="text-[11px] text-gray-400 normal-case font-normal">(Bilang ng Kopya)</span></label>
                    <input type="number" name="number_of_copies" value={formData.number_of_copies} onChange={handleChange} min={1} max={20} className={inputClass} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-600">Delivery Method <span className="text-[11px] text-gray-400 normal-case font-normal">(Paraan ng Paghahatid)</span></label>
                    <select name="delivery_method" value={formData.delivery_method} onChange={handleChange} required className={inputClass}>
                      <option value="" disabled>Select delivery method…</option>
                      {DELIVERY_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>

                {formData.delivery_method === "Email Scan" && (
                  <div className="flex flex-col gap-1 animate-fade-in-up">
                    <label className="text-xs font-bold text-gray-600">Email Address for Delivery <span className="text-[11px] text-gray-400 normal-case font-normal">(Email para sa Paghahatid)</span></label>
                    <input 
                      type="email" 
                      name="email_address" 
                      value={formData.email_address} 
                      onChange={handleChange} 
                      required 
                      className={inputClass} 
                      placeholder="email@example.com" 
                    />
                  </div>
                )}

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600">Additional Notes <span className="text-[11px] text-gray-400 normal-case font-normal">(Karagdagang Tala)</span></label>
                  <textarea rows="3" name="additional_notes" value={formData.additional_notes} onChange={handleChange} className={`${inputClass} resize-none`} placeholder="Any additional context, urgency, or special instructions." />
                </div>
              </div>
            </div>

            {/* DECLARATION & SIGNATURE */}
            <DeclarationBlock
              declaration="I declare that the information provided above is true and correct, and the certificate will be used only for the stated purpose."
              consent={formData.declaration_consent}
              signature={formData.submitter_signature}
              onChange={handleChange}
            />

            {/* SUBMIT */}
            <div className="pt-2 pb-4">
              <button type="submit" disabled={loading} className="w-full bg-[#B59E74] hover:bg-[#9c8760] text-white font-bold text-lg py-4 rounded-xl transition-colors shadow-md disabled:opacity-70 disabled:cursor-not-allowed uppercase tracking-widest">
                {loading ? "Submitting..." : "Submit Certification Request"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default CertificationRequestFormModal;
