import React from "react";
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useAuth } from "../../context/AuthContext"; // Ajusta ruta
import { Ionicons } from "@expo/vector-icons";

export default function PerfilScreen() {
  const { user, logout, API_URL } = useAuth();

  if (!user) return null;

  // URL base para imágenes (usar API_URL para producción)
  const BASE_URL_UPLOADS = API_URL.replace("/api", "/uploads") + "perfiles/";

  const fotoUrl = user.foto_perfil
    ? `${BASE_URL_UPLOADS}${user.foto_perfil}`
    : null;

  return (
    <ScrollView style={styles.container}>
      {/* Header del Perfil */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          {fotoUrl ? (
            <Image source={{ uri: fotoUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>{user.nombre.charAt(0)}</Text>
            </View>
          )}
        </View>
        <Text style={styles.name}>
          {user.nombre} {user.apellido_paterno}
        </Text>
        <Text style={styles.role}>Rol: {user.rol}</Text>
        <Text style={styles.matricula}>
          Matrícula: {user.matricula || "S/N"}
        </Text>
      </View>

      {/* Datos Informativos (Copiados de tu UserDetailModal) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información Personal</Text>
        <View style={styles.row}>
          <Ionicons name="mail-outline" size={20} color="#666" />
          <Text style={styles.rowText}>{user.email}</Text>
        </View>
        <View style={styles.row}>
          <Ionicons name="call-outline" size={20} color="#666" />
          <Text style={styles.rowText}>{user.telefono || "No registrado"}</Text>
        </View>
        <View style={styles.row}>
          <Ionicons name="calendar-outline" size={20} color="#666" />
          <Text style={styles.rowText}>
            {user.fecha_nacimiento
              ? user.fecha_nacimiento.split("T")[0]
              : "--/--/--"}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Académico</Text>
        <View style={styles.infoBox}>
          <Text style={styles.label}>Carrera</Text>
          <Text style={styles.value}>
            {user.nombre_carrera || "Sin Asignar"}
          </Text>
        </View>
        <View style={styles.infoBox}>
          <Text style={styles.label}>Sede</Text>
          <Text style={styles.value}>{user.nombre_sede || "Sin Asignar"}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Ionicons name="log-out-outline" size={24} color="#fff" />
        <Text style={styles.logoutText}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f4f4" },
  header: {
    backgroundColor: "#fff",
    alignItems: "center",
    padding: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    marginBottom: 20,
  },
  avatarContainer: { marginBottom: 15 },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: {
    backgroundColor: "#a72a34",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "#fff", fontSize: 40, fontWeight: "bold" },
  name: { fontSize: 22, fontWeight: "bold", color: "#333" },
  role: {
    fontSize: 14,
    color: "#666",
    marginTop: 5,
    textTransform: "uppercase",
  },
  matricula: { fontSize: 14, color: "#888", fontFamily: "monospace" },
  section: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginBottom: 15,
    padding: 20,
    borderRadius: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#a72a34",
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 5,
  },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  rowText: { marginLeft: 10, fontSize: 15, color: "#444" },
  infoBox: { marginBottom: 10 },
  label: { fontSize: 12, color: "#999", textTransform: "uppercase" },
  value: { fontSize: 16, color: "#333", fontWeight: "500" },
  logoutButton: {
    flexDirection: "row",
    backgroundColor: "#a72a34",
    margin: 20,
    padding: 15,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  logoutText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    marginLeft: 10,
  },
});
