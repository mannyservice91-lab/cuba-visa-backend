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
  Switch,
  Image,
  Platform,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient/build/LinearGradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../src/context/AuthContext';

import { API_URL } from '../src/config/api';

interface VisaType {
  id: string;
  name: string;
  price: number;
  currency: string;
  processing_time: string;
  requirements: string;
}

interface Destination {
  id: string;
  country: string;
  country_code: string;
  enabled: boolean;
  image_url: string;
  visa_types: VisaType[];
  requirements: string;
  description: string;
  message: string;
}

export default function AdminDestinationsScreen() {
  const router = useRouter();
  const { admin, adminLogout, isAdmin, isLoading: authLoading } = useAuth();
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [showVisaModal, setShowVisaModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [visaForm, setVisaForm] = useState({
    name: '',
    price: '',
    processing_time: '1-2 meses',
    requirements: '',
  });
  const [editForm, setEditForm] = useState({
    country: '',
    country_code: '',
    description: '',
    image_url: '',
    message: '',
  });
  const [createForm, setCreateForm] = useState({
    country: '',
    country_code: '',
    description: '',
    image_url: '',
    message: 'Muy pronto disponible',
  });

  const fetchDestinations = useCallback(async () => {
    if (!admin?.access_token) return;
    try {
      const response = await fetch(`${API_URL}/api/destinations`, {
        headers: { Authorization: `Bearer ${admin.access_token}` },
      });
      if (response.status === 401) {
        await adminLogout();
        router.replace('/admin');
        return;
      }
      const data = await response.json();
      setDestinations(data);
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
    fetchDestinations();
  }, [isAdmin, authLoading, fetchDestinations, router]);

  const toggleDestination = async (destination: Destination) => {
    if (!admin?.access_token) return;
    try {
      const response = await fetch(`${API_URL}/api/admin/destinations/${destination.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${admin.access_token}`,
        },
        body: JSON.stringify({ enabled: !destination.enabled }),
      });
      if (response.ok) {
        fetchDestinations();
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el destino');
    }
  };

  const addVisaType = async () => {
    if (!selectedDestination || !admin?.access_token) return;
    if (!visaForm.name || !visaForm.price) {
      Alert.alert('Error', 'Complete todos los campos requeridos');
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/admin/destinations/${selectedDestination.id}/visa-types`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${admin.access_token}`,
          },
          body: JSON.stringify({
            name: visaForm.name,
            price: parseInt(visaForm.price),
            currency: 'EUR',
            processing_time: visaForm.processing_time,
            requirements: visaForm.requirements,
          }),
        }
      );

      if (response.ok) {
        Alert.alert('Éxito', 'Tipo de visa agregado');
        setShowVisaModal(false);
        setVisaForm({ name: '', price: '', processing_time: '1-2 meses', requirements: '' });
        fetchDestinations();
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo agregar el tipo de visa');
    }
  };

  const deleteVisaType = async (destinationId: string, visaTypeId: string) => {
    if (!admin?.access_token) return;
    
    const doDelete = async () => {
      try {
        const response = await fetch(
          `${API_URL}/api/admin/destinations/${destinationId}/visa-types/${visaTypeId}`,
          {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${admin.access_token}` },
          }
        );
        if (response.ok) {
          fetchDestinations();
        }
      } catch (error) {
        Alert.alert('Error', 'No se pudo eliminar');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('¿Eliminar este tipo de visa?')) {
        doDelete();
      }
    } else {
      Alert.alert('Confirmar', '¿Eliminar este tipo de visa?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const openEditModal = (destination: Destination) => {
    setSelectedDestination(destination);
    setEditForm({
      country: destination.country,
      country_code: destination.country_code,
      description: destination.description || '',
      image_url: destination.image_url || '',
      message: destination.message || '',
    });
    setShowEditModal(true);
  };

  const updateDestination = async () => {
    if (!admin?.access_token || !selectedDestination) return;
    try {
      const response = await fetch(`${API_URL}/api/admin/destinations/${selectedDestination.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${admin.access_token}`,
        },
        body: JSON.stringify(editForm),
      });
      if (response.ok) {
        setShowEditModal(false);
        fetchDestinations();
        if (Platform.OS === 'web') {
          alert('Destino actualizado correctamente');
        } else {
          Alert.alert('Éxito', 'Destino actualizado correctamente');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el destino');
    }
  };

  const createDestination = async () => {
    if (!admin?.access_token) return;
    if (!createForm.country || !createForm.country_code) {
      Alert.alert('Error', 'País y código de país son obligatorios');
      return;
    }
    try {
      const response = await fetch(`${API_URL}/api/admin/destinations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${admin.access_token}`,
        },
        body: JSON.stringify({
          country: createForm.country,
          country_code: createForm.country_code.toUpperCase(),
          description: createForm.description,
          image_url: createForm.image_url,
          message: createForm.message,
          enabled: false,
        }),
      });
      if (response.ok) {
        setShowCreateModal(false);
        setCreateForm({
          country: '',
          country_code: '',
          description: '',
          image_url: '',
          message: 'Muy pronto disponible',
        });
        fetchDestinations();
        if (Platform.OS === 'web') {
          alert('Destino creado correctamente');
        } else {
          Alert.alert('Éxito', 'Destino creado correctamente');
        }
      } else {
        const data = await response.json();
        Alert.alert('Error', data.detail || 'No se pudo crear el destino');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo crear el destino');
    }
  };

  const deleteDestination = async (destinationId: string, countryName: string) => {
    if (!admin?.access_token) return;
    
    const doDelete = async () => {
      try {
        const response = await fetch(`${API_URL}/api/admin/destinations/${destinationId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${admin.access_token}` },
        });
        if (response.ok) {
          fetchDestinations();
        }
      } catch (error) {
        Alert.alert('Error', 'No se pudo eliminar');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`¿Eliminar "${countryName}" y todos sus tipos de visa?`)) {
        doDelete();
      }
    } else {
      Alert.alert('Confirmar', `¿Eliminar "${countryName}" y todos sus tipos de visa?`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: doDelete },
      ]);
    }
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
            <Text style={styles.headerTitle}>Gestión de Destinos</Text>
            <TouchableOpacity onPress={() => setShowCreateModal(true)}>
              <Ionicons name="add-circle" size={28} color="#d4af37" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            {destinations.map((destination) => (
              <View key={destination.id} style={styles.destinationCard}>
                <LinearGradient colors={['#1a2f4a', '#0d1f35']} style={styles.cardGradient}>
                  {/* Destination Header */}
                  <View style={styles.cardHeader}>
                    <View style={styles.countryInfo}>
                      {destination.image_url && (
                        <Image
                          source={{ uri: destination.image_url }}
                          style={styles.countryImage}
                        />
                      )}
                      <View>
                        <Text style={styles.countryName}>{destination.country}</Text>
                        <Text style={styles.countryCode}>{destination.country_code}</Text>
                      </View>
                    </View>
                    <View style={styles.headerActions}>
                      <TouchableOpacity onPress={() => openEditModal(destination)} style={styles.editIcon}>
                        <Ionicons name="create-outline" size={20} color="#d4af37" />
                      </TouchableOpacity>
                      <View style={styles.toggleContainer}>
                        <Text style={styles.toggleLabel}>
                          {destination.enabled ? 'Activo' : 'Inactivo'}
                        </Text>
                      <Switch
                        value={destination.enabled}
                        onValueChange={() => toggleDestination(destination)}
                        trackColor={{ false: '#333', true: 'rgba(76, 175, 80, 0.5)' }}
                        thumbColor={destination.enabled ? '#4caf50' : '#666'}
                      />
                    </View>
                    </View>
                  </View>

                  {/* Description */}
                  {destination.description && (
                    <View style={styles.descriptionContainer}>
                      <Text style={styles.descriptionText}>{destination.description}</Text>
                    </View>
                  )}

                  {/* Visa Types */}
                  <View style={styles.visaTypesSection}>
                    <View style={styles.visaTypesHeader}>
                      <Text style={styles.visaTypesTitle}>Tipos de Visa</Text>
                      <TouchableOpacity
                        style={styles.addVisaButton}
                        onPress={() => {
                          setSelectedDestination(destination);
                          setShowVisaModal(true);
                        }}
                      >
                        <Ionicons name="add" size={18} color="#d4af37" />
                        <Text style={styles.addVisaText}>Agregar</Text>
                      </TouchableOpacity>
                    </View>

                    {destination.visa_types && destination.visa_types.length > 0 ? (
                      destination.visa_types.map((visa) => (
                        <View key={visa.id} style={styles.visaTypeItem}>
                          <View style={styles.visaInfo}>
                            <Text style={styles.visaName}>{visa.name}</Text>
                            <Text style={styles.visaPrice}>{visa.price} {visa.currency}</Text>
                            <Text style={styles.visaTime}>{visa.processing_time}</Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => deleteVisaType(destination.id, visa.id)}
                            style={styles.deleteButton}
                          >
                            <Ionicons name="trash-outline" size={20} color="#f44336" />
                          </TouchableOpacity>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.noVisaTypes}>No hay tipos de visa configurados</Text>
                    )}
                  </View>

                  {/* Message for inactive */}
                  {!destination.enabled && destination.message && (
                    <View style={styles.messageContainer}>
                      <Ionicons name="information-circle" size={16} color="#ffc107" />
                      <Text style={styles.messageText}>{destination.message}</Text>
                    </View>
                  )}
                </LinearGradient>
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>

      {/* Add Visa Type Modal */}
      <Modal
        visible={showVisaModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowVisaModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Agregar Tipo de Visa</Text>
            <Text style={styles.modalSubtitle}>
              Para: {selectedDestination?.country}
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Nombre del visa (ej: Visado de Turismo)"
              placeholderTextColor="#667788"
              value={visaForm.name}
              onChangeText={(v) => setVisaForm({ ...visaForm, name: v })}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Precio en EUR"
              placeholderTextColor="#667788"
              keyboardType="numeric"
              value={visaForm.price}
              onChangeText={(v) => setVisaForm({ ...visaForm, price: v })}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Tiempo de procesamiento"
              placeholderTextColor="#667788"
              value={visaForm.processing_time}
              onChangeText={(v) => setVisaForm({ ...visaForm, processing_time: v })}
            />

            <TextInput
              style={[styles.modalInput, { height: 80 }]}
              placeholder="Requisitos"
              placeholderTextColor="#667788"
              multiline
              value={visaForm.requirements}
              onChangeText={(v) => setVisaForm({ ...visaForm, requirements: v })}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowVisaModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={addVisaType}>
                <Text style={styles.saveButtonText}>Guardar</Text>
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
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212, 175, 55, 0.2)',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d4af37',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  destinationCard: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  cardGradient: {
    padding: 15,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  countryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  countryImage: {
    width: 50,
    height: 35,
    borderRadius: 4,
  },
  countryName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  countryCode: {
    fontSize: 12,
    color: '#8899aa',
  },
  toggleContainer: {
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 12,
    color: '#8899aa',
    marginBottom: 5,
  },
  visaTypesSection: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 8,
    padding: 12,
  },
  visaTypesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  visaTypesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#d4af37',
  },
  addVisaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  addVisaText: {
    color: '#d4af37',
    fontSize: 12,
  },
  visaTypeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  visaInfo: {
    flex: 1,
  },
  visaName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
  },
  visaPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#d4af37',
    marginTop: 2,
  },
  visaTime: {
    fontSize: 12,
    color: '#8899aa',
    marginTop: 2,
  },
  deleteButton: {
    padding: 8,
  },
  noVisaTypes: {
    fontSize: 13,
    color: '#667788',
    textAlign: 'center',
    padding: 15,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    padding: 10,
    borderRadius: 8,
  },
  messageText: {
    fontSize: 12,
    color: '#ffc107',
    flex: 1,
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
    marginBottom: 5,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#8899aa',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    padding: 12,
    color: '#ffffff',
    fontSize: 16,
    marginBottom: 12,
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
