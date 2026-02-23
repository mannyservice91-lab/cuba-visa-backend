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

// =============================================================
// LINKS DE DESCARGA DE LA APP
// =============================================================
// Modifica estos links cuando la app esté en las tiendas
// =============================================================
export const APP_DOWNLOAD_LINKS = {
  // Link actual de la APK (Expo)
  ANDROID_APK: 'https://expo.dev/accounts/josemgt91/projects/cuban-serbia-visa/builds/ec865404-dec3-4c7c-9568-dddaa229aaa6',
  
  // Links para cuando esté en las tiendas (cambiar cuando estén listos)
  GOOGLE_PLAY: '', // Ej: 'https://play.google.com/store/apps/details?id=com.tuapp'
  APP_STORE: '',   // Ej: 'https://apps.apple.com/app/tuapp/id123456789'
};

// Configuracion general de la app
export const CONFIG = {
  API_URL: getBackendUrl(),
  WHATSAPP_NUMBER: '+381693444935',
  PAYPAL_LINK: 'https://paypal.me/Gonzalezjm91',
  APP_DOWNLOAD_LINKS,
};

export default CONFIG;
