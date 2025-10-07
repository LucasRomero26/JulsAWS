import { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, CircleMarker, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L, { Icon, DivIcon } from 'leaflet';
import { ThreeDot } from 'react-loading-indicators';

// --- MUI Date Picker Imports ---
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { StaticDateTimePicker, DateTimePicker } from '@mui/x-date-pickers';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import dayjs from 'dayjs';

import './App.css';

// --- Basic Configuration ---
const config = {
  API_BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  APP_NAME: 'Juls Tracker',
  APP_SUBTITLE: 'Just UDP Location Service',
  APP_VERSION: '2.0.0',
  POLLING_INTERVAL: import.meta.env.VITE_POLLING_INTERVAL || 5000,
  JAWG_ACCESS_TOKEN: 'icNC49f9tQCM0CwkpIHYIXmvNjTgtAVrdIf3PdM94merPcn8Bcx806NlkILQrOPS',
  JAWG_MAP_ID: 'jawg-dark',
  INACTIVE_TIMEOUT: 20000
};

// --- EXPANDED: Color system based on the entire Tailwind palette ---
const DEVICE_COLORS = [
  // Reds
  { name: 'Red 500', light: '#fecaca', dark: '#7f1d1d', main: '#ef4444', hex: '#ef4444' },
  { name: 'Red 600', light: '#fca5a5', dark: '#991b1b', main: '#dc2626', hex: '#dc2626' },
  { name: 'Rose 500', light: '#fda4af', dark: '#881337', main: '#f43f5e', hex: '#f43f5e' },
  { name: 'Pink 500', light: '#f9a8d4', dark: '#831843', main: '#ec4899', hex: '#ec4899' },

  // Oranges
  { name: 'Orange 500', light: '#fed7aa', dark: '#9a3412', main: '#f97316', hex: '#f97316' },
  { name: 'Orange 600', light: '#fdba74', dark: '#ea580c', main: '#ea580c', hex: '#ea580c' },
  { name: 'Amber 500', light: '#fde68a', dark: '#92400e', main: '#f59e0b', hex: '#f59e0b' },
  { name: 'Yellow 500', light: '#fef3c7', dark: '#78350f', main: '#eab308', hex: '#eab308' },

  // Greens
  { name: 'Lime 500', light: '#d9f99d', dark: '#365314', main: '#84cc16', hex: '#84cc16' },
  { name: 'Green 500', light: '#bbf7d0', dark: '#14532d', main: '#22c55e', hex: '#22c55e' },
  { name: 'Green 600', light: '#86efac', dark: '#166534', main: '#16a34a', hex: '#16a34a' },
  { name: 'Emerald 500', light: '#a7f3d0', dark: '#064e3b', main: '#10b981', hex: '#10b981' },
  { name: 'Teal 500', light: '#99f6e4', dark: '#134e4a', main: '#14b8a6', hex: '#14b8a6' },

  // Cyans & Blues
  { name: 'Cyan 500', light: '#a5f3fc', dark: '#164e63', main: '#06b6d4', hex: '#06b6d4' },
  { name: 'Cyan 600', light: '#67e8f9', dark: '#0891b2', main: '#0891b2', hex: '#0891b2' },
  { name: 'Sky 500', light: '#bae6fd', dark: '#0c4a6e', main: '#0ea5e9', hex: '#0ea5e9' },
  { name: 'Blue 500', light: '#dbeafe', dark: '#1e3a8a', main: '#3b82f6', hex: '#3b82f6' },
  { name: 'Blue 600', light: '#93c5fd', dark: '#1d4ed8', main: '#2563eb', hex: '#2563eb' },
  { name: 'Indigo 500', light: '#c7d2fe', dark: '#312e81', main: '#6366f1', hex: '#6366f1' },

  // Purples
  { name: 'Violet 500', light: '#ddd6fe', dark: '#4c1d95', main: '#8b5cf6', hex: '#8b5cf6' },
  { name: 'Purple 500', light: '#e9d5ff', dark: '#581c87', main: '#a855f7', hex: '#a855f7' },
  { name: 'Purple 600', light: '#d8b4fe', dark: '#7c2d12', main: '#9333ea', hex: '#9333ea' },
  { name: 'Fuchsia 500', light: '#f0abfc', dark: '#701a75', main: '#d946ef', hex: '#d946ef' },

  // Grays & Neutrals
  { name: 'Gray 500', light: '#f3f4f6', dark: '#374151', main: '#6b7280', hex: '#6b7280' },
  { name: 'Slate 500', light: '#f1f5f9', dark: '#334155', main: '#64748b', hex: '#64748b' },
  { name: 'Zinc 500', light: '#f4f4f5', dark: '#3f3f46', main: '#71717a', hex: '#71717a' },
  { name: 'Stone 500', light: '#fafaf9', dark: '#44403c', main: '#78716c', hex: '#78716c' },

  // Additional vibrant colors
  { name: 'Red 400', light: '#f87171', dark: '#dc2626', main: '#f87171', hex: '#f87171' },
  { name: 'Orange 400', light: '#fb923c', dark: '#ea580c', main: '#fb923c', hex: '#fb923c' },
  { name: 'Amber 400', light: '#fbbf24', dark: '#d97706', main: '#fbbf24', hex: '#fbbf24' },
  { name: 'Yellow 400', light: '#facc15', dark: '#ca8a04', main: '#facc15', hex: '#facc15' },
  { name: 'Lime 400', light: '#a3e635', dark: '#65a30d', main: '#a3e635', hex: '#a3e635' },
  { name: 'Green 400', light: '#4ade80', dark: '#16a34a', main: '#4ade80', hex: '#4ade80' },
  { name: 'Emerald 400', light: '#34d399', dark: '#059669', main: '#34d399', hex: '#34d399' },
  { name: 'Teal 400', light: '#2dd4bf', dark: '#0f766e', main: '#2dd4bf', hex: '#2dd4bf' },
  { name: 'Cyan 400', light: '#22d3ee', dark: '#0e7490', main: '#22d3ee', hex: '#22d3ee' },
  { name: 'Sky 400', light: '#38bdf8', dark: '#0284c7', main: '#38bdf8', hex: '#38bdf8' },
  { name: 'Blue 400', light: '#60a5fa', dark: '#2563eb', main: '#60a5fa', hex: '#60a5fa' },
  { name: 'Indigo 400', light: '#818cf8', dark: '#4f46e5', main: '#818cf8', hex: '#818cf8' },
  { name: 'Violet 400', light: '#a78bfa', dark: '#7c3aed', main: '#a78bfa', hex: '#a78bfa' },
  { name: 'Purple 400', light: '#c084fc', dark: '#9333ea', main: '#c084fc', hex: '#c084fc' },
  { name: 'Fuchsia 400', light: '#e879f9', dark: '#c026d3', main: '#e879f9', hex: '#e879f9' },
  { name: 'Pink 400', light: '#f472b6', dark: '#db2777', main: '#f472b6', hex: '#f472b6' },
  { name: 'Rose 400', light: '#fb7185', dark: '#e11d48', main: '#fb7185', hex: '#fb7185' }
];

// --- Function to generate random indexes ---
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// --- IMPROVED: Random color assignment system ---
class DeviceColorManager {
  constructor() {
    this.deviceColorMap = new Map();
    this.availableColorIndices = shuffleArray([...Array(DEVICE_COLORS.length).keys()]);
    this.currentIndex = 0;
  }

  // Assign a persistent random color to a device
  getDeviceColor(deviceId) {
    // If it already has a color assigned, return it
    if (this.deviceColorMap.has(deviceId)) {
      return DEVICE_COLORS[this.deviceColorMap.get(deviceId)];
    }

    // If available colors are exhausted, reshuffle and reset
    if (this.currentIndex >= this.availableColorIndices.length) {
      this.availableColorIndices = shuffleArray([...Array(DEVICE_COLORS.length).keys()]);
      this.currentIndex = 0;
    }

    // Assign the next available random color
    const colorIndex = this.availableColorIndices[this.currentIndex];
    this.deviceColorMap.set(deviceId, colorIndex);
    this.currentIndex++;

    return DEVICE_COLORS[colorIndex];
  }

  // Get the color of an existing device
  getExistingDeviceColor(deviceId) {
    if (this.deviceColorMap.has(deviceId)) {
      return DEVICE_COLORS[this.deviceColorMap.get(deviceId)];
    }
    return null;
  }

  // Remove a device (optional, to clean up when a device is no longer active)
  removeDevice(deviceId) {
    if (this.deviceColorMap.has(deviceId)) {
      const colorIndex = this.deviceColorMap.get(deviceId);
      this.deviceColorMap.delete(deviceId);

      // Add the color back to the available ones randomly
      const randomPosition = Math.floor(Math.random() * (this.availableColorIndices.length + 1));
      this.availableColorIndices.splice(randomPosition, 0, colorIndex);
    }
  }

  // Get all devices with their colors
  getAllDeviceColors() {
    const result = {};
    for (const [deviceId, colorIndex] of this.deviceColorMap) {
      result[deviceId] = DEVICE_COLORS[colorIndex];
    }
    return result;
  }

  // Clean up inactive devices after a while
  cleanupInactiveDevices(activeDeviceIds) {
    const toRemove = [];
    for (const deviceId of this.deviceColorMap.keys()) {
      if (!activeDeviceIds.includes(deviceId)) {
        toRemove.push(deviceId);
      }
    }
    toRemove.forEach(deviceId => this.removeDevice(deviceId));
  }
}

// Global instance of the color manager
const deviceColorManager = new DeviceColorManager();

// Updated function to get the device color
const getDeviceColor = (deviceId) => {
  return deviceColorManager.getDeviceColor(deviceId);
};

// --- Function to create custom circular icons ---
const createCircularIcon = (color, isActive = true, size = 20) => {
  const activeRing = isActive ? `
    <circle cx="25" cy="25" r="22" 
      fill="none" 
      stroke="#10b981" 
      stroke-width="3" 
      opacity="0.8">
      <animate attributeName="r" values="18;25;18" dur="2s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.8;0.3;0.8" dur="2s" repeatCount="indefinite"/>
    </circle>
  ` : '';

  return new DivIcon({
    html: `
      <div style="position: relative; width: 50px; height: 50px;">
        <svg width="50" height="50" viewBox="0 0 50 50" style="position: absolute; top: 0; left: 0;">
          ${activeRing}
          <circle cx="25" cy="25" r="${size}" 
            fill="${color}" 
            stroke="#ffffff" 
            stroke-width="3" 
            opacity="0.9"
            style="filter: drop-shadow(0px 4px 8px rgba(0,0,0,0.3))"/>
          <circle cx="25" cy="25" r="${size - 6}" 
            fill="${color}" 
            opacity="0.7"/>
        </svg>
      </div>
    `,
    className: 'custom-circular-icon',
    iconSize: [50, 50],
    iconAnchor: [25, 25],
    popupAnchor: [0, -25]
  });
};

// Fix for default Leaflet icon in Vite (kept for compatibility)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// --- Utility functions ---
const formatTimestamp = (timestamp) => {
  try {
    let date;

    if (!timestamp) {
      return 'Invalid Date';
    }

    const timestampStr = String(timestamp);

    if (/^\d{13}$/.test(timestampStr)) {
      date = new Date(parseInt(timestampStr));
    } else if (/^\d{10}$/.test(timestampStr)) {
      date = new Date(parseInt(timestampStr) * 1000);
    } else {
      date = new Date(timestamp);
    }

    if (isNaN(date.getTime())) {
      console.warn('Invalid timestamp:', timestamp);
      return 'Invalid Date';
    }

    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch (error) {
    console.error('Error formatting timestamp:', error, timestamp);
    return 'Invalid Date';
  }
};

const isUserActive = (lastUpdate) => {
  try {
    const now = new Date();
    let lastUpdateTime;

    if (!lastUpdate) {
      return false;
    }

    const timestampStr = String(lastUpdate);

    if (/^\d{13}$/.test(timestampStr)) {
      lastUpdateTime = new Date(parseInt(timestampStr));
    } else if (/^\d{10}$/.test(timestampStr)) {
      lastUpdateTime = new Date(parseInt(timestampStr) * 1000);
    } else {
      lastUpdateTime = new Date(lastUpdate);
    }

    if (isNaN(lastUpdateTime.getTime())) {
      return false;
    }

    const timeDifference = now.getTime() - lastUpdateTime.getTime();
    return timeDifference <= config.INACTIVE_TIMEOUT;
  } catch (error) {
    console.error('Error checking user activity:', error, lastUpdate);
    return false;
  }
};

// --- UI Components ---
const LoadingSpinner = () => (
  <div className="flex items-center mx-auto justify-center p-8">
    <ThreeDot color="#FFFFFF" size="medium" text="" textColor="" />
  </div>
);

const ErrorMessage = ({ error, onRetry, onReturnToLive, isNoDataError }) => (
  <div className="glassmorphism-strong rounded-4xl min-w-[90%] md:min-w-0 md:max-w-md mx-auto p-8 text-center">
    <div className="text-red-400 mb-4">
      <svg className="w-12 h-12 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      <h3 className="text-xl font-bold">
        {isNoDataError ? 'No Data Found' : 'Connection Error'}
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
        Retry
      </button>
    )}
  </div>
);

