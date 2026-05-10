import React from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function DetalleMateriaScreen() {
  const router = useRouter();
  // Recibimos los IDs de la URL
  const { grupoId, asignaturaId, nombre } = useLocalSearchParams();

  // Función auxiliar para navegar a los submódulos
  const irA = (ruta) => {
    router.push(`/clase/${grupoId}/${asignaturaId}/${ruta}`);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{nombre || "Detalle de Materia"}</Text>
      </View>

      <View style={styles.grid}>
        {/* 1. AULA VIRTUAL (Link de clase y info) */}
        <TouchableOpacity style={styles.card} onPress={() => irA("aula")}>
          <View style={[styles.iconCircle, { backgroundColor: "#dcfce7" }]}>
            <Ionicons name="videocam" size={32} color="#16a34a" />
          </View>
          <Text style={styles.cardTitle}>Clase en Vivo</Text>
          <Text style={styles.cardDesc}>Enlace y horarios</Text>
        </TouchableOpacity>

        {/* 2. FORO (Debates) */}
        <TouchableOpacity style={styles.card} onPress={() => irA("foro")}>
          <View style={[styles.iconCircle, { backgroundColor: "#e0f2fe" }]}>
            <Ionicons name="chatbubbles" size={32} color="#0284c7" />
          </View>
          <Text style={styles.cardTitle}>Foro</Text>
          <Text style={styles.cardDesc}>Dudas y debates</Text>
        </TouchableOpacity>

        {/* 3. TAREAS (Entregas) */}
        <TouchableOpacity style={styles.card} onPress={() => irA("tareas")}>
          <View style={[styles.iconCircle, { backgroundColor: "#fef3c7" }]}>
            <Ionicons name="library" size={32} color="#d97706" />
          </View>
          <Text style={styles.cardTitle}>Tareas</Text>
          <Text style={styles.cardDesc}>Ver y subir tareas</Text>
        </TouchableOpacity>

        {/* 4. RECURSOS (Archivos) */}
        <TouchableOpacity style={styles.card} onPress={() => irA("recursos")}>
          <View style={[styles.iconCircle, { backgroundColor: "#f3e8ff" }]}>
            <Ionicons name="folder-open" size={32} color="#9333ea" />
          </View>
          <Text style={styles.cardTitle}>Material</Text>
          <Text style={styles.cardDesc}>PDFs y archivos</Text>
        </TouchableOpacity>

        {/* --- BOTÓN DE ASISTENCIA --- */}
        <TouchableOpacity style={styles.card} onPress={() => irA("asistencia")}>
          <View style={[styles.iconCircle, { backgroundColor: "#ffe4e6" }]}>
            <Ionicons name="calendar-number" size={32} color="#be123c" />
          </View>
          <Text style={styles.cardTitle}>Asistencia</Text>
          <Text style={styles.cardDesc}>Historial de faltas</Text>
        </TouchableOpacity>

        {/* 5. MURO (Stream de avisos) */}
        <TouchableOpacity style={styles.card} onPress={() => irA("muro")}>
          <View style={[styles.iconCircle, { backgroundColor: "#e0f2fe" }]}>
            <Ionicons name="chatbubbles" size={32} color="#0284c7" />
          </View>
          <Text style={styles.cardTitle}>Muro</Text>
          <Text style={styles.cardDesc}>Avisos y debates</Text>
        </TouchableOpacity>

        {/* 6. EXÁMENES */}
        <TouchableOpacity style={styles.card} onPress={() => irA("examenes")}>
          <View style={[styles.iconCircle, { backgroundColor: "#f3e8ff" }]}>
            <Ionicons name="document-text" size={32} color="#9333ea" />
          </View>
          <Text style={styles.cardTitle}>Exámenes</Text>
          <Text style={styles.cardDesc}>Evaluaciones</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  header: {
    backgroundColor: "#a72a34",
    padding: 20,
    paddingTop: 50,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: { marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#fff", flex: 1 },
  grid: {
    padding: 20,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  card: {
    backgroundColor: "#fff",
    width: "48%",
    padding: 20,
    borderRadius: 15,
    alignItems: "center",
    marginBottom: 15,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
  },
  cardDesc: { fontSize: 12, color: "#888", marginTop: 4, textAlign: "center" },
});
