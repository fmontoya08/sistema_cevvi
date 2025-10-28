DROP DATABASE IF EXISTS universidad_db;
CREATE DATABASE universidad_db;
USE universidad_db;

-- 1. Tabla de Usuarios y Roles
CREATE TABLE usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  apellido_paterno VARCHAR(100) NOT NULL,
  apellido_materno VARCHAR(100),
  rol ENUM('aspirante', 'alumno', 'docente', 'admin') NOT NULL DEFAULT 'aspirante'
);

-- Tablas Catálogo (independientes)
CREATE TABLE planes_estudio (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre_plan VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE tipos_asignatura (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tipo VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE grados (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre_grado VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE ciclos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre_ciclo VARCHAR(100) NOT NULL UNIQUE -- ej. "2024-2025"
);

CREATE TABLE sedes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre_sede VARCHAR(255) NOT NULL UNIQUE,
  direccion TEXT
);

CREATE TABLE carreras (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre_carrera VARCHAR(255) NOT NULL UNIQUE
);

-- 2. Tabla Principal de Asignaturas
CREATE TABLE asignaturas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre_asignatura VARCHAR(255) NOT NULL,
  clave_asignatura VARCHAR(50) NOT NULL UNIQUE,
  creditos INT NOT NULL,
  calificacion_min INT DEFAULT 70,
  calificacion_max INT DEFAULT 100,
  plan_estudio_id INT,
  tipo_asignatura_id INT,
  grado_id INT,
  FOREIGN KEY (plan_estudio_id) REFERENCES planes_estudio(id),
  FOREIGN KEY (tipo_asignatura_id) REFERENCES tipos_asignatura(id),
  FOREIGN KEY (grado_id) REFERENCES grados(id)
);

-- 3. Tabla Principal de Grupos
CREATE TABLE grupos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre_grupo VARCHAR(100) NOT NULL,
  cupo INT NOT NULL,
  ciclo_id INT,
  sede_id INT,
  plan_estudio_id INT,
  grado_id INT,
  FOREIGN KEY (ciclo_id) REFERENCES ciclos(id),
  FOREIGN KEY (sede_id) REFERENCES sedes(id),
  FOREIGN KEY (plan_estudio_id) REFERENCES planes_estudio(id),
  FOREIGN KEY (grado_id) REFERENCES grados(id)
);

-- 4. Tabla de Unión para Asignaturas y Docentes en un Grupo
CREATE TABLE grupo_asignaturas_docentes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    grupo_id INT NOT NULL,
    asignatura_id INT NOT NULL,
    docente_id INT, -- Puede ser NULL si no hay docente asignado
    FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE,
    FOREIGN KEY (asignatura_id) REFERENCES asignaturas(id),
    FOREIGN KEY (docente_id) REFERENCES usuarios(id),
    UNIQUE KEY (grupo_id, asignatura_id) -- No se puede repetir la misma materia en el mismo grupo
);

-- 5. Tabla de Unión para Alumnos en un Grupo
CREATE TABLE grupo_alumnos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    grupo_id INT NOT NULL,
    alumno_id INT NOT NULL,
    FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE,
    FOREIGN KEY (alumno_id) REFERENCES usuarios(id),
    UNIQUE KEY (grupo_id, alumno_id)
);

-- 6. Tabla para Calificaciones
CREATE TABLE calificaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    alumno_id INT NOT NULL,
    asignatura_id INT NOT NULL,
    calificacion DECIMAL(5, 2),
    FOREIGN KEY (alumno_id) REFERENCES usuarios(id),
    FOREIGN KEY (asignatura_id) REFERENCES asignaturas(id),
    UNIQUE KEY (alumno_id, asignatura_id) -- Un alumno solo puede tener una calificación por materia
);

-- 7. Tabla para Expedientes de Aspirantes
CREATE TABLE expediente_aspirantes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    aspirante_id INT NOT NULL,
    tipo_documento VARCHAR(100) NOT NULL, -- ej: 'acta_nacimiento', 'curp'
    ruta_archivo VARCHAR(255) NOT NULL,
    nombre_original VARCHAR(255) NOT NULL,
    fecha_carga TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (aspirante_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    UNIQUE KEY (aspirante_id, tipo_documento) -- Un aspirante solo puede tener un tipo de documento
);

CREATE TABLE aula_virtual_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    grupo_id INT NOT NULL,
    asignatura_id INT NOT NULL,
    enlace_videollamada VARCHAR(500),
    descripcion_curso TEXT,
    FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE,
    FOREIGN KEY (asignatura_id) REFERENCES asignaturas(id) ON DELETE CASCADE,
    UNIQUE KEY (grupo_id, asignatura_id) -- Solo puede haber una config por clase
);

-- --- INICIA NUEVO CÓDIGO (AGREGAR AL FINAL) ---

