// Ruta del archivo: sistema_cevvi/movil/app/(tabs)/explore.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useAuth } from "@/context/AuthContext";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, useNavigation } from "expo-router";

export default function DocenteDashboardScreen() {
  const { user, api } = useAuth();
  const [cursos, setCursos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();

  const fetchCursos = useCallback(async () => {
    if (!user || user.rol !== "docente") return;
    try {
      const response = await api.get("/docente/mis-cursos");
      setCursos(response.data);
    } catch (error) {
      console.error(
        "Error al cargar los cursos del docente:",
        error.response?.data?.message || error.message
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, api]);

  useEffect(() => {
    if (user?.rol === "docente") {
      navigation.setOptions({ title: `Portal de ${user.nombre}` });
      fetchCursos();
    }
  }, [fetchCursos, user, navigation]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCursos();
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Si el usuario no es un docente, redirigir a la pestaña de alumno
  if (user && user.rol !== "docente") {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <ThemedText style={styles.sectionTitle}>Mis Cursos Asignados</ThemedText>

      {cursos.length > 0 ? (
        cursos.map((curso) => (
          <TouchableOpacity
            key={`${curso.grupo_id}-${curso.asignatura_id}`}
            style={styles.card}
          >
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.cardTitle}>
                {curso.nombre_asignatura}
              </ThemedText>
              <ThemedText style={styles.cardSubtitle}>
                Grupo: {curso.nombre_grupo} | Ciclo: {curso.nombre_ciclo}
              </ThemedText>
              <View style={styles.cardFooter}>
                <Ionicons name="people-outline" size={16} color="#555" />
                <ThemedText style={styles.footerText}>
                  {curso.total_alumnos} Alumnos
                </ThemedText>
              </View>
            </View>
            <Ionicons name="chevron-forward-outline" size={24} color="#ccc" />
          </TouchableOpacity>
        ))
      ) : (
        <ThemedView style={styles.centeredCard}>
          <ThemedText>No tienes cursos asignados actualmente.</ThemedText>
        </ThemedView>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f0f7",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 20,
    marginLeft: 15,
    marginBottom: 10,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  centeredCard: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    margin: 15,
    alignItems: "center",
  },
  card: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 15,
    marginHorizontal: 15,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  cardSubtitle: {
    fontSize: 14,
    color: "gray",
    marginTop: 4,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  footerText: {
    marginLeft: 5,
    fontSize: 12,
    color: "#555",
  },
});
