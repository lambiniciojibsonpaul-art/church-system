import { useState } from "react";
import { restInsert } from "../../supabaseRest";
import { useAuth } from "../../contexts/useAuth";
import { sendRequestEmail } from "../../emailNotifications";
import SignInPrompt from "../SignInPrompt";
import { DeclarationBlock, SuccessPanel } from "./formHelpers";

function BaptismFormModal({ onClose }) {
  // All hooks declared up-front (Rules of Hooks). The auth gate happens
  // *after* the hook section to keep call order consistent across renders.
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  
  // State for the dynamic sponsor input box
  const [sponsorInput, setSponsorInput] = useState("");

  const [formData, setFormData] = useState({
    baptismType: "Sunday",
    preferredDate: "",
    childFirstName: "",
    childMiddleName: "",
    childLastName: "",
    childDob: "",
    childBirthplace: "",
    childGender: "",
    fatherName: "",
    motherMaidenName: "",
    address: "",
    contactNumbers: "",
    parentsMarriageStatus: "Married in Church",
    godfatherName: "",
    godmotherName: "",
    additionalSponsors: "",
    submitterName: "",
    submitter_signature: "",
    declaration_consent: false,
  });

  // Guest visitors must sign in/register before submitting a request.
  if (!user) {
    return <SignInPrompt onClose={onClose} serviceName="a baptism" />;
  }

  // Helper to handle input changes (handles checkboxes too).
  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    setFormData({ ...formData, [name]: type === "checkbox" ? checked : value });
  };

  // --- DYNAMIC SPONSOR LIST LOGIC ---
  const sponsorsList = formData.additionalSponsors 
    ? formData.additionalSponsors.split(",").map(s => s.trim()).filter(Boolean) 
    : [];

  const handleAddSponsor = (e) => {
    e?.preventDefault();
    if (!sponsorInput.trim()) return;

    const newList = [...sponsorsList, sponsorInput.trim()];
    
    handleChange({
      target: { name: "additionalSponsors", value: newList.join(", ") }
    });
    
    setSponsorInput("");
  };

  const handleRemoveSponsor = (indexToRemove) => {
    const newList = sponsorsList.filter((_, index) => index !== indexToRemove);
    handleChange({
      target: { name: "additionalSponsors", value: newList.join(", ") }
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
      const payload = {
        baptism_type: formData.baptismType,
        preferred_date: formData.preferredDate,
        child_first_name: formData.childFirstName,
        child_middle_name: formData.childMiddleName,
        child_last_name: formData.childLastName,
        child_dob: formData.childDob,
        child_birthplace: formData.childBirthplace,
        child_gender: formData.childGender,
        father_name: formData.fatherName,
        mother_maiden_name: formData.motherMaidenName,
        address: formData.address,
        contact_numbers: formData.contactNumbers,
        parents_marriage_status: formData.parentsMarriageStatus,
        godfather_name: formData.godfatherName,
        godmother_name: formData.godmotherName,
        additional_sponsors: formData.additionalSponsors,
        submitter_name: formData.submitter_signature,
        user_id: user.id,
        submitter_email: user.email || null,
        submitter_phone: user.user_metadata?.contact_number || user.phone || null,
      };

      const first = await restInsert("baptisms", [payload]);

      if (first.error) {
        console.warn(
          "[Baptism] first insert attempt failed — retrying without optional metadata columns:",
          first.error
        );
        const fallbackPayload = { ...payload };
        delete fallbackPayload.user_id;
        delete fallbackPayload.submitter_email;
        delete fallbackPayload.submitter_phone;

        const retry = await restInsert("baptisms", [fallbackPayload]);
        if (retry.error) {
          console.error("[Baptism] retry also failed:", retry.error);
          throw new Error(retry.error.message);
        }
      }

      setSuccess(true);

      const childName = [
        formData.childFirstName,
        formData.childLastName,
      ].filter(Boolean).join(" ").trim();
      
      sendRequestEmail({
        to: user.email,
        serviceName: "baptism",
        summary: childName
          ? `Baptism request for ${childName} on ${formData.preferredDate || "(date pending)"}.`
          : undefined,
      });

      // Close modal after 2.5 seconds showing success
      setTimeout(() => {
        onClose();
      }, 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 h-screen w-screen">
      <div className="bg-[#F6F5ED] w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl relative scrollbar-hidden">
        {/* Header */}
        <div className="sticky top-0 bg-[#F6F5ED] px-8 py-6 z-10 flex justify-between items-center border-b border-gray-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center border-2 border-[#B59E74] text-xl font-medium text-[#B59E74] shrink-0">
              ⛪
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-sans font-medium text-gray-800 uppercase tracking-wide">
                Basilica Minore de{" "}
                <span className="font-serif">San Pedro Bautista</span>
              </h2>
              <h1 className="text-2xl md:text-3xl text-[#B59E74] font-serif font-medium mt-1 uppercase">
                Baptism Registration Form
              </h1>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-600 shrink-0"
          >
            ✕
          </button>
        </div>

        {success ? (
          <SuccessPanel />
        ) : (
          <form onSubmit={handleSubmit} className="p-8 space-y-10">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200 text-sm font-bold">
                Error: {error}
              </div>
            )}

            {/* 1. Schedule Selection */}
            <div>
              <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest border-b border-[#B59E74]/30 pb-2 mb-4">
                Baptism Schedule
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600">
                    Type of Baptism *
                  </label>
                  <select
                    name="baptismType"
                    value={formData.baptismType}
                    onChange={handleChange}
                    required
                    className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700"
                  >
                    <option value="Sunday">
                      Sunday Baptism
                    </option>
                    <option value="Solo">
                      Solo/Individual
                    </option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600">
                    Preferred Date *
                  </label>
                  <input
                    type="date"
                    name="preferredDate"
                    value={formData.preferredDate}
                    onChange={handleChange}
                    required
                    className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700"
                  />
                </div>
              </div>
            </div>

            {/* 2. Child's Info */}
            <div>
              <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest border-b border-[#B59E74]/30 pb-2 mb-4">
                Child's Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="text-xs font-bold text-gray-600">
                    Full Name of Child *
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input
                      type="text"
                      name="childFirstName"
                      value={formData.childFirstName}
                      onChange={handleChange}
                      required
                      placeholder="First Name"
                      className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700"
                    />
                    <input
                      type="text"
                      name="childMiddleName"
                      value={formData.childMiddleName}
                      onChange={handleChange}
                      placeholder="Middle Name"
                      className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700"
                    />
                    <input
                      type="text"
                      name="childLastName"
                      value={formData.childLastName}
                      onChange={handleChange}
                      required
                      placeholder="Last Name"
                      className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600">
                    Date of Birth *
                  </label>
                  <input
                    type="date"
                    name="childDob"
                    value={formData.childDob}
                    onChange={handleChange}
                    required
                    className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600">
                    Place of Birth (City/Province) *
                  </label>
                  <input
                    type="text"
                    name="childBirthplace"
                    value={formData.childBirthplace}
                    onChange={handleChange}
                    required
                    className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700"
                  />
                </div>
                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="text-xs font-bold text-gray-600">
                    Gender *
                  </label>
                  <div className="flex items-center gap-6 mt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                      <input
                        type="radio"
                        name="childGender"
                        value="Male"
                        checked={formData.childGender === "Male"}
                        onChange={handleChange}
                        required
                        className="w-4 h-4 text-[#B59E74] focus:ring-[#B59E74]"
                      />{" "}
                      Male
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                      <input
                        type="radio"
                        name="childGender"
                        value="Female"
                        checked={formData.childGender === "Female"}
                        onChange={handleChange}
                        className="w-4 h-4 text-[#B59E74] focus:ring-[#B59E74]"
                      />{" "}
                      Female
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Parents' Info */}
            <div>
              <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest border-b border-[#B59E74]/30 pb-2 mb-4">
                Parents' Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="text-xs font-bold text-gray-600">
                    Father's Full Name *
                  </label>
                  <input
                    type="text"
                    name="fatherName"
                    value={formData.fatherName}
                    onChange={handleChange}
                    required
                    placeholder="First, Middle, Last Name"
                    className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700"
                  />
                </div>
                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="text-xs font-bold text-gray-600">
                    Mother's Full Maiden Name *
                  </label>
                  <input
                    type="text"
                    name="motherMaidenName"
                    value={formData.motherMaidenName}
                    onChange={handleChange}
                    required
                    placeholder="First, Middle, Last Maiden Name"
                    className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700"
                  />
                </div>
                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="text-xs font-bold text-gray-600">
                    Complete Address *
                  </label>
                  <textarea
                    rows="2"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    required
                    placeholder="Street Address, City, Zip Code"
                    className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700 resize-none"
                  ></textarea>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600">
                    Contact Numbers *
                  </label>
                  <input
                    type="tel"
                    name="contactNumbers"
                    value={formData.contactNumbers}
                    onChange={handleChange}
                    required
                    placeholder="Primary phone number"
                    className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600">
                    Parents' Marriage Status *
                  </label>
                  <select
                    name="parentsMarriageStatus"
                    value={formData.parentsMarriageStatus}
                    onChange={handleChange}
                    required
                    className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700"
                  >
                    <option value="Married in Church">Married in Church</option>
                    <option value="Civil Marriage">Civil Marriage</option>
                    <option value="Not Married">Not Married</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 4. Godparents Info */}
            <div>
              <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest border-b border-[#B59E74]/30 pb-2 mb-4">
                Sponsors / Godparents
              </h3>
              <p className="text-xs text-gray-500 italic mb-4">
                Note: 1 pair of sponsors is included in the base fee. Additional
                sponsors are Php 50.00 per head.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                <div className="flex flex-col gap-2 p-4 bg-white border border-gray-200 rounded-xl">
                  <label className="text-xs font-bold text-[#B59E74]">
                    Primary Godfather (Ninong) *
                  </label>
                  <input
                    type="text"
                    name="godfatherName"
                    value={formData.godfatherName}
                    onChange={handleChange}
                    required
                    placeholder="Full Name"
                    className="p-2 border-b border-gray-300 focus:outline-none focus:border-[#B59E74] bg-transparent text-gray-700 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-2 p-4 bg-white border border-gray-200 rounded-xl">
                  <label className="text-xs font-bold text-[#B59E74]">
                    Primary Godmother (Ninang) *
                  </label>
                  <input
                    type="text"
                    name="godmotherName"
                    value={formData.godmotherName}
                    onChange={handleChange}
                    required
                    placeholder="Full Name"
                    className="p-2 border-b border-gray-300 focus:outline-none focus:border-[#B59E74] bg-transparent text-gray-700 text-sm"
                  />
                </div>
              </div>
              
              {/* --- DYNAMIC SPONSOR INPUT --- */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-600">
                  Additional Sponsors
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

            <hr className="border-gray-200" />

            {/* --- MOVED: IMPORTANT GUIDELINES & FEES PANEL --- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              
              {/* Requirements & Upload */}
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col h-full">
                <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest mb-4 flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Requirements for Baptism
                </h3>
                <ul className="flex flex-col gap-2 text-sm text-gray-600 font-serif">
                  <li>
                    <strong>1. Birth Certificate</strong> with Registry No.
                    (from City Hall or PSA). Present original and submit
                    photocopy.
                  </li>
                  <li>
                    <strong>2. Marriage Certificate of Parents</strong> (If
                    married). Present original and submit photocopy.
                  </li>
                  <li>
                    <strong>3. Permit for Baptism</strong> (for
                    non-parishioners) from a parish near your residence.
                  </li>
                  <li>
                    <strong>4. Certificate of No Records</strong> (for 2 yrs old
                    & above) from 3 neighboring parishes.
                  </li>
                </ul>
                <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm font-bold text-center border border-red-100">
                  "NO SEMINAR, NO BAPTISM" <br />
                  <span className="text-xs font-normal">
                    Be on time: 30 minutes before schedule.
                  </span>
                </div>

                {/* GOOGLE DRIVE UPLOAD BOX */}
                <div className="mt-6 flex-grow flex flex-col justify-end">
                  <div className="bg-[#B59E74]/10 rounded-xl border-2 border-dashed border-[#B59E74]/50 p-6 flex flex-col items-center justify-center text-center h-full">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-[#B59E74] mb-3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                    </svg>
                    <h4 className="text-sm font-bold text-gray-800 uppercase tracking-widest mb-1">Submit Your Documents</h4>
                    <p className="text-xs text-gray-500 mb-4 max-w-xs">
                      Please compile your scanned requirements and upload them to our secure Parish Google Drive folder.
                    </p>
                    <a
                      href="YOUR_GOOGLE_DRIVE_LINK_HERE" 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-[#B59E74] hover:bg-[#9c8760] text-white px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors shadow-sm flex items-center gap-2"
                    >
                      <span>📁</span> Open Upload Folder
                    </a>
                  </div>
                </div>
              </div>

              {/* Schedule, Fees & Dress Code */}
              <div className="bg-[#B59E74]/10 p-6 rounded-xl border border-[#B59E74]/30 shadow-sm flex flex-col gap-4 h-full">
                <div>
                  <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest mb-2">
                    Schedule & Fees
                  </h3>
                  <ul className="text-sm text-gray-700 font-serif space-y-2">
                    <li>
                      <strong>A. Solo/Individual:</strong> Php 2,500.00
                      (Tue-Sat: 9:30am, 10:00am, 10:30am, 11:00am). Includes 1
                      pair of sponsors & certificate.
                    </li>
                    <li>
                      <strong>B. Sunday Baptism</strong>
                    </li>
                    <li className="text-xs italic text-gray-500 mt-1">
                      Add-ons: Extra sponsor Php 50.00/head | Baptismal Candle
                      Php 80.00/set
                    </li>
                  </ul>
                </div>
                <div className="border-t border-[#B59E74]/20 pt-4 mt-auto">
                  <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest mb-2">
                    Dress Code
                  </h3>
                  <ul className="text-sm text-gray-700 font-serif space-y-1">
                    <li>
                      <strong>Child:</strong> Baptismal gown/White dress (girls)
                      / White polo (boys) / White cloth.
                    </li>
                    <li>
                      <strong>Adults:</strong> Sunday Best. NO shorts, sandos,
                      sleeveless, spaghetti blouses, leggings, or slippers.
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* DECLARATION & SIGNATURE */}
            <DeclarationBlock
              declaration="I declare that the information provided above is true and correct, and I respectfully request the Sacrament of Baptism for the child named above. I also acknowledge the fees and dress code required."
              consent={formData.declaration_consent}
              signature={formData.submitter_signature}
              onChange={handleChange}
            />

            <div className="pt-2 pb-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#B59E74] hover:bg-[#9c8760] text-white font-bold text-lg py-4 rounded-xl transition-all shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
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

export default BaptismFormModal;