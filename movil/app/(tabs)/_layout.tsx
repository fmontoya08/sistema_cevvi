// Archivo: movil/app/(tabs)/_layout.tsx

import React from "react";
import { Redirect, Tabs, useNavigation } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { TouchableOpacity, ActivityIndicator, View } from "react-native";
import { Ionicons } from "@expo/vector-icons"; // <-- Usamos Ionicons directamente

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

  // Oculta si el rol no es alumno o docente
  if (user.rol === "admin" || user.rol === "aspirante") {
    return <Redirect href="/login" />;
  }

  return (
    // ¡Usamos <Tabs>! Esto corrige los errores de layout.
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
        name="index"
        options={{
          title: "Mi Portal",
          // --- MODIFICACIÓN AQUÍ ---
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" color={color} size={size} />
          ),
          // Oculta esta pestaña si no es alumno
          href: user?.rol === "alumno" ? "/" : null,
        }}
      />

      {/* Pestaña del Docente */}
      <Tabs.Screen
        name="explore"
        options={{
          title: "Mis Cursos",
          // --- MODIFICACIÓN AQUÍ ---
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book" color={color} size={size} />
          ),
          // Oculta esta pestaña si no es docente
          href: user?.rol === "docente" ? "/explore" : null,
        }}
      />
    </Tabs>
  );
}
