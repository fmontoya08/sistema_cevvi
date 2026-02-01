import React, { useState, useEffect } from "react";
import axios from "axios";
import { X, Mail, RefreshCw, Send, Lock, Key } from "lucide-react";

const CorreoPage = () => {
  // Estados principales
  const [configurado, setConfigurado] = useState(null); // null = cargando, false = falta pass, true = listo
  const [passwordInput, setPasswordInput] = useState("");

  // Estados del correo
  const [correos, setCorreos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [correoSeleccionado, setCorreoSeleccionado] = useState(null);
  const [cargandoMensaje, setCargandoMensaje] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);

  // Formulario nuevo correo
  const [nuevoCorreo, setNuevoCorreo] = useState({
    destinatario: "",
    asunto: "",
    mensaje: "",
  });

  const token = localStorage.getItem("token");
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
  const API_URL = "http://localhost:3001/api/email"; // Ajusta si tu puerto es diferente

  // 1. AL CARGAR: Verificamos si el usuario ya tiene contraseña
  useEffect(() => {
    verificarEstado();
  }, []);

  const verificarEstado = async () => {
    try {
      const res = await axios.get(`${API_URL}/status`, authHeaders);
      setConfigurado(res.data.configurado);
      if (res.data.configurado) {
        cargarInbox(); // Si ya tiene pass, cargamos correos
      }
    } catch (error) {
      console.error("Error verificando estado:", error);
      alert("Error al conectar con el servidor.");
    }
  };

  // 2. FUNCIÓN PARA GUARDAR LA CONTRASEÑA (Primera vez)
  const guardarConfiguracion = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        `${API_URL}/configurar`,
        { password: passwordInput },
        authHeaders,
      );
      alert("¡Conexión exitosa! Cargando tus correos...");
      setConfigurado(true);
      cargarInbox();
    } catch (error) {
      console.error("Error configurando:", error);
      alert("Error al guardar la contraseña.");
    }
  };

  // 3. CARGAR INBOX
  const cargarInbox = async () => {
    setCargando(true);
    try {
      const res = await axios.get(`${API_URL}/inbox`, authHeaders);
      setCorreos(res.data);
    } catch (error) {
      console.error("Error inbox:", error);
      // Si falla la autenticación, tal vez cambió la contraseña, volvemos a pedirla
      if (error.response && error.response.status === 401) {
        alert(
          "Tu contraseña de correo parece haber cambiado. Por favor ingrésala nuevamente.",
        );
        setConfigurado(false);
      }
    } finally {
      setCargando(false);
    }
  };

  // 4. ABRIR CORREO
  const abrirCorreo = async (uid) => {
    setModalAbierto(true);
    setCargandoMensaje(true);
    try {
      const res = await axios.get(`${API_URL}/mensaje/${uid}`, authHeaders);
      setCorreoSeleccionado(res.data);
    } catch (error) {
      alert("No se pudo cargar el mensaje.");
    } finally {
      setCargandoMensaje(false);
    }
  };

  // 5. ENVIAR CORREO
  const enviarCorreo = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/enviar`, nuevoCorreo, authHeaders);
      alert("Enviado correctamente");
      setNuevoCorreo({ destinatario: "", asunto: "", mensaje: "" });
      cargarInbox();
    } catch (error) {
      alert("Error al enviar.");
    }
  };

  // --- RENDERIZADO CONDICIONAL ---

  // A) Si estamos verificando...
  if (configurado === null) {
    return (
      <div className="p-10 text-center text-gray-500">
        Verificando conexión...
      </div>
    );
  }

  // B) Si FALTA LA CONTRASEÑA (Pantalla de "Onboarding")
  if (configurado === false) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Conecta tu Correo Institucional
          </h2>
          <p className="text-gray-500 mb-6">
            Para acceder a tu bandeja de entrada desde aquí, necesitamos que
            ingreses tu contraseña de correo institucional{" "}
            <strong>por única vez</strong>.
          </p>

          <form onSubmit={guardarConfiguracion} className="space-y-4">
            <div className="text-left">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña del Correo
              </label>
              <div className="relative">
                <Key
                  className="absolute left-3 top-2.5 text-gray-400"
                  size={18}
                />
                <input
                  type="password"
                  required
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                  placeholder="Tu contraseña de email..."
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full bg-red-700 text-white py-3 rounded-lg font-bold hover:bg-red-800 transition"
            >
              Conectar y Ver Correos
            </button>
          </form>
          <p className="text-xs text-gray-400 mt-4">
            Esta contraseña se guardará de forma segura para tus futuros
            accesos.
          </p>
        </div>
      </div>
    );
  }

  // C) Si YA TIENE CONTRASEÑA (Interfaz normal de correo)
  return (
    <div className="p-6 bg-gray-100 min-h-screen relative">
      <h1 className="text-3xl font-bold text-red-800 mb-6 flex items-center gap-2">
        <Mail /> Buzón Institucional
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Panel Izquierdo: Redactar */}
        <div className="bg-white p-6 rounded-lg shadow-md h-fit">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Send size={20} /> Redactar
          </h2>
          <form onSubmit={enviarCorreo} className="space-y-3">
            <input
              type="email"
              required
              placeholder="Para..."
              className="w-full p-2 border rounded focus:ring-red-500 outline-none"
              value={nuevoCorreo.destinatario}
              onChange={(e) =>
                setNuevoCorreo({ ...nuevoCorreo, destinatario: e.target.value })
              }
            />
            <input
              type="text"
              required
              placeholder="Asunto..."
              className="w-full p-2 border rounded focus:ring-red-500 outline-none"
              value={nuevoCorreo.asunto}
              onChange={(e) =>
                setNuevoCorreo({ ...nuevoCorreo, asunto: e.target.value })
              }
            />
            <textarea
              required
              rows="5"
              placeholder="Escribe tu mensaje..."
              className="w-full p-2 border rounded focus:ring-red-500 outline-none resize-none"
              value={nuevoCorreo.mensaje}
              onChange={(e) =>
                setNuevoCorreo({ ...nuevoCorreo, mensaje: e.target.value })
              }
            ></textarea>
            <button
              type="submit"
              className="w-full bg-red-700 text-white py-2 rounded hover:bg-red-800 transition"
            >
              Enviar Mensaje
            </button>
          </form>
        </div>

        {/* Panel Derecho: Bandeja */}
        <div className="bg-white p-6 rounded-lg shadow-md h-[600px] flex flex-col">
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h2 className="text-xl font-bold">Bandeja de Entrada</h2>
            <button
              onClick={cargarInbox}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <RefreshCw size={20} className={cargando ? "animate-spin" : ""} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2">
            {cargando ? (
              <p className="text-center text-gray-500">Cargando...</p>
            ) : correos.length === 0 ? (
              <p className="text-center text-gray-500">Bandeja vacía.</p>
            ) : (
              correos.map((email) => (
                <div
                  key={email.id}
                  onClick={() => abrirCorreo(email.id)}
                  className="p-3 border rounded hover:bg-red-50 cursor-pointer"
                >
                  <div className="flex justify-between font-bold text-gray-800">
                    <span>{email.asunto}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(email.fecha).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 truncate">
                    {email.de}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal de Lectura */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl h-[80vh] flex flex-col">
            <div className="p-4 border-b flex justify-between bg-gray-50 rounded-t-xl">
              <div>
                <h2 className="text-lg font-bold">
                  {correoSeleccionado?.asunto}
                </h2>
                <p className="text-sm text-gray-600">
                  De: {correoSeleccionado?.de}
                </p>
              </div>
              <button
                onClick={() => setModalAbierto(false)}
                className="text-gray-400 hover:text-red-500"
              >
                <X />
              </button>
            </div>
            <div className="flex-1 p-6 overflow-y-auto">
              {cargandoMensaje ? (
                <p>Cargando contenido...</p>
              ) : (
                <div
                  dangerouslySetInnerHTML={{ __html: correoSeleccionado?.html }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CorreoPage;
