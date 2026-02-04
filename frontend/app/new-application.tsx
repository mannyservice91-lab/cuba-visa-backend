import React, { useState, useEffect } from 'react';
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
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient/build/LinearGradient';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../src/context/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const PAYPAL_LINK = 'https://paypal.me/Gonzalezjm91';

interface VisaType {
  id: string;
  name: string;
  price: number;
  currency: string;
  processing_time: string;
}

interface Destination {
  id: string;
  country: string;
  country_code: string;
  enabled: boolean;
  image_url: string;
  visa_types: VisaType[];
}

const showAlert = (title: string, message: string, buttons?: any[]) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    if (buttons && buttons.length > 0) {
      buttons[buttons.length - 1]?.onPress?.();
    }
  } else {
    Alert.alert(title, message, buttons);
  }
};

export default function NewApplicationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ destinationId?: string }>();
  const { user } = useAuth();
  
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [selectedVisaType, setSelectedVisaType] = useState<VisaType | null>(null);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadDestinations();
  }, []);

  const loadDestinations = async () => {
    try {
      const response = await fetch(`${API_URL}/api/destinations`);
      const data = await response.json();
      const enabled = data.filter((d: Destination) => d.enabled);
      setDestinations(enabled);
      
      // If destinationId was passed, pre-select it
      if (params.destinationId) {
        const dest = enabled.find((d: Destination) => d.id === params.destinationId);
        if (dest) setSelectedDestination(dest);
      } else if (enabled.length > 0) {
        setSelectedDestination(enabled[0]);
      }
    } catch (error) {
      console.error('Error loading destinations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateApplication = async () => {
    if (!selectedDestination || !selectedVisaType) {
      showAlert('Error', 'Por favor selecciona un destino y tipo de visa');
      return;
    }

    if (!user) {
      showAlert('Error', 'Debes iniciar sesión');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/applications?user_id=${user.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          destination_id: selectedDestination.id,
          visa_type_id: selectedVisaType.id,
          notes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Error al crear solicitud');
      }

      showAlert(
        'Éxito',
        'Solicitud creada exitosamente. Recuerda realizar el depósito inicial del 50% para comenzar el proceso.',
        [
          {
            text: 'Ver Solicitud',
            onPress: () => router.replace({ pathname: '/application-details', params: { id: data.application.id } }),
          },
        ]
      );
    } catch (error: any) {
      showAlert('Error', error.message || 'Error al crear solicitud');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#0a1628', '#132743', '#0a1628']} style={styles.gradient}>
          <SafeAreaView style={styles.centerContent}>
            <Ionicons name="lock-closed" size={50} color="#d4af37" />
            <Text style={styles.errorText}>Debes iniciar sesión</Text>
            <TouchableOpacity style={styles.linkButton} onPress={() => router.replace('/login')}>
              <Text style={styles.linkText}>Ir a Login</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </LinearGradient>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#0a1628', '#132743', '#0a1628']} style={styles.gradient}>
          <SafeAreaView style={styles.centerContent}>
            <ActivityIndicator size="large" color="#d4af37" />
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
                Selecciona el destino y tipo de visa. El depósito inicial es del 50% del precio total.
              </Text>
            </View>

            {/* Destination Selection */}
            <Text style={styles.sectionTitle}>1. Selecciona el Destino</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.destinationScroll}
            >
              {destinations.map((dest) => (
                <TouchableOpacity
                  key={dest.id}
                  style={[
                    styles.destinationChip,
                    selectedDestination?.id === dest.id && styles.destinationChipSelected,
                  ]}
                  onPress={() => {
                    setSelectedDestination(dest);
                    setSelectedVisaType(null);
                  }}
                >
                  <Text style={styles.destinationFlag}>
                    {dest.country_code === 'RS' ? '🇷🇸' : 
                     dest.country_code === 'AM' ? '🇦🇲' :
                     dest.country_code === 'GE' ? '🇬🇪' : '🌍'}
                  </Text>
                  <Text style={[
                    styles.destinationChipText,
                    selectedDestination?.id === dest.id && styles.destinationChipTextSelected,
                  ]}>
                    {dest.country}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Visa Type Selection */}
            {selectedDestination && (
              <>
                <Text style={styles.sectionTitle}>2. Tipo de Visa para {selectedDestination.country}</Text>

                {selectedDestination.visa_types?.map((visa) => (
                  <TouchableOpacity
                    key={visa.id}
                    style={[
                      styles.visaCard,
                      selectedVisaType?.id === visa.id && styles.visaCardSelected,
                    ]}
                    onPress={() => setSelectedVisaType(visa)}
                  >
                    <LinearGradient
                      colors={selectedVisaType?.id === visa.id ? ['#2a3f5a', '#1a2f45'] : ['#1a2f4a', '#0d1f35']}
                      style={styles.visaCardGradient}
                    >
                      <View style={styles.visaCardHeader}>
                        <FontAwesome5 
                          name={visa.name.toLowerCase().includes('turismo') ? 'umbrella-beach' : 'briefcase'} 
                          size={28} 
                          color="#d4af37" 
                        />
                        {selectedVisaType?.id === visa.id && (
                          <Ionicons name="checkmark-circle" size={24} color="#4caf50" />
                        )}
                      </View>
                      <Text style={styles.visaName}>{visa.name}</Text>
                      <View style={styles.priceRow}>
                        <View>
                          <Text style={styles.priceLabel}>Precio Total</Text>
                          <Text style={styles.priceValue}>{visa.price} {visa.currency}</Text>
                        </View>
                        <View>
                          <Text style={styles.priceLabel}>Depósito (50%)</Text>
                          <Text style={styles.depositValue}>{visa.price / 2} {visa.currency}</Text>
                        </View>
                      </View>
                      <View style={styles.timeRow}>
                        <Ionicons name="time-outline" size={16} color="#8899aa" />
                        <Text style={styles.timeText}>{visa.processing_time}</Text>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </>
            )}

            {/* Notes */}
            <Text style={styles.sectionTitle}>3. Notas Adicionales (Opcional)</Text>
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
                  • Después de crear la solicitud podrás subir tus documentos{"\n"}
                  • No incluye pasaje, solo gestión y asesoría
                </Text>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, (!selectedDestination || !selectedVisaType) && styles.submitButtonDisabled]}
              onPress={handleCreateApplication}
              disabled={isSubmitting || !selectedDestination || !selectedVisaType}
            >
              <LinearGradient
                colors={(selectedDestination && selectedVisaType) ? ['#d4af37', '#b8962f'] : ['#555', '#444']}
                style={styles.submitGradient}
              >
                {isSubmitting ? (
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
    gap: 15,
  },
  errorText: {
    fontSize: 18,
    color: '#fff',
    marginTop: 15,
  },
  linkButton: {
    padding: 15,
    backgroundColor: '#d4af37',
    borderRadius: 10,
    marginTop: 10,
  },
  linkText: {
    color: '#0a1628',
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
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 15,
    marginTop: 10,
  },
  destinationScroll: {
    marginBottom: 20,
  },
  destinationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    gap: 8,
  },
  destinationChipSelected: {
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    borderColor: '#d4af37',
  },
  destinationFlag: {
    fontSize: 20,
  },
  destinationChipText: {
    fontSize: 14,
    color: '#8899aa',
    fontWeight: '500',
  },
  destinationChipTextSelected: {
    color: '#d4af37',
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
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  timeText: {
    fontSize: 13,
    color: '#8899aa',
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
