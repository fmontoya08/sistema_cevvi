import React from "react";
import { Target, Eye, Award, Users, Clock, Globe } from "lucide-react";

const Nosotros = () => {
  return (
    <div className="bg-slate-50 min-h-screen">
      {/* 1. Encabezado (Hero) */}
      <div className="bg-[#bc1423] text-white py-20 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-black opacity-10"></div>
        <div className="relative z-10 max-w-4xl mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Nuestra Identidad
          </h1>
          <p className="text-xl text-red-100">
            Más de 20 años formando líderes con valores humanos y excelencia
            académica en México.
          </p>
        </div>
      </div>

      {/* 2. Historia y Origen */}
      <div className="max-w-7xl mx-auto px-4 py-20">
        <div className="flex flex-col md:flex-row items-center gap-12">
          <div className="md:w-1/2">
            <div className="relative">
              {/* Placeholder para foto del rector o fachada antigua */}
              <div className="bg-gray-200 h-96 rounded-lg shadow-xl w-full flex items-center justify-center">
                <span className="text-gray-400 font-bold">
                  Foto Histórica / Rectoría
                </span>
              </div>
              <div className="absolute -bottom-6 -right-6 bg-yellow-500 p-6 rounded-lg shadow-lg hidden md:block">
                <p className="text-blue-900 font-bold text-2xl">Fundada en</p>
                <p className="text-blue-900 font-extrabold text-4xl">2005</p>
              </div>
            </div>
          </div>
          <div className="md:w-1/2">
            <h2 className="text-3xl font-bold text-[#bc1423] mb-6">
              Historia del CUM Siglo XXI
            </h2>
            <p className="text-gray-600 mb-4 leading-relaxed text-lg">
              El Centro Universitario México Siglo XXI nació con el propósito de
              ofrecer educación superior de alta calidad accesible para todos.
              Desde nuestros inicios, nos hemos comprometido con la innovación
              educativa.
            </p>
            <p className="text-gray-600 leading-relaxed text-lg">
              Hoy en día, somos un referente en la región, contando con
              instalaciones modernas y un cuerpo docente altamente capacitado
              que prepara a los estudiantes para los retos globales.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Misión y Visión (Tarjetas) */}
      <div className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-10">
            {/* Misión */}
            <div className="bg-slate-50 p-10 rounded-2xl border-l-8 border-[#bc1423] shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4 mb-4">
                <Target className="text-[#bc1423]" size={40} />
                <h3 className="text-2xl font-bold text-gray-800">
                  Nuestra Misión
                </h3>
              </div>
              <p className="text-gray-600 leading-relaxed">
                Formar profesionales competentes, con sentido humano y
                responsabilidad social, capaces de transformar su entorno a
                través del conocimiento, la tecnología y la ética.
              </p>
            </div>

            {/* Visión */}
            <div className="bg-slate-50 p-10 rounded-2xl border-l-8 border-yellow-500 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4 mb-4">
                <Eye className="text-yellow-600" size={40} />
                <h3 className="text-2xl font-bold text-gray-800">
                  Nuestra Visión
                </h3>
              </div>
              <p className="text-gray-600 leading-relaxed">
                Ser reconocidos nacional e internacionalmente como una
                institución de vanguardia educativa, líder en la formación de
                agentes de cambio para la sociedad del siglo XXI.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Nuestros Valores */}
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h2 className="text-3xl font-bold text-[#bc1423] mb-12">
          Nuestros Valores Institucionales
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <ValorCard
            icono={<Award />}
            titulo="Excelencia"
            desc="Buscamos la calidad total."
          />
          <ValorCard
            icono={<Users />}
            titulo="Humanismo"
            desc="La persona es el centro."
          />
          <ValorCard
            icono={<Globe />}
            titulo="Innovación"
            desc="Miramos hacia el futuro."
          />
          <ValorCard
            icono={<Clock />}
            titulo="Compromiso"
            desc="Cumplimos nuestras promesas."
          />
        </div>
      </div>
    </div>
  );
};

// Componente pequeño auxiliar para las tarjetas de valores
const ValorCard = ({ icono, titulo, desc }) => (
  <div className="flex flex-col items-center p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:border-[#bc1423] transition-colors group">
    <div className="text-gray-400 mb-4 group-hover:text-[#bc1423] transition-colors transform group-hover:scale-110">
      {React.cloneElement(icono, { size: 40 })}
    </div>
    <h4 className="font-bold text-lg text-gray-800 mb-2">{titulo}</h4>
    <p className="text-sm text-gray-500">{desc}</p>
  </div>
);

export default Nosotros;
