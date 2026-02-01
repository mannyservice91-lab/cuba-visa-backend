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
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient/build/LinearGradient';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../src/context/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface Document {
  id: string;
  name: string;
  type: string;
  uploaded_at: string;
}

interface Application {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  user_phone: string;
  passport_number: string;
  visa_type: string;
  visa_name: string;
  price: number;
  deposit_paid: number;
  total_paid: number;
  status: string;
  documents: Document[];
  notes: string;
  admin_notes: string;
  created_at: string;
  updated_at: string;
}

const STATUS_OPTIONS = [
  { value: 'pendiente', label: 'Pendiente', color: '#ffc107' },
  { value: 'revision', label: 'En Revisión', color: '#2196f3' },
  { value: 'aprobado', label: 'Aprobado', color: '#4caf50' },
  { value: 'rechazado', label: 'Rechazado', color: '#f44336' },
  { value: 'completado', label: 'Completado', color: '#d4af37' },
];

export default function AdminApplicationScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { admin, adminLogout, isAdmin } = useAuth();
  const [application, setApplication] = useState<Application | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [depositPaid, setDepositPaid] = useState('');
  const [totalPaid, setTotalPaid] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  const fetchApplication = useCallback(async () => {
    if (!id || !admin?.access_token) return;
    try {
      const response = await fetch(`${API_URL}/api/admin/applications/${id}`, {
        headers: { Authorization: `Bearer ${admin.access_token}` },
      });
      if (response.status === 401) {
        await adminLogout();
        router.replace('/admin');
        return;
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail);
      setApplication(data);
      setAdminNotes(data.admin_notes || '');
      setDepositPaid(data.deposit_paid.toString());
      setTotalPaid(data.total_paid.toString());
      setSelectedStatus(data.status);
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'No se pudo cargar la solicitud');
    } finally {
      setIsLoading(false);
    }
  }, [id, admin, adminLogout, router]);

  useEffect(() => {
    if (!isAdmin) {
      router.replace('/admin');
      return;
    }
    fetchApplication();
  }, [isAdmin, fetchApplication, router]);

  const handleSave = async () => {
    if (!application || !admin?.access_token) return;
    setIsSaving(true);

    try {
      const response = await fetch(`${API_URL}/api/admin/applications/${application.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${admin.access_token}`,
        },
        body: JSON.stringify({
          status: selectedStatus,
          admin_notes: adminNotes,
          deposit_paid: parseInt(depositPaid) || 0,
          total_paid: parseInt(totalPaid) || 0,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail);

      Alert.alert('Éxito', 'Solicitud actualizada correctamente');
      setApplication(data);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Eliminar Solicitud',
      '¿Estás seguro de que quieres eliminar esta solicitud? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            if (!admin?.access_token) return;
            try {
              const response = await fetch(
                `${API_URL}/api/admin/applications/${application?.id}`,
                {
                  method: 'DELETE',
                  headers: { Authorization: `Bearer ${admin.access_token}` },
                }
              );
              if (!response.ok) throw new Error('Error al eliminar');
              Alert.alert('Éxito', 'Solicitud eliminada');
              router.back();
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar la solicitud');
            }
          },
        },
      ]
    );
  };

  const openWhatsApp = () => {
    const message = `Hola ${application?.user_name}, le contactamos respecto a su solicitud de visa #${application?.id.slice(0, 8)}`;
    const url = `https://wa.me/${application?.user_phone?.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
    Linking.openURL(url);
  };

  if (!isAdmin) return null;

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

  if (!application) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#0a1628', '#132743', '#0a1628']} style={styles.gradient}>
          <SafeAreaView style={styles.centerContent}>
            <Text style={styles.errorText}>Solicitud no encontrada</Text>
            <TouchableOpacity style={styles.linkButton} onPress={() => router.back()}>
              <Text style={styles.linkText}>Volver</Text>
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
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#d4af37" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Gestionar Solicitud</Text>
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <Ionicons name="trash" size={22} color="#f44336" />
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
              {/* User Info Card */}
              <View style={styles.card}>
                <LinearGradient colors={['#1a2f4a', '#0d1f35']} style={styles.cardGradient}>
                  <Text style={styles.cardTitle}>Información del Cliente</Text>
                  <View style={styles.infoRow}>
                    <Ionicons name="person" size={18} color="#d4af37" />
                    <Text style={styles.infoText}>{application.user_name}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Ionicons name="mail" size={18} color="#d4af37" />
                    <Text style={styles.infoText}>{application.user_email}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Ionicons name="call" size={18} color="#d4af37" />
                    <Text style={styles.infoText}>{application.user_phone}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="passport" size={18} color="#d4af37" />
                    <Text style={styles.infoText}>{application.passport_number}</Text>
                  </View>
                  <TouchableOpacity style={styles.whatsappSmallBtn} onPress={openWhatsApp}>
                    <FontAwesome5 name="whatsapp" size={16} color="#fff" />
                    <Text style={styles.whatsappSmallText}>Contactar</Text>
                  </TouchableOpacity>
                </LinearGradient>
              </View>

              {/* Visa Info */}
              <View style={styles.card}>
                <LinearGradient colors={['#1a2f4a', '#0d1f35']} style={styles.cardGradient}>
                  <Text style={styles.cardTitle}>Información de Visa</Text>
                  <Text style={styles.visaType}>{application.visa_name}</Text>
                  <Text style={styles.visaId}>ID: {application.id}</Text>
                  <View style={styles.priceInfo}>
                    <Text style={styles.priceLabel}>Precio Total:</Text>
                    <Text style={styles.priceValue}>{application.price} EUR</Text>
                  </View>
                </LinearGradient>
              </View>

              {/* Client Notes */}
              {application.notes && (
                <View style={styles.card}>
                  <LinearGradient colors={['#1a2f4a', '#0d1f35']} style={styles.cardGradient}>
                    <Text style={styles.cardTitle}>Notas del Cliente</Text>
                    <Text style={styles.clientNotes}>{application.notes}</Text>
                  </LinearGradient>
                </View>
              )}

              {/* Documents */}
              <View style={styles.card}>
                <LinearGradient colors={['#1a2f4a', '#0d1f35']} style={styles.cardGradient}>
                  <Text style={styles.cardTitle}>
                    Documentos ({application.documents.length})
                  </Text>
                  {application.documents.length > 0 ? (
                    application.documents.map((doc, index) => (
                      <View key={doc.id || index} style={styles.documentItem}>
                        <Ionicons
                          name={doc.type.includes('pdf') ? 'document-text' : 'image'}
                          size={20}
                          color="#d4af37"
                        />
                        <Text style={styles.documentName} numberOfLines={1}>
                          {doc.name}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.noDocuments}>Sin documentos</Text>
                  )}
                </LinearGradient>
              </View>

              {/* Status Selection */}
              <View style={styles.card}>
                <LinearGradient colors={['#1a2f4a', '#0d1f35']} style={styles.cardGradient}>
                  <Text style={styles.cardTitle}>Estado de la Solicitud</Text>
                  <View style={styles.statusOptions}>
                    {STATUS_OPTIONS.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.statusOption,
                          selectedStatus === option.value && {
                            borderColor: option.color,
                            backgroundColor: `${option.color}20`,
                          },
                        ]}
                        onPress={() => setSelectedStatus(option.value)}
                      >
                        <View
                          style={[
                            styles.statusDot,
                            { backgroundColor: option.color },
                          ]}
                        />
                        <Text
                          style={[
                            styles.statusOptionText,
                            selectedStatus === option.value && { color: option.color },
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </LinearGradient>
              </View>

              {/* Payment Management */}
              <View style={styles.card}>
                <LinearGradient colors={['#1a2f4a', '#0d1f35']} style={styles.cardGradient}>
                  <Text style={styles.cardTitle}>Gestión de Pagos</Text>
                  <View style={styles.paymentInputRow}>
                    <View style={styles.paymentInputContainer}>
                      <Text style={styles.inputLabel}>Depósito Pagado (EUR)</Text>
                      <TextInput
                        style={styles.paymentInput}
                        value={depositPaid}
                        onChangeText={setDepositPaid}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor="#667788"
                      />
                    </View>
                    <View style={styles.paymentInputContainer}>
                      <Text style={styles.inputLabel}>Total Pagado (EUR)</Text>
                      <TextInput
                        style={styles.paymentInput}
                        value={totalPaid}
                        onChangeText={setTotalPaid}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor="#667788"
                      />
                    </View>
                  </View>
                </LinearGradient>
              </View>

              {/* Admin Notes */}
              <View style={styles.card}>
                <LinearGradient colors={['#1a2f4a', '#0d1f35']} style={styles.cardGradient}>
                  <Text style={styles.cardTitle}>Notas para el Cliente</Text>
                  <TextInput
                    style={styles.notesInput}
                    value={adminNotes}
                    onChangeText={setAdminNotes}
                    placeholder="Escribe notas que verá el cliente..."
                    placeholderTextColor="#667788"
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </LinearGradient>
              </View>

              {/* Save Button */}
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSave}
                disabled={isSaving}
              >
                <LinearGradient colors={['#d4af37', '#b8962f']} style={styles.saveGradient}>
                  {isSaving ? (
                    <ActivityIndicator color="#0a1628" />
                  ) : (
                    <>
                      <Ionicons name="save" size={22} color="#0a1628" />
                      <Text style={styles.saveText}>Guardar Cambios</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
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
  deleteButton: {
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
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  cardGradient: {
    padding: 18,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#d4af37',
    marginBottom: 12,
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
  whatsappSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#25D366',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    marginTop: 10,
  },
  whatsappSmallText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  visaType: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 5,
  },
  visaId: {
    fontSize: 12,
    color: '#667788',
    marginBottom: 12,
  },
  priceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  priceLabel: {
    fontSize: 14,
    color: '#8899aa',
  },
  priceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d4af37',
  },
  clientNotes: {
    fontSize: 14,
    color: '#cccccc',
    lineHeight: 20,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  documentName: {
    flex: 1,
    fontSize: 14,
    color: '#ffffff',
  },
  noDocuments: {
    fontSize: 14,
    color: '#667788',
    fontStyle: 'italic',
  },
  statusOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    gap: 6,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusOptionText: {
    fontSize: 13,
    color: '#8899aa',
  },
  paymentInputRow: {
    flexDirection: 'row',
    gap: 15,
  },
  paymentInputContainer: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    color: '#8899aa',
    marginBottom: 6,
  },
  paymentInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    padding: 12,
    fontSize: 16,
    color: '#ffffff',
  },
  notesInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    padding: 12,
    fontSize: 14,
    color: '#ffffff',
    minHeight: 100,
  },
  saveButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 10,
  },
  saveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 10,
  },
  saveText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0a1628',
  },
});
