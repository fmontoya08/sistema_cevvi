import React from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context"; // Importante para iOS

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();

  // Si el usuario aún no carga, mostramos un nombre genérico
  const nombreUsuario = user?.nombre || "Alumno";

  return (
    // SafeAreaView protege el contenido de la "muesca" del iPhone
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        {/* 1. Encabezado de Bienvenida */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>¡Hola, {nombreUsuario}!</Text>
            <Text style={styles.subGreeting}>Bienvenido a tu portal móvil</Text>
          </View>
          {/* Puedes cambiar esta imagen por tu logo real */}
          <Image
            source={require("../../assets/images/logo.png")}
            style={styles.logo}
          />
        </View>

        {/* 2. Sección de Accesos Rápidos */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Servicios Escolares</Text>

          {/* Fila 1: Pagos y Trámites */}
          <View style={styles.grid}>
            {/* Botón: Mis Pagos */}
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push("/finanzas")}
            >
              <View
                style={[styles.iconContainer, { backgroundColor: "#e0f2fe" }]}
              >
                <Ionicons name="card-outline" size={32} color="#0284c7" />
              </View>
              <Text style={styles.cardText}>Mis Pagos</Text>
            </TouchableOpacity>

            {/* Botón: Trámites */}
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push("/solicitudes")}
            >
              <View
                style={[styles.iconContainer, { backgroundColor: "#fef3c7" }]}
              >
                <Ionicons
                  name="document-text-outline"
                  size={32}
                  color="#d97706"
                />
              </View>
              <Text style={styles.cardText}>Trámites</Text>
            </TouchableOpacity>
          </View>

          {/* Fila 2: Mis Clases y Calendario */}
          <View style={styles.grid}>
            {/* Botón: Mis Clases (NUEVO) */}
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push("/mis-cursos")}
            >
              <View
                style={[styles.iconContainer, { backgroundColor: "#dcfce7" }]}
              >
                <Ionicons name="school-outline" size={32} color="#16a34a" />
              </View>
              <Text style={styles.cardText}>Mis Clases</Text>
            </TouchableOpacity>

            {/* Botón: Calendario */}
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push("/calendario")}
            >
              <View
                style={[styles.iconContainer, { backgroundColor: "#f3e8ff" }]}
              >
                <Ionicons name="calendar-outline" size={32} color="#9333ea" />
              </View>
              <Text style={styles.cardText}>Calendario</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 3. Avisos o Novedades */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Avisos Importantes</Text>
          <View style={styles.noticeCard}>
            <Ionicons
              name="information-circle"
              size={24}
              color="#a72a34"
              style={{ marginRight: 10 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.noticeTitle}>Reinscripciones Abiertas</Text>
              <Text style={styles.noticeBody}>
                Recuerda revisar tu fecha límite de pago para el próximo ciclo.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" }, // Fondo blanco seguro
  container: { flex: 1, backgroundColor: "#f8f9fa" },

  header: {
    backgroundColor: "#fff",
    padding: 25,
    // paddingTop: 50, <--- YA NO ES NECESARIO GRACIAS A SAFEAREAVIEW
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  greeting: { fontSize: 22, fontWeight: "bold", color: "#a72a34" },
  subGreeting: { fontSize: 14, color: "#666" },
  logo: { width: 50, height: 50, resizeMode: "contain" },

  sectionContainer: { padding: 20 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },

  grid: { flexDirection: "row", gap: 15, marginBottom: 15 },

  card: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  iconContainer: {
    padding: 15,
    borderRadius: 50,
    marginBottom: 10,
  },
  cardText: { fontWeight: "600", color: "#444", fontSize: 14 },

  noticeCard: {
    backgroundColor: "#fff",
    flexDirection: "row",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    borderLeftWidth: 4,
    borderLeftColor: "#a72a34",
    elevation: 2,
  },
  noticeTitle: { fontWeight: "bold", color: "#333", marginBottom: 2 },
  noticeBody: { fontSize: 13, color: "#666" },
});
