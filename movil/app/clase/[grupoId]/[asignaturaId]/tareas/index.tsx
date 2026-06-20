import React, { useEffect, useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useAuth } from "../../../../../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";

export default function ListaTareasScreen() {
  const { grupoId, asignaturaId } = useLocalSearchParams();
  const { api } = useAuth();
  const router = useRouter();
  const [tareas, setTareas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Usamos useFocusEffect para recargar la lista cuando regresas de subir una tarea
  useFocusEffect(
    useCallback(() => {
      cargarTareas();
    }, []),
  );

  const cargarTareas = async () => {
    try {
      // Ajusta la ruta a tu endpoint real
      const res = await api.get(
        `/alumno/aula-virtual/${grupoId}/${asignaturaId}/tareas`,
      );
      if (res.data) {
        setTareas(res.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    cargarTareas();
  };

  const irADetalle = (tareaId, titulo) => {
    router.push({
      pathname: `/clase/${grupoId}/${asignaturaId}/tareas/${tareaId}`,
      params: { tituloTarea: titulo },
    });
  };

  const getStatusInfo = (fechaLimite, entregada, calificacion) => {
    if (calificacion !== null && calificacion !== undefined)
      return {
        label: "Calificada",
        color: "#16a34a",
        icon: "checkmark-circle",
      };
    if (entregada)
      return { label: "Entregada", color: "#0284c7", icon: "cloud-done" };

    const fechaLim = new Date(fechaLimite);
    if (isNaN(fechaLim.getTime())) {
      return { label: "Fecha no disponible", color: "#888", icon: "help-circle" };
    }
    const hoy = new Date();
    if (hoy > fechaLim)
      return { label: "Vencida", color: "#ef4444", icon: "alert-circle" };

    return { label: "Pendiente", color: "#d97706", icon: "time" };
  };

  const renderItem = ({ item }) => {
    // Asumimos que tu backend devuelve si ya entregó la tarea (item.entregada = true/false)
    const status = getStatusInfo(
      item.fecha_limite,
      item.ha_entregado,
      item.calificacion,
    );

    return (
      <TouchableOpacity
        style={[styles.card, { borderLeftColor: status.color }]}
        onPress={() => irADetalle(item.id, item.titulo)}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{item.titulo}</Text>
          <Ionicons name={status.icon} size={20} color={status.color} />
        </View>

        <Text style={styles.dateText}>
          Vence:{" "}
          {item.fecha_limite ? item.fecha_limite.split("T")[0] : "Sin fecha"}
        </Text>

        <View style={styles.footer}>
          <View
            style={[styles.badge, { backgroundColor: status.color + "20" }]}
          >
            <Text style={[styles.badgeText, { color: status.color }]}>
              {status.label}
            </Text>
          </View>
          {item.calificacion && (
            <Text style={styles.grade}>Nota: {item.calificacion}</Text>
          )}
        </View>
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
        <Text style={styles.title}>Tareas y Actividades</Text>
      </View>

      <FlatList
        data={tareas}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 15 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>No hay tareas asignadas.</Text>
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
  card: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 12,
    elevation: 2,
    borderLeftWidth: 5,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
    marginRight: 10,
  },
  dateText: { fontSize: 13, color: "#666", marginTop: 5, marginBottom: 10 },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 5 },
  badgeText: { fontSize: 12, fontWeight: "bold" },
  grade: { fontWeight: "bold", color: "#333" },
  empty: { textAlign: "center", marginTop: 50, color: "#999" },
});
