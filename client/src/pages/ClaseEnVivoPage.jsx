import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { JitsiMeeting } from "@jitsi/react-sdk";
import { ArrowLeft, Loader, MonitorSmartphone, Video, Download, X } from "lucide-react";
import useHybridClassMonitor from "../hooks/useHybridClassMonitor";
import useAudioMixer from "../hooks/useAudioMixer";
import HybridClassPanel from "../components/HybridClassPanel";

const ClaseEnVivoPage = () => {
  const { salaName } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [cargando, setCargando] = useState(true);
  const [externalApi, setExternalApi] = useState(null);
  const [showGuardarModal, setShowGuardarModal] = useState(false);
  const esHibrida = searchParams.get("hibrida") === "true";
  const monitor = useHybridClassMonitor(esHibrida ? externalApi : null);
  const audioMixer = useAudioMixer(esHibrida ? externalApi : null);

  // Recuperar usuario con try/catch
  let user = null;
  try {
    const stored = localStorage.getItem("user");
    if (stored) user = JSON.parse(stored);
  } catch (e) {
    console.error("Error al parsear datos de usuario", e);
  }

  if (!user)
    return (
      <div className="text-white bg-black h-screen p-10">
        Error: No autorizado
      </div>
    );

  const displayName = `${user.nombre} ${user.apellido_paterno} (${user.rol})`;

  // Limpiamos el nombre de la sala para evitar errores con espacios o caracteres raros
  // Jitsi prefiere nombres sin espacios
  const roomNameClean = salaName ? salaName.replace(/[^a-zA-Z0-9]/g, "") : "sala-default";

  const handleSalir = () => {
    if (user.rol === "docente") {
      setShowGuardarModal(true);
    } else {
      navigate(-1);
    }
  };

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "black",
      }}
    >
      {/* HEADER MANUAL: La única forma de salir será dando clic aquí */}
      <div className="bg-gray-900 text-white h-14 flex items-center px-4 justify-between shrink-0 z-50 border-b border-gray-700">
        <button
          onClick={handleSalir}
          className="flex items-center gap-2 text-sm font-bold bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors"
        >
          <ArrowLeft size={18} /> Salir de la Clase
        </button>
        <div className="flex items-center gap-3">
          {esHibrida && (
            <span className="flex items-center gap-1.5 text-xs font-bold bg-purple-700/60 text-purple-200 px-2.5 py-1 rounded-full">
              <MonitorSmartphone size={14} /> Híbrida
            </span>
          )}
          <span className="text-xs text-gray-400 font-mono hidden sm:block">
            Sala ID: {roomNameClean}
          </span>
        </div>
      </div>

      {/* Contenedor Jitsi */}
      <div className="flex-1 relative w-full h-full">
        {cargando && (
          <div className="absolute inset-0 flex items-center justify-center text-white bg-gray-900 z-0">
            <Loader className="animate-spin mr-2" /> Conectando al servidor...
          </div>
        )}

        <JitsiMeeting
          domain="meet.jit.si"
          roomName={roomNameClean}
          configOverwrite={{
            startWithAudioMuted: true,
            startWithVideoMuted: true,
            disableThirdPartyRequests: true,
            prejoinPageEnabled: false,
            fileRecordingsEnabled: true,
          }}
          interfaceConfigOverwrite={{
            TOOLBAR_BUTTONS: [
              "microphone",
              "camera",
              "desktop",
              "fullscreen",
              "fodeviceselection",
              "hangup",
              "chat",
              "raisehand",
              "tileview",
              "videoquality",
              "recording",
            ],
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
          }}
          userInfo={{
            displayName: displayName,
            email: user.email,
          }}
          onApiReady={(api) => {
            setCargando(false);
            setExternalApi(api);

            api.addEventListener("videoConferenceLeft", () => {
              console.log(
                "El usuario colgó la llamada (La sesión permanece abierta).",
              );
            });
          }}
          onApiDestroy={(api) => {
            try {
              api.removeEventListener("videoConferenceLeft");
            } catch (e) {
              // Ignorar error si no hay listener
            }
          }}
          getIFrameRef={(iframeRef) => {
            iframeRef.style.height = "100%";
            iframeRef.style.width = "100%";
            iframeRef.style.border = "none";
          }}
        />

        {esHibrida && !cargando && (
          <HybridClassPanel
            monitor={monitor}
            audioMixer={audioMixer}
            externalApi={externalApi}
          />
        )}
      </div>

      {/* Modal post-clase para docentes */}
      {showGuardarModal && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-[#a72a34]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Video className="w-8 h-8 text-[#a72a34]" />
              </div>
              <h2 className="text-xl font-bold">¿Guardar esta clase?</h2>
              <p className="text-gray-500 text-sm mt-2">
                Puedes descargar la grabación desde Jitsi y subirla a la plataforma para que tus alumnos la vean.
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-gray-400 bg-gray-50 p-3 rounded-lg">
                <strong>💡 Sugerencia:</strong> Haz clic en el botón de grabación en Jitsi (ícono de círculo rojo) durante tu clase. Al terminar, podrás descargar el archivo .mp4.
              </p>
            </div>
            <div className="flex flex-col gap-2 mt-6">
              <button
                onClick={() => { setShowGuardarModal(false); navigate("/docente/clases-grabadas"); }}
                className="w-full px-4 py-3 bg-[#a72a34] text-white font-bold rounded-xl hover:bg-[#802028] flex items-center justify-center gap-2"
              >
                <Download size={18} /> Ir a subir grabación
              </button>
              <button
                onClick={() => { setShowGuardarModal(false); navigate(-1); }}
                className="w-full px-4 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200"
              >
                <X size={18} className="inline mr-1" /> Salir sin guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClaseEnVivoPage;
