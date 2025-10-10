import { useState } from 'react';
import { formatRouteDateTime, formatDuration } from '../utils/routeGrouping';

/**
 * RoutePanel - Displays a list of routes/trips for a device with ability to toggle visibility
 * @param {Object} props
 * @param {string} props.deviceId - Device identifier
 * @param {string} props.deviceName - Device name
 * @param {Array} props.routes - Array of route objects with metadata
 * @param {Array} props.visibleRoutes - Array of visible route IDs
 * @param {Function} props.onRouteToggle - Callback when route visibility is toggled
 * @param {Function} props.onClose - Callback to close the panel
 */
const RoutePanel = ({ deviceId, deviceName, routes, visibleRoutes, onRouteToggle, onClose }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!routes || routes.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-24 right-4 w-96 max-h-[calc(100vh-7rem)] glassmorphism-strong border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-white/70 hover:text-white transition-colors"
          >
            <svg 
              className={`w-5 h-5 transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <div>
            <h3 className="text-lg font-bold text-white">{deviceName}</h3>
            <p className="text-xs text-white/60">
              {routes.length} route{routes.length !== 1 ? 's' : ''} found
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-white/70 hover:text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Routes List */}
      {isExpanded && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {routes.map((route) => {
            const isVisible = visibleRoutes.includes(route.id);
            const startDateTime = formatRouteDateTime(route.startTime);
            const endDateTime = formatRouteDateTime(route.endTime);
            const duration = formatDuration(route.duration);
            
            // Check if start and end are on the same day
            const sameDay = startDateTime.date === endDateTime.date;

            return (
              <div
                key={route.id}
                onClick={() => onRouteToggle(deviceId, route.id)}
                className={`p-4 rounded-lg cursor-pointer transition-all duration-300 border-2 ${
                  isVisible
                    ? 'border-opacity-80 shadow-lg'
                    : 'border-white/10 hover:border-white/20 opacity-60'
                }`}
                style={
                  isVisible
                    ? {
                        backgroundColor: `${route.color}30`,
                        borderColor: route.color,
                        boxShadow: `0 4px 12px ${route.color}40`,
                      }
                    : { backgroundColor: 'rgba(255,255,255,0.03)' }
                }
              >
                {/* Route Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {/* Checkbox/Eye Icon */}
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                        isVisible ? 'border-opacity-100' : 'border-white/30'
                      }`}
                      style={
                        isVisible
                          ? { backgroundColor: route.color, borderColor: route.color }
                          : {}
                      }
                    >
                      {isVisible && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="font-semibold text-white">Route {route.routeNumber}</span>
                  </div>
                  
                  {/* Color indicator */}
                  <div
                    className="w-8 h-3 rounded-full"
                    style={{ backgroundColor: route.color }}
                  ></div>
                </div>

                {/* Route Details */}
                <div className="space-y-2 text-sm">
                  {/* Start Time */}
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-white/90 font-medium">Start</p>
                      <p className="text-white/70 text-xs">{startDateTime.date}</p>
                      <p className="text-white/60 text-xs">{startDateTime.time}</p>
                    </div>
                  </div>

                  {/* End Time */}
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-white/90 font-medium">End</p>
                      {!sameDay && <p className="text-white/70 text-xs">{endDateTime.date}</p>}
                      <p className="text-white/60 text-xs">{endDateTime.time}</p>
                    </div>
                  </div>

                  {/* Duration and Points */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/10">
                    <div className="flex items-center gap-1 text-white/70">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3" />
                      </svg>
                      <span className="text-xs">{duration}</span>
                    </div>
                    <div className="flex items-center gap-1 text-white/70">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-xs">{route.pointCount} points</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div className="p-3 border-t border-white/10 bg-white/5">
        <p className="text-xs text-white/50 text-center">
          Click on a route to show/hide it on the map
        </p>
      </div>
    </div>
  );
};

export default RoutePanel;
