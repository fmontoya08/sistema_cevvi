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
      // Ajusta la ruta GET según tu backend
      const res = await api.get(`/alumno/aula-virtual/foro/hilo/${hiloId}`);
      setMensajes(res.data);
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
      // Ajusta la ruta POST según tu backend
      await api.post(`/alumno/aula-virtual/foro/hilo/${hiloId}/respuesta`, {
        contenido: nuevoMensaje,
      });
      setNuevoMensaje("");
      await cargarRespuestas(); // Recargar para ver el nuevo mensaje
      // Hacer scroll al final
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
    const soyYo = item.autor_id === user?.id; // Ajusta lógica si tu ID es numérico o string
    return (
      <View
        style={[styles.msgContainer, soyYo ? styles.msgYo : styles.msgOtro]}
      >
        {!soyYo && <Text style={styles.autorName}>{item.autor_nombre}</Text>}
        <Text style={[styles.msgText, soyYo ? styles.textYo : styles.textOtro]}>
          {item.contenido}
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

      {/* Input de respuesta */}
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
