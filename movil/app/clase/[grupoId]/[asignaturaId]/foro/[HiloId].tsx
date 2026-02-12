import React, { useEffect, useState, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "../../../../../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";

export default function DetalleHiloScreen() {
  const { hiloId, tituloHilo } = useLocalSearchParams();
  const { api, user } = useAuth();
  const router = useRouter();

  const [mensajes, setMensajes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nuevoMensaje, setNuevoMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const flatListRef = useRef(null);

  useEffect(() => {
    cargarRespuestas();
  }, []);

  const cargarRespuestas = async () => {
    try {
      // CORREGIDO: Ruta directa a /foro/hilo/...
      const res = await api.get(`/foro/hilo/${hiloId}`);

      // TU BACKEND DEVUELVE UN OBJETO { hilo: {...}, respuestas: [...] }
      // Así que asignamos res.data.respuestas
      if (res.data && res.data.respuestas) {
        // Unimos el mensaje original del hilo al principio para que se vea como el primero
        const hiloOriginal = {
          id: "original",
          mensaje: res.data.hilo.mensaje_original,
          creador_nombre: res.data.hilo.creador_nombre,
          creador_apellido: res.data.hilo.creador_apellido,
          fecha_creacion: res.data.hilo.fecha_creacion,
          creado_por_usuario_id: res.data.hilo.creado_por_usuario_id,
        };
        setMensajes([hiloOriginal, ...res.data.respuestas]);
      } else {
        setMensajes([]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const enviarRespuesta = async () => {
    if (!nuevoMensaje.trim()) return;
    setEnviando(true);
    try {
      // CORREGIDO: Ruta correcta /foro/hilo/.../respuestas
      // CORRECCIÓN 2: Tu backend espera "mensaje" en el body
      await api.post(`/foro/hilo/${hiloId}/respuestas`, {
        mensaje: nuevoMensaje,
      });
      setNuevoMensaje("");
      await cargarRespuestas();
      setTimeout(
        () => flatListRef.current?.scrollToEnd({ animated: true }),
        200,
      );
    } catch (error) {
      console.error(error);
    } finally {
      setEnviando(false);
    }
  };

  const renderItem = ({ item }) => {
    const soyYo = item.creado_por_usuario_id === user?.id;
    return (
      <View
        style={[styles.msgContainer, soyYo ? styles.msgYo : styles.msgOtro]}
      >
        {!soyYo && (
          <Text style={styles.autorName}>
            {item.creador_nombre} {item.creador_apellido}
          </Text>
        )}
        <Text style={[styles.msgText, soyYo ? styles.textYo : styles.textOtro]}>
          {item.mensaje}
        </Text>
        <Text style={[styles.msgDate, soyYo ? styles.dateYo : styles.dateOtro]}>
          {item.fecha_creacion ? item.fecha_creacion.split("T")[0] : ""}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {tituloHilo || "Conversación"}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#a72a34"
          style={{ marginTop: 50 }}
        />
      ) : (
        <FlatList
          ref={flatListRef}
          data={mensajes}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 15, paddingBottom: 20 }}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
        />
      )}

      <View style={styles.inputArea}>
        <TextInput
          style={styles.input}
          placeholder="Escribe una respuesta..."
          value={nuevoMensaje}
          onChangeText={setNuevoMensaje}
          multiline
        />
        <TouchableOpacity
          onPress={enviarRespuesta}
          disabled={enviando}
          style={styles.sendButton}
        >
          {enviando ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#e5e5e5" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#fff",
    elevation: 2,
    gap: 10,
  },
  title: { fontSize: 18, fontWeight: "bold", color: "#a72a34", flex: 1 },

  msgContainer: {
    maxWidth: "80%",
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  msgYo: {
    alignSelf: "flex-end",
    backgroundColor: "#a72a34",
    borderBottomRightRadius: 0,
  },
  msgOtro: {
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    borderBottomLeftRadius: 0,
  },

  autorName: {
    fontSize: 11,
    color: "#a72a34",
    fontWeight: "bold",
    marginBottom: 2,
  },
  msgText: { fontSize: 15 },
  textYo: { color: "#fff" },
  textOtro: { color: "#333" },

  msgDate: { fontSize: 10, alignSelf: "flex-end", marginTop: 4 },
  dateYo: { color: "rgba(255,255,255,0.7)" },
  dateOtro: { color: "#999" },

  inputArea: {
    flexDirection: "row",
    padding: 10,
    backgroundColor: "#fff",
    alignItems: "center",
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: "#f0f0f0",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#a72a34",
    justifyContent: "center",
    alignItems: "center",
  },
});
