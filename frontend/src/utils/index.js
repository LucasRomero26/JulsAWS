// Exportar todas las utilidades desde un solo lugar
export { deviceColorManager, getDeviceColor } from './colorManager';
export { formatTimestamp, isUserActive } from './dateUtils';
export { createCircularIcon, interpolateColor } from './mapUtils';
export { 
  splitIntoRoutes, 
  formatDuration, 
  getRouteColor, 
  calculateRouteDistance, 
  formatDistance 
} from './pathUtils';
