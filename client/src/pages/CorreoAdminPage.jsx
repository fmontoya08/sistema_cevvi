import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  X,
  Mail,
  RefreshCw,
  Send,
  Inbox,
  Trash2,
  Menu,
  Search,
  ArrowLeft,
  Paperclip,
  MoreVertical,
  FileText,
  Image as ImageIcon,
  Download,
  Plus,
  Loader,
  Lock,
} from "lucide-react";

// --- UTILIDADES ---
const getInitials = (name) => {
  if (!name) return "?";
  if (name.includes("@")) return name.charAt(0).toUpperCase();
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
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
};

const CorreoPage = () => {
  // --- ESTADOS ---
  const [configurado, setConfigurado] = useState(null);
  const [passwordInput, setPasswordInput] = useState("");

  // UI States
  const [carpetaActual, setCarpetaActual] = useState("inbox");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modoRedactar, setModoRedactar] = useState(false);

  // Data States
  const [correos, setCorreos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(false);

  // Detail States
  const [correoSeleccionado, setCorreoSeleccionado] = useState(null); // ID seleccionado
  const [detalleCorreo, setDetalleCorreo] = useState(null); // Objeto completo
  const [cargandoMensaje, setCargandoMensaje] = useState(false);

  // Compose States
  const [nuevoCorreo, setNuevoCorreo] = useState({
    destinatario: "",
    asunto: "",
    mensaje: "",
  });
  const [archivosAdjuntos, setArchivosAdjuntos] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const fileInputRef = useRef(null);

  const token = localStorage.getItem("token");
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
  const API_URL = "https://api-universidad-c5o8.onrender.com/api/email";

  // --- EFECTOS ---
  useEffect(() => {
    verificarEstado();
  }, []);

  useEffect(() => {
    if (configurado) cargarCarpeta(carpetaActual);
  }, [carpetaActual, configurado]);

  // --- API ---
  const verificarEstado = async () => {
    try {
      const res = await axios.get(`${API_URL}/status`, authHeaders);
      setConfigurado(res.data.configurado);
    } catch (error) {
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
      alert("Error al conectar.");
    }
  };

  const cargarCarpeta = async (nombre) => {
    setCargando(true);
    setCorreos([]);
    setCorreoSeleccionado(null); // Resetea la vista al cambiar carpeta
    setDetalleCorreo(null);
    try {
      const res = await axios.get(`${API_URL}/folder/${nombre}`, authHeaders);
      setCorreos(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setCargando(false);
    }
  };

  const cargarDetalle = async (uid) => {
    setCorreoSeleccionado(uid);
    setDetalleCorreo(null);
    setCargandoMensaje(true);
    try {
      const res = await axios.get(
        `${API_URL}/mensaje/${uid}?folder=${carpetaActual}`,
        authHeaders,
      );
      setDetalleCorreo(res.data);
    } catch (error) {
      alert("No se pudo cargar.");
    } finally {
      setCargandoMensaje(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files) {
      setArchivosAdjuntos([...archivosAdjuntos, ...Array.from(e.target.files)]);
    }
  };

  const enviarCorreo = async (e) => {
    e.preventDefault();
    setEnviando(true);

    const formData = new FormData();
    formData.append("destinatario", nuevoCorreo.destinatario);
    formData.append("asunto", nuevoCorreo.asunto);
    formData.append("mensaje", nuevoCorreo.mensaje);

    archivosAdjuntos.forEach((file) => {
      formData.append("adjuntos", file);
    });

    try {
      // CORRECCIÓN CRÍTICA: NO poner 'Content-Type': 'multipart/form-data' manual
      // Axios lo hace solo. Si lo pones manual, rompes el boundary.
      await axios.post(`${API_URL}/enviar`, formData, authHeaders);

      alert("Enviado con éxito");
      setModoRedactar(false);
      setNuevoCorreo({ destinatario: "", asunto: "", mensaje: "" });
      setArchivosAdjuntos([]);
      setCarpetaActual("sent"); // Ir a enviados
    } catch (error) {
      console.error(error);
      alert("Error al enviar.");
    } finally {
      setEnviando(false);
    }
  };

  const descargarAdjunto = (archivo) => {
    const link = document.createElement("a");
    link.href = `data:${archivo.contentType};base64,${archivo.content}`;
    link.download = archivo.filename;
    link.click();
  };

  const correosFiltrados = correos.filter(
    (c) =>
      c.asunto.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.de.toLowerCase().includes(busqueda.toLowerCase()),
  );

  // --- RENDER LOGIN ---
  if (configurado === false)
    return (
      <LoginScreen
        onSubmit={guardarConfiguracion}
        pass={passwordInput}
        setPass={setPasswordInput}
      />
    );
  if (configurado === null)
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader className="animate-spin text-red-600" />
      </div>
    );

  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden relative">
      {/* 1. SIDEBAR (Menú) */}
      {/* En móvil es un overlay, en desktop es estático */}
      <aside
        className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 md:relative md:translate-x-0
        ${sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}
      `}
      >
        <div className="p-5 flex items-center justify-between border-b border-gray-100 h-16">
          <div className="flex items-center gap-2 text-red-800 font-bold text-lg">
            <Mail /> WebMail
          </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden">
            <X />
          </button>
        </div>

        <div className="p-4">
          <button
            onClick={() => {
              setModoRedactar(true);
              setSidebarOpen(false);
            }}
            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-md flex items-center justify-center gap-2 transition-all mb-4"
          >
            <Plus size={20} /> Redactar
          </button>

          <nav className="space-y-1">
            <SidebarLink
              icon={Inbox}
              label="Recibidos"
              active={carpetaActual === "inbox"}
              onClick={() => {
                setCarpetaActual("inbox");
                setSidebarOpen(false);
              }}
            />
            <SidebarLink
              icon={Send}
              label="Enviados"
              active={carpetaActual === "sent"}
              onClick={() => {
                setCarpetaActual("sent");
                setSidebarOpen(false);
              }}
            />
            <SidebarLink
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
      </aside>

      {/* Sombra del sidebar en móvil */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* 2. AREA PRINCIPAL (Lista + Detalle) */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* HEADER SUPERIOR */}
        <div className="h-16 bg-white border-b border-gray-200 flex items-center px-4 gap-3 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-full"
          >
            <Menu />
          </button>
          <div className="flex-1 relative max-w-md">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={16}
            />
            <input
              className="w-full pl-9 pr-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-red-100 transition-all"
              placeholder={`Buscar en ${carpetaActual}...`}
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <button
            onClick={() => cargarCarpeta(carpetaActual)}
            className={`p-2 text-gray-500 hover:bg-gray-100 rounded-full ${cargando ? "animate-spin" : ""}`}
          >
            <RefreshCw size={18} />
          </button>
        </div>

        {/* CONTENEDOR SPLIT */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* A. LISTA DE CORREOS */}
          <div
            className={`
            flex-1 flex flex-col overflow-y-auto bg-white border-r border-gray-200 transition-all duration-300
            ${correoSeleccionado ? "hidden md:flex md:w-1/3 md:max-w-sm" : "w-full"} 
          `}
          >
            {cargando && correos.length === 0 ? (
              <div className="p-10 text-center text-gray-400">Cargando...</div>
            ) : correosFiltrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 opacity-50">
                <Inbox size={48} className="mb-2" />
                <p>Carpeta vacía</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {correosFiltrados.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => cargarDetalle(c.id)}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${correoSeleccionado === c.id ? "bg-red-50 border-l-4 border-red-600" : "border-l-4 border-transparent"}`}
                  >
                    <div className="flex justify-between mb-1">
                      <span className="font-bold text-gray-800 text-sm truncate w-2/3">
                        {carpetaActual === "sent" ? `Para: ${c.para}` : c.de}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatDate(c.fecha)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 truncate font-medium">
                      {c.asunto || "(Sin asunto)"}
                    </div>
                    <div className="text-xs text-gray-400 truncate mt-1">
                      Pulsa para leer...
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* B. VISTA DETALLE (Panel Derecho / Pantalla completa móvil) */}
          <div
            className={`
             flex-1 bg-gray-50 flex flex-col h-full overflow-hidden absolute inset-0 z-10 md:static md:z-0
             ${correoSeleccionado ? "translate-x-0" : "translate-x-full md:translate-x-0"}
             transition-transform duration-300
          `}
          >
            {correoSeleccionado ? (
              <>
                {/* Header del Detalle */}
                <div className="h-14 bg-white border-b border-gray-200 px-4 flex items-center justify-between shrink-0">
                  <button
                    onClick={() => setCorreoSeleccionado(null)}
                    className="md:hidden flex items-center gap-1 text-gray-600 font-bold px-2 py-1 rounded hover:bg-gray-100"
                  >
                    <ArrowLeft size={18} /> Regresar
                  </button>
                  <div className="flex gap-2 ml-auto">
                    <button className="p-2 text-gray-500 hover:bg-gray-100 rounded hover:text-red-600">
                      <Trash2 size={18} />
                    </button>
                    <button className="p-2 text-gray-500 hover:bg-gray-100 rounded">
                      <MoreVertical size={18} />
                    </button>
                  </div>
                </div>

                {/* Cuerpo del Detalle */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8">
                  {cargandoMensaje ? (
                    <div className="flex justify-center pt-20">
                      <Loader className="animate-spin text-red-600" />
                    </div>
                  ) : detalleCorreo ? (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 min-h-[50vh] flex flex-col">
                      <div className="p-6 border-b border-gray-100">
                        <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-4">
                          {detalleCorreo.asunto}
                        </h1>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold">
                            {getInitials(detalleCorreo.de)}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between">
                              <p className="font-bold text-gray-900 text-sm">
                                {detalleCorreo.de}
                              </p>
                              <p className="text-xs text-gray-400 hidden sm:block">
                                {new Date(detalleCorreo.fecha).toLocaleString()}
                              </p>
                            </div>
                            <p className="text-xs text-gray-500">
                              Para: {detalleCorreo.para || "Mí"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* HTML Content */}
                      <div className="p-6 flex-1 text-gray-700 text-sm leading-relaxed overflow-x-auto">
                        <div
                          dangerouslySetInnerHTML={{
                            __html: detalleCorreo.html,
                          }}
                        />
                      </div>

                      {/* Adjuntos */}
                      {detalleCorreo.adjuntos &&
                        detalleCorreo.adjuntos.length > 0 && (
                          <div className="p-4 bg-gray-50 border-t border-gray-100">
                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
                              <Paperclip size={14} /> Adjuntos (
                              {detalleCorreo.adjuntos.length})
                            </h4>
                            <div className="flex flex-wrap gap-3">
                              {detalleCorreo.adjuntos.map((att, idx) => {
                                const isImage =
                                  att.contentType.startsWith("image/");
                                return (
                                  <div
                                    key={idx}
                                    onClick={() => descargarAdjunto(att)}
                                    className="cursor-pointer group relative border border-gray-200 bg-white rounded-lg p-2 w-40 hover:shadow-md transition-all"
                                  >
                                    <div className="h-24 bg-gray-100 rounded mb-2 overflow-hidden flex items-center justify-center">
                                      {isImage ? (
                                        <img
                                          src={`data:${att.contentType};base64,${att.content}`}
                                          className="w-full h-full object-cover"
                                          alt="adjunto"
                                        />
                                      ) : (
                                        <FileText
                                          size={32}
                                          className="text-gray-400"
                                        />
                                      )}
                                    </div>
                                    <p className="text-xs text-gray-700 truncate font-medium">
                                      {att.filename}
                                    </p>
                                    <p className="text-[10px] text-gray-400">
                                      {(att.size / 1024).toFixed(1)} KB
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                    </div>
                  ) : (
                    <div className="text-center text-red-500 mt-10">
                      Error cargando el mensaje.
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Estado Vacío (Desktop) */
              <div className="hidden md:flex flex-col items-center justify-center h-full text-gray-400">
                <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                  <Mail size={48} className="text-gray-400" />
                </div>
                <p>Selecciona un correo para leerlo.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL REDACTAR */}
      {modoRedactar && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-end md:items-center justify-center sm:p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full md:w-[600px] h-[90vh] md:h-auto md:rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10">
            <div className="bg-gray-900 text-white p-4 flex justify-between items-center shrink-0">
              <h3 className="font-bold">Nuevo Mensaje</h3>
              <button onClick={() => setModoRedactar(false)}>
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={enviarCorreo}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <div className="p-4 space-y-3 overflow-y-auto flex-1">
                <input
                  className="w-full border-b border-gray-200 py-2 outline-none focus:border-red-600 transition-colors"
                  placeholder="Para: (ejemplo@correo.com)"
                  type="email"
                  required
                  value={nuevoCorreo.destinatario}
                  onChange={(e) =>
                    setNuevoCorreo({
                      ...nuevoCorreo,
                      destinatario: e.target.value,
                    })
                  }
                />
                <input
                  className="w-full border-b border-gray-200 py-2 outline-none focus:border-red-600 font-bold transition-colors"
                  placeholder="Asunto"
                  required
                  value={nuevoCorreo.asunto}
                  onChange={(e) =>
                    setNuevoCorreo({ ...nuevoCorreo, asunto: e.target.value })
                  }
                />
                <textarea
                  className="w-full h-full min-h-[200px] resize-none outline-none text-gray-700 mt-2"
                  placeholder="Escribe tu mensaje aquí..."
                  required
                  value={nuevoCorreo.mensaje}
                  onChange={(e) =>
                    setNuevoCorreo({ ...nuevoCorreo, mensaje: e.target.value })
                  }
                ></textarea>

                {/* Lista de Adjuntos a Enviar */}
                {archivosAdjuntos.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                    {archivosAdjuntos.map((file, i) => (
                      <div
                        key={i}
                        className="bg-gray-100 px-3 py-1 rounded-full text-xs flex items-center gap-2 border border-gray-200"
                      >
                        <span className="max-w-[200px] truncate">
                          {file.name}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setArchivosAdjuntos(
                              archivosAdjuntos.filter((_, idx) => idx !== i),
                            )
                          }
                          className="text-gray-500 hover:text-red-600"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-3 border-t border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                <div className="flex gap-1">
                  {/* Botón Clip */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current.click()}
                    className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                    title="Adjuntar archivo"
                  >
                    <Paperclip size={20} />
                  </button>
                  {/* Botón Imagen (Hace lo mismo) */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current.click()}
                    className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                    title="Insertar imagen"
                  >
                    <ImageIcon size={20} />
                  </button>
                  <input
                    type="file"
                    multiple
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setModoRedactar(false)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg font-medium text-sm"
                  >
                    Descartar
                  </button>
                  <button
                    type="submit"
                    disabled={enviando}
                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 disabled:opacity-70 shadow-sm transition-all text-sm"
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

// Componente Helper
const SidebarLink = ({ icon: Icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${active ? "bg-red-50 text-red-700" : "text-gray-600 hover:bg-gray-100"}`}
  >
    <Icon size={18} className={active ? "text-red-600" : "text-gray-400"} />
    {label}
  </button>
);

const LoginScreen = ({ onSubmit, pass, setPass }) => (
  <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
    <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm text-center">
      <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
        <Lock size={32} />
      </div>
      <h2 className="text-2xl font-bold mb-2">Acceso a Correo</h2>
      <form onSubmit={onSubmit} className="space-y-4 mt-6">
        <input
          type="password"
          required
          className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-red-500"
          placeholder="Contraseña institucional"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
        />
        <button
          type="submit"
          className="w-full bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700 transition"
        >
          Entrar
        </button>
      </form>
    </div>
  </div>
);

export default CorreoPage;
