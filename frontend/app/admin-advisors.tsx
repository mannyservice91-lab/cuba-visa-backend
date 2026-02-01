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
  Platform,
  Modal,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient/build/LinearGradient';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../src/context/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface Advisor {
  id: string;
  name: string;
  whatsapp: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export default function AdminAdvisorsScreen() {
  const router = useRouter();
  const { admin, adminLogout, isAdmin, isLoading: authLoading } = useAuth();
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingAdvisor, setEditingAdvisor] = useState<Advisor | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    whatsapp: '',
    role: 'Asesor de Visas',
  });

  const fetchAdvisors = useCallback(async () => {
    if (!admin?.access_token) return;
    try {
      const response = await fetch(`${API_URL}/api/admin/advisors`, {
        headers: { Authorization: `Bearer ${admin.access_token}` },
      });
      if (response.status === 401) {
        await adminLogout();
        router.replace('/admin');
        return;
      }
      if (response.ok) {
        const data = await response.json();
        setAdvisors(data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [admin, adminLogout, router]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) {
      router.replace('/admin');
      return;
    }
    fetchAdvisors();
  }, [isAdmin, authLoading, fetchAdvisors, router]);

  const openModal = (advisor?: Advisor) => {
    if (advisor) {
      setEditingAdvisor(advisor);
      setFormData({
        name: advisor.name,
        whatsapp: advisor.whatsapp,
        role: advisor.role,
      });
    } else {
      setEditingAdvisor(null);
      setFormData({ name: '', whatsapp: '', role: 'Asesor de Visas' });
    }
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.whatsapp) {
      Alert.alert('Error', 'Nombre y WhatsApp son requeridos');
      return;
    }

    if (!admin?.access_token) return;
    setIsSubmitting(true);

    try {
      const url = editingAdvisor
        ? `${API_URL}/api/admin/advisors/${editingAdvisor.id}`
        : `${API_URL}/api/admin/advisors`;
      
      const response = await fetch(url, {
        method: editingAdvisor ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${admin.access_token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        Alert.alert('Éxito', editingAdvisor ? 'Asesor actualizado' : 'Asesor creado');
        setShowModal(false);
        fetchAdvisors();
      } else {
        throw new Error('Error al guardar');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar el asesor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (advisor: Advisor) => {
    const doDelete = async () => {
      if (!admin?.access_token) return;
      try {
        await fetch(`${API_URL}/api/admin/advisors/${advisor.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${admin.access_token}` },
        });
        fetchAdvisors();
      } catch (error) {
        Alert.alert('Error', 'No se pudo eliminar');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`¿Eliminar a ${advisor.name}?`)) {
        doDelete();
      }
    } else {
      Alert.alert('Eliminar Asesor', `¿Eliminar a ${advisor.name}?`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const handleToggle = async (advisor: Advisor) => {
    if (!admin?.access_token) return;
    try {
      await fetch(`${API_URL}/api/admin/advisors/${advisor.id}/toggle`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${admin.access_token}` },
      });
      fetchAdvisors();
    } catch (error) {
      Alert.alert('Error', 'No se pudo cambiar el estado');
    }
  };

  const openWhatsApp = (whatsapp: string) => {
    const number = whatsapp.replace(/[^0-9]/g, '');
    Linking.openURL(`https://wa.me/${number}`);
  };

  if (authLoading || isLoading) {
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
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#d4af37" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Gestión de Asesores</Text>
            <TouchableOpacity onPress={() => openModal()} style={styles.addButton}>
              <Ionicons name="add" size={24} color="#d4af37" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            {/* Info Card */}
            <View style={styles.infoCard}>
              <FontAwesome5 name="whatsapp" size={24} color="#25D366" />
              <Text style={styles.infoText}>
                Agrega asesores con sus números de WhatsApp para que los clientes puedan contactarlos directamente.
              </Text>
            </View>

            {/* Advisors List */}
            {advisors.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={50} color="#667788" />
                <Text style={styles.emptyText}>No hay asesores</Text>
                <Text style={styles.emptySubtext}>Agrega tu primer asesor</Text>
              </View>
            ) : (
              advisors.map((advisor) => (
                <View key={advisor.id} style={styles.advisorCard}>
                  <LinearGradient colors={['#1a2f4a', '#0d1f35']} style={styles.advisorGradient}>
                    <View style={styles.advisorHeader}>
                      <View style={styles.advisorInfo}>
                        <View style={styles.avatarContainer}>
                          <Ionicons name="person" size={24} color="#d4af37" />
                        </View>
                        <View>
                          <Text style={styles.advisorName}>{advisor.name}</Text>
                          <Text style={styles.advisorRole}>{advisor.role}</Text>
                        </View>
                      </View>
                      <View style={styles.advisorStatus}>
                        <Ionicons
                          name={advisor.is_active ? 'checkmark-circle' : 'close-circle'}
                          size={20}
                          color={advisor.is_active ? '#4caf50' : '#f44336'}
                        />
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.whatsappRow}
                      onPress={() => openWhatsApp(advisor.whatsapp)}
                    >
                      <FontAwesome5 name="whatsapp" size={18} color="#25D366" />
                      <Text style={styles.whatsappNumber}>{advisor.whatsapp}</Text>
                      <Ionicons name="open-outline" size={16} color="#667788" />
                    </TouchableOpacity>

                    <View style={styles.advisorActions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleToggle(advisor)}
                      >
                        <Ionicons
                          name={advisor.is_active ? 'eye-off' : 'eye'}
                          size={18}
                          color="#d4af37"
                        />
                        <Text style={styles.actionText}>
                          {advisor.is_active ? 'Desactivar' : 'Activar'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => openModal(advisor)}
                      >
                        <Ionicons name="pencil" size={18} color="#d4af37" />
                        <Text style={styles.actionText}>Editar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.deleteButton]}
                        onPress={() => handleDelete(advisor)}
                      >
                        <Ionicons name="trash" size={18} color="#f44336" />
                        <Text style={[styles.actionText, { color: '#f44336' }]}>Eliminar</Text>
                      </TouchableOpacity>
                    </View>
                  </LinearGradient>
                </View>
              ))
            )}
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>

      {/* Add/Edit Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingAdvisor ? 'Editar Asesor' : 'Nuevo Asesor'}
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Nombre</Text>
              <TextInput
                style={styles.input}
                placeholder="Nombre completo"
                placeholderTextColor="#667788"
                value={formData.name}
                onChangeText={(v) => setFormData({ ...formData, name: v })}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>WhatsApp</Text>
              <TextInput
                style={styles.input}
                placeholder="+381 69 344 4935"
                placeholderTextColor="#667788"
                keyboardType="phone-pad"
                value={formData.whatsapp}
                onChangeText={(v) => setFormData({ ...formData, whatsapp: v })}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Rol</Text>
              <TextInput
                style={styles.input}
                placeholder="Asesor de Visas"
                placeholderTextColor="#667788"
                value={formData.role}
                onChangeText={(v) => setFormData({ ...formData, role: v })}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#0a1628" />
                ) : (
                  <Text style={styles.saveButtonText}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 15,
    paddingVertical: 12,
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
    color: '#d4af37',
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
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(37, 211, 102, 0.1)',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#25D366',
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#fff',
    marginTop: 15,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#667788',
    marginTop: 5,
  },
  advisorCard: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  advisorGradient: {
    padding: 15,
  },
  advisorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  advisorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    width: 45,
    height: 45,
    borderRadius: 22,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  advisorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  advisorRole: {
    fontSize: 12,
    color: '#8899aa',
  },
  advisorStatus: {},
  whatsappRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(37, 211, 102, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 10,
  },
  whatsappNumber: {
    flex: 1,
    fontSize: 15,
    color: '#25D366',
    fontWeight: '500',
  },
  advisorActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 10,
    borderRadius: 8,
    gap: 6,
  },
  deleteButton: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
  },
  actionText: {
    fontSize: 12,
    color: '#d4af37',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1a2f4a',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#d4af37',
    textAlign: 'center',
    marginBottom: 20,
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
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    padding: 12,
    color: '#fff',
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#667788',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#667788',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#d4af37',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#0a1628',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
