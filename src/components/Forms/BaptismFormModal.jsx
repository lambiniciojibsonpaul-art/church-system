import { useState, useEffect } from "react";
import { restInsert, restSelect } from "../../supabaseRest";
import { useAuth } from "../../contexts/useAuth";
import { sendRequestEmail } from "../../emailNotifications";
import { supabase } from "../../supabaseClient";
import DocumentUploader from "../DocumentUploader"; // ✨ Your new component
import SignInPrompt from "../SignInPrompt";
import { DeclarationBlock, SuccessPanel, useProfileAutofill, applyFieldFilter } from "./formHelpers";

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

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

async function submitGuestViaEdgeFunction(table, payload) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/submit-guest-form`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON}`,
      "apikey": SUPABASE_ANON,
    },
    body: JSON.stringify({ table, payload }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Edge function error (${res.status})`);
  return json;
}

function BaptismFormModal({ onClose, guestInfo = null, onGuest }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  
  const [priests, setPriests] = useState([]);
  const [sponsorInput, setSponsorInput] = useState("");

  const [formData, setFormData] = useState({
    baptismType: "Sunday",
    preferredDate: "",
    preferredTime: "",
    preferredEndTime: "",
    preferredPriest: "",
    childFirstName: "",
    childMiddleName: "",
    childLastName: "",
    childDob: "",
    childBirthplace: "",
    childGender: "",
    fatherFirstName: "",
    fatherMiddleName: "",
    fatherLastName: "",
    motherFirstName: "",
    motherMiddleName: "",
    motherMaidenLastName: "",
    address: "",
    contactNumbers: "",
    parentsMarriageStatus: "Married in Church",
    godfatherFirstName: "",
    godfatherMiddleName: "",
    godfatherLastName: "",
    godmotherFirstName: "",
    godmotherMiddleName: "",
    godmotherLastName: "",
    additionalSponsors: "",
    submitterName: "",
    submitter_signature: "",
    declaration_consent: false,
    documentPaths: [], // ✨ State to hold the uploaded file paths
  });

  const autofill = useProfileAutofill(user);

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

  useEffect(() => {
    if (!autofill || guestInfo) return;
    setFormData(prev => ({
      ...prev,
      submitterName:        prev.submitterName        || autofill.fullName,
      contactNumbers:       prev.contactNumbers       || autofill.contactNumber,
      submitter_signature:  prev.submitter_signature  || autofill.fullName,
    }));
  }, [autofill, guestInfo]);

  useEffect(() => {
    if (!guestInfo) return;
    const fullName = `${guestInfo.firstName} ${guestInfo.lastName}`.trim();
    setFormData(prev => ({
      ...prev,
      submitterName:       prev.submitterName       || fullName,
      contactNumbers:      prev.contactNumbers      || guestInfo.contactNumber,
      submitter_signature: prev.submitter_signature || fullName,
    }));
  }, [guestInfo]);

  if (!user && !guestInfo) {
    return <SignInPrompt onClose={onClose} serviceName="a baptism" onGuest={onGuest} />;
  }

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    if (type === "checkbox") {
      setFormData(prev => ({ ...prev, [name]: checked }));
      return;
    }
    // Letters-only filter for split name fields
    if (/FirstName$|MiddleName$|LastName$|MaidenLastName$/.test(name)) {
      setFormData(prev => ({ ...prev, [name]: value.replace(/[^a-zA-ZÀ-ÖØ-öø-ÿ\s'-]/g, "") }));
      return;
    }
    setFormData(prev => ({ ...prev, [name]: applyFieldFilter(name, value) }));
  };

  const sponsorsList = formData.additionalSponsors 
    ? formData.additionalSponsors.split(",").map(s => s.trim()).filter(Boolean) 
    : [];

  const handleAddSponsor = (e) => {
    e?.preventDefault();
    if (!sponsorInput.trim()) return;
    const newList = [...sponsorsList, sponsorInput.trim()];
    handleChange({ target: { name: "additionalSponsors", value: newList.join(", ") } });
    setSponsorInput("");
  };

  const handleRemoveSponsor = (indexToRemove) => {
    const newList = sponsorsList.filter((_, index) => index !== indexToRemove);
    handleChange({ target: { name: "additionalSponsors", value: newList.join(", ") } });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddSponsor();
    }
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
      let insertedRequestId = null;
      const fatherFull = [formData.fatherFirstName, formData.fatherMiddleName, formData.fatherLastName].filter(Boolean).join(" ");
      const motherFull = [formData.motherFirstName, formData.motherMiddleName, formData.motherMaidenLastName].filter(Boolean).join(" ");
      const godfatherFull = [formData.godfatherFirstName, formData.godfatherMiddleName, formData.godfatherLastName].filter(Boolean).join(" ");
      const godmotherFull = [formData.godmotherFirstName, formData.godmotherMiddleName, formData.godmotherLastName].filter(Boolean).join(" ");

      const payload = {
        baptism_type: formData.baptismType,
        preferred_date: formData.preferredDate,
        preferred_time: formData.preferredTime,
        end_time: formData.preferredEndTime || null,
        preferred_priest: formData.preferredPriest || null,
        child_first_name: formData.childFirstName,
        child_middle_name: formData.childMiddleName,
        child_last_name: formData.childLastName,
        child_dob: formData.childDob,
        child_birthplace: formData.childBirthplace,
        child_gender: formData.childGender,
        father_name: fatherFull,
        mother_maiden_name: motherFull,
        address: formData.address,
        contact_numbers: formData.contactNumbers,
        parents_marriage_status: formData.parentsMarriageStatus,
        godfather_name: godfatherFull,
        godmother_name: godmotherFull,
        additional_sponsors: formData.additionalSponsors,
        submitter_name: formData.submitter_signature,
        status: "Pending",
        // ✨ Add documentPaths to the payload
        attached_documents: formData.documentPaths.length > 0 ? formData.documentPaths : null,
        ...(user ? {
          user_id: user.id,
          submitter_email: user.email || null,
          submitter_phone: user.user_metadata?.contact_number || user.phone || null,
        } : {}),
        ...(guestInfo ? {
          is_guest: true,
          guest_name: `${guestInfo.firstName} ${guestInfo.lastName}`.trim(),
          guest_contact: guestInfo.contactNumber,
        } : {}),
      };

      const parseErr = (raw) => {
        try {
          const p = JSON.parse(raw?.message ?? raw ?? "");
          return p.message || raw?.message || String(raw);
        } catch { return raw?.message || String(raw); }
      };

      // Guest path — use edge function (service role bypasses RLS)
      if (guestInfo && !user) {
        await submitGuestViaEdgeFunction("baptisms", payload);
      } else {
        const first = await restInsert("baptisms", [payload]);
        if (!first.error && Array.isArray(first.data) && first.data[0]?.id) {
          insertedRequestId = first.data[0].id;
        }

        if (first.error) {
          const fallbackPayload = { ...payload };
          delete fallbackPayload.user_id;
          delete fallbackPayload.submitter_email;
          delete fallbackPayload.submitter_phone;

          const retry = await restInsert("baptisms", [fallbackPayload]);
          if (!retry.error && Array.isArray(retry.data) && retry.data[0]?.id) {
            insertedRequestId = retry.data[0].id;
          }
          if (retry.error) {
            const minPayload = { ...fallbackPayload };
            delete minPayload.is_guest;
            delete minPayload.guest_name;
            delete minPayload.guest_contact;
            const lastRetry = await restInsert("baptisms", [minPayload]);
            if (!lastRetry.error && Array.isArray(lastRetry.data) && lastRetry.data[0]?.id) {
              insertedRequestId = lastRetry.data[0].id;
            }
            if (lastRetry.error) throw new Error(parseErr(lastRetry.error));
          }
        }
      }

      // NOTIFY STAFF: Fire RPC after successful insert
      const submitterName = user
        ? (user.user_metadata?.first_name || user.email)
        : `${guestInfo?.firstName} ${guestInfo?.lastName}`.trim();

      const childName = [formData.childFirstName, formData.childLastName]
        .filter(Boolean).join(" ").trim();

      const { error: rpcError } = await supabase.rpc('notify_staff', {
        notif_title: `New Baptism Request`,
        notif_message: `${submitterName} submitted a baptism request for ${childName || "a child"}.`,
        notif_link: '/staff-dashboard',
        p_source_id: insertedRequestId,
        p_source_table: 'baptisms',
      });

      if (rpcError) {
        console.error("notify_staff RPC error:", rpcError);
      } else {
        console.log("✅ notify_staff fired successfully");
      }

      setSuccess(true);

      if (user?.email) {
        sendRequestEmail({
          to: user.email,
          serviceName: "baptism",
          summary: childName
            ? `Baptism request for ${childName} on ${formData.preferredDate || "(date pending)"}.`
            : undefined,
        });
      }

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
            {guestInfo && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
                <span className="text-amber-500 text-lg shrink-0">👤</span>
                <div>
                  <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Guest Submission</p>
                  <p className="text-xs text-amber-600 mt-0.5">{guestInfo.firstName} {guestInfo.lastName} · {guestInfo.contactNumber}</p>
                </div>
              </div>
            )}
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200 text-sm font-bold">
                Error: {error}
              </div>
            )}

            {/* 1. Schedule Selection */}
            <div>
              <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest border-b border-[#B59E74]/30 pb-2 mb-4">
                Baptism Schedule & Officiant <span className="text-[11px] text-gray-400 normal-case">(Iskedyul ng Binyag)</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600">Type of Baptism * <span className="text-[11px] text-gray-400 normal-case font-normal">(Uri ng Binyag)</span></label>
                  <select name="baptismType" value={formData.baptismType} onChange={handleChange} required
                    className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700">
                    <option value="Sunday">Sunday Baptism</option>
                    <option value="Solo">Solo/Individual</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600">Preferred Date * <span className="text-[11px] text-gray-400 normal-case font-normal">(Nais na Petsa)</span></label>
                  <input type="date" name="preferredDate" value={formData.preferredDate} onChange={handleChange} required
                    min={new Date().toISOString().split("T")[0]}
                    className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600">Preferred Time * <span className="text-[11px] text-gray-400 normal-case font-normal">(Nais na Oras)</span></label>
                  <select name="preferredTime" value={formData.preferredTime} onChange={handleChange} required
                    className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700">
                    <option value="" disabled>Select Time</option>
                    {TIME_SLOTS.map((slot) => (
                      <option key={slot.value} value={slot.value}>{slot.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600">End Time <span className="text-[11px] text-gray-400 normal-case font-normal">(Oras ng Katapusan)</span></label>
                  <select name="preferredEndTime" value={formData.preferredEndTime} onChange={handleChange}
                    className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700">
                    <option value="">— Optional —</option>
                    {TIME_SLOTS.map((slot) => (
                      <option key={slot.value} value={slot.value}>{slot.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600">Preferred Priest <span className="text-[11px] text-gray-400 normal-case font-normal">(Nais na Pari - Opsyonal)</span></label>
                  <select name="preferredPriest" value={formData.preferredPriest} onChange={handleChange}
                    className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700">
                    <option value="">No Preference / Any Available</option>
                    {priests.map((priest) => (
                      <option key={priest.id} value={priest.name}>Fr. {priest.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-500 italic leading-relaxed text-center max-w-2xl mx-auto border-t pt-4 border-gray-200">
              Instructions: Answer all the blanks accordingly using ALL CAPS. Please write legibly. Copy necessary details as it is written in the Certificate of Live Birth of the one to be baptized.
              <br />
              <span className="text-[11px] text-gray-400">
                Panuto: Sagutan ang mga blanko ng tama sa pamamagitan ng pagsusulat gamit ang MALALAKING LETRA. Sumulat ng maayos. Kopyahin ang mga detalye nang ayon sa nakasulat sa Certificate of Live Birth ng bata.
              </span>
            </p>

            {/* 2. Child's Info */}
            <div>
              <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest border-b border-[#B59E74]/30 pb-2 mb-4">
                Child's Information <span className="text-[11px] text-gray-400 normal-case">(Impormasyon ng Bata)</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="text-xs font-bold text-gray-600">Full Name of Child * <span className="text-[11px] text-gray-400 normal-case font-normal">(Buong Pangalan ng Bata)</span></label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input type="text" name="childFirstName" value={formData.childFirstName} onChange={handleChange} required placeholder="First Name"
                      className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" />
                    <input type="text" name="childMiddleName" value={formData.childMiddleName} onChange={handleChange} placeholder="Middle Name"
                      className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" />
                    <input type="text" name="childLastName" value={formData.childLastName} onChange={handleChange} required placeholder="Last Name"
                      className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600">Date of Birth * <span className="text-[11px] text-gray-400 normal-case font-normal">(Petsa ng Kapanganakan)</span></label>
                  <input type="date" name="childDob" value={formData.childDob} onChange={handleChange} required
                    className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600">Place of Birth * <span className="text-[11px] text-gray-400 normal-case font-normal">(Lugar ng Kapanganakan)</span></label>
                  <input type="text" name="childBirthplace" value={formData.childBirthplace} onChange={handleChange} required
                    className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" />
                </div>
                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="text-xs font-bold text-gray-600">Gender * <span className="text-[11px] text-gray-400 normal-case font-normal">(Kasarian)</span></label>
                  <div className="flex items-center gap-6 mt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                      <input type="radio" name="childGender" value="Male" checked={formData.childGender === "Male"} onChange={handleChange} required
                        className="w-4 h-4 text-[#B59E74] focus:ring-[#B59E74]" /> Male <span className="text-gray-400">(Lalake)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                      <input type="radio" name="childGender" value="Female" checked={formData.childGender === "Female"} onChange={handleChange}
                        className="w-4 h-4 text-[#B59E74] focus:ring-[#B59E74]" /> Female <span className="text-gray-400">(Babae)</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Parents' Info */}
            <div>
              <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest border-b border-[#B59E74]/30 pb-2 mb-4">
                Parents' Information <span className="text-[11px] text-gray-400 normal-case">(Impormasyon ng Magulang)</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="text-xs font-bold text-gray-600">Father's Name * <span className="text-[11px] text-gray-400 normal-case font-normal">(Pangalan ng Ama)</span></label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input type="text" name="fatherFirstName" value={formData.fatherFirstName} onChange={handleChange} required placeholder="First Name"
                      className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" />
                    <input type="text" name="fatherMiddleName" value={formData.fatherMiddleName} onChange={handleChange} placeholder="Middle Name"
                      className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" />
                    <input type="text" name="fatherLastName" value={formData.fatherLastName} onChange={handleChange} required placeholder="Surname"
                      className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" />
                  </div>
                </div>
                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="text-xs font-bold text-gray-600">Mother's Maiden Name * <span className="text-[11px] text-gray-400 normal-case font-normal">(Pangalan ng Ina sa Pagkadalaga)</span></label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input type="text" name="motherFirstName" value={formData.motherFirstName} onChange={handleChange} required placeholder="First Name"
                      className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" />
                    <input type="text" name="motherMiddleName" value={formData.motherMiddleName} onChange={handleChange} placeholder="Middle Name"
                      className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" />
                    <input type="text" name="motherMaidenLastName" value={formData.motherMaidenLastName} onChange={handleChange} required placeholder="Surname"
                      className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" />
                  </div>
                </div>
                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="text-xs font-bold text-gray-600">Complete Address * <span className="text-[11px] text-gray-400 normal-case font-normal">(Tirahan)</span></label>
                  <textarea rows="2" name="address" value={formData.address} onChange={handleChange} required placeholder="Street Address, City, Zip Code"
                    className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700 resize-none"></textarea>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600">Contact Numbers * <span className="text-[11px] text-gray-400 normal-case font-normal">(Numero ng Telepono)</span></label>
                  <input type="tel" name="contactNumbers" value={formData.contactNumbers} onChange={handleChange} required placeholder="Primary phone number" maxLength={11}
                    className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600">Parents' Marriage Status * <span className="text-[11px] text-gray-400 normal-case font-normal">(Katayuan sa Pag-aasawa ng Magulang)</span></label>
                  <select name="parentsMarriageStatus" value={formData.parentsMarriageStatus} onChange={handleChange} required
                    className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700">
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
                Sponsors / Godparents <span className="text-[11px] text-gray-400 normal-case">(Ninong at Ninang)</span>
              </h3>
              <p className="text-xs text-gray-500 italic mb-4">
                Note: 1 pair of sponsors is included in the base fee. Additional sponsors are Php 50.00 per head.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                <div className="flex flex-col gap-2 p-4 bg-white border border-gray-200 rounded-xl">
                  <label className="text-xs font-bold text-[#B59E74]">Primary Godfather (Ninong) *</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <input type="text" name="godfatherFirstName" value={formData.godfatherFirstName} onChange={handleChange} required placeholder="First Name"
                      className="p-2 border-b border-gray-300 focus:outline-none focus:border-[#B59E74] bg-transparent text-gray-700 text-sm" />
                    <input type="text" name="godfatherMiddleName" value={formData.godfatherMiddleName} onChange={handleChange} placeholder="Middle Name"
                      className="p-2 border-b border-gray-300 focus:outline-none focus:border-[#B59E74] bg-transparent text-gray-700 text-sm" />
                    <input type="text" name="godfatherLastName" value={formData.godfatherLastName} onChange={handleChange} required placeholder="Surname"
                      className="p-2 border-b border-gray-300 focus:outline-none focus:border-[#B59E74] bg-transparent text-gray-700 text-sm" />
                  </div>
                </div>
                <div className="flex flex-col gap-2 p-4 bg-white border border-gray-200 rounded-xl">
                  <label className="text-xs font-bold text-[#B59E74]">Primary Godmother (Ninang) *</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <input type="text" name="godmotherFirstName" value={formData.godmotherFirstName} onChange={handleChange} required placeholder="First Name"
                      className="p-2 border-b border-gray-300 focus:outline-none focus:border-[#B59E74] bg-transparent text-gray-700 text-sm" />
                    <input type="text" name="godmotherMiddleName" value={formData.godmotherMiddleName} onChange={handleChange} placeholder="Middle Name"
                      className="p-2 border-b border-gray-300 focus:outline-none focus:border-[#B59E74] bg-transparent text-gray-700 text-sm" />
                    <input type="text" name="godmotherLastName" value={formData.godmotherLastName} onChange={handleChange} required placeholder="Surname"
                      className="p-2 border-b border-gray-300 focus:outline-none focus:border-[#B59E74] bg-transparent text-gray-700 text-sm" />
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-600">Additional Sponsors <span className="text-[11px] text-gray-400 normal-case font-normal">(Karagdagang Ninong at Ninang)</span></label>
                {sponsorsList.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {sponsorsList.map((sponsor, index) => (
                      <div key={index} className="flex items-center gap-2 bg-[#F6F5ED] border border-[#B59E74]/30 text-[#B59E74] px-3 py-1.5 rounded-full text-sm font-medium">
                        <span>{sponsor}</span>
                        <button type="button" onClick={() => handleRemoveSponsor(index)}
                          className="text-[#B59E74] hover:text-red-500 font-bold focus:outline-none" title="Remove sponsor">✕</button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input type="text" value={sponsorInput} onChange={(e) => setSponsorInput(e.target.value)} onKeyDown={handleKeyDown}
                    placeholder="Type a name and hit Enter..."
                    className="flex-1 p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" />
                  <button type="button" onClick={handleAddSponsor} disabled={!sponsorInput.trim()}
                    className="w-12 h-12 flex items-center justify-center bg-[#B59E74] hover:bg-[#9c8760] text-white rounded-lg font-bold text-2xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Add Sponsor">+</button>
                </div>
              </div>
            </div>

            <hr className="border-gray-200" />

            {/* Guidelines & Fees Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col h-full">
                <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest mb-4 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Requirements for Baptism
                </h3>
                <ul className="flex flex-col gap-2 text-sm text-gray-600 font-serif">
                  <li><strong>1. Birth Certificate</strong> with Registry No. (from City Hall or PSA). Present original and submit photocopy.</li>
                  <li><strong>2. Marriage Certificate of Parents</strong> (If married). Present original and submit photocopy.</li>
                  <li><strong>3. Permit for Baptism</strong> (for non-parishioners) from a parish near your residence.</li>
                  <li><strong>4. Certificate of No Records</strong> (for 2 yrs old & above) from 3 neighboring parishes.</li>
                </ul>
                <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm font-bold text-center border border-red-100">
                  "NO SEMINAR, NO BAPTISM" <br />
                  <span className="text-xs font-normal">Be on time: 30 minutes before schedule.</span>
                </div>
                
                {/* ✨ THE MAGIC: Replaced Google Drive Link with DocumentUploader */}
                <div className="mt-6 flex-grow flex flex-col justify-end">
                  <DocumentUploader 
                    folderPath="baptisms" 
                    onUploadComplete={handleUploadComplete} 
                  />
                </div>

              </div>

              <div className="bg-[#B59E74]/10 p-6 rounded-xl border border-[#B59E74]/30 shadow-sm flex flex-col gap-4 h-full">
                <div>
                  <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest mb-2">Schedule & Fees</h3>
                  <ul className="text-sm text-gray-700 font-serif space-y-2">
                    <li><strong>A. Solo/Individual:</strong> Php 2,500.00 (Tue-Sat: 9:30am, 10:00am, 10:30am, 11:00am). Includes 1 pair of sponsors & certificate.</li>
                    <li><strong>B. Sunday Baptism</strong></li>
                    <li className="text-xs italic text-gray-500 mt-1">Add-ons: Extra sponsor Php 50.00/head | Baptismal Candle Php 80.00/set</li>
                  </ul>
                </div>
                <div className="border-t border-[#B59E74]/20 pt-4 mt-auto">
                  <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest mb-2">Dress Code</h3>
                  <ul className="text-sm text-gray-700 font-serif space-y-1">
                    <li><strong>Child:</strong> Baptismal gown/White dress (girls) / White polo (boys) / White cloth.</li>
                    <li><strong>Adults:</strong> Sunday Best. NO shorts, sandos, sleeveless, spaghetti blouses, leggings, or slippers.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Declaration & Signature */}
            <DeclarationBlock
              declaration="I declare that the information provided above is true and correct, and I respectfully request the Sacrament of Baptism for the child named above. I also acknowledge the fees and dress code required."
              consent={formData.declaration_consent}
              signature={formData.submitter_signature}
              onChange={handleChange}
            />

            <div className="pt-2 pb-4">
              <button type="submit" disabled={loading}
                className="w-full bg-[#B59E74] hover:bg-[#9c8760] text-white font-bold text-lg py-4 rounded-xl transition-all shadow-md disabled:opacity-70 disabled:cursor-not-allowed">
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