import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FileText,
  CheckCircle,
  Users,
  Award,
  Download,
  ArrowLeft,
  Loader,
  Save,
} from "lucide-react";
import * as XLSX from "xlsx";

const AnaliticasGrupoPage = () => {
  const { grupoId, asignaturaId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- ESTADOS PARA EDICIÓN EN LÍNEA ---
  const [editingCell, setEditingCell] = useState({
    alumnoId: null,
    criterioId: null,
  });
  const [editValue, setEditValue] = useState("");
  const [isSavingCell, setIsSavingCell] = useState(false);

  const token = localStorage.getItem("token");
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  // 1. Cargar Datos
  const fetchData = useCallback(async () => {
    // No mostramos loading full si ya hay datos (para que no parpadee al guardar)
    if (!data) setLoading(true);
    try {
      const res = await axios.get(
        `https://api-universidad-c5o8.onrender.com/api/analiticas/${grupoId}/${asignaturaId}`,
        authHeaders,
      );
      setData(res.data);
    } catch (error) {
      console.error("Error cargando analíticas", error);
    } finally {
      setLoading(false);
    }
  }, [grupoId, asignaturaId]); // Quitamos 'data' de dependencias

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- LÓGICA DE EDICIÓN ---
  const handleCellClick = (alumnoId, criterioId, valorActual) => {
    setEditingCell({ alumnoId, criterioId });
    setEditValue(valorActual === "-" ? "" : valorActual);
  };

  const saveCell = async () => {
    const { alumnoId, criterioId } = editingCell;
    if (!alumnoId || !criterioId) return;

    let val = parseFloat(editValue);
    if (isNaN(val) || val < 0) val = 0;
    if (val > 100) val = 100;

    setIsSavingCell(true);
    try {
      await axios.post(
        "https://api-universidad-c5o8.onrender.com/api/docente/calificar-criterio-manual",
        {
          criterio_id: criterioId,
          calificaciones: [{ alumno_id: alumnoId, nota: val }],
        },
        authHeaders,
      );
      setEditingCell({ alumnoId: null, criterioId: null });
      await fetchData(); // Recargar para actualizar promedio
    } catch (error) {
      alert("Error al guardar.");
    } finally {
      setIsSavingCell(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") saveCell();
    if (e.key === "Escape")
      setEditingCell({ alumnoId: null, criterioId: null });
  };

  // --- EXPORTAR EXCEL ---
  const handleExportarExcel = () => {
    if (!data) return;
    const datosParaExcel = data.filas.map((alumno) => {
      const fila = {
        Estudiante: alumno.nombre,
        Matrícula: alumno.matricula,
      };
      // Tareas
      data.columnas.tareas.forEach((col) => {
        fila[`T: ${col.titulo}`] = alumno.notas[`tarea_${col.id}`] ?? "-";
      });
      // Exámenes
      data.columnas.examenes.forEach((col) => {
        fila[`Ex: ${col.titulo}`] = alumno.notas[`examen_${col.id}`] ?? "-";
      });
      // Manuales
      data.columnas.criterios
        .filter((c) => c.tipo_origen === "manual")
        .forEach((m) => {
          fila[m.nombre_criterio] = alumno.notas[`manual_${m.id}`] ?? "-";
        });

      fila["Asistencia"] = `${alumno.notas.asistencia_sys ?? 0}%`;
      fila["Promedio Final"] = alumno.promedioFinal;
      return fila;
    });

    const hoja = XLSX.utils.json_to_sheet(datosParaExcel);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Calificaciones");
    XLSX.writeFile(libro, `Reporte_Grupo_${grupoId}.xlsx`);
  };

  // Colores de notas
  const getColor = (nota) => {
    if (nota === undefined || nota === null || nota === "-")
      return "text-gray-400";
    if (nota >= 90) return "text-green-600 font-bold";
    if (nota >= 70) return "text-blue-600 font-medium";
    if (nota >= 60) return "text-yellow-600";
    return "text-red-500 font-bold";
  };

  if (loading && !data)
    return (
      <div className="p-10 text-center text-gray-500">
        Calculando estadísticas...
      </div>
    );
  if (!data)
    return (
      <div className="p-10 text-center text-gray-500">
        No hay datos disponibles.
      </div>
    );

  // Filtros
  const manuales = data.columnas.criterios.filter(
    (c) => c.tipo_origen === "manual",
  );
  const usaAsistencia = data.columnas.criterios.some(
    (c) => c.tipo_origen === "sistema_asistencia",
  );
  const promedioGrupal = (
    data.filas.reduce((acc, curr) => acc + parseFloat(curr.promedioFinal), 0) /
    (data.filas.length || 1)
  ).toFixed(1);

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-sans text-sm">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 bg-white border border-gray-300 rounded-full hover:bg-gray-100 text-gray-600"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Sábana de Calificaciones
            </h1>
            <p className="text-gray-500 text-xs">
              Visión global del rendimiento
            </p>
          </div>
        </div>
        <button
          onClick={handleExportarExcel}
          className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-100 shadow-sm transition-colors font-medium text-xs"
        >
          <Download size={16} /> Exportar Excel
        </button>
      </div>

      {/* TARJETAS RESUMEN (ESTILO DASHBOARD) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
            <Users size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-bold">Alumnos</p>
            <p className="text-2xl font-bold text-gray-800">
              {data.filas.length}
            </p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-purple-100 text-purple-600 rounded-full">
            <FileText size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-bold">
              Actividades
            </p>
            <p className="text-2xl font-bold text-gray-800">
              {data.columnas.tareas.length +
                data.columnas.examenes.length +
                manuales.length}
            </p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-yellow-100 text-yellow-600 rounded-full">
            <Award size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-bold">
              Promedio Grupal
            </p>
            <p className="text-2xl font-bold text-gray-800">{promedioGrupal}</p>
          </div>
        </div>
      </div>

      {/* TABLA PRINCIPAL - DISEÑO LIMPIO */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden flex flex-col max-h-[75vh]">
        <div className="overflow-auto custom-scrollbar">
          <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-20 shadow-sm">
              <tr>
                {/* COLUMNA FIJA: ALUMNO */}
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-30 border-r border-gray-200 min-w-[250px]">
                  Estudiante
                </th>

                {/* TAREAS */}
                {data.columnas.tareas.map((col, i) => (
                  <th
                    key={col.id}
                    className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider min-w-[100px] border-r border-gray-100"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <FileText size={12} className="text-blue-400" />
                      <span
                        className="truncate max-w-[80px]"
                        title={col.titulo}
                      >
                        T{i + 1}: {col.titulo}
                      </span>
                    </div>
                  </th>
                ))}

                {/* EXÁMENES */}
                {data.columnas.examenes.map((col, i) => (
                  <th
                    key={col.id}
                    className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider min-w-[100px] border-r border-gray-100 bg-gray-50"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <CheckCircle size={12} className="text-purple-400" />
                      <span
                        className="truncate max-w-[80px]"
                        title={col.titulo}
                      >
                        Ex{i + 1}: {col.titulo}
                      </span>
                    </div>
                  </th>
                ))}

                {/* ASISTENCIA */}
                {usaAsistencia && (
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider min-w-[80px] border-r border-gray-100 bg-gray-50">
                    % Asist
                  </th>
                )}

                {/* MANUALES (AZULES CLAROS) */}
                {manuales.map((m) => (
                  <th
                    key={m.id}
                    className="px-4 py-3 text-center text-xs font-bold text-blue-700 uppercase tracking-wider min-w-[120px] border-r border-gray-100 bg-blue-50/50"
                  >
                    <div className="flex flex-col items-center">
                      <span>{m.nombre_criterio}</span>
                      <span className="text-[9px] text-gray-400 font-normal">
                        ({m.porcentaje}%)
                      </span>
                    </div>
                  </th>
                ))}

                {/* PROMEDIO */}
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-800 uppercase tracking-wider bg-gray-100 min-w-[100px] sticky right-0 z-30 border-l border-gray-200">
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
                  {/* ALUMNO + FOTO */}
                  <td className="px-6 py-4 whitespace-nowrap sticky left-0 bg-white z-20 border-r border-gray-100">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <img
                          className="h-10 w-10 rounded-full object-cover border border-gray-200"
                          src={
                            alumno.foto_perfil
                              ? `https://api-universidad-c5o8.onrender.com/uploads/perfiles/${alumno.foto_perfil}`
                              : `https://ui-avatars.com/api/?name=${alumno.nombre}&background=random`
                          }
                          alt=""
                        />
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
                  {data.columnas.tareas.map((t) => (
                    <td
                      key={t.id}
                      className="px-4 py-4 text-center border-r border-gray-100 border-dashed text-sm"
                    >
                      <span className={getColor(alumno.notas[`tarea_${t.id}`])}>
                        {alumno.notas[`tarea_${t.id}`] ?? "-"}
                      </span>
                    </td>
                  ))}

                  {/* NOTAS EXÁMENES */}
                  {data.columnas.examenes.map((e) => (
                    <td
                      key={e.id}
                      className="px-4 py-4 text-center border-r border-gray-100 border-dashed text-sm bg-gray-50/30"
                    >
                      <span
                        className={getColor(alumno.notas[`examen_${e.id}`])}
                      >
                        {alumno.notas[`examen_${e.id}`] ?? "-"}
                      </span>
                    </td>
                  ))}

                  {/* ASISTENCIA */}
                  {usaAsistencia && (
                    <td className="px-4 py-4 text-center border-r border-gray-100 border-dashed bg-gray-50/30 text-green-700 font-bold text-sm">
                      {alumno.notas[`asistencia_sys`] ?? 0}%
                    </td>
                  )}

                  {/* EDITABLES MANUALES */}
                  {manuales.map((m) => {
                    const isEditing =
                      editingCell.alumnoId === alumno.id &&
                      editingCell.criterioId === m.id;
                    const valor = alumno.notas[`manual_${m.id}`] ?? "-";

                    return (
                      <td
                        key={m.id}
                        onClick={() =>
                          !isEditing && handleCellClick(alumno.id, m.id, valor)
                        }
                        className={`px-4 py-4 text-center border-r border-gray-100 cursor-pointer relative text-sm
                                ${isEditing ? "bg-white ring-2 ring-blue-500 z-10 p-0" : "bg-blue-50/10 hover:bg-blue-50 font-bold text-blue-900"}
                            `}
                      >
                        {isEditing ? (
                          <input
                            autoFocus
                            type="number"
                            min="0"
                            max="100"
                            className="w-full h-full text-center font-bold text-blue-900 bg-white outline-none"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={saveCell}
                            onKeyDown={handleKeyDown}
                          />
                        ) : (
                          <span>{valor}</span>
                        )}
                      </td>
                    );
                  })}

                  {/* PROMEDIO FINAL */}
                  <td className="px-4 py-4 whitespace-nowrap text-center font-bold text-gray-900 bg-gray-100 sticky right-0 z-20 border-l border-gray-200 text-lg">
                    <span
                      className={
                        alumno.promedioFinal >= 70
                          ? "text-green-600"
                          : "text-red-500"
                      }
                    >
                      {alumno.promedioFinal}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FEEDBACK DE GUARDADO */}
      {isSavingCell && (
        <div className="fixed bottom-6 right-6 bg-black text-white px-4 py-2 rounded-full shadow-xl flex items-center gap-2 text-xs z-50 animate-bounce">
          <Save size={14} /> Guardando nota...
        </div>
      )}
    </div>
  );
};

export default AnaliticasGrupoPage;
