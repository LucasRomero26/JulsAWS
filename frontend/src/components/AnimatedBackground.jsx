const AnimatedBackground = () => (
  <div className="fixed inset-0 -z-10 animate-gradient-shift">
    <div className="absolute inset-0 bg-gradient-to-br from-[#011640] via-[#163e57] to-[#052940]"></div>
    <div className="absolute inset-0 bg-gradient-to-tl from-[#052940] via-[#0a1a2e] to-[#16213e] opacity-70 animate-gradient-overlay"></div>
    <div className="absolute inset-0 opacity-20">
      <div className="absolute top-20 left-10 w-72 h-72 md:w-96 md:h-96 bg-[#0092b8] rounded-full filter blur-3xl opacity-30 animate-float-slow"></div>
      <div className="absolute bottom-20 right-10 w-64 h-64 md:w-80 md:h-80 bg-[#163e57] rounded-full filter blur-3xl opacity-25 animate-float-slower"></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 md:w-64 md:h-64 bg-[#052940] rounded-full filter blur-3xl opacity-20 animate-float"></div>
    </div>
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#0092b8]/5 to-transparent animate-shimmer"></div>
  </div>
);

export default AnimatedBackground;
