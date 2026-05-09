import { useState } from "react";
import { restInsert } from "../../supabaseRest";
import { useAuth } from "../../contexts/useAuth";
import { sendRequestEmail } from "../../emailNotifications";
import SignInPrompt from "../SignInPrompt";
import { DeclarationBlock, SuccessPanel, submitRequest } from "./formHelpers";

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

function WeddingRegistryFormModal({ onClose }) {
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    groom_first_name: "",
    groom_middle_name: "",
    groom_surname: "",
    groom_address: "",
    groom_age: "",
    groom_contact: "",
    bride_first_name: "",
    bride_middle_name: "",
    bride_surname: "",
    bride_address: "",
    bride_age: "",
    bride_contact: "",
    wedding_date: "",
    wedding_time: "",
    reservation_fee: "",
    official_receipt_no: "",
    reservation_date: "",
    submitter_signature: "",
    declaration_consent: false,
  });

  // requirements state: { item: { groom: bool, bride: bool } }
  const [requirements, setRequirements] = useState(
    Object.fromEntries(
      REQUIREMENT_ITEMS.map((it) => [it, { groom: false, bride: false }])
    )
  );

  if (!user) return <SignInPrompt onClose={onClose} serviceName="a wedding" />;

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const toggleRequirement = (item, person) =>
    setRequirements((prev) => ({
      ...prev,
      [item]: { ...prev[item], [person]: !prev[item][person] },
    }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!formData.declaration_consent) {
      setError("Please confirm the declaration before submitting.");
      return;
    }
    setLoading(true);
    try {
      const groomReqsCompleted = REQUIREMENT_ITEMS.filter((it) => requirements[it].groom).join("; ");
      const brideReqsCompleted = REQUIREMENT_ITEMS.filter((it) => requirements[it].bride).join("; ");

      await submitRequest({
        table: "weddings",
        payload: {
          ...formData,
          requirements_groom: groomReqsCompleted,
          requirements_bride: brideReqsCompleted,
        },
        user,
        serviceName: "wedding",
        summary: `Wedding registration for ${formData.groom_first_name} ${formData.groom_surname} & ${formData.bride_first_name} ${formData.bride_surname}.`,
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
                    <input type="text" name="groom_surname" value={formData.groom_surname} onChange={handleChange} required className={inputClass} placeholder="Surname" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  <div className="flex flex-col gap-1 md:col-span-6">
                    <label className="text-xs font-bold text-gray-600">Address <span className="text-[11px] text-gray-400 normal-case font-normal">(Tirahan)</span></label>
                    <input type="text" name="groom_address" value={formData.groom_address} onChange={handleChange} className={inputClass} placeholder="Complete Address" />
                  </div>
                  <div className="flex flex-col gap-1 md:col-span-2">
                    <label className="text-xs font-bold text-gray-600">Current Age <span className="text-[11px] text-gray-400 normal-case font-normal">(Kasalukuyang Edad)</span></label>
                    <input type="number" name="groom_age" value={formData.groom_age} onChange={handleChange} className={inputClass} />
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
                    <input type="text" name="bride_surname" value={formData.bride_surname} onChange={handleChange} required className={inputClass} placeholder="Surname" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  <div className="flex flex-col gap-1 md:col-span-6">
                    <label className="text-xs font-bold text-gray-600">Address <span className="text-[11px] text-gray-400 normal-case font-normal">(Tirahan)</span></label>
                    <input type="text" name="bride_address" value={formData.bride_address} onChange={handleChange} className={inputClass} placeholder="Complete Address" />
                  </div>
                  <div className="flex flex-col gap-1 md:col-span-2">
                    <label className="text-xs font-bold text-gray-600">Current Age <span className="text-[11px] text-gray-400 normal-case font-normal">(Kasalukuyang Edad)</span></label>
                    <input type="number" name="bride_age" value={formData.bride_age} onChange={handleChange} className={inputClass} />
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600">Date of Wedding <span className="text-[11px] text-gray-400 normal-case font-normal">(Petsa ng Kasal)</span></label>
                  <input type="date" name="wedding_date" value={formData.wedding_date} onChange={handleChange} required className={inputClass} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600">Time of Wedding <span className="text-[11px] text-gray-400 normal-case font-normal">(Oras ng Kasal)</span></label>
                  <input type="time" name="wedding_time" value={formData.wedding_time} onChange={handleChange} className={inputClass} />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600">Reservation Fee <span className="text-[11px] text-gray-400 normal-case font-normal">(Non-refundable)</span></label>
                  <input type="text" name="reservation_fee" value={formData.reservation_fee} onChange={handleChange} className={`${inputClass} bg-gray-50`} placeholder="₱" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-600">Official Receipt No.</label>
                    <input type="text" name="official_receipt_no" value={formData.official_receipt_no} onChange={handleChange} className={`${inputClass} bg-gray-50`} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-600">Date of Reservation</label>
                    <input type="date" name="reservation_date" value={formData.reservation_date} onChange={handleChange} className={`${inputClass} bg-gray-50`} />
                  </div>
                </div>
              </div>
            </div>

            {/* CHECKLIST */}
            <div className="bg-[#B59E74]/10 p-6 rounded-xl border border-[#B59E74]/30 shadow-sm mt-8">
              <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Checklist of Requirements
              </h3>

              <div className="flex items-center gap-4 text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 px-2">
                <div className="w-12 text-center">Groom</div>
                <div className="w-12 text-center">Bride</div>
                <div className="flex-1 ml-4">Requirement</div>
              </div>

              <div className="flex flex-col gap-2 text-sm text-gray-700 font-serif">
                {REQUIREMENT_ITEMS.map((item) => (
                  <div key={item} className="flex items-center gap-4 hover:bg-white/50 p-2 rounded-lg transition-colors">
                    <div className="w-12 flex justify-center">
                      <input
                        type="checkbox"
                        checked={requirements[item].groom}
                        onChange={() => toggleRequirement(item, "groom")}
                        className="w-5 h-5 text-[#B59E74] focus:ring-[#B59E74] border-gray-400 rounded cursor-pointer"
                      />
                    </div>
                    <div className="w-12 flex justify-center">
                      <input
                        type="checkbox"
                        checked={requirements[item].bride}
                        onChange={() => toggleRequirement(item, "bride")}
                        className="w-5 h-5 text-[#B59E74] focus:ring-[#B59E74] border-gray-400 rounded cursor-pointer"
                      />
                    </div>
                    <span className="flex-1 ml-4">{item}</span>
                  </div>
                ))}
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
              <button type="submit" disabled={loading} className="w-full bg-[#B59E74] hover:bg-[#9c8760] text-white font-bold text-lg py-4 rounded-xl transition-colors shadow-md disabled:opacity-70 disabled:cursor-not-allowed">
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
