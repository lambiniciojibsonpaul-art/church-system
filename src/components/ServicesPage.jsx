import { useState } from "react";
import { useAuth } from "../contexts/useAuth";
import church3 from "../assets/Images/church3.jpg";

import BaptismFormModal from "./Forms/BaptismFormModal";
import HolyCommunionFormModal from "./Forms/HolyCommunionFormModal";
import WeddingRegistryFormModal from "./Forms/WeddingRegistryFormModal";
import SacramentsLiturgicalFormModal from "./Forms/SacramentsLiturgicalFormModal";
import MassIntentionFormModal from "./Forms/MassIntentionFormModal";
import ConfirmationFormModal from "./Forms/ConfirmationFormModal";
import FacilitiesBookingFormModal from "./Forms/FacilitiesBookingFormModal";
import CertificationRequestFormModal from "./Forms/CertificationRequestFormModal";

const SACRAMENTAL = [
  { key: "baptism",      icon: "💧", title: "Baptism",                        desc: "Register a child or adult for the Sacrament of Baptism." },
  { key: "communion",    icon: "🍞", title: "Holy Communion",                  desc: "Submit a First Holy Communion request for a candidate." },
  { key: "confirmation", icon: "🕊️", title: "Confirmation",                    desc: "Request the Sacrament of Confirmation for a candidate." },
  { key: "wedding",      icon: "💍", title: "Wedding Registry",                desc: "Register a couple's wedding ceremony with the parish." },
  { key: "liturgical",   icon: "⛪", title: "Sacraments & Liturgical Request", desc: "Request other sacramental or liturgical services." },
];

const GENERAL = [
  { key: "mass",          icon: "🕯️", title: "Mass Intention",       desc: "Offer a Mass for a specific intention or in memory of someone." },
  { key: "facilities",    icon: "📅", title: "Facilities Booking",    desc: "Reserve a parish hall or facility for an event or gathering." },
  { key: "certification", icon: "📜", title: "Certification Request", desc: "Request a canonical certificate (baptism, confirmation, etc.)." },
];

