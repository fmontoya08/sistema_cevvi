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
  PenTool,
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
  const [error, setError] = useState(null);
  const [verificando, setVerificando] = useState(false);

  // UI States (Header Tabs)
  const [carpetaActual, setCarpetaActual] = useState("inbox"); // 'inbox', 'sent', 'trash'
  const [modoRedactar, setModoRedactar] = useState(false);
  const [activeMobileView, setActiveMobileView] = useState("list");

  // Data States
  const [correos, setCorreos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(false);

  // Detail States
  const [correoSeleccionado, setCorreoSeleccionado] = useState(null);
  const [detalleCorreo, setDetalleCorreo] = useState(null);
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
  const API_URL = "/api/email";

  // --- EFECTOS ---
  useEffect(() => {
    setError(null);
    verificarEstado();
  }, []);

  useEffect(() => {
    if (configurado) {
      setError(null);
      cargarCarpeta(carpetaActual);
    }
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
    setError(null);
    try {
      await axios.post(
        `${API_URL}/configurar`,
        { password: passwordInput },
        authHeaders,
      );
      setConfigurado(true);
    } catch (error) {
      const msg =
        error.response?.data?.error ||
        error.response?.data ||
        "Error al conectar con el servidor.";
      setError(msg);
    }
  };

  const verificarConexion = async () => {
    setVerificando(true);
    setError(null);
    try {
      const res = await axios.get(`${API_URL}/folder/inbox`, {
        ...authHeaders,
        timeout: 15000,
      });
      if (res.data && res.data.length !== undefined) {
        alert(`✅ Conexión exitosa. Bandeja: ${res.data.length} correos.`);
      } else {
        alert("✅ Conexión establecida correctamente.");
      }
    } catch (error) {
      const msg =
        error.response?.data?.error ||
        (error.message && error.message.includes("timeout")
          ? "Tiempo de espera agotado. Verifica tu conexión."
          : error.message) ||
        "Error de conexión con el servidor de correo.";
      setError(msg);
    } finally {
      setVerificando(false);
    }
  };

  const cargarCarpeta = async (nombre) => {
    setCargando(true);
    setCorreos([]);
    setError(null);
    setCorreoSeleccionado(null);
    setDetalleCorreo(null);
    setActiveMobileView("list");
    try {
      const res = await axios.get(`${API_URL}/folder/${nombre}`, authHeaders);
      setCorreos(res.data);
    } catch (error) {
      const msg =
        error.response?.data?.error ||
        error.response?.data ||
        "Error al cargar la bandeja. Verifica tu conexión.";
      setError(msg);
    } finally {
      setCargando(false);
    }
  };

  const cargarDetalle = async (uid) => {
    setCorreoSeleccionado(uid);
    setActiveMobileView("detail");
    setDetalleCorreo(null);
    setCargandoMensaje(true);
    setError(null);
    try {
      const res = await axios.get(
        `${API_URL}/mensaje/${uid}?folder=${carpetaActual}`,
        authHeaders,
      );
      setDetalleCorreo(res.data);
    } catch (error) {
      const msg =
        error.response?.data ||
        error.response?.data?.error ||
        "No se pudo cargar el mensaje.";
      setError(msg);
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
      await axios.post(`${API_URL}/enviar`, formData, authHeaders); // Axios pone el Content-Type solo
      alert("Enviado con éxito");
      setModoRedactar(false);
      setNuevoCorreo({ destinatario: "", asunto: "", mensaje: "" });
      setArchivosAdjuntos([]);
      setCarpetaActual("sent");
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
        error={error}
      />
    );
  if (configurado === null)
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader className="animate-spin text-red-600" />
      </div>
    );

  return (
    <div className="flex flex-col h-screen bg-white font-sans overflow-hidden">
      {/* 1. HEADER (Navegación + Buscador + Acciones) */}
      <header className="h-16 bg-[#1e1e1e] text-white flex items-center justify-between px-4 shadow-md z-20 shrink-0">
        {/* Logo / Título */}
        <div className="flex items-center gap-2 font-bold text-lg mr-4 hidden md:flex">
          <div className="w-8 h-8 bg-[#a72a34] rounded-lg flex items-center justify-center">
            M
          </div>
          <span>Mail</span>
        </div>

        {/* Pestañas de Navegación (Tabs) */}
        <nav className="flex bg-gray-800 rounded-lg p-1 mr-4 overflow-x-auto no-scrollbar">
          <TabButton
            label="Recibidos"
            active={carpetaActual === "inbox"}
            icon={Inbox}
            onClick={() => setCarpetaActual("inbox")}
          />
          <TabButton
            label="Enviados"
            active={carpetaActual === "sent"}
            icon={Send}
            onClick={() => setCarpetaActual("sent")}
          />
          <TabButton
            label="Papelera"
            active={carpetaActual === "trash"}
            icon={Trash2}
            onClick={() => setCarpetaActual("trash")}
          />
        </nav>

        {/* Buscador, Verificar y Botón Redactar */}
        <div className="flex items-center gap-3 flex-1 justify-end">
          <div className="relative w-full max-w-xs hidden sm:block">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={14}
            />
            <input
              className="w-full pl-9 pr-3 py-1.5 bg-gray-700 border-none rounded-full text-sm text-white placeholder-gray-400 focus:ring-2 focus:ring-[#a72a34] outline-none"
              placeholder="Buscar..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          <button
            onClick={verificarConexion}
            disabled={verificando}
            className="flex items-center gap-1.5 bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors"
            title="Probar conexión IMAP"
          >
            <RefreshCw size={14} className={verificando ? "animate-spin" : ""} />
            <span className="hidden md:inline">{verificando ? "Verificando..." : "Verificar"}</span>
          </button>
          <button
            onClick={() => setModoRedactar(true)}
            className="flex items-center gap-2 bg-[#a72a34] hover:bg-[#8f242d] text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg transition-transform active:scale-95"
          >
            <Plus size={18} />{" "}
            <span className="hidden md:inline">Redactar</span>
          </button>
        </div>
      </header>

      {/* 2. ÁREA DE CONTENIDO (Split View) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* A. LISTA DE CORREOS */}
        <div
          className={`
          flex flex-col bg-white border-r border-gray-200 h-full overflow-hidden transition-all duration-300
          ${activeMobileView === "detail" ? "hidden md:flex md:w-80 lg:w-96" : "w-full md:w-80 lg:w-96"} 
        `}
        >
          <div className="p-3 border-b bg-gray-50 flex justify-between items-center text-xs font-bold text-gray-500 uppercase">
            <span>
              {carpetaActual === "inbox" ? "Bandeja de Entrada" : carpetaActual}
            </span>
            <button
              onClick={() => cargarCarpeta(carpetaActual)}
              className={`p-1.5 hover:bg-gray-200 rounded-full ${cargando ? "animate-spin" : ""}`}
            >
              <RefreshCw size={14} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {error && (
              <div className="m-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-start gap-2">
                <span className="mt-0.5 shrink-0">⚠️</span>
                <span className="flex-1">{error}</span>
                <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 font-bold">&times;</button>
              </div>
            )}
            {cargando && correos.length === 0 ? (
              <div className="p-10 text-center text-gray-400 text-sm">
                Cargando...
              </div>
            ) : correosFiltrados.length === 0 && !error ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 opacity-50 p-6 text-center">
                <Inbox size={40} className="mb-2" />
                <p className="text-sm">No hay mensajes aquí.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {correosFiltrados.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => cargarDetalle(c.id)}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${correoSeleccionado === c.id ? "bg-red-50 border-l-4 border-red-600" : "border-l-4 border-transparent"}`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span
                        className={`text-xs ${correoSeleccionado === c.id ? "font-bold text-gray-900" : "font-semibold text-gray-700"} truncate w-2/3`}
                      >
                        {carpetaActual === "sent" ? `Para: ${c.para}` : c.de}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {formatDate(c.fecha)}
                      </span>
                    </div>
                    <div
                      className={`text-sm mb-1 truncate ${correoSeleccionado === c.id ? "font-bold text-gray-800" : "text-gray-600"}`}
                    >
                      {c.asunto || "(Sin asunto)"}
                    </div>
                    <div className="text-xs text-gray-400 truncate">
                      Pulsa para leer el mensaje...
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* B. VISTA DETALLE */}
        <div
          className={`
           flex-1 bg-gray-50 flex flex-col h-full overflow-hidden absolute inset-0 z-10 md:static md:z-0
           ${activeMobileView === "list" ? "translate-x-full md:translate-x-0" : "translate-x-0"}
           transition-transform duration-300 md:bg-gray-50
        `}
        >
          {correoSeleccionado ? (
            <>
              {/* Header Detalle (Solo en Móvil) */}
              <div className="h-14 bg-white border-b border-gray-200 px-4 flex items-center justify-between shrink-0 md:hidden">
                <button
                  onClick={() => {
                    setActiveMobileView("list");
                    setCorreoSeleccionado(null);
                  }}
                  className="flex items-center gap-1 text-gray-600 font-bold px-2 py-1 rounded hover:bg-gray-100"
                >
                  <ArrowLeft size={18} /> Volver
                </button>
              </div>

              {/* Contenido */}
              <div className="flex-1 overflow-y-auto p-4 md:p-8">
                {cargandoMensaje ? (
                  <div className="flex justify-center pt-20">
                    <Loader className="animate-spin text-red-600" />
                  </div>
                ) : detalleCorreo ? (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 min-h-[60vh] flex flex-col">
                    {/* Info Correo */}
                    <div className="p-6 border-b border-gray-100">
                      <div className="flex justify-between items-start mb-4">
                        <h1 className="text-xl font-bold text-gray-800 flex-1 mr-4">
                          {detalleCorreo.asunto}
                        </h1>
                        <span className="text-xs text-gray-400 whitespace-nowrap">
                          {new Date(detalleCorreo.fecha).toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold text-sm">
                          {getInitials(detalleCorreo.de)}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm">
                            {detalleCorreo.de}
                          </p>
                          <p className="text-xs text-gray-500">
                            Para: {detalleCorreo.para || "Mí"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Cuerpo HTML */}
                    <div className="p-6 flex-1 text-gray-800 text-sm leading-relaxed overflow-x-auto font-sans">
                      <div
                        dangerouslySetInnerHTML={{ __html: detalleCorreo.html }}
                      />
                    </div>

                    {/* Adjuntos */}
                    {detalleCorreo.adjuntos &&
                      detalleCorreo.adjuntos.length > 0 && (
                        <div className="p-4 bg-gray-50 border-t border-gray-100 rounded-b-xl">
                          <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
                            <Paperclip size={14} />{" "}
                            {detalleCorreo.adjuntos.length} Archivos Adjuntos
                          </h4>
                          <div className="flex flex-wrap gap-3">
                            {detalleCorreo.adjuntos.map((att, idx) => {
                              const isImage =
                                att.contentType.startsWith("image/");
                              return (
                                <div
                                  key={idx}
                                  onClick={() => descargarAdjunto(att)}
                                  className="cursor-pointer group relative border border-gray-200 bg-white rounded-lg p-2 w-48 hover:shadow-md transition-all"
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

                                  <button className="absolute top-2 right-2 bg-white p-1.5 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity text-blue-600">
                                    <Download size={14} />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                  </div>
                ) : (
                  <div className="text-center text-red-500 mt-10">
                    Error cargando mensaje.
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
              <p className="font-medium">Selecciona un correo para leerlo.</p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL REDACTAR (Simplificado y Funcional) */}
      {modoRedactar && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in zoom-in-95">
          <div className="bg-white w-full max-w-2xl h-[80vh] md:h-auto rounded-xl shadow-2xl flex flex-col overflow-hidden">
            <div className="bg-[#1e1e1e] text-white px-5 py-3 flex justify-between items-center shrink-0">
              <h3 className="font-bold">Nuevo Mensaje</h3>
              <button onClick={() => setModoRedactar(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={enviarCorreo} className="flex-1 flex flex-col">
              <div className="p-5 space-y-4 overflow-y-auto flex-1">
                <div className="border-b border-gray-200 pb-1">
                  <input
                    className="w-full py-1 outline-none text-sm text-gray-800 placeholder-gray-400"
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
                </div>
                <div className="border-b border-gray-200 pb-1">
                  <input
                    className="w-full py-1 outline-none font-bold text-sm text-gray-800 placeholder-gray-400"
                    placeholder="Asunto"
                    required
                    value={nuevoCorreo.asunto}
                    onChange={(e) =>
                      setNuevoCorreo({ ...nuevoCorreo, asunto: e.target.value })
                    }
                  />
                </div>
                <textarea
                  className="w-full h-full min-h-[200px] resize-none outline-none text-gray-700 text-sm"
                  placeholder="Escribe tu mensaje aquí..."
                  required
                  value={nuevoCorreo.mensaje}
                  onChange={(e) =>
                    setNuevoCorreo({ ...nuevoCorreo, mensaje: e.target.value })
                  }
                ></textarea>

                {/* Chips de Adjuntos */}
                {archivosAdjuntos.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {archivosAdjuntos.map((file, i) => (
                      <div
                        key={i}
                        className="bg-gray-100 px-3 py-1 rounded-full text-xs flex items-center gap-2 border border-gray-300"
                      >
                        <span className="max-w-[150px] truncate">
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

              <div className="p-4 border-t border-gray-100 flex justify-between items-center bg-gray-50">
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current.click()}
                    className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                    title="Adjuntar archivo"
                  >
                    <Paperclip size={20} />
                  </button>
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
                    className="bg-[#a72a34] hover:bg-[#8f242d] text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 disabled:opacity-70 shadow-md transition-all text-sm"
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

// Tabs del Header
const TabButton = ({ label, active, icon: Icon, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${active ? "bg-gray-700 text-white shadow-sm" : "text-gray-400 hover:text-white hover:bg-gray-700"}`}
  >
    <Icon size={14} /> {label}
  </button>
);

const LoginScreen = ({ onSubmit, pass, setPass, error }) => (
  <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
    <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm text-center">
      <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
        <Lock size={32} />
      </div>
      <h2 className="text-2xl font-bold mb-2">Acceso a Correo</h2>
      <p className="text-sm text-gray-500 mb-4">
        Ingresa tu contraseña de correo institucional
      </p>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs text-left">
          {error}
        </div>
      )}
      <form onSubmit={onSubmit} className="space-y-4 mt-2">
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
