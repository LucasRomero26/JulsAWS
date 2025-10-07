# History by Area Feature - Documentation

## Overview
The "History by Area" feature allows users to view historical routes of devices that have passed through a specific geographic area. Users can draw a circular area on the map and select one or more devices to view their historical paths within that area.

## Features

### 1. Drawing Mode
- A floating circular button in the top-right corner enables drawing mode
- When activated, users can click and drag on the map to create a circular area
- The radius adjusts dynamically as the user drags
- Drawing is disabled while panning to avoid conflicts

### 2. Device Selection
- After drawing a circle, a modal appears showing all available devices
- Users can search and filter devices by name or ID
- Select a device to view its historical path within the drawn area
- The modal includes a search bar for quick device filtering

### 3. Multi-Device Support
- The sidebar (desktop) shows all devices with checkboxes
- Users can toggle devices on/off to show/hide their paths
- Multiple device paths can be displayed simultaneously
- Each device maintains its unique color for easy identification

### 4. Area Information
- The sidebar displays the circle's center coordinates and radius
- Area information persists while viewing device paths
- Users can redraw the area at any time using the redraw button

## User Interface Components

### New Components Created

#### `AreaSearchModal.jsx`
- Modal for initial device selection after drawing area
- Includes search functionality
- Displays device list with color indicators
- Confirms device selection

#### `AreaSidebar.jsx`
- Sidebar for managing multiple device selections
- Checkboxes for toggling device visibility
- Shows area information (center, radius)
- Search bar for filtering devices
- Real-time device counter

#### Updated Components

#### `Header.jsx`
- Added "History by Area" tab
- Three modes: Live Tracking, History, History by Area
- Mobile menu updated with new option

#### `LocationMap.jsx`
- Added `CircleDrawer` component for drawing functionality
- Support for area history mode
- Shows drawn circle on the map
- Handles multi-device path rendering

#### `App.jsx`
- New state management for area history mode
- Circle drawing state (isDrawingMode, drawnCircle)
- Selected devices for area state
- API integration for area-based queries
- Toggle logic for adding/removing devices

## Backend Implementation

### New Endpoint: `/api/location/area`

**Method:** GET

**Query Parameters:**
- `lat` (required): Center latitude of the circle
- `lng` (required): Center longitude of the circle
- `radius` (required): Radius in meters
- `deviceId` (optional): Specific device to query

**Response:** Array of location points within the circular area

**Implementation Details:**
- Uses Haversine formula for distance calculation
- Bounding box pre-filter for performance optimization
- Returns all historical points for specified device(s) within the area
- Distance calculation in meters
- Results ordered by timestamp ascending

**SQL Query Features:**
- Geographic distance calculation using PostgreSQL
- Efficient bounding box filtering
- Support for single or all devices
- Distance field included in response

## How It Works

### User Flow

1. **Navigate to History by Area**
   - User clicks on "History by Area" tab in the header
   - Map view changes to area history mode

2. **Draw Area**
   - Click the circular button in top-right corner to enable drawing
   - Click and drag on the map to create a circular area
   - Release to complete the drawing

3. **Select First Device**
   - Modal appears with all devices
   - Search/filter if needed
   - Click a device and confirm

4. **View and Toggle Devices**
   - Initial device path appears on the map
   - Use sidebar checkboxes to add/remove other devices
   - All paths are shown within the drawn area

5. **Redraw Area (Optional)**
   - Click the redraw button to start over
   - Previous selections are cleared
   - Draw a new area

### Technical Flow

```
User Action → Draw Circle → Circle Complete Event
    ↓
Open Device Modal → Select Device → API Request
    ↓
Backend Query (Haversine) → Return Points in Area
    ↓
Render Path on Map → Show in Sidebar
    ↓
User Toggles Device → Add/Remove from View
```

## API Integration

### Area Query Request
```javascript
const url = `${API_BASE_URL}/api/location/area?lat=${lat}&lng=${lng}&radius=${radius}&deviceId=${deviceId}`;
const response = await fetch(url);
const data = await response.json();
```

### Response Format
```json
[
  {
    "latitude": 37.7749,
    "longitude": -122.4194,
    "timestamp_value": 1234567890000,
    "device_id": "device_001",
    "device_name": "Device 1",
    "device_type": "mobile",
    "distance": 45.2
  }
]
```

