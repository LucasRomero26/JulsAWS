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
import RouteSelectionModal from './components/RouteSelectionModal';
import TimelineSlider from './components/TimelineSlider';
import StreamViewer from './components/StreamViewer';
import ContainersView from './components/ContainersView';
import ContainersWLView from './components/ContainersWLView';
import ReportsView from './components/ReportsView';
import { splitIntoRoutes, calculateRouteDistance } from './utils/pathUtils';

// --- Componente Principal ---
function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errorType, setErrorType] = useState(null);
  const [userPaths, setUserPaths] = useState({});
  const [isDateSearchModalOpen, setIsDateSearchModalOpen] = useState(false);
  const [mode, setMode] = useState('live');
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
  const [deviceRoutes, setDeviceRoutes] = useState({});
  const [selectedRoutes, setSelectedRoutes] = useState({});
  const [isRouteSelectionModalOpen, setIsRouteSelectionModalOpen] = useState(false);
  
  // Estados para Timeline control
  const [timelinePosition, setTimelinePosition] = useState(100);
  const [areaDateRange, setAreaDateRange] = useState(null);

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

  const handleUserSelect = (userId) => {
    console.log('User selected:', userId);
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
    setDeviceRoutes({});
    setSelectedRoutes({});
    setIsRouteSelectionModalOpen(false);
    setTimelinePosition(100);
    setAreaDateRange(null);
  };

  const handleSetStreamMode = () => {
    setMode('stream');
    setUserPaths({});
    setError(null);
    setErrorType(null);
    setIsMobileMenuOpen(false);
  };

  const handleSetContainersMode = () => {
    setMode('containers');
    setUserPaths({});
    setError(null);
    setErrorType(null);
    setIsMobileMenuOpen(false);
  };

  // ✨ Handler para Containers WL
  const handleSetContainersWLMode = () => {
    setMode('containersWL');
    setUserPaths({});
    setError(null);
    setErrorType(null);
    setIsMobileMenuOpen(false);
  };

  // ✨ NUEVO: Handler para Reports
  const handleSetReportsMode = () => {
    setMode('reports');
    setUserPaths({});
    setError(null);
    setErrorType(null);
    setIsMobileMenuOpen(false);
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
    setDeviceRoutes({});
    setSelectedRoutes({});
    setIsRouteSelectionModalOpen(false);
    setTimelinePosition(100);
    setAreaDateRange(null);
  };

  // Handle circle complete - open device selection modal
  const handleCircleComplete = (circle) => {
    setDrawnCircle(circle);
    setIsDrawingMode(false);
    setIsAreaSearchModalOpen(true);
  };

  // Handle device selection for area
  const handleDeviceSelectForArea = async (deviceId, startDate, endDate) => {
    if (!drawnCircle) return;

    setLoading(true);
    setError(null);
    setAreaDateRange({ startDate, endDate });

    try {
      const url = `${config.API_BASE_URL}/api/location/area?lat=${drawnCircle.center[0]}&lng=${drawnCircle.center[1]}&radius=${drawnCircle.radius}&deviceId=${deviceId}&startDate=${startDate}&endDate=${endDate}`;

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
        // Split into routes based on 10-minute gaps
        const routes = splitIntoRoutes(areaData, 10);
        console.log(`Found ${routes.length} route(s) for device ${deviceId}`);

        // Calculate distance for each route
        routes.forEach(route => {
          route.distance = calculateRouteDistance(route.coordinates);
        });

        if (routes.length > 0) {
          // Store routes for this device
          setDeviceRoutes(prev => ({ ...prev, [deviceId]: routes }));

          // Auto-select all routes for this device
          const allRouteIds = routes.map(r => r.id);
          setSelectedRoutes(prev => ({ ...prev, [deviceId]: allRouteIds }));

          // Add device to selected devices
          setSelectedDevicesForArea(prev => [...prev, deviceId]);

          // Store the first route's path for backward compatibility
          setUserPaths(prev => ({ ...prev, [deviceId]: routes[0].coordinates }));
          
          // Reset timeline to show full route
          setTimelinePosition(100);
        } else {
          setError(`No valid routes found for this device in the selected area and date range.`);
          setErrorType('no-data');
        }
      } else {
        setError(`No locations found for this device in the selected area and date range.`);
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
      setDeviceRoutes(prev => {
        const newRoutes = { ...prev };
        delete newRoutes[deviceId];
        return newRoutes;
      });
      setSelectedRoutes(prev => {
        const newSelected = { ...prev };
        delete newSelected[deviceId];
        return newSelected;
      });
    } else {
      // Add device - fetch its data
      if (!drawnCircle || !areaDateRange) return;

      setLoading(true);
      setError(null);

      try {
        const { startDate, endDate } = areaDateRange;
        const url = `${config.API_BASE_URL}/api/location/area?lat=${drawnCircle.center[0]}&lng=${drawnCircle.center[1]}&radius=${drawnCircle.radius}&deviceId=${deviceId}&startDate=${startDate}&endDate=${endDate}`;

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
          // Split into routes based on 10-minute gaps
          const routes = splitIntoRoutes(areaData, 10);
          console.log(`Found ${routes.length} route(s) for device ${deviceId}`);

          // Calculate distance for each route
          routes.forEach(route => {
            route.distance = calculateRouteDistance(route.coordinates);
          });

          if (routes.length > 0) {
            // Store routes for this device
            setDeviceRoutes(prev => ({ ...prev, [deviceId]: routes }));

            // Auto-select all routes for this device
            const allRouteIds = routes.map(r => r.id);
            setSelectedRoutes(prev => ({ ...prev, [deviceId]: allRouteIds }));

            // Add device to selected devices
            setSelectedDevicesForArea(prev => [...prev, deviceId]);

            // Store the first route's path for backward compatibility
            setUserPaths(prev => ({ ...prev, [deviceId]: routes[0].coordinates }));
          }
        }
      } catch (err) {
        console.error('Error fetching area data for device:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  // Handle route toggle (select/deselect individual routes)
  const handleRouteToggle = (deviceId, routeId) => {
    setSelectedRoutes(prev => {
      const deviceRoutes = prev[deviceId] || [];
      const newDeviceRoutes = deviceRoutes.includes(routeId)
        ? deviceRoutes.filter(id => id !== routeId)
        : [...deviceRoutes, routeId];

      return { ...prev, [deviceId]: newDeviceRoutes };
    });
  };

  // Handle timeline change
  const handleTimelineChange = (position) => {
    setTimelinePosition(position);
  };

  // Effect principal para polling
  useEffect(() => {
    if (mode === 'live' && !isDateSearchModalOpen) {
      fetchUsersData();

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
        setStreamMode={handleSetStreamMode}
        setContainersMode={handleSetContainersMode}
        setContainersWLMode={handleSetContainersWLMode}
        setReportsMode={handleSetReportsMode}
      />

      {/* Sidebar solo en desktop */}
      {!isMobile && users.length > 0 && mode !== 'areaHistory' && mode !== 'stream' && mode !== 'containers' && mode !== 'containersWL' && mode !== 'reports' && (
        <DesktopUsersSidebar
          users={users}
          onUserSelect={handleUserSelect}
          selectedUserId={selectedUserId}
        />
      )}

      {/* Area Sidebar for area history mode */}
      {!isMobile && users.length > 0 && mode === 'areaHistory' && mode !== 'stream' && mode !== 'containers' && mode !== 'containersWL' && mode !== 'reports' && (
        <AreaSidebar
          users={users}
          selectedDevices={selectedDevicesForArea}
          onDeviceToggle={handleDeviceToggleForArea}
          areaInfo={drawnCircle}
        />
      )}

      {/* Main container */}
      <main className={`max-w-[98%] mx-auto min-h-[calc(100vh-6rem)] pt-28 px-4 md:px-0 transition-all duration-300 ${!isMobile && users.length > 0 && mode !== 'stream' && mode !== 'containers' && mode !== 'containersWL' && mode !== 'reports' ? 'md:ml-80' : ''
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
        ) : mode === 'stream' ? (
          <StreamViewer />
        ) : mode === 'containers' ? (
          <ContainersView />
        ) : mode === 'containersWL' ? (
          <ContainersWLView />
        ) : mode === 'reports' ? (
          <ReportsView />
        ) : users.length > 0 ? (
          <>
            {/* Action Buttons Bar for Area History Mode */}
            {mode === 'areaHistory' && (
              <div className="glassmorphism-strong rounded-3xl p-3 mb-3 shadow-lg">
                <div className="flex flex-wrap items-center justify-between gap-3">

                  {/* Left side - Action buttons */}
                  <div className="flex flex-wrap items-center gap-3 flex-1">
                    {/* Draw Area Button - shown when no circle is drawn */}
                    {!drawnCircle && (
                      <button
                        onClick={() => setIsDrawingMode(!isDrawingMode)}
                        className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl flex-1 shadow-lg transition-all duration-300 ${isDrawingMode
                          ? 'bg-cyan-600 hover:bg-cyan-700 animate-pulse'
                          : 'bg-white/10 hover:bg-white/20 backdrop-blur-lg'
                          }`}
                        title={isDrawingMode ? 'Drawing mode active - Click and drag to draw circle' : 'Click to enable drawing mode'}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
                          <path fillRule="evenodd" d="M20.599 1.5c-.376 0-.743.111-1.055.32l-5.08 3.385a18.747 18.747 0 0 0-3.471 2.987 10.04 10.04 0 0 1 4.815 4.815 18.748 18.748 0 0 0 2.987-3.472l3.386-5.079A1.902 1.902 0 0 0 20.599 1.5Zm-8.3 14.025a18.76 18.76 0 0 0 1.896-1.207 8.026 8.026 0 0 0-4.513-4.513A18.75 18.75 0 0 0 8.475 11.7l-.278.5a5.26 5.26 0 0 1 3.601 3.602l.502-.278ZM6.75 13.5A3.75 3.75 0 0 0 3 17.25a1.5 1.5 0 0 1-1.601 1.497.75.75 0 0 0-.7 1.123 5.25 5.25 0 0 0 9.8-2.62 3.75 3.75 0 0 0-3.75-3.75Z" clipRule="evenodd" />
                        </svg>
                        <span className="text-white font-medium text-sm">Draw Area</span>
                      </button>
                    )}

                    {/* Redraw Area Button - shown when circle exists */}
                    {drawnCircle && (
                      <button
                        onClick={() => {
                          setDrawnCircle(null);
                          setSelectedDevicesForArea([]);
                          setUserPaths({});
                          setDeviceRoutes({});
                          setSelectedRoutes({});
                          setIsDrawingMode(true);
                          setTimelinePosition(100);
                          setAreaDateRange(null);
                        }}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl flex-1 bg-white/10 hover:bg-white/20 backdrop-blur-lg shadow-lg transition-all duration-300"
                        title="Redraw area"
                      >
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span className="text-white font-medium text-sm">Redraw Area</span>
                      </button>
                    )}

                    {/* Routes Button - shown when there are routes */}
                    {Object.keys(deviceRoutes).length > 0 && (
                      <button
                        onClick={() => setIsRouteSelectionModalOpen(true)}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl flex-1 bg-cyan-600 hover:bg-cyan-700 backdrop-blur-lg shadow-lg transition-all duration-300 relative"
                        title="Select routes to display"
                      >
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                        <span className="text-white font-medium text-sm">Routes</span>
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold shadow-lg">
                          {Object.values(selectedRoutes).reduce((total, routes) => total + routes.length, 0)}
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Right side - Drawing Mode Indicator and Cancel button */}
                  {isDrawingMode && !drawnCircle && (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-cyan-500/20 border border-cyan-500/50">
                        <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></div>
                        <div className="text-white">
                          <p className="text-xs font-semibold">Drawing Mode Active</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setIsDrawingMode(false)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/80 hover:bg-red-600 backdrop-blur-lg shadow-lg transition-all duration-300"
                        title="Cancel drawing mode"
                      >
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span className="text-white font-medium text-xs">Cancel</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ✨ NUEVO LAYOUT: Map y Timeline lado a lado */}
            {mode === 'areaHistory' && Object.keys(deviceRoutes).length > 0 ? (
              <div className="grid grid-cols-1lg:grid-cols-3 gap-3">
                {/* Mapa ocupa 2 columnas */}
                <div className="lg:col-span-2">
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
                    deviceRoutes={deviceRoutes}
                    selectedRoutes={selectedRoutes}
                    timelinePosition={timelinePosition}
                  />
                </div>

                {/* Timeline ocupa 1 columna */}
                <div className="lg:col-span-1">
                  <TimelineSlider
                    deviceRoutes={deviceRoutes}
                    selectedRoutes={selectedRoutes}
                    onTimelineChange={handleTimelineChange}
                    className="h-full"
                  />
                </div>
              </div>
            ) : (
              /* Mapa normal sin timeline */
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
                deviceRoutes={deviceRoutes}
                selectedRoutes={selectedRoutes}
                timelinePosition={timelinePosition}
              />
            )}

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

      <RouteSelectionModal
        isOpen={isRouteSelectionModalOpen}
        onClose={() => setIsRouteSelectionModalOpen(false)}
        deviceRoutes={deviceRoutes}
        selectedRoutes={selectedRoutes}
        onRouteToggle={handleRouteToggle}
      />
    </div>
  );
}

export default App;