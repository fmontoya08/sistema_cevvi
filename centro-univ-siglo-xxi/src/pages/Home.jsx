import React from "react";
import { Link } from "react-router-dom";
import {
  GraduationCap,
  ArrowRight,
  BookOpen,
  Users,
  Trophy,
  Calendar,
  Star,
  Quote,
  ChevronRight,
} from "lucide-react";

const Home = () => {
  return (
    <>
      {/* 1. HERO SECTION (Portada) */}
      <header className="bg-[#bc1423] text-white pt-32 pb-24 px-4 relative overflow-hidden">
        {/* Decoración de fondo */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-red-800 rounded-full opacity-50 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-72 h-72 bg-yellow-600 rounded-full opacity-20 blur-3xl"></div>

        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between relative z-10">
          <div className="md:w-1/2 mb-12 md:mb-0 text-center md:text-left">
            <span className="bg-yellow-500 text-[#bc1423] px-4 py-1 rounded-full text-sm font-bold mb-6 inline-block shadow-lg uppercase tracking-wider">
              Inscripciones Abiertas 2026
            </span>
            <h1 className="text-5xl md:text-6xl font-extrabold leading-tight mb-6">
              Tu futuro comienza en{" "}
              <span className="text-yellow-400">Siglo XXI</span>
            </h1>
            <p className="text-xl text-red-100 mb-8 leading-relaxed max-w-lg mx-auto md:mx-0">
              Formamos líderes con visión humanista y tecnológica. Descubre
              nuestra oferta académica y transforma tu vida profesional.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <Link
                to="/oferta"
                className="bg-white text-[#bc1423] px-8 py-4 rounded-lg font-bold hover:bg-yellow-400 hover:text-[#bc1423] transition-all hover:scale-105 shadow-lg flex items-center justify-center gap-2"
              >
                Ver Licenciaturas <GraduationCap size={20} />
              </Link>
              <Link
                to="/contacto"
                className="border-2 border-white text-white px-8 py-4 rounded-lg font-bold hover:bg-white hover:text-[#bc1423] transition-all flex items-center justify-center gap-2"
              >
                Contactar Asesor <ArrowRight size={20} />
              </Link>
            </div>
          </div>

          <div className="md:w-1/2 flex justify-center relative">
            <div className="relative bg-white p-3 rounded-2xl shadow-2xl transform rotate-2 hover:rotate-0 transition-all duration-500">
              <div className="bg-slate-100 h-72 w-80 sm:h-80 sm:w-96 rounded-xl flex items-center justify-center overflow-hidden border border-slate-200 relative group">
                {/* Placeholder visual */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                <div className="text-center p-6 relative z-10">
                  <Users size={64} className="mx-auto text-gray-400 mb-3" />
                  <span className="text-gray-500 font-bold block">
                    Vida Estudiantil
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 2. BARRA DE ESTADÍSTICAS (NUEVO) */}
      <section className="bg-blue-900 py-12 relative z-20 -mt-8 mx-4 rounded-xl shadow-xl max-w-6xl lg:mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white divide-x divide-blue-800/50">
          <div>
            <p className="text-4xl font-bold text-yellow-400 mb-1">+20</p>
            <p className="text-blue-200 text-sm uppercase tracking-wide">
              Años de Historia
            </p>
          </div>
          <div>
            <p className="text-4xl font-bold text-yellow-400 mb-1">15</p>
            <p className="text-blue-200 text-sm uppercase tracking-wide">
              Licenciaturas
            </p>
          </div>
          <div>
            <p className="text-4xl font-bold text-yellow-400 mb-1">+5k</p>
            <p className="text-blue-200 text-sm uppercase tracking-wide">
              Egresados
            </p>
          </div>
          <div>
            <p className="text-4xl font-bold text-yellow-400 mb-1">100%</p>
            <p className="text-blue-200 text-sm uppercase tracking-wide">
              Calidad Académica
            </p>
          </div>
        </div>
      </section>

      {/* 3. CARACTERÍSTICAS PRINCIPALES */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[#bc1423]">
              ¿Por qué elegir CUM Siglo XXI?
            </h2>
            <div className="h-1 w-24 bg-yellow-500 mx-auto mt-4 rounded-full"></div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Cards igual que antes... */}
            <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition-shadow duration-300 border-t-4 border-[#bc1423] group">
              <div className="bg-red-50 w-14 h-14 rounded-lg flex items-center justify-center mb-6 group-hover:bg-[#bc1423] transition-colors">
                <BookOpen
                  className="text-[#bc1423] group-hover:text-white transition-colors"
                  size={28}
                />
              </div>
              <h3 className="text-xl font-bold text-[#bc1423] mb-3">
                Planes de Estudio 2026
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Actualizamos constantemente nuestras materias para responder a
                las necesidades del mercado.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition-shadow duration-300 border-t-4 border-yellow-500 group">
              <div className="bg-yellow-50 w-14 h-14 rounded-lg flex items-center justify-center mb-6 group-hover:bg-yellow-500 transition-colors">
                <Trophy
                  className="text-yellow-600 group-hover:text-[#bc1423] transition-colors"
                  size={28}
                />
              </div>
              <h3 className="text-xl font-bold text-[#bc1423] mb-3">
                Becas Académicas
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Reconocemos tu esfuerzo. Contamos con programas de becas por
                promedio y deportivas.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition-shadow duration-300 border-t-4 border-[#bc1423] group">
              <div className="bg-red-50 w-14 h-14 rounded-lg flex items-center justify-center mb-6 group-hover:bg-[#bc1423] transition-colors">
                <Users
                  className="text-[#bc1423] group-hover:text-white transition-colors"
                  size={28}
                />
              </div>
              <h3 className="text-xl font-bold text-[#bc1423] mb-3">
                Ambiente Universitario
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Disfruta de instalaciones modernas, laboratorios equipados y
                áreas comunes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. NOTICIAS Y EVENTOS (NUEVO) */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">
                Noticias Recientes
              </h2>
              <p className="text-gray-500 mt-2">
                Mantente al día con lo que sucede en el campus
              </p>
            </div>
            <button className="hidden md:flex items-center gap-2 text-[#bc1423] font-bold hover:text-red-700 transition-colors">
              Ver todas las noticias <ChevronRight size={20} />
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Noticia 1 */}
            <article className="group cursor-pointer">
              <div className="bg-gray-200 h-48 rounded-xl mb-4 overflow-hidden relative">
                <div className="absolute top-4 left-4 bg-white px-3 py-1 rounded-md text-xs font-bold shadow-sm">
                  08 FEB
                </div>
                <div className="w-full h-full bg-gray-300 group-hover:scale-105 transition-transform duration-500"></div>
              </div>
              <span className="text-[#bc1423] text-sm font-bold uppercase tracking-wider">
                Academia
              </span>
              <h3 className="text-xl font-bold text-gray-900 mt-2 mb-3 group-hover:text-[#bc1423] transition-colors">
                Inauguración del nuevo laboratorio de cómputo
              </h3>
              <p className="text-gray-600 text-sm line-clamp-3">
                Con tecnología de punta, el rector cortó el listón del nuevo
                espacio para estudiantes de ingeniería...
              </p>
            </article>

            {/* Noticia 2 */}
            <article className="group cursor-pointer">
              <div className="bg-gray-200 h-48 rounded-xl mb-4 overflow-hidden relative">
                <div className="absolute top-4 left-4 bg-white px-3 py-1 rounded-md text-xs font-bold shadow-sm">
                  05 FEB
                </div>
                <div className="w-full h-full bg-gray-300 group-hover:scale-105 transition-transform duration-500"></div>
              </div>
              <span className="text-[#bc1423] text-sm font-bold uppercase tracking-wider">
                Deportes
              </span>
              <h3 className="text-xl font-bold text-gray-900 mt-2 mb-3 group-hover:text-[#bc1423] transition-colors">
                Selección de fútbol pasa a la final estatal
              </h3>
              <p className="text-gray-600 text-sm line-clamp-3">
                Nuestros "Guerreros" lograron una victoria histórica este fin de
                semana contra la universidad tecnológica...
              </p>
            </article>

            {/* Noticia 3 */}
            <article className="group cursor-pointer">
              <div className="bg-gray-200 h-48 rounded-xl mb-4 overflow-hidden relative">
                <div className="absolute top-4 left-4 bg-white px-3 py-1 rounded-md text-xs font-bold shadow-sm">
                  28 ENE
                </div>
                <div className="w-full h-full bg-gray-300 group-hover:scale-105 transition-transform duration-500"></div>
              </div>
              <span className="text-[#bc1423] text-sm font-bold uppercase tracking-wider">
                Comunidad
              </span>
              <h3 className="text-xl font-bold text-gray-900 mt-2 mb-3 group-hover:text-[#bc1423] transition-colors">
                Campaña de reciclaje 2026: Un éxito total
              </h3>
              <p className="text-gray-600 text-sm line-clamp-3">
                Gracias a la participación de alumnos y docentes, logramos
                recolectar más de 2 toneladas de material...
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* 5. TESTIMONIOS (NUEVO) */}
      <section className="py-20 bg-slate-100">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-[#bc1423] mb-12">
            Lo que dicen nuestros alumnos
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Testimonio 1 */}
            <div className="bg-white p-8 rounded-2xl shadow-md relative">
              <Quote
                className="absolute top-8 right-8 text-yellow-100 rotate-180"
                size={60}
              />
              <div className="flex items-center gap-1 text-yellow-400 mb-4">
                <Star fill="currentColor" size={20} />
                <Star fill="currentColor" size={20} />
                <Star fill="currentColor" size={20} />
                <Star fill="currentColor" size={20} />
                <Star fill="currentColor" size={20} />
              </div>
              <p className="text-gray-700 mb-6 relative z-10 italic">
                "Elegir el Centro Universitario México Siglo XXI fue la mejor
                decisión. Los maestros realmente se preocupan por tu aprendizaje
                y las instalaciones me permiten practicar con herramientas
                reales."
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-300 rounded-full"></div>{" "}
                {/* Avatar Placeholder */}
                <div>
                  <p className="font-bold text-gray-900">Ana García</p>
                  <p className="text-sm text-gray-500">
                    Lic. en Derecho - 5to Cuatrimestre
                  </p>
                </div>
              </div>
            </div>

            {/* Testimonio 2 */}
            <div className="bg-white p-8 rounded-2xl shadow-md relative">
              <Quote
                className="absolute top-8 right-8 text-yellow-100 rotate-180"
                size={60}
              />
              <div className="flex items-center gap-1 text-yellow-400 mb-4">
                <Star fill="currentColor" size={20} />
                <Star fill="currentColor" size={20} />
                <Star fill="currentColor" size={20} />
                <Star fill="currentColor" size={20} />
                <Star fill="currentColor" size={20} />
              </div>
              <p className="text-gray-700 mb-6 relative z-10 italic">
                "Gracias a la bolsa de trabajo de la universidad conseguí mis
                prácticas profesionales en una empresa internacional antes de
                terminar la carrera. ¡100% recomendada!"
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-300 rounded-full"></div>{" "}
                {/* Avatar Placeholder */}
                <div>
                  <p className="font-bold text-gray-900">Carlos Méndez</p>
                  <p className="text-sm text-gray-500">
                    Ing. en Sistemas - Egresado
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. CALL TO ACTION (CTA) FINAL */}
      <section className="bg-[#bc1423] py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <h2 className="text-4xl font-bold text-white mb-6">
            ¿Listo para comenzar tu historia de éxito?
          </h2>
          <p className="text-xl text-red-100 mb-8">
            El proceso de admisión es muy sencillo. Agenda una cita hoy mismo y
            conoce nuestro campus.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              to="/contacto"
              className="bg-yellow-500 text-blue-900 px-8 py-4 rounded-lg font-bold hover:bg-yellow-400 hover:scale-105 transition-all shadow-xl"
            >
              Agendar Visita Guiada
            </Link>
            <button className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-lg font-bold hover:bg-white hover:text-[#bc1423] transition-all">
              Descargar Folleto Digital
            </button>
          </div>
        </div>
      </section>
    </>
  );
};

export default Home;
