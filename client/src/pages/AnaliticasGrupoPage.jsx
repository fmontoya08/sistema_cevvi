import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, Save, Edit3, Award } from "lucide-react";

const AnaliticasGrupoPage = () => {
  const { grupoId, asignaturaId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Estados para el Modal de Captura Manual
  const [showModal, setShowModal] = useState(false);
  const [criterioSeleccionado, setCriterioSeleccionado] = useState(""); // ID del criterio
  const [notasManuales, setNotasManuales] = useState({}); // { alumnoId: nota }
  const [isSaving, setIsSaving] = useState(false);

  const token = localStorage.getItem("token");
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  // 1. Cargar Datos (Sábana completa)
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
    } finally {
      setLoading(false);
    }
  }, [grupoId, asignaturaId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 2. Manejar apertura del modal
  const abrirCaptura = () => {
    // Buscar si hay criterios manuales
    const manuales = data.criterios.filter((c) => c.tipo_origen === "manual");
    if (manuales.length === 0) {
      return alert(
        "No has configurado criterios manuales (ej: Proyecto, Exposición) en 'Editar Curso'.",
      );
    }
    setCriterioSeleccionado(manuales[0].id); // Seleccionar el primero por defecto
    setShowModal(true);
  };

  // 3. Guardar las notas manuales
  const guardarNotasManuales = async () => {
    setIsSaving(true);
    try {
      // Convertir objeto a array para el backend
      const calificacionesArray = Object.keys(notasManuales).map((uid) => ({
        alumno_id: uid,
        nota: notasManuales[uid],
      }));

      await axios.post(
        "https://api-universidad-c5o8.onrender.com/api/docente/calificar-criterio-manual",
        {
          criterio_id: criterioSeleccionado,
          calificaciones: calificacionesArray,
        },
        authHeaders,
      );
      alert("Notas guardadas. El promedio se actualizará.");
      setShowModal(false);
      setNotasManuales({});
      fetchData(); // Recargar la sábana
    } catch (error) {
      alert("Error al guardar.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading)
    return <div className="p-10 text-center">Calculando promedios...</div>;
  if (!data)
    return <div className="p-10 text-center">Error al cargar datos.</div>;

  // Filtramos criterios manuales para el select del modal
  const criteriosManuales = data.criterios.filter(
    (c) => c.tipo_origen === "manual",
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 bg-white border rounded-full hover:bg-gray-100"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-gray-800">
            Sábana de Calificaciones
          </h1>
        </div>

        {/* BOTÓN PARA CALIFICAR PROYECTOS/EXPOSICIONES */}
        <button
          onClick={abrirCaptura}
          className="flex items-center gap-2 bg-[#a72a34] text-white px-4 py-2 rounded-lg font-bold hover:bg-[#8f242d] shadow-md transition-transform active:scale-95"
        >
          <Edit3 size={18} /> Capturar Notas Manuales
        </button>
      </div>

      {/* TABLA PRINCIPAL (SÁBANA) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-100 text-gray-600 uppercase font-bold">
            <tr>
              <th className="p-4 w-64 sticky left-0 bg-gray-100 z-10">
                Alumno
              </th>

              {/* Columnas Dinámicas según Criterios */}
              {data.criterios.map((crit) => (
                <th
                  key={crit.id}
                  className="p-4 text-center min-w-[120px] border-l border-gray-200"
                >
                  {crit.nombre_criterio} <br />
                  <span className="text-xs text-[#a72a34]">
                    {crit.porcentaje}%
                  </span>
                </th>
              ))}

              <th className="p-4 text-center bg-gray-200 w-24 border-l border-gray-300">
                Promedio <br /> Final
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.filas.map((alumno) => (
              <tr key={alumno.id} className="hover:bg-gray-50">
                <td className="p-4 font-medium text-gray-800 sticky left-0 bg-white border-r">
                  {alumno.nombre}
                  <div className="text-xs text-gray-400 font-normal">
                    {alumno.matricula}
                  </div>
                </td>

                {/* Celdas de Calificación (Calculamos qué mostrar según el criterio) */}
                {data.criterios.map((crit) => {
                  let valorMostrar = "-";

                  if (crit.tipo_origen === "sistema_tareas") {
                    // Promedio simple de sus tareas
                    const tareas = alumno.tareas || [];
                    if (tareas.length > 0) {
                      const sum = tareas.reduce((a, b) => a + b.nota, 0);
                      valorMostrar = (sum / tareas.length).toFixed(1);
                    }
                  } else if (crit.tipo_origen === "sistema_examenes") {
                    const examenes = alumno.examenes || [];
                    if (examenes.length > 0) {
                      const sum = examenes.reduce((a, b) => a + b.nota100, 0); // Usamos nota100
                      valorMostrar = (sum / examenes.length).toFixed(1);
                    }
                  } else if (crit.tipo_origen === "sistema_asistencia") {
                    valorMostrar = alumno.asistencia + "%";
                  } else if (crit.tipo_origen === "manual") {
                    // Aquí el backend ya hizo el cálculo interno para el promedio,
                    // pero para mostrar la celda, idealmente el backend debería devolvernos la nota manual cruda.
                    // *Nota: Para simplificar, asumiremos que si el promedio cambió, hay nota.*
                    // (Si quieres ver el valor exacto, habría que ajustar el endpoint para devolver 'notasManuales' por alumno)
                    valorMostrar = "Ver Detalle";
                  }

                  return (
                    <td
                      key={crit.id}
                      className="p-4 text-center border-l text-gray-600"
                    >
                      {valorMostrar}
                    </td>
                  );
                })}

                {/* Promedio Final */}
                <td
                  className={`p-4 text-center font-bold border-l text-lg ${alumno.promedio >= 70 ? "text-green-600" : "text-red-600"}`}
                >
                  {alumno.promedio}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- MODAL DE CAPTURA MANUAL --- */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-5 border-b bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                <Edit3 size={20} /> Capturar Calificaciones
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-red-500"
              >
                <ArrowLeft />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Selector de Criterio */}
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-2">
                  Selecciona qué vas a calificar:
                </label>
                <select
                  className="w-full p-2 border rounded-lg bg-white focus:ring-2 focus:ring-[#a72a34] outline-none"
                  value={criterioSeleccionado}
                  onChange={(e) => {
                    setCriterioSeleccionado(e.target.value);
                    setNotasManuales({}); // Limpiar inputs al cambiar
                  }}
                >
                  {criteriosManuales.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre_criterio} (Vale {c.porcentaje}%)
                    </option>
                  ))}
                </select>
              </div>

              {/* Lista de Alumnos */}
              <div className="border rounded-lg overflow-hidden flex-1 overflow-y-auto max-h-64">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 text-gray-600">
                    <tr>
                      <th className="p-3 text-left">Alumno</th>
                      <th className="p-3 text-center w-24">Nota (0-100)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.filas.map((alumno) => (
                      <tr key={alumno.id}>
                        <td className="p-3 font-medium text-gray-700">
                          {alumno.nombre}
                        </td>
                        <td className="p-3">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            className="w-full p-1 border rounded text-center focus:border-blue-500 outline-none"
                            placeholder="-"
                            value={notasManuales[alumno.id] || ""}
                            onChange={(e) =>
                              setNotasManuales({
                                ...notasManuales,
                                [alumno.id]: e.target.value,
                              })
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={guardarNotasManuales}
                disabled={isSaving}
                className="px-6 py-2 bg-[#a72a34] text-white font-bold rounded-lg hover:bg-[#8f242d] disabled:opacity-70"
              >
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
