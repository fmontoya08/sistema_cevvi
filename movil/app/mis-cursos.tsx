import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function MisCursosScreen() {
  const { api } = useAuth();
  const router = useRouter();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarCursos();
  }, []);

  const cargarCursos = async () => {
    try {
      // Usamos tu endpoint existente que trae grupos y materias
      const res = await api.get("/alumno/mi-grupo");
      setData(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#a72a34" />
      </View>
    );
  }

  // Renderizamos cada grupo (Ciclo escolar)
  const renderGrupo = ({ item }) => (
    <View style={styles.grupoContainer}>
      <Text style={styles.grupoTitle}>{item.grupo.nombre_grupo}</Text>
      <Text style={styles.cicloTitle}>
        {item.grupo.nombre_ciclo || "Ciclo Actual"}
      </Text>

      {/* Lista de Materias dentro del grupo */}
      {item.asignaturas.map((materia) => (
        <TouchableOpacity
          key={materia.asignatura_id}
          style={styles.materiaCard}
          onPress={() => {
            // Navegamos al menú específico de esa materia
            // Pasamos los IDs necesarios para todas las consultas futuras
            router.push(
              `/clase/${item.grupo.id}/${materia.asignatura_id}?nombre=${encodeURIComponent(materia.nombre_asignatura)}`,
            );
          }}
        >
          <View style={styles.iconBox}>
            <Text style={styles.iconText}>
              {materia.nombre_asignatura.charAt(0)}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.materiaName}>{materia.nombre_asignatura}</Text>
            <Text style={styles.profesorName}>
              {materia.docente_nombre
                ? `Prof. ${materia.docente_nombre} ${materia.docente_apellido}`
                : "Sin Docente"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Mis Materias</Text>
      </View>

      <FlatList
        data={data}
        keyExtractor={(item) => item.grupo.id.toString()}
        renderItem={renderGrupo}
        contentContainerStyle={{ padding: 15 }}
        ListEmptyComponent={
          <Text style={styles.empty}>No tienes materias asignadas.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f4f4" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
    gap: 15,
    elevation: 2,
  },
  title: { fontSize: 20, fontWeight: "bold", color: "#a72a34" },
  grupoContainer: { marginBottom: 25 },
  grupoTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginLeft: 5,
  },
  cicloTitle: { fontSize: 14, color: "#666", marginLeft: 5, marginBottom: 10 },
  materiaCard: {
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 2,
  },
  iconBox: {
    width: 45,
    height: 45,
    borderRadius: 10,
    backgroundColor: "#fce7e7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  iconText: { fontSize: 20, fontWeight: "bold", color: "#a72a34" },
  materiaName: { fontSize: 16, fontWeight: "600", color: "#333" },
  profesorName: { fontSize: 13, color: "#666", marginTop: 2 },
  empty: { textAlign: "center", marginTop: 50, color: "#999" },
});
