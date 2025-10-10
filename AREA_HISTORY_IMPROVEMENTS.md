# Mejoras en History by Area - Documentación

## Resumen de Cambios

Se han implementado mejoras significativas en la funcionalidad "History by Area" para proporcionar una visualización más detallada y controlable de los recorridos de dispositivos dentro de áreas específicas.

## Nuevas Características

### 1. **Separación Automática de Recorridos**
- Los recorridos se dividen automáticamente cuando hay una brecha de más de **10 minutos** entre puntos consecutivos
- Cada recorrido se considera independiente y se puede visualizar por separado

### 2. **Colores Diferenciados por Recorrido**
- Cada recorrido dentro de un mismo dispositivo se dibuja con un color diferente
- Los colores son **variaciones más claras** del color base del dispositivo
- El primer recorrido usa el color base, los siguientes se vuelven progresivamente más claros
- Esto permite distinguir visualmente entre múltiples recorridos del mismo dispositivo

### 3. **Marcadores de Inicio y Fin**
- Cada recorrido muestra:
  - **Marcador verde** en el punto de inicio
  - **Marcador rojo** en el punto final
- Los marcadores incluyen información detallada:
  - Nombre del dispositivo
  - Número de recorrido
  - Fecha y hora exacta
  - Coordenadas (latitud/longitud)

### 4. **Modal de Selección de Recorridos**
- Nueva ventana desplegable que permite:
  - Ver todos los recorridos encontrados en el área
  - Seleccionar/deseleccionar recorridos individualmente
  - Ver información detallada de cada recorrido:
    - Hora de inicio y fin
    - Duración del recorrido
    - Distancia recorrida
    - Número de puntos registrados
  - Expandir/contraer dispositivos
  - Seleccionar/deseleccionar todos los recorridos de un dispositivo

### 5. **Botón de Gestión de Recorridos**
- Nuevo botón flotante en el mapa (cuando hay recorridos cargados)
- Muestra el número total de recorridos seleccionados
- Abre el modal de selección de recorridos
- Ubicado en la esquina superior derecha del mapa

## Cambios Técnicos

### Backend (`server.js`)
- **Endpoint `/api/location/area` mejorado**:
  - Ahora incluye el campo `id` para cada punto
  - Incluye `created_at` para tener timestamps completos
  - Mantiene compatibilidad con código existente

### Frontend - Nuevos Archivos

#### `src/utils/pathUtils.js`
Utilidades para procesar rutas y recorridos:
- `splitIntoRoutes()`: Divide puntos en recorridos basándose en gaps de tiempo
- `getRouteColor()`: Genera colores diferenciados para cada recorrido
- `calculateRouteDistance()`: Calcula la distancia total de un recorrido
- `formatDuration()`: Formatea duración en formato legible
- `formatDistance()`: Formatea distancia en metros/kilómetros

#### `src/components/RouteSelectionModal.jsx`
Modal interactivo para gestión de recorridos:
- Lista jerárquica: dispositivos → recorridos
- Checkboxes individuales y grupales
- Información detallada de cada recorrido
- Interfaz colapsable y expandible
- Diseño responsive con glassmorphism

### Frontend - Archivos Modificados

#### `src/App.jsx`
- Nuevos estados para gestión de recorridos:
  - `deviceRoutes`: Almacena todos los recorridos por dispositivo
  - `selectedRoutes`: Mantiene qué recorridos están seleccionados
  - `isRouteSelectionModalOpen`: Control del modal
  
- Funciones actualizadas:
  - `handleDeviceSelectForArea()`: Procesa puntos y crea recorridos
  - `handleDeviceToggleForArea()`: Gestiona agregar/quitar dispositivos
  - `handleRouteToggle()`: Nueva función para seleccionar/deseleccionar recorridos individuales

#### `src/components/LocationMap.jsx`
- Renderizado condicional mejorado para modo `areaHistory`
- Dibuja múltiples recorridos con colores diferenciados
- Renderiza marcadores de inicio (verde) y fin (rojo)
- Puntos intermedios más pequeños y sutiles
- Mantiene compatibilidad con modos `live` y `history`

#### `src/utils/index.js`
- Exporta nuevas utilidades de `pathUtils`

#### `src/components/index.js`
- Exporta el nuevo componente `RouteSelectionModal`

## Flujo de Usuario

### Usar History by Area con Recorridos Múltiples

1. **Activar modo Area History**
   - Click en "History by Area" en el header

2. **Dibujar área de búsqueda**
   - Click en el botón de dibujo (lupa)
   - Click y arrastrar en el mapa para crear círculo

3. **Seleccionar dispositivo(s)**
   - Elegir dispositivo en el modal que aparece
   - O usar el sidebar para agregar más dispositivos

4. **Ver recorridos automáticamente**
   - El sistema carga y procesa los datos
   - Divide automáticamente en recorridos (gaps de 10 min)
   - Todos los recorridos se muestran por defecto

5. **Gestionar visualización de recorridos**
   - Click en el botón con número de recorridos (esquina superior derecha)
   - Expandir dispositivo para ver sus recorridos
   - Click en checkboxes para mostrar/ocultar recorridos
   - Ver información detallada de cada recorrido

6. **Interpretar el mapa**
   - Cada color representa un recorrido diferente
   - Círculo verde = inicio del recorrido
   - Círculo rojo = fin del recorrido
   - Click en cualquier punto para ver detalles

7. **Redibujar o volver**
   - Click en botón de "Redraw" para nueva área
   - Click en "Back to Live" para volver al modo normal

## Ventajas de la Nueva Implementación

1. **Claridad Visual**: Colores diferenciados permiten distinguir recorridos fácilmente
2. **Control Total**: Usuario decide qué recorridos ver
3. **Información Completa**: Fecha, hora, duración y distancia de cada recorrido
4. **Eficiencia**: Procesamiento automático de gaps de tiempo
5. **Escalabilidad**: Soporta múltiples dispositivos y múltiples recorridos
6. **UX Mejorada**: Interfaz intuitiva con feedback visual

## Consideraciones Técnicas

- **Gap de 10 minutos**: Configurable en la función `splitIntoRoutes()` (parámetro `maxGapMinutes`)
- **Colores**: Generados algorítmicamente para mantener coherencia con el color del dispositivo
- **Performance**: Los recorridos se calculan solo cuando se cargan los datos
- **Compatibilidad**: No afecta los modos Live y History por fecha

## Próximas Mejoras Potenciales

- [ ] Permitir ajustar el gap de tiempo desde la UI
- [ ] Exportar recorridos seleccionados a archivo
- [ ] Estadísticas agregadas (total de distancia, tiempo promedio, etc.)
- [ ] Filtros por duración o distancia
- [ ] Comparación visual entre recorridos
- [ ] Animación de recorrido (replay)

## Testing Recomendado

1. Probar con dispositivo que tiene múltiples recorridos en un día
2. Verificar que gaps de más de 10 minutos crean recorridos separados
3. Comprobar que colores son visualmente distintos
4. Validar que marcadores de inicio/fin se posicionan correctamente
5. Testear selección/deselección de recorridos individuales
6. Verificar funcionamiento con múltiples dispositivos simultáneamente
