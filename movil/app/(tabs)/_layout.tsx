import React from "react";
import { Tabs, Redirect } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { View, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function TabsLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#a72a34" />
      </View>
    );
  }

  if (!user) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#a72a34", // Color vino activo
        tabBarInactiveTintColor: "gray",
        headerShown: true,
        headerStyle: { backgroundColor: "#fff" },
        headerTintColor: "#a72a34",
      }}
    >
      {/* 1. Inicio (Tus grupos/calificaciones) */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
          tabBarIcon: ({ color }) => (
            <Ionicons name="home" size={24} color={color} />
          ),
        }}
      />

      {/* 2. Calendario (Nueva pantalla) */}
      <Tabs.Screen
        name="calendario"
        options={{
          title: "Calendario",
          tabBarIcon: ({ color }) => (
            <Ionicons name="calendar" size={24} color={color} />
          ),
        }}
      />

      {/* 3. Perfil (Nueva pantalla) */}
      <Tabs.Screen
        name="perfil"
        options={{
          title: "Mi Perfil",
          tabBarIcon: ({ color }) => (
            <Ionicons name="person" size={24} color={color} />
          ),
        }}
      />

      {/* Ocultamos las pantallas que no queremos en el tab bar pero que existen */}
      <Tabs.Screen name="explore" options={{ href: null }} />
      <Tabs.Screen name="expediente" options={{ href: null }} />
    </Tabs>
  );
}
