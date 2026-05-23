import { useState, useEffect } from "react";
import { restInsert } from "../../supabaseRest";
import { useAuth } from "../../contexts/useAuth";
import { sendRequestEmail } from "../../emailNotifications";
import SignInPrompt from "../SignInPrompt";
import { DeclarationBlock, SuccessPanel, submitRequest, useProfileAutofill } from "./formHelpers";

const FACILITIES = [
  "Parish Hall",
  "Multi-Purpose Hall",
  "Garden / Outdoor Area",
  "Conference Room",
  "Chapel",
  "Other",
];

function FacilitiesBookingFormModal({ onClose, guestInfo = null, onGuest }) {
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    requestor_first_name: "",
    requestor_middle_name: "",
    requestor_surname: "",
    organization: "",
    address: "",
    contact_number: "",
    email_address: "",
    facility: "",
    facility_other: "",
    event_purpose: "",
    event_type: "",
    start_date: "",
    start_time: "",
    end_date: "",
    end_time: "",
    expected_attendees: "",
    setup_requirements: "",
    equipment_needed: "",
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
    }));
  }, [autofill, guestInfo]);

  useEffect(() => {
    if (!guestInfo) return;
    setFormData(prev => ({
      ...prev,
      requestor_first_name: prev.requestor_first_name || guestInfo.firstName,
      requestor_surname:    prev.requestor_surname    || guestInfo.lastName,
      contact_number:       prev.contact_number       || guestInfo.contactNumber,
    }));
  }, [guestInfo]);

  if (!user && !guestInfo) return <SignInPrompt onClose={onClose} serviceName="a facilities booking" onGuest={onGuest} />;

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
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
      const finalFacility = formData.facility === "Other" ? formData.facility_other : formData.facility;
      await submitRequest({
        table: "facilities_bookings",
        payload: {
          ...formData,
          facility: finalFacility,
          expected_attendees: formData.expected_attendees === "" ? null : Number(formData.expected_attendees),
        },
        user,
        guestInfo,
        serviceName: "facilities booking",
        summary: `Booking request for ${finalFacility} on ${formData.start_date || "(date pending)"} — ${formData.event_purpose}.`,
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
      <div className="bg-[#F6F5ED] w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl relative scrollbar-hidden">
        {/* Header */}
        <div className="sticky top-0 bg-[#F6F5ED] px-8 py-6 z-10 flex justify-between items-center border-b border-gray-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center border-2 border-[#B59E74] text-xl font-medium text-[#B59E74] shrink-0">📅</div>
            <div>
              <h2 className="text-xl md:text-2xl font-sans font-medium text-gray-800 uppercase tracking-wide">
                Basilica Minore de <span className="font-serif">San Pedro Bautista</span>
              </h2>
              <h1 className="text-2xl md:text-3xl text-[#B59E74] font-serif font-medium mt-1 uppercase">
                Facilities Booking Request
              </h1>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-600 shrink-0" aria-label="Close">✕</button>
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

            {/* INFO PANEL */}
            <div className="bg-white p-6 rounded-xl border border-[#B59E74]/30 shadow-sm">
              <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest mb-3 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                </svg>
                Important Notes
              </h3>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-y-2 text-sm text-gray-600 font-serif">
                <li>• Submit at least 7 days before the event date.</li>
                <li>• Booking is subject to availability and parish approval.</li>
                <li>• A confirmation email will be sent once approved.</li>
                <li>• Cleanliness and care of the facility is the booker's responsibility.</li>
              </ul>
            </div>

            <p className="text-xs text-gray-500 italic leading-relaxed text-center max-w-2xl mx-auto border-t pt-4 border-gray-200">
              Instructions: Answer all the blanks accordingly using ALL CAPS. Please write legibly.
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
                  <label className="text-xs font-bold text-gray-600">Organization / Ministry / Group <span className="text-[11px] text-gray-400 normal-case font-normal">(If applicable)</span></label>
                  <input type="text" name="organization" value={formData.organization} onChange={handleChange} className={inputClass} placeholder="e.g., Youth Ministry" />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600">Address <span className="text-[11px] text-gray-400 normal-case font-normal">(Tirahan)</span></label>
                  <textarea rows="2" name="address" value={formData.address} onChange={handleChange} className={`${inputClass} resize-none`} placeholder="Street, Barangay, City" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-600">Contact Number <span className="text-[11px] text-gray-400 normal-case font-normal">(Numero ng Telepono)</span></label>
                    <input type="tel" name="contact_number" value={formData.contact_number} onChange={handleChange} required className={inputClass} placeholder="09XX XXX XXXX" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-600">Email Address <span className="text-[11px] text-gray-400 normal-case font-normal">(Optional)</span></label>
                    <input type="email" name="email_address" value={formData.email_address} onChange={handleChange} className={inputClass} placeholder="email@example.com" />
                  </div>
                </div>
              </div>
            </div>

            {/* B. FACILITY DETAILS */}
            <div>
              <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest border-b border-[#B59E74]/30 pb-2 mb-4">
                B. Facility & Event Details <span className="text-[11px] text-gray-400 normal-case">(Detalye ng Pasilidad at Kaganapan)</span>
              </h3>
              <div className="grid grid-cols-1 gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-600">Facility Requested</label>
                    <select name="facility" value={formData.facility} onChange={handleChange} required className={inputClass}>
                      <option value="" disabled>Select a facility…</option>
                      {FACILITIES.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  {formData.facility === "Other" && (
                    <div className="flex flex-col gap-1 animate-fade-in-up">
                      <label className="text-xs font-bold text-gray-600">Specify Facility</label>
                      <input type="text" name="facility_other" value={formData.facility_other} onChange={handleChange} className={inputClass} required />
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600">Event Type</label>
                  <input type="text" name="event_type" value={formData.event_type} onChange={handleChange} className={inputClass} placeholder="e.g., Family Reunion, Seminar, Recollection, Birthday" />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600">Event Purpose</label>
                  <textarea rows="3" name="event_purpose" value={formData.event_purpose} onChange={handleChange} required className={`${inputClass} resize-none`} placeholder="Briefly describe the purpose and nature of the event." />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-600">Start Date</label>
                    <input type="date" name="start_date" value={formData.start_date} onChange={handleChange} required min={new Date().toISOString().split("T")[0]} className={inputClass} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-600">Start Time</label>
                    <input type="time" name="start_time" value={formData.start_time} onChange={handleChange} required className={inputClass} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-600">End Date</label>
                    <input type="date" name="end_date" value={formData.end_date} onChange={handleChange} required min={new Date().toISOString().split("T")[0]} className={inputClass} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-600">End Time</label>
                    <input type="time" name="end_time" value={formData.end_time} onChange={handleChange} required className={inputClass} />
                  </div>
                </div>

                <div className="flex flex-col gap-1 md:w-1/3">
                  <label className="text-xs font-bold text-gray-600">Expected Number of Attendees</label>
                  <input type="number" name="expected_attendees" value={formData.expected_attendees} onChange={handleChange} className={inputClass} placeholder="e.g., 50" min={1} />
                </div>
              </div>
            </div>

            {/* C. SETUP & EQUIPMENT */}
            <div>
              <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest border-b border-[#B59E74]/30 pb-2 mb-4">
                C. Setup & Equipment <span className="text-[11px] text-gray-400 normal-case">(Kagamitan at Set-up)</span>
              </h3>
              <div className="grid grid-cols-1 gap-6">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600">Setup Requirements</label>
                  <textarea rows="2" name="setup_requirements" value={formData.setup_requirements} onChange={handleChange} className={`${inputClass} resize-none`} placeholder="Tables, chairs, layout preferences, etc." />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600">Equipment Needed</label>
                  <textarea rows="2" name="equipment_needed" value={formData.equipment_needed} onChange={handleChange} className={`${inputClass} resize-none`} placeholder="Microphone, projector, sound system, etc." />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600">Additional Notes</label>
                  <textarea rows="3" name="additional_notes" value={formData.additional_notes} onChange={handleChange} className={`${inputClass} resize-none`} placeholder="Anything else the parish office should know." />
                </div>
              </div>
            </div>

            {/* GUIDELINES */}
            <div className="bg-[#B59E74]/10 p-6 rounded-xl border border-[#B59E74]/30 shadow-sm">
              <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Booking Guidelines
              </h3>
              <ul className="flex flex-col gap-2 text-sm text-gray-700 font-serif">
                <li className="flex items-start gap-3"><span className="text-[#B59E74] mt-0.5">•</span>The facility must be returned in the same condition as received.</li>
                <li className="flex items-start gap-3"><span className="text-[#B59E74] mt-0.5">•</span>Loud or disruptive activities are not allowed during scheduled Masses.</li>
                <li className="flex items-start gap-3"><span className="text-[#B59E74] mt-0.5">•</span>Alcohol and gambling are strictly prohibited within parish grounds.</li>
                <li className="flex items-start gap-3"><span className="text-[#B59E74] mt-0.5">•</span>Cancellations must be made at least 48 hours in advance.</li>
              </ul>
            </div>

            {/* DECLARATION & SIGNATURE */}
            <DeclarationBlock
              declaration="I declare that the information provided above is true and correct, and I hereby request the use of the parish facility for the event described above. I agree to abide by the parish guidelines."
              consent={formData.declaration_consent}
              signature={formData.submitter_signature}
              onChange={handleChange}
            />

            {/* SUBMIT */}
            <div className="pt-2 pb-4">
              <button type="submit" disabled={loading} className="w-full bg-[#B59E74] hover:bg-[#9c8760] text-white font-bold text-lg py-4 rounded-xl transition-colors shadow-md disabled:opacity-70 disabled:cursor-not-allowed">
                {loading ? "Submitting..." : "Submit Booking Request"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default FacilitiesBookingFormModal;
