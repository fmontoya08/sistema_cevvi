import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
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
    setRespuestas({
      ...respuestas,
      [preguntaId]: valor,
    });
  };

  const enviarExamen = async () => {
    // Validar si contestó todo (opcional)
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

    // CORRECCIÓN IMPORTANTE: Convertir objeto respuestas a Array para el Backend
    // El backend espera: [{ pregunta_id: 1, respuesta_valor: "opcion_id" }]
    const respuestasFormateadas = Object.keys(respuestas).map((key) => ({
      pregunta_id: key,
      respuesta_valor: respuestas[key],
    }));

    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `https://api-universidad-c5o8.onrender.com/api/examenes/${examenId}/entregar`,
        { respuestas: respuestasFormateadas }, // Enviamos el array
        { headers: { Authorization: `Bearer ${token}` } },
      );
      alert("Examen entregado correctamente");
      navigate(-1); // Volver atrás
    } catch (error) {
      console.error(error);
      alert("Error al entregar el examen");
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen text-gray-500">
        Cargando examen...
      </div>
    );
  if (error)
    return (
      <div className="p-10 text-center text-red-500 font-bold">{error}</div>
    );

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-50 min-h-screen">
      {/* HEADER */}
      <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-600 mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          {examen.titulo}
        </h1>
        <p className="text-gray-600">{examen.descripcion}</p>
        <div className="flex items-center gap-2 mt-4 text-sm text-blue-600 font-bold bg-blue-50 w-fit px-3 py-1 rounded-full">
          <Clock size={16} /> Examen en curso
        </div>
      </div>

      {/* LISTA DE PREGUNTAS */}
      <div className="space-y-6 mb-24">
        {preguntas.map((preg, idx) => (
          <div
            key={preg.id}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"
          >
            <div className="flex items-start gap-4 mb-4">
              <span className="bg-gray-100 text-gray-600 font-bold px-3 py-1 rounded-lg text-sm whitespace-nowrap">
                {idx + 1}
              </span>
              <h3 className="text-lg font-medium text-gray-800">
                {preg.texto_pregunta}
              </h3>
            </div>

            {preg.tipo === "opcion_multiple" ? (
              <div className="space-y-3 pl-12">
                {preg.opciones.map((op) => (
                  <label
                    key={op.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      respuestas[preg.id] == op.id
                        ? "border-blue-500 bg-blue-50"
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
                className="w-full p-4 border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all min-h-[120px] ml-12 w-[calc(100%-3rem)]"
                rows="4"
                placeholder="Escribe tu respuesta detallada aquí..."
                value={respuestas[preg.id] || ""}
                onChange={(e) => handleRespuesta(preg.id, e.target.value)}
              />
            )}
          </div>
        ))}
      </div>

      {/* BOTÓN FLOTANTE */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg flex justify-end z-50">
        <button
          onClick={enviarExamen}
          className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold text-lg hover:bg-green-700 flex items-center gap-2 shadow-lg"
        >
          <Send size={20} /> Enviar Respuestas
        </button>
      </div>
    </div>
  );
};

export default TomarExamenPage;
