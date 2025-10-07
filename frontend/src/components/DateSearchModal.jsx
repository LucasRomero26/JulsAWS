import { useState, useEffect } from 'react';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { StaticDateTimePicker, DateTimePicker } from '@mui/x-date-pickers';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import dayjs from 'dayjs';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useFilteredUsers } from '../hooks/useFilteredUsers';
import { getDeviceColor } from '../utils/colorManager';
import SearchBar from './SearchBar';

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
      console.error('Error en búsqueda:', err);
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
        {/* Header fijo */}
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

        {/* Contenido scrolleable */}
        <div className="p-6">
          {/* Device Selector con barra de búsqueda */}
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

        {/* Footer fijo */}
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

export default DateSearchModal;
