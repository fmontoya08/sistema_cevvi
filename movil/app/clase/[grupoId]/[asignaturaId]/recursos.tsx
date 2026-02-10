import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "../../../../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";

export default function RecursosScreen() {
  const { grupoId, asignaturaId } = useLocalSearchParams();
  const { api, API_URL } = useAuth(); // Necesitamos API_URL para construir el link de descarga
  const router = useRouter();
  const [recursos, setRecursos] = useState([]);
  const [loading, setLoading] = useState(true);

  // URL base para descargar archivos (quitamos el '/api' del final si es necesario)
  // Si API_URL es "http://.../api", la base de uploads suele ser "http://.../uploads"
  // Ajusta esto según cómo sirvas tus estáticos en el backend
  const BASE_UPLOADS = API_URL.replace("/api", "/uploads");

  useEffect(() => {
    cargarRecursos();
  }, []);

  const cargarRecursos = async () => {
    try {
      const res = await api.get(
        `/alumno/aula-virtual/${grupoId}/${asignaturaId}/recursos`,
      );
      setRecursos(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const abrirRecurso = (item: any) => {
    if (item.tipo_recurso === "enlace") {
      Linking.openURL(item.ruta_o_url);
    } else {
      // Es un archivo, construimos la URL completa
      // Nota: Asegúrate de que en tu index.js tengas: app.use("/uploads", express.static(...));
      const urlCompleta = `${BASE_UPLOADS}/${item.ruta_o_url}`;
      Linking.openURL(urlCompleta);
    }
  };

  const renderItem = ({ item }) => {
    const esEnlace = item.tipo_recurso === "enlace";
    return (
      <TouchableOpacity style={styles.card} onPress={() => abrirRecurso(item)}>
        <View
          style={[
            styles.iconBox,
            { backgroundColor: esEnlace ? "#e0f2fe" : "#fef9c3" },
          ]}
        >
          <Ionicons
            name={esEnlace ? "link" : "document-text"}
            size={24}
            color={esEnlace ? "#0284c7" : "#d97706"}
          />
        </View>
        <View style={styles.info}>
          <Text style={styles.recursoTitle}>{item.titulo}</Text>
          <Text style={styles.recursoMeta}>
            {esEnlace ? "Enlace Externo" : "Archivo Descargable"} •{" "}
            {item.fecha_subida ? item.fecha_subida.split("T")[0] : ""}
          </Text>
        </View>
        <Ionicons name="download-outline" size={20} color="#999" />
      </TouchableOpacity>
    );
  };

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
        <Text style={styles.title}>Material de Clase</Text>
      </View>

      <FlatList
        data={recursos}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 15 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="folder-open-outline" size={50} color="#ccc" />
            <Text style={styles.emptyText}>
              No hay material disponible aún.
            </Text>
          </View>
        }
      />
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
  },
  backButton: { marginRight: 15 },
  title: { fontSize: 20, fontWeight: "bold", color: "#a72a34" },

  card: {
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 2,
  },
  iconBox: {
    width: 45,
    height: 45,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  info: { flex: 1 },
  recursoTitle: { fontSize: 16, fontWeight: "600", color: "#333" },
  recursoMeta: { fontSize: 12, color: "#888", marginTop: 2 },

  emptyContainer: { alignItems: "center", marginTop: 80 },
  emptyText: { marginTop: 10, color: "#888", fontSize: 16 },
});
