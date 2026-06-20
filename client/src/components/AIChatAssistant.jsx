import React, { useState, useRef, useEffect } from "react";
import { X, Send, Trash2, Bot } from "lucide-react";
import axios from "axios";

const API_BASE_URL = window.location.hostname === "localhost"
  ? "http://localhost:3001"
  : "https://api-universidad-c5o8.onrender.com";

const AIChatAssistant = ({ user }) => {
  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState([]);
  const [input, setInput] = useState("");
  const [cargando, setCargando] = useState(false);
  const mensajesRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (abierto && inputRef.current) {
      inputRef.current.focus();
    }
  }, [abierto]);

  useEffect(() => {
    if (mensajesRef.current) {
      mensajesRef.current.scrollTop = mensajesRef.current.scrollHeight;
    }
  }, [mensajes]);

  const enviarPregunta = async () => {
    const texto = input.trim();
    if (!texto || cargando) return;

    setInput("");

    const mensajeUsuario = { rol: "usuario", texto };
    setMensajes((prev) => [...prev, mensajeUsuario]);

    setCargando(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${API_BASE_URL}/api/ai/ask`,
        {
          pregunta: texto,
          ruta_actual: window.location.pathname,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const mensajeAsistente = {
        rol: "asistente",
        texto: res.data.respuesta,
      };
      setMensajes((prev) => [...prev, mensajeAsistente]);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        "Error de conexión. Intenta de nuevo.";
      setMensajes((prev) => [
        ...prev,
        {
          rol: "asistente",
          texto: `❌ ${msg}`,
          error: true,
        },
      ]);
    } finally {
      setCargando(false);
    }
  };

  const nuevoChat = () => {
    setMensajes([]);
    setInput("");
    if (inputRef.current) inputRef.current.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviarPregunta();
    }
  };

  return (
    <>
      <button
        onClick={() => setAbierto(!abierto)}
        className="fixed bottom-24 right-6 bg-[#bb9a5a] text-white p-4 rounded-full shadow-2xl hover:bg-[#a8884a] transition-all z-50 flex items-center justify-center hover:scale-110 border-4 border-white/20"
        style={{ zIndex: 99998 }}
        title="Preguntar al asistente IA"
      >
        {abierto ? <X size={28} /> : <Bot size={28} />}
      </button>

      {abierto && (
        <div
          className="fixed inset-0 bg-black/30 z-40"
          onClick={() => setAbierto(false)}
        />
      )}

      <div
        className={`fixed bottom-0 right-0 w-full sm:w-[400px] h-[550px] sm:h-[600px] bg-white shadow-2xl rounded-t-2xl sm:rounded-2xl sm:bottom-24 sm:right-24 sm:mb-0 sm:mr-0 z-50 flex flex-col transition-all duration-300 border border-gray-200 ${
          abierto
            ? "translate-y-0 opacity-100"
            : "translate-y-8 opacity-0 pointer-events-none"
        }`}
        style={{ zIndex: 99999 }}
      >
        <div className="flex items-center justify-between px-4 py-3 bg-[#a72a34] text-white rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Bot size={22} />
            <span className="font-semibold text-sm">Asistente IA</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={nuevoChat}
              className="p-1.5 hover:bg-white/20 rounded-full transition"
              title="Nuevo chat"
            >
              <Trash2 size={18} />
            </button>
            <button
              onClick={() => setAbierto(false)}
              className="p-1.5 hover:bg-white/20 rounded-full transition"
              title="Cerrar"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div
          ref={mensajesRef}
          className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50"
        >
          {mensajes.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 text-center px-6">
              <Bot size={48} className="mb-3 text-[#bb9a5a]" />
              <p className="font-medium text-gray-500 mb-1">
                ¡Hola, {user?.nombre || "Usuario"}!
              </p>
              <p className="text-sm">
                Soy el asistente de la plataforma. Pregúntame lo que necesites
                sobre cómo usar el sistema.
              </p>
              <div className="mt-4 space-y-2 w-full max-w-xs">
                <button
                  onClick={() => {
                    setInput("¿Cómo entro a mi aula virtual?");
                    setTimeout(() => inputRef.current?.focus(), 50);
                  }}
                  className="w-full text-left text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-100 transition text-gray-600"
                >
                  ¿Cómo entro a mi aula virtual?
                </button>
                <button
                  onClick={() => {
                    setInput("¿Cómo dejo una tarea a mis alumnos?");
                    setTimeout(() => inputRef.current?.focus(), 50);
                  }}
                  className="w-full text-left text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-100 transition text-gray-600"
                >
                  ¿Cómo dejo una tarea a mis alumnos?
                </button>
                <button
                  onClick={() => {
                    setInput("¿Cómo cambio mi contraseña?");
                    setTimeout(() => inputRef.current?.focus(), 50);
                  }}
                  className="w-full text-left text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-100 transition text-gray-600"
                >
                  ¿Cómo cambio mi contraseña?
                </button>
              </div>
            </div>
          )}

          {mensajes.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.rol === "usuario" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.rol === "usuario"
                    ? "bg-[#a72a34] text-white rounded-br-md"
                    : msg.error
                      ? "bg-red-50 border border-red-200 text-red-700 rounded-bl-md"
                      : "bg-white border border-gray-200 text-gray-700 rounded-bl-md"
                }`}
              >
                {msg.texto}
              </div>
            </div>
          ))}

          {cargando && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-gray-200 bg-white rounded-b-2xl">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu pregunta..."
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#a72a34] focus:border-transparent"
              disabled={cargando}
            />
            <button
              onClick={enviarPregunta}
              disabled={!input.trim() || cargando}
              className="p-2.5 bg-[#a72a34] text-white rounded-full hover:bg-[#802028] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={18} />
            </button>
          </div>
          <p className="text-[10px] text-gray-400 text-center mt-1.5">
            Este asistente puede equivocarse. Verifica la información importante.
          </p>
        </div>
      </div>
    </>
  );
};

export default AIChatAssistant;
