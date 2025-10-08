# Test del Endpoint /api/location/area

## Problemas Corregidos

### 1. **Conflicto de Parámetros SQL**
**Antes:** Los índices de parámetros `$7`, `$8` se repetían causando errores en PostgreSQL
**Ahora:** Los parámetros se numeran correctamente en secuencia

### 2. **Mejor Logging**
- Se agregó `console.log` para ver la query y valores
- Se muestra información de los parámetros recibidos
- Se captura el stack trace completo del error

## Cómo Probar el Endpoint

### 1. Verificar que el Backend esté corriendo

```bash
# En tu EC2, verifica que el servidor backend esté corriendo
ps aux | grep node
# O si usas pm2
pm2 list
```

### 2. Probar el Endpoint Directamente

#### Opción A: Desde el navegador
Abre tu navegador y ve a:
```
http://tu-ec2-url:3001/api/location/area?lat=10.92987&lng=-74.72083&radius=28686&deviceId=device_85e9fe938c42ea28
```

Reemplaza:
- `tu-ec2-url` con tu URL de EC2
- `lat` y `lng` con las coordenadas del centro de tu círculo
- `radius` con el radio en metros
- `deviceId` con el ID del dispositivo (ejemplo: `device_85e9fe938c42ea28`)

#### Opción B: Desde curl en la terminal
```bash
curl -X GET "http://localhost:3001/api/location/area?lat=10.92987&lng=-74.72083&radius=28686&deviceId=device_85e9fe938c42ea28"
```

#### Opción C: Desde curl con el dominio completo
```bash
curl -X GET "https://julstracker.app/api/location/area?lat=10.92987&lng=-74.72083&radius=28686&deviceId=device_85e9fe938c42ea28"
```

### 3. Respuesta Esperada

#### Si HAY datos:
```json
[
  {
    "latitude": "10.929870",
    "longitude": "-74.720830",
    "timestamp_value": 1234567890000,
    "device_id": "device_85e9fe938c42ea28",
    "device_name": "23053RN02L",
    "device_type": "mobile",
    "distance": 150.5
  },
  ...más puntos
]
```

#### Si NO HAY datos:
```json
[]
```

#### Si hay ERROR:
```json
{
  "error": "Error interno del servidor",
  "message": "descripción del error específico",
  "details": "stack trace (solo en development)"
}
```

### 4. Verificar los Logs del Backend

En tu servidor EC2, revisa los logs del backend:

```bash
# Si corres node directamente
# Los logs aparecerán en la consola donde iniciaste el servidor

# Si usas pm2
pm2 logs backend

# Deberías ver algo como:
# Area query request - Center: (10.92987, -74.72083), Radius: 28686m, Device: device_85e9fe938c42ea28
# Executing query with values: [ 10.92987, -74.72083, 10.671, 11.188, -74.978, -74.462, 'device_85e9fe938c42ea28', 28686 ]
# Found 0 locations within 28686m radius for device device_85e9fe938c42ea28
```

## Debugging

### Si el endpoint devuelve []

1. **Verifica que haya datos en la base de datos:**
```sql
-- Conecta a tu base de datos PostgreSQL
SELECT COUNT(*) FROM location_data WHERE device_id = 'device_85e9fe938c42ea28';
```

2. **Verifica las coordenadas:**
```sql
-- Verifica un punto específico del dispositivo
SELECT latitude, longitude, timestamp_value 
FROM location_data 
WHERE device_id = 'device_85e9fe938c42ea28' 
ORDER BY timestamp_value DESC 
LIMIT 5;
```

3. **Prueba con un radio MÁS GRANDE:**
```
# Prueba con 50km = 50000 metros
http://tu-ec2-url:3001/api/location/area?lat=10.92987&lng=-74.72083&radius=50000&deviceId=device_85e9fe938c42ea28
```

### Si obtienes Error 500

1. **Revisa los logs del backend** (ver arriba)
2. **Verifica la conexión a la base de datos:**
```bash
# En tu EC2, verifica que PostgreSQL esté corriendo
sudo systemctl status postgresql
```

3. **Verifica las credenciales de la BD:**
```bash
# En tu directorio backend
cat .env | grep DB_
```

### Si obtienes Error 400

El error dirá qué parámetro falta. Verifica que:
- `lat` esté presente y sea un número válido
- `lng` esté presente y sea un número válido
- `radius` esté presente y sea un número válido

## Cambios Realizados en el Código

### Backend (server.js)

**Antes:**
```javascript
if (deviceId) {
  whereClause += ` AND device_id = $${values.length + 1}`;
  values.push(deviceId);
}

const query = `...
  WHERE distance <= $${values.length + 1}  // ❌ PROBLEMA: Índice incorrecto
`;
values.push(radiusMeters);
```

**Después:**
```javascript
const values = [centerLat, centerLng, ...];

let deviceFilter = '';
if (deviceId) {
  values.push(deviceId);
  deviceFilter = ` AND device_id = $${values.length}`;  // ✅ Índice correcto
}

values.push(radiusMeters);
const radiusParamIndex = values.length;  // ✅ Guardamos el índice correcto

const query = `...
  WHERE distance <= $${radiusParamIndex}  // ✅ Usa el índice correcto
`;
```

### Frontend (App.jsx)

Ahora captura y muestra el error específico del backend:

```javascript
if (!response.ok) {
  const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
  console.error('Backend error response:', errorData);
  throw new Error(errorData.error || errorData.message || `HTTP ${response.status}: Error fetching area history.`);
}
```

## Próximos Pasos

1. **Reinicia el backend** en tu EC2:
```bash
# Si usas pm2
pm2 restart backend

# Si corres node directamente
# Detén el proceso (Ctrl+C) y reinicia
node server.js
```

2. **Limpia la caché del frontend** en tu navegador:
- Ctrl+Shift+R (Windows/Linux)
- Cmd+Shift+R (Mac)

3. **Prueba de nuevo** la funcionalidad de History by Area

4. **Revisa la consola del navegador** (F12) para ver los mensajes de log que agregamos

5. **Revisa los logs del backend** para ver qué está pasando exactamente

---

**Recuerda:** Los valores de ejemplo (lat=10.92987, lng=-74.72083, radius=28686) son los que se ven en tu captura de pantalla. Ajústalos según tus necesidades.
