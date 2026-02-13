import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { FileText, CheckCircle, Users, Award, Download } from "lucide-react";

const AnaliticasGrupoPage = () => {
  const { grupoId, asignaturaId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargarAnaliticas = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(
          `https://api-universidad-c5o8.onrender.com/api/analiticas/${grupoId}/${asignaturaId}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        setData(res.data);
      } catch (error) {
        console.error("Error cargando analíticas", error);
      } finally {
        setLoading(false);
      }
    };
    cargarAnaliticas();
  }, [grupoId, asignaturaId]);

  if (loading)
    return <div className="p-10 text-center">Calculando estadísticas...</div>;
  if (!data)
    return <div className="p-10 text-center">No hay datos disponibles.</div>;

  // Función para pintar celdas según calificación
  const getColor = (nota) => {
    if (nota >= 90) return "text-green-600 font-bold bg-green-50";
    if (nota >= 70) return "text-blue-600 font-medium";
    if (nota >= 60) return "text-yellow-600";
    return "text-red-500 font-bold bg-red-50";
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Sábana de Calificaciones
          </h1>
          <p className="text-gray-500">
            Visión global del rendimiento del grupo
          </p>
        </div>

        {/* Botón decorativo (funcionalidad futura: exportar a Excel) */}
        <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-100 shadow-sm">
          <Download size={18} /> Exportar
        </button>
      </div>

      {/* TARJETAS RESUMEN */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Alumnos</p>
            <p className="text-2xl font-bold">{data.filas.length}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-purple-100 text-purple-600 rounded-full">
            <FileText size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Actividades</p>
            <p className="text-2xl font-bold">
              {data.columnasTareas.length + data.columnasExamenes.length}
            </p>
          </div>
        </div>
        {/* Calculamos promedio grupal */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-yellow-100 text-yellow-600 rounded-full">
            <Award size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Promedio Grupal</p>
            <p className="text-2xl font-bold">
              {(
                data.filas.reduce(
                  (acc, curr) => acc + parseFloat(curr.promedio),
                  0,
                ) / (data.filas.length || 1)
              ).toFixed(1)}
            </p>
          </div>
        </div>
      </div>

      {/* TABLA PRINCIPAL - CON SCROLL HORIZONTAL */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {/* COLUMNA FIJA: ALUMNO */}
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10 border-r border-gray-200 min-w-[250px]">
                  Estudiante
                </th>

                {/* COLUMNAS DE TAREAS */}
                {data.columnasTareas.map((col) => (
                  <th
                    key={`th-tarea-${col.id}`}
                    className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider min-w-[120px]"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <FileText size={14} className="text-blue-400" />
                      <span
                        className="truncate max-w-[100px]"
                        title={col.titulo}
                      >
                        {col.titulo}
                      </span>
                    </div>
                  </th>
                ))}

                {/* COLUMNAS DE EXÁMENES */}
                {data.columnasExamenes.map((col) => (
                  <th
                    key={`th-examen-${col.id}`}
                    className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider min-w-[120px]"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <CheckCircle size={14} className="text-green-400" />
                      <span
                        className="truncate max-w-[100px]"
                        title={col.titulo}
                      >
                        {col.titulo}
                      </span>
                    </div>
                  </th>
                ))}

                {/* COLUMNAS FINALES */}
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider bg-yellow-50 min-w-[100px]">
                  Asistencia
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-800 uppercase tracking-wider bg-gray-100 min-w-[100px]">
                  Promedio
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.filas.map((alumno) => (
                <tr
                  key={alumno.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  {/* ALUMNO */}
                  <td className="px-6 py-4 whitespace-nowrap sticky left-0 bg-white z-10 border-r border-gray-100">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-xs">
                        {alumno.nombre.charAt(0)}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {alumno.nombre}
                        </div>
                        <div className="text-xs text-gray-500">
                          {alumno.matricula}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* NOTAS TAREAS */}
                  {alumno.tareas.map((t) => (
                    <td
                      key={`nota-t-${t.id}`}
                      className="px-4 py-4 whitespace-nowrap text-center text-sm border-r border-dashed border-gray-100"
                    >
                      <span className={getColor(t.nota)}>{t.nota || "-"}</span>
                    </td>
                  ))}

                  {/* NOTAS EXÁMENES */}
                  {alumno.examenes.map((e) => (
                    <td
                      key={`nota-e-${e.id}`}
                      className="px-4 py-4 whitespace-nowrap text-center text-sm border-r border-dashed border-gray-100"
                    >
                      <span className={getColor(e.nota)}>{e.nota || "-"}</span>
                    </td>
                  ))}

                  {/* ASISTENCIA */}
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        alumno.asistencia >= 80
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {alumno.asistencia}%
                    </span>
                  </td>

                  {/* PROMEDIO FINAL */}
                  <td className="px-4 py-4 whitespace-nowrap text-center font-bold text-gray-900 bg-gray-50 text-lg">
                    {alumno.promedio}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AnaliticasGrupoPage;
