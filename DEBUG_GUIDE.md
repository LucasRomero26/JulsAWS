# 🔍 Debug Guide - Area Endpoint Error

## Error Actual
```
Backend error response: Object
Error fetching area data: Error: Unknown error
```

## Mejoras Implementadas

### 1. Logging Mejorado en Frontend

Ahora el frontend captura y muestra:
- ✅ Status HTTP completo
- ✅ Content-Type de la respuesta
- ✅ Texto crudo de la respuesta (antes de parsear)
- ✅ Errores de parsing JSON
- ✅ Mensajes detallados del backend

### 2. Tool de Testing HTML

Se creó `test-area-endpoint.html` - una herramienta standalone para probar el endpoint.

**Características:**
- Prueba el endpoint sin necesidad del frontend completo
- Muestra respuesta cruda antes de parsear
- Timing de respuestas
- Prueba de health check
- Interfaz visual clara

## 📋 Cómo Diagnosticar el Problema

### Paso 1: Abrir la Herramienta de Testing

1. Abre en tu navegador: `test-area-endpoint.html` (archivo en la raíz del proyecto)
2. Configura la URL de tu API:
   - Local: `http://localhost:3001`
   - EC2: `https://julstracker.app`
3. Click en "Test Health" primero
4. Si Health funciona, click en "Test Endpoint"

### Paso 2: Revisar la Consola del Navegador

En tu aplicación principal (julstracker.app):

1. Abre DevTools (F12)
2. Ve a la pestaña "Console"
3. Busca estos nuevos logs:

```javascript
Fetching area data: http://...
Response status: 200 OK  // o el status que sea
Error response content-type: ...
Error response text: ...  // Esto es clave!
```

### Paso 3: Revisar Logs del Backend

En tu EC2:

```bash
pm2 logs backend --lines 50
```

Busca:
```
Area query request - Center: ...
Executing query with values: ...
Found X locations within ...
```

O errores:
```
Error obteniendo ubicaciones por área: ...
Error stack: ...
```

## 🐛 Causas Comunes del Error

### Causa 1: Backend No Responde JSON

**Síntoma:** Content-Type no es `application/json`

**Solución:**
```javascript
// Verifica que en server.js tengas:
app.use(express.json());
```

### Causa 2: Error en la Query SQL

**Síntoma:** Status 500, error en logs del backend

**Verificar:**
```bash
# En el backend, logs deberían mostrar el error SQL exacto
pm2 logs backend | grep "Error"
```

**Posible solución:**
- Verifica que los parámetros SQL estén numerados correctamente
- Verifica que la tabla location_data existe
- Verifica que hay datos en la tabla

### Causa 3: CORS Issue

**Síntoma:** Network error, sin status HTTP

**Verificar en backend:**
```javascript
app.use(cors()); // Debe estar ANTES de las rutas
```

### Causa 4: URL Incorrecta

**Síntoma:** 404 Not Found

**Verificar:**
- La URL debe ser: `/api/location/area`
- NO: `/api/area` o `/location/area`

### Causa 5: Parámetros Inválidos

**Síntoma:** Status 400

**Verificar que tengas:**
- `lat` (número válido)
- `lng` (número válido)
- `radius` (número válido)
- `deviceId` (string, opcional)

## 🧪 Tests Manuales

### Test 1: Health Check

```bash
curl http://localhost:3001/api/health
```

**Esperado:**
```json
{
  "status": "OK",
  "timestamp": "2025-10-07T..."
}
```

### Test 2: Area Endpoint (Sin Device)

```bash
curl "http://localhost:3001/api/location/area?lat=10.92987&lng=-74.72083&radius=50000"
```

**Esperado:** Array JSON con puntos o `[]`

### Test 3: Area Endpoint (Con Device)

```bash
curl "http://localhost:3001/api/location/area?lat=10.92987&lng=-74.72083&radius=50000&deviceId=device_85e9fe938c42ea28"
```

**Esperado:** Array JSON con puntos o `[]`

### Test 4: Verificar Base de Datos

```sql
-- Conecta a PostgreSQL
psql -h localhost -U tu_usuario -d tu_base_datos

-- Verifica que hay datos
SELECT COUNT(*) FROM location_data;

-- Verifica que hay datos con device_id
SELECT COUNT(*) FROM location_data WHERE device_id IS NOT NULL;

-- Verifica un dispositivo específico
SELECT COUNT(*) FROM location_data WHERE device_id = 'device_85e9fe938c42ea28';

-- Verifica las coordenadas de un dispositivo
SELECT latitude, longitude, timestamp_value 
FROM location_data 
WHERE device_id = 'device_85e9fe938c42ea28' 
ORDER BY timestamp_value DESC 
LIMIT 5;
```

## 📝 Checklist de Debugging

- [ ] Health endpoint funciona
- [ ] Backend está corriendo (pm2 list o ps aux | grep node)
- [ ] No hay errores en logs del backend
- [ ] La tabla location_data existe
- [ ] Hay datos en la tabla location_data
- [ ] Los device_id no son NULL
- [ ] CORS está configurado
- [ ] La URL del endpoint es correcta
- [ ] Los parámetros (lat, lng, radius) son números válidos
- [ ] La consola del navegador muestra los nuevos logs
- [ ] test-area-endpoint.html muestra la respuesta cruda

## 🔧 Fix Rápido

Si después de todos los checks sigue sin funcionar:

### 1. Reinicia Todo

```bash
# En EC2
cd /ruta/proyecto
git pull origin main
pm2 restart backend
pm2 logs backend
```

### 2. Verifica la Configuración

```bash
# Verifica las variables de entorno
cat backend/.env | grep DB_

# Verifica que el puerto sea correcto
cat backend/.env | grep HTTP_PORT
```

### 3. Prueba con curl Directamente en el Servidor

```bash
# SSH a tu EC2
curl "http://localhost:3001/api/location/area?lat=10&lng=-74&radius=50000"
```

Si funciona en el servidor pero no desde el navegador = problema de CORS o firewall.

## 📤 Información a Proporcionar para Soporte

Si el problema persiste, proporciona:

1. **Logs del backend** (últimas 50 líneas)
```bash
pm2 logs backend --lines 50 > backend_logs.txt
```

2. **Console del navegador** (screenshot o texto completo)

3. **Output de test-area-endpoint.html**

4. **Resultado de curl en el servidor:**
```bash
curl -v "http://localhost:3001/api/location/area?lat=10&lng=-74&radius=50000"
```

5. **Verificación de DB:**
```sql
SELECT COUNT(*), device_id FROM location_data GROUP BY device_id;
```

---

## 🎯 Próximo Paso Inmediato

1. **Haz pull de los cambios:**
```bash
git pull origin main
```

2. **Reinicia el backend:**
```bash
pm2 restart backend
```

3. **Abre test-area-endpoint.html en tu navegador** y prueba

4. **Abre tu aplicación y mira la consola** mientras haces la prueba

5. **Copia y pégame los logs** que veas en la consola del navegador, específicamente:
   - "Response status: ..."
   - "Error response text: ..."
   - Los logs del backend

Con esa información podré identificar el problema exacto.
