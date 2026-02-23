import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Dimensions,
  Image,
  ActivityIndicator,
  ImageBackground,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient/build/LinearGradient';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { API_URL } from '../src/config/api';
import { APP_DOWNLOAD_LINKS, COMPANY_INFO } from '../src/config/constants';

const WHATSAPP_NUMBER = COMPANY_INFO.whatsapp;
const PAYPAL_LINK = COMPANY_INFO.paypal;

// Logo y fondo de la marca
const LOGO_IMAGE = require('../assets/images/logo.png');
const HERO_BACKGROUND = require('../assets/images/hero-background.png');

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
  message: string;
}

interface Testimonial {
  id: string;
  client_name: string;
  visa_type: string;
  description: string;
  image_data: string;
  created_at: string;
}

const FLAG_EMOJIS: Record<string, string> = {
  RS: '🇷🇸', AM: '🇦🇲', GE: '🇬🇪', IN: '🇮🇳', AE: '🇦🇪', EG: '🇪🇬',
  CU: '🇨🇺', RU: '🇷🇺', ES: '🇪🇸', US: '🇺🇸', DE: '🇩🇪', FR: '🇫🇷',
};

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isDesktop = width > 768;
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loadingDestinations, setLoadingDestinations] = useState(true);
  const [loadingTestimonials, setLoadingTestimonials] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      // Load destinations
      try {
        const destResponse = await fetch(`${API_URL}/api/destinations`);
        const destData = await destResponse.json();
        setDestinations(destData || []);
      } catch (error) {
        console.error('Error fetching destinations:', error);
      }
      setLoadingDestinations(false);

      // Load testimonials
      setLoadingTestimonials(true);
      try {
        const response = await fetch(`${API_URL}/api/testimonials`);
        const data = await response.json();
        setTestimonials(data || []);
      } catch (error) {
        console.error('Error fetching testimonials:', error);
        setTestimonials([]);
      }
      setLoadingTestimonials(false);
    };
    loadData();
  }, []);

  const openWhatsApp = (destination?: string) => {
    const message = destination 
      ? `Hola, estoy interesado en los servicios de visa para ${destination}.`
      : 'Hola, estoy interesado en los servicios de visa.';
    const url = `https://wa.me/${WHATSAPP_NUMBER.replace('+', '')}?text=${encodeURIComponent(message)}`;
    Linking.openURL(url);
  };

  const openPayPal = () => {
    Linking.openURL(PAYPAL_LINK);
  };

  const handleDestinationSelect = (destination: Destination) => {
    // Navigate to destination detail page
    router.push(`/destination/${destination.id}`);
  };

  // Dynamic styles for responsive design
  const containerMaxWidth = isDesktop ? 900 : '100%';

  return (
    <View style={styles.container}>
      <ImageBackground
        source={HERO_BACKGROUND}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.overlay}>
          <SafeAreaView style={styles.safeArea}>
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={[
                styles.scrollContent,
                isDesktop && { alignItems: 'center' }
              ]}
              showsVerticalScrollIndicator={false}
            >
              <View style={[styles.contentWrapper, { maxWidth: containerMaxWidth, width: '100%' }]}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.logoContainer}>
                  <Image 
                    source={LOGO_IMAGE} 
                    style={{ width: isDesktop ? 60 : 50, height: isDesktop ? 60 : 50, borderRadius: 12 }} 
                  />
                  <View style={styles.logoTextContainer}>
                    <Text style={[styles.logoText, isDesktop && { fontSize: 28 }]}>CUBAN-SERBIA</Text>
                    <Text style={[styles.logoSubtext, isDesktop && { fontSize: 14 }]}>VISA CENTER</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => router.push('/admin')} style={styles.adminButton}>
                  <Ionicons name="settings-outline" size={24} color="#667788" />
                </TouchableOpacity>
              </View>

              {/* Hero Section */}
              <View style={styles.heroSection}>
                <Text style={[styles.heroTitle, isDesktop && { fontSize: 42 }]}>
                  Tu Puerta al Mundo
                </Text>
                <Text style={[styles.heroSubtitle, isDesktop && { fontSize: 18 }]}>
                  Gestión profesional de visados para cubanos
                </Text>
                <View style={styles.goldLine} />
              </View>

              {/* Destinations Section */}
              <View style={styles.destinationsSection}>
                <Text style={styles.sectionTitle}>Destinos Disponibles</Text>
                <Text style={styles.sectionSubtitle}>Seleccione un país para ver opciones de visa</Text>
                
                {loadingDestinations ? (
                  <ActivityIndicator size="large" color="#d4af37" />
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.destinationsScroll}
                  >
                    {destinations.map((destination) => (
                      <TouchableOpacity
                        key={destination.id}
                        style={[
                          styles.destinationCard,
                          !destination.enabled && styles.destinationCardDisabled,
                        ]}
                        onPress={() => handleDestinationSelect(destination)}
                        activeOpacity={0.7}
                      >
                        {destination.image_url ? (
                          <Image
                            source={{ uri: destination.image_url }}
                            style={styles.destinationImage}
                          />
                        ) : (
                          <View style={[styles.destinationImage, styles.destinationImagePlaceholder]}>
                            <Text style={styles.flagLarge}>
                              {FLAG_EMOJIS[destination.country_code] || '🌍'}
                            </Text>
                          </View>
                        )}
                        <View style={styles.destinationOverlay}>
                          {!destination.enabled && (
                            <View style={styles.lockBadge}>
                              <Ionicons name="lock-closed" size={14} color="#fff" />
                              <Text style={styles.lockText}>Pronto</Text>
                            </View>
                          )}
                          <Text style={styles.destinationFlag}>
                            {FLAG_EMOJIS[destination.country_code] || '🌍'}
                          </Text>
                          <Text style={styles.destinationName}>{destination.country}</Text>
                          {destination.enabled && destination.visa_types?.length > 0 && (
                            <Text style={styles.destinationPrice}>
                              desde {Math.min(...destination.visa_types.map(v => v.price))} EUR
                            </Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>

              {/* Important Info */}
              <View style={styles.infoSection}>
                <View style={styles.infoCard}>
                  <Ionicons name="alert-circle" size={24} color="#d4af37" />
                  <Text style={styles.infoText}>
                    * No incluye pasaje — solo gestión y asesoría
                  </Text>
                </View>
              </View>

              {/* User Access Section */}
              <View style={styles.userAccessSection}>
                <Text style={styles.accessTitle}>¿Ya tienes una solicitud?</Text>
                <View style={styles.accessButtons}>
                  <TouchableOpacity 
                    style={styles.loginBtn}
                    onPress={() => router.push('/login')}
                  >
                    <LinearGradient colors={['#d4af37', '#b8962f']} style={styles.loginBtnGradient}>
                      <Ionicons name="log-in" size={20} color="#0a1628" />
                      <Text style={styles.loginBtnText}>Iniciar Sesión</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.registerBtn}
                    onPress={() => router.push('/register')}
                  >
                    <Ionicons name="person-add" size={20} color="#d4af37" />
                    <Text style={styles.registerBtnText}>Registrarse</Text>
                  </TouchableOpacity>
                </View>
              </View>

            {/* Testimonials Section - Clientes Satisfechos */}
            <View style={styles.testimonialsSection}>
              <Text style={styles.sectionTitle}>Clientes Satisfechos</Text>
              <Text style={styles.testimonialSubtitle}>Visas aprobadas exitosamente</Text>
              
              {loadingTestimonials ? (
                <ActivityIndicator size="large" color="#d4af37" style={styles.loader} />
              ) : testimonials.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.testimonialScroll}
                >
                  {testimonials.map((testimonial) => (
                    <View key={testimonial.id} style={styles.testimonialCard}>
                      <View style={styles.testimonialGradientAlt}>
                        {testimonial.image_data && (
                          <Image
                            source={{ uri: testimonial.image_data.startsWith('data:') ? testimonial.image_data : `data:image/jpeg;base64,${testimonial.image_data}` }}
                            style={styles.testimonialImage}
                            resizeMode="cover"
                          />
                        )}
                        <View style={styles.testimonialInfo}>
                          <Text style={styles.testimonialName}>{testimonial.client_name}</Text>
                          <View style={styles.testimonialBadge}>
                            <Ionicons name="checkmark-circle" size={14} color="#4caf50" />
                            <Text style={styles.testimonialType}>
                              {testimonial.visa_type === 'turismo' ? 'Visa Turismo' : 'Visa Trabajo'}
                            </Text>
                          </View>
                          <Text style={styles.testimonialDesc} numberOfLines={2}>
                            {testimonial.description}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <View style={styles.noTestimonials}>
                  <Ionicons name="images-outline" size={40} color="#d4af37" />
                  <Text style={styles.noTestimonialsText}>
                    Próximamente fotos de visas aprobadas
                  </Text>
                </View>
              )}
            </View>

            {/* Action Buttons - Contact */}
            <View style={styles.actionsSection}>
              <TouchableOpacity
                style={styles.whatsappButton}
                onPress={openWhatsApp}
              >
                <FontAwesome5 name="whatsapp" size={24} color="#fff" />
                <Text style={styles.whatsappButtonText}>Hablar por WhatsApp</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.paypalButton}
                onPress={openPayPal}
              >
                <FontAwesome5 name="paypal" size={22} color="#fff" />
                <Text style={styles.paypalButtonText}>Pagar con PayPal</Text>
              </TouchableOpacity>
            </View>

            {/* Admin Access */}
            <TouchableOpacity
              style={styles.adminLink}
              onPress={() => router.push('/admin')}
            >
              <Ionicons name="settings" size={16} color="#667788" />
              <Text style={styles.adminLinkText}>Panel Admin</Text>
            </TouchableOpacity>

            {/* Footer */}
            <View style={styles.footer}>
              <View style={styles.footerLine} />
              <Text style={styles.footerText}>Cuban-Serbia Visa Center © 2025</Text>
              <Text style={styles.footerContact}>
                <Ionicons name="call" size={12} color="#d4af37" /> +381 69 344 4935
              </Text>
            </View>
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
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 22, 40, 0.75)',
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  contentWrapper: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoTextContainer: {
    marginLeft: 10,
  },
  logoText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#d4af37',
    letterSpacing: 2,
  },
  logoSubtext: {
    fontSize: 10,
    color: '#d4af37',
    letterSpacing: 3,
  },
  flagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  flag: {
    fontSize: 24,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 10,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#8899aa',
    textAlign: 'center',
  },
  goldLine: {
    width: 60,
    height: 3,
    backgroundColor: '#d4af37',
    marginTop: 20,
    borderRadius: 2,
  },
  servicesSection: {
    marginTop: 20,
  },
  servicesSectionDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  cardsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#d4af37',
    marginBottom: 20,
    textAlign: 'center',
  },
  serviceCard: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.5)',
  },
  cardGradient: {
    padding: 20,
  },
  cardGradientAlt: {
    padding: 20,
    backgroundColor: 'rgba(10, 22, 40, 0.8)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  cardBadge: {
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d4af37',
  },
  workBadge: {
    backgroundColor: 'rgba(212, 175, 55, 0.3)',
  },
  badgeText: {
    color: '#d4af37',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 15,
  },
  priceContainer: {
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
  },
  priceLabel: {
    fontSize: 12,
    color: '#8899aa',
    marginBottom: 5,
  },
  price: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#d4af37',
  },
  depositInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  depositText: {
    fontSize: 14,
    color: '#d4af37',
  },
  processingTime: {
    fontSize: 13,
    color: '#8899aa',
  },
  infoSection: {
    marginVertical: 20,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 22, 40, 0.7)',
    padding: 15,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.5)',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#d4af37',
  },
  // User Access Styles
  userAccessSection: {
    marginTop: 10,
    marginBottom: 20,
    alignItems: 'center',
  },
  accessTitle: {
    fontSize: 16,
    color: '#8899aa',
    marginBottom: 15,
  },
  accessButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    justifyContent: 'center',
  },
  loginBtn: {
    flex: 1,
    maxWidth: 180,
    borderRadius: 10,
    overflow: 'hidden',
  },
  loginBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    gap: 8,
  },
  loginBtnText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0a1628',
  },
  registerBtn: {
    flex: 1,
    maxWidth: 180,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d4af37',
  },
  registerBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#d4af37',
  },
  // Testimonials Styles
  testimonialsSection: {
    marginVertical: 20,
  },
  testimonialSubtitle: {
    fontSize: 14,
    color: '#d4af37',
    textAlign: 'center',
    marginTop: -15,
    marginBottom: 20,
  },
  testimonialScroll: {
    paddingVertical: 10,
  },
  testimonialCard: {
    width: 280,
    marginRight: 15,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.5)',
  },
  testimonialGradient: {
    padding: 0,
  },
  testimonialGradientAlt: {
    backgroundColor: 'rgba(10, 22, 40, 0.85)',
  },
  testimonialImage: {
    width: '100%',
    height: 150,
    backgroundColor: 'rgba(10, 22, 40, 0.5)',
  },
  testimonialInfo: {
    padding: 15,
  },
  testimonialName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 5,
  },
  testimonialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
  },
  testimonialType: {
    fontSize: 12,
    color: '#4caf50',
  },
  testimonialDesc: {
    fontSize: 13,
    color: '#cccccc',
    lineHeight: 18,
  },
  noTestimonials: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: 'rgba(10, 22, 40, 0.7)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.5)',
  },
  noTestimonialsText: {
    fontSize: 14,
    color: '#667788',
    marginTop: 10,
    textAlign: 'center',
  },
  loader: {
    marginVertical: 30,
  },
  actionsSection: {
    gap: 15,
    marginTop: 10,
  },
  primaryButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 10,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0a1628',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d4af37',
    gap: 10,
  },
  secondaryButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d4af37',
  },
  whatsappButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#25D366',
    gap: 10,
  },
  whatsappButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  paypalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#0070ba',
    gap: 10,
  },
  paypalButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  adminLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
    gap: 5,
  },
  adminLinkText: {
    fontSize: 14,
    color: '#667788',
  },
  footer: {
    alignItems: 'center',
    marginTop: 30,
    paddingTop: 20,
  },
  footerLine: {
    width: 40,
    height: 2,
    backgroundColor: 'rgba(212, 175, 55, 0.3)',
    marginBottom: 15,
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
  adminButton: {
    padding: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#8899aa',
    textAlign: 'center',
    marginBottom: 15,
    marginTop: -10,
  },
  destinationsSection: {
    marginTop: 20,
    marginBottom: 10,
  },
  destinationsScroll: {
    paddingVertical: 10,
    gap: 12,
  },
  destinationCard: {
    width: 140,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    marginRight: 12,
  },
  destinationCardSelected: {
    borderColor: '#d4af37',
  },
  destinationCardDisabled: {
    opacity: 0.6,
  },
  destinationImage: {
    width: '100%',
    height: '100%',
  },
  destinationImagePlaceholder: {
    backgroundColor: '#1a2f4a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  destinationOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    backgroundColor: 'rgba(10, 22, 40, 0.85)',
    alignItems: 'center',
  },
  lockBadge: {
    position: 'absolute',
    top: -130,
    right: 5,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  lockText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  flagLarge: {
    fontSize: 40,
  },
  destinationFlag: {
    fontSize: 20,
    marginBottom: 4,
  },
  destinationName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  destinationPrice: {
    fontSize: 11,
    color: '#d4af37',
    marginTop: 2,
  },
  visaTypesSection: {
    marginTop: 15,
    marginBottom: 10,
  },
  selectedDestHeader: {
    marginBottom: 15,
  },
  selectedDestTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d4af37',
    textAlign: 'center',
  },
  visaTypeCard: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  visaTypeGradient: {
    padding: 15,
  },
  visaTypeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  visaTypeBadge: {
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#d4af37',
  },
  visaTypeBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#d4af37',
    letterSpacing: 1,
  },
  visaTypeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 10,
  },
  visaTypePriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  visaTypePrice: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#d4af37',
  },
  visaTypeTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  visaTypeTimeText: {
    fontSize: 12,
    color: '#8899aa',
  },
  consultButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(37, 211, 102, 0.15)',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    gap: 8,
  },
  consultButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#25D366',
  },
});

