import { Platform } from 'react-native';

// =============================================================
// CONFIGURACION DE PRODUCCION - SERVIDOR RENDER
// =============================================================
// Backend desplegado en: https://cuba-visa-backend.onrender.com
// Base de datos: MongoDB Atlas
// =============================================================

const PRODUCTION_BACKEND_URL = 'https://cuba-visa-backend.onrender.com';

const getBackendUrl = (): string => {
  // Para web en desarrollo, usa variable de entorno si existe
  if (Platform.OS === 'web' && process.env.EXPO_PUBLIC_BACKEND_URL) {
    return process.env.EXPO_PUBLIC_BACKEND_URL;
  }
  
  // Para APK/produccion y web sin env, usa el servidor de Render
  return PRODUCTION_BACKEND_URL;
};

export const API_URL = getBackendUrl();

// Configuracion general de la app
export const CONFIG = {
  API_URL: getBackendUrl(),
  WHATSAPP_NUMBER: '+381693444935',
  PAYPAL_LINK: 'https://paypal.me/Gonzalezjm91',
};

export default CONFIG;
