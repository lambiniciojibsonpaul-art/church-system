function BaptismFormModal({ onClose }) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 h-screen w-screen">
            <div className="bg-[#F6F5ED] w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl relative scrollbar-hidden">
                
                {/* Modal Header */}
                <div className="sticky top-0 bg-[#F6F5ED] px-8 py-6 z-10 flex justify-between items-center border-b border-gray-200 shadow-sm">
                    <div>
                        <h2 className="text-2xl md:text-3xl text-[#B59E74] font-serif font-medium">
                            Baptism Information Form
                        </h2>
                        <p className="text-gray-500 font-serif italic text-sm mt-1">
                            Please provide the required details below.
                        </p>
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
                <form className="p-8 space-y-8">
                    {/* 1. Contact Info */}
                    <div>
                        <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest border-b border-[#B59E74]/30 pb-2 mb-4">Contact Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-600">Cell Phone</label>
                                <input type="tel" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" placeholder="### ### ####" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-600">Home Phone</label>
                                <input type="tel" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" placeholder="### ### ####" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-600">Work Phone</label>
                                <input type="tel" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" placeholder="### ### ####" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-600">Email</label>
                                <input type="email" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" />
                            </div>
                        </div>
                    </div>

                    {/* 2. Address */}
                    <div>
                        <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest border-b border-[#B59E74]/30 pb-2 mb-4">Address</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1 md:col-span-2">
                                <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" placeholder="Street Address" />
                            </div>
                            <div className="flex flex-col gap-1 md:col-span-2">
                                <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" placeholder="Street Address Line 2" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" placeholder="City" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" placeholder="Region / Province" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" placeholder="Postal / Zip Code" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <select className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700">
                                    <option>Philippines</option>
                                    <option>United States</option>
                                    <option>Other</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* 3. Parents' Info */}
                    <div>
                        <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest border-b border-[#B59E74]/30 pb-2 mb-4">Parents' Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1 md:col-span-2">
                                <label className="text-xs font-bold text-gray-600">Father's Name</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" placeholder="First" />
                                    <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" placeholder="Last" />
                                </div>
                            </div>
                            <div className="flex flex-col gap-1 md:col-span-2">
                                <label className="text-xs font-bold text-gray-600">Mother's Name</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" placeholder="First" />
                                    <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" placeholder="Last" />
                                </div>
                            </div>
                            <div className="flex flex-col gap-1 md:col-span-2">
                                <label className="text-xs font-bold text-gray-600">Mother's Maiden Name</label>
                                <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" />
                            </div>
                            <div className="flex flex-col gap-2 md:col-span-2 mt-2">
                                <label className="text-xs font-bold text-gray-600">Have you previously attended a baptism preparation class?</label>
                                <div className="flex items-center gap-6 mt-1">
                                    <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                                        <input type="radio" name="prep_class" className="w-4 h-4 text-[#B59E74] focus:ring-[#B59E74]" /> Yes
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                                        <input type="radio" name="prep_class" className="w-4 h-4 text-[#B59E74] focus:ring-[#B59E74]" /> No
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 4. Child's Info */}
                    <div>
                        <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest border-b border-[#B59E74]/30 pb-2 mb-4">Child's Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1 md:col-span-2">
                                <label className="text-xs font-bold text-gray-600">Child's Name</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" placeholder="First" />
                                    <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" placeholder="Last" />
                                </div>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-600">Date of Birth</label>
                                <input type="date" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-600">City of Birth</label>
                                <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" />
                            </div>
                            <div className="flex flex-col gap-1 md:col-span-2">
                                <label className="text-xs font-bold text-gray-600">State / Region of Birth</label>
                                <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" />
                            </div>
                        </div>
                    </div>

                    {/* 5. Godparents Info */}
                    <div>
                        <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest border-b border-[#B59E74]/30 pb-2 mb-4">Godparents</h3>
                        <div className="grid grid-cols-1 gap-4">
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-600">Godmother's Name</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" placeholder="First" />
                                    <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" placeholder="Last" />
                                </div>
                            </div>
                            <div className="flex flex-col gap-2 mt-1">
                                <label className="text-xs font-bold text-gray-600">Catholic?</label>
                                <div className="flex items-center gap-6">
                                    <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                                        <input type="radio" name="godmother_catholic" className="w-4 h-4 text-[#B59E74] focus:ring-[#B59E74]" /> Yes
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                                        <input type="radio" name="godmother_catholic" className="w-4 h-4 text-[#B59E74] focus:ring-[#B59E74]" /> No
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 pb-4">
                        <button type="button" className="w-full bg-[#B59E74] hover:bg-[#9c8760] text-white font-bold text-lg py-4 rounded-xl transition-colors shadow-md">
                            Submit Form
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default BaptismFormModal;