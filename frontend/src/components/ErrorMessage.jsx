const ErrorMessage = ({ error, onRetry, onReturnToLive, isNoDataError }) => (
  <div className="glassmorphism-strong rounded-4xl min-w-[90%] md:min-w-0 md:max-w-md mx-auto p-8 text-center">
    <div className="text-red-400 mb-4">
      <svg className="w-12 h-12 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      <h3 className="text-xl font-bold">
        {isNoDataError ? 'No Data Found' : 'Error de Conexión'}
      </h3>
    </div>
    <p className="text-white/70 mb-4">{error}</p>

    {isNoDataError ? (
      <button
        onClick={onReturnToLive}
        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white rounded-xl shadow-lg transition-all font-medium mx-auto"
      >
        Return to Live
      </button>
    ) : (
      <button onClick={onRetry} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors">
        Reintentar
      </button>
    )}
  </div>
);

export default ErrorMessage;
