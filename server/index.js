const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = "tu_clave_secreta_super_segura_y_larga";
const CURP_REGEX =
  /^[A-Z]{1}[AEIOU]{1}[A-Z]{2}[0-9]{2}(0[1-9]|1[0-2])(0[1-9]|1[0-9]|2[0-9]|3[0-1])[HM]{1}(AS|BC|BS|CC|CS|CH|CL|CM|DF|DG|GT|GR|HG|JC|MC|MN|MS|NT|NL|OC|PL|QT|QR|SP|SL|SR|TC|TS|TL|VZ|YN|ZS|NE)[B-DF-HJ-NP-TV-Z]{3}[A-Z0-9]{1}[0-9]{1}$/;

// --- SERVIR ARCHIVOS ESTÁTICOS ---
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
app.use("/uploads", express.static(uploadsDir));

// --- CONFIGURACIÓN DE MULTER (PARA SUBIDA DE ARCHIVOS) ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const upload = multer({ storage: storage });

// --- CONFIGURACIÓN DE LA BASE DE DATOS ---
const dbConfig = {
  host: "localhost",
  user: "root",
  password: "root",
  database: "universidad_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

let db;

async function connectToDatabase() {
  try {
    db = await mysql.createPool(dbConfig);
    console.log("Conectado exitosamente a la base de datos MySQL.");
  } catch (err) {
    console.error("Error al conectar a la base de datos:", err);
    process.exit(1);
  }
}

connectToDatabase();

// --- MIDDLEWARE DE AUTENTICACIÓN ---
// Este middleware verifica el token y adjunta 'req.user' si es válido
// No bloquea rutas, solo identifica al usuario
const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    // No hay token, pero continuamos. Las rutas que requieran auth fallarán después.
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (decoded) {
      req.user = decoded; // Adjuntamos el usuario si el token es válido
    }
    // Si hay un error (token expirado/inválido), no adjuntamos nada
    next();
  });
};

// --- MIDDLEWARES DE AUTORIZACIÓN (ROL) ---
// Estos middlewares SÍ bloquean la ruta si no se cumple el rol

const isAdmin = (req, res, next) => {
  if (req.user && req.user.rol === "admin") {
    return next();
  }
  return res
    .status(403)
    .send({ message: "Acceso denegado. Se requiere rol de administrador." });
};

const isDocente = (req, res, next) => {
  if (req.user && req.user.rol === "docente") {
    return next();
  }
  return res
    .status(403)
    .send({ message: "Acceso denegado. Se requiere rol de docente." });
};

const isAlumno = (req, res, next) => {
  if (req.user && req.user.rol === "alumno") {
    return next();
  }
  return res
    .status(403)
    .send({ message: "Acceso denegado. Se requiere rol de alumno." });
};

const apiRouter = express.Router();
app.use("/api", apiRouter); // Montamos el router principal en /api

// --- RUTA PÚBLICA DE LOGIN ---
// Esta ruta no usa 'verifyToken' porque es para obtener el token
apiRouter.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const [results] = await db.query("SELECT * FROM usuarios WHERE email = ?", [
      email,
    ]);
    if (results.length === 0) {
      return res
        .status(401)
        .send({ message: "Email o contraseña incorrectos" });
    }
    const user = results[0];
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res
        .status(401)
        .send({ message: "Email o contraseña incorrectos" });
    }
    const payload = {
      id: user.id,
      email: user.email,
      rol: user.rol,
      nombre: user.nombre,
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "8h" });
    res.json({ token, user: payload });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Error en el servidor durante el login." });
  }
});

// --- A PARTIR DE AQUÍ, TODAS LAS RUTAS REQUIEREN UN TOKEN VÁLIDO ---
// Usamos el middleware 'verifyToken' para todas las rutas que siguen
apiRouter.use(verifyToken);

// --- RUTAS DE ADMIN ---
// Usan el middleware 'isAdmin' para asegurar que solo los admins entren
const adminRouter = express.Router();
adminRouter.use(isAdmin); // ¡Importante! 'isAdmin' se aplica a todas las rutas de 'adminRouter'

