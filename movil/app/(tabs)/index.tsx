import React, { useState, useCallback, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context"; // Importante para iOS

export default function HomeScreen() {
  const { user, api } = useAuth();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  // Si el usuario aún no carga, mostramos un nombre genérico
  const nombreUsuario = user?.nombre || "Alumno";

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await api.get("/notificaciones/no-leidas");
      setUnreadCount(res.data.count || 0);
    } catch (e) {
      console.log("Error fetching unread count:", e);
    }
  }, [api]);

  // Refrescar al entrar a la pantalla
  useFocusEffect(
    useCallback(() => {
      fetchUnreadCount();
    }, [fetchUnreadCount])
  );

  // Refrescar cada 30 segundos en segundo plano
  useEffect(() => {
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

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
          <TouchableOpacity
            onPress={() => router.push("/notificaciones")}
            style={styles.bellButton}
          >
            <Ionicons name="notifications-outline" size={24} color="#a72a34" />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          {/* Puedes cambiar esta imagen por tu logo real */}
          <Image
            source={require("../../assets/images/logo_sigloxxi.png")}
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

            {/* Botón: Biblioteca Virtual */}
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push("/biblioteca")}
            >
              <View
                style={[styles.iconContainer, { backgroundColor: "#fef3c7" }]}
              >
                <Ionicons name="library-outline" size={32} color="#d97706" />
              </View>
              <Text style={styles.cardText}>Biblioteca</Text>
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

          {/* Fila 3: Calificaciones */}
          <View style={styles.grid}>
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push("/mis-calificaciones")}
            >
              <View style={[styles.iconContainer, { backgroundColor: "#fce7e7" }]}>
                <Ionicons name="stats-chart" size={32} color="#a72a34" />
              </View>
              <Text style={styles.cardText}>Mis Calificaciones</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push("/expediente")}
            >
              <View style={[styles.iconContainer, { backgroundColor: "#e0f2fe" }]}>
                <Ionicons name="folder-open" size={32} color="#0284c7" />
              </View>
              <Text style={styles.cardText}>Expediente</Text>
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

  bellButton: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 25,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginLeft: 10,
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#dc2626",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    elevation: 4,
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
  },
});
