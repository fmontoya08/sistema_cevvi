import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "../../../../../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";

export default function DetalleTareaScreen() {
  const { tareaId, tituloTarea } = useLocalSearchParams();
  const { api, API_URL } = useAuth();
  const router = useRouter();

  const [tarea, setTarea] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [subiendo, setSubiendo] = useState(false);

  // Archivo seleccionado
  const [archivo, setArchivo] = useState<any>(null);

  useEffect(() => {
    cargarDetalle();
  }, []);

  const cargarDetalle = async () => {
    try {
      const res = await api.get(`/alumno/aula-virtual/tareas/${tareaId}`);
      setTarea(res.data);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "No se pudo cargar la tarea");
    } finally {
      setLoading(false);
    }
  };

  const seleccionarArchivo = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*", // Acepta cualquier tipo de archivo (PDF, Word, img)
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setArchivo(result.assets[0]);
      }
    } catch (err) {
      console.log("Error al seleccionar archivo", err);
    }
  };

  const subirTarea = async () => {
    if (!archivo) {
      Alert.alert("Atención", "Debes seleccionar un archivo primero.");
      return;
    }

    setSubiendo(true);

    // Crear el objeto FormData para enviar archivos
    const formData = new FormData();
    formData.append("archivo", {
      uri: archivo.uri,
      name: archivo.name,
      type: archivo.mimeType || "application/octet-stream", // Tipo por defecto si falla
    } as any); // 'as any' es necesario en TS para React Native FormData

    try {
      // Nota: Verifica que tu endpoint sea POST y acepte multipart/form-data
      await api.post(
        `/alumno/aula-virtual/tareas/${tareaId}/entregar`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      Alert.alert("¡Éxito!", "Tu tarea se ha enviado correctamente.");
      setArchivo(null);
      cargarDetalle(); // Recargar para ver el cambio de estado
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Hubo un problema al subir tu archivo.");
    } finally {
      setSubiendo(false);
    }
  };

  if (loading)
    return (
      <ActivityIndicator
        size="large"
        color="#a72a34"
        style={{ marginTop: 50 }}
      />
    );
  if (!tarea) return null;

  const yaEntrego = tarea.entrega_alumno !== null;

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {tituloTarea}
        </Text>
      </View>

      <View style={styles.content}>
        {/* INFO DE LA TAREA */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Instrucciones</Text>
          <Text style={styles.description}>{tarea.descripcion}</Text>
          <Text style={styles.date}>
            Fecha límite: {tarea.fecha_limite.split("T")[0]}
          </Text>

          {tarea.archivo_adjunto && (
            <TouchableOpacity
              style={styles.downloadBtn}
              onPress={() => {
                // Construir URL de descarga del archivo del PROFESOR
                const baseUrl = API_URL.replace("/api", "/uploads");
                Linking.openURL(`${baseUrl}/${tarea.archivo_adjunto}`);
              }}
            >
              <Ionicons name="download-outline" size={20} color="#0284c7" />
              <Text style={styles.downloadText}>
                Descargar Material Adjunto
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ÁREA DE ENTREGA */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Tu Entrega</Text>

          {yaEntrego ? (
            // SI YA ENTREGÓ
            <View style={styles.entregadoBox}>
              <Ionicons name="checkmark-circle" size={40} color="#16a34a" />
              <Text style={styles.entregadoTitle}>¡Tarea Entregada!</Text>
              <Text style={styles.entregadoDate}>
                El {tarea.entrega_alumno.fecha_entrega.split("T")[0]}
              </Text>
              {tarea.entrega_alumno.calificacion ? (
                <View style={styles.notaBox}>
                  <Text style={styles.notaLabel}>Calificación:</Text>
                  <Text style={styles.notaValue}>
                    {tarea.entrega_alumno.calificacion}
                  </Text>
                </View>
              ) : (
                <Text style={styles.pendingText}>
                  Esperando calificación...
                </Text>
              )}
            </View>
          ) : (
            // SI NO HA ENTREGADO
            <View>
              {archivo ? (
                <View style={styles.fileSelected}>
                  <Ionicons name="document-text" size={30} color="#a72a34" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fileName}>{archivo.name}</Text>
                    <Text style={styles.fileSize}>
                      {(archivo.size / 1024).toFixed(1)} KB
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setArchivo(null)}>
                    <Ionicons name="close-circle" size={24} color="#666" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.uploadArea}
                  onPress={seleccionarArchivo}
                >
                  <Ionicons
                    name="cloud-upload-outline"
                    size={40}
                    color="#666"
                  />
                  <Text style={styles.uploadText}>
                    Toca para seleccionar archivo
                  </Text>
                  <Text style={styles.uploadSubtext}>(PDF, Word, Imagen)</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.btnEnviar,
                  (!archivo || subiendo) && styles.btnDisabled,
                ]}
                onPress={subirTarea}
                disabled={!archivo || subiendo}
              >
                {subiendo ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>Enviar Tarea</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f4f4" },
  header: {
    backgroundColor: "#a72a34",
    padding: 20,
    paddingTop: 50,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: { marginRight: 15 },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#fff", flex: 1 },
  content: { padding: 20 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 5,
  },
  description: {
    fontSize: 15,
    color: "#444",
    lineHeight: 22,
    marginBottom: 15,
  },
  date: { fontSize: 13, color: "#d97706", fontWeight: "bold" },
  downloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 15,
    padding: 10,
    backgroundColor: "#e0f2fe",
    borderRadius: 8,
  },
  downloadText: { color: "#0284c7", fontWeight: "600", marginLeft: 10 },

  // Estilos de Upload
  uploadArea: {
    borderStyle: "dashed",
    borderWidth: 2,
    borderColor: "#ccc",
    borderRadius: 10,
    height: 120,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fafafa",
    marginBottom: 20,
  },
  uploadText: { fontSize: 16, color: "#555", marginTop: 10, fontWeight: "600" },
  uploadSubtext: { fontSize: 12, color: "#999" },

  fileSelected: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#fff0f0",
    borderRadius: 10,
    marginBottom: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: "#fce7e7",
  },
  fileName: { fontSize: 14, fontWeight: "bold", color: "#333" },
  fileSize: { fontSize: 12, color: "#666" },

  btnEnviar: {
    backgroundColor: "#a72a34",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  btnDisabled: { backgroundColor: "#ccc" },
  btnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },

  // Estilos de Entregado
  entregadoBox: { alignItems: "center", padding: 20 },
  entregadoTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#16a34a",
    marginTop: 10,
  },
  entregadoDate: { color: "#666", marginBottom: 15 },
  notaBox: {
    backgroundColor: "#f0fdf4",
    padding: 15,
    borderRadius: 10,
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  notaLabel: { fontSize: 16, color: "#15803d" },
  notaValue: { fontSize: 24, fontWeight: "bold", color: "#15803d" },
  pendingText: { fontStyle: "italic", color: "#888" },
});
