function WeddingRegistryFormModal({ onClose }) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 h-screen w-screen">
            <div className="bg-[#F6F5ED] w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl relative scrollbar-hidden">
                
                {/* Modal Header */}
                <div className="sticky top-0 bg-[#F6F5ED] px-8 py-6 z-10 flex justify-between items-start border-b border-gray-200 shadow-sm">
                    <div>
                        <h2 className="text-2xl md:text-3xl text-[#B59E74] font-serif font-medium">
                            Philippine Marriage Registration
                        </h2>
                        <p className="text-gray-500 font-serif italic text-sm mt-1 max-w-2xl">
                            Based on the Certificate of Marriage (Municipal Form No. 97). Please fill out this application prior to submitting your physical requirements to the Local Civil Registrar.
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

                    {/* --- REQUIREMENTS CHECKLIST (Informational) --- */}
                    <div className="bg-white p-6 rounded-xl border border-[#B59E74]/30 shadow-sm">
                        <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest mb-3 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                            </svg>
                            Required Documents to Attach Later
                        </h3>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-y-2 text-sm text-gray-600 font-serif">
                            <li>• Birth Certificates (PSA)</li>
                            <li>• CENOMAR (PSA)</li>
                            <li>• Valid IDs & Barangay Clearance</li>
                            <li>• Pre-Marriage Counseling Certificate</li>
                            <li>• Marriage License</li>
                        </ul>
                    </div>

                    {/* --- 1. GROOM'S INFORMATION --- */}
                    <div>
                        <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest border-b border-[#B59E74]/30 pb-2 mb-4">A. Groom's Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="flex flex-col gap-1 md:col-span-3">
                                <label className="text-xs font-bold text-gray-600">Full Name</label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" placeholder="First Name" />
                                    <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" placeholder="Middle Name" />
                                    <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" placeholder="Last Name" />
                                </div>
                            </div>
                            
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-600">Date of Birth</label>
                                <input type="date" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-600">Age</label>
                                <input type="number" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-600">Sex</label>
                                <select className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700">
                                    <option>Male</option>
                                    <option>Female</option>
                                </select>
                            </div>

                            <div className="flex flex-col gap-1 md:col-span-2">
                                <label className="text-xs font-bold text-gray-600">Place of Birth</label>
                                <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" placeholder="City/Municipality, Province, Country" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-600">Citizenship</label>
                                <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" placeholder="e.g., Filipino" />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-600">Civil Status</label>
                                <select className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700">
                                    <option>Single</option>
                                    <option>Widowed</option>
                                    <option>Annulled</option>
                                </select>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-600">Religion</label>
                                <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" placeholder="e.g., Roman Catholic" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-600">Occupation</label>
                                <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" />
                            </div>

                            <div className="flex flex-col gap-1 md:col-span-3">
                                <label className="text-xs font-bold text-gray-600">Residence Address</label>
                                <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" />
                            </div>

                            {/* Groom's Parents */}
                            <div className="flex flex-col gap-1 md:col-span-2 mt-2">
                                <label className="text-xs font-bold text-gray-600">Name of Father</label>
                                <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" placeholder="Father's Full Name" />
                            </div>
                            <div className="flex flex-col gap-1 mt-2">
                                <label className="text-xs font-bold text-gray-600">Father's Citizenship</label>
                                <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" />
                            </div>

                            <div className="flex flex-col gap-1 md:col-span-2">
                                <label className="text-xs font-bold text-gray-600">Name of Mother (Maiden Name)</label>
                                <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" placeholder="Mother's Full Maiden Name" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-600">Mother's Citizenship</label>
                                <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" />
                            </div>
                        </div>
                    </div>

                    {/* --- 2. BRIDE'S INFORMATION --- */}
                    <div>
                        <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest border-b border-[#B59E74]/30 pb-2 mb-4">B. Bride's Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="flex flex-col gap-1 md:col-span-3">
                                <label className="text-xs font-bold text-gray-600">Full Name</label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" placeholder="First Name" />
                                    <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" placeholder="Middle Name" />
                                    <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" placeholder="Last Name" />
                                </div>
                            </div>
                            
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-600">Date of Birth</label>
                                <input type="date" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-600">Age</label>
                                <input type="number" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-600">Sex</label>
                                <select className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700">
                                    <option>Female</option>
                                    <option>Male</option>
                                </select>
                            </div>

                            <div className="flex flex-col gap-1 md:col-span-2">
                                <label className="text-xs font-bold text-gray-600">Place of Birth</label>
                                <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" placeholder="City/Municipality, Province, Country" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-600">Citizenship</label>
                                <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" placeholder="e.g., Filipino" />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-600">Civil Status</label>
                                <select className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700">
                                    <option>Single</option>
                                    <option>Widowed</option>
                                    <option>Annulled</option>
                                </select>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-600">Religion</label>
                                <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" placeholder="e.g., Roman Catholic" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-600">Occupation</label>
                                <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" />
                            </div>

                            <div className="flex flex-col gap-1 md:col-span-3">
                                <label className="text-xs font-bold text-gray-600">Residence Address</label>
                                <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" />
                            </div>

                            {/* Bride's Parents */}
                            <div className="flex flex-col gap-1 md:col-span-2 mt-2">
                                <label className="text-xs font-bold text-gray-600">Name of Father</label>
                                <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" placeholder="Father's Full Name" />
                            </div>
                            <div className="flex flex-col gap-1 mt-2">
                                <label className="text-xs font-bold text-gray-600">Father's Citizenship</label>
                                <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" />
                            </div>

                            <div className="flex flex-col gap-1 md:col-span-2">
                                <label className="text-xs font-bold text-gray-600">Name of Mother (Maiden Name)</label>
                                <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" placeholder="Mother's Full Maiden Name" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-600">Mother's Citizenship</label>
                                <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" />
                            </div>
                        </div>
                    </div>

                    {/* --- 3. MARRIAGE DETAILS --- */}
                    <div>
                        <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest border-b border-[#B59E74]/30 pb-2 mb-4">Marriage Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1 md:col-span-2">
                                <label className="text-xs font-bold text-gray-600">Place of Marriage</label>
                                <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" placeholder="Church / Hall / City" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-600">Date of Marriage</label>
                                <input type="date" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-600">Type of Ceremony</label>
                                <select className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700">
                                    <option>Church</option>
                                    <option>Civil</option>
                                    <option>Muslim</option>
                                    <option>Tribal</option>
                                </select>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-600">Name of Solemnizing Officer</label>
                                <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-600">Position of Officer</label>
                                <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" placeholder="e.g., Priest, Judge, Mayor" />
                            </div>
                            <div className="flex flex-col gap-1 md:col-span-2">
                                <label className="text-xs font-bold text-gray-600">Address of Solemnizing Officer</label>
                                <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" />
                            </div>
                        </div>
                    </div>

                    {/* --- 4. WITNESS INFORMATION --- */}
                    <div>
                        <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest border-b border-[#B59E74]/30 pb-2 mb-4">Witness Information (Usually 2)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Witness 1 */}
                            <div className="flex flex-col gap-4 p-5 bg-white rounded-xl border border-gray-200">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Witness 1</h4>
                                <div className="flex flex-col gap-1">
                                    <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-gray-50 text-gray-700" placeholder="Full Name" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-gray-50 text-gray-700" placeholder="Citizenship" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-gray-50 text-gray-700" placeholder="Address" />
                                </div>
                            </div>

                            {/* Witness 2 */}
                            <div className="flex flex-col gap-4 p-5 bg-white rounded-xl border border-gray-200">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Witness 2</h4>
                                <div className="flex flex-col gap-1">
                                    <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-gray-50 text-gray-700" placeholder="Full Name" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-gray-50 text-gray-700" placeholder="Citizenship" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-gray-50 text-gray-700" placeholder="Address" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* --- 5. ADDITIONAL DECLARATIONS --- */}
                    <div>
                        <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest border-b border-[#B59E74]/30 pb-2 mb-4">Additional Declarations</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-600">Parental Consent (If age 18-20)</label>
                                <select className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700">
                                    <option>Not Applicable</option>
                                    <option>Secured and Attached</option>
                                </select>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-600">Parental Advice (If age 21-24)</label>
                                <select className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700">
                                    <option>Not Applicable</option>
                                    <option>Secured and Attached</option>
                                </select>
                            </div>

                            <div className="flex flex-col gap-1 md:col-span-2 mt-2">
                                <label className="text-xs font-bold text-gray-600">Community Tax Certificate (Cedula) Number</label>
                                <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" placeholder="Enter Cedula Number" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-600">Date Issued</label>
                                <input type="date" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-600">Place Issued</label>
                                <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" />
                            </div>
                        </div>
                    </div>

                    {/* --- 6. DIGITAL SIGNATURE / SUBMIT --- */}
                    <div className="bg-[#B59E74]/10 p-6 rounded-xl border border-[#B59E74]/30">
                        <label className="flex items-start gap-3 cursor-pointer">
                            <input type="checkbox" className="mt-1 w-5 h-5 text-[#B59E74] focus:ring-[#B59E74] rounded border-gray-300" required />
                            <span className="text-sm text-gray-700 font-serif leading-relaxed">
                                By submitting this form, we (the Groom and Bride) declare that all the information provided above is true and correct to the best of our knowledge. We understand that physical signatures and original documents will be required by the Local Civil Registrar.
                            </span>
                        </label>
                    </div>

                    <div className="pt-2 pb-4">
                        <button type="button" className="w-full bg-[#B59E74] hover:bg-[#9c8760] text-white font-bold text-lg py-4 rounded-xl transition-colors shadow-md">
                            Submit Marriage Registration
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}

export default WeddingRegistryFormModal;