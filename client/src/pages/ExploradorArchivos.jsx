import React, { useState, useEffect } from "react";
import axios from "axios";

// Si usas lucide-react para íconos (recomendado):
import {
  Folder,
  FileText,
  Image,
  Download,
  ArrowLeft,
  Home,
  RefreshCw,
} from "lucide-react";
// Si no tienes íconos, puedes borrar los imports y usar texto simple o emojis 📁 📄

const ExploradorArchivos = () => {
  const [rutaActual, setRutaActual] = useState(""); // String vacío = Raíz uploads
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(false);

  // Cargar al inicio y cada vez que cambiemos de carpeta
  useEffect(() => {
    cargarArchivos();
  }, [rutaActual]);

  const cargarArchivos = async () => {
    setCargando(true);
    try {
      const token = localStorage.getItem("token");
      // Llamamos a nuestra API nueva
      const res = await axios.get(
        `https://api-universidad-c5o8.onrender.com/api/admin/archivos/explorar?ruta=${rutaActual}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setItems(res.data);
    } catch (error) {
      console.error("Error:", error);
      alert("Error cargando archivos");
    } finally {
      setCargando(false);
    }
  };

  // Navegación
  const entrarCarpeta = (nombreCarpeta) => {
    // Si ya estamos dentro de una carpeta, agregamos "/"
    const nueva = rutaActual ? `${rutaActual}/${nombreCarpeta}` : nombreCarpeta;
    setRutaActual(nueva);
  };

  const subirNivel = () => {
    if (!rutaActual) return;
    const partes = rutaActual.split("/");
    partes.pop(); // Quitamos la última parte
    setRutaActual(partes.join("/"));
  };

  const irInicio = () => setRutaActual("");

  // Detectar tipo de archivo para el ícono
  const esImagen = (nombre) => /\.(jpg|jpeg|png|gif|webp)$/i.test(nombre);
  const esPdf = (nombre) => /\.(pdf)$/i.test(nombre);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Encabezado */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">
            📂 Gestor de Archivos
          </h1>
          <button
            onClick={cargarArchivos}
            className="p-2 bg-white rounded-full shadow hover:bg-gray-100 text-blue-600"
            title="Recargar"
          >
            <RefreshCw size={20} />
          </button>
        </div>

        {/* Barra de Dirección */}
        <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 mb-6 flex items-center gap-2 overflow-x-auto">
          <button
            onClick={irInicio}
            className="p-1 hover:bg-gray-100 rounded text-gray-600"
          >
            <Home size={20} />
          </button>

          <span className="text-gray-400">/</span>

          {rutaActual && (
            <>
              <button
                onClick={subirNivel}
                className="p-1 hover:bg-gray-100 rounded text-gray-600"
              >
                <ArrowLeft size={20} />
              </button>
              <span className="font-mono text-sm text-gray-600 whitespace-nowrap">
                uploads/{rutaActual}
              </span>
            </>
          )}

          {!rutaActual && (
            <span className="font-mono text-sm text-gray-400">
              Raíz (uploads)
            </span>
          )}
        </div>

        {/* Área de Archivos */}
        {cargando ? (
          <div className="text-center py-20 text-gray-500">
            Cargando contenido...
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {/* Mensaje si está vacío */}
            {items.length === 0 && (
              <div className="col-span-full text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                Esta carpeta está vacía
              </div>
            )}

            {items.map((item) => (
              <div
                key={item.nombre}
                className="group relative bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer flex flex-col items-center"
                onClick={() => {
                  if (item.tipo === "carpeta") {
                    entrarCarpeta(item.nombre);
                  } else {
                    // Abrir archivo en nueva pestaña
                    window.open(
                      `https://api-universidad-c5o8.onrender.com${item.url}`,
                      "_blank",
                    );
                  }
                }}
              >
                {/* Ícono / Preview */}
                <div className="w-16 h-16 mb-3 flex items-center justify-center">
                  {item.tipo === "carpeta" ? (
                    <Folder
                      size={60}
                      className="text-yellow-400 fill-yellow-100"
                    />
                  ) : esImagen(item.nombre) ? (
                    <img
                      src={`https://api-universidad-c5o8.onrender.com${item.url}`}
                      alt="preview"
                      className="w-full h-full object-cover rounded-lg border border-gray-100"
                    />
                  ) : esPdf(item.nombre) ? (
                    <FileText size={50} className="text-red-500" />
                  ) : (
                    <FileText size={50} className="text-gray-400" />
                  )}
                </div>

                {/* Nombre */}
                <p
                  className="text-sm text-center font-medium text-gray-700 truncate w-full px-2"
                  title={item.nombre}
                >
                  {item.nombre}
                </p>

                {/* Botón Descargar (Solo aparece en Hover para archivos) */}
                {item.tipo === "archivo" && (
                  <a
                    href={`https://api-universidad-c5o8.onrender.com${item.url}`}
                    download
                    onClick={(e) => e.stopPropagation()} // Evita abrir la preview al dar click en descargar
                    className="absolute top-2 right-2 p-1.5 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity text-blue-600 hover:text-blue-800"
                    title="Descargar"
                  >
                    <Download size={14} />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExploradorArchivos;
