import React from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { HelpCircle } from "lucide-react";
import { useLocation } from "react-router-dom";

const TutorialGuide = ({ user }) => {
  const location = useLocation();

  const getSteps = () => {
    if (!user) return [];
    const path = location.pathname;

    // ==========================================
    // ROL: ALUMNO
    // ==========================================
    if (user.rol === "alumno") {
      // 1. DASHBOARD (Inicio)
      if (path.includes("/dashboard")) {
        return [
          {
            element: "#tour-inicio",
            popover: {
              title: "Panel Principal",
              description:
                "Aquí inicia tu experiencia. Verás tu resumen académico.",
            },
          },
          {
            element: "#tour-menu",
            popover: {
              title: "Navegación",
              description:
                "Usa este menú para acceder a todas las áreas: Pagos, Nube, Trámites, etc.",
            },
          },
          {
            element: "#tour-mis-clases",
            popover: {
              title: "Tus Materias",
              description:
                "Estas son tus clases activas. Haz clic en una tarjeta para entrar al Aula Virtual.",
            },
          },
          {
            element: "#tour-notificaciones",
            popover: {
              title: "Avisos",
              description:
                "Revisa aquí si tienes tareas nuevas o mensajes del profe.",
            },
          },
        ];
      }

      // 2. MIS PAGOS
      if (path.includes("/mis-pagos")) {
        return [
          {
            element: "#pagos-resumen",
            popover: {
              title: "Estado de Cuenta",
              description:
                "Aquí ves rápidamente cuánto debes (rojo) y cuánto has pagado (verde).",
            },
          },
          {
            element: "#pagos-lista",
            popover: {
              title: "Historial",
              description:
                "Lista detallada de todos tus movimientos financieros.",
            },
          },
        ];
      }

      // 3. MI NUBE (Drive)
      if (path.includes("/mi-nube")) {
        return [
          {
            element: "#drive-header",
            popover: {
              title: "Tu Espacio Personal",
              description:
                "Guarda aquí tus tareas, imágenes y documentos importantes.",
            },
          },
          {
            element: "#drive-botones",
            popover: {
              title: "Acciones",
              description:
                "Usa estos botones para crear carpetas o subir archivos nuevos.",
            },
          },
          {
            element: "#drive-lista",
            popover: {
              title: "Tus Archivos",
              description: "Haz clic en un archivo para verlo o descargarlo.",
            },
          },
        ];
      }

      // 4. TRÁMITES (Solicitudes)
      if (path.includes("/mis-solicitudes")) {
        return [
          {
            element: "#solicitudes-btn",
            popover: {
              title: "Nueva Solicitud",
              description: "¿Necesitas una constancia o Kardex? Pídela aquí.",
            },
          },
          {
            element: "#solicitudes-lista",
            popover: {
              title: "Seguimiento",
              description:
                "Aquí verás si tu trámite ya está listo o en proceso.",
            },
          },
        ];
      }

      // 5. AULA VIRTUAL
      if (path.includes("/aula")) {
        return [
          {
            element: "#tour-aula-header",
            popover: {
              title: "Materia y Grupo",
              description: "Verifica que estás en la clase correcta.",
            },
          },
          {
            element: "#tour-videollamada",
            popover: {
              title: "Clase en Vivo",
              description:
                "Si el botón aparece, ¡únete a la videollamada aquí!",
            },
          },
          {
            element: "#tour-tabs",
            popover: {
              title: "Secciones",
              description:
                "Navega entre Tareas, Recursos y el Foro de la clase.",
            },
          },
        ];
      }
    }

    // ==========================================
    // ROL: DOCENTE
    // ==========================================
    if (user.rol === "docente") {
      if (path.includes("/dashboard")) {
        return [
          {
            element: "#tour-docente-titulo",
            popover: {
              title: "Bienvenido Profe",
              description: "Gestione sus grupos desde aquí.",
            },
          },
          {
            element: "#tour-docente-grid",
            popover: {
              title: "Sus Grupos",
              description:
                "Seleccione un grupo para pasar lista, calificar o subir material.",
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
        "Esta sección no tiene un tutorial específico aún. Intenta en el Inicio.",
      );
      return;
    }

    const driverObj = driver({
      showProgress: true,
      steps: steps,
      nextBtnText: "Siguiente",
      prevBtnText: "Atrás",
      doneBtnText: "Finalizar",
    });

    driverObj.drive();
  };

  return (
    <button
      onClick={iniciarTour}
      className="fixed bottom-6 right-6 bg-[#a72a34] text-white p-3 rounded-full shadow-xl hover:bg-[#802028] transition-all z-50 flex items-center gap-2 font-bold hover:scale-105"
      style={{ zIndex: 99999 }}
      title="¿Necesitas ayuda?"
    >
      <HelpCircle size={28} />
    </button>
  );
};

export default TutorialGuide;
