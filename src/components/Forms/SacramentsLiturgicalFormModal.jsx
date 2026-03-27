import { useState } from 'react';

function SacramentsLiturgicalFormModal({ onClose }) {
    // State to track the radio button selection
    const [requestType, setRequestType] = useState('');

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 h-screen w-screen">
            <div className="bg-[#F6F5ED] w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl relative scrollbar-hidden">
                
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
                            <h1 className="text-sm md:text-base text-[#B59E74] font-bold tracking-widest mt-1 uppercase">
                                Request Form for Sacraments & Other Liturgical Activities Outside the Basilica
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

                <form className="p-8 space-y-10">

                    {/* 1. PLEASE CHECK REQUEST */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest border-b border-[#B59E74]/30 pb-2 mb-4">Please check request:</h3>
                        
                        <div className="flex flex-col gap-4">
                            {/* Mass for */}
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input type="radio" name="requestType" value="Mass for" onChange={(e) => setRequestType(e.target.value)} className="w-5 h-5 text-[#B59E74] focus:ring-[#B59E74] border-gray-300" />
                                <span className="text-sm md:text-base text-gray-700">Mass for</span>
                                {requestType === 'Mass for' && (
                                    <input type="text" className="ml-2 flex-1 p-2 border-b border-gray-400 focus:outline-none focus:border-[#B59E74] bg-transparent text-gray-700 text-sm md:text-base animate-fade-in-up" placeholder="Specify intention..." autoFocus />
                                )}
                            </label>
                            
                            {/* Sick Call */}
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input type="radio" name="requestType" value="Sick Call" onChange={(e) => setRequestType(e.target.value)} className="w-5 h-5 text-[#B59E74] focus:ring-[#B59E74] border-gray-300" />
                                <span className="text-sm md:text-base text-gray-700">Sick Call / Anointing of the Sick / Communion</span>
                            </label>

                            {/* House Blessing */}
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input type="radio" name="requestType" value="House/Commercial Blessing" onChange={(e) => setRequestType(e.target.value)} className="w-5 h-5 text-[#B59E74] focus:ring-[#B59E74] border-gray-300" />
                                <span className="text-sm md:text-base text-gray-700">House / Commercial Establishment Blessing</span>
                            </label>

                            {/* Funeral Mass */}
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input type="radio" name="requestType" value="Funeral Mass" onChange={(e) => setRequestType(e.target.value)} className="w-5 h-5 text-[#B59E74] focus:ring-[#B59E74] border-gray-300" />
                                <span className="text-sm md:text-base text-gray-700">Funeral Mass / Mass for the Dead</span>
                            </label>

                            {/* Funeral Blessing */}
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input type="radio" name="requestType" value="Funeral Blessing" onChange={(e) => setRequestType(e.target.value)} className="w-5 h-5 text-[#B59E74] focus:ring-[#B59E74] border-gray-300" />
                                <span className="text-sm md:text-base text-gray-700">Funeral Blessing</span>
                            </label>

                            {/* Others */}
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input type="radio" name="requestType" value="Others" onChange={(e) => setRequestType(e.target.value)} className="w-5 h-5 text-[#B59E74] focus:ring-[#B59E74] border-gray-300" />
                                <span className="text-sm md:text-base text-gray-700">Others:</span>
                                {requestType === 'Others' && (
                                    <input type="text" className="ml-2 flex-1 p-2 border-b border-gray-400 focus:outline-none focus:border-[#B59E74] bg-transparent text-gray-700 text-sm md:text-base animate-fade-in-up" placeholder="Please specify..." autoFocus />
                                )}
                            </label>
                        </div>
                    </div>

                    {/* 2. PLEASE PROVIDE DETAILS */}
                    <div>
                        <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest border-b border-[#B59E74]/30 pb-2 mb-4">Please provide the following details:</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            
                            <div className="flex flex-col gap-1 md:col-span-2">
                                <label className="text-xs font-bold text-gray-600">Address:</label>
                                <textarea rows="3" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700 resize-none" placeholder="Complete address of the activity..."></textarea>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-600">Date:</label>
                                <input type="date" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-600">Time:</label>
                                <input type="time" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" />
                            </div>

                            <div className="flex flex-col gap-1 md:col-span-2">
                                <label className="text-xs font-bold text-gray-600">Requested by:</label>
                                <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" placeholder="Full Name" />
                            </div>

                            <div className="flex flex-col gap-1 md:col-span-2">
                                <label className="text-xs font-bold text-gray-600">Contact Nos.:</label>
                                <input type="tel" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" placeholder="Phone Number/s" />
                            </div>

                        </div>
                    </div>

                    {/* 3. MINISTER & NOTES */}
                    <div>
                        <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest border-b border-[#B59E74]/30 pb-2 mb-4">Additional Details</h3>
                        <div className="grid grid-cols-1 gap-6">
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-600">Name of Minister:</label>
                                <input type="text" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700" placeholder="If known or preferred" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-600">Notes:</label>
                                <textarea rows="4" className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] bg-white text-gray-700 resize-none" placeholder="Any special instructions or additional context..."></textarea>
                            </div>
                        </div>
                    </div>

                    {/* SUBMIT BUTTON */}
                    <div className="pt-4 pb-2">
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