function createCatalogCrudRoutes(router, tableName, fields) {
  router.get(`/${tableName}`, async (req, res) =>
    res.json((await db.query(`SELECT * FROM ${tableName}`))[0])
  );
  router.post(`/${tableName}`, async (req, res) => {
    const values = fields.map((f) => req.body[f]);
    const placeholders = fields.map(() => "?").join(", ");
    await db.query(
      `INSERT INTO ${tableName} (${fields.join(",")}) VALUES (${placeholders})`,
      values
    );
    res.status(201).send({ message: "Creado con éxito" });
  });
  router.put(`/${tableName}/:id`, async (req, res) => {
    const values = fields.map((f) => req.body[f]);
    const setClause = fields.map((f) => `${f} = ?`).join(", ");
    await db.query(`UPDATE ${tableName} SET ${setClause} WHERE id = ?`, [
      ...values,
      req.params.id,
    ]);
    res.send({ message: "Actualizado con éxito" });
  });
  router.delete(`/${tableName}/:id`, async (req, res) => {
    await db.query(`DELETE FROM ${tableName} WHERE id = ?`, [req.params.id]);
    res.send({ message: "Eliminado con éxito" });
  });
}
createCatalogCrudRoutes(adminRouter, "planes_estudio", ["nombre_plan"]);
createCatalogCrudRoutes(adminRouter, "tipos_asignatura", ["tipo"]);
createCatalogCrudRoutes(adminRouter, "grados", ["nombre_grado"]);
createCatalogCrudRoutes(adminRouter, "ciclos", ["nombre_ciclo"]);
createCatalogCrudRoutes(adminRouter, "sedes", ["nombre_sede", "direccion"]);
createCatalogCrudRoutes(adminRouter, "carreras", ["nombre_carrera"]);

