import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Text,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, useNavigation } from "expo-router";

// Definimos el tipo de dato para un curso
interface Curso {
  grupo_id: number;
  asignatura_id: number;
  nombre_asignatura: string;
  nombre_grupo: string;
  nombre_ciclo: string;
  total_alumnos: number;
}

export default function DocenteDashboardScreen() {
  const { user, api } = useAuth();
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();

  const fetchCursos = useCallback(
    async (isMounted: boolean) => {
      if (!user || user.rol !== "docente") {
        if (isMounted) setLoading(false);
        return;
      }
      try {
        const response = await api.get<Curso[]>("/docente/mis-cursos");
        if (isMounted) {
          setCursos(response.data);
        }
      } catch (error: any) {
        console.error(
          "Error al cargar los cursos del docente:",
          error.response?.data?.message || error.message
        );
      } finally {
        if (isMounted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [user, api]
  );

  useEffect(() => {
    let isMounted = true;
    if (user && user.rol === "docente") {
      navigation.setOptions({ title: `Portal de ${user.nombre}` });
      fetchCursos(isMounted);
    } else {
      if (isMounted) setLoading(false);
    }
    return () => {
      isMounted = false;
    };
  }, [user, navigation, fetchCursos]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCursos(true);
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

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
      <Text style={styles.sectionTitle}>Mis Cursos Asignados</Text>

      {cursos.length > 0 ? (
        cursos.map((curso: Curso) => (
          <TouchableOpacity
            key={`${curso.grupo_id}-${curso.asignatura_id}`}
            style={styles.card}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{curso.nombre_asignatura}</Text>
              <Text style={styles.cardSubtitle}>
                Grupo: {curso.nombre_grupo} | Ciclo: {curso.nombre_ciclo}
              </Text>
              <View style={styles.cardFooter}>
                <Ionicons name="people-outline" size={16} color="#555" />
                <Text style={styles.footerText}>
                  {curso.total_alumnos} Alumnos
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward-outline" size={24} color="#ccc" />
          </TouchableOpacity>
        ))
      ) : (
        <View style={styles.centeredCard}>
          <Text>No tienes cursos asignados actualmente.</Text>
        </View>
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
