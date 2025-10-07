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
import MobileUsersInfo from './components/MobileUsersInfo';
import LocationMap from './components/LocationMap';
import DateSearchModal from './components/DateSearchModal';

// --- Componente Principal ---
function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errorType, setErrorType] = useState(null);
  const [userPaths, setUserPaths] = useState({});
  const [isDateSearchModalOpen, setIsDateSearchModalOpen] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Estados para el manejo de múltiples dispositivos
  const [users, setUsers] = useState([]);
  const [previousUsers, setPreviousUsers] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);

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
        if (isLiveMode) {
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
    setIsLiveMode(true);
    setUserPaths({});
    setError(null);
    setErrorType(null);
    setLoading(true);
    setIsMobileMenuOpen(false);
    setPreviousUsers(null); // Resetear estado anterior
  };

  // Effect principal para polling MEJORADO
  useEffect(() => {
    if (isLiveMode && !isDateSearchModalOpen) {
      // Fetch inicial
      fetchUsersData();

      // Polling para actualizaciones en vivo con intervalo optimizado
      const interval = setInterval(() => {
        if (isLiveMode && !isDateSearchModalOpen && document.visibilityState === 'visible') {
          fetchUsersData();
        }
      }, config.POLLING_INTERVAL);

      return () => clearInterval(interval);
    }
  }, [isLiveMode, isDateSearchModalOpen, selectedUserId]);

  return (
    <div className="min-h-screen transition-all duration-500 dark">
      {/* ANIMATED BACKGROUND */}
      <AnimatedBackground />

      {/* Header */}
      <Header
        isMobile={isMobile}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        isLiveMode={isLiveMode}
        handleReturnToLive={handleReturnToLive}
        setIsDateSearchModalOpen={setIsDateSearchModalOpen}
      />

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
            <LocationMap
              users={users}
              userPaths={userPaths}
              isLiveMode={isLiveMode}
              selectedUserId={selectedUserId}
              previousUsers={previousUsers}
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
