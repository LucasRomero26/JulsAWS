const socketIO = require('socket.io');

/**
 * Servidor de señalización WebRTC para conectar Android con navegadores
 * Consumo estimado: ~5KB por conexión inicial
 */
function setupWebRTCSignaling(server) {
  const io = socketIO(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      methods: ["GET", "POST"]
    },
    // Configuración para minimizar overhead
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Almacenar dispositivos activos
  const activeBroadcasters = new Map(); // deviceId -> socketId
  const activeViewers = new Map();      // viewerId -> { socketId, watchingDevice }

  io.on('connection', (socket) => {
    console.log(`[WebRTC] Client connected: ${socket.id}`);
    
    // ============================================
    // ANDROID: Registrar como broadcaster (emisor de video)
    // ============================================
    socket.on('register-broadcaster', (data) => {
      const { deviceId, deviceName } = data;
      socket.deviceId = deviceId;
      socket.deviceName = deviceName;
      socket.isBroadcaster = true;
      
      activeBroadcasters.set(deviceId, socket.id);
      
      console.log(`[WebRTC] 📹 Broadcaster registered: ${deviceId} (${deviceName})`);
      
      // Notificar a todos los viewers que este dispositivo está disponible
      socket.broadcast.emit('broadcaster-available', {
        deviceId,
        deviceName,
        timestamp: Date.now()
      });
    });
    
    // ============================================
    // NAVEGADOR: Registrar como viewer (receptor de video)
    // ============================================
    socket.on('register-viewer', (data) => {
      const { viewerId } = data;
      socket.viewerId = viewerId;
      socket.isViewer = true;
      
      activeViewers.set(viewerId, {
        socketId: socket.id,
        watchingDevice: null
      });
      
      console.log(`[WebRTC] 🖥️ Viewer registered: ${viewerId}`);
      
      // Enviar lista de broadcasters disponibles
      const availableDevices = Array.from(activeBroadcasters.keys());
      socket.emit('available-broadcasters', availableDevices);
    });
    
    // ============================================
    // NAVEGADOR: Solicitar stream de un dispositivo
    // ============================================
    socket.on('request-stream', (data) => {
      const { deviceId } = data;
      const broadcasterSocketId = activeBroadcasters.get(deviceId);
      
      if (broadcasterSocketId) {
        // Actualizar qué dispositivo está viendo
        const viewer = activeViewers.get(socket.viewerId);
        if (viewer) {
          viewer.watchingDevice = deviceId;
        }
        
        console.log(`[WebRTC] 📡 Viewer ${socket.id} requesting stream from ${deviceId}`);
        
        // Notificar al broadcaster que hay un viewer esperando
        io.to(broadcasterSocketId).emit('viewer-ready', {
          viewerId: socket.id,
          timestamp: Date.now()
        });
      } else {
        socket.emit('error', {
          message: `Device ${deviceId} not available`,
          code: 'BROADCASTER_NOT_FOUND'
        });
      }
    });
    
    // ============================================
    // WebRTC: Intercambio de SDP Offer
    // ============================================
    socket.on('offer', (data) => {
      const { target, sdp } = data;
      console.log(`[WebRTC] 📤 Relaying offer from ${socket.id} to ${target}`);
      
      io.to(target).emit('offer', {
        sdp: sdp,
        sender: socket.id
      });
    });
    
    // ============================================
    // WebRTC: Intercambio de SDP Answer
    // ============================================
    socket.on('answer', (data) => {
      const { target, sdp } = data;
      console.log(`[WebRTC] 📥 Relaying answer from ${socket.id} to ${target}`);
      
      io.to(target).emit('answer', {
        sdp: sdp,
        sender: socket.id
      });
    });
    
    // ============================================
    // WebRTC: Intercambio de ICE Candidates
    // ============================================
    socket.on('ice-candidate', (data) => {
      const { target, candidate } = data;
      
      io.to(target).emit('ice-candidate', {
        candidate: candidate,
        sender: socket.id
      });
    });
    
    // ============================================
    // DESCONEXIÓN
    // ============================================
    socket.on('disconnect', () => {
      console.log(`[WebRTC] Client disconnected: ${socket.id}`);
      
      // Si era un broadcaster
      if (socket.isBroadcaster && socket.deviceId) {
        activeBroadcasters.delete(socket.deviceId);
        
        // Notificar a todos los viewers
        socket.broadcast.emit('broadcaster-disconnected', {
          deviceId: socket.deviceId,
          timestamp: Date.now()
        });
        
        console.log(`[WebRTC] 📹 Broadcaster removed: ${socket.deviceId}`);
      }
      
      // Si era un viewer
      if (socket.isViewer && socket.viewerId) {
        activeViewers.delete(socket.viewerId);
        console.log(`[WebRTC] 🖥️ Viewer removed: ${socket.viewerId}`);
      }
    });
    
    // ============================================
    // DEBUG: Obtener estado actual
    // ============================================
    socket.on('get-status', () => {
      socket.emit('status', {
        broadcasters: Array.from(activeBroadcasters.keys()),
        viewers: activeViewers.size,
        timestamp: Date.now()
      });
    });
  });

  console.log('✅ WebRTC Signaling Server initialized');
  return io;
}

module.exports = { setupWebRTCSignaling };