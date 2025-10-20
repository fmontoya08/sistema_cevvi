import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import "react-native-reanimated";
import { useColorScheme, ActivityIndicator, View, Text } from "react-native";

// --- PASO 1: Importa el AuthProvider ---
import { AuthProvider } from "../context/AuthContext"; // Ajusta la ruta si es necesario

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayoutNav() {
  // Cambié el nombre para claridad, pero puedes dejar RootLayout
  const colorScheme = useColorScheme();
  const [fontsLoaded, fontError] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      // Hide the splash screen after the fonts have loaded (or an error was returned)
      SplashScreen.hideAsync();
    }
    if (fontError) {
      console.error("Error cargando fuentes:", fontError);
    }
  }, [fontsLoaded, fontError]);

  // Prevent rendering until the font load is complete
  if (!fontsLoaded && !fontError) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // --- PASO 2: Envuelve la navegación con AuthProvider ---
  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: "modal" }} />

          <Stack.Screen
            name="detalle-curso"
            options={{
              title: "Detalle del Curso",
              presentation: "modal",
            }}
          />

          {/* La línea "+not-found" ha sido eliminada */}
        </Stack>
      </ThemeProvider>
    </AuthProvider>
  );
}

// Nota: Si tenías alguna lógica dentro de RootLayout que dependiera de useAuth,
// necesitarás moverla a un componente hijo que esté DENTRO de AuthProvider.
// Pero en este caso, RootLayoutNav solo configura el layout y los providers.
