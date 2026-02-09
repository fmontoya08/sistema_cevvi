import React from "react";
import {
  Book,
  Code,
  Gavel,
  HeartPulse,
  Calculator,
  Briefcase,
} from "lucide-react";

const OfertaAcademica = () => {
  // Datos de las carreras (Simulando una base de datos)
  const carreras = [
    {
      id: 1,
      nombre: "Licenciatura en Derecho",
      area: "Ciencias Sociales",
      duracion: "9 Cuatrimestres",
      icono: <Gavel size={40} className="text-[#bc1423]" />,
      desc: "Formamos juristas éticos capaces de interpretar y aplicar las leyes para la justicia.",
    },
    {
      id: 2,
      nombre: "Ingeniería en Sistemas",
      area: "Tecnología",
      duracion: "9 Cuatrimestres",
      icono: <Code size={40} className="text-[#bc1423]" />,
      desc: "Desarrolla software, gestiona redes y lidera la innovación tecnológica.",
    },
    {
      id: 3,
      nombre: "Licenciatura en Psicología",
      area: "Salud",
      duracion: "9 Cuatrimestres",
      icono: <HeartPulse size={40} className="text-[#bc1423]" />,
      desc: "Comprende el comportamiento humano y promueve la salud mental.",
    },
    {
      id: 4,
      nombre: "Licenciatura en Administración",
      area: "Negocios",
      duracion: "9 Cuatrimestres",
      icono: <Briefcase size={40} className="text-[#bc1423]" />,
      desc: "Lidera organizaciones y emprendimientos con visión estratégica.",
    },
    {
      id: 5,
      nombre: "Contaduría Pública",
      area: "Negocios",
      duracion: "9 Cuatrimestres",
      icono: <Calculator size={40} className="text-[#bc1423]" />,
      desc: "Domina las finanzas, impuestos y auditoría para la toma de decisiones.",
    },
    {
      id: 6,
      nombre: "Ciencias de la Educación",
      area: "Humanidades",
      duracion: "9 Cuatrimestres",
      icono: <Book size={40} className="text-[#bc1423]" />,
      desc: "Transforma la enseñanza y diseña modelos educativos innovadores.",
    },
  ];

  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      {/* Encabezado de la página */}
      <div className="bg-[#bc1423] text-white py-16 text-center">
        <h1 className="text-4xl font-bold mb-4">Nuestra Oferta Académica</h1>
        <p className="text-xl max-w-2xl mx-auto text-red-100 px-4">
          Descubre los programas educativos diseñados para el éxito profesional
          en el mundo real.
        </p>
      </div>

      {/* Grid de Carreras */}
      <div className="max-w-7xl mx-auto px-4 mt-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {carreras.map((carrera) => (
            <div
              key={carrera.id}
              className="bg-white p-8 rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:-translate-y-2 group"
            >
              <div className="mb-6 bg-red-50 w-16 h-16 rounded-full flex items-center justify-center group-hover:bg-[#bc1423] group-hover:scale-110 transition-all duration-300">
                {/* Clonamos el icono para cambiarle el color al hacer hover */}
                {React.cloneElement(carrera.icono, {
                  className:
                    "text-[#bc1423] group-hover:text-white transition-colors",
                })}
              </div>

              <span className="text-xs font-bold text-yellow-600 uppercase tracking-wider bg-yellow-50 px-2 py-1 rounded-md">
                {carrera.area}
              </span>

              <h3 className="text-xl font-bold text-gray-900 mt-3 mb-2 group-hover:text-[#bc1423] transition-colors">
                {carrera.nombre}
              </h3>

              <p className="text-gray-600 text-sm mb-6 leading-relaxed">
                {carrera.desc}
              </p>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <span className="text-xs text-gray-400 font-semibold flex items-center gap-1">
                  ⏳ {carrera.duracion}
                </span>
                <button className="text-[#bc1423] font-bold text-sm hover:text-yellow-500 transition-colors cursor-pointer">
                  Ver Plan de Estudios →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OfertaAcademica;
