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

function HolyCommunionFormModal({ onClose, guestInfo = null, onGuest }) {
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  // State to hold the dynamic list of priests
  const [priests, setPriests] = useState([]);

  const [formData, setFormData] = useState({
    date_of_communion: "",
    time_of_communion: "",
    preferred_priest: "",
    child_first_name: "",
    child_middle_name: "",
    child_surname: "",
    date_of_birth: "",
    place_of_birth: "",
    gender: "",
    date_of_baptism: "",
    baptism_parish: "",
    father_first_name: "",
    father_middle_name: "",
    father_last_name: "",
    mother_maiden_first: "",
    mother_maiden_middle: "",
    mother_maiden_last: "",
    other_guardian_info: "",
    complete_address: "",
    residence_parish: "",
    contact_number_1: "",
    contact_number_2: "",
    other_requirements: "",
    submitter_signature: "",
    declaration_consent: false,
    documentPaths: [], // ✨ NEW: State to hold the uploaded file paths
  });

  // Fetch priests when the modal opens
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
      contact_number_1:    prev.contact_number_1    || autofill.contactNumber,
      submitter_signature: prev.submitter_signature || autofill.fullName,
    }));
  }, [autofill, guestInfo]);

  useEffect(() => {
    if (!guestInfo) return;
    const fullName = `${guestInfo.firstName} ${guestInfo.lastName}`.trim();
    setFormData(prev => ({
      ...prev,
      contact_number_1:    prev.contact_number_1    || guestInfo.contactNumber,
      submitter_signature: prev.submitter_signature || fullName,
    }));
  }, [guestInfo]);

  if (!user && !guestInfo) return <SignInPrompt onClose={onClose} serviceName="holy communion" onGuest={onGuest} />;

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === "checkbox" ? checked : applyFieldFilter(name, value) }));
  };

  // ✨ NEW: Handles receiving the uploaded file paths from DocumentUploader
  const handleUploadComplete = (uploadedFiles) => {
    const paths = uploadedFiles.map(file => file.path);
    setFormData(prev => ({ ...prev, documentPaths: paths }));
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
      const fatherFull = [formData.father_first_name, formData.father_middle_name, formData.father_last_name].filter(Boolean).join(" ");
      const motherFull = [formData.mother_maiden_first, formData.mother_maiden_middle, formData.mother_maiden_last].filter(Boolean).join(" ");
      const safePayload = {
        date_of_communion:  formData.date_of_communion,
        time_of_communion:  formData.time_of_communion,
        preferred_priest:   formData.preferred_priest || null,
        child_first_name:   formData.child_first_name,
        child_middle_name:  formData.child_middle_name,
        child_surname:      formData.child_surname,
        date_of_birth:      formData.date_of_birth,
        place_of_birth:     formData.place_of_birth,
        gender:             formData.gender,
        date_of_baptism:    formData.date_of_baptism,
        baptism_parish:     formData.baptism_parish,
        father_name:        fatherFull,
        mother_maiden_name: motherFull,
        complete_address:   formData.complete_address,
        residence_parish:   formData.residence_parish,
        // ✨ Add documentPaths to the payload
        attached_documents: formData.documentPaths.length > 0 ? formData.documentPaths : null,
      };
      await submitRequest({
        table: "holy_communions",
        payload: safePayload,
        user,
        guestInfo,
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

  const inputClass = "p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700 w-full";

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

            {/* TOP DETAILS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-bold text-gray-600">Date of Holy Communion: <span className="text-[11px] text-gray-400 normal-case font-normal">(Petsa ng Unang Pakikinabang)</span></label>
                <input type="date" name="date_of_communion" value={formData.date_of_communion} onChange={handleChange} required min={new Date().toISOString().split("T")[0]} className={inputClass} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-bold text-gray-600">Time: <span className="text-[11px] text-gray-400 normal-case font-normal">(Oras)</span></label>
                <select name="time_of_communion" value={formData.time_of_communion} onChange={handleChange} required className={inputClass}>
                  <option value="" disabled>Select Time</option>
                  {TIME_SLOTS.map((slot) => (
                    <option key={slot.value} value={slot.value}>{slot.label}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex flex-col gap-1">
                <label className="text-sm font-bold text-gray-600">Preferred Priest (Optional): <span className="text-[11px] text-gray-400 normal-case font-normal">(Nais na Pari - Opsyonal)</span></label>
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
            </div>

            <p className="text-xs text-gray-500 italic leading-relaxed text-center max-w-2xl mx-auto border-t pt-4 border-gray-200">
              Instructions: Answer all the blanks accordingly using ALL CAPS. Please write legibly. Copy necessary details as it is written in the Certificate of Live Birth of the one to receive Holy Communion.
              <br />
              <span className="text-[11px] text-gray-400">
                Panuto: Sagutan ang mga blanko ng tama sa pamamagitan ng pagsusulat gamit ang MALALAKING LETRA. Sumulat ng maayos. Kopyahin ang mga detalye nang ayon sa nakasulat sa Certificate of Live Birth ng makakatanggap ng Unang Pakikinabang.
              </span>
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
              </div>
            </div>

            {/* 2. Baptismal Details */}
            <div>
              <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest border-b border-[#B59E74]/30 pb-2 mb-4">Baptismal Details <span className="text-[11px] text-gray-400 normal-case">(Mga Detalye ng Binyag)</span></h3>
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
              <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest border-b border-[#B59E74]/30 pb-2 mb-4">Parents & Guardian Information <span className="text-[11px] text-gray-400 normal-case">(Impormasyon ng Magulang/Tagapag-alaga)</span></h3>
              <div className="grid grid-cols-1 gap-6">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600">Father's Full Name <span className="text-[11px] text-gray-400 normal-case font-normal">(Pangalan ng Ama)</span></label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input type="text" name="father_first_name" value={formData.father_first_name} onChange={handleChange} className={inputClass} placeholder="First Name" required />
                    <input type="text" name="father_middle_name" value={formData.father_middle_name} onChange={handleChange} className={inputClass} placeholder="Middle Name" />
                    <input type="text" name="father_last_name" value={formData.father_last_name} onChange={handleChange} className={inputClass} placeholder="Surname" required />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600">Mother's Full Maiden Name <span className="text-[11px] text-gray-400 normal-case font-normal">(Pangalan ng Ina sa Pagkadalaga)</span></label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input type="text" name="mother_maiden_first" value={formData.mother_maiden_first} onChange={handleChange} className={inputClass} placeholder="First Name" required />
                    <input type="text" name="mother_maiden_middle" value={formData.mother_maiden_middle} onChange={handleChange} className={inputClass} placeholder="Middle Name" />
                    <input type="text" name="mother_maiden_last" value={formData.mother_maiden_last} onChange={handleChange} className={inputClass} placeholder="Surname" required />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600">Other Guardian Information <span className="text-[11px] text-gray-400 normal-case font-normal">(Iba pang Tagapag-alaga - kung naaangkop)</span></label>
                  <input type="text" name="other_guardian_info" value={formData.other_guardian_info} onChange={handleChange} className={inputClass} placeholder="If applicable" />
                </div>
              </div>
            </div>

            {/* 4. Address & Contact */}
            <div>
              <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest border-b border-[#B59E74]/30 pb-2 mb-4">Address & Contact <span className="text-[11px] text-gray-400 normal-case">(Tirahan at Pakikipag-ugnayan)</span></h3>
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
                    <input type="tel" name="contact_number_1" value={formData.contact_number_1} onChange={handleChange} maxLength={11} className={inputClass} placeholder="Primary Contact Number" />
                    <input type="tel" name="contact_number_2" value={formData.contact_number_2} onChange={handleChange} maxLength={11} className={inputClass} placeholder="Secondary Contact Number" />
                  </div>
                </div>
              </div>
            </div>

            {/* ✨ THE MAGIC: Replaced Google Drive Link with DocumentUploader */}
            <div className="mt-6 flex-grow flex flex-col justify-end">
              <DocumentUploader 
                folderPath="holy_communions" 
                onUploadComplete={handleUploadComplete} 
              />
            </div>

            {/* Declaration & Signature */}
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