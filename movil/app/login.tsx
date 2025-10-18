// Ruta del archivo: sistema_cevvi/movil/app/login.tsx
import { useState } from "react";
import {
  View,
  TextInput,
  Button,
  StyleSheet,
  Text,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    setIsLoading(true);
    const result = await login(email, password);
    setIsLoading(false);

    if (result.success) {
      if (result.user.rol === "admin" || result.user.rol === "aspirante") {
        Alert.alert(
          "Acceso Denegado",
          "Esta aplicación es solo para alumnos y docentes."
        );
        return;
      }
      router.replace("/(tabs)");
    } else {
      Alert.alert(
        "Error de Login",
        result.error || "No se pudo iniciar sesión."
      );
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>Iniciar Sesión</ThemedText>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      {isLoading ? (
        <ActivityIndicator size="large" />
      ) : (
        <Button title="Entrar" onPress={handleLogin} />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 16,
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 32,
    color: "#333",
  },
  input: {
    height: 50,
    backgroundColor: "white",
    borderColor: "#ddd",
    borderWidth: 1,
    marginBottom: 16,
    paddingHorizontal: 15,
    borderRadius: 8,
    fontSize: 16,
  },
});
