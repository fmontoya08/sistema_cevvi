import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  PlusCircle,
  Trash2,
  Save,
  CheckCircle,
  Circle,
  Type,
} from "lucide-react";

const CrearExamenPage = () => {
  const { grupoId, asignaturaId } = useParams();
  const navigate = useNavigate();

  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");

  // Estado inicial con una pregunta por defecto
  const [preguntas, setPreguntas] = useState([
    {
      id: 1,
      tipo: "opcion_multiple",
      texto: "",
      puntos: 1,
      opciones: [
        { texto: "", esCorrecta: false },
        { texto: "", esCorrecta: false },
      ],
    },
  ]);

  // --- FUNCIONES PARA MANEJAR EL FORMULARIO ---

  const agregarPregunta = () => {
    setPreguntas([
      ...preguntas,
      {
        id: Date.now(),
        tipo: "opcion_multiple",
        texto: "",
        puntos: 1,
        opciones: [
          { texto: "", esCorrecta: false },
          { texto: "", esCorrecta: false },
        ],
      },
    ]);
  };

  const eliminarPregunta = (id) => {
    setPreguntas(preguntas.filter((p) => p.id !== id));
  };

  const actualizarPregunta = (id, campo, valor) => {
    setPreguntas(
      preguntas.map((p) => (p.id === id ? { ...p, [campo]: valor } : p)),
    );
  };

  const agregarOpcion = (preguntaId) => {
    setPreguntas(
      preguntas.map((p) => {
        if (p.id === preguntaId) {
          return {
            ...p,
            opciones: [...p.opciones, { texto: "", esCorrecta: false }],
          };
        }
        return p;
      }),
    );
  };

  const actualizarOpcion = (preguntaId, idxOp, campo, valor) => {
    setPreguntas(
      preguntas.map((p) => {
        if (p.id === preguntaId) {
          const nuevasOpciones = [...p.opciones];
          nuevasOpciones[idxOp][campo] = valor;
          return { ...p, opciones: nuevasOpciones };
        }
        return p;
      }),
    );
  };

  const marcarCorrecta = (preguntaId, idxOp) => {
    setPreguntas(
      preguntas.map((p) => {
        if (p.id === preguntaId) {
          const nuevasOpciones = p.opciones.map((op, i) => ({
            ...op,
            esCorrecta: i === idxOp, // Solo una correcta
          }));
          return { ...p, opciones: nuevasOpciones };
        }
        return p;
      }),
    );
  };

  const eliminarOpcion = (preguntaId, idxOp) => {
    setPreguntas(
      preguntas.map((p) => {
        if (p.id === preguntaId) {
          return {
            ...p,
            opciones: p.opciones.filter((_, i) => i !== idxOp),
          };
        }
        return p;
      }),
    );
  };

  const guardarExamen = async () => {
    if (!titulo.trim()) return alert("El título es obligatorio");
    if (preguntas.length === 0)
      return alert("Debes agregar al menos una pregunta");

    // Validar que las preguntas tengan texto
    for (const p of preguntas) {
      if (!p.texto.trim())
        return alert("Todas las preguntas deben tener texto.");
      if (p.tipo === "opcion_multiple") {
        if (p.opciones.length < 2)
          return alert(
            "Las preguntas múltiples deben tener al menos 2 opciones.",
          );
        const tieneCorrecta = p.opciones.some((op) => op.esCorrecta);
        if (!tieneCorrecta)
          return alert("Debes marcar una respuesta correcta en cada pregunta.");
      }
    }

    try {
      const token = localStorage.getItem("token");
      // CORRECCIÓN PRINCIPAL: URL sin "/crear"
      await axios.post(
        "https://api-universidad-c5o8.onrender.com/api/examenes",
        {
          titulo,
          descripcion,
          grupo_id: grupoId,
          asignatura_id: asignaturaId,
          preguntas,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      alert("Examen creado exitosamente");
      navigate(-1);
    } catch (error) {
      console.error(error);
      alert("Error al crear el examen");
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Crear Examen</h1>

      {/* DATOS GENERALES */}
      <div className="bg-white p-6 rounded-xl shadow-sm mb-6 border border-gray-200">
        <label className="block text-sm font-bold text-gray-700 mb-2">
          Título del Examen
        </label>
        <input
          className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 outline-none"
          placeholder="Ej. Parcial 1 Matemáticas"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
        />
        <label className="block text-sm font-bold text-gray-700 mb-2">
          Descripción (Opcional)
        </label>
        <textarea
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          placeholder="Instrucciones para el alumno..."
          rows="3"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
        />
      </div>

      {/* LISTA DE PREGUNTAS */}
      <div className="space-y-6">
        {preguntas.map((preg, idx) => (
          <div
            key={preg.id}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 relative group"
          >
            <div className="flex justify-between items-start mb-4">
              <span className="bg-blue-100 text-blue-700 font-bold px-3 py-1 rounded-full text-sm">
                Pregunta {idx + 1}
              </span>
              <div className="flex gap-2">
                <select
                  className="p-2 border rounded-lg text-sm bg-gray-50"
                  value={preg.tipo}
                  onChange={(e) =>
                    actualizarPregunta(preg.id, "tipo", e.target.value)
                  }
                >
                  <option value="opcion_multiple">Opción Múltiple</option>
                  <option value="abierta">Pregunta Abierta</option>
                </select>
                <input
                  type="number"
                  min="1"
                  className="w-20 p-2 border rounded-lg text-sm"
                  placeholder="Pts"
                  value={preg.puntos}
                  onChange={(e) =>
                    actualizarPregunta(preg.id, "puntos", e.target.value)
                  }
                />
                <button
                  onClick={() => eliminarPregunta(preg.id)}
                  className="text-gray-400 hover:text-red-500 p-2"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>

            <input
              className="w-full p-3 border-b-2 border-gray-100 mb-4 focus:border-blue-500 outline-none text-lg font-medium placeholder-gray-400"
              placeholder="Escribe la pregunta aquí..."
              value={preg.texto}
              onChange={(e) =>
                actualizarPregunta(preg.id, "texto", e.target.value)
              }
            />

            {/* OPCIONES */}
            {preg.tipo === "opcion_multiple" ? (
              <div className="space-y-3 pl-4">
                {preg.opciones.map((op, idxOp) => (
                  <div key={idxOp} className="flex items-center gap-3">
                    <button
                      onClick={() => marcarCorrecta(preg.id, idxOp)}
                      className={`p-1 rounded-full ${
                        op.esCorrecta
                          ? "text-green-500"
                          : "text-gray-300 hover:text-gray-400"
                      }`}
                    >
                      {op.esCorrecta ? (
                        <CheckCircle size={24} />
                      ) : (
                        <Circle size={24} />
                      )}
                    </button>
                    <input
                      className={`flex-1 p-2 border rounded-lg outline-none ${
                        op.esCorrecta
                          ? "border-green-200 bg-green-50"
                          : "border-gray-200"
                      }`}
                      placeholder={`Opción ${idxOp + 1}`}
                      value={op.texto}
                      onChange={(e) =>
                        actualizarOpcion(
                          preg.id,
                          idxOp,
                          "texto",
                          e.target.value,
                        )
                      }
                    />
                    <button
                      onClick={() => eliminarOpcion(preg.id, idxOp)}
                      className="text-gray-300 hover:text-red-400"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => agregarOpcion(preg.id)}
                  className="text-sm text-blue-600 font-bold mt-2 hover:bg-blue-50 px-3 py-1 rounded-md flex items-center gap-1 w-fit"
                >
                  <PlusCircle size={16} /> Agregar opción
                </button>
              </div>
            ) : (
              <div className="p-4 bg-gray-50 border border-dashed border-gray-300 rounded-lg text-gray-500 italic flex items-center gap-2">
                <Type size={20} />
                <span>
                  El alumno verá un espacio para escribir su respuesta
                  detallada.
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 text-center pb-20">
        <button
          onClick={agregarPregunta}
          className="bg-white border-2 border-dashed border-gray-300 text-gray-500 px-8 py-4 rounded-xl font-bold hover:border-blue-500 hover:text-blue-600 transition-all flex items-center gap-2 mx-auto"
        >
          <PlusCircle size={20} /> Agregar Nueva Pregunta
        </button>
      </div>

      {/* BARRA FLOTANTE DE GUARDADO */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex justify-end shadow-lg z-50">
        <button
          onClick={guardarExamen}
          className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 flex items-center gap-2"
        >
          <Save size={20} /> Guardar Examen
        </button>
      </div>
    </div>
  );
};

export default CrearExamenPage;
