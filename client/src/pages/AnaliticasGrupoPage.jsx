import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, X, Edit, Save, Loader } from "lucide-react";

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

  // 1. Cargar la Sábana Completa
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `https://api-universidad-c5o8.onrender.com/api/analiticas/${grupoId}/${asignaturaId}`,
        authHeaders,
      );
      setData(res.data);
    } catch (error) {
      console.error(error);
      alert("Error al cargar las calificaciones.");
    } finally {
      setLoading(false);
    }
  }, [grupoId, asignaturaId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 2. Abrir Modal para calificar un criterio manual (ej: Proyecto)
  const abrirModalManual = (criterio) => {
    setCriterioAEditar(criterio);

    // Pre-llenar los inputs con las notas que ya existen en la tabla
    const notasActuales = {};
    data.filas.forEach((fila) => {
      // Buscamos la nota en el objeto 'notas' que viene del backend
      // La clave en el backend es: manual_{id}
      notasActuales[fila.id] = fila.notas[`manual_${criterio.id}`] || "";
    });

    setNotasTemp(notasActuales);
    setShowModal(true);
  };

  // 3. Guardar las notas manuales en el servidor
  const guardarManuales = async () => {
    setIsSaving(true);
    try {
      const payload = Object.keys(notasTemp).map((alumnoId) => ({
        alumno_id: alumnoId,
        nota: notasTemp[alumnoId] || 0,
      }));

      await axios.post(
        "https://api-universidad-c5o8.onrender.com/api/docente/calificar-criterio-manual",
        {
          criterio_id: criterioAEditar.id,
          calificaciones: payload,
        },
        authHeaders,
      );

      alert("Calificaciones guardadas con éxito.");
      setShowModal(false);
      fetchData(); // Recargar la tabla para ver el nuevo promedio
    } catch (error) {
      console.error(error);
      alert("Error al guardar las notas.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading)
    return (
      <div className="p-10 text-center text-gray-500">
        Cargando sábana de calificaciones...
      </div>
    );
  if (!data)
    return (
      <div className="p-10 text-center text-red-500">
        No hay datos disponibles.
      </div>
    );

  // Filtros para saber qué columnas pintar
  const manuales = data.columnas.criterios.filter(
    (c) => c.tipo_origen === "manual",
  );
  const usaAsistencia = data.columnas.criterios.some(
    (c) => c.tipo_origen === "sistema_asistencia",
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-sans text-sm">
      {/* HEADER */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 bg-white border border-gray-300 rounded-full hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Sábana de Calificaciones
          </h1>
          <p className="text-xs text-gray-500">
            Vista detallada y cálculo de promedios
          </p>
        </div>
      </div>

      {/* TABLA SÁBANA (Scroll Horizontal) */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden flex flex-col max-h-[80vh]">
        <div className="overflow-auto custom-scrollbar">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-20 shadow-sm">
              <tr className="bg-gray-900 text-white text-xs uppercase tracking-wider">
                {/* Columna Fija: Alumno */}
                <th className="p-3 text-left sticky left-0 bg-gray-900 z-30 w-64 border-r border-gray-700 shadow-md">
                  Alumno
                </th>

                {/* 1. TAREAS */}
                {data.columnas.tareas.map((t, i) => (
                  <th
                    key={t.id}
                    className="p-2 text-center min-w-[80px] border-r border-gray-700 group relative"
                  >
                    <span className="block font-bold">T{i + 1}</span>
                    <span
                      className="text-[9px] text-gray-400 normal-case truncate max-w-[80px] block"
                      title={t.titulo}
                    >
                      {t.titulo}
                    </span>
                  </th>
                ))}

                {/* 2. EXÁMENES */}
                {data.columnas.examenes.map((ex, i) => (
                  <th
                    key={ex.id}
                    className="p-2 text-center min-w-[80px] border-r border-gray-700 bg-gray-800"
                  >
                    <span className="block font-bold text-yellow-400">
                      Ex{i + 1}
                    </span>
                    <span
                      className="text-[9px] text-gray-400 normal-case truncate max-w-[80px] block"
                      title={ex.titulo}
                    >
                      {ex.titulo}
                    </span>
                  </th>
                ))}

                {/* 3. ASISTENCIA */}
                {usaAsistencia && (
                  <th className="p-2 text-center min-w-[80px] border-r border-gray-700 bg-gray-800">
                    <span className="block font-bold text-green-400">
                      % Asist
                    </span>
                  </th>
                )}

                {/* 4. CRITERIOS MANUALES (PROYECTOS, ETC) */}
                {manuales.map((m) => (
                  <th
                    key={m.id}
                    className="p-2 text-center min-w-[120px] border-r border-gray-700 bg-blue-900"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="font-bold text-blue-200">
                        {m.nombre_criterio}
                      </span>
                      <span className="text-[9px] text-blue-300">
                        {m.porcentaje}%
                      </span>
                      {/* BOTÓN CAPTURAR */}
                      <button
                        onClick={() => abrirModalManual(m)}
                        className="mt-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded flex items-center gap-1 transition-colors"
                      >
                        <Edit size={10} /> Capturar
                      </button>
                    </div>
                  </th>
                ))}

                {/* Columna Fija: Promedio */}
                <th className="p-3 text-center sticky right-0 bg-gray-900 z-30 w-24 border-l border-gray-700 shadow-md">
                  PROMEDIO
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {data.filas.map((f) => (
                <tr
                  key={f.id}
                  className="hover:bg-blue-50/30 transition-colors"
                >
                  {/* Nombre Alumno */}
                  <td className="p-3 sticky left-0 bg-white border-r border-gray-200 z-10 font-medium text-gray-900 shadow-sm">
                    {f.nombre}
                    <div className="text-xs text-gray-400 font-normal font-mono">
                      {f.matricula}
                    </div>
                  </td>

                  {/* Notas Tareas */}
                  {data.columnas.tareas.map((t) => (
                    <td
                      key={t.id}
                      className="p-2 text-center border-r border-gray-100"
                    >
                      {f.notas[`tarea_${t.id}`] !== undefined ? (
                        f.notas[`tarea_${t.id}`]
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                  ))}

                  {/* Notas Exámenes */}
                  {data.columnas.examenes.map((ex) => (
                    <td
                      key={ex.id}
                      className="p-2 text-center border-r border-gray-100 bg-gray-50/50 font-semibold"
                    >
                      {f.notas[`examen_${ex.id}`] !== undefined ? (
                        f.notas[`examen_${ex.id}`]
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                  ))}

                  {/* Nota Asistencia */}
                  {usaAsistencia && (
                    <td className="p-2 text-center border-r border-gray-100 bg-gray-50/50 text-green-700 font-bold">
                      {f.notas[`asistencia_sys`] ?? 0}%
                    </td>
                  )}

                  {/* Notas Manuales */}
                  {manuales.map((m) => (
                    <td
                      key={m.id}
                      className="p-2 text-center border-r border-gray-100 bg-blue-50/30 font-bold text-blue-800"
                    >
                      {f.notas[`manual_${m.id}`] ?? (
                        <span className="text-gray-300 font-normal">0</span>
                      )}
                    </td>
                  ))}

                  {/* Promedio Final */}
                  <td
                    className={`p-3 text-center sticky right-0 z-10 font-black text-white shadow-md ${f.promedio >= 70 ? "bg-green-500" : "bg-red-500"}`}
                  >
                    {f.promedio}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL FLOTANTE PARA CAPTURAR NOTAS MANUALES --- */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95">
            {/* Header Modal */}
            <div className="p-4 bg-blue-900 text-white flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-bold text-lg">
                  Calificar: {criterioAEditar?.nombre_criterio}
                </h3>
                <p className="text-xs text-blue-200">
                  Ingresa la calificación (0-100)
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="hover:text-red-300 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Lista Alumnos (Scrollable) */}
            <div className="p-4 overflow-y-auto flex-1 bg-gray-50">
              <div className="space-y-2">
                {data.filas.map((f) => (
                  <div
                    key={f.id}
                    className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-200 shadow-sm"
                  >
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-700 text-sm">
                        {f.nombre}
                      </span>
                      <span className="text-xs text-gray-400">
                        {f.matricula}
                      </span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="w-20 p-2 border border-gray-300 rounded-lg text-center font-bold text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      placeholder="0"
                      value={notasTemp[f.id]}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (
                          val === "" ||
                          (parseInt(val) >= 0 && parseInt(val) <= 100)
                        ) {
                          setNotasTemp({ ...notasTemp, [f.id]: val });
                        }
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Modal */}
            <div className="p-4 bg-white border-t border-gray-100 flex justify-end gap-3 shrink-0">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-bold text-sm transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={guardarManuales}
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg disabled:opacity-70 transition-all active:scale-95"
              >
                {isSaving ? (
                  <Loader className="animate-spin" size={18} />
                ) : (
                  <Save size={18} />
                )}
                {isSaving ? "Guardando..." : "Guardar Notas"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnaliticasGrupoPage;
