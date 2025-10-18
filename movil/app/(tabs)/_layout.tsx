// Ruta del archivo: sistema_cevvi/movil/app/(tabs)/_layout.tsx
import { Tabs, Redirect } from "expo-router";
import React from "react";
import { Button } from "react-native";
import { TabBarIcon } from "@/components/navigation/TabBarIcon";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useAuth } from "@/context/AuthContext";
import { ActivityIndicator, View } from "react-native";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  const isAlumno = user.rol === "alumno";
  const isDocente = user.rol === "docente";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown: true,
        headerRight: () => (
          <Button onPress={logout} title="Salir" color="#ff3b30" />
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Mi Portal",
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name={focused ? "home" : "home-outline"}
              color={color}
            />
          ),
          href: isAlumno ? "/(tabs)" : null,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Mis Cursos",
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name={focused ? "book" : "book-outline"}
              color={color}
            />
          ),
          href: isDocente ? "/(tabs)/explore" : null,
        }}
      />
    </Tabs>
  );
}
