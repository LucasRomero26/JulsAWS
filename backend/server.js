const dgram = require('dgram');
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();
const AWS = require('aws-sdk');

// NUEVO: Importar módulo de señalización WebRTC
const { setupWebRTCSignaling } = require('./webrtc-signaling');

// Configuración de la base de  datos
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

// Crear tabla location_data si no existe
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
    console.log('✅ Tabla location_data verificada/creada con soporte para múltiples dispositivos');
  } catch (error) {
    console.error('❌ Error creando tabla location_data:', error);
  }
}

// ✨ ACTUALIZADO: Crear tabla de contenedores con información del dispositivo
async function createContainersTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS containers (
      id SERIAL PRIMARY KEY,
      iso_code VARCHAR(20) NOT NULL,
      confidence DECIMAL(5, 2),
      track_id INTEGER,
      image_filename VARCHAR(255),
      timestamp_value BIGINT NOT NULL,
      device_id VARCHAR(100),
      device_name VARCHAR(255),
      device_type VARCHAR(50) DEFAULT 'jetson',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Crear índices para optimizar consultas
    CREATE INDEX IF NOT EXISTS idx_containers_iso_code ON containers(iso_code);
    CREATE INDEX IF NOT EXISTS idx_containers_timestamp ON containers(timestamp_value DESC);
    CREATE INDEX IF NOT EXISTS idx_containers_created_at ON containers(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_containers_device_id ON containers(device_id);
    CREATE INDEX IF NOT EXISTS idx_containers_device_timestamp ON containers(device_id, timestamp_value DESC);
  `;
  
  try {
    await pool.query(query);
    console.log('✅ Tabla containers verificada/creada con soporte para device tracking');
  } catch (error) {
    console.error('❌ Error creando tabla containers:', error);
  }
}

// ✨ NUEVO: Crear tabla de containers_white_list
async function createContainersWhiteListTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS containers_white_list (
      id SERIAL PRIMARY KEY,
      iso_code VARCHAR(20) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      device_id VARCHAR(100),
      device_name VARCHAR(255),
      device_type VARCHAR(50) DEFAULT 'jetson'
    );
    
    -- Crear índices para optimizar consultas
    CREATE INDEX IF NOT EXISTS idx_containers_wl_iso_code ON containers_white_list(iso_code);
    CREATE INDEX IF NOT EXISTS idx_containers_wl_device_id ON containers_white_list(device_id);
    CREATE INDEX IF NOT EXISTS idx_containers_wl_created_at ON containers_white_list(created_at DESC);
  `;
  
  try {
    await pool.query(query);
    console.log('✅ Tabla containers_white_list verificada/creada');
  } catch (error) {
    console.error('❌ Error creando tabla containers_white_list:', error);
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

// ====== S3 CONFIG FOR REPORTS ======
const s3 = new AWS.S3({
  region: 'us-east-2',
});

const REPORTS_BUCKET = 'container-reports-9584';
// ===================================

// ==================== ENDPOINTS DE LOCATION ====================

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

// Endpoint para obtener todos los dispositivos activos
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

// Endpoint para obtener la última ubicación de cada dispositivo
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

// Endpoint para obtener el último registro de un dispositivo específico
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

// Endpoint para obtener el historial de un dispositivo específico
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

// Endpoint para obtener todos los registros
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

// Endpoint para obtener registros por rango de fechas
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

// Endpoint para obtener ubicaciones dentro de un área circular
// ✨ ACTUALIZADO: Ahora soporta filtrado por rango de fechas
app.get('/api/location/area', async (req, res) => {
  const { lat, lng, radius, deviceId, startDate, endDate } = req.query;

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

    console.log(`Area query request - Center: (${centerLat}, ${centerLng}), Radius: ${radiusMeters}m, Device: ${deviceId || 'all'}`);
    if (startDate && endDate) {
      console.log(`Date range - From: ${startDate} to: ${endDate}`);
    }

    // Usar la fórmula de Haversine para calcular distancias
    const latDelta = (radiusMeters / 111000); // ~111km per degree latitude
    const lngDelta = (radiusMeters / (111000 * Math.cos(centerLat * Math.PI / 180)));
    
    const values = [centerLat, centerLng, centerLat - latDelta, centerLat + latDelta, centerLng - lngDelta, centerLng + lngDelta];
    
    let deviceFilter = '';
    if (deviceId) {
      values.push(deviceId);
      deviceFilter = ` AND device_id = $${values.length}`;
    }

    // ✨ NUEVO: Agregar filtro de rango de fechas
    let dateFilter = '';
    if (startDate && endDate) {
      const startTime = new Date(startDate).getTime();
      const endTime = new Date(endDate).getTime();
      
      values.push(startTime);
      const startDateParamIndex = values.length;
      
      values.push(endTime);
      const endDateParamIndex = values.length;
      
      dateFilter = ` AND timestamp_value >= $${startDateParamIndex} AND timestamp_value <= $${endDateParamIndex}`;
    }
    
    values.push(radiusMeters);
    const radiusParamIndex = values.length;
    
    const query = `
      SELECT 
        id,
        latitude, 
        longitude, 
        timestamp_value, 
        device_id, 
        device_name, 
        device_type,
        distance,
        created_at
      FROM (
        SELECT 
          id,
          latitude, 
          longitude, 
          timestamp_value, 
          device_id, 
          device_name, 
          device_type,
          created_at,
          (
            6371000 * acos(
              LEAST(1.0, GREATEST(-1.0,
                cos(radians($1)) * cos(radians(latitude)) * 
                cos(radians(longitude) - radians($2)) + 
                sin(radians($1)) * sin(radians(latitude))
              ))
            )
          ) AS distance
        FROM location_data
        WHERE latitude BETWEEN $3 AND $4
        AND longitude BETWEEN $5 AND $6
        ${deviceFilter}
        ${dateFilter}
      ) AS subquery
      WHERE distance <= $${radiusParamIndex}
      ORDER BY timestamp_value ASC;
    `;
    
    console.log('Executing query with values:', values);
    const result = await pool.query(query, values);
    
    console.log(`Found ${result.rows.length} locations within ${radiusMeters}m radius for device ${deviceId || 'all'}`);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        message: 'No se encontraron ubicaciones en el área especificada',
        details: {
          center: { lat: centerLat, lng: centerLng },
          radius: radiusMeters,
          deviceId: deviceId || 'all devices',
          dateRange: startDate && endDate ? { startDate, endDate } : 'all time'
        }
      });
    }
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo ubicaciones por área:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// ====== REPORTS API (S3 PDFs) ======
app.get('/api/reports', async (req, res) => {
  try {
    // Leer parámetros opcionales de fecha ?date=YYYY-MM-DD
    const { date } = req.query; // por ahora solo lo usaremos para filtrar por nombre

    if (!REPORTS_BUCKET) {
      return res.status(500).json({ error: 'REPORTS_BUCKET is not configured' });
    }

    const params = {
      Bucket: REPORTS_BUCKET,
    };

    const data = await s3.listObjectsV2(params).promise();

    const items =
      data.Contents?.filter((obj) => obj.Key.toLowerCase().endsWith('.pdf')) ||
      [];

    // Mapear a un formato amigable
    const reports = items.map((obj) => {
      const key = obj.Key; // ejemplo: "11_14_2025.pdf"
      const lastModified = obj.LastModified;

      // Intentar inferir fecha a partir del nombre MM_DD_YYYY
      let parsedDate = null;
      const match = key.match(/(\d{2})_(\d{2})_(\d{4})\.pdf$/);
      if (match) {
        const [_, mm, dd, yyyy] = match;
        parsedDate = `${yyyy}-${mm}-${dd}`; // YYYY-MM-DD
      }

      return {
        key,
        fileName: key,
        size: obj.Size,
        lastModified,
        parsedDate,
      };
    });

    // Si llega ?date=YYYY-MM-DD, filtra
    let filteredReports = reports;
    if (date) {
      filteredReports = reports.filter((r) => r.parsedDate === date);
    }

    // Ordenar por fecha de último cambio (desc)
    filteredReports.sort(
      (a, b) => new Date(b.lastModified) - new Date(a.lastModified)
    );

    res.json({
      bucket: REPORTS_BUCKET,
      count: filteredReports.length,
      reports: filteredReports,
    });
  } catch (err) {
    console.error('Error listing reports from S3:', err);
    res.status(500).json({
      error: 'Error listing reports',
      details: err.message,
    });
  }
});
// ===================================


// ==================== ENDPOINTS DE CONTAINERS ====================

// ✨ ACTUALIZADO: Endpoint para recibir datos de contenedores con device info
app.post('/api/containers', async (req, res) => {
  try {
    const { iso_code, timestamp, confidence, track_id, image_filename, device_id, device_name, device_type } = req.body;
    
    // Validar campos requeridos
    if (!iso_code || !timestamp) {
      return res.status(400).json({ 
        error: 'Los campos iso_code y timestamp son requeridos' 
      });
    }
    
    console.log(`📦 Nuevo contenedor detectado: ${iso_code} | Device: ${device_id || 'unknown'} | Confidence: ${confidence}%`);
    
    // Insertar en la base de datos CON INFO DEL DISPOSITIVO
    const query = `
      INSERT INTO containers 
      (iso_code, timestamp_value, confidence, track_id, image_filename, device_id, device_name, device_type)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;
    
    const values = [
      iso_code,
      timestamp,
      confidence || null,
      track_id || null,
      image_filename || null,
      device_id || null,
      device_name || null,
      device_type || 'jetson'
    ];
    
    const result = await pool.query(query, values);
    console.log(`✅ Contenedor guardado con ID: ${result.rows[0].id} | Device: ${device_id || 'N/A'}`);
    
    res.status(201).json({
      success: true,
      message: 'Contenedor registrado exitosamente',
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('❌ Error registrando contenedor:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      message: error.message 
    });
  }
});

// ✨ Endpoint para obtener todos los contenedores
app.get('/api/containers/all', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    
    const query = `
      SELECT * FROM containers
      ORDER BY created_at DESC
      LIMIT $1;
    `;
    
    const result = await pool.query(query, [limit]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo contenedores:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ✨ Endpoint para obtener el último contenedor detectado
app.get('/api/containers/latest', async (req, res) => {
  try {
    const query = `
      SELECT * FROM containers
      ORDER BY created_at DESC
      LIMIT 1;
    `;
    
    const result = await pool.query(query);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No hay contenedores registrados' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error obteniendo último contenedor:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ✨ Endpoint para obtener contenedores por código ISO
app.get('/api/containers/iso/:isoCode', async (req, res) => {
  try {
    const { isoCode } = req.params;
    const query = `
      SELECT * FROM containers
      WHERE iso_code = $1
      ORDER BY created_at DESC;
    `;
    
    const result = await pool.query(query, [isoCode]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo contenedores por ISO:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ✨ NUEVO: Endpoint para obtener contenedores por device_id
app.get('/api/containers/device/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const limit = parseInt(req.query.limit) || 100;
    
    const query = `
      SELECT * FROM containers
      WHERE device_id = $1
      ORDER BY created_at DESC
      LIMIT $2;
    `;
    
    const result = await pool.query(query, [deviceId, limit]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo contenedores por device:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ✨ NUEVO: Endpoint para obtener estadísticas de contenedores por dispositivo
app.get('/api/containers/stats/by-device', async (req, res) => {
  try {
    const query = `
      SELECT 
        device_id,
        device_name,
        device_type,
        COUNT(*) as total_containers,
        COUNT(DISTINCT iso_code) as unique_containers,
        MAX(timestamp_value) as last_detection,
        AVG(confidence) as avg_confidence
      FROM containers
      WHERE device_id IS NOT NULL
      GROUP BY device_id, device_name, device_type
      ORDER BY total_containers DESC;
    `;
    
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ==================== ENDPOINTS DE CONTAINERS WHITE LIST ====================

// ✨ NUEVO: Obtener todos los registros de la white list
app.get('/api/containers-wl/all', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    
    const query = `
      SELECT * FROM containers_white_list
      ORDER BY created_at DESC
      LIMIT $1;
    `;
    
    const result = await pool.query(query, [limit]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo containers white list:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ✨ NUEVO: Obtener un registro específico por ID
app.get('/api/containers-wl/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT * FROM containers_white_list
      WHERE id = $1;
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Registro no encontrado' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error obteniendo registro:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ✨ NUEVO: Filtrar por device_name
app.get('/api/containers-wl/filter/device-name', async (req, res) => {
  try {
    const { device_name } = req.query;
    
    if (!device_name) {
      return res.status(400).json({ error: 'El parámetro device_name es requerido' });
    }
    
    const query = `
      SELECT * FROM containers_white_list
      WHERE device_name ILIKE $1
      ORDER BY created_at DESC;
    `;
    
    const result = await pool.query(query, [`%${device_name}%`]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error filtrando por device_name:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ✨ NUEVO: Crear un nuevo registro en la white list
app.post('/api/containers-wl', async (req, res) => {
  try {
    const { iso_code, device_id, device_name, device_type } = req.body;
    
    // Validar campo requerido
    if (!iso_code) {
      return res.status(400).json({ 
        error: 'El campo iso_code es requerido' 
      });
    }
    
    console.log(`📝 Nuevo registro en white list: ${iso_code} | Device: ${device_name || 'N/A'}`);
    
    const query = `
      INSERT INTO containers_white_list 
      (iso_code, device_id, device_name, device_type)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    
    const values = [
      iso_code,
      device_id || null,
      device_name || null,
      device_type || 'jetson'
    ];
    
    const result = await pool.query(query, values);
    console.log(`✅ Registro guardado con ID: ${result.rows[0].id}`);
    
    res.status(201).json({
      success: true,
      message: 'Registro creado exitosamente',
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('❌ Error creando registro:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      message: error.message 
    });
  }
});

// ✨ NUEVO: Actualizar un registro existente
app.put('/api/containers-wl/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { iso_code, device_id, device_name, device_type } = req.body;
    
    // Validar campo requerido
    if (!iso_code) {
      return res.status(400).json({ 
        error: 'El campo iso_code es requerido' 
      });
    }
    
    console.log(`✏️ Actualizando registro ${id}: ${iso_code}`);
    
    const query = `
      UPDATE containers_white_list 
      SET iso_code = $1, 
          device_id = $2, 
          device_name = $3, 
          device_type = $4
      WHERE id = $5
      RETURNING *;
    `;
    
    const values = [
      iso_code,
      device_id || null,
      device_name || null,
      device_type || 'jetson',
      id
    ];
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Registro no encontrado' });
    }
    
    console.log(`✅ Registro ${id} actualizado exitosamente`);
    
    res.json({
      success: true,
      message: 'Registro actualizado exitosamente',
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('❌ Error actualizando registro:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      message: error.message 
    });
  }
});

// ✨ NUEVO: Eliminar un registro
app.delete('/api/containers-wl/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🗑️ Eliminando registro ${id}`);
    
    const query = `
      DELETE FROM containers_white_list
      WHERE id = $1
      RETURNING *;
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Registro no encontrado' });
    }
    
    console.log(`✅ Registro ${id} eliminado exitosamente`);
    
    res.json({
      success: true,
      message: 'Registro eliminado exitosamente',
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('❌ Error eliminando registro:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      message: error.message 
    });
  }
});

// ==================== HEALTH CHECK ====================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ==================== INICIALIZACIÓN ====================

// Inicializar servidores
const HTTP_PORT = process.env.HTTP_PORT || 3001;
const UDP_PORT = process.env.UDP_PORT || 6001;

// Crear servidor HTTP para Socket.IO
const server = require('http').createServer(app);

// Inicializar servidor de señalización WebRTC
const io = setupWebRTCSignaling(server);

async function start() {
  try {
    // Verificar conexión a BD
    await pool.query('SELECT NOW()');
    console.log('✅ Conectado a PostgreSQL');
    
    // Crear tablas
    await createTable();
    await createContainersTable();
    await createContainersWhiteListTable(); // ✨ NUEVA TABLA
    
    // Iniciar servidor UDP
    udpServer.bind(UDP_PORT);
    
    // Iniciar servidor HTTP con Socket.IO
    server.listen(HTTP_PORT, '0.0.0.0', () => {
      console.log(`\n${'='.repeat(70)}`);
      console.log(`🚀 JULS TRACKING SYSTEM - SERVER RUNNING`);
      console.log(`${'='.repeat(70)}`);
      console.log(`📍 GPS UDP Server: 0.0.0.0:${UDP_PORT}`);
      console.log(`🌐 HTTP API Server: 0.0.0.0:${HTTP_PORT}`);
      console.log(`✨ WebRTC Signaling: Active on port ${HTTP_PORT}`);
      console.log(`${'='.repeat(70)}`);
      console.log(`\n📋 Available Endpoints:`);
      console.log(`\n  🗺️  Location API:`);
      console.log(`    GET  /api/health`);
      console.log(`    GET  /api/devices/all`);
      console.log(`    GET  /api/devices/latest-locations`);
      console.log(`    GET  /api/location/device/:deviceId/latest`);
      console.log(`    GET  /api/location/device/:deviceId/history`);
      console.log(`    GET  /api/location/latest`);
      console.log(`    GET  /api/location/all`);
      console.log(`    GET  /api/location/range`);
      console.log(`    GET  /api/location/area (✨ with date range support)`);
      console.log(`\n  📦 Containers API:`);
      console.log(`    POST /api/containers`);
      console.log(`    GET  /api/containers/all`);
      console.log(`    GET  /api/containers/latest`);
      console.log(`    GET  /api/containers/iso/:isoCode`);
      console.log(`    GET  /api/containers/device/:deviceId`);
      console.log(`    GET  /api/containers/stats/by-device`);
      console.log(`\n  ✅ Containers White List API (✨ NEW):`);
      console.log(`    GET    /api/containers-wl/all`);
      console.log(`    GET    /api/containers-wl/:id`);
      console.log(`    GET    /api/containers-wl/filter/device-name?device_name=xxx`);
      console.log(`    POST   /api/containers-wl`);
      console.log(`    PUT    /api/containers-wl/:id`);
      console.log(`    DELETE /api/containers-wl/:id`);
      console.log(`\n  🔌 WebSocket:`);
      console.log(`    WS   /socket.io - WebRTC Signaling`);
      console.log(`${'='.repeat(70)}\n`);
    });
    
  } catch (error) {
    console.error('❌ Error iniciando servidor:', error);
    process.exit(1);
  }
}

start();