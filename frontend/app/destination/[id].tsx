import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Image,
  ActivityIndicator,
  ImageBackground,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient/build/LinearGradient';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const WHATSAPP_NUMBER = '+381693444935';
const PAYPAL_LINK = 'https://paypal.me/Gonzalezjm91';
const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface VisaType {
  id: string;
  name: string;
  price: number;
  currency: string;
  processing_time: string;
  requirements: string;
}

interface Destination {
  id: string;
  country: string;
  country_code: string;
  enabled: boolean;
  image_url: string;
  visa_types: VisaType[];
  requirements: string;
  message: string;
}

const FLAG_EMOJIS: Record<string, string> = {
  RS: '🇷🇸', AM: '🇦🇲', GE: '🇬🇪', IN: '🇮🇳', AE: '🇦🇪', EG: '🇪🇬',
  CU: '🇨🇺', RU: '🇷🇺', ES: '🇪🇸', US: '🇺🇸', DE: '🇩🇪', FR: '🇫🇷',
};

// Países que usan E-visa (visa electrónica)
const EVISA_COUNTRIES = ['GE', 'AM', 'IN', 'AE']; // Georgia, Armenia, India, Dubai

export default function DestinationScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const isDesktop = width > 768;
  const [destination, setDestination] = useState<Destination | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDestination = async () => {
      if (!id) return;
      try {
        const response = await fetch(`${API_URL}/api/destinations/${id}`);
        if (response.ok) {
          const data = await response.json();
          setDestination(data);
        }
      } catch (error) {
        console.error('Error fetching destination:', error);
      }
      setIsLoading(false);
    };
    loadDestination();
  }, [id]);

  const openWhatsApp = (visaType?: string) => {
    const message = visaType 
      ? `Hola, estoy interesado en el ${visaType} para ${destination?.country}.`
      : `Hola, estoy interesado en los servicios de visa para ${destination?.country}.`;
    const url = `https://wa.me/${WHATSAPP_NUMBER.replace('+', '')}?text=${encodeURIComponent(message)}`;
    Linking.openURL(url);
  };

  const openPayPal = () => {
    Linking.openURL(PAYPAL_LINK);
  };

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

  if (!destination) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#0a1628', '#132743', '#0a1628']} style={styles.gradient}>
          <SafeAreaView style={styles.centerContent}>
            <Text style={styles.errorText}>Destino no encontrado</Text>
            <TouchableOpacity style={styles.backButtonLarge} onPress={() => router.back()}>
              <Text style={styles.backButtonText}>Volver</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </LinearGradient>
      </View>
    );
  }

  if (!destination.enabled) {
    return (
      <View style={styles.container}>
        <ImageBackground
          source={{ uri: destination.image_url }}
          style={styles.backgroundImage}
          resizeMode="cover"
        >
          <View style={styles.overlay}>
            <SafeAreaView style={styles.safeArea}>
              <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={24} color="#fff" />
                <Text style={styles.backText}>Volver</Text>
              </TouchableOpacity>
              
              <View style={styles.comingSoonContainer}>
                <Ionicons name="lock-closed" size={60} color="#d4af37" />
                <Text style={styles.countryNameLarge}>
                  {FLAG_EMOJIS[destination.country_code]} {destination.country}
                </Text>
                <Text style={styles.comingSoonText}>{destination.message || 'Muy pronto disponible'}</Text>
                <TouchableOpacity style={styles.notifyButton} onPress={() => openWhatsApp()}>
                  <Ionicons name="notifications" size={20} color="#0a1628" />
                  <Text style={styles.notifyButtonText}>Notificarme cuando esté disponible</Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </View>
        </ImageBackground>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ImageBackground
        source={{ uri: destination.image_url }}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.overlay}>
          <SafeAreaView style={styles.safeArea}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={24} color="#fff" />
                <Text style={styles.backText}>Volver</Text>
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.scrollView}
              contentContainerStyle={[
                styles.scrollContent,
                isDesktop && { maxWidth: 700, alignSelf: 'center', width: '100%' }
              ]}
              showsVerticalScrollIndicator={false}
            >
              {/* Destination Hero */}
              <View style={styles.heroSection}>
                <Text style={styles.flagEmoji}>{FLAG_EMOJIS[destination.country_code]}</Text>
                <Text style={styles.countryName}>{destination.country}</Text>
                {/* E-visa badge */}
                {EVISA_COUNTRIES.includes(destination.country_code) && (
                  <View style={styles.evisaBadge}>
                    <Ionicons name="globe" size={16} color="#4caf50" />
                    <Text style={styles.evisaText}>E-Visa (Electrónica)</Text>
                  </View>
                )}
                <View style={styles.goldLine} />
              </View>

              {/* Visa Types Section */}
              <Text style={styles.sectionTitle}>Tipos de Visa Disponibles</Text>

              {destination.visa_types?.map((visa, index) => (
                <View key={visa.id || index} style={styles.visaCard}>
                  <LinearGradient colors={['#1a2f4a', '#0d1f35']} style={styles.visaCardGradient}>
                    {/* Visa Header */}
                    <View style={styles.visaHeader}>
                      <View style={styles.visaIconContainer}>
                        <FontAwesome5 
                          name={visa.name.toLowerCase().includes('turismo') ? 'umbrella-beach' : 'briefcase'} 
                          size={28} 
                          color="#d4af37" 
                        />
                      </View>
                      <View style={styles.visaBadge}>
                        <Text style={styles.visaBadgeText}>
                          {visa.name.toLowerCase().includes('turismo') ? 'TURISMO' : 'TRABAJO'}
                        </Text>
                      </View>
                    </View>

                    {/* Visa Name */}
                    <Text style={styles.visaName}>{visa.name}</Text>

                    {/* Price Section */}
                    <View style={styles.priceSection}>
                      <Text style={styles.priceLabel}>Precio Total</Text>
                      <Text style={styles.priceValue}>{visa.price} {visa.currency}</Text>
                    </View>

                    {/* Deposit Info */}
                    <View style={styles.depositRow}>
                      <Ionicons name="information-circle" size={18} color="#d4af37" />
                      <Text style={styles.depositText}>
                        Depósito inicial: {visa.price / 2} {visa.currency} (50%)
                      </Text>
                    </View>

                    {/* Processing Time */}
                    <View style={styles.timeRow}>
                      <Ionicons name="time-outline" size={18} color="#8899aa" />
                      <Text style={styles.timeText}>Tiempo de procesamiento: {visa.processing_time}</Text>
                    </View>

                    {/* Requirements */}
                    {visa.requirements && (
                      <View style={styles.requirementsSection}>
                        <Text style={styles.requirementsTitle}>Requisitos:</Text>
                        <Text style={styles.requirementsText}>{visa.requirements}</Text>
                      </View>
                    )}

                    {/* Action Buttons */}
                    <View style={styles.actionButtons}>
                      <TouchableOpacity 
                        style={styles.whatsappButton}
                        onPress={() => openWhatsApp(visa.name)}
                      >
                        <FontAwesome5 name="whatsapp" size={20} color="#fff" />
                        <Text style={styles.whatsappButtonText}>Consultar</Text>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={styles.payButton}
                        onPress={openPayPal}
                      >
                        <FontAwesome5 name="paypal" size={18} color="#fff" />
                        <Text style={styles.payButtonText}>Pagar Depósito</Text>
                      </TouchableOpacity>
                    </View>
                  </LinearGradient>
                </View>
              ))}

              {/* General Requirements */}
              {destination.requirements && (
                <View style={styles.generalRequirements}>
                  <LinearGradient colors={['rgba(212, 175, 55, 0.15)', 'rgba(212, 175, 55, 0.05)']} style={styles.reqGradient}>
                    <View style={styles.reqHeader}>
                      <Ionicons name="document-text" size={24} color="#d4af37" />
                      <Text style={styles.reqTitle}>Requisitos Generales</Text>
                    </View>
                    <Text style={styles.reqText}>{destination.requirements}</Text>
                  </LinearGradient>
                </View>
              )}

              {/* Important Notice */}
              <View style={styles.noticeSection}>
                <Ionicons name="alert-circle" size={20} color="#d4af37" />
                <Text style={styles.noticeText}>
                  * No incluye pasaje — solo gestión y asesoría profesional
                </Text>
              </View>

              {/* Contact Section */}
              <View style={styles.contactSection}>
                <TouchableOpacity style={styles.mainContactButton} onPress={() => openWhatsApp()}>
                  <LinearGradient colors={['#25D366', '#128C7E']} style={styles.contactGradient}>
                    <FontAwesome5 name="whatsapp" size={24} color="#fff" />
                    <Text style={styles.mainContactText}>Hablar con un Asesor</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* Footer */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>Cuban-Serbia Visa Center © 2025</Text>
                <Text style={styles.footerContact}>
                  <Ionicons name="call" size={12} color="#d4af37" /> +381 69 344 4935
                </Text>
              </View>
            </ScrollView>
          </SafeAreaView>
        </View>
      </ImageBackground>
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
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 22, 40, 0.85)',
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
    color: '#fff',
    fontSize: 18,
    marginBottom: 20,
  },
  backButtonLarge: {
    backgroundColor: '#d4af37',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#0a1628',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backText: {
    color: '#fff',
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  flagEmoji: {
    fontSize: 60,
    marginBottom: 10,
  },
  countryName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  evisaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.5)',
  },
  evisaText: {
    color: '#4caf50',
    fontSize: 14,
    fontWeight: '600',
  },
  goldLine: {
    width: 60,
    height: 3,
    backgroundColor: '#d4af37',
    marginTop: 15,
    borderRadius: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#d4af37',
    marginBottom: 20,
    marginTop: 10,
    textAlign: 'center',
  },
  visaCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.4)',
  },
  visaCardGradient: {
    padding: 20,
  },
  visaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  visaIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  visaBadge: {
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d4af37',
  },
  visaBadgeText: {
    color: '#d4af37',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  visaName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 15,
  },
  priceSection: {
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 12,
    color: '#8899aa',
    marginBottom: 5,
  },
  priceValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#d4af37',
  },
  depositRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  depositText: {
    fontSize: 14,
    color: '#d4af37',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 15,
  },
  timeText: {
    fontSize: 14,
    color: '#8899aa',
  },
  requirementsSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  requirementsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#d4af37',
    marginBottom: 5,
  },
  requirementsText: {
    fontSize: 13,
    color: '#aabbcc',
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  whatsappButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    padding: 14,
    borderRadius: 10,
    gap: 8,
  },
  whatsappButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  payButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0070ba',
    padding: 14,
    borderRadius: 10,
    gap: 8,
  },
  payButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  generalRequirements: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  reqGradient: {
    padding: 15,
  },
  reqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  reqTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#d4af37',
  },
  reqText: {
    fontSize: 14,
    color: '#aabbcc',
    lineHeight: 22,
  },
  noticeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    padding: 15,
    borderRadius: 10,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    color: '#d4af37',
  },
  contactSection: {
    marginTop: 25,
  },
  mainContactButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  contactGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    gap: 12,
  },
  mainContactText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
    marginTop: 30,
    paddingTop: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#667788',
    marginBottom: 5,
  },
  footerContact: {
    fontSize: 12,
    color: '#667788',
  },
  // Coming Soon styles
  comingSoonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  countryNameLarge: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
    marginBottom: 15,
    textAlign: 'center',
  },
  comingSoonText: {
    fontSize: 18,
    color: '#d4af37',
    textAlign: 'center',
    marginBottom: 30,
  },
  notifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d4af37',
    paddingHorizontal: 25,
    paddingVertical: 14,
    borderRadius: 10,
    gap: 10,
  },
  notifyButtonText: {
    color: '#0a1628',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
