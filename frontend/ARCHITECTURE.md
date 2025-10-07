# 🏗️ Arquitectura del Proyecto

## Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                         App.jsx                              │
│  (Componente Principal - Gestión de Estado Global)          │
│                                                              │
│  • users state                                               │
│  • userPaths state                                           │
│  • isLiveMode state                                          │
│  • selectedUserId state                                      │
│  • error/loading states                                      │
└─────────────────┬───────────────────────────────────────────┘
                  │
    ┌─────────────┴─────────────┬──────────────┬──────────────┐
    │                           │              │              │
    ▼                           ▼              ▼              ▼
┌──────────┐         ┌─────────────────┐  ┌─────────┐  ┌──────────────┐
│ Header   │         │ Sidebar/Mobile  │  │   Map   │  │ DateSearch   │
│          │         │    UserInfo     │  │         │  │    Modal     │
└──────────┘         └─────────────────┘  └─────────┘  └──────────────┘
                              │                 │              │
                              ▼                 ▼              ▼
                      ┌──────────────┐  ┌──────────────┐ ┌─────────┐
                      │  SearchBar   │  │ MapUpdater   │ │ Pickers │
                      └──────────────┘  │ Polylines    │ └─────────┘
                                        │ Markers      │
                                        └──────────────┘
```

## Flujo de Datos

```
┌─────────────────────────────────────────────────────────────┐
│                    DATA FLOW                                 │
└─────────────────────────────────────────────────────────────┘

1. FETCH DATA (Live Mode)
   ┌───────────┐
   │  Backend  │
   │    API    │
   └─────┬─────┘
         │ HTTP Request (every 5s)
         ▼
   ┌─────────────┐
   │  App.jsx    │ ──► fetchUsersData()
   │  (State)    │
   └─────┬───────┘
         │
         ├─► deviceColorManager (asigna colores)
         │
         ├─► setUsers(data)
         │
         └─► setUserPaths(paths)
         
         
2. RENDER CYCLE
   ┌─────────────┐
   │  App.jsx    │
   │   (State)   │
   └─────┬───────┘
         │
         ├──► Header (props: mode, handlers)
         │
         ├──► Sidebar/Mobile (props: users, selected, onSelect)
         │      │
         │      └──► SearchBar (local filtering)
         │
         ├──► LocationMap (props: users, paths, mode)
         │      │
         │      ├──► MapViewUpdater (auto-pan)
         │      ├──► Markers (with Popups)
         │      └──► Polylines/GradientPolyline (paths)
         │
         └──► DateSearchModal (props: isOpen, users, onSearch)


3. USER INTERACTION
   ┌──────────────┐
   │    User      │
   │   Action     │
   └──────┬───────┘
          │
          ├─► Click Device
          │     └──► onUserSelect(id)
          │           └──► setSelectedUserId(id)
          │                 └──► Map Centers
          │
          ├─► Search Device
          │     └──► onSearchChange(term)
          │           └──► useFilteredUsers (memoized)
          │                 └──► Re-render filtered list
          │
          ├─► Toggle Live/History
          │     └──► setIsLiveMode(mode)
          │           └──► Different fetch logic
          │
          └─► Date Range Search
                └──► handleDateSearch(dates)
                      └──► fetch historical data
                            └──► setUserPaths(history)
```

## Gestión de Estado

```
┌─────────────────────────────────────────────────────────────┐
│                    STATE MANAGEMENT                          │
└─────────────────────────────────────────────────────────────┘

App.jsx (Central State)
├── users: Array<User>
│   └── User: { id, name, deviceId, lat, lng, lastUpdate }
│
├── userPaths: Record<userId, Array<[lat, lng]>>
│   └── Tracks movement history for each device
│
├── selectedUserId: string | null
│   └── Currently selected device for focus
│
├── isLiveMode: boolean
│   └── true: polling API, false: historical view
│
├── loading: boolean
│   └── Show spinner during data fetch
│
├── error: string | null
│   └── Error message to display
│
└── isDateSearchModalOpen: boolean
    └── Control modal visibility


