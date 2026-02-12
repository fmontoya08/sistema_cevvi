import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";

export default function NotificacionesScreen() {
  const { api } = useAuth();
  const router = useRouter();
  const [notificaciones, setNotificaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    cargarNotificaciones();
    marcarTodasComoLeidas(); // Opcional: Marcar al entrar
  }, []);

  const cargarNotificaciones = async () => {
    try {
      const res = await api.get("/notificaciones"); // Ruta de tu index.js
      setNotificaciones(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const marcarTodasComoLeidas = async () => {
    try {
      await api.put("/notificaciones/marcar-leidas");
    } catch (error) {
      console.log("Error marcando leídas");
    }
  };

  const handlePress = (item) => {
    // Lógica para intentar navegar según la URL que viene del backend
    // El backend guarda rutas web (ej: /alumno/grupo/1/asignatura/5/aula)
    // La app usa rutas movil (ej: /clase/1/5/aula)

    if (item.url_destino) {
      // Convertimos la ruta web a ruta móvil
      let rutaMovil = item.url_destino
        .replace("/alumno/grupo", "/clase") // Reemplaza base
        .replace("/asignatura", "") // Quita la palabra asignatura si sobra
        .replace("//", "/"); // Limpia dobles slashes

      // Intento simple de navegación
      try {
        router.push(rutaMovil);
      } catch (e) {
        console.log("No se pudo navegar a: " + rutaMovil);
      }
    }
  };

  const renderItem = ({ item }) => {
    // Icono según el tipo de notificación (puedes ajustar según tu BD)
    let iconName = "notifications";
    let iconColor = "#666";

    if (item.mensaje.includes("Tarea")) {
      iconName = "book";
      iconColor = "#d97706";
    } else if (item.mensaje.includes("Calificación")) {
      iconName = "school";
      iconColor = "#16a34a";
    } else if (item.mensaje.includes("Foro")) {
      iconName = "chatbubbles";
      iconColor = "#0284c7";
    } else if (item.mensaje.includes("Asistencia")) {
      iconName = "calendar";
      iconColor = "#a72a34";
    }

    return (
      <TouchableOpacity
        style={[styles.card, !item.leido && styles.noLeido]}
        onPress={() => handlePress(item)}
      >
        <View style={[styles.iconBox, { backgroundColor: iconColor + "20" }]}>
          <Ionicons name={iconName} size={24} color={iconColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.mensaje}>{item.mensaje}</Text>
          <Text style={styles.fecha}>
            {new Date(item.fecha_creacion).toLocaleDateString()} -{" "}
            {new Date(item.fecha_creacion).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
        {!item.leido && <View style={styles.dot} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Notificaciones</Text>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#a72a34"
          style={{ marginTop: 50 }}
        />
      ) : (
        <FlatList
          data={notificaciones}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 15 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                cargarNotificaciones();
              }}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons
                name="notifications-off-outline"
                size={50}
                color="#ccc"
              />
              <Text style={styles.emptyText}>
                No tienes notificaciones nuevas.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f4f4" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
    elevation: 2,
  },
  backButton: { marginRight: 15 },
  title: { fontSize: 20, fontWeight: "bold", color: "#a72a34" },

  card: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    elevation: 1,
  },
  noLeido: {
    backgroundColor: "#fffcfc",
    borderLeftWidth: 3,
    borderLeftColor: "#a72a34",
  },
  iconBox: {
    width: 45,
    height: 45,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  mensaje: { fontSize: 14, color: "#333", lineHeight: 20, fontWeight: "500" },
  fecha: { fontSize: 11, color: "#999", marginTop: 5 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#a72a34",
    marginLeft: 10,
  },

  empty: { alignItems: "center", marginTop: 100 },
  emptyText: { color: "#888", marginTop: 10, fontSize: 16 },
});