## State Management

### New States in App.jsx
```javascript
const [mode, setMode] = useState('live'); // 'live', 'history', 'areaHistory'
const [isAreaSearchModalOpen, setIsAreaSearchModalOpen] = useState(false);
const [isDrawingMode, setIsDrawingMode] = useState(false);
const [drawnCircle, setDrawnCircle] = useState(null);
const [selectedDevicesForArea, setSelectedDevicesForArea] = useState([]);
```

### Circle Data Structure
```javascript
{
  center: [latitude, longitude],
  radius: number // in meters
}
```

## Styling and UX

### Drawing Mode Indicator
- Button animates with pulse effect when active
- Cursor changes to indicate drawing mode
- Visual feedback during drawing

### Device Colors
- Persistent colors using existing color manager
- Color-coded paths for easy identification
- Checkbox styling matches device color

### Responsive Design
- Desktop: Full sidebar with checkboxes
- Mobile: Simplified view (future enhancement)
- Floating buttons positioned for easy access

## Performance Considerations

### Backend Optimization
- Bounding box pre-filter reduces query load
- Haversine calculation only on filtered results
- Indexed device_id for fast lookups

### Frontend Optimization
- Lazy loading of device paths
- Efficient state updates
- Path caching for toggled devices

## Future Enhancements

### Potential Improvements
1. Date range filter for area history
2. Export area data to CSV/JSON
3. Multiple area support
4. Polygon drawing (not just circles)
5. Area statistics (time spent, number of visits)
6. Heatmap visualization
7. Mobile-optimized drawing interface

## Testing Checklist

- [ ] Drawing circle on map works smoothly
- [ ] Device modal appears after drawing
- [ ] Device search/filter works correctly
- [ ] First device path renders within area
- [ ] Sidebar checkboxes toggle devices correctly
- [ ] Multiple devices display with correct colors
- [ ] Redraw button clears and resets properly
- [ ] Area information displays correctly
- [ ] Backend endpoint returns correct data
- [ ] Performance is acceptable with large datasets

## Dependencies

### Frontend
- React Leaflet for map interactions
- Leaflet.js for circle drawing
- Existing color manager for device colors
- Material-UI components (inherited from DateSearchModal)

### Backend
- PostgreSQL with PostGIS capabilities
- Node.js with Express
- pg (PostgreSQL client)

## Database Requirements

The existing `location_data` table supports this feature without modifications:
- `latitude`, `longitude`: For point locations
- `device_id`: For device filtering
- `timestamp_value`: For ordering results
- Existing indexes support efficient queries

## Code Examples

### Drawing a Circle
```javascript
const handleCircleComplete = (circle) => {
  setDrawnCircle(circle);
  setIsDrawingMode(false);
  setIsAreaSearchModalOpen(true);
};
```

### Toggling a Device
```javascript
const handleDeviceToggleForArea = async (deviceId) => {
  if (selectedDevicesForArea.includes(deviceId)) {
    // Remove device
    setSelectedDevicesForArea(prev => prev.filter(id => id !== deviceId));
    setUserPaths(prev => {
      const newPaths = { ...prev };
      delete newPaths[deviceId];
      return newPaths;
    });
  } else {
    // Add device - fetch its data from API
    // ... fetch and update logic
  }
};
```

## Troubleshooting

### Common Issues

**Issue:** Circle doesn't appear after drawing
- **Solution:** Check if drawnCircle state is set correctly
- **Solution:** Verify CircleDrawer component is rendered

**Issue:** No data returned from API
- **Solution:** Check if devices have any location data in the area
- **Solution:** Verify radius is appropriate (not too small)
- **Solution:** Check backend logs for SQL query errors

**Issue:** Multiple devices not showing
- **Solution:** Verify selectedDevicesForArea array is updating
- **Solution:** Check if userPaths state includes all device paths
- **Solution:** Ensure mode is set to 'areaHistory'

**Issue:** Performance issues with many points
- **Solution:** Consider implementing point clustering
- **Solution:** Reduce the number of historical points returned
- **Solution:** Add pagination or time-based filtering

## Support

For questions or issues related to this feature, please:
1. Check this documentation
2. Review the code comments
3. Check the browser console for errors
4. Review backend logs for API issues

---

**Version:** 1.0  
**Last Updated:** October 2025  
**Author:** Development Team
