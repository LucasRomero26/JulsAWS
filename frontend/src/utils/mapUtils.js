import L from 'leaflet';
import { DivIcon } from 'leaflet';

// Arreglo para el ícono por defecto de Leaflet en Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// --- Función para crear íconos circulares personalizados ---
export const createCircularIcon = (color, isActive = true, size = 20) => {
  const activeRing = isActive ? `
    <circle cx="25" cy="25" r="22" 
      fill="none" 
      stroke="#10b981" 
      stroke-width="3" 
      opacity="0.8">
      <animate attributeName="r" values="18;25;18" dur="2s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.8;0.3;0.8" dur="2s" repeatCount="indefinite"/>
    </circle>
  ` : '';

  return new DivIcon({
    html: `
      <div style="position: relative; width: 50px; height: 50px;">
        <svg width="50" height="50" viewBox="0 0 50 50" style="position: absolute; top: 0; left: 0;">
          ${activeRing}
          <circle cx="25" cy="25" r="${size}" 
            fill="${color}" 
            stroke="#ffffff" 
            stroke-width="3" 
            opacity="0.9"
            style="filter: drop-shadow(0px 4px 8px rgba(0,0,0,0.3))"/>
          <circle cx="25" cy="25" r="${size - 6}" 
            fill="${color}" 
            opacity="0.7"/>
        </svg>
      </div>
    `,
    className: 'custom-circular-icon',
    iconSize: [50, 50],
    iconAnchor: [25, 25],
    popupAnchor: [0, -25]
  });
};

// --- Funciones para gradientes de colores ---
export const interpolateColor = (color1, color2, factor) => {
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
