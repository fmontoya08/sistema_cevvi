import React, { useState, useEffect } from "react";
import axios from "axios";
// Importamos íconos para que se vea mejor (asegúrate de tener lucide-react instalado)
import { X, Mail, RefreshCw, Send } from "lucide-react";

const CorreoAdminPage = () => {
  const [correos, setCorreos] = useState([]);
  const [cargando, setCargando] = useState(false);

  // Estados para ver el correo completo (Modal)
  const [correoSeleccionado, setCorreoSeleccionado] = useState(null);
  const [cargandoMensaje, setCargandoMensaje] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);

  // Estados para el formulario de envío
  const [nuevoCorreo, setNuevoCorreo] = useState({
    destinatario: "",
    asunto: "",
    mensaje: "",
  });

  const token = localStorage.getItem("token");
  const authHeaders = {
    headers: { Authorization: `Bearer ${token}` },
  };

  // 1. CARGAR LISTA
  const cargarInbox = async () => {
    setCargando(true);
    try {
      const res = await axios.get(
        "http://localhost:3001/api/admin/email/inbox",
        authHeaders,
      );
      setCorreos(res.data);
    } catch (error) {
      console.error("Error cargando inbox:", error);
    } finally {
      setCargando(false);
    }
  };

  // 2. ABRIR UN CORREO ESPECÍFICO
  const abrirCorreo = async (uid) => {
    setModalAbierto(true);
    setCargandoMensaje(true);
    setCorreoSeleccionado(null); // Limpiamos el anterior

    try {
      const res = await axios.get(
        `http://localhost:3001/api/admin/email/mensaje/${uid}`,
        authHeaders,
      );
      setCorreoSeleccionado(res.data);
    } catch (error) {
      alert("No se pudo cargar el contenido del mensaje.");
      setModalAbierto(false);
    } finally {
      setCargandoMensaje(false);
    }
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setCorreoSeleccionado(null);
  };

  useEffect(() => {
    cargarInbox();
  }, []);

  // 3. ENVIAR CORREO
  const enviarCorreo = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        "http://localhost:3001/api/admin/email/enviar",
        nuevoCorreo,
        authHeaders,
      );
      alert("¡Correo enviado exitosamente!");
      setNuevoCorreo({ destinatario: "", asunto: "", mensaje: "" });
      cargarInbox(); // Recargar para ver si quedó en enviados (si el servidor lo soporta)
    } catch (error) {
      alert("Error al enviar el correo.");
    }
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen relative">
      <h1 className="text-3xl font-bold text-red-800 mb-6 flex items-center gap-2">
        <Mail className="w-8 h-8" /> Módulo de Correo
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* IZQUIERDA: REDACTAR */}
        <div className="bg-white p-6 rounded-lg shadow-md h-fit">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-700">
            <Send size={20} /> Redactar Nuevo
          </h2>
          <form onSubmit={enviarCorreo} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Para:
              </label>
              <input
                type="email"
                required
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 outline-none"
                placeholder="alumno@ejemplo.com"
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
              <label className="block text-sm font-medium text-gray-700">
                Asunto:
              </label>
              <input
                type="text"
                required
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 outline-none"
                value={nuevoCorreo.asunto}
                onChange={(e) =>
                  setNuevoCorreo({ ...nuevoCorreo, asunto: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Mensaje:
              </label>
              <textarea
                required
                rows="6"
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 outline-none resize-none"
                value={nuevoCorreo.mensaje}
                onChange={(e) =>
                  setNuevoCorreo({ ...nuevoCorreo, mensaje: e.target.value })
                }
              ></textarea>
            </div>
            <button
              type="submit"
              className="w-full bg-red-700 text-white py-2 rounded hover:bg-red-800 transition font-bold"
            >
              Enviar Correo
            </button>
          </form>
        </div>

        {/* DERECHA: BANDEJA DE ENTRADA */}
        <div className="bg-white p-6 rounded-lg shadow-md flex flex-col h-[600px]">
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h2 className="text-xl font-bold text-gray-700">
              Bandeja de Entrada
            </h2>
            <button
              onClick={cargarInbox}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition"
              title="Actualizar"
            >
              <RefreshCw size={20} className={cargando ? "animate-spin" : ""} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-2">
            {cargando ? (
              <p className="text-center text-gray-500 mt-10">
                Cargando correos...
              </p>
            ) : correos.length === 0 ? (
              <p className="text-center text-gray-500 mt-10">Bandeja vacía.</p>
            ) : (
              correos.map((email) => (
                <div
                  key={email.id}
                  onClick={() => abrirCorreo(email.id)}
                  className="p-4 border border-gray-100 rounded-lg hover:bg-red-50 hover:border-red-200 cursor-pointer transition shadow-sm bg-gray-50 group"
                >
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-bold text-gray-800 group-hover:text-red-700 line-clamp-1">
                      {email.asunto}
                    </p>
                    <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                      {email.fecha
                        ? new Date(email.fecha).toLocaleDateString()
                        : ""}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-1">
                    {email.de}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* --- MODAL PARA LEER EL CORREO --- */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Cabecera del Modal */}
            <div className="bg-gray-100 p-4 border-b flex justify-between items-start">
              {cargandoMensaje ? (
                <div className="h-6 w-48 bg-gray-300 rounded animate-pulse"></div>
              ) : (
                <div className="w-full pr-8">
                  <h2 className="text-xl font-bold text-gray-900 mb-1">
                    {correoSeleccionado?.asunto || "(Sin Asunto)"}
                  </h2>
                  <div className="flex justify-between text-sm text-gray-600">
                    <p>
                      <strong>De:</strong> {correoSeleccionado?.de}
                    </p>
                    <p>
                      {correoSeleccionado?.fecha
                        ? new Date(correoSeleccionado.fecha).toLocaleString()
                        : ""}
                    </p>
                  </div>
                </div>
              )}
              <button
                onClick={cerrarModal}
                className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1 rounded-full transition"
              >
                <X size={24} />
              </button>
            </div>

            {/* Cuerpo del Mensaje */}
            <div className="flex-1 p-6 overflow-y-auto bg-white">
              {cargandoMensaje ? (
                <div className="space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6 animate-pulse"></div>
                </div>
              ) : (
                // Renderizamos el HTML del correo de forma segura
                <div
                  className="prose max-w-none text-gray-800"
                  dangerouslySetInnerHTML={{ __html: correoSeleccionado?.html }}
                />
              )}
            </div>

            {/* Pie del Modal */}
            <div className="p-4 border-t bg-gray-50 text-right">
              <button
                onClick={cerrarModal}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition"
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

export default CorreoAdminPage;
