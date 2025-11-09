import { useState, useEffect } from 'react';

/**
 * TimelineSlider - Component to control route playback with a slider
 * Shows date/time information for the current point
 */
const TimelineSlider = ({ 
  deviceRoutes, 
  selectedRoutes, 
  onTimelineChange,
  className = '' 
}) => {
  const [timelinePosition, setTimelinePosition] = useState(100);
  const [currentPointInfo, setCurrentPointInfo] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // Calculate total points across all selected routes
  const getTotalPoints = () => {
    let total = 0;
    Object.keys(deviceRoutes).forEach(deviceId => {
      const routes = deviceRoutes[deviceId];
      const selectedRouteIds = selectedRoutes[deviceId] || [];
      
      routes.forEach(route => {
        if (selectedRouteIds.includes(route.id)) {
          total += route.coordinates.length;
        }
      });
    });
    return total;
  };

  // Get point info at current timeline position
  const getPointAtPosition = (position) => {
    const totalPoints = getTotalPoints();
    if (totalPoints === 0) return null;

    const targetIndex = Math.floor((position / 100) * (totalPoints - 1));
    let currentIndex = 0;

    // Find the point at the target index
    for (const deviceId of Object.keys(deviceRoutes)) {
      const routes = deviceRoutes[deviceId];
      const selectedRouteIds = selectedRoutes[deviceId] || [];

      for (const route of routes) {
        if (selectedRouteIds.includes(route.id)) {
          const routeLength = route.coordinates.length;
          
          if (currentIndex + routeLength > targetIndex) {
            const pointIndexInRoute = targetIndex - currentIndex;
            
            // ✅ CORREGIDO: Verificar que route.data existe y tiene el índice
            if (route.data && route.data[pointIndexInRoute]) {
              const point = route.data[pointIndexInRoute];
              
              return {
                deviceId,
                routeId: route.id,
                timestamp: point.timestamp_value || point.created_at,
                latitude: point.latitude,
                longitude: point.longitude,
                speed: point.speed,
                pointIndex: pointIndexInRoute,
                totalPointsInRoute: routeLength
              };
            } else {
              // Si no hay data, usar las coordenadas directamente
              const coord = route.coordinates[pointIndexInRoute];
              return {
                deviceId,
                routeId: route.id,
                timestamp: null,
                latitude: coord[0],
                longitude: coord[1],
                speed: null,
                pointIndex: pointIndexInRoute,
                totalPointsInRoute: routeLength
              };
            }
          }
          currentIndex += routeLength;
        }
      }
    }
    return null;
  };

  // Handle slider change
  const handleSliderChange = (e) => {
    const newPosition = parseFloat(e.target.value);
    setTimelinePosition(newPosition);
    setIsPlaying(false);
    
    const pointInfo = getPointAtPosition(newPosition);
    setCurrentPointInfo(pointInfo);
    
    // Notify parent component
    onTimelineChange(newPosition);
  };

  // Auto-play functionality
  useEffect(() => {
    let interval;
    if (isPlaying && timelinePosition < 100) {
      interval = setInterval(() => {
        setTimelinePosition(prev => {
          const newPos = Math.min(prev + (0.5 * playbackSpeed), 100);
          if (newPos >= 100) {
            setIsPlaying(false);
          }
          onTimelineChange(newPos);
          return newPos;
        });
      }, 50);
    } else if (timelinePosition >= 100 && isPlaying) {
      setIsPlaying(false);
    }
    return () => clearInterval(interval);
  }, [isPlaying, timelinePosition, playbackSpeed, onTimelineChange]);

  // Update current point info when timeline position changes
  useEffect(() => {
    const pointInfo = getPointAtPosition(timelinePosition);
    setCurrentPointInfo(pointInfo);
  }, [timelinePosition, deviceRoutes, selectedRoutes]);

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const totalPoints = getTotalPoints();
  if (totalPoints === 0) return null;

  return (
    <div className={`glassmorphism-strong rounded-3xl p-5 shadow-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold text-lg flex items-center gap-2">
          <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Route Timeline
        </h3>
        
        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          {/* Speed Control */}
          <select
            value={playbackSpeed}
            onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
            className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white text-sm focus:border-cyan-500 focus:outline-none"
          >
            <option value="0.5">0.5x</option>
            <option value="1">1x</option>
            <option value="2">2x</option>
            <option value="5">5x</option>
          </select>

          {/* Play/Pause Button */}
          <button
            onClick={() => {
              if (timelinePosition >= 100) {
                setTimelinePosition(0);
              }
              setIsPlaying(!isPlaying);
            }}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white transition-all"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Reset Button */}
          <button
            onClick={() => {
              setTimelinePosition(100);
              setIsPlaying(false);
              onTimelineChange(100);
            }}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all"
            title="Reset to end"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Slider */}
      <div className="mb-4">
        <input
          type="range"
          min="0"
          max="100"
          step="0.1"
          value={timelinePosition}
          onChange={handleSliderChange}
          className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider-thumb"
          style={{
            background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${timelinePosition}%, rgba(255,255,255,0.2) ${timelinePosition}%, rgba(255,255,255,0.2) 100%)`
          }}
        />
        <div className="flex justify-between mt-2 text-xs text-white/60">
          <span>Start</span>
          <span>{timelinePosition.toFixed(1)}%</span>
          <span>End</span>
        </div>
      </div>

      {/* Current Point Information */}
      {currentPointInfo && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
          <div>
            <div className="text-white/60 text-xs mb-1">Current Time</div>
            <div className="text-white font-semibold text-sm">
              {formatTimestamp(currentPointInfo.timestamp)}
            </div>
          </div>
          
          <div>
            <div className="text-white/60 text-xs mb-1">Position</div>
            <div className="text-white font-semibold text-sm">
              {currentPointInfo.latitude?.toFixed(6)}, {currentPointInfo.longitude?.toFixed(6)}
            </div>
          </div>

          {currentPointInfo.speed !== undefined && currentPointInfo.speed !== null && (
            <div>
              <div className="text-white/60 text-xs mb-1">Speed</div>
              <div className="text-white font-semibold text-sm">
                {currentPointInfo.speed} km/h
              </div>
            </div>
          )}

          <div>
            <div className="text-white/60 text-xs mb-1">Progress</div>
            <div className="text-white font-semibold text-sm">
              Point {Math.floor((timelinePosition / 100) * totalPoints)} of {totalPoints}
            </div>
          </div>
        </div>
      )}

      {/* CSS for custom slider thumb */}
      <style jsx>{`
        .slider-thumb::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #06b6d4;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(6, 182, 212, 0.5);
          transition: all 0.2s;
        }

        .slider-thumb::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 4px 12px rgba(6, 182, 212, 0.7);
        }

        .slider-thumb::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #06b6d4;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 8px rgba(6, 182, 212, 0.5);
          transition: all 0.2s;
        }

        .slider-thumb::-moz-range-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 4px 12px rgba(6, 182, 212, 0.7);
        }
      `}</style>
    </div>
  );
};

export default TimelineSlider;