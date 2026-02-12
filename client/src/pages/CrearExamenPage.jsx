import React from "react";
import { Save, PlusCircle } from "lucide-react";

const CrearExamenPage = () => {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Crear Nuevo Examen</h1>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="mb-4">
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Título del Examen
          </label>
          <input
            type="text"
            className="w-full p-3 border rounded-lg"
            placeholder="Ej: Parcial 1 - React JS"
          />
        </div>

        <div className="border-t pt-4 mt-4">
          <p className="text-center text-gray-400 italic py-10">
            El constructor de preguntas se está implementando...
          </p>
          <div className="flex justify-center">
            <button className="flex items-center gap-2 text-blue-600 font-bold border border-blue-200 px-4 py-2 rounded-lg hover:bg-blue-50">
              <PlusCircle size={20} /> Agregar Pregunta
            </button>
          </div>
        </div>

        <div className="flex justify-end mt-8 border-t pt-4">
          <button className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2">
            <Save size={18} /> Guardar Examen
          </button>
        </div>
      </div>
    </div>
  );
};

export default CrearExamenPage;
