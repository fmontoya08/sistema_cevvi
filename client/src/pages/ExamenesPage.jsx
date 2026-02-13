import React, { useState, useEffect, useContext } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { AuthContext } from "../App";
import {
  PlusCircle,
  FileText,
  PlayCircle,
  CheckCircle,
  Clock,
  Eye,
} from "lucide-react";

const ExamenesPage = () => {
  const { grupoId, asignaturaId } = useParams();
  const { user } = useContext(AuthContext);
  const [examenes, setExamenes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Cargar lista
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(
          `https://api-universidad-c5o8.onrender.com/api/examenes/${grupoId}/${asignaturaId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        setExamenes(res.data);
      } catch (error) {
        console.error("Error al cargar exámenes");
      } finally {
        setLoading(false);
      }
    };
    cargarDatos();
  }, [grupoId, asignaturaId]);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Exámenes del Curso</h2>
        {user.rol === "docente" && (
          <Link
            to={`/docente/grupo/${grupoId}/asignatura/${asignaturaId}/examen/crear`}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <PlusCircle size={20} /> Crear Examen
          </Link>
        )}
      </div>

      {loading ? (
        <div className="text-center p-10 text-gray-500">Cargando...</div>
      ) : (
        <div className="space-y-4">
          {examenes.length === 0 ? (
            <div className="text-center p-10 bg-gray-50 rounded-xl border border-dashed border-gray-300">
              <FileText size={40} className="mx-auto text-gray-300 mb-2" />
              <p className="text-gray-500">No hay exámenes creados aún.</p>
            </div>
          ) : (
            examenes.map((examen) => (
              <div
                key={examen.id}
                className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center hover:shadow-md transition-shadow"
              >
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-1">
                    {examen.titulo}
                  </h3>
                  <p className="text-gray-500 text-sm mb-3">
                    {examen.descripcion}
                  </p>
                  <div className="flex gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock size={14} /> Publicado:{" "}
                      {new Date(examen.fecha_creacion).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div>
                  {/* REEMPLAZA LA SECCIÓN DE "VISTA ALUMNO" CON ESTO: */}

                  {user.rol === "docente" ? (
                    <div className="flex gap-2">
                      <Link
                        to={`/docente/grupo/${grupoId}/asignatura/${asignaturaId}/examen/${examen.id}/resultados`}
                        className="bg-blue-50 text-blue-600 border border-blue-100 px-4 py-2 rounded-lg hover:bg-blue-100 text-sm font-bold flex items-center gap-2"
                      >
                        <Eye size={16} /> Ver Resultados
                      </Link>
                    </div>
                  ) : // VISTA ALUMNO MEJORADA
                  examen.contestado ? (
                    <div className="flex flex-col items-end">
                      {/* LÓGICA DE ESTADOS: */}
                      {examen.estado === "calificado" ? (
                        // CASO A: Ya revisado por el docente -> Muestra NOTA ENTERA
                        <>
                          <span className="text-green-600 font-bold flex items-center gap-2 bg-green-50 px-4 py-2 rounded-lg border border-green-100">
                            <CheckCircle size={20} /> Calificación:{" "}
                            {Math.round(examen.calificacion)}
                          </span>
                          <span className="text-xs text-green-600 mt-1">
                            Examen Calificado
                          </span>
                        </>
                      ) : (
                        // CASO B: Aún no revisado -> Muestra TEXTO "ENVIADO"
                        <>
                          <span className="text-yellow-600 font-bold flex items-center gap-2 bg-yellow-50 px-4 py-2 rounded-lg border border-yellow-100">
                            <Clock size={20} /> Enviado
                          </span>
                          <span className="text-xs text-gray-400 mt-1">
                            Esperando revisión del docente
                          </span>
                        </>
                      )}
                    </div>
                  ) : (
                    <Link
                      to={`/alumno/examen/${examen.id}/resolver`}
                      className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 shadow-lg flex items-center gap-2 transform active:scale-95 transition-transform"
                    >
                      <PlayCircle size={20} /> Contestar Examen
                    </Link>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default ExamenesPage;
