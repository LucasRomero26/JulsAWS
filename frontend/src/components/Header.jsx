import { config } from '../config/appConfig';

const Header = ({ 
  isMobile, 
  isMobileMenuOpen, 
  setIsMobileMenuOpen, 
  mode, // 'live', 'history', or 'areaHistory'
  handleReturnToLive, 
  setIsDateSearchModalOpen,
  setIsAreaHistoryMode 
}) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 glassmorphism-strong py-5 px-6 h-24">
      <div className="max-w-[100%] mx-auto flex items-center justify-between h-full">
        <div className="flex items-center">
          <img className='w-14 h-14' src="./logo_dark.png" alt="Logo" />
          <h1 className="py-1 px-3 text-center font-bold text-white/90 text-2xl md:text-3xl">
            {config.APP_NAME}
          </h1>
        </div>

        {isMobile ? (
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-white hover:text-white/70 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        ) : (
          <div className="flex items-center gap-4 p-1">
            <button
              onClick={handleReturnToLive}
              className={`flex items-center text-center cursor-pointer justify-center gap-2 w-36 text-lg transition-all duration-300 border-b-2 pt-2 ${
                mode === 'live'
                  ? 'pb-[5px] text-cyan-600 border-cyan-600'
                  : 'pb-2 text-white border-transparent hover:text-white/50'
              }`}
            >
              Live Tracking
            </button>
            <button
              onClick={() => setIsDateSearchModalOpen(true)}
              className={`flex items-center text-center cursor-pointer justify-center gap-2 w-36 text-lg transition-all duration-300 border-b-2 pt-2 ${
                mode === 'history'
                  ? 'pb-[5px] text-cyan-600 border-cyan-600'
                  : 'pb-2 text-white/50 border-transparent hover:text-white'
              }`}
            >
              History
            </button>
            <button
              onClick={setIsAreaHistoryMode}
              className={`flex items-center text-center cursor-pointer justify-center gap-2 w-40 text-lg transition-all duration-300 border-b-2 pt-2 ${
                mode === 'areaHistory'
                  ? 'pb-[5px] text-cyan-600 border-cyan-600'
                  : 'pb-2 text-white/50 border-transparent hover:text-white'
              }`}
            >
              History by Area
            </button>
          </div>
        )}
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobile && isMobileMenuOpen && (
        <div className="mt-4 glassmorphism rounded-2xl p-4 animate-fade-in">
          <button
            onClick={handleReturnToLive}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 mb-2 rounded-xl transition-all ${
              mode === 'live'
                ? 'bg-cyan-600/20 text-cyan-600 border-2 border-cyan-600'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            Live Tracking
          </button>
          <button
            onClick={() => {
              setIsDateSearchModalOpen(true);
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 mb-2 rounded-xl transition-all ${
              mode === 'history'
                ? 'bg-cyan-600/20 text-cyan-600 border-2 border-cyan-600'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            History
          </button>
          <button
            onClick={() => {
              setIsAreaHistoryMode();
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all ${
              mode === 'areaHistory'
                ? 'bg-cyan-600/20 text-cyan-600 border-2 border-cyan-600'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            History by Area
          </button>
        </div>
      )}
    </header>
  );
};

export default Header;