-- 9. Tabla de Tareas
CREATE TABLE tareas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    grupo_id INT NOT NULL,
    asignatura_id INT NOT NULL,
    docente_id INT NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT,
    fecha_limite DATETIME,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE,
    FOREIGN KEY (asignatura_id) REFERENCES asignaturas(id) ON DELETE CASCADE,
    FOREIGN KEY (docente_id) REFERENCES usuarios(id)
);

-- 10. Tabla de Entregas de Tareas
CREATE TABLE tareas_entregas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tarea_id INT NOT NULL,
    alumno_id INT NOT NULL,
    ruta_archivo VARCHAR(500) NOT NULL,
    nombre_original VARCHAR(500) NOT NULL,
    comentario_alumno TEXT,
    fecha_entrega TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    calificacion DECIMAL(5, 2),
    comentario_docente TEXT,
    FOREIGN KEY (tarea_id) REFERENCES tareas(id) ON DELETE CASCADE,
    FOREIGN KEY (alumno_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    UNIQUE KEY (tarea_id, alumno_id) -- Un alumno solo puede entregar una vez por tarea
);

-- 11. Tabla de Recursos o Material de Clase
CREATE TABLE recursos_clase (
    id INT AUTO_INCREMENT PRIMARY KEY,
    grupo_id INT NOT NULL,
    asignatura_id INT NOT NULL,
    docente_id INT NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    tipo_recurso ENUM('archivo', 'enlace') NOT NULL,
    ruta_o_url VARCHAR(500) NOT NULL,
    nombre_original VARCHAR(500), -- Solo para tipo 'archivo'
    fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE,
    FOREIGN KEY (asignatura_id) REFERENCES asignaturas(id) ON DELETE CASCADE,
    FOREIGN KEY (docente_id) REFERENCES usuarios(id)
);

-- 12. Tabla de Sesiones de Clase (para registrar cuándo hubo clase)
CREATE TABLE clases_sesiones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    grupo_id INT NOT NULL,
    asignatura_id INT NOT NULL,
    docente_id INT NOT NULL,
    fecha_sesion DATE NOT NULL, -- Solo la fecha, la hora no es tan crucial aquí
    tema_sesion VARCHAR(255), -- Opcional: tema visto en clase
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE,
    FOREIGN KEY (asignatura_id) REFERENCES asignaturas(id) ON DELETE CASCADE,
    FOREIGN KEY (docente_id) REFERENCES usuarios(id),
    UNIQUE KEY (grupo_id, asignatura_id, fecha_sesion) -- Solo una sesión por día por clase
);

-- 13. Tabla de Asistencia (registra el estatus de cada alumno en cada sesión)
CREATE TABLE asistencia (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sesion_id INT NOT NULL,
    alumno_id INT NOT NULL,
    estatus ENUM('presente', 'ausente', 'justificado') NOT NULL DEFAULT 'ausente',
    FOREIGN KEY (sesion_id) REFERENCES clases_sesiones(id) ON DELETE CASCADE,
    FOREIGN KEY (alumno_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    UNIQUE KEY (sesion_id, alumno_id) -- Un alumno solo puede tener un registro por sesión
);

-- 14. Tabla de Hilos o Temas del Foro
CREATE TABLE foros_hilos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    grupo_id INT NOT NULL,
    asignatura_id INT NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    mensaje_original TEXT NOT NULL,
    creado_por_usuario_id INT NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE,
    FOREIGN KEY (asignatura_id) REFERENCES asignaturas(id) ON DELETE CASCADE,
    FOREIGN KEY (creado_por_usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- 15. Tabla de Respuestas a los Hilos del Foro
CREATE TABLE foros_respuestas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hilo_id INT NOT NULL,
    mensaje TEXT NOT NULL,
    creado_por_usuario_id INT NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hilo_id) REFERENCES foros_hilos(id) ON DELETE CASCADE,
    FOREIGN KEY (creado_por_usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- --- TERMINA NUEVO CÓDIGO ---


-- INSERCIONES DE EJEMPLO (CATÁLOGOS)
-- INSERT INTO planes_estudio (nombre_plan) VALUES ('Plan 2020'), ('Plan 2024');
-- INSERT INTO tipos_asignatura (tipo) VALUES ('Básica'), ('Avanzada'), ('Optativa');
-- INSERT INTO grados (nombre_grado) VALUES ('1er Semestre'), ('2do Semestre'), ('3er Semestre');
-- INSERT INTO ciclos (nombre_ciclo) VALUES ('2024-A'), ('2024-B');
-- INSERT INTO sedes (nombre_sede, direccion) VALUES ('Campus Central', 'Av. Universidad 123'), ('Campus Norte', 'Blvd. Norte 456');
-- INSERT INTO carreras (nombre_carrera) VALUES ('Ingeniería de Software'), ('Diseño Gráfico');

