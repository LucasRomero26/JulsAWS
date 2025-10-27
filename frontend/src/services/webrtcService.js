import { io } from 'socket.io-client';

class WebRTCService {
  constructor() {
    this.socket = null;
    this.peerConnection = null;
    this.remoteStream = new MediaStream();
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
    this.currentDeviceId = null;
  }

  connect(serverUrl = 'https://julstracker.app') {
    console.log('Connecting to signaling server:', serverUrl);

    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      secure: true,
      reconnection: true
    });

    this.setupSocketListeners();
  }

  setupSocketListeners() {
    this.socket.on('connect', () => {
      console.log('✅ Connected to signaling server');
      this.isConnected = true;
      
      const viewerId = `viewer_${Date.now()}`;
      this.socket.emit('register-viewer', { viewerId });
      
      if (this.onConnectionStateChanged) {
        this.onConnectionStateChanged('connected');
      }
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      if (this.onConnectionStateChanged) {
        this.onConnectionStateChanged('disconnected');
      }
    });

    this.socket.on('available-broadcasters', (devices) => {
      this.availableDevices = devices;
      if (this.onDeviceListUpdated) {
        this.onDeviceListUpdated(devices);
      }
    });

    this.socket.on('broadcaster-available', (data) => {
      if (!this.availableDevices.includes(data.deviceId)) {
        this.availableDevices.push(data.deviceId);
        if (this.onDeviceListUpdated) {
          this.onDeviceListUpdated(this.availableDevices);
        }
      }
    });

    this.socket.on('broadcaster-disconnected', (data) => {
      this.availableDevices = this.availableDevices.filter(
        id => id !== data.deviceId
      );
      if (this.onDeviceListUpdated) {
        this.onDeviceListUpdated(this.availableDevices);
      }
      if (this.currentDeviceId === data.deviceId) {
        this.stopStream();
      }
    });

    this.socket.on('offer', async (data) => {
      await this.handleOffer(data);
    });

    this.socket.on('ice-candidate', async (data) => {
      await this.handleIceCandidate(data);
    });
  }

  async requestStream(deviceId) {
    if (!this.socket || !this.isConnected) {
      throw new Error('Not connected to signaling server');
    }

    this.currentDeviceId = deviceId;
    this.createPeerConnection();
    this.socket.emit('request-stream', { deviceId });

    if (this.onConnectionStateChanged) {
      this.onConnectionStateChanged('requesting');
    }
  }

  createPeerConnection() {
    this.peerConnection = new RTCPeerConnection(this.configuration);

    this.peerConnection.ontrack = (event) => {
      event.streams[0].getTracks().forEach(track => {
        this.remoteStream.addTrack(track);
      });

      if (this.onStreamReceived) {
        this.onStreamReceived(this.remoteStream);
      }

      if (this.onConnectionStateChanged) {
        this.onConnectionStateChanged('streaming');
      }
    };

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('ice-candidate', {
          target: this.currentBroadcasterId,
          candidate: {
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            sdpMid: event.candidate.sdpMid,
            candidate: event.candidate.candidate
          }
        });
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      if (this.onConnectionStateChanged) {
        this.onConnectionStateChanged(this.peerConnection.connectionState);
      }

      if (this.peerConnection.connectionState === 'failed') {
        this.stopStream();
      }
    };
  }

  async handleOffer(data) {
    try {
      this.currentBroadcasterId = data.sender;

      const offer = new RTCSessionDescription({
        type: 'offer',
        sdp: data.sdp.sdp
      });

      await this.peerConnection.setRemoteDescription(offer);
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      this.socket.emit('answer', {
        target: data.sender,
        sdp: {
          type: answer.type,
          sdp: answer.sdp
        }
      });
    } catch (error) {
      console.error('Error handling offer:', error);
      if (this.onError) {
        this.onError(`Error handling offer: ${error.message}`);
      }
    }
  }

  async handleIceCandidate(data) {
    try {
      const candidate = new RTCIceCandidate({
        sdpMLineIndex: data.candidate.sdpMLineIndex,
        sdpMid: data.candidate.sdpMid,
        candidate: data.candidate.candidate
      });

      await this.peerConnection.addIceCandidate(candidate);
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  }

  stopStream() {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.remoteStream.getTracks().forEach(track => track.stop());
    this.remoteStream = new MediaStream();

    this.currentDeviceId = null;
    this.currentBroadcasterId = null;

    if (this.onConnectionStateChanged) {
      this.onConnectionStateChanged('disconnected');
    }
  }

  disconnect() {
    this.stopStream();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
  }
}

export default new WebRTCService();