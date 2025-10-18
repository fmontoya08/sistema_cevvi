import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
} from "react";
import * as SecureStore from "expo-secure-store";
import axios, { AxiosInstance } from "axios";

// --- ¡MUY IMPORTANTE! ---
// Reemplaza esta IP con la dirección IP de la computadora donde está corriendo tu servidor.
const API_URL = "http://192.168.100.87:3001/api"; // <--- CAMBIA ESTA LÍNEA

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

// Definimos los tipos de datos para que TypeScript nos ayude
type User = {
  id: number;
  email: string;
  nombre: string;
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

// Creamos el contexto con un valor inicial nulo, pero con el tipo correcto
const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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
    try {
      const response = await api.post("/login", { email, password });
      const { token, user: userData } = response.data;

      await SecureStore.setItemAsync("user", JSON.stringify(userData));
      await SecureStore.setItemAsync("token", token);

      setUser(userData);
      return { success: true, user: userData };
    } catch (error: any) {
      const message = error.response?.data?.message || "Error en el servidor";
      console.error("Fallo el login", message);
      return { success: false, error: message };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await SecureStore.deleteItemAsync("user");
      await SecureStore.deleteItemAsync("token");
      setUser(null);
    } catch (e) {
      console.error("Fallo el logout", e);
    }
  }, []);

  const value = { user, loading, login, logout, API_URL, api };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe ser usado dentro de un AuthProvider");
  }
  return context;
};
