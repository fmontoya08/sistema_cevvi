import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  X,
  Mail,
  RefreshCw,
  Send,
  Lock,
  Inbox,
  Trash2,
  Menu,
  Search,
  ChevronLeft,
  User,
  Paperclip,
  MoreVertical,
  Star,
  AlertCircle,
} from "lucide-react";

// --- UTILIDADES ---
const getInitials = (name) => {
  if (!name) return "?";
  // Si es un correo (contiene @), tomamos la primera letra
  if (name.includes("@")) return name.charAt(0).toUpperCase();
  // Si es un nombre, tomamos iniciales
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
};

const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
};

const CorreoPage = () => {
  // --- ESTADOS ---
  const [configurado, setConfigurado] = useState(null);
  const [passwordInput, setPasswordInput] = useState("");

  // Navegación y UI
  const [carpetaActual, setCarpetaActual] = useState("inbox");
  const [sidebarOpen, setSidebarOpen] = useState(false); // Móvil
  const [modoRedactar, setModoRedactar] = useState(false);

  // Datos
  const [correos, setCorreos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(false);

  // Lectura
  const [correoSeleccionado, setCorreoSeleccionado] = useState(null); // ID del correo en lista
  const [detalleCorreo, setDetalleCorreo] = useState(null); // Contenido completo
  const [cargandoMensaje, setCargandoMensaje] = useState(false);

  // Formulario Nuevo Correo
  const [nuevoCorreo, setNuevoCorreo] = useState({
    destinatario: "",
    asunto: "",
    mensaje: "",
  });
  const [enviando, setEnviando] = useState(false);

  const token = localStorage.getItem("token");
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
  const API_URL = "https://api-universidad-c5o8.onrender.com/api/email"; // Ojo: en prod usar tu URL real si cambia

  // --- EFECTOS ---
  useEffect(() => {
    verificarEstado();
  }, []);

  useEffect(() => {
    if (configurado) cargarCarpeta(carpetaActual);
  }, [carpetaActual, configurado]);

  // --- API CALLS ---
  const verificarEstado = async () => {
    try {
      const res = await axios.get(`${API_URL}/status`, authHeaders);
      setConfigurado(res.data.configurado);
    } catch (error) {
      console.error(error);
      // Si falla status (ej token expirado), el interceptor global debería manejarlo,
      // pero por si acaso seteamos false para mostrar login.
      setConfigurado(false);
    }
  };

  const guardarConfiguracion = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        `${API_URL}/configurar`,
        { password: passwordInput },
        authHeaders,
      );
      setConfigurado(true);
    } catch (error) {
      alert("Error al conectar. Verifica tu contraseña.");
    }
  };

  const cargarCarpeta = async (nombreCarpeta) => {
    setCargando(true);
    setCorreos([]);
    setCorreoSeleccionado(null);
    setDetalleCorreo(null);
    try {
      const res = await axios.get(
        `${API_URL}/folder/${nombreCarpeta}`,
        authHeaders,
      );
      setCorreos(res.data);
    } catch (error) {
      console.error("Error carpeta:", error);
    } finally {
      setCargando(false);
    }
  };

  const cargarDetalleCorreo = async (uid) => {
    setCorreoSeleccionado(uid);
    setDetalleCorreo(null);
    setCargandoMensaje(true);

    // En móvil cerramos sidebar si estaba abierto
    setSidebarOpen(false);

    try {
      const res = await axios.get(
        `${API_URL}/mensaje/${uid}?folder=${carpetaActual}`,
        authHeaders,
      );
      setDetalleCorreo(res.data);
    } catch (error) {
      console.error(error);
      alert("No se pudo cargar el mensaje.");
    } finally {
      setCargandoMensaje(false);
    }
  };

  const enviarCorreo = async (e) => {
    e.preventDefault();
    setEnviando(true);
    try {
      await axios.post(`${API_URL}/enviar`, nuevoCorreo, authHeaders);
      alert("Mensaje enviado con éxito");
      setModoRedactar(false);
      setNuevoCorreo({ destinatario: "", asunto: "", mensaje: "" });
      setCarpetaActual("sent");
    } catch (error) {
      alert("Error al enviar el correo.");
    } finally {
      setEnviando(false);
    }
  };

  // --- FILTRADO LOCAL ---
  const correosFiltrados = correos.filter(
    (c) =>
      c.asunto.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.de.toLowerCase().includes(busqueda.toLowerCase()),
  );

  // --- RENDER LOGIN (Si no está configurado) ---
  if (configurado === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-gray-100">
          <div className="w-20 h-20 bg-[#a72a34]/10 text-[#a72a34] rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail size={40} />
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            Correo Institucional
          </h2>
          <p className="text-gray-500 mb-8">
            Para acceder a tu bandeja, ingresa la contraseña de tu cuenta de
            correo asignada.
          </p>
          <form onSubmit={guardarConfiguracion} className="space-y-5">
            <div className="text-left">
              <label className="text-xs font-bold text-gray-500 uppercase ml-1">
                Contraseña
              </label>
              <input
                type="password"
                required
                className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a72a34] outline-none transition-all"
                placeholder="••••••••"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="w-full bg-[#a72a34] text-white py-4 rounded-xl font-bold hover:bg-[#8f242d] transition-transform active:scale-95 shadow-lg shadow-red-900/20"
            >
              Conectar Bandeja
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (configurado === null)
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#a72a34]"></div>
      </div>
    );

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
      {/* 1. SIDEBAR (Navegación) */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-64 bg-[#1e1e1e] text-white transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="p-6 flex items-center justify-between border-b border-gray-800">
          <span className="text-lg font-bold tracking-wider flex items-center gap-2">
            <div className="w-8 h-8 bg-[#a72a34] rounded flex items-center justify-center">
              M
            </div>
            MAIL
          </span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-gray-400"
          >
            <X />
          </button>
        </div>

        <div className="p-4">
          <button
            onClick={() => {
              setModoRedactar(true);
              setSidebarOpen(false);
            }}
            className="w-full bg-[#a72a34] hover:bg-[#8f242d] text-white py-3 rounded-xl font-bold shadow-lg shadow-red-900/30 flex items-center justify-center gap-2 transition-all mb-6"
          >
            <span className="text-xl">+</span> Nuevo Mensaje
          </button>

          <nav className="space-y-1">
            <SidebarItem
              icon={Inbox}
              label="Bandeja de Entrada"
              active={carpetaActual === "inbox"}
              onClick={() => {
                setCarpetaActual("inbox");
                setSidebarOpen(false);
              }}
            />
            <SidebarItem
              icon={Send}
              label="Enviados"
              active={carpetaActual === "sent"}
              onClick={() => {
                setCarpetaActual("sent");
                setSidebarOpen(false);
              }}
            />
            <SidebarItem
              icon={Trash2}
              label="Papelera"
              active={carpetaActual === "trash"}
              onClick={() => {
                setCarpetaActual("trash");
                setSidebarOpen(false);
              }}
            />
          </nav>
        </div>

        {/* Footer Sidebar */}
        <div className="absolute bottom-0 w-full p-4 border-t border-gray-800 bg-[#1e1e1e]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
              <User size={16} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-300">
                Cuenta Configurada
              </p>
              <p className="text-[10px] text-green-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>{" "}
                En línea
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* 2. LISTA DE CORREOS (Panel Central) */}
      <div
        className={`flex-1 flex flex-col min-w-0 bg-white border-r border-gray-200 ${correoSeleccionado ? "hidden md:flex md:w-1/3 md:max-w-md" : "w-full"}`}
      >
        {/* Header Lista */}
        <div className="h-16 border-b border-gray-100 flex items-center px-4 justify-between bg-white">
          <div className="flex items-center gap-3 w-full">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-gray-500"
            >
              <Menu />
            </button>
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={16}
              />
              <input
                type="text"
                placeholder="Buscar..."
                className="w-full pl-9 pr-4 py-2 bg-gray-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-[#a72a34]/50 outline-none"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
            <button
              onClick={() => cargarCarpeta(carpetaActual)}
              className={`p-2 rounded-full hover:bg-gray-100 text-gray-500 ${cargando ? "animate-spin" : ""}`}
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>

        {/* Lista Scrollable */}
        <div className="flex-1 overflow-y-auto">
          {cargando && correos.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">
              Cargando correos...
            </div>
          ) : correosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <Inbox size={32} className="opacity-50" />
              </div>
              <p>No hay correos aquí.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {correosFiltrados.map((email) => (
                <div
                  key={email.id}
                  onClick={() => cargarDetalleCorreo(email.id)}
                  className={`
                      p-4 cursor-pointer hover:bg-blue-50 transition-colors relative
                      ${correoSeleccionado === email.id ? "bg-blue-50 border-l-4 border-[#a72a34]" : "border-l-4 border-transparent"}
                    `}
                >
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div
                        className={`
                             w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white
                             ${correoSeleccionado === email.id ? "bg-[#a72a34]" : "bg-gray-400"}
                          `}
                      >
                        {getInitials(
                          carpetaActual === "sent" ? email.para : email.de,
                        )}
                      </div>
                      <span
                        className={`text-sm truncate ${correoSeleccionado === email.id ? "font-bold text-gray-900" : "font-medium text-gray-700"}`}
                      >
                        {carpetaActual === "sent"
                          ? `Para: ${email.para}`
                          : email.de}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">
                      {formatDate(email.fecha)}
                    </span>
                  </div>
                  <div className="pl-10">
                    <h4
                      className={`text-sm truncate mb-1 ${correoSeleccionado === email.id ? "font-semibold text-gray-800" : "text-gray-600"}`}
                    >
                      {email.asunto || "(Sin Asunto)"}
                    </h4>
                    <p className="text-xs text-gray-400 truncate">
                      Haz clic para leer el contenido completo del mensaje.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3. PANEL DE LECTURA (Derecha) */}
      <div
        className={`flex-1 bg-gray-50 flex-col h-full ${!correoSeleccionado ? "hidden md:flex" : "flex absolute inset-0 z-50 md:static"}`}
      >
        {correoSeleccionado ? (
          <>
            {/* Toolbar Lectura */}
            <div className="h-16 bg-white border-b border-gray-200 px-4 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCorreoSeleccionado(null)}
                  className="md:hidden p-2 hover:bg-gray-100 rounded-full"
                >
                  <ChevronLeft />
                </button>
                <div className="flex gap-2 text-gray-500">
                  <button className="p-2 hover:bg-gray-100 rounded hover:text-red-600">
                    <Trash2 size={18} />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded hover:text-yellow-500">
                    <Star size={18} />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded">
                    <AlertCircle size={18} />
                  </button>
                </div>
              </div>
              <div className="text-gray-400">
                <MoreVertical size={20} />
              </div>
            </div>

            {/* Contenido Mensaje */}
            <div className="flex-1 overflow-y-auto p-6 md:p-10">
              {cargandoMensaje ? (
                <div className="space-y-6 animate-pulse">
                  <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-48"></div>
                      <div className="h-3 bg-gray-200 rounded w-32"></div>
                    </div>
                  </div>
                  <div className="space-y-2 pt-8">
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </div>
              ) : detalleCorreo ? (
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 min-h-full">
                  {/* Cabecera del Mensaje */}
                  <div className="border-b border-gray-100 pb-6 mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">
                      {detalleCorreo.asunto}
                    </h2>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full flex items-center justify-center text-lg font-bold shadow-md">
                          {getInitials(detalleCorreo.de)}
                        </div>
                        <div>
                          <p className="font-bold text-gray-800 text-sm">
                            {detalleCorreo.de}
                          </p>
                          {detalleCorreo.para && (
                            <p className="text-xs text-gray-500">
                              Para: {detalleCorreo.para}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">
                          {new Date(detalleCorreo.fecha).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(detalleCorreo.fecha).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Cuerpo HTML */}
                  <div
                    className="prose max-w-none text-gray-700 text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: detalleCorreo.html }}
                  />
                </div>
              ) : (
                <div className="text-center text-red-500 mt-10">
                  Error al cargar mensaje.
                </div>
              )}
            </div>
          </>
        ) : (
          /* Estado Vacío (Desktop) */
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 bg-gray-50">
            <div className="w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center mb-6">
              <Mail size={64} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-600">
              Selecciona un correo
            </h3>
            <p className="text-sm">
              Elige un mensaje de la lista para leerlo aquí.
            </p>
          </div>
        )}
      </div>

      {/* MODAL REDACTAR (Flotante) */}
      {modoRedactar && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col h-[80vh] md:h-auto">
            <div className="bg-[#1e1e1e] text-white px-6 py-4 flex justify-between items-center">
              <h3 className="font-bold">Nuevo Mensaje</h3>
              <button
                onClick={() => setModoRedactar(false)}
                className="hover:text-red-400"
              >
                <X />
              </button>
            </div>
            <form
              onSubmit={enviarCorreo}
              className="flex-1 flex flex-col p-6 space-y-4 overflow-y-auto"
            >
              <div>
                <input
                  type="email"
                  required
                  placeholder="Para"
                  className="w-full py-2 border-b border-gray-200 focus:border-[#a72a34] outline-none text-sm"
                  value={nuevoCorreo.destinatario}
                  onChange={(e) =>
                    setNuevoCorreo({
                      ...nuevoCorreo,
                      destinatario: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <input
                  type="text"
                  required
                  placeholder="Asunto"
                  className="w-full py-2 border-b border-gray-200 focus:border-[#a72a34] outline-none font-bold text-sm"
                  value={nuevoCorreo.asunto}
                  onChange={(e) =>
                    setNuevoCorreo({ ...nuevoCorreo, asunto: e.target.value })
                  }
                />
              </div>
              <textarea
                required
                placeholder="Escribe tu mensaje aquí..."
                className="flex-1 w-full py-4 outline-none text-sm resize-none min-h-[200px]"
                value={nuevoCorreo.mensaje}
                onChange={(e) =>
                  setNuevoCorreo({ ...nuevoCorreo, mensaje: e.target.value })
                }
              ></textarea>

              <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                <div className="flex gap-2 text-gray-400">
                  <button
                    type="button"
                    className="p-2 hover:bg-gray-100 rounded"
                  >
                    <Paperclip size={20} />
                  </button>
                  <button
                    type="button"
                    className="p-2 hover:bg-gray-100 rounded"
                  >
                    <span className="font-bold font-serif text-lg">A</span>
                  </button>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setModoRedactar(false)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium text-sm"
                  >
                    Descartar
                  </button>
                  <button
                    type="submit"
                    disabled={enviando}
                    className="px-6 py-2 bg-[#a72a34] text-white rounded-lg font-bold hover:bg-[#8f242d] flex items-center gap-2 shadow-md disabled:opacity-70 text-sm"
                  >
                    {enviando ? (
                      "Enviando..."
                    ) : (
                      <>
                        <Send size={16} /> Enviar
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Componente Helper para Sidebar
const SidebarItem = ({ icon: Icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`
      w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors
      ${active ? "bg-gray-800 text-white border-l-4 border-[#a72a34]" : "text-gray-400 hover:text-white hover:bg-gray-800"}
    `}
  >
    <Icon size={18} className={active ? "text-[#a72a34]" : ""} />
    {label}
  </button>
);

export default CorreoPage;
