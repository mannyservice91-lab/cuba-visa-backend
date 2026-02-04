import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Get the backend URL from environment variables
// Works on both web and native (APK)
const getBackendUrl = (): string => {
  // For web, use process.env directly
  if (Platform.OS === 'web') {
    return process.env.EXPO_PUBLIC_BACKEND_URL || '';
  }
  
  // For native (Android/iOS), use Constants.expoConfig
  const expoConfig = Constants.expoConfig;
  const extraConfig = expoConfig?.extra;
  
  // Try different sources for the backend URL
  if (extraConfig?.backendUrl) {
    return extraConfig.backendUrl;
  }
  
  // Fallback to the production URL
  return 'https://cuba-visa-hub.preview.emergentagent.com';
};

export const API_URL = getBackendUrl();

// Export other configuration values
export const CONFIG = {
  API_URL: getBackendUrl(),
  WHATSAPP_NUMBER: '+381693444935',
  PAYPAL_LINK: 'https://paypal.me/Gonzalezjm91',
};

export default CONFIG;
