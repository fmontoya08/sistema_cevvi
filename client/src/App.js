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
} from "lucide-react";

// --- CONFIGURACIÓN DE AXIOS ---
// Creamos una instancia de Axios para configurar la URL base y los interceptores
const api = axios.create({
  baseURL: "http://localhost:3001/api",
});

// Interceptor para añadir el token a todas las peticiones
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
      navigate("/dashboard");
    },
    [navigate]
  );

  const logout = useCallback(() => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setUser(null);
    navigate("/login");
  }, [navigate]);

  // useMemo optimiza el valor del contexto para que no se recalcule innecesariamente
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

// Hook personalizado para usar el contexto de autenticación
const useAuth = () => {
  return useContext(AuthContext);
};

// --- COMPONENTES DE LA INTERFAZ ---

// Componente para rutas protegidas
const ProtectedRoute = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div>Cargando...</div>; // O un spinner
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user.rol !== "admin") {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />; // Renderiza los componentes hijos (el layout del admin)
};

// Layout principal del panel de administrador
const AdminLayout = () => {
  const { user, logout } = useAuth();

  const navItems = [
    { icon: Home, label: "Dashboard", path: "/dashboard" },
    { icon: Users, label: "Usuarios", path: "/usuarios" },
    { icon: Book, label: "Asignaturas", path: "/asignaturas" },
    { icon: Group, label: "Grupos", path: "/grupos" },
    { icon: GraduationCap, label: "Carreras", path: "/carreras" },
    { icon: Building, label: "Sedes", path: "/sedes" },
  ];

  const location = useLocation();

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-gray-800 text-white flex flex-col">
        <div className="h-16 flex items-center justify-center text-xl font-bold border-b border-gray-700">
          UniSystem
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.label}
              to={item.path}
              className={`flex items-center px-4 py-2 rounded-lg transition-colors duration-200 ${
                location.pathname.startsWith(item.path)
                  ? "bg-blue-600 text-white"
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
            className="w-full flex items-center px-4 py-2 rounded-lg text-gray-300 hover:bg-red-600 hover:text-white transition-colors duration-200"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="bg-white shadow-sm p-4">
          <h1 className="text-2xl font-semibold text-gray-800">
            Bienvenido, {user?.nombre || "Admin"}!
          </h1>
        </header>
        <div className="p-6">
          <Outlet /> {/* Aquí se renderizan las páginas del dashboard */}
        </div>
      </main>
    </div>
  );
};

// --- PÁGINAS DEL PANEL ---

// Página de Login
const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const response = await axios.post("http://localhost:3001/api/login", {
        email,
        password,
      });
      if (response.data.user.rol !== "admin") {
        setError("Acceso denegado. Solo los administradores pueden entrar.");
        return;
      }
      login(response.data.user, response.data.token);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Error al iniciar sesión");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h2 className="text-3xl font-bold text-center text-gray-900">
          Iniciar Sesión - Admin
        </h2>
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            className="w-full px-4 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
};

// Página principal del Dashboard
const DashboardPage = () => (
  <div className="bg-white p-6 rounded-lg shadow">
    <h2 className="text-xl font-bold mb-4">Panel de Administración</h2>
    <p>
      Selecciona un módulo en el menú de la izquierda para comenzar a gestionar
      la información de la universidad.
    </p>
  </div>
);

// Página para gestionar Asignaturas (Ejemplo CRUD completo)
const AsignaturasPage = () => {
  const [asignaturas, setAsignaturas] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentAsignatura, setCurrentAsignatura] = useState(null);

  useEffect(() => {
    fetchAsignaturas();
  }, []);

  const fetchAsignaturas = async () => {
    try {
      const response = await api.get("/asignaturas");
      setAsignaturas(response.data);
    } catch (error) {
      console.error("Error al obtener asignaturas", error);
    }
  };

  const handleDelete = async (id) => {
    if (
      window.confirm("¿Estás seguro de que quieres eliminar esta asignatura?")
    ) {
      try {
        await api.delete(`/asignaturas/${id}`);
        fetchAsignaturas(); // Recargar lista
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
          className="flex items-center px-4 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700"
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
              <th className="px-4 py-2">Créditos</th>
              <th className="px-4 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {asignaturas.map((asig) => (
              <tr key={asig.id} className="border-b">
                <td className="px-4 py-2">{asig.nombre_asignatura}</td>
                <td className="px-4 py-2">{asig.clave_asignatura}</td>
                <td className="px-4 py-2">{asig.creditos}</td>
                <td className="px-4 py-2 flex items-center space-x-2">
                  <button
                    onClick={() => openModal(asig)}
                    className="text-blue-500 hover:text-blue-700"
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

// Modal para crear/editar Asignaturas
const AsignaturaModal = ({ asignatura, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    nombre_asignatura: asignatura?.nombre_asignatura || "",
    clave_asignatura: asignatura?.clave_asignatura || "",
    creditos: asignatura?.creditos || "",
    plan_estudio_id: asignatura?.plan_estudio_id || 1, // IDs de ejemplo, esto debería venir de la API
    tipo_asignatura_id: asignatura?.tipo_asignatura_id || 1,
    grado_id: asignatura?.grado_id || 1,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (asignatura) {
        await api.put(`/asignaturas/${asignatura.id}`, formData);
      } else {
        await api.post("/asignaturas", formData);
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
        <form onSubmit={handleSubmit}>
          {/* Aquí irían los inputs del formulario. Ejemplo: */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">
              Nombre de la Asignatura
            </label>
            <input
              type="text"
              name="nombre_asignatura"
              value={formData.nombre_asignatura}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 mt-1 border rounded-md"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">
              Clave
            </label>
            <input
              type="text"
              name="clave_asignatura"
              value={formData.clave_asignatura}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 mt-1 border rounded-md"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">
              Créditos
            </label>
            <input
              type="number"
              name="creditos"
              value={formData.creditos}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 mt-1 border rounded-md"
            />
          </div>
          {/* TODO: Reemplazar inputs de ID con Selects que carguen datos de las tablas catálogo */}
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
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Placeholder para otras páginas
const PlaceholderPage = ({ title }) => (
  <div className="bg-white p-6 rounded-lg shadow">
    <h2 className="text-xl font-bold mb-4">{title}</h2>
    <p>
      Módulo en construcción. La lógica CRUD se implementaría de forma similar a
      la de Asignaturas.
    </p>
  </div>
);

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
              <div>
                <h1>Acceso Denegado</h1>
                <p>No tienes los permisos para ver esta página.</p>
              </div>
            }
          />

          {/* Rutas Protegidas bajo el Layout del Admin */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AdminLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/asignaturas" element={<AsignaturasPage />} />
              <Route
                path="/grupos"
                element={<PlaceholderPage title="Gestión de Grupos" />}
              />
              <Route
                path="/usuarios"
                element={<PlaceholderPage title="Gestión de Usuarios" />}
              />
              <Route
                path="/carreras"
                element={<PlaceholderPage title="Gestión de Carreras" />}
              />
              <Route
                path="/sedes"
                element={<PlaceholderPage title="Gestión de Sedes" />}
              />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