function ServicesPage() {
  const { role, isAdmin } = useAuth();
  const isPriest   = role === "priest";
  const isStaff    = role === "staff";
  const isMinister = role === "minister";
  const isStaffRole = isAdmin || isPriest || isStaff || isMinister;

  const [open, setOpen] = useState(null);
  const [guestInfo, setGuestInfo] = useState(null);

  const close = () => { setOpen(null); setGuestInfo(null); };
  const handleGuest = (data) => setGuestInfo(data);

  // ── Public card ────────────────────────────────────────────────────────────
  const PublicCard = ({ icon, title, onClick }) => (
    <div
      onClick={onClick}
      className="group flex flex-col items-center justify-center gap-4 p-6 bg-white rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:-translate-y-2 hover:shadow-xl hover:border-[#B59E74]/30 transition-all duration-300 h-full"
    >
      <div className="w-16 h-16 md:w-20 md:h-20 bg-[#F6F5ED] rounded-full flex items-center justify-center text-3xl md:text-4xl shadow-inner group-hover:scale-110 transition-transform duration-300 shrink-0">
        {icon}
      </div>
      <span className="text-sm md:text-base font-serif font-medium text-center leading-tight text-gray-800 group-hover:text-[#B59E74] transition-colors">
        {title}
      </span>
    </div>
  );

  // ── Admin / staff card ──────────────────────────────────────────────────────
  const StaffCard = ({ title, desc, onClick }) => (
    <div
      onClick={onClick}
      className="group bg-white rounded-2xl border border-gray-100 shadow-sm p-5 cursor-pointer hover:border-[#B59E74]/40 hover:shadow-md transition-all flex items-start gap-4"
    >
      <div className="flex-1 min-w-0">
        <p className="font-bold text-xs text-gray-700 uppercase tracking-widest leading-tight">
          {title}
        </p>
        <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">{desc}</p>
      </div>
      <svg className="w-4 h-4 text-gray-300 shrink-0 mt-1 group-hover:text-[#B59E74] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </div>
  );

  const SectionLabel = ({ label }) => (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-1 h-5 bg-[#B59E74] rounded-full" />
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">{label}</span>
    </div>
  );

  // ── Modals ──────────────────────────────────────────────────────────────────
  const modals = (
    <>
      {open === "baptism"      && <BaptismFormModal              onClose={close} guestInfo={guestInfo} onGuest={handleGuest} />}
      {open === "communion"    && <HolyCommunionFormModal         onClose={close} guestInfo={guestInfo} onGuest={handleGuest} />}
      {open === "wedding"      && <WeddingRegistryFormModal       onClose={close} guestInfo={guestInfo} onGuest={handleGuest} />}
      {open === "liturgical"   && <SacramentsLiturgicalFormModal  onClose={close} guestInfo={guestInfo} onGuest={handleGuest} />}
      {open === "mass"         && <MassIntentionFormModal         onClose={close} guestInfo={guestInfo} onGuest={handleGuest} />}
      {open === "confirmation" && <ConfirmationFormModal          onClose={close} guestInfo={guestInfo} onGuest={handleGuest} />}
      {open === "facilities"   && <FacilitiesBookingFormModal     onClose={close} guestInfo={guestInfo} onGuest={handleGuest} />}
      {open === "certification"&& <CertificationRequestFormModal  onClose={close} guestInfo={guestInfo} onGuest={handleGuest} />}
    </>
  );

  // ── STAFF / ADMIN UI ────────────────────────────────────────────────────────
  if (isStaffRole) {
    return (
      <div className="min-h-screen bg-gray-50 font-sans">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-28 pb-12">

          {/* Page header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-serif text-gray-800 uppercase tracking-wide">
              Parish Services
            </h1>
            <p className="text-gray-500 font-serif italic mt-1">
              Submit parishioner service requests or access any available form.
            </p>
          </div>

          {/* Sacramental Services */}
          <div className="mb-8">
            <SectionLabel label="Sacramental Services" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {SACRAMENTAL.map(s => (
                <StaffCard key={s.key} icon={s.icon} title={s.title} desc={s.desc} onClick={() => setOpen(s.key)} />
              ))}
            </div>
          </div>

          {/* General Requests */}
          <div>
            <SectionLabel label="General Requests" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {GENERAL.map(s => (
                <StaffCard key={s.key} icon={s.icon} title={s.title} desc={s.desc} onClick={() => setOpen(s.key)} />
              ))}
            </div>
          </div>

        </main>
        {modals}
      </div>
    );
  }

  // ── PUBLIC UI ───────────────────────────────────────────────────────────────
  const backgroundStyle = {
    backgroundImage: `linear-gradient(rgba(0,0,0,0.4),rgba(0,0,0,0.4)),url('${church3}')`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundAttachment: "fixed",
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col font-sans bg-white">
      <main style={backgroundStyle} className="relative h-[60vh] md:h-screen flex flex-col items-center justify-center text-center px-4 text-white">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mt-16">Services</h1>
      </main>

      <section className="relative w-full z-20 -mt-24 pb-32 px-6">
        <div className="bg-[#F6F5ED] rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] max-w-7xl mx-auto py-16 px-8 md:px-16 text-left">
          <div className="text-center max-w-4xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl text-[#B59E74] font-serif uppercase tracking-widest mb-8 font-medium">
              How We Can Serve You
            </h2>
            <p className="text-gray-600 font-serif italic leading-relaxed text-xl">
              Whether you are preparing for a major life milestone, seeking spiritual guidance, or organizing an event within our parish, our community is here to support you every step of the way.
            </p>
          </div>

          <hr className="border-gray-300 border-t w-full max-w-5xl mx-auto mb-16" />

          <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 mb-20 items-center">
            <div className="lg:w-1/3 flex flex-col gap-4 text-center lg:text-left">
              <h3 className="text-3xl text-[#B59E74] font-serif">Sacramental Services</h3>
              <p className="text-gray-700 font-serif leading-relaxed text-lg">
                Sacraments are visible signs of God's grace. From welcoming a new life into the church through Baptism to uniting couples in Holy Matrimony, we are honored to celebrate these sacred rites with you and your family.
              </p>
            </div>
            <div className="lg:w-2/3 flex flex-col gap-4 md:gap-6 w-full">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                {SACRAMENTAL.slice(0,3).map(s => (
                  <PublicCard key={s.key} icon={s.icon} title={s.title} onClick={() => setOpen(s.key)} />
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 md:w-2/3 mx-auto w-full">
                {SACRAMENTAL.slice(3).map(s => (
                  <PublicCard key={s.key} icon={s.icon} title={s.title} onClick={() => setOpen(s.key)} />
                ))}
              </div>
            </div>
          </div>

          <hr className="border-gray-300 border-t w-full max-w-5xl mx-auto mb-16" />

          <div className="flex flex-col lg:flex-row-reverse gap-12 lg:gap-16 items-center">
            <div className="lg:w-1/3 flex flex-col gap-4 text-center lg:text-left">
              <h3 className="text-3xl text-[#B59E74] font-serif">General Requests</h3>
              <p className="text-gray-700 font-serif leading-relaxed text-lg">
                For administrative needs, facility bookings, and special mass intentions, our parish office is ready to assist. Please select the appropriate form below to submit your request directly to our team.
              </p>
            </div>
            <div className="lg:w-2/3 grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 w-full">
              {GENERAL.map(s => (
                <PublicCard key={s.key} icon={s.icon} title={s.title} onClick={() => setOpen(s.key)} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {modals}
    </div>
  );
}

export default ServicesPage;