adminRouter.get("/usuarios", async (req, res) =>
  res.json(
    (
      await db.query(
        "SELECT id, nombre, apellido_paterno, apellido_materno, email, rol, telefono, curp, genero, DATE_FORMAT(fecha_nacimiento, '%Y-%m-%d') as fecha_nacimiento FROM usuarios"
      )
    )[0]
  )
);
adminRouter.post("/usuarios", async (req, res) => {
  const {
    email,
    password,
    nombre,
    rol,
    apellido_paterno,
    apellido_materno,
    genero,
    telefono,
    curp,
    fecha_nacimiento,
  } = req.body;
  if (curp && !CURP_REGEX.test(curp)) {
    return res
      .status(400)
      .send({ message: "El formato de la CURP no es válido." });
  }
  if (!["aspirante", "alumno", "docente", "admin"].includes(rol))
    return res.status(400).send({ message: "Rol no válido" });
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query(
      "INSERT INTO usuarios (email, password, nombre, rol, apellido_paterno, apellido_materno, genero, telefono, curp, fecha_nacimiento) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", // <-- Campos agregados
      [
        email,
        hashedPassword,
        nombre,
        rol,
        apellido_paterno || null,
        apellido_materno || null,
        genero || null, // <-- Valor agregado
        telefono || null, // <-- Valor agregado
        curp || null, // <-- Valor agregado
        fecha_nacimiento || null, // <-- Valor agregado
      ]
    );
    res.status(201).send({ message: "Usuario registrado" });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY")
      return res
        .status(409)
        .send({ message: "El correo electrónico ya está en uso." });
    res.status(500).send({ message: "Error al registrar el usuario" });
  }
});
adminRouter.get("/usuarios/:id", async (req, res) =>
  res.json(
    (
      await db.query(
        "SELECT id, nombre, apellido_paterno, email, rol, apellido_materno, genero, telefono, curp, fecha_nacimiento FROM usuarios WHERE id = ?", // <-- Campos agregados
        [req.params.id]
      )
    )[0][0]
  )
);
adminRouter.put("/usuarios/:id", async (req, res) => {
  const {
    nombre,
    apellido_paterno,
    apellido_materno,
    email,
    password,
    rol,
    genero,
    telefono,
    curp,
    fecha_nacimiento,
  } = req.body;
  if (curp && !CURP_REGEX.test(curp)) {
    return res
      .status(400)
      .send({ message: "El formato de la CURP no es válido." });
  }
  let sql, params;
  if (password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    sql =
      "UPDATE usuarios SET nombre=?, apellido_paterno=?, apellido_materno=?, email=?, password=?, rol=?, genero=?, telefono=?, curp=?, fecha_nacimiento=? WHERE id=?"; // <-- Campos agregados
    params = [
      nombre,
      apellido_paterno,
      apellido_materno,
      email,
      hashedPassword,
      rol,
      genero, // <-- Valor agregado
      telefono, // <-- Valor agregado
      curp, // <-- Valor agregado
      fecha_nacimiento, // <-- Valor agregado
      req.params.id,
    ];
  } else {
    sql =
      "UPDATE usuarios SET nombre=?, apellido_paterno=?, apellido_materno=?, email=?, rol=?, genero=?, telefono=?, curp=?, fecha_nacimiento=? WHERE id=?"; // <-- Campos agregados
    params = [
      nombre,
      apellido_paterno,
      apellido_materno,
      email,
      rol,
      genero, // <-- Valor agregado
      telefono, // <-- Valor agregado
      curp, // <-- Valor agregado
      fecha_nacimiento, // <-- Valor agregado
      req.params.id,
    ];
  }
  try {
    await db.query(sql, params);
    res.send({ message: "Usuario actualizado" });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY")
      return res.status(409).send({ message: "El email ya está en uso." });
    res.status(500).send({ message: "Error al actualizar usuario" });
  }
});
adminRouter.delete("/usuarios/:id", async (req, res) => {
  await db.query("DELETE FROM usuarios WHERE id = ?", [req.params.id]);
  res.send({ message: "Usuario eliminado" });
});
adminRouter.get("/aspirantes", async (req, res) =>
  res.json(
    (
      await db.query(
        "SELECT id, nombre, apellido_paterno FROM usuarios WHERE rol = 'aspirante'"
      )
    )[0]
  )
);
adminRouter.get("/docentes", async (req, res) =>
  res.json(
    (
      await db.query(
        "SELECT id, nombre, apellido_paterno FROM usuarios WHERE rol = 'docente'"
      )
    )[0]
  )
);
adminRouter.get("/asignaturas", async (req, res) => {
  const sql = `
    SELECT a.*, p.nombre_plan, g.nombre_grado
    FROM asignaturas a
    LEFT JOIN planes_estudio p ON a.plan_estudio_id = p.id
    LEFT JOIN grados g ON a.grado_id = g.id
  `;
  res.json((await db.query(sql))[0]);
});
adminRouter.post("/asignaturas", async (req, res) => {
  const {
    nombre_asignatura,
    clave_asignatura,
    creditos,
    plan_estudio_id,
    tipo_asignatura_id,
    grado_id,
  } = req.body;
  await db.query(
    "INSERT INTO asignaturas (nombre_asignatura, clave_asignatura, creditos, plan_estudio_id, tipo_asignatura_id, grado_id) VALUES (?,?,?,?,?,?)",
    [
      nombre_asignatura,
      clave_asignatura,
      creditos,
      plan_estudio_id,
      tipo_asignatura_id,
      grado_id,
    ]
  );
  res.status(201).send({ message: "Asignatura creada" });
});
adminRouter.put("/asignaturas/:id", async (req, res) => {
  const {
    nombre_asignatura,
    clave_asignatura,
    creditos,
    plan_estudio_id,
    tipo_asignatura_id,
    grado_id,
  } = req.body;
  await db.query(
    "UPDATE asignaturas SET nombre_asignatura=?, clave_asignatura=?, creditos=?, plan_estudio_id=?, tipo_asignatura_id=?, grado_id=? WHERE id=?",
    [
      nombre_asignatura,
      clave_asignatura,
      creditos,
      plan_estudio_id,
      tipo_asignatura_id,
      grado_id,
      req.params.id,
    ]
  );
  res.send({ message: "Asignatura actualizada" });
});
adminRouter.delete("/asignaturas/:id", async (req, res) => {
  await db.query("DELETE FROM asignaturas WHERE id = ?", [req.params.id]);
  res.send({ message: "Asignatura eliminada" });
});
adminRouter.get("/grupos", async (req, res) => {
  const sql = `
        SELECT g.*, g.estatus, c.nombre_ciclo, s.nombre_sede, p.nombre_plan, gr.nombre_grado 
        FROM grupos g
        JOIN ciclos c ON g.ciclo_id = c.id
        JOIN sedes s ON g.sede_id = s.id
        JOIN planes_estudio p ON g.plan_estudio_id = p.id
        JOIN grados gr ON g.grado_id = gr.id
    `;
  res.json((await db.query(sql))[0]);
});
adminRouter.get("/grupos/:id", async (req, res) => {
  const grupoId = req.params.id;
  const [grupoRes] = await db.query("SELECT * FROM grupos WHERE id = ?", [
    grupoId,
  ]);
  if (grupoRes.length === 0)
    return res.status(404).send({ message: "Grupo no encontrado" });
  const asignaturasSql = `
        SELECT a.id, a.nombre_asignatura, a.clave_asignatura, u.id as docente_id, u.nombre as docente_nombre, u.apellido_paterno as docente_apellido
        FROM asignaturas a
        LEFT JOIN grupo_asignaturas_docentes gad ON a.id = gad.asignatura_id AND gad.grupo_id = ?
        LEFT JOIN usuarios u ON gad.docente_id = u.id
        WHERE a.grado_id = ? AND a.plan_estudio_id = ?`;
  const [asignaturas] = await db.query(asignaturasSql, [
    grupoId,
    grupoRes[0].grado_id,
    grupoRes[0].plan_estudio_id,
  ]);
  const alumnosSql = `
        SELECT u.id, u.nombre, u.apellido_paterno, u.email 
        FROM usuarios u
        JOIN grupo_alumnos ga ON u.id = ga.alumno_id
        WHERE ga.grupo_id = ?`;
  const [alumnos] = await db.query(alumnosSql, [grupoId]);
  res.json({ ...grupoRes[0], asignaturas, alumnos });
});
adminRouter.post("/grupos", async (req, res) => {
  const {
    nombre_grupo,
    cupo,
    ciclo_id,
    sede_id,
    plan_estudio_id,
    grado_id,
    estatus,
  } = req.body;
  await db.query(
    "INSERT INTO grupos (nombre_grupo, cupo, ciclo_id, sede_id, plan_estudio_id, grado_id, estatus) VALUES (?,?,?,?,?,?,?)",
    [
      nombre_grupo,
      cupo,
      ciclo_id,
      sede_id,
      plan_estudio_id,
      grado_id,
      estatus || "activo",
    ]
  );
  res.status(201).send({ message: "Grupo creado" });
});
adminRouter.put("/grupos/:id", async (req, res) => {
  const {
    nombre_grupo,
    cupo,
    ciclo_id,
    sede_id,
    plan_estudio_id,
    grado_id,
    estatus,
  } = req.body;
  await db.query(
    "UPDATE grupos SET nombre_grupo=?, cupo=?, ciclo_id=?, sede_id=?, plan_estudio_id=?, grado_id=?, estatus=? WHERE id=?",
    [
      nombre_grupo,
      cupo,
      ciclo_id,
      sede_id,
      plan_estudio_id,
      grado_id,
      estatus, // <-- Agregado
      req.params.id,
    ]
  );
  res.send({ message: "Grupo actualizado" });
});
adminRouter.delete("/grupos/:id", async (req, res) => {
  await db.query("DELETE FROM grupos WHERE id = ?", [req.params.id]);
  res.send({ message: "Grupo eliminado" });
});
adminRouter.post("/grupos/:id/asignar-docente", async (req, res) => {
  const { asignatura_id, docente_id } = req.body;
  const grupo_id = req.params.id;
  await db.query(
    "INSERT INTO grupo_asignaturas_docentes (grupo_id, asignatura_id, docente_id) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE docente_id = ?",
    [grupo_id, asignatura_id, docente_id, docente_id]
  );
  res.send({ message: "Docente asignado" });
});
adminRouter.post("/grupos/:id/inscribir-alumno", async (req, res) => {
  const grupo_id = req.params.id;
  const { alumno_id } = req.body;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(
      "INSERT INTO grupo_alumnos (grupo_id, alumno_id) VALUES (?, ?)",
      [grupo_id, alumno_id]
    );
    await connection.query("UPDATE usuarios SET rol = 'alumno' WHERE id = ?", [
      alumno_id,
    ]);
    await connection.commit();
    res.status(201).send({ message: "Alumno inscrito" });
  } catch (error) {
    await connection.rollback();
    if (error.code === "ER_DUP_ENTRY")
      return res
        .status(409)
        .send({ message: "El alumno ya está inscrito en este grupo." });
    res.status(500).send({ message: "Error al inscribir alumno" });
  } finally {
    connection.release();
  }
});
adminRouter.delete("/grupos/:id/dar-baja/:alumnoId", async (req, res) => {
  const { id: grupo_id, alumnoId } = req.params;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(
      "DELETE FROM grupo_alumnos WHERE grupo_id = ? AND alumno_id = ?",
      [grupo_id, alumnoId]
    );
    await connection.query(
      "UPDATE usuarios SET rol = 'aspirante' WHERE id = ?",
      [alumnoId]
    );
    await connection.commit();
    res.send({ message: "Alumno dado de baja" });
  } catch (error) {
    await connection.rollback();
    res.status(500).send({ message: "Error al dar de baja" });
  } finally {
    connection.release();
  }
});
adminRouter.get("/aspirantes/:id/expediente", async (req, res) => {
  const { id } = req.params;
  const [docs] = await db.query(
    "SELECT * FROM expediente_aspirantes WHERE aspirante_id = ?",
    [id]
  );
  res.json(docs);
});
adminRouter.post(
  "/aspirantes/:id/upload",
  upload.single("documento"),
  async (req, res) => {
    const { id: aspirante_id } = req.params;
    const { tipo_documento } = req.body;
    if (!req.file) {
      return res.status(400).send({ message: "No se subió ningún archivo." });
    }
    const { filename, originalname } = req.file;
    const sql = `
        INSERT INTO expediente_aspirantes (aspirante_id, tipo_documento, ruta_archivo, nombre_original)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE ruta_archivo = ?, nombre_original = ?`;
    await db.query(sql, [
      aspirante_id,
      tipo_documento,
      filename,
      originalname,
      filename,
      originalname,
    ]);
    res
      .status(201)
      .send({ message: "Documento subido con éxito", filePath: filename });
  }
);
adminRouter.delete("/expedientes/:id", async (req, res) => {
  const { id } = req.params;
  const [[doc]] = await db.query(
    "SELECT * FROM expediente_aspirantes WHERE id = ?",
    [id]
  );
  if (doc) {
    fs.unlink(path.join(uploadsDir, doc.ruta_archivo), (err) => {
      if (err) console.error("Error al borrar archivo físico:", err);
    });
    await db.query("DELETE FROM expediente_aspirantes WHERE id = ?", [id]);
    res.send({ message: "Documento eliminado" });
  } else {
    res.status(404).send({ message: "Documento no encontrado" });
  }
});
apiRouter.use("/admin", adminRouter); // Registra el router de admin en /api/admin

