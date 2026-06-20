const AulaVirtualPage = () => {
  const { grupoId, asignaturaId } = useParams();
  const { user } = useAuth();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false); // Para editar la config del curso
  const [formData, setFormData] = useState({
    /* ... estado inicial ... */
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const navigate = useNavigate();

  // Estados de las secciones
  const [tareas, setTareas] = useState([]);
  const [loadingTareas, setLoadingTareas] = useState(true);
  const [recursos, setRecursos] = useState([]);
  const [loadingRecursos, setLoadingRecursos] = useState(true);
  const [historialAsistencia, setHistorialAsistencia] = useState([]); // Alumno
  const [loadingHistorial, setLoadingHistorial] = useState(false); // Alumno

  // Estados de los Modales
  const [showCrearTareaModal, setShowCrearTareaModal] = useState(false);
  const [showEntregarModal, setShowEntregarModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showRecursoModal, setShowRecursoModal] = useState(false);

  // --- NUEVO ESTADO PARA PESTAÑAS Y FORO ---
  const [activeTab, setActiveTab] = useState("info"); // 'info', 'tareas', 'recursos', 'foro'
  const [hilosForo, setHilosForo] = useState([]);
  const [loadingHilos, setLoadingHilos] = useState(true);
  const [showNuevoHiloModal, setShowNuevoHiloModal] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  // --- FIN NUEVO ESTADO ---

  // --- Funciones de Carga (fetchAulaConfig, fetchTareas, fetchRecursos, fetchHistorialAsistencia se mantienen igual) ---
  const fetchAulaConfig = useCallback(async () => {
    try {
      const { data } = await api.get(
        `/${user?.rol}/aula-virtual/${grupoId}/${asignaturaId}/config`,
      );
      if (!data) return;
      setConfig(data);
      setFormData({
        enlace_videollamada: data.enlace_videollamada || "",
        descripcion_curso: data.descripcion_curso || "",
        objetivos: data.objetivos || "",
        evaluacion: data.evaluacion || "",
        horario: data.horario || "",
        contacto_docente: data.contacto_docente || "",
        notificar_inicio: data.notificar_inicio ? true : false,
      });
    } catch (error) {
      console.error("Error al cargar config", error);
    } finally {
      setLoading(false);
    }
  }, [user?.rol, grupoId, asignaturaId]);

  const fetchTareas = useCallback(async () => {
    setLoadingTareas(true);
    try {
      const { data } = await api.get(
        `/${user?.rol}/aula-virtual/${grupoId}/${asignaturaId}/tareas`,
      );
      if (data) setTareas(data);
    } catch (error) {
      console.error("Error al cargar tareas", error);
    } finally {
      setLoadingTareas(false);
    }
  }, [user?.rol, grupoId, asignaturaId]);

  const fetchRecursos = useCallback(async () => {
    setLoadingRecursos(true);
    try {
      const { data } = await api.get(
        `/${user?.rol}/aula-virtual/${grupoId}/${asignaturaId}/recursos`,
      );
      if (data) setRecursos(data);
    } catch (error) {
      console.error("Error al cargar recursos", error);
    } finally {
      setLoadingRecursos(false);
    }
  }, [user?.rol, grupoId, asignaturaId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchHistorialAsistencia = useCallback(async () => {
    if (user?.rol !== "alumno") return;
    setLoadingHistorial(true);
    try {
      const { data } = await api.get(
        `/alumno/aula-virtual/${grupoId}/${asignaturaId}/mis-asistencias`,
      );
      if (data) setHistorialAsistencia(data);
    } catch (error) {
      console.error("Error al cargar historial", error);
    } finally {
      setLoadingHistorial(false);
    }
  }, [user?.rol, grupoId, asignaturaId]);

  // --- NUEVA FUNCIÓN PARA CARGAR HILOS DEL FORO ---
  const fetchHilos = useCallback(async () => {
    setLoadingHilos(true);
    try {
      // Usamos la ruta /api/foro/... que creamos (accesible por ambos roles)
      const { data } = await api.get(`/foro/${grupoId}/${asignaturaId}/hilos`);
      if (data) setHilosForo(data);
    } catch (error) {
      console.error("Error al cargar hilos del foro", error);
      setHilosForo([]);
    } finally {
      setLoadingHilos(false);
    }
  }, [grupoId, asignaturaId]);
  // --- FIN NUEVA FUNCIÓN ---

  // Cargar todos los datos al montar
  useEffect(() => {
    setLoading(true); // Ponemos el loading principal
    Promise.all([
      fetchAulaConfig(),
      fetchTareas(),
      fetchRecursos(),
      fetchHistorialAsistencia(),
      fetchHilos(), // <-- Llamamos a cargar hilos
    ]).then(() => {
      // setLoading(false); // fetchAulaConfig ya lo hace en su finally
    });
  }, [
    fetchAulaConfig,
    fetchTareas,
    fetchRecursos,
    fetchHistorialAsistencia,
    fetchHilos,
  ]); // <-- Agregamos fetchHilos

  // --- Funciones de Acción (handleSave, handleChange, etc. se mantienen igual) ---
  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await api.put(
        `/docente/aula-virtual/${grupoId}/${asignaturaId}/config`,
        formData,
      );
      setIsSaving(false);
      setSaveSuccess(true);
      setIsEditing(false);
      // Actualizar config localmente para no recargar todo
      setConfig((prev) => ({ ...prev, ...formData }));
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Error al guardar", error);
      setIsSaving(false);
      alert("Error al guardar.");
    }
  };
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  const handleOpenEntregarModal = (tarea) => {
    setSelectedTask(tarea);
    setShowEntregarModal(true);
  };
  const handleDeleteRecurso = async (recursoId) => {
    if (window.confirm("¿Seguro?")) {
      try {
        await api.delete(`/docente/aula-virtual/recurso/${recursoId}`);
        fetchRecursos();
      } catch (error) {
        console.error("Error al eliminar", error);
        alert("Error.");
      }
    }
  };
  const handleIniciarSesionHoy = async () => {
    setIsCreatingSession(true); // 1. Muestra "Iniciando..."
    try {
      // 2. Llama a la API para crear/obtener la sesión de hoy
      const { data } = await api.post(
        `/docente/aula-virtual/${grupoId}/${asignaturaId}/iniciar-sesion`,
        {
          // Opcional: podrías enviar un tema si tuvieras un input para ello
          // tema_sesion: "Clase del día"
        },
      );

      const { sesionId } = data || {}; // 3. Obtiene el ID de la sesión

      if (sesionId) {
        // 4. Redirige al docente a la página de asistencia con ese ID
        navigate(
          `/docente/grupo/${grupoId}/asignatura/${asignaturaId}/asistencia/${sesionId}`,
        );
      } else {
        throw new Error("No se recibió un ID de sesión.");
      }
    } catch (error) {
      // 5. Maneja errores
      console.error("Error al iniciar la sesión de asistencia:", error);
      alert(
        "Error al iniciar la sesión: " +
          (error.response?.data?.message || error.message),
      );
    } finally {
      // 6. Restablece el botón
      setIsCreatingSession(false);
    }
  };

  if (loading)
    return <p className="text-center mt-10">Cargando aula virtual...</p>;
  if (!config)
    return (
      <p className="text-center mt-10 text-red-600">
        No se pudo cargar la configuración del aula.
      </p>
    );

  // --- Componente para Formulario de Editar Config (renderDocenteForm se mantiene igual) ---
  // Componente para Formulario de Editar Config
  const renderDocenteForm = () => (
    <form
      onSubmit={handleSave}
      className="bg-gray-50 p-6 rounded-lg shadow-inner space-y-6"
    >
      {/* Bloque Enlace Videoconferencia */}
      <div>
        <label
          htmlFor="enlace_videollamada"
          className="block text-sm font-medium text-gray-700"
        >
          Enlace de la Videollamada (Zoom, Meet, etc.)
        </label>
        <input
          type="url"
          name="enlace_videollamada"
          id="enlace_videollamada"
          value={formData.enlace_videollamada}
          onChange={handleChange}
          placeholder="https://zoom.us/j/..."
          className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-principal focus:border-principal"
        />
        <button
          type="button"
          onClick={() =>
            setFormData((prev) => ({
              ...prev,
              enlace_videollamada: `https://meet.jit.si/CEVVI-G${grupoId}-A${asignaturaId}`,
            }))
          }
          className="flex items-center mt-2 px-3 py-1 text-sm text-white bg-secundario rounded-md hover:opacity-90"
        >
          <Sparkles size={16} className="mr-2" />
          Generar enlace de Jitsi Meet
        </button>
      </div>
      {/* Nuevos Campos Estructurados */}
      <div>
        <label
          htmlFor="objetivos"
          className="block text-sm font-medium text-gray-700"
        >
          Objetivos del Curso
        </label>
        <textarea
          name="objetivos"
          id="objetivos"
          rows="4"
          value={formData.objetivos}
          onChange={handleChange}
          placeholder="Al finalizar el curso, el alumno será capaz de..."
          className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-principal focus:border-principal"
        ></textarea>
      </div>
      <div>
        <label
          htmlFor="evaluacion"
          className="block text-sm font-medium text-gray-700"
        >
          Criterios de Evaluación
        </label>
        <textarea
          name="evaluacion"
          id="evaluacion"
          rows="3"
          value={formData.evaluacion}
          onChange={handleChange}
          placeholder="Ej: Tareas 50%, Examen Final 30%, Participación 20%"
          className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-principal focus:border-principal"
        ></textarea>
      </div>
      <div>
        <label
          htmlFor="horario"
          className="block text-sm font-medium text-gray-700"
        >
          Horario de Clases / Oficina
        </label>
        <textarea
          name="horario"
          id="horario"
          rows="2"
          value={formData.horario}
          onChange={handleChange}
          placeholder="Ej: Lunes y Miércoles 10:00 - 12:00. Consultas: Viernes 11:00"
          className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-principal focus:border-principal"
        ></textarea>
      </div>
      <div>
        <label
          htmlFor="contacto_docente"
          className="block text-sm font-medium text-gray-700"
        >
          Información de Contacto (Docente)
        </label>
        <textarea
          name="contacto_docente"
          id="contacto_docente"
          rows="2"
          value={formData.contacto_docente}
          onChange={handleChange}
          placeholder="Ej: Email: profe@mail.com | Sala virtual: https://meet..."
          className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-principal focus:border-principal"
        ></textarea>
      </div>
      {/* Campo Descripción General (Opcional) */}
      <div>
        <label
          htmlFor="descripcion_curso"
          className="block text-sm font-medium text-gray-700"
        >
          Descripción General / Mensaje de Bienvenida (Opcional)
        </label>
        <textarea
          name="descripcion_curso"
          id="descripcion_curso"
          rows="4"
          value={formData.descripcion_curso}
          onChange={handleChange}
          placeholder="Bienvenidos al curso..."
          className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-principal focus:border-principal"
        ></textarea>
      </div>
      {/* Botones Guardar/Cancelar */}
      <div className="flex justify-end items-center space-x-4 mt-6">
        {saveSuccess && (
          <span className="flex items-center text-green-600">
            <CheckCircle size={18} className="mr-1" /> Guardado
          </span>
        )}
        <button
          type="button"
          onClick={() => setIsEditing(false)}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="px-4 py-2 bg-principal text-white rounded-md hover:opacity-90 disabled:bg-gray-400"
        >
          {isSaving ? "Guardando..." : "Guardar Cambios"}
        </button>
      </div>
    </form>
  );

  // --- Componentes para Renderizar Secciones (Listas) ---
  // renderTareasList y renderRecursosList se mantienen igual
  // Componente para mostrar la lista de tareas
  const renderTareasList = () => {
    if (loadingTareas) return <p>Cargando tareas...</p>;
    if (tareas.length === 0) {
      return (
        <p className="text-gray-500">
          {user?.rol === "docente"
            ? "Aún no has creado ninguna tarea. ¡Crea la primera!"
            : "Aún no hay tareas publicadas para este curso."}
        </p>
      );
    }
    return (
      <div className="space-y-4">
        {tareas.map((tarea) => {
          if (user?.rol === "docente") {
            // El DOCENTE ve un Link a la página de detalles
            return (
              <Link
                key={tarea.id}
                to={`/docente/grupo/${grupoId}/asignatura/${asignaturaId}/tarea/${tarea.id}`}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border w-full text-left transition-all hover:bg-gray-100 hover:shadow-sm"
              >
                <div className="flex items-center">
                  <FileText className="w-6 h-6 text-principal mr-4" />
                  <div>
                    <span className="font-bold text-lg text-gray-800">
                      {tarea.titulo}
                    </span>
                    <p className="text-sm text-gray-600">
                      {tarea.fecha_limite
                        ? `Fecha límite: ${new Date(
                            tarea.fecha_limite,
                          ).toLocaleString()}`
                        : "Sin fecha límite"}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-secundario">
                  {tarea.total_entregas} Entregas
                </span>
              </Link>
            );
          }
          // El ALUMNO ve un Botón que abre el modal
          const isEntregada = !!tarea.entrega_id;
          const isCalificada = tarea.calificacion !== null;
          return (
            <button
              key={tarea.id}
              onClick={() => handleOpenEntregarModal(tarea)}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border w-full text-left transition-all hover:bg-gray-100 hover:shadow-sm"
            >
              <div className="flex items-center">
                <FileText className="w-6 h-6 text-principal mr-4" />
                <div>
                  <span className="font-bold text-lg text-gray-800">
                    {tarea.titulo}
                  </span>
                  <p className="text-sm text-gray-600">
                    {tarea.fecha_limite
                      ? `Fecha límite: ${new Date(
                          tarea.fecha_limite,
                        ).toLocaleString()}`
                      : "Sin fecha límite"}
                  </p>
                </div>
              </div>
              <span
                className={`flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                  isCalificada
                    ? "bg-green-100 text-green-800"
                    : isEntregada
                      ? "bg-blue-100 text-blue-800"
                      : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {isCalificada ? (
                  <>
                    <Check size={14} className="mr-1" /> Calificado
                  </>
                ) : isEntregada ? (
                  "Entregado"
                ) : (
                  "Pendiente"
                )}
              </span>
            </button>
          );
        })}
      </div>
    );
  };
  // Componente para mostrar la lista de RECURSOS
  const renderRecursosList = () => {
    if (loadingRecursos) return <p>Cargando recursos...</p>;
    if (recursos.length === 0) {
      return (
        <p className="text-gray-500">
          {user?.rol === "docente"
            ? "Aún no has subido ningún recurso."
            : "Aún no hay recursos disponibles."}
        </p>
      );
    }
    return (
      <div className="space-y-3">
        {recursos.map((recurso) => {
          const isEnlace = recurso.tipo_recurso === "enlace";
          const Icono = isEnlace ? LinkIcon : Paperclip;
          const url = isEnlace
            ? recurso.ruta_o_url
            : `http://localhost:3001/uploads/recursos/${recurso.ruta_o_url}`;
          return (
            <div
              key={recurso.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
            >
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-blue-600 hover:underline"
              >
                <Icono className="w-5 h-5 mr-3" />
                <span className="font-medium">{recurso.titulo}</span>
                {!isEnlace && (
                  <span className="text-xs text-gray-500 ml-2">
                    ({recurso.nombre_original})
                  </span>
                )}
              </a>
              {user?.rol === "docente" && (
                <button
                  onClick={() => handleDeleteRecurso(recurso.id)}
                  className="text-red-500 hover:text-red-700"
                  title="Eliminar recurso"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // --- NUEVO: Componente para Renderizar Lista del Foro ---
  const renderForoList = () => {
    if (loadingHilos) return <p>Cargando discusiones...</p>;
    if (hilosForo.length === 0) {
      return (
        <div className="text-center py-8 px-4 bg-gray-50 rounded-md border border-gray-200">
          <MessageSquare size={40} className="mx-auto text-gray-400" />
          <h4 className="font-semibold text-lg mt-3">No hay discusiones aún</h4>
          <p className="text-gray-600 mt-1">¡Sé el primero en iniciar una!</p>
          <button
            onClick={() => setShowNuevoHiloModal(true)}
            className="mt-4 flex items-center mx-auto px-4 py-2 font-semibold text-white bg-principal rounded-md hover:opacity-90"
          >
            <Plus size={18} className="mr-2" />
            Iniciar Nueva Discusión
          </button>
        </div>
      );
    }
    return (
      <div className="space-y-4">
        {/* Botón para Nuevo Hilo arriba de la lista */}
        <div className="text-right mb-4">
          <button
            onClick={() => setShowNuevoHiloModal(true)}
            className="flex items-center ml-auto px-4 py-2 font-semibold text-white bg-principal rounded-md hover:opacity-90"
          >
            <Plus size={18} className="mr-2" />
            Iniciar Nueva Discusión
          </button>
        </div>
        {/* Lista de Hilos */}
        {hilosForo.map((hilo) => (
          <Link
            key={hilo.id}
            // Enlace a la página del hilo (ajustar ruta si es alumno)
            to={
              user?.rol === "docente"
                ? `/docente/grupo/${grupoId}/asignatura/${asignaturaId}/foro/hilo/${hilo.id}`
                : `/alumno/grupo/${grupoId}/asignatura/${asignaturaId}/foro/hilo/${hilo.id}`
            }
            className="block p-4 bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-bold text-lg text-principal mb-1">
                  {hilo.titulo}
                </h4>
                <p className="text-xs text-gray-500">
                  Iniciado por {hilo.creador_nombre} {hilo.creador_apellido} (
                  {hilo.creador_rol}) -{" "}
                  {new Date(hilo.fecha_creacion).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right flex-shrink-0 ml-4">
                <p className="text-sm font-semibold text-gray-700">
                  {hilo.num_respuestas}{" "}
                  {hilo.num_respuestas === 1 ? "Respuesta" : "Respuestas"}
                </p>
                {hilo.ultima_respuesta_fecha && (
                  <p className="text-xs text-gray-500 mt-1">
                    Última:{" "}
                    {new Date(hilo.ultima_respuesta_fecha).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    );
  };
  // --- FIN NUEVO COMPONENTE ---

  // --- Componente Principal de Vista (Rediseñado con Pestañas) ---
  // --- Componente Principal de Vista (Rediseñado con Pestañas) ---
  // --- Componente Principal de Vista (Rediseñado estilo Dashboard) ---
  const renderView = () => (
    <div className="space-y-6">
      {/* 1. ENCABEZADO TIPO DASHBOARD (Fondo Blanco, Sombra Suave) */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-800 tracking-tight">
            Aula Virtual
          </h2>
          <div className="flex items-center gap-2 mt-2">
            {/* Badges de Estado con diseño sutil */}
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                config.modalidad === "presencial"
                  ? "bg-blue-50 text-blue-700 border-blue-100"
                  : "bg-purple-50 text-purple-700 border-purple-100"
              }`}
            >
              {config.modalidad}
            </span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                config.estatus === "activo"
                  ? "bg-green-50 text-green-700 border-green-100"
                  : "bg-red-50 text-red-700 border-red-100"
              }`}
            >
              {config.estatus}
            </span>
          </div>
        </div>

        {/* BOTONES DE ACCIÓN DOCENTE (Ahora ROJOS y Estilizados) */}
        <div className="flex items-center gap-3">
          {user?.rol === "docente" && (
            <>
              {/* Botón Asistencia */}
              <button
                onClick={handleIniciarSesionHoy}
                disabled={isCreatingSession}
                className="flex items-center px-5 py-3 text-sm font-bold text-white bg-[#a72a34] rounded-xl hover:bg-[#802028] disabled:bg-gray-400 shadow-lg shadow-red-900/20 transition-all active:scale-95"
              >
                <ClipboardCheck size={18} className="mr-2" />
                {isCreatingSession ? "Iniciando..." : "Pasar Asistencia"}
              </button>

              {/* Botón Editar (Estilo secundario pero acorde) */}
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center px-4 py-3 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:text-[#a72a34] hover:border-[#a72a34]/30 transition-all shadow-sm"
              >
                <Edit2 size={18} className="mr-2" /> Editar Curso
              </button>

              {/* Botón Calificaciones */}
              <button
                onClick={() =>
                  navigate(
                    `/docente/grupo/${grupoId}/asignatura/${asignaturaId}`,
                  )
                }
                className="flex items-center px-4 py-3 text-sm font-bold text-[#a72a34] bg-red-50 border border-red-100 rounded-xl hover:bg-[#a72a34] hover:text-white transition-all shadow-sm"
              >
                <GraduationCap size={18} className="mr-2" />
                Acta Final
              </button>
            </>
          )}
        </div>
      </div>

      {/* 2. NAVEGACIÓN DE PESTAÑAS (Estilo "Underline" limpio) */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab("info")}
            className={`pb-4 px-2 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "info"
                ? "border-[#a72a34] text-[#a72a34]"
                : "border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-300"
            }`}
          >
            <Book size={18} /> Información
          </button>
          <button
            onClick={() => setActiveTab("tareas")}
            className={`pb-4 px-2 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "tareas"
                ? "border-[#a72a34] text-[#a72a34]"
                : "border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-300"
            }`}
          >
            <FileText size={18} /> Tareas
          </button>
          <button
            onClick={() => setActiveTab("recursos")}
            className={`pb-4 px-2 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "recursos"
                ? "border-[#a72a34] text-[#a72a34]"
                : "border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-300"
            }`}
          >
            <Paperclip size={18} /> Recursos
          </button>
          <button
            onClick={() => setActiveTab("foro")}
            className={`pb-4 px-2 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "foro"
                ? "border-[#a72a34] text-[#a72a34]"
                : "border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-300"
            }`}
          >
            <MessageSquare size={18} /> Foro
          </button>
        </nav>
      </div>

      {/* 3. CONTENIDO DE LA PESTAÑA ACTIVA (Card Blanca Limpia) */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 min-h-[400px]">
        {/* Pestaña: Información */}
        {activeTab === "info" && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Sección Videollamada Destacada */}
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-6 rounded-2xl text-white flex justify-between items-center shadow-lg">
              <div>
                <h4 className="font-bold text-lg mb-1 flex items-center gap-2">
                  <Video className="text-red-500" /> Sala de Videoconferencia
                </h4>
                <p className="text-gray-300 text-sm">
                  {config.enlace_videollamada
                    ? "Enlace activo para la sesión en vivo."
                    : "El docente aún no ha configurado el enlace."}
                </p>
              </div>
              {config.enlace_videollamada && (
                <a
                  href={config.enlace_videollamada}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-[#a72a34] hover:bg-[#802028] text-white font-bold rounded-xl transition-all shadow-lg transform hover:-translate-y-1 flex items-center gap-2"
                >
                  Unirse a la Clase <ArrowRightCircle size={18} />
                </a>
              )}
            </div>

            {/* Grid de Información */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div>
                  <h4 className="font-bold text-gray-800 border-b border-gray-100 pb-2 mb-2 flex items-center gap-2">
                    <Sparkles size={16} className="text-[#a72a34]" /> Objetivos
                  </h4>
                  <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">
                    {config.objetivos || "Sin información definida."}
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 border-b border-gray-100 pb-2 mb-2 flex items-center gap-2">
                    <Award size={16} className="text-[#a72a34]" /> Evaluación
                  </h4>
                  <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">
                    {config.evaluacion || "Sin criterios definidos."}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                    <Clock size={16} className="text-[#a72a34]" /> Horario
                  </h4>
                  <p className="text-gray-600 text-sm whitespace-pre-wrap">
                    {config.horario || "Por definir."}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                    <User size={16} className="text-[#a72a34]" /> Contacto
                    Docente
                  </h4>
                  <p className="text-gray-600 text-sm whitespace-pre-wrap">
                    {config.contacto_docente || "No especificado."}
                  </p>
                </div>
              </div>
            </div>

            {/* Historial Asistencia (Solo Alumno) */}
            {user?.rol === "alumno" && (
              <div className="mt-8 pt-8 border-t border-gray-100">
                <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <History size={20} className="text-gray-400" /> Mi Asistencia
                </h4>
                {loadingHistorial ? (
                  <p className="text-sm text-gray-400">Cargando...</p>
                ) : historialAsistencia.length === 0 ? (
                  <div className="p-6 bg-gray-50 rounded-xl text-center text-gray-400 text-sm border border-dashed">
                    No hay registros de asistencia.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {historialAsistencia.map((reg) => (
                      <div
                        key={reg.sesion_id}
                        className={`p-3 rounded-xl border text-center ${
                          reg.mi_estatus === "presente"
                            ? "bg-green-50 border-green-100"
                            : reg.mi_estatus === "justificado"
                              ? "bg-yellow-50 border-yellow-100"
                              : "bg-red-50 border-red-100"
                        }`}
                      >
                        <p className="text-xs font-bold text-gray-500 mb-1">
                          {(() => {
                            const parts = reg.fecha_sesion.split("-");
                            return `${parts[2]}/${parts[1]}`;
                          })()}
                        </p>
                        <span
                          className={`text-xs font-black uppercase ${
                            reg.mi_estatus === "presente"
                              ? "text-green-700"
                              : reg.mi_estatus === "justificado"
                                ? "text-yellow-700"
                                : "text-red-700"
                          }`}
                        >
                          {reg.mi_estatus.substring(0, 3)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Pestaña: Tareas */}
        {activeTab === "tareas" && (
          <div className="animate-in fade-in duration-300">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">
                Actividades de Aprendizaje
              </h3>
              {user?.rol === "docente" && (
                <button
                  onClick={() => setShowCrearTareaModal(true)}
                  className="bg-[#a72a34] text-white px-5 py-2.5 rounded-xl font-bold hover:bg-[#802028] shadow-lg shadow-red-900/10 flex items-center gap-2 transition-transform active:scale-95"
                >
                  <Plus size={18} /> Nueva Tarea
                </button>
              )}
            </div>
            {renderTareasList()}
          </div>
        )}

        {/* Pestaña: Recursos */}
        {activeTab === "recursos" && (
          <div className="animate-in fade-in duration-300">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">
                Material de Consulta
              </h3>
              {user?.rol === "docente" && (
                <button
                  onClick={() => setShowRecursoModal(true)}
                  className="bg-white border-2 border-[#a72a34] text-[#a72a34] px-5 py-2.5 rounded-xl font-bold hover:bg-[#a72a34] hover:text-white transition-all flex items-center gap-2"
                >
                  <UploadCloud size={18} /> Subir Material
                </button>
              )}
            </div>
            {renderRecursosList()}
          </div>
        )}

        {/* Pestaña: Foro */}
        {activeTab === "foro" && (
          <div className="animate-in fade-in duration-300">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">
                Foro de Discusión
              </h3>
              {/* Botón del Foro movido a la nueva función de renderizado o aquí mismo si prefieres */}
            </div>
            {renderForoList()}
          </div>
        )}
      </div>
    </div>
  );

  // --- Renderizado Principal y Modales ---
  return (
    <div>
      {isEditing ? renderDocenteForm() : renderView()}

      {/* Modales (se mantienen igual, solo añadimos el de Nuevo Hilo) */}
      <CrearTareaModal
        show={showCrearTareaModal}
        onClose={() => setShowCrearTareaModal(false)}
        grupoId={grupoId}
        asignaturaId={asignaturaId}
        onTareaCreada={fetchTareas}
      />
      <EntregarTareaModal
        show={showEntregarModal}
        onClose={() => setShowEntregarModal(false)}
        tarea={selectedTask}
        onEntregaExitosa={fetchTareas}
      />
      <AgregarRecursoModal
        show={showRecursoModal}
        onClose={() => setShowRecursoModal(false)}
        grupoId={grupoId}
        asignaturaId={asignaturaId}
        onRecursoAgregado={fetchRecursos}
      />
      {/* --- NUEVO MODAL --- */}
      <NuevoHiloModal
        show={showNuevoHiloModal}
        onClose={() => setShowNuevoHiloModal(false)}
        grupoId={grupoId}
        asignaturaId={asignaturaId}
        onHiloCreado={fetchHilos}
      />
    </div>
  );
};
