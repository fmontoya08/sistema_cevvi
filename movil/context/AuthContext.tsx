// Ruta del archivo: sistema_cevvi/movil/context/AuthContext.tsx
import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
} from "react";
import * as SecureStore from "expo-secure-store";
import axios from "axios";

// --- IMPORTANTE ---
// Reemplaza esta IP con la dirección IP de la computadora donde corre tu servidor.
// No uses 'localhost' o '127.0.0.1' porque el teléfono no podrá encontrarlo.
// Para encontrar tu IP, en Windows usa 'ipconfig' en la terminal. En Mac/Linux usa 'ifconfig'.
const API_URL = "http://192.168.100.87:3001/api";

const api = axios.create({
  baseURL: API_URL,
});

// Interceptor para añadir el token a todas las peticiones
api.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
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
        console.error("Failed to load user from storage", e);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      const response = await api.post("/login", { email, password });
      const { token, user: userData } = response.data;

      await SecureStore.setItemAsync("user", JSON.stringify(userData));
      await SecureStore.setItemAsync("token", token);

      setUser(userData);

      return { success: true, user: userData };
    } catch (error) {
      console.error(
        "Login failed",
        error.response?.data?.message || error.message
      );
      return {
        success: false,
        error: error.response?.data?.message || "Error en el servidor",
      };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await SecureStore.deleteItemAsync("user");
      await SecureStore.deleteItemAsync("token");
      setUser(null);
    } catch (e) {
      console.error("Logout failed", e);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, API_URL, api }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
