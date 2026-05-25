import { useState, useEffect } from "react";
import { restInsert, restSelect } from "../../supabaseRest";
import { useAuth } from "../../contexts/useAuth";
import { sendRequestEmail } from "../../emailNotifications";
import SignInPrompt from "../SignInPrompt";
import { DeclarationBlock, SuccessPanel, submitRequest, useProfileAutofill } from "./formHelpers";

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

const REQUIREMENT_ITEMS = [
  "Certificate of Live Birth (from the Philippine Statistics Authority)",
  "Baptismal Certificate",
  "Confirmation Certificate",
  "Certificate of No Marriage (CENOMAR) (from the Philippine Statistics Authority)",
  "Marriage Banns",
  "Marriage License or Affidavit of Cohabitation",
  "Canonical Interview",
  "Pre-Cana Seminar",
  "Marriage Counseling",
  "Confession",
];

function WeddingRegistryFormModal({ onClose, guestInfo = null, onGuest }) {
  const { user } = useAuth(); 

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const [priests, setPriests] = useState([]);

  const [formData, setFormData] = useState({
    groom_first_name: "",
    groom_middle_name: "",
    groom_last_name: "",
    groom_address: "",
    groom_age: "",
    groom_contact: "",
    bride_first_name: "",
    bride_middle_name: "",
    bride_last_name: "",
    bride_address: "",
    bride_age: "",
    bride_contact: "",
    wedding_date: "",
    wedding_time: "",
    preferred_priest: "", 
    reservation_fee: "",
    official_receipt_no: "",
    reservation_date: "",
    submitter_signature: "",
    declaration_consent: false,
  });

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
      groom_contact:       prev.groom_contact       || autofill.contactNumber,
      submitter_signature: prev.submitter_signature || autofill.fullName,
    }));
  }, [autofill, guestInfo]);

  useEffect(() => {
    if (!guestInfo) return;
    const fullName = `${guestInfo.firstName} ${guestInfo.lastName}`.trim();
    setFormData(prev => ({
      ...prev,
      groom_contact:       prev.groom_contact       || guestInfo.contactNumber,
      submitter_signature: prev.submitter_signature || fullName,
    }));
  }, [guestInfo]);

  if (!user && !guestInfo) return <SignInPrompt onClose={onClose} serviceName="a wedding" onGuest={onGuest} />;

  const handleChange = (e) => {
  const { name, type, checked, value } = e.target;
  
  // ✨ This checks if the input name is one of your contact fields
  if (name === "groom_contact" || name === "bride_contact") {
    // The regex /\D/g matches ANY character that is NOT a digit (0-9)
    // and replaces it with an empty string.
    const numbersOnly = value.replace(/\D/g, "");
    setFormData((prev) => ({ ...prev, [name]: numbersOnly }));
    return; // Exit the function early so the letter isn't saved
  }
  
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
        table: "weddings",
        payload: {
          ...formData,
          preferred_date: formData.wedding_date,
          preferred_priest: formData.preferred_priest || null,
        },
        user,
        guestInfo,
        serviceName: "wedding",
        summary: `Wedding registration for ${formData.groom_first_name} ${formData.groom_last_name} & ${formData.bride_first_name} ${formData.bride_last_name}.`,
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
      <div className="bg-[#F6F5ED] w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl relative scrollbar-hidden">
        {/* Header */}
        <div className="sticky top-0 bg-[#F6F5ED] px-8 py-6 z-10 flex justify-between items-center border-b border-gray-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center border-2 border-[#B59E74] text-xl font-medium text-[#B59E74] shrink-0">⛪</div>
            <div>
              <h2 className="text-xl md:text-2xl font-sans font-medium text-gray-800 uppercase tracking-wide">
                Basilica Minore de <span className="font-serif">San Pedro Bautista</span>
              </h2>
              <h1 className="text-2xl md:text-3xl text-[#B59E74] font-serif font-medium mt-1 uppercase">
                Registration Form for Weddings
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

            <p className="text-xs text-gray-500 italic leading-relaxed text-center max-w-3xl mx-auto border-b pb-6 border-gray-200">
              Instructions: Answer all the blanks accordingly using ALL CAPS. Please write legibly. Copy necessary details as it is written in the Certificate of Live Birth of those to be married.
              <br />
              <span className="text-[11px] text-gray-400">
                Panuto: Sagutan ang mga blanko ng tama sa pamamagitan ng pagsusulat gamit ang MALALAKING LETRA. Sumulat ng maayos. Kopyahin ang mga detalye nang ayon sa nakasulat sa Certificate of Live Birth ng ikakasal.
              </span>
            </p>

            {/* GROOM */}
            <div>
              <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest border-b border-[#B59E74]/30 pb-2 mb-4">
                Groom's Information <span className="text-[11px] text-gray-400 normal-case">(Impormasyon ng Lalaking Ikakasal)</span>
              </h3>
              <div className="grid grid-cols-1 gap-6">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600">Name of Groom <span className="text-[11px] text-gray-400 normal-case font-normal">(Pangalan ng Lalaking Ikakasal)</span></label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input type="text" name="groom_first_name" value={formData.groom_first_name} onChange={handleChange} required className={inputClass} placeholder="First Name" />
                    <input type="text" name="groom_middle_name" value={formData.groom_middle_name} onChange={handleChange} className={inputClass} placeholder="Middle Name" />
                    <input type="text" name="groom_last_name" value={formData.groom_last_name} onChange={handleChange} required className={inputClass} placeholder="Surname" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  <div className="flex flex-col gap-1 md:col-span-6">
                    <label className="text-xs font-bold text-gray-600">Address <span className="text-[11px] text-gray-400 normal-case font-normal">(Tirahan)</span></label>
                    <input type="text" name="groom_address" value={formData.groom_address} onChange={handleChange} className={inputClass} placeholder="Complete Address" />
                  </div>
                  <div className="flex flex-col gap-1 md:col-span-4">
                    <label className="text-xs font-bold text-gray-600">Contact Nos.</label>
                    <input type="tel" name="groom_contact" value={formData.groom_contact} onChange={handleChange} className={inputClass} placeholder="Phone Number/s" />
                  </div>
                </div>
              </div>
            </div>

            {/* BRIDE */}
            <div>
              <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest border-b border-[#B59E74]/30 pb-2 mb-4 mt-8">
                Bride's Information <span className="text-[11px] text-gray-400 normal-case">(Impormasyon ng Babaeng Ikakasal)</span>
              </h3>
              <div className="grid grid-cols-1 gap-6">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600">Name of Bride <span className="text-[11px] text-gray-400 normal-case font-normal">(Pangalan ng Babaeng Ikakasal)</span></label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input type="text" name="bride_first_name" value={formData.bride_first_name} onChange={handleChange} required className={inputClass} placeholder="First Name" />
                    <input type="text" name="bride_middle_name" value={formData.bride_middle_name} onChange={handleChange} className={inputClass} placeholder="Middle Name" />
                    <input type="text" name="bride_last_name" value={formData.bride_last_name} onChange={handleChange} required className={inputClass} placeholder="Surname" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  <div className="flex flex-col gap-1 md:col-span-6">
                    <label className="text-xs font-bold text-gray-600">Address <span className="text-[11px] text-gray-400 normal-case font-normal">(Tirahan)</span></label>
                    <input type="text" name="bride_address" value={formData.bride_address} onChange={handleChange} className={inputClass} placeholder="Complete Address" />
                  </div>
                  <div className="flex flex-col gap-1 md:col-span-4">
                    <label className="text-xs font-bold text-gray-600">Contact Nos.</label>
                    <input type="tel" name="bride_contact" value={formData.bride_contact} onChange={handleChange} className={inputClass} placeholder="Phone Number/s" />
                  </div>
                </div>
              </div>
            </div>

            {/* WEDDING DETAILS */}
            <div>
              <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest border-b border-[#B59E74]/30 pb-2 mb-4 mt-8">Wedding & Reservation Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600">Date of Wedding <span className="text-[11px] text-gray-400 normal-case font-normal">(Petsa ng Kasal)</span></label>
                  <input type="date" name="wedding_date" value={formData.wedding_date} onChange={handleChange} required min={new Date().toISOString().split("T")[0]} className={inputClass} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600">Time of Wedding <span className="text-[11px] text-gray-400 normal-case font-normal">(Oras ng Kasal)</span></label>
                  <select name="wedding_time" value={formData.wedding_time} onChange={handleChange} required className={inputClass}>
                    <option value="" disabled>Select Time</option>
                    {TIME_SLOTS.map((slot) => (
                      <option key={slot.value} value={slot.value}>{slot.label}</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600">Preferred Priest (Optional)</label>
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

                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="text-xs font-bold text-gray-600">Reservation Fee <span className="text-[11px] text-gray-400 normal-case font-normal">(Non-refundable)</span></label>
                  <input type="text" name="reservation_fee" value={formData.reservation_fee} onChange={handleChange} className={`${inputClass} bg-gray-50`} placeholder="₱" />
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-600">Date of Reservation</label>
                    <input type="date" name="reservation_date" value={formData.reservation_date} onChange={handleChange} min={new Date().toISOString().split("T")[0]} className={`${inputClass} bg-gray-50`} />
                  </div>
                </div>
              </div>
            </div>

            {/* STATIC LIST OF REQUIREMENTS & GOOGLE DRIVE UPLOAD */}
            <div className="bg-[#B59E74]/10 p-6 sm:p-8 rounded-2xl border border-[#B59E74]/30 shadow-sm mt-8">
              <h3 className="text-sm md:text-base font-bold text-[#B59E74] uppercase tracking-widest mb-2 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Important Notice: Requirements
              </h3>
              <p className="text-sm text-gray-700 font-medium mb-4">
                Please ensure you secure the following original documents prior to your canonical interview:
              </p>
              
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 mb-8">
                {REQUIREMENT_ITEMS.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-800 font-serif">
                    <span className="text-[#B59E74] mt-1 text-[10px]">■</span>
                    <span className="leading-snug">{item}</span>
                  </li>
                ))}
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
                  href="https://drive.google.com/drive/folders/1sgLzZdi71vo1uYSYjZNaOOcIUVYkVat4?usp=sharing" 
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
              declaration="We declare that the information provided above is true and correct, and we respectfully request the Sacrament of Holy Matrimony as detailed above."
              consent={formData.declaration_consent}
              signature={formData.submitter_signature}
              onChange={handleChange}
            />

            <div className="pt-2 pb-4">
              <button type="submit" disabled={loading} className="w-full bg-[#B59E74] hover:bg-[#9c8760] text-white font-bold text-lg py-4 rounded-xl transition-colors shadow-md disabled:opacity-70 disabled:cursor-not-allowed uppercase tracking-widest">
                {loading ? "Submitting..." : "Submit Wedding Registration"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default WeddingRegistryFormModal;