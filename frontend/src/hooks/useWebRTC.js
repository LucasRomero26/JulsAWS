import { useState, useEffect, useCallback } from 'react';
import webrtcService from '../services/webrtcService';

export const useWebRTC = () => {
  const [devices, setDevices] = useState([]);
  const [selectedDevices, setSelectedDevices] = useState(new Set());
  const [streams, setStreams] = useState({});
  const [connectionStates, setConnectionStates] = useState({});
  const [error, setError] = useState(null);
  const [connectingDevices, setConnectingDevices] = useState(new Set());
  const [globalConnectionState, setGlobalConnectionState] = useState('disconnected');

  useEffect(() => {
    console.log('🎬 Initializing WebRTC hook...');

    // Callback cuando se actualiza la lista de dispositivos disponibles
    webrtcService.onDeviceListUpdated = (deviceList) => {
      console.log('📡 Device list updated:', deviceList);
      setDevices(deviceList);
      
      // Limpiar dispositivos seleccionados que ya no están disponibles
      setSelectedDevices(prev => {
        const newSelected = new Set();
        for (const deviceId of prev) {
          if (deviceList.includes(deviceId)) {
            newSelected.add(deviceId);
          } else {
            console.log('🔴 Device no longer available:', deviceId);
            // Limpiar también el stream y estado de conexión
            setStreams(prevStreams => {
              const newStreams = { ...prevStreams };
              delete newStreams[deviceId];
              return newStreams;
            });
            setConnectionStates(prevStates => {
              const newStates = { ...prevStates };
              delete newStates[deviceId];
              return newStates;
            });
            setConnectingDevices(prevConnecting => {
              const newConnecting = new Set(prevConnecting);
              newConnecting.delete(deviceId);
              return newConnecting;
            });
          }
        }
        return newSelected;
      });
    };

    // Callback cuando se recibe un stream de video
    webrtcService.onStreamReceived = (remoteStream, deviceId) => {
      console.log('🎥 Stream received for device:', deviceId);
      setStreams(prev => {
        const newStreams = { ...prev, [deviceId]: remoteStream };
        console.log('📊 Active streams:', Object.keys(newStreams));
        return newStreams;
      });
      
      // Quitar de la lista de dispositivos conectándose
      setConnectingDevices(prev => {
        const newSet = new Set(prev);
        newSet.delete(deviceId);
        return newSet;
      });
    };

    // Callback cuando cambia el estado de conexión
    webrtcService.onConnectionStateChanged = (state, deviceId) => {
      console.log(`🔄 Connection state changed for ${deviceId || 'global'}:`, state);
      
      if (deviceId === null) {
        // Estado de conexión global (servidor de señalización)
        setGlobalConnectionState(state);
        
        if (state === 'disconnected') {
          console.log('❌ Disconnected from signaling server');
          // Limpiar todos los estados cuando se pierde la conexión al servidor
          setSelectedDevices(new Set());
          setStreams({});
          setConnectionStates({});
          setConnectingDevices(new Set());
        }
      } else {
        // Estado de conexión específico de un dispositivo
        setConnectionStates(prev => {
          const newStates = { ...prev, [deviceId]: state };
          console.log('📊 Connection states:', newStates);
          return newStates;
        });
        
        // Manejar estados de fallo o desconexión
        if (state === 'failed' || state === 'disconnected' || state === 'closed') {
          console.log(`🔴 Connection ${state} for device:`, deviceId);
          
          // Remover de dispositivos conectándose
          setConnectingDevices(prev => {
            const newSet = new Set(prev);
            newSet.delete(deviceId);
            return newSet;
          });
          
          // Remover de dispositivos seleccionados
          setSelectedDevices(prev => {
            const newSet = new Set(prev);
            newSet.delete(deviceId);
            return newSet;
          });
          
          // Limpiar el stream
          setStreams(prev => {
            const newStreams = { ...prev };
            delete newStreams[deviceId];
            return newStreams;
          });
          
          // Si el estado es 'failed', mostrar error
          if (state === 'failed') {
            setError(`Connection failed for device ${deviceId}`);
            // Limpiar el error después de 5 segundos
            setTimeout(() => setError(null), 5000);
          }
        }
      }
    };

    // Callback cuando ocurre un error
    webrtcService.onError = (errorMessage) => {
      console.error('❌ WebRTC error:', errorMessage);
      setError(errorMessage);
      
      // Limpiar el error después de 5 segundos
      setTimeout(() => setError(null), 5000);
    };

    // Conectar al servicio de señalización
    webrtcService.connect();

    // Cleanup al desmontar el componente
    return () => {
      console.log('🔌 Cleaning up WebRTC hook...');
      webrtcService.disconnect();
    };
  }, []);

  // Función para conectar a un dispositivo
  const connectToDevice = useCallback(async (deviceId) => {
    try {
      console.log('🎬 Connecting to device:', deviceId);
      
      // Verificar si ya está conectado o conectándose
      if (selectedDevices.has(deviceId)) {
        console.log('⚠️ Device already selected:', deviceId);
        return;
      }
      
      if (connectingDevices.has(deviceId)) {
        console.log('⚠️ Device already connecting:', deviceId);
        return;
      }
      
      // Limpiar errores previos
      setError(null);
      
      // Agregar a dispositivos conectándose
      setConnectingDevices(prev => new Set(prev).add(deviceId));
      
      // Agregar a dispositivos seleccionados
      setSelectedDevices(prev => new Set(prev).add(deviceId));
      
      // Solicitar el stream
      await webrtcService.requestStream(deviceId);
      
      console.log('✅ Connection request sent for device:', deviceId);
      
    } catch (err) {
      console.error('❌ Error connecting to device:', deviceId, err);
      setError(`Failed to connect to ${deviceId}: ${err.message}`);
      
      // Limpiar estados en caso de error
      setConnectingDevices(prev => {
        const newSet = new Set(prev);
        newSet.delete(deviceId);
        return newSet;
      });
      
      setSelectedDevices(prev => {
        const newSet = new Set(prev);
        newSet.delete(deviceId);
        return newSet;
      });
      
      // Limpiar el error después de 5 segundos
      setTimeout(() => setError(null), 5000);
    }
  }, [selectedDevices, connectingDevices]);

  // Función para desconectar de un dispositivo
  const disconnectStream = useCallback((deviceId) => {
    console.log('🛑 Disconnecting from device:', deviceId);
    
    // Detener el stream en el servicio
    webrtcService.stopStream(deviceId);
    
    // Remover de dispositivos seleccionados
    setSelectedDevices(prev => {
      const newSet = new Set(prev);
      newSet.delete(deviceId);
      return newSet;
    });
    
    // Remover de dispositivos conectándose
    setConnectingDevices(prev => {
      const newSet = new Set(prev);
      newSet.delete(deviceId);
      return newSet;
    });
    
    // Limpiar el stream
    setStreams(prev => {
      const newStreams = { ...prev };
      delete newStreams[deviceId];
      return newStreams;
    });
    
    // Limpiar el estado de conexión
    setConnectionStates(prev => {
      const newStates = { ...prev };
      delete newStates[deviceId];
      return newStates;
    });
    
    console.log('✅ Disconnected from device:', deviceId);
  }, []);

  // Función para desconectar todos los dispositivos
  const disconnectAll = useCallback(() => {
    console.log('🛑 Disconnecting all devices...');
    
    selectedDevices.forEach(deviceId => {
      webrtcService.stopStream(deviceId);
    });
    
    setSelectedDevices(new Set());
    setConnectingDevices(new Set());
    setStreams({});
    setConnectionStates({});
    
    console.log('✅ All devices disconnected');
  }, [selectedDevices]);

  // Función para alternar conexión (conectar/desconectar)
  const toggleDevice = useCallback((deviceId) => {
    if (selectedDevices.has(deviceId)) {
      disconnectStream(deviceId);
    } else {
      connectToDevice(deviceId);
    }
  }, [selectedDevices, connectToDevice, disconnectStream]);

  // Función auxiliar para verificar si un dispositivo está activo
  const isDeviceActive = useCallback((deviceId) => {
    return selectedDevices.has(deviceId) && streams[deviceId] != null;
  }, [selectedDevices, streams]);

  // Función auxiliar para verificar si un dispositivo está conectándose
  const isDeviceConnecting = useCallback((deviceId) => {
    return connectingDevices.has(deviceId);
  }, [connectingDevices]);

  // Función auxiliar para obtener el estado de conexión de un dispositivo
  const getDeviceConnectionState = useCallback((deviceId) => {
    return connectionStates[deviceId] || 'disconnected';
  }, [connectionStates]);

  // Función para obtener estadísticas de debug
  const getDebugInfo = useCallback(() => {
    return {
      devices,
      selectedDevices: Array.from(selectedDevices),
      connectingDevices: Array.from(connectingDevices),
      activeStreams: Object.keys(streams),
      connectionStates,
      globalConnectionState,
      serviceDebugInfo: webrtcService.getDebugInfo()
    };
  }, [devices, selectedDevices, connectingDevices, streams, connectionStates, globalConnectionState]);

  return {
    // Estados
    devices,                    // Array de dispositivos disponibles
    selectedDevices,            // Set de dispositivos seleccionados
    streams,                    // Objeto con streams por deviceId
    connectionStates,           // Objeto con estados de conexión por deviceId
    error,                      // Mensaje de error actual
    connectingDevices,          // Set de dispositivos conectándose
    globalConnectionState,      // Estado de conexión global al servidor
    
    // Funciones
    connectToDevice,            // Conectar a un dispositivo específico
    disconnectStream,           // Desconectar de un dispositivo específico
    disconnectAll,              // Desconectar todos los dispositivos
    toggleDevice,               // Alternar conexión de un dispositivo
    
    // Funciones auxiliares
    isDeviceActive,             // Verificar si un dispositivo está activo
    isDeviceConnecting,         // Verificar si un dispositivo está conectándose
    getDeviceConnectionState,   // Obtener estado de conexión de un dispositivo
    getDebugInfo                // Obtener información de debug
  };
};