import React from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css"; // Estilos obligatorios
import { HelpCircle } from "lucide-react";
import { useLocation } from "react-router-dom";

const TutorialGuide = ({ user }) => {
  const location = useLocation();

  // Definir los pasos según el ROL
  const getSteps = () => {
    if (!user) return [];

    // --- PASOS PARA ALUMNO ---
    if (user.rol === "alumno") {
      // Si está en el Dashboard
      if (location.pathname.includes("/dashboard")) {
        return [
          {
            element: "#tour-inicio",
            popover: {
              title: "Bienvenido",
              description:
                "Este es tu panel principal donde verás un resumen de tu actividad.",
            },
          },
          {
            element: "#tour-menu",
            popover: {
              title: "Menú Principal",
              description:
                "Aquí encuentras todas las secciones: Pagos, Trámites, Calendario, etc.",
            },
          },
          {
            element: "#tour-mis-clases",
            popover: {
              title: "Tus Clases",
              description:
                "Aquí aparecen las materias en las que estás inscrito. Dale clic a una para entrar al Aula Virtual.",
            },
          },
          {
            element: "#tour-notificaciones",
            popover: {
              title: "Notificaciones",
              description:
                "Aquí te avisaremos de tareas nuevas, calificaciones y avisos importantes.",
            },
          },
        ];
      }
      // Si está en el Aula Virtual
      if (location.pathname.includes("/aula")) {
        return [
          {
            element: "#tour-aula-header",
            popover: {
              title: "Aula Virtual",
              description:
                "Estás dentro de una materia. Aquí verás el nombre y grupo.",
            },
          },
          {
            element: "#tour-tabs",
            popover: {
              title: "Secciones",
              description:
                "Navega entre Información, Tareas, Recursos y el Foro.",
            },
          },
          {
            element: "#tour-videollamada",
            popover: {
              title: "Clase en Vivo",
              description:
                "Si el profe inicia clase, aquí aparecerá el botón para unirte.",
            },
          },
        ];
      }
    }

    // --- PASOS PARA DOCENTE ---
    if (user.rol === "docente") {
      if (location.pathname.includes("/dashboard")) {
        return [
          {
            element: "#tour-inicio",
            popover: {
              title: "Panel Docente",
              description: "Bienvenido profe. Aquí están sus grupos asignados.",
            },
          },
          {
            element: "#tour-cursos-grid",
            popover: {
              title: "Sus Cursos",
              description:
                "Haga clic en una tarjeta para gestionar la clase, calificar o subir material.",
            },
          },
        ];
      }
    }

    return [];
  };

  const iniciarTour = () => {
    const steps = getSteps();
    if (steps.length === 0) {
      alert(
        "No hay un tutorial disponible para esta pantalla específica. Intenta en el Inicio.",
      );
      return;
    }

    const driverObj = driver({
      showProgress: true,
      steps: steps,
      nextBtnText: "Siguiente ->",
      prevBtnText: "<- Atrás",
      doneBtnText: "¡Entendido!",
    });

    driverObj.drive();
  };

  return (
    <button
      onClick={iniciarTour}
      className="fixed bottom-6 right-6 bg-[#a72a34] text-white p-3 rounded-full shadow-xl hover:bg-[#802028] transition-all z-50 flex items-center gap-2 font-bold animate-bounce hover:animate-none"
      title="¿Necesitas ayuda? Inicia el tour"
      style={{ zIndex: 9999 }}
    >
      <HelpCircle size={24} />
      <span className="hidden md:inline">Ayuda</span>
    </button>
  );
};

export default TutorialGuide;
