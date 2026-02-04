import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient/build/LinearGradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../src/context/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

// Cross-platform alert helper
const showAlert = (title: string, message: string, onOk?: () => void) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    if (onOk) onOk();
  } else {
    const Alert = require('react-native').Alert;
    Alert.alert(title, message, [{ text: 'OK', onPress: onOk }]);
  }
};

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const { login } = useAuth();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const handleCodeChange = (value: string, index: number) => {
    if (value.length > 1) {
      // If pasting multiple digits
      const digits = value.replace(/[^0-9]/g, '').split('').slice(0, 6);
      const newCode = [...code];
      digits.forEach((digit, i) => {
        if (index + i < 6) {
          newCode[index + i] = digit;
        }
      });
      setCode(newCode);
      const nextIndex = Math.min(index + digits.length, 5);
      inputRefs.current[nextIndex]?.focus();
    } else {
      const newCode = [...code];
      newCode[index] = value.replace(/[^0-9]/g, '');
      setCode(newCode);
      if (value && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      setErrorMessage('Por favor ingresa el código completo de 6 dígitos');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await fetch(`${API_URL}/api/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: fullCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Código incorrecto');
      }

      // Login with verified user
      await login(data.user);
      showAlert('¡Verificado!', 'Tu email ha sido verificado exitosamente.', () => {
        if (Platform.OS === 'web') {
          window.location.href = '/dashboard';
        } else {
          router.replace('/dashboard');
        }
      });
    } catch (error: any) {
      setErrorMessage(error.message || 'Error al verificar');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setErrorMessage('');

    try {
      const response = await fetch(`${API_URL}/api/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Error al reenviar');
      }

      showAlert('Enviado', 'Te hemos enviado un nuevo código de verificación.');
    } catch (error: any) {
      setErrorMessage(error.message || 'Error al reenviar código');
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0a1628', '#132743', '#0a1628']} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.content}
          >
            {/* Header with Back Button */}
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => {
                if (Platform.OS === 'web') {
                  window.location.href = '/register';
                } else {
                  router.back();
                }
              }}
            >
              <Ionicons name="arrow-back" size={24} color="#d4af37" />
              <Text style={styles.backText}>Volver al Registro</Text>
            </TouchableOpacity>

            {/* Icon */}
            <View style={styles.iconContainer}>
              <Ionicons name="mail-unread" size={60} color="#d4af37" />
            </View>

            {/* Title */}
            <Text style={styles.title}>Verifica tu Email</Text>
            <Text style={styles.subtitle}>
              Hemos enviado un código de 6 dígitos a:
            </Text>
            <Text style={styles.email}>{email}</Text>

            {/* Code Input */}
            <View style={styles.codeContainer}>
              {code.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => (inputRefs.current[index] = ref)}
                  style={[styles.codeInput, errorMessage && styles.codeInputError]}
                  value={digit}
                  onChangeText={(value) => handleCodeChange(value, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                />
              ))}
            </View>

            {/* Error Message */}
            {errorMessage ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color="#f44336" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Verify Button */}
            <TouchableOpacity
              style={styles.verifyButton}
              onPress={handleVerify}
              disabled={isLoading}
            >
              <LinearGradient colors={['#d4af37', '#b8962f']} style={styles.buttonGradient}>
                {isLoading ? (
                  <ActivityIndicator color="#0a1628" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#0a1628" />
                    <Text style={styles.verifyButtonText}>Verificar Email</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Resend Code */}
            <View style={styles.resendContainer}>
              <Text style={styles.resendText}>¿No recibiste el código?</Text>
              <TouchableOpacity onPress={handleResend} disabled={resending}>
                {resending ? (
                  <ActivityIndicator size="small" color="#d4af37" />
                ) : (
                  <Text style={styles.resendLink}>Reenviar código</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Info */}
            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={18} color="#8899aa" />
              <Text style={styles.infoText}>
                El código expira en 24 horas. Revisa tu carpeta de spam si no lo encuentras.
              </Text>
            </View>
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
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: 10,
    marginBottom: 20,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#8899aa',
    textAlign: 'center',
  },
  email: {
    fontSize: 16,
    fontWeight: '600',
    color: '#d4af37',
    marginBottom: 30,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  codeInput: {
    width: 45,
    height: 55,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  codeInputError: {
    borderColor: '#f44336',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 20,
    gap: 8,
  },
  errorText: {
    color: '#f44336',
    fontSize: 14,
  },
  verifyButton: {
    width: '100%',
    maxWidth: 350,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  verifyButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0a1628',
  },
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 30,
  },
  resendText: {
    color: '#8899aa',
    fontSize: 14,
  },
  resendLink: {
    color: '#d4af37',
    fontSize: 14,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(136, 153, 170, 0.1)',
    padding: 15,
    borderRadius: 10,
    gap: 10,
    maxWidth: 350,
  },
  infoText: {
    flex: 1,
    color: '#8899aa',
    fontSize: 12,
    lineHeight: 18,
  },
});
