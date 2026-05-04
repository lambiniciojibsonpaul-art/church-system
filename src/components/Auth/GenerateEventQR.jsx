import React from "react";
import { QRCodeCanvas } from "qrcode.react";

function GenerateEventQR({ eventId, eventTitle }) {
  // Construct the HashRouter compatible URL
  // Example: http://localhost:5173/#/check-in/uuid-123-abc
  const checkInUrl = `${window.location.origin}/#/check-in/${eventId}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 max-w-md mx-auto text-center">
      {/* UI Header - Hidden during print */}
      <div className="print:hidden mb-6">
        <h3 className="text-xl font-serif text-[#B59E74] uppercase tracking-widest mb-2">
          Event QR Code
        </h3>
        <p className="text-sm text-gray-500 italic">Print this and place it at the church entrance.</p>
      </div>

      {/* PRINTABLE SECTION - Formatted for paper */}
      <div className="flex flex-col items-center justify-center p-8 bg-white border-2 border-dashed border-gray-200 rounded-2xl print:border-none print:p-0">
        <h2 className="text-2xl font-serif text-gray-800 mb-6 uppercase tracking-wide text-center">
          {eventTitle || "Church Event Check-In"}
        </h2>
        
        <div className="p-4 bg-white shadow-sm border border-gray-100 rounded-lg">
          <QRCodeCanvas 
            value={checkInUrl} 
            size={256} 
            level="H" // High error correction (critical for printed paper)
            includeMargin={true}
          />
        </div>
        
        <p className="mt-6 text-xs text-gray-400 font-sans uppercase tracking-widest">
          Scan with phone camera to mark attendance
        </p>
      </div>

      {/* Action Button - Hidden during print */}
      <button 
        onClick={handlePrint}
        className="print:hidden mt-8 w-full bg-[#B59E74] text-white font-bold py-3 rounded-xl uppercase tracking-widest hover:bg-[#9c8760] transition-all shadow-md"
      >
        Print QR Code
      </button>
    </div>
  );
}

export default GenerateEventQR;