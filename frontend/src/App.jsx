import { useState, useEffect } from 'react';
import './App.css';

// --- Importaciones de configuración ---
import { config } from './config/appConfig';

// --- Importaciones de utilidades ---
import { deviceColorManager } from './utils/colorManager';
import { isUserActive } from './utils/dateUtils';

// --- Importaciones de hooks ---
import { useMediaQuery } from './hooks/useMediaQuery';

// --- Importaciones de componentes ---
import AnimatedBackground from './components/AnimatedBackground';
import Header from './components/Header';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorMessage from './components/ErrorMessage';
import DesktopUsersSidebar from './components/DesktopUsersSidebar';
import AreaSidebar from './components/AreaSidebar';
import MobileUsersInfo from './components/MobileUsersInfo';
import LocationMap from './components/LocationMap';
import DateSearchModal from './components/DateSearchModal';
import AreaSearchModal from './components/AreaSearchModal';

// --- Componente Principal ---
function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errorType, setErrorType] = useState(null);
  const [userPaths, setUserPaths] = useState({});
  const [isDateSearchModalOpen, setIsDateSearchModalOpen] = useState(false);
  const [mode, setMode] = useState('live'); // 'live', 'history', or 'areaHistory'
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Estados para el manejo de múltiples dispositivos
  const [users, setUsers] = useState([]);
  const [previousUsers, setPreviousUsers] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);

  // Estados para History by Area
  const [isAreaSearchModalOpen, setIsAreaSearchModalOpen] = useState(false);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawnCircle, setDrawnCircle] = useState(null);
  const [selectedDevicesForArea, setSelectedDevicesForArea] = useState([]);

  const isMobile = useMediaQuery('(max-width: 768px)');

  // Función para obtener datos de múltiples dispositivos MEJORADA
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

        // Limpiar dispositivos inactivos del gestor de colores
        const activeDeviceIds = usersArray.map(user => user.id);
        deviceColorManager.cleanupInactiveDevices(activeDeviceIds);

        // Guardar estado anterior antes de actualizar
        setPreviousUsers(users);
        setUsers(usersArray);

        // Actualizar paths en modo live de forma más eficiente
        if (mode === 'live') {
          setUserPaths(prevPaths => {
            const newPaths = { ...prevPaths };
            let hasChanges = false;

            usersArray.forEach(user => {
              // Validar coordenadas antes de agregar
              const lat = parseFloat(user.latitude);
              const lng = parseFloat(user.longitude);

              if (!isNaN(lat) && !isNaN(lng)) {
                const userPosition = [lat, lng];
                const currentPath = newPaths[user.id] || [];

                // Solo agregar si es una posición significativamente diferente
                const lastPoint = currentPath[currentPath.length - 1];
                if (!lastPoint ||
                  Math.abs(lastPoint[0] - userPosition[0]) > 0.00001 ||
                  Math.abs(lastPoint[1] - userPosition[1]) > 0.00001) {
                  newPaths[user.id] = [...currentPath, userPosition];
                  hasChanges = true;

                  // Limitar el historial para evitar arrays muy grandes
                  if (newPaths[user.id].length > 50) {
                    newPaths[user.id] = newPaths[user.id].slice(-25);
                  }
                }
              }
            });

            return hasChanges ? newPaths : prevPaths;
          });
        }

        // Si no hay usuario seleccionado, seleccionar el primero activo
        // MEJORADO: Mantener la selección actual si el usuario sigue existiendo
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

  // Función de fallback MEJORADA
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

  // MEJORADO: Manejar selección de usuario sin causar scroll automático innecesario
  const handleUserSelect = (userId) => {
    console.log('User selected:', userId);
    // Solo actualizar si es diferente al seleccionado actual
    if (selectedUserId !== userId) {
      setSelectedUserId(userId);
    }
  };

  // Búsqueda por fecha
  const handleDateSearch = async (searchData) => {
    setLoading(true);
    setMode('history');
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

  const handleReturnToLive = () => {
    setMode('live');
    setUserPaths({});
    setError(null);
    setErrorType(null);
    setLoading(true);
    setIsMobileMenuOpen(false);
    setPreviousUsers(null);
    // Reset area history states
    setDrawnCircle(null);
    setIsDrawingMode(false);
    setSelectedDevicesForArea([]);
  };

  // Handle area history mode
  const handleSetAreaHistoryMode = () => {
    setMode('areaHistory');
    setUserPaths({});
    setError(null);
    setErrorType(null);
    setIsMobileMenuOpen(false);
    setIsDrawingMode(false);
    setDrawnCircle(null);
    setSelectedDevicesForArea([]);
  };

  // Handle circle complete - open device selection modal
  const handleCircleComplete = (circle) => {
    setDrawnCircle(circle);
    setIsDrawingMode(false);
    setIsAreaSearchModalOpen(true);
  };

  // Handle device selection for area
  const handleDeviceSelectForArea = async (deviceId) => {
    if (!drawnCircle) return;

    setLoading(true);
    setError(null);

    try {
      const url = `${config.API_BASE_URL}/api/location/area?lat=${drawnCircle.center[0]}&lng=${drawnCircle.center[1]}&radius=${drawnCircle.radius}&deviceId=${deviceId}`;
      
      console.log('Fetching area data:', url);
      const response = await fetch(url);

      console.log('Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        let errorData;
        const contentType = response.headers.get('content-type');
        console.log('Error response content-type:', contentType);
        
        try {
          const responseText = await response.text();
          console.log('Error response text:', responseText);
          errorData = JSON.parse(responseText);
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
        }
        
        console.error('Backend error response:', errorData);
        throw new Error(errorData.error || errorData.message || `HTTP ${response.status}: ${errorData.error || 'Error fetching area history'}`);
      }

      const areaData = await response.json();
      console.log('Area data received:', areaData.length, 'points');

      if (areaData.length > 0) {
        const newPath = areaData
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
          setUserPaths(prev => ({ ...prev, [deviceId]: newPath }));
          setSelectedDevicesForArea(prev => [...prev, deviceId]);
        } else {
          setError(`No locations found for this device in the selected area.`);
          setErrorType('no-data');
        }
      } else {
        setError(`No locations found for this device in the selected area.`);
        setErrorType('no-data');
      }
    } catch (err) {
      setError('Error fetching area history.');
      setErrorType('connection');
      console.error('Error fetching area data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle device toggle in area sidebar
  const handleDeviceToggleForArea = async (deviceId) => {
    if (selectedDevicesForArea.includes(deviceId)) {
      // Remove device
      setSelectedDevicesForArea(prev => prev.filter(id => id !== deviceId));
      setUserPaths(prev => {
        const newPaths = { ...prev };
        delete newPaths[deviceId];
        return newPaths;
      });
    } else {
      // Add device - fetch its data
      if (!drawnCircle) return;

      setLoading(true);
      setError(null);

      try {
        const url = `${config.API_BASE_URL}/api/location/area?lat=${drawnCircle.center[0]}&lng=${drawnCircle.center[1]}&radius=${drawnCircle.radius}&deviceId=${deviceId}`;
        
        console.log('Fetching area data for toggle:', url);
        const response = await fetch(url);

        console.log('Response status:', response.status, response.statusText);
        
        if (!response.ok) {
          let errorData;
          const contentType = response.headers.get('content-type');
          console.log('Error response content-type:', contentType);
          
          try {
            const responseText = await response.text();
            console.log('Error response text:', responseText);
            errorData = JSON.parse(responseText);
          } catch (parseError) {
            console.error('Failed to parse error response:', parseError);
            errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
          }
          
          console.error('Backend error response:', errorData);
          throw new Error(errorData.error || errorData.message || `HTTP ${response.status}: ${errorData.error || 'Error fetching area history'}`);
        }

        const areaData = await response.json();
        console.log('Area data received for toggle:', areaData.length, 'points');

        if (areaData.length > 0) {
          const newPath = areaData
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
            setUserPaths(prev => ({ ...prev, [deviceId]: newPath }));
            setSelectedDevicesForArea(prev => [...prev, deviceId]);
          }
        }
      } catch (err) {
        console.error('Error fetching area data for device:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  // Effect principal para polling MEJORADO
  useEffect(() => {
    if (mode === 'live' && !isDateSearchModalOpen) {
      // Fetch inicial
      fetchUsersData();

      // Polling para actualizaciones en vivo con intervalo optimizado
      const interval = setInterval(() => {
        if (mode === 'live' && !isDateSearchModalOpen && document.visibilityState === 'visible') {
          fetchUsersData();
        }
      }, config.POLLING_INTERVAL);

      return () => clearInterval(interval);
    }
  }, [mode, isDateSearchModalOpen, selectedUserId]);

  return (
    <div className="min-h-screen transition-all duration-500 dark">
      {/* ANIMATED BACKGROUND */}
      <AnimatedBackground />

      {/* Header */}
      <Header
        isMobile={isMobile}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        mode={mode}
        handleReturnToLive={handleReturnToLive}
        setIsDateSearchModalOpen={setIsDateSearchModalOpen}
        setIsAreaHistoryMode={handleSetAreaHistoryMode}
      />

      {/* Sidebar solo en desktop */}
      {!isMobile && users.length > 0 && mode !== 'areaHistory' && (
        <DesktopUsersSidebar
          users={users}
          onUserSelect={handleUserSelect}
          selectedUserId={selectedUserId}
        />
      )}

      {/* Area Sidebar for area history mode */}
      {!isMobile && users.length > 0 && mode === 'areaHistory' && (
        <AreaSidebar
          users={users}
          selectedDevices={selectedDevicesForArea}
          onDeviceToggle={handleDeviceToggleForArea}
          areaInfo={drawnCircle}
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
            {/* Floating button to enable drawing mode in area history */}
            {mode === 'areaHistory' && !drawnCircle && (
              <>
                <button
                  onClick={() => setIsDrawingMode(!isDrawingMode)}
                  className={`fixed top-32 right-8 z-50 p-4 rounded-full shadow-2xl transition-all duration-300 ${
                    isDrawingMode 
                      ? 'bg-cyan-600 hover:bg-cyan-700 animate-pulse' 
                      : 'bg-white/10 hover:bg-white/20 backdrop-blur-lg'
                  }`}
                  title={isDrawingMode ? 'Drawing mode active - Click and drag to draw circle' : 'Click to enable drawing mode'}
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
                
                {/* Indicator when drawing mode is active */}
                {isDrawingMode && (
                  <div className="fixed top-48 right-8 z-50 glassmorphism-strong rounded-2xl p-4 shadow-2xl animate-fade-in">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-cyan-500 rounded-full animate-pulse"></div>
                      <div className="text-white">
                        <p className="text-sm font-semibold">Drawing Mode Active</p>
                        <p className="text-xs text-white/70">Click and drag to draw circle</p>
                        <p className="text-xs text-white/50 mt-1">Map panning disabled</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Button to redraw circle if one exists */}
            {mode === 'areaHistory' && drawnCircle && (
              <button
                onClick={() => {
                  setDrawnCircle(null);
                  setSelectedDevicesForArea([]);
                  setUserPaths({});
                  setIsDrawingMode(true);
                }}
                className="fixed top-32 right-8 z-50 p-4 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-lg shadow-2xl transition-all duration-300"
                title="Redraw area"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            )}

            <LocationMap
              users={users}
              userPaths={userPaths}
              isLiveMode={mode === 'live'}
              selectedUserId={selectedUserId}
              previousUsers={previousUsers}
              mode={mode}
              isDrawingMode={isDrawingMode}
              onCircleComplete={handleCircleComplete}
              drawnCircle={drawnCircle}
              selectedDevicesForArea={selectedDevicesForArea}
            />
            {/* Información de dispositivos solo en móvil */}
            {isMobile && mode !== 'areaHistory' && (
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

      <AreaSearchModal
        isOpen={isAreaSearchModalOpen}
        onClose={() => setIsAreaSearchModalOpen(false)}
        onDeviceSelect={handleDeviceSelectForArea}
        users={users}
        areaInfo={drawnCircle}
      />
    </div>
  );
}

export default App;
