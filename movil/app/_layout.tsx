// Archivo: movil/app/_layout.tsx

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
import { useColorScheme, ActivityIndicator, View } from "react-native";

// Importa el AuthProvider
import { AuthProvider } from "../context/AuthContext"; // Ajusta la ruta si es necesario

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const [fontsLoaded, fontError] = useFonts({
    // Asegúrate que la ruta a tu fuente sea correcta
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
    if (fontError) {
      console.error("Error cargando fuentes:", fontError);
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Envuelve la navegación con AuthProvider
  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Stack>
          {/* Pantallas principales accesibles */}
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen
            name="detalle-curso"
            options={{ title: "Detalle del Curso", presentation: "modal" }}
          />

          {/* Pantallas opcionales que podrías tener (si no las tienes, puedes quitarlas) */}
          <Stack.Screen name="modal" options={{ presentation: "modal" }} />

          {/* La pantalla +not-found se quita si no tienes el archivo app/+not-found.tsx */}
          {/* <Stack.Screen name="+not-found" /> */}
        </Stack>
      </ThemeProvider>
    </AuthProvider>
  );
}
