import { useEffect, useMemo, useState } from "react";
import church2 from "../assets/Images/church2.jpg";
import { restSelect } from "../supabaseRest";

function AboutUsPage() {
  const [pastors, setPastors] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Use the same API path as priest selection in forms/schedules.
      let { data, error } = await restSelect("priests", {
        select: "id,name,first_name,last_name,subtitle,photo_url,is_active,is_leadership",
        match: { is_active: true },
        order: "name.asc",
        timeoutMs: 12000,
      });

      // Backward compatibility if new columns are not migrated yet.
      if (error) {
        const fallback = await restSelect("priests", {
          select: "id,name,is_active",
          match: { is_active: true },
          order: "name.asc",
          timeoutMs: 12000,
        });
        data = fallback.data;
        error = fallback.error;
      }

      if (cancelled) return;
      if (error) {
        console.warn("[AboutUsPage] priests fetch error:", error.message);
        setPastors([]);
        return;
      }

      const mapped = (data || []).map((p) => {
        const derived = String(p.name || "").trim().split(/\s+/).filter(Boolean);
        const first = String(p.first_name || derived[0] || "").trim();
        const last = String(p.last_name || derived[derived.length - 1] || "").trim();
        return {
          id: p.id,
          name: `Rev. Fr. ${[first, last].filter(Boolean).join(" ")}, OFM`,
          role: p.subtitle || "Priest",
          image: p.photo_url || null,
          isLeadership: !!p.is_leadership,
        };
      });
      setPastors(mapped);
    })();
    return () => { cancelled = true; };
  }, []);

  const leadershipPriest = useMemo(
    () => pastors.find((p) => p.isLeadership) || pastors[0] || null,
    [pastors]
  );

  // Parallax background style using church2.jpg
  const backgroundStyle = {
    backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url('${church2}')`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundAttachment: "fixed",
  };

  // Helper component for the Pastor profiles
  const PastorProfile = ({ name, role, email, image }) => (
    <div className="flex flex-col text-left">
      <div className="w-full aspect-[3/4] bg-gray-200 mb-6 flex items-center justify-center text-gray-400 rounded-md shadow-sm overflow-hidden">
        {image ? (
          <img src={image} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span>[Image Placeholder]</span>
        )}
      </div>
      <h3 className="text-2xl text-[#B59E74] font-bold mb-2 leading-tight">
        {name.split(" ").map((part, i) => (
          <span key={i} className="block">
            {part}
          </span>
        ))}
      </h3>
      <p className="text-gray-500 font-serif italic mb-1">{role}</p>
      {email && (
        <a
          href={`mailto:${email}`}
          className="text-[#B59E74] font-serif italic underline text-sm hover:text-[#9c8760] transition-colors"
        >
          {email}
        </a>
      )}
    </div>
  );

  return (
    <div className="relative min-h-screen w-full flex flex-col font-sans bg-white">
      {/* Hero Section */}
      <main
        style={backgroundStyle}
        className="relative h-[60vh] md:h-screen flex flex-col items-center justify-center text-center px-4 text-white"
      >
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mt-16">
          About Us
        </h1>
      </main>

      {/* Floating Content Section */}
      <section className="relative w-full z-20 -mt-24 pb-16 px-6">
        <div className="bg-[#F6F5ED] rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] max-w-7xl mx-auto py-16 px-8 md:px-16 text-left">
          {/* --- MISSION & VISION SECTION --- */}
          <div className="text-center max-w-5xl mx-auto mb-20">
            <h2 className="text-3xl md:text-4xl text-[#B59E74] font-serif uppercase tracking-widest mb-12 font-medium">
              Our Mission & Vision
            </h2>

            <div className="flex flex-col gap-12 text-gray-600 font-serif text-xl md:text-2xl md:px-12">
              <div>
                <h3 className="text-lg md:text-xl text-[#B59E74] font-sans tracking-[0.2em] uppercase font-bold mb-4">Mission</h3>
                <p className="italic leading-relaxed">
                  By 2026, we envision a sanctuary where communion of faithful stewards and integral human development are manifested through the celebration of the Eucharist, preaching the Word of God, prayer and devotion.
                </p>
              </div>
              <div>
                <h3 className="text-lg md:text-xl text-[#B59E74] font-sans tracking-[0.2em] uppercase font-bold mb-4">Vision</h3>
                <p className="italic leading-relaxed">
                  We are a dynamic Franciscan parish founded and inspired by San Pedro Bautista. Committed to pursue the Church of the Poor and Care for Creation in joyful service and prophetic witnessing through revitalizing Pamayanan.
                </p>
              </div>
            </div>
          </div>

          <hr className="border-gray-300 border-t w-full max-w-6xl mx-auto mb-16" />

          {/* --- ABOUT OUR CHURCH SECTION --- */}
          <h2 className="text-4xl md:text-5xl text-[#B59E74] font-serif mb-12 font-medium">
            About Our Church
          </h2>

          <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">
            <div className="flex-1 flex flex-col gap-10">
              <div>
                <h3 className="text-3xl text-[#B59E74] font-serif mb-4">Our History</h3>
                <p className="text-gray-700 font-serif leading-relaxed text-lg">
                  Built in 1590, San Pedro Bautista Church has been serving the community for more than four centuries. What started as a humble sanctuary has grown into a flourishing spiritual home, witnessing generations of faith, love, and community building in our city.
                </p>
              </div>
              <div>
                <h3 className="text-3xl text-[#B59E74] font-serif mb-4">Our Beliefs</h3>
                <ul className="list-disc list-inside text-gray-700 font-serif leading-relaxed text-lg space-y-2">
                  <li>We believe in the Holy Trinity</li>
                  <li>We believe in the power of prayer</li>
                  <li>We believe in serving our community</li>
                  <li>We believe in the authority of Scripture</li>
                </ul>
              </div>
              <div>
                <h3 className="text-3xl text-[#B59E74] font-serif mb-4">Leadership</h3>
                <div className="border border-[#B59E74] rounded-lg p-6 max-w-sm bg-white shadow-sm">
                  <h4 className="text-xl text-[#B59E74] font-serif mb-2">{leadershipPriest?.name || "Rev. Fr. —, OFM"}</h4>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Quick Info Box */}
            <div className="lg:w-1/3">
              <div className="border border-[#B59E74] rounded-lg p-8 bg-white shadow-sm sticky top-32">
                <h3 className="text-2xl text-[#B59E74] font-serif mb-8">Quick Info</h3>

                <div className="flex flex-col gap-8">
                  {/* Parish Office Hours */}
                  <div className="flex items-start gap-4">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mt-1 text-[#B59E74] shrink-0">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    <div className="text-gray-700 font-serif leading-relaxed">
                      <span className="block font-bold">Office Hours:</span>
                      <span className="block">8:30 AM - 5:00 PM</span>
                    </div>
                  </div>

                  {/* Sunday Masses */}
                  <div className="flex items-start gap-4">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mt-1 text-[#B59E74] shrink-0">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    <div className="text-gray-700 font-serif leading-relaxed">
                      <span className="block mb-1">Sunday Masses: 6:00 AM • 8:00 AM • 10:00 AM • 3:00 PM • 4:30 PM • 6:00 PM</span>
                    </div>
                  </div>

                  {/* Address */}
                  <div className="flex items-start gap-4">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mt-1 text-[#B59E74] shrink-0">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                    </svg>
                    <span className="text-gray-700 font-serif leading-relaxed">
                      69 San Pedro Bautista St., San Francisco del Monte, Quezon City, Philippines, 1104
                    </span>
                  </div>

                  {/* Phone */}
                  <div className="flex items-center gap-4">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-[#B59E74] shrink-0">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.864-1.051l-3.21-.535a1.125 1.125 0 0 0-1.227.598l-.959 1.918c-2.434-1.122-4.45-3.138-5.572-5.572l1.918-.959a1.125 1.125 0 0 0 .598-1.227l-.535-3.21C7.716 2.601 7.266 2.25 6.75 2.25H5.378a2.25 2.25 0 0 0-2.25 2.25v1.372c0 .408.036.812.106 1.21Z" />
                    </svg>
                    <span className="text-gray-700 font-serif leading-relaxed">271482136</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- OUR PASTORS SECTION --- */}
      <section className="bg-white w-full pb-32 pt-8 px-6 mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-500 tracking-wide">Our Pastors:</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 md:gap-8">
          {pastors.map((p) => (
            <PastorProfile key={p.id} name={p.name} role={p.role} image={p.image} />
          ))}
        </div>
      </section>
    </div>
  );
}

export default AboutUsPage;
