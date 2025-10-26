import React, {
  useState,
  useEffect,
  createContext,
  useContext,
  useMemo,
  useCallback,
} from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useNavigate,
  useLocation,
  Navigate,
  Outlet,
  useParams,
} from "react-router-dom";
import axios from "axios";
import {
  Home,
  Book,
  Users,
  Group,
  GraduationCap,
  Building,
  LogOut,
  Plus,
  Trash2,
  Edit,
  X,
  ArrowLeft,
  UserPlus,
  Save,
  Upload,
  File as FileIcon,
  Calendar, // <-- NUEVO
  FileText, // <-- NUEVO
  TrendingUp, // <-- NUEVO
  ArrowRightLeft, // <-- NUEVO
  Bell,
  Video, // <-- NUEVO
  Edit2, // <-- NUEVO
  CheckCircle, // <-- NUEVO
  Sparkles, // <-- NUEVO
  UploadCloud, // <-- NUEVO
  Check, // <-- NUEVO
  File, // <-- NUEVO
  Download, // <-- NUEVO
  Award, // <-- NUEVO
  Link as LinkIcon, // <-- NUEVO (con alias para no chocar con <Link> de react-router)
  Paperclip, // <-- NUEVO
} from "lucide-react";

// --- CONFIGURACIÓN DE AXIOS ---
const api = axios.create({
  baseURL: "http://localhost:3001/api",
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor de RESPUESTA (para manejar errores)
api.interceptors.response.use(
  (response) => {
    // Si la respuesta es exitosa, solo la retornamos
    return response;
  },
  (error) => {
    // Si el error es un 401 (No Autorizado) o 403 (Prohibido)
    if (
      error.response &&
      (error.response.status === 401 || error.response.status === 403)
    ) {
      console.warn("Token no válido o sesión expirada. Redirigiendo al login.");

      // Limpiamos el localStorage para forzar el logout
      localStorage.removeItem("user");
      localStorage.removeItem("token");

      // Redirigimos al login
      // Usamos window.location.href para forzar una recarga completa
      // y limpiar el estado de React.
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    // Retornamos el error para que otras partes (como el login) puedan manejarlo
    return Promise.reject(error);
  }
);
// --- FIN DEL NUEVO BLOQUE ---

// --- CONTEXTO DE AUTENTICACIÓN ---
const AuthContext = createContext(null);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        console.error("Error parsing user data from localStorage", error);
        localStorage.clear();
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(
    (userData, token) => {
      localStorage.setItem("user", JSON.stringify(userData));
      localStorage.setItem("token", token);
      setUser(userData);
      if (userData.rol === "admin") {
        navigate("/dashboard");
      } else if (userData.rol === "docente") {
        navigate("/docente/dashboard");
      } else if (userData.rol === "alumno") {
        navigate("/alumno/dashboard");
      } else if (userData.rol === "aspirante") {
        // <-- AÑADE ESTO
        navigate("/aspirante/dashboard");
      } else {
        navigate("/login");
      }
    },
    [navigate]
  );

  const logout = useCallback(() => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setUser(null);
    navigate("/login");
  }, [navigate]);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
    }),
    [user, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

const useAuth = () => {
  return useContext(AuthContext);
};

// ... (después de la función useAuth)

// --- NUEVO COMPONENTE DE NOTIFICACIONES (CORREGIDO) ---
const NotificationBell = () => {
  // 1. CAMBIO AQUÍ: Quitamos 'api' de useAuth()
  const { user } = useAuth();
  const [notificaciones, setNotificaciones] = useState([]);
  const [count, setCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  // Función para cargar notificaciones
  const fetchNotifications = useCallback(async () => {
    // 2. CAMBIO AQUÍ: Quitamos la comprobación de '!api'
    if (!user) return;
    try {
      // 'api' (el global) se usa aquí sin problema
      const { data } = await api.get("/notificaciones/no-leidas");
      setNotificaciones(data.notificaciones || []);
      setCount(data.count || 0);
    } catch (error) {
      console.error("Error al cargar notificaciones", error);
    }
    // 3. CAMBIO AQUÍ: Quitamos 'api' de las dependencias
  }, [user]);

  // Efecto para cargar al inicio y luego cada 60 segundos
  useEffect(() => {
    // 4. CAMBIO AQUÍ: Quitamos la comprobación de 'api'
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 60000); // Refrescar cada 60 seg
      return () => clearInterval(interval);
    }
    // 5. CAMBIO AQUÍ: Quitamos 'api' de las dependencias
  }, [user, fetchNotifications]);

  // Al hacer clic en una notificación
  const handleNotificationClick = async (notif) => {
    try {
      // 'api' (el global) se usa aquí
      await api.put(`/notificaciones/${notif.id}/marcar-leida`);
      fetchNotifications();
      setIsOpen(false);
      if (notif.url_destino) {
        navigate(notif.url_destino);
      }
    } catch (error) {
      console.error("Error al marcar como leída", error);
    }
  };

  // Marcar todas como leídas
  const handleMarkAllAsRead = async (e) => {
    e.stopPropagation();
    try {
      // 'api' (el global) se usa aquí
      await api.put("/notificaciones/marcar-todas-leidas");
      fetchNotifications();
    } catch (error) {
      console.error("Error al marcar todas como leídas", error);
    }
  };

  if (!user) return null; // No mostrar si no está logueado

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative text-gray-600 hover:text-principal"
      >
        <Bell size={24} />
        {count > 0 && (
          <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
            {count}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-80 max-w-sm origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 z-50"
          onMouseLeave={() => setIsOpen(false)} // Cierra al sacar el mouse
        >
          <div className="p-4">
            <div className="flex justify-between items-center">
              <h4 className="text-lg font-semibold text-gray-900">
                Notificaciones
              </h4>
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-principal hover:underline"
                disabled={count === 0}
              >
                Marcar todas como leídas
              </button>
            </div>
          </div>
          <div className="border-t border-gray-200">
            {notificaciones.length > 0 ? (
              <div className="max-h-96 overflow-y-auto">
                {notificaciones.map((notif) => (
                  <button
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className="w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50"
                  >
                    <p className="text-sm text-gray-800">{notif.mensaje}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(notif.fecha_creacion).toLocaleString()}
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-center text-sm text-gray-500 p-6">
                No tienes notificaciones nuevas.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
// --- FIN COMPONENTE NOTIFICACIONES ---

// --- COMPONENTES DE LA INTERFAZ ---

const ProtectedRoute = ({ allowedRoles }) => {
  const { user, loading, logout } = useAuth();
  const location = useLocation();

  // --- INICIA CORRECCIÓN ---
  // Usamos useEffect para manejar efectos secundarios como "logout"
  useEffect(() => {
    // Si no estamos cargando, el usuario existe, PERO su rol no está permitido...
    if (!loading && user && !allowedRoles.includes(user.rol)) {
      // ...entonces llamamos a logout() como un efecto, no durante el render.
      logout();
    }
  }, [user, loading, allowedRoles, logout]); // Dependencias del efecto
  // --- TERMINA CORRECCIÓN ---

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        Cargando...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Si el rol no coincide, el useEffect de arriba se encargará del logout.
  // Mientras tanto, no mostramos nada.
  if (!allowedRoles.includes(user.rol)) {
    return null;
  }

  return <Outlet />;
};

// --- LAYOUTS ---
const AdminLayout = () => {
  const { logout, user } = useAuth();
  const location = useLocation();
  const navItems = [
    { icon: Home, label: "Dashboard", path: "/dashboard" },
    { icon: Users, label: "Usuarios", path: "/usuarios" },

    // --- NUEVA SECCIÓN DE CATÁLOGOS ---
    { icon: Calendar, label: "Ciclos Escolares", path: "/ciclos" },
    { icon: FileText, label: "Planes de Estudio", path: "/planes-estudio" },
    { icon: TrendingUp, label: "Grados/Semestres", path: "/grados" },
    { icon: GraduationCap, label: "Carreras", path: "/carreras" },
    { icon: Building, label: "Sedes", path: "/sedes" },
    // --- FIN DE CATÁLOGOS ---

    { icon: Book, label: "Asignaturas", path: "/asignaturas" },
    { icon: Group, label: "Grupos", path: "/grupos" },
    { icon: ArrowRightLeft, label: "Migrar Grupos", path: "/migrar-grupos" },
  ];

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <aside className="w-64 flex-shrink-0 bg-gray-800 text-white flex flex-col">
        <div className="h-20 flex items-center justify-center border-b border-gray-700">
          <svg
            className="w-auto h-10 text-principal"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5-10-5-10 5z" />
          </svg>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.label}
              to={item.path}
              className={`flex items-center px-4 py-2 rounded-lg transition-colors duration-200 ${
                location.pathname.startsWith(item.path)
                  ? "bg-principal text-white"
                  : "text-gray-300 hover:bg-gray-700 hover:text-white"
              }`}
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-gray-700">
          <button
            onClick={logout}
            className="w-full flex items-center px-4 py-2 rounded-lg text-gray-300 hover:bg-principal hover:text-white transition-colors duration-200"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <header className="bg-white shadow-sm p-4 flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-800">
            Panel de Administrador
          </h1>
          <div className="flex items-center space-x-4">
            <NotificationBell /> {/* <-- AÑADIDO */}
            <span className="text-gray-600">Bienvenido, {user?.nombre}</span>
            <button
              onClick={logout}
              className="text-gray-500 hover:text-principal"
              title="Cerrar Sesión"
            >
              <LogOut size={22} />
            </button>
          </div>
        </header>
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

const DocenteLayout = () => {
  const { logout, user } = useAuth();
  const location = useLocation();
  const navItems = [
    { icon: Home, label: "Mis Cursos", path: "/docente/dashboard" },
  ];
  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <aside className="w-64 flex-shrink-0 bg-gray-800 text-white flex flex-col">
        <div className="h-20 flex items-center justify-center border-b border-gray-700">
          <svg
            className="w-auto h-10 text-principal"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5-10-5-10 5z" />
          </svg>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.label}
              to={item.path}
              className={`flex items-center px-4 py-2 rounded-lg transition-colors duration-200 ${
                location.pathname.startsWith(item.path)
                  ? "bg-principal text-white"
                  : "text-gray-300 hover:bg-gray-700 hover:text-white"
              }`}
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-gray-700">
          <button
            onClick={logout}
            className="w-full flex items-center px-4 py-2 rounded-lg text-gray-300 hover:bg-principal hover:text-white transition-colors duration-200"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Cerrar Sesión
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <header className="bg-white shadow-sm p-4 flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-800">
            Portal Docente
          </h1>
          <div className="flex items-center space-x-4">
            <NotificationBell /> {/* <-- AÑADIDO */}
            <span className="text-gray-600">Bienvenido, {user?.nombre}</span>
            <button
              onClick={logout}
              className="text-gray-500 hover:text-principal"
              title="Cerrar Sesión"
            >
              <LogOut size={22} />
            </button>
          </div>
        </header>
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

const AlumnoLayout = () => {
  const { logout, user } = useAuth();
  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <aside className="w-64 flex-shrink-0 bg-gray-800 text-white flex flex-col">
        <div className="h-20 flex items-center justify-center border-b border-gray-700">
          <svg
            className="w-auto h-10 text-principal"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5-10-5-10 5z" />
          </svg>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          <Link
            to="/alumno/dashboard"
            className="flex items-center px-4 py-2 rounded-lg bg-principal text-white"
          >
            <Home className="w-5 h-5 mr-3" />
            Mi Grupo
          </Link>
        </nav>
        <div className="px-4 py-4 border-t border-gray-700">
          <button
            onClick={logout}
            className="w-full flex items-center px-4 py-2 rounded-lg text-gray-300 hover:bg-principal hover:text-white transition-colors duration-200"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Cerrar Sesión
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <header className="bg-white shadow-sm p-4 flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-800">
            Portal del Alumno
          </h1>
          <div className="flex items-center space-x-4">
            <NotificationBell /> {/* <-- AÑADIDO */}
            <span className="text-gray-600">Bienvenido, {user?.nombre}</span>
            <button
              onClick={logout}
              className="text-gray-500 hover:text-principal"
              title="Cerrar Sesión"
            >
              <LogOut size={22} />
            </button>
          </div>
        </header>
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

const AspiranteLayout = () => {
  const { logout, user } = useAuth();
  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <aside className="w-64 flex-shrink-0 bg-gray-800 text-white flex flex-col">
        <div className="h-20 flex items-center justify-center border-b border-gray-700">
          <svg
            className="w-auto h-10 text-principal"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5-10-5-10 5z" />
          </svg>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          <Link
            to="/aspirante/dashboard"
            className="flex items-center px-4 py-2 rounded-lg bg-principal text-white"
          >
            <FileIcon className="w-5 h-5 mr-3" />
            Mi Expediente
          </Link>
        </nav>
        <div className="px-4 py-4 border-t border-gray-700">
          <button
            onClick={logout}
            className="w-full flex items-center px-4 py-2 rounded-lg text-gray-300 hover:bg-principal hover:text-white transition-colors duration-200"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Cerrar Sesión
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <header className="bg-white shadow-sm p-4 flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-800">
            Portal del Aspirante
          </h1>
          <div className="flex items-center space-x-4">
            <NotificationBell /> {/* <-- AÑADIDO */}
            <span className="text-gray-600">Bienvenido, {user?.nombre}</span>
            <button
              onClick={logout}
              className="text-gray-500 hover:text-principal"
              title="Cerrar Sesión"
            >
              <LogOut size={22} />
            </button>
          </div>
        </header>
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

// --- PÁGINAS ---

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const response = await api.post("/login", { email, password });
      login(response.data.user, response.data.token);
    } catch (err) {
      setError(err.response?.data?.message || "Error al iniciar sesión");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h2 className="text-3xl font-bold text-center text-gray-900">
          Iniciar Sesión
        </h2>
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-principal focus:border-principal"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-principal focus:border-principal"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            className="w-full px-4 py-2 font-semibold text-white bg-principal rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-principal"
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
};

const DashboardPage = () => (
  <div className="bg-white p-6 rounded-lg shadow">
    <h2 className="text-xl font-bold mb-4">Panel de Administración</h2>
    <p>
      Selecciona un módulo en el menú de la izquierda para comenzar a gestionar
      la información de la universidad.
    </p>
  </div>
);

const UsuariosPage = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();

  const fetchUsuarios = useCallback(async () => {
    try {
      const response = await api.get("/admin/usuarios");
      setUsuarios(response.data);
    } catch (error) {
      console.error("Error al obtener usuarios", error);
    }
  }, []);

  useEffect(() => {
    fetchUsuarios();
  }, [fetchUsuarios]);

  const handleDelete = async (id) => {
    if (
      window.confirm(
        "¿Estás seguro de que quieres eliminar este usuario? Esta acción es irreversible."
      )
    ) {
      try {
        await api.delete(`/admin/usuarios/${id}`);
        fetchUsuarios();
      } catch (error) {
        console.error("Error al eliminar usuario", error);
        alert("Error al eliminar el usuario.");
      }
    }
  };

  const openModal = (user = null) => {
    setCurrentUser(user);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setCurrentUser(null);
  };

  const handleRowClick = (user) => {
    if (user.rol === "aspirante") {
      navigate(`/usuarios/aspirante/${user.id}`);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">
          Gestión de Usuarios
        </h2>
        <button
          onClick={() => openModal()}
          className="flex items-center px-4 py-2 font-semibold text-white bg-principal rounded-md hover:opacity-90"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nuevo Usuario
        </button>
      </div>
      {/* Añadimos 'overflow-x-auto' al contenedor */}
      <div className="bg-white p-6 rounded-lg shadow overflow-x-auto">
        {/* Añadimos 'text-sm' para hacer la fuente un poco más pequeña */}
        <table className="w-full table-auto text-sm">
          <thead className="text-left bg-gray-50">
            <tr>
              <th className="px-4 py-2">Nombre Completo</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Rol</th>
              <th className="px-4 py-2">Matrícula</th>
              {/* --- NUEVAS CABECERAS --- */}
              <th className="px-4 py-2">Teléfono</th>
              <th className="px-4 py-2">CURP</th>
              <th className="px-4 py-2">Género</th>
              {/* --- FIN NUEVAS CABECERAS --- */}
              <th className="px-4 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((user) => (
              <tr
                key={user.id}
                className={`border-b ${
                  user.rol === "aspirante"
                    ? "cursor-pointer hover:bg-gray-50"
                    : ""
                }`}
                onClick={() => handleRowClick(user)}
              >
                <td className="px-4 py-2">{`${user.nombre} ${
                  user.apellido_paterno
                } ${user.apellido_materno || ""}`}</td>
                <td className="px-4 py-2">{user.email}</td>
                <td className="px-4 py-2 capitalize">{user.rol}</td>
                <td className="px-4 py-2">{user.matricula || "N/A"}</td>
                {/* --- NUEVAS CELDAS --- */}
                <td className="px-4 py-2">{user.telefono || "N/A"}</td>
                <td className="px-4 py-2">{user.curp || "N/A"}</td>
                <td className="px-4 py-2">{user.genero || "N/A"}</td>
                {/* --- FIN NUEVAS CELDAS --- */}

                <td className="px-4 py-2 flex items-center space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openModal(user);
                    }}
                    className="text-secundario hover:text-principal"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(user.id);
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modalOpen && (
        <UsuarioModal
          usuario={currentUser}
          onClose={closeModal}
          onSave={fetchUsuarios}
        />
      )}
    </div>
  );
};

const UsuarioModal = ({ usuario, onClose, onSave }) => {
  const isEditing = !!usuario;
  const [formData, setFormData] = useState({
    nombre: usuario?.nombre || "",
    apellido_paterno: usuario?.apellido_paterno || "",
    apellido_materno: usuario?.apellido_materno || "",
    email: usuario?.email || "",
    password: "",
    rol: usuario?.rol || "aspirante",
    genero: usuario?.genero || "",
    telefono: usuario?.telefono || "",
    curp: usuario?.curp || "",
    matricula: usuario?.matricula || "",
    fecha_nacimiento: usuario?.fecha_nacimiento || "",
  });

  const [formErrors, setFormErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "curp") {
      setFormData((prev) => ({ ...prev, [name]: value.toUpperCase() }));
      // Limpia el error de CURP si el usuario está corrigiendo
      if (formErrors.curp) {
        setFormErrors((prev) => ({ ...prev, curp: null }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const validateCurp = (curp) => {
    if (!curp || curp.length === 0) return true; // Permite CURP vacía (opcional)
    const curpRegex =
      /^[A-Z]{1}[AEIOU]{1}[A-Z]{2}[0-9]{2}(0[1-9]|1[0-2])(0[1-9]|1[0-9]|2[0-9]|3[0-1])[HM]{1}(AS|BC|BS|CC|CS|CH|CL|CM|DF|DG|GT|GR|HG|JC|MC|MN|MS|NT|NL|OC|PL|QT|QR|SP|SL|SR|TC|TS|TL|VZ|YN|ZS|NE)[B-DF-HJ-NP-TV-Z]{3}[A-Z0-9]{1}[0-9]{1}$/;
    return curpRegex.test(curp);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});
    if (!validateCurp(formData.curp)) {
      setFormErrors({ curp: "El formato de la CURP no es válido." });
      return; // Detiene el envío
    }
    try {
      if (isEditing) {
        const dataToSend = { ...formData };
        if (!dataToSend.password) {
          delete dataToSend.password;
        }
        await api.put(`/admin/usuarios/${usuario.id}`, dataToSend);
      } else {
        await api.post("/admin/usuarios", formData);
      }
      onSave();
      onClose();
    } catch (error) {
      console.error("Error al guardar usuario", error);
      alert(
        "Error al guardar: " +
          (error.response?.data?.message || "Error desconocido")
      );
      setFormErrors({
        submit: error.response?.data?.message || "Error desconocido",
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
        >
          <X size={24} />
        </button>
        <h3 className="text-2xl font-bold mb-6">
          {isEditing ? "Editar" : "Nuevo"} Usuario
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              placeholder="Nombre(s)"
              required
              className="w-full px-3 py-2 border rounded-md"
            />
            <input
              type="text"
              name="apellido_paterno"
              value={formData.apellido_paterno}
              onChange={handleChange}
              placeholder="Apellido Paterno"
              required
              className="w-full px-3 py-2 border rounded-md"
            />
            <input
              type="text"
              name="apellido_materno"
              value={formData.apellido_materno}
              onChange={handleChange}
              placeholder="Apellido Materno"
              className="w-full px-3 py-2 border rounded-md"
            />
            <input
              type="text"
              name="telefono"
              value={formData.telefono}
              onChange={handleChange}
              placeholder="Teléfono"
              className="w-full px-3 py-2 border rounded-md"
            />
            <input
              type="text"
              name="curp"
              value={formData.curp}
              onChange={handleChange}
              placeholder="CURP"
              // --- CAMBIOS AQUÍ ---
              maxLength="18"
              className={`w-full px-3 py-2 border rounded-md ${
                formErrors.curp ? "border-red-500" : "border-gray-300"
              }`}
              // Agrega validación nativa del navegador
              pattern="[A-Z]{1}[AEIOU]{1}[A-Z]{2}[0-9]{2}(0[1-9]|1[0-2])(0[1-9]|1[0-9]|2[0-9]|3[0-1])[HM]{1}(AS|BC|BS|CC|CS|CH|CL|CM|DF|DG|GT|GR|HG|JC|MC|MN|MS|NT|NL|OC|PL|QT|QR|SP|SL|SR|TC|TS|TL|VZ|YN|ZS|NE)[B-DF-HJ-NP-TV-Z]{3}[A-Z0-9]{1}[0-9]{1}"
              title="Ingresa una CURP válida de 18 caracteres en mayúsculas."
            />
            {/* --- CAMPO MATRÍCULA (AHORA READ-ONLY) --- */}
            {isEditing && (
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Matrícula (generada automáticamente)
                </label>
                <input
                  type="text"
                  name="matricula"
                  value={formData.matricula}
                  readOnly // <-- Importante: solo lectura
                  className="w-full px-3 py-2 border rounded-md bg-gray-100 cursor-not-allowed" // <-- Estilo de deshabilitado
                />
              </div>
            )}
            {/* --- FIN --- */}

            <div>
              <label className="text-sm text-gray-500">
                Fecha de Nacimiento
              </label>
              <input
                type="date"
                name="fecha_nacimiento"
                value={formData.fecha_nacimiento}
                onChange={handleChange}
                placeholder="Fecha de Nacimiento"
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <select
              name="genero"
              value={formData.genero}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="">-- Seleccione Género --</option>
              <option value="Femenino">Femenino</option>
              <option value="Masculino">Masculino</option>
              <option value="Otro">Otro</option>
            </select>
            {/* --- FIN DE CAMPOS NUEVOS --- */}
          </div>
          {/* --- NUEVO: MUESTRA EL ERROR DE CURP --- */}
          {formErrors.curp && (
            <p className="text-red-600 text-sm">{formErrors.curp}</p>
          )}
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Correo Electrónico"
            required
            className="w-full px-3 py-2 border rounded-md"
          />
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder={
              isEditing ? "Nueva contraseña (opcional)" : "Contraseña"
            }
            required={!isEditing}
            className="w-full px-3 py-2 border rounded-md"
          />
          <select
            name="rol"
            value={formData.rol}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-md"
          >
            <option value="aspirante">Aspirante</option>
            <option value="alumno">Alumno</option>
            <option value="docente">Docente</option>
            <option value="admin">Administrador</option>
          </select>
          <div className="flex justify-end space-x-4 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-principal text-white rounded-md hover:opacity-90"
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AsignaturasPage = () => {
  const [asignaturas, setAsignaturas] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentAsignatura, setCurrentAsignatura] = useState(null);

  const fetchAsignaturas = useCallback(async () => {
    try {
      const response = await api.get("/admin/asignaturas");
      setAsignaturas(response.data);
    } catch (error) {
      console.error("Error al obtener asignaturas", error);
    }
  }, []);

  useEffect(() => {
    fetchAsignaturas();
  }, [fetchAsignaturas]);

  const handleDelete = async (id) => {
    if (
      window.confirm("¿Estás seguro de que quieres eliminar esta asignatura?")
    ) {
      try {
        await api.delete(`/admin/asignaturas/${id}`);
        fetchAsignaturas();
      } catch (error) {
        console.error("Error al eliminar asignatura", error);
      }
    }
  };

  const openModal = (asignatura = null) => {
    setCurrentAsignatura(asignatura);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setCurrentAsignatura(null);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">
          Gestión de Asignaturas
        </h2>
        <button
          onClick={() => openModal()}
          className="flex items-center px-4 py-2 font-semibold text-white bg-principal rounded-md hover:opacity-90"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nueva Asignatura
        </button>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <table className="w-full table-auto">
          <thead className="text-left bg-gray-50">
            <tr>
              <th className="px-4 py-2">Nombre</th>
              <th className="px-4 py-2">Clave</th>
              {/* --- NUEVAS COLUMNAS --- */}
              <th className="px-4 py-2">Plan de Estudios</th>
              <th className="px-4 py-2">Grado</th>
              {/* --- FIN --- */}
              <th className="px-4 py-2">Créditos</th>
              <th className="px-4 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {asignaturas.map((asig) => (
              <tr key={asig.id} className="border-b">
                <td className="px-4 py-2">{asig.nombre_asignatura}</td>
                <td className="px-4 py-2">{asig.clave_asignatura}</td>
                {/* --- NUEVAS CELDAS --- */}
                <td className="px-4 py-2">{asig.nombre_plan || "N/A"}</td>
                <td className="px-4 py-2">{asig.nombre_grado || "N/A"}</td>
                {/* --- FIN --- */}
                <td className="px-4 py-2">{asig.creditos}</td>
                <td className="px-4 py-2 flex items-center space-x-2">
                  <button
                    onClick={() => openModal(asig)}
                    className="text-secundario hover:text-principal"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(asig.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <AsignaturaModal
          asignatura={currentAsignatura}
          onClose={closeModal}
          onSave={fetchAsignaturas}
        />
      )}
    </div>
  );
};

const AsignaturaModal = ({ asignatura, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    nombre_asignatura: asignatura?.nombre_asignatura || "",
    clave_asignatura: asignatura?.clave_asignatura || "",
    creditos: asignatura?.creditos || "",
    plan_estudio_id: asignatura?.plan_estudio_id || "", // <-- CAMBIO
    tipo_asignatura_id: asignatura?.tipo_asignatura_id || 1,
    grado_id: asignatura?.grado_id || "", // <-- CAMBIO
  });

  const [catalogos, setCatalogos] = useState({ planes: [], grados: [] });
  // --- AGREGA ESTE useEffect ---
  useEffect(() => {
    const fetchCatalogos = async () => {
      try {
        const [planesRes, gradosRes] = await Promise.all([
          api.get("/admin/planes_estudio"),
          api.get("/admin/grados"),
        ]);
        setCatalogos({
          planes: planesRes.data,
          grados: gradosRes.data,
        });
        // Si es una asignatura nueva, pre-selecciona el primer valor
        if (!asignatura) {
          setFormData((prev) => ({
            ...prev,
            plan_estudio_id: planesRes.data[0]?.id || "",
            grado_id: gradosRes.data[0]?.id || "",
          }));
        }
      } catch (error) {
        console.error("Error cargando catálogos para asignaturas", error);
      }
    };
    fetchCatalogos();
  }, [asignatura]); // Depende de 'asignatura' para resetear si cambia

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (asignatura) {
        await api.put(`/admin/asignaturas/${asignatura.id}`, formData);
      } else {
        await api.post("/admin/asignaturas", formData);
      }
      onSave();
      onClose();
    } catch (error) {
      console.error("Error al guardar asignatura", error);
      alert(
        "Error al guardar: " +
          (error.response?.data?.message || "Error desconocido")
      );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
        >
          <X size={24} />
        </button>
        <h3 className="text-2xl font-bold mb-6">
          {asignatura ? "Editar" : "Nueva"} Asignatura
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            name="nombre_asignatura"
            value={formData.nombre_asignatura}
            onChange={handleChange}
            placeholder="Nombre de la Asignatura"
            required
            className="w-full px-3 py-2 border rounded-md focus:ring-principal focus:border-principal"
          />
          <input
            type="text"
            name="clave_asignatura"
            value={formData.clave_asignatura}
            onChange={handleChange}
            placeholder="Clave de Asignatura"
            required
            className="w-full px-3 py-2 border rounded-md focus:ring-principal focus:border-principal"
          />
          <input
            type="number"
            name="creditos"
            value={formData.creditos}
            onChange={handleChange}
            placeholder="Créditos"
            required
            className="w-full px-3 py-2 border rounded-md focus:ring-principal focus:border-principal"
          />
          {/* --- AGREGA ESTOS 2 BLOQUES --- */}
          <div>
            <label className="text-sm font-medium text-gray-700">
              Plan de Estudios
            </label>
            <select
              name="plan_estudio_id"
              value={formData.plan_estudio_id}
              onChange={handleChange}
              className="w-full px-3 py-2 mt-1 border rounded-md"
            >
              {catalogos.planes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre_plan}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Grado</label>
            <select
              name="grado_id"
              value={formData.grado_id}
              onChange={handleChange}
              className="w-full px-3 py-2 mt-1 border rounded-md"
            >
              {catalogos.grados.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nombre_grado}
                </option>
              ))}
            </select>
          </div>
          {/* --- FIN DE BLOQUES AGREGADOS --- */}
          <div className="flex justify-end space-x-4 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-principal text-white rounded-md hover:opacity-90"
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const GruposPage = () => {
  const [grupos, setGrupos] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentGrupo, setCurrentGrupo] = useState(null);

  const fetchGrupos = useCallback(async () => {
    try {
      const response = await api.get("/admin/grupos");
      setGrupos(response.data);
    } catch (error) {
      console.error("Error al obtener grupos", error);
    }
  }, []);

  useEffect(() => {
    fetchGrupos();
  }, [fetchGrupos]);

  const handleDelete = async (id) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar este grupo?")) {
      try {
        await api.delete(`/admin/grupos/${id}`);
        fetchGrupos();
      } catch (error) {
        console.error("Error al eliminar grupo", error);
      }
    }
  };

  const openModal = (grupo = null) => {
    setCurrentGrupo(grupo);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setCurrentGrupo(null);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">Gestión de Grupos</h2>
        <button
          onClick={() => openModal()}
          className="flex items-center px-4 py-2 font-semibold text-white bg-principal rounded-md hover:opacity-90"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nuevo Grupo
        </button>
      </div>
      <div className="bg-white p-6 rounded-lg shadow">
        <table className="w-full table-auto">
          <thead className="text-left bg-gray-50">
            <tr>
              <th className="px-4 py-2">Grupo</th>
              <th className="px-4 py-2">Cupo</th>
              <th className="px-4 py-2">Ciclo</th>
              <th className="px-4 py-2">Sede</th>
              <th className="px-4 py-2">Plan de Estudios</th>
              <th className="px-4 py-2">Grado</th>
              {/* ASEGÚRATE DE QUE ESTÉN ASÍ, JUNTAS: */}
              <th className="px-4 py-2">Modalidad</th>
              <th className="px-4 py-2">Estatus</th>
              <th className="px-4 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {grupos.map((g) => (
              <tr key={g.id} className="border-b">
                <td className="px-4 py-2">
                  <Link
                    to={`/grupos/${g.id}`}
                    className="text-principal hover:underline"
                  >
                    {g.nombre_grupo}
                  </Link>
                </td>
                <td className="px-4 py-2">{g.cupo}</td>
                <td className="px-4 py-2">{g.nombre_ciclo}</td>
                <td className="px-4 py-2">{g.nombre_sede}</td>
                <td className="px-4 py-2">{g.nombre_plan}</td>
                <td className="px-4 py-2">{g.nombre_grado}</td>
                {/* --- NUEVA CELDA CON INDICADOR VISUAL --- */}
                <td className="px-4 py-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      g.modalidad === "presencial"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-purple-100 text-purple-800"
                    }`}
                  >
                    {g.modalidad === "presencial" ? "Presencial" : "Virtual"}
                  </span>
                </td>
                {/* --- FIN NUEVA CELDA --- */}
                {/* --- INSERTA ESTE BLOQUE NUEVO AQUÍ --- */}
                <td className="px-4 py-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      g.estatus === "activo"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {g.estatus === "activo" ? "Activo" : "Inactivo"}
                  </span>
                </td>
                {/* --- FIN DEL BLOQUE NUEVO --- */}
                <td className="px-4 py-2 flex items-center space-x-2">
                  <button
                    onClick={() => openModal(g)}
                    className="text-secundario hover:text-principal"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(g.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modalOpen && (
        <GrupoModal
          grupo={currentGrupo}
          onClose={closeModal}
          onSave={fetchGrupos}
        />
      )}
    </div>
  );
};

const GrupoModal = ({ grupo, onClose, onSave }) => {
  const isEditing = !!grupo;
  const [formData, setFormData] = useState({
    nombre_grupo: grupo?.nombre_grupo || "",
    cupo: grupo?.cupo || "",
    ciclo_id: grupo?.ciclo_id || "",
    sede_id: grupo?.sede_id || "",
    plan_estudio_id: grupo?.plan_estudio_id || "",
    grado_id: grupo?.grado_id || "",
    estatus: grupo?.estatus || "activo", // <-- Agregado (default 'activo')
    modalidad: grupo?.modalidad || "presencial", // <-- Agregado
  });

  const [catalogos, setCatalogos] = useState({
    ciclos: [],
    sedes: [],
    planes: [],
    grados: [],
  });

  useEffect(() => {
    const fetchCatalogos = async () => {
      try {
        const [ciclosRes, sedesRes, planesRes, gradosRes] = await Promise.all([
          api.get("/admin/ciclos"),
          api.get("/admin/sedes"),
          api.get("/admin/planes_estudio"),
          api.get("/admin/grados"),
        ]);
        setCatalogos({
          ciclos: ciclosRes.data,
          sedes: sedesRes.data,
          planes: planesRes.data,
          grados: gradosRes.data,
        });
        if (!isEditing) {
          setFormData((prev) => ({
            ...prev,
            ciclo_id: ciclosRes.data[0]?.id || "",
            sede_id: sedesRes.data[0]?.id || "",
            plan_estudio_id: planesRes.data[0]?.id || "",
            grado_id: gradosRes.data[0]?.id || "",
          }));
        }
      } catch (error) {
        console.error("Error cargando catálogos para grupos", error);
      }
    };
    fetchCatalogos();
  }, [isEditing]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await api.put(`/admin/grupos/${grupo.id}`, formData);
      } else {
        await api.post("/admin/grupos", formData);
      }
      onSave();
      onClose();
    } catch (error) {
      console.error("Error al guardar el grupo", error);
      alert(
        "Error al guardar: " +
          (error.response?.data?.message || "Error desconocido")
      );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
        >
          <X size={24} />
        </button>
        <h3 className="text-2xl font-bold mb-6">
          {isEditing ? "Editar" : "Nuevo"} Grupo
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            name="nombre_grupo"
            value={formData.nombre_grupo}
            onChange={handleChange}
            placeholder="Nombre del Grupo (ej. A, B)"
            required
            className="w-full px-3 py-2 border rounded-md"
          />
          <input
            type="number"
            name="cupo"
            value={formData.cupo}
            onChange={handleChange}
            placeholder="Cupo"
            required
            className="w-full px-3 py-2 border rounded-md"
          />

          <select
            name="ciclo_id"
            value={formData.ciclo_id}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-md"
          >
            {catalogos.ciclos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre_ciclo}
              </option>
            ))}
          </select>
          <select
            name="sede_id"
            value={formData.sede_id}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-md"
          >
            {catalogos.sedes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre_sede}
              </option>
            ))}
          </select>
          <select
            name="plan_estudio_id"
            value={formData.plan_estudio_id}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-md"
          >
            {catalogos.planes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre_plan}
              </option>
            ))}
          </select>
          <select
            name="grado_id"
            value={formData.grado_id}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-md"
          >
            {catalogos.grados.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nombre_grado}
              </option>
            ))}
          </select>

          {/* --- INSERTA ESTE BLOQUE NUEVO AQUÍ --- */}
          <div>
            <label className="text-sm font-medium text-gray-700">
              Estatus del Grupo
            </label>
            <select
              name="estatus"
              value={formData.estatus}
              onChange={handleChange}
              className="w-full px-3 py-2 mt-1 border rounded-md"
            >
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>
          {/* --- FIN DEL BLOQUE NUEVO --- */}
          {/* --- CAMPO NUEVO --- */}
          <div>
            <label className="text-sm font-medium text-gray-700">
              Modalidad
            </label>
            <select
              name="modalidad"
              value={formData.modalidad}
              onChange={handleChange}
              className="w-full px-3 py-2 mt-1 border rounded-md"
            >
              <option value="presencial">Presencial</option>
              <option value="virtual">Virtual</option>
            </select>
          </div>
          {/* --- FIN CAMPO NUEVO --- */}

          <div className="flex justify-end space-x-4 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-principal text-white rounded-md hover:opacity-90"
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const DetalleGrupoPage = () => {
  const { id } = useParams();
  const [grupo, setGrupo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [asignarDocenteModal, setAsignarDocenteModal] = useState({
    open: false,
    asignatura: null,
  });
  const [inscribirAlumnoModal, setInscribirAlumnoModal] = useState(false);
  const [transferModal, setTransferModal] = useState({
    open: false,
    alumno: null,
  });

  const fetchDetalles = useCallback(async () => {
    try {
      const { data } = await api.get(`/admin/grupos/${id}`);
      setGrupo(data);
    } catch (error) {
      console.error("Error al cargar detalles del grupo", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetalles();
  }, [fetchDetalles]);

  const handleOpenAsignarModal = (asignatura) => {
    setAsignarDocenteModal({ open: true, asignatura: asignatura });
  };

  const handleCloseAsignarModal = () => {
    setAsignarDocenteModal({ open: false, asignatura: null });
  };

  const handleBajaAlumno = async (alumnoId) => {
    if (
      window.confirm("¿Estás seguro de dar de baja a este alumno del grupo?")
    ) {
      try {
        await api.delete(`/admin/grupos/${id}/dar-baja/${alumnoId}`);
        fetchDetalles();
      } catch (error) {
        console.error("Error al dar de baja al alumno", error);
        alert("No se pudo dar de baja al alumno.");
      }
    }
  };

  if (loading) return <div>Cargando...</div>;
  if (!grupo) return <div>Grupo no encontrado.</div>;

  return (
    <div>
      <Link
        to="/grupos"
        className="flex items-center text-principal mb-6 hover:underline"
      >
        <ArrowLeft size={18} className="mr-2" />
        Volver a Grupos
      </Link>
      <h2 className="text-3xl font-bold text-gray-800 mb-4">
        Detalle del Grupo: {grupo.nombre_grupo}
      </h2>
      {/* --- INSERTA ESTE BLOQUE NUEVO AQUÍ --- */}
      <span
        className={`px-3 py-1 rounded-full text-sm font-semibold mb-6 inline-block ${
          grupo.estatus === "activo"
            ? "bg-green-100 text-green-800"
            : "bg-red-100 text-red-800"
        }`}
      >
        Estatus: {grupo.estatus === "activo" ? "Activo" : "Inactivo"}
      </span>
      {/* --- FIN DEL BLOQUE NUEVO --- */}
      {/* --- NUEVO INDICADOR DE MODALIDAD --- */}
      <span
        className={`px-3 py-1 rounded-full text-sm font-semibold mb-6 inline-block ml-2 ${
          grupo.modalidad === "presencial"
            ? "bg-blue-100 text-blue-800"
            : "bg-purple-100 text-purple-800"
        }`}
      >
        {grupo.modalidad === "presencial" ? "Presencial" : "Virtual"}
      </span>
      {/* --- FIN --- */}

      <div className="bg-white p-6 rounded-lg shadow mt-6">
        <h3 className="text-xl font-bold mb-4">Asignaturas y Docentes</h3>
        <Link
          to="/asignaturas"
          className="flex items-center px-4 py-2 text-sm font-semibold text-white bg-secundario rounded-md hover:opacity-90"
          title="Ir a gestionar el catálogo de asignaturas"
        >
          <Edit size={16} className="mr-2" />
          Gestionar Asignaturas
        </Link>
        {/* --- MEJORA 1: Lógica condicional --- */}
        {grupo.asignaturas.length === 0 ? (
          <div className="text-center py-8 px-4 bg-gray-50 rounded-md border border-gray-200">
            <Book size={40} className="mx-auto text-gray-400" />
            <h4 className="font-semibold text-lg mt-3">
              No hay asignaturas para este grupo
            </h4>
            <p className="text-gray-600 mt-1 max-w-lg mx-auto">
              Para asignar docentes, primero deben existir asignaturas
              vinculadas al Plan de Estudios (
              <span className="font-semibold">{grupo.nombre_plan}</span>) y al
              Grado (<span className="font-semibold">{grupo.nombre_grado}</span>
              ) de este grupo.
            </p>
            <p className="text-gray-600 mt-3">
              Por favor, ve a <strong>"Gestionar Asignaturas"</strong> (botón
              arriba) y crea las materias correspondientes.
            </p>
          </div>
        ) : (
          <table className="w-full table-auto">
            <thead className="text-left bg-gray-50">
              <tr>
                <th className="px-4 py-2">Asignatura</th>
                {/* <th className="px-4 py-2">Clave</th> */}
                <th className="px-4 py-2">Docente Asignado</th>
                <th className="px-4 py-2">Estatus</th>
                <th className="px-4 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {grupo.asignaturas.map((asig) => (
                <tr key={asig.id} className="border-b">
                  {/* --- MODIFICAR ESTA CELDA --- */}
                  <td className="px-4 py-2">
                    <Link
                      to={`/admin/grupo/${id}/asignatura/${asig.id}`}
                      className="text-principal font-semibold hover:underline"
                      title="Calificar este curso"
                    >
                      {asig.nombre_asignatura}
                    </Link>
                  </td>
                  {/* --- FIN MODIFICACIÓN --- */}
                  <td className="px-4 py-2">
                    {asig.docente_id ? (
                      `${asig.docente_nombre} ${asig.docente_apellido}`
                    ) : (
                      <span className="text-gray-500">Sin asignar</span>
                    )}
                  </td>
                  {/* --- AÑADIR ESTA CELDA --- */}
                  <td className="px-4 py-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        asig.total_alumnos_grupo > 0 &&
                        asig.total_calificaciones >= asig.total_alumnos_grupo
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {asig.total_alumnos_grupo > 0 &&
                      asig.total_calificaciones >= asig.total_alumnos_grupo
                        ? "Completado"
                        : "Pendiente"}
                    </span>
                  </td>
                  {/* --- FIN --- */}
                  <td className="px-4 py-2">
                    <button
                      onClick={() => handleOpenAsignarModal(asig)}
                      className="text-principal hover:underline disabled:text-gray-400 disabled:no-underline"
                      disabled={grupo.estatus === "inactivo"}
                    >
                      {asig.docente_id ? "Cambiar Docente" : "Asignar Docente"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {/* --- Fin de la lógica condicional --- */}
      </div>

      <div className="bg-white p-6 rounded-lg shadow mt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">
            Alumnos Inscritos ({grupo.alumnos.length} / {grupo.cupo})
          </h3>
          <button
            onClick={() => setInscribirAlumnoModal(true)}
            className="flex items-center px-4 py-2 font-semibold text-white bg-principal rounded-md hover:opacity-90 disabled:bg-gray-400"
            disabled={grupo.estatus === "inactivo"} // <-- AÑADE ESTO
            title={
              grupo.estatus === "inactivo" ? "Este grupo está cerrado" : ""
            } // <-- (Opcional pero útil)
          >
            <UserPlus className="w-5 h-5 mr-2" />
            Inscribir Alumno
          </button>
        </div>
        <table className="w-full table-auto">
          <thead className="text-left bg-gray-50">
            <tr>
              <th className="px-4 py-2">Nombre</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {grupo.alumnos.map((alumno) => (
              <tr key={alumno.id} className="border-b">
                <td className="px-4 py-2">{`${alumno.nombre} ${
                  alumno.apellido_paterno
                } ${alumno.apellido_materno || ""}`}</td>
                <td className="px-4 py-2">{alumno.email}</td>
                <td className="px-4 py-2 flex items-center space-x-2">
                  {/* --- AÑADIR ESTE BOTÓN --- */}
                  <button
                    onClick={() =>
                      setTransferModal({ open: true, alumno: alumno })
                    }
                    className="text-secundario hover:underline disabled:text-gray-400 disabled:no-underline"
                    disabled={grupo.estatus === "inactivo"}
                  >
                    Transferir
                  </button>
                  {/* --- FIN DE BOTÓN AÑADIDO --- */}

                  <button
                    onClick={() => handleBajaAlumno(alumno.id)}
                    className="text-red-500 hover:underline disabled:text-gray-400 disabled:no-underline"
                    disabled={grupo.estatus === "inactivo"}
                  >
                    Dar de Baja
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {asignarDocenteModal.open && (
        <AsignarDocenteModal
          grupoId={id}
          asignatura={asignarDocenteModal.asignatura}
          onClose={handleCloseAsignarModal}
          onSave={fetchDetalles}
        />
      )}
      {inscribirAlumnoModal && (
        <InscribirAlumnoModal
          grupoId={id}
          onClose={() => setInscribirAlumnoModal(false)}
          onSave={fetchDetalles}
        />
      )}
      <TransferirAlumnoModal
        show={transferModal.open}
        onClose={() => setTransferModal({ open: false, alumno: null })}
        alumno={transferModal.alumno}
        currentGroupId={parseInt(id)}
        onSave={fetchDetalles}
      />
    </div>
  );
};

const AsignarDocenteModal = ({ grupoId, asignatura, onClose, onSave }) => {
  const [docentes, setDocentes] = useState([]);
  const [selectedDocente, setSelectedDocente] = useState(
    asignatura.docente_id || ""
  );

  useEffect(() => {
    const fetchDocentes = async () => {
      try {
        const { data } = await api.get("/admin/docentes");
        setDocentes(data);
        if (!asignatura.docente_id && data.length > 0) {
          setSelectedDocente(data[0].id);
        }
      } catch (error) {
        console.error("Error al obtener docentes", error);
      }
    };
    fetchDocentes();
  }, [asignatura.docente_id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/admin/grupos/${grupoId}/asignar-docente`, {
        asignatura_id: asignatura.id,
        docente_id: selectedDocente,
      });
      onSave();
      onClose();
    } catch (error) {
      console.error("Error al asignar docente", error);
      alert(
        "Error al asignar: " +
          (error.response?.data?.message || "Error desconocido")
      );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
        >
          <X size={24} />
        </button>
        <h3 className="text-2xl font-bold mb-2">Asignar Docente</h3>
        <p className="mb-6 text-gray-600">
          Asignatura:{" "}
          <span className="font-semibold">{asignatura.nombre_asignatura}</span>
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <select
            value={selectedDocente}
            onChange={(e) => setSelectedDocente(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
          >
            <option value="">-- Seleccione un docente --</option>
            {docentes.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nombre} {d.apellido_paterno}
              </option>
            ))}
          </select>
          <div className="flex justify-end space-x-4 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-principal text-white rounded-md hover:opacity-90"
            >
              Guardar Asignación
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- REEMPLAZA EL MODAL DE INSCRIBIR CON ESTE ---
const InscribirAlumnoModal = ({ grupoId, onClose, onSave }) => {
  const [alumnosDisponibles, setAlumnosDisponibles] = useState([]); // Renombrado
  const [selectedAlumno, setSelectedAlumno] = useState(""); // Renombrado

  useEffect(() => {
    const fetchAlumnos = async () => {
      if (!grupoId) return;
      try {
        // --- 1. USA EL NUEVO ENDPOINT ---
        const { data } = await api.get(
          `/admin/grupos/${grupoId}/alumnos-disponibles`
        );
        setAlumnosDisponibles(data);
        if (data.length > 0) {
          setSelectedAlumno(data[0].id);
        }
      } catch (error) {
        console.error("Error al obtener alumnos disponibles", error);
      }
    };
    fetchAlumnos();
  }, [grupoId]); // Se ejecuta si el grupoId cambia

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAlumno) {
      alert("Por favor, seleccione un alumno.");
      return;
    }
    try {
      // Esta ruta ya tiene la lógica de convertir 'aspirante' a 'alumno'
      await api.post(`/admin/grupos/${grupoId}/inscribir-alumno`, {
        alumno_id: selectedAlumno, // Usamos el estado actualizado
      });
      onSave();
      onClose();
    } catch (error) {
      console.error("Error al inscribir alumno", error);
      alert(
        "Error al inscribir: " +
          (error.response?.data?.message || "Error desconocido")
      );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
        >
          <X size={24} />
        </button>
        <h3 className="text-2xl font-bold mb-6">Inscribir Alumno</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            Seleccionar Aspirante o Alumno
          </label>
          {/* --- 2. EL SELECT AHORA MUESTRA AMBOS ROLES --- */}
          <select
            value={selectedAlumno}
            onChange={(e) => setSelectedAlumno(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
          >
            {alumnosDisponibles.length > 0 ? (
              alumnosDisponibles.map((a) => (
                // Mostramos el rol para que el admin sepa
                <option key={a.id} value={a.id}>
                  {a.nombre} {a.apellido_paterno} ({a.rol})
                </option>
              ))
            ) : (
              <option disabled>No hay aspirantes o alumnos disponibles</option>
            )}
          </select>
          <div className="flex justify-end space-x-4 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={alumnosDisponibles.length === 0}
              className="px-4 py-2 bg-principal text-white rounded-md hover:opacity-90 disabled:bg-gray-400"
            >
              Inscribir
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CatalogoPage = ({ title, apiEndpoint, fields, columns }) => {
  const [items, setItems] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const response = await api.get(`/admin/${apiEndpoint}`);
      setItems(response.data);
    } catch (error) {
      console.error(`Error al obtener ${title}`, error);
    }
  }, [apiEndpoint, title]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id) => {
    if (window.confirm("¿Estás seguro?")) {
      try {
        await api.delete(`/admin/${apiEndpoint}/${id}`);
        fetchData();
      } catch (error) {
        console.error(`Error al eliminar ${title}`, error);
      }
    }
  };

  const openModal = (item = null) => {
    setCurrentItem(item);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setCurrentItem(null);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">Gestión de {title}</h2>
        <button
          onClick={() => openModal()}
          className="flex items-center px-4 py-2 font-semibold text-white bg-principal rounded-md hover:opacity-90"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nuevo
        </button>
      </div>
      <div className="bg-white p-6 rounded-lg shadow">
        <table className="w-full table-auto">
          <thead className="text-left bg-gray-50">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-2">
                  {col.header}
                </th>
              ))}
              <th className="px-4 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-2">
                    {item[col.key]}
                  </td>
                ))}
                <td className="px-4 py-2 flex items-center space-x-2">
                  <button
                    onClick={() => openModal(item)}
                    className="text-secundario hover:text-principal"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modalOpen && (
        <CatalogoModal
          item={currentItem}
          onClose={closeModal}
          onSave={fetchData}
          title={title}
          apiEndpoint={apiEndpoint}
          fields={fields}
        />
      )}
    </div>
  );
};

