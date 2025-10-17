const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());
app.use(express.json());

const dbConfig = {
  host: "localhost",
  user: "root",
  password: "root",
  database: "universidad_db",
};

const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token)
    return res
      .status(403)
      .json({ message: "Se requiere un token para la autenticación" });

  jwt.verify(token, "tu_clave_secreta", (err, user) => {
    if (err)
      return res.status(401).json({ message: "Token inválido o expirado" });
    req.user = user;
    next();
  });
};

const isAdmin = (req, res, next) => {
  if (req.user.rol !== "admin") {
    return res
      .status(403)
      .json({ message: "Acceso denegado. Se requiere rol de administrador." });
  }
  next();
};

const isDocente = (req, res, next) => {
  if (req.user.rol !== "docente") {
    return res
      .status(403)
      .json({ message: "Acceso denegado. Se requiere rol de docente." });
  }
  next();
};

const isAlumno = (req, res, next) => {
  if (req.user.rol !== "alumno") {
    return res
      .status(403)
      .json({ message: "Acceso denegado. Se requiere rol de alumno." });
  }
  next();
};

const apiRouter = express.Router();

apiRouter.post("/login", async (req, res) => {
  const { email, password } = req.body;
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    const [results] = await connection.execute(
      "SELECT * FROM usuarios WHERE email = ?",
      [email]
    );
    if (results.length === 0) {
      return res
        .status(401)
        .json({ message: "Email o contraseña incorrectos" });
    }

    const user = results[0];
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res
        .status(401)
        .json({ message: "Email o contraseña incorrectos" });
    }

    const payload = {
      id: user.id,
      email: user.email,
      rol: user.rol,
      nombre: user.nombre,
    };
    const token = jwt.sign(payload, "tu_clave_secreta", { expiresIn: "8h" });
    res.json({ token, user: payload });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Error del servidor al iniciar sesión" });
  } finally {
    if (connection) await connection.end();
  }
});

// --- CRUD de Usuarios ---
apiRouter.get("/usuarios", verifyToken, isAdmin, async (req, res) => {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    const [usuarios] = await connection.execute(
      "SELECT id, nombre, apellido_paterno, apellido_materno, email, rol FROM usuarios"
    );
    res.json(usuarios);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener usuarios" });
  } finally {
    if (connection) await connection.end();
  }
});

apiRouter.get("/docentes", verifyToken, isAdmin, async (req, res) => {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    const [docentes] = await connection.execute(
      "SELECT id, nombre, apellido_paterno FROM usuarios WHERE rol = 'docente'"
    );
    res.json(docentes);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener docentes" });
  } finally {
    if (connection) await connection.end();
  }
});

apiRouter.get("/aspirantes", verifyToken, isAdmin, async (req, res) => {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    const sql = `
            SELECT u.id, u.nombre, u.apellido_paterno 
            FROM usuarios u
            LEFT JOIN grupo_alumnos ga ON u.id = ga.alumno_id
            WHERE u.rol = 'aspirante' AND ga.id IS NULL
        `;
    const [aspirantes] = await connection.execute(sql);
    res.json(aspirantes);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error al obtener aspirantes", error: error.message });
  } finally {
    if (connection) await connection.end();
  }
});

apiRouter.post("/usuarios", verifyToken, isAdmin, async (req, res) => {
  const { email, password, nombre, apellido_paterno, apellido_materno, rol } =
    req.body;
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql =
      "INSERT INTO usuarios (email, password, nombre, apellido_paterno, apellido_materno, rol) VALUES (?, ?, ?, ?, ?, ?)";
    await connection.execute(sql, [
      email,
      hashedPassword,
      nombre,
      apellido_paterno,
      apellido_materno,
      rol,
    ]);
    res.status(201).json({ message: "Usuario creado exitosamente" });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res
        .status(409)
        .json({ message: "El correo electrónico ya está en uso." });
    }
    res.status(500).json({ message: "Error al crear el usuario" });
  } finally {
    if (connection) await connection.end();
  }
});

