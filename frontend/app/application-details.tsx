import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient/build/LinearGradient';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useAuth } from '../src/context/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const PAYPAL_LINK = 'https://paypal.me/Gonzalezjm91';
const WHATSAPP_NUMBER = '+381693444935';

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

export default function ApplicationDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [application, setApplication] = useState<Application | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchApplication = useCallback(async () => {
    if (!id) return;
    try {
      const response = await fetch(`${API_URL}/api/applications/${id}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail);
      setApplication(data);
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'No se pudo cargar la solicitud');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchApplication();
  }, [fetchApplication]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchApplication();
  }, [fetchApplication]);

  const handleUploadDocument = async () => {
    if (!application || !user) return;

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      setIsUploading(true);

      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const formData = new FormData();
      formData.append('file_name', file.name);
      formData.append('file_type', file.mimeType || 'application/octet-stream');
      formData.append('file_data', base64);

      const response = await fetch(
        `${API_URL}/api/applications/${application.id}/documents?user_id=${user.id}`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail);

      Alert.alert('Éxito', 'Documento subido correctamente');
      fetchApplication();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error al subir documento');
    } finally {
      setIsUploading(false);
    }
  };

  const openWhatsApp = () => {
    const message = `Hola, tengo una consulta sobre mi solicitud de visa #${application?.id?.slice(0, 8)}`;
    const url = `https://wa.me/${WHATSAPP_NUMBER.replace('+', '')}?text=${encodeURIComponent(message)}`;
    Linking.openURL(url);
  };

  const openPayPal = () => {
    Linking.openURL(PAYPAL_LINK);
  };

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

  const depositAmount = application.price / 2;
  const remainingDeposit = depositAmount - application.deposit_paid;
  const remainingTotal = application.price - application.total_paid;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0a1628', '#132743', '#0a1628']} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#d4af37" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Detalles de Solicitud</Text>
            <View style={{ width: 44 }} />
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#d4af37" />
            }
          >
            {/* Status Card */}
            <View style={styles.statusCard}>
              <LinearGradient colors={['#1a2f4a', '#0d1f35']} style={styles.statusCardGradient}>
                <View style={styles.statusHeader}>
                  <Text style={styles.statusLabel}>Estado Actual</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: STATUS_COLORS[application.status]?.bg },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: STATUS_COLORS[application.status]?.text },
                      ]}
                    >
                      {STATUS_LABELS[application.status]}
                    </Text>
                  </View>
                </View>
                <Text style={styles.visaType}>{application.visa_name}</Text>
                <Text style={styles.applicationId}>ID: {application.id.slice(0, 8)}...</Text>
              </LinearGradient>
            </View>

            {/* Payment Info */}
            <View style={styles.paymentCard}>
              <LinearGradient colors={['#1a2f4a', '#0d1f35']} style={styles.paymentCardGradient}>
                <Text style={styles.cardTitle}>Información de Pago</Text>
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>Precio Total:</Text>
                  <Text style={styles.paymentValue}>{application.price} EUR</Text>
                </View>
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>Depósito Requerido (50%):</Text>
                  <Text style={styles.paymentValue}>{depositAmount} EUR</Text>
                </View>
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>Depósito Pagado:</Text>
                  <Text style={[styles.paymentValue, { color: '#4caf50' }]}>
                    {application.deposit_paid} EUR
                  </Text>
                </View>
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>Total Pagado:</Text>
                  <Text style={[styles.paymentValue, { color: '#4caf50' }]}>
                    {application.total_paid} EUR
                  </Text>
                </View>
                {remainingTotal > 0 && (
                  <View style={styles.remainingContainer}>
                    <Text style={styles.remainingLabel}>Pendiente por pagar:</Text>
                    <Text style={styles.remainingValue}>{remainingTotal} EUR</Text>
                  </View>
                )}

                {remainingTotal > 0 && (
                  <TouchableOpacity style={styles.payButton} onPress={openPayPal}>
                    <FontAwesome5 name="paypal" size={20} color="#fff" />
                    <Text style={styles.payButtonText}>Pagar con PayPal</Text>
                  </TouchableOpacity>
                )}
              </LinearGradient>
            </View>

            {/* Admin Notes */}
            {application.admin_notes && (
              <View style={styles.notesCard}>
                <LinearGradient colors={['#1a2f4a', '#0d1f35']} style={styles.notesCardGradient}>
                  <View style={styles.notesHeader}>
                    <Ionicons name="chatbubble-ellipses" size={20} color="#d4af37" />
                    <Text style={styles.cardTitle}>Notas del Administrador</Text>
                  </View>
                  <Text style={styles.notesText}>{application.admin_notes}</Text>
                </LinearGradient>
              </View>
            )}

            {/* Documents Section */}
            <View style={styles.documentsCard}>
              <LinearGradient colors={['#1a2f4a', '#0d1f35']} style={styles.documentsCardGradient}>
                <Text style={styles.cardTitle}>Documentos</Text>
                <Text style={styles.documentsInfo}>
                  Sube los documentos necesarios para tu solicitud de visa
                </Text>

                {application.documents.length > 0 ? (
                  <View style={styles.documentsList}>
                    {application.documents.map((doc, index) => (
                      <View key={doc.id || index} style={styles.documentItem}>
                        <Ionicons
                          name={doc.type.includes('pdf') ? 'document-text' : 'image'}
                          size={24}
                          color="#d4af37"
                        />
                        <View style={styles.documentInfo}>
                          <Text style={styles.documentName} numberOfLines={1}>
                            {doc.name}
                          </Text>
                          <Text style={styles.documentDate}>
                            {new Date(doc.uploaded_at).toLocaleDateString('es-ES')}
                          </Text>
                        </View>
                        <Ionicons name="checkmark-circle" size={20} color="#4caf50" />
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.noDocuments}>No hay documentos subidos aún</Text>
                )}

                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={handleUploadDocument}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <ActivityIndicator color="#d4af37" />
                  ) : (
                    <>
                      <Ionicons name="cloud-upload" size={22} color="#d4af37" />
                      <Text style={styles.uploadButtonText}>Subir Documento</Text>
                    </>
                  )}
                </TouchableOpacity>
              </LinearGradient>
            </View>

            {/* Contact Button */}
            <TouchableOpacity style={styles.whatsappButton} onPress={openWhatsApp}>
              <FontAwesome5 name="whatsapp" size={22} color="#fff" />
              <Text style={styles.whatsappText}>¿Tienes dudas? Contáctanos</Text>
            </TouchableOpacity>

            {/* Info */}
            <View style={styles.infoSection}>
              <Text style={styles.infoTitle}>Información de la Solicitud</Text>
              <View style={styles.infoRow}>
                <Ionicons name="calendar" size={16} color="#667788" />
                <Text style={styles.infoText}>
                  Creada: {new Date(application.created_at).toLocaleDateString('es-ES')}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="time" size={16} color="#667788" />
                <Text style={styles.infoText}>Tiempo estimado: 1-2 meses</Text>
              </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  statusCard: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  statusCardGradient: {
    padding: 20,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  statusLabel: {
    fontSize: 14,
    color: '#8899aa',
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  visaType: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 5,
  },
  applicationId: {
    fontSize: 13,
    color: '#667788',
  },
  paymentCard: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  paymentCardGradient: {
    padding: 20,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#d4af37',
    marginBottom: 15,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  paymentLabel: {
    fontSize: 14,
    color: '#8899aa',
  },
  paymentValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  remainingContainer: {
    marginTop: 15,
    padding: 12,
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  remainingLabel: {
    fontSize: 14,
    color: '#ffc107',
    fontWeight: '600',
  },
  remainingValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffc107',
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0070ba',
    padding: 14,
    borderRadius: 10,
    marginTop: 15,
    gap: 10,
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  notesCard: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  notesCardGradient: {
    padding: 20,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  notesText: {
    fontSize: 14,
    color: '#cccccc',
    lineHeight: 22,
  },
  documentsCard: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  documentsCardGradient: {
    padding: 20,
  },
  documentsInfo: {
    fontSize: 13,
    color: '#8899aa',
    marginBottom: 15,
  },
  documentsList: {
    marginBottom: 15,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    gap: 12,
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 14,
    color: '#ffffff',
    marginBottom: 2,
  },
  documentDate: {
    fontSize: 12,
    color: '#667788',
  },
  noDocuments: {
    fontSize: 14,
    color: '#667788',
    fontStyle: 'italic',
    marginBottom: 15,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#d4af37',
    borderStyle: 'dashed',
    padding: 14,
    borderRadius: 10,
    gap: 10,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#d4af37',
  },
  whatsappButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
    gap: 10,
  },
  whatsappText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  infoSection: {
    marginTop: 10,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667788',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#667788',
  },
});
