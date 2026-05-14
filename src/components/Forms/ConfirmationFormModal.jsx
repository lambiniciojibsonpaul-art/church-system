import { useState } from "react";
import { restInsert } from "../../supabaseRest";
import { useAuth } from "../../contexts/useAuth";
import { sendRequestEmail } from "../../emailNotifications";
import SignInPrompt from "../SignInPrompt";
import { DeclarationBlock, SuccessPanel, submitRequest } from "./formHelpers";

function ConfirmationFormModal({ onClose }) {
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  // State for the dynamic sponsor input box
  const [sponsorInput, setSponsorInput] = useState("");

  const [formData, setFormData] = useState({
    date_of_confirmation: "",
    time_of_confirmation: "",
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
    complete_address: "",
    residence_parish: "",
    contact_number: "",
    sponsor1_name: "",
    sponsor1_address: "",
    sponsor2_name: "",
    sponsor2_address: "",
    additional_sponsors: "",
    submitter_signature: "",
    declaration_consent: false,
  });

  if (!user) return <SignInPrompt onClose={onClose} serviceName="confirmation" />;

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  // --- DYNAMIC SPONSOR LIST LOGIC ---
  const sponsorsList = formData.additional_sponsors 
    ? formData.additional_sponsors.split(",").map(s => s.trim()).filter(Boolean) 
    : [];

  const handleAddSponsor = (e) => {
    e?.preventDefault();
    if (!sponsorInput.trim()) return;

    const newList = [...sponsorsList, sponsorInput.trim()];
    
    handleChange({
      target: { name: "additional_sponsors", value: newList.join(", ") }
    });
    
    setSponsorInput("");
  };

  const handleRemoveSponsor = (indexToRemove) => {
    const newList = sponsorsList.filter((_, index) => index !== indexToRemove);
    handleChange({
      target: { name: "additional_sponsors", value: newList.join(", ") }
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddSponsor();
    }
  };
  // ---------------------------------------

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
        table: "confirmations",
        payload: formData,
        user,
        serviceName: "confirmation",
        summary: `Confirmation request for ${formData.child_first_name} ${formData.child_surname}.`,
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
            <div className="w-16 h-16 rounded-full flex items-center justify-center border-2 border-[#B59E74] text-xl font-medium text-[#B59E74] shrink-0">
              ⛪
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-sans font-medium text-gray-800 uppercase tracking-wide">
                Basilica Minore de <span className="font-serif">San Pedro Bautista</span>
              </h2>
              <h1 className="text-2xl md:text-3xl text-[#B59E74] font-serif font-medium mt-1 uppercase">
                Registration Form for Confirmation
              </h1>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-600 shrink-0"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {success ? (
          <SuccessPanel />
        ) : (
          <form onSubmit={handleSubmit} className="p-8 space-y-10">
            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200">
                {error}
              </div>
            )}

            {/* TOP DETAILS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-white rounded-xl border border-gray-100">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-bold text-gray-600">Date of Confirmation:</label>
                <input
                  type="date"
                  name="date_of_confirmation"
                  value={formData.date_of_confirmation}
                  onChange={handleChange}
                  required
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-bold text-gray-600">Time:</label>
                <input
                  type="time"
                  name="time_of_confirmation"
                  value={formData.time_of_confirmation}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
            </div>

            <p className="text-xs text-gray-500 italic leading-relaxed text-center max-w-2xl mx-auto border-t pt-4 border-gray-200">
              Instructions: Answer all the blanks accordingly using ALL CAPS.
              Please write legibly. Copy necessary details as it is written in the
              Certificate of Live Birth of the one to be confirmed.
            </p>

            {/* 1. Student Information */}
            <div>
              <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest border-b border-[#B59E74]/30 pb-2 mb-4">
                Student Information <span className="text-[11px] text-gray-400 normal-case">(Pangalan ng Kukumpilan)</span>
              </h3>
              <div className="grid grid-cols-1 gap-6">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600">
                    Name of Child <span className="text-[11px] text-gray-400 normal-case font-normal">(Pangalan ng Kukumpilan)</span>
                  </label>
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
                        <input type="radio" name="gender" value="Male" checked={formData.gender === "Male"} onChange={handleChange} className="w-4 h-4 text-[#B59E74] focus:ring-[#B59E74] rounded border-gray-300" /> Male
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                        <input type="radio" name="gender" value="Female" checked={formData.gender === "Female"} onChange={handleChange} className="w-4 h-4 text-[#B59E74] focus:ring-[#B59E74] rounded border-gray-300" /> Female
                      </label>
                    </div>
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
                  <label className="text-xs font-bold text-gray-600 mb-2">Contact Nos.:</label>
                  <input type="tel" name="contact_number" value={formData.contact_number} onChange={handleChange} className={`${inputClass} md:w-1/2`} placeholder="Primary Contact Number" />
                </div>
              </div>
            </div>

            {/* 5. Sponsors */}
            <div>
              <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest border-b border-[#B59E74]/30 pb-2 mb-4">
                Sponsors Information <span className="text-[11px] text-gray-400 normal-case">(Ninong at Ninang)</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                <div className="flex flex-col gap-2 p-4 bg-white border border-gray-200 rounded-xl">
                  <label className="text-xs font-bold text-[#B59E74]">Primary Sponsor 1</label>
                  <input type="text" name="sponsor1_name" value={formData.sponsor1_name} onChange={handleChange} className="p-2 border-b border-gray-300 focus:outline-none focus:border-[#B59E74] bg-transparent text-gray-700 text-sm" placeholder="Full Name" />
                  <input type="text" name="sponsor1_address" value={formData.sponsor1_address} onChange={handleChange} className="p-2 border-b border-gray-300 focus:outline-none focus:border-[#B59E74] bg-transparent text-gray-700 text-sm mt-1" placeholder="Address (Tirahan)" />
                </div>
                <div className="flex flex-col gap-2 p-4 bg-white border border-gray-200 rounded-xl">
                  <label className="text-xs font-bold text-[#B59E74]">Primary Sponsor 2</label>
                  <input type="text" name="sponsor2_name" value={formData.sponsor2_name} onChange={handleChange} className="p-2 border-b border-gray-300 focus:outline-none focus:border-[#B59E74] bg-transparent text-gray-700 text-sm" placeholder="Full Name" />
                  <input type="text" name="sponsor2_address" value={formData.sponsor2_address} onChange={handleChange} className="p-2 border-b border-gray-300 focus:outline-none focus:border-[#B59E74] bg-transparent text-gray-700 text-sm mt-1" placeholder="Address (Tirahan)" />
                </div>
              </div>

              {/* --- DYNAMIC SPONSOR INPUT --- */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-600">
                  Additional Sponsors <span className="text-[11px] text-gray-400 normal-case font-normal">(Karagdagang Ninong at Ninang)</span>
                </label>
                
                {sponsorsList.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {sponsorsList.map((sponsor, index) => (
                      <div 
                        key={index} 
                        className="flex items-center gap-2 bg-[#F6F5ED] border border-[#B59E74]/30 text-[#B59E74] px-3 py-1.5 rounded-full text-sm font-medium animate-fade-in"
                      >
                        <span>{sponsor}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSponsor(index)}
                          className="text-[#B59E74] hover:text-red-500 font-bold focus:outline-none"
                          title="Remove sponsor"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={sponsorInput}
                    onChange={(e) => setSponsorInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a name and hit Enter..."
                    className="flex-1 p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700"
                  />
                  <button
                    type="button"
                    onClick={handleAddSponsor}
                    disabled={!sponsorInput.trim()}
                    className="w-12 h-12 flex items-center justify-center bg-[#B59E74] hover:bg-[#9c8760] text-white rounded-lg font-bold text-2xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Add Sponsor"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* --- STATIC LIST OF REQUIREMENTS & GOOGLE DRIVE UPLOAD --- */}
            <div className="bg-[#B59E74]/10 p-6 sm:p-8 rounded-2xl border border-[#B59E74]/30 shadow-sm mt-8">
              <h3 className="text-sm md:text-base font-bold text-[#B59E74] uppercase tracking-widest mb-2 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Important Notice: Requirements
              </h3>
              <p className="text-sm text-gray-700 font-medium mb-4">
                Please ensure you secure the following original documents prior to your schedule:
              </p>
              
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 mb-8">
                <li className="flex items-start gap-2 text-sm text-gray-800 font-serif">
                  <span className="text-[#B59E74] mt-1 text-[10px]">■</span>
                  <span className="leading-snug">Certificate of Baptism</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-800 font-serif">
                  <span className="text-[#B59E74] mt-1 text-[10px]">■</span>
                  <span className="leading-snug">Attendance to Pre-Sacramental Seminar</span>
                </li>
              </ul>

              {/* UPLOAD / GOOGLE DRIVE REDIRECT BOX */}
              <div className="bg-white rounded-xl border-2 border-dashed border-[#B59E74]/50 p-6 flex flex-col items-center justify-center text-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-[#B59E74] mb-3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                </svg>
                <h4 className="text-sm font-bold text-gray-800 uppercase tracking-widest mb-1">Submit Your Documents</h4>
                <p className="text-xs text-gray-500 mb-4 max-w-md">
                  Please compile your scanned requirements and upload them to our secure Parish Google Drive folder.
                </p>
                <a
                  href="https://drive.google.com/drive/folders/1PKKeMdangpbldxLCOCi5AvA8rjDA9rvT?usp=sharing" 
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
              declaration="I declare that the information provided above is true and correct, and I respectfully request the Sacrament of Confirmation for the candidate named above."
              consent={formData.declaration_consent}
              signature={formData.submitter_signature}
              onChange={handleChange}
            />

            {/* Submit */}
            <div className="pt-2 pb-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#B59E74] hover:bg-[#9c8760] text-white font-bold text-lg py-4 rounded-xl transition-colors shadow-md disabled:opacity-70 disabled:cursor-not-allowed uppercase tracking-widest"
              >
                {loading ? "Submitting..." : "Submit Registration"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default ConfirmationFormModal;