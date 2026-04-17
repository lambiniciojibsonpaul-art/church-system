function FloatingFeatures() {
  return (
    <section className="relative w-full z-20 -mt-24 pb-24 px-6">
      <div className="bg-[#F6F5ED] rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] max-w-7xl mx-auto py-20 px-12">
        {/* Top Part: Welcoming Message */}
        <div className="text-center max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl text-[#B59E74] font-serif uppercase tracking-widest mb-6 font-medium">
            Our Parish Community
          </h2>

          <p className="text-gray-700 font-serif text-lg md:text-xl leading-relaxed max-w-4xl mx-auto">
            We welcome everyone to celebrate faith, love, and unity at San Pedro
            Bautista Church. Discover our services, join our events, and grow
            together in Christ.
          </p>
        </div>

        {/* The previous 3-column icon grid has been removed. */}
        {/* Ready for the new content to be placed here! */}
      </div>
    </section>
  );
}

export default FloatingFeatures;
