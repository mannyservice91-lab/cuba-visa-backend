import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { API_URL } from '../src/config/api';

type ViewMode = 'login' | 'register' | 'dashboard' | 'editProfile';

interface ProviderProfile {
  id: string;
  email: string;
  business_name: string;
  owner_name: string;
  phone: string;
  whatsapp_number: string;
  whatsapp_group_link: string;
  service_type: string;
  description: string;
  logo_url: string;
  subscription_plan: string;
  subscription_status: string;
  subscription_end: string | null;
  days_remaining: number;
  payment_verified: boolean;
}

interface Offer {
  id: string;
  title: string;
  description: string;
  image_data: string;
  exchange_rate: string;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

const SERVICE_TYPES = [
  { value: 'remesas', label: 'Remesas', emoji: '💵' },
  { value: 'pasajes', label: 'Pasajes', emoji: '✈️' },
  { value: 'tienda', label: 'Tienda', emoji: '🛒' },
  { value: 'restaurante', label: 'Restaurante', emoji: '🍽️' },
  { value: 'servicios', label: 'Otros Servicios', emoji: '🔧' },
];

export default function ProviderScreen() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('login');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Auth fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [whatsappGroup, setWhatsappGroup] = useState('');
  const [description, setDescription] = useState('');
  const [serviceType, setServiceType] = useState('remesas');
  const [logoData, setLogoData] = useState('');
  
  // Dashboard state
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [showNewOffer, setShowNewOffer] = useState(false);
  
