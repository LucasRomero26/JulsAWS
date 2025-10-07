const dgram = require('dgram');
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

// Database configuration
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

// Create/update table if it doesn't exist
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
    
    -- Create indexes to optimize queries
    CREATE INDEX IF NOT EXISTS idx_location_device_id ON location_data(device_id);
    CREATE INDEX IF NOT EXISTS idx_location_device_timestamp ON location_data(device_id, timestamp_value DESC);
    CREATE INDEX IF NOT EXISTS idx_location_timestamp ON location_data(timestamp_value DESC);
  `;
  
  try {
    await pool.query(query);
    console.log('Table location_data verified/created with support for multiple devices');
  } catch (error) {
    console.error('Error creating table:', error);
  }
}

// UDP Server updated to handle device_id
const udpServer = dgram.createSocket('udp4');

udpServer.on('error', (err) => {
  console.error('UDP Server error:', err);
  udpServer.close();
});

udpServer.on('message', async (msg, rinfo) => {
  console.log(`UDP message received from ${rinfo.address}:${rinfo.port}`);
  
  try {
    // Parse the JSON message
    const data = JSON.parse(msg.toString());
    console.log('Received data:', JSON.stringify(data, null, 2));
    
    // Insert into the database WITH DEVICE FIELDS
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
    console.log(`Data inserted for device ${data.device_id || 'unknown'}:`, result.rows[0].id);
    
  } catch (error) {
    console.error('Error processing UDP message:', error);
  }
});

udpServer.on('listening', () => {
  const address = udpServer.address();
  console.log(`UDP Server listening on ${address.address}:${address.port}`);
});

// HTTP/API REST Server
const app = express();
app.use(cors());
app.use(express.json());

// Endpoint to get the last record (updated to include device info)
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
      return res.status(404).json({ message: 'No data available' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error getting last record:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// NEW: Endpoint to get all active devices
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
    console.error('Error getting devices:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// NEW: Endpoint to get the last location of each device
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
    console.error('Error getting latest locations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// NEW: Endpoint to get the last record of a specific device
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
      return res.status(404).json({ message: 'No data available for this device' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error getting last record of the device:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// NEW: Endpoint to get the history of a specific device
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
    
    // Add date filters if provided
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
    console.error('Error getting device history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to get all records (updated)
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
    console.error('Error getting records:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to get records by date range (updated)
app.get('/api/location/range', async (req, res) => {
  const { startDate, endDate, deviceId } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({ message: 'The startDate and endDate parameters are required' });
  }

  try {
    // Timestamps come in ISO 8601 format, we convert them to milliseconds
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
    console.error('Error getting records by range:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- NEW ENDPOINT FOR AREA SEARCH ---
app.post('/api/location/area', async (req, res) => {
    const { center, radius, deviceIds } = req.body;

    if (!center || !radius || !deviceIds || !Array.isArray(deviceIds)) {
        return res.status(400).json({ message: 'Parameters center, radius, and deviceIds (array) are required' });
    }
    if (deviceIds.length === 0) {
        return res.json({}); // Return empty object if no devices are selected
    }

    try {
        // SQL query that calculates the distance on a plane. It's a good approximation for small distances.
        // Earth radius in kilometers = 6371
        const query = `
            SELECT 
                device_id, latitude, longitude, timestamp_value 
            FROM 
                location_data
            WHERE
                device_id = ANY($1) AND
                (
                    6371 * 2 * ASIN(
                        SQRT(
                            POWER(SIN(RADIANS(latitude - $2) / 2), 2) +
                            COS(RADIANS($2)) * COS(RADIANS(latitude)) *
                            POWER(SIN(RADIANS(longitude - $3) / 2), 2)
                        )
                    )
                ) <= $4
            ORDER BY 
                device_id, timestamp_value ASC;
        `;

        const values = [deviceIds, center.lat, center.lng, radius / 1000]; // Radius is converted from meters to km

        const result = await pool.query(query, values);
        
        // Group results by device_id
        const pathsByDevice = result.rows.reduce((acc, row) => {
            const { device_id, latitude, longitude } = row;
            if (!acc[device_id]) {
                acc[device_id] = [];
            }
            acc[device_id].push([parseFloat(latitude), parseFloat(longitude)]);
            return acc;
        }, {});

        res.json(pathsByDevice);

    } catch (error) {
        console.error('Error getting records by area:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Initialize servers
const HTTP_PORT = process.env.HTTP_PORT || 3001;
const UDP_PORT = process.env.UDP_PORT || 6001;

async function start() {
  try {
    // Verify DB connection
    await pool.query('SELECT NOW()');
    console.log('Connected to PostgreSQL');
    
    // Create table
    await createTable();
    
    // Start UDP server
    udpServer.bind(UDP_PORT);
    
    // Start HTTP server
    app.listen(HTTP_PORT, '0.0.0.0', () => {
      console.log(`HTTP API listening on port ${HTTP_PORT}`);
      console.log('New endpoints available:');
      console.log('  GET /api/devices/all - List all devices');
      console.log('  GET /api/devices/latest-locations - Latest locations of each device');
      console.log('  GET /api/location/device/:deviceId/latest - Last location of a device');
      console.log('  GET /api/location/device/:deviceId/history - History of a device');
      console.log('  POST /api/location/area - History of devices within a geographic area');
    });
    
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

start();