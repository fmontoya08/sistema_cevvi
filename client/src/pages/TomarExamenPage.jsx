import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
// 1. IMPORTAMOS TODOS LOS ICONOS NECESARIOS
import { Clock, Send, AlertCircle } from "lucide-react";

const TomarExamenPage = () => {
  const { examenId } = useParams();
  const navigate = useNavigate();

  const [examen, setExamen] = useState(null);
  const [preguntas, setPreguntas] = useState([]);
  const [respuestas, setRespuestas] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const cargarExamen = async () => {
      try {
        const token = localStorage.getItem("token");
        // Asegúrate que esta URL sea la correcta (Render o Localhost)
        const res = await axios.get(
          `https://api-universidad-c5o8.onrender.com/api/examenes/${examenId}/resolver`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        setExamen(res.data.examen);
        setPreguntas(res.data.preguntas);
      } catch (err) {
        console.error("Error:", err);
        setError("No se pudo cargar el examen.");
      } finally {
        setLoading(false);
      }
    };
    cargarExamen();
  }, [examenId]);

  const handleRespuesta = (preguntaId, valor) => {
    setRespuestas({ ...respuestas, [preguntaId]: valor });
  };

  const enviarExamen = async () => {
    if (!window.confirm("¿Seguro que quieres enviar el examen?")) return;

    const respuestasArray = Object.keys(respuestas).map((key) => ({
      pregunta_id: key,
      respuesta_valor: respuestas[key],
    }));

    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `https://api-universidad-c5o8.onrender.com/api/examenes/${examenId}/entregar`,
        { respuestas: respuestasArray },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      alert("Examen entregado correctamente.");
      navigate(-1);
    } catch (err) {
      alert("Error al enviar.");
    }
  };

  if (loading)
    return <div className="p-10 text-center">Cargando examen...</div>;

  // 2. MANEJO DE ERROR Y EXAMEN NULL (Para que VS Code no llore)
  if (error || !examen) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 p-6">
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-gray-800">Error</h2>
        <p className="text-gray-600 mb-6">{error || "Examen no encontrado"}</p>
        <button
          onClick={() => navigate(-1)}
          className="bg-gray-800 text-white px-6 py-2 rounded-lg"
        >
          Regresar
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="bg-white p-6 rounded-xl shadow-sm border-b-4 border-blue-600 mb-6 sticky top-4 z-10">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              {examen.titulo}
            </h1>
            <p className="text-gray-600 mt-2">{examen.descripcion}</p>
          </div>
          <div className="flex items-center gap-2 text-blue-600 font-bold bg-blue-50 px-3 py-1 rounded-full text-sm">
            <Clock size={16} /> Tiempo: Ilimitado
          </div>
        </div>
      </div>

      <div className="space-y-6 pb-20">
        {preguntas.map((preg, idx) => (
          <div
            key={preg.id}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"
          >
            <h3 className="font-bold text-lg text-gray-800 mb-4">
              <span className="text-gray-400 mr-2">{idx + 1}.</span>
              {preg.texto_pregunta}
              <span className="text-xs text-gray-400 ml-2 font-normal bg-gray-100 px-2 py-0.5 rounded">
                {preg.puntos} pts
              </span>
            </h3>

            {preg.tipo === "opcion_multiple" ? (
              <div className="space-y-3">
                {/* 3. VERIFICAMOS QUE preg.opciones EXISTADO ANTES DE MAPEAR */}
                {preg.opciones?.map((op) => (
                  <label
                    key={op.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      respuestas[preg.id] == op.id
                        ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`preg_${preg.id}`}
                      value={op.id}
                      checked={respuestas[preg.id] == op.id}
                      onChange={() => handleRespuesta(preg.id, op.id)}
                      className="w-5 h-5 text-blue-600 accent-blue-600"
                    />
                    <span className="text-gray-700">{op.texto_opcion}</span>
                  </label>
                ))}
              </div>
            ) : (
              <textarea
                className="w-full p-4 border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all min-h-[120px]"
                rows="4"
                placeholder="Escribe tu respuesta detallada aquí..."
                value={respuestas[preg.id] || ""}
                onChange={(e) => handleRespuesta(preg.id, e.target.value)}
              />
            )}
          </div>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg md:relative md:bg-transparent md:border-0 md:shadow-none md:p-0 flex justify-end">
        <button
          onClick={enviarExamen}
          className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold text-lg hover:bg-green-700 shadow-lg flex items-center gap-2"
        >
          <Send size={20} /> Entregar Examen
        </button>
      </div>
    </div>
  );
};

export default TomarExamenPage;
