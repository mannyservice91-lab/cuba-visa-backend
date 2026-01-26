import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient/build/LinearGradient';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from './context/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const PAYPAL_LINK = 'https://paypal.me/Gonzalezjm91';

const VISA_TYPES = {
  turismo: {
    name: 'Visado de Turismo',
    price: 1500,
    deposit: 750,
    icon: 'umbrella-beach',
    description: 'Ideal para turistas que desean visitar Serbia',
  },
  trabajo: {
    name: 'Visado por Contrato de Trabajo',
    price: 2500,
    deposit: 1250,
    icon: 'briefcase',
    description: 'Para quienes tienen una oferta laboral en Serbia',
  },
};

export default function NewApplicationScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateApplication = async () => {
    if (!selectedType) {
      Alert.alert('Error', 'Por favor selecciona un tipo de visa');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/applications?user_id=${user.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          visa_type: selectedType,
          notes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Error al crear solicitud');
      }

      Alert.alert(
        'Éxito',
        'Solicitud creada exitosamente. Recuerda realizar el depósito inicial del 50% para comenzar el proceso.',
        [
          {
            text: 'Pagar Ahora',
            onPress: () => Linking.openURL(PAYPAL_LINK),
          },
          {
            text: 'Ver Solicitud',
            onPress: () => router.replace({ pathname: '/application-details', params: { id: data.application.id } }),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error al crear solicitud');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#0a1628', '#132743', '#0a1628']} style={styles.gradient}>
          <SafeAreaView style={styles.centerContent}>
            <Text style={styles.errorText}>Debes iniciar sesión</Text>
            <TouchableOpacity style={styles.linkButton} onPress={() => router.replace('/login')}>
              <Text style={styles.linkText}>Ir a Login</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0a1628', '#132743', '#0a1628']} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#d4af37" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Nueva Solicitud</Text>
            <View style={{ width: 44 }} />
          </View>

          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            {/* Instructions */}
            <View style={styles.instructionsCard}>
              <Ionicons name="information-circle" size={24} color="#d4af37" />
              <Text style={styles.instructionsText}>
                Selecciona el tipo de visa que necesitas. El depósito inicial es del 50% del precio total.
              </Text>
            </View>

            {/* Visa Type Selection */}
            <Text style={styles.sectionTitle}>Tipo de Visa</Text>

            {Object.entries(VISA_TYPES).map(([key, visa]) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.visaCard,
                  selectedType === key && styles.visaCardSelected,
                ]}
                onPress={() => setSelectedType(key)}
              >
                <LinearGradient
                  colors={selectedType === key ? ['#2a3f5a', '#1a2f45'] : ['#1a2f4a', '#0d1f35']}
                  style={styles.visaCardGradient}
                >
                  <View style={styles.visaCardHeader}>
                    <FontAwesome5 name={visa.icon} size={28} color="#d4af37" />
                    {selectedType === key && (
                      <Ionicons name="checkmark-circle" size={24} color="#4caf50" />
                    )}
                  </View>
                  <Text style={styles.visaName}>{visa.name}</Text>
                  <Text style={styles.visaDescription}>{visa.description}</Text>
                  <View style={styles.priceRow}>
                    <View>
                      <Text style={styles.priceLabel}>Precio Total</Text>
                      <Text style={styles.priceValue}>{visa.price} EUR</Text>
                    </View>
                    <View>
                      <Text style={styles.priceLabel}>Depósito (50%)</Text>
                      <Text style={styles.depositValue}>{visa.deposit} EUR</Text>
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}

            {/* Notes */}
            <Text style={styles.sectionTitle}>Notas Adicionales (Opcional)</Text>
            <View style={styles.notesContainer}>
              <TextInput
                style={styles.notesInput}
                placeholder="Escribe cualquier información adicional..."
                placeholderTextColor="#667788"
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Important Info */}
            <View style={styles.importantCard}>
              <Ionicons name="alert-circle" size={20} color="#ffc107" />
              <View style={styles.importantTextContainer}>
                <Text style={styles.importantTitle}>Importante</Text>
                <Text style={styles.importantText}>
                  • El pago del depósito se realiza vía PayPal (Amigos y Familia){"\n"}
                  • Tiempo de procesamiento: 1-2 meses{"\n"}
                  • No incluye pasaje, solo gestión y asesoría
                </Text>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, !selectedType && styles.submitButtonDisabled]}
              onPress={handleCreateApplication}
              disabled={isLoading || !selectedType}
            >
              <LinearGradient
                colors={selectedType ? ['#d4af37', '#b8962f'] : ['#555', '#444']}
                style={styles.submitGradient}
              >
                {isLoading ? (
                  <ActivityIndicator color="#0a1628" />
                ) : (
                  <>
                    <Ionicons name="paper-plane" size={22} color="#0a1628" />
                    <Text style={styles.submitText}>Crear Solicitud</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
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
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 20,
  },
  linkButton: {
    padding: 15,
  },
  linkText: {
    color: '#d4af37',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212, 175, 55, 0.2)',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  instructionsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    padding: 15,
    borderRadius: 12,
    marginBottom: 25,
    gap: 10,
  },
  instructionsText: {
    flex: 1,
    fontSize: 14,
    color: '#d4af37',
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 15,
  },
  visaCard: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 15,
    borderWidth: 2,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  visaCardSelected: {
    borderColor: '#d4af37',
  },
  visaCardGradient: {
    padding: 20,
  },
  visaCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  visaName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  visaDescription: {
    fontSize: 14,
    color: '#8899aa',
    marginBottom: 15,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  priceLabel: {
    fontSize: 12,
    color: '#8899aa',
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  depositValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#d4af37',
  },
  notesContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    marginBottom: 25,
  },
  notesInput: {
    padding: 15,
    fontSize: 16,
    color: '#ffffff',
    minHeight: 100,
  },
  importantCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    padding: 15,
    borderRadius: 12,
    marginBottom: 25,
    gap: 12,
  },
  importantTextContainer: {
    flex: 1,
  },
  importantTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffc107',
    marginBottom: 8,
  },
  importantText: {
    fontSize: 13,
    color: '#cccccc',
    lineHeight: 20,
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 10,
  },
  submitText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0a1628',
  },
});
