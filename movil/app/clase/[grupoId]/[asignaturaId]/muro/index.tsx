import React, { useEffect, useState, useRef } from "react";
import {
  StyleSheet, View, Text, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "../../../../../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";

export default function MuroScreen() {
  const { grupoId, asignaturaId } = useLocalSearchParams();
  const { api } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const flatRef = useRef<FlatList>(null);

  useEffect(() => {
    cargarMuro();
  }, []);

  const cargarMuro = async () => {
    try {
      const res = await api.get(`/muro/${grupoId}/${asignaturaId}`);
      setPosts(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const publicar = async () => {
    if (!mensaje.trim()) return;
    setEnviando(true);
    try {
      await api.post("/muro/publicar", {
        grupo_id: Number(grupoId),
        asignatura_id: Number(asignaturaId),
        mensaje: mensaje.trim(),
      });
      setMensaje("");
      await cargarMuro();
    } catch (error) {
      console.error(error);
    } finally {
      setEnviando(false);
    }
  };

  const renderPost = ({ item }: { item: any }) => {
    const esDocente = item.rol === "docente";
    return (
      <View style={styles.postCard}>
        <View style={styles.postHeader}>
          <View style={[styles.avatar, { backgroundColor: esDocente ? "#dcfce7" : "#fce7e7" }]}>
            <Text style={[styles.avatarText, { color: esDocente ? "#16a34a" : "#a72a34" }]}>
              {item.nombre?.charAt(0)}{item.apellido_paterno?.charAt(0)}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.postAutor}>
              {item.nombre} {item.apellido_paterno}
              {esDocente ? <Text style={styles.badgeDocente}> Docente</Text> : null}
            </Text>
            <Text style={styles.postFecha}>{item.fecha?.split(".")[0]?.replace("T", " ")}</Text>
          </View>
        </View>
        <Text style={styles.postMensaje}>{item.mensaje}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#a72a34" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Muro</Text>
      </View>

      <FlatList
        ref={flatRef}
        data={posts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderPost}
        contentContainerStyle={{ padding: 15 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={50} color="#ccc" />
            <Text style={styles.emptyText}>Aún no hay publicaciones. ¡Sé el primero!</Text>
          </View>
        }
      />

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="Escribe un mensaje..."
          value={mensaje}
          onChangeText={setMensaje}
          multiline
        />
        <TouchableOpacity style={styles.sendBtn} onPress={publicar} disabled={enviando || !mensaje.trim()}>
          {enviando ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f4f4" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", padding: 20, backgroundColor: "#fff", gap: 15, elevation: 2 },
  title: { fontSize: 20, fontWeight: "bold", color: "#a72a34" },
  postCard: {
    backgroundColor: "#fff", padding: 15, borderRadius: 12, marginBottom: 12, elevation: 2,
  },
  postHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center", marginRight: 10 },
  avatarText: { fontSize: 16, fontWeight: "bold" },
  postAutor: { fontSize: 14, fontWeight: "600", color: "#333" },
  badgeDocente: { fontSize: 11, color: "#16a34a", fontWeight: "normal" },
  postFecha: { fontSize: 11, color: "#999", marginTop: 2 },
  postMensaje: { fontSize: 15, color: "#444", lineHeight: 22 },
  emptyContainer: { alignItems: "center", marginTop: 80 },
  emptyText: { marginTop: 10, color: "#888", fontSize: 16 },
  inputBar: {
    flexDirection: "row", alignItems: "flex-end", padding: 10,
    backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#e5e5e5",
  },
  input: {
    flex: 1, backgroundColor: "#f4f4f4", borderRadius: 20, paddingHorizontal: 15,
    paddingVertical: 10, maxHeight: 100, marginRight: 10, fontSize: 14,
  },
  sendBtn: {
    backgroundColor: "#a72a34", width: 42, height: 42, borderRadius: 21,
    justifyContent: "center", alignItems: "center",
  },
});
