import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../src/config/api';

interface ServiceProvider {
  id: string;
  email: string;
  business_name: string;
  owner_name: string;
  phone: string;
  whatsapp_number: string;
  whatsapp_group_link: string;
  service_type: string;
  description: string;
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

export default function AdminProvidersScreen() {
  const router = useRouter();
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      const token = await AsyncStorage.getItem('adminToken');
      if (!token) {
        router.replace('/admin');
        return;
      }

      const response = await fetch(`${API_URL}/api/admin/service-providers`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setProviders(data);
      }
    } catch (error) {
      console.error('Error loading providers:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleProvider = async (providerId: string) => {
    try {
      const token = await AsyncStorage.getItem('adminToken');
      const response = await fetch(
        `${API_URL}/api/admin/service-providers/${providerId}/toggle`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        loadProviders();
      }
    } catch (error) {
      console.error('Error toggling provider:', error);
    }
  };

  const deleteProvider = async (providerId: string, businessName: string) => {
    const confirmDelete = () => {
      return new Promise((resolve) => {
        if (Platform.OS === 'web') {
          resolve(window.confirm(`¿Eliminar proveedor "${businessName}" y todas sus ofertas?`));
        } else {
          Alert.alert(
            'Confirmar eliminación',
            `¿Eliminar proveedor "${businessName}" y todas sus ofertas?`,
            [
              { text: 'Cancelar', onPress: () => resolve(false), style: 'cancel' },
              { text: 'Eliminar', onPress: () => resolve(true), style: 'destructive' },
            ]
          );
        }
      });
    };

    const confirmed = await confirmDelete();
    if (!confirmed) return;

    try {
      const token = await AsyncStorage.getItem('adminToken');
      const response = await fetch(
        `${API_URL}/api/admin/service-providers/${providerId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        loadProviders();
      }
    } catch (error) {
      console.error('Error deleting provider:', error);
    }
  };

  const filteredProviders = providers.filter(
    (p) =>
      p.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.owner_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getServiceTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      remesas: 'Remesas',
      tienda: 'Tienda',
      restaurante: 'Restaurante',
      servicios: 'Servicios',
    };
    return types[type] || type;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#d4af37" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Proveedores de Servicios</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#667788" />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar proveedor..."
          placeholderTextColor="#667788"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{providers.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statCard, styles.statCardActive]}>
          <Text style={styles.statNumber}>
            {providers.filter((p) => p.is_active).length}
          </Text>
          <Text style={styles.statLabel}>Activos</Text>
        </View>
        <View style={[styles.statCard, styles.statCardPending]}>
          <Text style={styles.statNumber}>
            {providers.filter((p) => !p.is_active).length}
          </Text>
          <Text style={styles.statLabel}>Pendientes</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#d4af37" style={styles.loader} />
      ) : (
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {filteredProviders.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="storefront-outline" size={60} color="#667788" />
              <Text style={styles.emptyText}>
                {searchQuery ? 'No se encontraron proveedores' : 'No hay proveedores registrados'}
              </Text>
            </View>
          ) : (
            filteredProviders.map((provider) => (
              <View key={provider.id} style={styles.providerCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.businessInfo}>
                    <Ionicons
                      name={provider.service_type === 'remesas' ? 'cash-outline' : 'storefront-outline'}
                      size={24}
                      color="#d4af37"
                    />
                    <View style={styles.businessTexts}>
                      <Text style={styles.businessName}>{provider.business_name}</Text>
                      <Text style={styles.ownerName}>{provider.owner_name}</Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      provider.is_active ? styles.statusActive : styles.statusPending,
                    ]}
                  >
                    <Text style={styles.statusText}>
                      {provider.is_active ? 'Activo' : 'Pendiente'}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardDetails}>
                  <View style={styles.detailRow}>
                    <Ionicons name="pricetag-outline" size={16} color="#8899aa" />
                    <Text style={styles.detailText}>
                      {getServiceTypeLabel(provider.service_type)}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="mail-outline" size={16} color="#8899aa" />
                    <Text style={styles.detailText}>{provider.email}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
                    <Text style={styles.detailText}>{provider.whatsapp_number}</Text>
                  </View>
                  {provider.description && (
                    <View style={styles.detailRow}>
                      <Ionicons name="document-text-outline" size={16} color="#8899aa" />
                      <Text style={styles.detailText} numberOfLines={2}>
                        {provider.description}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      provider.is_active ? styles.deactivateButton : styles.activateButton,
                    ]}
                    onPress={() => toggleProvider(provider.id)}
                  >
                    <Ionicons
                      name={provider.is_active ? 'close-circle' : 'checkmark-circle'}
                      size={18}
                      color="#fff"
                    />
                    <Text style={styles.actionButtonText}>
                      {provider.is_active ? 'Desactivar' : 'Activar'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => deleteProvider(provider.id, provider.business_name)}
                  >
                    <Ionicons name="trash" size={18} color="#fff" />
                    <Text style={styles.actionButtonText}>Eliminar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a1628',
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
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    color: '#fff',
    fontSize: 16,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
  },
  statCardActive: {
    borderColor: '#4caf50',
  },
  statCardPending: {
    borderColor: '#ff9800',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#d4af37',
  },
  statLabel: {
    fontSize: 12,
    color: '#8899aa',
    marginTop: 4,
  },
  loader: {
    marginTop: 50,
  },
  list: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    color: '#667788',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  providerCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  businessInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  businessTexts: {
    marginLeft: 12,
    flex: 1,
  },
  businessName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  ownerName: {
    fontSize: 13,
    color: '#8899aa',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusActive: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
  },
  statusPending: {
    backgroundColor: 'rgba(255, 152, 0, 0.2)',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  cardDetails: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(212, 175, 55, 0.1)',
    paddingTop: 12,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#cccccc',
    flex: 1,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(212, 175, 55, 0.1)',
    paddingTop: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    gap: 6,
  },
  activateButton: {
    backgroundColor: '#4caf50',
  },
  deactivateButton: {
    backgroundColor: '#ff9800',
  },
  deleteButton: {
    backgroundColor: '#f44336',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