  // New offer fields
  const [offerTitle, setOfferTitle] = useState('');
  const [offerDescription, setOfferDescription] = useState('');
  const [offerRate, setOfferRate] = useState('');
  const [offerExpiry, setOfferExpiry] = useState('');
  const [offerImage, setOfferImage] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('providerToken');
      if (token) {
        await loadDashboard(token);
      } else {
        setViewMode('login');
      }
    } catch (error) {
      setViewMode('login');
    } finally {
      setLoading(false);
    }
  };

  const loadDashboard = async (token: string) => {
    try {
      const [profileRes, offersRes] = await Promise.all([
        fetch(`${API_URL}/api/provider/me`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/provider/offers`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (profileRes.ok && offersRes.ok) {
        const profileData = await profileRes.json();
        const offersData = await offersRes.json();
        setProfile(profileData);
        setOffers(offersData);
        setViewMode('dashboard');
      } else {
        await AsyncStorage.removeItem('providerToken');
        setViewMode('login');
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
      setViewMode('login');
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Complete todos los campos');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/provider/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        await AsyncStorage.setItem('providerToken', data.access_token);
        await loadDashboard(data.access_token);
      } else {
        setError(data.detail || 'Error al iniciar sesión');
      }
    } catch (error) {
      setError('Error de conexión');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async () => {
    if (!email || !password || !businessName || !ownerName || !phone || !whatsappNumber) {
      setError('Complete todos los campos obligatorios');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/provider/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          business_name: businessName,
          owner_name: ownerName,
          phone,
          whatsapp_number: whatsappNumber,
          whatsapp_group_link: whatsappGroup,
          service_type: serviceType,
          description,
          logo_url: logoData,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        if (Platform.OS === 'web') {
          alert('Registro exitoso. Su cuenta será activada por el administrador.');
        } else {
          Alert.alert('Registro Exitoso', 'Su cuenta será activada por el administrador.');
        }
        setViewMode('login');
        clearForm();
      } else {
        setError(data.detail || 'Error al registrarse');
      }
    } catch (error) {
      setError('Error de conexión');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('providerToken');
    setProfile(null);
    setOffers([]);
    setViewMode('login');
  };

  const pickImage = async (forOffer = false) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: forOffer ? [16, 9] : [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const base64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
      if (forOffer) {
        setOfferImage(base64);
      } else {
        setLogoData(base64);
      }
    }
  };

  const updateProfile = async () => {
    setSubmitting(true);
    setError('');

    try {
      const token = await AsyncStorage.getItem('providerToken');
      const response = await fetch(`${API_URL}/api/provider/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          business_name: businessName || profile?.business_name,
          owner_name: ownerName || profile?.owner_name,
          phone: phone || profile?.phone,
          whatsapp_number: whatsappNumber || profile?.whatsapp_number,
          whatsapp_group_link: whatsappGroup,
          description: description,
          logo_url: logoData || profile?.logo_url,
        }),
      });

      if (response.ok) {
        await loadDashboard(token!);
        setViewMode('dashboard');
        if (Platform.OS === 'web') {
          alert('Perfil actualizado correctamente');
        } else {
          Alert.alert('Éxito', 'Perfil actualizado correctamente');
        }
      } else {
        const data = await response.json();
        setError(data.detail || 'Error al actualizar perfil');
      }
    } catch (error) {
      setError('Error de conexión');
    } finally {
      setSubmitting(false);
    }
  };

  const createOffer = async () => {
    if (!offerTitle || !offerDescription) {
      setError('Título y descripción son obligatorios');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const token = await AsyncStorage.getItem('providerToken');
      const response = await fetch(`${API_URL}/api/provider/offers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: offerTitle,
          description: offerDescription,
          exchange_rate: offerRate,
          expires_at: offerExpiry ? new Date(offerExpiry).toISOString() : null,
          image_data: offerImage,
        }),
      });

      if (response.ok) {
        await loadDashboard(token!);
        setShowNewOffer(false);
        clearOfferForm();
      } else {
        const data = await response.json();
        setError(data.detail || 'Error al crear oferta');
      }
    } catch (error) {
      setError('Error de conexión');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleOffer = async (offerId: string) => {
    try {
      const token = await AsyncStorage.getItem('providerToken');
      const offer = offers.find((o) => o.id === offerId);
      
      await fetch(`${API_URL}/api/provider/offers/${offerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_active: !offer?.is_active }),
      });
      
      await loadDashboard(token!);
    } catch (error) {
      console.error('Error toggling offer:', error);
    }
  };

  const deleteOffer = async (offerId: string) => {
    const confirmDelete = () => {
      return new Promise((resolve) => {
        if (Platform.OS === 'web') {
          resolve(window.confirm('¿Eliminar esta oferta?'));
        } else {
          Alert.alert('Confirmar', '¿Eliminar esta oferta?', [
            { text: 'Cancelar', onPress: () => resolve(false) },
            { text: 'Eliminar', onPress: () => resolve(true), style: 'destructive' },
          ]);
        }
      });
    };

    if (!(await confirmDelete())) return;

    try {
      const token = await AsyncStorage.getItem('providerToken');
      await fetch(`${API_URL}/api/provider/offers/${offerId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      await loadDashboard(token!);
    } catch (error) {
      console.error('Error deleting offer:', error);
    }
  };

  const clearForm = () => {
    setEmail('');
    setPassword('');
    setBusinessName('');
    setOwnerName('');
    setPhone('');
    setWhatsappNumber('');
    setWhatsappGroup('');
    setDescription('');
    setLogoData('');
    setServiceType('remesas');
  };

  const clearOfferForm = () => {
    setOfferTitle('');
    setOfferDescription('');
    setOfferRate('');
    setOfferExpiry('');
    setOfferImage('');
  };

  const startEditProfile = () => {
    setBusinessName(profile?.business_name || '');
    setOwnerName(profile?.owner_name || '');
    setPhone(profile?.phone || '');
    setWhatsappNumber(profile?.whatsapp_number || '');
    setWhatsappGroup(profile?.whatsapp_group_link || '');
    setDescription(profile?.description || '');
    setLogoData(profile?.logo_url || '');
    setViewMode('editProfile');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#d4af37" />
      </View>
    );
  }

  // LOGIN VIEW
  if (viewMode === 'login') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.authContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#d4af37" />
          </TouchableOpacity>

          <View style={styles.authHeader}>
            <Ionicons name="storefront" size={60} color="#d4af37" />
            <Text style={styles.authTitle}>Portal de Proveedores</Text>
            <Text style={styles.authSubtitle}>Accede a tu panel de servicios</Text>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="tu@email.com"
              placeholderTextColor="#667788"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Contraseña</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#667788"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, submitting && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#0a1628" />
            ) : (
              <>
                <Ionicons name="log-in" size={20} color="#0a1628" />
                <Text style={styles.primaryButtonText}>Iniciar Sesión</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              setViewMode('register');
              setError('');
            }}
          >
            <Text style={styles.secondaryButtonText}>¿No tienes cuenta? Regístrate</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // REGISTER VIEW
  if (viewMode === 'register') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.authContent}>
          <TouchableOpacity onPress={() => setViewMode('login')} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#d4af37" />
          </TouchableOpacity>

          <View style={styles.authHeader}>
            <Ionicons name="person-add" size={50} color="#d4af37" />
            <Text style={styles.authTitle}>Registro de Proveedor</Text>
            <Text style={styles.authSubtitle}>Complete sus datos para solicitar acceso</Text>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Logo Upload */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Logo de su negocio (opcional)</Text>
            <TouchableOpacity style={styles.imagePickerBtn} onPress={() => pickImage(false)}>
              {logoData ? (
                <Image source={{ uri: logoData }} style={styles.logoPreview} />
              ) : (
                <>
                  <Ionicons name="camera" size={30} color="#667788" />
                  <Text style={styles.imagePickerText}>Subir logo</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Tipo de Servicio *</Text>
            <View style={styles.serviceTypeGrid}>
              {SERVICE_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.serviceTypeBtn,
                    serviceType === type.value && styles.serviceTypeBtnActive,
                  ]}
                  onPress={() => setServiceType(type.value)}
                >
                  <Text style={styles.serviceTypeEmoji}>{type.emoji}</Text>
                  <Text
                    style={[
                      styles.serviceTypeLabel,
                      serviceType === type.value && styles.serviceTypeLabelActive,
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Nombre del Negocio *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Viaja con Hector"
              placeholderTextColor="#667788"
              value={businessName}
              onChangeText={setBusinessName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Nombre del Propietario *</Text>
            <TextInput
              style={styles.input}
              placeholder="Tu nombre completo"
              placeholderTextColor="#667788"
              value={ownerName}
              onChangeText={setOwnerName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email *</Text>
            <TextInput
              style={styles.input}
              placeholder="tu@email.com"
              placeholderTextColor="#667788"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Contraseña *</Text>
            <TextInput
              style={styles.input}
              placeholder="Mínimo 6 caracteres"
              placeholderTextColor="#667788"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Teléfono *</Text>
            <TextInput
              style={styles.input}
              placeholder="+53 5555 5555"
              placeholderTextColor="#667788"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>WhatsApp (con código de país) *</Text>
            <TextInput
              style={styles.input}
              placeholder="+5355555555"
              placeholderTextColor="#667788"
              value={whatsappNumber}
              onChangeText={setWhatsappNumber}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Link del Grupo de WhatsApp (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="https://chat.whatsapp.com/..."
              placeholderTextColor="#667788"
              value={whatsappGroup}
              onChangeText={setWhatsappGroup}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Descripción del servicio (opcional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe tu servicio..."
              placeholderTextColor="#667788"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, submitting && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#0a1628" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#0a1628" />
                <Text style={styles.primaryButtonText}>Solicitar Registro</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.noteText}>
            * Su cuenta será revisada y activada por el administrador
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // EDIT PROFILE VIEW
  if (viewMode === 'editProfile') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.dashboardHeader}>
          <TouchableOpacity onPress={() => setViewMode('dashboard')}>
            <Ionicons name="arrow-back" size={24} color="#d4af37" />
          </TouchableOpacity>
          <Text style={styles.businessText}>Editar Perfil</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.dashboardContent}>
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Logo Upload */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Logo de su negocio</Text>
            <TouchableOpacity style={styles.imagePickerBtnLarge} onPress={() => pickImage(false)}>
              {logoData ? (
                <Image source={{ uri: logoData }} style={styles.logoPreviewLarge} />
              ) : (
                <>
                  <Ionicons name="camera" size={40} color="#667788" />
                  <Text style={styles.imagePickerText}>Subir o cambiar logo</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Nombre del Negocio</Text>
            <TextInput
              style={styles.input}
              value={businessName}
              onChangeText={setBusinessName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Propietario</Text>
            <TextInput
              style={styles.input}
              value={ownerName}
              onChangeText={setOwnerName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Teléfono</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>WhatsApp</Text>
            <TextInput
              style={styles.input}
              value={whatsappNumber}
              onChangeText={setWhatsappNumber}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Link del Grupo de WhatsApp</Text>
            <TextInput
              style={styles.input}
              value={whatsappGroup}
              onChangeText={setWhatsappGroup}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Descripción</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
            />
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, submitting && styles.buttonDisabled]}
            onPress={updateProfile}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#0a1628" />
            ) : (
              <>
                <Ionicons name="save" size={20} color="#0a1628" />
                <Text style={styles.primaryButtonText}>Guardar Cambios</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // DASHBOARD VIEW
  const serviceEmoji = SERVICE_TYPES.find(t => t.value === profile?.service_type)?.emoji || '🔧';
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.dashboardHeader}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#d4af37" />
        </TouchableOpacity>
        <Text style={styles.businessText}>{profile?.business_name}</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Ionicons name="log-out" size={24} color="#d4af37" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.dashboardContent}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            {profile?.logo_url ? (
              <Image source={{ uri: profile.logo_url }} style={styles.profileLogo} />
            ) : (
              <View style={styles.profileLogoPlaceholder}>
                <Text style={styles.profileEmoji}>{serviceEmoji}</Text>
              </View>
            )}
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{profile?.business_name}</Text>
              <Text style={styles.profileOwner}>con {profile?.owner_name}</Text>
            </View>
            <TouchableOpacity style={styles.editProfileBtn} onPress={startEditProfile}>
              <Ionicons name="create-outline" size={20} color="#d4af37" />
            </TouchableOpacity>
          </View>

          <View style={styles.profileDetails}>
            <View style={styles.profileRow}>
              <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
              <Text style={styles.profileText}>{profile?.whatsapp_number}</Text>
            </View>
            {profile?.whatsapp_group_link && (
              <TouchableOpacity
                style={styles.profileRow}
                onPress={() => Linking.openURL(profile.whatsapp_group_link)}
              >
                <Ionicons name="people" size={18} color="#2196f3" />
                <Text style={[styles.profileText, styles.linkText]}>Ver grupo de WhatsApp</Text>
              </TouchableOpacity>
            )}
            {profile?.description && (
              <Text style={styles.profileDescription}>{profile.description}</Text>
            )}
          </View>
        </View>

        {/* Subscription Status Card */}
        <View style={[styles.subscriptionCard, 
          profile?.subscription_status === 'expired' && styles.subscriptionExpired,
          profile?.subscription_status === 'active' && styles.subscriptionActive,
          (profile?.subscription_status === 'trial' || profile?.subscription_status === 'trial_pending') && styles.subscriptionTrial
        ]}>
          <View style={styles.subscriptionHeader}>
            <Ionicons 
              name={profile?.subscription_status === 'expired' ? 'warning' : profile?.subscription_status === 'active' ? 'checkmark-circle' : 'time'} 
              size={24} 
              color={profile?.subscription_status === 'expired' ? '#f44336' : profile?.subscription_status === 'active' ? '#4caf50' : '#ff9800'} 
            />
            <View style={styles.subscriptionInfo}>
              <Text style={styles.subscriptionTitle}>
                {profile?.subscription_status === 'expired' ? 'Suscripción Expirada' :
                 profile?.subscription_status === 'active' ? 'Suscripción Activa' :
                 profile?.subscription_status === 'trial' ? 'Período de Prueba' :
                 profile?.subscription_status === 'awaiting_payment' ? 'Pendiente de Pago' :
                 'En Espera de Activación'}
              </Text>
              {profile?.days_remaining !== undefined && profile.days_remaining > 0 && (
                <Text style={styles.subscriptionDays}>
                  {profile.days_remaining} día{profile.days_remaining !== 1 ? 's' : ''} restante{profile.days_remaining !== 1 ? 's' : ''}
                </Text>
              )}
            </View>
          </View>
          
          {profile?.subscription_status === 'expired' && (
            <View style={styles.subscriptionAlert}>
              <Text style={styles.subscriptionAlertText}>
                Su cuenta está desactivada. Contacte al administrador para renovar su suscripción.
              </Text>
              <View style={styles.subscriptionPlans}>
                <Text style={styles.plansLabel}>Planes disponibles:</Text>
                <Text style={styles.planOption}>- Mensual: 50€</Text>
                <Text style={styles.planOption}>- Semestral: 250€</Text>
                <Text style={styles.planOption}>- Anual: 450€</Text>
              </View>
            </View>
          )}
          
          {(profile?.subscription_status === 'trial' || profile?.subscription_status === 'trial_pending') && profile?.days_remaining !== undefined && profile.days_remaining <= 3 && (
            <View style={styles.subscriptionAlert}>
              <Text style={styles.subscriptionAlertText}>
                {profile.days_remaining === 0 
                  ? 'Su período de prueba termina hoy.' 
                  : `Su período de prueba termina en ${profile.days_remaining} día${profile.days_remaining !== 1 ? 's' : ''}.`}
                {'\n'}Contacte al administrador para elegir un plan de pago.
              </Text>
            </View>
          )}
          
          {profile?.subscription_status === 'awaiting_payment' && (
            <View style={styles.subscriptionAlert}>
              <Text style={styles.subscriptionAlertText}>
                Su cuenta será activada cuando el administrador apruebe su solicitud.
              </Text>
            </View>
          )}
        </View>

        {/* Offers Section */}
        <View style={styles.offersHeader}>
          <Text style={styles.sectionTitle}>Mis Ofertas ({offers.length})</Text>
          <TouchableOpacity
            style={styles.addOfferBtn}
            onPress={() => setShowNewOffer(true)}
          >
            <Ionicons name="add" size={20} color="#0a1628" />
            <Text style={styles.addOfferText}>Nueva</Text>
          </TouchableOpacity>
        </View>

        {/* New Offer Form */}
        {showNewOffer && (
          <View style={styles.newOfferForm}>
            <Text style={styles.formTitle}>Nueva Oferta</Text>
            
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Image Upload */}
            <TouchableOpacity style={styles.offerImagePicker} onPress={() => pickImage(true)}>
              {offerImage ? (
                <Image source={{ uri: offerImage }} style={styles.offerImagePreview} />
              ) : (
                <>
                  <Ionicons name="image-outline" size={30} color="#667788" />
                  <Text style={styles.imagePickerText}>Añadir imagen (opcional)</Text>
                </>
              )}
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder="Título de la oferta *"
              placeholderTextColor="#667788"
              value={offerTitle}
              onChangeText={setOfferTitle}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Descripción *"
              placeholderTextColor="#667788"
              value={offerDescription}
              onChangeText={setOfferDescription}
              multiline
            />
            <TextInput
              style={styles.input}
              placeholder="Precio (Ej: 850 EUR o 1 USD = 350 CUP)"
              placeholderTextColor="#667788"
              value={offerRate}
              onChangeText={setOfferRate}
            />
            <TextInput
              style={styles.input}
              placeholder="Fecha de vencimiento (YYYY-MM-DD)"
              placeholderTextColor="#667788"
              value={offerExpiry}
              onChangeText={setOfferExpiry}
            />

            <View style={styles.formActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setShowNewOffer(false);
                  clearOfferForm();
                  setError('');
                }}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, submitting && styles.buttonDisabled]}
                onPress={createOffer}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#0a1628" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Publicar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Offers List */}
        {offers.length === 0 ? (
          <View style={styles.emptyOffers}>
            <Ionicons name="pricetag-outline" size={50} color="#667788" />
            <Text style={styles.emptyText}>No tienes ofertas publicadas</Text>
            <Text style={styles.emptySubtext}>Crea tu primera oferta para que los clientes la vean</Text>
          </View>
        ) : (
          offers.map((offer) => (
            <View key={offer.id} style={styles.offerCard}>
              {offer.image_data && (
                <Image source={{ uri: offer.image_data }} style={styles.offerCardImage} />
              )}
              <View style={styles.offerCardContent}>
                <View style={styles.offerHeader}>
                  <Text style={styles.offerTitle}>{offer.title}</Text>
                  <View
                    style={[
                      styles.offerStatus,
                      offer.is_active ? styles.statusActive : styles.statusInactive,
                    ]}
                  >
                    <Text style={styles.statusText}>
                      {offer.is_active ? 'Activa' : 'Inactiva'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.offerDesc}>{offer.description}</Text>
                {offer.exchange_rate && (
                  <View style={styles.rateBox}>
                    <Ionicons name="pricetag" size={16} color="#4caf50" />
                    <Text style={styles.rateText}>{offer.exchange_rate}</Text>
                  </View>
                )}
                {offer.expires_at && (
                  <Text style={styles.expiryText}>
                    Vence: {new Date(offer.expires_at).toLocaleDateString()}
                  </Text>
                )}
                <View style={styles.offerActions}>
                  <TouchableOpacity
                    style={[styles.offerBtn, offer.is_active ? styles.deactivateBtn : styles.activateBtn]}
                    onPress={() => toggleOffer(offer.id)}
                  >
                    <Text style={styles.offerBtnText}>
                      {offer.is_active ? 'Desactivar' : 'Activar'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.offerBtn, styles.deleteBtn]}
                    onPress={() => deleteOffer(offer.id)}
                  >
                    <Text style={styles.offerBtnText}>Eliminar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}

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
    backgroundColor: '#0a1628',
    justifyContent: 'center',
    alignItems: 'center',
  },
  authContent: {
    padding: 20,
    paddingBottom: 40,
  },
  backBtn: {
    marginBottom: 20,
  },
  authHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  authTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#d4af37',
    marginTop: 15,
  },
  authSubtitle: {
    fontSize: 14,
    color: '#8899aa',
    marginTop: 5,
  },
  errorBox: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    borderWidth: 1,
    borderColor: '#f44336',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#f44336',
    fontSize: 14,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#d4af37',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    borderRadius: 10,
    padding: 14,
    color: '#fff',
    fontSize: 16,
    marginBottom: 10,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d4af37',
    padding: 16,
    borderRadius: 10,
    gap: 10,
    marginTop: 10,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0a1628',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  secondaryButton: {
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  secondaryButtonText: {
    color: '#d4af37',
    fontSize: 14,
  },
  noteText: {
    fontSize: 12,
    color: '#667788',
    textAlign: 'center',
    marginTop: 20,
  },
  // Image Picker
  imagePickerBtn: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 2,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    overflow: 'hidden',
  },
  imagePickerBtnLarge: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 2,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    overflow: 'hidden',
  },
  logoPreview: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  logoPreviewLarge: {
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  imagePickerText: {
    fontSize: 12,
    color: '#667788',
    marginTop: 5,
  },
  // Service Type
  serviceTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  serviceTypeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
    gap: 6,
  },
  serviceTypeBtnActive: {
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    borderColor: '#d4af37',
  },
  serviceTypeEmoji: {
    fontSize: 16,
  },
  serviceTypeLabel: {
    fontSize: 13,
    color: '#8899aa',
  },
  serviceTypeLabelActive: {
    color: '#d4af37',
    fontWeight: '600',
  },
  // Dashboard styles
  dashboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212, 175, 55, 0.2)',
  },
  businessText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d4af37',
    flex: 1,
    textAlign: 'center',
  },
  dashboardContent: {
    flex: 1,
    padding: 16,
  },
  profileCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileLogo: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 15,
  },
  profileLogoPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  profileEmoji: {
    fontSize: 30,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileOwner: {
    fontSize: 14,
    color: '#8899aa',
    marginTop: 2,
  },
  editProfileBtn: {
    padding: 10,
  },
  profileDetails: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(212, 175, 55, 0.2)',
    paddingTop: 16,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  profileText: {
    fontSize: 14,
    color: '#cccccc',
  },
  linkText: {
    color: '#2196f3',
    textDecorationLine: 'underline',
  },
  profileDescription: {
    fontSize: 14,
    color: '#aaaaaa',
    marginTop: 10,
    lineHeight: 20,
  },
  offersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  addOfferBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d4af37',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    gap: 4,
  },
  addOfferText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0a1628',
  },
  newOfferForm: {
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  formTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#d4af37',
    marginBottom: 16,
  },
  offerImagePicker: {
    height: 120,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(212, 175, 55, 0.2)',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  offerImagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  formActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  cancelBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#667788',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#667788',
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#d4af37',
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#0a1628',
    fontWeight: '600',
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
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
    overflow: 'hidden',
  },
  offerCardImage: {
    width: '100%',
    height: 150,
    resizeMode: 'cover',
  },
  offerCardContent: {
    padding: 16,
  },
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  offerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  offerStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusActive: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
  },
  statusInactive: {
    backgroundColor: 'rgba(158, 158, 158, 0.2)',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  offerDesc: {
    fontSize: 14,
    color: '#aaaaaa',
    marginBottom: 10,
  },
  rateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    padding: 10,
    borderRadius: 8,
    gap: 8,
    marginBottom: 8,
  },
  rateText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4caf50',
  },
  expiryText: {
    fontSize: 12,
    color: '#ff9800',
    marginBottom: 10,
  },
  offerActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  offerBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  activateBtn: {
    backgroundColor: '#4caf50',
  },
  deactivateBtn: {
    backgroundColor: '#ff9800',
  },
  deleteBtn: {
    backgroundColor: '#f44336',
  },
  offerBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
