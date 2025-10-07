# 🗺️ Guía Rápida: History by Area

## ¿Qué es History by Area?

Es una nueva funcionalidad que te permite ver las rutas históricas de los dispositivos que han pasado por una zona específica del mapa.

## 📋 Cómo Usar (Paso a Paso)

### Paso 1: Activar el Modo
1. Ve al header de la aplicación
2. Haz clic en la pestaña **"History by Area"**
3. La interfaz cambiará al modo de historial por área

### Paso 2: Dibujar el Área
1. Busca el **botón circular** en la esquina superior derecha
2. Haz clic en él para activar el modo de dibujo (el botón parpadeará)
3. **Haz clic y arrastra** en el mapa para crear un círculo
   - El círculo crecerá según lo lejos que arrastres
   - El tamaño mínimo es de 10 metros
4. **Suelta el clic** para finalizar el dibujo

### Paso 3: Seleccionar el Primer Dispositivo
1. Automáticamente aparecerá una **ventana modal**
2. Verás una lista de todos los dispositivos disponibles
3. Usa la **barra de búsqueda** si necesitas filtrar
4. **Haz clic en un dispositivo** para seleccionarlo
5. Haz clic en **"Confirm"**
6. La ruta del dispositivo dentro del área aparecerá en el mapa

### Paso 4: Añadir o Quitar Más Dispositivos
1. Mira la **barra lateral izquierda** (en desktop)
2. Verás todos los dispositivos con **checkboxes**
3. **Haz clic en un checkbox** para:
   - ✅ **Marcar**: Mostrar la ruta de ese dispositivo
   - ⬜ **Desmarcar**: Ocultar la ruta de ese dispositivo
4. Puedes tener **múltiples dispositivos** visibles al mismo tiempo
5. Cada dispositivo tiene su **color único** para fácil identificación

### Paso 5: Redibujar el Área (Opcional)
1. Si quieres cambiar el área, busca el **botón de actualizar** (↻) en la esquina superior derecha
2. Haz clic en él
3. Todas las selecciones se limpiarán
4. Puedes dibujar una **nueva área**

### Paso 6: Volver a Live Tracking
1. Haz clic en **"Live Tracking"** en el header para volver al modo en vivo
2. O haz clic en **"History"** para búsqueda por fechas

## 🎨 Elementos de la Interfaz

### Botones Flotantes (Esquina Superior Derecha)

**Botón de Dibujo (cuando NO hay área dibujada)**
- Icono: 🔍 (lupa)
- Estado normal: Fondo translúcido
- Estado activo: Fondo cian con animación de pulso
- Función: Activar/desactivar modo de dibujo

**Botón de Redibujar (cuando SÍ hay área dibujada)**
- Icono: ↻ (actualizar)
- Función: Limpiar y permitir dibujar nueva área

### Barra Lateral (Desktop)

**Sección Superior**
- Título: "Area History"
- Contador: "X of Y devices selected"
- Info del área: Centro (lat, lng) y Radio (metros)

**Barra de Búsqueda**
- Filtra dispositivos por nombre o ID

**Lista de Dispositivos**
- Checkbox: Seleccionar/deseleccionar
- Círculo de color: Identificador del dispositivo
- Nombre y ID del dispositivo
- Barra de color al fondo

### Modal de Selección

**Elementos**
- Título: "Select Device for Area"
- Info del área: Radio en metros
- Barra de búsqueda
- Grid de dispositivos
- Botones: "Cancel" y "Confirm"

## 💡 Tips y Trucos

### Para Dibujar Mejor
- **Arrastra lento** para círculos más pequeños
- **Arrastra rápido y lejos** para círculos grandes
- Si no estás satisfecho, usa el botón de redibujar

### Para Gestionar Dispositivos
- **Usa la búsqueda** si tienes muchos dispositivos
- Los **colores** ayudan a identificar cada ruta
- Puedes **desmarcar todos** y empezar de nuevo

### Para Mejor Visualización
- Zoom del mapa ajusta automáticamente
- Los **puntos históricos** son clickeables (muestran info)
- Las **líneas conectan** los puntos en orden temporal

## ⚠️ Notas Importantes

1. **Todos los datos históricos**: El área muestra TODOS los puntos históricos del dispositivo, sin límite de fecha
2. **Sin interferencia**: El dibujo NO interfiere con el desplazamiento del mapa (solo funciona cuando está activo)
3. **Datos en tiempo real**: Los datos se cargan bajo demanda cuando seleccionas un dispositivo
4. **Rendimiento**: Áreas muy grandes con muchos dispositivos pueden tardar más en cargar

## 🔧 Resolución de Problemas

### No aparece el círculo después de dibujar
✅ Asegúrate de haber **soltado el clic**
✅ Intenta dibujar un círculo más grande

### No hay datos para un dispositivo
✅ El dispositivo puede no haber pasado por esa área
✅ Intenta dibujar un **área más grande**
✅ Verifica que el dispositivo tenga datos históricos

### El mapa se mueve mientras dibujo
✅ Verifica que el **botón de dibujo esté activo** (parpadeando)
✅ Reactiva el modo de dibujo si se desactivó

### Múltiples dispositivos no aparecen
✅ Verifica que los **checkboxes estén marcados**
✅ Espera unos segundos (los datos se cargan)
✅ Revisa la consola del navegador para errores

## 📱 Mobile vs Desktop

### Desktop (Recomendado)
- ✅ Barra lateral completa con checkboxes
- ✅ Búsqueda más fácil
- ✅ Mejor visualización del mapa
- ✅ Dibujo más preciso

### Mobile
- ⚠️ Interfaz simplificada
- ⚠️ Dibujo puede ser menos preciso
- ⚠️ Considera usar un stylus para mejor precisión

## 🎯 Casos de Uso

### 1. Monitoreo de Zona Específica
"¿Qué dispositivos han pasado por esta intersección?"
- Dibuja un círculo pequeño en la intersección
- Selecciona dispositivos uno por uno

### 2. Análisis de Área Grande
"¿Qué rutas atraviesan este barrio?"
- Dibuja un círculo grande cubriendo el barrio
- Selecciona múltiples dispositivos
- Compara rutas

### 3. Investigación de Ruta
"¿Este dispositivo pasó por aquí?"
- Dibuja círculo en la ubicación sospechosa
- Busca y selecciona el dispositivo específico
- Verifica si hay puntos en el área

## 📊 Información Técnica

### Precisión
- Radio mínimo: 10 metros
- Cálculo: Fórmula de Haversine
- Precisión: ~1 metro

### Datos Mostrados
- Todos los puntos históricos en la base de datos
- Sin filtro de fecha (futuro enhancement)
- Ordenados por timestamp

### Límites
- Sin límite de dispositivos seleccionados
- Sin límite de puntos por dispositivo
- Rendimiento depende de la cantidad de datos

---

**¿Necesitas ayuda?** Consulta la documentación completa en `HISTORY_BY_AREA_FEATURE.md`

**¿Encontraste un bug?** Revisa `RESUMEN_HISTORIA_POR_AREA.md` para troubleshooting
