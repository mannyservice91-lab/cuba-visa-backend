import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient/build/LinearGradient';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from './context/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const WHATSAPP_NUMBER = '+381693444935';

interface Application {
  id: string;
  visa_type: string;
  visa_name: string;
  price: number;
  status: string;
  deposit_paid: number;
  total_paid: number;
  created_at: string;
}

const STATUS_COLORS: { [key: string]: { bg: string; text: string } } = {
  pendiente: { bg: 'rgba(255, 193, 7, 0.2)', text: '#ffc107' },
  revision: { bg: 'rgba(33, 150, 243, 0.2)', text: '#2196f3' },
  aprobado: { bg: 'rgba(76, 175, 80, 0.2)', text: '#4caf50' },
  rechazado: { bg: 'rgba(244, 67, 54, 0.2)', text: '#f44336' },
  completado: { bg: 'rgba(212, 175, 55, 0.2)', text: '#d4af37' },
};

const STATUS_LABELS: { [key: string]: string } = {
  pendiente: 'Pendiente',
  revision: 'En Revisión',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
  completado: 'Completado',
};

export default function DashboardScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchApplications = useCallback(async () => {
    if (!user) return;
    try {
      const response = await fetch(`${API_URL}/api/applications/user/${user.id}`);
      const data = await response.json();
      setApplications(data);
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchApplications();
    }
  }, [user, fetchApplications]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchApplications();
  }, [fetchApplications]);

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que quieres cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/');
          },
        },
      ]
    );
  };

  const openWhatsApp = () => {
    const message = 'Hola, necesito ayuda con mi solicitud de visa.';
    const url = `https://wa.me/${WHATSAPP_NUMBER.replace('+', '')}?text=${encodeURIComponent(message)}`;
    Linking.openURL(url);
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#0a1628', '#132743', '#0a1628']} style={styles.gradient}>
          <SafeAreaView style={styles.centerContent}>
            <Text style={styles.errorText}>Debes iniciar sesión</Text>
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => router.replace('/login')}
            >
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
            <View>
              <Text style={styles.welcomeText}>Bienvenido,</Text>
              <Text style={styles.userName}>{user.full_name}</Text>
            </View>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
              <Ionicons name="log-out" size={24} color="#d4af37" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#d4af37"
              />
            }
          >
            {/* User Info Card */}
            <View style={styles.infoCard}>
              <LinearGradient colors={['#1a2f4a', '#0d1f35']} style={styles.infoCardGradient}>
                <View style={styles.infoRow}>
                  <Ionicons name="mail" size={18} color="#d4af37" />
                  <Text style={styles.infoText}>{user.email}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="call" size={18} color="#d4af37" />
                  <Text style={styles.infoText}>{user.phone}</Text>
                </View>
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="passport" size={18} color="#d4af37" />
                  <Text style={styles.infoText}>{user.passport_number}</Text>
                </View>
              </LinearGradient>
            </View>

            {/* Action Buttons */}
            <TouchableOpacity
              style={styles.newApplicationButton}
              onPress={() => router.push('/new-application')}
            >
              <LinearGradient colors={['#d4af37', '#b8962f']} style={styles.buttonGradient}>
                <Ionicons name="add-circle" size={24} color="#0a1628" />
                <Text style={styles.newApplicationText}>Nueva Solicitud de Visa</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.whatsappButton} onPress={openWhatsApp}>
              <FontAwesome5 name="whatsapp" size={22} color="#fff" />
              <Text style={styles.whatsappText}>Contactar por WhatsApp</Text>
            </TouchableOpacity>

            {/* Applications List */}
            <View style={styles.applicationsSection}>
              <Text style={styles.sectionTitle}>Mis Solicitudes</Text>

              {isLoading ? (
                <ActivityIndicator size="large" color="#d4af37" style={styles.loader} />
              ) : applications.length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons name="file-document-outline" size={60} color="#667788" />
                  <Text style={styles.emptyText}>No tienes solicitudes aún</Text>
                  <Text style={styles.emptySubtext}>Crea tu primera solicitud de visa</Text>
                </View>
              ) : (
                applications.map((app) => (
                  <TouchableOpacity
                    key={app.id}
                    style={styles.applicationCard}
                    onPress={() => router.push({ pathname: '/application-details', params: { id: app.id } })}
                  >
                    <LinearGradient colors={['#1a2f4a', '#0d1f35']} style={styles.appCardGradient}>
                      <View style={styles.appCardHeader}>
                        <View>
                          <Text style={styles.appType}>{app.visa_name}</Text>
                          <Text style={styles.appDate}>
                            {new Date(app.created_at).toLocaleDateString('es-ES')}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: STATUS_COLORS[app.status]?.bg || '#333' },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusText,
                              { color: STATUS_COLORS[app.status]?.text || '#fff' },
                            ]}
                          >
                            {STATUS_LABELS[app.status] || app.status}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.appCardFooter}>
                        <Text style={styles.priceLabel}>
                          Precio: <Text style={styles.priceValue}>{app.price} EUR</Text>
                        </Text>
                        <Text style={styles.paidLabel}>
                          Pagado: <Text style={styles.paidValue}>{app.total_paid} EUR</Text>
                        </Text>
                      </View>
                      <View style={styles.viewDetails}>
                        <Text style={styles.viewDetailsText}>Ver detalles</Text>
                        <Ionicons name="chevron-forward" size={18} color="#d4af37" />
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                ))
              )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212, 175, 55, 0.2)',
  },
  welcomeText: {
    fontSize: 14,
    color: '#8899aa',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  logoutButton: {
    padding: 10,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  infoCard: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  infoCardGradient: {
    padding: 15,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#ffffff',
  },
  newApplicationButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 15,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 10,
  },
  newApplicationText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0a1628',
  },
  whatsappButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#25D366',
    gap: 10,
    marginBottom: 25,
  },
  whatsappText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  applicationsSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#d4af37',
    marginBottom: 15,
  },
  loader: {
    marginTop: 40,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#ffffff',
    marginTop: 15,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#667788',
    marginTop: 5,
  },
  applicationCard: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  appCardGradient: {
    padding: 15,
  },
  appCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  appType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  appDate: {
    fontSize: 13,
    color: '#667788',
    marginTop: 3,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  appCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  priceLabel: {
    fontSize: 13,
    color: '#8899aa',
  },
  priceValue: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  paidLabel: {
    fontSize: 13,
    color: '#8899aa',
  },
  paidValue: {
    color: '#4caf50',
    fontWeight: 'bold',
  },
  viewDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 5,
  },
  viewDetailsText: {
    fontSize: 14,
    color: '#d4af37',
  },
});
