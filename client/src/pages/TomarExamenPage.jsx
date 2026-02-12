import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Clock, Send } from "lucide-react";

const TomarExamenPage = () => {
  const { examenId } = useParams();
  const navigate = useNavigate();

  const [examen, setExamen] = useState(null);
  const [preguntas, setPreguntas] = useState([]);
  const [respuestas, setRespuestas] = useState({});
  const [loading, setLoading] = useState(true);

  // Cargar Examen
  useEffect(() => {
    const cargarExamen = async () => {
      try {
        const token = localStorage.getItem("token");
        // Ajusta la URL si tu puerto es diferente
        const res = await axios.get(
          `https://api-universidad-c5o8.onrender.com/api/examenes/${examenId}/resolver`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        setExamen(res.data.examen);
        setPreguntas(res.data.preguntas);
        setLoading(false);
      } catch (error) {
        alert("Error al cargar examen o no existe.");
        navigate(-1);
      }
    };
    cargarExamen();
  }, [examenId, navigate]);

  const handleRespuesta = (preguntaId, valor) => {
    setRespuestas({ ...respuestas, [preguntaId]: valor });
  };

  const enviarExamen = async () => {
    if (!window.confirm("¿Terminar y enviar examen?")) return;

    const respuestasArray = Object.keys(respuestas).map((key) => ({
      pregunta_id: key,
      respuesta_valor: respuestas[key],
    }));

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `https://api-universidad-c5o8.onrender.com/api/examenes/${examenId}/entregar`,
        {
          respuestas: respuestasArray,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      alert(`Examen enviado. Calificación: ${res.data.calificacion}`);
      navigate(-1);
    } catch (error) {
      alert("Error al enviar");
    }
  };

  if (loading) return <div className="p-10 text-center">Cargando...</div>;

  return (
    <div className="max-w-3xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="bg-white p-6 rounded-xl shadow-sm border-b-4 border-blue-600 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">{examen.titulo}</h1>
        <p className="text-gray-600 mt-2">{examen.descripcion}</p>
        <div className="flex items-center gap-2 mt-4 text-blue-600 font-bold bg-blue-50 w-fit px-3 py-1 rounded-full">
          <Clock size={18} /> Tiempo: Ilimitado
        </div>
      </div>

      <div className="space-y-6">
        {preguntas.map((preg, idx) => (
          <div
            key={preg.id}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"
          >
            <h3 className="font-bold text-lg text-gray-800 mb-4">
              <span className="text-gray-400 mr-2">{idx + 1}.</span>
              {preg.texto_pregunta}{" "}
              <span className="text-xs text-gray-400">({preg.puntos} pts)</span>
            </h3>

            {/* Renderizado condicional CORREGIDO */}
            {preg.tipo === "opcion_multiple" ? (
              <div className="space-y-3">
                {preg.opciones.map((op) => (
                  <label
                    key={op.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${respuestas[preg.id] == op.id ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:bg-gray-50"}`}
                  >
                    <input
                      type="radio"
                      name={`preg_${preg.id}`}
                      value={op.id}
                      onChange={() => handleRespuesta(preg.id, op.id)}
                      className="w-5 h-5 text-blue-600"
                    />
                    <span className="text-gray-700">{op.texto_opcion}</span>
                  </label>
                ))}
              </div>
            ) : (
              <textarea
                className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                rows="4"
                placeholder="Escribe tu respuesta..."
                onChange={(e) => handleRespuesta(preg.id, e.target.value)}
              />
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 pb-10 flex justify-end">
        <button
          onClick={enviarExamen}
          className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-green-700 flex items-center gap-2 shadow-lg transform transition hover:scale-105"
        >
          <Send size={20} /> Entregar Examen
        </button>
      </div>
    </div>
  );
};

export default TomarExamenPage;
