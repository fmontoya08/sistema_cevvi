import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { Calendar, LocaleConfig } from "react-native-calendars";
import { useAuth } from "../../context/AuthContext"; // Ajusta la ruta a tu AuthContext

// Configuración de idioma español para el calendario
LocaleConfig.locales["es"] = {
  monthNames: [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ],
  monthNamesShort: [
    "Ene",
    "Feb",
    "Mar",
    "Abr",
    "May",
    "Jun",
    "Jul",
    "Ago",
    "Sep",
    "Oct",
    "Nov",
    "Dic",
  ],
  dayNames: [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ],
  dayNamesShort: ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"],
  today: "Hoy",
};
LocaleConfig.defaultLocale = "es";

export default function CalendarioScreen() {
  const { api } = useAuth();
  const [items, setItems] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState("");
  const [eventosDelDia, setEventosDelDia] = useState([]);

  // 1. Reutilizamos tu lógica de carga de App.js
  const fetchEventos = useCallback(async () => {
    try {
      const res = await api.get("/eventos-alumno");

      // Transformamos los datos para react-native-calendars (MarkedDates)
      const marcadores = {};
      if (res.data) {
        res.data.forEach((evento) => {
          if (!evento.start) return;
          // Asumiendo que 'start' viene como "YYYY-MM-DD" o similar
          const fecha = evento.start.split("T")[0];

          let color = "#a72a34"; // Rojo (General)
          if (evento.modalidad === "virtual") color = "#3b82f6"; // Azul
          if (evento.modalidad === "presencial") color = "#10b981"; // Verde

          if (marcadores[fecha]) {
            marcadores[fecha].push({
              marked: true,
              dotColor: color,
              data: evento,
            });
          } else {
            marcadores[fecha] = [{
              marked: true,
              dotColor: color,
              data: evento,
            }];
          }
        });
      }

      setItems(marcadores);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "No se pudo cargar el calendario");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchEventos();
  }, [fetchEventos]);

  // Al tocar un día
  const onDayPress = (day) => {
    setSelectedDate(day.dateString);
    const eventos = items[day.dateString];
    if (eventos && Array.isArray(eventos)) {
      setEventosDelDia(eventos.map((e: any) => e.data));
    } else {
      setEventosDelDia([]);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#a72a34" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Calendario Escolar</Text>

      {/* Leyenda de colores (Copiado de tu lógica) */}
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: "#a72a34" }]} />
          <Text style={styles.legendText}>Gral</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: "#3b82f6" }]} />
          <Text style={styles.legendText}>Virtual</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: "#10b981" }]} />
          <Text style={styles.legendText}>Presencial</Text>
        </View>
      </View>

      <Calendar
        onDayPress={onDayPress}
        markedDates={(() => {
          const flat: any = {};
          Object.keys(items).forEach((fecha) => {
            if (Array.isArray(items[fecha]) && items[fecha].length > 0) {
              const first = items[fecha][0];
              flat[fecha] = { marked: true, dotColor: first.dotColor };
            }
          });
          if (selectedDate && flat[selectedDate]) {
            flat[selectedDate] = { ...flat[selectedDate], selected: true, selectedColor: "#a72a34" };
          } else if (selectedDate) {
            flat[selectedDate] = { selected: true, selectedColor: "#a72a34" };
          }
          return flat;
        })()}
        theme={{
          todayTextColor: "#a72a34",
          arrowColor: "#a72a34",
          selectedDayBackgroundColor: "#a72a34",
        }}
      />

      {/* Detalles del evento seleccionado */}
      <View style={styles.eventosContainer}>
        <Text style={styles.subtitle}>
          Eventos del {selectedDate || "día"}:
        </Text>
        {eventosDelDia.length === 0 ? (
          <Text style={styles.noEvents}>Ningún evento seleccionado.</Text>
        ) : (
          eventosDelDia.map((ev, i) => (
            <View key={i} style={styles.card}>
              <Text style={styles.cardTitle}>{ev.title}</Text>
              <Text style={styles.cardInfo}>Modalidad: {ev.modalidad}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 15 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "bold", color: "#333", marginBottom: 10 },
  subtitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 20,
    marginBottom: 10,
  },
  legendContainer: { flexDirection: "row", marginBottom: 15, gap: 15 },
  legendItem: { flexDirection: "row", alignItems: "center" },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 5 },
  legendText: { fontSize: 12, color: "#555" },
  eventosContainer: { paddingBottom: 40 },
  noEvents: { fontStyle: "italic", color: "#888" },
  card: {
    backgroundColor: "#f9f9f9",
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#a72a34",
    marginBottom: 10,
    elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: "bold", color: "#333" },
  cardInfo: { fontSize: 14, color: "#666", marginTop: 4 },
});
