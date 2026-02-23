import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Clock,
  Send,
  AlertTriangle,
  Maximize,
  ShieldAlert,
} from "lucide-react";

const TomarExamenPage = () => {
  const { examenId } = useParams();
  const navigate = useNavigate();

  // Estados originales
  const [examen, setExamen] = useState(null);
  const [preguntas, setPreguntas] = useState([]);
  const [respuestas, setRespuestas] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ==========================================
  // NUEVOS ESTADOS DE SEGURIDAD Y TIEMPO
  // ==========================================
  const [hasStarted, setHasStarted] = useState(false); // Para la pantalla inicial
  const [timeLeft, setTimeLeft] = useState(null); // Segundos restantes
  const [advertencias, setAdvertencias] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const MAX_ADVERTENCIAS = 1; // A la segunda trampa, se cierra.

  // 1. CARGAR DATOS DEL EXAMEN
  useEffect(() => {
    const cargarExamen = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(
          `https://api-universidad-c5o8.onrender.com/api/examenes/${examenId}/resolver`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        setExamen(res.data.examen);
        setPreguntas(res.data.preguntas);

        // Configuramos el tiempo en segundos (Asume que en BD hay 'limite_tiempo' en minutos, sino 60)
        const minutos = res.data.examen.limite_tiempo || 60;
        setTimeLeft(minutos * 60);
      } catch (err) {
        console.error("Error:", err);
        setError("No se pudo cargar el examen.");
      } finally {
        setLoading(false);
      }
    };
    cargarExamen();
  }, [examenId]);

  // ==========================================
  // FUNCIÓN MAESTRA DE ENVÍO (MANUAL Y AUTOMÁTICA)
  // ==========================================
  const enviarExamen = useCallback(
    async (esForzado = false, motivo = "") => {
      if (isSubmitting) return;

      // Si NO es forzado (es decir, el alumno le dio clic al botón), validamos vacías
      if (!esForzado) {
        const faltantes = preguntas.filter((p) => !respuestas[p.id]);
        if (faltantes.length > 0) {
          if (
            !window.confirm(
              `Te faltan ${faltantes.length} preguntas por responder. ¿Enviar de todos modos?`,
            )
          ) {
            return;
          }
        }
      }

      setIsSubmitting(true);

      const respuestasFormateadas = Object.keys(respuestas).map((key) => ({
        pregunta_id: key,
        respuesta_valor: respuestas[key],
      }));

      try {
        const token = localStorage.getItem("token");
        await axios.post(
          `https://api-universidad-c5o8.onrender.com/api/examenes/${examenId}/entregar`,
          { respuestas: respuestasFormateadas },
          { headers: { Authorization: `Bearer ${token}` } },
        );

        // Salir de pantalla completa si estaba activada
        if (document.fullscreenElement) {
          document.exitFullscreen().catch((err) => console.log(err));
        }

        if (esForzado) {
          alert(`Examen finalizado automáticamente.\nMotivo: ${motivo}`);
        } else {
          alert("Examen entregado correctamente");
        }

        navigate("/alumno/dashboard", { replace: true });
      } catch (error) {
        console.error(error);
        alert("Error al entregar el examen");
        setIsSubmitting(false);
      }
    },
    [isSubmitting, preguntas, respuestas, examenId, navigate],
  );

  // ==========================================
  // EFECTO: CRONÓMETRO IMPLACABLE
  // ==========================================
  useEffect(() => {
    if (!hasStarted || timeLeft === null || isSubmitting) return;

    if (timeLeft <= 0) {
      enviarExamen(true, "Tiempo agotado");
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [hasStarted, timeLeft, isSubmitting, enviarExamen]);

  // ==========================================
  // EFECTO: ANTI-TRAMPA (ABANDONO DE PESTAÑA)
  // ==========================================
  useEffect(() => {
    if (!hasStarted || isSubmitting) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setAdvertencias((prev) => {
          const nuevasAdvertencias = prev + 1;
          if (nuevasAdvertencias > MAX_ADVERTENCIAS) {
            enviarExamen(
              true,
              "Múltiples abandonos de pestaña detectados (Sospecha de trampa)",
            );
          } else {
            setShowWarning(true);
          }
          return nuevasAdvertencias;
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [hasStarted, isSubmitting, enviarExamen]);

  // ==========================================
  // EFECTO: BLOQUEO DE F5 Y BOTÓN ATRÁS
  // ==========================================
  useEffect(() => {
    if (!hasStarted) return;
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasStarted]);

  // --- HANDLERS ---
  const handleRespuesta = (preguntaId, valor) => {
    setRespuestas({ ...respuestas, [preguntaId]: valor });
  };

  const iniciarExamen = () => {
    // Pedir pantalla completa
    if (document.documentElement.requestFullscreen) {
      document.documentElement
        .requestFullscreen()
        .catch((err) => console.log("Fullscreen denegado", err));
    }
    setHasStarted(true);
  };

  // Formateador de tiempo
  const formatearTiempo = (segundos) => {
    if (segundos === null) return "--:--";
    const m = Math.floor(segundos / 60)
      .toString()
      .padStart(2, "0");
    const s = (segundos % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // --- RENDERIZADO DE CARGA Y ERROR ---
  if (loading)
    return (
      <div className="flex justify-center items-center h-screen text-gray-500 font-bold text-xl">
        Cargando examen...
      </div>
    );
  if (error)
    return (
      <div className="p-10 text-center text-red-500 font-bold text-xl">
        {error}
      </div>
    );

  // ==========================================
  // VISTA 1: PANTALLA DE INICIO (LOBBY)
  // ==========================================
  if (!hasStarted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
        <div className="bg-white max-w-2xl w-full p-8 rounded-2xl shadow-xl text-center border-t-8 border-[#a72a34]">
          <h1 className="text-4xl font-black text-gray-900 mb-4">
            {examen.titulo}
          </h1>
          <p className="text-lg text-gray-600 mb-8 px-4">
            {examen.descripcion}
          </p>

          <div className="bg-red-50 p-6 rounded-xl border border-red-200 text-left space-y-4 mb-8">
            <h3 className="text-xl font-bold text-red-800 flex items-center gap-2">
              <ShieldAlert size={24} /> Reglas del Examen:
            </h3>
            <ul className="list-disc list-inside text-red-900 space-y-2 font-medium">
              <li>
                El examen se abrirá en <strong>Pantalla Completa</strong>.
              </li>
              <li>
                Tienes <strong>{Math.floor(timeLeft / 60)} minutos</strong> para
                terminar. Se enviará solo si el tiempo se agota.
              </li>
              <li>
                <strong>NO</strong> abras otras pestañas ni minimices la
                ventana. El sistema lo detectará como trampa.
              </li>
              <li>
                Si abandonas la pestaña 2 veces, el examen{" "}
                <strong>se cancelará automáticamente</strong>.
              </li>
              <li>
                No actualices la página (F5) ni presiones el botón de atrás.
              </li>
            </ul>
          </div>

          <button
            onClick={iniciarExamen}
            className="w-full bg-[#a72a34] text-white py-4 rounded-xl font-bold text-2xl hover:bg-[#802028] shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 flex items-center justify-center gap-3"
          >
            <Maximize size={28} />
            ESTOY LISTO, COMENZAR EXAMEN
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // VISTA 2: EXAMEN EN CURSO
  // ==========================================
  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-50 min-h-screen relative pb-32">
      {/* MODAL DE ADVERTENCIA ANTI-TRAMPA */}
      {showWarning && (
        <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-lg text-center shadow-2xl border-4 border-red-600 animate-in zoom-in">
            <AlertTriangle
              size={80}
              className="text-red-600 mx-auto mb-4 animate-pulse"
            />
            <h2 className="text-3xl font-black text-gray-900 mb-4 uppercase">
              ¡Advertencia de Seguridad!
            </h2>
            <p className="text-gray-700 text-lg mb-6 leading-relaxed">
              Hemos detectado que saliste de la pestaña o perdiste el enfoque de
              la ventana del examen. Esto está{" "}
              <strong>estrictamente prohibido</strong>.
              <br />
              <br />
              <span className="text-red-600 font-bold bg-red-50 p-2 rounded block">
                Si vuelves a salir, el examen se enviará automáticamente y serás
                calificado con lo que tengas.
              </span>
            </p>
            <button
              onClick={() => setShowWarning(false)}
              className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold text-xl hover:bg-black transition-colors shadow-lg"
            >
              Entendido, volveré al examen
            </button>
          </div>
        </div>
      )}

      {/* HEADER FIJO (CON RELOJ) */}
      <div className="sticky top-0 z-40 bg-white p-4 rounded-xl shadow-md border-b-4 border-[#a72a34] mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-2xl font-bold text-gray-800 line-clamp-1">
            {examen.titulo}
          </h1>
          <p className="text-xs text-red-500 font-bold mt-1">
            No recargues esta página.
          </p>
        </div>

        {/* CRONÓMETRO */}
        <div
          className={`flex items-center justify-center gap-3 px-6 py-3 rounded-xl font-black text-3xl tracking-wider transition-all shadow-inner border ${
            timeLeft <= 300
              ? "bg-red-100 text-red-600 border-red-300 animate-pulse"
              : "bg-gray-100 text-gray-800 border-gray-200"
          }`}
        >
          <Clock size={28} />
          {formatearTiempo(timeLeft)}
        </div>
      </div>

      {/* LISTA DE PREGUNTAS */}
      <div className="space-y-8">
        {preguntas.map((preg, idx) => (
          <div
            key={preg.id}
            className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200"
          >
            <div className="flex items-start gap-4 mb-6">
              <span className="bg-[#a72a34] text-white font-bold px-4 py-1.5 rounded-lg text-lg shadow-sm">
                {idx + 1}
              </span>
              <h3 className="text-xl font-semibold text-gray-800 leading-relaxed mt-1">
                {preg.texto_pregunta}
              </h3>
            </div>

            {preg.tipo === "opcion_multiple" ? (
              <div className="space-y-3 pl-2 md:pl-16">
                {preg.opciones.map((op) => (
                  <label
                    key={op.id}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      respuestas[preg.id] == op.id
                        ? "border-[#a72a34] bg-red-50"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`preg_${preg.id}`}
                      value={op.id}
                      checked={respuestas[preg.id] == op.id}
                      onChange={() => handleRespuesta(preg.id, op.id)}
                      className="w-5 h-5 text-[#a72a34] focus:ring-[#a72a34]"
                    />
                    <span className="text-gray-700 text-lg font-medium">
                      {op.texto_opcion}
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <textarea
                className="w-full p-4 border-2 border-gray-200 rounded-xl outline-none focus:border-[#a72a34] focus:ring-1 focus:ring-[#a72a34] transition-all min-h-[150px] text-lg mt-2"
                rows="4"
                placeholder="Escribe tu respuesta aquí..."
                value={respuestas[preg.id] || ""}
                onChange={(e) => handleRespuesta(preg.id, e.target.value)}
              />
            )}
          </div>
        ))}
      </div>

      {/* BOTÓN FLOTANTE */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-200 p-4 flex justify-center md:justify-end z-30">
        <div className="max-w-4xl w-full flex justify-end px-4">
          <button
            onClick={() => enviarExamen(false)} // Envío manual
            disabled={isSubmitting}
            className="w-full md:w-auto bg-[#a72a34] text-white px-10 py-4 rounded-xl font-bold text-xl hover:bg-[#802028] shadow-2xl flex items-center justify-center gap-3 transition-transform active:scale-95 disabled:bg-gray-400"
          >
            {isSubmitting ? (
              "Enviando..."
            ) : (
              <>
                <Send size={24} /> Entregar Examen
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TomarExamenPage;
