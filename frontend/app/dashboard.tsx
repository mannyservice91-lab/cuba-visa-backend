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
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient/build/LinearGradient';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useAuth } from '../src/context/AuthContext';

import { API_URL } from '../src/config/api';

// Available countries for residence
const COUNTRIES_OF_RESIDENCE = [
  'Cuba',
  'Rusia',
  'Egipto',
  'México',
  'Venezuela',
  'Colombia',
  'España',
  'Estados Unidos',
  'Argentina',
  'Chile',
  'Perú',
  'Ecuador',
  'Brasil',
  'Otro',
];

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

interface Advisor {
  id: string;
  name: string;
  whatsapp: string;
  role: string;
  is_active: boolean;
}

const STATUS_STEPS = [
  { key: 'pendiente', label: 'Enviado', icon: 'paper-plane' },
  { key: 'documentos', label: 'En Revisión', icon: 'search' },
  { key: 'revision', label: 'Cita Consular', icon: 'calendar' },
  { key: 'aprobado', label: 'Aprobado', icon: 'checkmark-circle' },
];

const getStepIndex = (status: string) => {
  if (status === 'pendiente') return 0;
  if (status === 'documentos') return 1;
  if (status === 'revision') return 2;
  if (status === 'aprobado' || status === 'completado') return 3;
  return 0;
};

