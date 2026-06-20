import React, { useEffect, useState } from "react";
import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";

interface Opcion {
  id: number;
  texto_opcion: string;
}

interface Pregunta {
  id: number;
  texto_pregunta: string;
  puntos: number;
  tipo: string;
  opciones?: Opcion[];
}

export default function TomarExamenScreen() {
  const { examenId } = useLocalSearchParams();
  const { api } = useAuth();
  const router = useRouter();
  const [examen, setExamen] = useState<any>(null);
  const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
  const [respuestas, setRespuestas] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    cargarExamen();
  }, []);

  const cargarExamen = async () => {
    try {
      const res = await api.get(`/examenes/${examenId}/resolver`);
      if (!res.data?.preguntas) {
        setError("Error al cargar el examen");
        return;
      }
      setExamen(res.data.examen);
      setPreguntas(res.data.preguntas);
    } catch (error) {
      console.error(error);
      setError("Error al cargar el examen");
    } finally {
      setLoading(false);
    }
  };

  const seleccionarOpcion = (preguntaId: number, opcionId: number) => {
    setRespuestas((prev) => ({ ...prev, [preguntaId]: String(opcionId) }));
  };

  const entregar = () => {
    const sinResponder = preguntas.filter((p) => !respuestas[p.id]);
    if (sinResponder.length > 0) {
      Alert.alert(
        "Preguntas sin responder",
        `Faltan ${sinResponder.length} pregunta(s) por contestar. ¿Entregar de todas formas?`,
        [
          { text: "Seguir respondiendo", style: "cancel" },
          { text: "Entregar", onPress: confirmarEntrega },
        ],
      );
    } else {
      confirmarEntrega();
    }
  };

  const confirmarEntrega = async () => {
    setEnviando(true);
    try {
      const respuestasArray = preguntas.map((p) => ({
        pregunta_id: p.id,
        respuesta_valor: respuestas[p.id] || "",
      }));
      await api.post(`/examenes/${examenId}/entregar`, { respuestas: respuestasArray });
      Alert.alert("Examen entregado", "Tus respuestas se han guardado correctamente.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.message || "No se pudo entregar el examen.");
    } finally {
      setEnviando(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#a72a34" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "#a72a34", fontSize: 16, textAlign: "center", marginHorizontal: 20 }}>{error}</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 15 }}>
          <Text style={{ color: "#a72a34", fontWeight: "bold", fontSize: 16 }}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!preguntas) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "#a72a34", fontSize: 16 }}>Error al cargar el examen</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 15 }}>
          <Text style={{ color: "#a72a34", fontWeight: "bold", fontSize: 16 }}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 15 }}>
          <Text style={styles.headerTitle}>{examen?.titulo}</Text>
          <Text style={styles.headerSub}>{preguntas.length} preguntas</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 15 }}>
        {preguntas.map((p, idx) => (
          <View key={p.id} style={styles.preguntaCard}>
            <View style={styles.pregHeader}>
              <Text style={styles.pregNum}>Pregunta {idx + 1}</Text>
              <Text style={styles.pregPts}>{p.puntos} pts</Text>
            </View>
            <Text style={styles.pregText}>{p.texto_pregunta}</Text>

            {p.tipo === "opcion_multiple" && p.opciones ? (
              p.opciones.map((op) => {
                const selected = respuestas[p.id] === String(op.id);
                return (
                  <TouchableOpacity
                    key={op.id}
                    style={[styles.opcion, selected && styles.opcionSelected]}
                    onPress={() => seleccionarOpcion(p.id, op.id)}
                  >
                    <View style={[styles.radio, selected && styles.radioSelected]}>
                      {selected && <View style={styles.radioInner} />}
                    </View>
                    <Text style={[styles.opcionText, selected && { color: "#a72a34", fontWeight: "600" }]}>
                      {op.texto_opcion}
                    </Text>
                  </TouchableOpacity>
                );
              })
            ) : (
              <TextInput
                style={styles.textoInput}
                placeholder="Escribe tu respuesta..."
                value={respuestas[p.id] || ""}
                onChangeText={(text) => setRespuestas((prev) => ({ ...prev, [p.id]: text }))}
                multiline
              />
            )}
          </View>
        ))}

        <TouchableOpacity
          style={[styles.btnEntregar, enviando && { opacity: 0.6 }]}
          onPress={entregar}
          disabled={enviando}
        >
          {enviando ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.btnEntregarText}>Entregar Examen</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f4f4" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    backgroundColor: "#a72a34", padding: 20, paddingTop: 50,
    flexDirection: "row", alignItems: "center",
  },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  headerSub: { fontSize: 13, color: "#fcd34d" },
  preguntaCard: {
    backgroundColor: "#fff", padding: 15, borderRadius: 12, marginBottom: 15, elevation: 2,
  },
  pregHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  pregNum: { fontSize: 13, fontWeight: "600", color: "#a72a34" },
  pregPts: { fontSize: 13, color: "#666" },
  pregText: { fontSize: 16, fontWeight: "500", color: "#333", marginBottom: 12, lineHeight: 22 },
  opcion: {
    flexDirection: "row", alignItems: "center", padding: 12,
    borderRadius: 10, marginBottom: 8, backgroundColor: "#f9f9f9",
  },
  opcionSelected: { backgroundColor: "#fce7e7" },
  radio: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2,
    borderColor: "#ccc", justifyContent: "center", alignItems: "center", marginRight: 12,
  },
  radioSelected: { borderColor: "#a72a34" },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#a72a34" },
  opcionText: { fontSize: 15, color: "#444", flex: 1 },
  textoInput: {
    backgroundColor: "#f9f9f9", borderRadius: 10, padding: 12,
    fontSize: 15, minHeight: 80, textAlignVertical: "top",
  },
  btnEntregar: {
    backgroundColor: "#a72a34", padding: 16, borderRadius: 12,
    alignItems: "center", marginTop: 10, marginBottom: 40,
  },
  btnEntregarText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
});
