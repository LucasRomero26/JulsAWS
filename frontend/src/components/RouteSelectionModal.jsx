import { useState, useEffect } from 'react';
import { getDeviceColor } from '../utils/colorManager';
import { formatDuration, formatDistance, getRouteColor } from '../utils/pathUtils';

/**
 * Modal to display and select individual routes for each device in area history
 */
const RouteSelectionModal = ({ isOpen, onClose, deviceRoutes, selectedRoutes, onRouteToggle }) => {
  const [expandedDevices, setExpandedDevices] = useState(new Set());

  // Auto-expand devices when modal opens
  useEffect(() => {
    if (isOpen && deviceRoutes) {
      // Expand all devices by default
      const allDeviceIds = Object.keys(deviceRoutes);
      setExpandedDevices(new Set(allDeviceIds));
    }
  }, [isOpen, deviceRoutes]);

  if (!isOpen) return null;

  const toggleDevice = (deviceId) => {
    setExpandedDevices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(deviceId)) {
        newSet.delete(deviceId);
      } else {
        newSet.add(deviceId);
      }
      return newSet;
    });
  };

  const getTotalSelectedRoutes = () => {
    return Object.values(selectedRoutes).reduce((total, routes) => total + routes.length, 0);
  };

  const getTotalAvailableRoutes = () => {
    return Object.values(deviceRoutes).reduce((total, routes) => total + routes.length, 0);
  };

  const selectAllRoutesForDevice = (deviceId) => {
    const routes = deviceRoutes[deviceId];
    if (!routes) return;

    const allRouteIds = routes.map(r => r.id);
    const currentSelected = selectedRoutes[deviceId] || [];
    
    if (currentSelected.length === allRouteIds.length) {
      // Deselect all
      allRouteIds.forEach(routeId => onRouteToggle(deviceId, routeId));
    } else {
      // Select all
      allRouteIds.forEach(routeId => {
        if (!currentSelected.includes(routeId)) {
          onRouteToggle(deviceId, routeId);
        }
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative glassmorphism-strong rounded-4xl w-full max-w-4xl max-h-[90vh] overflow-hidden transform">
        {/* Header */}
        <div className="sticky top-0 z-10 glassmorphism-strong rounded-t-4xl p-6 border-b border-white/10">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-white">Route Selection</h2>
              <p className="text-sm text-white/60 mt-1">
                {getTotalSelectedRoutes()} of {getTotalAvailableRoutes()} routes selected
              </p>
            </div>
            <button onClick={onClose} className="text-white/60 cursor-pointer hover:text-white p-1">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)] custom-scrollbar">
          {Object.keys(deviceRoutes).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(deviceRoutes).map(([deviceId, routes]) => {
                const deviceColor = getDeviceColor(deviceId);
                const isExpanded = expandedDevices.has(deviceId);
                const deviceSelectedRoutes = selectedRoutes[deviceId] || [];
                const allSelected = deviceSelectedRoutes.length === routes.length;
                const someSelected = deviceSelectedRoutes.length > 0 && !allSelected;

                // Find device name
                const deviceName = routes[0]?.points[0]?.device_name || deviceId;

                return (
                  <div key={deviceId} className="glassmorphism rounded-2xl overflow-hidden border border-white/10">
                    {/* Device Header */}
                    <div 
                      className="p-4 cursor-pointer hover:bg-white/5 transition-all"
                      style={{ borderLeft: `4px solid ${deviceColor.hex}` }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1" onClick={() => toggleDevice(deviceId)}>
                          <svg 
                            className={`w-5 h-5 text-white transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          <div
                            className="w-4 h-4 rounded-full flex-shrink-0"
                            style={{ backgroundColor: deviceColor.hex }}
                          ></div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-white">{deviceName}</h3>
                            <p className="text-xs text-white/60">
                              {routes.length} route{routes.length !== 1 ? 's' : ''} found · {deviceSelectedRoutes.length} selected
                            </p>
                          </div>
                        </div>
                        
                        {/* Select All Checkbox */}
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            selectAllRoutesForDevice(deviceId);
                          }}
                          className={`w-6 h-6 rounded border-2 flex items-center justify-center cursor-pointer transition-all ${
                            allSelected ? 'border-opacity-100' : 'border-white/30'
                          }`}
                          style={
                            allSelected
                              ? { backgroundColor: deviceColor.hex, borderColor: deviceColor.hex }
                              : someSelected
                              ? { backgroundColor: `${deviceColor.hex}40`, borderColor: deviceColor.hex }
                              : {}
                          }
                        >
                          {allSelected && (
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                          {someSelected && !allSelected && (
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: deviceColor.hex }}></div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Routes List */}
                    {isExpanded && (
                      <div className="p-4 pt-0 space-y-2">
                        {routes.map((route, index) => {
                          const isSelected = deviceSelectedRoutes.includes(route.id);
                          const routeColor = getRouteColor(deviceColor.hex, index, routes.length);
                          const distance = route.distance || 0;

                          return (
                            <div
                              key={route.id}
                              onClick={() => onRouteToggle(deviceId, route.id)}
                              className={`p-4 rounded-xl cursor-pointer transition-all duration-300 border-2 ${
                                isSelected
                                  ? 'border-opacity-80 shadow-lg'
                                  : 'border-white/10 hover:border-white/20'
                              }`}
                              style={
                                isSelected
                                  ? {
                                      backgroundColor: `${routeColor}20`,
                                      borderColor: routeColor,
                                      boxShadow: `0 5px 15px ${routeColor}30`,
                                    }
                                  : {}
                              }
                            >
                              <div className="flex items-start gap-3">
                                {/* Checkbox */}
                                <div
                                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 mt-0.5 ${
                                    isSelected ? 'border-opacity-100' : 'border-white/30'
                                  }`}
                                  style={
                                    isSelected
                                      ? { backgroundColor: routeColor, borderColor: routeColor }
                                      : {}
                                  }
                                >
                                  {isSelected && (
                                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </div>

                                {/* Route Info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span
                                      className="px-2 py-1 rounded-lg text-xs font-semibold text-white"
                                      style={{ backgroundColor: routeColor }}
                                    >
                                      Route {index + 1}
                                    </span>
                                    <span className="text-xs text-white/60">
                                      {route.pointCount} point{route.pointCount !== 1 ? 's' : ''}
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                    <div>
                                      <p className="text-white/70 text-xs">Start</p>
                                      <p className="text-white font-medium truncate">{route.startTimestamp}</p>
                                    </div>
                                    <div>
                                      <p className="text-white/70 text-xs">End</p>
                                      <p className="text-white font-medium truncate">{route.endTimestamp}</p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-4 mt-3 text-xs text-white/60">
                                    <div className="flex items-center gap-1">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      <span>{formatDuration(route.duration)}</span>
                                    </div>
                                    {distance > 0 && (
                                      <div className="flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                        </svg>
                                        <span>{formatDistance(distance)}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Color indicator */}
                                <div
                                  className="w-1 h-full rounded-full flex-shrink-0"
                                  style={{ backgroundColor: routeColor }}
                                ></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <svg
                className="w-16 h-16 mx-auto text-white/30 mb-4"
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
              <p className="text-white/50">No routes available</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 z-10 glassmorphism-strong rounded-b-4xl p-6 border-t border-white/10">
          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 text-white rounded-xl transition-all font-medium"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RouteSelectionModal;
