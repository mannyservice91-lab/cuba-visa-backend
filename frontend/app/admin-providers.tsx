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
  Modal,
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
  subscription_plan: string;
  subscription_start: string | null;
  subscription_end: string | null;
  subscription_status: string;
  days_remaining: number;
  payment_verified: boolean;
  payment_notes: string;
  created_at: string;
  approved_at: string | null;
  last_login: string | null;
}

const SUBSCRIPTION_PLANS = [
  { value: 'trial', label: '7 días gratis', price: 0 },
  { value: 'monthly', label: 'Mensual', price: 50 },
  { value: 'semester', label: 'Semestral', price: 250 },
  { value: 'annual', label: 'Anual', price: 450 },
];

const SERVICE_TYPES: Record<string, { label: string; emoji: string; color: string }> = {
  remesas: { label: 'Remesas', emoji: '💵', color: '#4caf50' },
  pasajes: { label: 'Pasajes', emoji: '✈️', color: '#2196f3' },
  tienda: { label: 'Tienda', emoji: '🛒', color: '#ff9800' },
  restaurante: { label: 'Restaurante', emoji: '🍽️', color: '#e91e63' },
  servicios: { label: 'Servicios', emoji: '🔧', color: '#9c27b0' },
};

export default function AdminProvidersScreen() {
  const router = useRouter();
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<ServiceProvider | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [processing, setProcessing] = useState(false);

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

  const approveProvider = async (providerId: string) => {
    setProcessing(true);
    try {
      const token = await AsyncStorage.getItem('adminToken');
      const response = await fetch(
        `${API_URL}/api/admin/service-providers/${providerId}/approve`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        showAlert('Éxito', data.message);
        loadProviders();
      }
    } catch (error) {
      console.error('Error approving provider:', error);
    } finally {
      setProcessing(false);
    }
  };

  const deactivateProvider = async (providerId: string) => {
    setProcessing(true);
    try {
      const token = await AsyncStorage.getItem('adminToken');
      await fetch(
        `${API_URL}/api/admin/service-providers/${providerId}/deactivate`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      loadProviders();
    } catch (error) {
      console.error('Error deactivating provider:', error);
    } finally {
      setProcessing(false);
    }
  };

  const verifyPayment = async () => {
    if (!selectedProvider) return;
    
    setProcessing(true);
    try {
      const token = await AsyncStorage.getItem('adminToken');
      const response = await fetch(
        `${API_URL}/api/admin/service-providers/${selectedProvider.id}/verify-payment?plan=${selectedPlan}&notes=${encodeURIComponent(paymentNotes)}`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        showAlert('Éxito', data.message);
        setShowPaymentModal(false);
        setSelectedProvider(null);
        setPaymentNotes('');
        loadProviders();
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
    } finally {
      setProcessing(false);
    }
  };

  const deleteProvider = async (providerId: string, businessName: string) => {
    const confirmed = await confirmAction(`¿Eliminar "${businessName}" y todas sus ofertas?`);
    if (!confirmed) return;

    try {
      const token = await AsyncStorage.getItem('adminToken');
      await fetch(`${API_URL}/api/admin/service-providers/${providerId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      loadProviders();
    } catch (error) {
      console.error('Error deleting provider:', error);
    }
  };

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const confirmAction = (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (Platform.OS === 'web') {
        resolve(window.confirm(message));
      } else {
        Alert.alert('Confirmar', message, [
          { text: 'Cancelar', onPress: () => resolve(false) },
          { text: 'Confirmar', onPress: () => resolve(true) },
        ]);
      }
    });
  };

  const filteredProviders = providers.filter(
    (p) =>
      p.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.owner_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active':
        return { label: 'Activo', color: '#4caf50', bg: 'rgba(76,175,80,0.15)' };
      case 'trial':
      case 'trial_pending':
        return { label: 'Prueba', color: '#2196f3', bg: 'rgba(33,150,243,0.15)' };
      case 'expired':
        return { label: 'Expirado', color: '#f44336', bg: 'rgba(244,67,54,0.15)' };
      case 'awaiting_payment':
        return { label: 'Pago Pendiente', color: '#ff9800', bg: 'rgba(255,152,0,0.15)' };
      default:
        return { label: 'Pendiente', color: '#9e9e9e', bg: 'rgba(158,158,158,0.15)' };
    }
  };

  const pendingCount = providers.filter(p => !p.is_active).length;
  const trialCount = providers.filter(p => p.subscription_status === 'trial' || p.subscription_status === 'trial_pending').length;
  const activeCount = providers.filter(p => p.subscription_status === 'active').length;
  const expiredCount = providers.filter(p => p.subscription_status === 'expired').length;

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

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{providers.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statCard, { borderColor: '#9e9e9e' }]}>
          <Text style={styles.statNumber}>{pendingCount}</Text>
          <Text style={styles.statLabel}>Pendientes</Text>
        </View>
        <View style={[styles.statCard, { borderColor: '#2196f3' }]}>
          <Text style={styles.statNumber}>{trialCount}</Text>
          <Text style={styles.statLabel}>En Prueba</Text>
        </View>
        <View style={[styles.statCard, { borderColor: '#4caf50' }]}>
          <Text style={styles.statNumber}>{activeCount}</Text>
          <Text style={styles.statLabel}>Pagados</Text>
        </View>
        <View style={[styles.statCard, { borderColor: '#f44336' }]}>
          <Text style={styles.statNumber}>{expiredCount}</Text>
          <Text style={styles.statLabel}>Expirados</Text>
        </View>
      </ScrollView>

      {/* Subscription Plans Info */}
      <View style={styles.plansInfo}>
        <Text style={styles.plansTitle}>Planes de Suscripción:</Text>
        <View style={styles.plansRow}>
          <Text style={styles.planItem}>🆓 7 días gratis</Text>
          <Text style={styles.planItem}>📅 50€/mes</Text>
          <Text style={styles.planItem}>📆 250€/6 meses</Text>
          <Text style={styles.planItem}>📅 450€/año</Text>
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
            filteredProviders.map((provider) => {
              const typeConfig = SERVICE_TYPES[provider.service_type] || SERVICE_TYPES.servicios;
              const statusConfig = getStatusConfig(provider.subscription_status);
              
              return (
                <View key={provider.id} style={styles.providerCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.businessInfo}>
                      <Text style={styles.typeEmoji}>{typeConfig.emoji}</Text>
                      <View style={styles.businessTexts}>
                        <Text style={styles.businessName}>{provider.business_name}</Text>
                        <Text style={styles.ownerName}>{provider.owner_name}</Text>
                      </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                      <Text style={[styles.statusText, { color: statusConfig.color }]}>
                        {statusConfig.label}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardDetails}>
                    <View style={styles.detailRow}>
                      <Ionicons name="pricetag-outline" size={16} color="#8899aa" />
                      <Text style={[styles.detailText, { color: typeConfig.color }]}>
                        {typeConfig.label}
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
                    
                    {/* Subscription Info */}
                    {provider.subscription_plan && (
                      <View style={styles.subscriptionInfo}>
                        <View style={styles.detailRow}>
                          <Ionicons name="card-outline" size={16} color="#d4af37" />
                          <Text style={styles.detailText}>
                            Plan: {SUBSCRIPTION_PLANS.find(p => p.value === provider.subscription_plan)?.label || provider.subscription_plan}
                          </Text>
                        </View>
                        {provider.subscription_end && (
                          <View style={styles.detailRow}>
                            <Ionicons name="calendar-outline" size={16} color="#8899aa" />
                            <Text style={styles.detailText}>
                              Vence: {new Date(provider.subscription_end).toLocaleDateString()}
                              {provider.days_remaining > 0 && ` (${provider.days_remaining} días)`}
                            </Text>
                          </View>
                        )}
                        {provider.payment_verified && (
                          <View style={styles.detailRow}>
                            <Ionicons name="checkmark-circle" size={16} color="#4caf50" />
                            <Text style={[styles.detailText, { color: '#4caf50' }]}>Pago verificado</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>

                  <View style={styles.cardActions}>
                    {!provider.is_active ? (
                      // Pending approval
                      <TouchableOpacity
                        style={[styles.actionButton, styles.approveButton]}
                        onPress={() => approveProvider(provider.id)}
                        disabled={processing}
                      >
                        <Ionicons name="checkmark-circle" size={18} color="#fff" />
                        <Text style={styles.actionButtonText}>Aprobar (7 días gratis)</Text>
                      </TouchableOpacity>
                    ) : provider.subscription_status === 'expired' || provider.subscription_status === 'awaiting_payment' || (provider.subscription_status === 'trial' && provider.days_remaining <= 2) ? (
                      // Need payment verification
                      <TouchableOpacity
                        style={[styles.actionButton, styles.paymentButton]}
                        onPress={() => {
                          setSelectedProvider(provider);
                          setShowPaymentModal(true);
                        }}
                      >
                        <Ionicons name="card" size={18} color="#fff" />
                        <Text style={styles.actionButtonText}>Verificar Pago</Text>
                      </TouchableOpacity>
                    ) : (
                      // Active - can deactivate
                      <TouchableOpacity
                        style={[styles.actionButton, styles.deactivateButton]}
                        onPress={() => deactivateProvider(provider.id)}
                        disabled={processing}
                      >
                        <Ionicons name="pause-circle" size={18} color="#fff" />
                        <Text style={styles.actionButtonText}>Desactivar</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => deleteProvider(provider.id, provider.business_name)}
                    >
                      <Ionicons name="trash" size={18} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Payment Verification Modal */}
      <Modal
        visible={showPaymentModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Verificar Pago</Text>
            <Text style={styles.modalSubtitle}>{selectedProvider?.business_name}</Text>

            <Text style={styles.inputLabel}>Seleccionar Plan:</Text>
            <View style={styles.planOptions}>
              {SUBSCRIPTION_PLANS.filter(p => p.value !== 'trial').map((plan) => (
                <TouchableOpacity
                  key={plan.value}
                  style={[
                    styles.planOption,
                    selectedPlan === plan.value && styles.planOptionActive,
                  ]}
                  onPress={() => setSelectedPlan(plan.value)}
                >
                  <Text style={[
                    styles.planOptionText,
                    selectedPlan === plan.value && styles.planOptionTextActive,
                  ]}>
                    {plan.label}
                  </Text>
                  <Text style={[
                    styles.planPrice,
                    selectedPlan === plan.value && styles.planPriceActive,
                  ]}>
                    {plan.price}€
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Notas del pago (opcional):</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Ej: Transferencia bancaria, referencia #1234"
              placeholderTextColor="#667788"
              value={paymentNotes}
              onChangeText={setPaymentNotes}
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setShowPaymentModal(false);
                  setSelectedProvider(null);
                  setPaymentNotes('');
                }}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, processing && styles.buttonDisabled]}
                onPress={verifyPayment}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator color="#0a1628" size="small" />
                ) : (
                  <Text style={styles.modalConfirmText}>Confirmar Pago</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  statCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
    marginRight: 10,
    minWidth: 80,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#d4af37',
  },
  statLabel: {
    fontSize: 11,
    color: '#8899aa',
    marginTop: 4,
  },
  plansInfo: {
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 10,
  },
  plansTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#d4af37',
    marginBottom: 6,
  },
  plansRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  planItem: {
    fontSize: 12,
    color: '#cccccc',
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
  typeEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  businessTexts: {
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
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardDetails: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(212, 175, 55, 0.1)',
    paddingTop: 12,
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: '#cccccc',
    flex: 1,
  },
  subscriptionInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(212, 175, 55, 0.1)',
    gap: 6,
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
  approveButton: {
    backgroundColor: '#4caf50',
  },
  paymentButton: {
    backgroundColor: '#2196f3',
  },
  deactivateButton: {
    backgroundColor: '#ff9800',
  },
  deleteButton: {
    backgroundColor: '#f44336',
    flex: 0,
    paddingHorizontal: 14,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#0a1628',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#d4af37',
    textAlign: 'center',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#8899aa',
    textAlign: 'center',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: '#d4af37',
    marginBottom: 10,
  },
  planOptions: {
    gap: 10,
    marginBottom: 20,
  },
  planOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
  },
  planOptionActive: {
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    borderColor: '#d4af37',
  },
  planOptionText: {
    fontSize: 15,
    color: '#aaaaaa',
  },
  planOptionTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  planPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8899aa',
  },
  planPriceActive: {
    color: '#d4af37',
  },
  notesInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
    borderRadius: 10,
    padding: 12,
    color: '#fff',
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#667788',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    color: '#667788',
    fontWeight: '600',
  },
  modalConfirmBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#d4af37',
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 15,
    color: '#0a1628',
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
