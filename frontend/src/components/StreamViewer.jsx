import { useState, useEffect, useRef } from 'react';
import { useWebRTC } from '../hooks/useWebRTC';

const StreamViewer = () => {
  const {
    devices,
    selectedDevice,
    stream,
    connectionState,
    error,
    isConnecting,
    connectToDevice,
    disconnectStream
  } = useWebRTC();

  const [streamingDevices, setStreamingDevices] = useState({});
  const [layout, setLayout] = useState('grid'); // 'grid', 'single', 'list'
  const videoRefs = useRef({});

  // Efecto para actualizar el video cuando se recibe un stream
  useEffect(() => {
    if (stream && selectedDevice) {
      const videoElement = videoRefs.current[selectedDevice];
      if (videoElement && videoElement.srcObject !== stream) {
        videoElement.srcObject = stream;
        videoElement.play().catch(err => {
          console.error('Error playing video:', err);
        });

        // Actualizar el estado de dispositivos transmitiendo
        setStreamingDevices(prev => ({
          ...prev,
          [selectedDevice]: {
            stream,
            state: 'streaming',
            startTime: Date.now()
          }
        }));
      }
    }
  }, [stream, selectedDevice]);

  // Limpiar streams cuando se desmonta el componente
  useEffect(() => {
    return () => {
      Object.values(videoRefs.current).forEach(video => {
        if (video && video.srcObject) {
          video.srcObject.getTracks().forEach(track => track.stop());
          video.srcObject = null;
        }
      });
    };
  }, []);

  const handleDeviceClick = (deviceId) => {
    if (selectedDevice === deviceId) {
      // Si ya está conectado, desconectar
      disconnectStream();
      setStreamingDevices(prev => {
        const newState = { ...prev };
        delete newState[deviceId];
        return newState;
      });
    } else {
      // Conectar al nuevo dispositivo
      connectToDevice(deviceId);
    }
  };

  const getConnectionStateColor = (state) => {
    switch (state) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
      case 'requesting':
        return 'bg-yellow-500 animate-pulse';
      case 'streaming':
        return 'bg-red-500 animate-pulse';
      case 'disconnected':
        return 'bg-gray-500';
      case 'failed':
        return 'bg-red-600';
      default:
        return 'bg-gray-400';
    }
  };

  const getConnectionStateText = (state) => {
    switch (state) {
      case 'connected':
        return 'Connected';
      case 'connecting':
      case 'requesting':
        return 'Connecting...';
      case 'streaming':
        return 'Live';
      case 'disconnected':
        return 'Disconnected';
      case 'failed':
        return 'Failed';
      default:
        return 'Unknown';
    }
  };

  const getGridColumns = () => {
    const deviceCount = devices.length;
    if (deviceCount === 1) return 'grid-cols-1';
    if (deviceCount === 2) return 'grid-cols-1 md:grid-cols-2';
    if (deviceCount <= 4) return 'grid-cols-1 md:grid-cols-2';
    if (deviceCount <= 6) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
    return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
  };

  return (
    <div className="w-full h-full min-h-[calc(100vh-12rem)] space-y-4">
      {/* Header Section */}
      <div className="glassmorphism-strong rounded-3xl p-6 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
              🎥 Live Video Streaming
            </h2>
            <p className="text-white/70">
              {devices.length === 0 
                ? 'Waiting for available devices...' 
                : `${devices.length} device${devices.length !== 1 ? 's' : ''} available`}
            </p>
          </div>

          {/* Layout Toggle */}
          <div className="flex items-center gap-2 bg-white/10 rounded-xl p-1">
            <button
              onClick={() => setLayout('grid')}
              className={`px-4 py-2 rounded-lg transition-all ${
                layout === 'grid'
                  ? 'bg-cyan-600 text-white'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
              title="Grid View"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setLayout('list')}
              className={`px-4 py-2 rounded-lg transition-all ${
                layout === 'list'
                  ? 'bg-cyan-600 text-white'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
              title="List View"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-xl">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-red-300">{error}</p>
            </div>
          </div>
        )}
      </div>

      {/* Devices Grid/List */}
      {devices.length === 0 ? (
        <div className="glassmorphism-strong rounded-3xl p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <svg className="w-20 h-20 text-white/30 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
              </svg>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="w-3 h-3 bg-cyan-500 rounded-full animate-ping"></div>
              </div>
            </div>
            <h3 className="text-xl text-white/70 font-semibold">Waiting for Broadcasting Devices</h3>
            <p className="text-white/50">No devices are currently streaming video</p>
          </div>
        </div>
      ) : (
        <div className={`grid ${layout === 'grid' ? getGridColumns() : 'grid-cols-1'} gap-6`}>
          {devices.map((deviceId) => {
            const isActive = selectedDevice === deviceId;
            const deviceStream = streamingDevices[deviceId];

            return (
              <div
                key={deviceId}
                className="glassmorphism-strong rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300"
              >
                {/* Device Header */}
                <div className="p-4 border-b border-white/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        isActive && deviceStream 
                          ? getConnectionStateColor('streaming')
                          : isActive && isConnecting
                          ? getConnectionStateColor('connecting')
                          : getConnectionStateColor('disconnected')
                      }`}></div>
                      <div>
                        <h3 className="text-white font-semibold text-lg">{deviceId}</h3>
                        <p className="text-white/50 text-sm">
                          {isActive && deviceStream 
                            ? getConnectionStateText('streaming')
                            : isActive && isConnecting
                            ? getConnectionStateText('connecting')
                            : getConnectionStateText('disconnected')}
                        </p>
                      </div>
                    </div>

                    {/* Control Button */}
                    <button
                      onClick={() => handleDeviceClick(deviceId)}
                      disabled={isConnecting && selectedDevice !== deviceId}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        isActive
                          ? 'bg-red-500 hover:bg-red-600 text-white'
                          : 'bg-cyan-600 hover:bg-cyan-700 text-white disabled:opacity-50 disabled:cursor-not-allowed'
                      }`}
                    >
                      {isActive ? 'Stop' : 'View'}
                    </button>
                  </div>
                </div>

                {/* Video Container */}
                <div className="relative bg-black/50 aspect-video">
                  <video
                    ref={(el) => (videoRefs.current[deviceId] = el)}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-contain"
                  />

                  {/* Placeholder when not streaming */}
                  {(!isActive || !deviceStream) && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      {isActive && isConnecting ? (
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                          <p className="text-white/70">Connecting...</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-4 p-8 text-center">
                          <svg className="w-16 h-16 text-white/30" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                          </svg>
                          <p className="text-white/50">Click "View" to start streaming</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Live Indicator */}
                  {isActive && deviceStream && (
                    <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600 px-3 py-1.5 rounded-lg">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      <span className="text-white text-sm font-semibold">LIVE</span>
                    </div>
                  )}

                  {/* Connection State Indicator */}
                  {isActive && (
                    <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                      <span className="text-white text-xs font-medium">
                        {connectionState.toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Device Info Footer */}
                <div className="p-4 border-t border-white/10">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-white/50">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                      <span>
                        {deviceStream 
                          ? `Streaming for ${Math.floor((Date.now() - deviceStream.startTime) / 1000)}s`
                          : 'Not streaming'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-white/50">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                      </svg>
                      <span>WebRTC</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info Section */}
      <div className="glassmorphism-strong rounded-3xl p-6 shadow-lg">
        <div className="flex items-start gap-3">
          <svg className="w-6 h-6 text-cyan-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div className="flex-1">
            <h4 className="text-white font-semibold mb-2">How it works</h4>
            <ul className="text-white/70 text-sm space-y-1">
              <li>• Broadcasting devices must have their camera enabled and be streaming</li>
              <li>• Click "View" on any device to start receiving the live video stream</li>
              <li>• Video streaming uses WebRTC for low-latency peer-to-peer connections</li>
              <li>• Only one device can be viewed at a time</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StreamViewer;