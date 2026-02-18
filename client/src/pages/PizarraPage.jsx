import React, { useState, useCallback, useEffect } from "react";
import ReactDOM from "react-dom";
// 1. ELIMINAMOS 'exportToBlob' DE AQUÍ PORQUE DABA ERROR
import { Tldraw } from "tldraw";
import "tldraw/tldraw.css";
import axios from "axios";
import { Save, Download, ArrowLeft, Loader } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PizarraPage = () => {
  const navigate = useNavigate();
  const [editor, setEditor] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalStyle;
      setMounted(false);
    };
  }, []);

  const handleMount = useCallback((editor) => {
    setEditor(editor);
    editor.zoomToFit();
  }, []);

  // --- LÓGICA DE GUARDADO MANUAL (A prueba de errores) ---
  const generarImagen = async () => {
    if (!editor) return null;

    // 1. Obtener IDs de las formas
    const shapeIds = editor.getCurrentPageShapeIds();
    if (shapeIds.size === 0) return null;

    // 2. Usar el método nativo del editor para obtener el SVG
    // (Ahora debería funcionar porque quitamos las props conflictivas)
    const svgElement = await editor.getSvg([...shapeIds], {
      scale: 1,
      background: true,
    });

    if (!svgElement) return null;

    // 3. Convertir SVG a Blob (Imagen PNG) manualmente
    return new Promise((resolve) => {
      const svgString = new XMLSerializer().serializeToString(svgElement);
      const svg64 = btoa(unescape(encodeURIComponent(svgString)));
      const image64 = `data:image/svg+xml;base64,${svg64}`;

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");

        // Fondo blanco (opcional, si quieres transparencia quita estas 2 líneas)
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.drawImage(img, 0, 0);

        canvas.toBlob((blob) => {
          resolve(blob);
        }, "image/png");
      };
      img.src = image64;
    });
  };

  const descargarImagen = async () => {
    try {
      const blob = await generarImagen();
      if (!blob) return alert("El lienzo está vacío.");

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Pizarra_${Date.now()}.png`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error al descargar:", error);
      alert("Hubo un error al generar la imagen.");
    }
  };

  const guardarEnNube = async () => {
    setGuardando(true);
    try {
      const blob = await generarImagen();

      if (!blob) {
        setGuardando(false);
        return alert("Dibuja algo antes de guardar.");
      }

      const file = new File([blob], `Pizarra_${Date.now()}.png`, {
        type: "image/png",
      });

      const formData = new FormData();
      formData.append("rutaActual", "");
      formData.append("archivo", file);

      const token = localStorage.getItem("token");

      // Ajusta tu URL según corresponda
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

      alert("¡Guardado en 'Mi Nube' correctamente!");
    } catch (error) {
      console.error(error);
      alert("Error al guardar en la nube. Revisa la consola.");
    } finally {
      setGuardando(false);
    }
  };

  const contenidoPizarra = (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "#f8f9fa",
        zIndex: 999999,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          height: "60px",
          backgroundColor: "white",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
          zIndex: 1000000,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              padding: "8px",
              cursor: "pointer",
              border: "none",
              background: "#f3f4f6",
              borderRadius: "50%",
            }}
            title="Salir"
          >
            <ArrowLeft color="#374151" />
          </button>
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "18px",
                color: "#111827",
                fontWeight: "bold",
              }}
            >
              Taller Creativo
            </h1>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={descargarImagen}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              background: "white",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "600",
              color: "#374151",
            }}
          >
            <Download size={18} /> Descargar
          </button>
          <button
            onClick={guardarEnNube}
            disabled={guardando}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              background: "#a72a34",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "600",
              opacity: guardando ? 0.7 : 1,
            }}
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

      {/* TLDRAW SIN PROPS RARAS */}
      <div style={{ position: "relative", width: "100%", flex: 1 }}>
        <Tldraw
          onMount={handleMount}
          persistenceKey={null} // Sin persistencia para evitar bugs
          hideUi={false}
        />
      </div>
    </div>
  );

  if (!mounted) return null;
  return ReactDOM.createPortal(contenidoPizarra, document.body);
};

export default PizarraPage;
