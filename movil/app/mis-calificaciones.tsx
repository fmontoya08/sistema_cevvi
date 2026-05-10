import React, { useEffect, useState } from "react";
import { StyleSheet, View, Text, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function MisCalificacionesScreen() {
  const { api } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarCalificaciones();
  }, []);

  const cargarCalificaciones = async () => {
    try {
      const res = await api.get("/alumno/mis-calificaciones");
      setData(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const renderCalificacion = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <Text style={styles.materiaName}>{item.nombre_asignatura}</Text>
        <Text style={styles.materiaClave}>{item.clave_asignatura}</Text>
        <Text style={styles.grupoText}>{item.nombre_grupo} - {item.nombre_ciclo}</Text>
      </View>
      <View style={styles.notaContainer}>
        <Text style={[
          styles.notaText,
          { color: item.calificacion >= 60 ? "#22c55e" : "#ef4444" }
        ]}>
          {item.calificacion}
        </Text>
        <Text style={styles.notaLabel}>/100</Text>
      </View>
    </View>
  );

  const promedio = data.length > 0
    ? (data.reduce((sum, c) => sum + c.calificacion, 0) / data.length).toFixed(1)
    : "0.0";

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
        <Text style={styles.title}>Mis Calificaciones</Text>
      </View>

      <View style={styles.promedioCard}>
        <Text style={styles.promedioLabel}>Promedio General</Text>
        <Text style={[styles.promedioNum, { color: Number(promedio) >= 60 ? "#22c55e" : "#ef4444" }]}>
          {promedio}
        </Text>
      </View>

      <FlatList
        data={data}
        keyExtractor={(_, index) => index.toString()}
        renderItem={renderCalificacion}
        contentContainerStyle={{ padding: 15 }}
        ListEmptyComponent={
          <Text style={styles.empty}>Aún no tienes calificaciones registradas.</Text>
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
  promedioCard: { backgroundColor: "#fff", margin: 15, padding: 20, borderRadius: 12, alignItems: "center", elevation: 2 },
  promedioLabel: { fontSize: 14, color: "#666" },
  promedioNum: { fontSize: 36, fontWeight: "bold", marginTop: 5 },
  card: {
    backgroundColor: "#fff", flexDirection: "row", alignItems: "center",
    padding: 15, borderRadius: 12, marginBottom: 10, elevation: 2,
  },
  cardLeft: { flex: 1 },
  materiaName: { fontSize: 16, fontWeight: "600", color: "#333" },
  materiaClave: { fontSize: 13, color: "#888", marginTop: 2 },
  grupoText: { fontSize: 12, color: "#aaa", marginTop: 2 },
  notaContainer: { alignItems: "center" },
  notaText: { fontSize: 24, fontWeight: "bold" },
  notaLabel: { fontSize: 10, color: "#999" },
  empty: { textAlign: "center", marginTop: 50, color: "#999" },
});
