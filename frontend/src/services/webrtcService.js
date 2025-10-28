import { io } from 'socket.io-client';

class WebRTCService {
  constructor() {
    this.socket = null;
    this.peerConnections = new Map(); // Mapa de conexiones: deviceId -> { peerConnection, remoteStream, broadcasterId }
    this.remoteStreams = new Map();   // Mapa de streams: deviceId -> MediaStream
    this.isConnected = false;
    
    this.onStreamReceived = null;
    this.onDeviceListUpdated = null;
    this.onConnectionStateChanged = null;
    this.onError = null;

    this.configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };

    this.availableDevices = [];
    this.pendingRequests = new Map(); // Para rastrear solicitudes pendientes
  }

  connect(serverUrl = 'https://julstracker.app') {
    console.log('Connecting to signaling server:', serverUrl);

    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      secure: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    this.setupSocketListeners();
  }

  setupSocketListeners() {
    this.socket.on('connect', () => {
      console.log('✅ Connected to signaling server');
      this.isConnected = true;
      
      const viewerId = `viewer_${Date.now()}`;
      this.socket.viewerId = viewerId;
      this.socket.emit('register-viewer', { viewerId });
      
      if (this.onConnectionStateChanged) {
        this.onConnectionStateChanged('connected', null);
      }
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Disconnected from signaling server');
      this.isConnected = false;
      if (this.onConnectionStateChanged) {
        this.onConnectionStateChanged('disconnected', null);
      }
    });

    this.socket.on('available-broadcasters', (devices) => {
      console.log('📡 Available broadcasters:', devices);
      this.availableDevices = devices;
      if (this.onDeviceListUpdated) {
        this.onDeviceListUpdated(devices);
      }
    });

    this.socket.on('broadcaster-available', (data) => {
      console.log('🟢 New broadcaster available:', data.deviceId);
      if (!this.availableDevices.includes(data.deviceId)) {
        this.availableDevices.push(data.deviceId);
        if (this.onDeviceListUpdated) {
          this.onDeviceListUpdated(this.availableDevices);
        }
      }
    });

    this.socket.on('broadcaster-disconnected', (data) => {
      console.log('🔴 Broadcaster disconnected:', data.deviceId);
      this.availableDevices = this.availableDevices.filter(
        id => id !== data.deviceId
      );
      if (this.onDeviceListUpdated) {
        this.onDeviceListUpdated(this.availableDevices);
      }
      
      // Limpiar la conexión si existe
      if (this.peerConnections.has(data.deviceId)) {
        this.stopStream(data.deviceId);
      }
    });

    this.socket.on('offer', async (data) => {
      console.log('📨 Received offer from:', data.sender);
      await this.handleOffer(data);
    });

    this.socket.on('ice-candidate', async (data) => {
      console.log('🧊 Received ICE candidate from:', data.sender);
      await this.handleIceCandidate(data);
    });

    this.socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
      if (this.onError) {
        this.onError(error.message || 'Socket error occurred');
      }
    });
  }

  async requestStream(deviceId) {
    if (!this.socket || !this.isConnected) {
      throw new Error('Not connected to signaling server');
    }

    // Verificar si ya existe una conexión para este dispositivo
    if (this.peerConnections.has(deviceId)) {
      console.log('⚠️ Connection already exists for device:', deviceId);
      return;
    }

    console.log('🎬 Requesting stream from device:', deviceId);
    
    // Crear la conexión peer antes de solicitar
    this.createPeerConnection(deviceId);
    
    // Marcar como solicitud pendiente
    this.pendingRequests.set(deviceId, Date.now());
    
    // Emitir solicitud al servidor
    this.socket.emit('request-stream', { deviceId });

    if (this.onConnectionStateChanged) {
      this.onConnectionStateChanged('requesting', deviceId);
    }
  }

  createPeerConnection(deviceId) {
    console.log('🔧 Creating peer connection for device:', deviceId);
    
    // Crear nueva conexión RTCPeerConnection
    const peerConnection = new RTCPeerConnection(this.configuration);
    const remoteStream = new MediaStream();

    // Manejar tracks recibidos
    peerConnection.ontrack = (event) => {
      console.log('🎥 Received track for device:', deviceId, event.track.kind);
      
      event.streams[0].getTracks().forEach(track => {
        if (!remoteStream.getTracks().find(t => t.id === track.id)) {
          remoteStream.addTrack(track);
        }
      });

      // Guardar el stream
      this.remoteStreams.set(deviceId, remoteStream);

      // Notificar que se recibió el stream
      if (this.onStreamReceived) {
        this.onStreamReceived(remoteStream, deviceId);
      }

      if (this.onConnectionStateChanged) {
        this.onConnectionStateChanged('streaming', deviceId);
      }

      // Limpiar solicitud pendiente
      this.pendingRequests.delete(deviceId);
    };

    // Manejar candidatos ICE
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        const connectionData = this.peerConnections.get(deviceId);
        if (connectionData && connectionData.broadcasterId) {
          console.log('🧊 Sending ICE candidate for device:', deviceId);
          this.socket.emit('ice-candidate', {
            target: connectionData.broadcasterId,
            candidate: {
              sdpMLineIndex: event.candidate.sdpMLineIndex,
              sdpMid: event.candidate.sdpMid,
              candidate: event.candidate.candidate
            }
          });
        }
      }
    };

    // Manejar cambios en el estado de la conexión
    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection.connectionState;
      console.log(`🔄 Connection state changed for ${deviceId}:`, state);
      
      if (this.onConnectionStateChanged) {
        this.onConnectionStateChanged(state, deviceId);
      }

      if (state === 'failed' || state === 'closed') {
        console.log(`❌ Connection ${state} for device:`, deviceId);
        this.stopStream(deviceId);
      }
    };

    // Manejar estado de recolección ICE
    peerConnection.oniceconnectionstatechange = () => {
      console.log(`❄️ ICE connection state for ${deviceId}:`, peerConnection.iceConnectionState);
      
      if (peerConnection.iceConnectionState === 'failed') {
        console.log('❌ ICE connection failed for device:', deviceId);
        this.stopStream(deviceId);
      }
    };

    // Guardar la conexión
    this.peerConnections.set(deviceId, {
      peerConnection,
      remoteStream,
      broadcasterId: null,
      createdAt: Date.now()
    });

    console.log('✅ Peer connection created for device:', deviceId);
  }

  async handleOffer(data) {
    try {
      console.log('📥 Handling offer from sender:', data.sender);
      
      // Encontrar el deviceId asociado a esta solicitud pendiente
      let deviceId = null;
      
      // Primero intentar encontrar por broadcasterId existente
      for (const [id, connectionData] of this.peerConnections.entries()) {
        if (connectionData.broadcasterId === data.sender) {
          deviceId = id;
          break;
        }
      }
      
      // Si no se encuentra, buscar la solicitud pendiente más reciente
      if (!deviceId && this.pendingRequests.size > 0) {
        const sortedRequests = Array.from(this.pendingRequests.entries())
          .sort((a, b) => b[1] - a[1]);
        deviceId = sortedRequests[0][0];
        console.log('📍 Associating offer with pending request for device:', deviceId);
      }

      if (!deviceId) {
        console.error('❌ No device found for offer from:', data.sender);
        return;
      }

      const connectionData = this.peerConnections.get(deviceId);
      if (!connectionData) {
        console.error('❌ No peer connection found for device:', deviceId);
        return;
      }

      // Asociar el broadcasterId
      connectionData.broadcasterId = data.sender;
      console.log(`✅ Associated device ${deviceId} with broadcaster ${data.sender}`);

      const peerConnection = connectionData.peerConnection;

      // Configurar la descripción remota
      const offer = new RTCSessionDescription({
        type: 'offer',
        sdp: data.sdp.sdp
      });

      await peerConnection.setRemoteDescription(offer);
      console.log('✅ Remote description set for device:', deviceId);

      // Crear y enviar la respuesta
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      console.log('✅ Local description set for device:', deviceId);

      this.socket.emit('answer', {
        target: data.sender,
        sdp: {
          type: answer.type,
          sdp: answer.sdp
        }
      });
      console.log('📤 Answer sent to broadcaster:', data.sender);

    } catch (error) {
      console.error('❌ Error handling offer:', error);
      if (this.onError) {
        this.onError(`Error handling offer: ${error.message}`);
      }
    }
  }

  async handleIceCandidate(data) {
    try {
      // Encontrar el deviceId por broadcasterId
      let deviceId = null;
      for (const [id, connectionData] of this.peerConnections.entries()) {
        if (connectionData.broadcasterId === data.sender) {
          deviceId = id;
          break;
        }
      }

      if (!deviceId) {
        console.warn('⚠️ No device found for ICE candidate from:', data.sender);
        return;
      }

      const connectionData = this.peerConnections.get(deviceId);
      if (!connectionData) {
        console.warn('⚠️ No connection data for device:', deviceId);
        return;
      }

      const candidate = new RTCIceCandidate({
        sdpMLineIndex: data.candidate.sdpMLineIndex,
        sdpMid: data.candidate.sdpMid,
        candidate: data.candidate.candidate
      });

      await connectionData.peerConnection.addIceCandidate(candidate);
      console.log('✅ ICE candidate added for device:', deviceId);
      
    } catch (error) {
      console.error('❌ Error adding ICE candidate:', error);
      // No lanzar error aquí, los candidatos ICE pueden fallar sin afectar la conexión
    }
  }

  stopStream(deviceId) {
    console.log('🛑 Stopping stream for device:', deviceId);
    
    const connectionData = this.peerConnections.get(deviceId);
    if (!connectionData) {
      console.log('⚠️ No connection to stop for device:', deviceId);
      return;
    }

    // Cerrar la conexión peer
    if (connectionData.peerConnection) {
      connectionData.peerConnection.close();
      console.log('✅ Peer connection closed for device:', deviceId);
    }

    // Detener todos los tracks del stream
    if (connectionData.remoteStream) {
      connectionData.remoteStream.getTracks().forEach(track => {
        track.stop();
        console.log('🛑 Track stopped:', track.kind, 'for device:', deviceId);
      });
    }

    // Limpiar el stream del mapa
    this.remoteStreams.delete(deviceId);
    
    // Eliminar la conexión del mapa
    this.peerConnections.delete(deviceId);
    
    // Limpiar solicitudes pendientes
    this.pendingRequests.delete(deviceId);

    // Notificar el cambio de estado
    if (this.onConnectionStateChanged) {
      this.onConnectionStateChanged('disconnected', deviceId);
    }

    console.log('✅ Stream stopped for device:', deviceId);
  }

  disconnect() {
    console.log('🔌 Disconnecting WebRTC service...');
    
    // Cerrar todas las conexiones activas
    for (const deviceId of this.peerConnections.keys()) {
      this.stopStream(deviceId);
    }
    
    // Limpiar todos los mapas
    this.peerConnections.clear();
    this.remoteStreams.clear();
    this.pendingRequests.clear();
    
    // Desconectar el socket
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.isConnected = false;
    this.availableDevices = [];
    
    console.log('✅ WebRTC service disconnected');
  }

  // Método auxiliar para obtener información de depuración
  getDebugInfo() {
    return {
      isConnected: this.isConnected,
      availableDevices: this.availableDevices,
      activeConnections: Array.from(this.peerConnections.keys()),
      pendingRequests: Array.from(this.pendingRequests.keys()),
      connectionStates: Array.from(this.peerConnections.entries()).map(([id, data]) => ({
        deviceId: id,
        connectionState: data.peerConnection?.connectionState,
        iceConnectionState: data.peerConnection?.iceConnectionState,
        broadcasterId: data.broadcasterId,
        hasStream: this.remoteStreams.has(id)
      }))
    };
  }
}

export default new WebRTCService();