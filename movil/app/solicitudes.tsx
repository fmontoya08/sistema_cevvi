import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Modal,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function SolicitudesScreen() {
  const { api } = useAuth();
  const router = useRouter();
  const [solicitudes, setSolicitudes] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);

  // Estado para el formulario
  const [tipo, setTipo] = useState("Constancia de Estudios");
  const [motivo, setMotivo] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    cargarSolicitudes();
  }, []);

  const cargarSolicitudes = async () => {
    try {
      const res = await api.get("/alumno/mis-solicitudes");
      setSolicitudes(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const enviarSolicitud = async () => {
    if (!motivo.trim()) {
      Alert.alert("Atención", "Por favor escribe un motivo o detalle.");
      return;
    }
    setLoading(true);
    try {
      // POST a la ruta definida en tu index.js
      await api.post("/alumno/solicitudes", {
        tipo_solicitud: tipo,
        motivo: motivo,
      });
      Alert.alert("Éxito", "Solicitud enviada correctamente.");
      setModalVisible(false);
      setMotivo("");
      cargarSolicitudes(); // Recargar lista
    } catch (error) {
      Alert.alert("Error", "No se pudo enviar la solicitud.");
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <Text style={styles.cardTitle}>{item.tipo_solicitud}</Text>
        <Text style={[styles.status, getStatusColor(item.estatus)]}>
          {item.estatus.toUpperCase()}
        </Text>
      </View>
      <Text style={styles.date}>{item.fecha_solicitud.split("T")[0]}</Text>
      {item.comentarios_admin && (
        <View style={styles.adminComment}>
          <Text style={styles.commentLabel}>Respuesta Admin:</Text>
          <Text style={styles.commentText}>{item.comentarios_admin}</Text>
        </View>
      )}
    </View>
  );

  const getStatusColor = (status) => {
    switch (status) {
      case "solicitado":
        return { color: "#f59e0b" };
      case "listo_para_entrega":
        return { color: "#10b981" };
      case "rechazado":
        return { color: "#ef4444" };
      default:
        return { color: "#6b7280" };
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Mis Trámites</Text>
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          style={styles.addButton}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={solicitudes}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>No hay solicitudes.</Text>
        }
      />

      {/* MODAL PARA NUEVA SOLICITUD */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nueva Solicitud</Text>

            <Text style={styles.label}>Tipo de Trámite:</Text>
            {/* Aquí podrías usar un Picker, por simplicidad usaremos botones o un input simple */}
            <View style={styles.typeSelector}>
              <TouchableOpacity
                onPress={() => setTipo("Constancia de Estudios")}
                style={[
                  styles.typeBtn,
                  tipo === "Constancia de Estudios" && styles.typeBtnActive,
                ]}
              >
                <Text
                  style={[
                    styles.typeText,
                    tipo === "Constancia de Estudios" && styles.typeTextActive,
                  ]}
                >
                  Constancia
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setTipo("Kardex")}
                style={[
                  styles.typeBtn,
                  tipo === "Kardex" && styles.typeBtnActive,
                ]}
              >
                <Text
                  style={[
                    styles.typeText,
                    tipo === "Kardex" && styles.typeTextActive,
                  ]}
                >
                  Kardex
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Motivo / Comentarios:</Text>
            <TextInput
              style={styles.input}
              multiline
              placeholder="Escribe aquí los detalles..."
              value={motivo}
              onChangeText={setMotivo}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.btnCancel}
              >
                <Text style={styles.btnTextCancel}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={enviarSolicitud}
                style={styles.btnSend}
                disabled={loading}
              >
                <Text style={styles.btnTextSend}>
                  {loading ? "Enviando..." : "Enviar Solicitud"}
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
    elevation: 2,
    justifyContent: "space-between",
  },
  title: { fontSize: 20, fontWeight: "bold", color: "#a72a34" },
  addButton: { backgroundColor: "#a72a34", padding: 8, borderRadius: 20 },
  list: { padding: 15 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  cardTitle: { fontSize: 16, fontWeight: "bold", color: "#333" },
  status: { fontWeight: "bold", fontSize: 12 },
  date: { color: "#888", fontSize: 12, marginBottom: 5 },
  adminComment: {
    backgroundColor: "#f9f9f9",
    padding: 10,
    borderRadius: 5,
    marginTop: 5,
  },
  commentLabel: { fontSize: 11, fontWeight: "bold", color: "#a72a34" },
  commentText: { fontSize: 13, color: "#444" },
  empty: { textAlign: "center", marginTop: 50, color: "#999" },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: { backgroundColor: "#fff", borderRadius: 15, padding: 20 },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#a72a34",
    textAlign: "center",
  },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 10, color: "#333" },
  typeSelector: { flexDirection: "row", gap: 10, marginBottom: 15 },
  typeBtn: {
    padding: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    flex: 1,
    alignItems: "center",
  },
  typeBtnActive: { backgroundColor: "#a72a34", borderColor: "#a72a34" },
  typeText: { color: "#666" },
  typeTextActive: { color: "#fff", fontWeight: "bold" },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    height: 80,
    textAlignVertical: "top",
    marginBottom: 20,
  },
  modalButtons: { flexDirection: "row", justifyContent: "flex-end", gap: 15 },
  btnCancel: { paddingVertical: 10, paddingHorizontal: 20 },
  btnSend: {
    backgroundColor: "#a72a34",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  btnTextCancel: { color: "#666", fontWeight: "600" },
  btnTextSend: { color: "#fff", fontWeight: "bold" },
});
