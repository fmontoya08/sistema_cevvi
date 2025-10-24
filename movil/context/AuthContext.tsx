import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import * as SecureStore from "expo-secure-store";
import axios, { AxiosInstance } from "axios";
// --- 1. IMPORTACIONES PARA NOTIFICACIONES ---
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// --- IP DEL SERVIDOR (Verifica que sea correcta) ---
const API_URL = "http://192.168.3.19:3001/api"; // O la IP actual de tu PC

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- 2. CONFIGURACIÓN DEL HANDLER ---
// Para notificaciones recibidas mientras la app está abierta
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Tipo User
type User = {
  id: number;
  email: string;
  nombre: string;
  apellido_paterno: string;
  rol: "alumno" | "docente" | "admin" | "aspirante";
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; user?: User; error?: string }>;
  logout: () => void;
  API_URL: string;
  api: AxiosInstance;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // --- 3. FUNCIÓN PARA REGISTRAR EL TOKEN PUSH (con logs) ---
  async function registerForPushNotificationsAsync(
    userId: number,
    apiInstance: AxiosInstance
  ): Promise<string | null> {
    console.log("==> Iniciando registro de token push..."); // LOG A
    let token;
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    console.log(`--> Estado de permiso existente: ${existingStatus}`); // LOG B

    if (existingStatus !== "granted") {
      console.log("--> Solicitando permiso..."); // LOG C
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      console.log(`--> Estado de permiso final: ${finalStatus}`); // LOG D
    }

    if (finalStatus !== "granted") {
      console.log("==> Permiso de notificaciones denegado."); // LOG E
      alert("No has habilitado las notificaciones push.");
      return null;
    }

    try {
      console.log("--> Obteniendo token de Expo..."); // LOG F
      token = (await Notifications.getExpoPushTokenAsync()).data;
      console.log("==> Expo Push Token obtenido:", token); // LOG G
    } catch (e) {
      console.error("==> ERROR obteniendo el push token:", e); // LOG H (Error)
      // El error de Firebase aparecerá aquí si google-services.json no está bien
      alert(
        "Hubo un error al obtener el token para notificaciones. Asegúrate de tener conexión y los servicios de Google Play actualizados."
      );
      return null;
    }

    if (Platform.OS === "android") {
      Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      });
    }

    try {
      console.log(`--> Enviando token ${token} al servidor...`); // LOG I
      await apiInstance.post("/register-push-token", { token });
      console.log("==> Token enviado al servidor con éxito."); // LOG J
    } catch (error) {
      console.error("==> ERROR enviando token al servidor:", error); // LOG K (Error)
    }

    return token;
  }
  // --- FIN FUNCIÓN ---

  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = await SecureStore.getItemAsync("token");
        const userData = await SecureStore.getItemAsync("user");
        if (token && userData) {
          setUser(JSON.parse(userData));
        }
      } catch (e) {
        console.error("Fallo al cargar el usuario desde el almacenamiento", e);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    console.log("Intentando login para:", email);
    try {
      const response = await api.post("/login", { email, password });
      const { token, user: userData } = response.data;
      console.log("Login API exitoso:", userData);

      await SecureStore.setItemAsync("user", JSON.stringify(userData));
      await SecureStore.setItemAsync("token", token);

      setUser(userData);

      console.log("Usuario guardado, registrando para notificaciones...");
      // --- 4. LLAMAMOS A LA FUNCIÓN DE REGISTRO ---
      registerForPushNotificationsAsync(userData.id, api).catch((e) => {
        console.error("Error en segundo plano al registrar notificaciones:", e);
      });

      console.log("Login completado en el contexto.");
      return { success: true, user: userData };
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Error desconocido en el servidor";
      console.error("Fallo el login (catch):", message, error.response?.status);
      return { success: false, error: message };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      // --- 5. INTENTAMOS ELIMINAR EL TOKEN PUSH DEL BACKEND ---
      const pushToken = await Notifications.getExpoPushTokenAsync()
        .then((t) => t.data)
        .catch(() => null);
      if (pushToken && user) {
        // Necesitamos 'user' para que 'api' esté autenticada
        try {
          await api.delete("/unregister-push-token", {
            data: { token: pushToken },
          });
          console.log("Token push eliminado del servidor");
        } catch (e) {
          console.error("Error al eliminar token del servidor:", e);
        }
      }
      // --- FIN ELIMINACIÓN ---

      await SecureStore.deleteItemAsync("user");
      await SecureStore.deleteItemAsync("token");
      setUser(null);
    } catch (e) {
      console.error("Fallo el logout", e);
    }
  }, [user]); // 'user' es dependencia

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      API_URL,
      api,
    }),
    [user, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe ser usado dentro de un AuthProvider");
  }
  return context;
};
