const dgram = require('dgram');
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

// Configuración de la base de datos
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false
  }
});

// Crear tabla actualizada si no existe
async function createTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS location_data (
      id SERIAL PRIMARY KEY,
      latitude DECIMAL(10, 8) NOT NULL,
      longitude DECIMAL(11, 8) NOT NULL,
      timestamp_value BIGINT NOT NULL,
      accuracy DECIMAL(8, 2),
      altitude DECIMAL(8, 2),
      speed DECIMAL(8, 2),
      provider VARCHAR(50),
      device_id VARCHAR(100),
      device_name VARCHAR(255),
      device_type VARCHAR(50) DEFAULT 'mobile',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Crear índices para optimizar consultas
    CREATE INDEX IF NOT EXISTS idx_location_device_id ON location_data(device_id);
    CREATE INDEX IF NOT EXISTS idx_location_device_timestamp ON location_data(device_id, timestamp_value DESC);
    CREATE INDEX IF NOT EXISTS idx_location_timestamp ON location_data(timestamp_value DESC);
  `;
  
  try {
    await pool.query(query);
    console.log('Tabla location_data verificada/creada con soporte para múltiples dispositivos');
  } catch (error) {
    console.error('Error creando tabla:', error);
  }
}

// Servidor UDP actualizado para manejar device_id
const udpServer = dgram.createSocket('udp4');

udpServer.on('error', (err) => {
  console.error('UDP Server error:', err);
  udpServer.close();
});

udpServer.on('message', async (msg, rinfo) => {
  console.log(`UDP mensaje recibido de ${rinfo.address}:${rinfo.port}`);
  
  try {
    // Parsear el mensaje JSON
    const data = JSON.parse(msg.toString());
    console.log('Datos recibidos:', JSON.stringify(data, null, 2));
    
    // Insertar en la base de datos CON CAMPOS DE DISPOSITIVO
    const query = `
      INSERT INTO location_data 
      (latitude, longitude, timestamp_value, accuracy, altitude, speed, provider, device_id, device_name, device_type)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `;
    
    const values = [
      data.lat,
      data.lon,
      data.time,
      data.acc || null,
      data.alt || null,
      data.spd || null,
      data.prov || null,
      data.device_id || null,
      data.device_name || null,
      data.device_type || 'mobile'
    ];
    
    const result = await pool.query(query, values);
    console.log(`Datos insertados para dispositivo ${data.device_id || 'unknown'}:`, result.rows[0].id);
    
  } catch (error) {
    console.error('Error procesando mensaje UDP:', error);
  }
});

udpServer.on('listening', () => {
  const address = udpServer.address();
  console.log(`UDP Server escuchando en ${address.address}:${address.port}`);
});

// Servidor HTTP/API REST
const app = express();
app.use(cors());
app.use(express.json());

// Endpoint para obtener el último registro (actualizado para incluir device info)
app.get('/api/location/latest', async (req, res) => {
  try {
    const query = `
      SELECT latitude, longitude, timestamp_value, created_at, device_id, device_name, device_type
      FROM location_data
      ORDER BY id DESC
      LIMIT 1;
    `;
    
    const result = await pool.query(query);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No hay datos disponibles' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error obteniendo último registro:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// NUEVO: Endpoint para obtener todos los dispositivos activos
app.get('/api/devices/all', async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT 
        device_id, 
        device_name, 
        device_type,
        MAX(timestamp_value) as last_update,
        MAX(created_at) as last_seen,
        COUNT(*) as total_records
      FROM location_data 
      WHERE device_id IS NOT NULL
      GROUP BY device_id, device_name, device_type
      ORDER BY last_update DESC;
    `;
    
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo dispositivos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// NUEVO: Endpoint para obtener la última ubicación de cada dispositivo
app.get('/api/devices/latest-locations', async (req, res) => {
  try {
    const query = `
      WITH latest_per_device AS (
        SELECT 
          device_id,
          MAX(timestamp_value) as max_timestamp
        FROM location_data 
        WHERE device_id IS NOT NULL
        GROUP BY device_id
      )
      SELECT 
        ld.device_id,
        ld.device_name,
        ld.device_type,
        ld.latitude,
        ld.longitude,
        ld.timestamp_value,
        ld.accuracy,
        ld.altitude,
        ld.speed,
        ld.provider,
        ld.created_at
      FROM location_data ld
      INNER JOIN latest_per_device lpd ON ld.device_id = lpd.device_id 
        AND ld.timestamp_value = lpd.max_timestamp
      ORDER BY ld.timestamp_value DESC;
    `;
    
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo últimas ubicaciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// NUEVO: Endpoint para obtener el último registro de un dispositivo específico
app.get('/api/location/device/:deviceId/latest', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const query = `
      SELECT latitude, longitude, timestamp_value, created_at, device_id, device_name, device_type, accuracy, altitude, speed, provider
      FROM location_data
      WHERE device_id = $1
      ORDER BY timestamp_value DESC
      LIMIT 1;
    `;
    
    const result = await pool.query(query, [deviceId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No hay datos disponibles para este dispositivo' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error obteniendo último registro del dispositivo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// NUEVO: Endpoint para obtener el historial de un dispositivo específico
app.get('/api/location/device/:deviceId/history', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const limit = parseInt(req.query.limit) || 100;
    const startDate = req.query.start_date;
    const endDate = req.query.end_date;
    
    let query = `
      SELECT * FROM location_data
      WHERE device_id = $1
    `;
    const values = [deviceId];
    
    // Agregar filtros de fecha si se proporcionan
    if (startDate) {
      query += ` AND timestamp_value >= $${values.length + 1}`;
      values.push(new Date(startDate).getTime());
    }
    
    if (endDate) {
      query += ` AND timestamp_value <= $${values.length + 1}`;
      values.push(new Date(endDate).getTime());
    }
    
    query += ` ORDER BY timestamp_value DESC LIMIT $${values.length + 1}`;
    values.push(limit);
    
    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo historial de dispositivo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint para obtener todos los registros (actualizado)
app.get('/api/location/all', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const deviceId = req.query.device_id;
    
    let query = `SELECT * FROM location_data`;
    const values = [];
    
    if (deviceId) {
      query += ` WHERE device_id = $1`;
      values.push(deviceId);
      query += ` ORDER BY timestamp_value DESC LIMIT $2`;
      values.push(limit);
    } else {
      query += ` ORDER BY timestamp_value DESC LIMIT $1`;
      values.push(limit);
    }
    
    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo registros:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint para obtener registros por rango de fechas (actualizado)
app.get('/api/location/range', async (req, res) => {
  const { startDate, endDate, deviceId } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({ message: 'Los parámetros startDate y endDate son requeridos' });
  }

  try {
    // Los timestamps vienen en formato ISO 8601, los convertimos a milisegundos
    const startTime = new Date(startDate).getTime();
    const endTime = new Date(endDate).getTime();

    let query = `
      SELECT latitude, longitude, timestamp_value, device_id, device_name, device_type
      FROM location_data
      WHERE timestamp_value >= $1 AND timestamp_value <= $2
    `;
    const values = [startTime, endTime];
    
    if (deviceId) {
      query += ` AND device_id = $3`;
      values.push(deviceId);
    }
    
    query += ` ORDER BY timestamp_value ASC;`;
    
    const result = await pool.query(query, values);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo registros por rango:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// NUEVO: Endpoint para obtener ubicaciones dentro de un área circular
app.get('/api/location/area', async (req, res) => {
  const { lat, lng, radius, deviceId } = req.query;

  if (!lat || !lng || !radius) {
    return res.status(400).json({ 
      message: 'Los parámetros lat, lng y radius son requeridos' 
    });
  }

  try {
    const centerLat = parseFloat(lat);
    const centerLng = parseFloat(lng);
    const radiusMeters = parseFloat(radius);

    if (isNaN(centerLat) || isNaN(centerLng) || isNaN(radiusMeters)) {
      return res.status(400).json({ message: 'Parámetros inválidos' });
    }

    // Usar la fórmula de Haversine para calcular distancias
    // Esta query usa una aproximación simple basada en grados para filtrar primero,
    // luego calcula la distancia exacta
    let query = `
      SELECT 
        latitude, 
        longitude, 
        timestamp_value, 
        device_id, 
        device_name, 
        device_type,
        (
          6371000 * acos(
            cos(radians($1)) * cos(radians(latitude)) * 
            cos(radians(longitude) - radians($2)) + 
            sin(radians($1)) * sin(radians(latitude))
          )
        ) AS distance
      FROM location_data
      WHERE 1=1
    `;
    const values = [centerLat, centerLng];
    
    if (deviceId) {
      query += ` AND device_id = $${values.length + 1}`;
      values.push(deviceId);
    }
    
    // Add bounding box filter for performance (approximate)
    const latDelta = (radiusMeters / 111000); // ~111km per degree latitude
    const lngDelta = (radiusMeters / (111000 * Math.cos(centerLat * Math.PI / 180)));
    
    query += ` 
      AND latitude BETWEEN $${values.length + 1} AND $${values.length + 2}
      AND longitude BETWEEN $${values.length + 3} AND $${values.length + 4}
    `;
    values.push(centerLat - latDelta, centerLat + latDelta, centerLng - lngDelta, centerLng + lngDelta);
    
    query += `
      HAVING distance <= $${values.length + 1}
      ORDER BY timestamp_value ASC;
    `;
    values.push(radiusMeters);
    
    const result = await pool.query(query, values);
    
    console.log(`Found ${result.rows.length} locations within ${radiusMeters}m radius for device ${deviceId || 'all'}`);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo ubicaciones por área:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Inicializar servidores
const HTTP_PORT = process.env.HTTP_PORT || 3001;
const UDP_PORT = process.env.UDP_PORT || 6001;

async function start() {
  try {
    // Verificar conexión a BD
    await pool.query('SELECT NOW()');
    console.log('Conectado a PostgreSQL');
    
    // Crear tabla
    await createTable();
    
    // Iniciar servidor UDP
    udpServer.bind(UDP_PORT);
    
    // Iniciar servidor HTTP
    app.listen(HTTP_PORT, '0.0.0.0', () => {
      console.log(`HTTP API escuchando en puerto ${HTTP_PORT}`);
      console.log('Nuevos endpoints disponibles:');
      console.log('  GET /api/devices/all - Lista todos los dispositivos');
      console.log('  GET /api/devices/latest-locations - Últimas ubicaciones de cada dispositivo');
      console.log('  GET /api/location/device/:deviceId/latest - Última ubicación de un dispositivo');
      console.log('  GET /api/location/device/:deviceId/history - Historial de un dispositivo');
    });
    
  } catch (error) {
    console.error('Error iniciando servidor:', error);
    process.exit(1);
  }
}

start();