// --- RUTAS DE DOCENTE ---
const docenteRouter = express.Router();
docenteRouter.use(isDocente); // Se asegura que solo docentes entren
docenteRouter.get("/mis-cursos", async (req, res) => {
  const docente_id = req.user.id;
  const sql = `
        SELECT 
            g.id as grupo_id, g.nombre_grupo, a.id as asignatura_id,
            a.nombre_asignatura, c.nombre_ciclo,
            (SELECT COUNT(*) FROM grupo_alumnos WHERE grupo_id = g.id) as total_alumnos
        FROM grupo_asignaturas_docentes gad
        JOIN grupos g ON gad.grupo_id = g.id
        JOIN asignaturas a ON gad.asignatura_id = a.id
        JOIN ciclos c ON g.ciclo_id = c.id
        WHERE gad.docente_id = ?`;
  res.json((await db.query(sql, [docente_id]))[0]);
});
docenteRouter.get(
  "/grupo/:grupoId/asignatura/:asignaturaId/alumnos",
  async (req, res) => {
    const { grupoId, asignaturaId } = req.params;
    const cursoSql = `SELECT g.nombre_grupo, a.nombre_asignatura FROM grupos g, asignaturas a WHERE g.id = ? AND a.id = ?`;
    const [[cursoInfo]] = await db.query(cursoSql, [grupoId, asignaturaId]);
    const alumnosSql = `
        SELECT u.id, CONCAT(u.nombre, ' ', u.apellido_paterno) as nombre_completo, c.calificacion
        FROM grupo_alumnos ga JOIN usuarios u ON ga.alumno_id = u.id
        LEFT JOIN calificaciones c ON c.alumno_id = u.id AND c.asignatura_id = ?
        WHERE ga.grupo_id = ? AND u.rol = 'alumno'`;
    const [alumnos] = await db.query(alumnosSql, [asignaturaId, grupoId]);
    res.json({ cursoInfo, alumnos });
  }
);
docenteRouter.post("/calificar", async (req, res) => {
  const { alumno_id, asignatura_id, calificacion } = req.body;
  await db.query(
    "INSERT INTO calificaciones (alumno_id, asignatura_id, calificacion) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE calificacion = ?",
    [alumno_id, asignatura_id, calificacion, calificacion]
  );
  res.send({ message: "Calificación guardada" });
});
apiRouter.use("/docente", docenteRouter); // Registra el router de docente en /api/docente

