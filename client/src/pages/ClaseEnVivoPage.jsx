import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { JitsiMeeting } from "@jitsi/react-sdk";
import { ArrowLeft, Loader } from "lucide-react";

const ClaseEnVivoPage = () => {
  const { salaName } = useParams();
  const navigate = useNavigate();
  const [cargando, setCargando] = useState(true);

  // Recuperar usuario
  const user = JSON.parse(localStorage.getItem("user"));

  if (!user)
    return (
      <div className="text-white bg-black h-screen p-10">
        Error: No autorizado
      </div>
    );

  const displayName = `${user.nombre} ${user.apellido_paterno} (${user.rol})`;

  // Limpiamos el nombre de la sala para evitar errores con espacios o caracteres raros
  // Jitsi prefiere nombres sin espacios
  const roomNameClean = salaName.replace(/[^a-zA-Z0-9]/g, "");

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
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm font-bold bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors"
        >
          <ArrowLeft size={18} /> Salir de la Clase
        </button>
        <span className="text-xs text-gray-400 font-mono hidden sm:block">
          Sala ID: {roomNameClean}
        </span>
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
            prejoinPageEnabled: false, // Intentar entrar directo
          }}
          interfaceConfigOverwrite={{
            // Barra de herramientas limpia
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
            ],
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
          }}
          userInfo={{
            displayName: displayName,
            email: user.email,
          }}
          onApiReady={(externalApi) => {
            setCargando(false);

            // --- CORRECCIÓN IMPORTANTE ---
            // Hemos ELIMINADO la línea 'navigate(-1)' del evento videoConferenceLeft.
            // Ahora, si Jitsi se desconecta o cuelgas, NO te sacará de la página automáticamente.
            // Tendrás que dar clic en el botón rojo de "Salir de la Clase" arriba.
            externalApi.addEventListener("videoConferenceLeft", () => {
              console.log(
                "El usuario colgó la llamada (La sesión permanece abierta).",
              );
            });
          }}
          getIFrameRef={(iframeRef) => {
            iframeRef.style.height = "100%";
            iframeRef.style.width = "100%";
            iframeRef.style.border = "none";
          }}
        />
      </div>
    </div>
  );
};

export default ClaseEnVivoPage;
