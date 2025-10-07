import { useState, useEffect, useRef } from 'react';
import { config } from '../config/appConfig';
import { getDeviceColor } from '../utils/colorManager';
import { isUserActive } from '../utils/dateUtils';
import { useFilteredUsers } from '../hooks/useFilteredUsers';
import SearchBar from './SearchBar';

// --- MEJORADO: Sidebar para desktop con búsqueda y scroll optimizado ---
const DesktopUsersSidebar = ({ users, onUserSelect, selectedUserId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const scrollContainerRef = useRef(null);
  const selectedUserRef = useRef(null);

  const filteredUsers = useFilteredUsers(users, searchTerm);

  // Evitar scroll automático innecesario
  useEffect(() => {
    if (selectedUserRef.current && scrollContainerRef.current && !searchTerm) {
      // Solo hacer scroll si el elemento seleccionado no está visible
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

export default DesktopUsersSidebar;
