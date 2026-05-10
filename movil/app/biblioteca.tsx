import React, { useEffect, useState } from "react";
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Linking, ActivityIndicator } from "react-native";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const ICONOS: Record<string, { name: keyof typeof Ionicons.glyphMap; color: string }> = {
  pdf: { name: "document", color: "#ef4444" },
  video: { name: "videocam", color: "#8b5cf6" },
  imagen: { name: "image", color: "#3b82f6" },
  word: { name: "document-text", color: "#2563eb" },
  excel: { name: "grid", color: "#16a34a" },
  powerpoint: { name: "easel", color: "#ea580c" },
  otro: { name: "folder", color: "#64748b" },
};

export default function BibliotecaScreen() {
  const { api, API_URL } = useAuth();
  const router = useRouter();
  const [archivos, setArchivos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const BASE_UPLOADS = API_URL.replace("/api", "/uploads/biblioteca");

  useEffect(() => {
    cargarBiblioteca();
  }, []);

  const cargarBiblioteca = async () => {
    try {
      const res = await api.get("/biblioteca");
      setArchivos(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const abrirArchivo = (item: any) => {
    const url = `${BASE_UPLOADS}/${item.ruta_archivo}`;
    Linking.openURL(url);
  };

  const renderItem = ({ item }: { item: any }) => {
    const icono = ICONOS[item.tipo] || ICONOS.otro;
    return (
      <TouchableOpacity style={styles.card} onPress={() => abrirArchivo(item)}>
        <View style={[styles.iconBox, { backgroundColor: icono.color + "20" }]}>
          <Ionicons name={icono.name} size={28} color={icono.color} />
        </View>
        <View style={styles.info}>
          <Text style={styles.titulo}>{item.titulo}</Text>
          {item.descripcion ? <Text style={styles.desc} numberOfLines={2}>{item.descripcion}</Text> : null}
          <Text style={styles.meta}>
            {item.nombre?.toUpperCase()} {item.apellido_paterno?.toUpperCase()} • {item.fecha_subida?.split("T")[0]}
          </Text>
        </View>
        <Ionicons name="download-outline" size={20} color="#999" />
      </TouchableOpacity>
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
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Biblioteca Virtual</Text>
      </View>

      <FlatList
        data={archivos}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 15 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="library-outline" size={50} color="#ccc" />
            <Text style={styles.emptyText}>No hay archivos disponibles.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f4f4" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", padding: 20, backgroundColor: "#fff", gap: 15, elevation: 2 },
  title: { fontSize: 20, fontWeight: "bold", color: "#a72a34" },
  card: {
    backgroundColor: "#fff", flexDirection: "row", alignItems: "center",
    padding: 15, borderRadius: 12, marginBottom: 10, elevation: 2,
  },
  iconBox: { width: 50, height: 50, borderRadius: 12, justifyContent: "center", alignItems: "center", marginRight: 15 },
  info: { flex: 1 },
  titulo: { fontSize: 16, fontWeight: "600", color: "#333" },
  desc: { fontSize: 13, color: "#666", marginTop: 2 },
  meta: { fontSize: 11, color: "#999", marginTop: 4 },
  emptyContainer: { alignItems: "center", marginTop: 80 },
  emptyText: { marginTop: 10, color: "#888", fontSize: 16 },
});
