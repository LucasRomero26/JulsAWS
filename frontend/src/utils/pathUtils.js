// Utility functions for path/route processing

/**
 * Split location points into separate routes based on time gaps
 * @param {Array} points - Array of points with timestamp_value
 * @param {number} maxGapMinutes - Maximum gap in minutes to consider same route
 * @returns {Array} Array of routes, each containing points and metadata
 */
export const splitIntoRoutes = (points, maxGapMinutes = 10) => {
  if (!points || points.length === 0) return [];

  const maxGapMs = maxGapMinutes * 60 * 1000; // Convert to milliseconds
  const routes = [];
  let currentRoute = [];

  // Sort points by timestamp
  const sortedPoints = [...points].sort((a, b) => a.timestamp_value - b.timestamp_value);

  for (let i = 0; i < sortedPoints.length; i++) {
    const point = sortedPoints[i];
    
    if (currentRoute.length === 0) {
      // Start new route
      currentRoute.push(point);
    } else {
      const lastPoint = currentRoute[currentRoute.length - 1];
      const timeDiff = point.timestamp_value - lastPoint.timestamp_value;

      if (timeDiff > maxGapMs) {
        // Gap too large - save current route and start new one
        if (currentRoute.length > 0) {
          routes.push(createRouteObject(currentRoute, routes.length));
        }
        currentRoute = [point];
      } else {
        // Continue current route
        currentRoute.push(point);
      }
    }
  }

  // Add the last route
  if (currentRoute.length > 0) {
    routes.push(createRouteObject(currentRoute, routes.length));
  }

  return routes;
};

/**
 * Create a route object with metadata
 * @param {Array} points - Array of points
 * @param {number} index - Route index
 * @returns {Object} Route object with metadata
 */
const createRouteObject = (points, index) => {
  const startTime = points[0].timestamp_value;
  const endTime = points[points.length - 1].timestamp_value;
  const duration = endTime - startTime;

  return {
    id: `route-${index}`,
    index: index,
    points: points,
    startTime: startTime,
    endTime: endTime,
    duration: duration,
    startTimestamp: formatTimestamp(startTime),
    endTimestamp: formatTimestamp(endTime),
    pointCount: points.length,
    // Convert points to coordinates for map display
    coordinates: points.map(p => [parseFloat(p.latitude), parseFloat(p.longitude)])
  };
};

/**
 * Format timestamp to readable string
 * @param {number} timestamp - Timestamp in milliseconds
 * @returns {string} Formatted timestamp
 */
const formatTimestamp = (timestamp) => {
  try {
    let date;
    const timestampStr = String(timestamp);

    if (/^\d{13}$/.test(timestampStr)) {
      date = new Date(parseInt(timestampStr));
    } else if (/^\d{10}$/.test(timestampStr)) {
      date = new Date(parseInt(timestampStr) * 1000);
    } else {
      date = new Date(timestamp);
    }

    if (isNaN(date.getTime())) {
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
    return 'Invalid Date';
  }
};

/**
 * Format duration from milliseconds to readable string
 * @param {number} durationMs - Duration in milliseconds
 * @returns {string} Formatted duration
 */
export const formatDuration = (durationMs) => {
  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  } else if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    return `${seconds}s`;
  }
};

/**
 * Generate a lighter shade of a color for route differentiation
 * @param {string} baseColor - Base color in hex format
 * @param {number} routeIndex - Index of the route
 * @param {number} totalRoutes - Total number of routes
 * @returns {string} Modified color in hex format
 */
export const getRouteColor = (baseColor, routeIndex, totalRoutes) => {
  // Remove the # if present
  const hex = baseColor.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate lightness factor (lighter colors for later routes)
  // First route uses base color, subsequent routes get progressively lighter
  const lightenFactor = totalRoutes > 1 ? (routeIndex / (totalRoutes - 1)) * 0.5 : 0;
  
  // Apply lightening
  const newR = Math.min(255, Math.round(r + (255 - r) * lightenFactor));
  const newG = Math.min(255, Math.round(g + (255 - g) * lightenFactor));
  const newB = Math.min(255, Math.round(b + (255 - b) * lightenFactor));

  // Convert back to hex
  const toHex = (n) => {
    const hex = n.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
};

/**
 * Calculate total distance of a route
 * @param {Array} coordinates - Array of [lat, lng] coordinates
 * @returns {number} Distance in meters
 */
export const calculateRouteDistance = (coordinates) => {
  if (!coordinates || coordinates.length < 2) return 0;

  let totalDistance = 0;

  for (let i = 1; i < coordinates.length; i++) {
    const [lat1, lon1] = coordinates[i - 1];
    const [lat2, lon2] = coordinates[i];
    
    // Haversine formula
    const R = 6371000; // Earth radius in meters
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    totalDistance += distance;
  }

  return totalDistance;
};

const toRad = (degrees) => {
  return degrees * (Math.PI / 180);
};

/**
 * Format distance to readable string
 * @param {number} meters - Distance in meters
 * @returns {string} Formatted distance
 */
export const formatDistance = (meters) => {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  } else {
    return `${(meters / 1000).toFixed(2)}km`;
  }
};