deviceColorManager (Global Singleton)
├── deviceColorMap: Map<deviceId, colorIndex>
│   └── Persistent color assignment per device
│
└── availableColorIndices: Array<number>
    └── Shuffled color indices for random assignment
```

## Hooks Personalizados

```
┌─────────────────────────────────────────────────────────────┐
│                     CUSTOM HOOKS                             │
└─────────────────────────────────────────────────────────────┘

useMediaQuery(query)
├── Input: CSS media query string
├── Output: boolean (matches or not)
└── Use: Responsive rendering
    Example: const isMobile = useMediaQuery('(max-width: 768px)')


useViewportHeight()
├── Input: none
├── Output: number (viewport height in pixels)
└── Use: Dynamic map sizing
    Example: const height = useViewportHeight()


useFilteredUsers(users, searchTerm)
├── Input: users array, search term string
├── Output: filtered users array (memoized)
└── Use: Efficient device filtering
    Example: const filtered = useFilteredUsers(users, term)
```

## Utilidades

```
┌─────────────────────────────────────────────────────────────┐
│                      UTILITIES                               │
└─────────────────────────────────────────────────────────────┘

colorManager.js
├── getDeviceColor(deviceId)
│   └── Returns: { name, light, dark, main, hex }
│
└── deviceColorManager.cleanupInactiveDevices(activeIds)
    └── Removes old device colors from cache


dateUtils.js
├── formatTimestamp(timestamp)
│   └── Returns: "DD/MM/YYYY, HH:MM:SS"
│
└── isUserActive(lastUpdate)
    └── Returns: boolean (within INACTIVE_TIMEOUT)


mapUtils.js
├── createCircularIcon(color, isActive, size)
│   └── Returns: Leaflet DivIcon with SVG
│
└── interpolateColor(color1, color2, factor)
    └── Returns: interpolated hex color for gradients
```

## Configuración

```
┌─────────────────────────────────────────────────────────────┐
│                    CONFIGURATION                             │
└─────────────────────────────────────────────────────────────┘

appConfig.js
├── API_BASE_URL: Backend API endpoint
├── APP_NAME: "Juls Tracker"
├── POLLING_INTERVAL: 5000ms (Live mode refresh)
├── INACTIVE_TIMEOUT: 20000ms (Device inactive threshold)
├── JAWG_ACCESS_TOKEN: Map tiles token
└── JAWG_MAP_ID: "jawg-dark"


colors.js
└── DEVICE_COLORS: Array<46 colors>
    ├── Tailwind color palette
    ├── { name, light, dark, main, hex }
    └── Used for device differentiation
```

## Ciclo de Vida

```
┌─────────────────────────────────────────────────────────────┐
│                    LIFECYCLE                                 │
└─────────────────────────────────────────────────────────────┘

1. Mount
   └── App.jsx useEffect
       └── if (isLiveMode)
           ├── fetchUsersData() immediately
           └── setInterval(fetchUsersData, 5000ms)

2. Update
   └── Users data received
       ├── deviceColorManager assigns colors
       ├── Update state (users, userPaths)
       └── Components re-render with new data

3. User Interaction
   └── onClick, onChange, etc.
       ├── State updates
       ├── Components re-render
       └── Map adjusts view (MapViewUpdater)

4. Mode Switch (Live ↔ History)
   └── Toggle isLiveMode
       ├── Clear interval (if switching from Live)
       ├── Reset paths
       └── Fetch appropriate data

5. Unmount
   └── Cleanup interval
       └── clearInterval(pollingInterval)
```

---

## 🎯 Key Takeaways

1. **Single Source of Truth**: App.jsx manages all global state
2. **Unidirectional Data Flow**: Props down, events up
3. **Component Composition**: Small, focused components
4. **Custom Hooks**: Reusable stateful logic
5. **Separation of Concerns**: UI, logic, config separated
6. **Performance**: Memoization with useMemo, efficient updates
7. **Scalability**: Easy to add features without breaking existing code

