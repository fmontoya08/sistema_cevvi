// Ruta del archivo: sistema_cevvi/movil/app/_layout.tsx
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import "react-native-reanimated";
import { AuthProvider, useAuth } from "@/context/AuthContext";

import { useColorScheme } from "@/hooks/useColorScheme";

SplashScreen.preventAutoHideAsync();

function RootLayout() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const colorScheme = useColorScheme();

  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    if (!loaded || loading) return;

    SplashScreen.hideAsync();

    const inTabsGroup = segments[0] === "(tabs)";

    if (!user && inTabsGroup) {
      router.replace("/login");
    } else if (user && !inTabsGroup) {
      if (user.rol === "alumno" || user.rol === "docente") {
        router.replace("/(tabs)");
      } else {
        router.replace("/login");
      }
    }
  }, [loaded, user, loading, segments, router]);

  if (!loaded || loading) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </ThemeProvider>
  );
}

export default function AppLayout() {
  return (
    <AuthProvider>
      <RootLayout />
    </AuthProvider>
  );
}
