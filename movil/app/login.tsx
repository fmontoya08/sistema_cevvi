import React, { useState } from "react";
import { StyleSheet, Text, View, TextInput, Button, Alert } from "react-native";
import axios from "axios";

// 💡 ¡Paso importante! Reemplaza 'localhost' con la IP de tu computadora.
const API_URL = "http://192.168.1.100:3001"; // <-- CAMBIA ESTA IP

export default function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Por favor, ingresa tu email y contraseña.");
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/login`, {
        email,
        password,
      });
      console.log("Token:", response.data.token);
      Alert.alert("¡Éxito!", "Has iniciado sesión correctamente.");
      // Aquí guardarías el token de forma segura (AsyncStorage)
    } catch (error) {
      console.error("Error en el login:", error);
      Alert.alert("Error", "Email o contraseña incorrectos.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Iniciar Sesión (Móvil)</Text>
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
        secureTextEntry // Oculta la contraseña
      />
      <Button title="Entrar" onPress={handleLogin} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  input: {
    width: "100%",
    height: 40,
    borderColor: "gray",
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 15,
    paddingHorizontal: 10,
  },
});