apiRouter.put("/usuarios/:id", verifyToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { email, nombre, apellido_paterno, apellido_materno, rol, password } =
    req.body;
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    let sql;
    let params;
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      sql =
        "UPDATE usuarios SET email = ?, nombre = ?, apellido_paterno = ?, apellido_materno = ?, rol = ?, password = ? WHERE id = ?";
      params = [
        email,
        nombre,
        apellido_paterno,
        apellido_materno,
        rol,
        hashedPassword,
        id,
      ];
    } else {
      sql =
        "UPDATE usuarios SET email = ?, nombre = ?, apellido_paterno = ?, apellido_materno = ?, rol = ? WHERE id = ?";
      params = [email, nombre, apellido_paterno, apellido_materno, rol, id];
    }
    await connection.execute(sql, params);
    res.json({ message: "Usuario actualizado exitosamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar el usuario" });
  } finally {
    if (connection) await connection.end();
  }
});

apiRouter.delete("/usuarios/:id", verifyToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    await connection.execute("DELETE FROM usuarios WHERE id = ?", [id]);
    res.json({ message: "Usuario eliminado exitosamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar el usuario" });
  } finally {
    if (connection) await connection.end();
  }
});

// --- CRUD de Asignaturas ---
apiRouter.get("/asignaturas", verifyToken, isAdmin, async (req, res) => {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    const [asignaturas] = await connection.execute("SELECT * FROM asignaturas");
    res.json(asignaturas);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener asignaturas" });
  } finally {
    if (connection) await connection.end();
  }
});

apiRouter.post("/asignaturas", verifyToken, isAdmin, async (req, res) => {
  const {
    nombre_asignatura,
    clave_asignatura,
    creditos,
    plan_estudio_id,
    tipo_asignatura_id,
    grado_id,
  } = req.body;
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    const sql =
      "INSERT INTO asignaturas (nombre_asignatura, clave_asignatura, creditos, plan_estudio_id, tipo_asignatura_id, grado_id) VALUES (?, ?, ?, ?, ?, ?)";
    await connection.execute(sql, [
      nombre_asignatura,
      clave_asignatura,
      creditos,
      plan_estudio_id,
      tipo_asignatura_id,
      grado_id,
    ]);
    res.status(201).json({ message: "Asignatura creada" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error al crear la asignatura", error: error.message });
  } finally {
    if (connection) await connection.end();
  }
});

apiRouter.put("/asignaturas/:id", verifyToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { nombre_asignatura, clave_asignatura, creditos } = req.body;
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    const sql =
      "UPDATE asignaturas SET nombre_asignatura = ?, clave_asignatura = ?, creditos = ? WHERE id = ?";
    await connection.execute(sql, [
      nombre_asignatura,
      clave_asignatura,
      creditos,
      id,
    ]);
    res.json({ message: "Asignatura actualizada" });
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar la asignatura" });
  } finally {
    if (connection) await connection.end();
  }
});

apiRouter.delete("/asignaturas/:id", verifyToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    await connection.execute("DELETE FROM asignaturas WHERE id = ?", [id]);
    res.json({ message: "Asignatura eliminada" });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar la asignatura" });
  } finally {
    if (connection) await connection.end();
  }
});

// --- CRUD de Grupos ---
apiRouter.get("/grupos", verifyToken, isAdmin, async (req, res) => {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    const sql = `
            SELECT g.id, g.nombre_grupo, g.cupo, c.nombre_ciclo, s.nombre_sede, p.nombre_plan, gr.nombre_grado
            FROM grupos g
            LEFT JOIN ciclos c ON g.ciclo_id = c.id
            LEFT JOIN sedes s ON g.sede_id = s.id
            LEFT JOIN planes_estudio p ON g.plan_estudio_id = p.id
            LEFT JOIN grados gr ON g.grado_id = gr.id
        `;
    const [grupos] = await connection.execute(sql);
    res.json(grupos);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error al obtener grupos", error: error.message });
  } finally {
    if (connection) await connection.end();
  }
});

