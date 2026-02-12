import React, { useState, useEffect, useContext } from "react";
import { useParams, Link } from "react-router-dom"; // Solo herramientas de navegación
import axios from "axios";
import { AuthContext } from "../App";
// CORRECCIÓN: 'Eye' debe estar aquí junto con los otros iconos
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
    <div className="max-w-5xl mx-auto py-6">
      {/* HEADER: Botón crear solo para Docentes */}
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <FileText className="text-blue-600" /> Evaluaciones
        </h2>
        {(user.rol === "docente" ||
          user.rol === "admin" ||
          user.rol === "maestro") && (
          <Link
            to={`/docente/grupo/${grupoId}/asignatura/${asignaturaId}/examen/crear`}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 shadow-md font-medium"
          >
            <PlusCircle size={20} /> Crear Nuevo Examen
          </Link>
        )}
      </div>

      {/* LISTA DE EXÁMENES */}
      <div className="space-y-4">
        {loading ? (
          <p className="text-gray-500 text-center py-10">Cargando...</p>
        ) : examenes.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-500">
              No hay exámenes disponibles en este momento.
            </p>
          </div>
        ) : (
          examenes.map((examen) => (
            <div
              key={examen.id}
              className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4 transition-all hover:shadow-md"
            >
              {/* Info del Examen */}
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-800 mb-1">
                  {examen.titulo}
                </h3>
                <p className="text-gray-500 text-sm mb-2">
                  {examen.descripcion || "Sin descripción"}
                </p>
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock size={14} /> Publicado:{" "}
                    {new Date(examen.fecha_creacion).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* ACCIONES (Diferentes por rol) */}
              <div>
                {/* VISTA DOCENTE */}
                {user.rol === "docente" ||
                user.rol === "admin" ||
                user.rol === "maestro" ? (
                  <div className="flex gap-2">
                    <button className="text-gray-500 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 text-sm font-medium">
                      Editar
                    </button>

                    {/* BOTÓN VER RESULTADOS CORREGIDO */}
                    <Link
                      to={`/docente/grupo/${grupoId}/asignatura/${asignaturaId}/examen/${examen.id}/resultados`}
                      className="bg-blue-50 text-blue-600 border border-blue-100 px-4 py-2 rounded-lg hover:bg-blue-100 text-sm font-bold flex items-center gap-2"
                    >
                      <Eye size={16} /> Ver Resultados
                    </Link>
                  </div>
                ) : // VISTA ALUMNO
                examen.contestado ? (
                  <div className="flex flex-col items-end">
                    <span className="text-green-600 font-bold flex items-center gap-2 bg-green-50 px-4 py-2 rounded-lg border border-green-100">
                      <CheckCircle size={20} /> Calificación:{" "}
                      {examen.calificacion}
                    </span>
                    <span className="text-xs text-gray-400 mt-1">
                      Examen completado
                    </span>
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
    </div>
  );
};

export default ExamenesPage;
