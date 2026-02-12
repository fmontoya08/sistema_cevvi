import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "../../../../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";

export default function AsistenciaScreen() {
  const { grupoId, asignaturaId } = useLocalSearchParams();
  const { api } = useAuth();
  const router = useRouter();

  const [asistencias, setAsistencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resumen, setResumen] = useState({ presentes: 0, faltas: 0, total: 0 });

  useEffect(() => {
    cargarAsistencias();
  }, []);

  const cargarAsistencias = async () => {
    try {
      // Esta ruta ya existe en tu index.js:
      const res = await api.get(
        `/alumno/aula-virtual/${grupoId}/${asignaturaId}/mis-asistencias`,
      );
      setAsistencias(res.data);

      // Calcular resumen rápido
      let p = 0,
        f = 0;
      res.data.forEach((a) => {
        if (a.mi_estatus === "presente" || a.mi_estatus === "justificado") p++;
        else f++;
      });
      setResumen({ presentes: p, faltas: f, total: res.data.length });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "presente":
        return "#10b981"; // Verde
      case "ausente":
        return "#ef4444"; // Rojo
      case "retardo":
        return "#f59e0b"; // Naranja
      case "justificado":
        return "#3b82f6"; // Azul
      default:
        return "#6b7280";
    }
  };

  const renderItem = ({ item }) => (
    <View
      style={[styles.row, { borderLeftColor: getStatusColor(item.mi_estatus) }]}
    >
      <View style={styles.dateBox}>
        {/* item.fecha_mostrar viene de tu backend formateada */}
        <Text style={styles.dateText}>{item.fecha_mostrar.split(" ")[0]}</Text>
        <Text style={styles.timeText}>
          {item.fecha_mostrar.split(" ")[1]} {item.fecha_mostrar.split(" ")[2]}
        </Text>
      </View>
      <View style={{ flex: 1, paddingHorizontal: 10 }}>
        <Text style={styles.tema}>{item.tema_sesion || "Sesión de Clase"}</Text>
      </View>
      <View
        style={[
          styles.badge,
          { backgroundColor: getStatusColor(item.mi_estatus) + "20" },
        ]}
      >
        <Text
          style={[styles.badgeText, { color: getStatusColor(item.mi_estatus) }]}
        >
          {item.mi_estatus.toUpperCase()}
        </Text>
      </View>
    </View>
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
        <Text style={styles.title}>Reporte de Asistencia</Text>
      </View>

      {/* Resumen de Asistencias */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: "#10b981" }]}>
            {resumen.presentes}
          </Text>
          <Text style={styles.statLabel}>Asistencias</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: "#ef4444" }]}>
            {resumen.faltas}
          </Text>
          <Text style={styles.statLabel}>Faltas</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: "#333" }]}>
            {resumen.total > 0
              ? Math.round((resumen.presentes / resumen.total) * 100)
              : 0}
            %
          </Text>
          <Text style={styles.statLabel}>Porcentaje</Text>
        </View>
      </View>

      <FlatList
        data={asistencias}
        keyExtractor={(item) => item.sesion_id.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 15 }}
        ListEmptyComponent={
          <Text style={styles.empty}>No hay registros de asistencia.</Text>
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
  title: { fontSize: 20, fontWeight: "bold", color: "#a72a34", marginLeft: 10 },

  statsContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    margin: 15,
    borderRadius: 12,
    padding: 15,
    elevation: 2,
    justifyContent: "space-around",
  },
  statBox: { alignItems: "center" },
  statNumber: { fontSize: 22, fontWeight: "bold" },
  statLabel: { fontSize: 12, color: "#666" },
  statDivider: { width: 1, backgroundColor: "#eee" },

  row: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
    alignItems: "center",
    borderLeftWidth: 5,
  },
  dateBox: { alignItems: "center", marginRight: 10, width: 70 },
  dateText: { fontWeight: "bold", color: "#333", fontSize: 14 },
  timeText: { fontSize: 11, color: "#888" },
  tema: { fontSize: 15, fontWeight: "500", color: "#444" },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 5 },
  badgeText: { fontSize: 10, fontWeight: "bold" },
  empty: { textAlign: "center", marginTop: 50, color: "#999" },
});
