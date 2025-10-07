import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { config } from '../config/appConfig';
import { useViewportHeight } from '../hooks/useViewportHeight';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { getDeviceColor } from '../utils/colorManager';
import { isUserActive, formatTimestamp } from '../utils/dateUtils';
import { createCircularIcon } from '../utils/mapUtils';
import GradientPolyline from './GradientPolyline';
import MapViewUpdater from './MapViewUpdater';

// --- Mapa principal con soporte multi-dispositivo MEJORADO ---
const LocationMap = ({ users, userPaths, isLiveMode, selectedUserId, previousUsers }) => {
  const viewportHeight = useViewportHeight();
  const isMobile = useMediaQuery('(max-width: 768px)');

  const mapHeight = isMobile
    ? Math.max(viewportHeight - 200, 300)
    : Math.max(viewportHeight - 180, 400);

  // Obtener la posición central - solo al inicializar, no actualizar constantemente
  const getInitialCenterPosition = () => {
    if (!users || users.length === 0) return [37.7749, -122.4194]; // San Francisco como fallback

    const firstUser = users[0];
    return [parseFloat(firstUser.latitude), parseFloat(firstUser.longitude)];
  };

  const centerPosition = getInitialCenterPosition();

  // Validar que las coordenadas sean válidas
  if (!centerPosition || isNaN(centerPosition[0]) || isNaN(centerPosition[1])) {
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

  // Crear una key estable que no cambie con cada actualización
  const mapKey = `map-${users.length > 0 ? users[0].id : 'default'}`;

  return (
    <div className='glassmorphism-strong w-full mt-6 rounded-4xl backdrop-blur-lg shadow-lg p-4'>
      <MapContainer
        center={centerPosition}
        zoom={isLiveMode ? 15 : 13}
        style={{
          height: `${mapHeight}px`,
          width: '100%',
          borderRadius: '1rem',
          minHeight: '300px'
        }}
        key={mapKey}
      >
        <TileLayer
          url={`https://{s}.tile.jawg.io/${config.JAWG_MAP_ID}/{z}/{x}/{y}{r}.png?access-token=${config.JAWG_ACCESS_TOKEN}`}
          attribution='&copy; <a href="https://www.jawg.io" target="_blank">Jawg</a> - &copy; <a href="https://www.openstreetmap.org" target="_blank">OpenStreetMap</a> contributors'
        />

        {/* Renderizar marcadores y rutas para cada usuario con colores persistentes */}
        {users.map((user) => {
          const userPosition = [parseFloat(user.latitude), parseFloat(user.longitude)];
          const deviceColor = getDeviceColor(user.id);
          const isActive = isUserActive(user.lastUpdate);
          const userPath = userPaths[user.id] || [userPosition];
          const isSelected = selectedUserId === user.id;

          // Validar coordenadas del usuario
          if (isNaN(userPosition[0]) || isNaN(userPosition[1])) {
            return null;
          }

          // En modo live, mostrar usuarios activos; en histórico, solo el seleccionado
          const shouldShow = isLiveMode ? isActive : isSelected;

          if (!shouldShow) return null;

          // Crear el ícono circular personalizado
          const circularIcon = createCircularIcon(deviceColor.hex, isActive);

          return (
            <div key={user.id}>
              {/* Marcador del dispositivo con ícono circular */}
              <Marker
                position={userPosition}
                icon={circularIcon}
                opacity={isSelected || isLiveMode ? 1 : 0.7}
              >
                <Popup>
                  <div className="text-center">
                    <strong style={{ color: deviceColor.hex }}>
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
                        color: deviceColor.hex,
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
                    color: deviceColor.hex,
                    fillColor: deviceColor.light,
                    fillOpacity: 0.6,
                    weight: 2
                  }}
                >
                  <Popup>
                    <div className="text-center">
                      <strong style={{ color: deviceColor.hex }}>
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

        <MapViewUpdater
          userPaths={userPaths}
          isLiveMode={isLiveMode}
          users={users}
          previousUsers={previousUsers}
        />
      </MapContainer>
    </div>
  );
};

export default LocationMap;
