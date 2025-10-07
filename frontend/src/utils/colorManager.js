import { DEVICE_COLORS } from '../config/colors';

// --- Función para generar índices aleatorios ---
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// --- MEJORADO: Sistema de asignación aleatoria de colores ---
class DeviceColorManager {
  constructor() {
    this.deviceColorMap = new Map();
    this.availableColorIndices = shuffleArray([...Array(DEVICE_COLORS.length).keys()]);
    this.currentIndex = 0;
  }

  // Asignar un color aleatorio persistente a un dispositivo
  getDeviceColor(deviceId) {
    // Si ya tiene un color asignado, devolverlo
    if (this.deviceColorMap.has(deviceId)) {
      return DEVICE_COLORS[this.deviceColorMap.get(deviceId)];
    }

    // Si se acabaron los colores disponibles, volver a mezclar y reiniciar
    if (this.currentIndex >= this.availableColorIndices.length) {
      this.availableColorIndices = shuffleArray([...Array(DEVICE_COLORS.length).keys()]);
      this.currentIndex = 0;
    }

    // Asignar el siguiente color aleatorio disponible
    const colorIndex = this.availableColorIndices[this.currentIndex];
    this.deviceColorMap.set(deviceId, colorIndex);
    this.currentIndex++;

    return DEVICE_COLORS[colorIndex];
  }

  // Obtener el color de un dispositivo existente
  getExistingDeviceColor(deviceId) {
    if (this.deviceColorMap.has(deviceId)) {
      return DEVICE_COLORS[this.deviceColorMap.get(deviceId)];
    }
    return null;
  }

  // Remover un dispositivo (opcional, para limpiar cuando un dispositivo ya no esté activo)
  removeDevice(deviceId) {
    if (this.deviceColorMap.has(deviceId)) {
      const colorIndex = this.deviceColorMap.get(deviceId);
      this.deviceColorMap.delete(deviceId);

      // Agregar el color de vuelta a los disponibles de forma aleatoria
      const randomPosition = Math.floor(Math.random() * (this.availableColorIndices.length + 1));
      this.availableColorIndices.splice(randomPosition, 0, colorIndex);
    }
  }

  // Obtener todos los dispositivos con sus colores
  getAllDeviceColors() {
    const result = {};
    for (const [deviceId, colorIndex] of this.deviceColorMap) {
      result[deviceId] = DEVICE_COLORS[colorIndex];
    }
    return result;
  }

  // Limpiar dispositivos inactivos después de un tiempo
  cleanupInactiveDevices(activeDeviceIds) {
    const toRemove = [];
    for (const deviceId of this.deviceColorMap.keys()) {
      if (!activeDeviceIds.includes(deviceId)) {
        toRemove.push(deviceId);
      }
    }
    toRemove.forEach(deviceId => this.removeDevice(deviceId));
  }
}

// Instancia global del gestor de colores
export const deviceColorManager = new DeviceColorManager();

// Función actualizada para obtener el color del dispositivo
export const getDeviceColor = (deviceId) => {
  return deviceColorManager.getDeviceColor(deviceId);
};