const CatalogoModal = ({
  item,
  onClose,
  onSave,
  title,
  apiEndpoint,
  fields,
}) => {
  const isEditing = !!item;

  const initialFormState = fields.reduce((acc, field) => {
    acc[field.name] = item?.[field.name] || "";
    return acc;
  }, {});

  const [formData, setFormData] = useState(initialFormState);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await api.put(`/admin/${apiEndpoint}/${item.id}`, formData);
      } else {
        await api.post(`/admin/${apiEndpoint}`, formData);
      }
      onSave();
      onClose();
    } catch (error) {
      console.error(`Error al guardar ${title}`, error);
      alert(
        "Error al guardar: " +
          (error.response?.data?.message || "Error desconocido")
      );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
        >
          <X size={24} />
        </button>
        <h3 className="text-2xl font-bold mb-6">
          {isEditing ? "Editar" : "Nuevo"} {title.slice(0, -1)}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((field) => (
            <input
              key={field.name}
              type={field.type || "text"}
              name={field.name}
              value={formData[field.name]}
              onChange={handleChange}
              placeholder={field.placeholder}
              required
              className="w-full px-3 py-2 border rounded-md"
            />
          ))}
          <div className="flex justify-end space-x-4 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-principal text-white rounded-md hover:opacity-90"
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
// --- NUEVA PÁGINA DE MIGRACIÓN ---
const MigracionGruposPage = () => {
  const [grupos, setGrupos] = useState([]);
  const [sourceGroupId, setSourceGroupId] = useState("");
  const [destinationGroupId, setDestinationGroupId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // 1. Cargar todos los grupos al iniciar
  useEffect(() => {
    const fetchGrupos = async () => {
      try {
        const { data } = await api.get("/admin/grupos");
        setGrupos(data);
      } catch (error) {
        console.error("Error al cargar grupos", error);
        setMessage({
          type: "error",
          text: "No se pudieron cargar los grupos.",
        });
      }
    };
    fetchGrupos();
  }, []);

  // 2. Filtrar grupos en listas separadas (memoizado para eficiencia)
  const inactivos = useMemo(
    () => grupos.filter((g) => g.estatus === "inactivo"),
    [grupos]
  );
  const activos = useMemo(
    () => grupos.filter((g) => g.estatus === "activo"),
    [grupos]
  );

  // 3. Manejar el envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });

    if (!sourceGroupId || !destinationGroupId) {
      setMessage({
        type: "error",
        text: "Debes seleccionar un grupo de origen y uno de destino.",
      });
      return;
    }

    if (
      window.confirm(
        "¿Estás seguro de que quieres migrar a TODOS los alumnos de este grupo? Esta acción es irreversible."
      )
    ) {
      setLoading(true);
      try {
        const { data } = await api.post("/admin/migrar-grupo", {
          sourceGroupId,
          destinationGroupId,
        });
        setMessage({ type: "success", text: data.message });
        // Limpiar selección después de éxito
        setSourceGroupId("");
        setDestinationGroupId("");
      } catch (error) {
        setMessage({
          type: "error",
          text: error.response?.data?.message || "Error al migrar.",
        });
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">
        Herramienta de Migración de Grupos
      </h2>
      <p className="mb-8 text-gray-700">
        Esta herramienta moverá a **todos** los alumnos de un grupo cerrado
        (inactivo) a un nuevo grupo (activo). Asegúrate de que el grupo de
        destino sea el correcto (ej. el siguiente grado o semestre).
      </p>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
          {/* --- COLUMNA DE ORIGEN --- */}
          <div>
            <h3 className="text-xl font-semibold mb-3 text-red-700">
              <span className="text-2xl mr-2">①</span> Grupo de Origen (Cerrado)
            </h3>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Seleccionar grupo inactivo:
            </label>
            <select
              value={sourceGroupId}
              onChange={(e) => setSourceGroupId(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:ring-principal focus:border-principal"
            >
              <option value="">-- Grupos Inactivos --</option>
              {inactivos.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nombre_grupo} ({g.nombre_plan} - {g.nombre_grado})
                </option>
              ))}
            </select>
          </div>

          {/* --- COLUMNA DE DESTINO --- */}
          <div>
            <h3 className="text-xl font-semibold mb-3 text-green-700">
              <span className="text-2xl mr-2">②</span> Grupo de Destino (Nuevo)
            </h3>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Seleccionar grupo activo:
            </label>
            <select
              value={destinationGroupId}
              onChange={(e) => setDestinationGroupId(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:ring-principal focus:border-principal"
            >
              <option value="">-- Grupos Activos --</option>
              {activos.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nombre_grupo} ({g.nombre_plan} - {g.nombre_grado})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* --- MENSAJES DE ESTADO --- */}
        {message.text && (
          <div
            className={`p-3 rounded-md mb-6 ${
              message.type === "error"
                ? "bg-red-100 text-red-800"
                : "bg-green-100 text-green-800"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="flex justify-end pt-4 border-t">
          <button
            type="submit"
            disabled={loading || !sourceGroupId || !destinationGroupId}
            className="flex items-center justify-center px-6 py-3 font-semibold text-white bg-principal rounded-md hover:opacity-90 disabled:bg-gray-400"
          >
            <ArrowRightLeft size={18} className="mr-2" />
            {loading ? "Migrando..." : "Iniciar Migración"}
          </button>
        </div>
      </form>
    </div>
  );
};
// --- FIN DE PÁGINA DE MIGRACIÓN ---

// --- NUEVO MODAL PARA TRANSFERIR UN ALUMNO ---
const TransferirAlumnoModal = ({
  show,
  onClose,
  alumno,
  currentGroupId,
  onSave,
}) => {
  const [grupos, setGrupos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState("");

  useEffect(() => {
    if (show) {
      const fetchGrupos = async () => {
        try {
          setLoading(true);
          const { data } = await api.get("/admin/grupos");
          // Filtramos los grupos para no incluir el grupo actual
          const availableGroups = data.filter((g) => g.id !== currentGroupId);
          setGrupos(availableGroups);
          if (availableGroups.length > 0) {
            setSelectedGroupId(availableGroups[0].id);
          }
        } catch (error) {
          console.error("Error al cargar grupos", error);
        } finally {
          setLoading(false);
        }
      };
      fetchGrupos();
    }
  }, [show, currentGroupId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedGroupId) {
      alert("Por favor, seleccione un grupo de destino.");
      return;
    }
    try {
      await api.post("/admin/grupos/transferir-alumno", {
        alumnoId: alumno.id,
        sourceGroupId: currentGroupId,
        destinationGroupId: selectedGroupId,
      });
      onSave(); // Llama a onSave (que es fetchDetalles)
      onClose(); // Cierra el modal
    } catch (error) {
      console.error("Error al transferir", error);
      alert(
        "Error al transferir: " + (error.response?.data?.message || "Error")
      );
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
        >
          <X size={24} />
        </button>
        <h3 className="text-2xl font-bold mb-4">Transferir Alumno</h3>
        <p className="mb-6">
          Mover a:{" "}
          <span className="font-semibold">
            {alumno.nombre} {alumno.apellido_paterno}
          </span>
        </p>

        {loading ? (
          // Ocupamos un texto simple en lugar de ActivityIndicator
          <p>Cargando grupos...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              Seleccionar Grupo de Destino
            </label>
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            >
              {grupos.length > 0 ? (
                grupos.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nombre_grupo} ({g.nombre_plan} / {g.modalidad})
                  </option>
                ))
              ) : (
                <option disabled>No hay otros grupos disponibles</option>
              )}
            </select>
            <div className="flex justify-end space-x-4 mt-8">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={grupos.length === 0}
                className="px-4 py-2 bg-principal text-white rounded-md hover:opacity-90 disabled:bg-gray-400"
              >
                Confirmar Transferencia
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

const DocenteDashboardPage = () => {
  const [cursos, setCursos] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCursos = async () => {
      try {
        const { data } = await api.get("/docente/mis-cursos");
        setCursos(data);
      } catch (error) {
        console.error("Error al cargar los cursos del docente", error);
      }
    };
    fetchCursos();
  }, []);

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-800 mb-6">
        Mis Cursos Asignados
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cursos.map((curso) => (
          <div
            key={`${curso.grupo_id}-${curso.asignatura_id}`}
            className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() =>
              navigate(
                `/docente/grupo/${curso.grupo_id}/asignatura/${curso.asignatura_id}/aula`
              )
            }
          >
            <h3 className="font-bold text-lg text-principal">
              {curso.nombre_asignatura}
            </h3>
            <p className="text-gray-600">Grupo: {curso.nombre_grupo}</p>
            <p className="text-sm text-gray-500">{curso.nombre_ciclo}</p>

            {/* --- REEMPLAZA EL DIV ANTERIOR CON ESTE BLOQUE --- */}
            <div className="mt-4 pt-4 border-t flex justify-between items-center">
              <p className="text-sm font-semibold">
                {curso.total_alumnos} Alumnos Inscritos
              </p>
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  curso.total_alumnos > 0 &&
                  curso.total_calificaciones >= curso.total_alumnos
                    ? "bg-green-100 text-green-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {curso.total_alumnos > 0 &&
                curso.total_calificaciones >= curso.total_alumnos
                  ? "Completado"
                  : "Pendiente"}
              </span>
            </div>
            {/* --- FIN DEL BLOQUE REEMPLAZADO --- */}
          </div>
        ))}
      </div>
    </div>
  );
};

// --- ESTE ES EL COMPONENTE REFACTORIZADO ---
const DetalleCursoDocentePage = () => {
  const { grupoId, asignaturaId } = useParams();
  const [alumnos, setAlumnos] = useState([]);
  const [cursoInfo, setCursoInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // El estado ahora es un objeto para manejar todas las calificaciones a la vez
  const [calificaciones, setCalificaciones] = useState({});
  const [originalCalificaciones, setOriginalCalificaciones] = useState({});

  const fetchAlumnos = useCallback(async () => {
    try {
      setLoading(true);
      // Esta ruta es la del DOCENTE
      const { data } = await api.get(
        `/docente/grupo/${grupoId}/asignatura/${asignaturaId}/alumnos`
      );
      setAlumnos(data.alumnos);
      setCursoInfo(data.cursoInfo);

      // Inicializa el estado 'calificaciones' con los datos de la API
      const initialCalificaciones = data.alumnos.reduce((acc, alumno) => {
        acc[alumno.id] =
          alumno.calificacion !== null ? String(alumno.calificacion) : "";
        return acc;
      }, {});
      setCalificaciones(initialCalificaciones);
      // "Congelamos" el estado original para poder comparar después
      setOriginalCalificaciones(initialCalificaciones);
    } catch (error) {
      console.error("Error al cargar alumnos", error);
    } finally {
      setLoading(false);
    }
  }, [grupoId, asignaturaId]);

  useEffect(() => {
    fetchAlumnos();
  }, [fetchAlumnos]);

  // Maneja el cambio de un solo input
  const handleCalificacionChange = (alumnoId, valor) => {
    setCalificaciones((prev) => ({ ...prev, [alumnoId]: valor }));
  };

  // --- **** AQUÍ ESTÁ LA CORRECCIÓN **** ---
  // --- ESTA ES LA FUNCIÓN QUE CORREGÍ ---
  const handleGuardarTodo = async () => {
    setIsSaving(true);

    // 1. Compara el estado 'calificaciones' con 'originalCalificaciones'
    const calificacionesArray = Object.keys(calificaciones)
      .filter((alumnoId) => {
        const valorActual = calificaciones[alumnoId];
        const valorOriginal = originalCalificaciones[alumnoId];

        // Solo incluiremos la calificación si:
        // 1. No está vacía (es nueva o modificada)
        // 2. Y es DIFERENTE del valor original que cargó la página
        return valorActual !== "" && valorActual !== valorOriginal;
      })
      .map((alumnoId) => ({
        alumno_id: parseInt(alumnoId),
        calificacion: calificaciones[alumnoId],
      }));

    // Si no hay calificaciones nuevas o modificadas, no hacemos nada
    if (calificacionesArray.length === 0) {
      alert("No hay calificaciones nuevas o modificadas para guardar.");
      setIsSaving(false);
      return;
    }

    try {
      // 2. Usar el NUEVO endpoint de "Guardar Todo"
      await api.post("/calificar-grupo-completo", {
        asignatura_id: asignaturaId,
        grupo_id: grupoId, // <-- AÑADE ESTA LÍNEA (grupoId viene de useParams)
        calificaciones: calificacionesArray,
      });
      alert("Calificaciones guardadas con éxito.");

      // --- ¡IMPORTANTE! ---
      // Sincronizamos el estado 'original' con el 'actual'
      // para evitar re-envíos si el usuario vuelve a dar clic.
      setOriginalCalificaciones(calificaciones);

      fetchAlumnos(); // Recargar los datos
    } catch (error) {
      console.error("Error al guardar calificaciones", error);
      alert("Error al guardar: " + (error.response?.data?.message || "Error"));
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <p>Cargando...</p>;

  return (
    <div>
      <Link
        to="/docente/dashboard"
        className="flex items-center text-principal mb-6 hover:underline"
      >
        <ArrowLeft size={18} className="mr-2" />
        Volver a Mis Cursos
      </Link>
      <h2 className="text-3xl font-bold text-gray-800 mb-2">
        {cursoInfo.nombre_asignatura}
      </h2>
      <p className="text-lg text-secundario mb-6">
        Grupo: {cursoInfo.nombre_grupo}
      </p>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-xl font-bold mb-4">Lista de Alumnos</h3>
        <table className="w-full table-auto">
          <thead className="text-left bg-gray-50">
            <tr>
              <th className="px-4 py-2">Nombre del Alumno</th>
              <th className="px-4 py-2 w-48">Calificación (0-100)</th>
            </tr>
          </thead>
          <tbody>
            {alumnos.map((alumno) => (
              <tr key={alumno.id} className="border-b">
                <td className="px-4 py-2">{alumno.nombre_completo}</td>
                <td>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={calificaciones[alumno.id] || ""} // Usar el estado
                    onChange={(e) =>
                      handleCalificacionChange(alumno.id, e.target.value)
                    }
                    className="w-full px-3 py-1 border rounded-md"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* --- NUEVO BOTÓN "GUARDAR TODO" --- */}
        <div className="flex justify-end mt-6">
          <button
            onClick={handleGuardarTodo}
            disabled={isSaving}
            className="flex items-center px-6 py-2 font-semibold text-white bg-principal rounded-md hover:opacity-90 disabled:bg-gray-400"
          >
            <Save size={18} className="mr-2" />
            {isSaving ? "Guardando..." : "Guardar Todas las Calificaciones"}
          </button>
        </div>
      </div>
    </div>
  );
};
const AdminCalificarPage = () => {
  const { grupoId, asignaturaId } = useParams();
  const [alumnos, setAlumnos] = useState([]);
  const [cursoInfo, setCursoInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // El estado ahora es un objeto para manejar todas las calificaciones a la vez
  const [calificaciones, setCalificaciones] = useState({});
  // --- ¡AÑADE ESTA LÍNEA AQUÍ! ---
  const [originalCalificaciones, setOriginalCalificaciones] = useState({});

  const fetchAlumnos = useCallback(async () => {
    try {
      setLoading(true);
      // Esta ruta es la del ADMIN
      const { data } = await api.get(
        `/admin/grupo/${grupoId}/asignatura/${asignaturaId}/alumnos`
      );
      setAlumnos(data.alumnos);
      setCursoInfo(data.cursoInfo);

      // Inicializa el estado 'calificaciones' con los datos de la API
      const initialCalificaciones = data.alumnos.reduce((acc, alumno) => {
        acc[alumno.id] =
          alumno.calificacion !== null ? String(alumno.calificacion) : "";
        return acc;
      }, {});
      setCalificaciones(initialCalificaciones);
      // --- ¡AÑADE ESTAS LÍNEAS AQUÍ! ---
      // "Congelamos" el estado original para poder comparar después
      setOriginalCalificaciones(initialCalificaciones);
    } catch (error) {
      console.error("Error al cargar alumnos", error);
    } finally {
      setLoading(false);
    }
  }, [grupoId, asignaturaId]);

  useEffect(() => {
    fetchAlumnos();
  }, [fetchAlumnos]);

  // Maneja el cambio de un solo input
  const handleCalificacionChange = (alumnoId, valor) => {
    setCalificaciones((prev) => ({ ...prev, [alumnoId]: valor }));
  };

  // --- NUEVA FUNCIÓN "GUARDAR TODO" (CORREGIDA) ---
  const handleGuardarTodo = async () => {
    setIsSaving(true);

    // 1. Compara el estado 'calificaciones' con 'originalCalificaciones'
    const calificacionesArray = Object.keys(calificaciones)
      .filter((alumnoId) => {
        const valorActual = calificaciones[alumnoId];
        const valorOriginal = originalCalificaciones[alumnoId];

        // Solo incluiremos la calificación si:
        // 1. No está vacía (es nueva o modificada)
        // 2. Y es DIFERENTE del valor original que cargó la página
        return valorActual !== "" && valorActual !== valorOriginal;
      })
      .map((alumnoId) => ({
        alumno_id: parseInt(alumnoId),
        calificacion: calificaciones[alumnoId],
      }));

    // Si no hay calificaciones nuevas o modificadas, no hacemos nada
    if (calificacionesArray.length === 0) {
      alert("No hay calificaciones nuevas o modificadas para guardar.");
      setIsSaving(false);
      return;
    }

    try {
      // 2. Usar el NUEVO endpoint de "Guardar Todo"
      await api.post("/calificar-grupo-completo", {
        asignatura_id: asignaturaId,
        grupo_id: grupoId,
        calificaciones: calificacionesArray,
      });
      alert("Calificaciones guardadas con éxito.");

      // --- ¡IMPORTANTE! ---
      // Sincronizamos el estado 'original' con el 'actual'
      // para evitar re-envíos si el usuario vuelve a dar clic.
      setOriginalCalificaciones(calificaciones);

      fetchAlumnos(); // Recargar los datos (opcional, pero bueno)
    } catch (error) {
      console.error("Error al guardar calificaciones", error);
      alert("Error al guardar: " + (error.response?.data?.message || "Error"));
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <p>Cargando...</p>;

  return (
    <div>
      <Link
        to={`/grupos/${grupoId}`}
        className="flex items-center text-principal mb-6 hover:underline"
      >
        <ArrowLeft size={18} className="mr-2" />
        Volver al Grupo
      </Link>
      <h2 className="text-3xl font-bold text-gray-800 mb-2">
        {cursoInfo.nombre_asignatura}
      </h2>
      <p className="text-lg text-secundario mb-6">
        Grupo: {cursoInfo.nombre_grupo}
      </p>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-xl font-bold mb-4">Lista de Alumnos</h3>
        <table className="w-full table-auto">
          <thead className="text-left bg-gray-50">
            <tr>
              <th className="px-4 py-2">Nombre del Alumno</th>
              <th className="px-4 py-2 w-48">Calificación (0-100)</th>
            </tr>
          </thead>
          <tbody>
            {alumnos.map((alumno) => (
              <tr key={alumno.id} className="border-b">
                <td className="px-4 py-2">{alumno.nombre_completo}</td>
                <td>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={calificaciones[alumno.id] || ""} // Usar el estado
                    onChange={(e) =>
                      handleCalificacionChange(alumno.id, e.target.value)
                    }
                    className="w-full px-3 py-1 border rounded-md"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* --- NUEVO BOTÓN "GUARDAR TODO" --- */}
        <div className="flex justify-end mt-6">
          <button
            onClick={handleGuardarTodo}
            disabled={isSaving}
            className="flex items-center px-6 py-2 font-semibold text-white bg-principal rounded-md hover:opacity-90 disabled:bg-gray-400"
          >
            <Save size={18} className="mr-2" />
            {isSaving ? "Guardando..." : "Guardar Todas las Calificaciones"}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- REEMPLAZA EL COMPONENTE AlumnoDashboardPage CON ESTO ---
const AlumnoDashboardPage = () => {
  // 1. Cambiamos el estado para que sea un array
  const [misGrupos, setMisGrupos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMiGrupo = async () => {
      try {
        const { data } = await api.get("/alumno/mi-grupo");
        setMisGrupos(data); // 2. Guardamos el array
      } catch (error) {
        console.error("Error al cargar la información del grupo", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMiGrupo();
  }, []);

  if (loading) return <p>Cargando tu información...</p>;

  // 3. Actualizamos la comprobación
  if (!misGrupos || misGrupos.length === 0) {
    return <p>Aún no estás inscrito en ningún grupo.</p>;
  }

  // 4. Hacemos un map sobre el array misGrupos
  return (
    <div className="space-y-8">
      {misGrupos.map((infoGrupo, index) => (
        <div key={index}>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            Grupo: {infoGrupo.grupo.nombre_grupo} ({infoGrupo.grupo.modalidad})
          </h2>
          <p className="text-lg text-secundario mb-6">
            Ciclo Escolar: {infoGrupo.grupo.nombre_ciclo}
          </p>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-bold mb-4">
              Mis Asignaturas y Calificaciones
            </h3>
            <table className="w-full table-auto">
              <thead className="text-left bg-gray-50">
                <tr>
                  <th className="px-4 py-2">Asignatura</th>
                  <th className="px-4 py-2">Docente</th>
                  <th className="px-4 py-2">Calificación</th>
                </tr>
              </thead>
              <tbody>
                {infoGrupo.asignaturas.map((asig) => (
                  <tr key={asig.clave_asignatura} className="border-b">
                    <td className="px-4 py-2">
                      <Link
                        to={`/alumno/grupo/${infoGrupo.grupo.id}/asignatura/${asig.asignatura_id}/aula`}
                        className="font-semibold text-principal hover:underline"
                      >
                        {asig.nombre_asignatura}
                      </Link>
                    </td>
                    <td className="px-4 py-2">
                      {asig.docente_nombre
                        ? `${asig.docente_nombre} ${
                            asig.docente_apellido || ""
                          }`
                        : "N/A"}
                    </td>
                    <td className="px-4 py-2 font-semibold">
                      {asig.calificacion !== null
                        ? asig.calificacion
                        : "Sin calificar"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
};

const DetalleAspirantePage = () => {
  const { id } = useParams();
  const [aspirante, setAspirante] = useState(null);
  const [expediente, setExpediente] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [tipoDocumento, setTipoDocumento] = useState("acta_nacimiento");

  const fetchAspirante = useCallback(async () => {
    try {
      const [aspiranteRes, expedienteRes] = await Promise.all([
        api.get(`/admin/usuarios/${id}`),
        api.get(`/admin/aspirantes/${id}/expediente`),
      ]);
      setAspirante(aspiranteRes.data);
      setExpediente(expedienteRes.data);
    } catch (error) {
      console.error("Error al cargar datos del aspirante", error);
    }
  }, [id]);

  useEffect(() => {
    fetchAspirante();
  }, [fetchAspirante]);

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      alert("Por favor, selecciona un archivo.");
      return;
    }

    const formData = new FormData();
    formData.append("documento", selectedFile);
    formData.append("tipo_documento", tipoDocumento);

    try {
      await api.post(`/admin/aspirantes/${id}/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      fetchAspirante(); // Recargar datos
    } catch (error) {
      console.error("Error al subir el archivo", error);
      alert(
        "Error al subir archivo: " +
          (error.response?.data?.message || "Error desconocido")
      );
    }
  };

  const handleDelete = async (docId) => {
    if (window.confirm("¿Estás seguro de eliminar este documento?")) {
      try {
        await api.delete(`/admin/expedientes/${docId}`);
        fetchAspirante();
      } catch (error) {
        console.error("Error al eliminar documento", error);
        alert("Error al eliminar");
      }
    }
  };

  if (!aspirante) return <p>Cargando aspirante...</p>;

  return (
    <div>
      <Link
        to="/usuarios"
        className="flex items-center text-principal mb-6 hover:underline"
      >
        <ArrowLeft size={18} className="mr-2" />
        Volver a Usuarios
      </Link>
      <h2 className="text-3xl font-bold text-gray-800 mb-4">{`${aspirante.nombre} ${aspirante.apellido_paterno}`}</h2>

      <div className="bg-white p-6 rounded-lg shadow mt-6">
        <h3 className="text-xl font-bold mb-4">Subir Documento</h3>
        <form onSubmit={handleUpload} className="flex items-end space-x-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Tipo de Documento
            </label>
            <select
              value={tipoDocumento}
              onChange={(e) => setTipoDocumento(e.target.value)}
              className="w-full px-3 py-2 mt-1 border rounded-md"
            >
              <option value="acta_nacimiento">Acta de Nacimiento</option>
              <option value="curp">CURP</option>
              <option value="certificado_bachillerato">
                Certificado de Bachillerato
              </option>
              <option value="comprobante_domicilio">
                Comprobante de Domicilio
              </option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Archivo
            </label>
            <input
              type="file"
              onChange={handleFileChange}
              className="w-full px-3 py-1 mt-1 border rounded-md"
            />
          </div>
          <button
            type="submit"
            className="flex items-center h-10 px-4 py-2 font-semibold text-white bg-principal rounded-md hover:opacity-90"
          >
            <Upload size={18} className="mr-2" />
            Subir
          </button>
        </form>
      </div>

      <div className="bg-white p-6 rounded-lg shadow mt-6">
        <h3 className="text-xl font-bold mb-4">Documentos del Expediente</h3>
        <table className="w-full table-auto">
          <thead className="text-left bg-gray-50">
            <tr>
              <th className="px-4 py-2">Tipo de Documento</th>
              <th className="px-4 py-2">Nombre del Archivo</th>
              <th className="px-4 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {expediente.map((doc) => (
              <tr key={doc.id} className="border-b">
                <td className="px-4 py-2 capitalize">
                  {doc.tipo_documento.replace(/_/g, " ")}
                </td>
                <td className="px-4 py-2">
                  <a
                    href={`http://localhost:3001/uploads/${doc.ruta_archivo}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-blue-600 hover:underline"
                  >
                    <FileIcon size={16} className="mr-2" />{" "}
                    {doc.nombre_original}
                  </a>
                </td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const AspiranteDashboardPage = () => {
  // 1. Usamos useAuth en lugar de useParams
  const { user } = useAuth();
  const [expediente, setExpediente] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [tipoDocumento, setTipoDocumento] = useState("acta_nacimiento");

  // Lista de documentos requeridos
  const tiposRequeridos = [
    { id: "acta_nacimiento", nombre: "Acta de Nacimiento" },
    { id: "curp", nombre: "CURP" },
    { id: "certificado_bachillerato", nombre: "Certificado de Bachillerato" },
    { id: "comprobante_domicilio", nombre: "Comprobante de Domicilio" },
  ];

  const fetchAspirante = useCallback(async () => {
    try {
      // 2. Usamos la nueva ruta del aspirante
      const expedienteRes = await api.get(`/aspirante/mi-expediente`);
      setExpediente(expedienteRes.data);
    } catch (error) {
      console.error("Error al cargar datos del aspirante", error);
    }
  }, []); // 3. No hay dependencias, usa el ID del token

  useEffect(() => {
    fetchAspirante();
  }, [fetchAspirante]);

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      alert("Por favor, selecciona un archivo.");
      return;
    }

    const formData = new FormData();
    formData.append("documento", selectedFile);
    formData.append("tipo_documento", tipoDocumento);

    try {
      // 4. Usamos la nueva ruta del aspirante
      await api.post(`/aspirante/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      fetchAspirante(); // Recargar datos
      setSelectedFile(null); // Limpiar el input
      e.target.reset(); // Limpiar el form
    } catch (error) {
      // ... (manejo de error)
    }
  };

  const handleDelete = async (docId) => {
    if (window.confirm("¿Estás seguro de eliminar este documento?")) {
      try {
        // 5. Usamos la nueva ruta del aspirante
        await api.delete(`/aspirante/expedientes/${docId}`);
        fetchAspirante();
      } catch (error) {
        // ... (manejo de error)
      }
    }
  };

  // 6. Lógica para el recordatorio
  const documentosSubidos = expediente.map((doc) => doc.tipo_documento);
  const faltantes = tiposRequeridos.filter(
    (tipo) => !documentosSubidos.includes(tipo.id)
  );

  if (!user) return <p>Cargando...</p>;

  return (
    <div>
      {/* 7. Saludamos al usuario desde useAuth */}
      <h2 className="text-3xl font-bold text-gray-800 mb-4">
        ¡Hola, {user.nombre} {user.apellido_paterno}!
      </h2>
      <p className="text-lg text-gray-700 mb-6">
        Bienvenido a tu portal. Para completar tu registro, por favor sube los
        documentos de tu expediente.
      </p>

      {/* 8. Mostramos el recordatorio si faltan documentos */}
      {faltantes.length > 0 && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6 rounded-md">
          <p className="font-bold">¡Acción Requerida!</p>
          <p>Aún necesitas subir los siguientes documentos:</p>
          <ul className="list-disc list-inside mt-2">
            {faltantes.map((doc) => (
              <li key={doc.id}>{doc.nombre}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow mt-6">
        <h3 className="text-xl font-bold mb-4">Subir Documento</h3>
        <form onSubmit={handleUpload} className="flex items-end space-x-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Tipo de Documento
            </label>
            <select
              value={tipoDocumento}
              onChange={(e) => setTipoDocumento(e.target.value)}
              className="w-full px-3 py-2 mt-1 border rounded-md"
            >
              {/* Usamos la lista de requeridos para el select */}
              {tiposRequeridos.map((tipo) => (
                <option key={tipo.id} value={tipo.id}>
                  {tipo.nombre}
                </option>
              ))}
            </select>
          </div>
          {/* ... (el resto del formulario de subida se queda igual) ... */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Archivo
            </label>
            <input
              type="file"
              onChange={handleFileChange}
              className="w-full px-3 py-1 mt-1 border rounded-md"
            />
          </div>
          <button
            type="submit"
            className="flex items-center h-10 px-4 py-2 font-semibold text-white bg-principal rounded-md hover:opacity-90"
          >
            <Upload size={18} className="mr-2" />
            Subir
          </button>
        </form>
      </div>

      <div className="bg-white p-6 rounded-lg shadow mt-6">
        <h3 className="text-xl font-bold mb-4">Mis Documentos</h3>
        {/* ... (La tabla de documentos se queda exactamente igual) ... */}
        <table className="w-full table-auto">
          <thead className="text-left bg-gray-50">
            <tr>
              <th className="px-4 py-2">Tipo de Documento</th>
              <th className="px-4 py-2">Nombre del Archivo</th>
              <th className="px-4 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {expediente.map((doc) => (
              <tr key={doc.id} className="border-b">
                <td className="px-4 py-2 capitalize">
                  {doc.tipo_documento.replace(/_/g, " ")}
                </td>
                <td className="px-4 py-2">
                  <a
                    href={`http://localhost:3001/uploads/${doc.ruta_archivo}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-blue-600 hover:underline"
                  >
                    <FileIcon size={16} className="mr-2" />{" "}
                    {doc.nombre_original}
                  </a>
                </td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- INICIA NUEVO CÓDIGO (AGREGAR) ---

// Este es el nuevo componente de AULA VIRTUAL (MODIFICADO)
const AulaVirtualPage = () => {
  const { grupoId, asignaturaId } = useParams();
  const { user } = useAuth();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    enlace_videollamada: "",
    descripcion_curso: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const navigate = useNavigate();

  const [tareas, setTareas] = useState([]);
  const [loadingTareas, setLoadingTareas] = useState(true);
  const [showCrearTareaModal, setShowCrearTareaModal] = useState(false);

  const [showEntregarModal, setShowEntregarModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  const [recursos, setRecursos] = useState([]);
  const [loadingRecursos, setLoadingRecursos] = useState(true);
  const [showRecursoModal, setShowRecursoModal] = useState(false);

  // Función para cargar los datos del aula
  const fetchAulaConfig = useCallback(async () => {
    try {
      const { data } = await api.get(
        `/${user.rol}/aula-virtual/${grupoId}/${asignaturaId}/config`
      );
      setConfig(data);
      setFormData({
        enlace_videollamada: data.enlace_videollamada || "",
        descripcion_curso: data.descripcion_curso || "",
      });
    } catch (error) {
      console.error("Error al cargar la configuración del aula", error);
    } finally {
      setLoading(false);
    }
  }, [user.rol, grupoId, asignaturaId]);

  // Función para cargar las tareas
  const fetchTareas = useCallback(async () => {
    setLoadingTareas(true);
    try {
      const { data } = await api.get(
        `/${user.rol}/aula-virtual/${grupoId}/${asignaturaId}/tareas`
      );
      setTareas(data);
    } catch (error) {
      console.error("Error al cargar tareas", error);
    } finally {
      setLoadingTareas(false);
    }
  }, [user.rol, grupoId, asignaturaId]);

  const fetchRecursos = useCallback(async () => {
    // --- REEMPLAZA EL CONTENIDO ANTERIOR CON ESTO ---
    setLoadingRecursos(true); // Indicar que estamos cargando
    try {
      // Hacemos la llamada a la API (la ruta es la misma para ambos roles)
      const { data } = await api.get(
        `/${user.rol}/aula-virtual/${grupoId}/${asignaturaId}/recursos`
      );
      setRecursos(data); // Guardamos los datos en el estado
    } catch (error) {
      console.error("Error al cargar recursos", error);
      setRecursos([]); // En caso de error, dejamos la lista vacía
    } finally {
      setLoadingRecursos(false); // Indicamos que la carga terminó
    }
    // --- FIN DEL REEMPLAZO ---
  }, [user.rol, grupoId, asignaturaId]);

  const handleDeleteRecurso = async (recursoId) => {
    // --- REEMPLAZA EL CONTENIDO ANTERIOR CON ESTO ---
    // Preguntar confirmación al usuario
    if (
      window.confirm(
        "¿Estás seguro de eliminar este recurso? Esta acción no se puede deshacer."
      )
    ) {
      try {
        // Llamar a la API para borrar el recurso por su ID
        await api.delete(`/docente/aula-virtual/recurso/${recursoId}`);
        // Si la llamada fue exitosa, refrescar la lista de recursos
        fetchRecursos(); // Esto hará que el recurso borrado desaparezca de la pantalla
      } catch (error) {
        console.error("Error al eliminar recurso", error);
        alert("Error al eliminar el recurso. Inténtalo de nuevo.");
      }
    }
    // --- FIN DEL REEMPLAZO ---
  };

  // Cargar datos al montar el componente
  useEffect(() => {
    fetchAulaConfig();
    fetchTareas();
    fetchRecursos(); // <-- AGREGA ESTA LLAMADA
  }, [fetchAulaConfig, fetchTareas, fetchRecursos]); // <-- AGREGA fetchRecursos AQUÍ

  // Manejador para guardar (solo docentes)
  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await api.put(
        `/docente/aula-virtual/${grupoId}/${asignaturaId}/config`,
        formData
      );
      setIsSaving(false);
      setSaveSuccess(true);
      setIsEditing(false);
      setConfig((prev) => ({ ...prev, ...formData }));
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Error al guardar", error);
      setIsSaving(false);
      alert("Error al guardar la configuración.");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Abre el modal de "Entregar" para el alumno
  const handleOpenEntregarModal = (tarea) => {
    setSelectedTask(tarea);
    setShowEntregarModal(true);
  };

  if (loading) return <p>Cargando aula virtual...</p>;
  if (!config) return <p>No se pudo cargar la configuración del aula.</p>;

  // Componente del formulario de edición (solo para docentes)
  const renderDocenteForm = () => (
    // ... (Este componente no cambia, lo dejamos igual) ...
    <form
      onSubmit={handleSave}
      className="bg-gray-50 p-6 rounded-lg shadow-inner"
    >
      <h3 className="text-xl font-semibold mb-4 text-gray-800">
        Configurar Aula Virtual
      </h3>
      <div className="space-y-4">
        <div>
          <label
            htmlFor="enlace_videollamada"
            className="block text-sm font-medium text-gray-700"
          >
            Enlace de la Videollamada (Zoom, Meet, etc.)
          </label>
          <input
            type="url"
            name="enlace_videollamada"
            id="enlace_videollamada"
            value={formData.enlace_videollamada}
            onChange={handleChange}
            placeholder="https://zoom.us/j/123456789"
            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-principal focus:border-principal"
          />
          <button
            type="button"
            onClick={() =>
              setFormData((prev) => ({
                ...prev,
                enlace_videollamada: `https://meet.jit.si/CEVVI-G${grupoId}-A${asignaturaId}`,
              }))
            }
            className="flex items-center mt-2 px-3 py-1 text-sm text-white bg-secundario rounded-md hover:opacity-90"
          >
            <Sparkles size={16} className="mr-2" />
            Generar enlace de Jitsi Meet
          </button>
        </div>
        <div>
          <label
            htmlFor="descripcion_curso"
            className="block text-sm font-medium text-gray-700"
          >
            Descripción o Mensaje de Bienvenida
          </label>
          <textarea
            name="descripcion_curso"
            id="descripcion_curso"
            rows="6"
            value={formData.descripcion_curso}
            onChange={handleChange}
            placeholder="Bienvenidos al curso. Aquí encontrarán los detalles..."
            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-principal focus:border-principal"
          ></textarea>
        </div>
      </div>
      <div className="flex justify-end items-center space-x-4 mt-6">
        {saveSuccess && (
          <span className="flex items-center text-green-600">
            <CheckCircle size={18} className="mr-1" /> Guardado
          </span>
        )}
        <button
          type="button"
          onClick={() => setIsEditing(false)}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="px-4 py-2 bg-principal text-white rounded-md hover:opacity-90"
        >
          {isSaving ? "Guardando..." : "Guardar Cambios"}
        </button>
      </div>
    </form>
  );

  // Componente para mostrar la lista de tareas
  const renderTareasList = () => {
    // ... (Este componente no cambia, lo dejamos igual) ...
    if (loadingTareas) return <p>Cargando tareas...</p>;
    if (tareas.length === 0) {
      return (
        <p className="text-gray-500">
          {user.rol === "docente"
            ? "Aún no has creado ninguna tarea. ¡Crea la primera!"
            : "Aún no hay tareas publicadas para este curso."}
        </p>
      );
    }

    return (
      <div className="space-y-4">
        {tareas.map((tarea) => {
          if (user.rol === "docente") {
            return (
              <Link
                key={tarea.id}
                to={`/docente/grupo/${grupoId}/asignatura/${asignaturaId}/tarea/${tarea.id}`}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border w-full text-left transition-all hover:bg-gray-100 hover:shadow-sm"
              >
                <div className="flex items-center">
                  <FileText className="w-6 h-6 text-principal mr-4" />
                  <div>
                    <span className="font-bold text-lg text-gray-800">
                      {tarea.titulo}
                    </span>
                    <p className="text-sm text-gray-600">
                      {tarea.fecha_limite
                        ? `Fecha límite: ${new Date(
                            tarea.fecha_limite
                          ).toLocaleString()}`
                        : "Sin fecha límite"}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-secundario">
                  {tarea.total_entregas} Entregas
                </span>
              </Link>
            );
          }

          const isEntregada = !!tarea.entrega_id;
          const isCalificada = tarea.calificacion !== null;
          return (
            <button
              key={tarea.id}
              onClick={() => handleOpenEntregarModal(tarea)}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border w-full text-left transition-all hover:bg-gray-100 hover:shadow-sm"
            >
              <div className="flex items-center">
                <FileText className="w-6 h-6 text-principal mr-4" />
                <div>
                  <span className="font-bold text-lg text-gray-800">
                    {tarea.titulo}
                  </span>
                  <p className="text-sm text-gray-600">
                    {tarea.fecha_limite
                      ? `Fecha límite: ${new Date(
                          tarea.fecha_limite
                        ).toLocaleString()}`
                      : "Sin fecha límite"}
                  </p>
                </div>
              </div>
              <span
                className={`flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                  isCalificada
                    ? "bg-green-100 text-green-800"
                    : isEntregada
                    ? "bg-blue-100 text-blue-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {isCalificada ? (
                  <>
                    <Check size={14} className="mr-1" /> Calificado
                  </>
                ) : isEntregada ? (
                  "Entregado"
                ) : (
                  "Pendiente"
                )}
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  // --- AGREGA ESTA NUEVA FUNCIÓN ---
  // Componente para mostrar la lista de RECURSOS
  const renderRecursosList = () => {
    if (loadingRecursos) return <p>Cargando recursos...</p>;
    if (recursos.length === 0) {
      return (
        <p className="text-gray-500">
          {user.rol === "docente"
            ? "Aún no has subido ningún recurso."
            : "Aún no hay recursos disponibles."}
        </p>
      );
    }
    return (
      <div className="space-y-3">
        {recursos.map((recurso) => {
          const isEnlace = recurso.tipo_recurso === "enlace";
          const Icono = isEnlace ? LinkIcon : Paperclip;
          // Construimos la URL correcta para el enlace/descarga
          const url = isEnlace
            ? recurso.ruta_o_url // Si es enlace, es la URL directa
            : `http://localhost:3001/uploads/recursos/${recurso.ruta_o_url}`; // Si es archivo, construimos la ruta al servidor

          return (
            <div
              key={recurso.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
            >
              {/* Enlace para abrir/descargar */}
              <a
                href={url}
                target="_blank" // Abrir en nueva pestaña
                rel="noopener noreferrer" // Seguridad
                className="flex items-center text-blue-600 hover:underline"
              >
                <Icono className="w-5 h-5 mr-3" />
                <span className="font-medium">{recurso.titulo}</span>
                {/* Mostramos el nombre original solo si es archivo */}
                {!isEnlace && (
                  <span className="text-xs text-gray-500 ml-2">
                    ({recurso.nombre_original})
                  </span>
                )}
              </a>
              {/* Botón de borrar (solo para docente) */}
              {user.rol === "docente" && (
                <button
                  onClick={() => handleDeleteRecurso(recurso.id)} // Llamará a la función (aún vacía)
                  className="text-red-500 hover:text-red-700"
                  title="Eliminar recurso"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Componente de vista (para alumnos y docente cuando no edita)
  const renderView = () => (
    <div className="bg-white p-6 rounded-lg shadow">
      {user.rol === "docente" && (
        <button
          onClick={() => setIsEditing(true)}
          className="flex items-center float-right px-3 py-1 text-sm bg-secundario text-white rounded-md hover:opacity-90"
        >
          <Edit2 size={14} className="mr-1" /> Editar
        </button>
      )}
      {/* Enlace de Videollamada */}
      <h3 className="text-xl font-semibold mb-4 text-gray-800">
        Sesión en Vivo
      </h3>
      {config.enlace_videollamada ? (
        <a
          href={config.enlace_videollamada}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-6 py-3 font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
        >
          <Video size={20} className="mr-2" />
          Entrar a la Clase Virtual
        </a>
      ) : (
        <p className="text-gray-500">
          {user.rol === "alumno"
            ? "El docente aún no ha publicado el enlace de la clase."
            : "Aún no has configurado un enlace para la videollamada."}
        </p>
      )}
      {/* Descripción del Curso */}
      <div className="mt-8 pt-6 border-t">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">
          Acerca del Curso
        </h3>
        {config.descripcion_curso ? (
          <p className="text-gray-700 whitespace-pre-wrap">
            {config.descripcion_curso}
          </p>
        ) : (
          <p className="text-gray-500">
            {user.rol === "alumno"
              ? "El docente aún no ha agregado una descripción."
              : "Aún no has agregado una descripción o mensaje de bienvenida."}
          </p>
        )}
      </div>
      {/* --- INICIA BLOQUE MODIFICADO --- */}
      {/* Dividimos Tareas y Recursos en dos secciones */}
      <div className="mt-8 pt-6 border-t">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-800">
            Tareas y Actividades
          </h3>
          {user.rol === "docente" && (
            <button
              onClick={() => setShowCrearTareaModal(true)}
              className="flex items-center px-4 py-2 font-semibold text-white bg-principal rounded-md hover:opacity-90"
            >
              <Plus size={18} className="mr-2" />
              Crear Tarea
            </button>
          )}
        </div>
        {renderTareasList()}
      </div>{" "}
      {/* <-- Cierre del div de Tareas */}
      {/* --- AGREGA ESTA NUEVA SECCIÓN --- */}
      <div className="mt-8 pt-6 border-t">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-800">
            Material de Clase y Recursos
          </h3>
          {/* --- AGREGA ESTE BOTÓN --- */}
          {user.rol === "docente" && (
            <button
              onClick={() => setShowRecursoModal(true)} // <-- Llama a setState para abrir el modal
              className="flex items-center px-4 py-2 font-semibold text-white bg-secundario rounded-md hover:opacity-90"
            >
              <Plus size={18} className="mr-2" />
              Agregar Recurso
            </button>
          )}
          {/* --- FIN AGREGAR --- */}
        </div>
        {renderRecursosList()}
      </div>
      {/* --- FIN AGREGAR --- */}
      {/* El botón "Ir a Calificación Final" va después */}
      {user.rol === "docente" && (
        <div className="mt-8 pt-6 border-t">{/* ... botón ... */}</div>
      )}
    </div> // <-- Cierre de renderView
  );

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Aula Virtual</h2>
      {isEditing ? renderDocenteForm() : renderView()}

      <CrearTareaModal
        show={showCrearTareaModal}
        onClose={() => setShowCrearTareaModal(false)}
        grupoId={grupoId}
        asignaturaId={asignaturaId}
        onTareaCreada={fetchTareas}
      />

      <EntregarTareaModal
        show={showEntregarModal}
        onClose={() => setShowEntregarModal(false)}
        tarea={selectedTask}
        onEntregaExitosa={fetchTareas}
      />
      {/* --- AGREGA ESTA LLAMADA AL MODAL --- */}
      <AgregarRecursoModal
        show={showRecursoModal} // Controlado por el estado
        onClose={() => setShowRecursoModal(false)} // Función para cerrar
        grupoId={grupoId} // Pasa el ID del grupo
        asignaturaId={asignaturaId} // Pasa el ID de la asignatura
        onRecursoAgregado={fetchRecursos} // Pasa la función para refrescar la lista
      />
      {/* --- FIN AGREGAR --- */}
    </div>
  );
};

// --- INICIA CÓDIGO FALTANTE (AGREGAR) ---

// Modal para crear una nueva tarea (solo Docente)
const CrearTareaModal = ({
  show,
  onClose,
  grupoId,
  asignaturaId,
  onTareaCreada,
}) => {
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fechaLimite, setFechaLimite] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.post(
        `/docente/aula-virtual/${grupoId}/${asignaturaId}/tareas`,
        {
          titulo,
          descripcion,
          fecha_limite: fechaLimite || null,
        }
      );
      onTareaCreada(); // Llama a la función para recargar tareas
      onClose(); // Cierra el modal
      // Limpiamos el formulario
      setTitulo("");
      setDescripcion("");
      setFechaLimite("");
    } catch (error) {
      console.error("Error al crear tarea", error);
      alert("Error al crear la tarea.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
        >
          <X size={24} />
        </button>
        <h3 className="text-2xl font-bold mb-6">Crear Nueva Tarea</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="titulo"
              className="block text-sm font-medium text-gray-700"
            >
              Título de la Tarea
            </label>
            <input
              type="text"
              id="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              required
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-principal focus:border-principal"
            />
          </div>
          <div>
            <label
              htmlFor="descripcion"
              className="block text-sm font-medium text-gray-700"
            >
              Descripción / Instrucciones
            </label>
            <textarea
              id="descripcion"
              rows="5"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-principal focus:border-principal"
            ></textarea>
          </div>
          <div>
            <label
              htmlFor="fechaLimite"
              className="block text-sm font-medium text-gray-700"
            >
              Fecha Límite de Entrega (Opcional)
            </label>
            <input
              type="datetime-local"
              id="fechaLimite"
              value={fechaLimite}
              onChange={(e) => setFechaLimite(e.target.value)}
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-principal focus:border-principal"
            />
          </div>
          <div className="flex justify-end space-x-4 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-principal text-white rounded-md hover:opacity-90 disabled:bg-gray-400"
            >
              {isSaving ? "Creando..." : "Crear Tarea"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- TERMINA CÓDIGO FALTANTE ---
// --- INICIA NUEVO CÓDIGO (AGREGAR) ---

// Modal para entregar una tarea (solo Alumno)
const EntregarTareaModal = ({ show, onClose, tarea, onEntregaExitosa }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [comentario, setComentario] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  // Reseteamos el estado cuando el modal se cierra o cambia de tarea
  useEffect(() => {
    if (show) {
      setComentario(tarea.comentario_alumno || "");
      setSelectedFile(null);
      setError("");
    }
  }, [show, tarea]);

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setError("Por favor, selecciona un archivo para subir.");
      return;
    }
    setIsUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("archivo_tarea", selectedFile);
    formData.append("comentario_alumno", comentario);

    try {
      await api.post(
        `/alumno/aula-virtual/tarea/${tarea.id}/entregar`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      onEntregaExitosa(); // Recarga la lista de tareas
      onClose(); // Cierra el modal
    } catch (error) {
      console.error("Error al subir la tarea", error);
      setError("Error al subir el archivo. Inténtalo de nuevo.");
    } finally {
      setIsUploading(false);
    }
  };

  if (!show || !tarea) return null;

  const isEntregada = !!tarea.entrega_id;
  const isCalificada = tarea.calificacion !== null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
        >
          <X size={24} />
        </button>
        <h3 className="text-2xl font-bold mb-2">{tarea.titulo}</h3>
        <p className="text-sm text-gray-600 mb-4 whitespace-pre-wrap">
          {tarea.descripcion}
        </p>
        {tarea.fecha_limite && (
          <p className="text-sm font-semibold text-red-600 mb-6">
            Fecha límite: {new Date(tarea.fecha_limite).toLocaleString()}
          </p>
        )}

        {/* --- Sección de Estado Actual --- */}
        {isEntregada && (
          <div className="bg-gray-100 p-4 rounded-md mb-6 border border-gray-200">
            <h4 className="font-semibold text-gray-800">Tu Entrega Actual:</h4>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Estado:</span>
              <span
                className={`ml-2 font-semibold ${
                  isCalificada ? "text-green-600" : "text-blue-600"
                }`}
              >
                {isCalificada ? "Calificada" : "Entregada"}
              </span>
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Fecha:</span>{" "}
              {new Date(tarea.fecha_entrega).toLocaleString()}
            </p>
            {isCalificada && (
              <p className="text-sm text-gray-600">
                <span className="font-medium">Calificación:</span>{" "}
                <span className="font-bold text-lg text-principal">
                  {tarea.calificacion}
                </span>
                / 100
              </p>
            )}
          </div>
        )}

        {/* --- Formulario de Entrega --- */}
        {!isCalificada ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <h4 className="font-semibold text-gray-800">
              {isEntregada ? "Subir una nueva versión" : "Subir tu archivo"}
            </h4>
            <div>
              <label
                htmlFor="archivo_tarea"
                className="block text-sm font-medium text-gray-700"
              >
                Selecciona tu archivo (PDF, Word, ZIP, etc.)
              </label>
              <input
                type="file"
                id="archivo_tarea"
                onChange={handleFileChange}
                required={!isEntregada} // Solo requerido si es la primera entrega
                className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label
                htmlFor="comentario_alumno"
                className="block text-sm font-medium text-gray-700"
              >
                Comentario (Opcional)
              </label>
              <textarea
                id="comentario_alumno"
                rows="3"
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="Ej. 'Profe, tuve un problema con la pregunta 3...'"
                className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md"
              ></textarea>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end space-x-4 mt-8">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isUploading}
                className="flex items-center px-4 py-2 bg-principal text-white rounded-md hover:opacity-90 disabled:bg-gray-400"
              >
                <UploadCloud size={18} className="mr-2" />
                {isUploading
                  ? "Subiendo..."
                  : isEntregada
                  ? "Actualizar Entrega"
                  : "Entregar Tarea"}
              </button>
            </div>
          </form>
        ) : (
          <p className="text-center font-semibold text-green-700">
            Esta tarea ya ha sido calificada. No se pueden realizar más
            entregas.
          </p>
        )}
      </div>
    </div>
  );
};
// --- INICIA NUEVO CÓDIGO (AGREGAR) ---

// Modal para Calificar una entrega (solo Docente)
const CalificarEntregaModal = ({
  show,
  onClose,
  entrega,
  onCalificacionExitosa,
}) => {
  const [calificacion, setCalificacion] = useState("");
  const [comentarioDocente, setComentarioDocente] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  // Sincronizamos el estado con la entrega seleccionada
  useEffect(() => {
    if (entrega) {
      // ESTA ES LA CORRECCIÓN:
      // Maneja null, undefined y el número 0 correctamente
      setCalificacion(
        entrega.calificacion !== null && entrega.calificacion !== undefined
          ? String(entrega.calificacion) // Convertimos 80 a "80" y 0 a "0"
          : "" // Convertimos null/undefined a ""
      );
      setComentarioDocente(entrega.comentario_docente || "");
      setError("");
    }
  }, [entrega]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!calificacion) {
      setError("La calificación es un campo requerido.");
      return;
    }
    setIsSaving(true);
    setError("");

    try {
      await api.post(
        `/docente/aula-virtual/entrega/${entrega.entrega_id}/calificar`,
        {
          calificacion: calificacion,
          comentario_docente: comentarioDocente,
        }
      );
      onCalificacionExitosa(); // Recarga la lista de entregas
      onClose(); // Cierra el modal
    } catch (error) {
      console.error("Error al guardar calificación", error);
      setError(
        error.response?.data?.message || "Error al guardar. Inténtalo de nuevo."
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (!show || !entrega) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
        >
          <X size={24} />
        </button>
        <h3 className="text-2xl font-bold mb-4">Calificar Entrega</h3>
        <p className="text-lg font-semibold text-gray-800">
          {entrega.nombre} {entrega.apellido_paterno}
        </p>

        {/* --- Sección de Entrega del Alumno --- */}
        <div className="bg-gray-50 p-4 rounded-md my-4 border">
          <h4 className="font-semibold text-gray-700">Archivo del Alumno</h4>
          <a
            href={`http://localhost:3001/uploads/tareas/tarea_${entrega.tarea_id}/${entrega.ruta_archivo}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center text-blue-600 hover:underline my-2"
          >
            <Download size={16} className="mr-2" />
            {entrega.nombre_original}
          </a>
          <p className="text-sm text-gray-500">
            Entregado: {new Date(entrega.fecha_entrega).toLocaleString()}
          </p>
          {entrega.comentario_alumno && (
            <div className="mt-2 pt-2 border-t">
              <p className="text-sm font-medium text-gray-700">
                Comentario del Alumno:
              </p>
              <p className="text-sm text-gray-600 italic">
                "{entrega.comentario_alumno}"
              </p>
            </div>
          )}
        </div>

        {/* --- Formulario de Calificación --- */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="calificacion"
              className="block text-sm font-medium text-gray-700"
            >
              Calificación (0-100)
            </label>
            <input
              type="number"
              id="calificacion"
              value={calificacion}
              onChange={(e) => setCalificacion(e.target.value)}
              required
              min="0"
              max="100"
              step="0.1"
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label
              htmlFor="comentario_docente"
              className="block text-sm font-medium text-gray-700"
            >
              Comentario de Retroalimentación (Opcional)
            </label>
            <textarea
              id="comentario_docente"
              rows="4"
              value={comentarioDocente}
              onChange={(e) => setComentarioDocente(e.target.value)}
              placeholder="Ej. 'Buen trabajo, solo cuida la ortografía...'"
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md"
            ></textarea>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end space-x-4 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center px-4 py-2 bg-principal text-white rounded-md hover:opacity-90 disabled:bg-gray-400"
            >
              <Award size={18} className="mr-2" />
              {isSaving ? "Guardando..." : "Guardar Calificación"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- AGREGA ESTE COMPONENTE MODAL COMPLETO ---
// Modal para Agregar Recurso (solo Docente)
const AgregarRecursoModal = ({
  show,
  onClose,
  grupoId,
  asignaturaId,
  onRecursoAgregado, // Callback para refrescar la lista
}) => {
  const [tipo, setTipo] = useState("enlace"); // 'enlace' o 'archivo'
  const [titulo, setTitulo] = useState("");
  const [url, setUrl] = useState("");
  const [archivo, setArchivo] = useState(undefined); // Estado para el archivo seleccionado
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  // Resetea el formulario al abrir/cerrar
  const resetForm = () => {
    setTitulo("");
    setUrl("");
    setArchivo(undefined); // Reinicia archivo a undefined
    setError("");
    setTipo("enlace"); // Vuelve a la pestaña 'enlace' por defecto
  };

  const handleClose = () => {
    resetForm();
    onClose(); // Llama a la función onClose pasada por props
  };

  // Maneja el envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); // Limpia errores anteriores

    // --- Validación ---
    if (!titulo) {
      setError("El título es requerido.");
      return;
    }
    if (tipo === "enlace" && !url) {
      setError("La URL es requerida para un enlace.");
      return;
    }
    if (tipo === "archivo" && !archivo) {
      setError("Debe seleccionar un archivo.");
      return;
    }
    // --- Fin Validación ---

    setIsSaving(true); // Empieza a guardar

    try {
      // Si es un enlace
      if (tipo === "enlace") {
        await api.post(
          `/docente/aula-virtual/${grupoId}/${asignaturaId}/recurso-enlace`,
          { titulo, url } // Envía título y url
        );
      }
      // Si es un archivo
      else {
        const formData = new FormData(); // Necesario para enviar archivos
        formData.append("titulo", titulo);
        formData.append("archivo_recurso", archivo); // Adjunta el archivo
        await api.post(
          `/docente/aula-virtual/${grupoId}/${asignaturaId}/recurso-archivo`,
          formData, // Envía el FormData
          { headers: { "Content-Type": "multipart/form-data" } } // Header importante
        );
      }

      // --- Éxito ---
      onRecursoAgregado(); // Llama a la función para refrescar la lista de recursos
      handleClose(); // Cierra el modal si todo salió bien
    } catch (error) {
      // --- Error de API ---
      console.error("Error al agregar recurso", error);
      setError(
        error.response?.data?.message || "Error al guardar. Inténtalo de nuevo."
      );
    } finally {
      // --- Siempre se ejecuta ---
      setIsSaving(false); // Termina el estado de guardado
    }
  };

  // No renderiza nada si 'show' es falso
  if (!show) return null;

  return (
    // Fondo oscuro y contenedor del modal
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 relative">
        {/* Botón de cerrar (X) */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
        >
          <X size={24} />
        </button>
        <h3 className="text-2xl font-bold mb-6">Agregar Recurso</h3>

        {/* Pestañas para elegir tipo */}
        <div className="flex mb-4 border-b">
          <button
            onClick={() => setTipo("enlace")}
            className={`flex items-center px-4 py-2 font-semibold ${
              tipo === "enlace"
                ? "border-b-2 border-principal text-principal" // Estilo activo
                : "text-gray-500 hover:text-gray-700" // Estilo inactivo
            }`}
          >
            <LinkIcon size={18} className="mr-2" /> Enlace (Video, Web)
          </button>
          <button
            onClick={() => setTipo("archivo")}
            className={`flex items-center px-4 py-2 font-semibold ${
              tipo === "archivo"
                ? "border-b-2 border-principal text-principal" // Estilo activo
                : "text-gray-500 hover:text-gray-700" // Estilo inactivo
            }`}
          >
            <Paperclip size={18} className="mr-2" /> Archivo (PDF, PPT)
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Campo Título (común a ambos tipos) */}
          <div>
            <label
              htmlFor="recurso_titulo"
              className="block text-sm font-medium text-gray-700"
            >
              Título (Ej. "Video de la Semana 1" o "Lectura PDF")
            </label>
            <input
              type="text"
              id="recurso_titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              required
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md"
            />
          </div>

          {/* Campo URL (solo si tipo es 'enlace') */}
          {tipo === "enlace" ? (
            <div>
              <label
                htmlFor="recurso_url"
                className="block text-sm font-medium text-gray-700"
              >
                URL (Enlace)
              </label>
              <input
                type="url"
                id="recurso_url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://youtube.com/..."
                required
                className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md"
              />
            </div>
          ) : (
            // Campo Archivo (solo si tipo es 'archivo')
            <div>
              <label
                htmlFor="recurso_archivo"
                className="block text-sm font-medium text-gray-700"
              >
                Subir Archivo
              </label>
              <input
                type="file"
                id="recurso_archivo"
                // Actualiza el estado 'archivo' cuando se selecciona uno
                onChange={(e) => setArchivo(e.target.files[0])}
                required
                className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md"
              />
            </div>
          )}

          {/* Muestra mensaje de error si existe */}
          {error && <p className="text-sm text-red-600">{error}</p>}

          {/* Botones de acción */}
          <div className="flex justify-end space-x-4 mt-8">
            <button
              type="button" // Importante: type="button" para no enviar el form
              onClick={handleClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            >
              Cancelar
            </button>
            <button
              type="submit" // Este sí envía el form
              disabled={isSaving} // Deshabilitado mientras guarda
              className="flex items-center px-4 py-2 bg-principal text-white rounded-md hover:opacity-90 disabled:bg-gray-400"
            >
              <Plus size={18} className="mr-2" />
              {isSaving ? "Guardando..." : "Agregar Recurso"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
// --- FIN AGREGAR ---

// Página de Detalles de Tarea (solo Docente)
const DetalleTareaDocentePage = () => {
  const { grupoId, asignaturaId, tareaId } = useParams();
  const [tarea, setTarea] = useState(null);
  const [entregas, setEntregas] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Estado para el modal de calificación
  const [showCalificarModal, setShowCalificarModal] = useState(false);
  const [selectedEntrega, setSelectedEntrega] = useState(null);

  // Función para cargar los detalles
  const fetchDetallesTarea = useCallback(async () => {
    try {
      const { data } = await api.get(
        `/docente/aula-virtual/tarea/${tareaId}/entregas`
      );
      setTarea(data.tarea);
      setEntregas(data.entregas);
    } catch (error) {
      console.error("Error al cargar detalles de la tarea", error);
      alert("No se pudieron cargar los detalles.");
    } finally {
      setLoading(false);
    }
  }, [tareaId]);

  useEffect(() => {
    fetchDetallesTarea();
  }, [fetchDetallesTarea]);

  // Abre el modal con la entrega seleccionada
  const handleOpenCalificarModal = (entrega) => {
    // Añadimos el ID de la tarea a la entrega para el link de descarga
    const entregaConInfo = { ...entrega, tarea_id: tarea.id };
    setSelectedEntrega(entregaConInfo);
    setShowCalificarModal(true);
  };

  if (loading) return <p>Cargando detalles de la tarea...</p>;
  if (!tarea) return <p>Tarea no encontrada.</p>;

  const totalAlumnos = entregas.length;
  const totalEntregas = entregas.filter((e) => e.entrega_id).length;
  const totalCalificadas = entregas.filter((e) => e.calificacion).length;

  return (
    <div>
      <Link
        to={`/docente/grupo/${grupoId}/asignatura/${asignaturaId}/aula`}
        className="flex items-center text-principal mb-6 hover:underline"
      >
        <ArrowLeft size={18} className="mr-2" />
        Volver al Aula Virtual
      </Link>
      <h2 className="text-3xl font-bold text-gray-800 mb-2">{tarea.titulo}</h2>
      <p className="text-gray-600 mb-6 whitespace-pre-wrap">
        {tarea.descripcion}
      </p>

      {/* --- Resumen de Entregas --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm font-medium text-gray-500">Alumnos en Grupo</p>
          <p className="text-2xl font-bold text-gray-800">{totalAlumnos}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm font-medium text-gray-500">
            Entregas Recibidas
          </p>
          <p className="text-2xl font-bold text-blue-600">{totalEntregas}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm font-medium text-gray-500">
            Tareas Calificadas
          </p>
          <p className="text-2xl font-bold text-green-600">
            {totalCalificadas}
          </p>
        </div>
      </div>

      {/* --- Tabla de Alumnos y Entregas --- */}
      <div className="bg-white p-6 rounded-lg shadow overflow-x-auto">
        <h3 className="text-xl font-bold mb-4">Entregas de Alumnos</h3>
        <table className="w-full table-auto text-sm">
          <thead className="text-left bg-gray-50">
            <tr>
              <th className="px-4 py-2">Alumno</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2">Archivo</th>
              <th className="px-4 py-2">Calificación</th>
              <th className="px-4 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {entregas.map((entrega) => (
              <tr key={entrega.alumno_id} className="border-b">
                <td className="px-4 py-2 font-medium">
                  {entrega.nombre} {entrega.apellido_paterno}
                </td>
                <td className="px-4 py-2">
                  {entrega.entrega_id ? (
                    <span className="text-blue-600 font-semibold">
                      Entregado
                    </span>
                  ) : (
                    <span className="text-gray-500">Pendiente</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  {entrega.entrega_id ? (
                    <a
                      href={`http://localhost:3001/uploads/tareas/tarea_${tarea.id}/${entrega.ruta_archivo}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-blue-600 hover:underline"
                    >
                      <Download size={14} className="mr-1" />
                      {entrega.nombre_original}
                    </a>
                  ) : (
                    "N/A"
                  )}
                </td>
                <td className="px-4 py-2">
                  {entrega.calificacion ? (
                    <span className="font-bold text-lg text-principal">
                      {entrega.calificacion}
                    </span>
                  ) : (
                    "Sin calificar"
                  )}
                </td>
                <td className="px-4 py-2">
                  {entrega.entrega_id ? (
                    <button
                      onClick={() => handleOpenCalificarModal(entrega)}
                      className="px-3 py-1 text-sm font-medium text-white bg-secundario rounded-md hover:opacity-90"
                    >
                      {entrega.calificacion ? "Re-calificar" : "Calificar"}
                    </button>
                  ) : (
                    <span className="text-gray-400">--</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- El Modal de Calificación --- */}
      <CalificarEntregaModal
        show={showCalificarModal}
        onClose={() => setShowCalificarModal(false)}
        entrega={selectedEntrega}
        onCalificacionExitosa={fetchDetallesTarea} // Recarga los datos
      />
    </div>
  );
};

// --- COMPONENTE PRINCIPAL DE LA APP ---
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/unauthorized"
            element={
              <div className="flex h-screen flex-col items-center justify-center">
                <h1>Acceso Denegado</h1>
                <p>No tienes los permisos para ver esta página.</p>
              </div>
            }
          />

          {/* Rutas de Administrador */}
          <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
            <Route element={<AdminLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/asignaturas" element={<AsignaturasPage />} />
              <Route path="/usuarios" element={<UsuariosPage />} />
              <Route
                path="/usuarios/aspirante/:id"
                element={<DetalleAspirantePage />}
              />
              <Route path="/grupos" element={<GruposPage />} />
              <Route path="/grupos/:id" element={<DetalleGrupoPage />} />
              <Route path="/migrar-grupos" element={<MigracionGruposPage />} />
              <Route
                path="/admin/grupo/:grupoId/asignatura/:asignaturaId"
                element={<AdminCalificarPage />}
              />
              {/* --- INICIO DE NUEVAS RUTAS DE CATÁLOGO --- */}
              <Route
                path="/ciclos"
                element={
                  <CatalogoPage
                    title="Ciclos Escolares"
                    apiEndpoint="ciclos"
                    fields={[
                      {
                        name: "nombre_ciclo",
                        placeholder: "Nombre del Ciclo (ej. 2025-1)",
                      },
                    ]}
                    columns={[{ key: "nombre_ciclo", header: "Nombre" }]}
                  />
                }
              />
              <Route
                path="/planes-estudio"
                element={
                  <CatalogoPage
                    title="Planes de Estudio"
                    apiEndpoint="planes_estudio"
                    fields={[
                      {
                        name: "nombre_plan",
                        placeholder: "Nombre del Plan (ej. Ing. Software 2025)",
                      },
                    ]}
                    columns={[{ key: "nombre_plan", header: "Nombre" }]}
                  />
                }
              />
              <Route
                path="/grados"
                element={
                  <CatalogoPage
                    title="Grados/Semestres"
                    apiEndpoint="grados"
                    fields={[
                      {
                        name: "nombre_grado",
                        placeholder: "Nombre del Grado (ej. 1er Cuatrimestre)",
                      },
                    ]}
                    columns={[{ key: "nombre_grado", header: "Nombre" }]}
                  />
                }
              />
              {/* --- FIN DE NUEVAS RUTAS --- */}
              <Route
                path="/carreras"
                element={
                  <CatalogoPage
                    title="Carreras"
                    apiEndpoint="carreras"
                    fields={[
                      {
                        name: "nombre_carrera",
                        placeholder: "Nombre de la Carrera",
                      },
                    ]}
                    columns={[{ key: "nombre_carrera", header: "Nombre" }]}
                  />
                }
              />
              <Route
                path="/sedes"
                element={
                  <CatalogoPage
                    title="Sedes"
                    apiEndpoint="sedes"
                    fields={[
                      { name: "nombre_sede", placeholder: "Nombre de la Sede" },
                      {
                        name: "direccion",
                        placeholder: "Dirección (Opcional)",
                        type: "text",
                      },
                    ]}
                    columns={[
                      { key: "nombre_sede", header: "Nombre" },
                      { key: "direccion", header: "Dirección" },
                    ]}
                  />
                }
              />
            </Route>
          </Route>

          {/* Rutas de Docente */}
          <Route element={<ProtectedRoute allowedRoles={["docente"]} />}>
            <Route element={<DocenteLayout />}>
              <Route
                path="/docente/dashboard"
                element={<DocenteDashboardPage />}
              />
              <Route
                path="/docente/grupo/:grupoId/asignatura/:asignaturaId"
                element={<DetalleCursoDocentePage />}
              />
              <Route
                path="/docente/grupo/:grupoId/asignatura/:asignaturaId"
                element={<DetalleCursoDocentePage />}
              />
              {/* --- AGREGA ESTA LÍNEA (DOCENTE) --- */}
              <Route
                path="/docente/grupo/:grupoId/asignatura/:asignaturaId/aula"
                element={<AulaVirtualPage />}
              />
              {/* --- AGREGA ESTA LÍNEA (DOCENTE) --- */}
              <Route
                path="/docente/grupo/:grupoId/asignatura/:asignaturaId/tarea/:tareaId"
                element={<DetalleTareaDocentePage />}
              />
            </Route>
          </Route>

          {/* --- AÑADE ESTE BLOQUE COMPLETO --- */}
          {/* Rutas de Alumno */}
          <Route element={<ProtectedRoute allowedRoles={["alumno"]} />}>
            <Route element={<AlumnoLayout />}>
              <Route
                path="/alumno/dashboard"
                element={<AlumnoDashboardPage />}
              />
              <Route
                path="/alumno/dashboard"
                element={<AlumnoDashboardPage />}
              />
              {/* --- AGREGA ESTA LÍNEA (ALUMNO) --- */}
              <Route
                path="/alumno/grupo/:grupoId/asignatura/:asignaturaId/aula"
                element={<AulaVirtualPage />}
              />
            </Route>
          </Route>
          {/* --- FIN DEL BLOQUE AÑADIDO --- */}

          {/* --- AÑADE ESTE BLOQUE COMPLETO --- */}
          {/* Rutas de Aspirante */}
          <Route element={<ProtectedRoute allowedRoles={["aspirante"]} />}>
            <Route element={<AspiranteLayout />}>
              <Route
                path="/aspirante/dashboard"
                element={<AspiranteDashboardPage />}
              />
            </Route>
          </Route>
          {/* --- FIN DEL BLOQUE AÑADIDO --- */}

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
