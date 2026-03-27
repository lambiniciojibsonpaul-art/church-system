import { useState } from 'react';

function BaptismFormModal({ onClose }) {
    const [baptismType, setBaptismType] = useState('Sunday');

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
                                Basilica Minore de <span className="font-serif">San Pedro Bautista</span>
                            </h2>
                            <h1 className="text-2xl md:text-3xl text-[#B59E74] font-serif font-medium mt-1 uppercase">
                                Baptism Registration Form
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

                    {/* --- IMPORTANT GUIDELINES & FEES PANEL --- */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        
                        {/* Requirements Box */}
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
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
                                "NO SEMINAR, NO BAPTISM" <br/>
                                <span className="text-xs font-normal">Be on time: 30 minutes before schedule.</span>
                            </div>
                        </div>

                        {/* Fees & Dress Code Box */}
                        <div className="bg-[#B59E74]/10 p-6 rounded-xl border border-[#B59E74]/30 shadow-sm flex flex-col gap-4">
                            <div>
                                <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest mb-2">Schedule & Fees</h3>
                                <ul className="text-sm text-gray-700 font-serif space-y-2">
                                    <li><strong>A. Solo/Individual:</strong> Php 2,500.00 (Tue-Sat: 9:30am, 10:00am, 10:30am, 11:00am). Includes 1 pair of sponsors & certificate.</li>
                                    <li><strong>B. Sunday Baptism:</strong> Php 1,500.00 (11:00am start). Includes 1 pair of sponsors. (No free certificate).</li>
                                    <li className="text-xs italic text-gray-500 mt-1">Add-ons: Extra sponsor Php 50.00/head | Baptismal Candle Php 80.00/set</li>
                                </ul>
                            </div>
                            <div className="border-t border-[#B59E74]/20 pt-4">
                                <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest mb-2">Dress Code</h3>
                                <ul className="text-sm text-gray-700 font-serif space-y-1">
                                    <li><strong>Child:</strong> Baptismal gown/White dress (girls) / White polo (boys) / White cloth.</li>
                                    <li><strong>Adults:</strong> Sunday Best. NO shorts, sandos, sleeveless, spaghetti blouses, leggings, or slippers.</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <hr className="border-gray-200" />

                    {/* 1. Schedule Selection */}
                    <div>
                        <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest border-b border-[#B59E74]/30 pb-2 mb-4">Baptism Schedule</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-600">Type of Baptism</label>
                                <select 
                                    value={baptismType}
                                    onChange={(e) => setBaptismType(e.target.value)}
                                    className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700"
                                >
                                    <option value="Sunday">Sunday Baptism (Php 1,500 - 11:00am)</option>
                                    <option value="Solo">Solo/Individual (Php 2,500 - Tue-Sat)</option>
                                </select>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-600">Preferred Date</label>
                                <input type="date" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" />
                            </div>
                        </div>
                    </div>

                    {/* 2. Child's Info */}
                    <div>
                        <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest border-b border-[#B59E74]/30 pb-2 mb-4">Child's Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex flex-col gap-1 md:col-span-2">
                                <label className="text-xs font-bold text-gray-600">Full Name of Child</label>
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
                                <label className="text-xs font-bold text-gray-600">Place of Birth (City/Province)</label>
                                <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" />
                            </div>
                            <div className="flex flex-col gap-1 md:col-span-2">
                                <label className="text-xs font-bold text-gray-600">Gender</label>
                                <div className="flex items-center gap-6 mt-1">
                                    <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                                        <input type="radio" name="child_gender" className="w-4 h-4 text-[#B59E74] focus:ring-[#B59E74]" /> Male
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                                        <input type="radio" name="child_gender" className="w-4 h-4 text-[#B59E74] focus:ring-[#B59E74]" /> Female
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 3. Parents' Info */}
                    <div>
                        <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest border-b border-[#B59E74]/30 pb-2 mb-4">Parents' Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            
                            <div className="flex flex-col gap-1 md:col-span-2">
                                <label className="text-xs font-bold text-gray-600">Father's Full Name</label>
                                <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" placeholder="First, Middle, Last Name" />
                            </div>
                            <div className="flex flex-col gap-1 md:col-span-2">
                                <label className="text-xs font-bold text-gray-600">Mother's Full Maiden Name</label>
                                <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" placeholder="First, Middle, Last Maiden Name" />
                            </div>
                            
                            <div className="flex flex-col gap-1 md:col-span-2">
                                <label className="text-xs font-bold text-gray-600">Complete Address</label>
                                <textarea rows="2" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700 resize-none" placeholder="Street Address, City, Zip Code"></textarea>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-600">Contact Numbers</label>
                                <input type="tel" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" placeholder="Primary phone number" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-600">Parents' Marriage Status</label>
                                <select className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700">
                                    <option>Married in Church</option>
                                    <option>Civil Marriage</option>
                                    <option>Not Married</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* 4. Godparents Info */}
                    <div>
                        <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest border-b border-[#B59E74]/30 pb-2 mb-4">Sponsors / Godparents</h3>
                        <p className="text-xs text-gray-500 italic mb-4">Note: 1 pair of sponsors is included in the base fee. Additional sponsors are Php 50.00 per head.</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                            <div className="flex flex-col gap-2 p-4 bg-white border border-gray-200 rounded-xl">
                                <label className="text-xs font-bold text-[#B59E74]">Primary Godfather (Ninong)</label>
                                <input type="text" className="p-2 border-b border-gray-300 focus:outline-none focus:border-[#B59E74] bg-transparent text-gray-700 text-sm" placeholder="Full Name" />
                            </div>
                            <div className="flex flex-col gap-2 p-4 bg-white border border-gray-200 rounded-xl">
                                <label className="text-xs font-bold text-[#B59E74]">Primary Godmother (Ninang)</label>
                                <input type="text" className="p-2 border-b border-gray-300 focus:outline-none focus:border-[#B59E74] bg-transparent text-gray-700 text-sm" placeholder="Full Name" />
                            </div>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-gray-600">Additional Sponsors</label>
                            <textarea rows="3" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700 resize-none" placeholder="List additional sponsors here..."></textarea>
                        </div>
                    </div>

                    {/* SUBMITTER'S DETAILS */}
                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                        <div className="flex flex-col gap-1 flex-1 max-w-lg">
                            <label className="text-sm font-bold text-gray-600">Submitter's Name & Digital Signature</label>
                            <input type="text" className="p-3 border-b-2 border-gray-300 focus:outline-none focus:border-[#B59E74] bg-transparent text-gray-700 font-serif italic" placeholder="Enter full name as digital signature" />
                            <span className="text-[11px] text-gray-400 mt-1">I declare that all the information provided above is true and correct, and I acknowledge the fees and dress code required.</span>
                        </div>
                    </div>

                    <div className="pt-2 pb-4">
                        <button type="button" className="w-full bg-[#B59E74] hover:bg-[#9c8760] text-white font-bold text-lg py-4 rounded-xl transition-colors shadow-md">
                            Submit Registration
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}

export default BaptismFormModal;