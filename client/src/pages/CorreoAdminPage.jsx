import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  X, Mail, RefreshCw, Send, Inbox, Trash2, Search, ArrowLeft,
  Paperclip, FileText, Download, Plus, Loader, PenTool, Lock,
  Reply, Eye, EyeOff, AlertTriangle, CheckCircle
} from "lucide-react";

const getInitials = (name) => {
  if (!name) return "?";
  if (name.includes("@")) return name.charAt(0).toUpperCase();
  return name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();
};

const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  if (date.toDateString() === now.toDateString())
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
};

const CorreoPage = () => {
  const [configurado, setConfigurado] = useState(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [emailUsuario, setEmailUsuario] = useState("");
  const [passwordGuardada, setPasswordGuardada] = useState("");
  const [error, setError] = useState(null);
  const [verificando, setVerificando] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showSavedPassword, setShowSavedPassword] = useState(false);
  const [reconfigurando, setReconfigurando] = useState(false);

  const [carpetaActual, setCarpetaActual] = useState("inbox");
  const [modoRedactar, setModoRedactar] = useState(false);
  const [activeMobileView, setActiveMobileView] = useState("list");
  const [respuestaA, setRespuestaA] = useState(null);

  const [correos, setCorreos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(false);

  const [correoSeleccionado, setCorreoSeleccionado] = useState(null);
  const [detalleCorreo, setDetalleCorreo] = useState(null);
  const [cargandoMensaje, setCargandoMensaje] = useState(false);

  const [nuevoCorreo, setNuevoCorreo] = useState({ destinatario: "", asunto: "", mensaje: "" });
  const [archivosAdjuntos, setArchivosAdjuntos] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const fileInputRef = useRef(null);

  const token = localStorage.getItem("token");
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
  const API_URL = "https://api-universidad-c5o8.onrender.com/api/email";

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

  const verificarEstado = async () => {
    try {
      const res = await axios.get(`${API_URL}/status`, authHeaders);
      setConfigurado(res.data.configurado);
      setEmailUsuario(res.data.email);
      setPasswordGuardada(res.data.password || "");
    } catch (err) {
      setConfigurado(false);
    }
  };

  const guardarConfiguracion = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await axios.post(`${API_URL}/configurar`, { password: passwordInput }, authHeaders);
      setPasswordGuardada(passwordInput);
      setReconfigurando(false);
      setConfigurado(true);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data || "Error al conectar.");
    }
  };

  const iniciarReconfiguracion = () => {
    setPasswordInput(passwordGuardada);
    setReconfigurando(true);
    setConfigurado(false);
    setError(null);
  };

  const restablecerPassword = async () => {
    if (!window.confirm("Se generará una nueva contraseña y se actualizará en cPanel automáticamente. ¿Continuar?"))
      return;
    setError(null);
    setVerificando(true);
    try {
      const res = await axios.post(`${API_URL}/restablecer-password`, {}, authHeaders);
      const { password, email } = res.data;
      setPasswordGuardada(password);
      setPasswordInput(password);
      setShowPassword(true);
      alert(`✅ Contraseña restablecida con éxito.\n\nCorreo: ${email}\nNueva contraseña: ${password}\n\nGuarda estos datos.`);
      setReconfigurando(false);
      setConfigurado(true);
    } catch (err) {
      const msg = err.response?.data?.error || "Error al restablecer contraseña.";
      setError(msg);
    } finally {
      setVerificando(false);
    }
  };

  const verificarConexion = async () => {
    setVerificando(true);
    setError(null);
    try {
      const res = await axios.get(`${API_URL}/folder/inbox`, { ...authHeaders, timeout: 15000 });
      alert(`✅ Conexión exitosa. Bandeja: ${res.data.length} correos.`);
    } catch (err) {
      setError(err.response?.data?.error || (err.message?.includes("timeout") ? "Tiempo agotado." : err.message) || "Error de conexión.");
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
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data || "Error al cargar bandeja.");
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
      const res = await axios.get(`${API_URL}/mensaje/${uid}?folder=${carpetaActual}`, authHeaders);
      setDetalleCorreo(res.data);
    } catch (err) {
      setError(err.response?.data || err.response?.data?.error || "No se pudo cargar.");
    } finally {
      setCargandoMensaje(false);
    }
  };

  const eliminarCorreo = async (uid) => {
    try {
      await axios.delete(`${API_URL}/mensaje/${uid}?folder=${carpetaActual}`, authHeaders);
      setCorreoSeleccionado(null);
      setDetalleCorreo(null);
      cargarCarpeta(carpetaActual);
    } catch (err) {
      setError("Error al eliminar correo.");
    }
  };

  const abrirResponder = () => {
    if (!detalleCorreo) return;
    const destinatario = detalleCorreo.de?.match(/<([^>]+)>/)?.[1] || detalleCorreo.de || "";
    setNuevoCorreo({
      destinatario,
      asunto: detalleCorreo.asunto?.startsWith("Re:") ? detalleCorreo.asunto : `Re: ${detalleCorreo.asunto}`,
      mensaje: `\n\n--- Mensaje original ---\nDe: ${detalleCorreo.de}\nFecha: ${detalleCorreo.fecha}\n\n${detalleCorreo.html ? detalleCorreo.html.replace(/<[^>]+>/g, "") : ""}`,
    });
    setRespuestaA(detalleCorreo);
    setModoRedactar(true);
  };

  const handleFileChange = (e) => {
    if (e.target.files) setArchivosAdjuntos([...archivosAdjuntos, ...Array.from(e.target.files)]);
  };

  const enviarCorreo = async (e) => {
    e.preventDefault();
    setEnviando(true);
    const formData = new FormData();
    formData.append("destinatario", nuevoCorreo.destinatario);
    formData.append("asunto", nuevoCorreo.asunto);
    formData.append("mensaje", nuevoCorreo.mensaje);
    archivosAdjuntos.forEach((f) => formData.append("adjuntos", f));
    try {
      await axios.post(`${API_URL}/enviar`, formData, authHeaders);
      alert("✅ Enviado con éxito");
      setModoRedactar(false);
      setRespuestaA(null);
      setNuevoCorreo({ destinatario: "", asunto: "", mensaje: "" });
      setArchivosAdjuntos([]);
      setCarpetaActual("sent");
    } catch (err) {
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

  const descargarTodosAdjuntos = () => {
    if (!detalleCorreo?.adjuntos) return;
    detalleCorreo.adjuntos.forEach(descargarAdjunto);
  };

  const exportarCorreos = () => {
    let data = "Asunto,De,Para,Fecha\n";
    correos.forEach((c) => {
      data += `"${c.asunto || ""}","${c.de || ""}","${c.para || ""}","${c.fecha || ""}"\n`;
    });
    const blob = new Blob([data], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `correos_${carpetaActual}.csv`;
    link.click();
  };

  const correosFiltrados = correos.filter((c) =>
    c.asunto?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.de?.toLowerCase().includes(busqueda.toLowerCase())
  );

  // --- LOGIN SCREEN ---
  if (configurado === false)
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock size={32} />
          </div>
          <h2 className="text-2xl font-bold mb-1">{reconfigurando ? "Actualizar Contraseña" : "Acceso a Correo"}</h2>
          {emailUsuario && <p className="text-sm text-gray-500 mb-4">{emailUsuario}</p>}
          {reconfigurando && (
            <div className="text-xs text-amber-600 mb-4 bg-amber-50 p-2 rounded-lg space-y-2">
              <p>La contraseña guardada no es válida.</p>
              <button type="button" onClick={restablecerPassword} disabled={verificando}
                className="w-full bg-orange-600 text-white py-2 rounded-lg font-bold hover:bg-orange-700 transition disabled:opacity-50 text-xs">
                {verificando ? "Generando..." : "Restablecer automáticamente"}
              </button>
              <p className="text-gray-500">o ingresa la nueva contraseña manualmente:</p>
            </div>
          )}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs text-left">{error}</div>
          )}
          <form onSubmit={guardarConfiguracion} className="space-y-4 mt-2">
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                className="w-full p-3 pr-10 border rounded-lg outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Contraseña institucional"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <button type="submit" className="w-full bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700 transition">
              {reconfigurando ? "Actualizar y probar" : "Entrar"}
            </button>
            {reconfigurando && (
              <button type="button" onClick={() => { setReconfigurando(false); setConfigurado(true); }}
                className="w-full text-xs text-gray-500 hover:text-gray-700 underline mt-2">
                Cancelar
              </button>
            )}
          </form>
          {passwordGuardada && !reconfigurando && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <button type="button" onClick={() => setShowSavedPassword(!showSavedPassword)}
                className="text-xs text-gray-500 hover:text-red-600 underline">
                {showSavedPassword ? "Ocultar contraseña guardada" : "¿Olvidaste tu contraseña?"}
              </button>
              {showSavedPassword && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg text-xs">
                  <p className="text-yellow-700 font-medium">Contraseña actual:</p>
                  <p className="text-gray-800 font-mono mt-1 select-all">{passwordGuardada}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );

  if (configurado === null)
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader className="animate-spin text-red-600" />
      </div>
    );

  // --- MAIN MAIL CLIENT (GMAIL-LIKE) ---
  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-full">
      {/* HEADER */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
              <div className="p-2 bg-[#a72a34] text-white rounded-xl shadow-lg">
                <Mail size={24} />
              </div>
              Correo Institucional
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {emailUsuario} &middot; {carpetaActual === "inbox" ? "Recibidos" : carpetaActual === "sent" ? "Enviados" : "Papelera"}
              {!cargando && <span className="ml-1">({correos.length})</span>}
            </p>
          </div>
          <button onClick={exportarCorreos} className="hidden md:flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg transition-colors">
            <Download size={14} /> Exportar
          </button>
        </div>

        {/* ACTION BAR */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-gray-100">
          <nav className="flex bg-gray-100 rounded-lg p-0.5">
            {(["inbox", "sent", "trash"]).map((folder) => (
              <button key={folder} onClick={() => setCarpetaActual(folder)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${carpetaActual === folder ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                {folder === "inbox" && <Inbox size={14} />}
                {folder === "sent" && <Send size={14} />}
                {folder === "trash" && <Trash2 size={14} />}
                {folder === "inbox" ? "Recibidos" : folder === "sent" ? "Enviados" : "Papelera"}
              </button>
            ))}
          </nav>

          <div className="flex-1 min-w-[150px] max-w-xs relative ml-auto">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-[#a72a34] outline-none"
              placeholder="Buscar..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </div>

          <button onClick={verificarConexion} disabled={verificando}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-50">
            <RefreshCw size={14} className={verificando ? "animate-spin" : ""} />
            <span className="hidden md:inline">{verificando ? "..." : "Verificar"}</span>
          </button>
          <button onClick={iniciarReconfiguracion}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600">
            <Lock size={14} />
            <span className="hidden md:inline">Cambiar contraseña</span>
          </button>

          <button onClick={() => { setRespuestaA(null); setNuevoCorreo({ destinatario: "", asunto: "", mensaje: "" }); setModoRedactar(true); }}
            className="flex items-center gap-1.5 bg-[#a72a34] hover:bg-[#8f242d] text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow transition-all active:scale-95">
            <Plus size={16} /> <span className="hidden md:inline">Redactar</span>
          </button>
        </div>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 flex-1">{error}</p>
          <div className="flex gap-2 shrink-0">
            {(error.toLowerCase().includes("authentication") || error.toLowerCase().includes("contraseña") || error.includes("401") || error.includes("incorrecta")) && (
              <>
                <button onClick={iniciarReconfiguracion}
                  className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-red-700 transition-colors">
                  Reingresar
                </button>
                <button onClick={restablecerPassword} disabled={verificando}
                  className="text-xs bg-orange-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-orange-700 transition-colors disabled:opacity-50">
                  {verificando ? "..." : "Restablecer auto"}
                </button>
              </>
            )}
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 font-bold">&times;</button>
          </div>
        </div>
      )}

      {/* EMAIL PANEL (SPLIT VIEW) */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex h-[calc(100vh-22rem)] min-h-[400px]">
          {/* LISTA */}
          <div className={`flex flex-col border-r border-gray-200 h-full overflow-hidden transition-all duration-300 ${activeMobileView === "detail" ? "hidden md:flex md:w-72 lg:w-80" : "w-full md:w-72 lg:w-80"}`}>
            <div className="flex-1 overflow-y-auto">
              {cargando && correos.length === 0 ? (
                <div className="p-10 text-center text-gray-400 text-sm">Cargando...</div>
              ) : correosFiltrados.length === 0 && !cargando ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 p-6 text-center">
                  <Inbox size={36} className="mb-2 opacity-50" />
                  <p className="text-sm">No hay mensajes.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {correosFiltrados.map((c) => (
                    <div key={c.id} onClick={() => cargarDetalle(c.id)}
                      className={`p-3 cursor-pointer hover:bg-gray-50 transition-colors ${correoSeleccionado === c.id ? "bg-red-50 border-l-4 border-red-600" : "border-l-4 border-transparent"}`}>
                      <div className="flex justify-between items-center mb-1">
                        <span className={`text-xs font-semibold truncate w-2/3 ${correoSeleccionado === c.id ? "text-gray-900" : "text-gray-700"}`}>
                          {carpetaActual === "sent" ? `Para: ${c.para}` : c.de}
                        </span>
                        <span className="text-[10px] text-gray-400 shrink-0 ml-1">{formatDate(c.fecha)}</span>
                      </div>
                      <p className="text-xs font-medium text-gray-600 truncate">{c.asunto || "(Sin asunto)"}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* DETALLE */}
          <div className={`flex-1 bg-gray-50 flex flex-col h-full overflow-hidden ${activeMobileView === "list" ? "hidden md:flex" : "flex"}`}>
            {correoSeleccionado ? (
              <>
                <div className="h-12 bg-white border-b border-gray-200 px-4 flex items-center justify-between shrink-0">
                  <button onClick={() => { setActiveMobileView("list"); setCorreoSeleccionado(null); }}
                    className="flex items-center gap-1 text-xs text-gray-600 font-bold hover:bg-gray-100 px-2 py-1 rounded md:hidden">
                    <ArrowLeft size={16} /> Volver
                  </button>
                  <div className="flex gap-1 ml-auto">
                    <button onClick={abrirResponder} className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors" title="Responder">
                      <Reply size={16} />
                    </button>
                    <button onClick={() => eliminarCorreo(correoSeleccionado)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  {cargandoMensaje ? (
                    <div className="flex justify-center pt-20"><Loader className="animate-spin text-red-600" /></div>
                  ) : detalleCorreo ? (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 min-h-[50vh] flex flex-col">
                      <div className="p-5 border-b border-gray-100">
                        <div className="flex justify-between items-start mb-3">
                          <h1 className="text-lg font-bold text-gray-800 flex-1 mr-4">{detalleCorreo.asunto}</h1>
                          <span className="text-xs text-gray-400 whitespace-nowrap">{new Date(detalleCorreo.fecha).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {getInitials(detalleCorreo.de)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 text-sm truncate">{detalleCorreo.de}</p>
                            {detalleCorreo.para && <p className="text-xs text-gray-500 truncate">Para: {detalleCorreo.para}</p>}
                          </div>
                        </div>
                      </div>

                      <div className="p-5 flex-1 text-gray-800 text-sm leading-relaxed overflow-x-auto">
                        <div dangerouslySetInnerHTML={{ __html: detalleCorreo.html }} />
                      </div>

                      {detalleCorreo.adjuntos?.length > 0 && (
                        <div className="p-4 bg-gray-50 border-t border-gray-100 rounded-b-xl">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                              <Paperclip size={14} /> {detalleCorreo.adjuntos.length} archivos
                            </h4>
                            <button onClick={descargarTodosAdjuntos} className="text-xs text-red-600 hover:text-red-700 font-medium">
                              Descargar todos
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {detalleCorreo.adjuntos.map((att, idx) => {
                              const isImage = att.contentType?.startsWith("image/");
                              return (
                                <div key={idx} onClick={() => descargarAdjunto(att)}
                                  className="cursor-pointer group border border-gray-200 bg-white rounded-lg p-2 w-44 hover:shadow-md transition-all">
                                  <div className="h-20 bg-gray-100 rounded mb-1.5 overflow-hidden flex items-center justify-center">
                                    {isImage ? (
                                      <img src={`data:${att.contentType};base64,${att.content}`} className="w-full h-full object-cover" alt="" />
                                    ) : (
                                      <FileText size={28} className="text-gray-400" />
                                    )}
                                  </div>
                                  <p className="text-[11px] text-gray-700 truncate font-medium">{att.filename}</p>
                                  <p className="text-[10px] text-gray-400">{(att.size / 1024).toFixed(1)} KB</p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center text-red-500 mt-10 text-sm">Error cargando mensaje.</div>
                  )}
                </div>
              </>
            ) : (
              <div className="hidden md:flex flex-col items-center justify-center h-full text-gray-400">
                <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                  <Mail size={40} className="text-gray-400" />
                </div>
                <p className="font-medium text-sm">Selecciona un correo</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* COMPOSE MODAL */}
      {modoRedactar && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in zoom-in-95">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
            <div className="bg-[#1e1e1e] text-white px-5 py-3 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-sm">{respuestaA ? "Responder" : "Nuevo Mensaje"}</h3>
              <button onClick={() => { setModoRedactar(false); setRespuestaA(null); }}><X size={20} /></button>
            </div>
            <form onSubmit={enviarCorreo} className="flex-1 flex flex-col">
              <div className="p-5 space-y-3 overflow-y-auto flex-1">
                <div className="border-b border-gray-200 pb-1">
                  <input className="w-full py-1 outline-none text-sm" placeholder="Para: (ejemplo@correo.com)" type="email" required
                    value={nuevoCorreo.destinatario}
                    onChange={(e) => setNuevoCorreo({ ...nuevoCorreo, destinatario: e.target.value })} />
                </div>
                <div className="border-b border-gray-200 pb-1">
                  <input className="w-full py-1 outline-none font-bold text-sm" placeholder="Asunto" required
                    value={nuevoCorreo.asunto}
                    onChange={(e) => setNuevoCorreo({ ...nuevoCorreo, asunto: e.target.value })} />
                </div>
                <textarea className="w-full min-h-[200px] resize-none outline-none text-gray-700 text-sm" placeholder="Escribe tu mensaje..."
                  required value={nuevoCorreo.mensaje}
                  onChange={(e) => setNuevoCorreo({ ...nuevoCorreo, mensaje: e.target.value })} />
                {archivosAdjuntos.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {archivosAdjuntos.map((file, i) => (
                      <div key={i} className="bg-gray-100 px-3 py-1 rounded-full text-xs flex items-center gap-2 border">
                        <span className="max-w-[150px] truncate">{file.name}</span>
                        <button type="button" onClick={() => setArchivosAdjuntos(archivosAdjuntos.filter((_, idx) => idx !== i))}
                          className="text-gray-500 hover:text-red-600"><X size={14} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-gray-100 flex justify-between items-center bg-gray-50">
                <button type="button" onClick={() => fileInputRef.current.click()}
                  className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors" title="Adjuntar">
                  <Paperclip size={20} />
                </button>
                <input type="file" multiple ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setModoRedactar(false); setRespuestaA(null); }}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg font-medium text-sm">Cancelar</button>
                  <button type="submit" disabled={enviando}
                    className="bg-[#a72a34] hover:bg-[#8f242d] text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 disabled:opacity-70 shadow-md text-sm">
                    {enviando ? "Enviando..." : <><Send size={16} /> Enviar</>}
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

export default CorreoPage;
