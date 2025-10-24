// Archivo: movil/app/(tabs)/index.tsx

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

// Tipos de datos actualizados
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
    modalidad: string; // Incluimos la modalidad del grupo
  };
  asignaturas: Asignatura[];
}

export default function AlumnoDashboardScreen() {
  const { user, api } = useAuth();
  const [misGrupos, setMisGrupos] = useState<GrupoInfo[]>([]); // Estado es un array
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
        const response = await api.get<GrupoInfo[]>("/alumno/mi-grupo"); // Espera un array
        if (isMounted) {
          setMisGrupos(response.data);
        }
      } catch (error: any) {
        console.error(
          "Error al cargar la información del grupo:",
          error.response?.data?.message || error.message
        );
        if (isMounted) {
          setMisGrupos([]);
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
    fetchMiGrupo(true);
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Redirección si el rol no es alumno (protección extra)
  if (user && user.rol !== "alumno") {
    if (user.rol === "docente") return <Redirect href="/(tabs)/explore" />;
    if (user.rol === "aspirante") return <Redirect href="/(tabs)/expediente" />;
    // Si es admin, el layout superior ya lo redirige al login
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Revisamos el length y hacemos .map() */}
      {misGrupos.length > 0 ? (
        misGrupos.map((infoGrupo, index) => (
          <View key={index} style={styles.card}>
            <Text style={styles.cardTitle}>
              Grupo: {infoGrupo.grupo.nombre_grupo} ({infoGrupo.grupo.modalidad}
              )
            </Text>
            <Text style={styles.cardSubtitle}>
              Ciclo Escolar: {infoGrupo.grupo.nombre_ciclo}
            </Text>

            <View style={styles.tableHeader}>
              <Text style={[styles.headerText, { flex: 2 }]}>Asignatura</Text>
              <Text style={[styles.headerText, { flex: 2 }]}>Docente</Text>
              <Text
                style={[styles.headerText, { flex: 1, textAlign: "right" }]}
              >
                Cal.
              </Text>
            </View>

            {infoGrupo.asignaturas.map((asig: Asignatura, idx: number) => (
              <View key={idx} style={styles.tableRow}>
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
                <Text
                  style={[styles.cellText, styles.calificacion, { flex: 1 }]}
                >
                  {asig.calificacion !== null ? asig.calificacion : "-"}
                </Text>
              </View>
            ))}
          </View>
        ))
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
    // Añadimos sombra para mejorar el diseño
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#333", // Color más oscuro
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#666", // Gris un poco más oscuro
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 10,
  },
  // --- ESTILOS CORREGIDOS ---
  tableHeader: {
    flexDirection: "row", // Mantiene los elementos en fila
    paddingBottom: 10,
    marginBottom: 5,
    paddingHorizontal: 5, // Añade padding horizontal
  },
  headerText: {
    fontWeight: "bold",
    fontSize: 13, // Ligeramente más pequeño
    color: "#444",
    // Aseguramos que el flex se aplique correctamente
    flexGrow: 1, // Permite que crezcan
    flexShrink: 1, // Permite que se encojan si es necesario
    // paddingHorizontal: 2, // Espacio entre cabeceras (opcional)
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    alignItems: "center", // Centra verticalmente
    paddingHorizontal: 5, // Añade padding horizontal
  },
  cellText: {
    fontSize: 14,
    color: "#555",
    // Aseguramos que el flex se aplique correctamente
    flexGrow: 1, // Permite que crezcan
    flexShrink: 1, // Permite que se encojan
    paddingRight: 8, // Espacio a la derecha antes de la siguiente celda
  },
  calificacion: {
    fontWeight: "bold",
    textAlign: "right", // Mantiene alineación derecha
    flexGrow: 0, // No debe crecer más de lo necesario
    flexShrink: 0, // No debe encogerse
    minWidth: 40, // Ancho mínimo para la columna de calificación
    paddingRight: 0, // Quitamos el padding extra a la derecha
  },
  // --- FIN ESTILOS CORREGIDOS ---
});
