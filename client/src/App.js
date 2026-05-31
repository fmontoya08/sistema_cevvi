import CorreoPage from "./pages/CorreoAdminPage";
import RegistroPage from "./pages/RegistroPage";
import RegistroDocentePage from "./pages/RegistroDocentePage";
import ExploradorArchivos from "./pages/ExploradorArchivos";
import MiDrivePage from "./pages/MiDrivePage";
// --- IMPORTACIONES NUEVAS PARA EL AULA VIRTUAL ---
import MuroDocentePage from "./pages/MuroDocentePage";

import CrearExamenPage from "./pages/CrearExamenPage";
import EditarExamenPage from "./pages/EditarExamenPage";
import AnaliticasGrupoPage from "./pages/AnaliticasGrupoPage";
import TomarExamenPage from "./pages/TomarExamenPage";
import ExamenesPage from "./pages/ExamenesPage"; // <--- IMPORTANTE
import ResultadosExamenPage from "./pages/ResultadosExamenPage";
import RevisarExamenPage from "./pages/RevisarExamenPage";
import PizarraPage from "./pages/PizarraPage";
import ClaseEnVivoPage from "./pages/ClaseEnVivoPage";
import TutorialGuide from "./components/TutorialGuide"; // Asegúrate de crear la carpeta components
import RegistroControlEscolarPage from "./pages/RegistroControlEscolarPage";

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
  Download, // <-- NUEVO
  Award, // <-- NUEVO
  Link as LinkIcon, // <-- NUEVO (con alias para no chocar con <Link> de react-router)
  Paperclip, // <-- NUEVO
  ClipboardCheck, // <-- NUEVO
  History, // <-- NUEVO
  MessageSquare, // <-- NUEVO
  Send, // <-- NUEVO
  DollarSign, // <-- AÑADIR
  ClipboardEdit, // <-- AÑADIR
  RotateCcw,
  FilePlus, // <-- AÑADIR
  FileCheck, // <-- AÑADIR
  FileClock, // <-- AÑADIR
  FileX, // <-- AÑADIR
  Eye,

  Search,
  GitBranch, // <--- NUEVO

  Briefcase, // Para Docentes
  Mail, // Para tabla de usuarios
  Phone, // Para tabla de usuarios
  Zap,
  ArrowRightCircle,
  Clock,
  Tag,
  Menu,
  User,
  Lock,
  Camera,
  BookOpen,
  AlertCircle,
  Loader,
  Folder,
  PlusCircle,
  MonitorSmartphone,
  PenTool, // <-- NUEVO PARA LA PIZARRA
  Megaphone,
  Library,
  AlertOctagon,
  UserCheck,
  XCircle,
} from "lucide-react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import esLocale from "@fullcalendar/core/locales/es";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale, // <<< Asegúrate que esta línea exista
  BarElement,
  Title,
} from "chart.js";

// Esta es la línea importante de registro:
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale, // <<< ¡CONFIRMA que 'LinearScale' esté aquí!
  BarElement,
  Title,
);

// --- CONFIGURACIÓN DE MARCA Y COLORES ---
const BRAND = {
  name: "Centro Universitario Siglo XXI", // O el nombre de tu escuela
  logo: "plataforma/logo.png",
  colors: {
    primary: "#a72a34", // Rojo Vino (Botones, Headers activos)
    secondary: "#bb9a5a", // Dorado (Iconos, Detalles)
    bgPrimary: "bg-[#a72a34]",
    bgSecondary: "bg-[#bb9a5a]",
    textPrimary: "text-[#a72a34]",
    textSecondary: "text-[#bb9a5a]",
    borderPrimary: "border-[#a72a34]",
  },
};

// --- CONFIGURACIÓN DE AXIOS ---
const api = axios.create({
  baseURL: "https://api-universidad-c5o8.onrender.com/api",
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
  },
);

// Interceptor de RESPUESTA (para manejar errores)
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // CORRECCIÓN PUNTO 4: Si el error viene del intento de Login, NO recargamos la página.
    if (error.config && error.config.url.includes("/login")) {
      return Promise.reject(error);
    }

    if (
      error.response &&
      (error.response.status === 401 || error.response.status === 403)
    ) {
      console.warn("Token no válido o sesión expirada. Redirigiendo al login.");
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      if (window.location.pathname !== "/login") {
        window.location.href = "plataforma/login";
      }
    }
    return Promise.reject(error);
  },
);
// --- FIN DEL NUEVO BLOQUE ---

// --- CONTEXTO DE AUTENTICACIÓN ---
export const AuthContext = createContext(null);

// --- COMPONENTE CALENDARIO ADMIN (Gestión de Semáforo y Avisos) ---
const CalendarioAdmin = () => {
  const [eventos, setEventos] = useState([]);

  useEffect(() => {
    cargarEventos();
  }, []);

  const cargarEventos = async () => {
    try {
      const res = await api.get("/eventos-admin");
      // Mapeamos los tipos de base de datos a los colores visuales
      const eventosConColor = res.data.map((e) => {
        let color = "#3788d8"; // Azul default (Aviso General)

        // Asignamos colores según el tipo guardado
        if (e.modalidad === "si_clases") color = "#86efac"; // Verde Claro
        if (e.modalidad === "no_clases") color = "#ef4444"; // Rojo
        if (e.modalidad === "asincrona") color = "#3b82f6"; // Azul Fuerte
        if (e.modalidad === "vacaciones") color = "#facc15"; // Amarillo

        return {
          ...e,
          color,
          textColor: e.modalidad === "vacaciones" ? "black" : "white",
        };
      });
      setEventos(eventosConColor);
    } catch (error) {
      console.error("Error cargando calendario");
    }
  };

  const handleDateClick = async (arg) => {
    // 1. Preguntar Título (Opcional si es solo marcar el día)
    let titulo = prompt(
      "📅 Título del evento o aviso (Dejar vacío para solo colorear el día):",
    );

    // 2. Preguntar Tipo de Día (Semáforo)
    const tipo = prompt(
      "Selecciona el tipo de día (Escribe el número):\n" +
        "1. ✅ SI hay clases (Verde)\n" +
        "2. ⛔ NO hay clases (Rojo)\n" +
        "3. 🔵 Clase Asíncrona (Azul)\n" +
        "4. 🏖️ Semana Santa/Pascua (Amarillo)\n" +
        "5. 📢 Aviso General (Texto)",
      "1",
    );

    if (!tipo) return;

    // Mapeamos la selección del admin a códigos para la BD
    let modalidadBD = "general";
    let tituloFinal = titulo;

    switch (tipo) {
      case "1":
        modalidadBD = "si_clases";
        if (!titulo) tituloFinal = "SI HAY CLASES";
        break;
      case "2":
        modalidadBD = "no_clases";
        if (!titulo) tituloFinal = "NO HAY CLASES";
        break;
      case "3":
        modalidadBD = "asincrona";
        if (!titulo) tituloFinal = "CLASE ASÍNCRONA";
        break;
      case "4":
        modalidadBD = "vacaciones";
        if (!titulo) tituloFinal = "VACACIONES";
        break;
      case "5":
        modalidadBD = "general"; // Aviso normal
        if (!titulo)
          return alert("Para un aviso general debes poner un título.");
        break;
      default:
        return;
    }

    try {
      await api.post("/eventos-admin", {
        title: tituloFinal,
        start: `${arg.dateStr}T12:00:00`,
        modalidad: modalidadBD,
      });
      cargarEventos();
    } catch (error) {
      alert("Error al guardar ❌");
    }
  };

  const handleEventClick = async (info) => {
    if (window.confirm(`¿Eliminar "${info.event.title}"?`)) {
      try {
        await api.delete(
          `/eventos-admin/${info.event.extendedProps.id || info.event.id}`,
        );
        info.event.remove();
      } catch (error) {
        alert("Error al eliminar");
      }
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-lg m-4">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-gray-800">
        <Calendar className="text-[#a72a34]" /> Gestión de Calendario Escolar
      </h2>

      {/* LEYENDA VISUAL PARA EL ADMIN */}
      <div className="flex flex-wrap gap-4 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-[#86efac] rounded border border-gray-300"></div>
          <span className="text-xs font-bold text-gray-600">Si Hay Clases</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-[#ef4444] rounded border border-gray-300"></div>
          <span className="text-xs font-bold text-gray-600">No Hay Clases</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-[#3b82f6] rounded border border-gray-300"></div>
          <span className="text-xs font-bold text-gray-600">
            Clase Asíncrona
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-[#facc15] rounded border border-gray-300"></div>
          <span className="text-xs font-bold text-gray-600">
            Semana Santa/Pascua
          </span>
        </div>
      </div>

      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        locale={esLocale}
        events={eventos}
        dateClick={handleDateClick}
        eventClick={handleEventClick}
        height="auto"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,dayGridWeek",
        }}
      />
    </div>
  );
};

// --- COMPONENTE CALENDARIO ALUMNO/DOCENTE (Lectura + Leyenda) ---
const CalendarioAlumno = () => {
  const [eventos, setEventos] = useState([]);

  useEffect(() => {
    cargarEventos();
  }, []);

  const cargarEventos = async () => {
    try {
      const res = await api.get("/eventos-alumno");

      const eventosConColor = res.data.map((e) => {
        let color = "#3788d8"; // Default
        let textColor = "white";

        if (e.modalidad === "si_clases") color = "#86efac"; // Verde
        if (e.modalidad === "no_clases") color = "#ef4444"; // Rojo
        if (e.modalidad === "asincrona") color = "#3b82f6"; // Azul
        if (e.modalidad === "vacaciones") {
          color = "#facc15"; // Amarillo
          textColor = "black"; // Texto negro para contraste
        }

        return { ...e, color, textColor };
      });
      setEventos(eventosConColor);
    } catch (error) {
      console.error("Error cargando calendario");
    }
  };

  const handleEventClick = (info) => {
    alert(`📅 ${info.event.title}`);
  };

  return (
    <div
      id="tour-calendario-header"
      className="p-6 bg-white rounded-xl shadow-lg m-4"
    >
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-gray-800">
        <Calendar className="text-blue-600" /> Calendario Escolar
      </h2>

      <div id="tour-calendario-vista">
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale={esLocale}
          events={eventos}
          eventClick={handleEventClick}
          height="auto"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "",
          }}
        />
      </div>

      {/* --- LEYENDA (TIPO IMAGEN) --- */}
      <div id="tour-calendario-leyenda" className="mt-8 flex justify-center">
        <div className="border border-gray-300 rounded-lg overflow-hidden text-sm font-bold shadow-sm max-w-md w-full">
          {/* Fila Verde */}
          <div className="flex border-b border-gray-200">
            <div className="w-16 h-10 bg-[#86efac] border-r border-gray-200"></div>
            <div className="flex-1 flex items-center justify-center p-2 bg-white text-gray-700">
              SI HAY CLASES
            </div>
          </div>
          {/* Fila Roja */}
          <div className="flex border-b border-gray-200">
            <div className="w-16 h-10 bg-[#ef4444] border-r border-gray-200"></div>
            <div className="flex-1 flex items-center justify-center p-2 bg-white text-gray-700">
              NO HAY CLASE
            </div>
          </div>
          {/* Fila Azul */}
          <div className="flex border-b border-gray-200">
            <div className="w-16 h-10 bg-[#3b82f6] border-r border-gray-200"></div>
            <div className="flex-1 flex items-center justify-center p-2 bg-white text-gray-700">
              CLASE ASÍNCRONA
            </div>
          </div>
          {/* Fila Amarilla */}
          <div className="flex">
            <div className="w-16 h-10 bg-[#facc15] border-r border-gray-200"></div>
            <div className="flex-1 flex items-center justify-center p-2 bg-white text-gray-700">
              SEMANA SANTA Y PASCUA
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
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

      if (userData.rol === "admin" || userData.rol === "control_escolar") {
        navigate("/dashboard"); // Ambos usan el mismo panel inicial
      } else if (userData.rol === "docente") {
        navigate("/docente/dashboard");
      } else if (userData.rol === "alumno") {
        navigate("/alumno/dashboard");
      } else if (userData.rol === "aspirante") {
        navigate("/aspirante/dashboard");
      } else {
        navigate("/login");
      }
    },
    [navigate],
  );

  const logout = useCallback(() => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setUser(null);
    navigate("/login");
  }, [navigate]);

  // --- AGREGA ESTA FUNCIÓN ---
  const updateProfilePic = useCallback((newPicUrl) => {
    setUser((currentUser) => {
      if (!currentUser) return null; // Si no hay usuario, no hagas nada
      const updatedUser = { ...currentUser, foto_perfil: newPicUrl };
      localStorage.setItem("user", JSON.stringify(updatedUser)); // Actualiza localStorage
      return updatedUser; // Actualiza el estado
    });
  }, []);
  // --- FIN AGREGAR ---

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      updateProfilePic,
    }),
    [user, loading, login, logout, updateProfilePic],
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
      await api.put(`/notificaciones/${notif.id}/marcar-leida`);
      fetchNotifications();
      setIsOpen(false);

      // CORRECCIÓN: El backend lo envía como 'link' gracias al alias (url_destino as link)
      const rutaDestino = notif.link || notif.url_destino;

      if (rutaDestino) {
        navigate(rutaDestino);
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

// --- ADMIN LAYOUT RESPONSIVE (CELULAR + PC) ---
const AdminLayout = () => {
  const location = useLocation();
  const { logout, user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cicloActual, setCicloActual] = useState("Cargando...");

  useEffect(() => {
    api
      .get("/ciclo-actual")
      .then((res) => setCicloActual(res.data.nombre))
      .catch(() => setCicloActual("Sin Asignar"));
  }, []);

  const navItems = [
    {
      icon: Home,
      label: "Dashboard",
      path: "/dashboard",
      roles: ["admin", "control_escolar"],
    },
    {
      icon: Megaphone,
      label: "Avisos Escolares",
      path: "/admin/anuncios",
      roles: ["admin", "control_escolar"],
    },
    {
      icon: Users,
      label: "Usuarios",
      path: "/usuarios",
      roles: ["admin", "control_escolar"],
    },
    {
      icon: UserCheck,
      label: "Revisar Aspirantes",
      path: "/admin/aspirantes/revision",
      roles: ["admin", "control_escolar"],
    },
    {
      icon: Calendar,
      label: "Calendario",
      path: "/admin/calendario",
      roles: ["admin", "control_escolar"],
    },
    {
      icon: Mail,
      label: "Correo Institucional",
      path: "/admin/correo",
      roles: ["admin", "control_escolar"],
    },
    {
      icon: Mail,
      label: "Directorio Correos",
      path: "/admin/correos-institucionales",
      roles: ["admin", "control_escolar"],
    },
    {
      icon: Calendar,
      label: "Ciclos Escolares",
      path: "/ciclos",
      roles: ["admin"],
    },
    {
      icon: Library,
      label: "Biblioteca Virtual",
      path: "/admin/biblioteca",
      roles: ["admin", "control_escolar"],
    },
    {
      icon: FileText,
      label: "Planes de Estudio",
      path: "/planes-estudio",
      roles: ["admin"],
    },
    { icon: TrendingUp, label: "Grados", path: "/grados", roles: ["admin"] },
    {
      icon: GraduationCap,
      label: "Carreras",
      path: "/carreras",
      roles: ["admin"],
    },
    { icon: Building, label: "Sedes", path: "/sedes", roles: ["admin"] },
    {
      icon: ClipboardEdit,
      label: "Conceptos de Pago",
      path: "/conceptos-pago",
      roles: ["admin"],
    },
    {
      icon: Book,
      label: "Asignaturas",
      path: "/asignaturas",
      roles: ["admin"],
    },
    {
      icon: Group,
      label: "Grupos",
      path: "/grupos",
      roles: ["admin", "control_escolar"],
    },
    {
      icon: GitBranch,
      label: "Migración",
      path: "/admin/migracion",
      roles: ["admin", "control_escolar"],
    },
    {
      icon: DollarSign,
      label: "Caja y Finanzas",
      path: "/admin/finanzas",
      roles: ["admin", "control_escolar"],
    },
    {
      icon: ClipboardEdit,
      label: "Solicitudes",
      path: "/admin/solicitudes",
      roles: ["admin", "control_escolar"],
    },
    {
      icon: Folder,
      label: "Gestor de Archivos",
      path: "/admin/archivos",
      roles: ["admin"],
    },
    {
      icon: UploadCloud,
      label: "Mi Nube (Drive)",
      path: "/admin/drive",
      roles: ["admin", "control_escolar"],
    },
  ];

  const visibleNavItems = navItems.filter((item) =>
    item.roles.includes(user?.rol),
  );

  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-300 ease-in-out shadow-xl md:shadow-none ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
      >
        <div className="p-6 flex flex-col items-center justify-center border-b border-gray-100 relative">
          <button
            onClick={() => setSidebarOpen(false)}
            className="absolute top-2 right-2 p-2 text-gray-400 hover:text-red-500 md:hidden"
          >
            <X size={24} />
          </button>
          <div className="w-24 h-24 mb-3 flex items-center justify-center">
            <img
              src={process.env.PUBLIC_URL + "/logo.png"}
              alt="Logo Universidad"
              className="mx-auto h-20 w-auto object-contain mb-4"
            />
          </div>
          <h2 className="font-bold text-lg text-center leading-tight text-[#a72a34]">
            {BRAND.name}
          </h2>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto custom-scrollbar">
          {visibleNavItems.map((item) => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + "/");
            return (
              <Link
                key={item.label}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 font-medium text-sm ${isActive ? "bg-[#a72a34] text-white shadow-md shadow-red-900/10" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"}`}
              >
                <item.icon
                  className={`w-5 h-5 mr-3 ${isActive ? "text-white" : "text-[#bb9a5a]"}`}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-gray-100">
          <div className="mb-3 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
            <p className="text-[10px] font-bold uppercase text-[#bb9a5a]">
              Rol Actual
            </p>
            <p className="text-sm font-bold text-gray-700 capitalize">
              {user?.rol.replace("_", " ")}
            </p>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center px-4 py-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 text-sm font-bold transition-colors"
          >
            <LogOut className="w-4 h-4 mr-2" /> Cerrar Sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full relative overflow-hidden md:ml-64 transition-all duration-300">
        <header className="bg-white sticky top-0 z-30 shadow-sm px-4 py-3 flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg md:hidden"
            >
              <Menu size={28} />
            </button>
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">
              Panel Administrativo
            </h1>
          </div>
          <div className="hidden md:flex items-center gap-2 bg-[#bb9a5a]/10 px-3 py-1.5 rounded-full border border-[#bb9a5a]/20">
            <Calendar size={14} className="text-[#bb9a5a]" />
            <span className="text-xs font-bold text-[#bb9a5a] uppercase tracking-wide">
              Ciclo: {cicloActual}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-gray-500 hover:text-[#a72a34] transition-colors cursor-pointer relative">
              <NotificationBell />
            </div>
            <div className="h-8 w-px bg-gray-200 mx-1 hidden sm:block"></div>
            <Link
              to="/mi-perfil"
              className="flex items-center gap-3 hover:bg-gray-50 p-1 pr-2 rounded-full transition-colors group cursor-pointer"
            >
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-gray-800 group-hover:text-[#a72a34] transition-colors">
                  {user?.nombre}
                </p>
                <p className="text-xs text-gray-500 capitalize">{user?.rol}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 overflow-hidden group-hover:border-[#a72a34] transition-colors">
                {user?.foto_perfil ? (
                  <img
                    src={`https://api-universidad-c5o8.onrender.com/uploads/perfiles/${user.foto_perfil}`}
                    className="w-full h-full object-cover"
                    alt="Perfil"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-lg bg-gray-100">
                    {user?.nombre?.charAt(0)}
                  </div>
                )}
              </div>
            </Link>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-20 bg-gray-50">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
const DocenteLayout = () => {
  const location = useLocation();
  const { logout, user } = useAuth();

  // 1. Estados necesarios para el diseño nuevo (Menú móvil y Ciclo)
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cicloActual, setCicloActual] = useState("Cargando...");

  // 2. Efecto para obtener el ciclo escolar (Igual que en Admin)
  useEffect(() => {
    api
      .get("/ciclo-actual")
      .then((res) => setCicloActual(res.data.nombre))
      .catch(() => setCicloActual("Sin Asignar"));
  }, []);

  // 3. Menú de Navegación del Docente (Estilo Nuevo)
  const navItems = [
    { icon: Home, label: "Mis Cursos", path: "/docente/dashboard" },
    { icon: Mail, label: "Correo Institucional", path: "/docente/correo" },
    { icon: Library, label: "Biblioteca Virtual", path: "/docente/biblioteca" },
    { icon: UploadCloud, label: "Mi Nube", path: "/docente/mi-nube" },
    { icon: Calendar, label: "Calendario", path: "/docente/calendario" },
    // Puedes agregar más items aquí si el docente tiene más secciones
  ];

  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
      {/* --- SIDEBAR Y FONDO OSCURO PARA MÓVIL --- */}

      {/* Sombra de fondo (Solo móvil) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Responsivo */}
      <aside
        className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col 
        transform transition-transform duration-300 ease-in-out shadow-xl md:shadow-none
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0
      `}
      >
        {/* HEADER DEL SIDEBAR */}
        <div className="p-6 flex flex-col items-center justify-center border-b border-gray-100 relative">
          <button
            onClick={() => setSidebarOpen(false)}
            className="absolute top-2 right-2 p-2 text-gray-400 hover:text-red-500 md:hidden"
          >
            <X size={24} />
          </button>

          <div className="w-24 h-24 mb-3 flex items-center justify-center">
            <img
              src={process.env.PUBLIC_URL + "/logo.png"}
              alt="Logo Universidad"
              className="mx-auto h-20 w-auto object-contain mb-4"
            />
          </div>
          <h2
            className="font-bold text-lg text-center leading-tight"
            style={{ color: BRAND.colors.primary }}
          >
            {BRAND.name}
          </h2>
        </div>

        {/* NAVEGACIÓN */}
        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + "/");
            return (
              <Link
                key={item.label}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 font-medium text-sm
                  ${isActive ? "text-white shadow-md shadow-red-900/10" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"}`}
                style={
                  isActive ? { backgroundColor: BRAND.colors.primary } : {}
                }
              >
                <item.icon
                  className="w-5 h-5 mr-3"
                  style={{ color: isActive ? "#fff" : BRAND.colors.secondary }}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* FOOTER DEL SIDEBAR */}
        <div className="px-4 py-4 border-t border-gray-100">
          <div className="mb-3 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
            <p
              className="text-[10px] font-bold uppercase"
              style={{ color: BRAND.colors.secondary }}
            >
              Rol Actual
            </p>
            <p className="text-sm font-bold text-gray-700">Docente</p>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center px-4 py-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 text-sm font-bold"
          >
            <LogOut className="w-4 h-4 mr-2" /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* --- CONTENIDO PRINCIPAL --- */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden md:ml-64 transition-all duration-300">
        {/* HEADER SUPERIOR */}
        <header className="bg-white sticky top-0 z-30 shadow-sm px-4 py-3 flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            {/* Botón menú móvil */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg md:hidden"
            >
              <Menu size={28} />
            </button>
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">
              Portal Docente
            </h1>
          </div>

          {/* Badge del Ciclo Escolar */}
          <div className="hidden md:flex items-center gap-2 bg-[#bb9a5a]/10 px-3 py-1.5 rounded-full border border-[#bb9a5a]/20">
            <Calendar size={14} className="text-[#bb9a5a]" />
            <span className="text-xs font-bold text-[#bb9a5a] uppercase tracking-wide">
              Ciclo: {cicloActual}
            </span>
          </div>

          {/* Área de Usuario y Notificaciones */}
          <div className="flex items-center gap-4">
            <div className="text-gray-500 hover:text-[#a72a34] transition-colors cursor-pointer relative">
              <NotificationBell />
            </div>

            <div className="h-8 w-px bg-gray-200 mx-1 hidden sm:block"></div>

            <Link
              to="/docente/mi-perfil" // Ajusta esta ruta si usas una diferente para el perfil docente
              className="flex items-center gap-3 hover:bg-gray-50 p-1 pr-2 rounded-full transition-colors group cursor-pointer"
            >
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-gray-800 group-hover:text-[#a72a34] transition-colors">
                  {user?.nombre}
                </p>
                <p className="text-xs text-gray-500 capitalize">{user?.rol}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 overflow-hidden group-hover:border-[#a72a34] transition-colors">
                {user?.foto_perfil ? (
                  <img
                    src={`https://api-universidad-c5o8.onrender.com/uploads/perfiles/${user.foto_perfil}`}
                    className="w-full h-full object-cover"
                    alt="Perfil"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-lg bg-gray-100">
                    {user?.nombre?.charAt(0)}
                  </div>
                )}
              </div>
            </Link>
            <TutorialGuide user={user} />
          </div>
        </header>

        {/* ÁREA DE CONTENIDO (Outlet) */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-20 bg-gray-50">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

// --- LAYOUT ALUMNO (COPIA EXACTA DEL ADMIN) ---
const AlumnoLayout = () => {
  const location = useLocation();
  const { logout, user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cicloActual, setCicloActual] = useState("Cargando...");

  // Cargar Ciclo Escolar (Igual que en Admin para el Header)
  useEffect(() => {
    api
      .get("/ciclo-actual")
      .then((res) => setCicloActual(res.data.nombre))
      .catch(() => setCicloActual("Sin Asignar"));
  }, []);

  // MENÚ DEL ALUMNO
  const navItems = [
    { icon: Home, label: "Inicio", path: "/alumno/dashboard" },
    { icon: DollarSign, label: "Mis Pagos", path: "/alumno/mis-pagos" },
    { icon: ClipboardEdit, label: "Trámites", path: "/alumno/mis-solicitudes" },
    {
      icon: Award,
      label: "Mis Calificaciones",
      path: "/alumno/mis-calificaciones",
    },
    { icon: Calendar, label: "Calendario", path: "/alumno/calendario" },
    { icon: Library, label: "Biblioteca Virtual", path: "/alumno/biblioteca" },
    { icon: User, label: "Mi Perfil", path: "/alumno/mi-perfil" },
    { icon: Mail, label: "Correo Institucional", path: "/alumno/correo" },
    { icon: PenTool, label: "Taller Creativo", path: "/alumno/pizarra" },
    { icon: UploadCloud, label: "Mi Nube", path: "/alumno/mi-nube" },
  ];

  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
      {/* 1. SOMBRA DE FONDO (Solo visible en móvil al abrir menú) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 2. SIDEBAR RESPONSIVE */}
      <aside
        className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col 
        transform transition-transform duration-300 ease-in-out shadow-xl md:shadow-none
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0
      `}
      >
        {/* HEADER DEL SIDEBAR */}
        <div className="p-6 flex flex-col items-center justify-center border-b border-gray-100 relative">
          <button
            onClick={() => setSidebarOpen(false)}
            className="absolute top-2 right-2 p-2 text-gray-400 hover:text-red-500 md:hidden"
          >
            <X size={24} />
          </button>

          <div className="w-24 h-24 mb-3 flex items-center justify-center">
            <img
              src={process.env.PUBLIC_URL + "/logo.png"}
              alt="Logo Universidad"
              className="mx-auto h-20 w-auto object-contain mb-4"
            />
          </div>
          <h2
            className="font-bold text-lg text-center leading-tight"
            style={{ color: BRAND.colors.primary }}
          >
            {BRAND.name}
          </h2>
        </div>

        {/* NAVEGACIÓN */}
        <nav
          id="tour-menu"
          className="flex-1 px-3 py-6 space-y-1 overflow-y-auto"
        >
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + "/");
            return (
              <Link
                key={item.label}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 font-medium text-sm
                  ${isActive ? "text-white shadow-md shadow-red-900/10" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"}`}
                style={
                  isActive ? { backgroundColor: BRAND.colors.primary } : {}
                }
              >
                <item.icon
                  className="w-5 h-5 mr-3"
                  style={{ color: isActive ? "#fff" : BRAND.colors.secondary }}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* FOOTER DEL SIDEBAR */}
        <div className="px-4 py-4 border-t border-gray-100">
          <div className="mb-3 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
            <p
              className="text-[10px] font-bold uppercase"
              style={{ color: BRAND.colors.secondary }}
            >
              Rol Actual
            </p>
            <p className="text-sm font-bold text-gray-700">Alumno</p>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center px-4 py-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 text-sm font-bold"
          >
            <LogOut className="w-4 h-4 mr-2" /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* 3. CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden md:ml-64 transition-all duration-300">
        {/* HEADER SUPERIOR */}
        <header className="bg-white sticky top-0 z-30 shadow-sm px-4 py-3 flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg md:hidden"
            >
              <Menu size={28} />
            </button>
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">
              Portal del Alumno
            </h1>
          </div>

          <div className="hidden md:flex items-center gap-2 bg-[#bb9a5a]/10 px-3 py-1.5 rounded-full border border-[#bb9a5a]/20">
            <Calendar size={14} className="text-[#bb9a5a]" />
            <span className="text-xs font-bold text-[#bb9a5a] uppercase tracking-wide">
              Ciclo: {cicloActual}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Notificaciones (Si tienes el componente NotificationBell, si no, puedes quitarlo) */}
            <div
              id="tour-notificaciones"
              className="text-gray-500 hover:text-[#a72a34] transition-colors cursor-pointer relative"
            >
              <NotificationBell />
            </div>

            <div className="h-8 w-px bg-gray-200 mx-1 hidden sm:block"></div>

            {/* PERFIL USUARIO */}
            <Link
              to="/alumno/mi-perfil"
              className="flex items-center gap-3 hover:bg-gray-50 p-1 pr-2 rounded-full transition-colors group cursor-pointer"
            >
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-gray-800 group-hover:text-[#a72a34] transition-colors">
                  {user?.nombre}
                </p>
                <p className="text-xs text-gray-500 capitalize">{user?.rol}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 overflow-hidden group-hover:border-[#a72a34] transition-colors">
                {user?.foto_perfil ? (
                  <img
                    src={`https://api-universidad-c5o8.onrender.com/uploads/perfiles/${user.foto_perfil}`}
                    className="w-full h-full object-cover"
                    alt="Perfil"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-lg bg-gray-100">
                    {user?.nombre?.charAt(0)}
                  </div>
                )}
              </div>
            </Link>
            <TutorialGuide user={user} />
          </div>
        </header>

        {/* ÁREA DE CONTENIDO */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-20 bg-gray-50">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

// --- COMPONENTE BIBLIOTECA VIRTUAL ---
const BibliotecaPage = () => {
  const { user } = useAuth();
  const [archivos, setArchivos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [form, setForm] = useState({
    titulo: "",
    descripcion: "",
    archivo: null,
  });

  const fetchArchivos = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/biblioteca");
      setArchivos(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchivos();
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!form.archivo) return alert("Selecciona un archivo");
    setIsUploading(true);

    const formData = new FormData();
    formData.append("titulo", form.titulo);
    formData.append("descripcion", form.descripcion);
    formData.append("archivo", form.archivo);

    try {
      await api.post("/admin/biblioteca", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert("Archivo subido con éxito");
      setShowModal(false);
      setForm({ titulo: "", descripcion: "", archivo: null });
      fetchArchivos();
    } catch (error) {
      alert("Error al subir archivo");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Eliminar este archivo de la biblioteca de todos?")) {
      try {
        await api.delete(`/admin/biblioteca/${id}`);
        fetchArchivos();
      } catch (e) {
        alert("Error al eliminar");
      }
    }
  };

  const getIcon = (tipo) => {
    switch (tipo) {
      case "pdf":
        return <FileText className="text-red-500" size={32} />;
      case "video":
        return <Video className="text-purple-500" size={32} />;
      case "imagen":
        return <Camera className="text-blue-500" size={32} />;
      case "word":
        return <FileText className="text-blue-600" size={32} />;
      case "excel":
        return <FileText className="text-green-600" size={32} />;
      case "powerpoint":
        return <FileText className="text-orange-500" size={32} />;
      default:
        return <FileIcon className="text-gray-500" size={32} />;
    }
  };

  const filtrados = archivos.filter((a) =>
    a.titulo.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <div className="p-3 bg-[#a72a34] text-white rounded-xl">
              <Library size={28} />
            </div>
            Biblioteca Virtual
          </h1>
          <p className="text-gray-500 mt-2 text-lg ml-16">
            Acervo digital de la institución.
          </p>
        </div>
        {(user.rol === "admin" || user.rol === "control_escolar") && (
          <button
            onClick={() => setShowModal(true)}
            className="bg-[#a72a34] text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-[#802028]"
          >
            <UploadCloud size={20} /> Subir Material
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Buscar documento..."
          className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#a72a34]"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <p className="text-center py-10">Cargando biblioteca...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filtrados.length === 0 && (
            <p className="col-span-full text-center py-10 text-gray-500 bg-white rounded-xl border border-dashed">
              No hay archivos.
            </p>
          )}
          {filtrados.map((a) => (
            <div
              key={a.id}
              className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div className="p-2 bg-gray-50 rounded-xl">
                    {getIcon(a.tipo)}
                  </div>
                  {(user.rol === "admin" || user.rol === "control_escolar") && (
                    <button
                      onClick={() => handleDelete(a.id)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
                <h3
                  className="font-bold text-gray-800 line-clamp-2"
                  title={a.titulo}
                >
                  {a.titulo}
                </h3>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                  {a.descripcion || "Sin descripción"}
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-50">
                <a
                  href={`https://api-universidad-c5o8.onrender.com/uploads/biblioteca/${a.ruta_archivo}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full bg-blue-50 text-blue-700 py-2 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-blue-100 transition-colors"
                >
                  <Download size={16} /> Abrir / Descargar
                </a>
                <p className="text-[10px] text-gray-400 text-center mt-2">
                  Subido: {new Date(a.fecha_subida).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4">
          <form
            onSubmit={handleUpload}
            className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl space-y-4"
          >
            <h3 className="font-bold text-xl mb-4 border-b pb-2">
              Subir a Biblioteca
            </h3>
            <input
              required
              placeholder="Título del documento"
              className="w-full p-3 border rounded-xl"
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            />
            <textarea
              placeholder="Descripción (Opcional)"
              className="w-full p-3 border rounded-xl"
              value={form.descripcion}
              onChange={(e) =>
                setForm({ ...form, descripcion: e.target.value })
              }
            />
            <input
              required
              type="file"
              className="w-full p-3 border rounded-xl"
              onChange={(e) => setForm({ ...form, archivo: e.target.files[0] })}
            />
            <div className="flex gap-2 pt-4">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 p-3 bg-gray-100 rounded-xl font-bold text-gray-600"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isUploading}
                className="flex-1 p-3 bg-[#a72a34] text-white rounded-xl font-bold disabled:opacity-50 flex justify-center gap-2"
              >
                {isUploading ? (
                  "Subiendo..."
                ) : (
                  <>
                    <UploadCloud size={20} /> Subir
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

const AspiranteLayout = () => {
  const { logout, user } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    {
      icon: FileIcon,
      label: "Mi Expediente",
      path: "/aspirante/dashboard",
    },
  ];

  if (!user) return null;

  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-300 ease-in-out shadow-xl md:shadow-none ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
      >
        <div className="p-6 flex flex-col items-center justify-center border-b border-gray-100 relative">
          <button
            onClick={() => setSidebarOpen(false)}
            className="absolute top-2 right-2 p-2 text-gray-400 hover:text-red-500 md:hidden"
          >
            <X size={24} />
          </button>
          <div className="w-24 h-24 mb-3 flex items-center justify-center">
            <img
              src={process.env.PUBLIC_URL + '/logo.png'}
              alt='Logo Universidad'
              className='mx-auto h-20 w-auto object-contain mb-4'
            />
          </div>
          <h2 className='font-bold text-lg text-center leading-tight text-[#a72a34]'>
            {BRAND.name}
          </h2>
        </div>

        <nav className='flex-1 px-3 py-6 space-y-1 overflow-y-auto custom-scrollbar'>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <Link
                key={item.label}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 font-medium text-sm ${isActive ? 'bg-[#a72a34] text-white shadow-md shadow-red-900/10' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
              >
                <item.icon
                  className={`w-5 h-5 mr-3 ${isActive ? 'text-white' : 'text-[#bb9a5a]'}`}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className='px-4 py-4 border-t border-gray-100'>
          <div className='mb-3 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100'>
            <p className='text-[10px] font-bold uppercase text-[#bb9a5a]'>
              Rol Actual
            </p>
            <p className='text-sm font-bold text-gray-700 capitalize'>
              {user?.rol.replace('_', ' ')}
            </p>
          </div>
          <button
            onClick={logout}
            className='w-full flex items-center justify-center px-4 py-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 text-sm font-bold transition-colors'
          >
            <LogOut className='w-4 h-4 mr-2' /> Cerrar Sesion
          </button>
        </div>
      </aside>

      <main className='flex-1 flex flex-col h-full relative overflow-hidden md:ml-64 transition-all duration-300'>
        <header className='bg-white sticky top-0 z-30 shadow-sm px-4 py-3 flex justify-between items-center h-16'>
          <div className='flex items-center gap-3'>
            <button
              onClick={() => setSidebarOpen(true)}
              className='p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg md:hidden'
            >
              <Menu size={28} />
            </button>
            <h1 className='text-xl font-bold text-gray-800 tracking-tight'>
              Portal del Aspirante
            </h1>
          </div>
          <div className='flex items-center gap-4'>
            <div className='text-gray-500 hover:text-[#a72a34] transition-colors cursor-pointer relative'>
              <NotificationBell />
            </div>
            <div className='h-8 w-px bg-gray-200 mx-1 hidden sm:block'></div>
            <Link
              to='/aspirante/mi-perfil'
              className='flex items-center gap-3 hover:bg-gray-50 p-1 pr-2 rounded-full transition-colors group cursor-pointer'
            >
              <div className='text-right hidden sm:block'>
                <p className='text-sm font-bold text-gray-800 group-hover:text-[#a72a34] transition-colors'>
                  {user?.nombre}
                </p>
                <p className='text-xs text-gray-500 capitalize'>{user?.rol}</p>
              </div>
              <div className='w-10 h-10 rounded-full bg-gray-100 border border-gray-200 overflow-hidden group-hover:border-[#a72a34] transition-colors'>
                {user?.foto_perfil ? (
                  <img
                    src={'https://api-universidad-c5o8.onrender.com/uploads/perfiles/' + user.foto_perfil}
                    className='w-full h-full object-cover'
                    alt='Perfil'
                  />
                ) : (
                  <div className='w-full h-full flex items-center justify-center text-gray-400 font-bold text-lg bg-gray-100'>
                    {user?.nombre?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                )}
              </div>
            </Link>
          </div>
        </header>
        <div className='flex-1 overflow-y-auto p-6'>
          <Outlet />
        </div>
      </main>
    </div>
  );
};

// --- PÁGINAS ---

// --- LOGIN PAGE CON FUNCIÓN "RECORDARME" ---
const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // 1. ESTADOS NUEVOS (Carga y Recordar)
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const { login } = useAuth();

  // 2. EFECTO: Buscar si hay un correo guardado al entrar
  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true); // Activar carga

    try {
      const response = await api.post("/login", { email, password });

      // 3. LÓGICA: Guardar o Borrar el correo según el checkbox
      if (rememberMe) {
        localStorage.setItem("rememberedEmail", email);
      } else {
        localStorage.removeItem("rememberedEmail");
      }

      login(response.data.user, response.data.token);
    } catch (err) {
      setError(err.response?.data?.message || "Error al iniciar sesión");
    } finally {
      setLoading(false); // Desactivar carga siempre
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      {/* Tarjeta del Login */}
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg border border-gray-200">
        {/* --- SECCIÓN LOGO --- */}
        <div className="text-center">
          <img
            src={process.env.PUBLIC_URL + "/logo.png"}
            alt="Logo Universidad"
            className="mx-auto h-20 w-auto object-contain mb-4"
          />
          <h2 className="text-3xl font-bold text-gray-900">Iniciar Sesión</h2>
          <p className="text-sm text-gray-500 mt-2">Plataforma Institucional</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {/* Input Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Correo Electrónico
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Correo institucional"
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#a72a34] focus:border-[#a72a34] transition-all"
              />
            </div>
          </div>

          {/* Input Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#a72a34] focus:border-[#a72a34] transition-all"
              />
            </div>
          </div>

          {/* 4. CHECKBOX RECORDARME (NUEVO) */}
          <div className="flex items-center">
            <input
              id="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 text-[#a72a34] focus:ring-[#a72a34] border-gray-300 rounded cursor-pointer"
            />
            <label
              htmlFor="remember-me"
              className="ml-2 block text-sm text-gray-700 cursor-pointer"
            >
              Recordar mi usuario
            </label>
          </div>

          {/* Mensaje de Error */}
          {error && (
            <div className="p-3 bg-red-50 border-l-4 border-[#a72a34] text-red-700 text-sm rounded">
              <p className="font-medium">Error de acceso</p>
              <p>{error}</p>
            </div>
          )}

          {/* Botón */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-[#a72a34] hover:bg-[#8f242d] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#a72a34] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? "Cargando..." : "Entrar"}
          </button>
        </form>

        <div className="text-center mt-6 space-y-2">
          <button
            onClick={() => {
              const emailRec = prompt(
                "Ingresa tu correo personal o institucional registrado:",
              );
              if (emailRec) {
                api
                  .post("/recuperar-password", { email: emailRec })
                  .then((res) =>
                    alert(
                      "¡Revisa tu bandeja de entrada! Se ha enviado una contraseña nueva.",
                    ),
                  )
                  .catch((err) =>
                    alert(
                      "Error: " +
                        (err.response?.data?.message || "Hubo un problema"),
                    ),
                  );
              }
            }}
            className="text-sm text-[#a72a34] font-bold hover:underline"
          >
            ¿Olvidaste tu contraseña?
          </button>
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} Centro Universitario Siglo XXI
          </p>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENTE DASHBOARD (RENOVADO) ---
const DashboardPage = () => {
  const { user } = useAuth();
  const [data, setData] = useState({
    stats: {
      total_alumnos: 0,
      total_docentes: 0,
      total_aspirantes: 0,
      total_grupos_activos: 0,
    },
    recientes: [],
  });
  const [loading, setLoading] = useState(true);

  // --- FUNCIÓN PARA DESCARGAR ZIP CON TOKEN DE SEGURIDAD ---
  const handleDownloadZip = async () => {
    try {
      const response = await api.get("/admin/exportar-credenciales", {
        responseType: "blob", // Le decimos que vamos a recibir un archivo
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "Fotos_Credenciales_Alumnos.zip");
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (error) {
      console.error("Error descargando ZIP:", error);
      alert("Hubo un error al descargar el archivo. Verifica tu conexión.");
    }
  };

  useEffect(() => {
    const cargarStats = async () => {
      try {
        const res = await api.get("/admin/dashboard-stats");
        setData(res.data);
      } catch (error) {
        console.error("Error cargando dashboard:", error);
      } finally {
        setLoading(false);
      }
    };
    cargarStats();
  }, []);

  // Componente de Tarjeta KPI
  const StatCard = ({ title, value, icon: Icon, color, subtext }) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between transition-transform hover:-translate-y-1">
      <div>
        <p className="text-gray-500 text-sm font-bold uppercase tracking-wider">
          {title}
        </p>
        <h3 className="text-3xl font-extrabold text-gray-800 mt-1">{value}</h3>
        {subtext && (
          <p className={`text-xs mt-2 font-medium ${color.text}`}>{subtext}</p>
        )}
      </div>
      <div className={`p-4 rounded-xl ${color.bg} ${color.text}`}>
        <Icon size={28} />
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* BIENVENIDA */}
      <div className="bg-gradient-to-r from-purple-700 to-indigo-800 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-2">¡Hola, {user?.nombre}! 👋</h1>
          <p className="opacity-90 text-purple-100 max-w-2xl">
            Bienvenido al panel de control escolar. Aquí tienes el resumen de la
            operación académica y administrativa de hoy.
          </p>
        </div>
        {/* Decoración de fondo */}
        <div className="absolute right-0 top-0 h-full w-1/3 bg-white/10 skew-x-12 transform translate-x-10"></div>
        <div className="absolute right-20 bottom-0 h-full w-1/3 bg-white/5 skew-x-12"></div>
      </div>

      {loading ? (
        <div className="text-center py-10">Cargando indicadores...</div>
      ) : (
        <>
          {/* SECCIÓN 1: KPIs PRINCIPALES */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Alumnos Activos"
              value={data.stats.total_alumnos}
              icon={GraduationCap}
              color={{ bg: "bg-green-100", text: "text-green-700" }}
              subtext="Matrícula actual"
            />
            <StatCard
              title="Aspirantes"
              value={data.stats.total_aspirantes}
              icon={UserPlus}
              color={{ bg: "bg-orange-100", text: "text-orange-700" }}
              subtext="Pendientes de inscripción"
            />
            <StatCard
              title="Docentes"
              value={data.stats.total_docentes}
              icon={Briefcase}
              color={{ bg: "bg-blue-100", text: "text-blue-700" }}
              subtext="Plantilla académica"
            />
            <StatCard
              title="Grupos Activos"
              value={data.stats.total_grupos_activos}
              icon={Group}
              color={{ bg: "bg-purple-100", text: "text-purple-700" }}
              subtext="Ciclo en curso"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* SECCIÓN 2: ACCESOS RÁPIDOS */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Zap className="text-yellow-500" size={20} /> Accesos Rápidos
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <Link
                  to="/usuarios"
                  className="p-4 border rounded-xl hover:bg-gray-50 hover:border-purple-300 transition-all text-center group"
                >
                  <UserPlus
                    className="mx-auto mb-2 text-purple-600 group-hover:scale-110 transition-transform"
                    size={24}
                  />
                  <span className="text-sm font-bold text-gray-600">
                    Nuevo Aspirante
                  </span>
                </Link>
                <button
                  onClick={handleDownloadZip}
                  className="bg-blue-50 text-blue-600 px-5 py-3 rounded-xl font-bold flex items-center gap-2 border border-blue-100 hover:bg-blue-100 transition-colors"
                >
                  <Download size={18} /> Exportar Fotos (ZIP)
                </button>
                <Link
                  to="/grupos"
                  className="p-4 border rounded-xl hover:bg-gray-50 hover:border-purple-300 transition-all text-center group"
                >
                  <Group
                    className="mx-auto mb-2 text-blue-600 group-hover:scale-110 transition-transform"
                    size={24}
                  />
                  <span className="text-sm font-bold text-gray-600">
                    Gestionar Grupos
                  </span>
                </Link>
                <Link
                  to="/admin/migracion"
                  className="p-4 border rounded-xl hover:bg-gray-50 hover:border-purple-300 transition-all text-center group"
                >
                  <GitBranch
                    className="mx-auto mb-2 text-pink-600 group-hover:scale-110 transition-transform"
                    size={24}
                  />
                  <span className="text-sm font-bold text-gray-600">
                    Migración
                  </span>
                </Link>
                <Link
                  to="/ciclos"
                  className="p-4 border rounded-xl hover:bg-gray-50 hover:border-purple-300 transition-all text-center group"
                >
                  <Calendar
                    className="mx-auto mb-2 text-green-600 group-hover:scale-110 transition-transform"
                    size={24}
                  />
                  <span className="text-sm font-bold text-gray-600">
                    Ciclos Escolares
                  </span>
                </Link>
                <Link
                  to="/conceptos-pago"
                  className="p-4 border rounded-xl hover:bg-gray-50 hover:border-purple-300 transition-all text-center group"
                >
                  <DollarSign
                    className="mx-auto mb-2 text-yellow-600 group-hover:scale-110 transition-transform"
                    size={24}
                  />
                  <span className="text-sm font-bold text-gray-600">
                    Finanzas
                  </span>
                </Link>
                <button className="p-4 border rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all text-center group opacity-50 cursor-not-allowed">
                  <FileText className="mx-auto mb-2 text-gray-400" size={24} />
                  <span className="text-sm font-bold text-gray-400">
                    Reportes (Prox)
                  </span>
                </button>
              </div>
            </div>

            {/* SECCIÓN 3: ASPIRANTES RECIENTES */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Clock className="text-orange-500" size={20} /> Últimos
                Aspirantes
              </h3>
              <div className="space-y-4">
                {data.recientes.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">
                    No hay registros recientes.
                  </p>
                ) : (
                  data.recientes.map((asp, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-orange-50 transition-colors border border-transparent hover:border-orange-100"
                    >
                      <div className="bg-orange-100 text-orange-600 p-2 rounded-full font-bold text-xs">
                        {asp.nombre.charAt(0)}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-bold text-gray-700 truncate">
                          {asp.nombre} {asp.apellido_paterno}{" "}
                          {asp.apellido_materno || ""}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {asp.email}
                        </p>
                      </div>
                      <Link
                        to="/usuarios"
                        className="p-1 text-gray-300 hover:text-purple-600"
                      >
                        <ArrowRightCircle size={18} />
                      </Link>
                    </div>
                  ))
                )}
                <Link
                  to="/usuarios"
                  className="block text-center text-xs font-bold text-purple-600 hover:text-purple-800 mt-4 border-t pt-3"
                >
                  Ver todos los aspirantes
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// --- MODAL EDITAR USUARIO (COMPLETO CON TODOS LOS CAMPOS) ---
const UserModal = ({
  isOpen,
  onClose,
  userToEdit,
  onSuccess,
  carreras,
  sedes,
}) => {
  const [form, setForm] = useState({});

  useEffect(() => {
    if (userToEdit) {
      setForm({
        nombre: userToEdit.nombre || "",
        apellido_paterno: userToEdit.apellido_paterno || "",
        apellido_materno: userToEdit.apellido_materno || "",
        email: userToEdit.email || "",
        email_personal: userToEdit.email_personal || "",
        telefono: userToEdit.telefono || "",
        genero: userToEdit.genero || "",
        curp: userToEdit.curp || "",
        fecha_nacimiento: userToEdit.fecha_nacimiento
          ? new Date(userToEdit.fecha_nacimiento).toISOString().split("T")[0]
          : "",
        edad: userToEdit.edad || "",
        domicilio: userToEdit.domicilio || "",
        colonia: userToEdit.colonia || "",
        contacto_emergencia_nombre: userToEdit.contacto_emergencia_nombre || "",
        contacto_emergencia_telefono:
          userToEdit.contacto_emergencia_telefono || "",
        escuela_procedencia: userToEdit.escuela_procedencia || "",
        modalidad: userToEdit.modalidad || "",
        estado_academico: userToEdit.estado_academico || "activo", // <--- NUEVO
        rol: userToEdit.rol,
        carrera_id:
          userToEdit.carrera_id || userToEdit.carrera_interes_id || "",
        sede_id: userToEdit.sede_id || userToEdit.sede_interes_id || "",
      });
    }
  }, [userToEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/admin/usuarios/${userToEdit.id}`, form);
      alert("Usuario actualizado correctamente");
      onSuccess();
    } catch (error) {
      alert(
        "Error al actualizar: " +
          (error.response?.data?.message || error.message),
      );
    }
  };

  if (!isOpen) return null;

  const handleCambiarFoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("foto", file);
    try {
      const res = await api.post(
        `/admin/usuarios/${userToEdit.id}/foto`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
      // Actualizamos visualmente el modal
      userToEdit.foto_perfil = res.data.foto_perfil;
      alert("Foto actualizada correctamente");
      onSuccess(); // Para refrescar la tabla de fondo
    } catch (err) {
      alert("Error al subir foto");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col max-h-[95vh]">
        <div className="bg-white p-6 border-b flex justify-between items-center shrink-0">
          <div>
            <h3 className="font-bold text-xl text-gray-800">
              Editar Expediente del Usuario
            </h3>
            <p className="text-xs text-gray-400">
              Actualiza la información completa y estatus académico.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:bg-gray-100 p-2 rounded-full"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
          {/* SECCIÓN: FOTO DE PERFIL */}
          <div className="flex items-center gap-6 bg-gray-100 p-4 rounded-xl mb-4">
            <div className="w-20 h-20 rounded-full border-2 border-gray-300 overflow-hidden bg-white shrink-0">
              {userToEdit?.foto_perfil ? (
                <img
                  src={`https://api-universidad-c5o8.onrender.com/uploads/perfiles/${userToEdit.foto_perfil}`}
                  className="w-full h-full object-cover"
                  alt="Foto de perfil"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-xl">
                  {userToEdit?.nombre?.charAt(0) || "U"}
                </div>
              )}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800 mb-2">
                Foto del Expediente
              </p>
              <label className="cursor-pointer bg-white px-4 py-2 border border-gray-300 text-sm font-bold rounded-lg hover:bg-gray-50 flex items-center gap-2 max-w-max">
                <Camera size={16} /> Subir Nueva Foto
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleCambiarFoto}
                />
              </label>
            </div>
          </div>
          <div className="p-8 overflow-y-auto flex-1 space-y-8 bg-gray-50/30">
            {/* SECCIÓN: DATOS PERSONALES */}
            <div>
              <h4 className="text-[#a72a34] font-bold border-b border-gray-200 pb-2 mb-4 flex items-center gap-2">
                <User size={18} /> Datos Personales
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Nombre
                  </label>
                  <input
                    required
                    className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#a72a34] outline-none"
                    value={form.nombre}
                    onChange={(e) =>
                      setForm({ ...form, nombre: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Apellido Paterno
                  </label>
                  <input
                    required
                    className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#a72a34] outline-none"
                    value={form.apellido_paterno}
                    onChange={(e) =>
                      setForm({ ...form, apellido_paterno: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Apellido Materno
                  </label>
                  <input
                    className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#a72a34] outline-none"
                    value={form.apellido_materno}
                    onChange={(e) =>
                      setForm({ ...form, apellido_materno: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    CURP
                  </label>
                  <input
                    className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#a72a34] outline-none uppercase font-mono"
                    value={form.curp}
                    onChange={(e) =>
                      setForm({ ...form, curp: e.target.value.toUpperCase() })
                    }
                    maxLength={18}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Género
                  </label>
                  <select
                    className="w-full p-2.5 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-[#a72a34] outline-none"
                    value={form.genero}
                    onChange={(e) =>
                      setForm({ ...form, genero: e.target.value })
                    }
                  >
                    <option value="">Seleccione...</option>
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Nacimiento
                  </label>
                  <input
                    type="date"
                    className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#a72a34] outline-none"
                    value={form.fecha_nacimiento}
                    onChange={(e) =>
                      setForm({ ...form, fecha_nacimiento: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Edad
                  </label>
                  <input
                    type="number"
                    className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#a72a34] outline-none"
                    value={form.edad}
                    onChange={(e) => setForm({ ...form, edad: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* SECCIÓN: CONTACTO Y DOMICILIO */}
            <div>
              <h4 className="text-[#a72a34] font-bold border-b border-gray-200 pb-2 mb-4 flex items-center gap-2">
                <Phone size={18} /> Contacto y Domicilio
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Correo Institucional
                  </label>
                  <input
                    type="email"
                    disabled
                    className="w-full p-2.5 border border-gray-200 rounded-lg bg-gray-100 text-gray-500"
                    value={form.email}
                  />
                </div>
                <div className="lg:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Correo Personal
                  </label>
                  <input
                    type="email"
                    className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#a72a34] outline-none"
                    value={form.email_personal}
                    onChange={(e) =>
                      setForm({ ...form, email_personal: e.target.value })
                    }
                  />
                </div>
                <div className="lg:col-span-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#a72a34] outline-none"
                    value={form.telefono}
                    onChange={(e) =>
                      setForm({ ...form, telefono: e.target.value })
                    }
                  />
                </div>
                <div className="lg:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Domicilio (Calle y Num)
                  </label>
                  <input
                    type="text"
                    className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#a72a34] outline-none"
                    value={form.domicilio}
                    onChange={(e) =>
                      setForm({ ...form, domicilio: e.target.value })
                    }
                  />
                </div>
                <div className="lg:col-span-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Colonia
                  </label>
                  <input
                    type="text"
                    className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#a72a34] outline-none"
                    value={form.colonia}
                    onChange={(e) =>
                      setForm({ ...form, colonia: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            {/* SECCIÓN: ACADÉMICA Y EMERGENCIA */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h4 className="text-[#a72a34] font-bold border-b border-gray-200 pb-2 mb-4 flex items-center gap-2">
                  <GraduationCap size={18} /> Académico
                </h4>
                <div className="space-y-4">
                  {(userToEdit.rol === "alumno" ||
                    userToEdit.rol === "aspirante") && (
                    <>
                      {/* --- NUEVO SELECTOR DE ESTADO ACADÉMICO --- */}
                      <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                        <label className="block text-xs font-black text-yellow-800 uppercase mb-1">
                          Estatus del Alumno en el Sistema
                        </label>
                        <select
                          className="w-full p-2 border border-yellow-300 rounded-lg bg-white font-bold focus:ring-2 focus:ring-yellow-500 outline-none"
                          value={form.estado_academico}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              estado_academico: e.target.value,
                            })
                          }
                        >
                          <option value="activo">✅ Activo (Normal)</option>
                          <option value="baja_temporal">
                            ⏸️ Baja Temporal (Bloqueado)
                          </option>
                          <option value="baja_definitiva">
                            ❌ Baja Definitiva (Bloqueado)
                          </option>
                          <option value="suspendido">
                            ⛔ Suspendido (Bloqueado)
                          </option>
                          <option value="egresado">
                            🎓 Egresado (Puede entrar)
                          </option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                          Carrera
                        </label>
                        <select
                          className="w-full p-2.5 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-[#a72a34] outline-none"
                          value={form.carrera_id}
                          onChange={(e) =>
                            setForm({ ...form, carrera_id: e.target.value })
                          }
                        >
                          <option value="">Sin Asignar</option>
                          {carreras.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nombre_carrera}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                            Sede
                          </label>
                          <select
                            className="w-full p-2.5 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-[#a72a34] outline-none"
                            value={form.sede_id}
                            onChange={(e) =>
                              setForm({ ...form, sede_id: e.target.value })
                            }
                          >
                            <option value="">Sin Asignar</option>
                            {sedes.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.nombre_sede}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                            Modalidad
                          </label>
                          <select
                            className="w-full p-2.5 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-[#a72a34] outline-none"
                            value={form.modalidad}
                            onChange={(e) =>
                              setForm({ ...form, modalidad: e.target.value })
                            }
                          >
                            <option value="">Seleccione...</option>
                            <option value="Escolarizada">Escolarizada</option>
                            <option value="Semiescolarizada">
                              Semiescolarizada
                            </option>
                            <option value="Virtual">Virtual</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                          Escuela de Procedencia
                        </label>
                        <input
                          className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#a72a34] outline-none"
                          value={form.escuela_procedencia}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              escuela_procedencia: e.target.value,
                            })
                          }
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-red-600 font-bold border-b border-red-200 pb-2 mb-4 flex items-center gap-2">
                  <AlertCircle size={18} /> Emergencia
                </h4>
                <div className="space-y-4 bg-red-50/50 p-4 rounded-xl border border-red-100">
                  <div>
                    <label className="block text-xs font-bold text-red-500 uppercase mb-1">
                      Nombre del Contacto
                    </label>
                    <input
                      className="w-full p-2.5 border border-red-200 rounded-lg focus:ring-2 focus:ring-red-400 outline-none"
                      value={form.contacto_emergencia_nombre}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          contacto_emergencia_nombre: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-red-500 uppercase mb-1">
                      Teléfono del Contacto
                    </label>
                    <input
                      type="tel"
                      className="w-full p-2.5 border border-red-200 rounded-lg focus:ring-2 focus:ring-red-400 outline-none"
                      value={form.contacto_emergencia_telefono}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          contacto_emergencia_telefono: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-4 p-6 justify-end border-t border-gray-200 bg-white shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-8 py-2.5 bg-[#a72a34] text-white rounded-xl font-bold hover:bg-[#802028] shadow-lg transition-transform active:scale-95 flex items-center gap-2"
            >
              <Save size={18} /> Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- COMPONENTE USUARIOS (DISEÑO HORIZONTAL "PANORÁMICO" SIN SCROLL) ---
const UsuariosPage = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modales
  const [modalAspirante, setModalAspirante] = useState(false);
  const [modalDocente, setModalDocente] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userToEdit, setUserToEdit] = useState(null);
  const [userToView, setUserToView] = useState(null);

  // Catálogos
  const [carreras, setCarreras] = useState([]);
  const [sedes, setSedes] = useState([]);
  const [verEliminados, setVerEliminados] = useState(false);

  // Formularios
  const formInicial = {
    nombre: "",
    apellido_paterno: "",
    apellido_materno: "",
    email: "",
    telefono: "",
    genero: "",
    curp: "",
    fecha_nacimiento: "",
  };

  const [formAspirante, setFormAspirante] = useState({
    ...formInicial,
    carrera_id: "",
    sede_id: "",
  });
  const [formDocente, setFormDocente] = useState({
    ...formInicial,
    email_personal: "",
    sede_id: "",
  });

  // --- FUNCIÓN PARA DESCARGAR ZIP CON TOKEN DE SEGURIDAD ---
  const handleDownloadZip = async () => {
    try {
      // Usamos api.get para que automáticamente envíe tu Token de Admin
      const response = await api.get("/admin/exportar-credenciales", {
        responseType: "blob", // CLAVE: Le decimos a Axios que es un archivo, no texto
      });
      // Creamos un link temporal en el navegador y lo "clicamos"
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "Fotos_Credenciales_Alumnos.zip");
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (error) {
      console.error("Error descargando ZIP:", error);
      alert("Hubo un error al descargar el archivo. Verifica tu conexión.");
    }
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const endpoint = verEliminados
        ? "/admin/usuarios/eliminados"
        : "/admin/usuarios";
      const [uRes, cRes, sRes] = await Promise.all([
        api.get(endpoint),
        api.get("/admin/carreras"),
        api.get("/admin/sedes"),
      ]);
      setUsuarios(uRes.data);
      setCarreras(cRes.data);
      setSedes(sRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [verEliminados]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCrear = async (e, tipo) => {
    e.preventDefault();
    const form = tipo === "aspirante" ? formAspirante : formDocente;
    const setModal = tipo === "aspirante" ? setModalAspirante : setModalDocente;
    const setForm = tipo === "aspirante" ? setFormAspirante : setFormDocente;
    const baseForm =
      tipo === "aspirante"
        ? { ...formInicial, carrera_id: "", sede_id: "" }
        : { ...formInicial };

    if (tipo === "aspirante" && (!form.carrera_id || !form.sede_id))
      return alert("Selecciona carrera y sede");

    try {
      const res = await api.post("/admin/usuarios", { ...form, rol: tipo });
      if (res.data.credenciales) {
        alert(
          `✅ ¡ALUMNO REGISTRADO CON ÉXITO!\n\n` +
            `👤 Matrícula: ${res.data.credenciales.usuario}\n` +
            `📧 Correo: ${res.data.credenciales.correo}\n` +
            `🔑 Contraseña: ${res.data.credenciales.password}\n\n` +
            `⚠️ IMPORTANTE: Entrega estos datos al alumno ahora mismo.`,
        );
      } else {
        alert(
          `¡Registro Exitoso!\n\nSe asignó la Matrícula: ${res.data.matricula}`,
        );
      }
      setModal(false);
      setForm(baseForm);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || "Error al crear.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Enviar a la papelera?")) {
      try {
        await api.delete(`/admin/usuarios/${id}`);
        fetchData();
      } catch (e) {
        alert("Error");
      }
    }
  };

  const handleRestaurar = async (id) => {
    if (window.confirm("¿Restaurar usuario?")) {
      try {
        await api.put(`/admin/usuarios/${id}/reactivar`);
        fetchData();
      } catch (e) {
        alert("Error");
      }
    }
  };

  const filteredUsers = usuarios.filter(
    (u) =>
      (activeTab === "todos" || u.rol === activeTab.replace(/s$/, "")) &&
      (u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.apellido_paterno.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.matricula && u.matricula.includes(searchTerm))),
  );

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const currentUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* HEADER */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">
            {verEliminados ? "Papelera" : "Directorio"} de Usuarios
          </h1>
          <p className="text-gray-500 mt-2">
            Gestión de Alumnos, Docentes y Aspirantes.
          </p>
        </div>
        <div className="flex gap-3 items-center flex-wrap">
          <button
            onClick={() => setVerEliminados(!verEliminados)}
            className={`px-5 py-3 rounded-xl font-bold flex items-center gap-2 border-2 ${verEliminados ? "bg-gray-100 border-gray-200 text-gray-600" : "bg-red-50 border-red-50 text-[#a72a34]"}`}
          >
            {verEliminados ? <ArrowLeft size={18} /> : <Trash2 size={18} />}
            {verEliminados ? "Volver" : "Papelera"}
          </button>
          {!verEliminados && (
            <>
              {/* BOTÓN DESCARGAR ZIP CORREGIDO */}
              <button
                onClick={handleDownloadZip}
                className="bg-blue-50 border-2 border-blue-200 text-blue-700 px-5 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-100 transition-colors"
              >
                <Download size={18} /> Exportar ZIP
              </button>

              <button
                onClick={() => setModalAspirante(true)}
                className="bg-white border-2 border-[#a72a34] text-[#a72a34] px-5 py-3 rounded-xl font-bold flex items-center gap-2 transition-transform active:scale-95"
              >
                <UserPlus size={18} /> Aspirante
              </button>
              <button
                onClick={() => setModalDocente(true)}
                className="bg-[#a72a34] text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-red-900/20 transition-transform active:scale-95"
              >
                <Briefcase size={18} /> Docente
              </button>
            </>
          )}
        </div>
      </div>

      {/* TABS Y BUSCADOR */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex bg-gray-100 p-1 rounded-xl overflow-x-auto max-w-full">
          {["todos", "aspirantes", "docentes", "alumnos"].map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setCurrentPage(1);
              }}
              className={`px-6 py-2 rounded-lg text-sm font-bold capitalize whitespace-nowrap ${activeTab === tab ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-3 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar..."
            className="w-full pl-12 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* TABLA */}
      {loading ? (
        <div className="text-center py-20 text-gray-400">Cargando...</div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-bold border-b border-gray-100">
                <tr>
                  <th className="p-5">Usuario</th>
                  <th className="p-5">Rol</th>
                  <th className="p-5">Contacto</th>
                  <th className="p-5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {currentUsers.map((u) => (
                  <tr
                    key={u.id}
                    className={`hover:bg-gray-50/50 ${verEliminados ? "grayscale opacity-70" : ""}`}
                  >
                    <td className="p-5 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold overflow-hidden border">
                        {u.foto_perfil ? (
                          <img
                            src={`https://api-universidad-c5o8.onrender.com/uploads/perfiles/${u.foto_perfil}`}
                            className="w-full h-full object-cover"
                            alt="Foto de perfil"
                          />
                        ) : (
                          u.nombre.charAt(0)
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-gray-800">
                          {u.nombre} {u.apellido_paterno} {u.apellido_materno}
                        </div>
                        <div className="text-xs text-gray-400 font-mono">
                          {u.matricula || "ID: " + u.id}
                        </div>
                      </div>
                    </td>
                    <td className="p-5">
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${u.rol === "aspirante" ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-600"}`}
                      >
                        {u.rol}
                      </span>
                    </td>
                    <td className="p-5 text-sm text-gray-500">
                      <div>{u.email}</div>
                      <div className="text-xs text-gray-400">{u.telefono}</div>
                    </td>
                    <td className="p-5 text-right">
                      {!verEliminados ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setUserToView(u)}
                            className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => {
                              setUserToEdit(u);
                              setShowUserModal(true);
                            }}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(u.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleRestaurar(u.id)}
                          className="text-xs font-bold text-[#a72a34] border border-[#a72a34] px-3 py-1 rounded hover:bg-[#a72a34] hover:text-white transition-colors"
                        >
                          Restaurar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-gray-100 flex justify-between bg-gray-50/30">
            <span className="text-xs text-gray-400">
              Pág {currentPage} de {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((c) => c - 1)}
                className="px-3 py-1 bg-white border rounded text-sm disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((c) => c + 1)}
                className="px-3 py-1 bg-white border rounded text-sm disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL ASPIRANTE (PANORÁMICO - 3 FILAS - SIN MATRÍCULA) --- */}
      {modalAspirante && (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col">
            <div className="bg-white p-6 border-b flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="font-bold text-xl text-gray-800">
                  Nuevo Aspirante
                </h3>
                <p className="text-xs text-gray-400">
                  La matrícula y contraseña se asignarán automáticamente al
                  guardar.
                </p>
              </div>
              <button
                onClick={() => setModalAspirante(false)}
                className="text-gray-400 hover:bg-gray-200 p-2 rounded-full"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={(e) => handleCrear(e, "aspirante")} className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {/* FILA 1: IDENTIFICACIÓN */}
                <div className="lg:col-span-1">
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                    Nombre *
                  </label>
                  <input
                    required
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a72a34] outline-none"
                    value={formAspirante.nombre}
                    onChange={(e) =>
                      setFormAspirante({
                        ...formAspirante,
                        nombre: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="lg:col-span-1">
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                    Paterno *
                  </label>
                  <input
                    required
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a72a34] outline-none"
                    value={formAspirante.apellido_paterno}
                    onChange={(e) =>
                      setFormAspirante({
                        ...formAspirante,
                        apellido_paterno: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="lg:col-span-1">
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                    Materno
                  </label>
                  <input
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a72a34] outline-none"
                    value={formAspirante.apellido_materno}
                    onChange={(e) =>
                      setFormAspirante({
                        ...formAspirante,
                        apellido_materno: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="lg:col-span-1">
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                    CURP *
                  </label>
                  <input
                    required
                    className="w-full p-3 border border-gray-200 rounded-xl uppercase font-mono focus:ring-2 focus:ring-[#a72a34] outline-none"
                    value={formAspirante.curp}
                    onChange={(e) =>
                      setFormAspirante({
                        ...formAspirante,
                        curp: e.target.value.toUpperCase(),
                      })
                    }
                    maxLength={18}
                  />
                </div>

                {/* PEGA ESTO EN EL FORMULARIO DEL MODAL DE USUARIOS */}
                <div className="lg:col-span-2">
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                    Correo Personal (Gmail / Outlook) *
                  </label>
                  <input
                    required
                    type="email"
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a72a34] outline-none"
                    placeholder="Para enviar credenciales..."
                    value={formAspirante.email_personal || ""}
                    onChange={(e) =>
                      setFormAspirante({
                        ...formAspirante,
                        email_personal: e.target.value,
                      })
                    }
                  />
                </div>

                {/* FILA 2: CONTACTO */}
                <div className="lg:col-span-2">
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                    Correo Institucional (Automático)
                  </label>
                  {/* Input deshabilitado visualmente */}
                  <input
                    type="text"
                    disabled
                    className="w-full p-3 border border-gray-200 rounded-xl bg-gray-100 text-gray-500 cursor-not-allowed italic"
                    placeholder="Se generará al guardar (ej: 20260015@...)"
                  />
                  <p className="text-[10px] text-red-500 mt-1 font-bold">
                    * El sistema creará el correo y la contraseña
                    automáticamente.
                  </p>
                </div>
                <div className="lg:col-span-1">
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                    Teléfono *
                  </label>
                  <input
                    required
                    type="tel"
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a72a34] outline-none"
                    value={formAspirante.telefono}
                    onChange={(e) =>
                      setFormAspirante({
                        ...formAspirante,
                        telefono: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="lg:col-span-1">
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                    Fecha Nacimiento
                  </label>
                  <input
                    type="date"
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a72a34] outline-none"
                    value={formAspirante.fecha_nacimiento}
                    onChange={(e) =>
                      setFormAspirante({
                        ...formAspirante,
                        fecha_nacimiento: e.target.value,
                      })
                    }
                  />
                </div>

                {/* FILA 3: ACADÉMICO */}
                <div className="lg:col-span-1">
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                    Género
                  </label>
                    <select
                      className="w-full p-3 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-[#a72a34] outline-none"
                      value={formAspirante.genero}
                      onChange={(e) =>
                        setFormAspirante({
                          ...formAspirante,
                          genero: e.target.value,
                        })
                      }
                    >
                      <option value="">Selecciona...</option>
                      <option value="H">Hombre</option>
                      <option value="M">Mujer</option>
                      <option value="O">Otro</option>
                    </select>
                </div>
                <div className="lg:col-span-2">
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                    Carrera *
                  </label>
                  <select
                    required
                    className="w-full p-3 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-[#a72a34] outline-none"
                    value={formAspirante.carrera_id}
                    onChange={(e) =>
                      setFormAspirante({
                        ...formAspirante,
                        carrera_id: e.target.value,
                      })
                    }
                  >
                    <option value="">Seleccione Carrera...</option>
                    {carreras.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre_carrera}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="lg:col-span-1">
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                    Sede *
                  </label>
                  <select
                    required
                    className="w-full p-3 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-[#a72a34] outline-none"
                    value={formAspirante.sede_id}
                    onChange={(e) =>
                      setFormAspirante({
                        ...formAspirante,
                        sede_id: e.target.value,
                      })
                    }
                  >
                    <option value="">Seleccione Sede...</option>
                    {sedes.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre_sede}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-4 mt-8 justify-end">
                <button
                  type="button"
                  onClick={() => setModalAspirante(false)}
                  className="px-6 py-3 text-gray-500 hover:text-gray-700 font-bold hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 bg-[#a72a34] text-white rounded-xl font-bold hover:bg-[#802028] shadow-lg shadow-red-900/20 transition-transform active:scale-95 flex items-center gap-2"
                >
                  <CheckCircle size={20} /> Registrar Aspirante
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL DOCENTE (PANORÁMICO - SIN MATRÍCULA) --- */}
      {modalDocente && (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col">
            <div className="bg-white p-6 border-b flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="font-bold text-xl text-gray-800">
                  Nuevo Docente
                </h3>
                <p className="text-xs text-gray-400">
                  La matrícula y contraseña se asignarán automáticamente.
                </p>
              </div>
              <button
                onClick={() => setModalDocente(false)}
                className="text-gray-400 hover:bg-gray-200 p-2 rounded-full"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={(e) => handleCrear(e, "docente")} className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {/* FILA 1 */}
                <div className="lg:col-span-1">
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                    Nombre *
                  </label>
                  <input
                    required
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a72a34] outline-none"
                    value={formDocente.nombre}
                    onChange={(e) =>
                      setFormDocente({ ...formDocente, nombre: e.target.value })
                    }
                  />
                </div>
                <div className="lg:col-span-1">
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                    Paterno *
                  </label>
                  <input
                    required
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a72a34] outline-none"
                    value={formDocente.apellido_paterno}
                    onChange={(e) =>
                      setFormDocente({
                        ...formDocente,
                        apellido_paterno: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="lg:col-span-1">
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                    Materno
                  </label>
                  <input
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a72a34] outline-none"
                    value={formDocente.apellido_materno}
                    onChange={(e) =>
                      setFormDocente({
                        ...formDocente,
                        apellido_materno: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="lg:col-span-1">
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                    CURP *
                  </label>
                  <input
                    required
                    className="w-full p-3 border border-gray-200 rounded-xl uppercase font-mono focus:ring-2 focus:ring-[#a72a34] outline-none"
                    value={formDocente.curp}
                    onChange={(e) =>
                      setFormDocente({
                        ...formDocente,
                        curp: e.target.value.toUpperCase(),
                      })
                    }
                    maxLength={18}
                  />
                </div>

                {/* FILA 2 */}
                <div className="lg:col-span-2">
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1 flex items-center gap-1">
                    <Mail size={14} /> Correo Personal (Gmail / Outlook) *
                  </label>
                  <input
                    required
                    type="email"
                    placeholder="Para enviar credenciales..."
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a72a34] outline-none"
                    value={formDocente.email_personal}
                    onChange={(e) =>
                      setFormDocente({ ...formDocente, email_personal: e.target.value })
                    }
                  />
                </div>
                <div className="lg:col-span-2">
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                    Correo Institucional (Automático)
                  </label>
                  <input
                    type="text"
                    disabled
                    className="w-full p-3 border border-gray-200 rounded-xl bg-gray-100 text-gray-500 cursor-not-allowed italic"
                    placeholder="Se generará al guardar (ej: doc2026001@...)"
                  />
                  <p className="text-[10px] text-red-500 mt-1 font-bold">
                    * El sistema creará el correo automáticamente.
                  </p>
                </div>
                <div className="lg:col-span-1">
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                    Teléfono *
                  </label>
                  <input
                    required
                    type="tel"
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a72a34] outline-none"
                    value={formDocente.telefono}
                    onChange={(e) =>
                      setFormDocente({
                        ...formDocente,
                        telefono: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="lg:col-span-1">
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                    Género
                  </label>
                  <select
                    className="w-full p-3 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-[#a72a34] outline-none"
                    value={formDocente.genero}
                    onChange={(e) =>
                      setFormDocente({ ...formDocente, genero: e.target.value })
                    }
                  >
                    <option value="">Selecciona...</option>
                    <option value="H">Hombre</option>
                    <option value="M">Mujer</option>
                    <option value="O">Otro</option>
                  </select>
                </div>

                {/* FILA 3 */}
                <div className="lg:col-span-1">
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                    Fecha Nacimiento
                  </label>
                  <input
                    type="date"
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a72a34] outline-none"
                    value={formDocente.fecha_nacimiento}
                    onChange={(e) =>
                      setFormDocente({
                        ...formDocente,
                        fecha_nacimiento: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="lg:col-span-1">
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                    Sede *
                  </label>
                  <select
                    required
                    className="w-full p-3 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-[#a72a34] outline-none"
                    value={formDocente.sede_id}
                    onChange={(e) =>
                      setFormDocente({ ...formDocente, sede_id: e.target.value })
                    }
                  >
                    <option value="">-- Selecciona --</option>
                    {sedes.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre_sede}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-4 mt-8 justify-end">
                <button
                  type="button"
                  onClick={() => setModalDocente(false)}
                  className="px-6 py-3 text-gray-500 hover:text-gray-700 font-bold hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 bg-[#a72a34] text-white rounded-xl font-bold hover:bg-[#802028] shadow-lg shadow-red-900/20 transition-transform active:scale-95 flex items-center gap-2"
                >
                  <CheckCircle size={20} /> Registrar Docente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showUserModal && (
        <UserModal
          isOpen={showUserModal}
          onClose={() => setShowUserModal(false)}
          userToEdit={userToEdit}
          carreras={carreras} // <--- AGREGADO
          sedes={sedes} // <--- AGREGADO
          onSuccess={() => {
            fetchData();
            setShowUserModal(false);
          }}
        />
      )}
      {userToView && (
        <UserDetailModal
          user={userToView}
          onClose={() => setUserToView(null)}
        />
      )}
    </div>
  );
};

// --- MODAL VER DETALLES (FICHA TÉCNICA COMPLETA) ---
const UserDetailModal = ({ user, onClose }) => {
  if (!user) return null;

  // Helpers para mostrar datos o texto por defecto
  const dato = (valor) =>
    valor ? (
      valor
    ) : (
      <span className="text-gray-300 italic text-sm">No registrado</span>
    );
  const fecha = (valor) =>
    valor ? (
      valor.split("T")[0]
    ) : (
      <span className="text-gray-300 italic text-sm">--/--/----</span>
    );

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col">
        {/* HEADER */}
        <div className="bg-[#a72a34] p-8 flex items-center justify-between relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-16 pointer-events-none"></div>

          <div className="flex items-center gap-6 z-10">
            <div className="w-24 h-24 bg-white rounded-full border-4 border-white/30 flex items-center justify-center text-4xl font-bold text-[#a72a34] shadow-lg overflow-hidden shrink-0">
              {user.foto_perfil ? (
                <img
                  src={`https://api-universidad-c5o8.onrender.com/uploads/perfiles/${user.foto_perfil}`}
                  className="w-full h-full object-cover"
                  alt="Perfil"
                />
              ) : user.nombre ? (
                user.nombre.charAt(0)
              ) : (
                "U"
              )}
            </div>
            <div className="text-white">
              <h2 className="text-2xl md:text-3xl font-bold">
                {user.nombre} {user.apellido_paterno} {user.apellido_materno}
              </h2>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="bg-white/20 px-3 py-1 rounded-lg text-sm font-medium backdrop-blur-sm uppercase tracking-wide border border-white/10">
                  {user.rol}
                </span>
                <span className="bg-white/20 px-3 py-1 rounded-lg text-sm font-medium backdrop-blur-sm font-mono border border-white/10">
                  {user.matricula || "S/N"}
                </span>

                {/* --- NUEVO: ETIQUETA DE ESTADO ACADÉMICO --- */}
                <span
                  className={`px-3 py-1 rounded-lg text-sm font-bold uppercase tracking-wide border 
                  ${
                    user.estado_academico === "activo"
                      ? "bg-green-500/20 border-green-400/50 text-green-100"
                      : user.estado_academico === "egresado"
                        ? "bg-blue-500/20 border-blue-400/50 text-blue-100"
                        : "bg-red-500/80 border-red-400 text-white shadow-lg"
                  }`}
                >
                  {user.estado_academico
                    ? user.estado_academico.replace("_", " ")
                    : "ACTIVO"}
                </span>
                {/* --- FIN NUEVO --- */}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors z-10"
          >
            <X size={28} />
          </button>
        </div>

        {/* CONTENIDO SCROLLABLE */}
        <div
          className="p-8 bg-gray-50/50 overflow-y-auto"
          style={{ maxHeight: "calc(100vh - 200px)" }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* 1. INFORMACIÓN PERSONAL */}
            <div className="space-y-4">
              <h3 className="text-[#a72a34] font-bold uppercase tracking-wider text-xs border-b border-gray-200 pb-2 mb-4">
                Datos Personales
              </h3>
              <div>
                <label className="block text-xs text-gray-400 font-bold uppercase mb-1">
                  CURP
                </label>
                <p className="text-sm font-bold text-gray-800 font-mono">
                  {dato(user.curp)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 font-bold uppercase mb-1">
                    Género
                  </label>
                  <p className="text-sm font-medium text-gray-800">
                    {user.genero === "M"
                      ? "Masculino"
                      : user.genero === "F"
                        ? "Femenino"
                        : dato(user.genero)}
                  </p>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 font-bold uppercase mb-1">
                    Edad
                  </label>
                  <p className="text-sm font-medium text-gray-800">
                    {dato(user.edad)}
                  </p>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 font-bold uppercase mb-1">
                  Nacimiento
                </label>
                <p className="text-sm font-medium text-gray-800">
                  {fecha(user.fecha_nacimiento)}
                </p>
              </div>
            </div>

            {/* 2. CONTACTO */}
            <div className="space-y-4">
              <h3 className="text-[#a72a34] font-bold uppercase tracking-wider text-xs border-b border-gray-200 pb-2 mb-4">
                Contacto
              </h3>
              <div>
                <label className="block text-xs text-gray-400 font-bold uppercase mb-1">
                  Correo Institucional
                </label>
                <p className="text-sm font-medium text-gray-800 break-words">
                  {dato(user.email)}
                </p>
              </div>
              <div>
                <label className="block text-xs text-gray-400 font-bold uppercase mb-1">
                  Correo Personal
                </label>
                <p className="text-sm font-medium text-gray-800 break-words">
                  {dato(user.email_personal)}
                </p>
              </div>
              <div>
                <label className="block text-xs text-gray-400 font-bold uppercase mb-1">
                  Teléfono Móvil
                </label>
                <p className="text-sm font-medium text-gray-800 font-mono">
                  {dato(user.telefono)}
                </p>
              </div>
            </div>

            {/* 3. DOMICILIO */}
            <div className="space-y-4">
              <h3 className="text-[#a72a34] font-bold uppercase tracking-wider text-xs border-b border-gray-200 pb-2 mb-4">
                Domicilio
              </h3>
              <div>
                <label className="block text-xs text-gray-400 font-bold uppercase mb-1">
                  Dirección
                </label>
                <p className="text-sm font-medium text-gray-800">
                  {dato(user.domicilio)}
                </p>
              </div>
              <div>
                <label className="block text-xs text-gray-400 font-bold uppercase mb-1">
                  Colonia
                </label>
                <p className="text-sm font-medium text-gray-800">
                  {dato(user.colonia)}
                </p>
              </div>
            </div>

            {/* 4. ACADÉMICO / PROCEDENCIA */}
            <div className="space-y-4">
              <h3 className="text-[#a72a34] font-bold uppercase tracking-wider text-xs border-b border-gray-200 pb-2 mb-4">
                Perfil Académico
              </h3>
              <div>
                <label className="block text-xs text-gray-400 font-bold uppercase mb-1">
                  Carrera
                </label>
                <p className="text-sm font-medium text-gray-800">
                  {dato(user.nombre_carrera)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 font-bold uppercase mb-1">
                    Sede
                  </label>
                  <p className="text-sm font-medium text-gray-800">
                    {dato(user.nombre_sede)}
                  </p>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 font-bold uppercase mb-1">
                    Modalidad
                  </label>
                  <p className="text-sm font-medium text-gray-800">
                    {dato(user.modalidad)}
                  </p>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 font-bold uppercase mb-1">
                  Escuela de Procedencia
                </label>
                <p className="text-sm font-medium text-gray-800">
                  {dato(user.escuela_procedencia)}
                </p>
              </div>
            </div>

            {/* 5. EMERGENCIA */}
            <div className="space-y-4 md:col-span-2 lg:col-span-1">
              <h3 className="text-red-600 font-bold uppercase tracking-wider text-xs border-b border-gray-200 pb-2 mb-4">
                En Caso de Emergencia
              </h3>
              <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                <div className="mb-3">
                  <label className="block text-xs text-red-400 font-bold uppercase mb-1">
                    Nombre del Contacto
                  </label>
                  <p className="text-sm font-bold text-red-900">
                    {dato(user.contacto_emergencia_nombre)}
                  </p>
                </div>
                <div>
                  <label className="block text-xs text-red-400 font-bold uppercase mb-1">
                    Teléfono de Emergencia
                  </label>
                  <p className="text-sm font-bold text-red-900 font-mono">
                    {dato(user.contacto_emergencia_telefono)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="bg-white p-4 flex justify-end border-t border-gray-100 shrink-0">
          <button
            onClick={onClose}
            className="px-8 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors"
          >
            Cerrar Ficha
          </button>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENTE ASIGNATURAS (INTEGRACIÓN DEFINITIVA) ---
const AsignaturasPage = () => {
  const [asignaturas, setAsignaturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verEliminados, setVerEliminados] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Catálogos
  const [planes, setPlanes] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [grados, setGrados] = useState([]);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [form, setForm] = useState({
    nombre_asignatura: "",
    clave_asignatura: "",
    creditos: "",
    calificacion_max: "100.00",
    calificacion_min: "70.00",
    plan_estudio_id: "",
    tipo_asignatura_id: "",
    grado_id: "",
  });

  // 1. CARGA INTELIGENTE DE DATOS
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = verEliminados
        ? "/admin/asignaturas/eliminadas"
        : "/admin/asignaturas";
      const [dataRes, planesRes, tiposRes, gradosRes] = await Promise.all([
        api.get(endpoint),
        api.get("/admin/catalogos/planes"),
        api.get("/admin/catalogos/tipos-asignatura"),
        api.get("/admin/catalogos/grados"),
      ]);
      setAsignaturas(dataRes.data);
      setPlanes(planesRes.data);
      setTipos(tiposRes.data);
      setGrados(gradosRes.data);
    } catch (e) {
      console.error("Error cargando datos:", e);
    } finally {
      setLoading(false);
    }
  }, [verEliminados]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 2. FUNCIONES DE AYUDA (Para encontrar nombres sin error SQL)
  const getNombrePlan = (id) => {
    const item = planes.find((p) => p.id === id);
    return item ? item.nombre_plan || item.nombre || "Plan " + id : "Sin Plan";
  };
  const getNombreTipo = (id) => {
    const item = tipos.find((t) => t.id === id);
    // Busca cualquier propiedad que parezca un nombre
    return item
      ? item.nombre_tipo_asignatura ||
          item.nombre ||
          item.tipo ||
          item.descripcion ||
          "Tipo " + id
      : "Sin Tipo";
  };
  const getNombreGrado = (id) => {
    const item = grados.find((g) => g.id === id);
    return item
      ? item.nombre_grado || item.nombre || "Grado " + id
      : "Sin Grado";
  };

  // 3. HANDLERS
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingItem)
        await api.put(`/admin/asignaturas/${editingItem.id}`, form);
      else await api.post("/admin/asignaturas", form);
      alert(editingItem ? "Actualizado" : "Creado");
      setModalOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      alert(
        error.response?.data?.message || "Error al guardar. Revisa los campos.",
      );
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Enviar a papelera?")) {
      try {
        await api.delete(`/admin/asignaturas/${id}`);
        fetchData();
      } catch (e) {
        alert("Error");
      }
    }
  };
  const handleRestaurar = async (id) => {
    if (window.confirm("¿Restaurar?")) {
      try {
        await api.put(`/admin/asignaturas/${id}/reactivar`);
        fetchData();
      } catch (e) {
        alert("Error");
      }
    }
  };

  const resetForm = () =>
    setForm({
      nombre_asignatura: "",
      clave_asignatura: "",
      creditos: "",
      calificacion_max: "100.00",
      calificacion_min: "70.00",
      plan_estudio_id: "",
      tipo_asignatura_id: "",
      grado_id: "",
    });

  const openModal = (item = null) => {
    setEditingItem(item);
    if (item) {
      setForm({
        nombre_asignatura: item.nombre_asignatura,
        clave_asignatura: item.clave_asignatura,
        creditos: item.creditos,
        calificacion_max: item.calificacion_max,
        calificacion_min: item.calificacion_min,
        plan_estudio_id: item.plan_estudio_id,
        tipo_asignatura_id: item.tipo_asignatura_id,
        grado_id: item.grado_id,
      });
    } else {
      resetForm();
    }
    setModalOpen(true);
  };

  const filteredAsignaturas = asignaturas.filter(
    (a) =>
      a.nombre_asignatura.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.clave_asignatura &&
        a.clave_asignatura.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-300 max-w-6xl mx-auto">
      {/* HEADER */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">
            {verEliminados ? "Papelera de Materias" : "Catálogo de Asignaturas"}
          </h1>
          <p className="text-gray-500 mt-2 text-lg">
            {verEliminados
              ? "Recupera materias eliminadas."
              : "Gestiona las materias de cada plan de estudios."}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setVerEliminados(!verEliminados)}
            className={`px-5 py-3 rounded-xl font-bold flex items-center gap-2 border-2 ${verEliminados ? "bg-gray-100" : "bg-red-50 text-[#a72a34]"}`}
          >
            {verEliminados ? <ArrowLeft size={18} /> : <Trash2 size={18} />}{" "}
            {verEliminados ? "Volver" : "Papelera"}
          </button>
          {!verEliminados && (
            <button
              onClick={() => openModal()}
              className="bg-[#a72a34] text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-[#802028]"
            >
              <Plus size={20} /> Nueva Materia
            </button>
          )}
        </div>
      </div>

      {/* SEARCH */}
      <div className="relative">
        <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Buscar materia o clave..."
          className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#a72a34]"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* GRID */}
      {loading ? (
        <div className="text-center py-20">Cargando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAsignaturas.length === 0 && (
            <div className="col-span-full p-10 text-center text-gray-400 italic bg-white rounded-2xl border border-dashed">
              No se encontraron asignaturas.
            </div>
          )}
          {filteredAsignaturas.map((a) => (
            <div
              key={a.id}
              className={`p-6 rounded-2xl border flex flex-col justify-between hover:shadow-md transition-all ${verEliminados ? "bg-gray-50 grayscale opacity-80" : "bg-white"}`}
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl shrink-0">
                  <Book size={24} />
                </div>
                <div className="min-w-0 w-full">
                  <h3 className="font-bold text-gray-800 text-lg leading-tight mb-1 truncate">
                    {a.nombre_asignatura}
                  </h3>
                  <div className="flex flex-wrap gap-2 text-xs mb-3">
                    <span className="bg-gray-100 px-2 py-1 rounded border font-mono text-gray-600">
                      {a.clave_asignatura}
                    </span>
                    <span className="bg-blue-50 px-2 py-1 rounded text-blue-700 font-bold">
                      {a.creditos} CR
                    </span>
                  </div>
                  {/* INFO RELACIONADA (Calculada en Frontend) */}
                  <div className="space-y-1.5 pt-2 border-t border-gray-50">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <BookOpen size={14} className="text-gray-400" />{" "}
                      {getNombrePlan(a.plan_estudio_id)}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Tag size={14} className="text-gray-400" />{" "}
                      {getNombreTipo(a.tipo_asignatura_id)}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <GraduationCap size={14} className="text-gray-400" />{" "}
                      {getNombreGrado(a.grado_id)}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-gray-50">
                {!verEliminados ? (
                  <>
                    <button
                      onClick={() => openModal(a)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(a.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 size={18} />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleRestaurar(a.id)}
                    className="text-[#a72a34] font-bold text-xs flex items-center gap-1"
                  >
                    <RotateCcw size={14} /> Restaurar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="font-bold text-xl">
                {editingItem ? "Editar" : "Nueva"} Materia
              </h3>
              <button onClick={() => setModalOpen(false)}>
                <X size={24} className="text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="label">Nombre Asignatura *</label>
                  <input
                    required
                    className="input-field w-full p-3 border rounded-xl"
                    value={form.nombre_asignatura}
                    onChange={(e) =>
                      setForm({ ...form, nombre_asignatura: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="label">Clave *</label>
                  <input
                    required
                    className="input-field w-full p-3 border rounded-xl uppercase"
                    value={form.clave_asignatura}
                    onChange={(e) =>
                      setForm({ ...form, clave_asignatura: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="label">Créditos *</label>
                  <input
                    required
                    type="number"
                    className="input-field w-full p-3 border rounded-xl"
                    value={form.creditos}
                    onChange={(e) =>
                      setForm({ ...form, creditos: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-xl">
                <div>
                  <label className="label">Plan *</label>
                  <select
                    required
                    className="w-full p-3 border rounded-xl bg-white"
                    value={form.plan_estudio_id}
                    onChange={(e) =>
                      setForm({ ...form, plan_estudio_id: e.target.value })
                    }
                  >
                    <option value="">Seleccione...</option>
                    {planes.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre_plan || p.nombre || p.descripcion || p.id}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Tipo *</label>
                  <select
                    required
                    className="w-full p-3 border rounded-xl bg-white"
                    value={form.tipo_asignatura_id}
                    onChange={(e) =>
                      setForm({ ...form, tipo_asignatura_id: e.target.value })
                    }
                  >
                    <option value="">Seleccione...</option>
                    {tipos.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nombre_tipo_asignatura ||
                          t.nombre ||
                          t.tipo ||
                          t.descripcion ||
                          t.id}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Grado *</label>
                  <select
                    required
                    className="w-full p-3 border rounded-xl bg-white"
                    value={form.grado_id}
                    onChange={(e) =>
                      setForm({ ...form, grado_id: e.target.value })
                    }
                  >
                    <option value="">Seleccione...</option>
                    {grados.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.nombre_grado || g.nombre || g.grado || g.id}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Mínima</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full p-3 border rounded-xl"
                    value={form.calificacion_min}
                    onChange={(e) =>
                      setForm({ ...form, calificacion_min: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="label">Máxima</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full p-3 border rounded-xl"
                    value={form.calificacion_max}
                    onChange={(e) =>
                      setForm({ ...form, calificacion_max: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn-secondary flex-1 py-3 rounded-xl border"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#a72a34] text-white py-3 rounded-xl font-bold"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// --- COMPONENTE GRUPOS (ESTANDARIZADO AL DISEÑO DASHBOARD) ---
const GruposPage = () => {
  // ... Mantenemos tu misma lógica y estados ...
  const [grupos, setGrupos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [grupoSeleccionado, setGrupoSeleccionado] = useState(null);
  const [filtroEstatus, setFiltroEstatus] = useState("activo");
  const [catalogos, setCatalogos] = useState({});

  const fetchGrupos = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/grupos");
      setGrupos(data);
      // Carga de catálogos para el modal de crear
      try {
        const [resCarreras, resCiclos, resPlanes, resSedes, resGrados] =
          await Promise.all([
            api.get("/admin/carreras"),
            api.get("/admin/ciclos"),
            api.get("/admin/planes_estudio"),
            api.get("/admin/sedes"),
            api.get("/admin/grados"),
          ]);
        setCatalogos({
          carreras: resCarreras.data,
          ciclos: resCiclos.data,
          planes: resPlanes.data,
          sedes: resSedes.data,
          grados: resGrados.data,
        });
      } catch (e) {
        console.log("Info catálogos", e);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGrupos();
  }, []);

  const gruposFiltrados = grupos.filter((g) => g.estatus === filtroEstatus);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* HEADER: IGUAL AL DASHBOARD (Fondo degradado o limpio) */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">
            Gestión de Grupos
          </h1>
          <p className="text-gray-500 mt-2 text-lg">
            Administra los salones y asignaciones académicas.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-[#a72a34] text-white px-6 py-3 rounded-xl hover:bg-[#802028] font-bold shadow-lg shadow-red-900/20 flex items-center gap-2 transition-transform active:scale-95"
        >
          <Plus size={20} /> Nuevo Grupo
        </button>
      </div>

      {/* FILTROS: Estilo limpio y minimalista */}
      <div className="flex gap-4 border-b border-gray-200 pb-1">
        <button
          onClick={() => setFiltroEstatus("activo")}
          className={`pb-3 px-2 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            filtroEstatus === "activo"
              ? "border-purple-600 text-purple-600"
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          <div
            className={`w-2 h-2 rounded-full ${filtroEstatus === "activo" ? "bg-purple-600" : "bg-gray-300"}`}
          ></div>
          ACTIVOS
        </button>
        <button
          onClick={() => setFiltroEstatus("finalizado")}
          className={`pb-3 px-2 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            filtroEstatus === "finalizado"
              ? "border-gray-800 text-gray-800"
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          <History size={16} /> HISTORIAL
        </button>
      </div>

      {/* GRID: IDENTICO AL DASHBOARD (Tarjetas Blancas Limpias) */}
      {loading ? (
        <div className="text-center py-20 text-gray-400">
          Cargando grupos...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {gruposFiltrados.length === 0 ? (
            <div className="col-span-full py-16 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-gray-400">
              No hay grupos en esta sección.
            </div>
          ) : (
            gruposFiltrados.map((grupo) => (
              <div
                key={grupo.id}
                className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow group h-full"
              >
                <div>
                  {/* Encabezado de Tarjeta: Icono y Badge */}
                  <div className="flex justify-between items-start mb-4">
                    <div
                      className={`p-3 rounded-xl ${grupo.estatus === "activo" ? "bg-purple-50 text-purple-600" : "bg-gray-100 text-gray-500"}`}
                    >
                      <Group size={24} />
                    </div>
                    {grupo.estatus === "activo" && (
                      <span className="bg-green-100 text-green-700 text-[10px] font-black px-2 py-1 rounded uppercase tracking-wider">
                        Activo
                      </span>
                    )}
                  </div>

                  {/* Título Grande */}
                  <h3 className="text-xl font-bold text-gray-800 mb-1 leading-tight">
                    {grupo.nombre_grupo}
                  </h3>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-4">
                    {grupo.nombre_plan || "Sin Plan"}
                  </p>

                  {/* Datos Clave (Grid interno) */}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-gray-50 p-2 rounded-lg">
                      <p className="text-[10px] text-gray-400 uppercase font-bold">
                        Grado
                      </p>
                      <p className="text-sm font-semibold text-gray-700 truncate">
                        {grupo.nombre_grado || "-"}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-2 rounded-lg">
                      <p className="text-[10px] text-gray-400 uppercase font-bold">
                        Modalidad
                      </p>
                      <p className="text-sm font-semibold text-gray-700 truncate">
                        {grupo.modalidad || "Presencial"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Botón de Acción (Full Width) */}
                <button
                  onClick={() => setGrupoSeleccionado(grupo)}
                  className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors 
                    ${
                      grupo.estatus === "activo"
                        ? "bg-gray-900 text-white hover:bg-black"
                        : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                >
                  {grupo.estatus === "activo"
                    ? "Administrar Grupo"
                    : "Ver Detalles"}
                  <ArrowRightCircle size={16} className="opacity-50" />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* MODALES (Se mantienen igual) */}
      {modalOpen && (
        <GrupoModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSuccess={fetchGrupos}
          catalogos={catalogos}
        />
      )}

      {grupoSeleccionado && (
        <GrupoAdminModal
          grupo={grupoSeleccionado}
          onClose={() => {
            setGrupoSeleccionado(null);
            fetchGrupos();
          }}
        />
      )}
    </div>
  );
};

// --- COMPONENTE GRUPO MODAL (DISEÑO MODERNO) ---
const GrupoModal = ({ isOpen, onClose, grupoToEdit, onSuccess, catalogos }) => {
  const [formData, setFormData] = useState({
    nombre_grupo: "",
    cupo: 30,
    ciclo_id: "",
    sede_id: "",
    plan_estudio_id: "",
    grado_id: "",
    modalidad: "presencial",
  });

  useEffect(() => {
    if (grupoToEdit) {
      setFormData({
        nombre_grupo: grupoToEdit.nombre_grupo || "",
        cupo: grupoToEdit.cupo || 30,
        ciclo_id: grupoToEdit.ciclo_id || "",
        sede_id: grupoToEdit.sede_id || "",
        plan_estudio_id: grupoToEdit.plan_estudio_id || "",
        grado_id: grupoToEdit.grado_id || "",
        modalidad: grupoToEdit.modalidad || "presencial",
      });
    } else {
      setFormData({
        nombre_grupo: "",
        cupo: 30,
        ciclo_id: "",
        sede_id: "",
        plan_estudio_id: "",
        grado_id: "",
        modalidad: "presencial",
      });
    }
  }, [grupoToEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (grupoToEdit) {
        await api.put(`/admin/grupos/${grupoToEdit.id}`, formData);
        alert("Grupo actualizado correctamente");
      } else {
        await api.post("/admin/grupos", formData);
        alert("Grupo creado correctamente");
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      alert("Error al guardar el grupo.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
        {/* Encabezado */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">
            {grupoToEdit ? "Editar Grupo" : "Nuevo Grupo Académico"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5"
        >
          {/* Nombre del Grupo */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del Grupo
            </label>
            <input
              type="text"
              name="nombre_grupo"
              value={formData.nombre_grupo}
              onChange={handleChange}
              placeholder="Ej: 1er Semestre A"
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
              required
            />
          </div>

          {/* Modalidad y Cupo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Modalidad
            </label>
            <select
              name="modalidad"
              value={formData.modalidad}
              onChange={handleChange}
              className="w-full p-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-500"
            >
              <option value="presencial">Presencial</option>
              <option value="virtual">Virtual</option>
              <option value="hibrido">Híbrido</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cupo Máximo
            </label>
            <input
              type="number"
              name="cupo"
              value={formData.cupo}
              onChange={handleChange}
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>

          {/* Selects Dinámicos */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Plan de Estudio
            </label>
            <select
              name="plan_estudio_id"
              value={formData.plan_estudio_id}
              onChange={handleChange}
              className="w-full p-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-500"
              required
            >
              <option value="">Seleccione Plan...</option>
              {catalogos.planes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre_plan}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Grado
            </label>
            <select
              name="grado_id"
              value={formData.grado_id}
              onChange={handleChange}
              className="w-full p-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-500"
              required
            >
              <option value="">Seleccione Grado...</option>
              {catalogos.grados.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nombre_grado}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ciclo Escolar
            </label>
            <select
              name="ciclo_id"
              value={formData.ciclo_id}
              onChange={handleChange}
              className="w-full p-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-500"
              required
            >
              <option value="">Seleccione Ciclo...</option>
              {catalogos.ciclos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre_ciclo}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sede
            </label>
            <select
              name="sede_id"
              value={formData.sede_id}
              onChange={handleChange}
              className="w-full p-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-500"
              required
            >
              <option value="">Seleccione Sede...</option>
              {catalogos.sedes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre_sede}
                </option>
              ))}
            </select>
          </div>

          {/* Botones */}
          <div className="md:col-span-2 flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-[#a72a34] text-white rounded-xl hover:bg-[#802028] font-bold shadow-lg"
            >
              Guardar Grupo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- COMPONENTE MIGRACIÓN DE GRUPOS (DISEÑO FINAL MEJORADO) ---
const MigracionPage = () => {
  const [, setLoading] = useState(true);
  const [gruposDisponibles, setGruposDisponibles] = useState([]);

  // Selectores
  const [origenId, setOrigenId] = useState("");
  const [destinoId, setDestinoId] = useState("");

  // Datos
  const [alumnosOrigen, setAlumnosOrigen] = useState([]);
  const [seleccionados, setSeleccionados] = useState([]);
  const [procesando, setProcesando] = useState(false);

  // 1. Cargar Grupos
  useEffect(() => {
    const fetchGrupos = async () => {
      try {
        const { data } = await api.get("/admin/migracion-grupos/estructura");
        setGruposDisponibles(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchGrupos();
  }, []);

  // 2. Cargar Alumnos cuando cambia Origen
  useEffect(() => {
    if (!origenId) {
      setAlumnosOrigen([]);
      setSeleccionados([]);
      return;
    }
    const fetchAlumnos = async () => {
      try {
        const { data } = await api.get(
          `/admin/migracion-grupos/alumnos/${origenId}`,
        );
        setAlumnosOrigen(data);
        setSeleccionados(data.map((a) => a.id));
      } catch (e) {
        console.error(e);
      }
    };
    fetchAlumnos();
  }, [origenId]);

  const toggleAlumno = (id) => {
    if (seleccionados.includes(id)) {
      setSeleccionados(seleccionados.filter((sid) => sid !== id));
    } else {
      setSeleccionados([...seleccionados, id]);
    }
  };

  const toggleAll = () => {
    if (seleccionados.length === alumnosOrigen.length) {
      setSeleccionados([]);
    } else {
      setSeleccionados(alumnosOrigen.map((a) => a.id));
    }
  };

  const handleMigrar = async () => {
    if (!origenId || !destinoId)
      return alert("Selecciona grupo origen y destino");
    if (origenId === destinoId)
      return alert("El grupo origen y destino no pueden ser el mismo");
    if (seleccionados.length === 0)
      return alert("Selecciona al menos un alumno");

    if (
      !window.confirm(`¿Mover ${seleccionados.length} alumnos al nuevo grupo?`)
    )
      return;

    setProcesando(true);
    try {
      // AQUÍ ESTÁ EL CAMBIO IMPORTANTE: Enviamos grupoOrigenId
      await api.post("/admin/migracion-grupos/ejecutar", {
        alumnosIds: seleccionados,
        nuevoGrupoId: destinoId,
        grupoOrigenId: origenId, // <--- AGREGADO
      });
      alert("¡Migración exitosa!");
      setOrigenId("");
      setDestinoId("");
      setAlumnosOrigen([]);
      setSeleccionados([]);
    } catch (error) {
      alert(
        "Error al migrar: " +
          (error.response?.data?.message || "Error interno"),
      );
    } finally {
      setProcesando(false);
    }
  };

  const renderGrupoOption = (g) => {
    return `${g.nombre_ciclo} - ${g.nombre_carrera} - ${g.nombre_grado} "${g.nombre_grupo}"`;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 max-w-7xl mx-auto">
      {/* HEADER ROJO */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight flex items-center gap-3">
            <div className="p-3 bg-[#a72a34] text-white rounded-xl shadow-lg shadow-red-900/20">
              <ArrowRightLeft size={28} />
            </div>
            Migración de Grupos
          </h1>
          <p className="text-gray-500 mt-2 text-lg ml-16">
            Avance de semestre y reinscripción masiva de alumnos.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* COLUMNA IZQUIERDA: ORIGEN */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <label className="text-sm font-bold text-[#a72a34] uppercase mb-3 flex items-center gap-2">
              <LogOut size={16} /> Paso 1: Grupo Actual (Salida)
            </label>
            <div className="relative">
              <select
                className="w-full p-4 pl-4 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#a72a34] outline-none transition-all font-medium text-gray-700 appearance-none cursor-pointer"
                value={origenId}
                onChange={(e) => setOrigenId(e.target.value)}
              >
                <option value="">-- Seleccionar Origen --</option>
                {gruposDisponibles.map((g) => (
                  <option key={g.id} value={g.id}>
                    {renderGrupoOption(g)}
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-4 text-gray-400 pointer-events-none">
                <Group size={20} />
              </div>
            </div>
          </div>

          {origenId && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[500px]">
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center gap-2">
                  <Users size={18} className="text-gray-400" />
                  <h3 className="font-bold text-gray-700">
                    Alumnos Disponibles
                  </h3>
                  <span className="bg-[#a72a34] text-white px-2 py-0.5 rounded text-xs font-bold shadow-sm">
                    {alumnosOrigen.length}
                  </span>
                </div>
                <button
                  onClick={toggleAll}
                  className="text-sm font-bold text-[#a72a34] hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  {seleccionados.length === alumnosOrigen.length
                    ? "Deseleccionar todos"
                    : "Seleccionar todos"}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {alumnosOrigen.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 italic">
                    <p>No hay alumnos en este grupo.</p>
                  </div>
                ) : (
                  alumnosOrigen.map((alumno) => (
                    <label
                      key={alumno.id}
                      className={`
                        group flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all duration-200
                        ${
                          seleccionados.includes(alumno.id)
                            ? "bg-[#a72a34]/5 border-[#a72a34] shadow-sm"
                            : "bg-white border-gray-100 hover:border-[#a72a34]/30 hover:shadow-sm"
                        }
                      `}
                    >
                      <div
                        className={`
                        w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors
                        ${
                          seleccionados.includes(alumno.id)
                            ? "bg-[#a72a34] border-[#a72a34]"
                            : "border-gray-300 bg-white group-hover:border-[#a72a34]"
                        }
                      `}
                      >
                        {seleccionados.includes(alumno.id) && (
                          <Check size={14} className="text-white" />
                        )}
                      </div>
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={seleccionados.includes(alumno.id)}
                        onChange={() => toggleAlumno(alumno.id)}
                      />
                      <div className="flex-1">
                        <p
                          className={`font-bold text-base ${
                            seleccionados.includes(alumno.id)
                              ? "text-[#a72a34]"
                              : "text-gray-700"
                          }`}
                        >
                          {alumno.apellido_paterno} {alumno.apellido_materno}{" "}
                          {alumno.nombre}
                        </p>
                        <p className="text-xs text-gray-400 font-mono mt-0.5 flex items-center gap-1">
                          <Award size={12} />{" "}
                          {alumno.matricula || "Sin Matrícula"}
                        </p>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* COLUMNA DERECHA: DESTINO Y RESUMEN VISUAL */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-[#a72a34]/5 rounded-bl-full -mr-4 -mt-4 pointer-events-none"></div>
            <label className="text-sm font-bold text-[#a72a34] uppercase mb-3 flex items-center gap-2 relative z-10">
              <RotateCcw size={16} className="rotate-180" /> Paso 2: Grupo
              Destino (Entrada)
            </label>
            <div className="relative z-10">
              <select
                className="w-full p-4 pl-4 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#a72a34] outline-none transition-all font-medium text-gray-700 appearance-none cursor-pointer"
                value={destinoId}
                onChange={(e) => setDestinoId(e.target.value)}
              >
                <option value="">-- Seleccionar Destino --</option>
                {gruposDisponibles.map((g) => (
                  <option key={g.id} value={g.id} disabled={g.id === origenId}>
                    {renderGrupoOption(g)}
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-4 text-gray-400 pointer-events-none">
                <Building size={20} />
              </div>
            </div>
          </div>

          {/* TARJETA DE CONFIRMACIÓN VISUAL */}
          <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100 flex flex-col items-center h-auto lg:min-h-[400px] relative">
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <ClipboardCheck size={20} className="text-[#a72a34]" />
              Confirmación de Movimiento
            </h3>

            {/* COMPARATIVA VISUAL */}
            <div className="w-full grid grid-cols-2 gap-4 mb-8">
              {/* CAJA ORIGEN */}
              <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-center">
                <p className="text-xs font-bold text-[#a72a34] uppercase mb-2">
                  Sale de:
                </p>
                {origenId ? (
                  (() => {
                    const g = gruposDisponibles.find((x) => x.id === origenId);
                    return g ? (
                      <div className="text-sm">
                        <div className="font-bold text-gray-800">
                          {g.nombre_grado} "{g.nombre_grupo}"
                        </div>
                        <div className="text-gray-500 text-xs mt-1 leading-tight">
                          {g.nombre_carrera}
                        </div>
                        <div className="text-gray-400 text-xs mt-1">
                          {g.nombre_ciclo}
                        </div>
                      </div>
                    ) : (
                      "Cargando..."
                    );
                  })()
                ) : (
                  <span className="text-gray-400 italic text-sm">--</span>
                )}
              </div>

              {/* FLECHA EN MEDIO */}
              <div className="absolute top-[130px] left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                <div className="bg-white p-2 rounded-full shadow-md border border-gray-100">
                  <ArrowRightLeft size={16} className="text-gray-400" />
                </div>
              </div>

              {/* CAJA DESTINO */}
              <div className="bg-green-50 p-4 rounded-xl border border-green-100 text-center">
                <p className="text-xs font-bold text-green-700 uppercase mb-2">
                  Entra a:
                </p>
                {destinoId ? (
                  (() => {
                    const g = gruposDisponibles.find((x) => x.id === destinoId);
                    return g ? (
                      <div className="text-sm">
                        <div className="font-bold text-gray-800">
                          {g.nombre_grado} "{g.nombre_grupo}"
                        </div>
                        <div className="text-gray-500 text-xs mt-1 leading-tight">
                          {g.nombre_carrera}
                        </div>
                        <div className="text-gray-400 text-xs mt-1">
                          {g.nombre_ciclo}
                        </div>
                      </div>
                    ) : (
                      "Cargando..."
                    );
                  })()
                ) : (
                  <span className="text-gray-400 italic text-sm">--</span>
                )}
              </div>
            </div>

            {/* CONTEO */}
            <div className="bg-gray-50 w-full p-4 rounded-xl mb-6 flex justify-between items-center border border-gray-100">
              <span className="text-gray-600 font-medium text-sm">
                Alumnos a mover:
              </span>
              <span className="text-2xl font-bold text-[#a72a34]">
                {seleccionados.length}
              </span>
            </div>

            {/* BOTÓN DE ACCIÓN */}
            <button
              onClick={handleMigrar}
              disabled={procesando || seleccionados.length === 0 || !destinoId}
              className={`
                w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all duration-300 transform
                ${
                  procesando || seleccionados.length === 0 || !destinoId
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-[#a72a34] text-white hover:bg-[#802028] shadow-lg shadow-red-900/20 hover:shadow-xl hover:-translate-y-1 active:scale-95"
                }
              `}
            >
              {procesando ? (
                "Procesando..."
              ) : (
                <>
                  Confirmar Transferencia <CheckCircle size={22} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENTE ADMINISTRAR GRUPO (MANUAL: Tú decides qué materias agregar) ---
const GrupoAdminModal = ({ grupo, onClose }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("docentes");
  const [loading, setLoading] = useState(true);

  // Datos
  const [data, setData] = useState({ asignaturas: [], alumnos: [] });
  const [grupoActual, setGrupoActual] = useState(grupo);

  // Catálogos
  const [docentes, setDocentes] = useState([]);
  const [alumnosDisponibles, setAlumnosDisponibles] = useState([]);
  const [materiasDisponibles, setMateriasDisponibles] = useState([]); // <--- NUEVO
  const [todosLosGrupos, setTodosLosGrupos] = useState([]);

  // Estados de trabajo
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState("");
  const [materiaSeleccionada, setMateriaSeleccionada] = useState(""); // <--- NUEVO
  const [transferMode, setTransferMode] = useState(null);
  const [targetGroup, setTargetGroup] = useState("");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const groupRes = await api.get(`/admin/grupos/${grupo.id}`);
      setData(groupRes.data);
      setGrupoActual(groupRes.data.grupo);

      const [docRes, dispRes, gruposRes, matRes] = await Promise.all([
        api.get("/admin/docentes"),
        api.get(`/admin/grupos/${grupo.id}/alumnos-disponibles`),
        api.get("/admin/grupos"),
        api.get(`/admin/grupos/${grupo.id}/materias-disponibles`), // <--- NUEVO
      ]);

      setDocentes(docRes.data);
      setAlumnosDisponibles(dispRes.data);
      setTodosLosGrupos(
        gruposRes.data.filter(
          (g) => g.id !== grupo.id && g.estatus === "activo",
        ),
      );
      setMateriasDisponibles(matRes.data); // <--- NUEVO
    } catch (error) {
      console.error(error);
      alert("Error al cargar datos.");
    } finally {
      setLoading(false);
    }
  }, [grupo]);

  useEffect(() => {
    if (grupo) fetchData();
  }, [grupo, fetchData]);

  // --- FUNCIONES NUEVAS DE MATERIAS ---
  const handleAgregarMateria = async () => {
    if (!materiaSeleccionada) return;
    try {
      await api.post(`/admin/grupos/${grupo.id}/agregar-materia`, {
        asignatura_id: materiaSeleccionada,
      });
      alert("Materia agregada al grupo");
      setMateriaSeleccionada("");
      fetchData(); // Recargar para ver la nueva materia y actualizar la lista de disponibles
    } catch (error) {
      alert("Error al agregar materia");
    }
  };

  const handleQuitarMateria = async (asignaturaId) => {
    if (
      window.confirm(
        "¿Quitar esta materia del grupo? Se perderá la asignación del docente (pero no las calificaciones guardadas).",
      )
    ) {
      try {
        await api.delete(
          `/admin/grupos/${grupo.id}/quitar-materia/${asignaturaId}`,
        );
        fetchData();
      } catch (error) {
        alert("Error al quitar materia");
      }
    }
  };

  // --- FUNCIONES EXISTENTES ---
  const handleAsignarDocente = async (aId, dId) => {
    try {
      // En este modo manual, usamos UPDATE porque el registro ya existe (lo creaste al agregar materia)
      // Pero mi backend anterior usaba "INSERT ON DUPLICATE", así que funcionará igual.
      // Ojo: Si tu backend usa INSERT puro, cámbialo a UPDATE en este caso,
      // pero la ruta "asignar-docente" que tienes hace un UPSERT o UPDATE sobre el registro existente.
      await api.post(`/admin/grupos/${grupo.id}/asignar-docente`, {
        asignatura_id: aId,
        docente_id: dId,
      });
      const updated = data.asignaturas.map((a) =>
        a.id === aId ? { ...a, docente_id: dId } : a,
      );
      setData((p) => ({ ...p, asignaturas: updated }));
    } catch (e) {
      alert("Error al asignar docente");
    }
  };
  const handleSubirCalificaciones = (asig) => {
    onClose();
    navigate(`/admin/grupos/${grupo.id}/asignatura/${asig.id}/calificaciones`);
  };
  const handleInscribirAlumno = async () => {
    if (!alumnoSeleccionado) return;
    try {
      await api.post(`/admin/grupos/${grupo.id}/inscribir-alumno`, {
        alumno_id: alumnoSeleccionado,
      });
      setAlumnoSeleccionado("");
      fetchData();
    } catch (e) {
      alert(e.response?.data?.message);
    }
  };
  const handleTransferir = async (id) => {
    if (!targetGroup) return;
    if (window.confirm("¿Transferir?")) {
      try {
        await api.post("/admin/grupos/transferir-alumno", {
          alumnoId: id,
          sourceGroupId: grupo.id,
          destinationGroupId: targetGroup,
        });
        alert("Transferido");
        setTransferMode(null);
        fetchData();
      } catch (e) {
        alert("Error");
      }
    }
  };
  const handleBajaAlumno = async (id) => {
    if (window.confirm("¿Baja?")) {
      try {
        await api.delete(`/admin/grupos/${grupo.id}/dar-baja/${id}`);
        fetchData();
      } catch (e) {
        alert("Error");
      }
    }
  };
  const handleCerrarCiclo = async () => {
    // 1. Pregunta inicial por seguridad
    if (!window.confirm("¿Estás seguro de que deseas cerrar este grupo?"))
      return;

    try {
      // 2. Intentamos cerrarlo normalmente
      await api.put(`/admin/grupos/${grupo.id}/finalizar`);
      alert("✅ Grupo cerrado exitosamente.");
      onClose(); // Cierra el modal automáticamente
    } catch (e) {
      // 3. Si el backend avisa que faltan notas, lanzamos la alerta de forzado
      if (
        e.response?.status === 400 &&
        e.response?.data?.requiresConfirmation
      ) {
        const confirmMsg =
          e.response.data.message +
          "\n\n⚠️ ¿Deseas FORZAR el cierre del grupo? Los alumnos sin nota quedarán sin calificación.";

        if (window.confirm(confirmMsg)) {
          try {
            // Enviamos { force: true } para saltarnos la validación
            await api.put(`/admin/grupos/${grupo.id}/finalizar`, {
              force: true,
            });
            alert("✅ Grupo cerrado de forma forzada.");
            onClose(); // Cierra el modal automáticamente
          } catch (err) {
            alert(err.response?.data?.message || "Error al forzar el cierre.");
          }
        }
      } else {
        // Si es otro error (ej. se cayó el internet)
        alert(
          e.response?.data?.message || "Error al intentar cerrar el grupo.",
        );
      }
    }
  };

  if (!grupo) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
        {/* HEADER */}
        <div className="bg-white p-6 border-b border-gray-200 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-gray-800">
                Administrar Grupo
              </h2>
              <span
                className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                  grupoActual?.estatus === "activo"
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {grupoActual?.estatus}
              </span>
            </div>
            <p className="text-gray-500 text-sm">
              {grupo.nombre_grupo} • {grupo.nombre_plan}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {grupoActual?.estatus === "activo" && (
              <button
                onClick={handleCerrarCiclo}
                className="bg-orange-50 text-orange-700 border border-orange-200 px-4 py-2 rounded-lg hover:bg-orange-100 font-bold text-sm flex items-center gap-2"
              >
                <CheckCircle size={18} /> Validar y Cerrar
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* TABS */}
        <div className="flex border-b border-gray-200 bg-gray-50">
          <button
            onClick={() => setActiveTab("docentes")}
            className={`flex-1 py-4 text-sm font-medium ${
              activeTab === "docentes"
                ? "text-purple-600 border-b-2 border-purple-600 bg-white"
                : "text-gray-500"
            }`}
          >
            Carga Académica
          </button>
          <button
            onClick={() => setActiveTab("alumnos")}
            className={`flex-1 py-4 text-sm font-medium ${
              activeTab === "alumnos"
                ? "text-blue-600 border-b-2 border-blue-600 bg-white"
                : "text-gray-500"
            }`}
          >
            Alumnos
          </button>
        </div>

        {/* CONTENIDO */}
        <div className="flex-1 overflow-y-auto p-6 bg-white">
          {loading ? (
            <div className="text-center py-10">Cargando...</div>
          ) : (
            <>
              {activeTab === "docentes" && (
                <div className="space-y-6">
                  {/* --- ZONA DE AGREGAR MATERIA (NUEVO) --- */}
                  {grupoActual?.estatus === "activo" && (
                    <div className="p-4 bg-purple-50 border border-purple-100 rounded-lg flex gap-3 items-end">
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-purple-800 mb-1 ml-1">
                          Agregar Materia al Grupo
                        </label>
                        <select
                          className="w-full p-2.5 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                          value={materiaSeleccionada}
                          onChange={(e) =>
                            setMateriaSeleccionada(e.target.value)
                          }
                        >
                          <option value="">
                            Selecciona una materia del catálogo...
                          </option>
                          {materiasDisponibles.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.nombre_asignatura} ({m.clave_asignatura})
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        onClick={handleAgregarMateria}
                        disabled={!materiaSeleccionada}
                        className="bg-purple-600 text-white px-5 py-2.5 rounded-lg hover:bg-purple-700 font-medium text-sm flex items-center gap-2 disabled:opacity-50"
                      >
                        <Plus size={16} /> Agregar
                      </button>
                    </div>
                  )}

                  {/* LISTA DE MATERIAS AGREGADAS */}
                  <div className="space-y-3">
                    {data.asignaturas.length === 0 ? (
                      <p className="text-center text-gray-400 py-4 border-2 border-dashed border-gray-100 rounded-lg">
                        Este grupo aún no tiene materias. Agrega una arriba.
                      </p>
                    ) : (
                      data.asignaturas.map((asig) => (
                        <div
                          key={asig.id}
                          className="bg-white p-4 border rounded flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 hover:border-purple-200 transition-colors group"
                        >
                          <div className="flex-1">
                            <h4 className="font-bold text-gray-800">
                              {asig.nombre_asignatura}
                            </h4>
                            <span className="text-xs bg-gray-100 px-1 rounded text-gray-500">
                              {asig.clave_asignatura}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            <select
                              value={asig.docente_id || ""}
                              onChange={(e) =>
                                handleAsignarDocente(asig.id, e.target.value)
                              }
                              className="border p-2 rounded text-sm w-full sm:w-48"
                              disabled={grupoActual?.estatus !== "activo"}
                            >
                              <option value="">-- Sin Docente --</option>
                              {docentes.map((d) => (
                                <option key={d.id} value={d.id}>
                                  {d.nombre} {d.apellido_paterno}
                                </option>
                              ))}
                            </select>

                            <button
                              onClick={() => handleSubirCalificaciones(asig)}
                              className="p-2 text-blue-600 hover:bg-blue-50 border border-blue-200 rounded flex items-center gap-1 text-xs font-bold"
                              title="Subir Calificaciones"
                            >
                              <Upload size={16} /> Notas
                            </button>

                            {/* Botón para quitar materia */}
                            {grupoActual?.estatus === "activo" && (
                              <button
                                onClick={() => handleQuitarMateria(asig.id)}
                                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                                title="Quitar materia del grupo"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {activeTab === "alumnos" && (
                /* ... (TU CÓDIGO DE ALUMNOS SE MANTIENE IGUAL) ... */
                <div className="space-y-6">
                  {grupoActual?.estatus === "activo" && (
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded flex gap-2">
                      <select
                        className="flex-1 border p-2 rounded"
                        value={alumnoSeleccionado}
                        onChange={(e) => setAlumnoSeleccionado(e.target.value)}
                      >
                        <option value="">Seleccionar Alumno...</option>
                        {alumnosDisponibles.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.nombre} {a.apellido_paterno}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={handleInscribirAlumno}
                        className="bg-blue-600 text-white px-4 rounded hover:bg-blue-700"
                      >
                        Inscribir
                      </button>
                    </div>
                  )}
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 text-left">
                        <th className="p-3">Alumno</th>
                        <th className="p-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.alumnos.length === 0 ? (
                        <tr>
                          <td
                            colSpan="2"
                            className="text-center py-4 text-gray-400"
                          >
                            Sin alumnos.
                          </td>
                        </tr>
                      ) : (
                        data.alumnos.map((alum) => (
                          <tr
                            key={alum.id}
                            className="border-b hover:bg-gray-50"
                          >
                            <td className="p-3">
                              <div className="font-medium text-gray-800">
                                {alum.nombre} {alum.apellido_paterno}
                              </div>
                              <div className="text-xs text-gray-400">
                                {alum.email}
                              </div>
                            </td>
                            <td className="p-3 text-right">
                              {transferMode === alum.id ? (
                                <div className="flex justify-end gap-2 items-center animate-in slide-in-from-right-5">
                                  <select
                                    className="border p-1.5 rounded text-sm w-40"
                                    value={targetGroup}
                                    onChange={(e) =>
                                      setTargetGroup(e.target.value)
                                    }
                                    autoFocus
                                  >
                                    <option value="">Destino...</option>
                                    {todosLosGrupos.map((g) => (
                                      <option key={g.id} value={g.id}>
                                        {g.nombre_grupo}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    onClick={() => handleTransferir(alum.id)}
                                    className="bg-green-600 text-white p-1.5 rounded hover:bg-green-700"
                                  >
                                    <Check size={16} />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setTransferMode(null);
                                      setTargetGroup("");
                                    }}
                                    className="bg-gray-200 text-gray-600 p-1.5 rounded hover:bg-gray-300"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex justify-end gap-2">
                                  {grupoActual?.estatus === "activo" && (
                                    <>
                                      <button
                                        onClick={() => {
                                          setTransferMode(alum.id);
                                          setTargetGroup("");
                                        }}
                                        className="text-purple-600 hover:text-purple-800 text-xs font-medium border border-purple-200 px-3 py-1.5 rounded hover:bg-purple-50 flex items-center gap-1"
                                      >
                                        <ArrowRightLeft size={14} /> Transferir
                                      </button>
                                      <button
                                        onClick={() =>
                                          handleBajaAlumno(alum.id)
                                        }
                                        className="text-red-500 hover:text-red-700 text-xs font-medium border border-red-200 px-3 py-1.5 rounded hover:bg-red-50"
                                      >
                                        Baja
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// --- COMPONENTE PÁGINA: SUBIR CALIFICACIONES (CORREGIDO) ---
const SubirCalificacionesPage = () => {
  const { grupoId, asignaturaId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [alumnos, setAlumnos] = useState([]);
  const [info, setInfo] = useState({ materia: "", grupo: "", clave: "" });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Obtener Info del Grupo y Alumnos
        const groupRes = await api.get(`/admin/grupos/${grupoId}`);

        // Datos del encabezado
        const materia = groupRes.data.asignaturas.find(
          (a) => a.id === parseInt(asignaturaId),
        );
        setInfo({
          grupo: groupRes.data.grupo.nombre_grupo,
          materia: materia ? materia.nombre_asignatura : "Materia Desconocida",
          clave: materia ? materia.clave_asignatura : "",
        });

        // 2. Obtener Calificaciones YA GUARDADAS de esta materia
        // (Si esta ruta falla, es porque no pegaste el código del PASO 2 en index.js)
        let calificacionesMap = {};
        try {
          const califRes = await api.get(
            `/admin/calificaciones/${grupoId}/${asignaturaId}`,
          );
          // Creamos un mapa: { id_alumno: calificacion }
          califRes.data.forEach((item) => {
            calificacionesMap[item.alumno_id] = item.calificacion;
          });
        } catch (err) {
          console.error("No hay calificaciones previas o error al cargar", err);
        }

        // 3. Fusionar Alumnos con sus Calificaciones
        const listaFinal = groupRes.data.alumnos.map((alumno) => ({
          ...alumno,
          // Si existe calificación en el mapa, la ponemos. Si no, cadena vacía.
          calificacion:
            calificacionesMap[alumno.id] !== undefined
              ? calificacionesMap[alumno.id]
              : "",
        }));

        setAlumnos(listaFinal);
      } catch (error) {
        console.error(error);
        alert("Error al cargar el listado. Revisa la consola.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [grupoId, asignaturaId]);

  const handleCalificacionChange = (alumnoId, valor) => {
    // Validar que sea número o vacío
    if (valor !== "" && (valor < 0 || valor > 100)) return;

    setAlumnos((prev) =>
      prev.map((a) => (a.id === alumnoId ? { ...a, calificacion: valor } : a)),
    );
  };

  const handleGuardar = async () => {
    try {
      // Filtramos calificaciones válidas (no vacías)
      const calificacionesAEnviar = alumnos
        .filter((a) => a.calificacion !== "" && a.calificacion !== null)
        .map((a) => ({
          alumno_id: a.id,
          calificacion: parseFloat(a.calificacion),
        }));

      if (calificacionesAEnviar.length === 0) {
        return alert("No hay calificaciones para guardar.");
      }

      await api.post("/admin/calificaciones/guardar-lote", {
        grupo_id: grupoId,
        asignatura_id: asignaturaId,
        calificaciones: calificacionesAEnviar,
      });

      // Insertamos una alerta visual de éxito
      alert(
        `¡Éxito! Se guardaron ${calificacionesAEnviar.length} calificaciones correctamente.`,
      );

      // Opcional: No salir de la página para verificar que siguen ahí
      // navigate(-1);
    } catch (error) {
      console.error(error);
      alert(
        "Error grave al guardar. Verifica: 1. Que hayas corrido el SQL del 'unique key'. 2. Que el backend esté corriendo.",
      );
    }
  };

  if (loading)
    return (
      <div className="p-10 text-center text-gray-500">
        Cargando acta de calificaciones...
      </div>
    );

  return (
    <div className="p-6 max-w-5xl mx-auto animate-in fade-in duration-300">
      {/* Encabezado */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft size={24} className="text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Captura de Calificaciones
          </h1>
          <div className="flex gap-2 text-sm text-gray-500 mt-1">
            <span className="font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
              {info.grupo}
            </span>
            <span>•</span>
            <span>
              {info.materia} ({info.clave})
            </span>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center sticky top-0 z-10">
          <span className="font-bold text-gray-700">
            Alumnos Inscritos: {alumnos.length}
          </span>
          <button
            onClick={handleGuardar}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 font-bold flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
          >
            <Save size={18} /> Guardar Cambios
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 text-xs text-gray-500 uppercase font-semibold">
              <tr>
                <th className="px-6 py-4 text-left w-1/2">Nombre del Alumno</th>
                <th className="px-6 py-4 text-center w-48">
                  Calificación (0-100)
                </th>
                <th className="px-6 py-4 text-left text-gray-400 font-normal">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {alumnos.map((alum) => (
                <tr
                  key={alum.id}
                  className="hover:bg-blue-50 transition-colors group"
                >
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-800">
                      {alum.nombre} {alum.apellido_paterno}{" "}
                      {alum.apellido_materno || ""}
                    </div>
                    <div className="text-xs text-gray-500">{alum.email}</div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      className={`w-24 text-center p-2 border-2 rounded-lg focus:ring-4 focus:ring-blue-200 font-bold text-lg transition-all outline-none
                        ${
                          alum.calificacion !== ""
                            ? alum.calificacion >= 70
                              ? "border-green-400 bg-green-50 text-green-800"
                              : "border-red-300 bg-red-50 text-red-800"
                            : "border-gray-300 text-gray-800 focus:border-blue-500"
                        }`}
                      placeholder="-"
                      value={alum.calificacion}
                      onChange={(e) =>
                        handleCalificacionChange(alum.id, e.target.value)
                      }
                    />
                  </td>
                  <td className="px-6 py-4">
                    {alum.calificacion !== "" && (
                      <span
                        className={`text-xs font-bold px-2 py-1 rounded ${
                          alum.calificacion >= 70
                            ? "text-green-600 bg-green-100"
                            : "text-red-600 bg-red-100"
                        }`}
                      >
                        {alum.calificacion >= 70 ? "APROBADO" : "REPROBADO"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {alumnos.length === 0 && (
          <div className="p-10 text-center text-gray-400">
            No se encontraron alumnos en este grupo.
          </div>
        )}
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
    asignatura.docente_id || "",
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
          (error.response?.data?.message || "Error desconocido"),
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
          `/admin/grupos/${grupoId}/alumnos-disponibles`,
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
          (error.response?.data?.message || "Error desconocido"),
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

// --- COMPONENTE CICLOS (CORREGIDO: SIN EL "0") ---
const CiclosPage = () => {
  const [ciclos, setCiclos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ nombre_ciclo: "" });
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [verEliminados, setVerEliminados] = useState(false);

  const fetchCiclos = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = verEliminados
        ? "/admin/ciclos/eliminados"
        : "/admin/ciclos";
      const { data } = await api.get(endpoint);
      if (!verEliminados) {
        setCiclos(data.sort((a, b) => b.actual - a.actual));
      } else {
        setCiclos(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [verEliminados]);

  useEffect(() => {
    fetchCiclos();
  }, [fetchCiclos]);

  const handleGuardar = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) await api.put(`/admin/ciclos/${currentId}`, form);
      else await api.post("/admin/ciclos", form);
      setForm({ nombre_ciclo: "" });
      setIsEditing(false);
      fetchCiclos();
    } catch (e) {
      alert(e.response?.data?.message || "Error al guardar");
    }
  };

  const handleActivar = async (id) => {
    if (!window.confirm("¿Definir como CICLO ACTUAL?")) return;
    try {
      await api.put(`/admin/ciclos/${id}/fijar-actual`);
      window.location.reload();
    } catch (e) {
      alert("Error al activar");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Enviar a la papelera?")) {
      try {
        await api.delete(`/admin/ciclos/${id}`);
        fetchCiclos();
      } catch (e) {
        alert("Error");
      }
    }
  };

  const handleRestaurar = async (id) => {
    if (window.confirm("¿Restaurar este ciclo?")) {
      try {
        await api.put(`/admin/ciclos/${id}/reactivar`);
        fetchCiclos();
      } catch (e) {
        alert("Error");
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 max-w-5xl mx-auto">
      {/* HEADER */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">
            {verEliminados ? "Papelera de Ciclos" : "Ciclos Escolares"}
          </h1>
          <p className="text-gray-500 mt-2 text-lg">
            {verEliminados
              ? "Restaura ciclos eliminados previamente."
              : "Gestiona y define el ciclo activo."}
          </p>
        </div>

        <div className="flex gap-3 items-center">
          <button
            onClick={() => setVerEliminados(!verEliminados)}
            className={`p-3 rounded-xl font-bold flex items-center gap-2 transition-colors ${verEliminados ? "bg-gray-100 text-gray-600" : "bg-red-50 text-[#a72a34]"}`}
            title={verEliminados ? "Volver a Activos" : "Ver Eliminados"}
          >
            {verEliminados ? <ArrowLeft size={20} /> : <Trash2 size={20} />}
            {verEliminados ? "Volver" : "Papelera"}
          </button>

          {!verEliminados && (
            <form onSubmit={handleGuardar} className="flex gap-2">
              <input
                placeholder="Ej: 2026-A"
                className="p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a72a34] w-32 md:w-auto"
                value={form.nombre_ciclo}
                onChange={(e) => setForm({ nombre_ciclo: e.target.value })}
                required
              />
              <button
                type="submit"
                className="bg-[#a72a34] text-white px-4 py-2 rounded-xl font-bold hover:bg-[#802028] shadow-lg shadow-red-900/20"
              >
                {isEditing ? <Save size={20} /> : <Plus size={20} />}
              </button>
              {isEditing && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setForm({ nombre_ciclo: "" });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X />
                </button>
              )}
            </form>
          )}
        </div>
      </div>

      {/* LISTA DE CICLOS */}
      {loading ? (
        <div className="text-center py-10 text-gray-400">Cargando...</div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {ciclos.length === 0 && (
            <div className="text-center py-10 text-gray-400 italic bg-white rounded-2xl border border-dashed border-gray-200">
              No hay ciclos en esta lista.
            </div>
          )}

          {ciclos.map((ciclo) => (
            <div
              key={ciclo.id}
              className={`p-6 rounded-2xl border flex justify-between items-center transition-all ${ciclo.actual ? "bg-white border-[#a72a34] shadow-md ring-1 ring-[#a72a34]" : verEliminados ? "bg-gray-50 border-gray-200 grayscale opacity-80" : "bg-white border-gray-100 hover:shadow-sm"}`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`p-3 rounded-full ${ciclo.actual ? "bg-[#a72a34]/10 text-[#a72a34]" : "bg-gray-100 text-gray-400"}`}
                >
                  <Calendar size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">
                    {ciclo.nombre_ciclo}
                  </h3>

                  {/* --- AQUÍ ESTABA EL ERROR DEL "0" --- */}
                  {/* Corregido: ciclo.actual === 1 */}
                  {ciclo.actual === 1 && (
                    <span className="text-xs font-bold text-[#a72a34] uppercase tracking-wider">
                      Ciclo Actual (Activo)
                    </span>
                  )}
                  {/* ----------------------------------- */}

                  {verEliminados && (
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Eliminado
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!verEliminados && (
                  <>
                    {!ciclo.actual && (
                      <button
                        onClick={() => handleActivar(ciclo.id)}
                        className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-[#a72a34] hover:bg-red-50 rounded-lg transition-colors"
                      >
                        Fijar Actual
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setForm({ nombre_ciclo: ciclo.nombre_ciclo });
                        setIsEditing(true);
                        setCurrentId(ciclo.id);
                      }}
                      className="p-2 text-gray-400 hover:text-blue-600 rounded-lg"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(ciclo.id)}
                      className="p-2 text-gray-400 hover:text-red-600 rounded-lg"
                      title="Eliminar"
                    >
                      <Trash2 size={18} />
                    </button>
                  </>
                )}

                {verEliminados && (
                  <button
                    onClick={() => handleRestaurar(ciclo.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-[#a72a34] text-[#a72a34] rounded-lg font-bold hover:bg-[#a72a34] hover:text-white transition-all shadow-sm"
                  >
                    <RotateCcw size={16} /> Restaurar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// --- COMPONENTE GRADOS (CON PAPELERA Y DISEÑO RED) ---
const GradosPage = () => {
  const [grados, setGrados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentGrado, setCurrentGrado] = useState(null);
  const [form, setForm] = useState({ nombre_grado: "" });

  // ESTADO NUEVO: Control de vista (Activos vs Eliminados)
  const [verEliminados, setVerEliminados] = useState(false);

  const fetchGrados = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = verEliminados
        ? "/admin/grados/eliminados"
        : "/admin/grados";
      const response = await api.get(endpoint);
      setGrados(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [verEliminados]);

  useEffect(() => {
    fetchGrados();
  }, [fetchGrados]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (currentGrado) {
        await api.put(`/admin/grados/${currentGrado.id}`, form);
      } else {
        await api.post("/admin/grados", form);
      }
      setModalOpen(false);
      setCurrentGrado(null);
      setForm({ nombre_grado: "" });
      fetchGrados();
    } catch (error) {
      alert(error.response?.data?.message || "Error al guardar");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Enviar a la papelera?")) {
      try {
        await api.delete(`/admin/grados/${id}`);
        fetchGrados();
      } catch (error) {
        alert("Error al eliminar");
      }
    }
  };

  const handleRestaurar = async (id) => {
    if (window.confirm("¿Restaurar este grado?")) {
      try {
        await api.put(`/admin/grados/${id}/reactivar`);
        fetchGrados();
      } catch (error) {
        alert("Error al restaurar");
      }
    }
  };

  const abrirModal = (grado = null) => {
    setCurrentGrado(grado);
    setForm({ nombre_grado: grado ? grado.nombre_grado : "" });
    setModalOpen(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* HEADER */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">
            {verEliminados ? "Papelera de Grados" : "Grados Académicos"}
          </h1>
          <p className="text-gray-500 mt-2 text-lg">
            {verEliminados
              ? "Recupera grados eliminados."
              : "Catálogo de semestres o cuatrimestres."}
          </p>
        </div>

        <div className="flex gap-3 items-center">
          {/* Botón Papelera */}
          <button
            onClick={() => setVerEliminados(!verEliminados)}
            className={`p-3 rounded-xl font-bold flex items-center gap-2 transition-colors ${verEliminados ? "bg-gray-100 text-gray-600" : "bg-red-50 text-[#a72a34]"}`}
            title={verEliminados ? "Volver a Activos" : "Ver Eliminados"}
          >
            {verEliminados ? <ArrowLeft size={20} /> : <Trash2 size={20} />}
            {verEliminados ? "Volver" : "Papelera"}
          </button>

          {/* Botón Nuevo (Solo en Activos) */}
          {!verEliminados && (
            <button
              onClick={() => abrirModal()}
              className="bg-[#a72a34] text-white px-6 py-3 rounded-xl hover:bg-[#802028] font-bold shadow-lg shadow-red-900/20 flex items-center gap-2 transition-transform active:scale-95"
            >
              <Plus size={20} /> Nuevo Grado
            </button>
          )}
        </div>
      </div>

      {/* GRID */}
      {loading ? (
        <div className="text-center py-20 text-gray-400">Cargando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {grados.length === 0 && (
            <div className="col-span-full text-center py-10 text-gray-400 italic bg-white rounded-2xl border border-dashed border-gray-200">
              No hay grados en esta lista.
            </div>
          )}

          {grados.map((grado) => (
            <div
              key={grado.id}
              className={`bg-white p-6 rounded-2xl border flex items-center justify-between transition-all group ${verEliminados ? "border-gray-200 opacity-80 grayscale" : "border-gray-100 hover:shadow-md"}`}
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gray-50 text-gray-600 rounded-xl">
                  <TrendingUp size={24} />
                </div>
                <h3 className="text-lg font-bold text-gray-800">
                  {grado.nombre_grado}
                </h3>
              </div>

              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {!verEliminados ? (
                  <>
                    <button
                      onClick={() => abrirModal(grado)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(grado.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 size={18} />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleRestaurar(grado.id)}
                    className="flex items-center gap-1 px-3 py-1 bg-white border border-[#a72a34] text-[#a72a34] rounded-lg font-bold text-xs hover:bg-[#a72a34] hover:text-white transition-colors"
                  >
                    <RotateCcw size={14} /> Restaurar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800">
                {currentGrado ? "Editar Grado" : "Nuevo Grado"}
              </h3>
              <button onClick={() => setModalOpen(false)}>
                <X size={24} className="text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Nombre
                </label>
                <input
                  autoFocus
                  className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#a72a34]"
                  placeholder="Ej: 1er Semestre"
                  value={form.nombre_grado}
                  onChange={(e) => setForm({ nombre_grado: e.target.value })}
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-3 text-gray-600 hover:bg-gray-100 rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-[#a72a34] text-white rounded-xl hover:bg-[#802028] font-bold shadow-lg transition-transform active:scale-95"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// --- COMPONENTE PLANES DE ESTUDIO (CON PAPELERA Y DISEÑO RED) ---
const PlanesEstudioPage = () => {
  const [planes, setPlanes] = useState([]);
  const [carreras, setCarreras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [currentPlan, setCurrentPlan] = useState(null);

  // ESTADO NUEVO: Control de vista (Activos vs Eliminados)
  const [verEliminados, setVerEliminados] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = verEliminados
        ? "/admin/planes_estudio/eliminados"
        : "/admin/planes_estudio";
      const [planesRes, carrerasRes] = await Promise.all([
        api.get(endpoint),
        api.get("/admin/carreras"),
      ]);
      setPlanes(planesRes.data);
      setCarreras(carrerasRes.data);
    } catch (error) {
      console.error("Error al cargar datos:", error);
    } finally {
      setLoading(false);
    }
  }, [verEliminados]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id) => {
    if (window.confirm("¿Enviar a la papelera?")) {
      try {
        await api.delete(`/admin/planes_estudio/${id}`);
        fetchData();
      } catch (error) {
        alert("Error al eliminar.");
      }
    }
  };

  const handleRestaurar = async (id) => {
    if (window.confirm("¿Restaurar este plan?")) {
      try {
        await api.put(`/admin/planes_estudio/${id}/reactivar`);
        fetchData();
      } catch (error) {
        alert("Error al restaurar.");
      }
    }
  };

  const openModal = (plan = null) => {
    setCurrentPlan(plan);
    setModalOpen(true);
  };

  const filteredPlanes = planes.filter(
    (p) =>
      p.nombre_plan.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.nombre_carrera &&
        p.nombre_carrera.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* HEADER */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">
            {verEliminados ? "Papelera de Planes" : "Planes de Estudio"}
          </h1>
          <p className="text-gray-500 mt-2 text-lg">
            {verEliminados
              ? "Recupera planes eliminados anteriormente."
              : "Administra las retículas y mapas curriculares."}
          </p>
        </div>

        <div className="flex gap-3 items-center">
          {/* Botón Papelera */}
          <button
            onClick={() => setVerEliminados(!verEliminados)}
            className={`p-3 rounded-xl font-bold flex items-center gap-2 transition-colors ${verEliminados ? "bg-gray-100 text-gray-600" : "bg-red-50 text-[#a72a34]"}`}
            title={verEliminados ? "Volver a Activos" : "Ver Eliminados"}
          >
            {verEliminados ? <ArrowLeft size={20} /> : <Trash2 size={20} />}
            {verEliminados ? "Volver" : "Papelera"}
          </button>

          {/* Botón Nuevo (Solo en Activos) */}
          {!verEliminados && (
            <button
              onClick={() => openModal()}
              className="bg-[#a72a34] text-white px-6 py-3 rounded-xl hover:bg-[#802028] font-bold shadow-lg shadow-red-900/20 flex items-center gap-2 transition-transform active:scale-95"
            >
              <Plus size={20} /> Nuevo Plan
            </button>
          )}
        </div>
      </div>

      {/* BUSCADOR */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Buscar por nombre o carrera..."
          className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#a72a34] bg-white shadow-sm font-medium"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* GRID */}
      {loading ? (
        <div className="text-center py-20 text-gray-400">Cargando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlanes.length === 0 && (
            <div className="col-span-full text-center py-10 text-gray-400 italic bg-white rounded-2xl border border-dashed border-gray-200">
              No se encontraron planes.
            </div>
          )}

          {filteredPlanes.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white p-6 rounded-2xl border transition-all group relative overflow-hidden ${verEliminados ? "border-gray-200 opacity-80 grayscale" : "border-gray-100 hover:shadow-md"}`}
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-[#a72a34]"></div>

              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-gray-50 rounded-xl text-gray-600">
                  <FileText size={24} />
                </div>

                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!verEliminados ? (
                    <>
                      <button
                        onClick={() => openModal(plan)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(plan.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={18} />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleRestaurar(plan.id)}
                      className="flex items-center gap-1 px-3 py-1 bg-white border border-[#a72a34] text-[#a72a34] rounded-lg font-bold text-xs hover:bg-[#a72a34] hover:text-white transition-colors"
                    >
                      <RotateCcw size={14} /> Restaurar
                    </button>
                  )}
                </div>
              </div>

              <h3 className="text-xl font-bold text-gray-800 mb-1">
                {plan.nombre_plan}
              </h3>

              {plan.nombre_carrera ? (
                <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#bb9a5a]/10 text-[#bb9a5a] text-xs font-bold uppercase mt-2">
                  <GraduationCap size={14} />
                  {plan.nombre_carrera}
                </div>
              ) : (
                <span className="text-xs text-gray-400 italic mt-2 block">
                  Sin carrera asignada
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* MODAL */}
      {modalOpen && (
        <PlanModal
          plan={currentPlan}
          carreras={carreras}
          onClose={() => setModalOpen(false)}
          onSave={fetchData}
        />
      )}
    </div>
  );
};

// --- SUBCOMPONENTE MODAL (PARA NO SATURAR) ---
const PlanModal = ({ plan, carreras, onClose, onSave }) => {
  const [form, setForm] = useState({ nombre_plan: "", carrera_id: "" });

  useEffect(() => {
    if (plan) {
      setForm({
        nombre_plan: plan.nombre_plan,
        carrera_id: plan.carrera_id || "",
      });
    }
  }, [plan]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (plan) await api.put(`/admin/planes_estudio/${plan.id}`, form);
      else await api.post("/admin/planes_estudio", form);
      onSave();
      onClose();
    } catch (e) {
      alert("Error al guardar");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-800">
            {plan ? "Editar Plan" : "Nuevo Plan"}
          </h3>
          <button onClick={onClose}>
            <X size={24} className="text-gray-400 hover:text-gray-600" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Nombre del Plan
            </label>
            <input
              autoFocus
              className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#a72a34]"
              placeholder="Ej: Licenciatura en Pedagogía 2025"
              value={form.nombre_plan}
              onChange={(e) =>
                setForm({ ...form, nombre_plan: e.target.value })
              }
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Carrera Asociada
            </label>
            <select
              className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#a72a34] bg-white"
              value={form.carrera_id}
              onChange={(e) => setForm({ ...form, carrera_id: e.target.value })}
            >
              <option value="">-- Seleccionar Carrera --</option>
              {carreras.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre_carrera}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 text-gray-600 hover:bg-gray-100 rounded-xl font-bold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-[#a72a34] text-white rounded-xl hover:bg-[#802028] font-bold shadow-lg transition-transform active:scale-95"
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- COMPONENTE CARRERAS (DISEÑO TARJETAS TIPO "GRADOS") ---
const CarrerasPage = () => {
  const [carreras, setCarreras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verEliminados, setVerEliminados] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Estado para el Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({ nombre_carrera: "" });

  const fetchCarreras = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = verEliminados
        ? "/admin/carreras/eliminadas"
        : "/admin/carreras";
      const { data } = await api.get(endpoint);
      setCarreras(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [verEliminados]);

  useEffect(() => {
    fetchCarreras();
  }, [fetchCarreras]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await api.put(`/admin/carreras/${editingItem.id}`, form);
        alert("Carrera actualizada correctamente.");
      } else {
        await api.post("/admin/carreras", form);
        alert("Carrera creada correctamente.");
      }
      setModalOpen(false);
      setForm({ nombre_carrera: "" });
      setEditingItem(null);
      fetchCarreras();
    } catch (error) {
      alert(error.response?.data?.message || "Error al guardar");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Enviar esta carrera a la papelera?")) {
      try {
        await api.delete(`/admin/carreras/${id}`);
        fetchCarreras();
      } catch (e) {
        alert("Error al eliminar");
      }
    }
  };

  const handleRestaurar = async (id) => {
    if (window.confirm("¿Restaurar carrera?")) {
      try {
        await api.put(`/admin/carreras/${id}/reactivar`);
        fetchCarreras();
      } catch (e) {
        alert("Error al restaurar");
      }
    }
  };

  const openModal = (item = null) => {
    setEditingItem(item);
    setForm({ nombre_carrera: item ? item.nombre_carrera : "" });
    setModalOpen(true);
  };

  const filteredCarreras = carreras.filter((c) =>
    c.nombre_carrera.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-300 max-w-5xl mx-auto">
      {/* HEADER */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">
            {verEliminados ? "Papelera de Carreras" : "Oferta Académica"}
          </h1>
          <p className="text-gray-500 mt-2 text-lg">
            {verEliminados
              ? "Carreras desactivadas."
              : "Licenciaturas e Ingenierías disponibles."}
          </p>
        </div>

        <div className="flex gap-3 items-center">
          <button
            onClick={() => setVerEliminados(!verEliminados)}
            className={`px-5 py-3 rounded-xl font-bold flex items-center gap-2 border-2 transition-colors ${verEliminados ? "bg-gray-100 border-gray-200 text-gray-600" : "bg-red-50 border-red-50 text-[#a72a34]"}`}
          >
            {verEliminados ? <ArrowLeft size={18} /> : <Trash2 size={18} />}
            {verEliminados ? "Volver" : "Papelera"}
          </button>

          {!verEliminados && (
            <button
              onClick={() => openModal()}
              className="bg-[#a72a34] text-white px-6 py-3 rounded-xl hover:bg-[#802028] font-bold flex items-center gap-2 shadow-lg shadow-red-900/20 transition-transform active:scale-95"
            >
              <Plus size={20} /> Nueva Carrera
            </button>
          )}
        </div>
      </div>

      {/* BUSCADOR */}
      <div className="relative">
        <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Buscar carrera..."
          className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#a72a34] bg-white shadow-sm font-medium"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* GRID DE TARJETAS (ESTILO GRADOS) */}
      {loading ? (
        <div className="text-center py-20 text-gray-400">Cargando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCarreras.length === 0 && (
            <div className="col-span-full p-10 text-center text-gray-400 italic bg-white rounded-2xl border border-dashed border-gray-200">
              No se encontraron carreras.
            </div>
          )}

          {filteredCarreras.map((c) => (
            <div
              key={c.id}
              className={`p-6 rounded-2xl border flex justify-between items-center transition-all group ${verEliminados ? "bg-gray-50 border-gray-200 grayscale opacity-80" : "bg-white border-gray-100 hover:shadow-md hover:border-[#a72a34]/30"}`}
            >
              <div className="flex items-center gap-4 overflow-hidden">
                <div
                  className={`p-3 rounded-xl flex-shrink-0 ${verEliminados ? "bg-gray-200 text-gray-500" : "bg-red-50 text-[#a72a34]"}`}
                >
                  <BookOpen size={24} />
                </div>
                <div className="flex flex-col min-w-0">
                  <h3 className="font-bold text-gray-800 text-lg truncate pr-2">
                    {c.nombre_carrera}
                  </h3>
                  {verEliminados && (
                    <span className="text-xs text-red-500 font-bold uppercase tracking-wider">
                      Eliminada
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {!verEliminados ? (
                  <>
                    <button
                      onClick={() => openModal(c)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit size={20} />
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 size={20} />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleRestaurar(c.id)}
                    className="flex items-center gap-2 px-3 py-2 bg-white border border-[#a72a34] text-[#a72a34] rounded-lg font-bold text-sm hover:bg-[#a72a34] hover:text-white transition-all shadow-sm"
                  >
                    <RotateCcw size={16} /> Restaurar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL CREAR/EDITAR */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
            <div className="bg-white p-6 border-b flex justify-between items-center">
              <h3 className="font-bold text-xl text-gray-800">
                {editingItem ? "Editar Carrera" : "Nueva Carrera"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:bg-gray-100 p-2 rounded-full"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">
                  Nombre Oficial
                </label>
                <input
                  required
                  autoFocus
                  placeholder="Ej: Licenciatura en Derecho"
                  className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a72a34] outline-none font-medium text-gray-800"
                  value={form.nombre_carrera}
                  onChange={(e) =>
                    setForm({ ...form, nombre_carrera: e.target.value })
                  }
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#a72a34] text-white py-3 rounded-xl font-bold hover:bg-[#802028] shadow-lg transition-transform active:scale-95"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// --- COMPONENTE SEDES (DISEÑO TARJETAS + SOFT DELETE) ---
const SedesPage = () => {
  const [sedes, setSedes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verEliminados, setVerEliminados] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Estado para el Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({ nombre_sede: "" });

  const fetchSedes = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = verEliminados
        ? "/admin/sedes/eliminadas"
        : "/admin/sedes";
      const { data } = await api.get(endpoint);
      setSedes(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [verEliminados]);

  useEffect(() => {
    fetchSedes();
  }, [fetchSedes]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await api.put(`/admin/sedes/${editingItem.id}`, form);
        alert("Sede actualizada correctamente.");
      } else {
        await api.post("/admin/sedes", form);
        alert("Sede creada correctamente.");
      }
      setModalOpen(false);
      setForm({ nombre_sede: "" });
      setEditingItem(null);
      fetchSedes();
    } catch (error) {
      alert(error.response?.data?.message || "Error al guardar");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Enviar esta sede a la papelera?")) {
      try {
        await api.delete(`/admin/sedes/${id}`);
        fetchSedes();
      } catch (e) {
        alert("Error al eliminar");
      }
    }
  };

  const handleRestaurar = async (id) => {
    if (window.confirm("¿Restaurar sede?")) {
      try {
        await api.put(`/admin/sedes/${id}/reactivar`);
        fetchSedes();
      } catch (e) {
        alert("Error al restaurar");
      }
    }
  };

  const openModal = (item = null) => {
    setEditingItem(item);
    setForm({ nombre_sede: item ? item.nombre_sede : "" });
    setModalOpen(true);
  };

  const filteredSedes = sedes.filter((s) =>
    s.nombre_sede.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-300 max-w-5xl mx-auto">
      {/* HEADER */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">
            {verEliminados ? "Papelera de Sedes" : "Sedes y Campus"}
          </h1>
          <p className="text-gray-500 mt-2 text-lg">
            {verEliminados
              ? "Sedes desactivadas."
              : "Administra las ubicaciones físicas."}
          </p>
        </div>

        <div className="flex gap-3 items-center">
          <button
            onClick={() => setVerEliminados(!verEliminados)}
            className={`px-5 py-3 rounded-xl font-bold flex items-center gap-2 border-2 transition-colors ${verEliminados ? "bg-gray-100 border-gray-200 text-gray-600" : "bg-red-50 border-red-50 text-[#a72a34]"}`}
          >
            {verEliminados ? <ArrowLeft size={18} /> : <Trash2 size={18} />}
            {verEliminados ? "Volver" : "Papelera"}
          </button>

          {!verEliminados && (
            <button
              onClick={() => openModal()}
              className="bg-[#a72a34] text-white px-6 py-3 rounded-xl hover:bg-[#802028] font-bold flex items-center gap-2 shadow-lg shadow-red-900/20 transition-transform active:scale-95"
            >
              <Plus size={20} /> Nueva Sede
            </button>
          )}
        </div>
      </div>

      {/* BUSCADOR */}
      <div className="relative">
        <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Buscar sede..."
          className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#a72a34] bg-white shadow-sm font-medium"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* GRID DE TARJETAS (ESTILO GRADOS) */}
      {loading ? (
        <div className="text-center py-20 text-gray-400">Cargando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSedes.length === 0 && (
            <div className="col-span-full p-10 text-center text-gray-400 italic bg-white rounded-2xl border border-dashed border-gray-200">
              No se encontraron sedes.
            </div>
          )}

          {filteredSedes.map((s) => (
            <div
              key={s.id}
              className={`p-6 rounded-2xl border flex justify-between items-center transition-all group ${verEliminados ? "bg-gray-50 border-gray-200 grayscale opacity-80" : "bg-white border-gray-100 hover:shadow-md hover:border-[#a72a34]/30"}`}
            >
              <div className="flex items-center gap-4 overflow-hidden">
                <div
                  className={`p-3 rounded-xl flex-shrink-0 ${verEliminados ? "bg-gray-200 text-gray-500" : "bg-red-50 text-[#a72a34]"}`}
                >
                  <Building size={24} />
                </div>
                <div className="flex flex-col min-w-0">
                  <h3 className="font-bold text-gray-800 text-lg truncate pr-2">
                    {s.nombre_sede}
                  </h3>
                  {verEliminados && (
                    <span className="text-xs text-red-500 font-bold uppercase tracking-wider">
                      Eliminada
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {!verEliminados ? (
                  <>
                    <button
                      onClick={() => openModal(s)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit size={20} />
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 size={20} />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleRestaurar(s.id)}
                    className="flex items-center gap-2 px-3 py-2 bg-white border border-[#a72a34] text-[#a72a34] rounded-lg font-bold text-sm hover:bg-[#a72a34] hover:text-white transition-all shadow-sm"
                  >
                    <RotateCcw size={16} /> Restaurar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL CREAR/EDITAR */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
            <div className="bg-white p-6 border-b flex justify-between items-center">
              <h3 className="font-bold text-xl text-gray-800">
                {editingItem ? "Editar Sede" : "Nueva Sede"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:bg-gray-100 p-2 rounded-full"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">
                  Nombre de la Sede
                </label>
                <input
                  required
                  autoFocus
                  placeholder="Ej: Campus Norte"
                  className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a72a34] outline-none font-medium text-gray-800"
                  value={form.nombre_sede}
                  onChange={(e) =>
                    setForm({ ...form, nombre_sede: e.target.value })
                  }
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#a72a34] text-white py-3 rounded-xl font-bold hover:bg-[#802028] shadow-lg transition-transform active:scale-95"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// --- COMPONENTE CONCEPTOS DE PAGO (NOMBRE SINGULAR PARA CORREGIR ERROR) ---
// --- COMPONENTE CONCEPTOS DE PAGO (ADMIN DASHBOARD ROJO) ---
const ConceptosPagoPage = () => {
  const [conceptos, setConceptos] = useState([]);
  const [, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [form, setForm] = useState({
    nombre_concepto: "",
    monto_default: "",
    tipo: "UNICO", // o RECURRENTE
    es_concepto_inscripcion: false,
  });

  // Cargar datos
  const fetchConceptos = useCallback(async () => {
    try {
      // OJO: Aquí debe coincidir con la ruta que acabamos de crear
      const { data } = await api.get("/admin/conceptos_pago");
      setConceptos(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConceptos();
  }, [fetchConceptos]);

  // Handlers
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await api.put(`/admin/conceptos_pago/${editingItem.id}`, form);
      } else {
        await api.post("/admin/conceptos_pago", form);
      }
      alert(editingItem ? "Actualizado" : "Creado");
      setModalOpen(false);
      resetForm();
      fetchConceptos();
    } catch (error) {
      alert("Error al guardar");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Eliminar este concepto?")) {
      try {
        await api.delete(`/admin/conceptos_pago/${id}`);
        fetchConceptos();
      } catch (e) {
        alert("No se puede eliminar, tal vez ya tiene adeudos ligados.");
      }
    }
  };

  const resetForm = () =>
    setForm({
      nombre_concepto: "",
      monto_default: "",
      tipo: "UNICO",
      es_concepto_inscripcion: false,
    });

  const openModal = (item = null) => {
    setEditingItem(item);
    if (item) {
      setForm({
        nombre_concepto: item.nombre_concepto,
        monto_default: item.monto_default,
        tipo: item.tipo,
        es_concepto_inscripcion: item.es_concepto_inscripcion === 1,
      });
    } else {
      resetForm();
    }
    setModalOpen(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 max-w-6xl mx-auto">
      {/* HEADER */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <div className="p-3 bg-[#a72a34] text-white rounded-xl shadow-lg shadow-red-900/20">
              <DollarSign size={28} />
            </div>
            Catálogo de Pagos
          </h1>
          <p className="text-gray-500 mt-2 text-lg ml-16">
            Define los costos de inscripción, colegiaturas y servicios.
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-[#a72a34] text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-[#802028] shadow-lg transition-all"
        >
          <Plus size={20} /> Nuevo Concepto
        </button>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {conceptos.map((c) => (
          <div
            key={c.id}
            className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="flex justify-between items-start mb-4">
                <div
                  className={`p-2 rounded-lg ${c.tipo === "RECURRENTE" ? "bg-blue-50 text-blue-600" : "bg-orange-50 text-orange-600"}`}
                >
                  {c.tipo === "RECURRENTE" ? (
                    <RotateCcw size={20} />
                  ) : (
                    <FileText size={20} />
                  )}
                </div>
                <div className="text-right">
                  <span className="block text-2xl font-bold text-gray-800">
                    ${c.monto_default}
                  </span>
                  <span className="text-xs text-gray-400">MXN</span>
                </div>
              </div>
              <h3 className="font-bold text-gray-800 text-lg mb-1">
                {c.nombre_concepto}
              </h3>
              <div className="flex gap-2 mt-2">
                <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500 font-medium">
                  {c.tipo}
                </span>
                {c.es_concepto_inscripcion === 1 && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-bold flex items-center gap-1">
                    <CheckCircle size={10} /> Inscripción
                  </span>
                )}
              </div>
            </div>

            <div className="border-t mt-6 pt-4 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => openModal(c)}
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
              >
                <Edit size={18} />
              </button>
              <button
                onClick={() => handleDelete(c.id)}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-xl text-gray-800">
                {editingItem ? "Editar" : "Nuevo"} Concepto
              </h3>
              <button onClick={() => setModalOpen(false)}>
                <X size={24} className="text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="label">Nombre del Concepto</label>
                <input
                  required
                  className="input-field w-full p-3 border rounded-xl focus:ring-[#a72a34]"
                  value={form.nombre_concepto}
                  onChange={(e) =>
                    setForm({ ...form, nombre_concepto: e.target.value })
                  }
                  placeholder="Ej. Mensualidad Enero"
                />
              </div>
              <div>
                <label className="label">Costo Estándar ($)</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  className="input-field w-full p-3 border rounded-xl"
                  value={form.monto_default}
                  onChange={(e) =>
                    setForm({ ...form, monto_default: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="label">Tipo de Cobro</label>
                <select
                  className="w-full p-3 border rounded-xl bg-white"
                  value={form.tipo}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                >
                  <option value="UNICO">Pago Único (Ej. Constancia)</option>
                  <option value="RECURRENTE">
                    Recurrente (Ej. Colegiatura)
                  </option>
                </select>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <input
                  type="checkbox"
                  className="w-5 h-5 text-[#a72a34] rounded focus:ring-0"
                  checked={form.es_concepto_inscripcion}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      es_concepto_inscripcion: e.target.checked,
                    })
                  }
                />
                <span className="text-sm font-medium text-gray-700">
                  ¿Es costo de inscripción?
                </span>
              </div>

              <button
                type="submit"
                className="w-full bg-[#a72a34] text-white py-3 rounded-xl font-bold mt-2 hover:bg-[#802028] shadow-lg"
              >
                Guardar Concepto
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// --- COMPONENTE CORREOS INSTITUCIONALES (ADMIN) ---
const CorreosInstitucionalesPage = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroRol, setFiltroRol] = useState("todos");
  const [filtroConfig, setFiltroConfig] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);
  const [ordenarPor, setOrdenarPor] = useState("id");
  const [ordenDir, setOrdenDir] = useState("desc");
  const [passwords, setPasswords] = useState({});
  const porPagina = 20;

  const fetchData = useCallback(async () => {
    try {
      const { data } = await api.get("/admin/email/institucionales");
      setUsuarios(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setPagina(1);
  }, [busqueda, filtroRol, filtroConfig]);

  const copiarAlPortapapeles = (texto) => {
    navigator.clipboard.writeText(texto);
  };

  const verPassword = async (userId) => {
    if (passwords[userId]) { setPasswords((p) => ({ ...p, [userId]: "" })); return; }
    try {
      const { data } = await api.get(`/admin/email/institucionales/${userId}/password`);
      setPasswords((p) => ({ ...p, [userId]: data.password || "Sin contraseña" }));
    } catch (e) {
      setPasswords((p) => ({ ...p, [userId]: "Error al obtener" }));
    }
  };

  const restablecerPasswordUser = async (userId) => {
    if (!window.confirm("¿Restablecer contraseña de correo? Se generará una nueva automáticamente.")) return;
    try {
      const { data } = await api.post(`/admin/email/institucionales/${userId}/restablecer-password`);
      setPasswords((p) => ({ ...p, [userId]: data.password }));
      alert(`✅ Contraseña restablecida\n\nCorreo: ${data.email}\nNueva: ${data.password}`);
    } catch (e) {
      alert("Error al restablecer: " + (e.response?.data?.error || e.message));
    }
  };

  const exportarCSV = () => {
    const cabeceras = "Matricula,Nombre,Correo Institucional,Correo Personal,Rol,Configurado\n";
    const filas = usuariosFiltrados.map((u) =>
      [
        u.matricula,
        `${u.nombre} ${u.apellido_paterno}`,
        u.email,
        u.email_personal || "",
        u.rol,
        u.correo_configurado ? "Si" : "No",
      ].join(","),
    );
    const blob = new Blob([cabeceras + filas.join("\n")], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "correos_institucionales.csv";
    link.click();
  };

  const handleSort = (col) => {
    if (ordenarPor === col) setOrdenDir(ordenDir === "asc" ? "desc" : "asc");
    else { setOrdenarPor(col); setOrdenDir("asc"); }
  };

  const sortIcon = (col) => {
    if (ordenarPor !== col) return " ↕";
    return ordenDir === "asc" ? " ↑" : " ↓";
  };

  const usuariosFiltrados = usuarios
    .filter((u) => {
      if (filtroRol !== "todos" && u.rol !== filtroRol) return false;
      if (filtroConfig === "configurado" && !u.correo_configurado) return false;
      if (filtroConfig === "no_configurado" && u.correo_configurado) return false;
      if (busqueda) {
        const q = busqueda.toLowerCase();
        return (
          u.nombre.toLowerCase().includes(q) ||
          (u.apellido_paterno || "").toLowerCase().includes(q) ||
          (u.email || "").toLowerCase().includes(q) ||
          (u.matricula || "").toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      const dir = ordenDir === "asc" ? 1 : -1;
      let va = a[ordenarPor];
      let vb = b[ordenarPor];
      if (ordenarPor === "nombre") {
        va = `${a.nombre} ${a.apellido_paterno}`.toLowerCase();
        vb = `${b.nombre} ${b.apellido_paterno}`.toLowerCase();
      }
      if (typeof va === "string") return va.localeCompare(vb) * dir;
      return ((va || 0) - (vb || 0)) * dir;
    });

  const totalPaginas = Math.max(1, Math.ceil(usuariosFiltrados.length / porPagina));
  const paginaActual = Math.min(pagina, totalPaginas);
  const inicio = (paginaActual - 1) * porPagina;
  const usuariosPagina = usuariosFiltrados.slice(inicio, inicio + porPagina);

  const totalConfigurados = usuarios.filter((u) => u.correo_configurado).length;
  const totalNoConfigurados = usuarios.filter((u) => !u.correo_configurado).length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Correos Institucionales</h1>
          <p className="text-sm text-gray-500 mt-1">
            {usuarios.length} usuarios &middot; {totalConfigurados} configurados &middot; {totalNoConfigurados} sin configurar
          </p>
        </div>
        <button onClick={exportarCSV} className="bg-[#a72a34] hover:bg-[#8f242d] text-white px-4 py-2 rounded-lg text-sm font-bold shadow">
          Exportar CSV
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <input className="flex-1 min-w-[200px] p-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#a72a34] outline-none"
          placeholder="Buscar por nombre, email o matrícula..." value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)} />
        <select className="p-2.5 border border-gray-200 rounded-xl text-sm bg-white" value={filtroRol}
          onChange={(e) => setFiltroRol(e.target.value)}>
          <option value="todos">Todos los roles</option>
          <option value="alumno">Alumnos</option>
          <option value="docente">Docentes</option>
          <option value="admin">Administradores</option>
          <option value="control_escolar">Control Escolar</option>
          <option value="aspirante">Aspirantes</option>
        </select>
        <select className="p-2.5 border border-gray-200 rounded-xl text-sm bg-white" value={filtroConfig}
          onChange={(e) => setFiltroConfig(e.target.value)}>
          <option value="todos">Todos los estados</option>
          <option value="configurado">Configurados</option>
          <option value="no_configurado">Sin configurar</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Cargando...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-bold border-b border-gray-100">
              <tr>
                <th className="p-4 cursor-pointer select-none hover:text-gray-700" onClick={() => handleSort("matricula")}>
                  Matrícula<span className="text-gray-300">{sortIcon("matricula")}</span>
                </th>
                <th className="p-4 cursor-pointer select-none hover:text-gray-700" onClick={() => handleSort("nombre")}>
                  Nombre<span className="text-gray-300">{sortIcon("nombre")}</span>
                </th>
                <th className="p-4 cursor-pointer select-none hover:text-gray-700" onClick={() => handleSort("email")}>
                  Correo Institucional<span className="text-gray-300">{sortIcon("email")}</span>
                </th>
                <th className="p-4">Correo Personal</th>
                <th className="p-4 cursor-pointer select-none hover:text-gray-700" onClick={() => handleSort("rol")}>
                  Rol<span className="text-gray-300">{sortIcon("rol")}</span>
                </th>
                <th className="p-4 cursor-pointer select-none hover:text-gray-700" onClick={() => handleSort("correo_configurado")}>
                  Estado<span className="text-gray-300">{sortIcon("correo_configurado")}</span>
                </th>
                <th className="p-4">Contraseña</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {usuariosPagina.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 text-sm font-mono text-gray-600">{u.matricula}</td>
                  <td className="p-4 text-sm font-medium text-gray-900">{u.nombre} {u.apellido_paterno}</td>
                  <td className="p-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <span className="truncate max-w-[180px]">{u.email}</span>
                      <button onClick={() => copiarAlPortapapeles(u.email)}
                        className="text-gray-400 hover:text-[#a72a34] shrink-0" title="Copiar">
                        📋
                      </button>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-gray-500">{u.email_personal || "—"}</td>
                  <td className="p-4">
                    <span className="text-xs px-2 py-1 rounded-full font-medium bg-gray-100 text-gray-600">{u.rol}</span>
                  </td>
                  <td className="p-4">
                    {u.correo_configurado ? (
                      <span className="text-xs px-2 py-1 rounded-full font-medium bg-green-100 text-green-700">Configurado</span>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded-full font-medium bg-red-100 text-red-700">Sin configurar</span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      {passwords[u.id] ? (
                        <>
                          <span className="text-xs font-mono text-gray-700 select-all max-w-[100px] truncate">{passwords[u.id]}</span>
                          <button onClick={() => copiarAlPortapapeles(passwords[u.id])}
                            className="text-gray-400 hover:text-[#a72a34] text-xs" title="Copiar">📋</button>
                          <button onClick={() => verPassword(u.id)} className="text-gray-400 hover:text-red-600 text-xs" title="Ocultar">✕</button>
                        </>
                      ) : (
                        <button onClick={() => verPassword(u.id)}
                          className="text-xs text-[#a72a34] hover:text-[#8f242d] font-medium">
                          {u.correo_configurado ? "Ver" : "—"}
                        </button>
                      )}
                      <button onClick={() => restablecerPasswordUser(u.id)}
                        className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 rounded font-medium ml-1">
                        Reset
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {usuariosPagina.length === 0 && (
                <tr><td colSpan="7" className="p-10 text-center text-gray-400">No se encontraron usuarios.</td></tr>
              )}
            </tbody>
          </table>

          {totalPaginas > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
              <span className="text-xs text-gray-500">
                Mostrando {inicio + 1}-{Math.min(inicio + porPagina, usuariosFiltrados.length)} de {usuariosFiltrados.length}
              </span>
              <div className="flex gap-1">
                <button onClick={() => setPagina(paginaActual - 1)} disabled={paginaActual <= 1}
                  className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed">Anterior</button>
                {Array.from({ length: Math.min(totalPaginas, 5) }, (_, i) => {
                  const start = Math.max(1, Math.min(paginaActual - 2, totalPaginas - 4));
                  const page = start + i;
                  if (page > totalPaginas) return null;
                  return (
                    <button key={page} onClick={() => setPagina(page)}
                      className={`px-3 py-1.5 text-xs rounded-lg border ${page === paginaActual ? "bg-[#a72a34] text-white border-[#a72a34]" : "border-gray-200 bg-white hover:bg-gray-100"}`}>{page}</button>
                  );
                })}
                <button onClick={() => setPagina(paginaActual + 1)} disabled={paginaActual >= totalPaginas}
                  className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed">Siguiente</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// --- COMPONENTE CAJA (DISEÑO CLEAN DASHBOARD) ---
const CajaPage = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [filtro, setFiltro] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsuarios = async () => {
      try {
        const { data } = await api.get("/admin/usuarios");
        setUsuarios(
          data.filter((u) => u.rol === "alumno" || u.rol === "aspirante"),
        );
      } catch (error) {
        console.error("Error", error);
      }
    };
    fetchUsuarios();
  }, []);

  const alumnosFiltrados = usuarios.filter(
    (u) =>
      u.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
      u.apellido_paterno.toLowerCase().includes(filtro.toLowerCase()) ||
      (u.matricula && u.matricula.includes(filtro)),
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* HEADER */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">
            Caja y Finanzas
          </h1>
          <p className="text-gray-500 mt-2 text-lg">
            Gestión de pagos y estados de cuenta.
          </p>
        </div>
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar alumno por nombre o matrícula..."
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white shadow-sm font-medium"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
          />
        </div>
      </div>

      {/* TABLA DE RESULTADOS */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-bold border-b border-gray-100">
            <tr>
              <th className="p-5">Alumno</th>
              <th className="p-5">Matrícula</th>
              <th className="p-5">Estatus</th>
              <th className="p-5 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {alumnosFiltrados.map((user) => (
              <tr
                key={user.id}
                className="hover:bg-green-50/30 transition-colors"
              >
                <td className="p-5 font-bold text-gray-800">
                  {user.nombre} {user.apellido_paterno}{" "}
                  {user.apellido_materno || ""}
                </td>
                <td className="p-5 font-mono text-gray-500">
                  {user.matricula || "---"}
                </td>
                <td className="p-5">
                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${user.rol === "aspirante" ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"}`}
                  >
                    {user.rol}
                  </span>
                </td>
                <td className="p-5 text-right">
                  <button
                    onClick={() =>
                      navigate(`/admin/finanzas/alumno/${user.id}`)
                    }
                    className="text-sm font-bold text-green-700 hover:text-green-900 hover:underline flex items-center justify-end gap-1"
                  >
                    <DollarSign size={16} /> Ver Cuenta
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {alumnosFiltrados.length === 0 && (
          <div className="p-10 text-center text-gray-400">
            No se encontraron alumnos.
          </div>
        )}
      </div>
    </div>
  );
};

// --- COMPONENTE DETALLE FINANZAS ALUMNO (ADMIN VIEW) ---
const DetalleFinanzasAlumnoPage = () => {
  const { id } = useParams(); // ID del alumno
  const [movimientos, setMovimientos] = useState([]);
  const [alumno, setAlumno] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [cargoModalOpen, setCargoModalOpen] = useState(false);
  const [conceptos, setConceptos] = useState([]);

  // Formulario Nuevo Cargo
  const [formCargo, setFormCargo] = useState({
    concepto_id: "",
    fecha_vencimiento: new Date().toISOString().split("T")[0],
  });

  // Cargar datos
  const fetchData = useCallback(async () => {
    try {
      const { data } = await api.get(`/admin/alumnos/${id}/finanzas`);
      setMovimientos(data);
      if (data.length > 0) {
        setAlumno({
          nombre: `${data[0].nombre} ${data[0].apellido_paterno} ${data[0].apellido_materno || ""}`,
          matricula: data[0].matricula,
        });
      }
      const resConceptos = await api.get("/admin/conceptos_pago");
      setConceptos(resConceptos.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handlers
  const handleRegistrarPago = async (adeudoId) => {
    if (
      window.confirm("¿Confirmar recepción del pago en efectivo/transferencia?")
    ) {
      try {
        await api.put(`/admin/finanzas/pagar/${adeudoId}`);
        alert("Pago registrado correctamente.");
        fetchData();
      } catch (e) {
        alert("Error al registrar pago.");
      }
    }
  };

  const handleCrearCargo = async (e) => {
    e.preventDefault();
    try {
      await api.post("/admin/finanzas/cargo", { ...formCargo, alumno_id: id });
      alert("Cargo asignado.");
      setCargoModalOpen(false);
      fetchData();
    } catch (e) {
      alert("Error al asignar cargo.");
    }
  };

  const handleEliminarCargo = async (adeudoId) => {
    if (window.confirm("¿Eliminar este cargo incorrecto?")) {
      try {
        await api.delete(`/admin/finanzas/cargo/${adeudoId}`);
        fetchData(); // <--- CORREGIDO AQUÍ
      } catch (e) {
        alert("Error al eliminar.");
      }
    }
  };

  // --- NUEVA FUNCIÓN: EDITAR FECHA DE PAGO (¡AHORA SÍ ESTÁ AFUERA!) ---
  const handleEditarFechaPago = async (adeudoId, fechaActual) => {
    const fechaOriginal = fechaActual ? fechaActual.split("T")[0] : "";

    const nuevaFecha = prompt(
      "Editar fecha de pago (Debe tener el formato AAAA-MM-DD):",
      fechaOriginal,
    );

    if (nuevaFecha && nuevaFecha !== fechaOriginal) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(nuevaFecha)) {
        return alert(
          "❌ Formato inválido. Debe ser exactamente AAAA-MM-DD (ej. 2024-05-20)",
        );
      }

      try {
        await api.put(`/admin/finanzas/editar-fecha-pago/${adeudoId}`, {
          fecha_pago: nuevaFecha,
        });
        alert("✅ Fecha de pago actualizada correctamente.");
        fetchData(); // <--- CORREGIDO AQUÍ
      } catch (err) {
        alert("Error al actualizar la fecha.");
      }
    }
  };

  const getEstatusBadge = (estatus) => {
    switch (estatus) {
      case "pagado":
        return "bg-green-100 text-green-800";
      case "pendiente":
        return "bg-yellow-100 text-yellow-800";
      case "vencido":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatMoney = (amount) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount);

  const formatDate = (dateString) => {
    if (!dateString || dateString.startsWith("0000-")) return "N/A";
    const parts = dateString.split("T")[0].split("-");
    if (parts.length !== 3) return "Fecha Inválida";
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    if (isNaN(date.getTime())) return "Fecha Inválida";
    return date.toLocaleDateString("es-MX");
  };

  if (loading)
    return (
      <div className="text-center py-10 text-gray-500">
        Cargando estado de cuenta...
      </div>
    );
  if (!alumno)
    return (
      <div className="text-center py-10 text-gray-500">
        Alumno no encontrado.
      </div>
    );

  return (
    <div className="space-y-8 animate-in fade-in duration-300 max-w-7xl mx-auto">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight flex items-center gap-3">
            <div className="p-3 bg-[#a72a34] text-white rounded-xl shadow-lg shadow-red-900/20">
              <DollarSign size={28} />
            </div>
            Finanzas del Alumno
          </h1>
          <p className="text-gray-500 mt-2 text-lg ml-16 flex items-center gap-2">
            <Users size={18} /> {alumno.nombre}
            <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono border text-gray-600">
              {alumno.matricula}
            </span>
          </p>
        </div>
        <button
          onClick={() => setCargoModalOpen(true)}
          className="bg-[#a72a34] text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-[#802028] shadow-lg transition-all"
        >
          <Plus size={20} /> Nuevo Cargo
        </button>
      </div>

      <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
        <div className="flex justify-between items-center mb-4 border-b pb-4">
          <h3 className="text-xl font-bold text-gray-800">
            Historial de Cuenta
          </h3>
        </div>
        <table className="w-full table-auto text-sm">
          <thead className="text-left bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-gray-600 font-bold uppercase">
                Concepto
              </th>
              <th className="px-4 py-3 text-gray-600 font-bold uppercase">
                Monto
              </th>
              <th className="px-4 py-3 text-gray-600 font-bold uppercase">
                Vencimiento
              </th>
              <th className="px-4 py-3 text-gray-600 font-bold uppercase">
                Estatus
              </th>
              <th className="px-4 py-3 text-gray-600 font-bold uppercase">
                Acción / Fecha Pago
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {movimientos.map((a) => (
              <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-4 font-bold text-gray-800">
                  {a.nombre_concepto}
                </td>
                <td className="px-4 py-4 font-medium">
                  {formatMoney(a.monto_a_pagar)}
                </td>
                <td className="px-4 py-4 text-gray-600">
                  {formatDate(a.fecha_vencimiento)}
                </td>
                <td className="px-4 py-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${getEstatusBadge(a.estatus_pago)}`}
                  >
                    {a.estatus_pago}
                  </span>
                </td>
                <td className="px-4 py-4">
                  {/* Convertimos a minúsculas por si la BD manda "PAGADO" o "Pagado" */}
                  {a.estatus_pago?.toLowerCase() !== "pagado" ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRegistrarPago(a.id)}
                        className="px-4 py-2 text-sm font-bold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Cobrar
                      </button>
                      <button
                        onClick={() => handleEliminarCargo(a.id)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 text-green-700 font-bold bg-green-50 px-3 py-2 rounded-lg w-max border border-green-200">
                      <span>{formatDate(a.fecha_pago)}</span>

                      {/* BOTÓN DE EDITAR MÁS VISIBLE */}
                      <button
                        onClick={() =>
                          handleEditarFechaPago(a.id, a.fecha_pago)
                        }
                        className="flex items-center gap-1 p-1.5 bg-white text-gray-600 hover:text-blue-600 hover:bg-blue-100 border border-gray-300 rounded shadow-sm transition-all"
                        title="Modificar fecha del pago"
                      >
                        <Edit size={14} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {movimientos.length === 0 && (
              <tr>
                <td
                  colSpan="5"
                  className="text-center text-gray-500 py-10 italic"
                >
                  Este alumno no tiene adeudos registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {cargoModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-xl text-gray-800">Nuevo Cargo</h3>
              <button
                onClick={() => setCargoModalOpen(false)}
                className="text-gray-400 hover:text-gray-800"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCrearCargo} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Concepto de Pago
                </label>
                <select
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#a72a34] bg-white"
                  required
                  value={formCargo.concepto_id}
                  onChange={(e) =>
                    setFormCargo({ ...formCargo, concepto_id: e.target.value })
                  }
                >
                  <option value="">Seleccione...</option>
                  {conceptos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre_concepto} (${c.monto_default})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Fecha Límite
                </label>
                <input
                  type="date"
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#a72a34]"
                  value={formCargo.fecha_vencimiento}
                  onChange={(e) =>
                    setFormCargo({
                      ...formCargo,
                      fecha_vencimiento: e.target.value,
                    })
                  }
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setCargoModalOpen(false)}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-[#a72a34] text-white rounded-xl font-bold hover:bg-[#802028]"
                >
                  Generar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const MisPagosPage = () => {
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estadísticas calculadas
  const [totalPendiente, setTotalPendiente] = useState(0);
  const [totalPagado, setTotalPagado] = useState(0);

  useEffect(() => {
    const fetchFinanzas = async () => {
      try {
        const { data } = await api.get("/alumno/finanzas/resumen");
        setMovimientos(data);

        // Calcular totales
        const pendiente = data
          .filter(
            (m) =>
              m.estatus_pago === "pendiente" || m.estatus_pago === "vencido",
          )
          .reduce((acc, curr) => acc + parseFloat(curr.monto_a_pagar), 0);

        const pagado = data
          .filter((m) => m.estatus_pago === "pagado")
          .reduce((acc, curr) => acc + parseFloat(curr.monto_a_pagar), 0);

        setTotalPendiente(pendiente);
        setTotalPagado(pagado);
      } catch (error) {
        console.error("Error cargando pagos:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchFinanzas();
  }, []);

  // Formateador de dinero
  const formatMoney = (amount) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount);
  };

  // Formateador de fecha
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("es-MX", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 max-w-7xl mx-auto p-6">
      {/* HEADER */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight flex items-center gap-3">
            <div className="p-3 bg-[#a72a34] text-white rounded-xl shadow-lg shadow-red-900/20">
              <DollarSign size={28} />
            </div>
            Estado de Cuenta
          </h1>
          <p className="text-gray-500 mt-2 text-lg ml-16">
            Consulta tu historial de pagos y adeudos pendientes.
          </p>
        </div>
      </div>

      {/* TARJETAS DE RESUMEN */}
      <div id="pagos-resumen" className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tarjeta Pendiente */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 rounded-bl-full -mr-4 -mt-4 z-0"></div>
          <div className="z-10">
            <p className="text-gray-500 font-medium mb-1 uppercase text-sm tracking-wider">
              Saldo Pendiente
            </p>
            <h2 className="text-4xl font-bold text-[#a72a34]">
              {formatMoney(totalPendiente)}
            </h2>
            <p className="text-xs text-red-400 mt-2 font-medium flex items-center gap-1">
              {totalPendiente > 0 ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>{" "}
                  Requiere atención
                </>
              ) : (
                "Estás al corriente"
              )}
            </p>
          </div>
          <div className="z-10 p-4 bg-red-50 rounded-full text-[#a72a34]">
            <AlertCircle size={32} />
          </div>
        </div>

        {/* Tarjeta Pagado */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-green-50 rounded-bl-full -mr-4 -mt-4 z-0"></div>
          <div className="z-10">
            <p className="text-gray-500 font-medium mb-1 uppercase text-sm tracking-wider">
              Total Pagado
            </p>
            <h2 className="text-4xl font-bold text-green-600">
              {formatMoney(totalPagado)}
            </h2>
            <p className="text-xs text-green-400 mt-2 font-medium">
              Histórico acumulado
            </p>
          </div>
          <div className="z-10 p-4 bg-green-50 rounded-full text-green-600">
            <CheckCircle size={32} />
          </div>
        </div>
      </div>

      {/* LISTA DE MOVIMIENTOS */}
      <div
        id="pagos-lista"
        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
      >
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <h3 className="font-bold text-gray-700 text-lg flex items-center gap-2">
            <FileText size={20} className="text-gray-400" /> Movimientos
          </h3>
        </div>

        {loading ? (
          <div className="p-10 text-center text-gray-400">
            Cargando información financiera...
          </div>
        ) : movimientos.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
              <DollarSign size={32} />
            </div>
            <p className="text-gray-500 text-lg">
              No hay registros de pagos o adeudos.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {movimientos.map((mov) => (
              <div
                key={mov.id}
                className="p-6 hover:bg-gray-50 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                {/* IZQUIERDA: CONCEPTO Y FECHAS */}
                <div className="flex items-start gap-4">
                  <div
                    className={`
                    w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border
                    ${mov.estatus_pago === "pagado" ? "bg-green-50 border-green-100 text-green-600" : "bg-red-50 border-red-100 text-[#a72a34]"}
                  `}
                  >
                    {mov.estatus_pago === "pagado" ? (
                      <Check size={24} />
                    ) : (
                      <Clock size={24} />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800 text-lg">
                      {mov.nombre_concepto}
                    </h4>
                    <div className="flex flex-col sm:flex-row sm:gap-4 text-sm mt-1 text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar size={14} /> Vence:{" "}
                        {formatDate(mov.fecha_vencimiento)}
                      </span>
                      {mov.fecha_pago && (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle size={14} /> Pagado el:{" "}
                          {formatDate(mov.fecha_pago)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* DERECHA: MONTO Y ESTATUS */}
                <div className="text-right w-full md:w-auto">
                  <div className="font-bold text-2xl text-gray-800">
                    {formatMoney(mov.monto_a_pagar)}
                  </div>
                  <div
                    className={`
                    inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide mt-1
                    ${
                      mov.estatus_pago === "pagado"
                        ? "bg-green-100 text-green-700"
                        : mov.estatus_pago === "vencido"
                          ? "bg-red-100 text-red-700"
                          : "bg-yellow-100 text-yellow-700"
                    }
                  `}
                  >
                    {mov.estatus_pago === "pagado"
                      ? "Pagado"
                      : mov.estatus_pago === "vencido"
                        ? "Vencido"
                        : "Pendiente"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
// --- FIN COMPONENTE: MisPagosPage (Alumno) ---

// ... (después del componente MisPagosPage)

// --- INICIA NUEVO COMPONENTE: MisSolicitudesPage (Alumno) ---
const MisSolicitudesPage = () => {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [tipoSolicitud, setTipoSolicitud] = useState("constancia_estudios"); // Valor inicial
  const [motivo, setMotivo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Tipos de solicitud predefinidos (puedes expandir esto)
  const tiposDisponibles = [
    { value: "constancia_estudios", label: "Constancia de Estudios" },
    { value: "kardex_impreso", label: "Historial Académico (Kardex Impreso)" },
    { value: "baja_temporal", label: "Baja Temporal" },
    { value: "otro", label: "Otro (Especificar en motivo)" },
  ];

  const fetchSolicitudes = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/alumno/mis-solicitudes");
      setSolicitudes(data);
    } catch (error) {
      console.error("Error al cargar mis solicitudes", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSolicitudes();
  }, [fetchSolicitudes]);

  const handleOpenModal = () => {
    setTipoSolicitud("constancia_estudios"); // Resetea al abrir
    setMotivo("");
    setError("");
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await api.post("/alumno/solicitudes", {
        tipo_solicitud: tipoSolicitud,
        motivo,
      });
      setShowModal(false);
      fetchSolicitudes(); // Recargar la lista
    } catch (error) {
      console.error("Error al enviar solicitud", error);
      setError(
        error.response?.data?.message || "Error al enviar la solicitud.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const getEstatusInfo = (estatus) => {
    switch (estatus) {
      case "solicitado":
        return {
          text: "Solicitado",
          color: "bg-blue-100 text-blue-800",
          icon: FileClock,
        };
      case "en_revision":
        return {
          text: "En Revisión",
          color: "bg-yellow-100 text-yellow-800",
          icon: FileClock,
        };
      case "listo_para_entrega":
        return {
          text: "Listo para Entrega",
          color: "bg-green-100 text-green-800",
          icon: FileCheck,
        };
      case "rechazado":
        return {
          text: "Rechazado",
          color: "bg-red-100 text-red-800",
          icon: FileX,
        };
      case "cancelado":
        return {
          text: "Cancelado",
          color: "bg-gray-100 text-gray-800",
          icon: FileX,
        };
      default:
        return {
          text: estatus,
          color: "bg-gray-100 text-gray-800",
          icon: FileClock,
        };
    }
  };

  // Helper para formatear fechas DATETIME (copiado de MisPagosPage)
  const renderFechaHora = (fechaString) => {
    if (!fechaString || fechaString.startsWith("0000-")) return "N/A";
    const date = new Date(fechaString);
    if (isNaN(date.getTime())) return "Fecha Inválida";
    return date.toLocaleString();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">Mis Solicitudes</h2>
        <button
          id="solicitudes-btn"
          onClick={handleOpenModal}
          className="flex items-center px-4 py-2 font-semibold text-white bg-principal rounded-md hover:opacity-90"
        >
          <FilePlus className="w-5 h-5 mr-2" />
          Nueva Solicitud
        </button>
      </div>

      <div id="solicitudes-lista" className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-xl font-bold mb-4">Historial</h3>
        {loading ? (
          <p>Cargando historial...</p>
        ) : solicitudes.length === 0 ? (
          <p className="text-gray-500">
            No has realizado ninguna solicitud aún.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-auto text-sm">
              <thead className="text-left bg-gray-50">
                <tr>
                  <th className="px-4 py-2">Tipo</th>
                  <th className="px-4 py-2">Fecha Solicitud</th>
                  <th className="px-4 py-2">Estatus</th>
                  <th className="px-4 py-2">Comentarios Admin</th>
                  <th className="px-4 py-2">Última Actualización</th>
                </tr>
              </thead>
              <tbody>
                {solicitudes.map((s) => {
                  const estatusInfo = getEstatusInfo(s.estatus);
                  return (
                    <tr key={s.id} className="border-b">
                      <td className="px-4 py-2 font-medium">
                        {tiposDisponibles.find(
                          (t) => t.value === s.tipo_solicitud,
                        )?.label || s.tipo_solicitud}
                      </td>
                      <td className="px-4 py-2">
                        {renderFechaHora(s.fecha_solicitud)}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`flex items-center px-3 py-1 rounded-full text-xs font-semibold ${estatusInfo.color}`}
                        >
                          <estatusInfo.icon size={14} className="mr-1" />
                          {estatusInfo.text}
                        </span>
                      </td>
                      <td className="px-4 py-2 italic text-gray-600">
                        {s.comentarios_admin || "--"}
                      </td>
                      <td className="px-4 py-2">
                        {renderFechaHora(s.fecha_ultima_actualizacion)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal para Nueva Solicitud */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
            >
              <X size={24} />
            </button>
            <h3 className="text-2xl font-bold mb-6">Nueva Solicitud</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="tipo_solicitud"
                  className="block text-sm font-medium text-gray-700"
                >
                  Tipo de Solicitud
                </label>
                <select
                  id="tipo_solicitud"
                  value={tipoSolicitud}
                  onChange={(e) => setTipoSolicitud(e.target.value)}
                  className="w-full px-3 py-2 mt-1 border rounded-md"
                  required
                >
                  {tiposDisponibles.map((tipo) => (
                    <option key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="motivo"
                  className="block text-sm font-medium text-gray-700"
                >
                  Motivo / Detalles (Opcional)
                </label>
                <textarea
                  id="motivo"
                  rows="4"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder={
                    tipoSolicitud === "otro"
                      ? "Por favor, especifica qué necesitas..."
                      : "Si necesitas añadir detalles, hazlo aquí..."
                  }
                  className="w-full px-3 py-2 mt-1 border rounded-md"
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex justify-end space-x-4 mt-8">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-principal text-white rounded-md hover:opacity-90 disabled:bg-gray-400"
                >
                  {isSubmitting ? "Enviando..." : "Enviar Solicitud"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
// --- FIN COMPONENTE: MisSolicitudesPage (Alumno) ---

// --- COMPONENTE SOLICITUDES (DISEÑO CLEAN DASHBOARD) ---
const GestionSolicitudesPage = () => {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstatus, setFiltroEstatus] = useState("solicitado");
  const [showModal, setShowModal] = useState(false);
  const [selectedSolicitud, setSelectedSolicitud] = useState(null);
  const [nuevoEstatus, setNuevoEstatus] = useState("");
  const [comentariosAdmin, setComentariosAdmin] = useState("");
  const [, setErrorModal] = useState("");

  const estatusDisponibles = [
    "solicitado",
    "en_revision",
    "listo_para_entrega",
    "rechazado",
    "cancelado",
  ];

  const fetchSolicitudes = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get(
        `/admin/solicitudes?estatus=${filtroEstatus}`,
      );
      setSolicitudes(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [filtroEstatus]);

  useEffect(() => {
    fetchSolicitudes();
  }, [fetchSolicitudes]);

  const handleOpenModal = (solicitud) => {
    setSelectedSolicitud(solicitud);
    setNuevoEstatus(solicitud.estatus);
    setComentariosAdmin(solicitud.comentarios_admin || "");
    setShowModal(true);
  };

  const handleUpdateEstatus = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/admin/solicitudes/${selectedSolicitud.id}/estatus`, {
        nuevo_estatus: nuevoEstatus,
        comentarios_admin: comentariosAdmin,
      });
      setShowModal(false);
      fetchSolicitudes();
    } catch (error) {
      setErrorModal("Error al actualizar");
    }
  };

  const renderFechaHora = (fechaString) => {
    if (!fechaString) return "N/A";
    return new Date(fechaString).toLocaleString();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* HEADER */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">
            Solicitudes de Alumnos
          </h1>
          <p className="text-gray-500 mt-2 text-lg">
            Constancias, Kardex y trámites escolares.
          </p>
        </div>

        {/* Filtro Integrado en Header */}
        <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl border border-gray-200">
          <select
            value={filtroEstatus}
            onChange={(e) => setFiltroEstatus(e.target.value)}
            className="bg-transparent font-bold text-gray-700 text-sm p-2 outline-none cursor-pointer"
          >
            <option value="">-- Todas --</option>
            {estatusDisponibles.map((e) => (
              <option key={e} value={e}>
                {e.replace("_", " ").toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* TABLA */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-400">Cargando...</div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-bold border-b border-gray-100">
              <tr>
                <th className="p-5">Alumno</th>
                <th className="p-5">Trámite</th>
                <th className="p-5">Fecha</th>
                <th className="p-5">Estatus</th>
                <th className="p-5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {solicitudes.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-10 text-center text-gray-400">
                    Sin solicitudes.
                  </td>
                </tr>
              ) : (
                solicitudes.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-5 font-bold text-gray-800">
                      {s.nombre_alumno}
                    </td>
                    <td className="p-5 capitalize text-gray-600">
                      {s.tipo_solicitud.replace("_", " ")}
                    </td>
                    <td className="p-5 text-sm text-gray-500">
                      {renderFechaHora(s.fecha_solicitud)}
                    </td>
                    <td className="p-5">
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider
                      ${
                        s.estatus === "solicitado"
                          ? "bg-blue-100 text-blue-800"
                          : s.estatus === "listo_para_entrega"
                            ? "bg-green-100 text-green-800"
                            : s.estatus === "rechazado"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                      }`}
                      >
                        {s.estatus.replace("_", " ")}
                      </span>
                    </td>
                    <td className="p-5 text-right">
                      <button
                        onClick={() => handleOpenModal(s)}
                        className="text-blue-600 hover:bg-blue-50 px-3 py-1 rounded-lg font-bold text-sm transition-colors"
                      >
                        Gestionar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal se mantiene funcional igual que antes, solo lo envolví en el diseño */}
      {showModal && selectedSolicitud && (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-xl">Actualizar Solicitud</h3>
              <button onClick={() => setShowModal(false)}>
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleUpdateEstatus} className="p-6 space-y-4">
              <div className="bg-gray-50 p-4 rounded-xl mb-4">
                <p className="text-sm text-gray-500 font-bold uppercase">
                  Alumno
                </p>
                <p className="text-lg font-bold text-gray-800">
                  {selectedSolicitud.nombre_alumno}
                </p>
                <p className="text-sm text-gray-500 font-bold uppercase mt-2">
                  Motivo
                </p>
                <p className="text-gray-700 italic">
                  "{selectedSolicitud.motivo || "Sin motivo"}"
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Nuevo Estatus
                </label>
                <select
                  value={nuevoEstatus}
                  onChange={(e) => setNuevoEstatus(e.target.value)}
                  className="w-full p-3 border rounded-xl bg-white font-medium capitalize"
                >
                  {estatusDisponibles.map((e) => (
                    <option key={e} value={e}>
                      {e.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Comentarios (Opcional)
                </label>
                <textarea
                  rows="3"
                  value={comentariosAdmin}
                  onChange={(e) => setComentariosAdmin(e.target.value)}
                  className="w-full p-3 border rounded-xl"
                  placeholder="Mensaje para el alumno..."
                ></textarea>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 text-gray-600 hover:bg-gray-100 rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold shadow-lg"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// --- COMPONENTE MIGRACIÓN DE GRUPOS (DISEÑO ROJO FINAL) ---
const MigracionGruposPage = () => {
  const [, setLoading] = useState(true);
  const [gruposDisponibles, setGruposDisponibles] = useState([]);

  // Selectores
  const [origenId, setOrigenId] = useState("");
  const [destinoId, setDestinoId] = useState("");

  // Datos
  const [alumnosOrigen, setAlumnosOrigen] = useState([]);
  const [seleccionados, setSeleccionados] = useState([]);
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    const fetchGrupos = async () => {
      try {
        const { data } = await api.get("/admin/migracion-grupos/estructura");
        setGruposDisponibles(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchGrupos();
  }, []);

  useEffect(() => {
    if (!origenId) {
      setAlumnosOrigen([]);
      setSeleccionados([]);
      return;
    }
    const fetchAlumnos = async () => {
      try {
        const { data } = await api.get(
          `/admin/migracion-grupos/alumnos/${origenId}`,
        );
        setAlumnosOrigen(data);
        setSeleccionados(data.map((a) => a.id));
      } catch (e) {
        console.error(e);
      }
    };
    fetchAlumnos();
  }, [origenId]);

  const toggleAlumno = (id) => {
    if (seleccionados.includes(id)) {
      setSeleccionados(seleccionados.filter((sid) => sid !== id));
    } else {
      setSeleccionados([...seleccionados, id]);
    }
  };

  const toggleAll = () => {
    if (seleccionados.length === alumnosOrigen.length) {
      setSeleccionados([]);
    } else {
      setSeleccionados(alumnosOrigen.map((a) => a.id));
    }
  };

  const handleMigrar = async () => {
    if (!origenId || !destinoId)
      return alert("Selecciona grupo origen y destino");
    if (origenId === destinoId)
      return alert("El grupo origen y destino no pueden ser el mismo");
    if (seleccionados.length === 0)
      return alert("Selecciona al menos un alumno");

    if (
      !window.confirm(`¿Mover ${seleccionados.length} alumnos al nuevo grupo?`)
    )
      return;

    setProcesando(true);
    try {
      await api.post("/admin/migracion-grupos/ejecutar", {
        alumnosIds: seleccionados,
        nuevoGrupoId: destinoId,
      });
      alert("¡Migración exitosa!");
      setOrigenId("");
      setDestinoId("");
      setAlumnosOrigen([]);
      setSeleccionados([]);
    } catch (error) {
      alert(
        "Error al migrar: " +
          (error.response?.data?.message || "Error interno"),
      );
    } finally {
      setProcesando(false);
    }
  };

  const renderGrupoOption = (g) => {
    return `${g.nombre_ciclo} - ${g.nombre_carrera} - ${g.nombre_grado} "${g.nombre_grupo}"`;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 max-w-7xl mx-auto">
      {/* HEADER ROJO */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight flex items-center gap-3">
            <div className="p-3 bg-[#a72a34] text-white rounded-xl shadow-lg shadow-red-900/20">
              <ArrowRightLeft size={28} />
            </div>
            Migración de Grupos
          </h1>
          <p className="text-gray-500 mt-2 text-lg ml-16">
            Avance de semestre y reinscripción masiva.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* COLUMNA IZQUIERDA: ORIGEN */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <label className="text-sm font-bold text-[#a72a34] uppercase mb-3 flex items-center gap-2">
              <LogOut size={16} /> Paso 1: Grupo Actual
            </label>
            <div className="relative">
              <select
                className="w-full p-4 pl-4 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#a72a34] outline-none transition-all font-medium text-gray-700 appearance-none cursor-pointer"
                value={origenId}
                onChange={(e) => setOrigenId(e.target.value)}
              >
                <option value="">-- Seleccionar Origen --</option>
                {gruposDisponibles.map((g) => (
                  <option key={g.id} value={g.id}>
                    {renderGrupoOption(g)}
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-4 text-gray-400 pointer-events-none">
                <Group size={20} />
              </div>
            </div>
          </div>

          {origenId && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[500px]">
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center gap-2">
                  <Users size={18} className="text-gray-400" />
                  <h3 className="font-bold text-gray-700">
                    Alumnos Disponibles
                  </h3>
                  <span className="bg-[#a72a34] text-white px-2 py-0.5 rounded text-xs font-bold shadow-sm">
                    {alumnosOrigen.length}
                  </span>
                </div>
                <button
                  onClick={toggleAll}
                  className="text-sm font-bold text-[#a72a34] hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  {seleccionados.length === alumnosOrigen.length
                    ? "Deseleccionar todos"
                    : "Seleccionar todos"}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {alumnosOrigen.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 italic">
                    <p>No hay alumnos en este grupo.</p>
                  </div>
                ) : (
                  alumnosOrigen.map((alumno) => (
                    <label
                      key={alumno.id}
                      className={`
                        group flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all duration-200
                        ${
                          seleccionados.includes(alumno.id)
                            ? "bg-[#a72a34]/5 border-[#a72a34] shadow-sm"
                            : "bg-white border-gray-100 hover:border-[#a72a34]/30 hover:shadow-sm"
                        }
                      `}
                    >
                      <div
                        className={`
                        w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors
                        ${
                          seleccionados.includes(alumno.id)
                            ? "bg-[#a72a34] border-[#a72a34]"
                            : "border-gray-300 bg-white group-hover:border-[#a72a34]"
                        }
                      `}
                      >
                        {seleccionados.includes(alumno.id) && (
                          <Check size={14} className="text-white" />
                        )}
                      </div>
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={seleccionados.includes(alumno.id)}
                        onChange={() => toggleAlumno(alumno.id)}
                      />
                      <div className="flex-1">
                        <p
                          className={`font-bold text-base ${
                            seleccionados.includes(alumno.id)
                              ? "text-[#a72a34]"
                              : "text-gray-700"
                          }`}
                        >
                          {alumno.apellido_paterno} {alumno.apellido_materno}{" "}
                          {alumno.nombre}
                        </p>
                        <p className="text-xs text-gray-400 font-mono mt-0.5 flex items-center gap-1">
                          <Award size={12} />{" "}
                          {alumno.matricula || "Sin Matrícula"}
                        </p>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* COLUMNA DERECHA: DESTINO */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-[#a72a34]/5 rounded-bl-full -mr-4 -mt-4 pointer-events-none"></div>
            <label className="text-sm font-bold text-[#a72a34] uppercase mb-3 flex items-center gap-2 relative z-10">
              <RotateCcw size={16} className="rotate-180" /> Paso 2: Grupo
              Destino
            </label>
            <div className="relative z-10">
              <select
                className="w-full p-4 pl-4 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#a72a34] outline-none transition-all font-medium text-gray-700 appearance-none cursor-pointer"
                value={destinoId}
                onChange={(e) => setDestinoId(e.target.value)}
              >
                <option value="">-- Seleccionar Destino --</option>
                {gruposDisponibles.map((g) => (
                  <option key={g.id} value={g.id} disabled={g.id === origenId}>
                    {renderGrupoOption(g)}
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-4 text-gray-400 pointer-events-none">
                <Building size={20} />
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100 flex flex-col items-center text-center h-auto lg:min-h-[400px] justify-center relative">
            <div
              className={`
               w-24 h-24 rounded-full flex items-center justify-center mb-6 transition-all duration-500
               ${
                 seleccionados.length > 0 && destinoId
                   ? "bg-[#a72a34] text-white shadow-xl shadow-red-900/30 scale-110"
                   : "bg-gray-100 text-gray-300"
               }
             `}
            >
              {procesando ? (
                <RotateCcw className="animate-spin" size={32} />
              ) : (
                <ArrowRightLeft size={32} />
              )}
            </div>

            <h3 className="text-2xl font-bold text-gray-800 mb-2">Resumen</h3>
            <div className="space-y-4 w-full max-w-xs mx-auto mb-8">
              <div className="flex justify-between items-center text-sm p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-500">Alumnos a mover:</span>
                <span className="font-bold text-[#a72a34] text-lg">
                  {seleccionados.length}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-500">Destino:</span>
                <span
                  className={`font-bold ${destinoId ? "text-[#a72a34]" : "text-gray-400"}`}
                >
                  {destinoId ? "Seleccionado" : "Pendiente"}
                </span>
              </div>
            </div>

            <button
              onClick={handleMigrar}
              disabled={procesando || seleccionados.length === 0 || !destinoId}
              className={`
                 w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all duration-300 transform
                 ${
                   procesando || seleccionados.length === 0 || !destinoId
                     ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                     : "bg-[#a72a34] text-white hover:bg-[#802028] shadow-lg shadow-red-900/20 hover:shadow-xl hover:-translate-y-1 active:scale-95"
                 }
               `}
            >
              {procesando ? (
                "Procesando..."
              ) : (
                <>
                  Confirmar Migración <CheckCircle size={22} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

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
        "Error al transferir: " + (error.response?.data?.message || "Error"),
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

// --- DASHBOARD DOCENTE REDISEÑADO ---
const DocenteDashboardPage = () => {
  const { user } = useAuth();
  const [cursos, setCursos] = useState([]);
  const [anuncios, setAnuncios] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [resCursos, resAnuncios] = await Promise.all([
          api.get("/docente/mis-cursos"),
          api.get("/anuncios/feed"), // Traemos los anuncios institucionales
        ]);
        setCursos(resCursos.data);
        setAnuncios(resAnuncios.data);
      } catch (error) {
        console.error("Error al cargar el dashboard del docente", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  if (loading)
    return (
      <div className="p-10 text-center text-gray-500">
        Preparando su espacio de trabajo...
      </div>
    );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
      {/* 1. SECCIÓN HERO (BIENVENIDA) */}
      <div
        id="tour-docente-hero"
        className="bg-gradient-to-r from-[#1e3a8a] to-[#3b82f6] rounded-3xl p-8 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center gap-6"
      >
        <div className="w-24 h-24 rounded-full border-4 border-white/20 overflow-hidden bg-white/10 shrink-0 z-10 flex items-center justify-center text-3xl font-bold">
          {user?.foto_perfil ? (
            <img
              src={`https://api-universidad-c5o8.onrender.com/uploads/perfiles/${user.foto_perfil}`}
              className="w-full h-full object-cover"
              alt="Perfil"
            />
          ) : (
            user?.nombre?.charAt(0)
          )}
        </div>
        <div className="z-10 text-center md:text-left">
          <h1 className="text-3xl font-black mb-1">
            {(() => {
              // Obtenemos el género de la base de datos, lo pasamos a mayúsculas para evitar errores
              const generoUser = String(user?.genero || "").toUpperCase();

              // Verificamos si es mujer (cubriendo las variaciones que usas en tus registros)
              const esMujer =
                generoUser === "F" ||
                generoUser === "M" ||
                generoUser === "FEMENINO";

              // Retornamos el saludo correcto
              return esMujer ? "Bienvenida, Profesora" : "Bienvenido, Profesor";
            })()}{" "}
            🎓
          </h1>
          <p className="text-blue-100 text-lg">
            Tiene {cursos.length}{" "}
            {cursos.length === 1 ? "grupo asignado" : "grupos asignados"} este
            ciclo escolar.
          </p>
          <div className="mt-3 inline-flex gap-3 text-sm font-bold bg-black/20 px-4 py-2 rounded-full">
            <span>ID Docente: {user.matricula || "N/A"}</span>
          </div>
        </div>
        {/* Decoración CSS */}
        <div className="absolute right-0 top-0 h-full w-1/2 bg-white/5 skew-x-12 translate-x-20"></div>
      </div>

      {/* 2. ACCESOS RÁPIDOS */}
      <div
        id="tour-docente-accesos"
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <Link
          to="/docente/calendario"
          className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center hover:shadow-md hover:border-blue-200 transition-all group"
        >
          <div className="p-3 bg-blue-50 text-blue-600 rounded-full mb-2 group-hover:scale-110 transition-transform">
            <Calendar size={24} />
          </div>
          <span className="font-bold text-gray-700">Calendario</span>
        </Link>
        <Link
          to="/docente/correo"
          className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center hover:shadow-md hover:border-red-200 transition-all group"
        >
          <div className="p-3 bg-red-50 text-red-600 rounded-full mb-2 group-hover:scale-110 transition-transform">
            <Mail size={24} />
          </div>
          <span className="font-bold text-gray-700">Correo</span>
        </Link>
        <Link
          to="/docente/mi-nube"
          className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center hover:shadow-md hover:border-orange-200 transition-all group"
        >
          <div className="p-3 bg-orange-50 text-orange-600 rounded-full mb-2 group-hover:scale-110 transition-transform">
            <UploadCloud size={24} />
          </div>
          <span className="font-bold text-gray-700">Mi Nube</span>
        </Link>
        <Link
          to="/docente/mi-perfil"
          className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center hover:shadow-md hover:border-purple-200 transition-all group"
        >
          <div className="p-3 bg-purple-50 text-purple-600 rounded-full mb-2 group-hover:scale-110 transition-transform">
            <User size={24} />
          </div>
          <span className="font-bold text-gray-700">Mi Perfil</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* 3. COLUMNA IZQUIERDA: MIS GRUPOS */}
        <div id="tour-docente-cursos" className="lg:col-span-8 space-y-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <BookOpen className="text-blue-600" /> Mis Grupos y Materias
          </h2>

          {cursos.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300">
              <Book size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 font-medium">
                No tiene cursos asignados para este ciclo.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {cursos.map((curso) => {

                return (
                  <div
                    key={`${curso.grupo_id}-${curso.asignatura_id}`}
                    onClick={() =>
                      navigate(
                        `/docente/grupo/${curso.grupo_id}/asignatura/${curso.asignatura_id}/aula`,
                      )
                    }
                    className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg hover:border-blue-300 transition-all group relative overflow-hidden cursor-pointer flex flex-col"
                  >
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-blue-600"></div>
                    <div className="flex justify-between items-start mb-2 mt-2">
                      <h3 className="font-bold text-lg text-gray-800 line-clamp-2 group-hover:text-blue-600 transition-colors">
                        {curso.nombre_asignatura}
                      </h3>
                    </div>
                    <div className="space-y-1 mb-4">
                      <p className="text-sm text-gray-500 flex items-center gap-2">
                        <Users size={14} className="text-gray-400" />{" "}
                        <span className="font-medium text-gray-700">
                          Grupo:
                        </span>{" "}
                        {curso.nombre_grupo}
                      </p>
                      <p className="text-sm text-gray-500 flex items-center gap-2">
                        <Calendar size={14} className="text-gray-400" />{" "}
                        <span className="font-medium text-gray-700">
                          Ciclo:
                        </span>{" "}
                        {curso.nombre_ciclo}
                      </p>
                    </div>
                    <div className="mt-auto pt-3 border-t border-gray-50 flex justify-between items-center text-sm">
                      <div className="text-gray-500">
                        <span className="font-bold text-gray-800">
                          {curso.total_alumnos}
                        </span>{" "}
                        Alumnos
                      </div>
                      <div className="text-blue-600 font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all">
                        Entrar al Aula <ArrowRightCircle size={16} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 4. COLUMNA DERECHA: TABLERO DE ANUNCIOS */}
        <div id="tour-docente-avisos" className="lg:col-span-4 space-y-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Megaphone className="text-orange-500" /> Avisos de Dirección
          </h2>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-1 flex flex-col h-[500px]">
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {anuncios.length === 0 ? (
                <div className="text-center text-gray-400 py-10">
                  No hay avisos recientes.
                </div>
              ) : (
                anuncios.map((anuncio) => (
                  <div
                    key={anuncio.id}
                    className="bg-orange-50/50 border border-orange-100 p-4 rounded-xl"
                  >
                    <h4 className="font-bold text-gray-800 text-sm leading-tight mb-2">
                      {anuncio.titulo}
                    </h4>
                    <p className="text-sm text-gray-600 mb-3 whitespace-pre-wrap">
                      {anuncio.mensaje}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Clock size={12} />{" "}
                      {new Date(anuncio.fecha_creacion).toLocaleDateString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENTE ACTA FINAL / DETALLE CURSO (CORREGIDO) ---
const DetalleCursoDocentePage = () => {
  const { grupoId, asignaturaId } = useParams();
  const navigate = useNavigate();
  const [alumnos, setAlumnos] = useState([]);
  const [cursoInfo, setCursoInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Estados
  const [calificaciones, setCalificaciones] = useState({});
  const [promediosCalculados, setPromediosCalculados] = useState({});

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      // 1. Obtener Analíticas (Promedios calculados)
      const { data: dataAnaliticas } = await axios.get(
        `https://api-universidad-c5o8.onrender.com/api/analiticas/${grupoId}/${asignaturaId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      // DEBUG: Ver qué está llegando del backend
      console.log("Datos de Analíticas:", dataAnaliticas);

      // Crear mapa: ID -> Promedio
      const mapaPromedios = {};
      if (dataAnaliticas && dataAnaliticas.filas) {
        dataAnaliticas.filas.forEach((fila) => {
          // Buscamos 'promedio' O 'promedioFinal' para asegurar que lo encuentre
          const valor =
            fila.promedio !== undefined ? fila.promedio : fila.promedioFinal;
          mapaPromedios[fila.id] = valor;
        });
      }
      setPromediosCalculados(mapaPromedios);

      // 2. Obtener Lista de Alumnos (para ver si ya hay calificación guardada)
      const { data: dataCurso } = await axios.get(
        `https://api-universidad-c5o8.onrender.com/api/docente/v2/grupo/${grupoId}/asignatura/${asignaturaId}/alumnos`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setAlumnos(dataCurso.alumnos);
      setCursoInfo(dataCurso.cursoInfo);

      // 3. AUTOCOMPLETAR INPUTS
      const initialCalificaciones = {};

      dataCurso.alumnos.forEach((alumno) => {
        // ¿Ya guardó una calificación FINAL en la BD (tabla calificaciones)?
        if (
          alumno.calificacion !== null &&
          alumno.calificacion !== undefined &&
          alumno.calificacion !== ""
        ) {
          // Si ya existe, respetamos la que está guardada
          initialCalificaciones[alumno.id] = String(alumno.calificacion);
        } else {
          // Si NO existe, pre-llenamos con el promedio calculado de la sábana
          const promedioSistema = mapaPromedios[alumno.id];

          // Validamos que no sea undefined antes de asignarlo
          if (promedioSistema !== undefined && promedioSistema !== null) {
            initialCalificaciones[alumno.id] = String(promedioSistema);
          } else {
            initialCalificaciones[alumno.id] = "";
          }
        }
      });

      setCalificaciones(initialCalificaciones);
    } catch (error) {
      console.error("Error cargando datos", error);
      alert("Error al cargar la información.");
    } finally {
      setLoading(false);
    }
  }, [grupoId, asignaturaId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCalificacionChange = (alumnoId, valor) => {
    setCalificaciones((prev) => ({ ...prev, [alumnoId]: valor }));
  };

  const handleGuardarTodo = async () => {
    setIsSaving(true);
    const calificacionesArray = Object.keys(calificaciones).map((alumnoId) => ({
      alumno_id: parseInt(alumnoId),
      calificacion: calificaciones[alumnoId],
    }));

    try {
      // AQUÍ ESTÁ LA CORRECCIÓN. Usamos "api.post" y la ruta "/calificar-grupo-completo"
      await api.post("/calificar-grupo-completo", {
        grupo_id: grupoId,
        asignatura_id: asignaturaId,
        calificaciones: calificacionesArray,
      });

      alert("¡Acta Final guardada correctamente!");
      fetchData();
    } catch (error) {
      console.error("Error al guardar el acta:", error);
      alert(
        "Error al guardar el acta: " +
          (error.response?.data?.message || "Error desconocido"),
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="p-10 text-center">Cargando acta...</div>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate("/docente/dashboard")}
          className="flex items-center text-gray-500 hover:text-blue-600 p-2 rounded-full hover:bg-gray-200 transition"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            {cursoInfo?.nombre_asignatura}
          </h2>
          <p className="text-gray-500">Acta de Calificaciones Finales</p>
        </div>
      </div>

      {/* --- BOTONES DE NAVEGACIÓN RÁPIDA --- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Link
          to={`/docente/grupo/${grupoId}/asignatura/${asignaturaId}/aula`}
          className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md border border-gray-200 flex flex-col items-center gap-2 group transition-all"
        >
          <div className="p-3 bg-blue-50 text-blue-600 rounded-full group-hover:scale-110 transition-transform">
            <Book size={24} />
          </div>
          <span className="font-bold text-gray-700 text-sm">Aula Virtual</span>
        </Link>
        <Link
          to={`/docente/grupo/${grupoId}/asignatura/${asignaturaId}/analiticas`}
          className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md border border-gray-200 flex flex-col items-center gap-2 group transition-all"
        >
          <div className="p-3 bg-purple-50 text-purple-600 rounded-full group-hover:scale-110 transition-transform">
            <Award size={24} />
          </div>
          <span className="font-bold text-gray-700 text-sm">
            Sábana (Detalle)
          </span>
        </Link>
        <Link
          to={`/docente/grupo/${grupoId}/asignatura/${asignaturaId}/examen/crear`}
          className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md border border-gray-200 flex flex-col items-center gap-2 group transition-all"
        >
          <div className="p-3 bg-green-50 text-green-600 rounded-full group-hover:scale-110 transition-transform">
            <PlusCircle size={24} />
          </div>
          <span className="font-bold text-gray-700 text-sm">Nuevo Examen</span>
        </Link>
        <Link
          to={`/docente/grupo/${grupoId}/asignatura/${asignaturaId}/muro`}
          className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md border border-gray-200 flex flex-col items-center gap-2 group transition-all"
        >
          <div className="p-3 bg-yellow-50 text-yellow-600 rounded-full group-hover:scale-110 transition-transform">
            <Users size={24} />
          </div>
          <span className="font-bold text-gray-700 text-sm">Muro / Avisos</span>
        </Link>
      </div>

      {/* --- ACTA DE CALIFICACIONES --- */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <GraduationCap size={20} className="text-[#a72a34]" />{" "}
            Calificaciones Finales
          </h3>
          <div className="text-xs text-gray-500 italic">
            * El promedio calculado se llena automáticamente si no hay nota
            final guardada.
          </div>
        </div>

        <table className="w-full">
          <thead className="bg-gray-100 text-left text-gray-600 text-xs uppercase font-bold">
            <tr>
              <th className="px-6 py-4">Alumno</th>
              <th className="px-6 py-4 text-center">
                Promedio
                <br />
                Calculado
              </th>
              <th className="px-6 py-4 text-center w-40">
                Nota
                <br />
                Final
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {alumnos.map((alumno) => {
              const promedio = promediosCalculados[alumno.id];
              return (
                <tr
                  key={alumno.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  {/* Alumno Info */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <img
                          className="h-10 w-10 rounded-full object-cover border border-gray-200"
                          src={
                            alumno.foto_perfil
                              ? `https://api-universidad-c5o8.onrender.com/uploads/perfiles/${alumno.foto_perfil}`
                              : `https://ui-avatars.com/api/?name=${alumno.nombre}&background=random&color=fff`
                          }
                          alt=""
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = `https://ui-avatars.com/api/?name=${alumno.nombre}&background=random&color=fff`;
                          }}
                        />
                      </div>
                      <div className="ml-4">
                        <div className="font-bold text-gray-900">
                          {alumno.nombre} {alumno.apellido_paterno}{" "}
                          {alumno.apellido_materno}
                        </div>
                        <div className="text-xs text-gray-500">
                          {alumno.matricula}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Promedio Calculado (VISUAL) */}
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        (promedio || 0) >= 70
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {promedio !== undefined ? promedio : "-"}
                    </span>
                  </td>

                  {/* Input Editable (AUTOCOMPLETADO) */}
                  <td className="px-6 py-4">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={calificaciones[alumno.id] || ""}
                      onChange={(e) =>
                        handleCalificacionChange(alumno.id, e.target.value)
                      }
                      className="w-full text-center font-bold text-lg border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-[#a72a34] outline-none transition-all"
                      placeholder="-"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button
            onClick={handleGuardarTodo}
            disabled={isSaving}
            className="flex items-center gap-2 bg-[#a72a34] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#8f242d] disabled:bg-gray-400 disabled:cursor-not-allowed shadow-lg transition-all active:scale-95"
          >
            {isSaving ? (
              <Loader className="animate-spin" size={20} />
            ) : (
              <Save size={20} />
            )}
            {isSaving ? "Guardando..." : "Guardar Acta Oficial"}
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
        `/admin/grupo/${grupoId}/asignatura/${asignaturaId}/alumnos`,
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

const AlumnoDashboardPage = () => {
  const { user } = useAuth();
  const [misGrupos, setMisGrupos] = useState([]);
  const [anuncios, setAnuncios] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [resGrupos, resAnuncios] = await Promise.all([
          api.get("/alumno/mi-grupo"),
          api.get("/anuncios/feed"),
        ]);
        setMisGrupos(resGrupos.data);
        setAnuncios(resAnuncios.data);
      } catch (error) {
        console.error("Error al cargar el dashboard", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  if (loading)
    return (
      <div className="p-10 text-center text-gray-500">
        Cargando tu espacio...
      </div>
    );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
      {/* 1. SECCIÓN HERO (BIENVENIDA) */}
      <div
        id="tour-resumen-perfil"
        className="bg-gradient-to-r from-[#a72a34] to-[#802028] rounded-3xl p-8 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center gap-6"
      >
        <div className="w-24 h-24 rounded-full border-4 border-white/20 overflow-hidden bg-white/10 shrink-0 z-10 flex items-center justify-center text-3xl font-bold">
          {user?.foto_perfil ? (
            <img
              src={`https://api-universidad-c5o8.onrender.com/uploads/perfiles/${user.foto_perfil}`}
              className="w-full h-full object-cover"
              alt="Perfil"
            />
          ) : (
            user?.nombre?.charAt(0)
          )}
        </div>
        <div className="z-10 text-center md:text-left">
          <h1 className="text-3xl font-black mb-1">¡Hola, {user.nombre}! 👋</h1>
          <p className="text-red-100 text-lg">
            {misGrupos.length > 0
              ? `Inscrito en: ${misGrupos[0].grupo.nombre_grupo}`
              : "Aún no estás asignado a un grupo."}
          </p>
          <div className="mt-3 inline-flex gap-3 text-sm font-bold bg-black/20 px-4 py-2 rounded-full">
            <span>Matrícula: {user.matricula || "N/A"}</span>
          </div>
        </div>
        {/* Decoración CSS */}
        <div className="absolute right-0 top-0 h-full w-1/2 bg-white/5 skew-x-12 translate-x-20"></div>
      </div>

      {/* 2. ACCESOS RÁPIDOS */}
      <div
        id="tour-accesos-rapidos"
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <Link
          to="/alumno/mis-pagos"
          className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center hover:shadow-md hover:border-green-200 transition-all group"
        >
          <div className="p-3 bg-green-50 text-green-600 rounded-full mb-2 group-hover:scale-110 transition-transform">
            <DollarSign size={24} />
          </div>
          <span className="font-bold text-gray-700">Mis Pagos</span>
        </Link>
        <Link
          to="/alumno/mis-solicitudes"
          className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center hover:shadow-md hover:border-blue-200 transition-all group"
        >
          <div className="p-3 bg-blue-50 text-blue-600 rounded-full mb-2 group-hover:scale-110 transition-transform">
            <FileText size={24} />
          </div>
          <span className="font-bold text-gray-700">Trámites</span>
        </Link>
        <Link
          to="/alumno/calendario"
          className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center hover:shadow-md hover:border-purple-200 transition-all group"
        >
          <div className="p-3 bg-purple-50 text-purple-600 rounded-full mb-2 group-hover:scale-110 transition-transform">
            <Calendar size={24} />
          </div>
          <span className="font-bold text-gray-700">Calendario</span>
        </Link>
        <Link
          to="/alumno/mi-nube"
          className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center hover:shadow-md hover:border-orange-200 transition-all group"
        >
          <div className="p-3 bg-orange-50 text-orange-600 rounded-full mb-2 group-hover:scale-110 transition-transform">
            <UploadCloud size={24} />
          </div>
          <span className="font-bold text-gray-700">Mi Nube</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* 3. COLUMNA IZQUIERDA: MIS CLASES */}
        <div id="tour-mis-clases" className="lg:col-span-8 space-y-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <BookOpen className="text-[#a72a34]" /> Mis Asignaturas
          </h2>

          {misGrupos.length === 0 ? (
            <p className="text-gray-500 bg-white p-6 rounded-xl border">
              No hay clases asignadas este ciclo.
            </p>
          ) : (
            misGrupos.map((infoGrupo, index) => (
              <div
                key={index}
                className="grid grid-cols-1 sm:grid-cols-2 gap-4"
              >
                {infoGrupo.asignaturas.map((asig) => (
                  <Link
                    key={asig.asignatura_id}
                    to={`/alumno/grupo/${infoGrupo.grupo.id}/asignatura/${asig.asignatura_id}/aula`}
                    className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg hover:border-[#a72a34]/30 transition-all group relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-[#a72a34]"></div>
                    <h3 className="font-bold text-lg text-gray-800 line-clamp-1 group-hover:text-[#a72a34] transition-colors">
                      {asig.nombre_asignatura}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                      <User size={14} />{" "}
                      {asig.docente_nombre
                        ? `${asig.docente_nombre} ${asig.docente_apellido || ""}`
                        : "Sin docente"}
                    </p>
                    <div className="mt-4 pt-3 border-t border-gray-50 flex justify-between items-center">
                      <span className="text-xs font-bold text-gray-400">
                        Ir al Aula Virtual
                      </span>
                      <ArrowRightCircle
                        size={18}
                        className="text-[#a72a34] opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1"
                      />
                    </div>
                  </Link>
                ))}
              </div>
            ))
          )}
        </div>

        {/* 4. COLUMNA DERECHA: TABLERO DE ANUNCIOS */}
        <div id="tour-anuncios" className="lg:col-span-4 space-y-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Megaphone className="text-[#bb9a5a]" /> Tablero de Avisos
          </h2>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-1 flex flex-col h-[500px]">
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {anuncios.length === 0 ? (
                <div className="text-center text-gray-400 py-10">
                  No hay avisos institucionales.
                </div>
              ) : (
                anuncios.map((anuncio) => (
                  <div
                    key={anuncio.id}
                    className="bg-orange-50/50 border border-orange-100 p-4 rounded-xl"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-gray-800 text-sm leading-tight">
                        {anuncio.titulo}
                      </h4>
                    </div>
                    <p className="text-sm text-gray-600 mb-3 whitespace-pre-wrap">
                      {anuncio.mensaje}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Clock size={12} />
                      {new Date(anuncio.fecha_creacion).toLocaleDateString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
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
          (error.response?.data?.message || "Error desconocido"),
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
                    href={`https://api-universidad-c5o8.onrender.com/uploads/${doc.ruta_archivo}`}
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
      alert("Error al subir archivo: " + (error.response?.data?.message || error.message));
    }
  };

  const handleDelete = async (docId) => {
    if (window.confirm("¿Estás seguro de eliminar este documento?")) {
      try {
        // 5. Usamos la nueva ruta del aspirante
        await api.delete(`/aspirante/expedientes/${docId}`);
        fetchAspirante();
      } catch (error) {
        alert("Error al eliminar: " + (error.response?.data?.message || error.message));
      }
    }
  };

  // 6. Lógica para el recordatorio
  const documentosSubidos = expediente.map((doc) => doc.tipo_documento);
  const faltantes = tiposRequeridos.filter(
    (tipo) => !documentosSubidos.includes(tipo.id),
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
                    href={`https://api-universidad-c5o8.onrender.com/uploads/${doc.ruta_archivo}`}
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


const RevisionAspirantesPage = () => {
  const { user } = useAuth();
  const [aspirantes, setAspirantes] = useState([]);
  const [selected, setSelected] = useState(null);
  const [documentos, setDocumentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [converting, setConverting] = useState(false);

  const fetchAspirantes = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/admin/aspirantes/revision");
      setAspirantes(data);
    } catch (error) {
      console.error("Error al cargar aspirantes", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAspirantes(); }, [fetchAspirantes]);

  const verDocumentos = async (aspiranteId) => {
    try {
      setDetailLoading(true);
      const { data } = await api.get(`/admin/aspirantes/${aspiranteId}/documentos`);
      setSelected(data.aspirante);
      setDocumentos(data.documentos);
    } catch (error) {
      alert("Error al cargar documentos: " + (error.response?.data?.message || error.message));
    } finally {
      setDetailLoading(false);
    }
  };

  const handleRevisar = async (docId, estatus) => {
    if (estatus === "rechazado") {
      setRejectModal(docId);
      setRejectReason("");
      return;
    }
    try {
      await api.put(`/admin/expedientes/${docId}/revisar`, { estatus });
      const { data } = await api.get(`/admin/aspirantes/${selected.id}/documentos`);
      setSelected(data.aspirante);
      setDocumentos(data.documentos);
      fetchAspirantes();
      if (data.documentos.length > 0 && data.documentos.every((d) => d.estatus === "aprobado")) {
        setTimeout(() => {
          if (window.confirm("Todos los documentos están aprobados. ¿Deseas convertir a " + data.aspirante.nombre + " a alumno ahora?")) {
            convertirDirecto(data.aspirante.id);
          }
        }, 300);
      }
    } catch (error) {
      alert("Error al revisar: " + (error.response?.data?.message || error.message));
    }
  };

  const convertirDirecto = async (id) => {
    try {
      setConverting(true);
      await api.post(`/admin/aspirantes/${id}/convertir`);
      alert("Aspirante convertido a alumno exitosamente");
      setSelected(null);
      setDocumentos([]);
      fetchAspirantes();
    } catch (error) {
      alert("Error al convertir: " + (error.response?.data?.message || error.message));
    } finally {
      setConverting(false);
    }
  };

  const handleRechazarConfirm = async () => {
    try {
      await api.put(`/admin/expedientes/${rejectModal}/revisar`, {
        estatus: "rechazado",
        comentario: rejectReason || null,
      });
      setRejectModal(null);
      setRejectReason("");
      verDocumentos(selected.id);
      fetchAspirantes();
    } catch (error) {
      alert("Error al rechazar: " + (error.response?.data?.message || error.message));
    }
  };

  const convertir = async () => {
    if (!window.confirm("¿Estás seguro de convertir a " + selected.nombre + " " + (selected.apellido_paterno || "") + " a alumno?")) return;
    convertirDirecto(selected.id);
  };

  const badgeColor = (estatus) => {
    switch (estatus) {
      case "aprobado": return "bg-green-100 text-green-700";
      case "rechazado": return "bg-red-100 text-red-700";
      case "pendiente": return "bg-yellow-100 text-yellow-700";
      case "no_subido": return "bg-gray-100 text-gray-500";
      default: return "bg-gray-100 text-gray-500";
    }
  };

  const badgeText = (estatus) => {
    switch (estatus) {
      case "aprobado": return "Aprobado";
      case "rechazado": return "Rechazado";
      case "pendiente": return "Pendiente";
      case "no_subido": return "No subido";
      default: return estatus;
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#a72a34] text-white rounded-xl shadow-lg shadow-red-900/20">
            <UserCheck size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Revisión de Aspirantes</h1>
            <p className="text-gray-500 mt-1">
              {selected
                ? "Documentos del aspirante seleccionado"
                : "Revisa y aprueba los documentos de los aspirantes"}
            </p>
          </div>
        </div>
        {selected && (
          <button
            onClick={() => { setSelected(null); setDocumentos([]); }}
            className="flex items-center gap-2 text-principal hover:underline font-medium"
          >
            <ArrowLeft size={18} /> Volver al listado
          </button>
        )}
      </div>

      {!selected ? (
        loading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <p className="text-gray-500">Cargando aspirantes...</p>
          </div>
        ) : aspirantes.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <p className="text-gray-500">No hay aspirantes pendientes de revisión.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 uppercase text-xs font-bold border-b border-gray-100">
                    <th className="p-5">Aspirante</th>
                    <th className="p-5">Documentos</th>
                    <th className="p-5">Aprobados</th>
                    <th className="p-5">Rechazados</th>
                    <th className="p-5">Progreso</th>
                    <th className="p-5">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {aspirantes.map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-5">
                        <div className="flex items-center gap-3">
                          <img
                            src={a.foto_perfil
                              ? "https://api-universidad-c5o8.onrender.com/uploads/perfiles/" + a.foto_perfil
                              : "https://ui-avatars.com/api/?name=" + encodeURIComponent(a.nombre) + "+" + encodeURIComponent(a.apellido_paterno || "") + "&background=random&color=fff"
                            }
                            alt=""
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <div>
                            <p className="font-medium text-gray-800">{a.nombre} {a.apellido_paterno}</p>
                            <p className="text-sm text-gray-500">{a.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-5 text-gray-700">{a.subidos}/{a.total_requeridos}</td>
                      <td className="p-5">
                        <span className={"px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider " + (a.aprobados === a.total_requeridos ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")}>
                          {a.aprobados}
                        </span>
                      </td>
                      <td className="p-5">
                        {a.rechazados > 0 ? (
                          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-700">{a.rechazados}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="p-5">
                        <div className="w-32 bg-gray-200 rounded-full h-2.5 overflow-hidden">
                          <div
                            className={"h-full rounded-full transition-all duration-500 " + (a.aprobados === a.total_requeridos ? "bg-green-500" : a.rechazados > 0 ? "bg-red-500" : "bg-yellow-500")}
                            style={{ width: (a.subidos / a.total_requeridos * 100) + "%" }}
                          />
                        </div>
                      </td>
                      <td className="p-5">
                        <button
                          onClick={() => verDocumentos(a.id)}
                          className="bg-[#a72a34] text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-[#802028] shadow-lg shadow-red-900/20 transition-transform active:scale-95"
                        >
                          <UserCheck size={16} /> Revisar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-4 mb-4">
              <img
                src={"https://ui-avatars.com/api/?name=" + encodeURIComponent(selected.nombre) + "+" + encodeURIComponent(selected.apellido_paterno || "") + "&background=a72a34&color=fff&size=64"}
                alt=""
                className="w-16 h-16 rounded-full object-cover border-2 border-gray-100"
              />
              <div>
                <h3 className="text-2xl font-bold text-gray-800">{selected.nombre} {selected.apellido_paterno} {selected.apellido_materno || ""}</h3>
                <p className="text-gray-500">{selected.email}</p>
                {selected.matricula && <p className="text-sm text-gray-400">Matrícula: {selected.matricula}</p>}
              </div>
            </div>
          </div>

          {detailLoading ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
              <p className="text-gray-500">Cargando documentos...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {documentos.map((doc, idx) => (
                <div key={idx} className={"bg-white p-6 rounded-2xl border shadow-sm hover:shadow-md transition-all border-l-4 " + (
                  doc.estatus === "aprobado" ? "border-green-500" :
                  doc.estatus === "rechazado" ? "border-red-500" :
                  doc.estatus === "pendiente" ? "border-yellow-500" :
                  "border-gray-200"
                )}>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-gray-800 text-lg">{doc.tipo_nombre}</h4>
                    <span className={"px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider " + badgeColor(doc.estatus)}>
                      {badgeText(doc.estatus)}
                    </span>
                  </div>

                  {doc.estatus !== "no_subido" && (
                    <div className="space-y-3 mb-4">
                      <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden max-h-48">
                        {/\.(jpg|jpeg|png|gif|webp)$/i.test(doc.ruta_archivo) ? (
                          <img
                            src={"https://api-universidad-c5o8.onrender.com/uploads/" + doc.ruta_archivo}
                            alt={doc.nombre_original}
                            className="w-full h-48 object-contain bg-white"
                          />
                        ) : /\.pdf$/i.test(doc.ruta_archivo) ? (
                          <iframe
                            src={"https://api-universidad-c5o8.onrender.com/uploads/" + doc.ruta_archivo + "#toolbar=0"}
                            className="w-full h-48 bg-white"
                            title={doc.nombre_original}
                          />
                        ) : (
                          <div className="flex items-center justify-center h-24 text-gray-400 gap-2">
                            <FileIcon size={32} />
                            <span className="text-sm">Vista previa no disponible</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 truncate">{doc.nombre_original}</span>
                        <div className="flex gap-2 shrink-0">
                          <a
                            href={"https://api-universidad-c5o8.onrender.com/uploads/" + doc.ruta_archivo}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            <Eye size={14} /> Ver
                          </a>
                          <a
                            href={"https://api-universidad-c5o8.onrender.com/uploads/" + doc.ruta_archivo}
                            download
                            className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            <Download size={14} /> Descargar
                          </a>
                        </div>
                      </div>
                    </div>
                  )}

                  {doc.estatus === "no_subido" && (
                    <p className="text-sm text-gray-400 mb-4">El aspirante aún no ha subido este documento.</p>
                  )}

                  {doc.comentario && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                      <p className="text-xs font-bold text-red-700 uppercase tracking-wider mb-1">Motivo del rechazo:</p>
                      <p className="text-sm text-red-600">{doc.comentario}</p>
                    </div>
                  )}

                  {(doc.estatus === "pendiente" || doc.estatus === "rechazado") && (
                    <div className="flex gap-3 mt-2">
                      <button
                        onClick={() => handleRevisar(doc.id, "aprobado")}
                        className="flex-1 bg-green-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-green-700 shadow-lg transition-transform active:scale-95"
                      >
                        <CheckCircle size={16} /> Aprobar
                      </button>
                      <button
                        onClick={() => handleRevisar(doc.id, "rechazado")}
                        className="flex-1 bg-red-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-red-700 shadow-lg transition-transform active:scale-95"
                      >
                        <XCircle size={16} /> Rechazar
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {documentos.length > 0 && documentos.every((d) => d.estatus === "aprobado") && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-2xl p-8 text-center animate-pulse">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4 ring-4 ring-green-200">
                <CheckCircle size={40} className="text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-800 mb-2">¡Todos los documentos aprobados!</p>
              <p className="text-green-600 mb-6 text-lg">Este aspirante está listo para convertirse en alumno.</p>
              <button
                onClick={convertir}
                disabled={converting}
                className="bg-[#a72a34] text-white px-10 py-4 rounded-xl font-bold text-lg flex items-center gap-2 hover:bg-[#802028] shadow-lg shadow-red-900/20 transition-transform active:scale-95 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {converting ? "Convirtiendo..." : "Convertir a Alumno"}
              </button>
            </div>
          )}
        </div>
      )}

      {rejectModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="bg-white p-6 border-b flex justify-between items-center shrink-0">
              <h3 className="font-bold text-xl text-gray-800">Rechazar Documento</h3>
              <button
                onClick={() => setRejectModal(null)}
                className="text-gray-400 hover:bg-gray-100 p-2 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                Indica el motivo del rechazo para que el aspirante lo corrija:
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Ej: El documento no se ve legible, súbelo escaneado y derecho..."
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a72a34] outline-none mb-6"
                rows={4}
              />
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setRejectModal(null)}
                  className="px-6 py-3 text-gray-500 hover:text-gray-700 font-bold hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleRechazarConfirm}
                  className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-red-700 shadow-lg transition-transform active:scale-95"
                >
                  <XCircle size={18} /> Rechazar Documento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


const AulaVirtualPage = () => {
  const { grupoId, asignaturaId } = useParams();
  const { user } = useAuth();
  const [config, setConfig] = useState(null);
  const [criterios, setCriterios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false); // Para editar la config del curso
  const [formData, setFormData] = useState({
    /* ... estado inicial ... */
    hibrida: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const navigate = useNavigate();

  // Estados de las secciones
  const [tareas, setTareas] = useState([]);
  const [loadingTareas, setLoadingTareas] = useState(true);
  const [recursos, setRecursos] = useState([]);
  const [loadingRecursos, setLoadingRecursos] = useState(true);
  const [historialAsistencia, setHistorialAsistencia] = useState([]); // Alumno
  const [loadingHistorial, setLoadingHistorial] = useState(false); // Alumno

  // Estados de los Modales
  const [showCrearTareaModal, setShowCrearTareaModal] = useState(false);
  const [showEntregarModal, setShowEntregarModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showRecursoModal, setShowRecursoModal] = useState(false);

  // --- NUEVO ESTADO PARA PESTAÑAS Y FORO ---
  const [activeTab, setActiveTab] = useState("info"); // 'info', 'tareas', 'recursos', 'foro'
  const [hilosForo, setHilosForo] = useState([]);
  const [loadingHilos, setLoadingHilos] = useState(true);
  const [showNuevoHiloModal, setShowNuevoHiloModal] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  // --- FIN NUEVO ESTADO ---

  const addCriterio = () => {
    setCriterios([...criterios, { nombre: "", porcentaje: 0, tipo: "manual" }]);
  };

  const removeCriterio = (index) => {
    const nuevos = [...criterios];
    nuevos.splice(index, 1);
    setCriterios(nuevos);
  };

  const updateCriterio = (index, field, value) => {
    const nuevos = [...criterios];
    nuevos[index][field] = value;

    // Auto-nombrar si elige sistema
    if (field === "tipo") {
      if (value === "sistema_tareas")
        nuevos[index].nombre = "Tareas y Actividades";
      if (value === "sistema_examenes") nuevos[index].nombre = "Exámenes";
      if (value === "sistema_asistencia") nuevos[index].nombre = "Asistencia";
      if (value === "manual") nuevos[index].nombre = "";
    }
    setCriterios(nuevos);
  };

  const fetchAulaConfig = useCallback(async () => {
    try {
      const { data } = await api.get(
        `/${user.rol}/aula-virtual/${grupoId}/${asignaturaId}/config`,
      );
      setConfig(data);

      // --- CARGAR CRITERIOS ---
      if (data.criterios && data.criterios.length > 0) {
        const mapeados = data.criterios.map((c) => ({
          nombre: c.nombre_criterio,
          porcentaje: c.porcentaje,
          tipo: c.tipo_origen,
        }));
        setCriterios(mapeados);
      } else {
        // Default si es nuevo
        setCriterios([
          { nombre: "Tareas", porcentaje: 40, tipo: "sistema_tareas" },
          { nombre: "Examen", porcentaje: 40, tipo: "sistema_examenes" },
          { nombre: "Asistencia", porcentaje: 20, tipo: "sistema_asistencia" },
        ]);
      }

      setFormData({
        enlace_videollamada: data.enlace_videollamada || "",
        descripcion_curso: data.descripcion_curso || "",
        objetivos: data.objetivos || "",
        evaluacion: data.evaluacion || "",
        horario: data.horario || "",
        contacto_docente: data.contacto_docente || "",
        hibrida: data.hibrida ? true : false,
      });
    } catch (error) {
      console.error("Error al cargar config", error);
    } finally {
      setLoading(false);
    }
  }, [user.rol, grupoId, asignaturaId]);

  const fetchTareas = useCallback(async () => {
    setLoadingTareas(true);
    try {
      const { data } = await api.get(
        `/${user.rol}/aula-virtual/${grupoId}/${asignaturaId}/tareas`,
      );
      setTareas(data);
    } catch (error) {
      console.error("Error al cargar tareas", error);
    } finally {
      setLoadingTareas(false);
    }
  }, [user.rol, grupoId, asignaturaId]);

  const fetchRecursos = useCallback(async () => {
    setLoadingRecursos(true);
    try {
      const { data } = await api.get(
        `/${user.rol}/aula-virtual/${grupoId}/${asignaturaId}/recursos`,
      );
      setRecursos(data);
    } catch (error) {
      console.error("Error al cargar recursos", error);
    } finally {
      setLoadingRecursos(false);
    }
  }, [user.rol, grupoId, asignaturaId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchHistorialAsistencia = useCallback(async () => {
    if (user.rol !== "alumno") return;
    setLoadingHistorial(true);
    try {
      const { data } = await api.get(
        `/alumno/aula-virtual/${grupoId}/${asignaturaId}/mis-asistencias`,
      );
      setHistorialAsistencia(data);
    } catch (error) {
      console.error("Error al cargar historial", error);
    } finally {
      setLoadingHistorial(false);
    }
  }, [user.rol, grupoId, asignaturaId]);

  // --- NUEVA FUNCIÓN PARA CARGAR HILOS DEL FORO ---
  const fetchHilos = useCallback(async () => {
    setLoadingHilos(true);
    try {
      // Usamos la ruta /api/foro/... que creamos (accesible por ambos roles)
      const { data } = await api.get(`/foro/${grupoId}/${asignaturaId}/hilos`);
      setHilosForo(data);
    } catch (error) {
      console.error("Error al cargar hilos del foro", error);
      setHilosForo([]);
    } finally {
      setLoadingHilos(false);
    }
  }, [grupoId, asignaturaId]);
  // --- FIN NUEVA FUNCIÓN ---

  // Cargar todos los datos al montar
  useEffect(() => {
    setLoading(true); // Ponemos el loading principal
    Promise.all([
      fetchAulaConfig(),
      fetchTareas(),
      fetchRecursos(),
      fetchHistorialAsistencia(),
      fetchHilos(), // <-- Llamamos a cargar hilos
    ]).then(() => {
      // setLoading(false); // fetchAulaConfig ya lo hace en su finally
    });
  }, [
    fetchAulaConfig,
    fetchTareas,
    fetchRecursos,
    fetchHistorialAsistencia,
    fetchHilos,
  ]); // <-- Agregamos fetchHilos

  const handleSave = async (e) => {
    e.preventDefault();

    // Validación: Que sume 100%
    const total = criterios.reduce(
      (sum, c) => sum + (parseInt(c.porcentaje) || 0),
      0,
    );
    if (total !== 100) {
      return alert(
        `Los porcentajes deben sumar 100%. Actualmente suman: ${total}%`,
      );
    }

    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await api.put(
        `/docente/aula-virtual/${grupoId}/${asignaturaId}/config`,
        { ...formData, criterios }, // <--- ENVIAMOS LOS CRITERIOS
      );
      // ... resto de tu código de éxito ...
      setIsSaving(false);
      setSaveSuccess(true);
      setIsEditing(false);

      // Actualizamos la config local para que se vea reflejado sin recargar
      setConfig((prev) => ({
        ...prev,
        ...formData,
        criterios: criterios.map((c) => ({
          // Mapeamos al formato de BD para visualización inmediata
          nombre_criterio: c.nombre,
          porcentaje: c.porcentaje,
          tipo_origen: c.tipo,
        })),
      }));

      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Error al guardar", error);
      setIsSaving(false);
      alert("Error al guardar.");
    }
  };
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  const handleOpenEntregarModal = (tarea) => {
    setSelectedTask(tarea);
    setShowEntregarModal(true);
  };
  const handleDeleteRecurso = async (recursoId) => {
    if (window.confirm("¿Seguro?")) {
      try {
        await api.delete(`/docente/aula-virtual/recurso/${recursoId}`);
        fetchRecursos();
      } catch (error) {
        console.error("Error al eliminar", error);
        alert("Error.");
      }
    }
  };
  const handleIniciarSesionHoy = async () => {
    setIsCreatingSession(true); // 1. Muestra "Iniciando..."
    try {
      // 2. Llama a la API para crear/obtener la sesión de hoy
      const { data } = await api.post(
        `/docente/aula-virtual/${grupoId}/${asignaturaId}/iniciar-sesion`,
        {
          // Opcional: podrías enviar un tema si tuvieras un input para ello
          // tema_sesion: "Clase del día"
        },
      );

      const { sesionId } = data; // 3. Obtiene el ID de la sesión

      if (sesionId) {
        // 4. Redirige al docente a la página de asistencia con ese ID
        navigate(
          `/docente/grupo/${grupoId}/asignatura/${asignaturaId}/asistencia/${sesionId}`,
        );
      } else {
        throw new Error("No se recibió un ID de sesión.");
      }
    } catch (error) {
      // 5. Maneja errores
      console.error("Error al iniciar la sesión de asistencia:", error);
      alert(
        "Error al iniciar la sesión: " +
          (error.response?.data?.message || error.message),
      );
    } finally {
      // 6. Restablece el botón
      setIsCreatingSession(false);
    }
  };

  if (loading)
    return <p className="text-center mt-10">Cargando aula virtual...</p>;
  if (!config)
    return (
      <p className="text-center mt-10 text-red-600">
        No se pudo cargar la configuración del aula.
      </p>
    );

  // --- Componente para Formulario de Editar Config (renderDocenteForm se mantiene igual) ---
  // Componente para Formulario de Editar Config
  const renderDocenteForm = () => (
    <form
      onSubmit={handleSave}
      className="bg-gray-50 p-6 rounded-lg shadow-inner space-y-6"
    >
      {/* Bloque Enlace Videoconferencia */}
      <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
        <label
          htmlFor="enlace_videollamada"
          className="block text-sm font-bold text-gray-700 mb-2"
        >
          Enlace de la Videollamada (Jitsi Meet)
        </label>
        <input
          type="url"
          name="enlace_videollamada"
          id="enlace_videollamada"
          value={formData.enlace_videollamada}
          onChange={handleChange}
          placeholder="https://meet.jit.si/..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#a72a34] outline-none"
        />

        <div className="flex flex-col sm:flex-row gap-4 mt-3">
          {/* Botón generar Jitsi */}
          <button
            type="button"
            onClick={() =>
              setFormData((prev) => ({
                ...prev,
                enlace_videollamada: `https://meet.jit.si/SIGLOXXI-G${grupoId}-A${asignaturaId}`,
              }))
            }
            className="flex items-center px-3 py-2 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100"
          >
            <Sparkles size={16} className="mr-2" />
            Generar enlace automático
          </button>

          {/* --- CHECKBOX NUEVO: NOTIFICAR AHORA --- */}
          <label className="flex items-center gap-2 cursor-pointer bg-red-50 px-3 py-2 rounded-lg border border-red-100 hover:bg-red-100 transition-colors">
            <input
              type="checkbox"
              checked={formData.notificar_inicio || false}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  notificar_inicio: e.target.checked,
                }))
              }
              className="w-4 h-4 text-[#a72a34] rounded focus:ring-[#a72a34]"
            />
            <span className="text-sm font-bold text-[#a72a34]">
              🔔 ¡Avisar a alumnos que la clase inicia YA!
            </span>
          </label>

          {/* --- CHECKBOX MODO HÍBRIDO --- */}
          <label className="flex items-center gap-2 cursor-pointer bg-purple-50 px-3 py-2 rounded-lg border border-purple-200 hover:bg-purple-100 transition-colors">
            <input
              type="checkbox"
              checked={formData.hibrida || false}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  hibrida: e.target.checked,
                }))
              }
              className="w-4 h-4 text-purple-700 rounded focus:ring-purple-500"
            />
            <span className="text-sm font-bold text-purple-700 flex items-center gap-1.5">
              <MonitorSmartphone size={16} /> Clase Híbrida (presencial + virtual)
            </span>
          </label>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Nota: Marca la casilla de la campana si quieres enviar una
          notificación push aunque el enlace sea el mismo de ayer.
        </p>
        <p className="text-xs text-purple-500 mt-1">
          Modo híbrido: activa el panel de control con monitoreo de alumnos virtuales,
          alerta de manos levantadas y mezclador de micrófonos.
        </p>
      </div>
      {/* Nuevos Campos Estructurados */}
      <div>
        <label
          htmlFor="objetivos"
          className="block text-sm font-medium text-gray-700"
        >
          Objetivos del Curso
        </label>
        <textarea
          name="objetivos"
          id="objetivos"
          rows="4"
          value={formData.objetivos}
          onChange={handleChange}
          placeholder="Al finalizar el curso, el alumno será capaz de..."
          className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-principal focus:border-principal"
        ></textarea>
      </div>
      {/* CONSTRUCTOR DE EVALUACIÓN */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b pb-2">
          <h4 className="font-bold text-gray-800 flex items-center gap-2">
            <Award size={18} className="text-[#a72a34]" /> Esquema de Evaluación
          </h4>
          <button
            type="button"
            onClick={addCriterio}
            className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg font-bold hover:bg-blue-100 transition-colors"
          >
            + Agregar Criterio
          </button>
        </div>

        <div className="space-y-3">
          {criterios.map((c, i) => (
            <div
              key={i}
              className="flex flex-col sm:flex-row gap-2 items-start sm:items-center bg-gray-50 p-2 rounded-lg"
            >
              {/* 1. Selector de Tipo */}
              <select
                className="p-2 border rounded-lg text-sm w-full sm:w-1/3 bg-white focus:ring-2 focus:ring-[#a72a34] outline-none"
                value={c.tipo}
                onChange={(e) => updateCriterio(i, "tipo", e.target.value)}
              >
                <option value="sistema_tareas">Tareas (Automático)</option>
                <option value="sistema_examenes">Exámenes (Automático)</option>
                <option value="sistema_asistencia">
                  Asistencia (Automático)
                </option>
                <option value="manual">Manual / Otro</option>
              </select>

              {/* 2. Nombre (Editable solo si es Manual) */}
              <input
                type="text"
                className={`p-2 border rounded-lg text-sm flex-1 w-full sm:w-auto outline-none ${c.tipo !== "manual" ? "bg-gray-200 text-gray-500" : "bg-white font-bold"}`}
                placeholder="Nombre (Ej: Proyecto Final)"
                value={c.nombre}
                onChange={(e) => updateCriterio(i, "nombre", e.target.value)}
                disabled={c.tipo !== "manual"}
              />

              {/* 3. Porcentaje */}
              <div className="relative w-full sm:w-24 flex items-center">
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="w-full p-2 border rounded-lg text-sm text-center font-bold outline-none focus:ring-2 focus:ring-[#a72a34]"
                  value={c.porcentaje}
                  onChange={(e) =>
                    updateCriterio(
                      i,
                      "porcentaje",
                      parseInt(e.target.value) || 0,
                    )
                  }
                />
                <span className="absolute right-8 sm:right-3 top-2 text-gray-400 text-xs">
                  %
                </span>

                {/* Botón Borrar */}
                <button
                  type="button"
                  onClick={() => removeCriterio(i)}
                  className="ml-2 text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-full transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Totalizador */}
        <div className="mt-2 flex justify-end items-center gap-2">
          <span className="text-sm text-gray-500">Total:</span>
          <span
            className={`text-lg font-bold ${criterios.reduce((a, b) => a + (b.porcentaje || 0), 0) === 100 ? "text-green-600" : "text-red-600"}`}
          >
            {criterios.reduce((a, b) => a + (b.porcentaje || 0), 0)}%
          </span>
        </div>
      </div>

      {/* Campo opcional de texto extra */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Notas adicionales de evaluación (Opcional)
        </label>
        <textarea
          name="evaluacion"
          rows="2"
          value={formData.evaluacion}
          onChange={handleChange}
          placeholder="Ej: Se requiere 80% de asistencia para derecho a examen."
          className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm outline-none focus:border-[#a72a34]"
        ></textarea>
      </div>
      <div>
        <label
          htmlFor="horario"
          className="block text-sm font-medium text-gray-700"
        >
          Horario de Clases / Oficina
        </label>
        <textarea
          name="horario"
          id="horario"
          rows="2"
          value={formData.horario}
          onChange={handleChange}
          placeholder="Ej: Lunes y Miércoles 10:00 - 12:00. Consultas: Viernes 11:00"
          className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-principal focus:border-principal"
        ></textarea>
      </div>
      <div>
        <label
          htmlFor="contacto_docente"
          className="block text-sm font-medium text-gray-700"
        >
          Información de Contacto (Docente)
        </label>
        <textarea
          name="contacto_docente"
          id="contacto_docente"
          rows="2"
          value={formData.contacto_docente}
          onChange={handleChange}
          placeholder="Ej: Email: profe@mail.com | Sala virtual: https://meet..."
          className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-principal focus:border-principal"
        ></textarea>
      </div>
      {/* Campo Descripción General (Opcional) */}
      <div>
        <label
          htmlFor="descripcion_curso"
          className="block text-sm font-medium text-gray-700"
        >
          Descripción General / Mensaje de Bienvenida (Opcional)
        </label>
        <textarea
          name="descripcion_curso"
          id="descripcion_curso"
          rows="4"
          value={formData.descripcion_curso}
          onChange={handleChange}
          placeholder="Bienvenidos al curso..."
          className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-principal focus:border-principal"
        ></textarea>
      </div>
      {/* Botones Guardar/Cancelar */}
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
          className="px-4 py-2 bg-principal text-white rounded-md hover:opacity-90 disabled:bg-gray-400"
        >
          {isSaving ? "Guardando..." : "Guardar Cambios"}
        </button>
      </div>
    </form>
  );

  // --- Componentes para Renderizar Secciones (Listas) ---
  // renderTareasList y renderRecursosList se mantienen igual
  // Componente para mostrar la lista de tareas
  const renderTareasList = () => {
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
            // El DOCENTE ve un Link a la página de detalles
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
                            tarea.fecha_limite,
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
          // El ALUMNO ve un Botón que abre el modal
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
                          tarea.fecha_limite,
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
          const url = isEnlace
            ? recurso.ruta_o_url
            : `https://api-universidad-c5o8.onrender.com/uploads/recursos/${recurso.ruta_o_url}`;
          return (
            <div
              key={recurso.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
            >
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-blue-600 hover:underline"
              >
                <Icono className="w-5 h-5 mr-3" />
                <span className="font-medium">{recurso.titulo}</span>
                {!isEnlace && (
                  <span className="text-xs text-gray-500 ml-2">
                    ({recurso.nombre_original})
                  </span>
                )}
              </a>
              {user.rol === "docente" && (
                <button
                  onClick={() => handleDeleteRecurso(recurso.id)}
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

  // --- NUEVO: Componente para Renderizar Lista del Foro ---
  const renderForoList = () => {
    if (loadingHilos) return <p>Cargando discusiones...</p>;
    if (hilosForo.length === 0) {
      return (
        <div className="text-center py-8 px-4 bg-gray-50 rounded-md border border-gray-200">
          <MessageSquare size={40} className="mx-auto text-gray-400" />
          <h4 className="font-semibold text-lg mt-3">No hay discusiones aún</h4>
          <p className="text-gray-600 mt-1">¡Sé el primero en iniciar una!</p>
          <button
            onClick={() => setShowNuevoHiloModal(true)}
            className="mt-4 flex items-center mx-auto px-4 py-2 font-semibold text-white bg-principal rounded-md hover:opacity-90"
          >
            <Plus size={18} className="mr-2" />
            Iniciar Nueva Discusión
          </button>
        </div>
      );
    }
    return (
      <div className="space-y-4">
        {/* Botón para Nuevo Hilo arriba de la lista */}
        <div className="text-right mb-4">
          <button
            onClick={() => setShowNuevoHiloModal(true)}
            className="flex items-center ml-auto px-4 py-2 font-semibold text-white bg-principal rounded-md hover:opacity-90"
          >
            <Plus size={18} className="mr-2" />
            Iniciar Nueva Discusión
          </button>
        </div>
        {/* Lista de Hilos */}
        {hilosForo.map((hilo) => (
          <Link
            key={hilo.id}
            // Enlace a la página del hilo (ajustar ruta si es alumno)
            to={
              user.rol === "docente"
                ? `/docente/grupo/${grupoId}/asignatura/${asignaturaId}/foro/hilo/${hilo.id}`
                : `/alumno/grupo/${grupoId}/asignatura/${asignaturaId}/foro/hilo/${hilo.id}`
            }
            className="block p-4 bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-bold text-lg text-principal mb-1">
                  {hilo.titulo}
                </h4>
                <p className="text-xs text-gray-500">
                  Iniciado por {hilo.creador_nombre} {hilo.creador_apellido} (
                  {hilo.creador_rol}) -{" "}
                  {new Date(hilo.fecha_creacion).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right flex-shrink-0 ml-4">
                <p className="text-sm font-semibold text-gray-700">
                  {hilo.num_respuestas}{" "}
                  {hilo.num_respuestas === 1 ? "Respuesta" : "Respuestas"}
                </p>
                {hilo.ultima_respuesta_fecha && (
                  <p className="text-xs text-gray-500 mt-1">
                    Última:{" "}
                    {new Date(hilo.ultima_respuesta_fecha).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    );
  };
  // --- FIN NUEVO COMPONENTE ---

  // --- Componente Principal de Vista (Rediseñado con Pestañas) ---
  // --- Componente Principal de Vista (Rediseñado con Pestañas) ---
  // --- Componente Principal de Vista (Rediseñado estilo Dashboard) ---
  const renderView = () => {
    // ==========================================
    // PANTALLA DE BLOQUEO POR FALTA DE PAGO
    // ==========================================
    if (user.rol === "alumno" && config.bloqueado_por_pago) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-4 animate-in zoom-in duration-300">
          <div className="bg-white p-8 md:p-12 rounded-3xl shadow-2xl text-center max-w-lg border-t-8 border-red-600">
            <div className="bg-red-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertOctagon size={48} className="text-red-600 animate-pulse" />
            </div>
            <h2 className="text-3xl font-black text-gray-900 mb-4">
              Acceso Suspendido
            </h2>
            <p className="text-gray-600 text-lg mb-8 leading-relaxed">
              Hemos detectado colegiaturas o cargos con estatus{" "}
              <strong className="text-red-600">Vencido</strong>. Por favor,
              regulariza tu situación en caja para recuperar el acceso a tus
              salones de clase.
            </p>
            <Link
              to="/alumno/mis-pagos"
              className="bg-red-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-red-700 shadow-lg hover:shadow-xl transition-all block w-full"
            >
              Revisar Estado de Cuenta
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* 1. ENCABEZADO RESPONSIVO */}
        <div
          id="tour-aula-header"
          className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4"
        >
          <div className="w-full lg:w-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 tracking-tight flex flex-col">
              <span>{config.nombre_asignatura || "Aula Virtual"}</span>
              <span className="text-sm font-medium text-gray-500 mt-1">
                Grupo: {config.nombre_grupo}
              </span>
            </h2>

            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span
                className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${config.modalidad === "presencial" ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-purple-50 text-purple-700 border-purple-100"}`}
              >
                {config.modalidad}
              </span>
              <span
                className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${config.estatus === "activo" ? "bg-green-50 text-green-700 border-green-100" : "bg-red-50 text-red-700 border-red-100"}`}
              >
                {config.estatus}
              </span>
            </div>
          </div>

          {/* BOTONES DOCENTE (Se apilan en celular, en fila en PC) */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto mt-2 lg:mt-0">
            {user.rol === "docente" && (
              <>
                <button
                  id="tour-docente-asistencia"
                  onClick={handleIniciarSesionHoy}
                  disabled={isCreatingSession}
                  className="flex-1 lg:flex-none justify-center items-center px-4 py-3 text-sm font-bold text-white bg-[#a72a34] rounded-xl hover:bg-[#802028] disabled:bg-gray-400 shadow-md transition-all flex gap-2"
                >
                  <ClipboardCheck size={18} />{" "}
                  {isCreatingSession ? "Iniciando..." : "Asistencia"}
                </button>
                <button
                  id="tour-docente-editar"
                  onClick={() => setIsEditing(true)}
                  className="flex-1 lg:flex-none justify-center items-center px-4 py-3 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:text-[#a72a34] shadow-sm transition-all flex gap-2"
                >
                  <Edit2 size={18} /> Editar
                </button>
                <button
                  id="tour-docente-acta"
                  onClick={() =>
                    navigate(
                      `/docente/grupo/${grupoId}/asignatura/${asignaturaId}`,
                    )
                  }
                  className="flex-1 lg:flex-none justify-center items-center px-4 py-3 text-sm font-bold text-[#a72a34] bg-red-50 border border-red-100 rounded-xl hover:bg-[#a72a34] hover:text-white shadow-sm transition-all flex gap-2"
                >
                  <GraduationCap size={18} /> Acta
                </button>
              </>
            )}
          </div>
        </div>

        {/* 2. NAVEGACIÓN DE PESTAÑAS (SCROLL HORIZONTAL EN MÓVIL) */}
        <div
          id="tour-tabs"
          className="border-b border-gray-200 bg-white md:bg-transparent px-2 md:px-0 rounded-t-xl overflow-hidden"
        >
          <nav
            className="-mb-px flex space-x-2 md:space-x-8 overflow-x-auto custom-scrollbar pb-1 pt-2"
            aria-label="Tabs"
          >
            <button
              onClick={() => setActiveTab("info")}
              className={`pb-3 px-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${activeTab === "info" ? "border-[#a72a34] text-[#a72a34]" : "border-transparent text-gray-400 hover:text-gray-600"}`}
            >
              <Book size={18} /> Información
            </button>
            <button
              onClick={() => setActiveTab("muro")}
              className={`pb-3 px-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${activeTab === "muro" ? "border-[#a72a34] text-[#a72a34]" : "border-transparent text-gray-400 hover:text-gray-600"}`}
            >
              <Bell size={18} /> Novedades
            </button>
            <button
              onClick={() => setActiveTab("tareas")}
              className={`pb-3 px-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${activeTab === "tareas" ? "border-[#a72a34] text-[#a72a34]" : "border-transparent text-gray-400 hover:text-gray-600"}`}
            >
              <FileText size={18} /> Tareas
            </button>
            <button
              onClick={() => setActiveTab("recursos")}
              className={`pb-3 px-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${activeTab === "recursos" ? "border-[#a72a34] text-[#a72a34]" : "border-transparent text-gray-400 hover:text-gray-600"}`}
            >
              <Paperclip size={18} /> Recursos
            </button>
            <button
              onClick={() => setActiveTab("foro")}
              className={`pb-3 px-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${activeTab === "foro" ? "border-[#a72a34] text-[#a72a34]" : "border-transparent text-gray-400 hover:text-gray-600"}`}
            >
              <MessageSquare size={18} /> Foro
            </button>
            <button
              onClick={() => setActiveTab("examenes")}
              className={`pb-3 px-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${activeTab === "examenes" ? "border-[#a72a34] text-[#a72a34]" : "border-transparent text-gray-400 hover:text-gray-600"}`}
            >
              <CheckCircle size={18} /> Exámenes
            </button>
            <button
              onClick={() => setActiveTab("equipos")}
              className={`pb-3 px-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${activeTab === "equipos" ? "border-[#a72a34] text-[#a72a34]" : "border-transparent text-gray-400 hover:text-gray-600"}`}
            >
              <Users size={18} /> Equipos
            </button>
            {user.rol === "docente" && (
              <button
                onClick={() => setActiveTab("analiticas")}
                className={`pb-3 px-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${activeTab === "analiticas" ? "border-[#a72a34] text-[#a72a34]" : "border-transparent text-gray-400 hover:text-gray-600"}`}
              >
                <TrendingUp size={18} /> Analíticas
              </button>
            )}
          </nav>
        </div>

        {/* 3. CONTENIDO DE LA PESTAÑA ACTIVA (Card Blanca Limpia) */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 min-h-[400px]">
          {/* Pestaña: Información */}
          {activeTab === "info" && (
            <div className="space-y-8 animate-in fade-in duration-300">
              {/* Sección Videollamada Destacada */}
              {/* Sección Videollamada Destacada */}
              <div
                id="tour-info-videollamada"
                className="bg-gradient-to-r from-gray-900 to-gray-800 p-6 rounded-2xl text-white flex justify-between items-center shadow-lg"
              >
                <div>
                  <h4 className="font-bold text-lg mb-1 flex items-center gap-2">
                    <Video className="text-red-500" /> Sala de Videoconferencia
                  </h4>
                  <p className="text-gray-300 text-sm">
                    {config.enlace_videollamada
                      ? "Enlace activo para la sesión en vivo."
                      : "El docente aún no ha configurado el enlace."}
                  </p>
                </div>

                {config.enlace_videollamada && (
                  <div className="flex gap-2">
                    <a
                      href={config.enlace_videollamada}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-6 py-3 bg-[#a72a34] hover:bg-[#802028] text-white font-bold rounded-xl transition-all shadow-lg transform hover:-translate-y-1 flex items-center gap-2"
                    >
                      Unirse a la Clase <ArrowRightCircle size={18} />
                    </a>
                    {user.rol === "docente" && config.hibrida && (
                      <button
                        onClick={() => {
                          const roomName = `SIGLOXXI-G${grupoId}-A${asignaturaId}`;
                          const url = config.enlace_videollamada.match(
                            /meet\.jit\.si\/(.+)/,
                          );
                          const sala = url
                            ? url[1]
                            : roomName;
                          navigate(
                            `/${user.rol}/clase-en-vivo/${sala}?hibrida=true`,
                          );
                        }}
                        className="px-6 py-3 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl transition-all shadow-lg transform hover:-translate-y-1 flex items-center gap-2"
                      >
                        <MonitorSmartphone size={18} />
                        Clase Híbrida
                      </button>
                    )}
                  </div>
                )}
              </div>

              {config.descripcion_curso && (
                <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 shadow-sm">
                  <h4 className="font-bold text-blue-800 text-lg mb-2 flex items-center gap-2">
                    <Sparkles size={20} /> Bienvenida / Descripción General
                  </h4>
                  <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                    {config.descripcion_curso}
                  </p>
                </div>
              )}

              {/* Grid de Información */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-bold text-gray-800 border-b border-gray-100 pb-2 mb-2 flex items-center gap-2">
                      <Sparkles size={16} className="text-[#a72a34]" />{" "}
                      Objetivos
                    </h4>
                    <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">
                      {config.objetivos || "Sin información definida."}
                    </p>
                  </div>
                  {/* BLOQUE DE EVALUACIÓN DINÁMICO */}
                  <div
                    id="tour-info-evaluacion"
                    className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm"
                  >
                    <h4 className="font-bold text-gray-800 border-b border-gray-100 pb-2 mb-4 flex items-center gap-2">
                      <Award size={18} className="text-[#a72a34]" /> Criterios
                      de Evaluación
                    </h4>

                    {/* Texto adicional */}
                    {config.evaluacion && (
                      <p className="text-gray-600 text-sm mb-4 italic">
                        "{config.evaluacion}"
                      </p>
                    )}

                    {/* Barras Dinámicas */}
                    <div className="space-y-4">
                      {config.criterios &&
                        config.criterios.map((c, i) => {
                          // Asignamos colores según el tipo
                          let colorBar = "bg-gray-500";
                          let colorText = "text-gray-600";

                          if (c.tipo_origen === "sistema_tareas") {
                            colorBar = "bg-blue-500";
                            colorText = "text-blue-600";
                          }
                          if (c.tipo_origen === "sistema_examenes") {
                            colorBar = "bg-purple-500";
                            colorText = "text-purple-600";
                          }
                          if (c.tipo_origen === "sistema_asistencia") {
                            colorBar = "bg-green-500";
                            colorText = "text-green-600";
                          }
                          if (c.tipo_origen === "manual") {
                            colorBar = "bg-orange-500";
                            colorText = "text-orange-600";
                          }

                          return (
                            <div key={i}>
                              <div className="flex justify-between text-xs font-bold mb-1">
                                <span className={`${colorText} uppercase`}>
                                  {c.nombre_criterio}
                                </span>
                                <span className="text-gray-700">
                                  {c.porcentaje}%
                                </span>
                              </div>
                              <div className="w-full bg-gray-100 rounded-full h-2.5">
                                <div
                                  className={`h-2.5 rounded-full transition-all duration-1000 ${colorBar}`}
                                  style={{ width: `${c.porcentaje}%` }}
                                ></div>
                              </div>
                            </div>
                          );
                        })}

                      {(!config.criterios || config.criterios.length === 0) && (
                        <p className="text-xs text-gray-400 text-center">
                          El docente aún no define los criterios.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                      <Clock size={16} className="text-[#a72a34]" /> Horario
                    </h4>
                    <p className="text-gray-600 text-sm whitespace-pre-wrap">
                      {config.horario || "Por definir."}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                      <User size={16} className="text-[#a72a34]" /> Contacto
                      Docente
                    </h4>
                    <p className="text-gray-600 text-sm whitespace-pre-wrap">
                      {config.contacto_docente || "No especificado."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Historial Asistencia (Solo Alumno) */}
              {user.rol === "alumno" && (
                <div
                  id="tour-info-asistencia"
                  className="mt-8 pt-8 border-t border-gray-100"
                >
                  <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <History size={20} className="text-gray-400" /> Mi
                    Asistencia
                  </h4>
                  {loadingHistorial ? (
                    <p className="text-sm text-gray-400">Cargando...</p>
                  ) : historialAsistencia.length === 0 ? (
                    <div className="p-6 bg-gray-50 rounded-xl text-center text-gray-400 text-sm border border-dashed">
                      No hay registros de asistencia.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                      {/* --- BLOQUE CORREGIDO: HISTORIAL DE ASISTENCIA --- */}
                      {historialAsistencia.map((reg) => (
                        <div
                          key={reg.sesion_id}
                          className={`p-3 rounded-xl border text-center transition-all hover:shadow-md ${
                            reg.mi_estatus === "presente"
                              ? "bg-green-50 border-green-100"
                              : reg.mi_estatus === "justificado"
                                ? "bg-yellow-50 border-yellow-100"
                                : "bg-red-50 border-red-100"
                          }`}
                        >
                          {/* AQUÍ AGREGAMOS LA PALABRA "ASISTENCIA" */}
                          <p className="text-[10px] uppercase font-bold tracking-wider text-gray-400 mb-1">
                            Asistencia
                          </p>

                          {/* AQUÍ USAMOS LA FECHA BONITA QUE VIENE DEL BACKEND */}
                          <p className="text-xs font-bold text-gray-700 mb-2">
                            {reg.fecha_mostrar || "Fecha pendiente"}
                          </p>

                          {/* ESTATUS (Presente/Falta) */}
                          <span
                            className={`text-xs font-black uppercase px-2 py-0.5 rounded-full ${
                              reg.mi_estatus === "presente"
                                ? "bg-green-100 text-green-700"
                                : reg.mi_estatus === "justificado"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-red-100 text-red-700"
                            }`}
                          >
                            {reg.mi_estatus}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Pestaña: Tareas */}
          {activeTab === "tareas" && (
            <div
              id="tour-tareas-lista"
              className="animate-in fade-in duration-300"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">
                  Actividades de Aprendizaje
                </h3>
                {user.rol === "docente" && (
                  <button
                    id="tour-docente-btn-tarea"
                    onClick={() => setShowCrearTareaModal(true)}
                    className="bg-[#a72a34] text-white px-5 py-2.5 rounded-xl font-bold hover:bg-[#802028] shadow-lg shadow-red-900/10 flex items-center gap-2 transition-transform active:scale-95"
                  >
                    <Plus size={18} /> Nueva Tarea
                  </button>
                )}
              </div>
              {renderTareasList()}
            </div>
          )}
          {/* CONTENIDO DE LAS PESTAÑAS NUEVAS */}

          {activeTab === "muro" && (
            <div id="tour-muro-novedades" className="mt-6">
              <MuroDocentePage />
            </div>
          )}
          {activeTab === "equipos" && (
            <div id="tour-equipos" className="animate-in fade-in duration-300">
              {user.rol === "docente" ? (
                // VISTA DEL DOCENTE
                <EquiposDocenteView
                  grupoId={grupoId}
                  asignaturaId={asignaturaId}
                />
              ) : (
                // VISTA DEL ALUMNO
                <EquiposAlumnoView
                  grupoId={grupoId}
                  asignaturaId={asignaturaId}
                />
              )}
            </div>
          )}

          {activeTab === "examenes" && (
            <div id="tour-examenes-lista" className="mt-6">
              {/* Cargamos la LISTA, no el creador directo */}
              <ExamenesPage />
            </div>
          )}

          {activeTab === "analiticas" && user.rol === "docente" && (
            <div className="mt-6">
              <AnaliticasGrupoPage />
            </div>
          )}

          {/* Pestaña: Recursos */}
          {activeTab === "recursos" && (
            <div
              id="tour-recursos-lista"
              className="animate-in fade-in duration-300"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">
                  Material de Consulta
                </h3>
                {user.rol === "docente" && (
                  <button
                    id="tour-docente-btn-recurso"
                    onClick={() => setShowRecursoModal(true)}
                    className="bg-white border-2 border-[#a72a34] text-[#a72a34] px-5 py-2.5 rounded-xl font-bold hover:bg-[#a72a34] hover:text-white transition-all flex items-center gap-2"
                  >
                    <UploadCloud size={18} /> Subir Material
                  </button>
                )}
              </div>
              {renderRecursosList()}
            </div>
          )}

          {/* Pestaña: Foro */}
          {activeTab === "foro" && (
            <div
              id="tour-foro-lista"
              className="animate-in fade-in duration-300"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">
                  Foro de Discusión
                </h3>
                {/* Botón del Foro movido a la nueva función de renderizado o aquí mismo si prefieres */}
              </div>
              {renderForoList()}
            </div>
          )}
        </div>
      </div>
    );
  };
  // --- Renderizado Principal y Modales ---
  return (
    <div>
      {isEditing ? renderDocenteForm() : renderView()}

      {/* Modales (se mantienen igual, solo añadimos el de Nuevo Hilo) */}
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
      <AgregarRecursoModal
        show={showRecursoModal}
        onClose={() => setShowRecursoModal(false)}
        grupoId={grupoId}
        asignaturaId={asignaturaId}
        onRecursoAgregado={fetchRecursos}
      />
      {/* --- NUEVO MODAL --- */}
      <NuevoHiloModal
        show={showNuevoHiloModal}
        onClose={() => setShowNuevoHiloModal(false)}
        grupoId={grupoId}
        asignaturaId={asignaturaId}
        onHiloCreado={fetchHilos}
      />
    </div>
  );
};
// --- FIN REEMPLAZO AulaVirtualPage ---

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

  // --- ESTADO NUEVO PARA RÚBRICAS ---
  const [usarRubrica, setUsarRubrica] = useState(false);
  const [rubricas, setRubricas] = useState([]);

  const [isSaving, setIsSaving] = useState(false);

  // Funciones para manejar rúbricas dinámicas
  const agregarCriterio = () => {
    setRubricas([...rubricas, { criterio: "", descripcion: "", puntos: 0 }]);
  };

  const eliminarCriterio = (index) => {
    const nuevas = [...rubricas];
    nuevas.splice(index, 1);
    setRubricas(nuevas);
  };

  const actualizarCriterio = (index, campo, valor) => {
    const nuevas = [...rubricas];
    nuevas[index][campo] = valor;
    setRubricas(nuevas);
  };

  const totalPuntosRubrica = rubricas.reduce(
    (acc, curr) => acc + (parseFloat(curr.puntos) || 0),
    0,
  );

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (usarRubrica && totalPuntosRubrica !== 100) {
      if (
        !window.confirm(
          `La rúbrica suma ${totalPuntosRubrica} puntos (se recomiendan 100). ¿Deseas continuar?`,
        )
      ) {
        return;
      }
    }

    setIsSaving(true);
    try {
      await api.post(
        `/docente/aula-virtual/${grupoId}/${asignaturaId}/tareas`,
        {
          titulo,
          descripcion,
          fecha_limite: fechaLimite || null,
          rubricas: usarRubrica ? rubricas : null, // <-- ENVIAMOS LAS RÚBRICAS
        },
      );
      onTareaCreada();
      onClose();
      setTitulo("");
      setDescripcion("");
      setFechaLimite("");
      setRubricas([]);
      setUsarRubrica(false);
    } catch (error) {
      console.error("Error al crear tarea", error);
      alert("Error al crear la tarea.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col relative">
        {/* Encabezado del Modal */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl shrink-0">
          <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FilePlus size={24} className="text-[#a72a34]" /> Crear Tarea /
            Actividad
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-red-500 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Cuerpo con Scroll */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          <form
            id="crear-tarea-form"
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            <div>
              <label
                htmlFor="titulo"
                className="block text-sm font-bold text-gray-700 mb-1"
              >
                Título de la Tarea *
              </label>
              <input
                type="text"
                id="titulo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                required
                placeholder="Ej. Ensayo sobre la Revolución"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a72a34] outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="descripcion"
                className="block text-sm font-bold text-gray-700 mb-1"
              >
                Instrucciones
              </label>
              <textarea
                id="descripcion"
                rows="4"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Describe detalladamente qué deben hacer los alumnos..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a72a34] outline-none resize-none"
              ></textarea>
            </div>

            <div>
              <label
                htmlFor="fechaLimite"
                className="block text-sm font-bold text-gray-700 mb-1"
              >
                Fecha y Hora Límite (Opcional)
              </label>
              <input
                type="datetime-local"
                id="fechaLimite"
                value={fechaLimite}
                onChange={(e) => setFechaLimite(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a72a34] outline-none"
              />
            </div>

            {/* --- SECCIÓN DE RÚBRICAS ESTILO CLASSROOM --- */}
            <div className="pt-4 border-t border-gray-100">
              <label className="flex items-center gap-3 cursor-pointer mb-4 bg-gray-50 p-4 rounded-xl border border-gray-200 hover:border-[#a72a34] transition-colors">
                <input
                  type="checkbox"
                  checked={usarRubrica}
                  onChange={(e) => {
                    setUsarRubrica(e.target.checked);
                    if (e.target.checked && rubricas.length === 0)
                      agregarCriterio();
                  }}
                  className="w-5 h-5 text-[#a72a34] rounded focus:ring-[#a72a34]"
                />
                <div>
                  <span className="font-bold text-gray-800 block">
                    Agregar Rúbrica de Evaluación
                  </span>
                  <span className="text-xs text-gray-500">
                    Define los criterios exactos para calificar esta tarea.
                  </span>
                </div>
              </label>

              {usarRubrica && (
                <div className="space-y-4 bg-blue-50/50 p-5 rounded-xl border border-blue-100">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-blue-900">
                      Criterios de Calificación
                    </h4>
                    <span
                      className={`text-sm font-bold px-3 py-1 rounded-full ${totalPuntosRubrica === 100 ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}
                    >
                      Total: {totalPuntosRubrica} / 100 pts
                    </span>
                  </div>

                  {rubricas.map((r, idx) => (
                    <div
                      key={idx}
                      className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm relative group"
                    >
                      <button
                        type="button"
                        onClick={() => eliminarCriterio(idx)}
                        className="absolute -top-3 -right-3 bg-red-100 text-red-600 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white shadow-sm"
                        title="Eliminar criterio"
                      >
                        <X size={16} />
                      </button>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-3">
                          <input
                            type="text"
                            placeholder="Nombre del criterio (Ej. Ortografía)"
                            className="w-full font-bold text-gray-800 border-b border-gray-200 focus:border-[#a72a34] outline-none pb-1 mb-3"
                            value={r.criterio}
                            onChange={(e) =>
                              actualizarCriterio(
                                idx,
                                "criterio",
                                e.target.value,
                              )
                            }
                            required
                          />
                          <textarea
                            rows="2"
                            placeholder="Descripción (Ej. El texto no debe contener errores ortográficos ni gramaticales...)"
                            className="w-full text-sm text-gray-600 outline-none resize-none bg-gray-50 p-2 rounded-lg"
                            value={r.descripcion}
                            onChange={(e) =>
                              actualizarCriterio(
                                idx,
                                "descripcion",
                                e.target.value,
                              )
                            }
                          />
                        </div>
                        <div className="flex flex-col justify-center items-center bg-gray-50 rounded-lg p-3">
                          <label className="text-xs font-bold text-gray-500 uppercase mb-1">
                            Puntos
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            className="w-full text-center text-xl font-black text-[#a72a34] bg-transparent outline-none border-b-2 border-gray-300 focus:border-[#a72a34]"
                            value={r.puntos}
                            onChange={(e) =>
                              actualizarCriterio(idx, "puntos", e.target.value)
                            }
                            required
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={agregarCriterio}
                    className="w-full py-3 border-2 border-dashed border-blue-300 text-blue-600 font-bold rounded-xl hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus size={18} /> Agregar Criterio
                  </button>
                </div>
              )}
            </div>
            {/* --- FIN RÚBRICAS --- */}
          </form>
        </div>

        {/* Footer con Botones */}
        <div className="p-6 border-t border-gray-100 flex justify-end space-x-4 bg-white rounded-b-2xl shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="crear-tarea-form"
            disabled={isSaving}
            className="px-6 py-3 bg-[#a72a34] text-white font-bold rounded-xl hover:bg-[#802028] shadow-lg disabled:opacity-50 flex items-center gap-2"
          >
            <CheckCircle size={20} />
            {isSaving ? "Creando..." : "Publicar Tarea"}
          </button>
        </div>
      </div>
    </div>
  );
};

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
        },
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
  const isVencida =
    tarea.fecha_limite && new Date() > new Date(tarea.fecha_limite);

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

        {/* --- INICIO MOSTRAR RÚBRICA --- */}
        {tarea.rubrica && (
          <div className="mb-6 border border-[#bb9a5a] rounded-xl overflow-hidden shadow-sm">
            <div className="bg-[#bb9a5a]/10 px-4 py-2 border-b border-[#bb9a5a] flex justify-between items-center">
              <span className="font-bold text-[#a72a34] flex items-center gap-2">
                <FileCheck size={16} /> Rúbrica de Evaluación
              </span>
            </div>
            <div className="p-4 bg-white space-y-3">
              {(() => {
                try {
                  // Parseo seguro: Verifica si ya es objeto, si no, lo parsea. Maneja doble stringificación.
                  let rubricasParsed =
                    typeof tarea.rubrica === "string"
                      ? JSON.parse(tarea.rubrica)
                      : tarea.rubrica;
                  if (typeof rubricasParsed === "string")
                    rubricasParsed = JSON.parse(rubricasParsed);

                  if (!Array.isArray(rubricasParsed))
                    return (
                      <span className="text-xs text-gray-400">
                        Sin criterios definidos.
                      </span>
                    );

                  return rubricasParsed.map((r, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-start pb-3 border-b border-gray-100 last:border-0 last:pb-0"
                    >
                      <div>
                        <p className="font-bold text-gray-800 text-sm">
                          {r.criterio}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {r.descripcion}
                        </p>
                      </div>
                      <span className="font-black text-[#a72a34] bg-red-50 px-2 py-1 rounded text-sm shrink-0 ml-4">
                        {r.puntos} pts
                      </span>
                    </div>
                  ));
                } catch (e) {
                  console.error("Error parseando rúbrica:", e);
                  return (
                    <span className="text-xs text-gray-400 text-red-500">
                      No se pudo cargar la rúbrica.
                    </span>
                  );
                }
              })()}
            </div>
          </div>
        )}
        {/* --- FIN MOSTRAR RÚBRICA --- */}

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
              {isVencida && !isEntregada ? (
                <div className="w-full text-center p-3 bg-red-100 text-red-700 rounded-lg font-bold">
                  La fecha límite ha expirado. Ya no puedes enviar esta tarea.
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={isUploading || isVencida}
                  className="flex items-center px-4 py-2 bg-principal text-white rounded-md hover:opacity-90 disabled:bg-gray-400"
                >
                  <UploadCloud size={18} className="mr-2" />
                  {isUploading
                    ? "Subiendo..."
                    : isEntregada
                      ? "Actualizar Entrega"
                      : "Entregar Tarea"}
                </button>
              )}
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
          : "", // Convertimos null/undefined a ""
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
        },
      );
      onCalificacionExitosa(); // Recarga la lista de entregas
      onClose(); // Cierra el modal
    } catch (error) {
      console.error("Error al guardar calificación", error);
      setError(
        error.response?.data?.message ||
          "Error al guardar. Inténtalo de nuevo.",
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
        {entrega.rubrica && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 my-4">
            <h4 className="text-sm font-bold text-blue-800 mb-2 flex items-center gap-1">
              <FileCheck size={16} /> Recordatorio de Rúbrica:
            </h4>
            <div className="space-y-2">
              {(() => {
                try {
                  const rubricasParsed = JSON.parse(entrega.rubrica);
                  return rubricasParsed.map((r, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="font-medium text-gray-700 w-3/4">
                        {r.criterio}
                      </span>
                      <span className="font-bold text-blue-700">
                        {r.puntos} pts
                      </span>
                    </div>
                  ));
                } catch (e) {
                  return null;
                }
              })()}
            </div>
          </div>
        )}
        <p className="text-lg font-semibold text-gray-800">
          {entrega.nombre} {entrega.apellido_paterno}
        </p>

        {/* --- Sección de Entrega del Alumno --- */}
        <div className="bg-gray-50 p-4 rounded-md my-4 border">
          <h4 className="font-semibold text-gray-700">Archivo del Alumno</h4>
          <a
            href={`https://api-universidad-c5o8.onrender.com/uploads/tareas/tarea_${entrega.tarea_id}/${entrega.ruta_archivo}`}
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
          { titulo, url }, // Envía título y url
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
          { headers: { "Content-Type": "multipart/form-data" } }, // Header importante
        );
      }

      // --- Éxito ---
      onRecursoAgregado(); // Llama a la función para refrescar la lista de recursos
      handleClose(); // Cierra el modal si todo salió bien
    } catch (error) {
      // --- Error de API ---
      console.error("Error al agregar recurso", error);
      setError(
        error.response?.data?.message ||
          "Error al guardar. Inténtalo de nuevo.",
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

// --- INICIA NUEVO CÓDIGO (AGREGAR) ---

// Modal para Crear Nuevo Hilo en el Foro
const NuevoHiloModal = ({
  show,
  onClose,
  grupoId,
  asignaturaId,
  onHiloCreado,
}) => {
  const [titulo, setTitulo] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const resetForm = () => {
    setTitulo("");
    setMensaje("");
    setError("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!titulo.trim() || !mensaje.trim()) {
      setError("El título y el mensaje son requeridos.");
      return;
    }
    setError("");
    setIsSaving(true);
    try {
      await api.post(`/foro/${grupoId}/${asignaturaId}/hilos`, {
        titulo,
        mensaje_original: mensaje,
      });
      onHiloCreado(); // Refresca la lista de hilos
      handleClose();
    } catch (error) {
      console.error("Error al crear hilo", error);
      setError(error.response?.data?.message || "Error al crear el hilo.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 relative">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
        >
          <X size={24} />
        </button>
        <h3 className="text-2xl font-bold mb-6">Iniciar Nueva Discusión</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="hilo_titulo"
              className="block text-sm font-medium text-gray-700"
            >
              Título del Hilo
            </label>
            <input
              type="text"
              id="hilo_titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              required
              maxLength={255}
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md"
              placeholder="Ej: Duda sobre la Tarea 3"
            />
          </div>
          <div>
            <label
              htmlFor="hilo_mensaje"
              className="block text-sm font-medium text-gray-700"
            >
              Mensaje Inicial
            </label>
            <textarea
              id="hilo_mensaje"
              rows="6"
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              required
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md"
              placeholder="Describe tu pregunta o el tema de discusión..."
            ></textarea>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end space-x-4 mt-8">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center px-4 py-2 bg-principal text-white rounded-md hover:opacity-90 disabled:bg-gray-400"
            >
              <Plus size={18} className="mr-2" />
              {isSaving ? "Publicando..." : "Crear Hilo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
// --- TERMINA NUEVO CÓDIGO ---

// --- INICIA NUEVO CÓDIGO (AGREGAR) ---

// Página para ver un Hilo del Foro y sus Respuestas
const HiloPage = () => {
  const { grupoId, asignaturaId, hiloId } = useParams();

  const [hilo, setHilo] = useState(null);
  const [respuestas, setRespuestas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nuevaRespuesta, setNuevaRespuesta] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [errorRespuesta, setErrorRespuesta] = useState("");

  // Función para cargar el hilo y sus respuestas
  const fetchHilo = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/foro/hilo/${hiloId}`);
      setHilo(data.hilo);
      setRespuestas(data.respuestas);
    } catch (error) {
      console.error("Error al cargar el hilo", error);
      // Aquí podríamos redirigir si el hilo no se encuentra (404)
    } finally {
      setLoading(false);
    }
  }, [hiloId]);

  useEffect(() => {
    fetchHilo();
  }, [fetchHilo]);

  // Manejar el envío de una nueva respuesta
  const handlePostRespuesta = async (e) => {
    e.preventDefault();
    if (!nuevaRespuesta.trim()) {
      setErrorRespuesta("La respuesta no puede estar vacía.");
      return;
    }
    setErrorRespuesta("");
    setIsPosting(true);
    try {
      await api.post(`/foro/hilo/${hiloId}/respuestas`, {
        mensaje: nuevaRespuesta,
      });
      setNuevaRespuesta(""); // Limpiar el campo
      fetchHilo(); // Recargar las respuestas para ver la nueva
    } catch (error) {
      console.error("Error al publicar respuesta", error);
      setErrorRespuesta(
        error.response?.data?.message || "Error al enviar la respuesta.",
      );
    } finally {
      setIsPosting(false);
    }
  };

  // Helper para mostrar un avatar simple basado en iniciales y rol
  const UserAvatar = ({ nombre, apellido, rol }) => {
    const iniciales = `${nombre?.charAt(0) || ""}${
      apellido?.charAt(0) || ""
    }`.toUpperCase();
    const bgColor =
      rol === "docente"
        ? "bg-secundario"
        : rol === "admin"
          ? "bg-red-500"
          : "bg-principal";
    return (
      <div
        className={`flex-shrink-0 w-10 h-10 rounded-full ${bgColor} text-white flex items-center justify-center font-bold text-sm mr-3`}
      >
        {iniciales}
      </div>
    );
  };

  if (loading) return <p>Cargando discusión...</p>;
  if (!hilo) return <p>Hilo no encontrado.</p>;

  return (
    <div className="max-w-4xl mx-auto">
      <Link
        to={`/docente/grupo/${grupoId}/asignatura/${asignaturaId}/aula`} // Ajustar si es alumno
        className="flex items-center text-principal mb-6 hover:underline"
      >
        <ArrowLeft size={18} className="mr-2" />
        Volver al Aula Virtual / Foro
      </Link>

      {/* Mensaje Original del Hilo */}
      <div className="bg-white p-6 rounded-lg shadow mb-6 border-l-4 border-principal">
        <h2 className="text-2xl font-bold text-gray-800 mb-3">{hilo.titulo}</h2>
        <div className="flex items-start mb-4">
          <UserAvatar
            nombre={hilo.creador_nombre}
            apellido={hilo.creador_apellido}
            rol={hilo.creador_rol}
          />
          <div>
            <p className="font-semibold text-gray-700">
              {hilo.creador_nombre} {hilo.creador_apellido}{" "}
              <span className="text-xs capitalize text-gray-500">
                ({hilo.creador_rol})
              </span>
            </p>
            <p className="text-xs text-gray-500">
              {new Date(hilo.fecha_creacion).toLocaleString()}
            </p>
          </div>
        </div>
        <p className="text-gray-700 whitespace-pre-wrap">
          {hilo.mensaje_original}
        </p>
      </div>

      <h3 className="text-xl font-semibold text-gray-800 mb-4">
        Respuestas ({respuestas.length})
      </h3>

      {/* Lista de Respuestas */}
      <div className="space-y-4 mb-8">
        {respuestas.map((respuesta) => (
          <div
            key={respuesta.id}
            className="bg-white p-4 rounded-lg shadow flex items-start"
          >
            <UserAvatar
              nombre={respuesta.creador_nombre}
              apellido={respuesta.creador_apellido}
              rol={respuesta.creador_rol}
            />
            <div className="flex-1">
              <p className="font-semibold text-gray-700 text-sm">
                {respuesta.creador_nombre} {respuesta.creador_apellido}{" "}
                <span className="text-xs capitalize text-gray-500">
                  ({respuesta.creador_rol})
                </span>
              </p>
              <p className="text-xs text-gray-500 mb-2">
                {new Date(respuesta.fecha_creacion).toLocaleString()}
              </p>
              <p className="text-gray-700 text-sm whitespace-pre-wrap">
                {respuesta.mensaje}
              </p>
            </div>
          </div>
        ))}
        {respuestas.length === 0 && (
          <p className="text-gray-500 text-center py-4">
            Aún no hay respuestas. ¡Sé el primero en participar!
          </p>
        )}
      </div>

      {/* Formulario para Nueva Respuesta */}
      <form
        onSubmit={handlePostRespuesta}
        className="bg-white p-4 rounded-lg shadow sticky bottom-4"
      >
        <label
          htmlFor="nueva_respuesta"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Escribe tu respuesta:
        </label>
        <textarea
          id="nueva_respuesta"
          rows="3"
          value={nuevaRespuesta}
          onChange={(e) => setNuevaRespuesta(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md mb-2"
          placeholder="Aporta a la discusión..."
        ></textarea>
        {errorRespuesta && (
          <p className="text-xs text-red-600 mb-2">{errorRespuesta}</p>
        )}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isPosting}
            className="flex items-center px-4 py-2 font-semibold text-white bg-principal rounded-md hover:opacity-90 disabled:bg-gray-400"
          >
            <Send size={16} className="mr-2" />
            {isPosting ? "Enviando..." : "Publicar Respuesta"}
          </button>
        </div>
      </form>
    </div>
  );
};
// --- TERMINA NUEVO CÓDIGO ---

// Página de Detalles de Tarea (solo Docente)
const DetalleTareaDocentePage = () => {
  const { grupoId, asignaturaId, tareaId } = useParams();
  const [tarea, setTarea] = useState(null);
  const [entregas, setEntregas] = useState([]);
  const [loading, setLoading] = useState(true);
  // Estado para el modal de calificación
  const [showCalificarModal, setShowCalificarModal] = useState(false);
  const [selectedEntrega, setSelectedEntrega] = useState(null);

  // Función para cargar los detalles
  const fetchDetallesTarea = useCallback(async () => {
    try {
      const { data } = await api.get(
        `/docente/aula-virtual/tarea/${tareaId}/entregas`,
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
                      href={`https://api-universidad-c5o8.onrender.com/uploads/tareas/tarea_${tarea.id}/${entrega.ruta_archivo}`}
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

// --- INICIA NUEVO CÓDIGO (AGREGAR) ---

// Página para tomar Asistencia (solo Docente)
const AsistenciaPage = () => {
  const { grupoId, asignaturaId, sesionId } = useParams();
  const [sesion, setSesion] = useState(null);
  const [alumnos, setAlumnos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Estado para manejar los cambios de asistencia localmente
  const [asistenciaChanges, setAsistenciaChanges] = useState({});

  // Cargar datos de la sesión y asistencia actual
  const fetchAsistencia = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get(
        `/docente/aula-virtual/sesion/${sesionId}/asistencia`,
      );
      setSesion(data.sesion);
      setAlumnos(data.alumnos);
      // Inicializar el estado local con los datos cargados
      const initialChanges = data.alumnos.reduce((acc, al) => {
        acc[al.alumno_id] = al.estatus;
        return acc;
      }, {});
      setAsistenciaChanges(initialChanges);
    } catch (error) {
      console.error("Error al cargar datos de asistencia", error);
      alert("No se pudieron cargar los datos.");
    } finally {
      setLoading(false);
    }
  }, [sesionId]);

  useEffect(() => {
    fetchAsistencia();
  }, [fetchAsistencia]);

  // Manejar cambio en el select de un alumno
  const handleStatusChange = (alumnoId, nuevoEstatus) => {
    setAsistenciaChanges((prev) => ({
      ...prev,
      [alumnoId]: nuevoEstatus,
    }));
  };

  // Guardar todos los cambios
  const handleGuardarAsistencia = async () => {
    setIsSaving(true);
    try {
      await api.post(`/docente/aula-virtual/sesion/${sesionId}/asistencia`, {
        asistencias: asistenciaChanges,
      });
      alert("Asistencia guardada con éxito.");
      // Opcional: Recargar datos después de guardar
      fetchAsistencia();
    } catch (error) {
      console.error("Error al guardar asistencia", error);
      alert("Error al guardar. Inténtalo de nuevo.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <p>Cargando lista de asistencia...</p>;
  if (!sesion) return <p>Sesión no encontrada.</p>;

  return (
    <div>
      <Link
        to={`/docente/grupo/${grupoId}/asignatura/${asignaturaId}/aula`}
        className="flex items-center text-principal mb-6 hover:underline"
      >
        <ArrowLeft size={18} className="mr-2" />
        Volver al Aula Virtual
      </Link>
      <h2 className="text-3xl font-bold text-gray-800 mb-2">
        Registro de Asistencia
      </h2>
      <p className="text-lg text-secundario mb-6">
        Fecha:{" "}
        {(() => {
          const parts = sesion.fecha_sesion.split("-");
          const fecha = new Date(
            parseInt(parts[0]),
            parseInt(parts[1]) - 1,
            parseInt(parts[2]),
          );
          return fecha.toLocaleDateString();
        })()}{" "}
      </p>

      <div className="bg-white p-6 rounded-lg shadow overflow-x-auto">
        <h3 className="text-xl font-bold mb-4">Lista de Alumnos</h3>
        <table className="w-full table-auto text-sm">
          <thead className="text-left bg-gray-50">
            <tr>
              <th className="px-4 py-2">Alumno</th>
              <th className="px-4 py-2 w-48">Estatus de Asistencia</th>
            </tr>
          </thead>
          <tbody>
            {alumnos.map((alumno) => (
              <tr key={alumno.alumno_id} className="border-b">
                <td className="px-4 py-2 font-medium">
                  {alumno.nombre} {alumno.apellido_paterno}{" "}
                  {alumno.apellido_materno || ""}
                </td>
                <td className="px-4 py-2">
                  <select
                    value={asistenciaChanges[alumno.alumno_id] || "ausente"}
                    onChange={(e) =>
                      handleStatusChange(alumno.alumno_id, e.target.value)
                    }
                    className={`w-full px-3 py-1 border rounded-md ${
                      asistenciaChanges[alumno.alumno_id] === "presente"
                        ? "bg-green-50 border-green-300"
                        : asistenciaChanges[alumno.alumno_id] === "justificado"
                          ? "bg-yellow-50 border-yellow-300"
                          : "bg-red-50 border-red-300"
                    }`}
                  >
                    <option value="presente">Presente</option>
                    <option value="ausente">Ausente</option>
                    <option value="justificado">Justificado</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-end mt-6">
          <button
            onClick={handleGuardarAsistencia}
            disabled={isSaving}
            className="flex items-center px-6 py-2 font-semibold text-white bg-principal rounded-md hover:opacity-90 disabled:bg-gray-400"
          >
            <Save size={18} className="mr-2" />
            {isSaving ? "Guardando..." : "Guardar Asistencia"}
          </button>
        </div>
      </div>
    </div>
  );
};
// --- TERMINA NUEVO CÓDIGO ---

// --- INICIA NUEVO CÓDIGO (AGREGAR) ---

// --- MI PERFIL PAGE (DISEÑO CLEAN, DATOS COMPLETOS) ---
const MiPerfilPage = () => {
  const { user, updateProfilePic } = useAuth();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    nombre: "",
    apellido_paterno: "",
    apellido_materno: "",
    email: "",
    telefono: "",
    genero: "",
    fecha_nacimiento: "",
    curp: "",
    matricula: "",
    rol: "",
    nombre_carrera: "",
    nombre_sede: "",
    nombre_grupo: "",
  });

  const [passData, setPassData] = useState({
    currentPassword: "",
    newPassword: "",
  });

  useEffect(() => {
    const cargarPerfil = async () => {
      try {
        const { data } = await api.get("/mi-perfil");
        setFormData({
          nombre: data.nombre || "",
          apellido_paterno: data.apellido_paterno || "",
          apellido_materno: data.apellido_materno || "",
          email: data.email || "",
          telefono: data.telefono || "",
          genero: data.genero || "",
          fecha_nacimiento: data.fecha_nacimiento || "",
          curp: data.curp || "",
          matricula: data.matricula || "",
          rol: data.rol || "",
          nombre_carrera: data.nombre_carrera || "No asignada",
          nombre_sede: data.nombre_sede || "No asignada",
          nombre_grupo: data.nombre_grupo || "Sin grupo",
        });
      } catch (e) {
        console.error(e);
      }
    };
    cargarPerfil();
  }, [user]);

  const handleUpdateInfo = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put("/auth/perfil", formData);
      alert("Información actualizada correctamente");
    } catch (error) {
      alert("Error al actualizar");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    try {
      await api.put("/auth/cambiar-password", passData);
      alert("Contraseña modificada con éxito");
      setPassData({ currentPassword: "", newPassword: "" });
    } catch (error) {
      alert(error.response?.data?.message || "Error");
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const data = new FormData();
    data.append("foto", file);
    try {
      const res = await api.post("/mi-perfil/foto", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (updateProfilePic) updateProfilePic(res.data.foto_perfil);
      alert("Foto actualizada");
    } catch (error) {
      alert("Error al subir imagen");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 max-w-7xl mx-auto pb-10">
      {/* HEADER */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <h1 className="text-3xl font-bold text-gray-800 tracking-tight">
          Mi Perfil Institucional
        </h1>
        <p className="text-gray-500 mt-2 text-lg">
          Consulta y actualiza tus datos personales.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* COLUMNA 1: FOTO Y RESUMEN */}
        <div
          id="tour-perfil-foto"
          className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center h-fit"
        >
          <div className="relative group mb-6">
            <div className="w-48 h-48 rounded-full p-1 border-4 border-[#bb9a5a] overflow-hidden bg-gray-100 shadow-xl">
              {user?.foto_perfil ? (
                <img
                  src={`https://api-universidad-c5o8.onrender.com/uploads/perfiles/${user.foto_perfil}`}
                  className="w-full h-full object-cover"
                  alt="Perfil"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-5xl font-bold text-[#bb9a5a] bg-orange-50">
                  {user?.nombre?.charAt(0)}
                </div>
              )}
            </div>
            <label className="absolute bottom-2 right-4 bg-[#a72a34] text-white p-3 rounded-full shadow-lg cursor-pointer hover:bg-[#802028] transition-transform hover:scale-110 border-4 border-white">
              <Camera size={22} />
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
              />
            </label>
          </div>

          <h2 className="text-2xl font-bold text-gray-900">
            {formData.nombre} {formData.apellido_paterno}
          </h2>
          <p className="text-gray-500 font-medium mb-4">
            {formData.apellido_materno}
          </p>

          <div className="w-full space-y-3 pt-4 border-t border-gray-100">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500 font-bold">Rol:</span>
              <span className="bg-[#bb9a5a]/10 text-[#bb9a5a] px-3 py-1 rounded-full font-bold uppercase text-xs">
                {formData.rol}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500 font-bold">Matrícula:</span>
              <span className="font-mono text-gray-800 bg-gray-50 px-2 py-1 rounded">
                {formData.matricula || "N/A"}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500 font-bold">CURP:</span>
              <span className="font-mono text-gray-800 text-xs">
                {formData.curp || "N/A"}
              </span>
            </div>
          </div>
        </div>

        {/* COLUMNA 2 Y 3: INFORMACIÓN DETALLADA */}
        <div className="lg:col-span-2 space-y-8">
          {/* 1. DATOS ACADÉMICOS (SOLO LECTURA) */}
          <div
            id="tour-perfil-academico"
            className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-2 h-full bg-[#bb9a5a]"></div>
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <GraduationCap className="text-[#bb9a5a]" /> Información Académica
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                  Carrera / Programa
                </label>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-gray-700 font-medium">
                  {formData.nombre_carrera}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                  Sede / Campus
                </label>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-gray-700 font-medium">
                  {formData.nombre_sede}
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                  Grupo Actual
                </label>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-gray-700 font-medium flex items-center gap-2">
                  <Users size={18} className="text-gray-400" />
                  {formData.nombre_grupo}
                </div>
              </div>
            </div>
          </div>

          {/* 2. DATOS DE CONTACTO (EDITABLES) */}
          <div
            id="tour-perfil-contacto"
            className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100"
          >
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <User className="text-[#a72a34]" /> Datos de Contacto
            </h3>
            <form
              onSubmit={handleUpdateInfo}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              <div className="col-span-2 md:col-span-1">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-3 top-3.5 text-gray-400"
                    size={18}
                  />
                  <input
                    type="email"
                    disabled
                    className="w-full pl-10 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a72a34]"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Teléfono Móvil
                </label>
                <div className="relative">
                  <Phone
                    className="absolute left-3 top-3.5 text-gray-400"
                    size={18}
                  />
                  <input
                    type="tel"
                    className="w-full pl-10 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a72a34]"
                    value={formData.telefono}
                    onChange={(e) =>
                      setFormData({ ...formData, telefono: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Fecha de Nacimiento
                </label>
                <input
                  type="date"
                  disabled
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a72a34]"
                  value={formData.fecha_nacimiento}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      fecha_nacimiento: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">
                  Género
                </label>
                <input
                  type="text"
                  disabled
                  className="w-full p-4 bg-gray-100 border border-gray-200 rounded-xl text-gray-500 font-medium cursor-not-allowed select-none"
                  value={(() => {
                    const valorBD = formData?.genero;

                    if (!valorBD) return "No especificado";

                    const normalizado = String(valorBD).toUpperCase();
                    const traducciones = {
                      H: "Masculino",
                      F: "Femenino",
                      M: "Femenino" /* Por si guardaste M de Mujer en la BD */,
                      MASCULINO: "Masculino",
                      FEMENINO: "Femenino",
                      O: "Otro",
                    };
                    return traducciones[normalizado] || valorBD;
                  })()}
                />
              </div>
              <div className="col-span-full pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-[#a72a34] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#802028] shadow-lg flex items-center gap-2 transition-transform active:scale-95 disabled:opacity-50"
                >
                  <Save size={18} />{" "}
                  {loading ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>

          {/* 3. SEGURIDAD (SIN RECUPERACIÓN AUTOMÁTICA) */}
          <div
            id="tour-perfil-seguridad"
            className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100"
          >
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Lock className="text-gray-600" /> Seguridad
            </h3>
            <div className="flex flex-col md:flex-row gap-8">
              <form
                onSubmit={handleChangePassword}
                className="flex-1 space-y-4"
              >
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Contraseña Actual
                  </label>
                  <input
                    type="password"
                    placeholder="********"
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a72a34]"
                    value={passData.currentPassword}
                    onChange={(e) =>
                      setPassData({
                        ...passData,
                        currentPassword: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Nueva Contraseña
                  </label>
                  <input
                    type="password"
                    placeholder="Nueva clave segura"
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a72a34]"
                    value={passData.newPassword}
                    onChange={(e) =>
                      setPassData({ ...passData, newPassword: e.target.value })
                    }
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-gray-800 text-white py-3 rounded-xl font-bold hover:bg-black transition-colors"
                >
                  Actualizar Contraseña
                </button>
              </form>

              {/* MENSAJE INFORMATIVO */}
              <div className="md:w-1/3 flex flex-col justify-center items-center border-l border-gray-100 pl-8 text-center">
                <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-3">
                  <Lock className="text-[#a72a34]" size={24} />
                </div>
                <p className="text-sm font-bold text-gray-800 mb-2">
                  ¿Olvidaste tu contraseña?
                </p>
                <p className="text-xs text-gray-500">
                  Por seguridad, el restablecimiento de contraseñas se realiza
                  manualmente.
                </p>
                <p className="text-xs text-[#a72a34] font-bold mt-2">
                  Contacta directamente al Administrador.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- TERMINA NUEVO CÓDIGO ---

// --- COMPONENTE ANUNCIOS GLOBALES (ADMIN) ---
const AnunciosAdminPage = () => {
  const [anuncios, setAnuncios] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    titulo: "",
    mensaje: "",
    dirigido_a: "todos",
  });

  const fetchAnuncios = async () => {
    try {
      const { data } = await api.get("/admin/anuncios");
      setAnuncios(data);
    } catch (error) {
      console.error("Error al cargar anuncios", error);
    }
  };

  useEffect(() => {
    fetchAnuncios();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/admin/anuncios", form);
      setShowModal(false);
      setForm({ titulo: "", mensaje: "", dirigido_a: "todos" });
      fetchAnuncios();
    } catch (error) {
      alert("Error al publicar el anuncio.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Borrar anuncio?")) {
      try {
        await api.delete(`/admin/anuncios/${id}`);
        fetchAnuncios();
      } catch (error) {
        alert("Error al borrar.");
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-5xl mx-auto">
      <div className="flex justify-between items-center bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <div className="p-3 bg-[#a72a34] text-white rounded-xl shadow-lg shadow-red-900/20">
              <Megaphone size={28} />
            </div>
            Tablero de Avisos
          </h2>
          <p className="text-gray-500 mt-2 text-lg ml-16">
            Publica comunicados para alumnos, docentes o toda la escuela.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-[#a72a34] text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-[#802028] shadow-lg transition-transform active:scale-95"
        >
          <Plus size={20} /> Nuevo Aviso
        </button>
      </div>

      <div className="grid gap-4">
        {anuncios.length === 0 ? (
          <div className="text-center py-10 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
            No hay anuncios publicados.
          </div>
        ) : (
          anuncios.map((a) => (
            <div
              key={a.id}
              className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-start hover:shadow-md transition-shadow"
            >
              <div>
                <span
                  className={`text-[10px] font-black uppercase px-3 py-1 rounded-full tracking-wider mb-3 inline-block ${a.dirigido_a === "todos" ? "bg-purple-100 text-purple-700" : a.dirigido_a === "alumnos" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}
                >
                  Para: {a.dirigido_a}
                </span>
                <h3 className="font-bold text-xl text-gray-800">{a.titulo}</h3>
                <p className="text-gray-600 mt-2 whitespace-pre-wrap">
                  {a.mensaje}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-400 mt-4 font-medium">
                  <Clock size={14} /> Publicado por {a.nombre} el{" "}
                  {new Date(a.fecha_creacion).toLocaleString()}
                </div>
              </div>
              <button
                onClick={() => handleDelete(a.id)}
                className="text-gray-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
              >
                <Trash2 size={20} />
              </button>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4 z-50 animate-in zoom-in duration-200">
          <form
            onSubmit={handleSubmit}
            className="bg-white p-6 rounded-2xl w-full max-w-md space-y-5 shadow-2xl"
          >
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <h3 className="text-xl font-bold text-gray-800">Crear Anuncio</h3>
              <button type="button" onClick={() => setShowModal(false)}>
                <X className="text-gray-400 hover:text-gray-700" />
              </button>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Título del Aviso
              </label>
              <input
                required
                placeholder="Ej. Suspensión de labores"
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a72a34] outline-none"
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Mensaje
              </label>
              <textarea
                required
                rows="4"
                placeholder="Escribe los detalles aquí..."
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a72a34] outline-none"
                value={form.mensaje}
                onChange={(e) => setForm({ ...form, mensaje: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Público Objetivo
              </label>
              <select
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a72a34] outline-none bg-white"
                value={form.dirigido_a}
                onChange={(e) =>
                  setForm({ ...form, dirigido_a: e.target.value })
                }
              >
                <option value="todos">
                  Toda la Escuela (Alumnos y Docentes)
                </option>
                <option value="alumnos">Solo Alumnos</option>
                <option value="docentes">Solo Docentes</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-5 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-3 bg-[#a72a34] text-white rounded-xl font-bold shadow-lg hover:bg-[#802028] transition-colors flex items-center gap-2"
              >
                <Send size={18} /> Publicar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

const EquiposDocenteView = ({ grupoId, asignaturaId }) => {
  const [equipos, setEquipos] = useState([]);
  const [cantidad, setCantidad] = useState(2);
  const [loading, setLoading] = useState(true);

  const fetchEquipos = useCallback(async () => {
    setLoading(true);
    const { data } = await api.get(
      `/docente/aula-virtual/${grupoId}/${asignaturaId}/equipos`,
    );
    setEquipos(data);
    setLoading(false);
  }, [asignaturaId, grupoId]);

  useEffect(() => {
    fetchEquipos();
  }, [fetchEquipos]);

  const generarEquipos = async () => {
    if (
      !window.confirm(
        `¿Dividir al grupo en ${cantidad} equipos aleatorios? Esto borrará los equipos anteriores.`,
      )
    )
      return;
    try {
      await api.post(
        `/docente/aula-virtual/${grupoId}/${asignaturaId}/generar-equipos`,
        { cantidad_equipos: cantidad },
      );
      fetchEquipos();
    } catch (e) {
      alert("Error al crear salas");
    }
  };

  const borrarEquipos = async () => {
    if (
      !window.confirm(
        "¿Cerrar todas las salas de trabajo y regresar al grupo principal?",
      )
    )
      return;
    try {
      await api.delete(
        `/docente/aula-virtual/${grupoId}/${asignaturaId}/borrar-equipos`,
      );
      fetchEquipos();
    } catch (e) {
      alert("Error");
    }
  };

  if (loading) return <p>Cargando salas...</p>;

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h3 className="text-xl font-bold text-blue-900">
            Salas de Trabajo (Breakout Rooms)
          </h3>
          <p className="text-blue-700 text-sm">
            Divida a sus alumnos en pequeños grupos para dinámicas. El sistema
            creará una sala de video privada para cada equipo.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min="2"
            max="10"
            className="w-20 p-2 border rounded-xl text-center font-bold"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            title="Cantidad de equipos"
          />
          <button
            onClick={generarEquipos}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700 flex items-center gap-2 shadow-lg"
          >
            <Users size={18} /> Crear Equipos
          </button>
          {equipos.length > 0 && (
            <button
              onClick={borrarEquipos}
              className="bg-red-100 text-red-600 px-4 py-2 rounded-xl font-bold hover:bg-red-200"
            >
              Cerrar Salas
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {equipos.map((eq) => (
          <div
            key={eq.id}
            className="bg-white border-2 border-gray-200 p-5 rounded-2xl shadow-sm"
          >
            <div className="flex justify-between items-center border-b pb-3 mb-3">
              <h4 className="font-black text-lg text-gray-800">
                {eq.nombre_equipo}
              </h4>
              <a
                href={eq.enlace_sala}
                target="_blank"
                rel="noreferrer"
                className="bg-green-100 text-green-700 px-4 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-green-200 transition-colors"
              >
                <Video size={16} /> Supervisar Sala
              </a>
            </div>
            <div className="flex flex-wrap gap-2">
              {eq.alumnos.map((al) => (
                <span
                  key={al.id}
                  className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full font-medium"
                >
                  {al.nombre} {al.apellido_paterno}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const EquiposAlumnoView = ({ grupoId, asignaturaId }) => {
  const [miEquipo, setMiEquipo] = useState(null);

  useEffect(() => {
    api
      .get(`/alumno/aula-virtual/${grupoId}/${asignaturaId}/mi-equipo`)
      .then((res) => setMiEquipo(res.data))
      .catch((err) => console.log(err));
  }, [asignaturaId, grupoId]);

  if (!miEquipo) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
        <Users size={48} className="mx-auto text-gray-300 mb-4" />
        <h3 className="text-xl font-bold text-gray-700">Sin equipo asignado</h3>
        <p className="text-gray-500 mt-2">
          Actualmente no estás asignado a ninguna sala de trabajo.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-teal-500 to-emerald-500 p-8 rounded-3xl shadow-xl text-center text-white max-w-xl mx-auto transform hover:scale-105 transition-transform duration-300">
      <Users size={64} className="mx-auto text-white/80 mb-4" />
      <h2 className="text-3xl font-black mb-2">
        ¡Tienes una actividad en equipo!
      </h2>
      <p className="text-lg text-teal-50 mb-8">
        El profesor te ha asignado a la{" "}
        <strong>{miEquipo.nombre_equipo}</strong>.
      </p>

      <a
        href={miEquipo.enlace_sala}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-3 bg-white text-teal-700 px-8 py-4 rounded-full font-black text-xl shadow-lg hover:shadow-2xl transition-all"
      >
        <Video size={24} className="text-teal-500" />
        Entrar a mi Sala de Equipo
      </a>
      <p className="text-xs text-teal-100 mt-4">
        Haz clic para abrir tu videollamada privada con tu equipo.
      </p>
    </div>
  );
};

// --- NUEVO COMPONENTE: HISTORIAL DE CALIFICACIONES (ALUMNO) ---
const MisCalificacionesPage = () => {
  const [calificaciones, setCalificaciones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCalificaciones = async () => {
      try {
        const { data } = await api.get("/alumno/mis-calificaciones");
        setCalificaciones(data);
      } catch (error) {
        console.error("Error al obtener calificaciones:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCalificaciones();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-300 max-w-7xl mx-auto p-4 md:p-0">
      {/* HEADER */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <h1 className="text-3xl font-bold text-gray-800 tracking-tight flex items-center gap-3">
          <div className="p-3 bg-[#a72a34] text-white rounded-xl shadow-lg shadow-red-900/20">
            <Award size={28} />
          </div>
          Historial Académico
        </h1>
        <p className="text-gray-500 mt-2 text-lg ml-16">
          Consulta tus calificaciones finales por asignatura y ciclo escolar.
        </p>
      </div>

      {/* TABLA DE CALIFICACIONES */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-400">
            Cargando tu historial...
          </div>
        ) : calificaciones.length === 0 ? (
          <div className="p-16 text-center">
            <BookOpen size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">
              Aún no tienes calificaciones finales registradas.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-bold border-b border-gray-100">
                <tr>
                  <th className="p-5">Asignatura</th>
                  <th className="p-5">Grupo</th>
                  <th className="p-5">Ciclo Escolar</th>
                  <th className="p-5 text-center">Calificación Final</th>
                  <th className="p-5 text-center">Estatus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {calificaciones.map((item, index) => (
                  <tr
                    key={index}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="p-5">
                      <p className="font-bold text-gray-800">
                        {item.nombre_asignatura}
                      </p>
                      <p className="text-xs text-gray-400 font-mono mt-1">
                        Clave: {item.clave_asignatura}
                      </p>
                    </td>
                    <td className="p-5 text-gray-600 font-medium">
                      {item.nombre_grupo}
                    </td>
                    <td className="p-5 text-gray-600">
                      {item.nombre_ciclo || "Sin ciclo"}
                    </td>
                    <td className="p-5 text-center">
                      <span className="text-2xl font-black text-gray-800">
                        {item.calificacion}
                      </span>
                    </td>
                    <td className="p-5 text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          item.calificacion >= 70
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {item.calificacion >= 70 ? "Aprobado" : "Reprobado"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// --- ERROR BOUNDARY GLOBAL ---
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("Error no capturado:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen flex-col items-center justify-center bg-gray-100 p-8">
          <div className="max-w-md rounded-xl bg-white p-8 shadow-lg text-center">
            <AlertCircle className="mx-auto mb-4 h-16 w-16 text-red-500" />
            <h1 className="mb-2 text-2xl font-bold text-gray-800">Algo salió mal</h1>
            <p className="mb-6 text-gray-600">
              Ocurrió un error inesperado. Intenta recargar la página.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-[#a72a34] px-6 py-2 text-white font-semibold hover:bg-[#8a222b] transition-colors"
            >
              Recargar página
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- COMPONENTE PRINCIPAL DE LA APP ---
function App() {
  return (
    <ErrorBoundary>
    <BrowserRouter basename="/plataforma">
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/registro" element={<RegistroPage />} />
          <Route path="/registro_docentes" element={<RegistroDocentePage />} />
          <Route
            path="/registro_control_escolar"
            element={<RegistroControlEscolarPage />}
          />
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
          <Route
            element={
              <ProtectedRoute allowedRoles={["admin", "control_escolar"]} />
            }
          >
            <Route element={<AdminLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/admin/anuncios" element={<AnunciosAdminPage />} />
              <Route path="/admin/biblioteca" element={<BibliotecaPage />} />
              <Route path="/usuarios" element={<UsuariosPage />} />
              <Route
                path="/usuarios/aspirante/:id"
                element={<DetalleAspirantePage />}
              />
              <Route path="/admin/aspirantes/revision" element={<RevisionAspirantesPage />} />
              <Route path="/admin/calendario" element={<CalendarioAdmin />} />
              <Route path="/admin/correo" element={<CorreoPage />} />
              <Route path="/admin/correos-institucionales" element={<CorreosInstitucionalesPage />} />
              <Route path="/grupos" element={<GruposPage />} />
              <Route path="/grupos/:id" element={<DetalleGrupoPage />} />
              <Route path="/admin/migracion" element={<MigracionPage />} />
              <Route path="/migrar-grupos" element={<MigracionGruposPage />} />
              <Route path="/admin/finanzas" element={<CajaPage />} />
              <Route
                path="/admin/finanzas/alumno/:id"
                element={<DetalleFinanzasAlumnoPage />}
              />
              <Route
                path="/admin/solicitudes"
                element={<GestionSolicitudesPage />}
              />
              <Route path="/admin/drive" element={<MiDrivePage />} />
              <Route path="/mi-perfil" element={<MiPerfilPage />} />

              {/* Anidamos una protección EXTRA para las rutas EXCLUSIVAS del Admin supremo */}
              <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
                <Route path="/ciclos" element={<CiclosPage />} />
                <Route path="/planes-estudio" element={<PlanesEstudioPage />} />
                <Route path="/grados" element={<GradosPage />} />
                <Route path="/carreras" element={<CarrerasPage />} />
                <Route path="/sedes" element={<SedesPage />} />
                <Route path="/conceptos-pago" element={<ConceptosPagoPage />} />
                <Route path="/asignaturas" element={<AsignaturasPage />} />
                <Route
                  path="/admin/archivos"
                  element={<ExploradorArchivos />}
                />
                <Route
                  path="/admin/grupos/:grupoId/asignatura/:asignaturaId/calificaciones"
                  element={<SubirCalificacionesPage />}
                />
                <Route
                  path="/admin/grupo/:grupoId/asignatura/:asignaturaId"
                  element={<AdminCalificarPage />}
                />
              </Route>
            </Route>
          </Route>
          {/* Rutas de Docente */}
          <Route element={<ProtectedRoute allowedRoles={["docente"]} />}>
            <Route element={<DocenteLayout />}>
              <Route
                path="/docente/dashboard"
                element={<DocenteDashboardPage />}
              />
              <Route path="/docente/correo" element={<CorreoPage />} />
              <Route path="/docente/mi-nube" element={<MiDrivePage />} />
              <Route path="/docente/biblioteca" element={<BibliotecaPage />} />
              <Route path="/docente/mi-perfil" element={<MiPerfilPage />} />
              <Route
                path="/docente/calendario"
                element={<CalendarioAlumno />}
              />

              <Route
                path="/docente/grupo/:grupoId/asignatura/:asignaturaId"
                element={<DetalleCursoDocentePage />}
              />
              <Route
                path="/docente/grupo/:grupoId/asignatura/:asignaturaId/aula"
                element={<AulaVirtualPage />}
              />
              <Route
                path="/docente/grupo/:grupoId/asignatura/:asignaturaId/muro"
                element={<MuroDocentePage />}
              />
              <Route
                path="/docente/grupo/:grupoId/asignatura/:asignaturaId/analiticas"
                element={<AnaliticasGrupoPage />}
              />

              <Route
                path="/docente/grupo/:grupoId/asignatura/:asignaturaId/tarea/:tareaId"
                element={<DetalleTareaDocentePage />}
              />
              <Route
                path="/docente/grupo/:grupoId/asignatura/:asignaturaId/asistencia/:sesionId"
                element={<AsistenciaPage />}
              />
              <Route
                path="/docente/grupo/:grupoId/asignatura/:asignaturaId/foro/hilo/:hiloId"
                element={<HiloPage />}
              />

              <Route
                path="/docente/grupo/:grupoId/asignatura/:asignaturaId/examen/crear"
                element={<CrearExamenPage />}
              />
              <Route
                path="/docente/grupo/:grupoId/asignatura/:asignaturaId/examen/editar/:examenId"
                element={<EditarExamenPage />}
              />
              <Route
                path="/docente/grupo/:grupoId/asignatura/:asignaturaId/examen/:examenId/resultados"
                element={<ResultadosExamenPage />}
              />
              <Route
                path="/docente/examen/revisar/:intentoId"
                element={<RevisarExamenPage />}
              />
            </Route>
            <Route
              path="/docente/clase-en-vivo/:salaName"
              element={<ClaseEnVivoPage />}
            />
          </Route>

          {/* Rutas de Alumno */}
          <Route element={<ProtectedRoute allowedRoles={["alumno"]} />}>
            <Route element={<AlumnoLayout />}>
              <Route
                path="/alumno/dashboard"
                element={<AlumnoDashboardPage />}
              />
              <Route
                path="/alumno/mis-calificaciones"
                element={<MisCalificacionesPage />}
              />
              <Route path="/alumno/biblioteca" element={<BibliotecaPage />} />
              <Route path="/alumno/mi-nube" element={<MiDrivePage />} />
              <Route
                path="/alumno/grupo/:grupoId/asignatura/:asignaturaId/aula"
                element={<AulaVirtualPage />}
              />
              <Route path="/alumno/mis-pagos" element={<MisPagosPage />} />
              <Route
                path="/alumno/mis-solicitudes"
                element={<MisSolicitudesPage />}
              />
              <Route path="/alumno/pizarra" element={<PizarraPage />} />
              <Route
                path="/alumno/examen/:examenId/resolver"
                element={<TomarExamenPage />}
              />
              <Route path="/alumno/mi-perfil" element={<MiPerfilPage />} />
              <Route path="/alumno/correo" element={<CorreoPage />} />
              <Route
                path="/alumno/grupo/:grupoId/asignatura/:asignaturaId/foro/hilo/:hiloId"
                element={<HiloPage />}
              />
              <Route path="/alumno/calendario" element={<CalendarioAlumno />} />

              <Route
                path="/docente/grupo/:grupoId/asignatura/:asignaturaId/muro"
                element={<MuroDocentePage />}
              />
              <Route
                path="/alumno/clase-en-vivo/:salaName"
                element={<ClaseEnVivoPage />}
              />
              <Route
                path="/docente/grupo/:grupoId/asignatura/:asignaturaId/examen/crear"
                element={<CrearExamenPage />}
              />
              <Route
                path="/docente/grupo/:grupoId/asignatura/:asignaturaId/examen/editar/:examenId"
                element={<EditarExamenPage />}
              />
              <Route
                path="/docente/grupo/:grupoId/asignatura/:asignaturaId/analiticas"
                element={<AnaliticasGrupoPage />}
              />
            </Route>
            <Route
              path="/alumno/clase-en-vivo/:salaName"
              element={<ClaseEnVivoPage />}
            />
          </Route>

          {/* Rutas de Aspirante */}
          <Route element={<ProtectedRoute allowedRoles={["aspirante"]} />}>
            <Route element={<AspiranteLayout />}>
              <Route
                path="/aspirante/dashboard"
                element={<AspiranteDashboardPage />}
              />
              <Route path="/aspirante/mi-perfil" element={<MiPerfilPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
