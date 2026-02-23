import { Platform } from 'react-native';

// Backend URL configuration
// Works on both web and native (APK)
const getBackendUrl = (): string => {
  // For web, use process.env
  if (Platform.OS === 'web') {
    return process.env.EXPO_PUBLIC_BACKEND_URL || '';
  }
  
  // For native (Android/iOS), use the production URL directly
  // This is more reliable than using Constants.expoConfig
  return 'https://cuba-serbia-visa.preview.emergentagent.com';
};

export const API_URL = getBackendUrl();

// Export other configuration values
export const CONFIG = {
  API_URL: getBackendUrl(),
  WHATSAPP_NUMBER: '+381693444935',
  PAYPAL_LINK: 'https://paypal.me/Gonzalezjm91',
};

export default CONFIG;
