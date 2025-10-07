import { config } from '../config/appConfig';

// --- Funciones utilitarias de fecha ---
export const formatTimestamp = (timestamp) => {
  try {
    let date;

    if (!timestamp) {
      return 'Invalid Date';
    }

    const timestampStr = String(timestamp);

    if (/^\d{13}$/.test(timestampStr)) {
      date = new Date(parseInt(timestampStr));
    } else if (/^\d{10}$/.test(timestampStr)) {
      date = new Date(parseInt(timestampStr) * 1000);
    } else {
      date = new Date(timestamp);
    }

    if (isNaN(date.getTime())) {
      console.warn('Invalid timestamp:', timestamp);
      return 'Invalid Date';
    }

    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch (error) {
    console.error('Error formatting timestamp:', error, timestamp);
    return 'Invalid Date';
  }
};

export const isUserActive = (lastUpdate) => {
  try {
    const now = new Date();
    let lastUpdateTime;

    if (!lastUpdate) {
      return false;
    }

    const timestampStr = String(lastUpdate);

    if (/^\d{13}$/.test(timestampStr)) {
      lastUpdateTime = new Date(parseInt(timestampStr));
    } else if (/^\d{10}$/.test(timestampStr)) {
      lastUpdateTime = new Date(parseInt(timestampStr) * 1000);
    } else {
      lastUpdateTime = new Date(lastUpdate);
    }

    if (isNaN(lastUpdateTime.getTime())) {
      return false;
    }

    const timeDifference = now.getTime() - lastUpdateTime.getTime();
    return timeDifference <= config.INACTIVE_TIMEOUT;
  } catch (error) {
    console.error('Error checking user activity:', error, lastUpdate);
    return false;
  }
};
