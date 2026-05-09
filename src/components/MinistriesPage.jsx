import React from "react";
import { ministries as ministriesData } from "../data/ministries";

function MinistriesPage() {
  return (
    <div className="min-h-screen w-full flex flex-col font-sans bg-[#F6F5ED]">
      {/* --- HERO SECTION --- */}
      <section className="relative pt-32 pb-20 px-6 text-center overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none">
          <div className="absolute top-10 left-10 w-64 h-64 bg-[#B59E74]/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-64 h-64 bg-[#B59E74]/10 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="w-16 h-1 bg-[#B59E74] mx-auto mb-6"></div>
          <h1 className="text-4xl md:text-5xl font-serif text-[#B59E74] font-medium uppercase tracking-[0.2em] mb-6">
            Our Ministries
          </h1>
          <p className="text-gray-600 font-serif italic text-lg leading-relaxed">
            "For as in one body we have many members, and the members do not all have the same function, so we, though many, are one body in Christ."
          </p>
        </div>
      </section>

      {/* --- MINISTRIES GRID --- */}
      <section className="max-w-7xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {ministriesData.map((ministry, index) => (
            <div 
              key={index} 
              className="group bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-500 hover:-translate-y-2 flex flex-col items-center text-center"
            >
              {/* Icon Wrapper */}
              <div className="w-20 h-20 rounded-full bg-[#F6F5ED] flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform duration-500 border-2 border-transparent group-hover:border-[#B59E74]">
                {ministry.icon}
              </div>

              {/* Content */}
              <h3 className="text-xl font-serif text-gray-800 font-medium mb-4 uppercase tracking-widest group-hover:text-[#B59E74] transition-colors">
                {ministry.name}
              </h3>
              <p className="text-gray-500 leading-relaxed text-sm font-sans">
                {ministry.description}
              </p>

              {/* Bottom Accent Line */}
              <div className="w-0 group-hover:w-12 h-0.5 bg-[#B59E74] mt-6 transition-all duration-500"></div>
            </div>
          ))}
        </div>
      </section>

      {/* --- CALL TO ACTION FOOTER --- */}
      <section className="bg-white py-20 px-6 text-center border-t border-gray-100">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-serif text-[#B59E74] uppercase tracking-widest mb-4">
            Answer the Call to Serve
          </h2>
          <p className="text-gray-500 italic mb-8">
            If you feel called to join any of our ministries, please visit the parish office or contact us through our services page.
          </p>
          <button className="px-8 py-3 bg-[#B59E74] text-white font-bold uppercase tracking-widest rounded-full hover:bg-[#9c8760] transition-all shadow-lg active:scale-95">
            Contact Us
          </button>
        </div>
      </section>
    </div>
  );
}

export default MinistriesPage;