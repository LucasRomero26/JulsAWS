import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L, { Icon } from 'leaflet';
import { ThreeDot } from 'react-loading-indicators';

// --- MUI Date Picker Imports ---
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { StaticDateTimePicker } from '@mui/x-date-pickers/StaticDateTimePicker';
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
  JAWG_MAP_ID: 'jawg-dark'
};

// Arreglo para el ícono por defecto de Leaflet en Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// --- Componentes de UI ---

const LoadingSpinner = () => (
  <div className="flex items-center mx-auto justify-center p-8">
    <ThreeDot color="#FFFFFF" size="medium" text="" textColor="" />
  </div>
);

const ErrorMessage = ({ error, onRetry, onReturnToLive, isNoDataError }) => (
  <div className="glassmorphism-strong mt-40 md:-mt-60 rounded-4xl min-w-[90%] mx-auto p-8 text-center">
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
        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl shadow-lg transition-all font-medium mx-auto"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 animate-pulse" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
        </svg>
        Return to Live
      </button>
    ) : (
      <button onClick={onRetry} className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors">
        Reintentar
      </button>
    )}
  </div>
);

const DateSearchModal = ({ isOpen, onClose, onSearch }) => {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const darkTheme = createTheme({
    palette: {
      mode: 'dark',
      primary: {
        main: '#8B5CF6',
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
            backgroundColor: 'rgba(139, 92, 246, 0.2)',
          },
        },
      },
    },
  });

  const handleSearch = async () => {
    if (!startDate || !endDate) {
      setError('Please select both a start and end date.');
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
        endDate: endDate.toISOString()
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
    setError('');
  };

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative glassmorphism-strong rounded-4xl p-8 mx-4 w-full max-w-5xl transform">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Select Date Range</h2>
          <button onClick={onClose} className="text-white/60 cursor-pointer hover:text-white p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <ThemeProvider theme={darkTheme}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="block text-white text-lg font-medium mb-4 text-center">Start Date</label>
                <StaticDateTimePicker
                  orientation="landscape"
                  value={startDate}
                  onChange={(newValue) => setStartDate(newValue)}
                  maxDate={dayjs()}
                  timeSteps={{ minutes: 1 }}
                  sx={{ backgroundColor: 'rgba(0, 0, 0, 0.2)', borderRadius: '2rem', color: '#FFFFFF' }}
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
                  sx={{ backgroundColor: 'rgba(0, 0, 0, 0.2)', borderRadius: '2rem', color: '#FFFFFF' }}
                />
              </div>
            </div>
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
            disabled={isLoading || !startDate || !endDate}
            className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 text-white rounded-xl transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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

const LocationInfo = ({ location, formatTimestamp, onOpenDateSearch }) => (
  <div className='flex flex-col p-8 rounded-4xl glassmorphism-strong '>
    <div className=' rounded-4xl h-auto'>
      <h2 className='text-2xl font-bold text-white text-center rounded-4xl mb-8'>Last Location Received</h2>
      <div className='flex flex-row justify-between gap-4 glassmorphism group hover:scale-105 hover:shadow-[0px_3px_15px_0px_rgba(142,81,255,0.6)] rounded-xl mb-3 pl-2 pr-6 py-2'>
        <div className='flex flex-row gap-2 justify-left transition-all duration-300 group-hover:scale-105'>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="text-white duration-300 group-hover:text-violet-500 size-6"><path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm4.28 10.28a.75.75 0 0 0 0-1.06l-3-3a.75.75 0 1 0-1.06 1.06l1.72 1.72H8.25a.75.75 0 0 0 0 1.5h5.69l-1.72 1.72a.75.75 0 1 0 1.06 1.06l3-3Z" clipRule="evenodd" /></svg>
          <h3 className='text-l text-white rounded-xl inline-block'>Latitude:</h3>
        </div>
        <div className="flex flex-col items-end">
          <span className='text-white/80 font-mono'>{parseFloat(location.latitude).toFixed(8)}</span>
        </div>
      </div>
      <div className='flex flex-row justify-between gap-4 glassmorphism group hover:scale-105 hover:shadow-[0px_3px_15px_0px_rgba(142,81,255,0.6)] rounded-xl mb-3 pl-2 pr-6 py-2'>
        <div className='flex flex-row gap-2 justify-left transition-all duration-300 group-hover:scale-105'>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="text-white duration-300 group-hover:text-violet-500 size-6"><path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm.53 5.47a.75.75 0 0 0-1.06 0l-3 3a.75.75 0 1 0 1.06 1.06l1.72-1.72v5.69a.75.75 0 0 0 1.5 0v-5.69l1.72 1.72a.75.75 0 1 0 1.06-1.06l-3-3Z" clipRule="evenodd" /></svg>
          <h3 className='text-l text-white rounded-xl inline-block'>Longitude:</h3>
        </div>
        <div className="flex flex-col items-end">
          <span className='text-white/80 font-mono'>{parseFloat(location.longitude).toFixed(8)}</span>
        </div>
      </div>
      <div className='flex flex-row justify-between gap-4 glassmorphism group hover:scale-105 hover:shadow-[0px_3px_15px_0px_rgba(142,81,255,0.6)] rounded-xl mb-3 pl-2 pr-6 py-2'>
        <div className='flex flex-row gap-2 group justify-left transition-all duration-300 group-hover:scale-105'>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="text-white duration-300 group-hover:text-violet-500 size-6"><path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 6a.75.75 0 0 0-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 0 0 0-1.5h-3.75V6Z" clipRule="evenodd" /></svg>
          <h3 className='text-l text-white rounded-xl inline-block'>Timestamp:</h3>
        </div>
        <div className="flex flex-col items-end">
          <span className='text-white/80 font-mono'>{formatTimestamp(location.timestamp_value)}</span>
        </div>
      </div>
    </div>
    <button
      onClick={onOpenDateSearch}
      className='button-hover inline-flex items-center justify-center gap-2 font-semibold rounded-full transition-all duration-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-800 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-violet-600 to-violet-700 text-white hover:from-violet-700 hover:to-violet-800 px-20 py-3 md:px-20 md:py-2 text-base md:text-lg mt-2 mx-auto'
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
      <span className='group-hover:text-white/90 duration-300'>Search by Date</span>
    </button>
  </div>
);

// --- NUEVO: Helper para interpolar colores ---
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

// --- NUEVO: Componente para renderizar la polilínea con degradado ---
const GradientPolyline = ({ path }) => {
  if (path.length < 2) {
    return null; // No se puede dibujar una línea con menos de dos puntos
  }

  const startColor = "#C4B5FD"; // Un violeta claro (inicio)
  const endColor = "#6D28D9";   // Un violeta oscuro (fin)

  const segments = path.slice(1).map((point, index) => {
    const segmentPath = [path[index], point];
    const factor = index / (path.length - 2); // Factor de 0 a 1
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


// --- MODIFICADO: Componente que actualiza la vista del mapa ---
const MapViewUpdater = ({ path, isLiveMode }) => {
  const map = useMap();

  useEffect(() => {
    if (!path || path.length === 0) return;

    if (!isLiveMode && path.length > 1) {
      // MODO HISTÓRICO: Ajusta los límites para mostrar toda la ruta
      const bounds = L.latLngBounds(path);
      map.fitBounds(bounds.pad(0.1), { animate: true, duration: 1.5 });
    } else {
      // MODO EN VIVO: Vuela a la última posición conocida
      const lastPosition = path[path.length - 1];
      map.flyTo(lastPosition, 18, {
        duration: 1.5,
        easeLinearity: 0.25
      });
    }
  }, [path, isLiveMode, map]);

  return null;
};

// --- Componente del Mapa ---
const LocationMap = ({ location, formatTimestamp, path, isLiveMode }) => {
  const position = [parseFloat(location.latitude), parseFloat(location.longitude)];

  const customIcon = new Icon({
    iconUrl: "/icon.svg",
    iconSize: [70, 70]
  });

  return (
    <div className='glassmorphism-strong rounded-4xl backdrop-blur-lg shadow-lg p-4 max-w-4xl w-full mx-4'>
      <MapContainer
        center={position}
        zoom={18}
        style={{ height: '35rem', width: '100%', borderRadius: '1rem' }}
      >
        <TileLayer
          url={`https://{s}.tile.jawg.io/${config.JAWG_MAP_ID}/{z}/{x}/{y}{r}.png?access-token=${config.JAWG_ACCESS_TOKEN}`}
        />
        <Marker position={position} icon={customIcon}>
          <Popup>
            <div className="text-center">
              <strong>Ubicación actual</strong><br />
              <small>Recibida: {formatTimestamp(location.timestamp_value)}</small><br />
              <small>Lat: {parseFloat(location.latitude).toFixed(6)}</small><br />
              <small>Lng: {parseFloat(location.longitude).toFixed(6)}</small>
            </div>
          </Popup>
        </Marker>
        {isLiveMode ? (
          <Polyline pathOptions={{ color: '#8B5CF6', weight: 4 }} positions={path} />
        ) : (
          <GradientPolyline path={path} />
        )}
        <MapViewUpdater path={path} isLiveMode={isLiveMode} />
      </MapContainer>
    </div>
  );
};

// --- Componente Principal ---
function App() {
  const [locationData, setLocationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errorType, setErrorType] = useState(null);
  const [path, setPath] = useState([]);
  const [isDateSearchModalOpen, setIsDateSearchModalOpen] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(true);

  const fetchLatestLocation = async () => {
    try {
      const response = await fetch(`${config.API_BASE_URL}/api/location/latest`);

      if (!response.ok) {
        if (response.status === 404) {
          setError('No hay datos de ubicación disponibles');
          setErrorType('connection');
          setLocationData(null);
        } else {
          throw new Error('Error al obtener datos');
        }
      } else {
        const data = await response.json();
        setLocationData(data);

        const newPosition = [parseFloat(data.latitude), parseFloat(data.longitude)];
        setPath(prevPath => {
          const lastPoint = prevPath[prevPath.length - 1];
          if (!lastPoint || lastPoint[0] !== newPosition[0] || lastPoint[1] !== newPosition[1]) {
            return [...prevPath, newPosition];
          }
          return prevPath;
        });
        setError(null);
        setErrorType(null);
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
      setErrorType('connection');
      console.error('Error fetching location:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDateSearch = async (searchData) => {
    console.log('Búsqueda por fecha iniciada:', searchData);
    setLoading(true);
    setIsLiveMode(false);
    setError(null);
    setErrorType(null);

    try {
      const { startDate, endDate } = searchData;
      const response = await fetch(`${config.API_BASE_URL}/api/location/range?startDate=${startDate}&endDate=${endDate}`);

      if (!response.ok) {
        throw new Error('Error al obtener el historial de ubicaciones');
      }

      const historicalData = await response.json();

      if (historicalData.length > 0) {
        const newPath = historicalData.map(point => [
          parseFloat(point.latitude),
          parseFloat(point.longitude)
        ]);
        setPath(newPath);

        const lastLocationInRange = historicalData[historicalData.length - 1];
        setLocationData({
          latitude: lastLocationInRange.latitude,
          longitude: lastLocationInRange.longitude,
          timestamp_value: lastLocationInRange.timestamp_value
        });

      } else {
        setPath([]);
        setError('No se encontraron datos de ubicación para el rango seleccionado.');
        setErrorType('no-data');
        setLocationData(null);
      }
    } catch (err) {
      setError('Error de conexión al buscar el historial.');
      setErrorType('connection');
      console.error('Error fetching date range:', err);
    } finally {
      setLoading(false);
    }
  };

  // Función para manejar el retorno al modo live
  const handleReturnToLive = () => {
    setIsLiveMode(true);
    setPath([]);
    setError(null);
    setErrorType(null);
    setLoading(true);
  };

  useEffect(() => {
    if (isLiveMode) {
        fetchLatestLocation(); // Carga inicial en modo en vivo
        const interval = setInterval(fetchLatestLocation, config.POLLING_INTERVAL);
        return () => clearInterval(interval);
    }
  }, [isLiveMode]);

  const formatTimestamp = (timestamp) => {
    const date = new Date(parseInt(timestamp));
    return date.toLocaleString('es-ES', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  return (
    <div className="min-h-screen transition-all duration-500 dark">
      <div className="fixed inset-0 -z-10 transition-all duration-500">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-950 via-violet-400 to-violet-800"></div>
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-10 w-72 h-72 md:w-96 md:h-96 bg-indigo-500 rounded-full filter blur-3xl opacity-40 animate-float"></div>
          <div className="absolute bottom-20 right-10 w-64 h-64 md:w-80 md:h-80 bg-gray-400 rounded-full filter blur-3xl opacity-30 animate-float"></div>
          <div className="absolute top-1/2 left-1/2 w-48 h-48 md:w-64 md:h-64 bg-zinc-500 rounded-full filter blur-3xl opacity-20 animate-float"></div>
        </div>
      </div>

      <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50 glassmorphism-strong min-w-[80%] md:min-w-[90%] py-3 px-4 rounded-4xl">
        <div className="flex flex-col items-center gap-2">
          <h1 className="py-1 px-3 text-center font-bold text-white/80 text-3xl">
            {config.APP_NAME}
          </h1>
          <p className="text-white/60 text-sm">{config.APP_SUBTITLE}</p>
        </div>
      </header>

      <main className='flex flex-col md:flex-row items-center mt-50 md:mt-15 justify-between gap-2 max-w-[90%] mx-auto min-h-screen'>
        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <ErrorMessage 
            error={error} 
            onRetry={() => {
              if (isLiveMode) {
                fetchLatestLocation();
              } else {
                setError(null);
                setErrorType(null);
              }
            }}
            onReturnToLive={handleReturnToLive}
            isNoDataError={errorType === 'no-data'}
          />
        ) : locationData ? (
          <>
            {!isLiveMode && (
              <div className="absolute top-40 left-1/5 -translate-x-1/2 z-40">
                <button
                  onClick={handleReturnToLive}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl shadow-lg transition-all font-medium"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 animate-pulse" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
                  Return to Live
                </button>
              </div>
            )}
            <LocationInfo
              location={locationData}
              formatTimestamp={formatTimestamp}
              onOpenDateSearch={() => setIsDateSearchModalOpen(true)}
            />
            <LocationMap location={locationData} formatTimestamp={formatTimestamp} path={path} isLiveMode={isLiveMode} />
          </>
        ) : (
          <div className="glassmorphism-strong min-w-[90%] mx-auto rounded-4xl p-8 text-center">
            <p className="text-white/70 mb-4">Waiting for location data...</p>
          </div>
        )}
      </main>

      <DateSearchModal
        isOpen={isDateSearchModalOpen}
        onClose={() => setIsDateSearchModalOpen(false)}
        onSearch={handleDateSearch}
      />
    </div>
  );
}

export default App;