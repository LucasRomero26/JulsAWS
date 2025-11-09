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
            
            // Intentar obtener el timestamp de múltiples fuentes
            let timestamp = null;
            
            // Opción 1: route.data
            if (route.data && route.data[pointIndexInRoute]) {
              const point = route.data[pointIndexInRoute];
              timestamp = point.timestamp_value || point.created_at || point.timestamp;
            }
            
            // Opción 2: route.points
            if (!timestamp && route.points && route.points[pointIndexInRoute]) {
              const point = route.points[pointIndexInRoute];
              timestamp = point.timestamp_value || point.created_at || point.timestamp;
            }
            
            // Opción 3: route.timestamps array
            if (!timestamp && route.timestamps && route.timestamps[pointIndexInRoute]) {
              timestamp = route.timestamps[pointIndexInRoute];
            }

            // Opción 4: Interpolar entre startTime y endTime
            if (!timestamp && route.startTime && route.endTime) {
              const progress = pointIndexInRoute / (routeLength - 1);
              timestamp = route.startTime + (route.endTime - route.startTime) * progress;
            }

            console.log('Timeline point info:', {
              deviceId,
              routeId: route.id,
              pointIndex: pointIndexInRoute,
              timestamp,
              hasData: !!route.data,
              hasPoints: !!route.points,
              hasTimestamps: !!route.timestamps
            });
            
            return {
              deviceId,
              routeId: route.id,
              timestamp,
              pointIndex: pointIndexInRoute,
              totalPointsInRoute: routeLength
            };
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
    if (!timestamp) {
      console.log('No timestamp provided to formatTimestamp');
      return 'N/A';
    }
    
    try {
      // Si el timestamp es un número, asumimos que está en milisegundos
      const date = new Date(typeof timestamp === 'number' ? timestamp : parseInt(timestamp));
      
      // Verificar si la fecha es válida
      if (isNaN(date.getTime())) {
        console.log('Invalid date from timestamp:', timestamp);
        return 'Invalid Date';
      }
      
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('Error formatting timestamp:', error, 'timestamp:', timestamp);
      return 'Error';
    }
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
                onTimelineChange(0);
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

      {/* Current Point Information - Solo timestamp */}
      {currentPointInfo ? (
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
          <div className="text-white/60 text-sm mb-2">Current Time</div>
          <div className="text-white font-bold text-lg">
            {formatTimestamp(currentPointInfo.timestamp)}
          </div>
          <div className="text-white/40 text-xs mt-2">
            Point {Math.floor((timelinePosition / 100) * totalPoints)} of {totalPoints}
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
          <div className="text-white/60 text-sm">Loading timeline data...</div>
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