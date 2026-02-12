import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "../../../../../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";

export default function ForoIndexScreen() {
  const { grupoId, asignaturaId } = useLocalSearchParams();
  const { api } = useAuth();
  const router = useRouter();

  const [hilos, setHilos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  const [titulo, setTitulo] = useState("");
  const [contenido, setContenido] = useState("");
  const [creando, setCreando] = useState(false);

  useEffect(() => {
    cargarForo();
  }, []);

  const cargarForo = async () => {
    try {
      // CORREGIDO: Ruta correcta según tu index.js
      const res = await api.get(`/foro/${grupoId}/${asignaturaId}/hilos`);
      setHilos(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const crearHilo = async () => {
    if (!titulo.trim() || !contenido.trim()) {
      Alert.alert("Error", "Debes escribir un título y un mensaje inicial.");
      return;
    }
    setCreando(true);
    try {
      // CORREGIDO: Ruta correcta y campos correctos (mensaje_original)
      await api.post(`/foro/${grupoId}/${asignaturaId}/hilos`, {
        titulo,
        mensaje_original: contenido,
      });
      setModalVisible(false);
      setTitulo("");
      setContenido("");
      cargarForo();
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "No se pudo crear el tema.");
    } finally {
      setCreando(false);
    }
  };

  const irAHilo = (hiloId, tituloHilo) => {
    router.push({
      pathname: `/clase/${grupoId}/${asignaturaId}/foro/${hiloId}`,
      params: { tituloHilo },
    });
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => irAHilo(item.id, item.titulo)}
    >
      <View style={styles.row}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.creador_nombre ? item.creador_nombre.charAt(0) : "?"}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{item.titulo}</Text>
          <Text style={styles.cardSubtitle}>
            Por: {item.creador_nombre} {item.creador_apellido} •{" "}
            {item.fecha_creacion ? item.fecha_creacion.split("T")[0] : ""}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#ccc" />
      </View>
      <View style={styles.stats}>
        <Ionicons name="chatbubble-outline" size={14} color="#666" />
        <Text style={styles.statsText}>
          {item.num_respuestas || 0} respuestas
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading)
    return (
      <ActivityIndicator
        size="large"
        color="#a72a34"
        style={{ marginTop: 50 }}
      />
    );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Foro de Discusión</Text>
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          style={styles.addButton}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={hilos}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 15 }}
        ListEmptyComponent={
          <Text style={styles.empty}>No hay temas de discusión aún.</Text>
        }
      />

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nuevo Tema</Text>

            <Text style={styles.label}>Título:</Text>
            <TextInput
              style={styles.input}
              value={titulo}
              onChangeText={setTitulo}
              placeholder="Ej. Duda sobre la Tarea 1"
            />

            <Text style={styles.label}>Mensaje:</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={contenido}
              onChangeText={setContenido}
              multiline
              placeholder="Escribe tu mensaje..."
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.btnCancel}
              >
                <Text style={styles.btnTextCancel}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={crearHilo}
                style={styles.btnSend}
                disabled={creando}
              >
                <Text style={styles.btnTextSend}>
                  {creando ? "Publicando..." : "Publicar"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f4f4" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
    justifyContent: "space-between",
    elevation: 2,
  },
  backButton: { marginRight: 10 },
  title: { fontSize: 20, fontWeight: "bold", color: "#a72a34" },
  addButton: { backgroundColor: "#a72a34", padding: 8, borderRadius: 20 },
  card: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 2,
  },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#eee",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  avatarText: { fontWeight: "bold", color: "#555", fontSize: 18 },
  cardTitle: { fontSize: 16, fontWeight: "bold", color: "#333" },
  cardSubtitle: { fontSize: 12, color: "#888" },
  stats: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  statsText: { fontSize: 12, color: "#666", marginLeft: 5 },
  empty: { textAlign: "center", marginTop: 50, color: "#999" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: { backgroundColor: "#fff", borderRadius: 15, padding: 20 },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#a72a34",
  },
  label: { fontWeight: "600", marginBottom: 5, color: "#333" },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
  },
  textArea: { height: 100, textAlignVertical: "top" },
  modalButtons: { flexDirection: "row", justifyContent: "flex-end", gap: 15 },
  btnCancel: { padding: 10 },
  btnSend: { backgroundColor: "#a72a34", padding: 10, borderRadius: 8 },
  btnTextCancel: { color: "#666" },
  btnTextSend: { color: "#fff", fontWeight: "bold" },
});
