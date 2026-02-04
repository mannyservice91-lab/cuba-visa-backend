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
  Image,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient/build/LinearGradient';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useAuth } from '../src/context/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const WHATSAPP_NUMBER = '+381693444935';

interface Application {
  id: string;
  visa_type_name: string;
  destination_country: string;
  price: number;
  status: string;
  deposit_paid: number;
  total_paid: number;
  created_at: string;
  embassy_location: string;
}

const STATUS_COLORS: { [key: string]: { bg: string; text: string } } = {
  pendiente: { bg: 'rgba(255, 193, 7, 0.2)', text: '#ffc107' },
  documentos: { bg: 'rgba(33, 150, 243, 0.2)', text: '#2196f3' },
  revision: { bg: 'rgba(33, 150, 243, 0.2)', text: '#2196f3' },
  aprobado: { bg: 'rgba(76, 175, 80, 0.2)', text: '#4caf50' },
  rechazado: { bg: 'rgba(244, 67, 54, 0.2)', text: '#f44336' },
  completado: { bg: 'rgba(212, 175, 55, 0.2)', text: '#d4af37' },
};

const STATUS_LABELS: { [key: string]: string } = {
  pendiente: 'Pendiente Pago',
  documentos: 'Esperando Documentos',
  revision: 'En Revisión',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
  completado: 'Completado',
};

const STATUS_STEPS = ['pendiente', 'documentos', 'revision', 'aprobado', 'completado'];

