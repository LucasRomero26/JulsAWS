import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L, { Icon } from 'leaflet';
import { ThreeDot } from 'react-loading-indicators';

// --- MUI Date Picker Imports ---
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
// --- MODIFICADO: Se importa también el DateTimePicker normal ---
import { StaticDateTimePicker, DateTimePicker } from '@mui/x-date-pickers';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import dayjs from 'dayjs';

import './App.css';

// --- Configuración Básica ---
const config = {
  API_BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  APP_NAME: 'Juls Tracker',
  APP_SUBTITLE: 'Just UDP Location Service',
  APP_VERSION: '2.0.0',
  POLLING_INTERVAL: import.meta.env.VITE_POLLING_INTERVAL || 5000,
  JAWG_ACCESS_TOKEN: 'icNC49f9tQCM0CwkpIHYIXmvNjTgtAVrdIf3PdM94merPcn8Bcx806NlkILQrOPS',
  JAWG_MAP_ID: 'jawg-dark',
  INACTIVE_TIMEOUT: 20000 // AUMENTADO: 20 segundos en milisegundos para dar más margen
};

// --- NUEVO: Configuración de colores para dispositivos ---
const DEVICE_COLORS = {
  primary: {
    light: '#ecfeff', // cyan claro
    dark: '#053345',  // cyan oscuro
    main: '#0092b8'   // cyan principal
  },
  secondary: {
    light: '#fef3c7', // amarillo claro
    dark: '#78350f',  // amarillo oscuro
    main: '#f59e0b'   // amarillo principal
  },
  tertiary: {
    light: '#fecaca', // rojo claro
    dark: '#7f1d1d',  // rojo oscuro
    main: '#dc2626'   // rojo principal
  },
  quaternary: {
    light: '#e9d5ff', // morado claro
    dark: '#581c87',  // morado oscuro
    main: '#9333ea'   // morado principal
  },
  quinary: {
    light: '#dbeafe', // azul oscuro claro
    dark: '#1e3a8a',  // azul oscuro
    main: '#3b82f6'   // azul principal
  }
};

const getDeviceColor = (index) => {
  const colorKeys = ['primary', 'secondary', 'tertiary', 'quaternary', 'quinary'];
  const colorKey = colorKeys[index % colorKeys.length];
  return DEVICE_COLORS[colorKey];
};

// Arreglo para el ícono por defecto de Leaflet en Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// --- FUNCIÓN CORREGIDA PARA FORMATEAR TIMESTAMP ---
const formatTimestamp = (timestamp) => {
  try {
    let date;
    
    // Si el timestamp es null, undefined, o una cadena vacía
    if (!timestamp) {
      return 'Invalid Date';
    }
    
    // Convertir a string para verificar el formato
    const timestampStr = String(timestamp);
    
    // Si es un timestamp en milisegundos (13 dígitos)
    if (/^\d{13}$/.test(timestampStr)) {
      date = new Date(parseInt(timestampStr));
    }
    // Si es un timestamp en segundos (10 dígitos)
    else if (/^\d{10}$/.test(timestampStr)) {
      date = new Date(parseInt(timestampStr) * 1000);
    }
    // Si es una fecha ISO string o cualquier otro formato que Date pueda parsear
    else {
      date = new Date(timestamp);
    }
    
    // Verificar si la fecha es válida
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

// --- FUNCIÓN MEJORADA PARA VERIFICAR SI UN USUARIO ESTÁ ACTIVO ---
const isUserActive = (lastUpdate) => {
  try {
    const now = new Date();
    let lastUpdateTime;
    
    // Si el timestamp es null, undefined, o una cadena vacía
    if (!lastUpdate) {
      console.warn('No lastUpdate timestamp provided');
      return false;
    }
    
    // Convertir a string para verificar el formato
    const timestampStr = String(lastUpdate);
    
    // Si es un timestamp en milisegundos (13 dígitos)
    if (/^\d{13}$/.test(timestampStr)) {
      lastUpdateTime = new Date(parseInt(timestampStr));
    }
    // Si es un timestamp en segundos (10 dígitos)
    else if (/^\d{10}$/.test(timestampStr)) {
      lastUpdateTime = new Date(parseInt(timestampStr) * 1000);
    }
    // Si es una fecha ISO string o cualquier otro formato que Date pueda parsear
    else {
      lastUpdateTime = new Date(lastUpdate);
    }
    
    // Verificar si la fecha es válida
    if (isNaN(lastUpdateTime.getTime())) {
      console.warn('Invalid lastUpdate timestamp:', lastUpdate);
      return false;
    }
    
    const timeDifference = now.getTime() - lastUpdateTime.getTime();
    
    // Log para debugging
    console.log('Activity check:', {
      now: now.toISOString(),
      lastUpdate: lastUpdateTime.toISOString(),
      timeDifference: timeDifference,
      inactiveTimeout: config.INACTIVE_TIMEOUT,
      isActive: timeDifference <= config.INACTIVE_TIMEOUT
    });
    
    return timeDifference <= config.INACTIVE_TIMEOUT;
  } catch (error) {
    console.error('Error checking user activity:', error, lastUpdate);
    return false;
  }
};

// --- Componentes de UI ---

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
        {isNoDataError ? 'No Data Found' : 'Error de Conexión'}
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
        Reintentar
      </button>
    )}
  </div>
);

