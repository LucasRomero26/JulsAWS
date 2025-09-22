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

// Crear tabla si no existe
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
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  
  try {
    await pool.query(query);
    console.log('Tabla location_data verificada/creada');
  } catch (error) {
    console.error('Error creando tabla:', error);
  }
}

// Servidor UDP
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
    
    // Insertar en la base de datos
    const query = `
      INSERT INTO location_data 
      (latitude, longitude, timestamp_value, accuracy, altitude, speed, provider)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    
    const values = [
      data.lat,
      data.lon,
      data.time,
      data.acc || null,
      data.alt || null,
      data.spd || null,
      data.prov || null
    ];
    
    const result = await pool.query(query, values);
    console.log('Datos insertados:', result.rows[0].id);
    
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

// Endpoint para obtener el último registro
app.get('/api/location/latest', async (req, res) => {
  try {
    const query = `
      SELECT latitude, longitude, timestamp_value, created_at
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

// Endpoint para obtener todos los registros (opcional)
app.get('/api/location/all', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const query = `
      SELECT * FROM location_data
      ORDER BY id DESC
      LIMIT $1;
    `;
    
    const result = await pool.query(query, [limit]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo registros:', error);
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
    });
    
  } catch (error) {
    console.error('Error iniciando servidor:', error);
    process.exit(1);
  }
}

start();