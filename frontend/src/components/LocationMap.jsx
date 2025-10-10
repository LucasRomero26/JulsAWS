import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, Circle, useMapEvents } from 'react-leaflet';
import { useState, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import { config } from '../config/appConfig';
import { useViewportHeight } from '../hooks/useViewportHeight';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { getDeviceColor } from '../utils/colorManager';
import { isUserActive, formatTimestamp } from '../utils/dateUtils';
import { createCircularIcon } from '../utils/mapUtils';
import { getRouteColor } from '../utils/pathUtils';
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
        interactive={false}
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
  selectedDevicesForArea = [],
  deviceRoutes = {},
  selectedRoutes = {}
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
          const userPath = userPaths[user.id] || [userPosition];
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
                    {mode === 'areaHistory' && deviceRoutes[user.id] ? (
                      <>
                        <small>Routes in area: {deviceRoutes[user.id].length}</small><br />
                        <small>Selected: {selectedRoutes[user.id]?.length || 0}</small><br />
                      </>
                    ) : (
                      <>
                        <small>Status: {isActive ? 'Active' : 'Inactive'}</small><br />
                        <small>Last Update: {formatTimestamp(user.lastUpdate)}</small><br />
                      </>
                    )}
                    <small>Lat: {parseFloat(user.latitude).toFixed(6)}</small><br />
                    <small>Lng: {parseFloat(user.longitude).toFixed(6)}</small>
                  </div>
                </Popup>
              </Marker>

              {/* Ruta del dispositivo */}
              {mode === 'areaHistory' ? (
                // Area history mode - render multiple routes with different colors
                <>
                  {deviceRoutes[user.id] && deviceRoutes[user.id].map((route, routeIndex) => {
                    const isRouteSelected = selectedRoutes[user.id]?.includes(route.id);
                    if (!isRouteSelected) return null;

                    const totalRoutes = deviceRoutes[user.id].length;
                    const routeColor = getRouteColor(deviceColor.hex, routeIndex, totalRoutes);

                    return (
                      <div key={route.id}>
                        {/* Route polyline */}
                        <Polyline
                          pathOptions={{
                            color: routeColor,
                            weight: 4,
                            opacity: 0.8
                          }}
                          positions={route.coordinates}
                        />
                        
                        {/* Start marker */}
                        {route.coordinates.length > 0 && (
                          <CircleMarker
                            center={route.coordinates[0]}
                            radius={8}
                            pathOptions={{
                              color: routeColor,
                              fillColor: '#00ff00',
                              fillOpacity: 0.8,
                              weight: 3
                            }}
                          >
                            <Popup>
                              <div className="text-center">
                                <strong style={{ color: '#00ff00' }}>
                                  ▶ START - {user.name}
                                </strong><br />
                                <small>Route {routeIndex + 1} of {deviceRoutes[user.id].length}</small><br />
                                <small>{route.startTimestamp}</small><br />
                                <small>Lat: {route.coordinates[0][0].toFixed(6)}</small><br />
                                <small>Lng: {route.coordinates[0][1].toFixed(6)}</small>
                              </div>
                            </Popup>
                          </CircleMarker>
                        )}
                        
                        {/* End marker */}
                        {route.coordinates.length > 1 && (
                          <CircleMarker
                            center={route.coordinates[route.coordinates.length - 1]}
                            radius={8}
                            pathOptions={{
                              color: routeColor,
                              fillColor: '#ff0000',
                              fillOpacity: 0.8,
                              weight: 3
                            }}
                          >
                            <Popup>
                              <div className="text-center">
                                <strong style={{ color: '#ff0000' }}>
                                  ■ END - {user.name}
                                </strong><br />
                                <small>Route {routeIndex + 1} of {deviceRoutes[user.id].length}</small><br />
                                <small>{route.endTimestamp}</small><br />
                                <small>Lat: {route.coordinates[route.coordinates.length - 1][0].toFixed(6)}</small><br />
                                <small>Lng: {route.coordinates[route.coordinates.length - 1][1].toFixed(6)}</small>
                              </div>
                            </Popup>
                          </CircleMarker>
                        )}
                        
                        {/* Intermediate points */}
                        {route.coordinates.slice(1, -1).map((point, pointIndex) => {
                          // Calculate the actual point number in the complete route
                          const actualPointNumber = pointIndex + 2;
                          // Get timestamp for this point if available
                          const pointData = route.points[pointIndex + 1];
                          
                          return (
                            <CircleMarker
                              key={`${route.id}-${pointIndex}`}
                              center={point}
                              radius={6}
                              pathOptions={{
                                color: routeColor,
                                fillColor: routeColor,
                                fillOpacity: 0.6,
                                weight: 2
                              }}
                            >
                              <Popup>
                                <div className="text-center">
                                  <strong style={{ color: routeColor }}>
                                    {user.name} - Point #{actualPointNumber}
                                  </strong><br />
                                  <small>Route {routeIndex + 1} of {deviceRoutes[user.id].length}</small><br />
                                  {pointData && pointData.timestamp_value && (
                                    <>
                                      <small>{formatTimestamp(pointData.timestamp_value)}</small><br />
                                    </>
                                  )}
                                  <small>Lat: {point[0].toFixed(6)}</small><br />
                                  <small>Lng: {point[1].toFixed(6)}</small>
                                </div>
                              </Popup>
                            </CircleMarker>
                          );
                        })}
                      </div>
                    );
                  })}
                </>
              ) : userPath.length > 1 ? (
                // Live or history mode - single route
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
                </>
              ) : null}
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
