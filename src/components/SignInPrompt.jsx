import { useState } from "react";
import { Link } from "react-router-dom";

function SignInPrompt({ onClose, serviceName = "this service", onGuest }) {
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [guestData, setGuestData] = useState({ firstName: "", lastName: "", contactNumber: "" });

  const handleGuestSubmit = (e) => {
    e.preventDefault();
    onGuest?.(guestData);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 h-screen w-screen animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up">
        <div className="bg-[#F6F5ED] px-8 py-8 text-center border-b border-gray-100 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100"
            aria-label="Close"
          >
            ✕
          </button>
          <div className="w-16 h-16 mx-auto rounded-full bg-white flex items-center justify-center border-2 border-[#B59E74] text-2xl">
            🔐
          </div>
          <h2 className="mt-4 text-xl font-serif text-[#B59E74] font-medium uppercase tracking-widest">
            Sign In Required
          </h2>
        </div>

        {!showGuestForm ? (
          <div className="p-8 space-y-4 text-center">
            <p className="text-gray-600 leading-relaxed">
              Please sign in or create an account to request {serviceName}.
            </p>
            <p className="text-xs text-gray-400 italic leading-relaxed">
              Your contact details help the parish office process your request and keep you updated by email.
            </p>

            <div className="flex flex-col gap-3 pt-4">
              <Link
                to="/login"
                onClick={onClose}
                className="w-full bg-[#B59E74] hover:bg-[#9c8760] text-white font-bold py-3 rounded-xl uppercase tracking-widest text-sm shadow-md transition-all"
              >
                Sign In
              </Link>
              <Link
                to="/login"
                onClick={onClose}
                className="w-full bg-white hover:bg-gray-50 border-2 border-[#B59E74] text-[#B59E74] font-bold py-3 rounded-xl uppercase tracking-widest text-sm transition-all"
              >
                Create Account
              </Link>
            </div>

            {onGuest && (
              <>
                <div className="flex items-center gap-3 pt-2">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400 font-medium">or</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
                <button
                  onClick={() => setShowGuestForm(true)}
                  className="w-full bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 font-bold py-3 rounded-xl uppercase tracking-widest text-xs transition-all"
                >
                  Continue as Guest
                </button>
                <p className="text-[11px] text-gray-400 italic">
                  Guest submissions are not saved to an account. No email updates will be sent.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="p-8">
            <div className="flex items-center gap-2 mb-5">
              <button onClick={() => setShowGuestForm(false)} className="text-gray-400 hover:text-gray-600 text-sm">
                ← Back
              </button>
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-widest">Guest Details</h3>
            </div>
            <p className="text-xs text-gray-500 mb-5 leading-relaxed">
              Provide your name and contact number so the parish office can reach you about your request.
              <span className="block mt-1.5 font-semibold text-amber-600">These details will not be saved to any account.</span>
            </p>
            <form onSubmit={handleGuestSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={guestData.firstName}
                    onChange={e => setGuestData(p => ({ ...p, firstName: e.target.value }))}
                    placeholder="First name"
                    className="w-full p-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={guestData.lastName}
                    onChange={e => setGuestData(p => ({ ...p, lastName: e.target.value }))}
                    placeholder="Last name"
                    className="w-full p-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Contact Number *</label>
                <input
                  type="tel"
                  required
                  value={guestData.contactNumber}
                  onChange={e => setGuestData(p => ({ ...p, contactNumber: e.target.value }))}
                  placeholder="e.g. 09XX XXX XXXX"
                  className="w-full p-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#B59E74] text-sm"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-[#B59E74] hover:bg-[#9c8760] text-white font-bold py-3 rounded-xl uppercase tracking-widest text-sm shadow-md transition-all mt-2"
              >
                Continue as Guest →
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default SignInPrompt;
