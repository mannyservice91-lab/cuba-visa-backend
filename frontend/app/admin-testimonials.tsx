import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient/build/LinearGradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useAuth } from '../src/context/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

// Cross-platform alert helpers
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
      { text: 'Eliminar', style: 'destructive', onPress: onConfirm },
    ]);
  }
};

interface Testimonial {
  id: string;
  client_name: string;
  visa_type: string;
  description: string;
  image_data: string;
  is_active: boolean;
  created_at: string;
}

export default function AdminTestimonialsScreen() {
  const router = useRouter();
  const { admin, adminLogout, isAdmin } = useAuth();
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  // Form state
  const [clientName, setClientName] = useState('');
  const [visaType, setVisaType] = useState('turismo');
  const [description, setDescription] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const fetchTestimonials = useCallback(async () => {
    if (!admin?.access_token) return;
    try {
      const response = await fetch(`${API_URL}/api/admin/testimonials`, {
        headers: { Authorization: `Bearer ${admin.access_token}` },
      });
      if (response.status === 401) {
        await adminLogout();
        router.replace('/admin');
        return;
      }
      if (response.ok) {
        const data = await response.json();
        setTestimonials(data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [admin, adminLogout, router]);

  useEffect(() => {
    if (!isAdmin) {
      router.replace('/admin');
      return;
    }
    fetchTestimonials();
  }, [isAdmin, fetchTestimonials, router]);

  const pickImage = async () => {
    try {
      // For web, we need to handle image picking differently
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
        base64: Platform.OS === 'web' ? true : false, // Request base64 directly on web
      });

      console.log('Image picker result:', result.canceled ? 'cancelled' : 'selected');

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        
        let base64Data: string;
        
        if (Platform.OS === 'web') {
          // On web, if base64 is available use it, otherwise extract from uri
          if (asset.base64) {
            base64Data = asset.base64;
          } else if (asset.uri.startsWith('data:')) {
            // URI is already a data URI
            base64Data = asset.uri.split(',')[1] || asset.uri;
          } else {
            // Fallback: fetch the blob and convert
            try {
              const response = await fetch(asset.uri);
              const blob = await response.blob();
              base64Data = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                  const result = reader.result as string;
                  resolve(result.split(',')[1]);
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              });
            } catch (e) {
              console.error('Error converting blob:', e);
              showAlert('Error', 'No se pudo procesar la imagen');
              return;
            }
          }
        } else {
          // On native, use FileSystem
          base64Data = await FileSystem.readAsStringAsync(asset.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
        }
        
        // Save with proper data URI format
        setSelectedImage(`data:image/jpeg;base64,${base64Data}`);
        console.log('Image set successfully');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      showAlert('Error', 'No se pudo seleccionar la imagen. Intente de nuevo.');
    }
  };

  const handleSubmit = async () => {
    if (!clientName || !description || !selectedImage || !admin?.access_token) {
      showAlert('Error', 'Por favor completa todos los campos y selecciona una imagen');
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('Submitting testimonial...');
      const response = await fetch(`${API_URL}/api/admin/testimonials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${admin.access_token}`,
        },
        body: JSON.stringify({
          client_name: clientName,
          visa_type: visaType,
          destination_country: 'Serbia',
          description,
          image_data: selectedImage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al crear testimonio');
      }

      showAlert('Éxito', 'Testimonio agregado correctamente');
      setShowForm(false);
      setClientName('');
      setDescription('');
      setSelectedImage(null);
      fetchTestimonials();
    } catch (error: any) {
      console.error('Submit error:', error);
      showAlert('Error', error.message || 'No se pudo agregar el testimonio');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    showConfirm(
      'Eliminar Testimonio',
      '¿Estás seguro de eliminar este testimonio?',
      async () => {
        if (!admin?.access_token) return;
        try {
          await fetch(`${API_URL}/api/admin/testimonials/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${admin.access_token}` },
          });
          fetchTestimonials();
        } catch (error) {
          showAlert('Error', 'No se pudo eliminar');
        }
      }
    );
  };

  const handleToggle = async (id: string) => {
    if (!admin?.access_token) return;
    try {
      await fetch(`${API_URL}/api/admin/testimonials/${id}/toggle`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${admin.access_token}` },
      });
      fetchTestimonials();
    } catch (error) {
      showAlert('Error', 'No se pudo cambiar el estado');
    }
  };

  if (!isAdmin) return null;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0a1628', '#132743', '#0a1628']} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#d4af37" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Clientes Satisfechos</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowForm(!showForm)}
            >
              <Ionicons name={showForm ? 'close' : 'add'} size={24} color="#d4af37" />
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
              {/* Add Form */}
              {showForm && (
                <View style={styles.formCard}>
                  <LinearGradient colors={['#1a2f4a', '#0d1f35']} style={styles.formGradient}>
                    <Text style={styles.formTitle}>Agregar Foto de Visa</Text>

                    <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                      {selectedImage ? (
                        <Image
                          source={{ uri: selectedImage }}
                          style={styles.previewImage}
                        />
                      ) : (
                        <View style={styles.imagePickerContent}>
                          <Ionicons name="camera" size={40} color="#d4af37" />
                          <Text style={styles.imagePickerText}>Seleccionar Foto de Visa</Text>
                        </View>
                      )}
                    </TouchableOpacity>

                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Nombre del Cliente</Text>
                      <TextInput
                        style={styles.input}
                        value={clientName}
                        onChangeText={setClientName}
                        placeholder="Ej: Juan Pérez"
                        placeholderTextColor="#667788"
                      />
                    </View>

                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Tipo de Visa</Text>
                      <View style={styles.visaTypeRow}>
                        <TouchableOpacity
                          style={[
                            styles.visaTypeButton,
                            visaType === 'turismo' && styles.visaTypeButtonActive,
                          ]}
                          onPress={() => setVisaType('turismo')}
                        >
                          <Text
                            style={[
                              styles.visaTypeText,
                              visaType === 'turismo' && styles.visaTypeTextActive,
                            ]}
                          >
                            Turismo
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.visaTypeButton,
                            visaType === 'trabajo' && styles.visaTypeButtonActive,
                          ]}
                          onPress={() => setVisaType('trabajo')}
                        >
                          <Text
                            style={[
                              styles.visaTypeText,
                              visaType === 'trabajo' && styles.visaTypeTextActive,
                            ]}
                          >
                            Trabajo
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Descripción</Text>
                      <TextInput
                        style={[styles.input, styles.textArea]}
                        value={description}
                        onChangeText={setDescription}
                        placeholder="Ej: Visa aprobada en 3 semanas..."
                        placeholderTextColor="#667788"
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                      />
                    </View>

                    <TouchableOpacity
                      style={styles.submitButton}
                      onPress={handleSubmit}
                      disabled={isSubmitting}
                    >
                      <LinearGradient
                        colors={['#d4af37', '#b8962f']}
                        style={styles.submitGradient}
                      >
                        {isSubmitting ? (
                          <ActivityIndicator color="#0a1628" />
                        ) : (
                          <>
                            <Ionicons name="cloud-upload" size={20} color="#0a1628" />
                            <Text style={styles.submitText}>Publicar</Text>
                          </>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </LinearGradient>
                </View>
              )}

              {/* Testimonials List */}
              <Text style={styles.sectionTitle}>
                Testimonios Publicados ({testimonials.length})
              </Text>

              {isLoading ? (
                <ActivityIndicator size="large" color="#d4af37" style={styles.loader} />
              ) : testimonials.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="images-outline" size={50} color="#667788" />
                  <Text style={styles.emptyText}>No hay testimonios</Text>
                  <Text style={styles.emptySubtext}>Agrega fotos de visas aprobadas</Text>
                </View>
              ) : (
                testimonials.map((testimonial) => (
                  <View key={testimonial.id} style={styles.testimonialCard}>
                    <LinearGradient
                      colors={['#1a2f4a', '#0d1f35']}
                      style={styles.testimonialGradient}
                    >
                      <View style={styles.testimonialHeader}>
                        <View style={styles.testimonialInfo}>
                          <Text style={styles.testimonialName}>{testimonial.client_name}</Text>
                          <View style={styles.testimonialBadge}>
                            <Ionicons
                              name={testimonial.is_active ? 'checkmark-circle' : 'eye-off'}
                              size={14}
                              color={testimonial.is_active ? '#4caf50' : '#f44336'}
                            />
                            <Text
                              style={[
                                styles.testimonialStatus,
                                { color: testimonial.is_active ? '#4caf50' : '#f44336' },
                              ]}
                            >
                              {testimonial.is_active ? 'Activo' : 'Oculto'}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.testimonialActions}>
                          <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => handleToggle(testimonial.id)}
                          >
                            <Ionicons
                              name={testimonial.is_active ? 'eye-off' : 'eye'}
                              size={20}
                              color="#d4af37"
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => handleDelete(testimonial.id)}
                          >
                            <Ionicons name="trash" size={20} color="#f44336" />
                          </TouchableOpacity>
                        </View>
                      </View>
                      {testimonial.image_data && (
                        <Image
                          source={{ uri: `data:image/jpeg;base64,${testimonial.image_data}` }}
                          style={styles.testimonialImage}
                          resizeMode="cover"
                        />
                      )}
                      <Text style={styles.testimonialType}>
                        {testimonial.visa_type === 'turismo' ? 'Visa Turismo' : 'Visa Trabajo'}
                      </Text>
                      <Text style={styles.testimonialDesc}>{testimonial.description}</Text>
                    </LinearGradient>
                  </View>
                ))
              )}
            </ScrollView>
          </KeyboardAvoidingView>
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
  addButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  formCard: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 25,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  formGradient: {
    padding: 20,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d4af37',
    marginBottom: 20,
    textAlign: 'center',
  },
  imagePicker: {
    borderWidth: 2,
    borderColor: '#d4af37',
    borderStyle: 'dashed',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  imagePickerContent: {
    padding: 40,
    alignItems: 'center',
  },
  imagePickerText: {
    marginTop: 10,
    fontSize: 14,
    color: '#d4af37',
  },
  previewImage: {
    width: '100%',
    height: 200,
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    color: '#d4af37',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    padding: 12,
    fontSize: 16,
    color: '#ffffff',
  },
  textArea: {
    minHeight: 80,
  },
  visaTypeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  visaTypeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    alignItems: 'center',
  },
  visaTypeButtonActive: {
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    borderColor: '#d4af37',
  },
  visaTypeText: {
    fontSize: 14,
    color: '#667788',
  },
  visaTypeTextActive: {
    color: '#d4af37',
    fontWeight: 'bold',
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 10,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    gap: 8,
  },
  submitText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0a1628',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
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
    fontSize: 16,
    color: '#ffffff',
    marginTop: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#667788',
    marginTop: 5,
  },
  testimonialCard: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  testimonialGradient: {
    padding: 15,
  },
  testimonialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  testimonialInfo: {
    flex: 1,
  },
  testimonialName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  testimonialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  testimonialStatus: {
    fontSize: 12,
  },
  testimonialActions: {
    flexDirection: 'row',
    gap: 5,
  },
  actionButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
  },
  testimonialImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#0d1f35',
  },
  testimonialType: {
    fontSize: 13,
    color: '#d4af37',
    marginBottom: 5,
  },
  testimonialDesc: {
    fontSize: 14,
    color: '#8899aa',
    lineHeight: 20,
  },
});
