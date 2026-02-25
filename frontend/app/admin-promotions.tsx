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
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { API_URL } from '../src/config/api';

interface Promotion {
  id: string;
  title: string;
  description: string;
  image_data: string;
  link_url: string;
  link_text: string;
  is_active: boolean;
  created_at: string;
}

export default function AdminPromotionsScreen() {
  const router = useRouter();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageData, setImageData] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');

  useEffect(() => {
    loadPromotions();
  }, []);

  const loadPromotions = async () => {
    try {
      const token = await AsyncStorage.getItem('adminToken');
      if (!token) {
        router.replace('/admin');
        return;
      }

      const response = await fetch(`${API_URL}/api/admin/promotions`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setPromotions(data);
      }
    } catch (error) {
      console.error('Error loading promotions:', error);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setImageData(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const savePromotion = async () => {
    if (!title || !description) {
      showAlert('Error', 'Título y descripción son obligatorios');
      return;
    }

    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('adminToken');
      const url = editingId 
        ? `${API_URL}/api/admin/promotions/${editingId}`
        : `${API_URL}/api/admin/promotions`;
      
      const response = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          title,
          description,
          image_data: imageData,
          link_url: linkUrl,
          link_text: linkText,
        }),
      });

      if (response.ok) {
        showAlert('Éxito', editingId ? 'Promoción actualizada' : 'Promoción creada');
        resetForm();
        loadPromotions();
      }
    } catch (error) {
      console.error('Error saving promotion:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const togglePromotion = async (promoId: string, currentStatus: boolean) => {
    try {
      const token = await AsyncStorage.getItem('adminToken');
      await fetch(
        `${API_URL}/api/admin/promotions/${promoId}?is_active=${!currentStatus}`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      loadPromotions();
    } catch (error) {
      console.error('Error toggling promotion:', error);
    }
  };

  const deletePromotion = async (promoId: string) => {
    const confirmed = await confirmAction('¿Eliminar esta promoción?');
    if (!confirmed) return;

    try {
      const token = await AsyncStorage.getItem('adminToken');
      await fetch(`${API_URL}/api/admin/promotions/${promoId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      loadPromotions();
    } catch (error) {
      console.error('Error deleting promotion:', error);
    }
  };

  const editPromotion = (promo: Promotion) => {
    setEditingId(promo.id);
    setTitle(promo.title);
    setDescription(promo.description);
    setImageData(promo.image_data || '');
    setLinkUrl(promo.link_url || '');
    setLinkText(promo.link_text || '');
    setShowForm(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setImageData('');
    setLinkUrl('');
    setLinkText('');
    setShowForm(false);
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#d4af37" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis Promociones</Text>
        <TouchableOpacity onPress={() => setShowForm(!showForm)}>
          <Ionicons name={showForm ? "close" : "add-circle"} size={28} color="#d4af37" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Form */}
        {showForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>{editingId ? 'Editar Promoción' : 'Nueva Promoción'}</Text>

            {/* Image Upload */}
            <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
              {imageData ? (
                <Image source={{ uri: imageData }} style={styles.imagePreview} />
              ) : (
                <>
                  <Ionicons name="image-outline" size={40} color="#667788" />
                  <Text style={styles.imagePickerText}>Añadir imagen</Text>
                </>
              )}
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder="Título *"
              placeholderTextColor="#667788"
              value={title}
              onChangeText={setTitle}
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Descripción *"
              placeholderTextColor="#667788"
              value={description}
              onChangeText={setDescription}
              multiline
            />

            <TextInput
              style={styles.input}
              placeholder="URL del enlace (opcional)"
              placeholderTextColor="#667788"
              value={linkUrl}
              onChangeText={setLinkUrl}
            />

            <TextInput
              style={styles.input}
              placeholder="Texto del botón (opcional)"
              placeholderTextColor="#667788"
              value={linkText}
              onChangeText={setLinkText}
            />

            <View style={styles.formActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={resetForm}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, submitting && styles.buttonDisabled]}
                onPress={savePromotion}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#0a1628" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>{editingId ? 'Actualizar' : 'Publicar'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Promotions List */}
        {loading ? (
          <ActivityIndicator size="large" color="#d4af37" style={styles.loader} />
        ) : promotions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="megaphone-outline" size={60} color="#667788" />
            <Text style={styles.emptyText}>No tienes promociones</Text>
            <Text style={styles.emptySubtext}>Crea ofertas y publicidad para tu plataforma</Text>
          </View>
        ) : (
          promotions.map((promo) => (
            <View key={promo.id} style={styles.promoCard}>
              {promo.image_data && (
                <Image source={{ uri: promo.image_data }} style={styles.promoImage} />
              )}
              <View style={styles.promoContent}>
                <View style={styles.promoHeader}>
                  <Text style={styles.promoTitle}>{promo.title}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      promo.is_active ? styles.statusActive : styles.statusInactive,
                    ]}
                  >
                    <Text style={styles.statusText}>
                      {promo.is_active ? 'Activa' : 'Inactiva'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.promoDesc}>{promo.description}</Text>
                {promo.link_url && (
                  <View style={styles.linkInfo}>
                    <Ionicons name="link" size={14} color="#2196f3" />
                    <Text style={styles.linkText}>{promo.link_text || promo.link_url}</Text>
                  </View>
                )}
                <View style={styles.promoActions}>
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => editPromotion(promo)}
                  >
                    <Ionicons name="create-outline" size={18} color="#d4af37" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.toggleBtn, promo.is_active ? styles.deactivateBtn : styles.activateBtn]}
                    onPress={() => togglePromotion(promo.id, promo.is_active)}
                  >
                    <Text style={styles.toggleBtnText}>
                      {promo.is_active ? 'Desactivar' : 'Activar'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => deletePromotion(promo.id)}
                  >
                    <Ionicons name="trash" size={18} color="#f44336" />
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
  content: {
    flex: 1,
    padding: 16,
  },
  formCard: {
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d4af37',
    marginBottom: 16,
  },
  imagePicker: {
    height: 150,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(212, 175, 55, 0.2)',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePickerText: {
    fontSize: 14,
    color: '#667788',
    marginTop: 8,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
    borderRadius: 10,
    padding: 14,
    color: '#fff',
    fontSize: 16,
    marginBottom: 12,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#667788',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    color: '#667788',
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#d4af37',
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 15,
    color: '#0a1628',
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loader: {
    marginTop: 50,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    color: '#8899aa',
    fontSize: 18,
    marginTop: 16,
  },
  emptySubtext: {
    color: '#667788',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  promoCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
    overflow: 'hidden',
  },
  promoImage: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  promoContent: {
    padding: 16,
  },
  promoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  promoTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  statusBadge: {
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
  promoDesc: {
    fontSize: 14,
    color: '#aaaaaa',
    lineHeight: 20,
    marginBottom: 10,
  },
  linkInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  linkText: {
    fontSize: 13,
    color: '#2196f3',
  },
  promoActions: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  editBtn: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#d4af37',
    borderRadius: 8,
  },
  toggleBtn: {
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
  toggleBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  deleteBtn: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#f44336',
    borderRadius: 8,
  },
});
