import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { ArrowLeft } from "lucide-react";

const RevisarExamenPage = () => {
  const { intentoId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [puntosInputs, setPuntosInputs] = useState({});

  useEffect(() => {
    cargarIntento();
  }, [intentoId]);

  useEffect(() => {
    if (data?.respuestas) {
      const initial = {};
      data.respuestas.forEach((r) => {
        initial[r.id] = String(r.puntos_obtenidos ?? 0);
      });
      setPuntosInputs(initial);
    }
  }, [data]);

  const obtenerToken = () => {
    try {
      return localStorage.getItem("token");
    } catch {
      return null;
    }
  };

  const cargarIntento = async () => {
    try {
      const token = obtenerToken();
      const res = await axios.get(
        `https://api-universidad-c5o8.onrender.com/api/intentos/${intentoId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setData(res.data);
    } catch (error) {
      console.error(error);
      alert("Error al cargar la revisión");
    }
  };

  const actualizarPuntos = async (respuestaId, puntosInput, maximos) => {
    const puntos = parseFloat(puntosInput);
    if (isNaN(puntos) || puntos > maximos)
      return alert(`No puedes dar más de ${maximos} puntos.`);

    try {
      const token = obtenerToken();
      await axios.put(
        `https://api-universidad-c5o8.onrender.com/api/examenes/calificar-pregunta`,
        {
          respuestaId,
          puntosNuevos: puntos,
          intentoId,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      cargarIntento(); // Recargar para ver el nuevo total
    } catch (error) {
      alert("Error al actualizar nota");
    }
  };

  if (!data)
    return <div className="p-10 text-center">Cargando revisión...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-50 min-h-screen">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 flex items-center gap-2 text-gray-500 hover:text-gray-800"
      >
        <ArrowLeft size={20} /> Volver a la lista
      </button>

      <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-600 mb-6 flex justify-between items-center">
        <div>
          {/* Usamos data.info para acceder a los detalles generales */}
          <h1 className="text-2xl font-bold">{data?.info?.titulo}</h1>
          <p className="text-gray-600">
            Alumno: {data?.info?.nombre ?? "Desconocido"} {data?.info?.apellido_paterno ?? ""}
          </p>
        </div>
        <div className="text-right">
          <span className="block text-sm text-gray-400">
            Calificación Final
          </span>
          <span className="text-4xl font-bold text-blue-600">
            {data?.info?.calificacion ?? "N/A"}
          </span>
        </div>
      </div>

      <div className="space-y-6">
        {(data?.respuestas ?? []).map((resp, idx) => (
          <div
            key={resp.id}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"
          >
            <div className="flex justify-between mb-4">
              <h3 className="font-bold text-gray-800">
                Pregunta {idx + 1}: {resp.texto_pregunta}
              </h3>
              <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                Valor Máximo: {resp.puntos} pts
              </span>
            </div>

            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">
                Respuesta del Alumno:
              </p>
              {resp.tipo === "opcion_multiple" ? (
                <p className="font-medium text-gray-800">
                  {resp.texto_opcion || "(Sin respuesta válida)"}
                </p>
              ) : (
                <p className="font-medium text-gray-800 whitespace-pre-wrap">
                  {resp.respuesta_texto}
                </p>
              )}
            </div>

            <div className="flex items-center gap-4 justify-end border-t pt-4">
              <label className="text-sm font-bold text-gray-600">
                Puntos asignados:
              </label>
              <input
                type="number"
                className="w-20 p-2 border rounded text-center font-bold"
                value={puntosInputs[resp.id] ?? resp.puntos_obtenidos}
                onChange={(e) =>
                  setPuntosInputs({ ...puntosInputs, [resp.id]: e.target.value })
                }
                onBlur={() =>
                  actualizarPuntos(resp.id, puntosInputs[resp.id], resp.puntos)
                }
              />
              <span className="text-gray-400 text-sm">/ {resp.puntos}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RevisarExamenPage;
