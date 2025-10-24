// Archivo: movil/app/(tabs)/_layout.tsx

import React from "react";
import { Redirect, Tabs } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { TouchableOpacity, ActivityIndicator, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function TabsLayout() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  // Solo el admin no entra a esta sección
  if (user.rol === "admin") {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerRight: () => (
          <TouchableOpacity onPress={logout} style={{ marginRight: 15 }}>
            <Ionicons name="log-out-outline" size={24} color="red" />
          </TouchableOpacity>
        ),
      }}
    >
      {/* Pestaña del Alumno */}
      <Tabs.Screen
        name="index" // Corresponde a (tabs)/index.tsx
        options={{
          title: "Mi Portal",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" color={color} size={size} />
          ),
          // Usamos href: null para ocultar si no es alumno
          href: user?.rol === "alumno" ? "/" : null,
        }}
      />

      {/* Pestaña del Docente */}
      <Tabs.Screen
        name="explore" // Corresponde a (tabs)/explore.tsx
        options={{
          title: "Mis Cursos",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book" color={color} size={size} />
          ),
          // Usamos href: null para ocultar si no es docente
          href: user?.rol === "docente" ? "/explore" : null,
        }}
      />

      {/* Pestaña del Aspirante */}
      <Tabs.Screen
        name="expediente" // Corresponde a (tabs)/expediente.tsx
        options={{
          title: "Mi Expediente",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="file-tray-full" color={color} size={size} />
          ),
          // Usamos href: null para ocultar si no es aspirante
          href: user?.rol === "aspirante" ? "/expediente" : null,
        }}
      />
    </Tabs>
  );
}