apiRouter.get("/grupos/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    const [grupoDetails] = await connection.execute(
      "SELECT * FROM grupos WHERE id = ?",
      [id]
    );
    if (grupoDetails.length === 0)
      return res.status(404).json({ message: "Grupo no encontrado" });

    const grupo = grupoDetails[0];

    const sqlAsignaturas = `
            SELECT a.id, a.nombre_asignatura, a.clave_asignatura, gda.docente_id,
                   u.nombre AS docente_nombre, u.apellido_paterno AS docente_apellido
            FROM asignaturas a
            LEFT JOIN grupo_asignaturas_docentes gda ON a.id = gda.asignatura_id AND gda.grupo_id = ?
            LEFT JOIN usuarios u ON gda.docente_id = u.id
            WHERE a.plan_estudio_id = ? AND a.grado_id = ?
        `;
    const [asignaturas] = await connection.execute(sqlAsignaturas, [
      id,
      grupo.plan_estudio_id,
      grupo.grado_id,
    ]);

    const sqlAlumnos = `
            SELECT u.id, u.nombre, u.apellido_paterno, u.email
            FROM grupo_alumnos ga
            JOIN usuarios u ON ga.alumno_id = u.id
            WHERE ga.grupo_id = ?
        `;
    const [alumnos] = await connection.execute(sqlAlumnos, [id]);

    res.json({ ...grupo, asignaturas, alumnos });
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener detalles del grupo",
      error: error.message,
    });
  } finally {
    if (connection) await connection.end();
  }
});

apiRouter.post(
  "/grupos/:grupoId/asignar-docente",
  verifyToken,
  isAdmin,
  async (req, res) => {
    const { grupoId } = req.params;
    const { asignatura_id, docente_id } = req.body;
    let connection;
    try {
      connection = await mysql.createConnection(dbConfig);
      const sql = `
            INSERT INTO grupo_asignaturas_docentes (grupo_id, asignatura_id, docente_id)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE docente_id = ?
        `;
      await connection.execute(sql, [
        grupoId,
        asignatura_id,
        docente_id,
        docente_id,
      ]);
      res.status(201).json({ message: "Docente asignado correctamente." });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error al asignar docente.", error: error.message });
    } finally {
      if (connection) await connection.end();
    }
  }
);

apiRouter.post(
  "/grupos/:grupoId/inscribir-alumno",
  verifyToken,
  isAdmin,
  async (req, res) => {
    const { grupoId } = req.params;
    const { alumno_id } = req.body;
    let connection;
    try {
      connection = await mysql.createConnection(dbConfig);
      await connection.beginTransaction();

      await connection.execute(
        "INSERT INTO grupo_alumnos (grupo_id, alumno_id) VALUES (?, ?)",
        [grupoId, alumno_id]
      );
      await connection.execute(
        "UPDATE usuarios SET rol = 'alumno' WHERE id = ?",
        [alumno_id]
      );

      await connection.commit();
      res.status(201).json({ message: "Alumno inscrito correctamente." });
    } catch (error) {
      if (connection) await connection.rollback();
      if (error.code === "ER_DUP_ENTRY") {
        return res
          .status(409)
          .json({ message: "Este alumno ya está inscrito en un grupo." });
      }
      res
        .status(500)
        .json({ message: "Error al inscribir alumno.", error: error.message });
    } finally {
      if (connection) await connection.end();
    }
  }
);

apiRouter.delete(
  "/grupos/:grupoId/dar-baja/:alumnoId",
  verifyToken,
  isAdmin,
  async (req, res) => {
    const { grupoId, alumnoId } = req.params;
    let connection;
    try {
      connection = await mysql.createConnection(dbConfig);
      await connection.beginTransaction();

      await connection.execute(
        "DELETE FROM grupo_alumnos WHERE grupo_id = ? AND alumno_id = ?",
        [grupoId, alumnoId]
      );
      // CORRECCIÓN: Cambiar el rol del alumno de vuelta a 'aspirante'
      await connection.execute(
        "UPDATE usuarios SET rol = 'aspirante' WHERE id = ?",
        [alumnoId]
      );

      await connection.commit();
      res.json({ message: "Alumno dado de baja del grupo." });
    } catch (error) {
      if (connection) await connection.rollback();
      res.status(500).json({
        message: "Error al dar de baja al alumno.",
        error: error.message,
      });
    } finally {
      if (connection) await connection.end();
    }
  }
);

