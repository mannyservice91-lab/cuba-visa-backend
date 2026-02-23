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
  android: {
    url: 'https://expo.dev/accounts/josemgt91/projects/cuban-serbia-visa/builds/ec865404-dec3-4c7c-9568-dddaa229aaa6',
    label: 'Descargar APK',
    enabled: true,
  },
  googlePlay: {
    url: '', // Añadir enlace cuando esté publicado
    label: 'Google Play',
    enabled: false,
  },
  appStore: {
    url: '', // Añadir enlace cuando esté publicado
    label: 'App Store',
    enabled: false,
  },
};

// Información de la empresa
export const COMPANY_INFO = {
  name: 'Cuban-Serbia Visa Center',
  year: 2025,
  phone: '+381 69 344 4935',
  whatsapp: '+381693444935',
  paypal: 'https://paypal.me/Gonzalezjm91',
};

// Configuracion general de la app
export const CONFIG = {
  API_URL: getBackendUrl(),
  WHATSAPP_NUMBER: '+381693444935',
  PAYPAL_LINK: 'https://paypal.me/Gonzalezjm91',
  APP_DOWNLOAD_LINKS,
};

export default CONFIG;
