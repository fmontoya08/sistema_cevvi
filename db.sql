-- MySQL dump 10.13  Distrib 8.0.43, for Win64 (x86_64)
--
-- Host: localhost    Database: universidad_db
-- ------------------------------------------------------
-- Server version	8.0.43

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `adeudos_alumnos`
--

DROP TABLE IF EXISTS `adeudos_alumnos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `adeudos_alumnos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `alumno_id` int NOT NULL,
  `concepto_id` int NOT NULL,
  `monto_a_pagar` decimal(10,2) NOT NULL,
  `estatus_pago` enum('pendiente','pagado','vencido','cancelado') NOT NULL DEFAULT 'pendiente',
  `fecha_vencimiento` date DEFAULT NULL,
  `fecha_pago` datetime DEFAULT NULL,
  `registrado_por_usuario_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `alumno_id` (`alumno_id`),
  KEY `concepto_id` (`concepto_id`),
  KEY `registrado_por_usuario_id` (`registrado_por_usuario_id`),
  CONSTRAINT `adeudos_alumnos_ibfk_1` FOREIGN KEY (`alumno_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  CONSTRAINT `adeudos_alumnos_ibfk_2` FOREIGN KEY (`concepto_id`) REFERENCES `conceptos_pago` (`id`),
  CONSTRAINT `adeudos_alumnos_ibfk_3` FOREIGN KEY (`registrado_por_usuario_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `adeudos_alumnos`
--

LOCK TABLES `adeudos_alumnos` WRITE;
/*!40000 ALTER TABLE `adeudos_alumnos` DISABLE KEYS */;
INSERT INTO `adeudos_alumnos` VALUES (1,2,1,2500.00,'pagado','2025-10-30','2025-10-27 23:36:42',1),(2,2,1,1200000.00,'pagado','2025-10-30','2025-10-28 00:11:54',1),(4,2,1,1222.00,'pagado','2025-10-31','2025-10-28 00:11:56',1),(5,10,1,2500.00,'pendiente','2025-10-31',NULL,NULL),(6,2,1,2500.00,'pagado',NULL,'2025-10-28 00:11:51',1);
/*!40000 ALTER TABLE `adeudos_alumnos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `asignaturas`
--

DROP TABLE IF EXISTS `asignaturas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `asignaturas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre_asignatura` varchar(255) NOT NULL,
  `clave_asignatura` varchar(50) NOT NULL,
  `creditos` int NOT NULL,
  `calificacion_max` decimal(5,2) DEFAULT '100.00',
  `calificacion_min` decimal(5,2) DEFAULT '70.00',
  `plan_estudio_id` int NOT NULL,
  `tipo_asignatura_id` int NOT NULL,
  `grado_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `clave_asignatura` (`clave_asignatura`),
  KEY `plan_estudio_id` (`plan_estudio_id`),
  KEY `tipo_asignatura_id` (`tipo_asignatura_id`),
  KEY `grado_id` (`grado_id`),
  CONSTRAINT `asignaturas_ibfk_1` FOREIGN KEY (`plan_estudio_id`) REFERENCES `planes_estudio` (`id`),
  CONSTRAINT `asignaturas_ibfk_2` FOREIGN KEY (`tipo_asignatura_id`) REFERENCES `tipos_asignatura` (`id`),
  CONSTRAINT `asignaturas_ibfk_3` FOREIGN KEY (`grado_id`) REFERENCES `grados` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `asignaturas`
--

LOCK TABLES `asignaturas` WRITE;
/*!40000 ALTER TABLE `asignaturas` DISABLE KEYS */;
INSERT INTO `asignaturas` VALUES (2,'Teoria 1','teo1',7,100.00,70.00,1,1,1),(8,'Teoria 2','teo2',7,100.00,70.00,2,1,5),(9,'Teoria 3','teo 3',7,100.00,70.00,3,1,9),(10,'teoria 4','teo 4',8,100.00,70.00,1,1,1),(11,'Teoria 5','teo 5',7,100.00,70.00,1,1,2),(12,'prueba','prueba',7,100.00,70.00,2,1,5),(13,'notificacion','notificacion',8,100.00,70.00,1,1,2);
/*!40000 ALTER TABLE `asignaturas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `asistencia`
--

DROP TABLE IF EXISTS `asistencia`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `asistencia` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sesion_id` int NOT NULL,
  `alumno_id` int NOT NULL,
  `estatus` enum('presente','ausente','justificado') NOT NULL DEFAULT 'ausente',
  PRIMARY KEY (`id`),
  UNIQUE KEY `sesion_id` (`sesion_id`,`alumno_id`),
  KEY `alumno_id` (`alumno_id`),
  CONSTRAINT `asistencia_ibfk_1` FOREIGN KEY (`sesion_id`) REFERENCES `clases_sesiones` (`id`) ON DELETE CASCADE,
  CONSTRAINT `asistencia_ibfk_2` FOREIGN KEY (`alumno_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `asistencia`
--

LOCK TABLES `asistencia` WRITE;
/*!40000 ALTER TABLE `asistencia` DISABLE KEYS */;
INSERT INTO `asistencia` VALUES (2,1,10,'ausente');
/*!40000 ALTER TABLE `asistencia` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `aula_virtual_config`
--

DROP TABLE IF EXISTS `aula_virtual_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `aula_virtual_config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `grupo_id` int NOT NULL,
  `asignatura_id` int NOT NULL,
  `enlace_videollamada` varchar(500) DEFAULT NULL,
  `descripcion_curso` text,
  `objetivos` text,
  `evaluacion` text,
  `horario` text,
  `contacto_docente` text,
  `hibrida` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `grupo_id` (`grupo_id`,`asignatura_id`),
  KEY `asignatura_id` (`asignatura_id`),
  CONSTRAINT `aula_virtual_config_ibfk_1` FOREIGN KEY (`grupo_id`) REFERENCES `grupos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `aula_virtual_config_ibfk_2` FOREIGN KEY (`asignatura_id`) REFERENCES `asignaturas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=134 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `aula_virtual_config`
--

LOCK TABLES `aula_virtual_config` WRITE;
/*!40000 ALTER TABLE `aula_virtual_config` DISABLE KEYS */;
INSERT INTO `aula_virtual_config` VALUES (1,2,8,'https://meet.jit.si/CEVVI-G2-A8','bienvenido al curso para aprende a aprender ','el opjetivo del curso es aprender ','las tareas equivales esto, el examen esto y las asistencias esto ','viernes de 9 a 12','francisco montoya \ncorreo electronico \ntelefono'),(8,1,10,'https://meet.jit.si/CEVVI-G1-A10',NULL,NULL,NULL,NULL,NULL),(22,2,12,NULL,NULL,NULL,NULL,NULL,NULL),(60,1,2,'https://meet.jit.si/CEVVI-G1-A2','asdasdasdasd','asdasdasa','asdasd','adasd','adasasdas'),(78,5,11,NULL,NULL,NULL,NULL,NULL,NULL),(80,6,2,NULL,NULL,NULL,NULL,NULL,NULL),(82,6,10,NULL,NULL,NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `aula_virtual_config` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `calificaciones`
--

DROP TABLE IF EXISTS `calificaciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `calificaciones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `alumno_id` int NOT NULL,
  `asignatura_id` int NOT NULL,
  `grupo_id` int NOT NULL,
  `calificacion` decimal(5,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `alumno_id` (`alumno_id`,`asignatura_id`,`grupo_id`),
  KEY `asignatura_id` (`asignatura_id`),
  KEY `grupo_id` (`grupo_id`),
  CONSTRAINT `calificaciones_ibfk_1` FOREIGN KEY (`alumno_id`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `calificaciones_ibfk_2` FOREIGN KEY (`asignatura_id`) REFERENCES `asignaturas` (`id`),
  CONSTRAINT `calificaciones_ibfk_3` FOREIGN KEY (`grupo_id`) REFERENCES `grupos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `calificaciones`
--

LOCK TABLES `calificaciones` WRITE;
/*!40000 ALTER TABLE `calificaciones` DISABLE KEYS */;
INSERT INTO `calificaciones` VALUES (1,2,2,1,55.00),(2,2,10,1,78.00),(3,10,12,2,12.00);
/*!40000 ALTER TABLE `calificaciones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `carreras`
--

DROP TABLE IF EXISTS `carreras`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `carreras` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre_carrera` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre_carrera` (`nombre_carrera`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `carreras`
--

LOCK TABLES `carreras` WRITE;
/*!40000 ALTER TABLE `carreras` DISABLE KEYS */;
INSERT INTO `carreras` VALUES (4,'Doctorado'),(5,'Ingeniería de Software'),(6,'Licenciatura en Diseño Gráfico'),(1,'Licenciatura en pedagogia (estatal)'),(2,'Licenciatura en pedagogia (federal)'),(7,'Licenciatura en psicologia'),(3,'Maestria');
/*!40000 ALTER TABLE `carreras` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ciclos`
--

DROP TABLE IF EXISTS `ciclos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ciclos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre_ciclo` varchar(100) NOT NULL COMMENT 'Ej: 2025-1, 2025-2',
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre_ciclo` (`nombre_ciclo`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ciclos`
--

LOCK TABLES `ciclos` WRITE;
/*!40000 ALTER TABLE `ciclos` DISABLE KEYS */;
INSERT INTO `ciclos` VALUES (1,'2025 A'),(2,'2025 B'),(3,'2025 C');
/*!40000 ALTER TABLE `ciclos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `clases_sesiones`
--

DROP TABLE IF EXISTS `clases_sesiones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clases_sesiones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `grupo_id` int NOT NULL,
  `asignatura_id` int NOT NULL,
  `docente_id` int NOT NULL,
  `fecha_sesion` date NOT NULL,
  `tema_sesion` varchar(255) DEFAULT NULL,
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `grupo_id` (`grupo_id`,`asignatura_id`,`fecha_sesion`),
  KEY `asignatura_id` (`asignatura_id`),
  KEY `docente_id` (`docente_id`),
  CONSTRAINT `clases_sesiones_ibfk_1` FOREIGN KEY (`grupo_id`) REFERENCES `grupos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `clases_sesiones_ibfk_2` FOREIGN KEY (`asignatura_id`) REFERENCES `asignaturas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `clases_sesiones_ibfk_3` FOREIGN KEY (`docente_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `clases_sesiones`
--

LOCK TABLES `clases_sesiones` WRITE;
/*!40000 ALTER TABLE `clases_sesiones` DISABLE KEYS */;
INSERT INTO `clases_sesiones` VALUES (1,2,8,3,'2025-10-26',NULL,'2025-10-26 15:51:00'),(7,2,8,3,'2025-10-27',NULL,'2025-10-27 20:24:15'),(8,1,2,3,'2025-10-28',NULL,'2025-10-28 01:21:40');
/*!40000 ALTER TABLE `clases_sesiones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `conceptos_pago`
--

DROP TABLE IF EXISTS `conceptos_pago`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `conceptos_pago` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre_concepto` varchar(255) NOT NULL,
  `monto_default` decimal(10,2) NOT NULL DEFAULT '0.00',
  `tipo` enum('UNICO','RECURRENTE') NOT NULL DEFAULT 'UNICO',
  `es_concepto_inscripcion` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `conceptos_pago`
--

LOCK TABLES `conceptos_pago` WRITE;
/*!40000 ALTER TABLE `conceptos_pago` DISABLE KEYS */;
INSERT INTO `conceptos_pago` VALUES (1,'Inscripción Ciclo 2025',2500.00,'UNICO',1);
/*!40000 ALTER TABLE `conceptos_pago` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `expediente_aspirantes`
--

DROP TABLE IF EXISTS `expediente_aspirantes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `expediente_aspirantes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `aspirante_id` int NOT NULL,
  `tipo_documento` varchar(100) NOT NULL,
  `ruta_archivo` varchar(255) NOT NULL,
  `nombre_original` varchar(255) NOT NULL,
  `fecha_carga` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `aspirante_id` (`aspirante_id`,`tipo_documento`),
  CONSTRAINT `expediente_aspirantes_ibfk_1` FOREIGN KEY (`aspirante_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `expediente_aspirantes`
--

LOCK TABLES `expediente_aspirantes` WRITE;
/*!40000 ALTER TABLE `expediente_aspirantes` DISABLE KEYS */;
/*!40000 ALTER TABLE `expediente_aspirantes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `expedientes`
--

DROP TABLE IF EXISTS `expedientes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `expedientes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `usuario_id` int NOT NULL,
  `nombre_documento` varchar(255) NOT NULL COMMENT 'Ej: Acta de Nacimiento, CURP',
  `url_documento` varchar(1024) NOT NULL COMMENT 'Ruta donde se guarda el archivo',
  `fecha_carga` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `usuario_id` (`usuario_id`),
  CONSTRAINT `expedientes_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `expedientes`
--

LOCK TABLES `expedientes` WRITE;
/*!40000 ALTER TABLE `expedientes` DISABLE KEYS */;
/*!40000 ALTER TABLE `expedientes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `foros_hilos`
--

DROP TABLE IF EXISTS `foros_hilos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `foros_hilos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `grupo_id` int NOT NULL,
  `asignatura_id` int NOT NULL,
  `titulo` varchar(255) NOT NULL,
  `mensaje_original` text NOT NULL,
  `creado_por_usuario_id` int NOT NULL,
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `grupo_id` (`grupo_id`),
  KEY `asignatura_id` (`asignatura_id`),
  KEY `creado_por_usuario_id` (`creado_por_usuario_id`),
  CONSTRAINT `foros_hilos_ibfk_1` FOREIGN KEY (`grupo_id`) REFERENCES `grupos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `foros_hilos_ibfk_2` FOREIGN KEY (`asignatura_id`) REFERENCES `asignaturas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `foros_hilos_ibfk_3` FOREIGN KEY (`creado_por_usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `foros_hilos`
--

LOCK TABLES `foros_hilos` WRITE;
/*!40000 ALTER TABLE `foros_hilos` DISABLE KEYS */;
INSERT INTO `foros_hilos` VALUES (1,2,8,'asdasdasda','asdasda',3,'2025-10-26 20:48:40'),(2,2,12,'prueba de alumno','esto es un prueba de alumno para discusion del curso ',10,'2025-10-27 17:34:52'),(3,1,10,'prueba','Esto es una prueba de las notificaciones del foro ',3,'2025-10-27 19:28:14'),(4,1,2,'notificacion facil','kjaflksjfklj',3,'2025-10-27 19:51:40'),(5,2,12,'peuba discucion','kalsjdklasjdlkaj',3,'2025-10-27 20:20:02');
/*!40000 ALTER TABLE `foros_hilos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `foros_respuestas`
--

DROP TABLE IF EXISTS `foros_respuestas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `foros_respuestas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `hilo_id` int NOT NULL,
  `mensaje` text NOT NULL,
  `creado_por_usuario_id` int NOT NULL,
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `hilo_id` (`hilo_id`),
  KEY `creado_por_usuario_id` (`creado_por_usuario_id`),
  CONSTRAINT `foros_respuestas_ibfk_1` FOREIGN KEY (`hilo_id`) REFERENCES `foros_hilos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `foros_respuestas_ibfk_2` FOREIGN KEY (`creado_por_usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `foros_respuestas`
--

LOCK TABLES `foros_respuestas` WRITE;
/*!40000 ALTER TABLE `foros_respuestas` DISABLE KEYS */;
INSERT INTO `foros_respuestas` VALUES (1,1,'ksjdaklsjfkasjfklasjfkalsjf',10,'2025-10-26 20:49:17'),(2,1,'@docente\n',10,'2025-10-26 20:49:26'),(3,2,'si esto es una respuesta del docente ',3,'2025-10-27 17:36:37'),(4,3,'respuesta de juli ',2,'2025-10-27 19:36:52'),(5,5,'kjdkasjkajdk',10,'2025-10-27 20:21:08');
/*!40000 ALTER TABLE `foros_respuestas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `grados`
--

DROP TABLE IF EXISTS `grados`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `grados` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre_grado` varchar(100) NOT NULL COMMENT 'Ej: 1er Semestre, 2do Cuatrimestre',
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre_grado` (`nombre_grado`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `grados`
--

LOCK TABLES `grados` WRITE;
/*!40000 ALTER TABLE `grados` DISABLE KEYS */;
INSERT INTO `grados` VALUES (4,'Cuarto'),(9,'Noveno'),(8,'Octavo'),(1,'Primero'),(5,'Quinto'),(2,'Segundo'),(7,'Septimo'),(6,'Sexto'),(3,'Tercero');
/*!40000 ALTER TABLE `grados` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `grupo_alumnos`
--

DROP TABLE IF EXISTS `grupo_alumnos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `grupo_alumnos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `grupo_id` int NOT NULL,
  `alumno_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `grupo_id` (`grupo_id`,`alumno_id`),
  KEY `alumno_id` (`alumno_id`),
  CONSTRAINT `grupo_alumnos_ibfk_1` FOREIGN KEY (`grupo_id`) REFERENCES `grupos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `grupo_alumnos_ibfk_2` FOREIGN KEY (`alumno_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `grupo_alumnos`
--

LOCK TABLES `grupo_alumnos` WRITE;
/*!40000 ALTER TABLE `grupo_alumnos` DISABLE KEYS */;
INSERT INTO `grupo_alumnos` VALUES (2,1,2),(9,2,10),(6,5,2),(14,6,2);
/*!40000 ALTER TABLE `grupo_alumnos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `grupo_asignaturas_docentes`
--

DROP TABLE IF EXISTS `grupo_asignaturas_docentes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `grupo_asignaturas_docentes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `grupo_id` int NOT NULL,
  `asignatura_id` int NOT NULL,
  `docente_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `grupo_id` (`grupo_id`,`asignatura_id`),
  KEY `asignatura_id` (`asignatura_id`),
  KEY `docente_id` (`docente_id`),
  CONSTRAINT `grupo_asignaturas_docentes_ibfk_1` FOREIGN KEY (`grupo_id`) REFERENCES `grupos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `grupo_asignaturas_docentes_ibfk_2` FOREIGN KEY (`asignatura_id`) REFERENCES `asignaturas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `grupo_asignaturas_docentes_ibfk_3` FOREIGN KEY (`docente_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `grupo_asignaturas_docentes`
--

LOCK TABLES `grupo_asignaturas_docentes` WRITE;
/*!40000 ALTER TABLE `grupo_asignaturas_docentes` DISABLE KEYS */;
INSERT INTO `grupo_asignaturas_docentes` VALUES (1,1,2,3),(2,4,9,NULL),(3,2,8,3),(4,1,10,3),(5,5,11,NULL),(6,2,12,3),(7,5,13,NULL);
/*!40000 ALTER TABLE `grupo_asignaturas_docentes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `grupos`
--

DROP TABLE IF EXISTS `grupos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `grupos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre_grupo` varchar(100) NOT NULL,
  `cupo` int NOT NULL,
  `ciclo_id` int NOT NULL,
  `sede_id` int NOT NULL,
  `plan_estudio_id` int NOT NULL,
  `grado_id` int NOT NULL,
  `estatus` varchar(10) NOT NULL DEFAULT 'activo',
  `modalidad` varchar(20) NOT NULL DEFAULT 'presencial',
  PRIMARY KEY (`id`),
  KEY `ciclo_id` (`ciclo_id`),
  KEY `sede_id` (`sede_id`),
  KEY `plan_estudio_id` (`plan_estudio_id`),
  KEY `grado_id` (`grado_id`),
  CONSTRAINT `grupos_ibfk_1` FOREIGN KEY (`ciclo_id`) REFERENCES `ciclos` (`id`),
  CONSTRAINT `grupos_ibfk_2` FOREIGN KEY (`sede_id`) REFERENCES `sedes` (`id`),
  CONSTRAINT `grupos_ibfk_3` FOREIGN KEY (`plan_estudio_id`) REFERENCES `planes_estudio` (`id`),
  CONSTRAINT `grupos_ibfk_4` FOREIGN KEY (`grado_id`) REFERENCES `grados` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `grupos`
--

LOCK TABLES `grupos` WRITE;
/*!40000 ALTER TABLE `grupos` DISABLE KEYS */;
INSERT INTO `grupos` VALUES (1,'Prueba1',10,2,1,1,1,'activo','presencial'),(2,'grupo 2',20,1,3,2,5,'activo','virtual'),(3,'grupo 3',9,3,1,1,5,'activo','presencial'),(4,'Doctorado',25,2,2,3,9,'activo','presencial'),(5,'prueba1',10,3,2,1,2,'activo','presencial'),(6,'prueba calificaciones',30,3,2,1,1,'activo','presencial');
/*!40000 ALTER TABLE `grupos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notificaciones`
--

DROP TABLE IF EXISTS `notificaciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notificaciones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `mensaje` varchar(255) NOT NULL,
  `leida` tinyint(1) NOT NULL DEFAULT '0',
  `url_destino` varchar(255) DEFAULT NULL,
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_leida` (`user_id`,`leida`),
  CONSTRAINT `notificaciones_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=58 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notificaciones`
--

LOCK TABLES `notificaciones` WRITE;
/*!40000 ALTER TABLE `notificaciones` DISABLE KEYS */;
INSERT INTO `notificaciones` VALUES (7,2,'Nueva calificación registrada: 12',1,'/alumno/dashboard','2025-10-24 05:14:56'),(9,2,'Nueva calificación registrada: 40',1,'/alumno/dashboard','2025-10-24 05:15:09'),(10,2,'Nueva calificación registrada: 56',1,'/alumno/dashboard','2025-10-24 05:21:34'),(16,2,'Nueva calificación registrada: 44',1,'/alumno/dashboard','2025-10-24 21:03:30'),(18,2,'Nueva calificación registrada: 99.9',1,'/alumno/dashboard','2025-10-24 21:07:06'),(19,2,'Nueva calificación registrada: 55',1,'/alumno/dashboard','2025-10-25 01:30:50'),(20,2,'Nueva calificación registrada: 78',1,'/alumno/dashboard','2025-10-25 01:32:56'),(22,10,'Nueva tarea: \'prueba de notificacion\' en Teoria 2',1,'/alumno/grupo/2/asignatura/8/aula','2025-10-26 03:50:12'),(24,3,'Entrega de: \'Francisco Montoya\' en la tarea \'prueba de notificacion\'',1,'/docente/grupo/2/asignatura/8/aula','2025-10-26 03:52:00'),(25,10,'¡Calificación recibida! (95/100) en la tarea \'prueba de notificacion\'',1,'/alumno/grupo/2/asignatura/8/aula','2025-10-26 04:14:11'),(26,3,'Entrega de: \'Francisco Montoya\' en la tarea \'prueba de tarea \'',1,'/docente/grupo/2/asignatura/12/aula','2025-10-26 04:15:33'),(27,10,'¡Calificación recibida! (65/100) en la tarea \'prueba de tarea \'',1,'/alumno/grupo/2/asignatura/12/aula','2025-10-26 04:16:14'),(29,10,'Docente  1 inició un nuevo hilo: \'peuba discucion\'',1,'/alumno/grupo/2/asignatura/12/foro/hilo/5','2025-10-27 20:20:02'),(31,10,'Nueva calificación registrada: 12',1,'/alumno/dashboard','2025-10-27 20:20:17'),(32,3,'Francisco Montoya respondió en el hilo: \'peuba discucion\'',1,'/docente/grupo/2/asignatura/12/foro/hilo/5','2025-10-27 20:21:08'),(35,2,'Docente  1 actualizó la información del curso.',1,'/alumno/grupo/1/asignatura/2/aula','2025-10-28 01:22:03'),(37,2,'Se ha generado un nuevo cargo: Inscripción Ciclo 2025 por $1222',1,'/alumno/mis-pagos','2025-10-28 05:56:58'),(38,10,'Se ha generado un nuevo cargo: Inscripción Ciclo 2025 por $2500.00',0,'/alumno/mis-pagos','2025-10-28 06:06:33'),(39,2,'Se ha generado un nuevo cargo: Inscripción Ciclo 2025 por $2500.00',1,'/alumno/mis-pagos','2025-10-28 06:11:00'),(40,2,'¡Tu pago para \"Inscripción Ciclo 2025\" ha sido registrado!',1,'/alumno/mis-pagos','2025-10-28 06:11:51'),(41,2,'¡Tu pago para \"Inscripción Ciclo 2025\" ha sido registrado!',1,'/alumno/mis-pagos','2025-10-28 06:11:54'),(42,2,'¡Tu pago para \"Inscripción Ciclo 2025\" ha sido registrado!',1,'/alumno/mis-pagos','2025-10-28 06:11:56'),(45,1,'Nueva solicitud de \'constancia_estudios\' recibida de: Julieta Sarai.',1,'/admin/solicitudes','2025-10-28 23:38:27'),(46,2,'Tu solicitud de \'constancia_estudios\' ha sido actualizada a: en_revision. Comentario: se esta trabajando en ello',1,'/alumno/mis-solicitudes','2025-10-28 23:40:02'),(47,2,'Tu solicitud de \'constancia_estudios\' ha sido actualizada a: listo_para_entrega. Comentario: ya puedes pasar por tu constancia en las instalaciones, solo tienes que dar tu matricula ',1,'/alumno/mis-solicitudes','2025-10-28 23:41:50'),(48,1,'Nueva solicitud de \'baja_temporal\' recibida de: Educardo Diaz.',1,'/admin/solicitudes','2025-10-29 00:00:03'),(50,1,'Nueva solicitud de \'otro\' recibida de: Educardo Diaz.',1,'/admin/solicitudes','2025-10-31 17:54:23'),(51,2,'Docente  1 actualizó la información del curso.',0,'/alumno/grupo/1/asignatura/10/aula','2025-10-31 18:01:30'),(53,2,'Docente  1 agregó un nuevo recurso (archivo): \'libro 1\'',1,'/alumno/grupo/1/asignatura/10/aula','2025-10-31 18:02:21'),(55,2,'Nueva tarea: \'tarea1\' en teoria 4',1,'/alumno/grupo/1/asignatura/10/aula','2025-10-31 18:03:43');
/*!40000 ALTER TABLE `notificaciones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `planes_estudio`
--

DROP TABLE IF EXISTS `planes_estudio`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `planes_estudio` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre_plan` varchar(255) NOT NULL,
  `descripcion` text,
  `carrera_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre_plan` (`nombre_plan`),
  KEY `carrera_id` (`carrera_id`),
  CONSTRAINT `planes_estudio_ibfk_1` FOREIGN KEY (`carrera_id`) REFERENCES `carreras` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `planes_estudio`
--

LOCK TABLES `planes_estudio` WRITE;
/*!40000 ALTER TABLE `planes_estudio` DISABLE KEYS */;
INSERT INTO `planes_estudio` VALUES (1,'Licenciatura en pedagogia','Licenciatura en pedagogia',NULL),(2,'Maestria','Maestria',NULL),(3,'Doctorado','Doctorado',NULL),(4,'Psicologia ',NULL,7);
/*!40000 ALTER TABLE `planes_estudio` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `push_tokens`
--

DROP TABLE IF EXISTS `push_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `push_tokens` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `token` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_token` (`user_id`,`token`),
  CONSTRAINT `push_tokens_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `push_tokens`
--

LOCK TABLES `push_tokens` WRITE;
/*!40000 ALTER TABLE `push_tokens` DISABLE KEYS */;
INSERT INTO `push_tokens` VALUES (12,10,'ExponentPushToken[bxGMUCMU9ZHR3HMCAoWXiB]','2025-10-24 02:01:40'),(14,1,'ExponentPushToken[bxGMUCMU9ZHR3HMCAoWXiB]','2026-01-14 05:29:31');
/*!40000 ALTER TABLE `push_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `recursos_clase`
--

DROP TABLE IF EXISTS `recursos_clase`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `recursos_clase` (
  `id` int NOT NULL AUTO_INCREMENT,
  `grupo_id` int NOT NULL,
  `asignatura_id` int NOT NULL,
  `docente_id` int NOT NULL,
  `titulo` varchar(255) NOT NULL,
  `tipo_recurso` enum('archivo','enlace') NOT NULL,
  `ruta_o_url` varchar(500) NOT NULL,
  `nombre_original` varchar(500) DEFAULT NULL,
  `fecha_subida` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `grupo_id` (`grupo_id`),
  KEY `asignatura_id` (`asignatura_id`),
  KEY `docente_id` (`docente_id`),
  CONSTRAINT `recursos_clase_ibfk_1` FOREIGN KEY (`grupo_id`) REFERENCES `grupos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `recursos_clase_ibfk_2` FOREIGN KEY (`asignatura_id`) REFERENCES `asignaturas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `recursos_clase_ibfk_3` FOREIGN KEY (`docente_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `recursos_clase`
--

LOCK TABLES `recursos_clase` WRITE;
/*!40000 ALTER TABLE `recursos_clase` DISABLE KEYS */;
INSERT INTO `recursos_clase` VALUES (4,1,10,3,'libro 1','archivo','curso_G1_A10/1761933741917-42464204.pdf','20250815_Conferencia PolitÃ­ca y EducaciÃ³n.pdf','2025-10-31 18:02:21');
/*!40000 ALTER TABLE `recursos_clase` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sedes`
--

DROP TABLE IF EXISTS `sedes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sedes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre_sede` varchar(255) NOT NULL,
  `direccion` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre_sede` (`nombre_sede`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sedes`
--

LOCK TABLES `sedes` WRITE;
/*!40000 ALTER TABLE `sedes` DISABLE KEYS */;
INSERT INTO `sedes` VALUES (1,'Jalisco','Jalisco'),(2,'Tlajomulco','Tlajomulco'),(3,'Arandas','Arandas');
/*!40000 ALTER TABLE `sedes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `solicitudes_alumnos`
--

DROP TABLE IF EXISTS `solicitudes_alumnos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `solicitudes_alumnos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `alumno_id` int NOT NULL,
  `tipo_solicitud` varchar(100) NOT NULL,
  `motivo` text,
  `estatus` enum('solicitado','en_revision','listo_para_entrega','rechazado','cancelado') NOT NULL DEFAULT 'solicitado',
  `fecha_solicitud` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_ultima_actualizacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `actualizado_por_usuario_id` int DEFAULT NULL,
  `comentarios_admin` text,
  PRIMARY KEY (`id`),
  KEY `alumno_id` (`alumno_id`),
  KEY `actualizado_por_usuario_id` (`actualizado_por_usuario_id`),
  CONSTRAINT `solicitudes_alumnos_ibfk_1` FOREIGN KEY (`alumno_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  CONSTRAINT `solicitudes_alumnos_ibfk_2` FOREIGN KEY (`actualizado_por_usuario_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `solicitudes_alumnos`
--

LOCK TABLES `solicitudes_alumnos` WRITE;
/*!40000 ALTER TABLE `solicitudes_alumnos` DISABLE KEYS */;
INSERT INTO `solicitudes_alumnos` VALUES (1,2,'constancia_estudios','quieor una constancia','listo_para_entrega','2025-10-28 23:38:27','2025-10-28 23:41:50',1,'ya puedes pasar por tu constancia en las instalaciones, solo tienes que dar tu matricula ');
/*!40000 ALTER TABLE `solicitudes_alumnos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tareas`
--

DROP TABLE IF EXISTS `tareas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tareas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `grupo_id` int NOT NULL,
  `asignatura_id` int NOT NULL,
  `docente_id` int NOT NULL,
  `titulo` varchar(255) NOT NULL,
  `descripcion` text,
  `fecha_limite` datetime DEFAULT NULL,
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `grupo_id` (`grupo_id`),
  KEY `asignatura_id` (`asignatura_id`),
  KEY `docente_id` (`docente_id`),
  CONSTRAINT `tareas_ibfk_1` FOREIGN KEY (`grupo_id`) REFERENCES `grupos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `tareas_ibfk_2` FOREIGN KEY (`asignatura_id`) REFERENCES `asignaturas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `tareas_ibfk_3` FOREIGN KEY (`docente_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tareas`
--

LOCK TABLES `tareas` WRITE;
/*!40000 ALTER TABLE `tareas` DISABLE KEYS */;
INSERT INTO `tareas` VALUES (1,2,12,3,'prueba de tarea ','lorem ipsum ','2025-10-27 14:40:00','2025-10-25 22:40:59'),(2,2,8,3,'prueba de notificacion','lorem upsum ','2025-10-31 21:50:00','2025-10-26 03:50:12'),(3,1,10,3,'tarea1','lorem ipsum','2025-11-05 14:03:00','2025-10-31 18:03:43');
/*!40000 ALTER TABLE `tareas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tareas_entregas`
--

DROP TABLE IF EXISTS `tareas_entregas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tareas_entregas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tarea_id` int NOT NULL,
  `alumno_id` int NOT NULL,
  `ruta_archivo` varchar(500) NOT NULL,
  `nombre_original` varchar(500) NOT NULL,
  `comentario_alumno` text,
  `fecha_entrega` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `calificacion` decimal(5,2) DEFAULT NULL,
  `comentario_docente` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tarea_id` (`tarea_id`,`alumno_id`),
  KEY `alumno_id` (`alumno_id`),
  CONSTRAINT `tareas_entregas_ibfk_1` FOREIGN KEY (`tarea_id`) REFERENCES `tareas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `tareas_entregas_ibfk_2` FOREIGN KEY (`alumno_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tareas_entregas`
--

LOCK TABLES `tareas_entregas` WRITE;
/*!40000 ALTER TABLE `tareas_entregas` DISABLE KEYS */;
INSERT INTO `tareas_entregas` VALUES (1,2,10,'alumno_10_1761450720217.pdf','20250815_Conferencia PolitÃ­ca y EducaciÃ³n.pdf','Esto es una prueba de la entrega de la tarea','2025-10-26 03:52:00',95.00,'Buen trabajo'),(2,1,10,'alumno_10_1761452133643.txt','inventario_estructura.txt','esto es la prueba 2','2025-10-26 04:15:33',65.00,'loi');
/*!40000 ALTER TABLE `tareas_entregas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tipos_asignatura`
--

DROP TABLE IF EXISTS `tipos_asignatura`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tipos_asignatura` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tipo` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tipo` (`tipo`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tipos_asignatura`
--

LOCK TABLES `tipos_asignatura` WRITE;
/*!40000 ALTER TABLE `tipos_asignatura` DISABLE KEYS */;
INSERT INTO `tipos_asignatura` VALUES (2,'Extraordinario'),(1,'Regular'),(3,'Virtual');
/*!40000 ALTER TABLE `tipos_asignatura` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `rol` enum('admin','docente','aspirante','alumno') NOT NULL,
  `foto_perfil` varchar(500) DEFAULT NULL,
  `nombre` varchar(100) NOT NULL,
  `apellido_paterno` varchar(100) NOT NULL,
  `apellido_materno` varchar(100) DEFAULT NULL,
  `genero` enum('Masculino','Femenino','Otro') DEFAULT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `curp` varchar(18) DEFAULT NULL,
  `matricula` varchar(25) DEFAULT NULL,
  `fecha_nacimiento` date DEFAULT NULL,
  `carrera_id` int DEFAULT NULL,
  `sede_id` int DEFAULT NULL,
  `grupo_id` int DEFAULT NULL,
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `curp` (`curp`),
  UNIQUE KEY `matricula` (`matricula`),
  KEY `carrera_id` (`carrera_id`),
  KEY `sede_id` (`sede_id`),
  KEY `grupo_id` (`grupo_id`),
  CONSTRAINT `usuarios_ibfk_1` FOREIGN KEY (`carrera_id`) REFERENCES `carreras` (`id`) ON DELETE SET NULL,
  CONSTRAINT `usuarios_ibfk_2` FOREIGN KEY (`sede_id`) REFERENCES `sedes` (`id`) ON DELETE SET NULL,
  CONSTRAINT `usuarios_ibfk_3` FOREIGN KEY (`grupo_id`) REFERENCES `grupos` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuarios`
--

LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
INSERT INTO `usuarios` VALUES (1,'admin@universidad.com','$2b$10$eMoGXYRsinxKDpUAkoQKbeeRNFpE64FsP8pdzozOW/DRk.OsDzfuO','admin','perfil_1_1761506394869.webp','Admin','Maestro','DelSistema',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-10-16 20:36:22','2025-10-26 19:19:54'),(2,'juli@correo.com','$2b$10$72zBrKPneyFVYQS0A.2pF.uBcHo.oG5/y.1WZkXAd8ZLs7iwi40H2','alumno',NULL,'Julieta','Sarai','Diaz de leonkkjg',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-10-16 21:20:05','2026-01-14 17:28:50'),(3,'docente@correo.com','$2b$10$VA5z4wp19Zxqjkpphz4Uvu08PcPZiiOQGD7GcMTPvn8wGl6VtQ2gm','docente','perfil_3_1761506444765.webp','Docente ','1','1',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-10-17 14:26:28','2025-10-26 19:20:44'),(10,'franksnake09@gmail.com','$2b$10$98WRd0DeM9dPtWSNBNQeMOYgTHN2a1DckBYx9AUefHi9ikBd0GD6.','alumno','perfil_10_1761586512040.webp','Francisco','Montoya','Diaz de leon','Masculino','3315469654','MODF931218HJCNRZ08','20260010','1994-12-18',NULL,NULL,NULL,'2025-10-20 05:52:44','2025-10-27 17:35:12');
/*!40000 ALTER TABLE `usuarios` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-01-15 11:46:07
