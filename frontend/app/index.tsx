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
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient/build/LinearGradient';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const WHATSAPP_NUMBER = '+381693444935';
const PAYPAL_LINK = 'https://paypal.me/Gonzalezjm91';
const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

const VISA_PRICES = {
  turismo: { price: 1500, name: 'Visado de Turismo' },
  trabajo: { price: 2500, name: 'Visado por Contrato de Trabajo' },
};

interface Testimonial {
  id: string;
  client_name: string;
  visa_type: string;
  description: string;
  image_data: string;
  created_at: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loadingTestimonials, setLoadingTestimonials] = useState(true);

  useEffect(() => {
    fetchTestimonials();
  }, []);

  const fetchTestimonials = async () => {
    try {
      const response = await fetch(`${API_URL}/api/testimonials`);
      if (response.ok) {
        const data = await response.json();
        setTestimonials(data);
      }
    } catch (error) {
      console.error('Error fetching testimonials:', error);
    } finally {
      setLoadingTestimonials(false);
    }
  };

  const openWhatsApp = () => {
    const message = 'Hola, estoy interesado en los servicios de visa para Serbia.';
    const url = `https://wa.me/${WHATSAPP_NUMBER.replace('+', '')}?text=${encodeURIComponent(message)}`;
    Linking.openURL(url);
  };

  const openPayPal = () => {
    Linking.openURL(PAYPAL_LINK);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0a1628', '#132743', '#0a1628']}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safeArea}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <MaterialCommunityIcons name="passport" size={40} color="#d4af37" />
                <View style={styles.logoTextContainer}>
                  <Text style={styles.logoText}>CUBAN-SERBIA</Text>
                  <Text style={styles.logoSubtext}>VISA CENTER</Text>
                </View>
              </View>
              <View style={styles.flagsContainer}>
                <Text style={styles.flag}>🇨🇺</Text>
                <Ionicons name="airplane" size={20} color="#d4af37" />
                <Text style={styles.flag}>🇷🇸</Text>
              </View>
            </View>

            {/* Hero Section */}
            <View style={styles.heroSection}>
              <Text style={styles.heroTitle}>Tu Puerta a Serbia</Text>
              <Text style={styles.heroSubtitle}>
                Gestión profesional de visados para cubanos
              </Text>
              <View style={styles.goldLine} />
            </View>

            {/* Services Cards */}
            <View style={styles.servicesSection}>
              <Text style={styles.sectionTitle}>Nuestros Servicios</Text>
              
              {/* Tourism Visa Card */}
              <View style={styles.serviceCard}>
                <LinearGradient
                  colors={['#1a2f4a', '#0d1f35']}
                  style={styles.cardGradient}
                >
                  <View style={styles.cardHeader}>
                    <FontAwesome5 name="umbrella-beach" size={28} color="#d4af37" />
                    <View style={styles.cardBadge}>
                      <Text style={styles.badgeText}>TURISMO</Text>
                    </View>
                  </View>
                  <Text style={styles.cardTitle}>{VISA_PRICES.turismo.name}</Text>
                  <View style={styles.priceContainer}>
                    <Text style={styles.priceLabel}>Precio Total</Text>
                    <Text style={styles.price}>{VISA_PRICES.turismo.price} EUR</Text>
                  </View>
                  <View style={styles.depositInfo}>
                    <Ionicons name="information-circle" size={16} color="#d4af37" />
                    <Text style={styles.depositText}>
                      Depósito inicial: {VISA_PRICES.turismo.price / 2} EUR (50%)
                    </Text>
                  </View>
                  <Text style={styles.processingTime}>
                    <Ionicons name="time-outline" size={14} color="#8899aa" /> Tiempo: 1-2 meses
                  </Text>
                </LinearGradient>
              </View>

              {/* Work Visa Card */}
              <View style={styles.serviceCard}>
                <LinearGradient
                  colors={['#1a2f4a', '#0d1f35']}
                  style={styles.cardGradient}
                >
                  <View style={styles.cardHeader}>
                    <FontAwesome5 name="briefcase" size={28} color="#d4af37" />
                    <View style={[styles.cardBadge, styles.workBadge]}>
                      <Text style={styles.badgeText}>TRABAJO</Text>
                    </View>
                  </View>
                  <Text style={styles.cardTitle}>{VISA_PRICES.trabajo.name}</Text>
                  <View style={styles.priceContainer}>
                    <Text style={styles.priceLabel}>Precio Total</Text>
                    <Text style={styles.price}>{VISA_PRICES.trabajo.price} EUR</Text>
                  </View>
                  <View style={styles.depositInfo}>
                    <Ionicons name="information-circle" size={16} color="#d4af37" />
                    <Text style={styles.depositText}>
                      Depósito inicial: {VISA_PRICES.trabajo.price / 2} EUR (50%)
                    </Text>
                  </View>
                  <Text style={styles.processingTime}>
                    <Ionicons name="time-outline" size={14} color="#8899aa" /> Tiempo: 1-2 meses
                  </Text>
                </LinearGradient>
              </View>
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
                      <LinearGradient
                        colors={['#1a2f4a', '#0d1f35']}
                        style={styles.testimonialGradient}
                      >
                        {testimonial.image_data && (
                          <Image
                            source={{ uri: `data:image/jpeg;base64,${testimonial.image_data}` }}
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
                      </LinearGradient>
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <View style={styles.noTestimonials}>
                  <Ionicons name="images-outline" size={40} color="#667788" />
                  <Text style={styles.noTestimonialsText}>
                    Próximamente fotos de visas aprobadas
                  </Text>
                </View>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsSection}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => router.push('/login')}
              >
                <LinearGradient
                  colors={['#d4af37', '#b8962f']}
                  style={styles.buttonGradient}
                >
                  <Ionicons name="person" size={22} color="#0a1628" />
                  <Text style={styles.primaryButtonText}>Iniciar Sesión</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => router.push('/register')}
              >
                <Ionicons name="person-add" size={22} color="#d4af37" />
                <Text style={styles.secondaryButtonText}>Registrarse</Text>
              </TouchableOpacity>

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
                <Ionicons name="call" size={12} color="#667788" /> +381 69 344 4935
              </Text>
            </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
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
    color: '#8899aa',
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
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  cardGradient: {
    padding: 20,
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
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    padding: 15,
    borderRadius: 12,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#d4af37',
  },
  // Testimonials Styles
  testimonialsSection: {
    marginVertical: 20,
  },
  testimonialSubtitle: {
    fontSize: 14,
    color: '#8899aa',
    textAlign: 'center',
    marginTop: -15,
    marginBottom: 20,
  },
  testimonialScroll: {
    paddingVertical: 10,
  },
  testimonialCard: {
    width: width * 0.7,
    marginRight: 15,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  testimonialGradient: {
    padding: 0,
  },
  testimonialImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#0d1f35',
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
    color: '#8899aa',
    lineHeight: 18,
  },
  noTestimonials: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: 'rgba(212, 175, 55, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
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
});
