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
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient/build/LinearGradient';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../src/context/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface Application {
  id: string;
  user_name: string;
  user_email: string;
  visa_type: string;
  visa_name: string;
  price: number;
  status: string;
  deposit_paid: number;
  total_paid: number;
  created_at: string;
}

interface Stats {
  total_applications: number;
  pending: number;
  in_review: number;
  approved: number;
  rejected: number;
  completed: number;
  total_revenue: number;
  pending_revenue: number;
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

export default function AdminDashboardScreen() {
  const router = useRouter();
  const { admin, adminLogout, isAdmin } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const fetchData = useCallback(async () => {
    if (!admin?.access_token) {
      setIsLoading(false);
      return;
    }

    try {
      const [appsRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/applications`, {
          headers: { Authorization: `Bearer ${admin.access_token}` },
        }),
        fetch(`${API_URL}/api/admin/stats`, {
          headers: { Authorization: `Bearer ${admin.access_token}` },
        }),
      ]);

      if (!appsRes.ok || !statsRes.ok) {
        if (appsRes.status === 401 || statsRes.status === 401) {
          // Token expired, logout
          await adminLogout();
          router.replace('/admin');
          return;
        }
        throw new Error('Error al cargar datos');
      }

      const appsData = await appsRes.json();
      const statsData = await statsRes.json();

      setApplications(appsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [admin, adminLogout, router]);

  useEffect(() => {
    // Wait for auth context to finish loading
    if (isLoading) return;
    
    if (!isAdmin) {
      router.replace('/admin');
      return;
    }
    fetchData();
  }, [isAdmin, isLoading, fetchData, router]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      // En web, usar confirm nativo del navegador
      const confirmed = window.confirm('¿Estás seguro de que quieres salir del panel admin?');
      if (confirmed) {
        await adminLogout();
        router.replace('/');
      }
    } else {
      // En móvil, usar Alert de React Native
      Alert.alert(
        'Cerrar Sesión',
        '¿Estás seguro de que quieres salir del panel admin?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Salir',
            style: 'destructive',
            onPress: async () => {
              await adminLogout();
              router.replace('/');
            },
          },
        ]
      );
    }
  };

  const filteredApplications = applications.filter((app) => {
    if (activeFilter === 'all') return true;
    return app.status === activeFilter;
  });

  if (!isAdmin) {
    return null;
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
            <View style={styles.headerLeft}>
              <Ionicons name="shield-checkmark" size={28} color="#d4af37" />
              <Text style={styles.headerTitle}>Panel Admin</Text>
            </View>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
              <Ionicons name="log-out" size={24} color="#f44336" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#d4af37" />
            }
          >
            {/* Stats Cards */}
            {stats && (
              <View style={styles.statsSection}>
                <View style={styles.statsRow}>
                  <View style={[styles.statCard, { backgroundColor: 'rgba(212, 175, 55, 0.15)' }]}>
                    <Text style={styles.statValue}>{stats.total_applications}</Text>
                    <Text style={styles.statLabel}>Total</Text>
                  </View>
                  <View style={[styles.statCard, { backgroundColor: 'rgba(255, 193, 7, 0.15)' }]}>
                    <Text style={[styles.statValue, { color: '#ffc107' }]}>{stats.pending}</Text>
                    <Text style={styles.statLabel}>Pendientes</Text>
                  </View>
                  <View style={[styles.statCard, { backgroundColor: 'rgba(33, 150, 243, 0.15)' }]}>
                    <Text style={[styles.statValue, { color: '#2196f3' }]}>{stats.in_review}</Text>
                    <Text style={styles.statLabel}>En Revisión</Text>
                  </View>
                </View>
                <View style={styles.statsRow}>
                  <View style={[styles.statCard, { backgroundColor: 'rgba(76, 175, 80, 0.15)' }]}>
                    <Text style={[styles.statValue, { color: '#4caf50' }]}>{stats.approved}</Text>
                    <Text style={styles.statLabel}>Aprobados</Text>
                  </View>
                  <View style={[styles.statCard, { backgroundColor: 'rgba(244, 67, 54, 0.15)' }]}>
                    <Text style={[styles.statValue, { color: '#f44336' }]}>{stats.rejected}</Text>
                    <Text style={styles.statLabel}>Rechazados</Text>
                  </View>
                  <View style={[styles.statCard, { backgroundColor: 'rgba(212, 175, 55, 0.15)' }]}>
                    <Text style={[styles.statValue, { color: '#d4af37' }]}>{stats.completed}</Text>
                    <Text style={styles.statLabel}>Completados</Text>
                  </View>
                </View>

                {/* Revenue Card */}
                <View style={styles.revenueCard}>
                  <LinearGradient colors={['#1a2f4a', '#0d1f35']} style={styles.revenueGradient}>
                    <View style={styles.revenueRow}>
                      <View>
                        <Text style={styles.revenueLabel}>Ingresos Totales</Text>
                        <Text style={styles.revenueValue}>{stats.total_revenue} EUR</Text>
                      </View>
                      <View>
                        <Text style={styles.revenueLabel}>Pendiente Cobro</Text>
                        <Text style={[styles.revenueValue, { color: '#ffc107' }]}>
                          {stats.pending_revenue} EUR
                        </Text>
                      </View>
                    </View>
                  </LinearGradient>
                </View>

                {/* Testimonials Button */}
                <TouchableOpacity
                  style={styles.testimonialsButton}
                  onPress={() => router.push('/admin-testimonials')}
                >
                  <LinearGradient colors={['#1a2f4a', '#0d1f35']} style={styles.testimonialsBtnGradient}>
                    <Ionicons name="images" size={24} color="#d4af37" />
                    <View style={styles.testimonialsBtnText}>
                      <Text style={styles.testimonialsBtnTitle}>Clientes Satisfechos</Text>
                      <Text style={styles.testimonialsBtnSubtitle}>Gestionar fotos de visas</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#d4af37" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}

            {/* Filter Tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterScroll}
              contentContainerStyle={styles.filterContainer}
            >
              {['all', 'pendiente', 'revision', 'aprobado', 'rechazado', 'completado'].map(
                (filter) => (
                  <TouchableOpacity
                    key={filter}
                    style={[
                      styles.filterTab,
                      activeFilter === filter && styles.filterTabActive,
                    ]}
                    onPress={() => setActiveFilter(filter)}
                  >
                    <Text
                      style={[
                        styles.filterText,
                        activeFilter === filter && styles.filterTextActive,
                      ]}
                    >
                      {filter === 'all' ? 'Todos' : STATUS_LABELS[filter]}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </ScrollView>

            {/* Applications List */}
            <Text style={styles.sectionTitle}>
              Solicitudes ({filteredApplications.length})
            </Text>

            {filteredApplications.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="file-document-outline" size={50} color="#667788" />
                <Text style={styles.emptyText}>No hay solicitudes</Text>
              </View>
            ) : (
              filteredApplications.map((app) => (
                <TouchableOpacity
                  key={app.id}
                  style={styles.applicationCard}
                  onPress={() =>
                    router.push({ pathname: '/admin-application', params: { id: app.id } })
                  }
                >
                  <LinearGradient colors={['#1a2f4a', '#0d1f35']} style={styles.appCardGradient}>
                    <View style={styles.appCardHeader}>
                      <View style={styles.appCardInfo}>
                        <Text style={styles.appUserName}>{app.user_name}</Text>
                        <Text style={styles.appUserEmail}>{app.user_email}</Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: STATUS_COLORS[app.status]?.bg },
                        ]}
                      >
                        <Text
                          style={[styles.statusText, { color: STATUS_COLORS[app.status]?.text }]}
                        >
                          {STATUS_LABELS[app.status]}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.appVisaType}>{app.visa_name}</Text>
                    <View style={styles.appCardFooter}>
                      <Text style={styles.appPrice}>{app.price} EUR</Text>
                      <Text style={styles.appPaid}>Pagado: {app.total_paid} EUR</Text>
                      <Text style={styles.appDate}>
                        {new Date(app.created_at).toLocaleDateString('es-ES')}
                      </Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              ))
            )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212, 175, 55, 0.2)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#d4af37',
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
  statsSection: {
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  statCard: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#d4af37',
  },
  statLabel: {
    fontSize: 11,
    color: '#8899aa',
    marginTop: 4,
  },
  revenueCard: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  revenueGradient: {
    padding: 20,
  },
  revenueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  revenueLabel: {
    fontSize: 12,
    color: '#8899aa',
    marginBottom: 5,
  },
  revenueValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4caf50',
  },
  testimonialsButton: {
    marginTop: 15,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  testimonialsBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  testimonialsBtnText: {
    flex: 1,
  },
  testimonialsBtnTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#d4af37',
  },
  testimonialsBtnSubtitle: {
    fontSize: 12,
    color: '#8899aa',
    marginTop: 2,
  },
  filterScroll: {
    marginBottom: 15,
  },
  filterContainer: {
    gap: 10,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  filterTabActive: {
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    borderColor: '#d4af37',
  },
  filterText: {
    fontSize: 13,
    color: '#8899aa',
  },
  filterTextActive: {
    color: '#d4af37',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 15,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#667788',
    marginTop: 10,
  },
  applicationCard: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
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
    marginBottom: 10,
  },
  appCardInfo: {
    flex: 1,
  },
  appUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  appUserEmail: {
    fontSize: 13,
    color: '#667788',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  appVisaType: {
    fontSize: 14,
    color: '#d4af37',
    marginBottom: 10,
  },
  appCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  appPrice: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '600',
  },
  appPaid: {
    fontSize: 13,
    color: '#4caf50',
  },
  appDate: {
    fontSize: 12,
    color: '#667788',
  },
});
