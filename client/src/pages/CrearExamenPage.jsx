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
      tipo: "opcion_multiple", // Puede ser 'opcion_multiple' o 'abierta'
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

  const eliminarPregunta = (index) => {
    const nuevas = [...preguntas];
    nuevas.splice(index, 1);
    setPreguntas(nuevas);
  };

  const actualizarPregunta = (index, campo, valor) => {
    const nuevas = [...preguntas];
    nuevas[index][campo] = valor;

    // Si cambia a 'abierta', limpiamos opciones (no las necesita)
    if (campo === "tipo" && valor === "abierta") {
      nuevas[index].opciones = [];
    }
    // Si regresa a 'opcion_multiple' y está vacía, le ponemos 2 por defecto
    if (
      campo === "tipo" &&
      valor === "opcion_multiple" &&
      nuevas[index].opciones.length === 0
    ) {
      nuevas[index].opciones = [
        { texto: "", esCorrecta: false },
        { texto: "", esCorrecta: false },
      ];
    }

    setPreguntas(nuevas);
  };

  // --- FUNCIONES SOLO PARA OPCIONES MÚLTIPLES ---

  const actualizarOpcion = (idxPregunta, idxOpcion, valor) => {
    const nuevas = [...preguntas];
    nuevas[idxPregunta].opciones[idxOpcion].texto = valor;
    setPreguntas(nuevas);
  };

  const marcarCorrecta = (idxPregunta, idxOpcion) => {
    const nuevas = [...preguntas];
    // Solo una correcta por pregunta
    nuevas[idxPregunta].opciones.forEach((op) => (op.esCorrecta = false));
    nuevas[idxPregunta].opciones[idxOpcion].esCorrecta = true;
    setPreguntas(nuevas);
  };

  const agregarOpcion = (idxPregunta) => {
    const nuevas = [...preguntas];
    nuevas[idxPregunta].opciones.push({ texto: "", esCorrecta: false });
    setPreguntas(nuevas);
  };

  const eliminarOpcion = (idxPregunta, idxOpcion) => {
    const nuevas = [...preguntas];
    nuevas[idxPregunta].opciones.splice(idxOpcion, 1);
    setPreguntas(nuevas);
  };

  // --- GUARDAR ---
  const guardarExamen = async () => {
    if (!titulo.trim()) return alert("Ponle un título al examen.");

    try {
      const token = localStorage.getItem("token");
      // Asegúrate que la URL coincida con tu servidor
      await axios.post(
        "https://api-universidad-c5o8.onrender.com/api/examenes/crear",
        {
          grupo_id: grupoId,
          asignatura_id: asignaturaId,
          titulo,
          descripcion,
          preguntas,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      alert("¡Examen guardado correctamente!");
      // Aquí podrías redirigir a la lista de exámenes
      // navigate(`/docente/grupo/${grupoId}/asignatura/${asignaturaId}/examenes`);
    } catch (error) {
      console.error(error);
      alert("Error al guardar. Revisa la consola.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Crear Examen</h1>
        <button
          onClick={guardarExamen}
          className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-green-700 shadow-md"
        >
          <Save size={20} /> Guardar Examen
        </button>
      </div>

      {/* Datos del Examen */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
        <input
          type="text"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          className="w-full p-3 border rounded-lg mb-4 text-xl font-bold focus:ring-2 focus:ring-blue-500 outline-none"
          placeholder="Título (ej. Primer Parcial)"
        />
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          className="w-full p-3 border rounded-lg h-20 resize-none focus:ring-blue-500 outline-none"
          placeholder="Instrucciones..."
        />
      </div>

      {/* Lista de Preguntas */}
      <div className="space-y-6">
        {preguntas.map((preg, idx) => (
          <div
            key={preg.id}
            className="bg-white p-6 rounded-xl shadow-sm border border-l-4 border-l-blue-600 border-gray-200"
          >
            {/* Cabecera: Tipo de Pregunta y Puntos */}
            <div className="flex flex-wrap justify-between items-center mb-4 gap-4 bg-gray-50 p-3 rounded-lg">
              <span className="font-bold text-gray-700">
                Pregunta {idx + 1}
              </span>

              <div className="flex items-center gap-4">
                <select
                  value={preg.tipo}
                  onChange={(e) =>
                    actualizarPregunta(idx, "tipo", e.target.value)
                  }
                  className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg p-2 font-medium"
                >
                  <option value="opcion_multiple">Opción Múltiple</option>
                  <option value="abierta">Pregunta Abierta</option>
                </select>

                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="1"
                    value={preg.puntos}
                    onChange={(e) =>
                      actualizarPregunta(
                        idx,
                        "puntos",
                        parseInt(e.target.value),
                      )
                    }
                    className="w-14 p-2 border border-gray-300 rounded-lg text-center"
                  />
                  <span className="text-sm text-gray-500">pts</span>
                </div>

                <button
                  onClick={() => eliminarPregunta(idx)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            {/* Texto de la Pregunta */}
            <textarea
              value={preg.texto}
              onChange={(e) => actualizarPregunta(idx, "texto", e.target.value)}
              className="w-full p-4 border border-gray-300 rounded-lg mb-4 bg-white text-lg focus:ring-2 focus:ring-blue-100 outline-none"
              placeholder="Escribe la pregunta aquí..."
              rows="2"
            />

            {/* Renderizado Condicional: Opciones o Texto Abierto */}
            {preg.tipo === "opcion_multiple" ? (
              <div className="space-y-3 pl-2">
                {preg.opciones.map((opcion, idxOp) => (
                  <div key={idxOp} className="flex items-center gap-3">
                    <button
                      onClick={() => marcarCorrecta(idx, idxOp)}
                      className={`shrink-0 ${opcion.esCorrecta ? "text-green-600" : "text-gray-300 hover:text-gray-400"}`}
                      title="Marcar correcta"
                    >
                      {opcion.esCorrecta ? (
                        <CheckCircle size={24} />
                      ) : (
                        <Circle size={24} />
                      )}
                    </button>
                    <input
                      type="text"
                      value={opcion.texto}
                      onChange={(e) =>
                        actualizarOpcion(idx, idxOp, e.target.value)
                      }
                      className={`flex-1 p-2 border-b border-gray-100 outline-none focus:border-blue-400 ${opcion.esCorrecta ? "text-green-700 font-medium bg-green-50" : "text-gray-600"}`}
                      placeholder={`Opción ${idxOp + 1}`}
                    />
                    <button
                      onClick={() => eliminarOpcion(idx, idxOp)}
                      className="text-gray-300 hover:text-red-400"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => agregarOpcion(idx)}
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
          <PlusCircle size={24} /> Agregar Pregunta
        </button>
      </div>
    </div>
  );
};

export default CrearExamenPage;