export default function DashboardScreen() {
  const router = useRouter();
  const { user, logout, updateUser } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const fetchApplications = useCallback(async () => {
    if (!user) return;
    try {
      const response = await fetch(`${API_URL}/api/applications/user/${user.id}`);
      const data = await response.json();
      setApplications(data || []);
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
    const doLogout = async () => {
      await logout();
      if (Platform.OS === 'web') {
        localStorage.clear();
        window.location.href = '/';
      } else {
        router.replace('/');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('¿Estás seguro de que quieres cerrar sesión?')) {
        doLogout();
      }
    } else {
      Alert.alert(
        'Cerrar Sesión',
        '¿Estás seguro de que quieres cerrar sesión?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Cerrar Sesión', style: 'destructive', onPress: doLogout },
        ]
      );
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        setUploadingPhoto(true);
        const base64 = await FileSystem.readAsStringAsync(result.assets[0].uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        const imageData = `data:image/jpeg;base64,${base64}`;
        
        // Update user profile with photo
        const response = await fetch(`${API_URL}/api/users/${user?.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile_image: imageData }),
        });
        
        if (response.ok) {
          await updateUser({ profile_image: imageData });
          Alert.alert('Éxito', 'Foto actualizada');
        }
        setUploadingPhoto(false);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      setUploadingPhoto(false);
    }
  };

  const openWhatsApp = () => {
    const message = 'Hola, necesito ayuda con mi solicitud de visa.';
    const url = `https://wa.me/${WHATSAPP_NUMBER.replace('+', '')}?text=${encodeURIComponent(message)}`;
    Linking.openURL(url);
  };

  const getStatusStep = (status: string) => {
    const index = STATUS_STEPS.indexOf(status);
    return index === -1 ? 0 : index;
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#0a1628', '#132743', '#0a1628']} style={styles.gradient}>
          <SafeAreaView style={styles.centerContent}>
            <Ionicons name="lock-closed" size={50} color="#d4af37" />
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
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={handlePickImage} style={styles.avatarContainer}>
                {uploadingPhoto ? (
                  <ActivityIndicator color="#d4af37" />
                ) : user.profile_image ? (
                  <Image source={{ uri: user.profile_image }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="person" size={30} color="#d4af37" />
                  </View>
                )}
                <View style={styles.cameraIcon}>
                  <Ionicons name="camera" size={12} color="#fff" />
                </View>
              </TouchableOpacity>
              <View>
                <Text style={styles.welcomeText}>Bienvenido,</Text>
                <Text style={styles.userName}>{user.full_name}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
              <Ionicons name="log-out" size={24} color="#f44336" />
              <Text style={styles.logoutText}>Salir</Text>
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
                <View style={styles.infoRow}>
                  <Ionicons name="location" size={18} color="#d4af37" />
                  <Text style={styles.infoText}>
                    Residencia: {user.country_of_residence || 'Cuba'}
                  </Text>
                </View>
                {user.embassy_location && (
                  <View style={styles.embassyRow}>
                    <Ionicons name="business" size={18} color="#4caf50" />
                    <Text style={styles.embassyText}>{user.embassy_location}</Text>
                  </View>
                )}
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
                      {/* Header */}
                      <View style={styles.appCardHeader}>
                        <View>
                          <Text style={styles.appDestination}>
                            {app.destination_country} 🇷🇸
                          </Text>
                          <Text style={styles.appType}>{app.visa_type_name}</Text>
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

                      {/* Progress Stepper */}
                      <View style={styles.progressContainer}>
                        <View style={styles.progressTrack}>
                          {STATUS_STEPS.slice(0, 4).map((step, index) => (
                            <React.Fragment key={step}>
                              <View
                                style={[
                                  styles.progressDot,
                                  getStatusStep(app.status) >= index && styles.progressDotActive,
                                  app.status === 'rechazado' && styles.progressDotRejected,
                                ]}
                              >
                                {getStatusStep(app.status) > index && (
                                  <Ionicons name="checkmark" size={12} color="#fff" />
                                )}
                              </View>
                              {index < 3 && (
                                <View
                                  style={[
                                    styles.progressLine,
                                    getStatusStep(app.status) > index && styles.progressLineActive,
                                  ]}
                                />
                              )}
                            </React.Fragment>
                          ))}
                        </View>
                        <View style={styles.progressLabels}>
                          <Text style={styles.progressLabel}>Pago</Text>
                          <Text style={styles.progressLabel}>Docs</Text>
                          <Text style={styles.progressLabel}>Revisión</Text>
                          <Text style={styles.progressLabel}>Aprobado</Text>
                        </View>
                      </View>

                      {/* Embassy Info */}
                      {app.embassy_location && (
                        <View style={styles.embassyInfo}>
                          <Ionicons name="business" size={14} color="#4caf50" />
                          <Text style={styles.embassyInfoText}>
                            Recoger visa: {app.embassy_location}
                          </Text>
                        </View>
                      )}

                      {/* Footer */}
                      <View style={styles.appCardFooter}>
                        <Text style={styles.priceLabel}>
                          Precio: <Text style={styles.priceValue}>{app.price} EUR</Text>
                        </Text>
                        <Text style={styles.paidLabel}>
                          Pagado: <Text style={styles.paidValue}>{app.total_paid} EUR</Text>
                        </Text>
                      </View>
                      <View style={styles.viewDetails}>
                        <Text style={styles.viewDetailsText}>Ver detalles y subir documentos</Text>
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
    gap: 12,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 55,
    height: 55,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: '#d4af37',
  },
  avatarPlaceholder: {
    width: 55,
    height: 55,
    borderRadius: 27,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#d4af37',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#d4af37',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 12,
    color: '#8899aa',
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 5,
  },
  logoutText: {
    color: '#f44336',
    fontSize: 14,
    fontWeight: '600',
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
    paddingVertical: 6,
  },
  infoText: {
    fontSize: 14,
    color: '#ffffff',
  },
  embassyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  embassyText: {
    fontSize: 14,
    color: '#4caf50',
    fontWeight: '500',
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
  appDestination: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#d4af37',
  },
  appType: {
    fontSize: 14,
    color: '#ffffff',
    marginTop: 2,
  },
  appDate: {
    fontSize: 12,
    color: '#667788',
    marginTop: 3,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  progressContainer: {
    marginBottom: 15,
  },
  progressTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  progressDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressDotActive: {
    backgroundColor: '#4caf50',
  },
  progressDotRejected: {
    backgroundColor: '#f44336',
  },
  progressLine: {
    flex: 1,
    height: 3,
    backgroundColor: '#333',
    marginHorizontal: 5,
  },
  progressLineActive: {
    backgroundColor: '#4caf50',
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 5,
    marginTop: 5,
  },
  progressLabel: {
    fontSize: 10,
    color: '#667788',
    textAlign: 'center',
  },
  embassyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  embassyInfoText: {
    fontSize: 12,
    color: '#4caf50',
    flex: 1,
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
    fontSize: 13,
    color: '#d4af37',
  },
});
