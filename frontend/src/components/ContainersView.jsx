import { useState, useEffect } from 'react';
import { config } from '../config/appConfig';

function ContainersView() {
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch containers data
  const fetchContainers = async () => {
    try {
      setError(null);
      const response = await fetch(`${config.API_BASE_URL}/api/containers/all?limit=100`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setContainers(data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching containers:', err);
      setError('Error loading containers data');
      setLoading(false);
    }
  };

  // Auto-refresh every 5 seconds
  useEffect(() => {
    fetchContainers();
    
    const interval = setInterval(() => {
      fetchContainers();
    }, 5000); // Refresh every 5 seconds
    
    return () => clearInterval(interval);
  }, []);

  // Format timestamp to readable date
  const formatDate = (timestamp) => {
    const date = new Date(parseInt(timestamp));
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="glassmorphism-strong rounded-3xl p-8 text-center max-w-md">
          <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-white/70 mb-4">{error}</p>
          <button
            onClick={fetchContainers}
            className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header Card */}
      <div className="glassmorphism-strong rounded-3xl p-6 mb-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white">Container Detection</h2>
              <p className="text-white/60 text-sm">Real-time container tracking with ISO 6346 codes</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl px-4 py-2">
              <p className="text-white/60 text-xs">Total Detected</p>
              <p className="text-white text-2xl font-bold">{containers.length}</p>
            </div>
            <button
              onClick={fetchContainers}
              className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all duration-300"
              title="Refresh data"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="glassmorphism-strong rounded-3xl shadow-lg overflow-hidden">
        {containers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white/80 uppercase tracking-wider">
                    ISO Code
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white/80 uppercase tracking-wider">
                    Device ID
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white/80 uppercase tracking-wider">
                    Detection Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {containers.map((container, index) => (
                  <tr 
                    key={container.id} 
                    className="hover:bg-white/5 transition-colors duration-200"
                    style={{
                      animation: `fadeIn 0.3s ease-in-out ${index * 0.05}s both`
                    }}
                  >
                    {/* ISO Code */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        <span className="inline-flex items-center px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30">
                          <span className="text-white font-mono font-bold tracking-wider text-lg">
                            {container.iso_code}
                          </span>
                        </span>
                      </div>
                    </td>

                    {/* Device ID */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <div>
                          <span className="text-white font-medium text-sm block">
                            {container.device_id || 'Unknown'}
                          </span>
                          {container.device_name && (
                            <span className="text-white/50 text-xs">
                              {container.device_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Detection Date */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <div>
                          <span className="text-white text-sm font-medium block">
                            {formatDate(container.timestamp_value)}
                          </span>
                          <span className="text-white/40 text-xs">
                            Created: {new Date(container.created_at).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16">
            <svg className="w-20 h-20 text-white/20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p className="text-white/60 text-lg font-medium">No containers detected yet</p>
            <p className="text-white/40 text-sm mt-2">Waiting for Jetson to detect containers...</p>
          </div>
        )}
      </div>

      {/* Auto-refresh indicator */}
      <div className="flex items-center justify-center gap-2 mt-4 text-white/40 text-xs">
        <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></div>
        <span>Auto-refreshing every 5 seconds</span>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

export default ContainersView;