import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  X,
  Mail,
  RefreshCw,
  Send,
  Lock,
  Key,
  Inbox,
  Trash2,
  Send as SendIcon,
  Menu,
} from "lucide-react";

const CorreoPage = () => {
  // Configuración
  const [configurado, setConfigurado] = useState(null);
  const [passwordInput, setPasswordInput] = useState("");

  // Estado de la Vista
  const [carpetaActual, setCarpetaActual] = useState("inbox"); // 'inbox', 'sent', 'trash'
  const [vistaMovil, setVistaMovil] = useState(false); // Para mostrar menú en celular

  // Datos del correo
  const [correos, setCorreos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [correoSeleccionado, setCorreoSeleccionado] = useState(null);
  const [cargandoMensaje, setCargandoMensaje] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);

  // Formulario
  const [nuevoCorreo, setNuevoCorreo] = useState({
    destinatario: "",
    asunto: "",
    mensaje: "",
  });

  const token = localStorage.getItem("token");
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
  const API_URL = "https://api-universidad-c5o8.onrender.com/api/email";

  useEffect(() => {
    verificarEstado();
  }, []);

  // Cada vez que cambiamos de carpeta, recargamos la lista
  useEffect(() => {
    if (configurado) cargarCarpeta(carpetaActual);
  }, [carpetaActual, configurado]);

  const verificarEstado = async () => {
    try {
      const res = await axios.get(`${API_URL}/status`, authHeaders);
      setConfigurado(res.data.configurado);
    } catch (error) {
      console.error(error);
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
      alert("¡Conectado!");
      setConfigurado(true);
    } catch (error) {
      alert("Error al guardar.");
    }
  };

  // --- CARGAR CARPETA (NUEVA FUNCIÓN) ---
  const cargarCarpeta = async (nombreCarpeta) => {
    setCargando(true);
    setCorreos([]); // Limpiamos lista visualmente
    try {
      const res = await axios.get(
        `${API_URL}/folder/${nombreCarpeta}`,
        authHeaders,
      );
      setCorreos(res.data);
    } catch (error) {
      console.error("Error carpeta:", error);
      if (error.response && error.response.status === 404) {
        // Si la carpeta está vacía o no existe en el server
        setCorreos([]);
      }
    } finally {
      setCargando(false);
    }
  };

  const abrirCorreo = async (uid) => {
    setModalAbierto(true);
    setCargandoMensaje(true);
    setCorreoSeleccionado(null);
    try {
      // CAMBIO AQUÍ: Agregamos "?folder=" + carpetaActual al final de la URL
      const res = await axios.get(
        `${API_URL}/mensaje/${uid}?folder=${carpetaActual}`,
        authHeaders,
      );
      setCorreoSeleccionado(res.data);
    } catch (error) {
      console.error(error);
      alert("No se pudo leer el mensaje.");
    } finally {
      setCargandoMensaje(false);
    }
  };

  const enviarCorreo = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/enviar`, nuevoCorreo, authHeaders);
      alert("Enviado correctamente");
      setNuevoCorreo({ destinatario: "", asunto: "", mensaje: "" });
      setCarpetaActual("sent"); // Nos movemos a enviados para ver el correo
    } catch (error) {
      alert("Error al enviar.");
    }
  };

  // --- RENDERIZADO ---

  if (configurado === false) {
    // ... (PANTALLA DE LOGIN IGUAL QUE ANTES) ...
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Conectar Correo
          </h2>
          <p className="text-gray-500 mb-6">
            Ingresa tu contraseña institucional.
          </p>
          <form onSubmit={guardarConfiguracion} className="space-y-4">
            <input
              type="password"
              required
              className="w-full p-2 border rounded"
              placeholder="Contraseña..."
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
            />
            <button
              type="submit"
              className="w-full bg-red-700 text-white py-2 rounded font-bold"
            >
              Conectar
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (configurado === null)
    return <div className="p-10 text-center">Cargando sistema...</div>;

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* 1. SIDEBAR / MENÚ LATERAL */}
      <div
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r transform transition-transform duration-300 md:relative md:translate-x-0 ${vistaMovil ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="p-6 border-b flex justify-between items-center">
          <h1 className="text-2xl font-bold text-red-800 flex items-center gap-2">
            <Mail /> Correo
          </h1>
          <button onClick={() => setVistaMovil(false)} className="md:hidden">
            <X />
          </button>
        </div>

        <nav className="p-4 space-y-2">
          {/* Botón Redactar */}
          <button
            onClick={() => {
              setCarpetaActual("redactar");
              setVistaMovil(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-6 transition-colors ${carpetaActual === "redactar" ? "bg-red-600 text-white shadow-md" : "bg-red-50 text-red-700 hover:bg-red-100"}`}
          >
            <Send size={18} /> <span className="font-bold">Redactar</span>
          </button>

          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">
            Carpetas
          </div>

          <button
            onClick={() => {
              setCarpetaActual("inbox");
              setVistaMovil(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg ${carpetaActual === "inbox" ? "bg-gray-200 font-bold" : "text-gray-600 hover:bg-gray-100"}`}
          >
            <Inbox size={18} /> Recibidos
          </button>

          <button
            onClick={() => {
              setCarpetaActual("sent");
              setVistaMovil(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg ${carpetaActual === "sent" ? "bg-gray-200 font-bold" : "text-gray-600 hover:bg-gray-100"}`}
          >
            <SendIcon size={18} /> Enviados
          </button>

          <button
            onClick={() => {
              setCarpetaActual("trash");
              setVistaMovil(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg ${carpetaActual === "trash" ? "bg-gray-200 font-bold" : "text-gray-600 hover:bg-gray-100"}`}
          >
            <Trash2 size={18} /> Papelera
          </button>
        </nav>
      </div>

      {/* 2. CONTENIDO PRINCIPAL */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header Móvil */}
        <div className="md:hidden p-4 bg-white border-b flex items-center gap-2">
          <button onClick={() => setVistaMovil(true)}>
            <Menu />
          </button>
          <span className="font-bold text-gray-700">Menú</span>
        </div>

        {/* CONTENIDO CAMBIANTE */}
        <div className="flex-1 p-6 overflow-y-auto">
          {/* A) MODO REDACTAR */}
          {carpetaActual === "redactar" ? (
            <div className="bg-white p-6 rounded-lg shadow max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
              <h2 className="text-xl font-bold mb-4">Nuevo Mensaje</h2>
              <form onSubmit={enviarCorreo} className="space-y-4">
                <input
                  type="email"
                  required
                  placeholder="Para:"
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                  value={nuevoCorreo.destinatario}
                  onChange={(e) =>
                    setNuevoCorreo({
                      ...nuevoCorreo,
                      destinatario: e.target.value,
                    })
                  }
                />
                <input
                  type="text"
                  required
                  placeholder="Asunto:"
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                  value={nuevoCorreo.asunto}
                  onChange={(e) =>
                    setNuevoCorreo({ ...nuevoCorreo, asunto: e.target.value })
                  }
                />
                <textarea
                  required
                  rows="8"
                  placeholder="Escribe aquí..."
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none resize-none"
                  value={nuevoCorreo.mensaje}
                  onChange={(e) =>
                    setNuevoCorreo({ ...nuevoCorreo, mensaje: e.target.value })
                  }
                ></textarea>
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setCarpetaActual("inbox")}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-red-700 text-white rounded font-bold hover:bg-red-800"
                  >
                    Enviar
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* B) LISTA DE CORREOS (Inbox, Sent, Trash) */
            <div className="bg-white rounded-lg shadow h-full flex flex-col">
              <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
                <h2 className="text-xl font-bold capitalize flex items-center gap-2">
                  {carpetaActual === "inbox" && (
                    <>
                      <Inbox /> Bandeja de Entrada
                    </>
                  )}
                  {carpetaActual === "sent" && (
                    <>
                      <SendIcon /> Elementos Enviados
                    </>
                  )}
                  {carpetaActual === "trash" && (
                    <>
                      <Trash2 /> Papelera
                    </>
                  )}
                </h2>
                <button
                  onClick={() => cargarCarpeta(carpetaActual)}
                  className="p-2 hover:bg-white rounded-full transition shadow-sm"
                  title="Actualizar"
                >
                  <RefreshCw
                    size={20}
                    className={
                      cargando ? "animate-spin text-red-600" : "text-gray-500"
                    }
                  />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {cargando ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-2">
                    <RefreshCw className="animate-spin" size={32} />
                    <p>Cargando correos...</p>
                  </div>
                ) : correos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <Inbox size={48} className="mb-2 opacity-20" />
                    <p>Carpeta vacía.</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {correos.map((email) => (
                      <div
                        key={email.id}
                        onClick={() => abrirCorreo(email.id)}
                        className="p-4 hover:bg-red-50 cursor-pointer transition group flex flex-col sm:flex-row gap-2 sm:items-center"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline mb-1">
                            <h3 className="font-bold text-gray-800 truncate pr-4 group-hover:text-red-700">
                              {email.asunto}
                            </h3>
                            <span className="text-xs text-gray-400 whitespace-nowrap">
                              {new Date(email.fecha).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 truncate">
                            {carpetaActual === "sent" ? (
                              <span className="font-semibold text-gray-500">
                                Para: {email.para}
                              </span>
                            ) : (
                              <span>De: {email.de}</span>
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL LECTURA */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 md:p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b flex justify-between items-start bg-gray-50">
              <div className="w-full pr-8">
                {cargandoMensaje ? (
                  <div className="h-6 w-1/3 bg-gray-200 rounded animate-pulse"></div>
                ) : (
                  <>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">
                      {correoSeleccionado?.asunto}
                    </h2>
                    <div className="flex flex-col sm:flex-row sm:justify-between text-sm text-gray-600 gap-1">
                      <p>
                        <strong>De:</strong> {correoSeleccionado?.de}
                      </p>
                      <p>
                        {correoSeleccionado?.fecha
                          ? new Date(correoSeleccionado.fecha).toLocaleString()
                          : ""}
                      </p>
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={() => setModalAbierto(false)}
                className="text-gray-400 hover:text-red-600 transition"
              >
                <X size={28} />
              </button>
            </div>
            <div className="flex-1 p-6 overflow-y-auto bg-white">
              {cargandoMensaje ? (
                <div className="space-y-4 py-8">
                  <div className="h-4 bg-gray-100 rounded w-full animate-pulse"></div>
                  <div className="h-4 bg-gray-100 rounded w-3/4 animate-pulse"></div>
                </div>
              ) : (
                <div
                  className="prose max-w-none text-gray-800"
                  dangerouslySetInnerHTML={{ __html: correoSeleccionado?.html }}
                />
              )}
            </div>
            <div className="p-4 border-t bg-gray-50 flex justify-end">
              <button
                onClick={() => setModalAbierto(false)}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-bold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CorreoPage;
