import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { Redirect, useNavigation } from "expo-router";

// Definimos los tipos de datos que esperamos de la API
interface Asignatura {
  nombre_asignatura: string;
  docente_nombre: string | null;
  docente_apellido: string | null;
  calificacion: number | null;
  clave_asignatura: string;
}
interface GrupoInfo {
  grupo: {
    nombre_grupo: string;
    nombre_ciclo: string;
  };
  asignaturas: Asignatura[];
}

export default function AlumnoDashboardScreen() {
  const { user, api } = useAuth();
  const [miGrupo, setMiGrupo] = useState<GrupoInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();

  const fetchMiGrupo = useCallback(
    async (isMounted: boolean) => {
      if (!user || user.rol !== "alumno") {
        if (isMounted) setLoading(false);
        return;
      }
      try {
        const response = await api.get<GrupoInfo>("/alumno/mi-grupo");
        if (isMounted) {
          setMiGrupo(response.data);
        }
      } catch (error: any) {
        console.error(
          "Error al cargar la información del grupo:",
          error.response?.data?.message || error.message
        );
        if (isMounted) {
          setMiGrupo(null);
        }
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
    if (user?.rol === "alumno") {
      navigation.setOptions({ title: `Portal de ${user.nombre}` });
      fetchMiGrupo(isMounted);
    } else if (isMounted) {
      setLoading(false);
    }
    return () => {
      isMounted = false;
    };
  }, [user, navigation, fetchMiGrupo]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMiGrupo(true); // Pasamos true porque el componente está montado
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

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
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Grupo: {miGrupo.grupo.nombre_grupo}
          </Text>
          <Text style={styles.cardSubtitle}>
            Ciclo Escolar: {miGrupo.grupo.nombre_ciclo}
          </Text>

          <View style={styles.tableHeader}>
            <Text style={[styles.headerText, { flex: 2 }]}>Asignatura</Text>
            <Text style={[styles.headerText, { flex: 2 }]}>Docente</Text>
            <Text style={[styles.headerText, { flex: 1, textAlign: "right" }]}>
              Cal.
            </Text>
          </View>

          {miGrupo.asignaturas.map((asig: Asignatura, index: number) => (
            <View key={index} style={styles.tableRow}>
              <Text style={[styles.cellText, { flex: 2 }]}>
                {asig.nombre_asignatura}
              </Text>
              <Text style={[styles.cellText, { flex: 2 }]}>
                {asig.docente_nombre
                  ? `${asig.docente_nombre} ${
                      asig.docente_apellido || ""
                    }`.trim()
                  : "N/A"}
              </Text>
              <Text style={[styles.cellText, styles.calificacion, { flex: 1 }]}>
                {asig.calificacion !== null ? asig.calificacion : "-"}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.centeredCard}>
          <Text>No estás inscrito en ningún grupo.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#f0f0f7",
    paddingVertical: 10,
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
    color: "#333",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    alignItems: "center",
  },
  cellText: {
    fontSize: 14,
    color: "#555",
  },
  calificacion: {
    fontWeight: "bold",
    textAlign: "right",
  },
});