export default function DashboardScreen() {
  const router = useRouter();
  const { user, logout, updateUser } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [updatingCountry, setUpdatingCountry] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const [appsRes, advisorsRes] = await Promise.all([
        fetch(`${API_URL}/api/applications/user/${user.id}`),
        fetch(`${API_URL}/api/advisors`),
      ]);
      
      const appsData = await appsRes.json();
      const advisorsData = await advisorsRes.json();
      
      setApplications(appsData || []);
      setAdvisors(advisorsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

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
      Alert.alert('Cerrar Sesión', '¿Cerrar sesión?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Salir', style: 'destructive', onPress: doLogout },
      ]);
    }
  };

  const handlePickImage = async () => {
    try {
      console.log('Starting image picker...');
      
      // Request permissions on mobile
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permiso Requerido', 'Necesitamos acceso a tu galería para cambiar la foto de perfil');
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true, // Always request base64 for both platforms
      });

      console.log('Image picker result:', result.canceled ? 'cancelled' : 'selected');

      if (!result.canceled && result.assets[0]) {
        setUploadingPhoto(true);
        const asset = result.assets[0];
        
        let base64Data: string;
        
        // Use base64 directly if available (works on both platforms)
        if (asset.base64) {
          base64Data = asset.base64;
        } else if (Platform.OS === 'web') {
          // Fallback for web if base64 not available
          if (asset.uri.startsWith('data:')) {
            base64Data = asset.uri.split(',')[1] || '';
          } else {
            try {
              const response = await fetch(asset.uri);
              const blob = await response.blob();
              base64Data = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                  const res = reader.result as string;
                  resolve(res.split(',')[1]);
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              });
            } catch (e) {
              console.error('Error converting blob:', e);
              window.alert('Error al procesar la imagen');
              setUploadingPhoto(false);
              return;
            }
          }
        } else {
          // Fallback for mobile - use FileSystem
          base64Data = await FileSystem.readAsStringAsync(asset.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
        }
        
        const imageData = `data:image/jpeg;base64,${base64Data}`;
        console.log('Uploading profile image...');
        
        const response = await fetch(`${API_URL}/api/user/${user?.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile_image: imageData }),
        });
        
        if (response.ok) {
          console.log('Profile image uploaded successfully');
          await updateUser({ profile_image: imageData });
          if (Platform.OS === 'web') {
            window.alert('Foto de perfil actualizada');
          } else {
            Alert.alert('Éxito', 'Foto de perfil actualizada');
          }
        } else {
          const errorData = await response.json();
          console.error('Upload error:', errorData);
          const errorMsg = errorData.detail || 'Error desconocido';
          if (Platform.OS === 'web') {
            window.alert('Error al subir la foto: ' + errorMsg);
          } else {
            Alert.alert('Error', 'Error al subir la foto: ' + errorMsg);
          }
        }
        setUploadingPhoto(false);
      }
    } catch (error) {
      console.error('Error in handlePickImage:', error);
      if (Platform.OS === 'web') {
        window.alert('Error al seleccionar la imagen');
      } else {
        Alert.alert('Error', 'Error al seleccionar la imagen');
      }
      setUploadingPhoto(false);
    }
  };

  const handleUpdateCountry = async (country: string) => {
    if (!user) return;
    setUpdatingCountry(true);
    try {
      const response = await fetch(`${API_URL}/api/user/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country_of_residence: country }),
      });
      
      if (response.ok) {
        await updateUser({ country_of_residence: country });
        setShowCountryModal(false);
        if (Platform.OS === 'web') {
          window.alert('País de residencia actualizado');
        }
      } else {
        if (Platform.OS === 'web') {
          window.alert('Error al actualizar país');
        }
      }
    } catch (error) {
      console.error('Error updating country:', error);
      if (Platform.OS === 'web') {
        window.alert('Error al actualizar país');
      }
    } finally {
      setUpdatingCountry(false);
    }
  };

  const openWhatsApp = (phone: string, name?: string) => {
    const message = name 
      ? `Hola ${name}, necesito ayuda con mi solicitud de visa.`
      : 'Hola, necesito ayuda con mi solicitud de visa.';
    const number = phone.replace(/[^0-9]/g, '');
    Linking.openURL(`https://wa.me/${number}?text=${encodeURIComponent(message)}`);
  };

  // Get current/latest application
  const currentApp = applications.length > 0 ? applications[0] : null;
  
  // Check if current application has physical visa (needs embassy) or e-visa
  const isEVisa = currentApp?.embassy_location?.includes('E-Visa') || currentApp?.embassy_location?.includes('Electrónica');

  if (!user) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#0a1628', '#132743', '#0a1628']} style={styles.gradient}>
          <SafeAreaView style={styles.centerContent}>
            <Ionicons name="lock-closed" size={50} color="#d4af37" />
            <Text style={styles.errorText}>Debes iniciar sesión</Text>
            <TouchableOpacity style={styles.linkButton} onPress={() => router.replace('/login')}>
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
          {/* Header with user photo and logout */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={handlePickImage} style={styles.avatarContainer}>
                {uploadingPhoto ? (
                  <ActivityIndicator color="#d4af37" size="small" />
                ) : user.profile_image ? (
                  <Image source={{ uri: user.profile_image }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="person" size={24} color="#d4af37" />
                  </View>
                )}
                <View style={styles.cameraIcon}>
                  <Ionicons name="camera" size={10} color="#fff" />
                </View>
              </TouchableOpacity>
              <View>
                <Text style={styles.userName}>{user.full_name}</Text>
                <Text style={styles.userResidence}>
                  <Ionicons name="location" size={12} color="#d4af37" /> {user.country_of_residence || 'Cuba'}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
              <Ionicons name="log-out" size={22} color="#f44336" />
              <Text style={styles.logoutText}>Salir</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#d4af37" />
            }
          >
            {/* User Info Card - with editable country */}
            <View style={styles.userInfoCard}>
              <TouchableOpacity 
                style={styles.userInfoRow} 
                onPress={() => setShowCountryModal(true)}
              >
                <Ionicons name="globe" size={16} color="#d4af37" />
                <Text style={styles.userInfoLabel}>País de Residencia:</Text>
                <Text style={styles.userInfoValue}>
                  {user.country_of_residence === 'Por definir' ? 'Seleccionar...' : (user.country_of_residence || 'Seleccionar...')}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#667788" />
              </TouchableOpacity>
              <View style={styles.userInfoRow}>
                <MaterialCommunityIcons name="passport" size={16} color="#d4af37" />
                <Text style={styles.userInfoLabel}>Pasaporte:</Text>
                <Text style={styles.userInfoValue}>{user.passport_number}</Text>
              </View>
            </View>

            {/* Current Application Section */}
            {currentApp && (
              <View style={styles.currentAppSection}>
                <Text style={styles.sectionLabel}>SOLICITUD ACTUAL: {currentApp.visa_type_name}</Text>
                
                {/* Embassy info - only show for physical visas, not e-visas */}
                {currentApp.embassy_location && !isEVisa && (
                  <View style={styles.embassyBanner}>
                    <Ionicons name="business" size={16} color="#4caf50" />
                    <Text style={styles.embassyText}>
                      Lugar de Recogida de Visa: {currentApp.embassy_location}
                    </Text>
                  </View>
                )}
                
                {/* E-Visa info */}
                {isEVisa && (
                  <View style={[styles.embassyBanner, { backgroundColor: 'rgba(33, 150, 243, 0.1)' }]}>
                    <Ionicons name="mail" size={16} color="#2196f3" />
                    <Text style={[styles.embassyText, { color: '#2196f3' }]}>
                      E-Visa Electrónica - Recibirás tu visa por correo
                    </Text>
                  </View>
                )}
                
                {/* Progress Bar */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    {STATUS_STEPS.map((step, index) => {
                      const currentStep = getStepIndex(currentApp.status);
                      const isCompleted = index < currentStep;
                      const isCurrent = index === currentStep;
                      
                      return (
                        <React.Fragment key={step.key}>
                          <View style={styles.stepContainer}>
                            <View style={[
                              styles.stepCircle,
                              isCompleted && styles.stepCompleted,
                              isCurrent && styles.stepCurrent,
                            ]}>
                              {isCompleted ? (
                                <Ionicons name="checkmark" size={14} color="#fff" />
                              ) : (
                                <Ionicons name={step.icon as any} size={14} color={isCurrent ? '#0a1628' : '#666'} />
                              )}
                            </View>
                            <Text style={[
                              styles.stepLabel,
                              (isCompleted || isCurrent) && styles.stepLabelActive,
                            ]}>
                              {step.label}
                            </Text>
                          </View>
                          {index < STATUS_STEPS.length - 1 && (
                            <View style={[
                              styles.progressLine,
                              isCompleted && styles.progressLineCompleted,
                              isCurrent && styles.progressLineCurrent,
                            ]} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </View>
                </View>

                {/* Embassy Location */}
                {currentApp.embassy_location && (
                  <View style={styles.embassyInfo}>
                    <Ionicons name="location" size={16} color="#4caf50" />
                    <Text style={styles.embassyInfoText}>
                      Recoger visa en: {currentApp.embassy_location}
                    </Text>
                  </View>
                )}

                {/* View Details Button */}
                <TouchableOpacity
                  style={styles.viewDetailsButton}
                  onPress={() => router.push({ pathname: '/application-details', params: { id: currentApp.id } })}
                >
                  <Text style={styles.viewDetailsText}>Ver detalles y subir documentos</Text>
                  <Ionicons name="chevron-forward" size={18} color="#d4af37" />
                </TouchableOpacity>
              </View>
            )}

            {/* Action Buttons */}
            <TouchableOpacity
              style={styles.newAppButton}
              onPress={() => router.push('/new-application')}
            >
              <LinearGradient colors={['#d4af37', '#b8962f']} style={styles.buttonGradient}>
                <Ionicons name="add-circle" size={22} color="#0a1628" />
                <Text style={styles.newAppText}>Nueva Solicitud de Visa</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Advisors Section */}
            {advisors.length > 0 && (
              <View style={styles.advisorsSection}>
                <Text style={styles.advisorsSectionTitle}>Contacta a un Asesor</Text>
                {advisors.map((advisor) => (
                  <TouchableOpacity
                    key={advisor.id}
                    style={styles.advisorButton}
                    onPress={() => openWhatsApp(advisor.whatsapp, advisor.name)}
                  >
                    <View style={styles.advisorInfo}>
                      <View style={styles.advisorAvatar}>
                        <Ionicons name="person" size={20} color="#25D366" />
                      </View>
                      <View>
                        <Text style={styles.advisorName}>{advisor.name}</Text>
                        <Text style={styles.advisorRole}>{advisor.role}</Text>
                      </View>
                    </View>
                    <View style={styles.whatsappIcon}>
                      <FontAwesome5 name="whatsapp" size={20} color="#fff" />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* My Applications History */}
            <View style={styles.historySection}>
              <Text style={styles.historySectionTitle}>Mis Solicitudes</Text>
              
              {isLoading ? (
                <ActivityIndicator size="large" color="#d4af37" style={{ marginTop: 20 }} />
              ) : applications.length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons name="file-document-outline" size={50} color="#667788" />
                  <Text style={styles.emptyText}>No tienes solicitudes aún</Text>
                </View>
              ) : (
                applications.map((app) => (
                  <TouchableOpacity
                    key={app.id}
                    style={styles.historyCard}
                    onPress={() => router.push({ pathname: '/application-details', params: { id: app.id } })}
                  >
                    <View style={styles.historyCardLeft}>
                      <MaterialCommunityIcons name="passport" size={24} color="#d4af37" />
                      <View>
                        <Text style={styles.historyCardTitle}>{app.visa_type_name}</Text>
                        <Text style={styles.historyCardSubtitle}>{app.destination_country}</Text>
                      </View>
                    </View>
                    <View style={[
                      styles.historyStatus,
                      app.status === 'aprobado' && styles.statusApproved,
                      app.status === 'completado' && styles.statusCompleted,
                      app.status === 'rechazado' && styles.statusRejected,
                    ]}>
                      <Text style={styles.historyStatusText}>
                        {app.status === 'pendiente' ? 'Pendiente' :
                         app.status === 'documentos' ? 'En Revisión' :
                         app.status === 'revision' ? 'Cita Consular' :
                         app.status === 'aprobado' ? 'Aprobado' :
                         app.status === 'completado' ? 'Completado' :
                         app.status === 'rechazado' ? 'Rechazado' : app.status}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>

      {/* Country Selection Modal */}
      <Modal
        visible={showCountryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCountryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecciona tu País de Residencia</Text>
              <TouchableOpacity onPress={() => setShowCountryModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.countryList}>
              {COUNTRIES_OF_RESIDENCE.map((country) => (
                <TouchableOpacity
                  key={country}
                  style={[
                    styles.countryOption,
                    user?.country_of_residence === country && styles.countryOptionSelected,
                  ]}
                  onPress={() => handleUpdateCountry(country)}
                  disabled={updatingCountry}
                >
                  <Text style={[
                    styles.countryOptionText,
                    user?.country_of_residence === country && styles.countryOptionTextSelected,
                  ]}>
                    {country}
                  </Text>
                  {user?.country_of_residence === country && (
                    <Ionicons name="checkmark" size={20} color="#d4af37" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            {updatingCountry && (
              <View style={styles.modalLoading}>
                <ActivityIndicator color="#d4af37" />
                <Text style={styles.modalLoadingText}>Actualizando...</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a1628' },
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 15 },
  errorText: { fontSize: 18, color: '#fff', marginTop: 15 },
  linkButton: { padding: 15, backgroundColor: '#d4af37', borderRadius: 10, marginTop: 10 },
  linkText: { color: '#0a1628', fontSize: 16, fontWeight: 'bold' },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212, 175, 55, 0.2)',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarContainer: { position: 'relative' },
  avatar: { width: 45, height: 45, borderRadius: 22, borderWidth: 2, borderColor: '#d4af37' },
  avatarPlaceholder: {
    width: 45, height: 45, borderRadius: 22,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#d4af37',
  },
  cameraIcon: {
    position: 'absolute', bottom: -2, right: -2,
    backgroundColor: '#d4af37', borderRadius: 8,
    width: 18, height: 18, justifyContent: 'center', alignItems: 'center',
  },
  userName: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  userResidence: { fontSize: 12, color: '#d4af37', marginTop: 2 },
  logoutButton: { flexDirection: 'row', alignItems: 'center', padding: 8, gap: 4 },
  logoutText: { color: '#f44336', fontSize: 13, fontWeight: '600' },
  
  scrollView: { flex: 1 },
  scrollContent: { padding: 15, paddingBottom: 40 },
  
  userInfoCard: {
    backgroundColor: 'rgba(26, 47, 74, 0.8)',
    borderRadius: 12, padding: 12, marginBottom: 15,
    borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  userInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  userInfoLabel: { fontSize: 13, color: '#8899aa' },
  userInfoValue: { fontSize: 13, color: '#fff', fontWeight: '500' },
  embassyBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    padding: 10, borderRadius: 8, marginTop: 8,
  },
  embassyText: { fontSize: 12, color: '#4caf50', flex: 1 },
  
  currentAppSection: {
    backgroundColor: 'rgba(26, 47, 74, 0.8)',
    borderRadius: 12, padding: 15, marginBottom: 15,
    borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.5)',
  },
  sectionLabel: { fontSize: 14, fontWeight: 'bold', color: '#d4af37', marginBottom: 15 },
  
  progressContainer: { marginBottom: 15 },
  progressBar: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  stepContainer: { alignItems: 'center', flex: 1 },
  stepCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#333', justifyContent: 'center', alignItems: 'center',
    marginBottom: 6,
  },
  stepCompleted: { backgroundColor: '#4caf50' },
  stepCurrent: { backgroundColor: '#ffc107' },
  stepLabel: { fontSize: 10, color: '#666', textAlign: 'center' },
  stepLabelActive: { color: '#fff' },
  progressLine: {
    height: 3, flex: 1, backgroundColor: '#333',
    marginTop: 14, marginHorizontal: -5,
  },
  progressLineCompleted: { backgroundColor: '#4caf50' },
  progressLineCurrent: { backgroundColor: 'linear-gradient(90deg, #4caf50, #ffc107)' },
  
  embassyInfo: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    padding: 10, borderRadius: 8, marginBottom: 10,
  },
  embassyInfoText: { fontSize: 12, color: '#4caf50', flex: 1 },
  
  viewDetailsButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)',
  },
  viewDetailsText: { fontSize: 13, color: '#d4af37' },
  
  newAppButton: { borderRadius: 10, overflow: 'hidden', marginBottom: 15 },
  buttonGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 14, gap: 8,
  },
  newAppText: { fontSize: 15, fontWeight: 'bold', color: '#0a1628' },
  
  advisorsSection: { marginBottom: 20 },
  advisorsSectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#d4af37', marginBottom: 10 },
  advisorButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(37, 211, 102, 0.15)',
    padding: 12, borderRadius: 10, marginBottom: 8,
    borderWidth: 1, borderColor: 'rgba(37, 211, 102, 0.3)',
  },
  advisorInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  advisorAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(37, 211, 102, 0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  advisorName: { fontSize: 14, fontWeight: '600', color: '#fff' },
  advisorRole: { fontSize: 11, color: '#8899aa' },
  whatsappIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#25D366', justifyContent: 'center', alignItems: 'center',
  },
  
  historySection: { marginTop: 5 },
  historySectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#d4af37', marginBottom: 12 },
  emptyState: { alignItems: 'center', paddingVertical: 30 },
  emptyText: { fontSize: 15, color: '#667788', marginTop: 10 },
  
  historyCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(26, 47, 74, 0.6)',
    padding: 12, borderRadius: 10, marginBottom: 8,
    borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.2)',
  },
  historyCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  historyCardTitle: { fontSize: 14, fontWeight: '600', color: '#fff' },
  historyCardSubtitle: { fontSize: 12, color: '#8899aa' },
  historyStatus: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
  },
  statusApproved: { backgroundColor: 'rgba(76, 175, 80, 0.2)' },
  statusCompleted: { backgroundColor: 'rgba(212, 175, 55, 0.2)' },
  statusRejected: { backgroundColor: 'rgba(244, 67, 54, 0.2)' },
  historyStatusText: { fontSize: 11, fontWeight: '600', color: '#ffc107' },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#132743',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212, 175, 55, 0.2)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  countryList: {
    padding: 10,
  },
  countryOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginVertical: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  countryOptionSelected: {
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    borderWidth: 1,
    borderColor: '#d4af37',
  },
  countryOptionText: {
    fontSize: 16,
    color: '#fff',
  },
  countryOptionTextSelected: {
    color: '#d4af37',
    fontWeight: '600',
  },
  modalLoading: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
    gap: 10,
  },
  modalLoadingText: {
    color: '#d4af37',
    fontSize: 14,
  },
});