// --- RUTAS DE ALUMNO ---
const alumnoRouter = express.Router();
alumnoRouter.use(isAlumno); // Se asegura que solo alumnos entren
alumnoRouter.get("/mi-grupo", async (req, res) => {
  const alumno_id = req.user.id;
  const [[miGrupo]] = await db.query(
    "SELECT * FROM grupo_alumnos WHERE alumno_id = ?",
    [alumno_id]
  );
  if (!miGrupo)
    return res.status(404).send({ message: "No estás inscrito en un grupo." });

  const grupoId = miGrupo.grupo_id;
  const [[grupo]] = await db.query(
    `SELECT g.*, c.nombre_ciclo FROM grupos g JOIN ciclos c ON g.ciclo_id = c.id WHERE g.id = ?`,
    [grupoId]
  );

  const asignaturasSql = `
        SELECT a.nombre_asignatura, a.clave_asignatura, u.nombre as docente_nombre, u.apellido_paterno as docente_apellido, cal.calificacion
        FROM asignaturas a
        LEFT JOIN grupo_asignaturas_docentes gad ON a.id = gad.asignatura_id AND gad.grupo_id = ?
        LEFT JOIN usuarios u ON gad.docente_id = u.id
        LEFT JOIN calificaciones cal ON cal.asignatura_id = a.id AND cal.alumno_id = ?
        WHERE a.grado_id = ? AND a.plan_estudio_id = ?`;

  const [asignaturas] = await db.query(asignaturasSql, [
    grupoId,
    alumno_id,
    grupo.grado_id,
    grupo.plan_estudio_id,
  ]);
  res.json({ grupo, asignaturas });
});
apiRouter.use("/alumno", alumnoRouter); // Registra el router de alumno en /api/alumno

// --- INICIO DEL SERVIDOR ---
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
