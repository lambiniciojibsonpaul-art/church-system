import { useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import church2 from "../assets/Images/church2.jpg";

// Placeholder donation details. Replace with the real parish-issued
// GCash QR / account numbers when the Parish Office provides them.
const GCASH = {
  accountName: "San Pedro Bautista Parish",
  number: "0917-555-0123",
  // The string encoded inside the QR code. A real GCash QR is generated
  // by the GCash app and contains a signed payload — until the parish
  // exports theirs, we encode a plain payment-instruction URL.
  qrPayload:
    "https://www.gcash.com/send?recipient=San+Pedro+Bautista+Parish&number=0917-555-0123",
};

const BANK = {
  bankName: "BPI",
  accountName: "San Pedro Bautista Parish",
  accountNumber: "1234-5678-9012",
};

function GivePage() {
  const [copied, setCopied] = useState(null);

  const copy = (text, field) => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(field);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const heroBg = {
    backgroundImage: `linear-gradient(rgba(0,0,0,0.55),rgba(0,0,0,0.55)), url('${church2}')`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundAttachment: "fixed",
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col font-sans bg-white">
      {/* ── HERO ────────────────────────────────────────────────────── */}
      <main
        style={heroBg}
        className="relative h-[60vh] md:h-[75vh] flex flex-col items-center justify-center text-center px-4 text-white"
      >
        <div className="w-20 h-1 bg-[#B59E74] mb-8 mt-16"></div>
        <h1 className="text-5xl md:text-7xl font-serif font-bold tracking-tight">
          Give
        </h1>
        <div className="w-20 h-1 bg-[#B59E74] mt-8"></div>

        <p className="mt-10 max-w-2xl text-lg md:text-xl italic font-serif opacity-95 leading-relaxed">
          "Each of you should give what you have decided in your heart to give,
          not reluctantly or under compulsion, for God loves a cheerful giver."
        </p>
        <p className="mt-3 text-xs tracking-[0.3em] uppercase opacity-75">
          — 2 Corinthians 9:7
        </p>
      </main>

      {/* ── INVITATION ──────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-[#F6F5ED]">
        <div className="max-w-4xl mx-auto text-center">
          <div className="w-16 h-1 bg-[#B59E74] mx-auto mb-6"></div>
          <h2 className="text-3xl md:text-4xl font-serif text-[#B59E74] uppercase tracking-[0.2em] mb-8 font-medium">
            Your Generosity Matters
          </h2>
          <p className="text-gray-600 text-lg leading-relaxed font-serif">
            Every offering sustains the daily ministry of the parish — the
            celebration of the Eucharist, the care of those in need, the
            formation of our young, and the preservation of our sacred home for
            generations to come.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 text-left">
            {[
              { icon: "🕯️", title: "Liturgy", body: "Vestments, candles, sacred vessels, and the upkeep of the altar." },
              { icon: "🤝", title: "Outreach", body: "Feeding programs, medical missions, and aid for the bereaved." },
              { icon: "🏛️", title: "Sanctuary", body: "Restoration and care of the heritage church and grounds." },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-white p-6 rounded-2xl border border-[#B59E74]/15 shadow-sm"
              >
                <div className="text-3xl mb-3">{item.icon}</div>
                <h3 className="text-sm font-bold text-[#B59E74] uppercase tracking-widest mb-2">
                  {item.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WAYS TO GIVE ────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-bold text-[#B59E74] uppercase tracking-[0.3em] mb-3">
              Ways to give
            </p>
            <h2 className="text-3xl md:text-4xl font-serif text-gray-800 uppercase tracking-widest mb-4">
              Choose Your Offering
            </h2>
            <p className="text-gray-500 italic font-serif">
              Three convenient ways to share your gift with the parish.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* ── GCash card with QR ───────────────────────── */}
            <div className="relative bg-gradient-to-br from-[#F6F5ED] via-white to-[#F6F5ED] p-8 rounded-[2rem] shadow-lg border border-[#B59E74]/20 flex flex-col items-center text-center group hover:-translate-y-1 transition-transform duration-300">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#B59E74] text-white text-[10px] font-bold uppercase tracking-[0.2em] px-4 py-1.5 rounded-full shadow-md">
                Most Convenient
              </div>

              <div className="w-16 h-16 rounded-full bg-[#B59E74]/10 flex items-center justify-center text-3xl mb-4 mt-2">
                📱
              </div>
              <h3 className="text-xl font-serif text-[#B59E74] uppercase tracking-[0.2em] mb-1 font-medium">
                GCash
              </h3>
              <p className="text-gray-500 italic text-sm mb-6">
                Scan with your GCash app
              </p>

              <div className="bg-white p-5 rounded-3xl shadow-inner border-2 border-dashed border-[#B59E74]/40 group-hover:border-[#B59E74] transition-colors">
                <QRCodeCanvas
                  value={GCASH.qrPayload}
                  size={200}
                  level="H"
                  includeMargin={true}
                  fgColor="#9c8760"
                  bgColor="#ffffff"
                />
              </div>

              <div className="mt-8 space-y-3 w-full">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em] mb-1">
                    Account Name
                  </p>
                  <p className="font-medium text-gray-800">{GCASH.accountName}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em] mb-1">
                    GCash Number
                  </p>
                  <button
                    onClick={() => copy(GCASH.number, "gcash")}
                    className="inline-flex items-center gap-2 font-mono font-bold text-[#B59E74] hover:bg-[#B59E74]/10 px-3 py-1.5 rounded-lg transition"
                  >
                    <span>{GCASH.number}</span>
                    <span className="text-xs">
                      {copied === "gcash" ? "✓ Copied" : "📋 Copy"}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* ── Bank Transfer card ───────────────────────── */}
            <div className="bg-white p-8 rounded-[2rem] shadow-md border border-gray-100 flex flex-col items-center text-center hover:-translate-y-1 transition-transform duration-300">
              <div className="w-16 h-16 rounded-full bg-[#B59E74]/10 flex items-center justify-center text-3xl mb-4 mt-2">
                🏦
              </div>
              <h3 className="text-xl font-serif text-[#B59E74] uppercase tracking-[0.2em] mb-1 font-medium">
                Bank Transfer
              </h3>
              <p className="text-gray-500 italic text-sm mb-6">
                Online or over-the-counter
              </p>

              <div className="space-y-5 w-full mt-4">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em] mb-1">
                    Bank
                  </p>
                  <p className="font-bold text-gray-800 text-2xl font-serif">
                    {BANK.bankName}
                  </p>
                </div>
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em] mb-1">
                    Account Name
                  </p>
                  <p className="font-medium text-gray-800">{BANK.accountName}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em] mb-1">
                    Account Number
                  </p>
                  <button
                    onClick={() => copy(BANK.accountNumber, "bank")}
                    className="inline-flex items-center gap-2 font-mono font-bold text-[#B59E74] hover:bg-[#B59E74]/10 px-3 py-1.5 rounded-lg transition"
                  >
                    <span>{BANK.accountNumber}</span>
                    <span className="text-xs">
                      {copied === "bank" ? "✓ Copied" : "📋 Copy"}
                    </span>
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-gray-400 italic mt-6 leading-relaxed">
                Please indicate "Donation" and your name in the deposit slip
                so we can record your offering.
              </p>
            </div>

            {/* ── In Person card ───────────────────────────── */}
            <div className="bg-white p-8 rounded-[2rem] shadow-md border border-gray-100 flex flex-col items-center text-center hover:-translate-y-1 transition-transform duration-300">
              <div className="w-16 h-16 rounded-full bg-[#B59E74]/10 flex items-center justify-center text-3xl mb-4 mt-2">
                ⛪
              </div>
              <h3 className="text-xl font-serif text-[#B59E74] uppercase tracking-[0.2em] mb-1 font-medium">
                In Person
              </h3>
              <p className="text-gray-500 italic text-sm mb-6">
                During Mass or office hours
              </p>

              <div className="space-y-5 mt-4 w-full">
                <p className="text-gray-600 leading-relaxed text-sm">
                  Drop your offering in the collection basket during the
                  Offertory at any Sunday Mass, or visit the Parish Office.
                </p>

                <div className="border-t border-gray-100 pt-4">
                  <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em] mb-2">
                    Parish Office Hours
                  </p>
                  <p className="text-gray-700 font-medium">Monday – Friday</p>
                  <p className="text-gray-500 italic">8:00 AM – 5:00 PM</p>
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em] mb-2">
                    Sunday Masses
                  </p>
                  <p className="text-gray-700 text-sm">6:00 AM · 8:00 AM · 10:00 AM</p>
                  <p className="text-gray-700 text-sm">5:00 PM · 7:00 PM</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── BLESSING FOOTER ────────────────────────────────────────── */}
      <section className="relative py-20 px-6 bg-[#B59E74] text-white text-center overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
          <div className="absolute -top-20 -left-20 w-80 h-80 bg-white rounded-full blur-3xl"></div>
          <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-white rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-3xl mx-auto">
          <div className="text-5xl mb-6">🙏</div>
          <h2 className="text-3xl md:text-4xl font-serif uppercase tracking-[0.25em] mb-6">
            Thank You
          </h2>
          <div className="w-16 h-1 bg-white/40 mx-auto mb-8"></div>
          <p className="text-lg md:text-xl italic font-serif leading-relaxed opacity-95">
            May the Lord bless your generosity. Your gift — no matter the size —
            sustains our parish family and the works of mercy we are called to
            do in His name.
          </p>
          <p className="mt-8 text-xs tracking-[0.3em] uppercase opacity-70">
            San Pedro Bautista Parish
          </p>
        </div>
      </section>
    </div>
  );
}

export default GivePage;
