// Archivo: movil/app/detalle-curso.tsx

import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

// Tipos de datos
interface Alumno {
  id: number;
  nombre_completo: string;
  calificacion: number | null;
}
interface CursoInfo {
  nombre_grupo: string;
  nombre_asignatura: string;
}
interface AlumnosResponse {
  cursoInfo: CursoInfo;
  alumnos: Alumno[];
}

// Creamos un tipo para manejar las calificaciones en el estado
type CalificacionesState = {
  [alumnoId: number]: string; // Guardamos como string para el TextInput
};

export default function DetalleCursoScreen() {
  const { api } = useAuth();
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [cursoInfo, setCursoInfo] = useState<CursoInfo | null>(null);
  const [calificaciones, setCalificaciones] = useState<CalificacionesState>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Obtenemos los parámetros de la URL
  const { grupoId, asignaturaId } = useLocalSearchParams();
  const navigation = useNavigation();

  const fetchAlumnos = useCallback(async () => {
    try {
      const response = await api.get<AlumnosResponse>(
        `/docente/grupo/${grupoId}/asignatura/${asignaturaId}/alumnos`
      );
      const { cursoInfo, alumnos } = response.data;

      setAlumnos(alumnos);
      setCursoInfo(cursoInfo);

      // Actualizamos el título de la pantalla
      navigation.setOptions({ title: cursoInfo.nombre_asignatura });

      // Inicializamos el estado de calificaciones con los valores de la API
      const initialCals = alumnos.reduce((acc, alumno) => {
        acc[alumno.id] =
          alumno.calificacion !== null ? String(alumno.calificacion) : "";
        return acc;
      }, {} as CalificacionesState);
      setCalificaciones(initialCals);
    } catch (error) {
      console.error("Error al cargar alumnos", error);
      Alert.alert("Error", "No se pudo cargar la lista de alumnos.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [api, grupoId, asignaturaId, navigation]);

  useEffect(() => {
    fetchAlumnos();
  }, [fetchAlumnos]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAlumnos();
  };

  // Función para manejar el cambio en un TextInput
  const handleCalificacionChange = (alumnoId: number, valor: string) => {
    setCalificaciones((prev) => ({
      ...prev,
      [alumnoId]: valor,
    }));
  };

  // Función para guardar la calificación de UN alumno
  const handleGuardarCalificacion = async (alumnoId: number) => {
    const calificacion = calificaciones[alumnoId];
    if (calificacion === "") {
      Alert.alert("Error", "La calificación no puede estar vacía.");
      return;
    }
    const calNum = parseFloat(calificacion);
    if (isNaN(calNum) || calNum < 0 || calNum > 100) {
      Alert.alert("Error", "Ingresa una calificación válida (entre 0 y 100).");
      return;
    }

    try {
      await api.post("/docente/calificar", {
        alumno_id: alumnoId,
        asignatura_id: asignaturaId,
        calificacion: calNum,
      });
      Alert.alert("Éxito", "Calificación guardada correctamente.");
    } catch (error) {
      console.error("Error al guardar calificación", error);
      Alert.alert("Error", "No se pudo guardar la calificación.");
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.sectionTitle}>
        Lista de Alumnos - Grupo: {cursoInfo?.nombre_grupo}
      </Text>

      <View style={styles.card}>
        <View style={styles.tableHeader}>
          <Text style={[styles.headerText, { flex: 3 }]}>
            Nombre del Alumno
          </Text>
          <Text style={[styles.headerText, { flex: 1.5, textAlign: "center" }]}>
            Cal.
          </Text>
          <Text style={[styles.headerText, { flex: 1, textAlign: "right" }]}>
            Acción
          </Text>
        </View>

        {alumnos.length > 0 ? (
          alumnos.map((alumno) => (
            <View key={alumno.id} style={styles.tableRow}>
              <Text style={[styles.cellText, { flex: 3 }]}>
                {alumno.nombre_completo}
              </Text>
              <TextInput
                style={styles.inputCal}
                value={calificaciones[alumno.id] || ""}
                onChangeText={(valor) =>
                  handleCalificacionChange(alumno.id, valor)
                }
                keyboardType="numeric"
                maxLength={5}
              />
              <TouchableOpacity
                style={styles.saveButton}
                onPress={() => handleGuardarCalificacion(alumno.id)}
              >
                <Ionicons name="save-outline" size={22} color="#0a7ea4" />
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <Text style={styles.noAlumnos}>No hay alumnos inscritos.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f0f7",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 20,
    marginLeft: 15,
    marginBottom: 10,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 15,
    marginHorizontal: 15,
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: "row",
    paddingBottom: 10,
    marginBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerText: {
    fontWeight: "bold",
    fontSize: 14,
    color: "#333",
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
    color: "#555",
    flexWrap: "wrap",
  },
  inputCal: {
    flex: 1.5,
    borderColor: "#ddd",
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    textAlign: "center",
    marginLeft: 5,
    fontSize: 14,
  },
  saveButton: {
    flex: 1,
    alignItems: "flex-end",
  },
  noAlumnos: {
    textAlign: "center",
    paddingVertical: 20,
    color: "gray",
  },
});
