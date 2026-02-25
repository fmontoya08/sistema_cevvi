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
      // 3. MI NUBE
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
      // 4. TRÁMITES
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
      // 5. CALENDARIO Y PERFIL
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
                "Revisa esta leyenda para saber qué significa cada color.",
            },
          },
        ];
      }
      if (path.includes("/mi-perfil")) {
        return [
          {
            element: "#tour-perfil-foto",
            popover: {
              title: "Tu Identidad",
              description:
                "Puedes subir o cambiar tu foto dando clic en el botón de la cámara.",
            },
          },
          {
            element: "#tour-perfil-contacto",
            popover: {
              title: "Datos Personales",
              description:
                "Mantén tu teléfono y correo al día para recibir notificaciones.",
            },
          },
          {
            element: "#tour-perfil-seguridad",
            popover: {
              title: "Privacidad",
              description: "Cambia tu contraseña aquí de forma segura.",
            },
          },
        ];
      }
      // 6. AULA VIRTUAL (ALUMNO)
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
        if (document.getElementById("tour-info-videollamada")) {
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
                "Aquí verás cuánto vale cada rubro (tareas, exámenes, etc.).",
            },
          });
        } else if (document.getElementById("tour-tareas-lista")) {
          baseSteps.push({
            element: "#tour-tareas-lista",
            popover: {
              title: "Subir Tareas",
              description:
                "¡Importante! Haz clic sobre la actividad para ver las instrucciones y poder adjuntar tu archivo de entrega.",
            },
          });
        } else if (document.getElementById("tour-recursos-lista")) {
          baseSteps.push({
            element: "#tour-recursos-lista",
            popover: {
              title: "Material de Estudio",
              description:
                "Descarga lecturas o abre enlaces compartidos por tu maestro.",
            },
          });
        } else if (document.getElementById("tour-foro-lista")) {
          baseSteps.push({
            element: "#tour-foro-lista",
            popover: {
              title: "Foro de Discusión",
              description:
                "Entra a un tema para debatir o presiona 'Nuevo' para hacer una pregunta.",
            },
          });
        } else if (document.getElementById("tour-muro-novedades")) {
          baseSteps.push({
            element: "#tour-muro-novedades",
            popover: {
              title: "Novedades y Avisos",
              description:
                "Aquí aparecerán anuncios rápidos e importantes de la materia.",
            },
          });
        } else if (document.getElementById("tour-examenes-lista")) {
          baseSteps.push({
            element: "#tour-examenes-lista",
            popover: {
              title: "Exámenes en Línea",
              description:
                "Cuando tengas una prueba programada aparecerá aquí. Clic en 'Resolver' para iniciar.",
            },
          });
        }
        return baseSteps;
      }
    }

    // ==========================================
    // ROL: DOCENTE (GUIADO PASO A PASO)
    // ==========================================
    if (user.rol === "docente") {
      // 1. DASHBOARD DEL DOCENTE
      if (path === "/docente/dashboard" || path === "/dashboard") {
        return [
          {
            element: "#tour-docente-hero",
            popover: {
              title: "Bienvenido, Profesor",
              description:
                "Este es su panel de inicio. Aquí puede ver un resumen rápido de su carga de trabajo.",
            },
          },
          {
            element: "#tour-docente-accesos",
            popover: {
              title: "Herramientas Útiles",
              description:
                "Desde aquí puede revisar su correo, ver el calendario oficial o entrar a su Nube privada para guardar archivos.",
            },
          },
          {
            element: "#tour-docente-cursos",
            popover: {
              title: "Sus Salones de Clase",
              description:
                "Esta es la parte más importante. Haga clic en cualquiera de estas tarjetas para entrar al Aula Virtual de ese grupo y dar su clase.",
            },
          },
          {
            element: "#tour-docente-avisos",
            popover: {
              title: "Avisos de Dirección",
              description:
                "Por favor, revise esta sección frecuentemente. Aquí la administración de la escuela publicará comunicados oficiales.",
            },
          },
        ];
      }

      // 2. AULA VIRTUAL DEL DOCENTE (SÚPER DETALLADA)
      if (path.includes("/aula")) {
        const baseSteps = [
          {
            element: "#tour-aula-header",
            popover: {
              title: "El Aula Virtual",
              description:
                "Ha entrado al salón de clases de esta materia. Todo lo que haga aquí lo verán los alumnos de este grupo.",
            },
          },
        ];

        // BOTONES DE ACCIÓN (Siempre visibles en el aula)
        if (document.getElementById("tour-docente-asistencia")) {
          baseSteps.push({
            element: "#tour-docente-asistencia",
            popover: {
              title: "Pase de Lista",
              description:
                "Al iniciar su clase, haga clic aquí. Se creará una hoja de asistencia con la fecha de hoy para que registre quién faltó.",
            },
          });
        }
        if (document.getElementById("tour-docente-editar")) {
          baseSteps.push({
            element: "#tour-docente-editar",
            popover: {
              title: "Configurar Clase",
              description:
                "Utilice este botón para pegar el enlace de Zoom/Meet, escribir la bienvenida y definir cómo va a evaluar a los alumnos.",
            },
          });
        }
        if (document.getElementById("tour-docente-acta")) {
          baseSteps.push({
            element: "#tour-docente-acta",
            popover: {
              title: "Acta Final de Calificaciones",
              description:
                "Al final del semestre, presione este botón para revisar los promedios y enviar las calificaciones finales a Control Escolar.",
            },
          });
        }

        // PESTAÑAS
        baseSteps.push({
          element: "#tour-tabs",
          popover: {
            title: "Navegación del Curso",
            description:
              "Use este menú para moverse entre las diferentes secciones: Tareas, Recursos, Exámenes, etc.",
          },
        });

        // DETECCIÓN DINÁMICA DE PESTAÑAS (Explicación para el profe)
        if (document.getElementById("tour-info-videollamada")) {
          baseSteps.push({
            element: "#tour-info-videollamada",
            popover: {
              title: "Iniciar Videollamada",
              description:
                "Si ya configuró el enlace (en el botón 'Editar Curso'), usted y sus alumnos pueden hacer clic aquí para iniciar la clase en vivo.",
            },
          });
        } else if (document.getElementById("tour-tareas-lista")) {
          baseSteps.push({
            element: "#tour-docente-btn-tarea",
            popover: {
              title: "Dejar una Tarea",
              description:
                "Haga clic aquí para pedirle un trabajo a los alumnos. Podrá ponerle título, instrucciones y una fecha límite.",
            },
          });
          baseSteps.push({
            element: "#tour-tareas-lista",
            popover: {
              title: "Calificar Trabajos",
              description:
                "Cuando los alumnos entreguen, haga clic en el nombre de la tarea en esta lista para ver sus archivos y asignarles una calificación.",
            },
          });
        } else if (document.getElementById("tour-recursos-lista")) {
          baseSteps.push({
            element: "#tour-docente-btn-recurso",
            popover: {
              title: "Compartir Material",
              description:
                "Use este botón para subir lecturas en PDF, presentaciones o enlaces de YouTube para que los alumnos estudien.",
            },
          });
        } else if (document.getElementById("tour-muro-novedades")) {
          baseSteps.push({
            element: "#tour-muro-novedades",
            popover: {
              title: "Avisos Rápidos",
              description:
                "Escriba aquí si quiere dar un aviso urgente ('Jóvenes, la clase de hoy se pasa a mañana'). Les llegará una notificación a su celular.",
            },
          });
        } else if (document.getElementById("tour-examenes-lista")) {
          baseSteps.push({
            element: "#tour-examenes-lista",
            popover: {
              title: "Exámenes en Línea",
              description:
                "Desde aquí puede redactar exámenes de opción múltiple. El sistema los calificará automáticamente por usted.",
            },
          });
        }

        return baseSteps;
      }
    }
    if (path.includes("/mi-nube")) {
      return [
        {
          element: "#drive-header",
          popover: {
            title: "Su Espacio Personal",
            description:
              "Guarde aquí sus planeaciones, presentaciones y documentos importantes. Funciona como una memoria USB en internet.",
          },
        },
        {
          element: "#drive-botones",
          popover: {
            title: "Organizar y Subir",
            description:
              "Haga clic en estos botones para crear carpetas (ej. 'Material 1er Semestre') o para subir archivos desde su computadora.",
          },
        },
        {
          element: "#drive-lista",
          popover: {
            title: "Sus Archivos",
            description:
              "Aquí verá todo lo que ha guardado. Haga clic sobre ellos para abrirlos, descargarlos o eliminarlos.",
          },
        },
      ];
    }

    // 4. CALENDARIO INSTITUCIONAL
    if (path.includes("/calendario")) {
      return [
        {
          element: "#tour-calendario-header",
          popover: {
            title: "Calendario de Actividades",
            description:
              "Verifique aquí las fechas clave del ciclo escolar, periodos de exámenes y días feriados.",
          },
        },
        {
          element: "#tour-calendario-leyenda",
          popover: {
            title: "Código de Colores",
            description:
              "Esta leyenda le ayudará a identificar visualmente si un día hay clases regulares, asíncronas o suspensión.",
          },
        },
        {
          element: "#tour-calendario-vista",
          popover: {
            title: "Mes a Mes",
            description:
              "Puede cambiar de mes en la parte superior y hacer clic en cualquier recuadro para leer los detalles del evento.",
          },
        },
      ];
    }

    // 5. MI PERFIL (DOCENTE)
    if (path.includes("/mi-perfil")) {
      return [
        {
          element: "#tour-perfil-foto",
          popover: {
            title: "Su Identidad Visual",
            description:
              "Le sugerimos subir una fotografía formal haciendo clic en la cámara. Esto ayuda a los alumnos a identificarlo fácilmente.",
          },
        },
        {
          element: "#tour-perfil-contacto",
          popover: {
            title: "Datos de Contacto",
            description:
              "Por favor, mantenga actualizado su teléfono y correo para que la administración pueda comunicarse con usted.",
          },
        },
        {
          element: "#tour-perfil-seguridad",
          popover: {
            title: "Seguridad de su Cuenta",
            description:
              "Por su seguridad y la de las calificaciones, cambie su contraseña periódicamente en esta sección.",
          },
        },
      ];
    }

    return [];
  };

  const iniciarTour = () => {
    const steps = getSteps();

    if (steps.length === 0) {
      alert(
        "No hay un tutorial configurado para esta sección aún. Si tiene dudas, consulte a administración.",
      );
      return;
    }

    const driverObj = driver({
      showProgress: true,
      steps: steps,
      nextBtnText: "Siguiente →",
      prevBtnText: "← Atrás",
      doneBtnText: "¡Entendido!",
      overlayColor: "rgba(0, 0, 0, 0.7)", // Un poco más oscuro para que resalte más el recuadro
    });

    driverObj.drive();
  };

  return (
    <button
      onClick={iniciarTour}
      className="fixed bottom-6 right-6 bg-[#a72a34] text-white p-4 rounded-full shadow-2xl hover:bg-[#802028] transition-transform z-50 flex items-center justify-center hover:scale-110 border-4 border-white/20 animate-bounce" // Se agregó un rebote suave para llamar su atención
      style={{ zIndex: 99999 }}
      title="Haga clic aquí si necesita ayuda"
    >
      <HelpCircle size={28} />
    </button>
  );
};

export default TutorialGuide;
