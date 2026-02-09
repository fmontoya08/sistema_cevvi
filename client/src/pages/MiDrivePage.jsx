import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  Folder,
  FileText,
  UploadCloud,
  Trash2,
  Plus,
  ArrowLeft,
  Home,
  Download,
  MoreVertical,
} from "lucide-react";

const MiDrivePage = () => {
  const [rutaActual, setRutaActual] = useState("");
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const fileInputRef = useRef(null);

  // Cargar datos
  useEffect(() => {
    cargarDrive();
  }, [rutaActual]);

  const cargarDrive = async () => {
    setCargando(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `https://api-universidad-c5o8.onrender.com/api/drive/list?ruta=${rutaActual}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setItems(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setCargando(false);
    }
  };

  // --- ACCIONES ---

  const crearCarpeta = async () => {
    const nombre = prompt("Nombre de la nueva carpeta:");
    if (!nombre) return;
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        "https://api-universidad-c5o8.onrender.com/api/drive/folder",
        { nombre, rutaActual },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      cargarDrive();
    } catch (error) {
      alert("Error al crear carpeta");
    }
  };

  const subirArchivo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSubiendo(true);
    const formData = new FormData();
    formData.append("archivo", file);
    formData.append("rutaActual", rutaActual); // Le decimos al back dónde guardarlo

    try {
      const token = localStorage.getItem("token");
      await axios.post(
        "https://api-universidad-c5o8.onrender.com/api/drive/upload",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        },
      );
      cargarDrive();
    } catch (error) {
      alert("Error al subir archivo");
    } finally {
      setSubiendo(false);
      // Limpiar input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const eliminarItem = async (ruta, tipo) => {
    if (!window.confirm(`¿Seguro que quieres eliminar este ${tipo}?`)) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `https://api-universidad-c5o8.onrender.com/api/drive/item?ruta=${ruta}&tipo=${tipo}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      cargarDrive();
    } catch (error) {
      alert("No se pudo eliminar.");
    }
  };

  // Navegación
  const entrarCarpeta = (nombre) =>
    setRutaActual(rutaActual ? `${rutaActual}/${nombre}` : nombre);
  const irArriba = () => {
    if (!rutaActual) return;
    const partes = rutaActual.split("/");
    partes.pop();
    setRutaActual(partes.join("/"));
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            ☁️ Mi Unidad
          </h1>

          <div className="flex gap-2">
            {/* Botón Nueva Carpeta */}
            <button
              onClick={crearCarpeta}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 shadow-sm"
            >
              <Plus size={18} /> Carpeta
            </button>

            {/* Botón Subir Archivo */}
            <button
              onClick={() => fileInputRef.current.click()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm"
              disabled={subiendo}
            >
              <UploadCloud size={18} />{" "}
              {subiendo ? "Subiendo..." : "Subir Archivo"}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={subirArchivo}
            />
          </div>
        </div>

        {/* Breadcrumbs (Barra de dirección) */}
        <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 mb-6 flex items-center gap-2">
          <button
            onClick={() => setRutaActual("")}
            className="p-1 hover:bg-gray-100 rounded text-gray-500"
          >
            <Home size={20} />
          </button>
          <span className="text-gray-300">/</span>
          {rutaActual && (
            <>
              <button
                onClick={irArriba}
                className="p-1 hover:bg-gray-100 rounded text-gray-500"
              >
                <ArrowLeft size={20} />
              </button>
              <span className="text-sm font-mono text-gray-600 truncate">
                {rutaActual}
              </span>
            </>
          )}
        </div>

        {/* Grid de Archivos */}
        {cargando ? (
          <div className="text-center py-20 text-gray-400">
            Cargando tu nube...
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {items.length === 0 && (
              <div className="col-span-full text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
                <p className="text-gray-400">Esta carpeta está vacía</p>
                <button
                  onClick={() => fileInputRef.current.click()}
                  className="text-blue-500 mt-2 text-sm hover:underline"
                >
                  Sube tu primer archivo
                </button>
              </div>
            )}

            {items.map((item) => (
              <div
                key={item.nombre}
                className="group relative bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition cursor-pointer flex flex-col items-center"
              >
                {/* Click principal */}
                <div
                  className="w-full flex flex-col items-center"
                  onClick={() =>
                    item.tipo === "carpeta"
                      ? entrarCarpeta(item.nombre)
                      : window.open(
                          `https://api-universidad-c5o8.onrender.com${item.url}`,
                          "_blank",
                        )
                  }
                >
                  <div className="w-16 h-16 mb-3 flex items-center justify-center text-gray-500">
                    {item.tipo === "carpeta" ? (
                      <Folder
                        size={64}
                        className="text-yellow-400 fill-yellow-50"
                      />
                    ) : // Preview si es imagen
                    item.nombre.match(/\.(jpg|png|jpeg)$/i) ? (
                      <img
                        src={`https://api-universidad-c5o8.onrender.com${item.url}`}
                        className="w-full h-full object-cover rounded"
                      />
                    ) : (
                      <FileText size={50} className="text-blue-400" />
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-700 truncate w-full text-center">
                    {item.nombre}
                  </p>
                </div>

                {/* Botón Eliminar (Solo visible en hover) */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    eliminarItem(item.ruta, item.tipo);
                  }}
                  className="absolute top-2 right-2 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition"
                  title="Eliminar"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MiDrivePage;
