
 CREATE DATABASE IF NOT EXISTS universidad_db;
 USE universidad_db;

-- -----------------------------------------------------
-- Tabla de Catálogos (Tablas pequeñas para llenar selects/dropdowns)
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS planes_estudio (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre_plan VARCHAR(255) NOT NULL UNIQUE,
  descripcion TEXT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tipos_asignatura (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tipo VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS grados (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre_grado VARCHAR(100) NOT NULL UNIQUE COMMENT 'Ej: 1er Semestre, 2do Cuatrimestre'
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ciclos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre_ciclo VARCHAR(100) NOT NULL UNIQUE COMMENT 'Ej: 2025-1, 2025-2'
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sedes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre_sede VARCHAR(255) NOT NULL UNIQUE,
  direccion VARCHAR(255)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS carreras (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre_carrera VARCHAR(255) NOT NULL UNIQUE
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- Tabla Principal de Usuarios
-- Contiene a todos: admins, docentes, aspirantes y alumnos
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  rol ENUM('admin', 'docente', 'aspirante', 'alumno') NOT NULL,
  
  -- Datos personales
  nombre VARCHAR(100) NOT NULL,
  apellido_paterno VARCHAR(100) NOT NULL,
  apellido_materno VARCHAR(100),
  genero ENUM('Masculino', 'Femenino', 'Otro'),
  telefono VARCHAR(20),
  curp VARCHAR(18) UNIQUE,
  fecha_nacimiento DATE,
  
  -- Campos específicos para aspirantes/alumnos
  carrera_id INT,
  sede_id INT,
  grupo_id INT, -- Se llena cuando un aspirante se convierte en alumno

  -- Timestamps
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (carrera_id) REFERENCES carreras(id) ON DELETE SET NULL,
  FOREIGN KEY (sede_id) REFERENCES sedes(id) ON DELETE SET NULL,
  FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- Tabla de Asignaturas (Materias)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS asignaturas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre_asignatura VARCHAR(255) NOT NULL,
  clave_asignatura VARCHAR(50) NOT NULL UNIQUE,
  creditos INT NOT NULL,
  calificacion_max DECIMAL(5, 2) DEFAULT 100.00,
  calificacion_min DECIMAL(5, 2) DEFAULT 70.00,
  
  -- Relaciones con catálogos
  plan_estudio_id INT NOT NULL,
  tipo_asignatura_id INT NOT NULL,
  grado_id INT NOT NULL,
  
  FOREIGN KEY (plan_estudio_id) REFERENCES planes_estudio(id),
  FOREIGN KEY (tipo_asignatura_id) REFERENCES tipos_asignatura(id),
  FOREIGN KEY (grado_id) REFERENCES grados(id)
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- Tabla de Grupos
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS grupos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre_grupo VARCHAR(100) NOT NULL,
  cupo INT NOT NULL,
  
  -- Relaciones con catálogos
  ciclo_id INT NOT NULL,
  sede_id INT NOT NULL,
  plan_estudio_id INT NOT NULL,
  grado_id INT NOT NULL,
  
  FOREIGN KEY (ciclo_id) REFERENCES ciclos(id),
  FOREIGN KEY (sede_id) REFERENCES sedes(id),
  FOREIGN KEY (plan_estudio_id) REFERENCES planes_estudio(id),
  FOREIGN KEY (grado_id) REFERENCES grados(id)
) ENGINE=InnoDB;


-- -----------------------------------------------------
-- Tabla para el Expediente de los Aspirantes/Alumnos
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS expedientes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  nombre_documento VARCHAR(255) NOT NULL COMMENT 'Ej: Acta de Nacimiento, CURP',
  url_documento VARCHAR(1024) NOT NULL COMMENT 'Ruta donde se guarda el archivo',
  fecha_carga TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;
