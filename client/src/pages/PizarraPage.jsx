import React, { useState } from "react";
// Importamos Excalidraw y su función de exportación
import { Excalidraw, exportToBlob } from "@excalidraw/excalidraw";
import axios from "axios";
import { Save, Download, ArrowLeft, Loader, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PizarraPage = () => {
  const navigate = useNavigate();
  // Estado para controlar la API interna de la pizarra
  const [excalidrawAPI, setExcalidrawAPI] = useState(null);
  const [guardando, setGuardando] = useState(false);

  // --- FUNCIÓN GUARDAR (Local y Nube) ---
  const procesarImagen = async () => {
    if (!excalidrawAPI) return null;

    // Obtener los elementos dibujados
    const elements = excalidrawAPI.getSceneElements();
    if (!elements || elements.length === 0) {
      alert("El lienzo está vacío.");
      return null;
    }

    // Convertir a imagen PNG
    const blob = await exportToBlob({
      elements,
      mimeType: "image/png",
      appState: {
        ...excalidrawAPI.getAppState(),
        exportBackground: true, // Fondo blanco
        viewBackgroundColor: "#ffffff",
      },
      files: excalidrawAPI.getFiles(),
    });

    return blob;
  };

  const descargarImagen = async () => {
    const blob = await procesarImagen();
    if (!blob) return;

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Dibujo_${Date.now()}.png`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const guardarEnNube = async () => {
    setGuardando(true);
    try {
      const blob = await procesarImagen();
      if (!blob) return;

      const file = new File([blob], `Taller_Creativo_${Date.now()}.png`, {
        type: "image/png",
      });

      const formData = new FormData();
      formData.append("rutaActual", ""); // Guardar en raíz
      formData.append("archivo", file);

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

      alert("¡Guardado en 'Mi Nube' con éxito!");
    } catch (error) {
      console.error(error);
      alert("Error al guardar.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* HEADER */}
      <div className="h-16 bg-white border-b flex items-center justify-between px-4 shadow-sm z-10 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-600"
          >
            <ArrowLeft />
          </button>
          <h1 className="font-bold text-gray-800 text-lg flex flex-col leading-tight">
            <span>Taller Creativo</span>
            <span className="text-xs text-[#a72a34] font-normal">
              Excalidraw
            </span>
          </h1>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              if (window.confirm("¿Borrar todo?")) excalidrawAPI.resetScene();
            }}
            className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-red-500 bg-red-50 hover:bg-red-100 rounded-lg mr-2"
          >
            <Trash2 size={18} /> Borrar
          </button>
          <button
            onClick={descargarImagen}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            <Download size={18} />{" "}
            <span className="hidden sm:inline">Descargar</span>
          </button>
          <button
            onClick={guardarEnNube}
            disabled={guardando}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-[#a72a34] hover:bg-[#8f242d] rounded-lg shadow-md disabled:opacity-70"
          >
            {guardando ? (
              <Loader className="animate-spin" size={18} />
            ) : (
              <Save size={18} />
            )}
            {guardando ? "Guardando..." : "Guardar en Nube"}
          </button>
        </div>
      </div>

      {/* CONTENEDOR DE EXCALIDRAW */}
      <div className="flex-1 w-full h-full relative">
        <Excalidraw
          excalidrawAPI={(api) => setExcalidrawAPI(api)}
          langCode="es-ES" // Idioma Español
          initialData={{
            appState: { viewBackgroundColor: "#ffffff" }, // Fondo blanco por defecto
          }}
          UIOptions={{
            canvasActions: {
              saveAsImage: false, // Ocultamos los botones nativos para usar los nuestros
              saveToActiveFile: false,
              loadScene: false,
              export: false,
            },
          }}
        />
      </div>
    </div>
  );
};

export default PizarraPage;
