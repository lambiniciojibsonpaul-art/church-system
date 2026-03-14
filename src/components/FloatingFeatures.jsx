function FloatingFeatures() {
    return (
        <section className="relative w-full z-20 -mt-24 pb-24 px-6">
            <div className="bg-[#F6F5ED] rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] max-w-7xl mx-auto py-20 px-12">
                
                <div className="text-center max-w-5xl mx-auto mb-16">
                    <h2 className="text-3xl md:text-4xl text-[#B59E74] font-serif uppercase tracking-widest mb-6 font-medium">
                        Our Parish Community
                    </h2>
                    
                    <p className="text-gray-700 font-serif text-lg md:text-xl leading-relaxed max-w-4xl mx-auto">
                        We welcome everyone to celebrate faith, love, and unity at San Pedro Bautista Church. Discover our services, join our events, and grow together in Christ.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16">
                    {/* Faith */}
                    <div className="flex flex-col items-center gap-6">
                        <div className="w-20 h-20 rounded-full bg-white/70 flex items-center justify-center text-[#3070C0]">
                            <span className="text-5xl font-bold">+</span>
                        </div>
                        <h3 className="text-xl text-[#B59E74] font-serif uppercase tracking-widest font-medium mt-6 mb-4">
                            Faith
                        </h3>
                        <p className="text-gray-700 font-serif text-base leading-relaxed max-w-sm mx-auto text-center">
                            Deepen your spiritual journey through worship and prayer.
                        </p>
                    </div>

                    {/* Community */}
                    <div className="flex flex-col items-center gap-6">
                        <div className="w-20 h-20 rounded-full bg-white/70 flex items-center justify-center text-[#3070C0]">
                            <span className="text-5xl font-bold">♥</span>
                        </div>
                        <h3 className="text-xl text-[#B59E74] font-serif uppercase tracking-widest font-medium mt-6 mb-4">
                            Community
                        </h3>
                        <p className="text-gray-700 font-serif text-base leading-relaxed max-w-sm mx-auto text-center">
                            Be part of a caring parish family that supports one another.
                        </p>
                    </div>

                    {/* Learning */}
                    <div className="flex flex-col items-center gap-6">
                        <div className="w-20 h-20 rounded-full bg-white/70 flex items-center justify-center text-[#3070C0]">
                            <span className="text-5xl font-bold">📖</span>
                        </div>
                        <h3 className="text-xl text-[#B59E74] font-serif uppercase tracking-widest font-medium mt-6 mb-4">
                            Learning
                        </h3>
                        <p className="text-gray-700 font-serif text-base leading-relaxed max-w-sm mx-auto text-center">
                            Grow in knowledge through Bible study and catechism.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default FloatingFeatures;