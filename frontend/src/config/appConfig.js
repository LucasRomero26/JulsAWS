// --- Configuración Básica ---
export const config = {
  API_BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  APP_NAME: 'Juls Tracker',
  APP_SUBTITLE: 'Just UDP Location Service',
  APP_VERSION: '2.0.0',
  POLLING_INTERVAL: import.meta.env.VITE_POLLING_INTERVAL || 5000,
  JAWG_ACCESS_TOKEN: 'icNC49f9tQCM0CwkpIHYIXmvNjTgtAVrdIf3PdM94merPcn8Bcx806NlkILQrOPS',
  JAWG_MAP_ID: 'jawg-dark',
  INACTIVE_TIMEOUT: 20000
};
