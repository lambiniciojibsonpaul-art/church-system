import { useState } from "react";
import { restInsert } from "../../supabaseRest";
import { useAuth } from "../../contexts/useAuth";
import { sendRequestEmail } from "../../emailNotifications";
import SignInPrompt from "../SignInPrompt";
import { DeclarationBlock, SuccessPanel, submitRequest } from "./formHelpers";

function HolyCommunionFormModal({ onClose }) {
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    date_of_communion: "",
    time_of_communion: "",
    child_first_name: "",
    child_middle_name: "",
    child_surname: "",
    date_of_birth: "",
    place_of_birth: "",
    gender: "",
    current_age: "",
    date_of_baptism: "",
    baptism_parish: "",
    father_name: "",
    mother_maiden_name: "",
    other_guardian_info: "",
    complete_address: "",
    residence_parish: "",
    contact_number_1: "",
    contact_number_2: "",
    other_requirements: "",
    submitter_signature: "",
    declaration_consent: false,
  });

  if (!user) return <SignInPrompt onClose={onClose} serviceName="holy communion" />;

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
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
      await submitRequest({
        table: "holy_communions",
        payload: formData,
        user,
        serviceName: "holy communion",
        summary: `First Holy Communion request for ${formData.child_first_name} ${formData.child_surname}.`,
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
        {/* Modal Header */}
        <div className="sticky top-0 bg-[#F6F5ED] px-8 py-6 z-10 flex justify-between items-center border-b border-gray-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center border-2 border-[#B59E74] text-xl font-medium text-[#B59E74]">⛪</div>
            <div>
              <h2 className="text-xl md:text-2xl font-sans font-medium text-gray-800 uppercase tracking-wide">
                Basilica Minore de <span className="font-serif">San Pedro Bautista</span>
              </h2>
              <h1 className="text-2xl md:text-3xl text-[#B59E74] font-serif font-medium mt-1">
                REGISTRATION FORM FOR HOLY COMMUNION
              </h1>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-600 shrink-0" aria-label="Close">✕</button>
        </div>

        {success ? (
          <SuccessPanel />
        ) : (
          <form onSubmit={handleSubmit} className="p-8 space-y-10">
            {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200">{error}</div>}

            {/* TOP DETAILS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-white rounded-xl border border-gray-100">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-bold text-gray-600">Date of Holy Communion:</label>
                <input type="date" name="date_of_communion" value={formData.date_of_communion} onChange={handleChange} required className={inputClass} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-bold text-gray-600">Time:</label>
                <input type="time" name="time_of_communion" value={formData.time_of_communion} onChange={handleChange} className={inputClass} />
              </div>
            </div>

            <p className="text-xs text-gray-500 italic leading-relaxed text-center max-w-2xl mx-auto border-t pt-4 border-gray-200">
              Instructions: Answer all the blanks accordingly using ALL CAPS. Please write legibly. Copy necessary details as it is written in the Certificate of Live Birth of the one to be confirmed.
            </p>

            {/* 1. Student Information */}
            <div>
              <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest border-b border-[#B59E74]/30 pb-2 mb-4">
                Student Information <span className="text-[11px] text-gray-400 normal-case">(Pangalan ng Unang Pakikinabang)</span>
              </h3>
              <div className="grid grid-cols-1 gap-6">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600">Name of Child <span className="text-[11px] text-gray-400 normal-case font-normal">(Pangalan ng Unang Pakikinabang)</span></label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input type="text" name="child_first_name" value={formData.child_first_name} onChange={handleChange} required className={inputClass} placeholder="First Name" />
                    <input type="text" name="child_middle_name" value={formData.child_middle_name} onChange={handleChange} className={inputClass} placeholder="Middle Name" />
                    <input type="text" name="child_surname" value={formData.child_surname} onChange={handleChange} required className={inputClass} placeholder="Surname" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-600">Date of Birth <span className="text-[11px] text-gray-400 normal-case font-normal">(Petsa ng Kapanganakan)</span></label>
                    <input type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange} className={inputClass} />
                  </div>
                  <div className="flex flex-col gap-1 md:col-span-2">
                    <label className="text-xs font-bold text-gray-600">Place of Birth <span className="text-[11px] text-gray-400 normal-case font-normal">(Lugar ng Kapanganakan)</span></label>
                    <input type="text" name="place_of_birth" value={formData.place_of_birth} onChange={handleChange} className={inputClass} placeholder="City / Province" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-600">Gender <span className="text-[11px] text-gray-400 normal-case font-normal">(Kasarian)</span></label>
                    <div className="flex items-center gap-6 mt-1">
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                        <input type="radio" name="gender" value="Male" checked={formData.gender === "Male"} onChange={handleChange} className="w-4 h-4 text-[#B59E74] focus:ring-[#B59E74] rounded border-gray-300" /> Male <span className="text-gray-400">(Lalake)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                        <input type="radio" name="gender" value="Female" checked={formData.gender === "Female"} onChange={handleChange} className="w-4 h-4 text-[#B59E74] focus:ring-[#B59E74] rounded border-gray-300" /> Female <span className="text-gray-400">(Babae)</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-600">Current Age: <span className="text-[11px] text-gray-400 normal-case font-normal">(Kasalukuyang Edad)</span></label>
                    <input type="number" name="current_age" value={formData.current_age} onChange={handleChange} className={`${inputClass} md:w-1/3`} />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Baptismal Details */}
            <div>
              <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest border-b border-[#B59E74]/30 pb-2 mb-4">Baptismal Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600">Date of Baptism <span className="text-[11px] text-gray-400 normal-case font-normal">(Petsa ng Binyag)</span></label>
                  <input type="date" name="date_of_baptism" value={formData.date_of_baptism} onChange={handleChange} className={inputClass} />
                </div>
                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="text-xs font-bold text-gray-600">Church/Parish of Baptism <span className="text-[11px] text-gray-400 normal-case font-normal">(Simbahan/Parokya kung saan bininyagan)</span></label>
                  <input type="text" name="baptism_parish" value={formData.baptism_parish} onChange={handleChange} className={inputClass} />
                </div>
              </div>
            </div>

            {/* 3. Parents */}
            <div>
              <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest border-b border-[#B59E74]/30 pb-2 mb-4">Parents & Guardian Information</h3>
              <div className="grid grid-cols-1 gap-6">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600">Father's Full Name <span className="text-[11px] text-gray-400 normal-case font-normal">(Pangalan ng Ama)</span></label>
                  <input type="text" name="father_name" value={formData.father_name} onChange={handleChange} className={inputClass} placeholder="Full Name" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600">Mother's Full Maiden Name <span className="text-[11px] text-gray-400 normal-case font-normal">(Pangalan ng Ina sa Pagkadalaga)</span></label>
                  <input type="text" name="mother_maiden_name" value={formData.mother_maiden_name} onChange={handleChange} className={inputClass} placeholder="Full Maiden Name" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600">Other Guardian Information</label>
                  <input type="text" name="other_guardian_info" value={formData.other_guardian_info} onChange={handleChange} className={inputClass} placeholder="If applicable" />
                </div>
              </div>
            </div>

            {/* 4. Address & Contact */}
            <div>
              <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest border-b border-[#B59E74]/30 pb-2 mb-4">Address & Contact</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="text-xs font-bold text-gray-600">Complete Address <span className="text-[11px] text-gray-400 normal-case font-normal">(Tirahan)</span></label>
                  <textarea rows="3" name="complete_address" value={formData.complete_address} onChange={handleChange} className={`${inputClass} resize-none`} placeholder="Street Address, City, Zip Code" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600">Parish: <span className="text-[11px] text-gray-400 normal-case font-normal">(Parokyang nakasasakop sa tirahan)</span></label>
                  <input type="text" name="residence_parish" value={formData.residence_parish} onChange={handleChange} className={inputClass} />
                </div>
                <div className="flex flex-col gap-1 md:col-span-2 mt-2">
                  <label className="text-xs font-bold text-gray-600 mb-2">Contact Numbers <span className="text-[11px] text-gray-400 normal-case font-normal">(Provide up to two)</span></label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="tel" name="contact_number_1" value={formData.contact_number_1} onChange={handleChange} className={inputClass} placeholder="Primary Contact Number" />
                    <input type="tel" name="contact_number_2" value={formData.contact_number_2} onChange={handleChange} className={inputClass} placeholder="Secondary Contact Number" />
                  </div>
                </div>
              </div>
            </div>

            {/* 5. CHECKLIST */}
            <div className="bg-[#B59E74]/10 p-6 rounded-xl border border-[#B59E74]/30 shadow-sm mt-8">
              <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Checklist of Requirements
              </h3>
              <ul className="flex flex-col gap-3 text-sm text-gray-700 font-serif">
                <li className="flex items-start gap-3"><span className="text-[#B59E74] mt-0.5">•</span>Baptismal Cert. original with annotation for 1st communion purposes</li>
                <li className="flex items-start gap-3"><span className="text-[#B59E74] mt-0.5">•</span>Parents seminar (no parents seminar no 1st communion)</li>
                <li className="flex items-start gap-3"><span className="text-[#B59E74] mt-0.5">•</span>Practices</li>
                <li className="flex items-start gap-3"><span className="text-[#B59E74] mt-0.5">•</span>Confession</li>
                <li className="flex items-start gap-3">
                  <span className="text-[#B59E74] mt-0.5">•</span>
                  <div className="flex items-center gap-2 w-full md:w-1/2">
                    <span>Others:</span>
                    <input type="text" name="other_requirements" value={formData.other_requirements} onChange={handleChange} className="flex-1 bg-transparent border-b border-gray-400 focus:outline-none focus:border-[#B59E74] text-sm" />
                  </div>
                </li>
              </ul>
              <p className="text-xs text-gray-500 italic mt-5 border-t border-[#B59E74]/20 pt-3">
                * Please prepare and bring the necessary requirements to the Parish Office as indicated.
              </p>
            </div>

            {/* DECLARATION & SIGNATURE */}
            <DeclarationBlock
              declaration="I declare that the information provided above is true and correct, and I respectfully request the First Holy Communion for the candidate named above."
              consent={formData.declaration_consent}
              signature={formData.submitter_signature}
              onChange={handleChange}
            />

            <div className="pt-2 pb-4">
              <button type="submit" disabled={loading} className="w-full bg-[#B59E74] hover:bg-[#9c8760] text-white font-bold text-lg py-4 rounded-xl transition-colors shadow-md disabled:opacity-70 disabled:cursor-not-allowed">
                {loading ? "Submitting..." : "Submit Form"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default HolyCommunionFormModal;
