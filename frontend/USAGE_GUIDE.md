# 📖 Guía de Uso de Componentes

## Cómo Importar y Usar los Componentes

### Opción 1: Import Individual
```jsx
import AnimatedBackground from './components/AnimatedBackground';
import SearchBar from './components/SearchBar';
import LoadingSpinner from './components/LoadingSpinner';
```

### Opción 2: Import desde Index (Recomendado)
```jsx
import { 
  AnimatedBackground, 
  SearchBar, 
  LoadingSpinner 
} from './components';
```

## 🎨 Ejemplos de Uso

### SearchBar
```jsx
import { SearchBar } from './components';

function MyComponent() {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <SearchBar
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      placeholder="Search devices..."
    />
  );
}
```

### LoadingSpinner
```jsx
import { LoadingSpinner } from './components';

function MyComponent() {
  const [loading, setLoading] = useState(true);

  return (
    <div>
      {loading ? <LoadingSpinner /> : <YourContent />}
    </div>
  );
}
```

### ErrorMessage
```jsx
import { ErrorMessage } from './components';

function MyComponent() {
  const [error, setError] = useState(null);

  return (
    <ErrorMessage
      error={error}
      onRetry={() => fetchData()}
      onReturnToLive={() => setMode('live')}
      isNoDataError={false}
    />
  );
}
```

### useMediaQuery Hook
```jsx
import { useMediaQuery } from './hooks';

function MyComponent() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(max-width: 1024px)');

  return (
    <div>
      {isMobile ? <MobileView /> : <DesktopView />}
    </div>
  );
}
```

### useFilteredUsers Hook
```jsx
import { useFilteredUsers } from './hooks';

function MyComponent({ users }) {
  const [searchTerm, setSearchTerm] = useState('');
  const filteredUsers = useFilteredUsers(users, searchTerm);

  return (
    <div>
      <SearchBar 
        searchTerm={searchTerm} 
        onSearchChange={setSearchTerm} 
      />
      {filteredUsers.map(user => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  );
}
```

### Color Manager
```jsx
import { getDeviceColor } from './utils';

function DeviceItem({ deviceId }) {
  const deviceColor = getDeviceColor(deviceId);

  return (
    <div style={{ 
      backgroundColor: deviceColor.hex,
      border: `2px solid ${deviceColor.dark}`
    }}>
      Device Color: {deviceColor.name}
    </div>
  );
}
```

### Date Utils
```jsx
import { formatTimestamp, isUserActive } from './utils';

function UserInfo({ user }) {
  const isActive = isUserActive(user.lastUpdate);
  const formattedDate = formatTimestamp(user.lastUpdate);

  return (
    <div>
      <p>Status: {isActive ? 'Active' : 'Inactive'}</p>
      <p>Last Update: {formattedDate}</p>
    </div>
  );
}
```

### Config
```jsx
import { config } from './config';

async function fetchData() {
  const response = await fetch(
    `${config.API_BASE_URL}/api/devices`
  );
  // ...
}

// Usar timeout de inactividad
const isActive = (Date.now() - lastUpdate) < config.INACTIVE_TIMEOUT;
```

## 🔧 Crear Nuevos Componentes

### Plantilla de Componente
```jsx
// src/components/MyNewComponent.jsx

function MyNewComponent({ prop1, prop2, onAction }) {
  // Lógica del componente
  
  return (
    <div className="my-component">
      {/* JSX aquí */}
    </div>
  );
}

export default MyNewComponent;
```

### Agregar al Index
```jsx
// src/components/index.js

export { default as MyNewComponent } from './MyNewComponent';
```

### Usar el Componente
```jsx
import { MyNewComponent } from './components';

function App() {
  return <MyNewComponent prop1="value" onAction={handleAction} />;
}
```

## 📝 Best Practices

### 1. Props Destructuring
```jsx
// ✅ Bueno
function Component({ title, description, onClick }) {
  return <div onClick={onClick}>{title}</div>;
}

// ❌ Evitar
function Component(props) {
  return <div onClick={props.onClick}>{props.title}</div>;
}
```

### 2. Conditional Rendering
```jsx
// ✅ Bueno
{isLoading && <LoadingSpinner />}
{error && <ErrorMessage error={error} />}
{data && <DataDisplay data={data} />}

// ✅ También bueno
{isLoading ? <LoadingSpinner /> : <Content />}
```

### 3. Event Handlers
```jsx
// ✅ Bueno - inline arrow function para pasar parámetros
<button onClick={() => handleClick(id)}>Click</button>

// ✅ Bueno - referencia directa si no hay parámetros
<button onClick={handleClick}>Click</button>

// ❌ Evitar - ejecuta inmediatamente
<button onClick={handleClick()}>Click</button>
```

### 4. Estado Local vs Props
```jsx
// Estado local para UI state
const [isOpen, setIsOpen] = useState(false);

// Props para data y callbacks
function Component({ data, onSave }) {
  // ...
}
```

### 5. Custom Hooks
```jsx
// ✅ Extraer lógica compleja en hooks
function useDeviceData(deviceId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeviceData(deviceId).then(setData);
  }, [deviceId]);

  return { data, loading };
}

// Usar en componente
function Component({ deviceId }) {
  const { data, loading } = useDeviceData(deviceId);
  
  if (loading) return <LoadingSpinner />;
  return <div>{data.name}</div>;
}
```

## 🎯 Patrones Comunes

### Fetch Data Pattern
```jsx
function MyComponent() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const response = await fetch(config.API_BASE_URL + '/api/data');
        const json = await response.json();
        setData(json);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  return <DataDisplay data={data} />;
}
```

### Compound Components Pattern
```jsx
// Sidebar con búsqueda integrada
<DesktopUsersSidebar
  users={users}
  selectedUserId={selectedUserId}
  onUserSelect={handleUserSelect}
/>
// SearchBar está integrado dentro
```

### Render Props Pattern
```jsx
<LocationMap
  users={users}
  userPaths={userPaths}
  isLiveMode={isLiveMode}
  selectedUserId={selectedUserId}
  previousUsers={previousUsers}
/>
```

---

**💡 Tip**: Siempre revisa los archivos existentes para ver patrones y estilos consistentes.
