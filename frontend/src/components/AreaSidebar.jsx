import { useState, useEffect, useRef } from 'react';
import { config } from '../config/appConfig';
import { getDeviceColor } from '../utils/colorManager';
import { useFilteredUsers } from '../hooks/useFilteredUsers';
import SearchBar from './SearchBar';

// Sidebar for area history mode with checkboxes for multiple device selection
const AreaSidebar = ({ users, selectedDevices, onDeviceToggle, areaInfo }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const scrollContainerRef = useRef(null);

  const filteredUsers = useFilteredUsers(users, searchTerm);

  return (
    <div className="fixed top-24 left-0 h-[calc(100vh-6rem)] w-80 glassmorphism-strong border-r border-white/10 z-40">
      <div className="p-6 h-full flex flex-col">
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-white">Area History</h2>
          <span className="text-sm text-white/60">
            {selectedDevices.length} of {users.length} device{users.length !== 1 ? 's' : ''} selected
            {searchTerm && ' (filtered)'}
          </span>
          {areaInfo && (
            <div className="mt-2 p-3 bg-white/5 rounded-lg">
              <p className="text-xs text-white/70">
                <span className="font-semibold">Center:</span> {areaInfo.center[0].toFixed(5)}, {areaInfo.center[1].toFixed(5)}
              </p>
              <p className="text-xs text-white/70 mt-1">
                <span className="font-semibold">Radius:</span> {areaInfo.radius.toFixed(0)}m
              </p>
            </div>
          )}
        </div>

        <SearchBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          placeholder="Search devices..."
        />

        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto space-y-3 custom-scrollbar mt-4"
        >
          {filteredUsers.length > 0 ? (
            filteredUsers.map((user) => {
              const isSelected = selectedDevices.includes(user.id);
              const deviceColor = getDeviceColor(user.id);

              return (
                <div
                  key={user.id}
                  onClick={() => onDeviceToggle(user.id)}
                  className={`p-4 rounded-xl cursor-pointer transition-all duration-300 border-2 ${
                    isSelected
                      ? 'border-opacity-80 shadow-lg'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                  style={
                    isSelected
                      ? {
                          backgroundColor: `${deviceColor.hex}20`,
                          borderColor: deviceColor.hex,
                          boxShadow: `0 10px 25px ${deviceColor.hex}30`,
                        }
                      : {}
                  }
                >
                  <div className="flex items-center gap-3 mb-3">
                    {/* Checkbox */}
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                        isSelected ? 'border-opacity-100' : 'border-white/30'
                      }`}
                      style={
                        isSelected
                          ? { backgroundColor: deviceColor.hex, borderColor: deviceColor.hex }
                          : {}
                      }
                    >
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>

                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: deviceColor.hex }}
                    ></div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white truncate">{user.name}</h3>
                      <p className="text-xs text-white/60 truncate">{user.deviceId}</p>
                    </div>
                  </div>

                  <div
                    className="w-full h-1 rounded-full"
                    style={{ backgroundColor: deviceColor.hex, opacity: isSelected ? 1 : 0.3 }}
                  ></div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8">
              <svg
                className="w-12 h-12 mx-auto text-white/30 mb-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
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
            <p>Click devices to show/hide paths in area</p>
            <p className="mt-1">Multiple devices can be selected</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AreaSidebar;
