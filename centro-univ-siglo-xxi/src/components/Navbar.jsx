import React, { useState } from "react";
import { Menu, X } from "lucide-react"; // Ya no necesitamos GraduationCap
import logo from "./logo.png"; // 1. IMPORTA TU LOGO AQUÍ
import { Link } from "react-router-dom";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="bg-[#bc1423] text-white shadow-lg w-full fixed z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* LOGO */}
          <div className="flex items-center gap-3 cursor-pointer">
            {/* 2. AQUÍ ESTÁ TU IMAGEN */}
            <img
              src={logo}
              alt="Logo Siglo XXI"
              className="h-14 w-auto object-contain bg-white rounded-md p-1"
            />
            {/* Nota: He añadido 'bg-white' y 'rounded' por si tu logo es transparente y necesita fondo. 
                Si no lo necesitas, borra las clases: "bg-white rounded-md p-1" */}

            <div>
              <h1 className="font-bold text-lg leading-none">
                Centro universitario México Siglo XXI
              </h1>
              <span className="text-xs text-yellow-400 tracking-widest font-semibold">
                SIGLO XXI
              </span>
            </div>
          </div>

          {/* MENÚ DE ESCRITORIO */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-6">
              <Link
                to="/"
                className="hover:text-yellow-300 transition-colors font-medium"
              >
                Inicio
              </Link>
              <Link
                to="/nosotros"
                className="hover:text-yellow-300 transition-colors font-medium"
              >
                Nosotros
              </Link>
              <Link
                to="/oferta"
                className="hover:text-yellow-300 transition-colors font-medium"
              >
                Oferta Académica
              </Link>
              <Link
                to="/contacto"
                className="hover:text-yellow-300 transition-colors font-medium"
              >
                Contacto
              </Link>
              <Link
                to="/contacto"
                className="bg-white text-[#bc1423] px-5 py-2 rounded-full font-bold hover:bg-yellow-400 hover:text-[#bc1423] transition-all transform hover:scale-105 shadow-md"
              >
                Portal
              </Link>
            </div>
          </div>

          {/* BOTÓN MENÚ MÓVIL */}
          <div className="-mr-2 flex md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-md hover:bg-red-800 focus:outline-none"
            >
              {isOpen ? (
                <X className="h-8 w-8" />
              ) : (
                <Menu className="h-8 w-8" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* MENÚ DESPLEGABLE MÓVIL */}
      {isOpen && (
        <div className="md:hidden bg-[#a0111e] border-t border-red-800">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <a
              href="#"
              className="block px-3 py-3 rounded-md text-base font-medium hover:bg-[#bc1423]"
            >
              Inicio
            </a>
            <a
              href="#"
              className="block px-3 py-3 rounded-md text-base font-medium hover:bg-[#bc1423]"
            >
              Nosotros
            </a>
            <a
              href="#"
              className="block px-3 py-3 rounded-md text-base font-medium hover:bg-[#bc1423]"
            >
              Oferta Académica
            </a>
            <a
              href="#"
              className="block px-3 py-3 mt-4 text-center bg-white text-[#bc1423] rounded-md font-bold"
            >
              Portal
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}
