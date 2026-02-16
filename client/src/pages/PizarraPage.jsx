import React, { useState, useCallback } from "react";
import { Tldraw, getDefaultCdnBaseUrl } from "tldraw";
import "tldraw/tldraw.css";
import axios from "axios";
import { Save, Download, ArrowLeft, Loader } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PizarraPage = () => {
  const navigate = useNavigate();
  const [editor, setEditor] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const handleMount = useCallback((editor) => {
    console.log("✅ Editor montado correctamente");
    setEditor(editor);
  }, []);

  const convertirSvgAPng = async (editorInstance, shapeIds) => {
    const svgElement = await editorInstance.getSvg(shapeIds, {
      scale: 1,
      background: true,
    });
    if (!svgElement) throw new Error("No se pudo generar el SVG");

    const svgString = new XMLSerializer().serializeToString(svgElement);
    const svg64 = btoa(unescape(encodeURIComponent(svgString)));
    const image64 = `data:image/svg+xml;base64,${svg64}`;

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Fallo conversión"));
        }, "image/png");
      };
      img.onerror = (e) => reject(e);
      img.src = image64;
    });
  };

  const descargarImagen = async () => {
    if (!editor) return;
    try {
      const shapeIds = Array.from(editor.getCurrentPageShapeIds());
      if (shapeIds.length === 0) return alert("El lienzo está vacío.");
      const blob = await convertirSvgAPng(editor, shapeIds);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Dibujo_${Date.now()}.png`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Error al generar la imagen.");
    }
  };

  const guardarEnNube = async () => {
    if (!editor) return;
    setGuardando(true);
    try {
      const shapeIds = Array.from(editor.getCurrentPageShapeIds());
      if (shapeIds.length === 0) {
        setGuardando(false);
        return alert("Dibuja algo antes de guardar.");
      }
      const blob = await convertirSvgAPng(editor, shapeIds);
      const file = new File([blob], `Taller_Creativo_${Date.now()}.png`, {
        type: "image/png",
      });
      const formData = new FormData();
      formData.append("rutaActual", "");
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
    <div
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        backgroundColor: "#f9fafb",
      }}
    >
      {/* CAPA 1: La Pizarra al fondo ocupando todo */}
      <div
        style={{
          width: "100%",
          height: "100%",
          position: "absolute",
          top: 0,
          left: 0,
          zIndex: 0,
        }}
      >
        <Tldraw
          onMount={handleMount}
          options={{
            // 🔥 Configuración para producción - usa el CDN por defecto de tldraw
            baseUrl: getDefaultCdnBaseUrl(),
          }}
        />
      </div>

      {/* CAPA 2: El Header flotando encima */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "64px",
          backgroundColor: "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 1rem",
          boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
          zIndex: 50,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              padding: "0.5rem",
              borderRadius: "9999px",
              cursor: "pointer",
              border: "none",
              backgroundColor: "transparent",
              color: "#374151",
              fontWeight: "bold",
            }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = "#e5e7eb")}
            onMouseLeave={(e) =>
              (e.target.style.backgroundColor = "transparent")
            }
          >
            <ArrowLeft />
          </button>
          <h1
            style={{
              fontWeight: "bold",
              color: "#1f2937",
              fontSize: "1.125rem",
              display: "flex",
              flexDirection: "column",
              lineHeight: "1.25",
              userSelect: "none",
            }}
          >
            <span>Taller Creativo</span>
            <span
              style={{
                fontSize: "0.75rem",
                color: "#a72a34",
                fontWeight: "normal",
              }}
            >
              Pedagogía y Psicología
            </span>
          </h1>
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={descargarImagen}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem 1rem",
              fontSize: "0.875rem",
              fontWeight: "bold",
              color: "#374151",
              backgroundColor: "white",
              border: "1px solid #d1d5db",
              borderRadius: "0.5rem",
              cursor: "pointer",
              boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
            }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = "#f3f4f6")}
            onMouseLeave={(e) => (e.target.style.backgroundColor = "white")}
          >
            <Download size={18} />
            <span
              style={{ display: window.innerWidth < 640 ? "none" : "inline" }}
            >
              Descargar
            </span>
          </button>
          <button
            onClick={guardarEnNube}
            disabled={guardando}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem 1rem",
              fontSize: "0.875rem",
              fontWeight: "bold",
              color: "white",
              backgroundColor: guardando ? "rgba(167, 42, 52, 0.7)" : "#a72a34",
              border: "none",
              borderRadius: "0.5rem",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              cursor: guardando ? "not-allowed" : "pointer",
            }}
            onMouseEnter={(e) => {
              if (!guardando) e.target.style.backgroundColor = "#8f242d";
            }}
            onMouseLeave={(e) => {
              if (!guardando) e.target.style.backgroundColor = "#a72a34";
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
    </div>
  );
};

export default PizarraPage;
