import React, { useEffect, useState } from "react";
import { StyleSheet, View, Text, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "../../../../../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";

export default function ExamenesScreen() {
  const { grupoId, asignaturaId } = useLocalSearchParams();
  const { api } = useAuth();
  const router = useRouter();
  const [examenes, setExamenes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarExamenes();
  }, []);

  const cargarExamenes = async () => {
    try {
      const res = await api.get(`/examenes/${grupoId}/${asignaturaId}`);
      setExamenes(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const renderExamen = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => {
        if (item.contestado) {
          // Ya lo contestó, no puede volver a intentar
          return;
        }
        router.push(`/examen/${item.id}`);
      }}
    >
      <View style={styles.cardLeft}>
        <Text style={styles.examenTitle}>{item.titulo}</Text>
        {item.descripcion ? <Text style={styles.examenDesc}>{item.descripcion}</Text> : null}
        <Text style={styles.examenMeta}>
          {item.puntos_maximos} pts • {item.fecha_creacion?.split("T")[0]}
        </Text>
      </View>
      <View style={styles.statusBox}>
        {item.contestado ? (
          <>
            <Ionicons name="checkmark-circle" size={24} color={item.estado === "calificado" ? "#22c55e" : "#f59e0b"} />
            <Text style={[styles.statusText, { color: item.estado === "calificado" ? "#22c55e" : "#f59e0b" }]}>
              {item.estado === "calificado" ? item.calificacion ?? "?" : "Revisión"}
            </Text>
          </>
        ) : (
          <>
            <Ionicons name="play-circle" size={24} color="#a72a34" />
            <Text style={styles.statusText}>Iniciar</Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );

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
        <Text style={styles.title}>Exámenes</Text>
      </View>

      <FlatList
        data={examenes}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderExamen}
        contentContainerStyle={{ padding: 15 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={50} color="#ccc" />
            <Text style={styles.emptyText}>No hay exámenes disponibles.</Text>
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
  cardLeft: { flex: 1 },
  examenTitle: { fontSize: 16, fontWeight: "600", color: "#333" },
  examenDesc: { fontSize: 13, color: "#666", marginTop: 2 },
  examenMeta: { fontSize: 12, color: "#999", marginTop: 4 },
  statusBox: { alignItems: "center", marginLeft: 10 },
  statusText: { fontSize: 11, fontWeight: "600", marginTop: 2 },
  emptyContainer: { alignItems: "center", marginTop: 80 },
  emptyText: { marginTop: 10, color: "#888", fontSize: 16 },
});
