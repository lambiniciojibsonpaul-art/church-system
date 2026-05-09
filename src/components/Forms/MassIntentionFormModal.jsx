import { useState } from "react";
import { restInsert } from "../../supabaseRest";
import { useAuth } from "../../contexts/useAuth";
import { sendRequestEmail } from "../../emailNotifications";
import SignInPrompt from "../SignInPrompt";
import { DeclarationBlock, SuccessPanel, submitRequest } from "./formHelpers";

function MassIntentionFormModal({ onClose }) {
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    full_name: "",
    address: "",
    contact_number: "",
    email_address: "",
    intention_type: "Thanksgiving",
    specify_intention: "",
    date_of_death: "",
    names_in_intention: "",
    special_prayer_request: "",
    preferred_date: "",
    preferred_time: "",
    mass_type: "Regular Parish Mass",
    location: "Parish Church",
    offering_amount: "",
    declaration_consent: false,
    submitter_signature: "",
  });

  if (!user)
    return <SignInPrompt onClose={onClose} serviceName="a mass intention" />;

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
      await submitRequest({
        table: "mass_intentions",
        payload: formData,
        user,
        serviceName: "mass intention",
        summary: `${formData.intention_type} for ${formData.names_in_intention || formData.full_name}.`,
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 h-screen w-screen">
      <div className="bg-[#F6F5ED] w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl relative scrollbar-hidden">
        {/* Modal Header */}
        <div className="sticky top-0 bg-[#F6F5ED] px-8 py-6 z-10 flex justify-between items-start border-b border-gray-200 shadow-sm">
          <div>
            <h2 className="text-2xl md:text-3xl text-[#B59E74] font-serif font-medium">
              Mass Intention Request
            </h2>
            <p className="text-gray-500 font-serif italic text-sm mt-1">
              Please submit requests at least 1–3 days in advance.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-600 shrink-0 mt-1"
          >
            ✕
          </button>
        </div>

        {success ? (
          <SuccessPanel />
        ) : (
          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200">
                {error}
              </div>
            )}

            {/* --- INFORMATION PANEL --- */}
            <div className="bg-white p-6 rounded-xl border border-[#B59E74]/30 shadow-sm">
              <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest mb-3 flex items-center gap-2">
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
                    d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
                  />
                </svg>
                Important Notes
              </h3>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-y-2 text-sm text-gray-600 font-serif">
                <li>• Mass intentions are usually announced during the Mass.</li>
                <li>• Popular dates fill up quickly; early submission is advised.</li>
                <li>• Offerings are not payments but voluntary church support.</li>
                <li>• Multiple intentions may be included in one Mass.</li>
              </ul>
            </div>

            {/* --- A. REQUESTOR INFORMATION --- */}
            <div>
              <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest border-b border-[#B59E74]/30 pb-2 mb-4">
                A. Requestor Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="text-xs font-bold text-gray-600">Full Name</label>
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    required
                    className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700"
                    placeholder="First, Middle, Last"
                  />
                </div>
                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="text-xs font-bold text-gray-600">Address</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600">Contact Number</label>
                  <input
                    type="tel"
                    name="contact_number"
                    value={formData.contact_number}
                    onChange={handleChange}
                    className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600">Email Address (Optional)</label>
                  <input
                    type="email"
                    name="email_address"
                    value={formData.email_address}
                    onChange={handleChange}
                    className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700"
                  />
                </div>
              </div>
            </div>

            {/* --- B. INTENTION DETAILS --- */}
            <div>
              <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest border-b border-[#B59E74]/30 pb-2 mb-4">
                B. Intention Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600">Type of Mass Intention</label>
                  <select
                    name="intention_type"
                    value={formData.intention_type}
                    onChange={handleChange}
                    className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700"
                  >
                    <option value="Thanksgiving">Thanksgiving</option>
                    <option value="Special Intention">Special Intention (Healing, Exams, Travel)</option>
                    <option value="For the Sick">For the Sick</option>
                    <option value="For the Dead">For the Dead (Repose of Soul)</option>
                    <option value="Birthday Intention">Birthday Intention</option>
                    <option value="Wedding Anniversary">Wedding Anniversary</option>
                    <option value="Others">Others</option>
                  </select>
                </div>

                {formData.intention_type === "Others" && (
                  <div className="flex flex-col gap-1 animate-fade-in-up">
                    <label className="text-xs font-bold text-gray-600">Specify Intention</label>
                    <input
                      type="text"
                      name="specify_intention"
                      value={formData.specify_intention}
                      onChange={handleChange}
                      className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700"
                    />
                  </div>
                )}

                {formData.intention_type === "For the Dead" && (
                  <div className="flex flex-col gap-1 animate-fade-in-up">
                    <label className="text-xs font-bold text-gray-600">Date of Death (If applicable)</label>
                    <input
                      type="date"
                      name="date_of_death"
                      value={formData.date_of_death}
                      onChange={handleChange}
                      className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700"
                    />
                  </div>
                )}

                <div className="flex flex-col gap-1 md:col-span-2 mt-2">
                  <label className="text-xs font-bold text-gray-600">Name/s Included in the Intention</label>
                  <textarea
                    rows="3"
                    name="names_in_intention"
                    value={formData.names_in_intention}
                    onChange={handleChange}
                    className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700 resize-none"
                    placeholder="Write clearly. Separate multiple names with a comma."
                  />
                </div>

                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="text-xs font-bold text-gray-600">Special Prayer Request / Occasion (Optional)</label>
                  <input
                    type="text"
                    name="special_prayer_request"
                    value={formData.special_prayer_request}
                    onChange={handleChange}
                    className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700"
                    placeholder="e.g., Board Exams, 50th Birthday, etc."
                  />
                </div>
              </div>
            </div>

            {/* --- C. SCHEDULE & LOCATION --- */}
            <div>
              <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest border-b border-[#B59E74]/30 pb-2 mb-4">
                C. Schedule & Location
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600">Preferred Date</label>
                  <input
                    type="date"
                    name="preferred_date"
                    value={formData.preferred_date}
                    onChange={handleChange}
                    required
                    className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600">Preferred Time</label>
                  <input
                    type="time"
                    name="preferred_time"
                    value={formData.preferred_time}
                    onChange={handleChange}
                    className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600">Mass Type</label>
                  <select
                    name="mass_type"
                    value={formData.mass_type}
                    onChange={handleChange}
                    className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700"
                  >
                    <option>Regular Parish Mass</option>
                    <option>Special Mass (if available)</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600">Location</label>
                  <select
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700"
                  >
                    <option>Parish Church</option>
                    <option>Chapel</option>
                    <option>Home / Private (Subject to priest availability)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* --- F. DONATION --- */}
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <div className="flex flex-col gap-1 md:w-1/2">
                <label className="text-xs font-bold text-gray-600">Offering Amount (Voluntary)</label>
                <input
                  type="text"
                  name="offering_amount"
                  value={formData.offering_amount}
                  onChange={handleChange}
                  className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700"
                  placeholder="₱ Amount"
                />
              </div>
            </div>

            {/* DECLARATION & SIGNATURE */}
            <DeclarationBlock
              declaration="I declare that the information provided above is true and correct, and I respectfully request the offering of the Holy Mass for the intention(s) stated above."
              consent={formData.declaration_consent}
              signature={formData.submitter_signature}
              onChange={handleChange}
            />

            <div className="pt-2 pb-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#B59E74] hover:bg-[#9c8760] text-white font-bold text-lg py-4 rounded-xl transition-colors shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? "Submitting..." : "Submit Mass Intention"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default MassIntentionFormModal;
