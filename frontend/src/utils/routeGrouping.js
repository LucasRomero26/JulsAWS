/**
 * Utility functions for grouping location points into separate routes/trips
 * based on time gaps between consecutive points.
 */

/**
 * Groups location points into separate routes based on time gaps
 * @param {Array} points - Array of location points with timestamps
 * @param {number} maxGapMinutes - Maximum time gap in minutes to consider points part of the same route
 * @returns {Array} Array of route objects, each containing points and metadata
 */
export function groupPointsIntoRoutes(points, maxGapMinutes = 30) {
  if (!points || points.length === 0) {
    return [];
  }

  // Sort points by timestamp
  const sortedPoints = [...points].sort((a, b) => {
    const timeA = new Date(a.timestamp_value).getTime();
    const timeB = new Date(b.timestamp_value).getTime();
    return timeA - timeB;
  });

  const routes = [];
  let currentRoute = {
    points: [sortedPoints[0]],
    startTime: new Date(sortedPoints[0].timestamp_value),
    endTime: new Date(sortedPoints[0].timestamp_value),
  };

  const maxGapMs = maxGapMinutes * 60 * 1000;

  for (let i = 1; i < sortedPoints.length; i++) {
    const currentPoint = sortedPoints[i];
    const previousPoint = sortedPoints[i - 1];

    const currentTime = new Date(currentPoint.timestamp_value).getTime();
    const previousTime = new Date(previousPoint.timestamp_value).getTime();
    const gap = currentTime - previousTime;

    if (gap <= maxGapMs) {
      // Point belongs to current route
      currentRoute.points.push(currentPoint);
      currentRoute.endTime = new Date(currentPoint.timestamp_value);
    } else {
      // Start a new route
      routes.push(currentRoute);
      currentRoute = {
        points: [currentPoint],
        startTime: new Date(currentPoint.timestamp_value),
        endTime: new Date(currentPoint.timestamp_value),
      };
    }
  }

  // Add the last route
  routes.push(currentRoute);

  // Add metadata to each route
  return routes.map((route, index) => ({
    id: `route_${index}`,
    routeNumber: index + 1,
    points: route.points,
    startTime: route.startTime,
    endTime: route.endTime,
    duration: route.endTime - route.startTime,
    pointCount: route.points.length,
  }));
}

/**
 * Generates a lighter or darker shade of a base color
 * @param {string} baseColor - Base color in hex format (#RRGGBB)
 * @param {number} index - Route index
 * @param {number} total - Total number of routes
 * @returns {string} Modified color in hex format
 */
export function generateRouteColor(baseColor, index, total) {
  // Convert hex to RGB
  const r = parseInt(baseColor.slice(1, 3), 16);
  const g = parseInt(baseColor.slice(3, 5), 16);
  const b = parseInt(baseColor.slice(5, 7), 16);

  // Generate variations from lighter to darker
  // For a single route, use the base color
  if (total === 1) {
    return baseColor;
  }

  // Calculate factor: 0.4 (lighter) to 1.0 (darker)
  // Distribute evenly across routes
  const factor = 0.4 + (0.6 * index / (total - 1));

  // Apply factor to each RGB component
  const newR = Math.round(r * factor);
  const newG = Math.round(g * factor);
  const newB = Math.round(b * factor);

  // Convert back to hex
  const toHex = (n) => {
    const hex = Math.max(0, Math.min(255, n)).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
}

/**
 * Formats a time duration in milliseconds to a human-readable string
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration string
 */
export function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Formats a date/time for display in the route list
 * @param {Date} date - Date object
 * @returns {Object} Object with date and time strings
 */
export function formatRouteDateTime(date) {
  const options = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };
  
  const timeOptions = {
    hour: '2-digit',
    minute: '2-digit',
  };

  return {
    date: date.toLocaleDateString('en-US', options),
    time: date.toLocaleTimeString('en-US', timeOptions),
    full: date.toLocaleString('en-US', { ...options, ...timeOptions }),
  };
}
