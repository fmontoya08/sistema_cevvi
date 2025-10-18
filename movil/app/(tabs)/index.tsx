// Ruta del archivo: sistema_cevvi/movil/app/(tabs)/index.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "@/context/AuthContext";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Redirect, useNavigation } from "expo-router";

export default function AlumnoDashboardScreen() {
  const { user, api } = useAuth();
  const [miGrupo, setMiGrupo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();

  const fetchMiGrupo = useCallback(async () => {
    if (!user || user.rol !== "alumno") return;
    try {
      const response = await api.get("/alumno/mi-grupo");
      setMiGrupo(response.data);
    } catch (error) {
      console.error(
        "Error al cargar la información del grupo:",
        error.response?.data?.message || error.message
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, api]);

  useEffect(() => {
    if (user?.rol === "alumno") {
      navigation.setOptions({ title: `Portal de ${user.nombre}` });
      fetchMiGrupo();
    }
  }, [fetchMiGrupo, user, navigation]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMiGrupo();
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Si el usuario no es un alumno, redirigir a la pestaña de docente
  if (user && user.rol !== "alumno") {
    return <Redirect href="/(tabs)/explore" />;
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {miGrupo ? (
        <ThemedView style={styles.card}>
          <ThemedText style={styles.cardTitle}>
            Grupo: {miGrupo.grupo.nombre_grupo}
          </ThemedText>
          <ThemedText style={styles.cardSubtitle}>
            Ciclo Escolar: {miGrupo.grupo.nombre_ciclo}
          </ThemedText>

          <View style={styles.tableHeader}>
            <Text style={[styles.headerText, { flex: 2 }]}>Asignatura</Text>
            <Text style={[styles.headerText, { flex: 2 }]}>Docente</Text>
            <Text style={[styles.headerText, { flex: 1, textAlign: "right" }]}>
              Cal.
            </Text>
          </View>

          {miGrupo.asignaturas.map((asig, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={[styles.cellText, { flex: 2 }]}>
                {asig.nombre_asignatura}
              </Text>
              <Text style={[styles.cellText, { flex: 2 }]}>
                {asig.docente_nombre
                  ? `${asig.docente_nombre} ${asig.docente_apellido}`
                  : "N/A"}
              </Text>
              <Text style={[styles.cellText, styles.calificacion, { flex: 1 }]}>
                {asig.calificacion !== null ? asig.calificacion : "-"}
              </Text>
            </View>
          ))}
        </ThemedView>
      ) : (
        <ThemedView style={styles.centered}>
          <ThemedText>No estás inscrito en ningún grupo.</ThemedText>
        </ThemedView>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#f0f0f7",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
  },
  card: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 15,
    margin: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
  },
  cardSubtitle: {
    fontSize: 14,
    color: "gray",
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 10,
  },
  tableHeader: {
    flexDirection: "row",
    paddingBottom: 10,
    marginBottom: 5,
  },
  headerText: {
    fontWeight: "bold",
    fontSize: 14,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    alignItems: "center",
  },
  cellText: {
    fontSize: 14,
  },
  calificacion: {
    fontWeight: "bold",
    textAlign: "right",
  },
});
