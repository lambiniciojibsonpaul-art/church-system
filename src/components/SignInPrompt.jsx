import { Link } from "react-router-dom";

// Modal-friendly sign-in prompt. Used inside sacrament form modals when
// a guest visitor tries to submit a request — they must be authenticated
// so the parish office knows who submitted it and can email them updates.
function SignInPrompt({ onClose, serviceName = "this service" }) {
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

        <div className="p-8 space-y-4 text-center">
          <p className="text-gray-600 leading-relaxed">
            Please sign in or create an account to request {serviceName}.
          </p>
          <p className="text-xs text-gray-400 italic leading-relaxed">
            Your contact details help the parish office process your request and
            keep you updated by email.
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
        </div>
      </div>
    </div>
  );
}

export default SignInPrompt;
