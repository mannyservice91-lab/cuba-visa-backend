import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient/build/LinearGradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../src/context/AuthContext';

import { API_URL } from '../src/config/api';

// Cross-platform alert helper
const showAlert = (title: string, message: string, onOk?: () => void) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    if (onOk) onOk();
  } else {
    Alert.alert(title, message, [{ text: 'OK', onPress: onOk }]);
  }
};

const showConfirm = (title: string, message: string, onConfirm: () => void) => {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Confirmar', style: 'destructive', onPress: onConfirm },
    ]);
  }
};

interface User {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  passport_number: string;
  country_of_residence: string;
  created_at: string;
  is_active: boolean;
  is_approved: boolean;
}

export default function AdminUsersScreen() {
  const router = useRouter();
  const { admin, adminLogout, isAdmin, isLoading: authLoading } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUsers = useCallback(async () => {
    if (!admin?.access_token) return;
    try {
      const response = await fetch(`${API_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${admin.access_token}` },
      });
      
      if (response.status === 401) {
        await adminLogout();
        if (Platform.OS === 'web') {
          window.location.href = '/admin';
        } else {
          router.replace('/admin');
        }
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error:', error);
      showAlert('Error', 'No se pudieron cargar los usuarios');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [admin, adminLogout, router]);

  useEffect(() => {
    // Wait for auth to load
    if (authLoading) return;
    
    if (!isAdmin) {
      if (Platform.OS === 'web') {
        window.location.href = '/admin';
      } else {
        router.replace('/admin');
      }
      return;
    }
    fetchUsers();
  }, [isAdmin, authLoading, fetchUsers, router]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUsers();
  }, [fetchUsers]);

  const handleDeleteUser = (userId: string, userName: string) => {
    showConfirm(
      'Eliminar Usuario',
      `¿Estás seguro de eliminar a "${userName}"? Se eliminarán también todas sus solicitudes.`,
      async () => {
        if (!admin?.access_token) return;
        try {
          const response = await fetch(`${API_URL}/api/admin/users/${userId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${admin.access_token}` },
          });
          
          if (response.ok) {
            showAlert('Éxito', 'Usuario eliminado correctamente');
            fetchUsers();
          } else {
            const data = await response.json();
            showAlert('Error', data.detail || 'No se pudo eliminar el usuario');
          }
        } catch (error) {
          showAlert('Error', 'No se pudo eliminar el usuario');
        }
      }
    );
  };

  const handleToggleUser = async (userId: string) => {
    if (!admin?.access_token) return;
    try {
      const response = await fetch(`${API_URL}/api/admin/users/${userId}/toggle`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${admin.access_token}` },
      });
      
      if (response.ok) {
        fetchUsers();
      } else {
        showAlert('Error', 'No se pudo cambiar el estado del usuario');
      }
    } catch (error) {
      showAlert('Error', 'No se pudo cambiar el estado del usuario');
    }
  };

  const handleApproveUser = async (userId: string, currentStatus: boolean) => {
    if (!admin?.access_token) return;
    try {
      const response = await fetch(`${API_URL}/api/admin/users/${userId}/approve`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${admin.access_token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        showAlert(
          'Éxito', 
          data.is_approved 
            ? 'Usuario aprobado. Ahora puede acceder a la aplicación.'
            : 'Aprobación revocada. El usuario no podrá acceder.'
        );
        fetchUsers();
      } else {
        showAlert('Error', 'No se pudo cambiar el estado de aprobación');
      }
    } catch (error) {
      showAlert('Error', 'No se pudo cambiar el estado de aprobación');
    }
  };

  if (!isAdmin) return null;

  if (authLoading || isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#0a1628', '#132743', '#0a1628']} style={styles.gradient}>
          <SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
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
            <Text style={styles.headerTitle}>Gestión de Usuarios</Text>
            <View style={{ width: 44 }} />
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#d4af37" />
            }
          >
            {/* Stats */}
            <View style={styles.statsCard}>
              <LinearGradient colors={['#1a2f4a', '#0d1f35']} style={styles.statsGradient}>
                <Ionicons name="people" size={30} color="#d4af37" />
                <Text style={styles.statsNumber}>{users.length}</Text>
                <Text style={styles.statsLabel}>Usuarios Registrados</Text>
              </LinearGradient>
            </View>

            {/* Users List */}
            <Text style={styles.sectionTitle}>Todos los Usuarios</Text>

            {isLoading ? (
              <ActivityIndicator size="large" color="#d4af37" style={{ marginTop: 40 }} />
            ) : users.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={50} color="#667788" />
                <Text style={styles.emptyText}>No hay usuarios registrados</Text>
              </View>
            ) : (
              users.map((user) => (
                <View key={user.id} style={styles.userCard}>
                  <LinearGradient colors={['#1a2f4a', '#0d1f35']} style={styles.userCardGradient}>
                    <View style={styles.userHeader}>
                      <View style={styles.userInfo}>
                        <Text style={styles.userName}>{user.full_name}</Text>
                        <Text style={styles.userEmail}>{user.email}</Text>
                      </View>
                      <View style={[
                        styles.statusBadge,
                        { backgroundColor: user.is_active !== false ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)' }
                      ]}>
                        <Text style={[
                          styles.statusText,
                          { color: user.is_active !== false ? '#4caf50' : '#f44336' }
                        ]}>
                          {user.is_active !== false ? 'Activo' : 'Inactivo'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.userDetails}>
                      <View style={styles.detailRow}>
                        <Ionicons name="call" size={14} color="#667788" />
                        <Text style={styles.detailText}>{user.phone}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Ionicons name="card" size={14} color="#667788" />
                        <Text style={styles.detailText}>{user.passport_number}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Ionicons name="globe" size={14} color="#667788" />
                        <Text style={styles.detailText}>{user.country_of_residence}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Ionicons name="calendar" size={14} color="#667788" />
                        <Text style={styles.detailText}>
                          {new Date(user.created_at).toLocaleDateString('es-ES')}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.userActions}>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.toggleButton]}
                        onPress={() => handleToggleUser(user.id)}
                      >
                        <Ionicons 
                          name={user.is_active !== false ? 'eye-off' : 'eye'} 
                          size={18} 
                          color="#ffc107" 
                        />
                        <Text style={styles.toggleText}>
                          {user.is_active !== false ? 'Desactivar' : 'Activar'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.deleteButton]}
                        onPress={() => handleDeleteUser(user.id, user.full_name)}
                      >
                        <Ionicons name="trash" size={18} color="#f44336" />
                        <Text style={styles.deleteText}>Eliminar</Text>
                      </TouchableOpacity>
                    </View>
                  </LinearGradient>
                </View>
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
  statsCard: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  statsGradient: {
    padding: 20,
    alignItems: 'center',
  },
  statsNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#d4af37',
    marginTop: 10,
  },
  statsLabel: {
    fontSize: 14,
    color: '#8899aa',
    marginTop: 5,
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
  userCard: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  userCardGradient: {
    padding: 15,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  userEmail: {
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
    fontWeight: 'bold',
  },
  userDetails: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 3,
  },
  detailText: {
    fontSize: 13,
    color: '#8899aa',
  },
  userActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
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
  toggleButton: {
    backgroundColor: 'rgba(255, 193, 7, 0.15)',
  },
  deleteButton: {
    backgroundColor: 'rgba(244, 67, 54, 0.15)',
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffc107',
  },
  deleteText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f44336',
  },
});
