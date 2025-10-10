import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, Circle, useMapEvents } from 'react-leaflet';
import { useState, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import { config } from '../config/appConfig';
import { useViewportHeight } from '../hooks/useViewportHeight';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { getDeviceColor } from '../utils/colorManager';
import { isUserActive, formatTimestamp } from '../utils/dateUtils';
import { createCircularIcon } from '../utils/mapUtils';
import GradientPolyline from './GradientPolyline';
import MapViewUpdater from './MapViewUpdater';

// Component to disable map interactions when drawing
const MapInteractionController = ({ isDrawingMode }) => {
  const map = useMapEvents({});
  
  // Disable dragging, zooming, and other interactions when in drawing mode
  if (isDrawingMode) {
    map.dragging.disable();
    map.touchZoom.disable();
    map.doubleClickZoom.disable();
    map.scrollWheelZoom.disable();
    map.boxZoom.disable();
    map.keyboard.disable();
  } else {
    map.dragging.enable();
    map.touchZoom.enable();
    map.doubleClickZoom.enable();
    map.scrollWheelZoom.enable();
    map.boxZoom.enable();
    map.keyboard.enable();
  }
  
  return null;
};

// Component to handle circle drawing interaction
const CircleDrawer = ({ isDrawingMode, onCircleComplete, drawnCircle }) => {
  const [tempCircle, setTempCircle] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const startPointRef = useRef(null);

  const map = useMapEvents({
    mousedown(e) {
      if (isDrawingMode && !isDrawing) {
        e.originalEvent.preventDefault();
        setIsDrawing(true);
        startPointRef.current = e.latlng;
        setTempCircle({ center: [e.latlng.lat, e.latlng.lng], radius: 10 });
      }
    },
    mousemove(e) {
      if (isDrawingMode && isDrawing && startPointRef.current) {
        e.originalEvent.preventDefault();
        const distance = startPointRef.current.distanceTo(e.latlng);
        setTempCircle({ 
          center: [startPointRef.current.lat, startPointRef.current.lng], 
          radius: Math.max(distance, 10) 
        });
      }
    },
    mouseup(e) {
      if (isDrawingMode && isDrawing && startPointRef.current) {
        e.originalEvent.preventDefault();
        const distance = startPointRef.current.distanceTo(e.latlng);
        const finalCircle = {
          center: [startPointRef.current.lat, startPointRef.current.lng],
          radius: Math.max(distance, 10)
        };
        setIsDrawing(false);
        setTempCircle(null);
        startPointRef.current = null;
        onCircleComplete(finalCircle);
      }
    }
  });

  // Show temporary circle while drawing
  if (tempCircle) {
    return (
      <Circle
        center={tempCircle.center}
        radius={tempCircle.radius}
        pathOptions={{ color: '#00b8d4', fillColor: '#00b8d4', fillOpacity: 0.2, weight: 2 }}
      />
    );
  }

  // Show completed circle
  if (drawnCircle) {
    return (
      <Circle
        center={drawnCircle.center}
        radius={drawnCircle.radius}
        pathOptions={{ color: '#0092b8', fillColor: '#0092b8', fillOpacity: 0.15, weight: 3 }}
      />
    );
  }

  return null;
};

// --- Mapa principal con soporte multi-dispositivo MEJORADO ---
const LocationMap = ({ 
  users, 
  userPaths, 
  isLiveMode, 
  selectedUserId, 
  previousUsers,
  mode = 'live',
  isDrawingMode = false,
  onCircleComplete,
  drawnCircle,
  selectedDevicesForArea = []
}) => {
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
          minHeight: '300px',
          cursor: isDrawingMode ? 'crosshair' : 'grab'
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
          const isSelected = selectedUserId === user.id;

          // Validar coordenadas del usuario
          if (isNaN(userPosition[0]) || isNaN(userPosition[1])) {
            return null;
          }

          // Determine if device should be shown based on mode
          let shouldShow = false;
          if (mode === 'live') {
            shouldShow = isActive;
          } else if (mode === 'history') {
            shouldShow = isSelected;
          } else if (mode === 'areaHistory') {
            shouldShow = selectedDevicesForArea.includes(user.id);
          }

          if (!shouldShow) return null;

          // Crear el ícono circular personalizado
          const circularIcon = createCircularIcon(deviceColor.hex, isActive);

          // For areaHistory mode with multiple routes, handle differently
          if (mode === 'areaHistory') {
            // Get all route paths for this device
            const deviceRoutePaths = Object.keys(userPaths)
              .filter(key => key.startsWith(`${user.id}_route_`))
              .map(key => ({
                key,
                ...userPaths[key]
              }));

            if (deviceRoutePaths.length === 0) return null;

            return (
              <div key={user.id}>
                {/* Marcador del dispositivo con ícono circular */}
                <Marker
                  position={userPosition}
                  icon={circularIcon}
                  opacity={0.7}
                >
                  <Popup>
                    <div className="text-center">
                      <strong style={{ color: deviceColor.hex }}>
                        {user.name}
                      </strong><br />
                      <small>Device: {user.deviceId}</small><br />
                      <small>Routes: {deviceRoutePaths.length}</small><br />
                      <small>Lat: {parseFloat(user.latitude).toFixed(6)}</small><br />
                      <small>Lng: {parseFloat(user.longitude).toFixed(6)}</small>
                    </div>
                  </Popup>
                </Marker>

                {/* Render each route with its specific color */}
                {deviceRoutePaths.map((routeData, routeIndex) => {
                  const routePath = routeData.path;
                  const routeColor = routeData.color || deviceColor.hex;

                  if (!routePath || routePath.length < 2) return null;

                  return (
                    <div key={routeData.key}>
                      {/* Route polyline with specific color */}
                      <Polyline
                        pathOptions={{
                          color: routeColor,
                          weight: 4,
                          opacity: 0.8
                        }}
                        positions={routePath}
                      />

                      {/* Start and end markers for each route */}
                      <CircleMarker
                        center={routePath[0]}
                        radius={8}
                        pathOptions={{
                          color: '#00ff00',
                          fillColor: '#00ff00',
                          fillOpacity: 0.8,
                          weight: 2
                        }}
                      >
                        <Popup>
                          <div className="text-center">
                            <strong style={{ color: routeColor }}>
                              {user.name} - Route {routeIndex + 1} Start
                            </strong><br />
                            <small>Lat: {routePath[0][0].toFixed(6)}</small><br />
                            <small>Lng: {routePath[0][1].toFixed(6)}</small>
                          </div>
                        </Popup>
                      </CircleMarker>

                      <CircleMarker
                        center={routePath[routePath.length - 1]}
                        radius={8}
                        pathOptions={{
                          color: '#ff0000',
                          fillColor: '#ff0000',
                          fillOpacity: 0.8,
                          weight: 2
                        }}
                      >
                        <Popup>
                          <div className="text-center">
                            <strong style={{ color: routeColor }}>
                              {user.name} - Route {routeIndex + 1} End
                            </strong><br />
                            <small>Lat: {routePath[routePath.length - 1][0].toFixed(6)}</small><br />
                            <small>Lng: {routePath[routePath.length - 1][1].toFixed(6)}</small>
                          </div>
                        </Popup>
                      </CircleMarker>
                    </div>
                  );
                })}
              </div>
            );
          }

          // For live and history modes (existing behavior)
          const userPath = userPaths[user.id] || [userPosition];

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
                  {mode === 'live' ? (
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
              {mode === 'history' && userPath.map((point, pointIndex) => (
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

        {/* Map interaction controller - disable interactions when drawing */}
        {mode === 'areaHistory' && (
          <MapInteractionController isDrawingMode={isDrawingMode} />
        )}

        {/* Circle drawer for area history mode */}
        {mode === 'areaHistory' && (
          <CircleDrawer 
            isDrawingMode={isDrawingMode} 
            onCircleComplete={onCircleComplete}
            drawnCircle={drawnCircle}
          />
        )}

        <MapViewUpdater
          userPaths={userPaths}
          isLiveMode={mode === 'live'}
          users={users}
          previousUsers={previousUsers}
        />
      </MapContainer>
    </div>
  );
};

export default LocationMap;
