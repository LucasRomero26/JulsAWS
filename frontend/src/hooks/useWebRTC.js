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
      console.log('📡 Device list updated in hook:', deviceList);
      setDevices(deviceList);
      
      // Limpiar dispositivos seleccionados que ya no están disponibles
      setSelectedDevices(prev => {
        const newSelected = new Set();
        let hasChanges = false;
        
        for (const deviceId of prev) {
          if (deviceList.includes(deviceId)) {
            newSelected.add(deviceId);
          } else {
            console.log('🔴 Device no longer available, cleaning up:', deviceId);
            hasChanges = true;
          }
        }
        
        // Si hubo cambios, limpiar estados relacionados
        if (hasChanges) {
          // Limpiar streams de dispositivos eliminados
          setStreams(prevStreams => {
            const newStreams = { ...prevStreams };
            let streamsChanged = false;
            
            for (const deviceId of Object.keys(newStreams)) {
              if (!deviceList.includes(deviceId)) {
                console.log('🧹 Removing stream for unavailable device:', deviceId);
                delete newStreams[deviceId];
                streamsChanged = true;
              }
            }
            
            return streamsChanged ? newStreams : prevStreams;
          });
          
          // Limpiar estados de conexión de dispositivos eliminados
          setConnectionStates(prevStates => {
            const newStates = { ...prevStates };
            let statesChanged = false;
            
            for (const deviceId of Object.keys(newStates)) {
              if (!deviceList.includes(deviceId)) {
                console.log('🧹 Removing connection state for unavailable device:', deviceId);
                delete newStates[deviceId];
                statesChanged = true;
              }
            }
            
            return statesChanged ? newStates : prevStates;
          });
          
          // Limpiar de dispositivos conectándose
          setConnectingDevices(prevConnecting => {
            const newConnecting = new Set();
            let connectingChanged = false;
            
            for (const deviceId of prevConnecting) {
              if (deviceList.includes(deviceId)) {
                newConnecting.add(deviceId);
              } else {
                console.log('🧹 Removing from connecting devices:', deviceId);
                connectingChanged = true;
              }
            }
            
            return connectingChanged ? newConnecting : prevConnecting;
          });
        }
        
        return hasChanges ? newSelected : prev;
      });
    };

    // Callback cuando se recibe un stream de video
    webrtcService.onStreamReceived = (remoteStream, deviceId) => {
      console.log('🎥 Stream received in hook for device:', deviceId);
      setStreams(prev => {
        const newStreams = { ...prev, [deviceId]: remoteStream };
        console.log('📊 Active streams in hook:', Object.keys(newStreams));
        return newStreams;
      });
      
      // Quitar de la lista de dispositivos conectándose
      setConnectingDevices(prev => {
        const newSet = new Set(prev);
        newSet.delete(deviceId);
        console.log('✅ Removed from connecting devices:', deviceId);
        return newSet;
      });
    };

    // Callback cuando cambia el estado de conexión
    webrtcService.onConnectionStateChanged = (state, deviceId) => {
      console.log(`🔄 Connection state changed in hook for ${deviceId || 'global'}:`, state);
      
      if (deviceId === null) {
        // Estado de conexión global (servidor de señalización)
        setGlobalConnectionState(state);
        
        if (state === 'disconnected') {
          console.log('❌ Disconnected from signaling server - cleaning all states');
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
          console.log('📊 Connection states updated:', newStates);
          return newStates;
        });
        
        // Manejar estados de fallo o desconexión
        if (state === 'failed' || state === 'disconnected' || state === 'closed') {
          console.log(`🔴 Connection ${state} for device, cleaning up:`, deviceId);
          
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
      console.error('❌ WebRTC error in hook:', errorMessage);
      setError(errorMessage);
      
      // Limpiar el error después de 5 segundos
      setTimeout(() => setError(null), 5000);
    };

    // Conectar al servicio de señalización
    console.log('🔌 Connecting to WebRTC signaling server...');
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
      console.log('🎬 connectToDevice called for:', deviceId);
      
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
      setConnectingDevices(prev => {
        const newSet = new Set(prev);
        newSet.add(deviceId);
        console.log('➕ Added to connecting devices:', deviceId);
        return newSet;
      });
      
      // Agregar a dispositivos seleccionados
      setSelectedDevices(prev => {
        const newSet = new Set(prev);
        newSet.add(deviceId);
        console.log('➕ Added to selected devices:', deviceId);
        return newSet;
      });
      
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
    console.log('🛑 disconnectStream called for device:', deviceId);
    
    // Detener el stream en el servicio
    webrtcService.stopStream(deviceId);
    
    // Remover de dispositivos seleccionados
    setSelectedDevices(prev => {
      const newSet = new Set(prev);
      newSet.delete(deviceId);
      console.log('➖ Removed from selected devices:', deviceId);
      return newSet;
    });
    
    // Remover de dispositivos conectándose
    setConnectingDevices(prev => {
      const newSet = new Set(prev);
      newSet.delete(deviceId);
      console.log('➖ Removed from connecting devices:', deviceId);
      return newSet;
    });
    
    // Limpiar el stream
    setStreams(prev => {
      const newStreams = { ...prev };
      delete newStreams[deviceId];
      console.log('🧹 Stream removed for device:', deviceId);
      return newStreams;
    });
    
    // Limpiar el estado de conexión
    setConnectionStates(prev => {
      const newStates = { ...prev };
      delete newStates[deviceId];
      console.log('🧹 Connection state removed for device:', deviceId);
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
    console.log('🔄 toggleDevice called for:', deviceId);
    if (selectedDevices.has(deviceId)) {
      console.log('🔀 Device is selected, disconnecting...');
      disconnectStream(deviceId);
    } else {
      console.log('🔀 Device is not selected, connecting...');
      connectToDevice(deviceId);
    }
  }, [selectedDevices, connectToDevice, disconnectStream]);

  // Función auxiliar para verificar si un dispositivo está activo
  const isDeviceActive = useCallback((deviceId) => {
    const isActive = selectedDevices.has(deviceId) && streams[deviceId] != null;
    console.log(`🔍 isDeviceActive(${deviceId}):`, isActive);
    return isActive;
  }, [selectedDevices, streams]);

  // Función auxiliar para verificar si un dispositivo está conectándose
  const isDeviceConnecting = useCallback((deviceId) => {
    const isConnecting = connectingDevices.has(deviceId);
    console.log(`🔍 isDeviceConnecting(${deviceId}):`, isConnecting);
    return isConnecting;
  }, [connectingDevices]);

  // Función auxiliar para obtener el estado de conexión de un dispositivo
  const getDeviceConnectionState = useCallback((deviceId) => {
    const state = connectionStates[deviceId] || 'disconnected';
    console.log(`🔍 getDeviceConnectionState(${deviceId}):`, state);
    return state;
  }, [connectionStates]);

  // Función para obtener estadísticas de debug
  const getDebugInfo = useCallback(() => {
    const debugInfo = {
      devices,
      selectedDevices: Array.from(selectedDevices),
      connectingDevices: Array.from(connectingDevices),
      activeStreams: Object.keys(streams),
      connectionStates,
      globalConnectionState,
      serviceDebugInfo: webrtcService.getDebugInfo()
    };
    console.log('📊 Debug info:', debugInfo);
    return debugInfo;
  }, [devices, selectedDevices, connectingDevices, streams, connectionStates, globalConnectionState]);

  // Log de estados cuando cambian (útil para debugging)
  useEffect(() => {
    console.log('📊 Hook State Update:', {
      devices: devices.length,
      selectedDevices: selectedDevices.size,
      connectingDevices: connectingDevices.size,
      activeStreams: Object.keys(streams).length,
      globalConnectionState
    });
  }, [devices, selectedDevices, connectingDevices, streams, globalConnectionState]);

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