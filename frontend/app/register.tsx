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

// Helper for cross-platform alerts
const showAlert = (title: string, message: string, onOk?: () => void) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    if (onOk) onOk();
  } else {
    Alert.alert(title, message, [{ text: 'OK', onPress: onOk }]);
  }
};

export default function RegisterScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    passport_number: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPendingApproval, setShowPendingApproval] = useState(false);
  const [registeredName, setRegisteredName] = useState('');

  const openWhatsApp = () => {
    const message = encodeURIComponent(
      `Hola, acabo de registrarme en Cuban-Serbia Visa Center.\n\nNombre: ${registeredName}\nEmail: ${formData.email}\n\nSolicito la aprobación de mi cuenta para poder acceder a la aplicación.`
    );
    const whatsappUrl = `https://wa.me/${CONFIG.WHATSAPP_NUMBER.replace(/[^0-9]/g, '')}?text=${message}`;
    
    if (Platform.OS === 'web') {
      window.open(whatsappUrl, '_blank');
    } else {
      Linking.openURL(whatsappUrl);
    }
  };

  const handleRegister = async () => {
    const { full_name, email, phone, passport_number, password, confirmPassword } = formData;
    setErrorMessage('');

    if (!full_name || !email || !phone || !passport_number || !password) {
      setErrorMessage('Por favor complete todos los campos');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Registering with API:', API_URL);
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name,
          email,
          phone,
          passport_number,
          password,
          country_of_residence: 'Por definir', // User will set this in their profile
        }),
      });

      const data = await response.json();
      console.log('Register response:', data);

      if (!response.ok) {
        throw new Error(data.detail || 'Error al registrarse');
      }

      // Check if approval is required (new flow)
      if (data.requires_approval) {
        setRegisteredName(full_name);
        setShowPendingApproval(true);
      } else if (data.requires_verification) {
        // Legacy email verification flow
        showAlert('Verifica tu Email', 'Te hemos enviado un código de verificación a tu correo electrónico.', () => {
          if (Platform.OS === 'web') {
            window.location.href = `/verify-email?email=${encodeURIComponent(email)}`;
          } else {
            router.push({ pathname: '/verify-email', params: { email } });
          }
        });
      } else {
        // Direct login (legacy)
        await login(data.user);
        showAlert('Éxito', 'Cuenta creada exitosamente', () => {
          if (Platform.OS === 'web') {
            window.location.href = '/dashboard';
          } else {
            router.replace('/dashboard');
          }
        });
      }
    } catch (error: any) {
      console.error('Register error:', error);
      setErrorMessage(error.message || 'Error al registrarse');
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
              {/* Success Icon */}
              <View style={styles.pendingIconContainer}>
                <LinearGradient colors={['#1a2f4a', '#0d1f35']} style={styles.pendingIconGradient}>
                  <Ionicons name="checkmark-circle" size={80} color="#4caf50" />
                </LinearGradient>
              </View>

              {/* Title */}
              <Text style={styles.pendingTitle}>¡Registro Exitoso!</Text>
              <Text style={styles.pendingSubtitle}>Hola, {registeredName}</Text>

              {/* Info Card */}
              <View style={styles.pendingCard}>
                <LinearGradient colors={['#1a2f4a', '#0d1f35']} style={styles.pendingCardGradient}>
                  <Ionicons name="time" size={40} color="#d4af37" />
                  <Text style={styles.pendingCardTitle}>Cuenta Pendiente de Aprobación</Text>
                  <Text style={styles.pendingCardText}>
                    Tu cuenta ha sido creada correctamente. Para poder acceder a la aplicación, 
                    un administrador debe aprobar tu registro.
                  </Text>
                  <Text style={styles.pendingCardText}>
                    Por favor, contacta con nosotros por WhatsApp para solicitar la aprobación 
                    de tu cuenta. Responderemos lo antes posible.
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

              {/* Back to Login */}
              <TouchableOpacity
                style={styles.backToLoginButton}
                onPress={() => router.push('/login')}
              >
                <Ionicons name="log-in" size={20} color="#d4af37" />
                <Text style={styles.backToLoginText}>Ir a Iniciar Sesión</Text>
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
      <LinearGradient colors={['#0a1628', '#132743', '#0a1628']} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Header with Back Button */}
              <View style={styles.header}>
                <TouchableOpacity 
                  style={styles.backButton} 
                  onPress={() => router.back()}
                >
                  <Ionicons name="arrow-back" size={24} color="#d4af37" />
                  <Text style={styles.backText}>Volver</Text>
                </TouchableOpacity>
              </View>

              {/* Logo */}
              <View style={styles.logoContainer}>
                <MaterialCommunityIcons name="passport" size={50} color="#d4af37" />
                <Text style={styles.logoText}>CUBAN-SERBIA</Text>
                <Text style={styles.logoSubtext}>VISA CENTER</Text>
              </View>

              {/* Title */}
              <Text style={styles.title}>Crear Cuenta</Text>
              <Text style={styles.subtitle}>Complete sus datos para registrarse</Text>

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
                  <Ionicons name="person" size={20} color="#d4af37" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Nombre completo"
                    placeholderTextColor="#667788"
                    value={formData.full_name}
                    onChangeText={(text) => setFormData({ ...formData, full_name: text })}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Ionicons name="mail" size={20} color="#d4af37" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Correo electrónico"
                    placeholderTextColor="#667788"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={formData.email}
                    onChangeText={(text) => setFormData({ ...formData, email: text })}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Ionicons name="call" size={20} color="#d4af37" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Teléfono (+53...)"
                    placeholderTextColor="#667788"
                    keyboardType="phone-pad"
                    value={formData.phone}
                    onChangeText={(text) => setFormData({ ...formData, phone: text })}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <MaterialCommunityIcons name="passport" size={20} color="#d4af37" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Número de pasaporte"
                    placeholderTextColor="#667788"
                    autoCapitalize="characters"
                    value={formData.passport_number}
                    onChangeText={(text) => setFormData({ ...formData, passport_number: text })}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed" size={20} color="#d4af37" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Contraseña"
                    placeholderTextColor="#667788"
                    secureTextEntry={!showPassword}
                    value={formData.password}
                    onChangeText={(text) => setFormData({ ...formData, password: text })}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons
                      name={showPassword ? 'eye-off' : 'eye'}
                      size={20}
                      color="#667788"
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed" size={20} color="#d4af37" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Confirmar contraseña"
                    placeholderTextColor="#667788"
                    secureTextEntry={!showPassword}
                    value={formData.confirmPassword}
                    onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
                  />
                </View>

                <TouchableOpacity
                  style={styles.registerButton}
                  onPress={handleRegister}
                  disabled={isLoading}
                >
                  <LinearGradient colors={['#d4af37', '#b8962f']} style={styles.buttonGradient}>
                    {isLoading ? (
                      <ActivityIndicator color="#0a1628" />
                    ) : (
                      <>
                        <Ionicons name="person-add" size={20} color="#0a1628" />
                        <Text style={styles.buttonText}>Registrarse</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {/* Login Link */}
                <View style={styles.loginLinkContainer}>
                  <Text style={styles.loginText}>¿Ya tienes cuenta? </Text>
                  <TouchableOpacity onPress={() => router.push('/login')}>
                    <Text style={styles.loginLink}>Inicia sesión</Text>
                  </TouchableOpacity>
                </View>

                {/* Home Link */}
                <TouchableOpacity 
                  style={styles.homeLink}
                  onPress={() => router.push('/')}
                >
                  <Ionicons name="home" size={18} color="#667788" />
                  <Text style={styles.homeLinkText}>Volver al inicio</Text>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 10,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    alignSelf: 'flex-start',
  },
  backText: {
    color: '#d4af37',
    fontSize: 16,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#d4af37',
    marginTop: 10,
    letterSpacing: 2,
  },
  logoSubtext: {
    fontSize: 12,
    color: '#8899aa',
    letterSpacing: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#8899aa',
    textAlign: 'center',
    marginBottom: 25,
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
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
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
    paddingVertical: 15,
    fontSize: 16,
    color: '#ffffff',
  },
  registerButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 10,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0a1628',
  },
  loginLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  loginText: {
    color: '#8899aa',
    fontSize: 14,
  },
  loginLink: {
    color: '#d4af37',
    fontSize: 14,
    fontWeight: 'bold',
  },
  homeLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 8,
    padding: 10,
  },
  homeLinkText: {
    color: '#667788',
    fontSize: 14,
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
    borderColor: 'rgba(76, 175, 80, 0.3)',
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
    color: '#4caf50',
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
  backToLoginButton: {
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
  },
  backToLoginText: {
    fontSize: 16,
    color: '#d4af37',
    fontWeight: '600',
  },
});
