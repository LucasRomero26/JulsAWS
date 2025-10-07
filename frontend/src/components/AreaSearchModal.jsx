import { useState, useEffect } from 'react';
import { useFilteredUsers } from '../hooks/useFilteredUsers';
import { getDeviceColor } from '../utils/colorManager';
import SearchBar from './SearchBar';

// Modal for selecting device after drawing area
const AreaSearchModal = ({ isOpen, onClose, onDeviceSelect, users, areaInfo }) => {
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');

  const filteredUsers = useFilteredUsers(users, searchTerm);

  const handleConfirm = () => {
    if (!selectedDeviceId) {
      setError('Please select a device.');
      return;
    }

    setError('');
    onDeviceSelect(selectedDeviceId);
    onClose();
  };

  const resetForm = () => {
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative glassmorphism-strong rounded-4xl w-full max-w-2xl max-h-[90vh] overflow-y-auto transform">
        {/* Header */}
        <div className="sticky top-0 z-10 glassmorphism-strong rounded-t-4xl p-6 border-b border-white/10">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-white">Select Device for Area</h2>
              <p className="text-sm text-white/60 mt-1">
                Area: {areaInfo?.radius ? `${areaInfo.radius.toFixed(0)}m radius` : 'Custom area'}
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
        <div className="p-6">
          <div className="mb-6">
            <label className="block text-white text-lg font-medium mb-3">Select Device</label>

            <SearchBar
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              placeholder="Search devices..."
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto custom-scrollbar mt-4">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => {
                  const deviceColor = getDeviceColor(user.id);
                  const isSelected = selectedDeviceId === user.id;

                  return (
                    <button
                      key={user.id}
                      onClick={() => setSelectedDeviceId(user.id)}
                      className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                        isSelected
                          ? 'border-opacity-80 shadow-lg'
                          : 'border-white/20 hover:border-white/40'
                      }`}
                      style={
                        isSelected
                          ? {
                              backgroundColor: `${deviceColor.hex}30`,
                              borderColor: deviceColor.hex,
                              boxShadow: `0 10px 25px ${deviceColor.hex}20`,
                            }
                          : {}
                      }
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: deviceColor.hex }}
                        ></div>
                        <div className="text-left flex-1 min-w-0">
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

          {error && (
            <div className="mt-4 text-center text-red-400 bg-red-900/50 p-3 rounded-xl">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 z-10 glassmorphism-strong rounded-b-4xl p-6 border-t border-white/10">
          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedDeviceId}
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 text-white rounded-xl transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AreaSearchModal;
