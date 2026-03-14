function HolyCommunionFormModal({ onClose }) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 h-screen w-screen">
            <div className="bg-[#F6F5ED] w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl relative scrollbar-hidden">
                
                <div className="sticky top-0 bg-[#F6F5ED] px-8 py-6 z-10 flex justify-between items-center border-b border-gray-200 shadow-sm">
                    <div>
                        <h2 className="text-2xl md:text-3xl text-[#B59E74] font-serif font-medium">
                            First Holy Communion Registration
                        </h2>
                        <p className="text-gray-500 font-serif italic text-sm mt-1">
                            Please provide the required details below.
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-600 shrink-0"
                    >
                        ✕
                    </button>
                </div>

                <form className="p-8 space-y-8">
                    
                    {/* 1. Student Information */}
                    <div>
                        <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest border-b border-[#B59E74]/30 pb-2 mb-4">Student Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1 md:col-span-2">
                                <label className="text-xs font-bold text-gray-600">Student's Full Name</label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" placeholder="First" />
                                    <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" placeholder="Middle" />
                                    <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" placeholder="Last" />
                                </div>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-600">Age</label>
                                <input type="number" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" />
                            </div>
                            <div className="flex flex-col gap-2 mt-1">
                                <label className="text-xs font-bold text-gray-600">Gender</label>
                                <div className="flex items-center gap-6 mt-2">
                                    <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                                        <input type="radio" name="student_gender" className="w-4 h-4 text-[#B59E74] focus:ring-[#B59E74]" /> Male
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                                        <input type="radio" name="student_gender" className="w-4 h-4 text-[#B59E74] focus:ring-[#B59E74]" /> Female
                                    </label>
                                </div>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-600">Date of Birth</label>
                                <input type="date" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" />
                            </div>
                            <div className="flex flex-col gap-1 md:col-span-2">
                                <label className="text-xs font-bold text-gray-600">Place of Birth</label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" placeholder="City" />
                                    <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" placeholder="State" />
                                    <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" placeholder="Country" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 2. Parents / Guardian Info */}
                    <div>
                        <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest border-b border-[#B59E74]/30 pb-2 mb-4">Parents & Guardian Information</h3>
                        <div className="grid grid-cols-1 gap-4">
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-600">Father's Full Name</label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" placeholder="First" />
                                    <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" placeholder="Middle" />
                                    <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" placeholder="Last" />
                                </div>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-600">Mother's Full Name</label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" placeholder="First" />
                                    <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" placeholder="Middle" />
                                    <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" placeholder="(Maiden) Last" />
                                </div>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-600">Other Guardian Information</label>
                                <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" />
                            </div>
                        </div>
                    </div>

                    {/* 3. Address & Contact */}
                    <div>
                        <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest border-b border-[#B59E74]/30 pb-2 mb-4">Address & Contact</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1 md:col-span-2">
                                <label className="text-xs font-bold text-gray-600">Address</label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700 md:col-span-2" placeholder="Street" />
                                    <div className="grid grid-cols-2 gap-4">
                                        <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" placeholder="City" />
                                        <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" placeholder="Zip Code" />
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-600">Home Phone</label>
                                <input type="tel" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-600">Business Phone</label>
                                <input type="tel" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-600">Cell Phone</label>
                                <input type="tel" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-600">E-mail Address</label>
                                <input type="email" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" />
                            </div>
                        </div>
                    </div>

                    {/* 4. Baptism Details */}
                    <div>
                        <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest border-b border-[#B59E74]/30 pb-2 mb-4">Baptism Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1 md:col-span-2">
                                <label className="text-xs font-bold text-gray-600">Date of Baptism</label>
                                <input type="date" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700 md:w-1/2" />
                            </div>
                            <div className="flex flex-col gap-1 md:col-span-2">
                                <label className="text-xs font-bold text-gray-600">Church of Baptism</label>
                                <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" />
                            </div>
                            <div className="flex flex-col gap-1 md:col-span-2">
                                <label className="text-xs font-bold text-gray-600">Address of Church</label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                    <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700 md:col-span-2" placeholder="Street" />
                                    <div className="grid grid-cols-2 gap-4">
                                        <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" placeholder="City" />
                                        <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" placeholder="Zip Code" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" placeholder="State" />
                                    <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" placeholder="Country" />
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

export default HolyCommunionFormModal;