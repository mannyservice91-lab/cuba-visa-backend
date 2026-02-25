import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_URL } from '../src/config/api';

interface ProviderInfo {
  id: string;
  business_name: string;
  owner_name: string;
  whatsapp_number: string;
  whatsapp_group_link: string;
  service_type: string;
  description: string;
}

interface Offer {
  id: string;
  title: string;
  description: string;
  image_data: string;
  exchange_rate: string;
  expires_at: string | null;
  created_at: string;
}

const SERVICE_TYPE_CONFIG: Record<string, { icon: string; color: string; emoji: string; label: string }> = {
  remesas: { icon: 'cash-outline', color: '#4caf50', emoji: '💵', label: 'Remesas' },
  pasajes: { icon: 'airplane-outline', color: '#2196f3', emoji: '✈️', label: 'Pasajes' },
  tienda: { icon: 'storefront-outline', color: '#ff9800', emoji: '🛒', label: 'Tienda' },
  restaurante: { icon: 'restaurant-outline', color: '#e91e63', emoji: '🍽️', label: 'Restaurante' },
  servicios: { icon: 'construct-outline', color: '#9c27b0', emoji: '🔧', label: 'Servicios' },
};

export default function ProviderOffersScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [provider, setProvider] = useState<ProviderInfo | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadProviderOffers();
  }, [id]);

  const loadProviderOffers = async () => {
    if (!id) {
      setError('Proveedor no especificado');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/service-providers/${id}/offers`);
      if (response.ok) {
        const data = await response.json();
        setProvider(data.provider);
        setOffers(data.offers);
      } else {
        setError('No se pudo cargar la información del proveedor');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const openWhatsApp = () => {
    if (!provider) return;
    const message = `Hola, vi su perfil en la app Cuban-Serbia Visa Center (${provider.business_name}).`;
    const url = `https://wa.me/${provider.whatsapp_number.replace('+', '')}?text=${encodeURIComponent(message)}`;
    Linking.openURL(url);
  };

  const openWhatsAppGroup = () => {
    if (provider?.whatsapp_group_link) {
      Linking.openURL(provider.whatsapp_group_link);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#d4af37" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !provider) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#d4af37" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Error</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={60} color="#f44336" />
          <Text style={styles.errorText}>{error || 'Proveedor no encontrado'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => router.back()}>
            <Text style={styles.retryBtnText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const typeConfig = SERVICE_TYPE_CONFIG[provider.service_type] || SERVICE_TYPE_CONFIG.servicios;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#d4af37" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{provider.business_name}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Provider Header Card */}
        <View style={styles.providerCard}>
          <View style={[styles.iconBg, { backgroundColor: `${typeConfig.color}25` }]}>
            <Text style={styles.iconEmoji}>{typeConfig.emoji}</Text>
          </View>
          <Text style={styles.providerName}>{provider.business_name}</Text>
          {provider.owner_name && (
            <Text style={styles.ownerName}>con {provider.owner_name}</Text>
          )}
          <View style={[styles.typeBadge, { backgroundColor: `${typeConfig.color}20` }]}>
            <Ionicons name={typeConfig.icon as any} size={14} color={typeConfig.color} />
            <Text style={[styles.typeBadgeText, { color: typeConfig.color }]}>{typeConfig.label}</Text>
          </View>
          {provider.description && (
            <Text style={styles.providerDescription}>{provider.description}</Text>
          )}
          
          {/* Contact Buttons */}
          <View style={styles.contactButtons}>
            <TouchableOpacity style={styles.whatsappBtn} onPress={openWhatsApp}>
              <FontAwesome5 name="whatsapp" size={18} color="#fff" />
              <Text style={styles.whatsappBtnText}>Contactar por WhatsApp</Text>
            </TouchableOpacity>
            {provider.whatsapp_group_link && (
              <TouchableOpacity style={styles.groupBtn} onPress={openWhatsAppGroup}>
                <Ionicons name="people" size={18} color="#d4af37" />
                <Text style={styles.groupBtnText}>Unirse al Grupo</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Offers Section */}
        <View style={styles.offersSection}>
          <Text style={styles.sectionTitle}>
            {offers.length > 0 ? `Ofertas Disponibles (${offers.length})` : 'Sin ofertas activas'}
          </Text>

          {offers.length === 0 ? (
            <View style={styles.emptyOffers}>
              <Ionicons name="pricetag-outline" size={50} color="#667788" />
              <Text style={styles.emptyText}>Este proveedor no tiene ofertas activas</Text>
              <Text style={styles.emptySubtext}>Puedes contactarlo directamente por WhatsApp</Text>
            </View>
          ) : (
            offers.map((offer) => (
              <View key={offer.id} style={styles.offerCard}>
                {offer.image_data && (
                  <Image source={{ uri: offer.image_data }} style={styles.offerImage} />
                )}
                <View style={styles.offerContent}>
                  <Text style={styles.offerTitle}>{offer.title}</Text>
                  <Text style={styles.offerDescription}>{offer.description}</Text>
                  
                  {offer.exchange_rate && (
                    <View style={styles.exchangeRateBox}>
                      <Ionicons name="pricetag" size={18} color="#4caf50" />
                      <Text style={styles.exchangeRateText}>{offer.exchange_rate}</Text>
                    </View>
                  )}
                  
                  {offer.expires_at && (
                    <View style={styles.expiryRow}>
                      <Ionicons name="time-outline" size={14} color="#ff9800" />
                      <Text style={styles.expiryText}>
                        Válido hasta: {new Date(offer.expires_at).toLocaleDateString()}
                      </Text>
                    </View>
                  )}

                  <TouchableOpacity style={styles.offerContactBtn} onPress={openWhatsApp}>
                    <FontAwesome5 name="whatsapp" size={14} color="#fff" />
                    <Text style={styles.offerContactText}>Consultar esta oferta</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a1628',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212, 175, 55, 0.2)',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d4af37',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#f44336',
    textAlign: 'center',
    marginTop: 16,
  },
  retryBtn: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 30,
    backgroundColor: '#d4af37',
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#0a1628',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  providerCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    marginBottom: 20,
  },
  iconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconEmoji: {
    fontSize: 40,
  },
  providerName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 4,
  },
  ownerName: {
    fontSize: 14,
    color: '#8899aa',
    marginBottom: 12,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    gap: 6,
    marginBottom: 12,
  },
  typeBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  providerDescription: {
    fontSize: 14,
    color: '#aaaaaa',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  contactButtons: {
    width: '100%',
    gap: 10,
    marginTop: 8,
  },
  whatsappBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 10,
  },
  whatsappBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  groupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#d4af37',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 10,
  },
  groupBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#d4af37',
  },
  offersSection: {
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d4af37',
    marginBottom: 16,
  },
  emptyOffers: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#8899aa',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 13,
    color: '#667788',
    marginTop: 8,
    textAlign: 'center',
  },
  offerCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
  },
  offerTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  offerDescription: {
    fontSize: 14,
    color: '#aaaaaa',
    lineHeight: 20,
    marginBottom: 12,
  },
  exchangeRateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    padding: 12,
    borderRadius: 10,
    gap: 10,
    marginBottom: 10,
  },
  exchangeRateText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4caf50',
  },
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  expiryText: {
    fontSize: 13,
    color: '#ff9800',
  },
  offerContactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  offerContactText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
