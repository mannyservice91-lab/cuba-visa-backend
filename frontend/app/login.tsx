import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient/build/LinearGradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../src/context/AuthContext';
import { API_URL, CONFIG } from '../src/config/api';

// Cross-platform alert
const showAlert = (title: string, message: string, onOk?: () => void) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    if (onOk) onOk();
  } else {
    Alert.alert(title, message, [{ text: 'OK', onPress: onOk }]);
  }
};

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPendingApproval, setShowPendingApproval] = useState(false);
  const [pendingUserName, setPendingUserName] = useState('');

  const openWhatsApp = () => {
    const message = encodeURIComponent(
      `Hola, ya me registré en Cuban-Serbia Visa Center pero mi cuenta está pendiente de aprobación.\n\nEmail: ${email}\n\nSolicito la aprobación de mi cuenta para poder acceder a la aplicación.`
    );
    const whatsappUrl = `https://wa.me/${CONFIG.WHATSAPP_NUMBER.replace(/[^0-9]/g, '')}?text=${message}`;
    
    if (Platform.OS === 'web') {
      window.open(whatsappUrl, '_blank');
    } else {
      Linking.openURL(whatsappUrl);
    }
  };

  const handleLogin = async () => {
    setErrorMessage('');
    
    if (!email || !password) {
      setErrorMessage('Por favor complete todos los campos');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Login with API:', API_URL);
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      const data = await response.json();
      console.log('Login response:', response.status, data);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Email o contraseña incorrectos. Por favor verifique sus credenciales.');
        }
        throw new Error(data.detail || 'Error al iniciar sesión');
      }

      // Check if user is approved by admin
      if (data.is_approved === false) {
        setPendingUserName(data.user?.full_name || '');
        setShowPendingApproval(true);
        return;
      }

      await login(data.user);
      
      if (Platform.OS === 'web') {
        window.location.href = '/dashboard';
      } else {
        router.replace('/dashboard');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setErrorMessage(error.message || 'Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  // Show pending approval screen
  if (showPendingApproval) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#0a1628', '#132743', '#0a1628']} style={styles.gradient}>
          <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.pendingContent}>
              {/* Warning Icon */}
              <View style={styles.pendingIconContainer}>
                <LinearGradient colors={['#1a2f4a', '#0d1f35']} style={styles.pendingIconGradient}>
                  <Ionicons name="time" size={70} color="#ffc107" />
                </LinearGradient>
              </View>

              {/* Title */}
              <Text style={styles.pendingTitle}>Cuenta Pendiente</Text>
              {pendingUserName ? (
                <Text style={styles.pendingSubtitle}>Hola, {pendingUserName}</Text>
              ) : null}

              {/* Info Card */}
              <View style={styles.pendingCard}>
                <LinearGradient colors={['#1a2f4a', '#0d1f35']} style={styles.pendingCardGradient}>
                  <Ionicons name="shield-checkmark" size={40} color="#d4af37" />
                  <Text style={styles.pendingCardTitle}>Aprobación Requerida</Text>
                  <Text style={styles.pendingCardText}>
                    Tu cuenta está registrada pero aún no ha sido aprobada por un administrador.
                  </Text>
                  <Text style={styles.pendingCardText}>
                    Por favor, contacta con nosotros por WhatsApp para solicitar la aprobación. 
                    Responderemos lo antes posible.
                  </Text>
                </LinearGradient>
              </View>

              {/* WhatsApp Button */}
              <TouchableOpacity
                style={styles.whatsappButton}
                onPress={openWhatsApp}
                data-testid="whatsapp-approval-btn"
              >
                <LinearGradient colors={['#25D366', '#128C7E']} style={styles.whatsappGradient}>
                  <Ionicons name="logo-whatsapp" size={24} color="#ffffff" />
                  <Text style={styles.whatsappButtonText}>Contactar por WhatsApp</Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Try Again Button */}
              <TouchableOpacity
                style={styles.tryAgainButton}
                onPress={() => setShowPendingApproval(false)}
              >
                <Ionicons name="refresh" size={20} color="#d4af37" />
                <Text style={styles.tryAgainText}>Intentar de Nuevo</Text>
              </TouchableOpacity>

              {/* Home Link */}
              <TouchableOpacity 
                style={styles.homeLink}
                onPress={() => router.push('/')}
              >
                <Ionicons name="home" size={18} color="#667788" />
                <Text style={styles.homeLinkText}>Volver al inicio</Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0a1628', '#132743', '#0a1628']}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Back Button */}
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.back()}
              >
                <Ionicons name="arrow-back" size={24} color="#d4af37" />
              </TouchableOpacity>

              {/* Header */}
              <View style={styles.header}>
                <MaterialCommunityIcons name="passport" size={60} color="#d4af37" />
                <Text style={styles.title}>Iniciar Sesión</Text>
                <Text style={styles.subtitle}>Accede a tu cuenta</Text>
              </View>

              {/* Error Message */}
              {errorMessage ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={20} color="#f44336" />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              ) : null}

              {/* Form */}
              <View style={styles.form}>
                <View style={styles.inputContainer}>
                  <Ionicons name="mail" size={20} color="#d4af37" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Correo electrónico"
                    placeholderTextColor="#667788"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed" size={20} color="#d4af37" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Contraseña"
                    placeholderTextColor="#667788"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeIcon}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off' : 'eye'}
                      size={20}
                      color="#667788"
                    />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.loginButton}
                  onPress={handleLogin}
                  disabled={isLoading}
                >
                  <LinearGradient
                    colors={['#d4af37', '#b8962f']}
                    style={styles.buttonGradient}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#0a1628" />
                    ) : (
                      <>
                        <Ionicons name="log-in" size={22} color="#0a1628" />
                        <Text style={styles.loginButtonText}>Entrar</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.registerLink}
                  onPress={() => router.push('/register')}
                >
                  <Text style={styles.registerText}>
                    ¿No tienes cuenta?{' '}
                    <Text style={styles.registerTextBold}>Regístrate aquí</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a1628',
  },
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  backButton: {
    marginTop: 10,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#8899aa',
    marginTop: 5,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 67, 54, 0.15)',
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
    gap: 10,
  },
  errorText: {
    color: '#f44336',
    fontSize: 14,
    flex: 1,
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    marginBottom: 15,
    paddingHorizontal: 15,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    color: '#ffffff',
    fontSize: 16,
  },
  eyeIcon: {
    padding: 10,
  },
  loginButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 20,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 10,
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0a1628',
  },
  registerLink: {
    marginTop: 30,
    alignItems: 'center',
  },
  registerText: {
    fontSize: 15,
    color: '#8899aa',
  },
  registerTextBold: {
    color: '#d4af37',
    fontWeight: 'bold',
  },
  // Pending Approval Styles
  pendingContent: {
    flexGrow: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingIconContainer: {
    borderRadius: 60,
    overflow: 'hidden',
    marginBottom: 30,
    borderWidth: 2,
    borderColor: 'rgba(255, 193, 7, 0.3)',
  },
  pendingIconGradient: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffc107',
    textAlign: 'center',
    marginBottom: 8,
  },
  pendingSubtitle: {
    fontSize: 18,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 30,
  },
  pendingCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    marginBottom: 30,
  },
  pendingCardGradient: {
    padding: 25,
    alignItems: 'center',
  },
  pendingCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d4af37',
    textAlign: 'center',
    marginTop: 15,
    marginBottom: 15,
  },
  pendingCardText: {
    fontSize: 14,
    color: '#8899aa',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 10,
  },
  whatsappButton: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 15,
  },
  whatsappGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  whatsappButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  tryAgainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    gap: 8,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    width: '100%',
    maxWidth: 400,
    marginBottom: 15,
  },
  tryAgainText: {
    fontSize: 16,
    color: '#d4af37',
    fontWeight: '600',
  },
  homeLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 8,
    padding: 10,
  },
  homeLinkText: {
    color: '#667788',
    fontSize: 14,
  },
});
