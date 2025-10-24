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

// --- COMPONENTES DE LA INTERFAZ ---

const ProtectedRoute = ({ allowedRoles }) => {
  // 1. Obtenemos la función "logout"
  const { user, loading, logout } = useAuth();
  const location = useLocation();

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

  // 2. Esta es la lógica modificada
  if (!allowedRoles.includes(user.rol)) {
    // Si el rol en localStorage no coincide con la ruta
    // (ej. un admin en ruta de alumno), la sesión es inválida.
    // Forzamos el cierre de sesión.
    logout();

    // Mostramos null mientras el logout redirige al login
    return null;
  }

  return <Outlet />;
};

// --- LAYOUTS ---
const AdminLayout = () => {
  const { logout } = useAuth();
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
        <header className="bg-white shadow-sm p-4">
          <h1 className="text-2xl font-semibold text-gray-800">
            Panel de Administrador
          </h1>
        </header>
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

const DocenteLayout = () => {
  const { logout } = useAuth();
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
        <header className="bg-white shadow-sm p-4">
          <h1 className="text-2xl font-semibold text-gray-800">
            Portal Docente
          </h1>
        </header>
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

const AlumnoLayout = () => {
  const { logout } = useAuth();
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
        <header className="bg-white shadow-sm p-4">
          <h1 className="text-2xl font-semibold text-gray-800">
            Portal del Alumno
          </h1>
        </header>
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

const AspiranteLayout = () => {
  const { logout } = useAuth();
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
        <header className="bg-white shadow-sm p-4">
          <h1 className="text-2xl font-semibold text-gray-800">
            Portal del Aspirante
          </h1>
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
                `/docente/grupo/${curso.grupo_id}/asignatura/${curso.asignatura_id}`
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

  // --- NUEVA FUNCIÓN "GUARDAR TODO" ---
  const handleGuardarTodo = async () => {
    setIsSaving(true);
    // 1. Convertir el objeto de estado en el array que espera la API
    const calificacionesArray = Object.keys(calificaciones).map((alumnoId) => ({
      alumno_id: parseInt(alumnoId),
      calificacion:
        calificaciones[alumnoId] === "" ? null : calificaciones[alumnoId],
    }));

    try {
      // 2. Usar el NUEVO endpoint de "Guardar Todo"
      await api.post("/calificar-grupo-completo", {
        asignatura_id: asignaturaId,
        calificaciones: calificacionesArray,
      });
      alert("Calificaciones guardadas con éxito.");
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

  // --- NUEVA FUNCIÓN "GUARDAR TODO" ---
  const handleGuardarTodo = async () => {
    setIsSaving(true);
    // 1. Convertir el objeto de estado en el array que espera la API
    const calificacionesArray = Object.keys(calificaciones).map((alumnoId) => ({
      alumno_id: parseInt(alumnoId),
      calificacion:
        calificaciones[alumnoId] === "" ? null : calificaciones[alumnoId],
    }));

    try {
      // 2. Usar el NUEVO endpoint de "Guardar Todo"
      await api.post("/calificar-grupo-completo", {
        asignatura_id: asignaturaId,
        calificaciones: calificacionesArray,
      });
      alert("Calificaciones guardadas con éxito.");
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
                    <td className="px-4 py-2">{asig.nombre_asignatura}</td>
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
        <table className="w-full table-auto">{/* ... */}</table>
      </div>
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
            </Route>
          </Route>

          {/* Rutas de Aspirante */}
          <Route element={<ProtectedRoute allowedRoles={["aspirante"]} />}>
            <Route element={<AspiranteLayout />}>
              <Route
                path="/aspirante/dashboard"
                element={<AspiranteDashboardPage />}
              />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