// --- Hook to detect screen size ---
const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    window.addEventListener('resize', listener);
    return () => window.removeEventListener('resize', listener);
  }, [matches, query]);

  return matches;
};

// --- Hook for dynamic viewport height ---
const useViewportHeight = () => {
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);

  useEffect(() => {
    const handleResize = () => {
      setViewportHeight(window.innerHeight);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return viewportHeight;
};

// --- NEW: Search bar component ---
const SearchBar = ({ searchTerm, onSearchChange, placeholder = "Search devices..." }) => {
  return (
    <div className="relative mb-4">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg className="h-5 w-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
        placeholder={placeholder}
      />
      {searchTerm && (
        <button
          onClick={() => onSearchChange('')}
          className="absolute inset-y-0 right-0 pr-3 flex items-center"
        >
          <svg className="h-5 w-5 text-white/50 hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};

// --- IMPROVED: Hook to filter users with search ---
const useFilteredUsers = (users, searchTerm) => {
  return useMemo(() => {
    if (!searchTerm.trim()) {
      return users;
    }

    const term = searchTerm.toLowerCase().trim();
    return users.filter(user => {
      return (
        user.name.toLowerCase().includes(term) ||
        user.deviceId?.toLowerCase().includes(term) ||
        user.id.toLowerCase().includes(term)
      );
    });
  }, [users, searchTerm]);
};

// --- IMPROVED: User information for mobile with search and optimized scroll ---
const MobileUsersInfo = ({ users, selectedUserId, onUserSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const scrollContainerRef = useRef(null);
  const selectedUserRef = useRef(null);

  const filteredUsers = useFilteredUsers(users, searchTerm);

  // Avoid unnecessary automatic scrolling
  useEffect(() => {
    if (selectedUserRef.current && scrollContainerRef.current && !searchTerm) {
      // Only scroll if the selected element is not visible
      const container = scrollContainerRef.current;
      const element = selectedUserRef.current;

      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();

      const isVisible = elementRect.top >= containerRect.top &&
        elementRect.bottom <= containerRect.bottom;

      if (!isVisible) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
      }
    }
  }, [selectedUserId, searchTerm]);

  if (!users || users.length === 0) return null;

  return (
    <div className="glassmorphism-strong rounded-4xl w-full mt-6 p-6">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-white">Devices</h2>
        <span className="text-sm text-white/60">
          {filteredUsers.length} of {users.length} Device{users.length !== 1 ? 's' : ''}
          {searchTerm && ' (filtered)'}
        </span>
      </div>

      <SearchBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        placeholder="Search devices by name or ID..."
      />

      <div
        ref={scrollContainerRef}
        className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar"
      >
        {filteredUsers.length > 0 ? (
          filteredUsers.map((user) => {
            const isActive = isUserActive(user.lastUpdate);
            const isSelected = selectedUserId === user.id;
            const deviceColor = getDeviceColor(user.id);

            return (
              <div
                key={user.id}
                ref={isSelected ? selectedUserRef : null}
                onClick={() => onUserSelect(user.id)}
                className={`p-4 rounded-xl cursor-pointer transition-all duration-300 border-2 ${isSelected
                  ? 'border-opacity-80 shadow-lg'
                  : 'border-white/10 hover:border-white/20'
                  }`}
                style={isSelected ? {
                  backgroundColor: `${deviceColor.hex}20`,
                  borderColor: deviceColor.hex,
                  boxShadow: `0 10px 25px ${deviceColor.hex}30`
                } : {}}
              >
                <div className="flex items-center justify-between mb-3 gap-2">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className={`w-4 h-4 rounded-full flex-shrink-0 border-2 ${isActive ? 'animate-pulse' : ''}`}
                      style={{
                        backgroundColor: isActive ? '#10b981' : '#ef4444',
                        borderColor: deviceColor.hex
                      }}
                    ></div>
                    <h3 className="font-semibold text-white truncate">{user.name}</h3>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap flex-shrink-0 ${isActive
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}>
                    {isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div
                  className="w-full h-1 rounded-full mb-3"
                  style={{ backgroundColor: deviceColor.hex }}
                ></div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="text-white/70 flex-shrink-0">Latitude:</span>
                    <span className="text-white font-mono">{parseFloat(user.latitude).toFixed(6)}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-white/70 flex-shrink-0">Longitude:</span>
                    <span className="text-white font-mono">{parseFloat(user.longitude).toFixed(6)}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-white/70 flex-shrink-0">Last Update:</span>
                    <span className="text-white/90 text-xs truncate">{formatTimestamp(user.lastUpdate)}</span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8">
            <svg className="w-12 h-12 mx-auto text-white/30 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="text-white/50">No devices found matching "{searchTerm}"</p>
            <button
              onClick={() => setSearchTerm('')}
              className="mt-2 text-cyan-400 hover:text-cyan-300 text-sm"
            >
              Clear search
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="text-xs text-white/50 text-center">
          <p>Devices go inactive after {config.INACTIVE_TIMEOUT / 1000} seconds</p>
        </div>
      </div>
    </div>
  );
};

// --- IMPROVED: Sidebar for desktop with search and optimized scroll ---
const DesktopUsersSidebar = ({ users, onUserSelect, selectedUserId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const scrollContainerRef = useRef(null);
  const selectedUserRef = useRef(null);

  const filteredUsers = useFilteredUsers(users, searchTerm);

  // Avoid unnecessary automatic scrolling
  useEffect(() => {
    if (selectedUserRef.current && scrollContainerRef.current && !searchTerm) {
      // Only scroll if the selected element is not visible
      const container = scrollContainerRef.current;
      const element = selectedUserRef.current;

      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();

      const isVisible = elementRect.top >= containerRect.top &&
        elementRect.bottom <= containerRect.bottom;

      if (!isVisible) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
      }
    }
  }, [selectedUserId, searchTerm]);

  return (
    <div className="fixed top-24 left-0 h-[calc(100vh-6rem)] w-80 glassmorphism-strong border-r border-white/10 z-40">
      <div className="p-6 h-full flex flex-col">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white">Devices</h2>
          <span className="text-sm text-white/60">
            {filteredUsers.length} of {users.length} Device{users.length !== 1 ? 's' : ''}
            {searchTerm && ' (filtered)'}
          </span>
        </div>

        <SearchBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          placeholder="Search devices..."
        />

        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto space-y-3 custom-scrollbar"
        >
          {filteredUsers.length > 0 ? (
            filteredUsers.map((user) => {
              const isActive = isUserActive(user.lastUpdate);
              const isSelected = selectedUserId === user.id;
              const deviceColor = getDeviceColor(user.id);

              return (
                <div
                  key={user.id}
                  ref={isSelected ? selectedUserRef : null}
                  onClick={() => onUserSelect(user.id)}
                  className={`p-4 rounded-xl cursor-pointer transition-all duration-300 border-2 ${isSelected
                    ? 'border-opacity-80 shadow-lg'
                    : 'border-white/10 hover:border-white/20'
                    }`}
                  style={isSelected ? {
                    backgroundColor: `${deviceColor.hex}20`,
                    borderColor: deviceColor.hex,
                    boxShadow: `0 10px 25px ${deviceColor.hex}30`
                  } : {}}
                >
                  <div className="flex items-center justify-between mb-3 gap-2">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className={`w-4 h-4 rounded-full flex-shrink-0 border-2 ${isActive ? 'animate-pulse' : ''}`}
                        style={{
                          backgroundColor: isActive ? '#10b981' : '#ef4444',
                          borderColor: deviceColor.hex
                        }}
                      ></div>
                      <h3 className="font-semibold text-white truncate">{user.name}</h3>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap flex-shrink-0 ${isActive
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}>
                      {isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div
                    className="w-full h-1 rounded-full mb-3"
                    style={{ backgroundColor: deviceColor.hex }}
                  ></div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8">
              <svg className="w-12 h-12 mx-auto text-white/30 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-white/50 text-sm">No devices found matching "{searchTerm}"</p>
              <button
                onClick={() => setSearchTerm('')}
                className="mt-2 text-cyan-400 hover:text-cyan-300 text-sm"
              >
                Clear search
              </button>
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="text-xs text-white/50 text-center">
            <p>Devices go inactive after {config.INACTIVE_TIMEOUT / 1000} seconds</p>
            <p className="mt-1">Auto-refresh every {config.POLLING_INTERVAL / 1000}s</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- NEW: Sidebar for Area History mode ---
const AreaHistorySidebar = ({ users, selectedDevices, onDeviceSelectionChange, onClearArea }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const filteredUsers = useFilteredUsers(users, searchTerm);

  const handleCheckboxChange = (deviceId) => {
    const newSelection = new Set(selectedDevices);
    if (newSelection.has(deviceId)) {
      newSelection.delete(deviceId);
    } else {
      newSelection.add(deviceId);
    }
    onDeviceSelectionChange(Array.from(newSelection));
  };

  return (
    <div className="fixed top-24 left-0 h-[calc(100vh-6rem)] w-80 glassmorphism-strong border-r border-white/10 z-40">
      <div className="p-6 h-full flex flex-col">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white">Area History</h2>
          <span className="text-sm text-white/60">Select devices to view their path in the area.</span>
        </div>

        <SearchBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          placeholder="Search devices..."
        />

        <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2">
          {filteredUsers.length > 0 ? (
            filteredUsers.map((user) => {
              const deviceColor = getDeviceColor(user.id);
              const isChecked = selectedDevices.includes(user.id);

              return (
                <label
                  key={user.id}
                  htmlFor={`device-checkbox-${user.id}`}
                  className={`p-3 rounded-xl cursor-pointer flex items-center gap-4 transition-all duration-300 border-2 ${isChecked ? 'border-opacity-80' : 'border-white/10 hover:border-white/20'}`}
                  style={isChecked ? { backgroundColor: `${deviceColor.hex}20`, borderColor: deviceColor.hex } : {}}
                >
                  <input
                    type="checkbox"
                    id={`device-checkbox-${user.id}`}
                    checked={isChecked}
                    onChange={() => handleCheckboxChange(user.id)}
                    className="h-5 w-5 rounded bg-white/20 border-white/30 text-cyan-500 focus:ring-cyan-500"
                    style={{ accentColor: deviceColor.hex }}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">{user.name}</h3>
                    <p className="text-xs text-white/60 truncate">{user.deviceId}</p>
                  </div>
                  <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: deviceColor.hex }}></div>
                </label>
              );
            })
          ) : (
            <div className="text-center py-8 text-white/50">No devices found.</div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-white/10">
          <button
            onClick={onClearArea}
            className="w-full px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            Draw New Area
          </button>
        </div>
      </div>
    </div>
  );
};


const DateSearchModal = ({ isOpen, onClose, onSearch, users }) => {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const isMobile = useMediaQuery('(max-width: 768px)');
  const filteredUsers = useFilteredUsers(users, searchTerm);

  const darkTheme = createTheme({
    palette: {
      mode: 'dark',
      primary: {
        main: '#0092b8',
      },
      background: {
        paper: 'rgba(255, 255, 255, 0.1)',
      },
      text: {
        primary: '#FFFFFF',
        secondary: '#E5E7EB',
      },
    },
    components: {
      MuiPickersToolbar: {
        styleOverrides: {
          root: {
            backgroundColor: 'rgba(0, 146, 184, 0.2)',
          },
        },
      },
      MuiPickersLayout: {
        styleOverrides: {
          root: {
            color: '#FFFFFF',
            backgroundColor: 'rgba(10, 25, 41, 0.98)',
            backdropFilter: 'blur(5px)',
          },
        },
      },
      MuiPickersCalendarHeader: {
        styleOverrides: {
          root: { color: '#FFFFFF' },
          label: { color: '#FFFFFF' },
        },
      },
      MuiDayPicker: {
        styleOverrides: {
          weekDayLabel: { color: 'rgba(255, 255, 255, 0.7)' },
        },
      },
      MuiPickersDay: {
        styleOverrides: {
          root: {
            color: '#FFFFFF',
            "&.Mui-selected": {
              color: '#FFFFFF',
            }
          },
        },
      },
      MuiPickersYear: {
        styleOverrides: {
          yearButton: {
            color: 'rgba(255, 255, 255, 0.9)',
            '&.Mui-selected': {
              color: '#FFFFFF',
            },
          },
        },
      },
      MuiClock: {
        styleOverrides: {
          clockNumber: {
            color: 'rgba(255, 255, 255, 0.9)',
            '&.Mui-selected': {
              color: '#FFFFFF',
            },
          },
        },
      },
      MuiTimeClock: {
        styleOverrides: {
          arrowSwitcher: {
            color: 'rgba(255, 255, 255, 0.7)'
          }
        }
      }
    },
  });

  const handleSearch = async () => {
    if (!startDate || !endDate) {
      setError('Please select both a start and end date.');
      return;
    }
    if (!selectedDeviceId) {
      setError('Please select a device.');
      return;
    }
    if (endDate.isBefore(startDate)) {
      setError('End date must be after the start date.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const searchData = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        deviceId: selectedDeviceId
      };
      onSearch(searchData);
      onClose();
    } catch (err) {
      console.error('Error in search:', err);
      setError('An unexpected error occurred during the search.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setStartDate(null);
    setEndDate(null);
    setSelectedDeviceId('');
    setError('');
    setSearchTerm('');
  };

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    } else if (users && users.length > 0 && !selectedDeviceId) {
      setSelectedDeviceId(users[0].id);
    }
  }, [isOpen, users, selectedDeviceId]);

  const mobilePickerSx = {
    '& .MuiInputBase-root': { backgroundColor: 'rgba(0, 0, 0, 0.2)', borderRadius: '0.75rem' },
    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.2)' },
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative glassmorphism-strong rounded-4xl w-full max-w-md md:max-w-6xl max-h-[95vh] overflow-y-auto transform">
        {/* Fixed header */}
        <div className="sticky top-0 z-10 glassmorphism-strong rounded-t-4xl p-6 border-b border-white/10">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white">Select Date Range & Device</h2>
            <button onClick={onClose} className="text-white/60 cursor-pointer hover:text-white p-1">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="p-6">
          {/* Device Selector with search bar */}
          <div className="mb-6">
            <label className="block text-white text-lg font-medium mb-3">Select Device</label>

            <SearchBar
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              placeholder="Search devices for history..."
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-40 overflow-y-auto custom-scrollbar">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => {
                  const deviceColor = getDeviceColor(user.id);
                  const isSelected = selectedDeviceId === user.id;

                  return (
                    <button
                      key={user.id}
                      onClick={() => setSelectedDeviceId(user.id)}
                      className={`p-4 rounded-xl border-2 transition-all duration-300 ${isSelected
                        ? 'border-opacity-80 shadow-lg'
                        : 'border-white/20 hover:border-white/40'
                        }`}
                      style={isSelected ? {
                        backgroundColor: `${deviceColor.hex}30`,
                        borderColor: deviceColor.hex,
                        boxShadow: `0 10px 25px ${deviceColor.hex}20`
                      } : {}}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: deviceColor.hex }}
                        ></div>
                        <div className="text-left">
                          <div className="text-white font-semibold truncate">{user.name}</div>
                          <div className="text-white/60 text-xs truncate">{user.deviceId}</div>
                        </div>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="col-span-full text-center py-4">
                  <p className="text-white/50">No devices found matching "{searchTerm}"</p>
                  <button
                    onClick={() => setSearchTerm('')}
                    className="mt-2 text-cyan-400 hover:text-cyan-300 text-sm"
                  >
                    Clear search
                  </button>
                </div>
              )}
            </div>

            {filteredUsers.length > 0 && (
              <div className="mt-3 text-sm text-white/60">
                Showing {filteredUsers.length} of {users.length} devices
              </div>
            )}
          </div>

          <ThemeProvider theme={darkTheme}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              {isMobile ? (
                <div className="flex flex-col gap-6 my-4">
                  <DateTimePicker
                    label="Start Date & Time"
                    value={startDate}
                    onChange={(newValue) => setStartDate(newValue)}
                    maxDate={dayjs()}
                    sx={mobilePickerSx}
                  />
                  <DateTimePicker
                    label="End Date & Time"
                    value={endDate}
                    onChange={(newValue) => setEndDate(newValue)}
                    minDate={startDate}
                    disabled={!startDate}
                    sx={mobilePickerSx}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div>
                    <label className="block text-white text-lg font-medium mb-4 text-center">Start Date</label>
                    <StaticDateTimePicker
                      orientation="landscape"
                      value={startDate}
                      onChange={(newValue) => setStartDate(newValue)}
                      maxDate={dayjs()}
                      timeSteps={{ minutes: 1 }}
                      sx={{
                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                        borderRadius: '2rem',
                        maxHeight: '400px',
                        '& .MuiPickersLayout-contentWrapper': {
                          maxHeight: '350px'
                        }
                      }}
                      slotProps={{ actionBar: { actions: [] } }}
                    />
                  </div>
                  <div>
                    <label className="block text-white text-lg font-medium mb-4 text-center">End Date</label>
                    <StaticDateTimePicker
                      orientation="landscape"
                      value={endDate}
                      onChange={(newValue) => setEndDate(newValue)}
                      minDate={startDate}
                      disabled={!startDate}
                      timeSteps={{ minutes: 1 }}
                      sx={{
                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                        borderRadius: '2rem',
                        maxHeight: '400px',
                        '& .MuiPickersLayout-contentWrapper': {
                          maxHeight: '350px'
                        }
                      }}
                      slotProps={{ actionBar: { actions: [] } }}
                    />
                  </div>
                </div>
              )}
            </LocalizationProvider>
          </ThemeProvider>

          {error && (
            <div className="mt-4 text-center text-red-400 bg-red-900/50 p-3 rounded-xl">
              {error}
            </div>
          )}
        </div>

        {/* Fixed footer */}
        <div className="sticky bottom-0 z-10 glassmorphism-strong rounded-b-4xl p-6 border-t border-white/10">
          <div className="flex gap-4">
            <button
              onClick={resetForm}
              className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all font-medium"
              disabled={isLoading}
            >
              Clean
            </button>
            <button
              onClick={handleSearch}
              disabled={isLoading || !startDate || !endDate || !selectedDeviceId}
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 text-white rounded-xl transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Searching...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Search
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Functions for color gradients ---
const interpolateColor = (color1, color2, factor) => {
  const c1 = parseInt(color1.substring(1), 16);
  const r1 = (c1 >> 16) & 255;
  const g1 = (c1 >> 8) & 255;
  const b1 = c1 & 255;

  const c2 = parseInt(color2.substring(1), 16);
  const r2 = (c2 >> 16) & 255;
  const g2 = (c2 >> 8) & 255;
  const b2 = c2 & 255;

  const r = Math.round(r1 + factor * (r2 - r1));
  const g = Math.round(g1 + factor * (g2 - g1));
  const b = Math.round(b1 + factor * (b2 - b1));

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

const GradientPolyline = ({ path, deviceColor }) => {
  if (path.length < 2) {
    return null;
  }

  const startColor = deviceColor.light;
  const endColor = deviceColor.dark;

  const segments = path.slice(1).map((point, index) => {
    const segmentPath = [path[index], point];
    const factor = index / (path.length - 2);
    const color = interpolateColor(startColor, endColor, factor);

    return (
      <Polyline
        key={index}
        pathOptions={{ color: color, weight: 5, opacity: 0.8 }}
        positions={segmentPath}
      />
    );
  });

  return <>{segments}</>;
};

// --- NEW: Improved component to update the map view ---
const MapViewUpdater = ({ userPaths, viewMode, users, previousUsers, area, areaUserPaths }) => {
  const map = useMap();
  const previousUsersRef = useRef(previousUsers);

  useEffect(() => {
    try {
      if (viewMode === 'live') {
        if (!users || users.length === 0) return;
        const activeUsers = users.filter(user => isUserActive(user.lastUpdate));
        if (activeUsers.length > 1) {
          const allPositions = activeUsers.map(user => [parseFloat(user.latitude), parseFloat(user.longitude)]);
          if (allPositions.length > 0) {
            const bounds = L.latLngBounds(allPositions);
            map.fitBounds(bounds, { padding: [50, 50], animate: true, duration: 1.0, maxZoom: 16 });
          }
        } else if (activeUsers.length === 1) {
          const user = activeUsers[0];
          const newPosition = [parseFloat(user.latitude), parseFloat(user.longitude)];
          const currentZoom = map.getZoom();
          map.setView(newPosition, currentZoom, { animate: true, duration: 0.5 });
        }
        previousUsersRef.current = users;
      } else if (viewMode === 'history') {
        const allPaths = Object.values(userPaths).flat();
        if (allPaths && allPaths.length > 1) {
          const bounds = L.latLngBounds(allPaths);
          map.fitBounds(bounds, { padding: [20, 20], animate: true, duration: 1.0 });
        }
      } else if (viewMode === 'area') {
        const allAreaPaths = Object.values(areaUserPaths).flat();
        if (allAreaPaths.length > 1) {
          const bounds = L.latLngBounds(allAreaPaths);
          if (area) {
            const areaBounds = L.latLng(area.center).toBounds(area.radius);
            bounds.extend(areaBounds);
          }
          map.fitBounds(bounds, { padding: [50, 50], animate: true, duration: 1.0 });
        } else if (area) {
          map.fitBounds(L.latLng(area.center).toBounds(area.radius), { padding: [50, 50], animate: true, duration: 1.0 });
        }
      }
    } catch (error) {
      console.error('Error updating map view:', error);
    }
  }, [users, userPaths, viewMode, map, area, areaUserPaths]);

  return null;
};

// --- Main map with multi-device support IMPROVED ---
const LocationMap = ({ users, userPaths, viewMode, selectedUserId, previousUsers, area, areaUserPaths, isDrawingArea, onAreaDraw }) => {
  const viewportHeight = useViewportHeight();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const map = useMap();

  const drawStartPos = useRef(null);
  const tempCircle = useRef(null);

  useEffect(() => {
    const mapContainer = map.getContainer();
    if (isDrawingArea) {
      map.dragging.disable();
      mapContainer.style.cursor = 'crosshair';
    } else {
      map.dragging.enable();
      mapContainer.style.cursor = '';
    }

    const handleMouseDown = (e) => {
      if (!isDrawingArea) return;
      drawStartPos.current = e.latlng;
      // Create a temporary circle for visual feedback
      if (!tempCircle.current) {
        tempCircle.current = L.circle(e.latlng, {
          radius: 0,
          color: '#0ea5e9',
          weight: 2,
          fillColor: '#0ea5e9',
          fillOpacity: 0.2
        }).addTo(map);
      }
    };

    const handleMouseMove = (e) => {
      if (!isDrawingArea || !drawStartPos.current) return;
      const radius = e.latlng.distanceTo(drawStartPos.current);
      if (tempCircle.current) {
        tempCircle.current.setRadius(radius);
      }
    };

    const handleMouseUp = (e) => {
      if (!isDrawingArea || !drawStartPos.current) return;
      const radius = e.latlng.distanceTo(drawStartPos.current);

      onAreaDraw({ center: drawStartPos.current, radius });

      // Clean up
      if (tempCircle.current) {
        map.removeLayer(tempCircle.current);
        tempCircle.current = null;
      }
      drawStartPos.current = null;
    };

    map.on('mousedown', handleMouseDown);
    map.on('mousemove', handleMouseMove);
    map.on('mouseup', handleMouseUp);

    return () => {
      map.off('mousedown', handleMouseDown);
      map.off('mousemove', handleMouseMove);
      map.off('mouseup', handleMouseUp);
    };
  }, [isDrawingArea, map, onAreaDraw]);

  const mapHeight = isMobile
    ? Math.max(viewportHeight - 200, 300)
    : Math.max(viewportHeight - 180, 400);

  // Get the initial center position - only on initialization, not constantly updated
  const getInitialCenterPosition = () => {
    if (!users || users.length === 0) return [37.7749, -122.4194]; // San Francisco as fallback

    const firstUser = users[0];
    return [parseFloat(firstUser.latitude), parseFloat(firstUser.longitude)];
  };

  // Validate that coordinates are valid
  if (isNaN(map.getCenter().lat) || isNaN(map.getCenter().lng)) {
    return (
      <div className='glassmorphism-strong w-full mt-6 rounded-4xl backdrop-blur-lg shadow-lg p-4'>
        <div className="flex items-center justify-center" style={{ height: `${mapHeight}px` }}>
          <div className="text-center text-white">
            <p>Error: Invalid coordinates</p>
            <p className="text-sm text-white/60 mt-2">Please check your location data</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <TileLayer
        url={`https://{s}.tile.jawg.io/${config.JAWG_MAP_ID}/{z}/{x}/{y}{r}.png?access-token=${config.JAWG_ACCESS_TOKEN}`}
        attribution='&copy; <a href="https://www.jawg.io" target="_blank">Jawg</a> - &copy; <a href="https://www.openstreetmap.org" target="_blank">OpenStreetMap</a> contributors'
      />

      {/* Render markers for live mode */}
      {viewMode === 'live' && users.map((user) => {
        const userPosition = [parseFloat(user.latitude), parseFloat(user.longitude)];
        const deviceColor = getDeviceColor(user.id);
        const isActive = isUserActive(user.lastUpdate);
        const isSelected = selectedUserId === user.id;

        // --- FIX: Add this line to hide inactive markers ---
        // If the device is not active, don't render anything for it.
        if (!isActive) return null;

        if (isNaN(userPosition[0]) || isNaN(userPosition[1])) return null;

        const circularIcon = createCircularIcon(deviceColor.hex, isActive);

        return (
          <Marker key={user.id} position={userPosition} icon={circularIcon} opacity={isSelected ? 1 : 0.7}>
            <Popup>
              <div className="text-center">
                <strong style={{ color: deviceColor.hex }}>{user.name}</strong><br />
                <small>Device: {user.deviceId}</small><br />
                <small>Status: {isActive ? 'Active' : 'Inactive'}</small><br />
                <small>Last Update: {formatTimestamp(user.lastUpdate)}</small>
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* Render history paths */}
      {viewMode === 'history' && Object.entries(userPaths).map(([deviceId, path]) => {
        const deviceColor = getDeviceColor(deviceId);
        return <GradientPolyline key={deviceId} path={path} deviceColor={deviceColor} />;
      })}

      {/* NEW: Render area history paths */}
      {viewMode === 'area' && Object.entries(areaUserPaths).map(([deviceId, path]) => {
        const deviceColor = getDeviceColor(deviceId);
        return <GradientPolyline key={`area-${deviceId}`} path={path} deviceColor={deviceColor} />;
      })}

      {/* NEW: Render the defined area circle */}
      {viewMode === 'area' && area && (
        <Circle
          center={area.center}
          radius={area.radius}
          pathOptions={{ color: '#0ea5e9', fillColor: '#0ea5e9', fillOpacity: 0.1, weight: 2 }}
        />
      )}

      <MapViewUpdater
        userPaths={userPaths}
        viewMode={viewMode}
        users={users}
        previousUsers={previousUsers}
        area={area}
        areaUserPaths={areaUserPaths}
      />
    </>
  );
};


// --- Main Component IMPROVED ---
function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errorType, setErrorType] = useState(null);
  const [userPaths, setUserPaths] = useState({});
  const [isDateSearchModalOpen, setIsDateSearchModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // --- NEW: State for view mode and area selection ---
  const [viewMode, setViewMode] = useState('live'); // 'live', 'history', 'area'
  const [isDrawingArea, setIsDrawingArea] = useState(false);
  const [area, setArea] = useState(null); // { center: {lat, lng}, radius: meters }
  const [selectedAreaDevices, setSelectedAreaDevices] = useState([]);
  const [areaUserPaths, setAreaUserPaths] = useState({});

  // States for multi-device management
  const [users, setUsers] = useState([]);
  const [previousUsers, setPreviousUsers] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);

  const isMobile = useMediaQuery('(max-width: 768px)');
  const mapRef = useRef();

  // Function to get data from multiple devices IMPROVED
  const fetchUsersData = async () => {
    try {
      setError(null);
      setErrorType(null);

      const response = await fetch(`${config.API_BASE_URL}/api/devices/latest-locations`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const devicesData = await response.json();
      console.log('Devices data received:', devicesData);

      if (devicesData && devicesData.length > 0) {
        const usersArray = devicesData.map(device => ({
          id: device.device_id || `device_${Math.random().toString(36).substring(7)}`,
          name: device.device_name || device.device_id || 'Unknown Device',
          deviceId: device.device_id,
          deviceType: device.device_type || 'mobile',
          latitude: device.latitude,
          longitude: device.longitude,
          lastUpdate: device.timestamp_value || device.created_at
        }));

        // Clean up inactive devices from the color manager
        const activeDeviceIds = usersArray.map(user => user.id);
        deviceColorManager.cleanupInactiveDevices(activeDeviceIds);

        // Save previous state before updating
        setPreviousUsers(users);
        setUsers(usersArray);

        // More efficient path updates in live mode
        if (viewMode === 'live') {
          setUserPaths(prevPaths => {
            const newPaths = { ...prevPaths };
            let hasChanges = false;

            usersArray.forEach(user => {
              // Validate coordinates before adding
              const lat = parseFloat(user.latitude);
              const lng = parseFloat(user.longitude);

              if (!isNaN(lat) && !isNaN(lng)) {
                const userPosition = [lat, lng];
                const currentPath = newPaths[user.id] || [];

                // Only add if it's a significantly different position
                const lastPoint = currentPath[currentPath.length - 1];
                if (!lastPoint ||
                  Math.abs(lastPoint[0] - userPosition[0]) > 0.00001 ||
                  Math.abs(lastPoint[1] - userPosition[1]) > 0.00001) {
                  newPaths[user.id] = [...currentPath, userPosition];
                  hasChanges = true;

                  // Limit history to avoid very large arrays
                  if (newPaths[user.id].length > 50) {
                    newPaths[user.id] = newPaths[user.id].slice(-25);
                  }
                }
              }
            });

            return hasChanges ? newPaths : prevPaths;
          });
        }

        // If no user is selected, select the first active one
        // IMPROVED: Keep the current selection if the user still exists
        if (selectedUserId) {
          const selectedUserStillExists = usersArray.find(user => user.id === selectedUserId);
          if (!selectedUserStillExists && usersArray.length > 0) {
            const activeUser = usersArray.find(user => isUserActive(user.lastUpdate)) || usersArray[0];
            setSelectedUserId(activeUser.id);
          }
        } else if (usersArray.length > 0) {
          const activeUser = usersArray.find(user => isUserActive(user.lastUpdate)) || usersArray[0];
          setSelectedUserId(activeUser.id);
        }

        setLoading(false);
      } else {
        await fetchLatestLocationFallback();
      }
    } catch (err) {
      console.error('Error fetching devices data:', err);
      await fetchLatestLocationFallback();
    }
  };

  // IMPROVED fallback function
  const fetchLatestLocationFallback = async () => {
    try {
      const response = await fetch(`${config.API_BASE_URL}/api/location/latest`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const userData = {
        id: data.device_id || 'device_legacy',
        name: data.device_name || 'Legacy Device',
        deviceId: data.device_id,
        deviceType: data.device_type || 'mobile',
        latitude: data.latitude,
        longitude: data.longitude,
        lastUpdate: data.timestamp_value
      };

      setPreviousUsers(users);
      setUsers([userData]);

      if (!selectedUserId) {
        setSelectedUserId(userData.id);
        const lat = parseFloat(userData.latitude);
        const lng = parseFloat(userData.longitude);

        if (!isNaN(lat) && !isNaN(lng)) {
          const userPosition = [lat, lng];
          setUserPaths(prevPaths => ({
            ...prevPaths,
            [userData.id]: [...(prevPaths[userData.id] || []), userPosition]
          }));
        }
      }

      setLoading(false);
    } catch (err) {
      console.error('Error fetching fallback data:', err);
      setError('Error fetching fallback data. Please check if the backend is running.');
      setErrorType('connection');
      setLoading(false);
    }
  };

  // IMPROVED: Handle user selection without causing unnecessary automatic scrolling
  const handleUserSelect = (userId) => {
    console.log('User selected:', userId);
    // Only update if it's different from the current selection
    if (selectedUserId !== userId) {
      setSelectedUserId(userId);
    }
  };

  // Date search
  const handleDateSearch = async (searchData) => {
    setLoading(true);
    setViewMode('history');
    setError(null);

    try {
      const { startDate, endDate, deviceId } = searchData;
      let url = `${config.API_BASE_URL}/api/location/range?startDate=${startDate}&endDate=${endDate}`;

      if (deviceId) {
        url += `&deviceId=${deviceId}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Error fetching location history.');
      }

      const historicalData = await response.json();

      if (historicalData.length > 0) {
        const newPath = historicalData
          .map(point => {
            const lat = parseFloat(point.latitude);
            const lng = parseFloat(point.longitude);

            if (!isNaN(lat) && !isNaN(lng)) {
              return [lat, lng];
            }
            return null;
          })
          .filter(point => point !== null);

        if (newPath.length > 0) {
          setUserPaths({ [deviceId]: newPath });
          setSelectedUserId(deviceId);
        } else {
          setError('No valid locations were found for the selected range.');
          setErrorType('no-data');
        }
      } else {
        setUserPaths({});
        setError('No valid locations were found for the selected range.');
        setErrorType('no-data');
      }
    } catch (err) {
      setError('Error fetching history.');
      setErrorType('connection');
      console.error('Error fetching date range:', err);
    } finally {
      setLoading(false);
    }
  };

  // --- NEW: Area search handler ---
  const fetchAreaHistory = async (deviceIdsToFetch) => {
    if (!area || deviceIdsToFetch.length === 0) {
      // If no devices are selected, clear the paths for those devices
      const newPaths = { ...areaUserPaths };
      const deselected = Object.keys(newPaths).filter(id => !deviceIdsToFetch.includes(id));
      deselected.forEach(id => delete newPaths[id]);
      setAreaUserPaths(newPaths);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${config.API_BASE_URL}/api/location/area`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          center: area.center,
          radius: area.radius,
          deviceIds: deviceIdsToFetch
        })
      });
      if (!response.ok) throw new Error('Failed to fetch area history');
      const data = await response.json();

      // We update only the paths of the selected devices
      setAreaUserPaths(prevPaths => ({ ...prevPaths, ...data }));

    } catch (err) {
      console.error("Error fetching area history:", err);
      setError("Could not load area history.");
      setErrorType('connection');
    } finally {
      setLoading(false);
    }
  };

  // This effect triggers the search when selected devices change in area mode
  useEffect(() => {
    if (viewMode === 'area' && area) {
      fetchAreaHistory(selectedAreaDevices);
    }
  }, [selectedAreaDevices, area, viewMode]);


  const handleReturnToLive = () => {
    setViewMode('live');
    setUserPaths({});
    setArea(null);
    setAreaUserPaths({});
    setSelectedAreaDevices([]);
    setIsDrawingArea(false);
    setError(null);
    setErrorType(null);
    setLoading(true);
    setIsMobileMenuOpen(false);
    setPreviousUsers(null); // Reset previous state
  };

  // --- NEW: Handlers for Area Mode ---
  const handleAreaDraw = (drawnArea) => {
    setArea(drawnArea);
    setIsDrawingArea(false); // Finish drawing
    setAreaUserPaths({}); // Clear previous paths
    setSelectedAreaDevices([]); // Clear selected devices
  };

  const handleEnterAreaMode = () => {
    setViewMode('area');
    setIsMobileMenuOpen(false);
    setIsDrawingArea(true); // Activate drawing mode immediately
    setArea(null);
    setAreaUserPaths({});
    setSelectedAreaDevices([]);
    setError(null);
  };

  // Main polling effect IMPROVED
  useEffect(() => {
    if (viewMode === 'live' && !isDateSearchModalOpen) {
      // Initial fetch
      fetchUsersData();

      // Polling for live updates with optimized interval
      const interval = setInterval(() => {
        if (viewMode === 'live' && !isDateSearchModalOpen && document.visibilityState === 'visible') {
          fetchUsersData();
        }
      }, config.POLLING_INTERVAL);

      return () => clearInterval(interval);
    }
  }, [viewMode, isDateSearchModalOpen]); // Added viewMode to dependencies

  const viewportHeight = useViewportHeight();
  const mapHeight = isMobile
    ? Math.max(viewportHeight - 200, 300)
    : Math.max(viewportHeight - 180, 400);

  const getInitialCenterPosition = () => {
    if (!users || users.length === 0) return [37.7749, -122.4194]; // Fallback
    const firstUser = users[0];
    return [parseFloat(firstUser.latitude), parseFloat(firstUser.longitude)];
  };


  return (
    <div className="min-h-screen transition-all duration-500 dark">
      {/* ANIMATED BACKGROUND */}
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

      {/* Header */}
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
                className={`flex items-center text-center cursor-pointer justify-center gap-2 w-40 text-lg transition-all duration-300 border-b-2 pt-2 ${viewMode === 'live' ? 'pb-[5px] text-cyan-500 border-cyan-500' : 'pb-2 text-white/70 border-transparent hover:text-white'}`}
              >
                Live Tracking
              </button>
              <button
                onClick={() => { setViewMode('history'); setIsDateSearchModalOpen(true); }}
                className={`flex items-center text-center cursor-pointer justify-center gap-2 w-40 text-lg transition-all duration-300 border-b-2 pt-2 ${viewMode === 'history' ? 'pb-[5px] text-cyan-500 border-cyan-500' : 'pb-2 text-white/70 border-transparent hover:text-white'}`}
              >
                History
              </button>
              <button
                onClick={handleEnterAreaMode}
                className={`flex items-center text-center cursor-pointer justify-center gap-2 w-48 text-lg transition-all duration-300 border-b-2 pt-2 ${viewMode === 'area' ? 'pb-[5px] text-cyan-500 border-cyan-500' : 'pb-2 text-white/70 border-transparent hover:text-white'}`}
              >
                History by Area
              </button>
            </div>
          )}
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobile && isMobileMenuOpen && (
          <div className="mt-4 glassmorphism rounded-2xl p-4 animate-fade-in">
            <button onClick={handleReturnToLive} className={`w-full flex items-center justify-center gap-2 px-4 py-3 mb-2 rounded-xl transition-all ${viewMode === 'live' ? 'bg-cyan-600/20 text-cyan-600 border-2 border-cyan-600' : 'bg-white/10 text-white hover:bg-white/20'}`}>
              Live Tracking
            </button>
            <button onClick={() => { setViewMode('history'); setIsDateSearchModalOpen(true); setIsMobileMenuOpen(false); }} className={`w-full flex items-center justify-center gap-2 px-4 py-3 mb-2 rounded-xl transition-all ${viewMode === 'history' ? 'bg-cyan-600/20 text-cyan-600 border-2 border-cyan-600' : 'bg-white/10 text-white hover:bg-white/20'}`}>
              History
            </button>
            <button onClick={handleEnterAreaMode} className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all ${viewMode === 'area' ? 'bg-cyan-600/20 text-cyan-600 border-2 border-cyan-600' : 'bg-white/10 text-white hover:bg-white/20'}`}>
              History by Area
            </button>
          </div>
        )}
      </header>

      {/* Sidebar logic based on viewMode */}
      {!isMobile && users.length > 0 && (
        <>
          {viewMode === 'live' && <DesktopUsersSidebar users={users} onUserSelect={handleUserSelect} selectedUserId={selectedUserId} />}
          {viewMode === 'history' && <DesktopUsersSidebar users={users} onUserSelect={handleUserSelect} selectedUserId={selectedUserId} />}
          {viewMode === 'area' && <AreaHistorySidebar users={users} selectedDevices={selectedAreaDevices} onDeviceSelectionChange={setSelectedAreaDevices} onClearArea={() => { setArea(null); setIsDrawingArea(true); setAreaUserPaths({}); setSelectedAreaDevices([]); }} />}
        </>
      )}

      {/* Main container */}
      <main className={`max-w-[98%] mx-auto min-h-[calc(100vh-6rem)] pt-28 px-4 md:px-0 transition-all duration-300 ${!isMobile && users.length > 0 ? 'md:ml-96 md:mr-8' : ''
        }`}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <div className="flex justify-center items-center h-full">
            <ErrorMessage
              error={error}
              onRetry={() => {
                setLoading(true);
                setError(null);
                setErrorType(null);
                fetchUsersData();
              }}
              onReturnToLive={handleReturnToLive}
              isNoDataError={errorType === 'no-data'}
            />
          </div>
        ) : users.length > 0 ? (
          <>
            <div className='relative glassmorphism-strong w-full mt-6 rounded-4xl backdrop-blur-lg shadow-lg p-4'>
              {viewMode === 'area' && (
                <button
                  onClick={() => setIsDrawingArea(prev => !prev)}
                  className={`absolute top-6 right-6 z-[1000] p-3 rounded-full transition-all text-white ${isDrawingArea ? 'bg-cyan-500 animate-pulse' : 'bg-black/40 hover:bg-black/60'}`}
                  title={isDrawingArea ? 'Cancel Drawing' : 'Draw Area'}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              )}
              <MapContainer
                ref={mapRef}
                center={getInitialCenterPosition()}
                zoom={13}
                style={{ height: `${mapHeight}px`, width: '100%', borderRadius: '1rem', minHeight: '300px' }}
              >
                <LocationMap
                  users={users}
                  userPaths={userPaths}
                  viewMode={viewMode}
                  selectedUserId={selectedUserId}
                  previousUsers={previousUsers}
                  area={area}
                  areaUserPaths={areaUserPaths}
                  isDrawingArea={isDrawingArea}
                  onAreaDraw={handleAreaDraw}
                />
              </MapContainer>
            </div>
            {/* Device info only on mobile */}
            {isMobile && viewMode !== 'area' && (
              <MobileUsersInfo
                users={users}
                selectedUserId={selectedUserId}
                onUserSelect={handleUserSelect}
              />
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="glassmorphism-strong min-w-[90%] mx-auto rounded-4xl p-8 text-center">
              <p className="text-white/70 mb-4">Waiting for location data...</p>
              <button
                onClick={() => {
                  setLoading(true);
                  fetchUsersData();
                }}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
              >
                Retry Connection
              </button>
            </div>
          </div>
        )}
      </main>

      <DateSearchModal
        isOpen={isDateSearchModalOpen}
        onClose={() => setIsDateSearchModalOpen(false)}
        onSearch={handleDateSearch}
        users={users}
      />
    </div>
  );
}

export default App;