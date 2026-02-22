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
  X,
  Edit,
  Save,
  Loader,
} from "lucide-react";
import * as XLSX from "xlsx";

const AnaliticasGrupoPage = () => {
  const { grupoId, asignaturaId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Estados para el Modal de Captura (Criterios Manuales)
  const [showModal, setShowModal] = useState(false);
  const [criterioAEditar, setCriterioAEditar] = useState(null);
  const [notasTemp, setNotasTemp] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const token = localStorage.getItem("token");
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  // 1. Cargar Datos
  const fetchData = useCallback(async () => {
    setLoading(true);
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
  }, [grupoId, asignaturaId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 2. Exportar a Excel
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

  // 3. Modal de Captura Manual
  const abrirModalManual = (criterio) => {
    setCriterioAEditar(criterio);
    const notasActuales = {};
    data.filas.forEach((f) => {
      notasActuales[f.id] = f.notas[`manual_${criterio.id}`] || "";
    });
    setNotasTemp(notasActuales);
    setShowModal(true);
  };

  const guardarManuales = async () => {
    setIsSaving(true);
    try {
      const payload = Object.keys(notasTemp).map((uid) => ({
        alumno_id: uid,
        nota: notasTemp[uid] || 0,
      }));
      await axios.post(
        "https://api-universidad-c5o8.onrender.com/api/docente/calificar-criterio-manual",
        { criterio_id: criterioAEditar.id, calificaciones: payload },
        authHeaders,
      );
      alert("Calificaciones guardadas.");
      setShowModal(false);
      fetchData();
    } catch (e) {
      alert("Error al guardar.");
    } finally {
      setIsSaving(false);
    }
  };

  // Función de color
  const getColor = (nota) => {
    if (nota === undefined || nota === null) return "text-gray-400";
    if (nota >= 90) return "text-green-600 font-bold bg-green-50 rounded px-2";
    if (nota >= 70) return "text-blue-600 font-medium";
    if (nota >= 60) return "text-yellow-600";
    return "text-red-500 font-bold bg-red-50 rounded px-2";
  };

  if (loading)
    return (
      <div className="p-10 text-center text-gray-500">
        Calculando estadísticas...
      </div>
    );
  if (!data)
    return (
      <div className="p-10 text-center text-red-500">
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

  // Cálculo Promedio Grupal
  const promedioGrupal = (
    data.filas.reduce((acc, curr) => acc + parseFloat(curr.promedioFinal), 0) /
    (data.filas.length || 1)
  ).toFixed(1);

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-sans">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 bg-white border rounded-full hover:bg-gray-100 text-gray-600"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Sábana de Calificaciones
            </h1>
            <p className="text-gray-500 text-sm">
              Visión global del rendimiento
            </p>
          </div>
        </div>

        <button
          onClick={handleExportarExcel}
          className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-100 shadow-sm transition-colors text-sm font-medium"
        >
          <Download size={18} /> Exportar Excel
        </button>
      </div>

      {/* TARJETAS RESUMEN (DISEÑO LIMPIO) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Alumnos</p>
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
            <p className="text-sm text-gray-500">Actividades</p>
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
            <p className="text-sm text-gray-500">Promedio Grupal</p>
            <p className="text-2xl font-bold text-gray-800">{promedioGrupal}</p>
          </div>
        </div>
      </div>

      {/* TABLA PRINCIPAL - CON SCROLL Y DISEÑO LIMPIO */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden flex flex-col">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {/* COLUMNA FIJA: ALUMNO */}
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-20 border-r border-gray-200 min-w-[250px] shadow-sm">
                  Estudiante
                </th>

                {/* TAREAS */}
                {data.columnas.tareas.map((col, i) => (
                  <th
                    key={col.id}
                    className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider min-w-[100px] border-r border-gray-100"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-blue-400">T{i + 1}</span>
                      <span
                        className="truncate max-w-[80px] font-normal"
                        title={col.titulo}
                      >
                        {col.titulo}
                      </span>
                    </div>
                  </th>
                ))}

                {/* EXÁMENES */}
                {data.columnas.examenes.map((col, i) => (
                  <th
                    key={col.id}
                    className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider min-w-[100px] border-r border-gray-100 bg-gray-50/50"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-purple-400">Ex{i + 1}</span>
                      <span
                        className="truncate max-w-[80px] font-normal"
                        title={col.titulo}
                      >
                        {col.titulo}
                      </span>
                    </div>
                  </th>
                ))}

                {/* ASISTENCIA */}
                {usaAsistencia && (
                  <th className="px-4 py-3 text-center text-xs font-bold text-green-600 uppercase tracking-wider bg-green-50/30 min-w-[80px] border-r border-gray-100">
                    Asist %
                  </th>
                )}

                {/* MANUALES (PROYECTOS) - CON BOTÓN DE EDICIÓN */}
                {manuales.map((m) => (
                  <th
                    key={m.id}
                    className="px-4 py-3 text-center text-xs font-bold text-blue-600 uppercase tracking-wider bg-blue-50/30 min-w-[120px] border-r border-gray-100 group"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span>{m.nombre_criterio}</span>
                      <span className="text-[10px] font-normal text-gray-400">
                        {m.porcentaje}%
                      </span>
                      <button
                        onClick={() => abrirModalManual(m)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-blue-200 text-blue-600 text-[10px] px-2 py-0.5 rounded shadow-sm flex items-center gap-1 hover:bg-blue-50"
                      >
                        <Edit size={10} /> Editar
                      </button>
                    </div>
                  </th>
                ))}

                {/* PROMEDIO FINAL */}
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-800 uppercase tracking-wider bg-gray-100 min-w-[100px] sticky right-0 z-20 shadow-sm border-l border-gray-200">
                  Promedio
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 text-sm">
              {data.filas.map((alumno) => (
                <tr
                  key={alumno.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  {/* ALUMNO (FOTO + NOMBRE) */}
                  <td className="px-6 py-4 whitespace-nowrap sticky left-0 bg-white z-10 border-r border-gray-200">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-9 w-9">
                        <img
                          className="h-9 w-9 rounded-full object-cover border border-gray-200"
                          src={
                            alumno.foto_perfil
                              ? `https://api-universidad-c5o8.onrender.com/uploads/perfiles/${alumno.foto_perfil}`
                              : `https://ui-avatars.com/api/?name=${alumno.nombre}&background=random`
                          }
                          alt=""
                        />
                      </div>
                      <div className="ml-3">
                        <div className="font-medium text-gray-900">
                          {alumno.nombre}
                        </div>
                        <div className="text-xs text-gray-500 font-mono">
                          {alumno.matricula}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* NOTAS TAREAS */}
                  {data.columnas.tareas.map((t) => (
                    <td
                      key={t.id}
                      className="px-4 py-4 text-center border-r border-gray-100 border-dashed"
                    >
                      <span className={getColor(alumno.notas[`tarea_${t.id}`])}>
                        {alumno.notas[`tarea_${t.id}`] ?? "-"}
                      </span>
                    </td>
                  ))}

                  {/* NOTAS EXÁMENES */}
                  {data.columnas.examenes.map((ex) => (
                    <td
                      key={ex.id}
                      className="px-4 py-4 text-center border-r border-gray-100 border-dashed bg-gray-50/30"
                    >
                      <span
                        className={getColor(alumno.notas[`examen_${ex.id}`])}
                      >
                        {alumno.notas[`examen_${ex.id}`] ?? "-"}
                      </span>
                    </td>
                  ))}

                  {/* ASISTENCIA */}
                  {usaAsistencia && (
                    <td className="px-4 py-4 text-center border-r border-gray-100 border-dashed bg-green-50/10 font-medium text-green-700">
                      {alumno.notas[`asistencia_sys`] ?? 0}%
                    </td>
                  )}

                  {/* MANUALES */}
                  {manuales.map((m) => (
                    <td
                      key={m.id}
                      className="px-4 py-4 text-center border-r border-gray-100 border-dashed bg-blue-50/10 font-bold text-blue-800"
                    >
                      {alumno.notas[`manual_${m.id}`] ?? "-"}
                    </td>
                  ))}

                  {/* PROMEDIO FINAL */}
                  <td className="px-4 py-4 text-center font-bold text-gray-900 bg-gray-50 sticky right-0 z-10 border-l border-gray-200">
                    <span
                      className={`text-lg ${alumno.promedioFinal >= 70 ? "text-green-600" : "text-red-500"}`}
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

      {/* MODAL CAPTURA */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95">
            <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
              <div>
                <h3 className="font-bold text-gray-800">
                  Calificar: {criterioAEditar?.nombre_criterio}
                </h3>
                <p className="text-xs text-gray-500">
                  Ingresa valores de 0 a 100
                </p>
              </div>
              <button onClick={() => setShowModal(false)}>
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <div className="space-y-2">
                {data.filas.map((f) => (
                  <div
                    key={f.id}
                    className="flex justify-between items-center bg-white border border-gray-200 p-3 rounded-lg shadow-sm"
                  >
                    <span className="text-gray-700 text-sm font-medium">
                      {f.nombre}
                    </span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="w-16 p-1 border rounded text-center font-bold focus:ring-2 focus:ring-blue-500 outline-none text-lg"
                      placeholder="-"
                      value={notasTemp[f.id]}
                      onChange={(e) =>
                        setNotasTemp({ ...notasTemp, [f.id]: e.target.value })
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg text-sm font-bold"
              >
                Cancelar
              </button>
              <button
                onClick={guardarManuales}
                disabled={isSaving}
                className="bg-[#a72a34] text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-[#8f242d] shadow-sm disabled:opacity-70 flex items-center gap-2"
              >
                {isSaving && <Loader size={14} className="animate-spin" />}{" "}
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnaliticasGrupoPage;
