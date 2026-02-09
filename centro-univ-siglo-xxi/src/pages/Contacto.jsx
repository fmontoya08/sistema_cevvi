import React from "react";
import { MapPin, Phone, Mail, Clock, Send } from "lucide-react";

const Contacto = () => {
  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      {/* Encabezado */}
      <div className="bg-[#bc1423] text-white py-16 text-center">
        <h1 className="text-4xl font-bold mb-4">Contáctanos</h1>
        <p className="text-xl max-w-2xl mx-auto text-red-100 px-4">
          Estamos listos para resolver tus dudas y ayudarte a iniciar tu camino
          profesional.
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-12">
        <div className="grid md:grid-cols-2 gap-12">
          {/* Columna 1: Información y Mapa */}
          <div className="space-y-8">
            <div className="bg-white p-8 rounded-xl shadow-md border-l-4 border-yellow-500">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                Información de Contacto
              </h2>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="bg-red-50 p-3 rounded-full text-[#bc1423]">
                    <MapPin size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">
                      Ubicación Campus
                    </h3>
                    <p className="text-gray-600">
                      Av. Siempre Viva 123, Col. Centro, Ciudad de México.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-red-50 p-3 rounded-full text-[#bc1423]">
                    <Phone size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">Teléfonos</h3>
                    <p className="text-gray-600">55 1234 5678 (Rectoría)</p>
                    <p className="text-gray-600">55 8765 4321 (Admisiones)</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-red-50 p-3 rounded-full text-[#bc1423]">
                    <Mail size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">
                      Correo Electrónico
                    </h3>
                    <p className="text-gray-600">info@cumsigloxxi.edu.mx</p>
                    <p className="text-gray-600">
                      admisiones@cumsigloxxi.edu.mx
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-red-50 p-3 rounded-full text-[#bc1423]">
                    <Clock size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">
                      Horario de Atención
                    </h3>
                    <p className="text-gray-600">
                      Lunes a Viernes: 8:00 AM - 6:00 PM
                    </p>
                    <p className="text-gray-600">Sábados: 9:00 AM - 1:00 PM</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Mapa (Iframe de Google Maps) */}
            <div className="bg-gray-200 h-80 rounded-xl shadow-md overflow-hidden relative border-4 border-white">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3762.661640476495!2d-99.16869368466754!3d19.42702058688753!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x85d1ff35f5bd1563%3A0x6c366f0e2de02ff7!2sEl%20%C3%81ngel%20de%20la%20Independencia!5e0!3m2!1ses-419!2smx!4v1645564859874!5m2!1ses-419!2smx"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                title="Mapa de Ubicación"
              ></iframe>
            </div>
          </div>

          {/* Columna 2: Formulario */}
          <div className="bg-white p-8 rounded-xl shadow-lg border-t-8 border-[#bc1423]">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              Envíanos un Mensaje
            </h2>
            <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
              <div>
                <label className="block text-gray-700 font-bold mb-2">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 focus:border-[#bc1423] focus:ring-2 focus:ring-red-200 outline-none transition-all"
                  placeholder="Escribe tu nombre"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-700 font-bold mb-2">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 focus:border-[#bc1423] focus:ring-2 focus:ring-red-200 outline-none transition-all"
                    placeholder="55 1234 5678"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-2">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 focus:border-[#bc1423] focus:ring-2 focus:ring-red-200 outline-none transition-all"
                    placeholder="tucorreo@email.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-2">
                  Interés Académico
                </label>
                <select className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 focus:border-[#bc1423] focus:ring-2 focus:ring-red-200 outline-none transition-all cursor-pointer">
                  <option>Selecciona una opción...</option>
                  <option>Licenciaturas</option>
                  <option>Maestrías</option>
                  <option>Doctorados</option>
                  <option>Información General</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-2">
                  Mensaje
                </label>
                <textarea
                  className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 focus:border-[#bc1423] focus:ring-2 focus:ring-red-200 outline-none transition-all h-32 resize-none"
                  placeholder="¿Cómo podemos ayudarte?"
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full bg-[#bc1423] text-white font-bold py-4 rounded-lg hover:bg-red-800 transition-colors flex items-center justify-center gap-2 shadow-lg cursor-pointer transform active:scale-95"
              >
                Enviar Mensaje <Send size={20} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contacto;
