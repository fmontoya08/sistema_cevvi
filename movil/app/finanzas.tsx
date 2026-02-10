import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function FinanzasScreen() {
  const { api } = useAuth();
  const router = useRouter();
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarFinanzas();
  }, []);

  const cargarFinanzas = async () => {
    try {
      // Usamos la ruta que tienes definida en index.js
      const res = await api.get("/alumno/mis-adeudos");
      setPagos(res.data);
    } catch (error) {
      console.error("Error cargando finanzas:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => {
    const esPagado = item.estatus_pago === "pagado";
    return (
      <View
        style={[
          styles.card,
          esPagado ? styles.cardPagado : styles.cardPendiente,
        ]}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.concepto}>{item.nombre_concepto}</Text>
          <Ionicons
            name={esPagado ? "checkmark-circle" : "time"}
            size={24}
            color={esPagado ? "#10b981" : "#f59e0b"}
          />
        </View>

        <Text style={styles.monto}>${item.monto_a_pagar}</Text>

        <View style={styles.row}>
          <Text style={styles.label}>Vence:</Text>
          <Text style={styles.value}>
            {item.fecha_vencimiento
              ? item.fecha_vencimiento.split("T")[0]
              : "S/F"}
          </Text>
        </View>

        <View style={styles.statusContainer}>
          <Text
            style={[
              styles.statusText,
              { color: esPagado ? "#10b981" : "#f59e0b" },
            ]}
          >
            {item.estatus_pago.toUpperCase()}
          </Text>
        </View>
      </View>
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
        <Text style={styles.title}>Estado de Cuenta</Text>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#a72a34"
          style={{ marginTop: 50 }}
        />
      ) : (
        <FlatList
          data={pagos}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>No tienes adeudos registrados.</Text>
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
  list: { padding: 15 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderLeftWidth: 5,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  cardPagado: { borderLeftColor: "#10b981" }, // Verde
  cardPendiente: { borderLeftColor: "#f59e0b" }, // Naranja
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  concepto: { fontSize: 16, fontWeight: "bold", color: "#333", flex: 1 },
  monto: { fontSize: 24, fontWeight: "bold", color: "#333", marginBottom: 10 },
  row: { flexDirection: "row", marginBottom: 5 },
  label: { color: "#666", marginRight: 5 },
  value: { color: "#333", fontWeight: "500" },
  statusContainer: {
    marginTop: 10,
    alignSelf: "flex-start",
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 5,
  },
  statusText: { fontWeight: "bold", fontSize: 12 },
  empty: { textAlign: "center", marginTop: 50, color: "#999", fontSize: 16 },
});
