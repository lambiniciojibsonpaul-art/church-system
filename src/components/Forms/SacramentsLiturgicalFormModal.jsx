import { useState } from 'react';

function SacramentsLiturgicalFormModal({ onClose }) {
    // State to track which type of request the user selects
    const [requestType, setRequestType] = useState('Baptism');

    // Dynamic requirements based on the selected request type
    const requirementsMap = {
        'Baptism': [
            "PSA Birth Certificate (copy)",
            "Parents’ Marriage Certificate (if married in church)",
            "Seminar Certificate (parents & godparents)",
            "List of godparents (with basic info)",
            "Valid IDs"
        ],
        'Confirmation': [
            "Baptismal Certificate",
            "Sponsor’s name (confirmed Catholic)",
            "Seminar/formation attendance proof"
        ],
        'First Communion': [
            "Baptismal Certificate",
            "Catechism completion",
            "Parent consent"
        ],
        'Marriage': [
            "PSA Birth Certificate & PSA CENOMAR",
            "Baptismal Certificate (updated: 'for marriage purposes')",
            "Confirmation Certificate & Pre-Cana Seminar Certificate",
            "Marriage License (civil)",
            "Valid IDs & Photos",
            "If applicable: Annulment papers / death cert of previous spouse"
        ],
        'Funeral Mass': [
            "Death Certificate",
            "Burial permit (sometimes required)",
            "Funeral details (wake location, interment date)"
        ],
        'Anointing of the Sick': [
            "Patient details (name, age, condition)",
            "Location (home/hospital)",
            "Contact person"
        ],
        'Blessing': [
            "Type of blessing (house, car, business, etc.)",
            "Address/location",
            "Preferred date/time & Contact details"
        ],
        'Certificate Request': [
            "Full name (as recorded)",
            "Date of sacrament & Parents’ names",
            "Valid ID",
            "Authorization letter (if requesting for someone else)"
        ]
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 h-screen w-screen">
            <div className="bg-[#F6F5ED] w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl relative scrollbar-hidden">
                
                {/* Modal Header */}
                <div className="sticky top-0 bg-[#F6F5ED] px-8 py-6 z-10 flex justify-between items-start border-b border-gray-200 shadow-sm">
                    <div>
                        <h2 className="text-2xl md:text-3xl text-[#B59E74] font-serif font-medium">
                            Sacraments & Liturgical Request
                        </h2>
                        <p className="text-gray-500 font-serif italic text-sm mt-1 max-w-2xl">
                            Please select your request type below. The form and requirements will update accordingly.
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-600 shrink-0 mt-1"
                    >
                        ✕
                    </button>
                </div>

                <form className="p-8 space-y-10">

                    {/* --- 1. TYPE OF REQUEST (Controls the rest of the form) --- */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <label className="text-sm font-bold text-[#B59E74] uppercase tracking-widest mb-3 block">
                            Type of Request
                        </label>
                        <select 
                            value={requestType}
                            onChange={(e) => setRequestType(e.target.value)}
                            className="w-full p-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-gray-50 text-lg font-serif text-gray-800 cursor-pointer"
                        >
                            <option value="Baptism">Baptism</option>
                            <option value="Confirmation">Confirmation</option>
                            <option value="First Communion">First Communion</option>
                            <option value="Marriage">Marriage</option>
                            <option value="Funeral Mass">Funeral Mass</option>
                            <option value="Anointing of the Sick">Anointing of the Sick</option>
                            <option value="Blessing">Blessing (House, Car, Business, etc.)</option>
                            <option value="Certificate Request">Certificate Request</option>
                        </select>
                    </div>

                    {/* --- DYNAMIC REQUIREMENTS CHECKLIST --- */}
                    <div className="bg-[#B59E74]/10 p-6 rounded-xl border border-[#B59E74]/30 shadow-sm animate-fade-in-up">
                        <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest mb-3 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                            </svg>
                            Required Documents for {requestType}
                        </h3>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-y-2 text-sm text-gray-700 font-serif">
                            {requirementsMap[requestType].map((req, index) => (
                                <li key={index}>• {req}</li>
                            ))}
                        </ul>
                        <p className="text-xs text-gray-500 italic mt-4 border-t border-[#B59E74]/20 pt-2">
                            * Note: Forms are available at the Parish Office. Requirements must usually be recent (within 6 months). Seminars are mandatory for Baptism & Marriage. Fees are donation-based.
                        </p>
                    </div>

                    {/* --- 2. REQUESTOR'S PERSONAL INFORMATION --- */}
                    <div>
                        <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest border-b border-[#B59E74]/30 pb-2 mb-4">Requestor's Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1 md:col-span-2">
                                <label className="text-xs font-bold text-gray-600">Full Name</label>
                                <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" placeholder="First, Middle, Last" />
                            </div>
                            <div className="flex flex-col gap-1 md:col-span-2">
                                <label className="text-xs font-bold text-gray-600">Complete Address</label>
                                <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-600">Contact Number</label>
                                <input type="tel" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-600">Email Address (Optional)</label>
                                <input type="email" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" />
                            </div>
                        </div>
                    </div>

                    {/* --- 3. PERSON RECEIVING THE SACRAMENT (Hide if Blessing) --- */}
                    {requestType !== 'Blessing' && (
                        <div className="animate-fade-in-up">
                            <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest border-b border-[#B59E74]/30 pb-2 mb-4">
                                {requestType === 'Funeral Mass' ? 'Deceased Information' : 'Person Receiving Sacrament'}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1 md:col-span-2">
                                    <label className="text-xs font-bold text-gray-600">Full Name</label>
                                    <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" placeholder="First, Middle, Last" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-bold text-gray-600">Date of Birth</label>
                                    <input type="date" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-bold text-gray-600">Place of Birth</label>
                                    <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" />
                                </div>
                                <div className="flex flex-col gap-1 md:col-span-2">
                                    <label className="text-xs font-bold text-gray-600">Religion</label>
                                    <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" placeholder="e.g., Roman Catholic" />
                                </div>
                                
                                {/* Parents Names conditionally shown */}
                                {['Baptism', 'Confirmation', 'First Communion', 'Marriage'].includes(requestType) && (
                                    <div className="flex flex-col gap-1 md:col-span-2 mt-2">
                                        <label className="text-xs font-bold text-gray-600">Parents' Names</label>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" placeholder="Father's Full Name" />
                                            <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" placeholder="Mother's Maiden Name" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* --- 4. ADDITIONAL SPECIFIC DETAILS --- */}
                    <div className="animate-fade-in-up">
                        <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest border-b border-[#B59E74]/30 pb-2 mb-4">Additional Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            
                            {/* Schedule Details (Common to almost all) */}
                            {requestType !== 'Certificate Request' && (
                                <>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs font-bold text-gray-600">Preferred Date</label>
                                        <input type="date" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs font-bold text-gray-600">Preferred Time</label>
                                        <input type="time" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" />
                                    </div>
                                    <div className="flex flex-col gap-1 md:col-span-2">
                                        <label className="text-xs font-bold text-gray-600">Venue</label>
                                        <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" placeholder="Church / Chapel / Home / Funeral Parlor" />
                                    </div>
                                </>
                            )}

                            {/* Conditional Fields based on Request Type */}
                            {['Baptism', 'Confirmation'].includes(requestType) && (
                                <div className="flex flex-col gap-1 md:col-span-2">
                                    <label className="text-xs font-bold text-gray-600">Sponsors / Godparents</label>
                                    <textarea rows="2" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700 resize-none" placeholder="List names here..."></textarea>
                                </div>
                            )}

                            {requestType === 'Marriage' && (
                                <div className="flex flex-col gap-1 md:col-span-2">
                                    <label className="text-xs font-bold text-gray-600">Name of Fiancé / Fiancée</label>
                                    <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" />
                                </div>
                            )}

                            {requestType === 'Funeral Mass' && (
                                <div className="flex flex-col gap-1 md:col-span-2">
                                    <label className="text-xs font-bold text-gray-600">Date of Death</label>
                                    <input type="date" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700 md:w-1/2" />
                                </div>
                            )}

                            {requestType === 'Blessing' && (
                                <div className="flex flex-col gap-1 md:col-span-2">
                                    <label className="text-xs font-bold text-gray-600">Type of Blessing</label>
                                    <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" placeholder="e.g., House Blessing, New Car, Business Opening" />
                                </div>
                            )}

                            {requestType === 'Certificate Request' && (
                                <div className="flex flex-col gap-1 md:col-span-2">
                                    <label className="text-xs font-bold text-gray-600">Date Sacrament was Received (Approximate if unsure)</label>
                                    <input type="date" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700 md:w-1/2" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* --- 5. DECLARATION --- */}
                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                        <label className="flex items-start gap-3 cursor-pointer">
                            <input type="checkbox" className="mt-1 w-5 h-5 text-[#B59E74] focus:ring-[#B59E74] rounded border-gray-300" required />
                            <span className="text-sm text-gray-700 font-serif leading-relaxed">
                                I declare that the information provided is true and correct. I understand that physical requirements must be submitted to the Parish Office to finalize this request.
                            </span>
                        </label>
                        <div className="mt-4 flex flex-col md:flex-row gap-4">
                            <div className="flex flex-col gap-1 flex-1">
                                <label className="text-xs font-bold text-gray-500">Digital Signature (Type Name)</label>
                                <input type="text" className="p-2 border-b-2 border-gray-300 focus:outline-none focus:border-[#B59E74] bg-transparent text-gray-700 font-serif italic" />
                            </div>
                            <div className="flex flex-col gap-1 md:w-1/3">
                                <label className="text-xs font-bold text-gray-500">Date Accomplished</label>
                                <input type="text" value={new Date().toLocaleDateString()} disabled className="p-2 border-b-2 border-gray-200 bg-transparent text-gray-500 font-serif" />
                            </div>
                        </div>
                    </div>

                    <div className="pt-2 pb-4">
                        <button type="button" className="w-full bg-[#B59E74] hover:bg-[#9c8760] text-white font-bold text-lg py-4 rounded-xl transition-colors shadow-md">
                            Submit Request
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}

export default SacramentsLiturgicalFormModal;