apiRouter.post("/grupos", verifyToken, isAdmin, async (req, res) => {
  const { nombre_grupo, cupo, ciclo_id, sede_id, plan_estudio_id, grado_id } =
    req.body;
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    const sql =
      "INSERT INTO grupos (nombre_grupo, cupo, ciclo_id, sede_id, plan_estudio_id, grado_id) VALUES (?, ?, ?, ?, ?, ?)";
    await connection.execute(sql, [
      nombre_grupo,
      cupo,
      ciclo_id,
      sede_id,
      plan_estudio_id,
      grado_id,
    ]);
    res.status(201).json({ message: "Grupo creado exitosamente" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error al crear el grupo", error: error.message });
  } finally {
    if (connection) await connection.end();
  }
});

apiRouter.put("/grupos/:id", verifyToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { nombre_grupo, cupo, ciclo_id, sede_id, plan_estudio_id, grado_id } =
    req.body;
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    const sql =
      "UPDATE grupos SET nombre_grupo = ?, cupo = ?, ciclo_id = ?, sede_id = ?, plan_estudio_id = ?, grado_id = ? WHERE id = ?";
    await connection.execute(sql, [
      nombre_grupo,
      cupo,
      ciclo_id,
      sede_id,
      plan_estudio_id,
      grado_id,
      id,
    ]);
    res.json({ message: "Grupo actualizado exitosamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar el grupo" });
  } finally {
    if (connection) await connection.end();
  }
});

apiRouter.delete("/grupos/:id", verifyToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    await connection.execute("DELETE FROM grupos WHERE id = ?", [id]);
    res.json({ message: "Grupo eliminado exitosamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar el grupo" });
  } finally {
    if (connection) await connection.end();
  }
});

// --- RUTAS DOCENTE ---
apiRouter.get("/mis-cursos", verifyToken, isDocente, async (req, res) => {
  const docenteId = req.user.id;
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    const sql = `
            SELECT
                g.id as grupo_id,
                g.nombre_grupo,
                a.id as asignatura_id,
                a.nombre_asignatura,
                c.nombre_ciclo,
                (SELECT COUNT(*) FROM grupo_alumnos ga WHERE ga.grupo_id = g.id) as total_alumnos
            FROM grupo_asignaturas_docentes gad
            JOIN grupos g ON gad.grupo_id = g.id
            JOIN asignaturas a ON gad.asignatura_id = a.id
            JOIN ciclos c ON g.ciclo_id = c.id
            WHERE gad.docente_id = ?
        `;
    const [cursos] = await connection.execute(sql, [docenteId]);
    res.json(cursos);
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener los cursos del docente",
      error: error.message,
    });
  } finally {
    if (connection) await connection.end();
  }
});

// --- RUTA ALUMNO ---
apiRouter.get("/mi-grupo", verifyToken, isAlumno, async (req, res) => {
  const alumnoId = req.user.id;
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);

    // 1. Encontrar el grupo del alumno
    const [grupoAlumno] = await connection.execute(
      "SELECT grupo_id FROM grupo_alumnos WHERE alumno_id = ?",
      [alumnoId]
    );
    if (grupoAlumno.length === 0) {
      return res
        .status(404)
        .json({ message: "No estás inscrito en ningún grupo." });
    }
    const grupoId = grupoAlumno[0].grupo_id;

    // 2. Obtener los detalles del grupo
    const [grupoDetails] = await connection.execute(
      "SELECT g.nombre_grupo, c.nombre_ciclo FROM grupos g JOIN ciclos c ON g.ciclo_id = c.id WHERE g.id = ?",
      [grupoId]
    );

    // 3. Obtener las asignaturas y docentes de ese grupo
    const sqlAsignaturas = `
            SELECT 
                a.nombre_asignatura, a.clave_asignatura,
                u.nombre AS docente_nombre, u.apellido_paterno AS docente_apellido
            FROM grupo_asignaturas_docentes gad
            JOIN asignaturas a ON gad.asignatura_id = a.id
            LEFT JOIN usuarios u ON gad.docente_id = u.id
            WHERE gad.grupo_id = ?
        `;
    const [asignaturas] = await connection.execute(sqlAsignaturas, [grupoId]);

    res.json({
      grupo: grupoDetails[0],
      asignaturas: asignaturas,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener la información de tu grupo.",
      error: error.message,
    });
  } finally {
    if (connection) await connection.end();
  }
});

