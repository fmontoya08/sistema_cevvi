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
  const { user, loading } = useAuth();
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

  if (!allowedRoles.includes(user.rol)) {
    return <Navigate to="/unauthorized" replace />;
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
    { icon: Book, label: "Asignaturas", path: "/asignaturas" },
    { icon: Group, label: "Grupos", path: "/grupos" },
    { icon: GraduationCap, label: "Carreras", path: "/carreras" },
    { icon: Building, label: "Sedes", path: "/sedes" },
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

  const fetchUsuarios = useCallback(async () => {
    try {
      const response = await api.get("/usuarios");
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
        await api.delete(`/usuarios/${id}`);
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
      <div className="bg-white p-6 rounded-lg shadow">
        <table className="w-full table-auto">
          <thead className="text-left bg-gray-50">
            <tr>
              <th className="px-4 py-2">Nombre Completo</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Rol</th>
              <th className="px-4 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((user) => (
              <tr key={user.id} className="border-b">
                <td className="px-4 py-2">{`${user.nombre} ${user.apellido_paterno}`}</td>
                <td className="px-4 py-2">{user.email}</td>
                <td className="px-4 py-2 capitalize">{user.rol}</td>
                <td className="px-4 py-2 flex items-center space-x-2">
                  <button
                    onClick={() => openModal(user)}
                    className="text-secundario hover:text-principal"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(user.id)}
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
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        const dataToSend = { ...formData };
        if (!dataToSend.password) {
          delete dataToSend.password;
        }
        await api.put(`/usuarios/${usuario.id}`, dataToSend);
      } else {
        await api.post("/usuarios", formData);
      }
      onSave();
      onClose();
    } catch (error) {
      console.error("Error al guardar usuario", error);
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
          </div>
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
      const response = await api.get("/asignaturas");
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
        await api.delete(`/asignaturas/${id}`);
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
    plan_estudio_id: asignatura?.plan_estudio_id || 1,
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
      const response = await api.get("/grupos");
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
        await api.delete(`/grupos/${id}`);
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
          api.get("/ciclos"),
          api.get("/sedes"),
          api.get("/planes-estudio"),
          api.get("/grados"),
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
        await api.put(`/grupos/${grupo.id}`, formData);
      } else {
        await api.post("/grupos", formData);
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

  const fetchDetalles = useCallback(async () => {
    try {
      const { data } = await api.get(`/grupos/${id}`);
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
        await api.delete(`/grupos/${id}/dar-baja/${alumnoId}`);
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

      <div className="bg-white p-6 rounded-lg shadow mt-6">
        <h3 className="text-xl font-bold mb-4">Asignaturas y Docentes</h3>
        <table className="w-full table-auto">
          <thead className="text-left bg-gray-50">
            <tr>
              <th className="px-4 py-2">Asignatura</th>
              <th className="px-4 py-2">Clave</th>
              <th className="px-4 py-2">Docente Asignado</th>
              <th className="px-4 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {grupo.asignaturas.map((asig) => (
              <tr key={asig.id} className="border-b">
                <td className="px-4 py-2">{asig.nombre_asignatura}</td>
                <td className="px-4 py-2">{asig.clave_asignatura}</td>
                <td className="px-4 py-2">
                  {asig.docente_id ? (
                    `${asig.docente_nombre} ${asig.docente_apellido}`
                  ) : (
                    <span className="text-gray-500">Sin asignar</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => handleOpenAsignarModal(asig)}
                    className="text-principal hover:underline"
                  >
                    {asig.docente_id ? "Cambiar Docente" : "Asignar Docente"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white p-6 rounded-lg shadow mt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">
            Alumnos Inscritos ({grupo.alumnos.length} / {grupo.cupo})
          </h3>
          <button
            onClick={() => setInscribirAlumnoModal(true)}
            className="flex items-center px-4 py-2 font-semibold text-white bg-principal rounded-md hover:opacity-90"
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
                <td className="px-4 py-2">{`${alumno.nombre} ${alumno.apellido_paterno}`}</td>
                <td className="px-4 py-2">{alumno.email}</td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => handleBajaAlumno(alumno.id)}
                    className="text-red-500 hover:underline"
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
        const { data } = await api.get("/docentes");
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
      await api.post(`/grupos/${grupoId}/asignar-docente`, {
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

const InscribirAlumnoModal = ({ grupoId, onClose, onSave }) => {
  const [aspirantes, setAspirantes] = useState([]);
  const [selectedAspirante, setSelectedAspirante] = useState("");

  useEffect(() => {
    const fetchAspirantes = async () => {
      try {
        const { data } = await api.get("/aspirantes");
        setAspirantes(data);
        if (data.length > 0) {
          setSelectedAspirante(data[0].id);
        }
      } catch (error) {
        console.error("Error al obtener aspirantes", error);
      }
    };
    fetchAspirantes();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAspirante) {
      alert("Por favor, seleccione un aspirante.");
      return;
    }
    try {
      await api.post(`/grupos/${grupoId}/inscribir-alumno`, {
        alumno_id: selectedAspirante,
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
            Seleccionar Aspirante
          </label>
          <select
            value={selectedAspirante}
            onChange={(e) => setSelectedAspirante(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
          >
            {aspirantes.length > 0 ? (
              aspirantes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre} {a.apellido_paterno}
                </option>
              ))
            ) : (
              <option disabled>No hay aspirantes disponibles</option>
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
              disabled={aspirantes.length === 0}
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
      const response = await api.get(`/${apiEndpoint}`);
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
        await api.delete(`/${apiEndpoint}/${id}`);
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
        await api.put(`/${apiEndpoint}/${item.id}`, formData);
      } else {
        await api.post(`/${apiEndpoint}`, formData);
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

const PlaceholderPage = ({ title }) => (
  <div className="bg-white p-6 rounded-lg shadow">
    <h2 className="text-xl font-bold mb-4">{title}</h2>
    <p>Módulo en construcción.</p>
  </div>
);

const DocenteDashboardPage = () => {
  const [cursos, setCursos] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCursos = async () => {
      try {
        const { data } = await api.get("/mis-cursos");
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
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm font-semibold">
                {curso.total_alumnos} Alumnos Inscritos
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const DetalleCursoDocentePage = () => {
  const { grupoId, asignaturaId } = useParams();
  const [alumnos, setAlumnos] = useState([]);
  const [cursoInfo, setCursoInfo] = useState(null);
  const [calificaciones, setCalificaciones] = useState({});

  const fetchAlumnos = useCallback(async () => {
    try {
      const { data } = await api.get(
        `/docente/grupo/${grupoId}/asignatura/${asignaturaId}/alumnos`
      );
      setAlumnos(data.alumnos);
      setCursoInfo(data.cursoInfo);
      const initialCalificaciones = data.alumnos.reduce((acc, alumno) => {
        acc[alumno.id] = alumno.calificacion || "";
        return acc;
      }, {});
      setCalificaciones(initialCalificaciones);
    } catch (error) {
      console.error("Error al cargar alumnos", error);
    }
  }, [grupoId, asignaturaId]);

  useEffect(() => {
    fetchAlumnos();
  }, [fetchAlumnos]);

  const handleCalificacionChange = (alumnoId, valor) => {
    setCalificaciones((prev) => ({ ...prev, [alumnoId]: valor }));
  };

  const handleGuardarCalificacion = async (alumnoId) => {
    const calificacion = calificaciones[alumnoId];
    try {
      await api.post(`/docente/calificar`, {
        alumno_id: alumnoId,
        asignatura_id: asignaturaId,
        calificacion: calificacion,
      });
      alert("Calificación guardada");
    } catch (error) {
      console.error("Error al guardar calificación", error);
      alert("No se pudo guardar la calificación.");
    }
  };

  if (!cursoInfo) return <p>Cargando...</p>;

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
              <th className="px-4 py-2 w-48">Calificación</th>
              <th className="px-4 py-2 w-32">Acciones</th>
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
                    value={calificaciones[alumno.id]}
                    onChange={(e) =>
                      handleCalificacionChange(alumno.id, e.target.value)
                    }
                    className="w-full px-3 py-1 border rounded-md"
                  />
                </td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => handleGuardarCalificacion(alumno.id)}
                    className="flex items-center px-3 py-1 text-sm font-semibold text-white bg-green-600 rounded-md hover:bg-green-700"
                  >
                    <Save size={14} className="mr-1" />
                    Guardar
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

const AlumnoDashboardPage = () => {
  const [miGrupo, setMiGrupo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMiGrupo = async () => {
      try {
        const { data } = await api.get("/mi-grupo");
        setMiGrupo(data);
      } catch (error) {
        console.error("Error al cargar la información del grupo", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMiGrupo();
  }, []);

  if (loading) return <p>Cargando tu información...</p>;
  if (!miGrupo) return <p>Aún no estás inscrito en ningún grupo.</p>;

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-800 mb-2">
        Grupo: {miGrupo.grupo.nombre_grupo}
      </h2>
      <p className="text-lg text-secundario mb-6">
        Ciclo Escolar: {miGrupo.grupo.nombre_ciclo}
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
            {miGrupo.asignaturas.map((asig) => (
              <tr key={asig.clave_asignatura} className="border-b">
                <td className="px-4 py-2">{asig.nombre_asignatura}</td>
                <td className="px-4 py-2">
                  {asig.docente_nombre
                    ? `${asig.docente_nombre} ${asig.docente_apellido}`
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
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/asignaturas" element={<AsignaturasPage />} />
              <Route path="/usuarios" element={<UsuariosPage />} />
              <Route path="/grupos" element={<GruposPage />} />
              <Route path="/grupos/:id" element={<DetalleGrupoPage />} />
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

          {/* Rutas de Alumno */}
          <Route element={<ProtectedRoute allowedRoles={["alumno"]} />}>
            <Route element={<AlumnoLayout />}>
              <Route
                path="/alumno/dashboard"
                element={<AlumnoDashboardPage />}
              />
            </Route>
          </Route>

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
