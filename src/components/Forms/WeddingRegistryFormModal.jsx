import { useAuth } from "../../contexts/useAuth";
import SignInPrompt from "../SignInPrompt";

function WeddingRegistryFormModal({ onClose }) {
  const { user } = useAuth();
  if (!user) return <SignInPrompt onClose={onClose} serviceName="a wedding" />;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 h-screen w-screen">
      <div className="bg-[#F6F5ED] w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl relative scrollbar-hidden">
        {/* Modal Header */}
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
                Registration Form for Weddings
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
          <p className="text-xs text-gray-500 italic leading-relaxed text-center max-w-3xl mx-auto border-b pb-6 border-gray-200">
            Instructions: Answer all the blanks accordingly using ALL CAPS.
            Please write legibly. Copy necessary details as it is written in the
            Certificate of Live Birth of those to be married.
            <br />
            <span className="text-[11px] text-gray-400">
              Panuto: Sagutan ang mga blanko ng tama sa pamamagitan ng
              pagsusulat gamit ang MALALAKING LETRA. Sumulat ng maayos. Kopyahin
              ang mga detalye nang ayon sa nakasulat sa Certificate of Live
              Birth ng ikakasal.
            </span>
          </p>

          {/* 1. GROOM'S INFORMATION */}
          <div>
            <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest border-b border-[#B59E74]/30 pb-2 mb-4">
              Groom's Information{" "}
              <span className="text-[11px] text-gray-400 normal-case">
                (Impormasyon ng Lalaking Ikakasal)
              </span>
            </h3>
            <div className="grid grid-cols-1 gap-6">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-600">
                  Name of Groom{" "}
                  <span className="text-[11px] text-gray-400 normal-case font-normal">
                    (Pangalan ng Lalaking Ikakasal)
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

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="flex flex-col gap-1 md:col-span-6">
                  <label className="text-xs font-bold text-gray-600">
                    Address{" "}
                    <span className="text-[11px] text-gray-400 normal-case font-normal">
                      (Tirahan)
                    </span>
                  </label>
                  <input
                    type="text"
                    className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700"
                    placeholder="Complete Address"
                  />
                </div>
                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="text-xs font-bold text-gray-600">
                    Current Age{" "}
                    <span className="text-[11px] text-gray-400 normal-case font-normal">
                      (Kasalukuyang Edad)
                    </span>
                  </label>
                  <input
                    type="number"
                    className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700"
                  />
                </div>
                <div className="flex flex-col gap-1 md:col-span-4">
                  <label className="text-xs font-bold text-gray-600">
                    Contact Nos.
                  </label>
                  <input
                    type="tel"
                    className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700"
                    placeholder="Phone Number/s"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 2. BRIDE'S INFORMATION */}
          <div>
            <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest border-b border-[#B59E74]/30 pb-2 mb-4 mt-8">
              Bride's Information{" "}
              <span className="text-[11px] text-gray-400 normal-case">
                (Impormasyon ng Babaeng Ikakasal)
              </span>
            </h3>
            <div className="grid grid-cols-1 gap-6">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-600">
                  Name of Bride{" "}
                  <span className="text-[11px] text-gray-400 normal-case font-normal">
                    (Pangalan ng Babaeng Ikakasal)
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

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="flex flex-col gap-1 md:col-span-6">
                  <label className="text-xs font-bold text-gray-600">
                    Address{" "}
                    <span className="text-[11px] text-gray-400 normal-case font-normal">
                      (Tirahan)
                    </span>
                  </label>
                  <input
                    type="text"
                    className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700"
                    placeholder="Complete Address"
                  />
                </div>
                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="text-xs font-bold text-gray-600">
                    Current Age{" "}
                    <span className="text-[11px] text-gray-400 normal-case font-normal">
                      (Kasalukuyang Edad)
                    </span>
                  </label>
                  <input
                    type="number"
                    className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700"
                  />
                </div>
                <div className="flex flex-col gap-1 md:col-span-4">
                  <label className="text-xs font-bold text-gray-600">
                    Contact Nos.
                  </label>
                  <input
                    type="tel"
                    className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700"
                    placeholder="Phone Number/s"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 3. WEDDING DETAILS & RESERVATION */}
          <div>
            <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest border-b border-[#B59E74]/30 pb-2 mb-4 mt-8">
              Wedding & Reservation Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-600">
                  Date of Wedding{" "}
                  <span className="text-[11px] text-gray-400 normal-case font-normal">
                    (Petsa ng Kasal)
                  </span>
                </label>
                <input
                  type="date"
                  className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-600">
                  Time of Wedding{" "}
                  <span className="text-[11px] text-gray-400 normal-case font-normal">
                    (Oras ng Kasal)
                  </span>
                </label>
                <input
                  type="time"
                  className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-600">
                  Reservation Fee{" "}
                  <span className="text-[11px] text-gray-400 normal-case font-normal">
                    (Non-refundable)
                  </span>
                </label>
                <input
                  type="text"
                  className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-gray-50 text-gray-700"
                  placeholder="₱"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600">
                    Official Receipt No.
                  </label>
                  <input
                    type="text"
                    className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-gray-50 text-gray-700"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600">
                    Date of Reservation
                  </label>
                  <input
                    type="date"
                    className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-gray-50 text-gray-700"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 4. CHECKLIST OF REQUIREMENTS (Dual Column Groom/Bride) */}
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

            {/* Table Header */}
            <div className="flex items-center gap-4 text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 px-2">
              <div className="w-12 text-center">Groom</div>
              <div className="w-12 text-center">Bride</div>
              <div className="flex-1 ml-4">Requirement</div>
            </div>

            {/* Checklist Items */}
            <div className="flex flex-col gap-2 text-sm text-gray-700 font-serif">
              {[
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
              ].map((item, idx) => (
                <label
                  key={idx}
                  className="flex items-center gap-4 hover:bg-white/50 p-2 rounded-lg transition-colors cursor-pointer"
                >
                  <div className="w-12 flex justify-center">
                    <input
                      type="checkbox"
                      className="w-5 h-5 text-[#B59E74] focus:ring-[#B59E74] border-gray-400 rounded"
                    />
                  </div>
                  <div className="w-12 flex justify-center">
                    <input
                      type="checkbox"
                      className="w-5 h-5 text-[#B59E74] focus:ring-[#B59E74] border-gray-400 rounded"
                    />
                  </div>
                  <span className="flex-1 ml-4">{item}</span>
                </label>
              ))}
            </div>
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
              Submit Wedding Registration
            </button>
          </div>

          {/* ADMIN USE ONLY */}
          <div className="pt-8 border-t border-gray-200 text-left">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
              FOR OFFICE USE ONLY (Church Admin)
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-y-6 gap-x-8 text-sm font-serif p-6 bg-gray-100 rounded-lg border border-gray-200">
              {/* Left Column Admin */}
              <div className="flex flex-col gap-4 md:col-span-2">
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-gray-500 uppercase tracking-wider">
                    Notes:
                  </span>
                  <textarea
                    rows="3"
                    className="border-b border-gray-400 bg-transparent focus:outline-none focus:border-[#B59E74] resize-none"
                  ></textarea>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-500 uppercase tracking-wider">
                      Minister of Marriage:
                    </span>
                    <div className="border-b border-gray-400 h-6"></div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-500 uppercase tracking-wider">
                      Received by:
                    </span>
                    <div className="border-b border-gray-400 h-6"></div>
                  </div>
                </div>
              </div>

              {/* Right Column Admin (Log book details) */}
              <div className="flex flex-col gap-4">
                <div className="flex items-end gap-2">
                  <span className="text-xs text-gray-500 uppercase tracking-wider w-20">
                    Book No:
                  </span>
                  <div className="border-b border-gray-400 flex-1 h-6"></div>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-xs text-gray-500 uppercase tracking-wider w-20">
                    Page No:
                  </span>
                  <div className="border-b border-gray-400 flex-1 h-6"></div>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-xs text-gray-500 uppercase tracking-wider w-20">
                    Line No:
                  </span>
                  <div className="border-b border-gray-400 flex-1 h-6"></div>
                </div>
                <div className="flex items-end gap-2 mt-4">
                  <span className="text-xs text-gray-500 uppercase tracking-wider w-20">
                    Amount:
                  </span>
                  <div className="border-b border-gray-400 flex-1 h-6"></div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default WeddingRegistryFormModal;