// --- CRUD Catálogos (Carreras, Sedes, etc.) ---

// Carreras
apiRouter.post("/carreras", verifyToken, isAdmin, async (req, res) => {
  const { nombre_carrera } = req.body;
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    await connection.execute(
      "INSERT INTO carreras (nombre_carrera) VALUES (?)",
      [nombre_carrera]
    );
    res.status(201).json({ message: "Carrera creada" });
  } catch (error) {
    res.status(500).json({ message: "Error al crear carrera" });
  } finally {
    if (connection) await connection.end();
  }
});

apiRouter.put("/carreras/:id", verifyToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { nombre_carrera } = req.body;
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    await connection.execute(
      "UPDATE carreras SET nombre_carrera = ? WHERE id = ?",
      [nombre_carrera, id]
    );
    res.json({ message: "Carrera actualizada" });
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar carrera" });
  } finally {
    if (connection) await connection.end();
  }
});

apiRouter.delete("/carreras/:id", verifyToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    await connection.execute("DELETE FROM carreras WHERE id = ?", [id]);
    res.json({ message: "Carrera eliminada" });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar carrera" });
  } finally {
    if (connection) await connection.end();
  }
});

// Sedes
apiRouter.post("/sedes", verifyToken, isAdmin, async (req, res) => {
  const { nombre_sede, direccion } = req.body;
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    await connection.execute(
      "INSERT INTO sedes (nombre_sede, direccion) VALUES (?, ?)",
      [nombre_sede, direccion]
    );
    res.status(201).json({ message: "Sede creada" });
  } catch (error) {
    res.status(500).json({ message: "Error al crear sede" });
  } finally {
    if (connection) await connection.end();
  }
});

apiRouter.put("/sedes/:id", verifyToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { nombre_sede, direccion } = req.body;
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    await connection.execute(
      "UPDATE sedes SET nombre_sede = ?, direccion = ? WHERE id = ?",
      [nombre_sede, direccion, id]
    );
    res.json({ message: "Sede actualizada" });
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar sede" });
  } finally {
    if (connection) await connection.end();
  }
});

apiRouter.delete("/sedes/:id", verifyToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    await connection.execute("DELETE FROM sedes WHERE id = ?", [id]);
    res.json({ message: "Sede eliminada" });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar sede" });
  } finally {
    if (connection) await connection.end();
  }
});

// --- Rutas para obtener catálogos ---
apiRouter.get("/carreras", verifyToken, isAdmin, async (req, res) => {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      "SELECT id, nombre_carrera FROM carreras"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Error al obtener carreras" });
  } finally {
    if (connection) await connection.end();
  }
});

apiRouter.get("/sedes", verifyToken, isAdmin, async (req, res) => {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      "SELECT id, nombre_sede, direccion FROM sedes"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Error al obtener sedes" });
  } finally {
    if (connection) await connection.end();
  }
});

apiRouter.get("/ciclos", verifyToken, isAdmin, async (req, res) => {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      "SELECT id, nombre_ciclo FROM ciclos"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Error al obtener ciclos" });
  } finally {
    if (connection) await connection.end();
  }
});

apiRouter.get("/planes-estudio", verifyToken, isAdmin, async (req, res) => {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      "SELECT id, nombre_plan FROM planes_estudio"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Error al obtener planes de estudio" });
  } finally {
    if (connection) await connection.end();
  }
});

apiRouter.get("/grados", verifyToken, isAdmin, async (req, res) => {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      "SELECT id, nombre_grado FROM grados"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Error al obtener grados" });
  } finally {
    if (connection) await connection.end();
  }
});

// Prefijo para todas las rutas de la API
app.use("/api", apiRouter);

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
