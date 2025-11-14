import React from 'react';

const Header = ({
  isMobile,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  mode,
  handleReturnToLive,
  setIsDateSearchModalOpen,
  setIsAreaHistoryMode,
  setStreamMode,
  setContainersMode,
  setContainersWLMode,
  setReportsMode
}) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 glassmorphism-strong backdrop-blur-xl border-b border-white/10 shadow-2xl">
      <div className="max-w-[98%] mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-20">
          {/* Logo y Título */}
          <div className="flex items-center space-x-3">
            <div className="">
              <img
                src="/logo_dark.png"
                alt="JulsTracker Logo"
                className="w-12 h-12"
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-white bg-clip-text text-transparent">
                JulsTracker
              </h1>
              <p className="text-xs text-white/50 font-medium">Real-time Location Intelligence</p>
            </div>
          </div>

          {/* Navigation - Desktop */}
          {!isMobile && (
            <nav className="flex items-center space-x-1">
              {/* Live Button */}
              <button
                onClick={handleReturnToLive}
                className={`flex items-center text-center cursor-pointer px-3 md:px-4 pb-2 pt-2 border-b-2 transition-all duration-300 ${mode === 'live'
                    ? 'pb-[5px] text-cyan-400 border-cyan-400'
                    : 'text-white/50 border-transparent hover:text-white'
                  }`}
              >
                <svg
                  className="w-5 h-5 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                Live
              </button>

              {/* History Button */}
              {/*<button
                onClick={() => setIsDateSearchModalOpen(true)}
                className={`flex items-center text-center cursor-pointer px-3 md:px-4 pb-2 pt-2 border-b-2 transition-all duration-300 ${
                  mode === 'history'
                    ? 'pb-[5px] text-purple-400 border-purple-400'
                    : 'text-white/50 border-transparent hover:text-white'
                }`}
              >
                <svg
                  className="w-5 h-5 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                History
              </button>*/}

              {/* Area History Button */}
              <button
                onClick={setIsAreaHistoryMode}
                className={`flex items-center text-center cursor-pointer px-3 md:px-4 pb-2 pt-2 border-b-2 transition-all duration-300 ${mode === 'areaHistory'
                    ? 'pb-[5px] text-emerald-400 border-emerald-400'
                    : 'text-white/50 border-transparent hover:text-white'
                  }`}
              >
                <svg
                  className="w-5 h-5 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                  />
                </svg>
                Area
              </button>

              {/* Stream Button */}
              <button
                onClick={setStreamMode}
                className={`flex items-center text-center cursor-pointer px-3 md:px-4 pb-2 pt-2 border-b-2 transition-all duration-300 ${mode === 'stream'
                    ? 'pb-[5px] text-pink-400 border-pink-400'
                    : 'text-white/50 border-transparent hover:text-white'
                  }`}
              >
                <svg
                  className="w-5 h-5 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                Stream
              </button>

              {/* Containers Button */}
              <button
                onClick={setContainersMode}
                className={`flex items-center text-center cursor-pointer px-3 md:px-4 pb-2 pt-2 border-b-2 transition-all duration-300 ${mode === 'containers'
                    ? 'pb-[5px] text-orange-400 border-orange-400'
                    : 'text-white/50 border-transparent hover:text-white'
                  }`}
              >
                <svg
                  className="w-5 h-5 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
                Containers
              </button>

              {/* Containers WL Button */}
              <button
                onClick={setContainersWLMode}
                className={`flex items-center text-center cursor-pointer px-3 md:px-4 pb-2 pt-2 border-b-2 transition-all duration-300 ${mode === 'containersWL'
                    ? 'pb-[5px] text-amber-400 border-amber-400'
                    : 'text-white/50 border-transparent hover:text-white'
                  }`}
              >
                <svg
                  className="w-5 h-5 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                </svg>
                Containers WL
              </button>

              {/* ✨ Reports Button */}
              <button
                onClick={setReportsMode}
                className={`flex items-center text-center cursor-pointer px-3 md:px-4 pb-2 pt-2 border-b-2 transition-all duration-300 ${mode === 'reports'
                    ? 'pb-[5px] text-indigo-400 border-indigo-400'
                    : 'text-white/50 border-transparent hover:text-white'
                  }`}
              >
                <svg
                  className="w-5 h-5 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Reports
              </button>
            </nav>
          )}

          {/* Mobile Menu Button */}
          {isMobile && (
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-300"
            >
              {isMobileMenuOpen ? (
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          )}
        </div>

        {/* Mobile Menu */}
        {isMobile && isMobileMenuOpen && (
          <div className="py-4 space-y-2 border-t border-white/10">
            {/* Live Button Mobile */}
            <button
              onClick={() => {
                handleReturnToLive();
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 mb-2 rounded-xl transition-all ${mode === 'live'
                  ? 'bg-cyan-600/20 text-cyan-400 border-2 border-cyan-400'
                  : 'bg-white/10 text-white hover:bg-white/20'
                }`}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              Live Mode
            </button>

            {/* History Button Mobile
            <button
              onClick={() => {
                setIsDateSearchModalOpen(true);
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 mb-2 rounded-xl transition-all ${
                mode === 'history'
                  ? 'bg-purple-600/20 text-purple-400 border-2 border-purple-400'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              History Search
            </button> */}

            {/* Area History Button Mobile */}
            <button
              onClick={() => {
                setIsAreaHistoryMode();
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 mb-2 rounded-xl transition-all ${mode === 'areaHistory'
                  ? 'bg-emerald-600/20 text-emerald-400 border-2 border-emerald-400'
                  : 'bg-white/10 text-white hover:bg-white/20'
                }`}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                />
              </svg>
              Area History
            </button>

            {/* Stream Button Mobile */}
            <button
              onClick={() => {
                setStreamMode();
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 mb-2 rounded-xl transition-all ${mode === 'stream'
                  ? 'bg-pink-600/20 text-pink-400 border-2 border-pink-400'
                  : 'bg-white/10 text-white hover:bg-white/20'
                }`}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              Stream Viewer
            </button>

            {/* Containers Button Mobile */}
            <button
              onClick={() => {
                setContainersMode();
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 mb-2 rounded-xl transition-all ${mode === 'containers'
                  ? 'bg-orange-600/20 text-orange-400 border-2 border-orange-400'
                  : 'bg-white/10 text-white hover:bg-white/20'
                }`}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
              Containers
            </button>

            {/* Containers WL Button Mobile */}
            <button
              onClick={() => {
                setContainersWLMode();
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 mb-2 rounded-xl transition-all ${mode === 'containersWL'
                  ? 'bg-amber-600/20 text-amber-400 border-2 border-amber-400'
                  : 'bg-white/10 text-white hover:bg-white/20'
                }`}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
              Containers WL
            </button>

            {/* ✨ Reports Button Mobile */}
            <button
              onClick={() => {
                setReportsMode();
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 mb-2 rounded-xl transition-all ${mode === 'reports'
                  ? 'bg-indigo-600/20 text-indigo-400 border-2 border-indigo-400'
                  : 'bg-white/10 text-white hover:bg-white/20'
                }`}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6M5 7h14a2 2 0 012 2v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 00-2-2H7a2 2 0 00-2 2v11a2 2 0 01-2 2z"
                />
              </svg>
              Reports
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;