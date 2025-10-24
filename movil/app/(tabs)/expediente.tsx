// Archivo: movil/app/(tabs)/expediente.tsx

import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Linking,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { useNavigation } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import { Ionicons } from "@expo/vector-icons";

// Tipos de datos
interface Documento {
  id: number;
  tipo_documento: string;
  ruta_archivo: string;
  nombre_original: string;
}

const tiposRequeridos = [
  { id: "acta_nacimiento", nombre: "Acta de Nacimiento" },
  { id: "curp", nombre: "CURP" },
  { id: "certificado_bachillerato", nombre: "Certificado de Bachillerato" },
  { id: "comprobante_domicilio", nombre: "Comprobante de Domicilio" },
];

export default function AspiranteExpedienteScreen() {
  const { user, api, API_URL } = useAuth();
  const [expediente, setExpediente] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();

  const fetchExpediente = useCallback(async () => {
    try {
      const response = await api.get<Documento[]>("/aspirante/mi-expediente");
      setExpediente(response.data);
    } catch (error) {
      console.error("Error al cargar expediente", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [api]);

  // Efecto 1: Para buscar los datos.
  // Se ejecuta solo si 'user' o 'fetchExpediente' cambian.
  useEffect(() => {
    if (user?.rol === "aspirante") {
      fetchExpediente();
    } else {
      setLoading(false);
    }
  }, [user, fetchExpediente]);

  // Efecto 2: Para actualizar el título de la pantalla.
  // Se ejecuta solo si 'navigation' o 'user' cambian.
  useEffect(() => {
    if (user) {
      navigation.setOptions({
        title: `Expediente de ${user.nombre}`,
      });
    }
  }, [user, navigation]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchExpediente();
  };

  const handleUpload = async (tipo: string) => {
    try {
      const doc = await DocumentPicker.getDocumentAsync({
        type: "application/pdf", // Solo permitimos PDF
      });

      if (doc.canceled) {
        return;
      }

      const file = doc.assets[0];

      // FormData es la forma de enviar archivos
      const formData = new FormData();
      formData.append("tipo_documento", tipo);
      formData.append("documento", {
        uri: file.uri,
        name: file.name,
        type: file.mimeType,
      } as any);

      await api.post("/aspirante/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      Alert.alert("Éxito", "Documento subido correctamente.");
      fetchExpediente(); // Recargamos
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "No se pudo subir el archivo.");
    }
  };

  const handleDelete = async (docId: number) => {
    Alert.alert(
      "Confirmar Eliminación",
      "¿Estás seguro de eliminar este documento?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/aspirante/expedientes/${docId}`);
              Alert.alert("Éxito", "Documento eliminado.");
              fetchExpediente(); // Recargamos
            } catch (error) {
              console.error(error);
              Alert.alert("Error", "No se pudo eliminar el documento.");
            }
          },
        },
      ]
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Obtenemos los documentos que SÍ están subidos
  const documentosSubidos = expediente.map((doc) => doc.tipo_documento);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.sectionTitle}>
        ¡Hola, {user?.nombre} {user?.apellido_paterno}!
      </Text>
      <Text style={styles.subtitle}>
        Para completar tu registro, sube los siguientes documentos.
      </Text>

      {/* Mapeamos la lista de REQUERIDOS */}
      {tiposRequeridos.map((tipo) => {
        // Buscamos si este documento ya se subió
        const docSubido = expediente.find((d) => d.tipo_documento === tipo.id);
        const estaSubido = !!docSubido;

        return (
          <View
            key={tipo.id}
            style={[styles.card, estaSubido && styles.cardCompleto]}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{tipo.nombre}</Text>
              {estaSubido ? (
                <View style={styles.docInfo}>
                  <Ionicons name="document-text" size={16} color="#0a7ea4" />
                  <Text style={styles.docName} numberOfLines={1}>
                    {docSubido.nombre_original}
                  </Text>
                </View>
              ) : (
                <Text style={styles.docFaltante}>Pendiente</Text>
              )}
            </View>
            {/* Botones de acción */}
            <View style={styles.actions}>
              {!estaSubido ? (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleUpload(tipo.id)}
                >
                  <Ionicons
                    name="cloud-upload-outline"
                    size={24}
                    color="#0a7ea4"
                  />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDelete(docSubido.id)}
                >
                  <Ionicons name="trash-outline" size={24} color="#d9534f" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f0f7",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 20,
    marginLeft: 15,
  },
  subtitle: {
    fontSize: 16,
    color: "gray",
    marginLeft: 15,
    marginBottom: 10,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 15,
    marginHorizontal: 15,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderLeftWidth: 5,
    borderLeftColor: "#f0ad4e", // Naranja de pendiente
  },
  cardCompleto: {
    borderLeftColor: "#5cb85c", // Verde de completo
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  docInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },
  docName: {
    marginLeft: 5,
    color: "#0a7ea4",
    flexShrink: 1,
  },
  docFaltante: {
    color: "#f0ad4e",
    fontWeight: "bold",
    marginTop: 5,
  },
  actions: {
    flexDirection: "row",
  },
  actionButton: {
    padding: 5,
    marginLeft: 10,
  },
});
