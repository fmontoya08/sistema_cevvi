import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { User, CheckCircle, Clock } from "lucide-react";

const ResultadosExamenPage = () => {
  const { examenId } = useParams();
  const [resultados, setResultados] = useState([]);

  useEffect(() => {
    const cargar = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(
          `https://api-universidad-c5o8.onrender.com/api/examenes/${examenId}/resultados`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        setResultados(res.data);
      } catch (error) {
        console.error("Error al cargar resultados");
      }
    };
    cargar();
  }, [examenId]);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Resultados de Evaluación</h2>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4 text-left">Alumno</th>
              <th className="p-4 text-left">Fecha</th>
              <th className="p-4 text-left">Calificación</th>
              <th className="p-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {resultados.map((res) => (
              // CORRECCIÓN: Usamos res.id_intento
              <tr key={res.id_intento} className="border-b hover:bg-gray-50">
                <td className="p-4 flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                    <User size={16} />
                  </div>
                  {res.nombre} {res.apellido_paterno}
                </td>
                <td className="p-4 text-gray-500 text-sm">
                  {new Date(res.fecha_intento).toLocaleString()}
                </td>
                <td className="p-4 font-bold text-gray-800">
                  {res.calificacion} pts
                </td>
                <td className="p-4 text-right">
                  {/* CORRECCIÓN: Usamos res.id_intento en el link */}
                  <Link
                    to={`/docente/examen/revisar/${res.id_intento}`}
                    className="text-blue-600 font-medium hover:underline"
                  >
                    Revisar / Calificar
                  </Link>
                </td>
              </tr>
            ))}
            {resultados.length === 0 && (
              <tr>
                <td colSpan="4" className="p-8 text-center text-gray-500">
                  Nadie ha contestado aún.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ResultadosExamenPage;
