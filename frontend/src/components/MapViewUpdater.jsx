import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { isUserActive } from '../utils/dateUtils';

// --- NUEVO: Componente mejorado para actualizar la vista del mapa ---
const MapViewUpdater = ({ userPaths, isLiveMode, users, previousUsers }) => {
  const map = useMap();
  const previousUsersRef = useRef(previousUsers);

  useEffect(() => {
    if (!users || users.length === 0) return;

    try {
      if (isLiveMode) {
        const activeUsers = users.filter(user => isUserActive(user.lastUpdate));
        const previousActiveUsers = previousUsersRef.current ?
          previousUsersRef.current.filter(user => isUserActive(user.lastUpdate)) : [];

        // Solo actualizar si hay cambios significativos en los usuarios activos
        const activeUsersChanged = activeUsers.length !== previousActiveUsers.length ||
          activeUsers.some((user, index) => {
            const prevUser = previousActiveUsers.find(pu => pu.id === user.id);
            if (!prevUser) return true;
            return Math.abs(parseFloat(user.latitude) - parseFloat(prevUser.latitude)) > 0.0001 ||
              Math.abs(parseFloat(user.longitude) - parseFloat(prevUser.longitude)) > 0.0001;
          });

        if (!activeUsersChanged) return;

        if (activeUsers.length > 1) {
          // Múltiples dispositivos activos: ajustar bounds para mostrar todos
          const allPositions = activeUsers.map(user => [
            parseFloat(user.latitude),
            parseFloat(user.longitude)
          ]);

          if (allPositions.length > 0) {
            const bounds = L.latLngBounds(allPositions);

            // Solo ajustar bounds si hay una diferencia significativa
            const currentBounds = map.getBounds();
            const needsUpdate = !currentBounds.contains(bounds) ||
              !bounds.contains(currentBounds);

            if (needsUpdate) {
              map.fitBounds(bounds, {
                padding: [50, 50],
                animate: true,
                duration: 1.0,
                maxZoom: 16
              });
            }
          }
        } else if (activeUsers.length === 1) {
          // Un solo dispositivo activo: solo centrar manteniendo el zoom
          const user = activeUsers[0];
          const newPosition = [parseFloat(user.latitude), parseFloat(user.longitude)];
          const currentCenter = map.getCenter();

          // Solo centrar si hay una diferencia significativa (más de ~10 metros)
          const distance = currentCenter.distanceTo(L.latLng(newPosition));
          if (distance > 10) {
            // Usar setView en lugar de flyTo para mantener el zoom actual
            const currentZoom = map.getZoom();
            map.setView(newPosition, currentZoom, {
              animate: true,
              duration: 0.5
            });
          }
        }

        // Actualizar referencia de usuarios anteriores
        previousUsersRef.current = users;
      } else {
        // En modo histórico, ajustar para mostrar todo el path del dispositivo seleccionado
        const allPaths = Object.values(userPaths).flat();
        if (allPaths && allPaths.length > 1) {
          const bounds = L.latLngBounds(allPaths);
          map.fitBounds(bounds, {
            padding: [20, 20],
            animate: true,
            duration: 1.0
          });
        }
      }
    } catch (error) {
      console.error('Error updating map view:', error);
    }
  }, [users, userPaths, isLiveMode, map]);

  return null;
};

export default MapViewUpdater;
