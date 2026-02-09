import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import OfertaAcademica from "./pages/OfertaAcademica";
import Nosotros from "./pages/Nosotros";
import Contacto from "./pages/Contacto";

// Componente simple para el Footer
const Footer = () => (
  <footer className="bg-gray-900 text-gray-400 py-8 text-center border-t border-gray-800">
    <p>
      &copy; 2026 Centro Universitario México Siglo XXI. Todos los derechos
      reservados.
    </p>
  </footer>
);

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
        {/* Navbar fijo arriba */}
        <Navbar />

        {/* El contenido cambia según la ruta */}
        <div className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/oferta" element={<OfertaAcademica />} />
            <Route path="/nosotros" element={<Nosotros />} />
            <Route path="/contacto" element={<Contacto />} />
          </Routes>
        </div>

        {/* Footer siempre abajo */}
        <Footer />
      </div>
    </Router>
  );
}

export default App;
