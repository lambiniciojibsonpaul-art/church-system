import { useAuth } from "../../contexts/useAuth";
import SignInPrompt from "../SignInPrompt";

function HolyCommunionFormModal({ onClose }) {
  const { user } = useAuth();
  if (!user) return <SignInPrompt onClose={onClose} serviceName="holy communion" />;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 h-screen w-screen">
      <div className="bg-[#F6F5ED] w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl relative scrollbar-hidden">
        {/* Modal Header */}
        <div className="sticky top-0 bg-[#F6F5ED] px-8 py-6 z-10 flex justify-between items-center border-b border-gray-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center border-2 border-[#B59E74] text-xl font-medium text-[#B59E74]">
              ⛪
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-sans font-medium text-gray-800 uppercase tracking-wide">
                Basilica Minore de{" "}
                <span className="font-serif">San Pedro Bautista</span>
              </h2>
              <h1 className="text-2xl md:text-3xl text-[#B59E74] font-serif font-medium mt-1">
                REGISTRATION FORM FOR HOLY COMMUNION
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

        {/* Modal Form Content */}
        <form className="p-8 space-y-10">
          {/* TOP DETAILS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-white rounded-xl border border-gray-100">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-bold text-gray-600">
                Date of Holy Communion:
              </label>
              <input
                type="date"
                className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-bold text-gray-600">Time:</label>
              <input
                type="time"
                className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700"
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
              Student Information{" "}
              <span className="text-[11px] text-gray-400 normal-case">
                (Pangalan ng Unang Pakikinabang)
              </span>
            </h3>
            <div className="grid grid-cols-1 gap-6">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-600">
                  Name of Child{" "}
                  <span className="text-[11px] text-gray-400 normal-case font-normal">
                    (Pangalan ng Unang Pakikinabang)
                  </span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input
                    type="text"
                    className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700"
                    placeholder="First Name"
                  />
                  <input
                    type="text"
                    className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700"
                    placeholder="Middle Name"
                  />
                  <input
                    type="text"
                    className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700"
                    placeholder="Surname"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600">
                    Date of Birth{" "}
                    <span className="text-[11px] text-gray-400 normal-case font-normal">
                      (Petsa ng Kapanganakan)
                    </span>
                  </label>
                  <input
                    type="date"
                    className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700"
                  />
                </div>
                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="text-xs font-bold text-gray-600">
                    Place of Birth{" "}
                    <span className="text-[11px] text-gray-400 normal-case font-normal">
                      (Lugar ng Kapanganakan)
                    </span>
                  </label>
                  <input
                    type="text"
                    className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700"
                    placeholder="City / Province"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600">
                    Gender{" "}
                    <span className="text-[11px] text-gray-400 normal-case font-normal">
                      (Kasarian)
                    </span>
                  </label>
                  <div className="flex items-center gap-6 mt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                      <input
                        type="radio"
                        name="gender"
                        className="w-4 h-4 text-[#B59E74] focus:ring-[#B59E74] rounded border-gray-300"
                      />{" "}
                      Male <span className="text-gray-400">(Lalake)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                      <input
                        type="radio"
                        name="gender"
                        className="w-4 h-4 text-[#B59E74] focus:ring-[#B59E74] rounded border-gray-300"
                      />{" "}
                      Female <span className="text-gray-400">(Babae)</span>
                    </label>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600">
                    Current Age:{" "}
                    <span className="text-[11px] text-gray-400 normal-case font-normal">
                      (Kasalukuyang Edad)
                    </span>
                  </label>
                  <input
                    type="number"
                    className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700 md:w-1/3"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 2. Baptismal Details */}
          <div>
            <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest border-b border-[#B59E74]/30 pb-2 mb-4">
              Baptismal Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-600">
                  Date of Baptism{" "}
                  <span className="text-[11px] text-gray-400 normal-case font-normal">
                    (Petsa ng Binyag)
                  </span>
                </label>
                <input
                  type="date"
                  className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700"
                />
              </div>
              <div className="flex flex-col gap-1 md:col-span-2">
                <label className="text-xs font-bold text-gray-600">
                  Church/Parish of Baptism{" "}
                  <span className="text-[11px] text-gray-400 normal-case font-normal">
                    (Simbahan/Parokya kung saan bininyagan)
                  </span>
                </label>
                <input
                  type="text"
                  className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700"
                />
              </div>
            </div>
          </div>

          {/* 3. Parents / Guardian Info */}
          <div>
            <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest border-b border-[#B59E74]/30 pb-2 mb-4">
              Parents & Guardian Information
            </h3>
            <div className="grid grid-cols-1 gap-6">
              {/* Father's Name */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-600">
                  Father's Full Name{" "}
                  <span className="text-[11px] text-gray-400 normal-case font-normal">
                    (Pangalan ng Ama)
                  </span>
                </label>
                <input
                  type="text"
                  className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700"
                  placeholder="Full Name"
                />
              </div>

              {/* Mother's Name */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-600">
                  Mother's Full Maiden Name{" "}
                  <span className="text-[11px] text-gray-400 normal-case font-normal">
                    (Pangalan ng Ina sa Pagkadalaga)
                  </span>
                </label>
                <input
                  type="text"
                  className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700"
                  placeholder="Full Maiden Name"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-600">
                  Other Guardian Information
                </label>
                <input
                  type="text"
                  className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700"
                  placeholder="If applicable"
                />
              </div>
            </div>
          </div>

          {/* 4. Address & Contact */}
          <div>
            <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest border-b border-[#B59E74]/30 pb-2 mb-4">
              Address & Contact
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-1 md:col-span-2">
                <label className="text-xs font-bold text-gray-600">
                  Complete Address{" "}
                  <span className="text-[11px] text-gray-400 normal-case font-normal">
                    (Tirahan)
                  </span>
                </label>
                <textarea
                  rows="3"
                  className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700 resize-none"
                  placeholder="Street Address, City, Zip Code"
                ></textarea>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-600">
                  Parish:{" "}
                  <span className="text-[11px] text-gray-400 normal-case font-normal">
                    (Parokyang nakasasakop sa tirahan)
                  </span>
                </label>
                <input
                  type="text"
                  className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700"
                />
              </div>
              <div className="flex flex-col gap-1 md:col-span-2 mt-2">
                <label className="text-xs font-bold text-gray-600 mb-2">
                  Contact Numbers{" "}
                  <span className="text-[11px] text-gray-400 normal-case font-normal">
                    (Provide up to two)
                  </span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="tel"
                    className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700"
                    placeholder="Primary Contact Number"
                  />
                  <input
                    type="tel"
                    className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700"
                    placeholder="Secondary Contact Number"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 5. CHECKLIST OF REQUIREMENTS */}
          <div className="bg-[#B59E74]/10 p-6 rounded-xl border border-[#B59E74]/30 shadow-sm mt-8">
            <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest mb-4 flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Checklist of Requirements
            </h3>
            <ul className="flex flex-col gap-3 text-sm text-gray-700 font-serif">
              <li className="flex items-start gap-3">
                <span className="text-[#B59E74] mt-0.5">•</span>
                Baptismal Cert. original with annotation for 1st communion
                purposes
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[#B59E74] mt-0.5">•</span>
                Parents seminar (no parents seminar no 1st communion)
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[#B59E74] mt-0.5">•</span>
                Practices
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[#B59E74] mt-0.5">•</span>
                Confession
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[#B59E74] mt-0.5">•</span>
                <div className="flex items-center gap-2 w-full md:w-1/2">
                  <span>Others:</span>
                  <input
                    type="text"
                    className="flex-1 bg-transparent border-b border-gray-400 focus:outline-none focus:border-[#B59E74] text-sm"
                  />
                </div>
              </li>
            </ul>
            <p className="text-xs text-gray-500 italic mt-5 border-t border-[#B59E74]/20 pt-3">
              * Please prepare and bring the necessary requirements to the
              Parish Office as indicated.
            </p>
          </div>

          {/* SUBMITTER'S DETAILS */}
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
            <div className="flex flex-col gap-1 flex-1 max-w-lg">
              <label className="text-sm font-bold text-gray-600">
                Submitter's Name & Digital Signature
              </label>
              <input
                type="text"
                className="p-3 border-b-2 border-gray-300 focus:outline-none focus:border-[#B59E74] bg-transparent text-gray-700 font-serif italic"
                placeholder="Enter full name as digital signature"
              />
              <span className="text-[11px] text-gray-400 mt-1">
                I declare that all the information provided above is true and
                correct.
              </span>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2 pb-4">
            <button
              type="button"
              className="w-full bg-[#B59E74] hover:bg-[#9c8760] text-white font-bold text-lg py-4 rounded-xl transition-colors shadow-md"
            >
              Submit Form
            </button>
          </div>

          {/* ADMIN USE ONLY */}
          <div className="pt-8 border-t border-gray-200 text-left">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
              FOR OFFICE USE ONLY (Church Admin)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm font-serif p-4 bg-gray-100 rounded-lg border border-gray-200">
              <div className="border-b md:border-b-0 md:border-r border-gray-200 pb-2 md:pb-0 md:pr-4">
                Book No: ______
              </div>
              <div className="border-b md:border-b-0 md:border-r border-gray-200 pb-2 md:pb-0 md:pr-4">
                Page No: ______
              </div>
              <div className="border-b md:border-b-0 md:border-r border-gray-200 pb-2 md:pb-0 md:pr-4">
                Line No: ______
              </div>
              <div className="pt-2 md:pt-0">Signature of Catechist: ______</div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default HolyCommunionFormModal;
