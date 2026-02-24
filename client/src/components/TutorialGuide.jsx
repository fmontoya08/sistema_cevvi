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
      if (path === "/alumno/dashboard" || path === "/dashboard") {
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
                "Estas son tus clases activas. Haz clic en el nombre de la materia para entrar al Aula Virtual.",
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
                "Lista detallada de todos tus movimientos financieros y fechas de vencimiento.",
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
              description:
                "¿Necesitas una constancia o Kardex? Pídela desde este botón.",
            },
          },
          {
            element: "#solicitudes-lista",
            popover: {
              title: "Seguimiento",
              description:
                "Aquí verás si tu trámite ya está listo, en revisión o rechazado.",
            },
          },
        ];
      }

      // 5. AULA VIRTUAL (¡DINÁMICO POR PESTAÑAS!)
      if (path.includes("/aula")) {
        const baseSteps = [
          {
            element: "#tour-aula-header",
            popover: {
              title: "Aula Virtual",
              description: "Estás en el salón de clases de esta materia.",
            },
          },
          {
            element: "#tour-tabs",
            popover: {
              title: "Menú del Aula",
              description:
                "Usa estas pestañas para navegar entre tus tareas, material de estudio, exámenes y más.",
            },
          },
        ];

        // Detectar dinámicamente qué pestaña está abierta buscando el ID en el DOM
        if (document.getElementById("tour-info-videollamada")) {
          // PESTAÑA: INFORMACIÓN
          baseSteps.push({
            element: "#tour-info-videollamada",
            popover: {
              title: "Clase en Vivo",
              description:
                "Cuando sea hora de clase, haz clic en el botón de este recuadro para entrar a la videollamada.",
            },
          });
          baseSteps.push({
            element: "#tour-info-evaluacion",
            popover: {
              title: "Criterios de Evaluación",
              description:
                "Aquí verás cuánto vale cada rubro (tareas, exámenes, etc.) para tu calificación final.",
            },
          });
          if (document.getElementById("tour-info-asistencia")) {
            baseSteps.push({
              element: "#tour-info-asistencia",
              popover: {
                title: "Tu Asistencia",
                description:
                  "Revisa tu registro de faltas y asistencias tomadas por el docente.",
              },
            });
          }
        } else if (document.getElementById("tour-tareas-lista")) {
          // PESTAÑA: TAREAS
          baseSteps.push({
            element: "#tour-tareas-lista",
            popover: {
              title: "Subir Tareas",
              description:
                "¡Importante! Haz clic sobre la actividad para ver las instrucciones y poder adjuntar tu archivo de entrega.",
            },
          });
        } else if (document.getElementById("tour-recursos-lista")) {
          // PESTAÑA: RECURSOS
          baseSteps.push({
            element: "#tour-recursos-lista",
            popover: {
              title: "Material de Estudio",
              description:
                "Aquí puedes descargar lecturas, PDF o ver enlaces de apoyo compartidos por tu maestro.",
            },
          });
        } else if (document.getElementById("tour-foro-lista")) {
          // PESTAÑA: FORO
          baseSteps.push({
            element: "#tour-foro-lista",
            popover: {
              title: "Foro de Discusión",
              description:
                "Entra a un tema para debatir con tus compañeros o presiona 'Nuevo' para hacerle una pregunta al profesor.",
            },
          });
        } else if (document.getElementById("tour-muro-novedades")) {
          // PESTAÑA: MURO
          baseSteps.push({
            element: "#tour-muro-novedades",
            popover: {
              title: "Novedades y Avisos",
              description:
                "Mantente atento. Aquí aparecerán anuncios rápidos e importantes de la materia.",
            },
          });
        } else if (document.getElementById("tour-examenes-lista")) {
          // PESTAÑA: EXÁMENES
          baseSteps.push({
            element: "#tour-examenes-lista",
            popover: {
              title: "Exámenes en Línea",
              description:
                "Cuando tengas una prueba programada aparecerá aquí. Solo da clic en 'Resolver' para iniciar.",
            },
          });
        }

        return baseSteps;
      }

      // 1. DASHBOARD (Inicio)
      if (path === "/alumno/dashboard" || path === "/dashboard") {
        return [
          {
            element: "#tour-resumen-perfil",
            popover: {
              title: "¡Bienvenido a tu Portal!",
              description:
                "Aquí verás un resumen de tu perfil y grupo asignado.",
            },
          },
          {
            element: "#tour-accesos-rapidos",
            popover: {
              title: "Accesos Rápidos",
              description:
                "Atajos directos para ver tus pagos, solicitar constancias o abrir tu nube personal.",
            },
          },
          {
            element: "#tour-mis-clases",
            popover: {
              title: "Tus Materias",
              description:
                "Estas son tus clases del semestre. Haz clic en cualquiera para entrar al Aula Virtual y ver tus tareas.",
            },
          },
          {
            element: "#tour-anuncios",
            popover: {
              title: "Tablero de Avisos",
              description:
                "Mantente informado. Aquí la dirección publicará anuncios importantes para toda la escuela.",
            },
          },
          {
            element: "#tour-notificaciones",
            popover: {
              title: "Notificaciones",
              description:
                "Revisa aquí la campanita para alertas de tareas calificadas o mensajes de tus profesores.",
            },
          },
        ];
      }

      // 6. CALENDARIO
      if (path.includes("/calendario")) {
        return [
          {
            element: "#tour-calendario-header",
            popover: {
              title: "Calendario Institucional",
              description:
                "Aquí puedes ver las fechas clave del ciclo, vacaciones y días festivos.",
            },
          },
          {
            element: "#tour-calendario-leyenda",
            popover: {
              title: "Código de Colores",
              description:
                "Revisa esta leyenda para saber qué significa cada color (clases regulares, asíncronas o días libres).",
            },
          },
          {
            element: "#tour-calendario-vista",
            popover: {
              title: "Vista del Mes",
              description:
                "Navega entre los meses y haz clic sobre los eventos para ver más detalles si los tienen.",
            },
          },
        ];
      }

      // 7. MI PERFIL
      if (path.includes("/mi-perfil")) {
        return [
          {
            element: "#tour-perfil-foto",
            popover: {
              title: "Tu Identidad",
              description:
                "Puedes subir o cambiar tu foto dando clic en el botón de la cámara. ¡Mantén tu credencial actualizada!",
            },
          },
          {
            element: "#tour-perfil-academico",
            popover: {
              title: "Estatus Escolar",
              description:
                "Aquí verás a qué carrera y sede perteneces. Esta información es oficial y no puede editarse.",
            },
          },
          {
            element: "#tour-perfil-contacto",
            popover: {
              title: "Datos Personales",
              description:
                "Es muy importante que mantengas tu teléfono y correo al día para recibir notificaciones.",
            },
          },
          {
            element: "#tour-perfil-seguridad",
            popover: {
              title: "Privacidad",
              description:
                "Desde aquí puedes cambiar tu contraseña en cualquier momento de manera segura.",
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
      alert("No hay un tutorial configurado para esta sección en específico.");
      return;
    }

    const driverObj = driver({
      showProgress: true,
      steps: steps,
      nextBtnText: "Siguiente →",
      prevBtnText: "← Atrás",
      doneBtnText: "¡Entendido!",
      overlayColor: "rgba(0, 0, 0, 0.6)",
    });

    driverObj.drive();
  };

  return (
    <button
      onClick={iniciarTour}
      className="fixed bottom-6 right-6 bg-[#a72a34] text-white p-4 rounded-full shadow-2xl hover:bg-[#802028] transition-transform z-50 flex items-center justify-center hover:scale-110 border-4 border-white/20"
      style={{ zIndex: 99999 }}
      title="Tutorial de esta pantalla"
    >
      <HelpCircle size={28} />
    </button>
  );
};

export default TutorialGuide;