// --- Hook para detectar el tamaño de la pantalla ---
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

// --- Hook para altura dinámica del viewport ---
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

// --- ACTUALIZADO: Componente de información de usuarios para móvil con colores ---
const MobileUsersInfo = ({ users, selectedUserId, onUserSelect }) => {
  if (!users || users.length === 0) return null;

  return (
    <div className="glassmorphism-strong rounded-4xl w-full mt-6 p-6">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-white">Devices</h2>
        <span className="text-sm text-white/60">{users.length} Device{users.length !== 1 ? 's' : ''} Connected</span>
      </div>

      <div className="space-y-3">
        {users.map((user, index) => {
          const isActive = isUserActive(user.lastUpdate);
          const isSelected = selectedUserId === user.id;
          const deviceColor = getDeviceColor(index);
          
          return (
            <div
              key={user.id}
              onClick={() => onUserSelect(user.id)}
              className={`p-4 rounded-xl cursor-pointer transition-all duration-300 ${
                isSelected 
                  ? `bg-[${deviceColor.main}]/30 border border-[${deviceColor.main}]/50 shadow-lg shadow-[${deviceColor.main}]/20` 
                  : 'bg-white/5 hover:bg-white/10'
              }`}
              style={isSelected ? {
                backgroundColor: `${deviceColor.main}30`,
                borderColor: `${deviceColor.main}80`,
                boxShadow: `0 10px 25px ${deviceColor.main}20`
              } : {}}
            >
              {/* Header del usuario con color indicator */}
              <div className="flex items-center justify-between mb-3 gap-2">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div 
                    className={`w-4 h-4 rounded-full flex-shrink-0 border-2 ${isActive ? 'animate-pulse' : ''}`}
                    style={{
                      backgroundColor: isActive ? '#10b981' : '#ef4444',
                      borderColor: deviceColor.main
                    }}
                  ></div>
                  <h3 className="font-semibold text-white truncate">{user.name}</h3>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap flex-shrink-0 ${
                  isActive 
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}>
                  {isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Color indicator bar */}
              <div 
                className="w-full h-1 rounded-full mb-3"
                style={{ backgroundColor: deviceColor.main }}
              ></div>

              {/* Información de ubicación */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-white/70 flex-shrink-0">Device ID:</span>
                  <span className="text-white font-mono text-xs truncate">{user.deviceId || 'N/A'}</span>
                </div>
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
        })}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="text-xs text-white/50 text-center">
          <p>Devices go inactive after 60 seconds</p>
        </div>
      </div>
    </div>
  );
};

// --- ACTUALIZADO: Sidebar para desktop con colores ---
const DesktopUsersSidebar = ({ users, onUserSelect, selectedUserId }) => {
  return (
    <div className="fixed top-24 left-0 h-[calc(100vh-6rem)] w-80 glassmorphism-strong border-r border-white/10 z-40">
      <div className="p-6 h-full flex flex-col">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white">Devices</h2>
          <span className="text-sm text-white/60">{users.length} Device{users.length !== 1 ? 's' : ''} Connected</span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
          {users.map((user, index) => {
            const isActive = isUserActive(user.lastUpdate);
            const isSelected = selectedUserId === user.id;
            const deviceColor = getDeviceColor(index);
            
            return (
              <div
                key={user.id}
                onClick={() => onUserSelect(user.id)}
                className={`p-4 rounded-xl cursor-pointer transition-all duration-300 ${
                  isSelected 
                    ? 'border' 
                    : 'glassmorphism hover:bg-white/10'
                }`}
                style={isSelected ? {
                  backgroundColor: `${deviceColor.main}30`,
                  borderColor: `${deviceColor.main}80`
                } : {}}
              >
                {/* Header del usuario con color indicator */}
                <div className="flex items-center justify-between mb-3 gap-2">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div 
                      className={`w-4 h-4 rounded-full flex-shrink-0 border-2 ${isActive ? 'animate-pulse' : ''}`}
                      style={{
                        backgroundColor: isActive ? '#10b981' : '#ef4444',
                        borderColor: deviceColor.main
                      }}
                    ></div>
                    <h3 className="font-semibold text-white truncate">{user.name}</h3>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap flex-shrink-0 ${
                    isActive 
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                      : 'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}>
                    {isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* Color indicator bar */}
                <div 
                  className="w-full h-1 rounded-full mb-3"
                  style={{ backgroundColor: deviceColor.main }}
                ></div>

                {/* Información de ubicación */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="text-white/70 flex-shrink-0">Device ID:</span>
                    <span className="text-white font-mono text-xs truncate">{user.deviceId || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-white/70 flex-shrink-0">Type:</span>
                    <span className="text-white text-xs">{user.deviceType || 'mobile'}</span>
                  </div>
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
          })}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="text-xs text-white/50 text-center">
            <p>Devices go inactive after 60 seconds</p>
            <p className="mt-1">Auto-refresh every {config.POLLING_INTERVAL/1000}s</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- ACTUALIZADO: Modal de búsqueda por fechas con selector de dispositivo ---
const DateSearchModal = ({ isOpen, onClose, onSearch, users }) => {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Se usa el hook para determinar si la vista es móvil
  const isMobile = useMediaQuery('(max-width: 768px)');

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
  };

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    } else if (users && users.length > 0 && !selectedDeviceId) {
      // Auto-seleccionar el primer dispositivo disponible
      setSelectedDeviceId(users[0].id);
    }
  }, [isOpen, users]);

  // Estilos para los pickers en móvil
  const mobilePickerSx = {
    '& .MuiInputBase-root': { backgroundColor: 'rgba(0, 0, 0, 0.2)', borderRadius: '0.75rem' },
    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.2)' },
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative glassmorphism-strong rounded-4xl p-6 md:p-8 mx-4 w-full max-w-md md:max-w-5xl transform">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Select Date Range & Device</h2>
          <button onClick={onClose} className="text-white/60 cursor-pointer hover:text-white p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Device Selector */}
        <div className="mb-6">
          <label className="block text-white text-lg font-medium mb-3">Select Device</label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {users.map((user, index) => {
              const deviceColor = getDeviceColor(index);
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
                  style={isSelected ? {
                    backgroundColor: `${deviceColor.main}30`,
                    borderColor: deviceColor.main,
                    boxShadow: `0 10px 25px ${deviceColor.main}20`
                  } : {}}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: deviceColor.main }}
                    ></div>
                    <div className="text-left">
                      <div className="text-white font-semibold truncate">{user.name}</div>
                      <div className="text-white/60 text-xs truncate">{user.deviceId}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        
        <ThemeProvider theme={darkTheme}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            {isMobile ? (
              // --- VISTA MÓVIL ---
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
              // --- VISTA ESCRITORIO ---
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-white text-lg font-medium mb-4 text-center">Start Date</label>
                  <StaticDateTimePicker
                    orientation="landscape"
                    value={startDate}
                    onChange={(newValue) => setStartDate(newValue)}
                    maxDate={dayjs()}
                    timeSteps={{ minutes: 1 }}
                    sx={{ backgroundColor: 'rgba(0, 0, 0, 0.2)', borderRadius: '2rem' }}
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
                    sx={{ backgroundColor: 'rgba(0, 0, 0, 0.2)', borderRadius: '2rem' }}
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
        <div className="flex gap-4 pt-6 mt-4 border-t border-white/20">
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
  );
};

// --- NUEVO: Componente para interpolación de colores con múltiples dispositivos ---
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

// --- ACTUALIZADO: Componente para actualizar la vista del mapa con múltiples dispositivos ---
const MapViewUpdater = ({ userPaths, isLiveMode, users }) => {
  const map = useMap();

  useEffect(() => {
    if (!users || users.length === 0) return;

    if (isLiveMode) {
      // En modo live, ajustar zoom para mostrar todos los dispositivos activos
      const activeUsers = users.filter(user => isUserActive(user.lastUpdate));
      
      if (activeUsers.length > 1) {
        // Múltiples dispositivos activos: ajustar bounds para mostrar todos
        const allPositions = activeUsers.map(user => [
          parseFloat(user.latitude), 
          parseFloat(user.longitude)
        ]);
        
        const bounds = L.latLngBounds(allPositions);
        map.fitBounds(bounds, { 
          padding: [50, 50], 
          animate: true, 
          duration: 1.5,
          maxZoom: 16 // Limitar el zoom máximo para no acercarse demasiado
        });
      } else if (activeUsers.length === 1) {
        // Un solo dispositivo activo: centrar en él
        const user = activeUsers[0];
        const position = [parseFloat(user.latitude), parseFloat(user.longitude)];
        map.flyTo(position, 18, {
          duration: 1.5,
          easeLinearity: 0.25
        });
      }
    } else {
      // En modo histórico, ajustar para mostrar todo el path del dispositivo seleccionado
      const selectedUserPaths = Object.values(userPaths).find(paths => paths.length > 0);
      if (selectedUserPaths && selectedUserPaths.length > 1) {
        const bounds = L.latLngBounds(selectedUserPaths);
        map.fitBounds(bounds, { padding: [20, 20], animate: true, duration: 1.5 });
      }
    }
  }, [userPaths, isLiveMode, users, map]);

  return null;
};

// --- ACTUALIZADO: LocationMap con soporte para múltiples dispositivos y colores ---
const LocationMap = ({ users, userPaths, isLiveMode, selectedUserId }) => {
  const viewportHeight = useViewportHeight();
  const isMobile = useMediaQuery('(max-width: 768px)');

  // Calcula altura dinámica del mapa
  const mapHeight = isMobile 
    ? Math.max(viewportHeight - 200, 300) // En móvil, más conservador
    : Math.max(viewportHeight - 180, 400); // En desktop

  const customIcon = new Icon({
    iconUrl: "/map.png",
    iconSize: [50, 50]
  });

  // Obtener la posición central basada en usuarios activos o el seleccionado
  const getCenterPosition = () => {
    if (isLiveMode && users.length > 0) {
      const activeUsers = users.filter(user => isUserActive(user.lastUpdate));
      if (activeUsers.length > 0) {
        const firstActive = activeUsers[0];
        return [parseFloat(firstActive.latitude), parseFloat(firstActive.longitude)];
      }
      const firstUser = users[0];
      return [parseFloat(firstUser.latitude), parseFloat(firstUser.longitude)];
    } else if (selectedUserId && users.length > 0) {
      const selectedUser = users.find(user => user.id === selectedUserId);
      if (selectedUser) {
        return [parseFloat(selectedUser.latitude), parseFloat(selectedUser.longitude)];
      }
    }
    return [0, 0]; // Fallback
  };

  const centerPosition = getCenterPosition();

  return (
    <div className='glassmorphism-strong w-full mt-6 rounded-4xl backdrop-blur-lg shadow-lg p-4'>
      <MapContainer
        center={centerPosition}
        zoom={18}
        style={{ 
          height: `${mapHeight}px`, 
          width: '100%', 
          borderRadius: '1rem',
          minHeight: '300px' // Altura mínima de seguridad
        }}
      >
        <TileLayer
          url={`https://{s}.tile.jawg.io/${config.JAWG_MAP_ID}/{z}/{x}/{y}{r}.png?access-token=${config.JAWG_ACCESS_TOKEN}`}
        />

        {/* Renderizar marcadores y rutas para cada usuario */}
        {users.map((user, index) => {
          const userPosition = [parseFloat(user.latitude), parseFloat(user.longitude)];
          const deviceColor = getDeviceColor(index);
          const isActive = isUserActive(user.lastUpdate);
          const userPath = userPaths[user.id] || [userPosition];
          const isSelected = selectedUserId === user.id;

          // En modo live, mostrar todos los usuarios activos
          // En modo histórico, mostrar solo el seleccionado
          const shouldShow = isLiveMode ? isActive : isSelected;
          
          if (!shouldShow) return null;

          return (
            <div key={user.id}>
              {/* Marcador del dispositivo */}
              <Marker 
                position={userPosition} 
                icon={customIcon}
                opacity={isSelected || isLiveMode ? 1 : 0.7}
              >
                <Popup>
                  <div className="text-center">
                    <strong style={{ color: deviceColor.main }}>
                      {user.name}
                    </strong><br />
                    <small>Device: {user.deviceId}</small><br />
                    <small>Status: {isActive ? 'Active' : 'Inactive'}</small><br />
                    <small>Last Update: {formatTimestamp(user.lastUpdate)}</small><br />
                    <small>Lat: {parseFloat(user.latitude).toFixed(6)}</small><br />
                    <small>Lng: {parseFloat(user.longitude).toFixed(6)}</small>
                  </div>
                </Popup>
              </Marker>

              {/* Ruta del dispositivo */}
              {userPath.length > 1 && (
                <>
                  {isLiveMode ? (
                    <Polyline 
                      pathOptions={{ 
                        color: deviceColor.main, 
                        weight: 4, 
                        opacity: 0.8 
                      }} 
                      positions={userPath} 
                    />
                  ) : (
                    <GradientPolyline path={userPath} deviceColor={deviceColor} />
                  )}
                </>
              )}

              {/* Puntos históricos clickeables (solo en modo histórico) */}
              {!isLiveMode && userPath.map((point, pointIndex) => (
                <CircleMarker
                  key={`${user.id}-${pointIndex}`}
                  center={point}
                  radius={6}
                  pathOptions={{
                    color: deviceColor.main,
                    fillColor: deviceColor.light,
                    fillOpacity: 0.6
                  }}
                >
                  <Popup>
                    <div className="text-center">
                      <strong style={{ color: deviceColor.main }}>
                        {user.name} - Point #{pointIndex + 1}
                      </strong><br />
                      <small>Lat: {point[0].toFixed(6)}</small><br />
                      <small>Lng: {point[1].toFixed(6)}</small>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </div>
          );
        })}

        <MapViewUpdater userPaths={userPaths} isLiveMode={isLiveMode} users={users} />
      </MapContainer>
    </div>
  );
};

// --- Componente Principal ---
function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errorType, setErrorType] = useState(null);
  const [userPaths, setUserPaths] = useState({}); // Cambio: paths por usuario
  const [isDateSearchModalOpen, setIsDateSearchModalOpen] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Estados para el manejo de múltiples dispositivos
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);

  const isMobile = useMediaQuery('(max-width: 768px)');

  // ACTUALIZADO: Función para obtener datos de múltiples dispositivos
  const fetchUsersData = async () => {
    try {
      // Usar el nuevo endpoint para obtener todos los dispositivos
      const response = await fetch(`${config.API_BASE_URL}/api/devices/latest-locations`);
      
      if (response.ok) {
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
          
          setUsers(usersArray);
          
          // Actualizar paths en modo live
          if (isLiveMode) {
            setUserPaths(prevPaths => {
              const newPaths = { ...prevPaths };
              
              usersArray.forEach(user => {
                const userPosition = [parseFloat(user.latitude), parseFloat(user.longitude)];
                const currentPath = newPaths[user.id] || [];
                
                // Solo agregar si es una posición diferente
                const lastPoint = currentPath[currentPath.length - 1];
                if (!lastPoint || lastPoint[0] !== userPosition[0] || lastPoint[1] !== userPosition[1]) {
                  newPaths[user.id] = [...currentPath, userPosition];
                }
              });
              
              return newPaths;
            });
          }
          
          // Si no hay usuario seleccionado, seleccionar el primero activo
          if (!selectedUserId && usersArray.length > 0) {
            const activeUser = usersArray.find(user => isUserActive(user.lastUpdate)) || usersArray[0];
            setSelectedUserId(activeUser.id);
          }
        } else {
          // Si no hay dispositivos, usar el endpoint de fallback
          await fetchLatestLocationFallback();
        }
      } else {
        console.warn('Failed to fetch devices data, using fallback');
        await fetchLatestLocationFallback();
      }
    } catch (err) {
      console.error('Error fetching devices data:', err);
      await fetchLatestLocationFallback();
    }
  };

  // Función de fallback para obtener el último registro general
  const fetchLatestLocationFallback = async () => {
    try {
      const response = await fetch(`${config.API_BASE_URL}/api/location/latest`);
      
      if (response.ok) {
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
        
        setUsers([userData]);
        
        if (!selectedUserId) {
          setSelectedUserId(userData.id);
          const userPosition = [parseFloat(userData.latitude), parseFloat(userData.longitude)];
          setUserPaths({ [userData.id]: [userPosition] });
        }
      }
    } catch (err) {
      console.error('Error fetching fallback data:', err);
      setError('Error de conexión con el servidor');
      setErrorType('connection');
    } finally {
      setLoading(false);
    }
  };

  // ACTUALIZADO: Manejar selección de usuario
  const handleUserSelect = (userId) => {
    console.log('User selected:', userId);
    setSelectedUserId(userId);
    
    // En modo live, no necesitamos hacer nada más
    // En modo histórico, necesitaríamos recargar datos específicos del usuario
  };

  // ACTUALIZADO: Búsqueda por fecha con soporte para dispositivos específicos
  const handleDateSearch = async (searchData) => {
    setLoading(true);
    setIsLiveMode(false);
    setError(null);

    try {
      const { startDate, endDate, deviceId } = searchData;
      let url = `${config.API_BASE_URL}/api/location/range?startDate=${startDate}&endDate=${endDate}`;
      
      if (deviceId) {
        url += `&deviceId=${deviceId}`;
      }
      
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Error al obtener el historial de ubicaciones');
      }

      const historicalData = await response.json();

      if (historicalData.length > 0) {
        const newPath = historicalData.map(point => [
          parseFloat(point.latitude),
          parseFloat(point.longitude)
        ]);
        
        // Establecer path solo para el dispositivo seleccionado
        setUserPaths({ [deviceId]: newPath });
        
        // Asegurar que el usuario seleccionado corresponda al deviceId
        setSelectedUserId(deviceId);

      } else {
        setUserPaths({});
        setError('No se encontraron datos de ubicación para el rango seleccionado.');
        setErrorType('no-data');
      }
    } catch (err) {
      setError('Error de conexión al buscar el historial.');
      setErrorType('connection');
      console.error('Error fetching date range:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReturnToLive = () => {
    setIsLiveMode(true);
    setUserPaths({});
    setError(null);
    setErrorType(null);
    setLoading(true);
    setIsMobileMenuOpen(false);
  };

  // 🔥 CORRECCIÓN PRINCIPAL: useEffect con control de polling mejorado
  useEffect(() => {
    if (isLiveMode && !isDateSearchModalOpen) {
      // Solo hacer polling si estamos en live mode Y el modal no está abierto
      
      // Fetch inicial
      fetchUsersData();
      
      // Polling para actualizaciones en vivo
      const interval = setInterval(() => {
        // Doble verificación: solo hacer polling si seguimos en live mode y modal cerrado
        if (isLiveMode && !isDateSearchModalOpen) {
          fetchUsersData();
        }
      }, config.POLLING_INTERVAL);
      
      return () => clearInterval(interval);
    }
  }, [isLiveMode, isDateSearchModalOpen]); // 🔥 Agregamos isDateSearchModalOpen a las dependencias

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
                className={`flex items-center text-center cursor-pointer justify-center gap-2 w-36 text-lg transition-all duration-300 border-b-2 pt-2 ${isLiveMode
                  ? 'pb-[5px] text-cyan-600 border-cyan-600'
                  : 'pb-2 text-white border-transparent hover:text-white/50'
                  }`}
              >
                Live Tracking
              </button>
              <button
                onClick={() => setIsDateSearchModalOpen(true)}
                className={`flex items-center text-center cursor-pointer justify-center gap-2 w-36 text-lg transition-all duration-300 border-b-2 pt-2 ${!isLiveMode
                  ? 'pb-[5px] text-cyan-600 border-cyan-600'
                  : 'pb-2 text-white/50 border-transparent hover:text-white'
                  }`}
              >
                History
              </button>
            </div>
          )}
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobile && isMobileMenuOpen && (
          <div className="mt-4 glassmorphism rounded-2xl p-4 animate-fade-in">
            <button
              onClick={handleReturnToLive}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 mb-2 rounded-xl transition-all ${isLiveMode
                ? 'bg-cyan-600/20 text-cyan-600 border-2 border-cyan-600'
                : 'bg-white text-black hover:bg-white/10'
                }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              Live Tracking
            </button>
            <button
              onClick={() => {
                setIsDateSearchModalOpen(true);
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all ${!isLiveMode
                ? 'bg-cyan-600/20 text-cyan-600 border-2 border-cyan-600'
                : 'bg-white text-black hover:bg-white/10'
                }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              History
            </button>
          </div>
        )}
      </header>

      {/* Sidebar solo en desktop */}
      {!isMobile && users.length > 0 && (
        <DesktopUsersSidebar
          users={users}
          onUserSelect={handleUserSelect}
          selectedUserId={selectedUserId}
        />
      )}

      {/* Main container */}
      <main className={`max-w-[98%] mx-auto min-h-[calc(100vh-6rem)] pt-28 px-4 md:px-0 transition-all duration-300 ${
        !isMobile && users.length > 0 ? 'md:ml-96 md:mr-8' : ''
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
                fetchUsersData();
              }}
              onReturnToLive={handleReturnToLive}
              isNoDataError={errorType === 'no-data'}
            />
          </div>
        ) : users.length > 0 ? (
          <>
            <LocationMap 
              users={users}
              userPaths={userPaths} 
              isLiveMode={isLiveMode}
              selectedUserId={selectedUserId}
            />
            {/* Información de dispositivos solo en móvil */}
            {isMobile && (
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