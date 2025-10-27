import { useState, useEffect, useCallback } from 'react';
import webrtcService from '../services/webrtcService';

export const useWebRTC = () => {
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [stream, setStream] = useState(null);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [error, setError] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    webrtcService.onDeviceListUpdated = (deviceList) => {
      setDevices(deviceList);
    };

    webrtcService.onStreamReceived = (remoteStream) => {
      setStream(remoteStream);
      setIsConnecting(false);
    };

    webrtcService.onConnectionStateChanged = (state) => {
      setConnectionState(state);
      if (state === 'failed' || state === 'disconnected') {
        setIsConnecting(false);
        setStream(null);
      }
    };

    webrtcService.onError = (errorMessage) => {
      setError(errorMessage);
      setIsConnecting(false);
    };

    webrtcService.connect();

    return () => {
      webrtcService.disconnect();
    };
  }, []);

  const connectToDevice = useCallback(async (deviceId) => {
    try {
      setError(null);
      setIsConnecting(true);
      setSelectedDevice(deviceId);
      await webrtcService.requestStream(deviceId);
    } catch (err) {
      setError(err.message);
      setIsConnecting(false);
    }
  }, []);

  const disconnectStream = useCallback(() => {
    webrtcService.stopStream();
    setSelectedDevice(null);
    setStream(null);
    setIsConnecting(false);
  }, []);

  return {
    devices,
    selectedDevice,
    stream,
    connectionState,
    error,
    isConnecting,
    connectToDevice,
    disconnectStream
  };
};