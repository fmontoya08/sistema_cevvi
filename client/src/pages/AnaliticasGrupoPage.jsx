import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, X, Edit, Save, Loader } from "lucide-react";

const AnaliticasGrupoPage = () => {
  const { grupoId, asignaturaId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modal captura
  const [showModal, setShowModal] = useState(false);
  const [criterioAEditar, setCriterioAEditar] = useState(null);
  const [notasTemp, setNotasTemp] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const token = localStorage.getItem("token");
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `https://api-universidad-c5o8.onrender.com/api/analiticas/${grupoId}/${asignaturaId}`,
        authHeaders,
      );
      setData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [grupoId, asignaturaId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
      alert("Guardado exitosamente.");
      setShowModal(false);
      fetchData();
    } catch (e) {
      alert("Error al guardar.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading)
    return <div className="p-10 text-center text-gray-400">Cargando...</div>;
  if (!data)
    return <div className="p-10 text-center text-gray-400">No hay datos.</div>;

  const manuales = data.columnas.criterios.filter(
    (c) => c.tipo_origen === "manual",
  );
  const usaAsistencia = data.columnas.criterios.some(
    (c) => c.tipo_origen === "sistema_asistencia",
  );

  return (
    <div className="p-6 bg-white min-h-screen font-sans text-sm">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-gray-800">
          Sábana de Calificaciones
        </h1>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-semibold border-b border-gray-200">
              <tr>
                <th className="p-3 text-left w-64 border-r border-gray-200 bg-gray-50 sticky left-0 z-10">
                  Alumno
                </th>

                {/* TAREAS */}
                {data.columnas.tareas.map((t, i) => (
                  <th
                    key={t.id}
                    className="p-2 border-r border-gray-200 text-center min-w-[80px]"
                    title={t.titulo}
                  >
                    T{i + 1}
                  </th>
                ))}

                {/* EXÁMENES */}
                {data.columnas.examenes.map((ex, i) => (
                  <th
                    key={ex.id}
                    className="p-2 border-r border-gray-200 text-center min-w-[80px] text-purple-600"
                    title={ex.titulo}
                  >
                    Ex{i + 1}
                  </th>
                ))}

                {/* ASISTENCIA */}
                {usaAsistencia && (
                  <th className="p-2 border-r border-gray-200 text-center text-green-600 w-20">
                    % Asist
                  </th>
                )}

                {/* MANUALES (PROYECTOS) */}
                {manuales.map((m) => (
                  <th
                    key={m.id}
                    className="p-2 border-r border-gray-200 text-center min-w-[120px] bg-blue-50/50"
                  >
                    <div className="flex flex-col items-center">
                      <span className="text-blue-700">{m.nombre_criterio}</span>
                      <span className="text-[10px] text-gray-400 font-normal">
                        {m.porcentaje}%
                      </span>
                      <button
                        onClick={() => abrirModalManual(m)}
                        className="mt-1 text-blue-600 hover:text-blue-800 text-[10px] underline"
                      >
                        Capturar
                      </button>
                    </div>
                  </th>
                ))}

                <th className="p-3 text-center w-24 bg-gray-100 font-bold sticky right-0 z-10 border-l border-gray-200">
                  Promedio
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {data.filas.map((f) => (
                <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-3 sticky left-0 bg-white border-r border-gray-200 z-10 font-medium">
                    {f.nombre}
                  </td>

                  {/* Notas */}
                  {data.columnas.tareas.map((t) => (
                    <td
                      key={t.id}
                      className="p-2 text-center border-r border-gray-100"
                    >
                      {f.notas[`tarea_${t.id}`] ?? "-"}
                    </td>
                  ))}
                  {data.columnas.examenes.map((ex) => (
                    <td
                      key={ex.id}
                      className="p-2 text-center border-r border-gray-100 font-medium"
                    >
                      {f.notas[`examen_${ex.id}`] ?? "-"}
                    </td>
                  ))}
                  {usaAsistencia && (
                    <td className="p-2 text-center border-r border-gray-100 text-green-700">
                      {f.notas[`asistencia_sys`] ?? 0}%
                    </td>
                  )}
                  {manuales.map((m) => (
                    <td
                      key={m.id}
                      className="p-2 text-center border-r border-gray-100 bg-blue-50/20 font-bold text-blue-800"
                    >
                      {f.notas[`manual_${m.id}`] ?? "-"}
                    </td>
                  ))}

                  {/* Promedio */}
                  <td
                    className={`p-3 text-center sticky right-0 bg-white z-10 font-bold border-l border-gray-200 ${f.promedioFinal >= 70 ? "text-green-600" : "text-red-500"}`}
                  >
                    {f.promedioFinal}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800">
                Calificar: {criterioAEditar?.nombre_criterio}
              </h3>
              <button onClick={() => setShowModal(false)}>
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <div className="space-y-2">
                {data.filas.map((f) => (
                  <div
                    key={f.id}
                    className="flex justify-between items-center border-b border-gray-100 pb-2"
                  >
                    <span className="text-gray-700 text-sm font-medium w-2/3 truncate">
                      {f.nombre}
                    </span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="w-16 p-1 border rounded text-center font-bold focus:ring-2 focus:ring-blue-500 outline-none"
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
                className="bg-[#a72a34] text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-[#8f242d] shadow-sm disabled:opacity-70"
              >
                {isSaving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnaliticasGrupoPage;
