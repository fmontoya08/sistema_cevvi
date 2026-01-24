import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, MessageCircle, Video, FileText } from "lucide-react";

// 👇 IMPORTANTE: Aquí importas tu componente viejo.
// Cambia "./AulaVirtualOriginal" por la ruta real de tu archivo viejo.
import TuComponenteViejo from "./AulaVirtualPage";

const AulaVirtualAlumno = () => {
  // Solo necesitamos params para mostrar títulos si quieres,
  // pero tu componente viejo ya maneja su propia lógica.
  const { grupoId, asignaturaId } = useParams();

  return (
    <div className="max-w-6xl mx-auto animate-fadeIn">
      {/* --- ZONA VISUAL NUEVA (HEADER BONITO) --- */}

      <Link
        to="/alumno/dashboard"
        className="inline-flex items-center text-sm text-gray-500 hover:text-red-700 mb-6 transition-colors font-medium"
      >
        <ArrowLeft size={18} className="mr-2" />
        Volver a mis cursos
      </Link>

      {/* Hero / Encabezado Moderno */}
      <div className="relative bg-white rounded-2xl p-8 border border-gray-100 shadow-lg overflow-hidden mb-8">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-red-50 to-orange-50 rounded-full blur-3xl opacity-60 -mr-20 -mt-20 pointer-events-none"></div>

        <div className="relative z-10">
          <span className="inline-block px-3 py-1 bg-red-50 text-red-700 text-xs font-bold uppercase tracking-wider rounded-full mb-3 border border-red-100">
            Aula Virtual
          </span>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Contenido de la Asignatura
          </h1>
          <p className="text-gray-500 text-lg">
            Bienvenido a tu espacio de aprendizaje. Abajo encontrarás todo el
            material.
          </p>
        </div>
      </div>

      {/* Grid de Accesos Rápidos (Decorativo) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <MessageCircle size={24} />
          </div>
          <div>
            <h3 className="font-bold text-gray-800">Foro</h3>
            <p className="text-xs text-gray-500">Dudas y debates</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
            <Video size={24} />
          </div>
          <div>
            <h3 className="font-bold text-gray-800">Clases</h3>
            <p className="text-xs text-gray-500">Grabaciones</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <FileText size={24} />
          </div>
          <div>
            <h3 className="font-bold text-gray-800">Recursos</h3>
            <p className="text-xs text-gray-500">Descargas</p>
          </div>
        </div>
      </div>

      {/* --- AQUÍ CARGAMOS TU COMPONENTE VIEJO --- */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-6 border-b pb-2">
          Programa y Actividades
        </h2>

        {/* Tu componente viejo recibirá los IDs automáticamente por los hooks de router internos */}
        <TuComponenteViejo />
      </div>
    </div>
  );
};

export default AulaVirtualAlumno;
