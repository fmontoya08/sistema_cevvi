const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const fetch = require("node-fetch");

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = "tu_clave_secreta_super_segura_y_larga";
const CURP_REGEX =
  /^[A-Z]{1}[AEIOU]{1}[A-Z]{2}[0-9]{2}(0[1-9]|1[0-2])(0[1-9]|1[0-9]|2[0-9]|3[0-1])[HM]{1}(AS|BC|BS|CC|CS|CH|CL|CM|DF|DG|GT|GR|HG|JC|MC|MN|MS|NT|NL|OC|PL|QT|QR|SP|SL|SR|TC|TS|TL|VZ|YN|ZS|NE)[B-DF-HJ-NP-TV-Z]{3}[A-Z0-9]{1}[0-9]{1}$/;

// --- SERVIR ARCHIVOS ESTÁTICOS ---

// Directorio principal de UPLOADS
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
app.use("/uploads", express.static(uploadsDir));

// Directorio de TAREAS
const tareasDir = path.join(__dirname, "uploads/tareas");
if (!fs.existsSync(tareasDir)) {
  fs.mkdirSync(tareasDir, { recursive: true });
}
app.use("/uploads/tareas", express.static(tareasDir));

// Directorio de RECURSOS
const recursosDir = path.join(__dirname, "uploads/recursos");
if (!fs.existsSync(recursosDir)) {
  fs.mkdirSync(recursosDir, { recursive: true });
}
app.use("/uploads/recursos", express.static(recursosDir));

// --- FIN DE SERVIR ARCHIVOS ESTÁTICOS ---
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

// --- INICIA NUEVO CÓDIGO (AGREGAR) ---
// Configuración de Multer para TAREAS
const tareasStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Guardamos en la carpeta específica de la tarea
    const tareaId = req.params.tareaId;
    const dest = path.join(tareasDir, `tarea_${tareaId}`);
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    cb(null, dest);
  },
  filename: function (req, file, cb) {
    // Usamos el ID del alumno para evitar que suba dos veces
    // y para identificarlo fácilmente
    const alumnoId = req.user.id;
    const uniqueSuffix = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `alumno_${alumnoId}_${uniqueSuffix}${ext}`);
  },
});

const uploadTarea = multer({ storage: tareasStorage });

// --- INICIA NUEVO CÓDIGO (AGREGAR) ---
// Configuración de Multer para RECURSOS
const recursosStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const { grupoId, asignaturaId } = req.params;
    const dest = path.join(recursosDir, `curso_G${grupoId}_A${asignaturaId}`);
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    cb(null, dest);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const uploadRecurso = multer({ storage: recursosStorage });
// --- TERMINA NUEVO CÓDIGO ---
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
const isAspirante = (req, res, next) => {
  if (req.user && req.user.rol === "aspirante") {
    return next();
  }
  return res
    .status(403)
    .send({ message: "Acceso denegado. Se requiere rol de aspirante." });
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
      apellido_paterno: user.apellido_paterno,
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

// --- RUTAS PARA NOTIFICACIONES WEB ---

// GET /api/notificaciones/no-leidas - Obtener notificaciones no leídas y el conteo
apiRouter.get("/notificaciones/no-leidas", async (req, res) => {
  if (!req.user) {
    return res.status(401).send({ message: "No autenticado" });
  }
  const userId = req.user.id;
  try {
    const [notificaciones] = await db.query(
      "SELECT id, mensaje, url_destino, fecha_creacion FROM notificaciones WHERE user_id = ? AND leida = FALSE ORDER BY fecha_creacion DESC LIMIT 10",
      [userId]
    );
    const [[{ count }]] = await db.query(
      "SELECT COUNT(*) as count FROM notificaciones WHERE user_id = ? AND leida = FALSE",
      [userId]
    );
    res.json({ notificaciones, count });
  } catch (error) {
    console.error("Error al obtener notificaciones:", error);
    res.status(500).send({ message: "Error en el servidor" });
  }
});

// PUT /api/notificaciones/:id/marcar-leida - Marcar una notificación específica como leída
apiRouter.put("/notificaciones/:id/marcar-leida", async (req, res) => {
  if (!req.user) {
    return res.status(401).send({ message: "No autenticado" });
  }
  const userId = req.user.id;
  const notificationId = req.params.id;
  try {
    const [result] = await db.query(
      "UPDATE notificaciones SET leida = TRUE WHERE id = ? AND user_id = ?",
      [notificationId, userId]
    );
    if (result.affectedRows > 0) {
      res.send({ message: "Notificación marcada como leída" });
    } else {
      res.status(404).send({
        message: "Notificación no encontrada o no pertenece al usuario",
      });
    }
  } catch (error) {
    console.error("Error al marcar notificación como leída:", error);
    res.status(500).send({ message: "Error en el servidor" });
  }
});

// PUT /api/notificaciones/marcar-todas-leidas - Marcar todas las notificaciones del usuario como leídas
apiRouter.put("/notificaciones/marcar-todas-leidas", async (req, res) => {
  if (!req.user) {
    return res.status(401).send({ message: "No autenticado" });
  }
  const userId = req.user.id;
  try {
    await db.query(
      "UPDATE notificaciones SET leida = TRUE WHERE user_id = ? AND leida = FALSE", // Solo actualiza las no leídas
      [userId]
    );
    res.send({ message: "Todas las notificaciones marcadas como leídas" });
  } catch (error) {
    console.error(
      "Error al marcar todas las notificaciones como leídas:",
      error
    );
    res.status(500).send({ message: "Error en el servidor" });
  }
});

// --- FIN RUTAS NOTIFICACIONES ---

// ... (El resto de tus rutas API existentes, como /register-push-token, /calificar-grupo-completo, etc.)

// RUTA PARA REGISTRAR UN TOKEN
apiRouter.post("/register-push-token", async (req, res) => {
  const { token } = req.body;
  const userId = req.user.id; // Obtenemos el ID del usuario del token JWT

  if (!token) {
    return res.status(400).send({ message: "Token es requerido." });
  }

  try {
    // Usamos INSERT IGNORE para evitar errores si el token ya existe
    await db.query(
      "INSERT IGNORE INTO push_tokens (user_id, token) VALUES (?, ?)",
      [userId, token]
    );
    res.status(200).send({ message: "Token registrado con éxito." });
  } catch (error) {
    console.error("Error al registrar push token:", error);
    res.status(500).send({ message: "Error en el servidor." });
  }
});

// RUTA PARA ELIMINAR UN TOKEN (PARA EL LOGOUT)
apiRouter.delete("/unregister-push-token", async (req, res) => {
  const { token } = req.body;
  const userId = req.user.id;

  if (!token) {
    return res.status(400).send({ message: "Token es requerido." });
  }

  try {
    await db.query("DELETE FROM push_tokens WHERE user_id = ? AND token = ?", [
      userId,
      token,
    ]);
    res.status(200).send({ message: "Token eliminado con éxito." });
  } catch (error) {
    console.error("Error al eliminar push token:", error);
    res.status(500).send({ message: "Error en el servidor." });
  }
});

// --- FIN DE NUEVAS RUTAS ---

// --- NUEVA RUTA "GUARDAR TODO" (PARA ADMIN Y DOCENTE) ---
apiRouter.post("/calificar-grupo-completo", async (req, res) => {
  // 1. Verificar permisos
  if (req.user.rol !== "admin" && req.user.rol !== "docente") {
    return res.status(403).send({
      message: "Acceso denegado. Se requiere rol de Admin o Docente.",
    });
  }

  const { asignatura_id, calificaciones, grupo_id } = req.body; // <-- OBTENER grupo_id
  // 'calificaciones' debe ser un arreglo: [{ alumno_id: 1, calificacion: 90 }, ...]

  if (
    !asignatura_id ||
    !grupo_id ||
    !calificaciones ||
    !Array.isArray(calificaciones)
  ) {
    // <-- VALIDAR grupo_id
    return res.status(400).send({ message: "Datos incompletos." });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 2. Iterar y guardar cada calificación
    for (const cal of calificaciones) {
      const alumnoId = cal.alumno_id;
      let calificacionGuardada = null; // Para saber si se guardó algo válido

      // Validamos y guardamos la calificación
      const calNum = parseFloat(cal.calificacion);
      if (isNaN(calNum) || calNum < 0 || calNum > 100) {
        // --- CORRECCIÓN AQUÍ ---
        await connection.query(
          "INSERT INTO calificaciones (alumno_id, asignatura_id, grupo_id, calificacion) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE calificacion = ?", // <-- CORREGIDO: Añadido grupo_id en columnas
          [cal.alumno_id, asignatura_id, grupo_id, null, null]
        );
      } else {
        // --- CORRECCIÓN AQUÍ ---
        await connection.query(
          "INSERT INTO calificaciones (alumno_id, asignatura_id, grupo_id, calificacion) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE calificacion = ?", // <-- CORREGIDO: Añadido grupo_id en columnas
          [cal.alumno_id, asignatura_id, grupo_id, calNum, calNum]
        );
        calificacionGuardada = calNum; // Guardamos el número para notificar
      }

      // --- ¡MODIFICACIÓN AQUÍ! AÑADIR NOTIFICACIÓN WEB ---
      if (calificacionGuardada !== null) {
        try {
          const mensaje = `Nueva calificación registrada: ${calificacionGuardada}`;
          const urlDestino = "/alumno/dashboard"; // A dónde irá al hacer clic

          // Insertamos en la nueva tabla 'notificaciones'
          await connection.query(
            "INSERT INTO notificaciones (user_id, mensaje, url_destino) VALUES (?, ?, ?)",
            [alumnoId, mensaje, urlDestino]
          );
          console.log(`-> Notificación web creada para alumno ${alumnoId}`);
        } catch (notifError) {
          // Si falla crear la notificación web, no detenemos el proceso principal
          console.error(
            `Error al crear notificación web para alumno ${alumnoId}:`,
            notifError
          );
        }
      }
      // --- FIN DE LA MODIFICACIÓN ---
    } // Fin del bucle for

    // 3. Confirmar la transacción
    await connection.commit();

    // --- INICIO CÓDIGO PARA ENVIAR NOTIFICACIÓN PUSH ---
    try {
      for (const cal of calificaciones) {
        const calNum = parseFloat(cal.calificacion);
        if (!isNaN(calNum) && calNum >= 0 && calNum <= 100) {
          const alumnoId = cal.alumno_id;
          const [tokens] = await db.query(
            "SELECT token FROM push_tokens WHERE user_id = ?",
            [alumnoId]
          );
          if (tokens.length > 0) {
            const messages = tokens.map((t) => ({
              to: t.token,
              sound: "default",
              title: "¡Nueva Calificación! 📊",
              body: `Se ha registrado tu calificación para la asignatura.`,
            }));
            await fetch("https://exp.host/--/api/v2/push/send", {
              method: "POST",
              headers: {
                Accept: "application/json",
                "Accept-encoding": "gzip, deflate",
                "Content-Type": "application/json",
              },
              body: JSON.stringify(messages),
            });
            console.log(`Notificación enviada al alumno ${alumnoId}`);
          }
        }
      }
    } catch (notificationError) {
      console.error("Error al enviar notificación push:", notificationError);
    }
    // --- FIN CÓDIGO PARA ENVIAR NOTIFICACIÓN PUSH ---

    res.send({ message: "Calificaciones guardadas con éxito." });
  } catch (error) {
    await connection.rollback();
    console.error("Error al guardar calificaciones:", error);
    res.status(500).send({ message: "Error en el servidor." });
  } finally {
    connection.release();
  }
});
// --- FIN DE LA NUEVA RUTA ---

// --- RUTAS DE ADMIN ---
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
        "SELECT id, nombre, apellido_paterno, apellido_materno, email, rol, telefono, curp, matricula, genero, matricula, DATE_FORMAT(fecha_nacimiento, '%Y-%m-%d') as fecha_nacimiento FROM usuarios"
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
  const connection = await db.getConnection(); // Obtenemos una conexión del pool
  try {
    await connection.beginTransaction(); // 1. Iniciamos la transacción

    const hashedPassword = await bcrypt.hash(password, 10);

    // 2. Insertamos al usuario SIN matrícula
    const [insertResult] = await connection.query(
      "INSERT INTO usuarios (email, password, nombre, rol, apellido_paterno, apellido_materno, genero, telefono, curp, fecha_nacimiento) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        email,
        hashedPassword,
        nombre,
        rol,
        apellido_paterno || null,
        apellido_materno || null,
        genero || null,
        telefono || null,
        curp || null,
        fecha_nacimiento || null,
      ]
    );

    const newUserId = insertResult.insertId; // 3. Obtenemos el ID del nuevo usuario

    // 4. Generamos la matrícula (Ej: 2025 + 0001 -> "20250001")
    const year = new Date().getFullYear();
    const matricula = `${year}${String(newUserId).padStart(4, "0")}`;

    // 5. Actualizamos al usuario con su nueva matrícula
    await connection.query("UPDATE usuarios SET matricula = ? WHERE id = ?", [
      matricula,
      newUserId,
    ]);

    await connection.commit(); // 6. Confirmamos la transacción
    res
      .status(201)
      .send({ message: "Usuario registrado con matrícula: " + matricula });
  } catch (error) {
    await connection.rollback(); // 7. Revertimos en caso de error
    if (error.code === "ER_DUP_ENTRY")
      return res
        .status(409)
        .send({ message: "El correo electrónico o la CURP ya están en uso." });
    console.error(error);
    res.status(500).send({ message: "Error al registrar el usuario" });
  } finally {
    connection.release(); // 8. Siempre liberamos la conexión
  }
});
adminRouter.get("/usuarios/:id", async (req, res) =>
  res.json(
    (
      await db.query(
        "SELECT id, nombre, apellido_paterno, email, rol, apellido_materno, genero, telefono, curp, DATE_FORMAT(fecha_nacimiento, '%Y-%m-%d') as fecha_nacimiento FROM usuarios WHERE id = ?", // <-- Campos agregados, fecha_nacimiento formateada
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
      "UPDATE usuarios SET nombre=?, apellido_paterno=?, apellido_materno=?, email=?, password=?, rol=?, genero=?, telefono=?, curp=?, fecha_nacimiento=? WHERE id=?";
    params = [
      nombre,
      apellido_paterno || null,
      apellido_materno || null,
      email,
      hashedPassword,
      rol,
      genero || null,
      telefono || null,
      curp || null,
      fecha_nacimiento || null,
      req.params.id,
    ];
  } else {
    sql =
      "UPDATE usuarios SET nombre=?, apellido_paterno=?, apellido_materno=?, email=?, rol=?, genero=?, telefono=?, curp=?, fecha_nacimiento=? WHERE id=?";
    params = [
      nombre,
      apellido_paterno || null,
      apellido_materno || null,
      email,
      rol,
      genero || null,
      telefono || null,
      curp || null,
      fecha_nacimiento || null,
      req.params.id,
    ];
  }
  try {
    await db.query(sql, params);
    res.send({ message: "Usuario actualizado" });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY")
      return res
        .status(409)
        .send({ message: "El email o la CURP ya están en uso." });
    console.error("Error al actualizar usuario:", error);
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
adminRouter.get("/grupos/:id/alumnos-disponibles", async (req, res) => {
  const { id: grupoId } = req.params;
  try {
    /*
    Buscamos usuarios que puedan ser inscritos:
    1. Su rol es 'aspirante' O 'alumno'.
    2. Y NO están ya inscritos en ESTE grupo.
    */
    const [alumnos] = await db.query(
      `SELECT id, nombre, apellido_paterno, rol
       FROM usuarios
       WHERE (rol = 'aspirante' OR rol = 'alumno')
       AND id NOT IN (
           SELECT alumno_id FROM grupo_alumnos WHERE grupo_id = ?
       )`,
      [grupoId]
    );
    res.json(alumnos);
  } catch (error) {
    console.error("Error al buscar alumnos disponibles:", error);
    res.status(500).send({ message: "Error en el servidor" });
  }
});
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
      tipo_asignatura_id || 1, // Default si no se envía
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
      tipo_asignatura_id || 1,
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
        SELECT g.*, g.estatus, g.modalidad, c.nombre_ciclo, s.nombre_sede, p.nombre_plan, gr.nombre_grado
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
  const [[grupoRes]] = await db.query(
    `SELECT g.*, p.nombre_plan, gr.nombre_grado
     FROM grupos g
     LEFT JOIN planes_estudio p ON g.plan_estudio_id = p.id
     LEFT JOIN grados gr ON g.grado_id = gr.id
     WHERE g.id = ?`,
    [grupoId]
  );
  if (!grupoRes)
    return res.status(404).send({ message: "Grupo no encontrado" });

  const asignaturasSql = `
        SELECT
          a.id, a.nombre_asignatura, a.clave_asignatura,
          u.id as docente_id, u.nombre as docente_nombre, u.apellido_paterno as docente_apellido,
          (SELECT COUNT(c.calificacion) FROM calificaciones c WHERE c.asignatura_id = a.id AND c.grupo_id = ?) as total_calificaciones, -- CORREGIDO: Filtrar por grupo_id
          (SELECT COUNT(*) FROM grupo_alumnos ga WHERE ga.grupo_id = ?) as total_alumnos_grupo
      FROM asignaturas a
      LEFT JOIN grupo_asignaturas_docentes gad ON a.id = gad.asignatura_id AND gad.grupo_id = ?
      LEFT JOIN usuarios u ON gad.docente_id = u.id
      WHERE a.grado_id = ? AND a.plan_estudio_id = ?`;

  const [asignaturas] = await db.query(asignaturasSql, [
    grupoId, // Para total_calificaciones
    grupoId, // Para total_alumnos_grupo
    grupoId, // Para gad.grupo_id
    grupoRes.grado_id,
    grupoRes.plan_estudio_id,
  ]);

  const alumnosSql = `
        SELECT u.id, u.nombre, u.apellido_paterno, u.apellido_materno, u.email
        FROM usuarios u
        JOIN grupo_alumnos ga ON u.id = ga.alumno_id
        WHERE ga.grupo_id = ?`;
  const [alumnos] = await db.query(alumnosSql, [grupoId]);

  res.json({ ...grupoRes, asignaturas, alumnos });
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
    modalidad,
  } = req.body;
  await db.query(
    "INSERT INTO grupos (nombre_grupo, cupo, ciclo_id, sede_id, plan_estudio_id, grado_id, estatus, modalidad) VALUES (?,?,?,?,?,?,?,?)",
    [
      nombre_grupo,
      cupo,
      ciclo_id,
      sede_id,
      plan_estudio_id,
      grado_id,
      estatus || "activo",
      modalidad || "presencial",
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
    modalidad,
  } = req.body;
  await db.query(
    "UPDATE grupos SET nombre_grupo=?, cupo=?, ciclo_id=?, sede_id=?, plan_estudio_id=?, grado_id=?, estatus=?, modalidad=? WHERE id=?",
    [
      nombre_grupo,
      cupo,
      ciclo_id,
      sede_id,
      plan_estudio_id,
      grado_id,
      estatus,
      modalidad, // <-- Valor añadido
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
    [grupo_id, asignatura_id, docente_id || null, docente_id || null] // Permite desasignar con null
  );
  res.send({ message: "Docente asignado/actualizado" });
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
    await connection.query(
      "UPDATE usuarios SET rol = 'alumno' WHERE id = ? AND rol = 'aspirante'",
      [
        // Solo cambia si es aspirante
        alumno_id,
      ]
    );
    await connection.commit();
    res.status(201).send({ message: "Alumno inscrito" });
  } catch (error) {
    await connection.rollback();
    if (error.code === "ER_DUP_ENTRY")
      return res
        .status(409)
        .send({ message: "El alumno ya está inscrito en este grupo." });
    console.error("Error al inscribir alumno:", error);
    res.status(500).send({ message: "Error al inscribir alumno" });
  } finally {
    connection.release();
  }
});
// --- REEMPLAZA LA RUTA "DAR-BAJA" CON ESTO ---
adminRouter.delete("/grupos/:id/dar-baja/:alumnoId", async (req, res) => {
  const { id: grupo_id, alumnoId } = req.params;

  try {
    // 1. Simplemente damos de baja al alumno de ESTE grupo
    await db.query(
      "DELETE FROM grupo_alumnos WHERE grupo_id = ? AND alumno_id = ?",
      [grupo_id, alumnoId]
    );

    // 2. YA NO CAMBIAMOS EL ROL. El alumno sigue siendo alumno.

    res.send({ message: "Alumno dado de baja del grupo." });
  } catch (error) {
    console.error("Error al dar de baja:", error);
    res.status(500).send({ message: "Error al dar de baja" });
  }
  // Nota: Ya no necesitamos la transacción porque es una sola consulta
});
// --- NUEVA RUTA DE MIGRACIÓN DE GRUPO ---
adminRouter.post("/migrar-grupo", async (req, res) => {
  const { sourceGroupId, destinationGroupId } = req.body;

  if (!sourceGroupId || !destinationGroupId) {
    return res
      .status(400)
      .send({ message: "Se requieren los IDs de origen y destino." });
  }
  if (sourceGroupId === destinationGroupId) {
    return res.status(400).send({
      message: "El grupo de origen y destino no pueden ser el mismo.",
    });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Obtener todos los alumnos del grupo de origen
    const [alumnos] = await connection.query(
      "SELECT alumno_id FROM grupo_alumnos WHERE grupo_id = ?",
      [sourceGroupId]
    );

    if (alumnos.length === 0) {
      // No es un error, pero se lo informamos al admin
      await connection.rollback(); // Revertimos la transacción vacía
      return res
        .status(404)
        .send({ message: "El grupo de origen no tiene alumnos para migrar." });
    }

    // 2. Preparar los datos para la inserción masiva
    // Usamos "INSERT IGNORE" para evitar errores si un alumno
    // (por alguna razón) ya estaba inscrito en el grupo de destino.
    const values = alumnos.map((a) => [destinationGroupId, a.alumno_id]);

    // 3. Insertar todos los alumnos en el grupo de destino
    const [result] = await connection.query(
      "INSERT IGNORE INTO grupo_alumnos (grupo_id, alumno_id) VALUES ?",
      [values]
    );

    // 4. (Opcional pero recomendado) Cambiar el estado del grupo origen a 'inactivo' si no lo está ya
    await connection.query(
      "UPDATE grupos SET estatus = 'inactivo' WHERE id = ?",
      [sourceGroupId]
    );

    await connection.commit();
    res.send({
      message: `Migración completada. ${result.affectedRows} de ${alumnos.length} alumnos fueron movidos. El grupo origen (${sourceGroupId}) fue marcado como inactivo.`,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error en la migración de grupo:", error);
    res
      .status(500)
      .send({ message: "Error en el servidor durante la migración." });
  } finally {
    connection.release();
  }
});
// --- NUEVA RUTA PARA TRANSFERIR ALUMNO ---
adminRouter.post("/grupos/transferir-alumno", async (req, res) => {
  const { alumnoId, sourceGroupId, destinationGroupId } = req.body;

  if (!alumnoId || !sourceGroupId || !destinationGroupId) {
    return res
      .status(400)
      .send({ message: "Faltan datos para la transferencia." });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Eliminar al alumno del grupo de origen
    await connection.query(
      "DELETE FROM grupo_alumnos WHERE grupo_id = ? AND alumno_id = ?",
      [sourceGroupId, alumnoId]
    );

    // 2. Inscribir al alumno en el grupo de destino
    // Usamos INSERT IGNORE por si acaso el alumno ya estaba (evita que falle)
    await connection.query(
      "INSERT IGNORE INTO grupo_alumnos (grupo_id, alumno_id) VALUES (?, ?)",
      [destinationGroupId, alumnoId]
    );

    // Opcional: Asegurarse que el rol sigue siendo 'alumno' (si no lo era ya)
    await connection.query(
      "UPDATE usuarios SET rol = 'alumno' WHERE id = ? AND rol = 'aspirante'",
      [alumnoId]
    );

    await connection.commit();
    res.send({ message: "Alumno transferido con éxito." });
  } catch (error) {
    await connection.rollback();
    console.error("Error al transferir alumno:", error);
    res.status(500).send({ message: "Error en el servidor." });
  } finally {
    connection.release();
  }
});
// --- NUEVA RUTA DE ADMIN PARA VER ALUMNOS DE UN CURSO ---
adminRouter.get(
  "/grupo/:grupoId/asignatura/:asignaturaId/alumnos",
  isAdmin, // <-- Asegúrate de que esté protegido por isAdmin
  async (req, res) => {
    const { grupoId, asignaturaId } = req.params;
    const cursoSql = `SELECT g.nombre_grupo, a.nombre_asignatura FROM grupos g, asignaturas a WHERE g.id = ? AND a.id = ?`;
    const [[cursoInfo]] = await db.query(cursoSql, [grupoId, asignaturaId]);

    const alumnosSql = `
        SELECT u.id, CONCAT(u.nombre, ' ', u.apellido_paterno, ' ', IFNULL(u.apellido_materno, '')) as nombre_completo, c.calificacion
        FROM grupo_alumnos ga JOIN usuarios u ON ga.alumno_id = u.id
        LEFT JOIN calificaciones c ON c.alumno_id = u.id AND c.asignatura_id = ? AND c.grupo_id = ?
        WHERE ga.grupo_id = ? AND u.rol = 'alumno'`; // <-- CORREGIDO: Añadido AND c.grupo_id = ?

    const [alumnos] = await db.query(alumnosSql, [
      asignaturaId,
      grupoId,
      grupoId,
    ]); // <-- CORREGIDO: Añadido grupoId al final
    res.json({ cursoInfo, alumnos });
  }
);
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
          (SELECT COUNT(*) FROM grupo_alumnos WHERE grupo_id = g.id) as total_alumnos,
          (SELECT COUNT(cal.calificacion) FROM calificaciones cal WHERE cal.asignatura_id = a.id AND cal.grupo_id = g.id) as total_calificaciones -- CORREGIDO: Filtrar por grupo_id
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
    SELECT u.id, CONCAT(u.nombre, ' ', u.apellido_paterno, ' ', IFNULL(u.apellido_materno, '')) as nombre_completo, c.calificacion
    FROM grupo_alumnos ga JOIN usuarios u ON ga.alumno_id = u.id
    LEFT JOIN calificaciones c ON c.alumno_id = u.id AND c.asignatura_id = ? AND c.grupo_id = ?
    WHERE ga.grupo_id = ? AND u.rol = 'alumno'`; // <-- CORREGIDO: Añadido AND c.grupo_id = ?
    const [alumnos] = await db.query(alumnosSql, [
      asignaturaId,
      grupoId,
      grupoId,
    ]); // <-- CORREGIDO: Añadido grupoId al final
    res.json({ cursoInfo, alumnos });
  }
);
// --- RUTA BORRADA --- Ya no es necesaria, la movimos a /admin
// docenteRouter.post("/calificar", ... );
// --- INICIA NUEVO CÓDIGO (AGREGAR) ---

// Función helper para asegurar que existe una config (se usará en GET)
async function getOrCreateAulaConfig(grupoId, asignaturaId) {
  // Primero, intenta insertarlo. Si ya existe, 'IGNORE' no hará nada.
  await db.query(
    "INSERT IGNORE INTO aula_virtual_config (grupo_id, asignatura_id) VALUES (?, ?)",
    [grupoId, asignaturaId]
  );
  // Luego, selecciónalo. Ahora estamos seguros de que existe.
  const [[config]] = await db.query(
    "SELECT * FROM aula_virtual_config WHERE grupo_id = ? AND asignatura_id = ?",
    [grupoId, asignaturaId]
  );
  return config;
}

// GET (Docente): Obtener la config del aula virtual
docenteRouter.get(
  "/aula-virtual/:grupoId/:asignaturaId/config",
  async (req, res) => {
    try {
      const { grupoId, asignaturaId } = req.params;
      // Validar que el docente realmente da esta clase
      const [[curso]] = await db.query(
        "SELECT * FROM grupo_asignaturas_docentes WHERE grupo_id = ? AND asignatura_id = ? AND docente_id = ?",
        [grupoId, asignaturaId, req.user.id]
      );
      if (!curso) {
        return res
          .status(403)
          .send({ message: "No tienes permiso sobre este curso." });
      }
      const config = await getOrCreateAulaConfig(grupoId, asignaturaId);
      res.json(config);
    } catch (error) {
      console.error("Error al obtener config de aula (docente):", error);
      res.status(500).send({ message: "Error en el servidor." });
    }
  }
);

// PUT (Docente): Actualizar la config del aula virtual
docenteRouter.put(
  "/aula-virtual/:grupoId/:asignaturaId/config",
  async (req, res) => {
    try {
      const { grupoId, asignaturaId } = req.params;
      const { enlace_videollamada, descripcion_curso } = req.body;

      // Validar que el docente da esta clase
      const [[curso]] = await db.query(
        "SELECT * FROM grupo_asignaturas_docentes WHERE grupo_id = ? AND asignatura_id = ? AND docente_id = ?",
        [grupoId, asignaturaId, req.user.id]
      );
      if (!curso) {
        return res
          .status(403)
          .send({ message: "No tienes permiso sobre este curso." });
      }

      // Usamos 'ON DUPLICATE KEY UPDATE' para insertar si no existe, o actualizar si ya existe.
      await db.query(
        `INSERT INTO aula_virtual_config (grupo_id, asignatura_id, enlace_videollamada, descripcion_curso) 
         VALUES (?, ?, ?, ?) 
         ON DUPLICATE KEY UPDATE 
         enlace_videollamada = VALUES(enlace_videollamada), 
         descripcion_curso = VALUES(descripcion_curso)`,
        [
          grupoId,
          asignaturaId,
          enlace_videollamada || null,
          descripcion_curso || null,
        ]
      );

      res.send({ message: "Aula virtual actualizada con éxito." });
    } catch (error) {
      console.error("Error al actualizar config de aula:", error);
      res.status(500).send({ message: "Error en el servidor." });
    }
  }
);
// --- INICIA NUEVO CÓDIGO (AGREGAR) ---

// GET (Docente): Obtener listado de tareas
docenteRouter.get(
  "/aula-virtual/:grupoId/:asignaturaId/tareas",
  async (req, res) => {
    try {
      const { grupoId, asignaturaId } = req.params;
      // Validamos que el docente da esta clase
      const [[curso]] = await db.query(
        "SELECT * FROM grupo_asignaturas_docentes WHERE grupo_id = ? AND asignatura_id = ? AND docente_id = ?",
        [grupoId, asignaturaId, req.user.id]
      );
      if (!curso) {
        return res.status(403).send({ message: "No tienes permiso." });
      }

      // Obtenemos las tareas y contamos cuántas entregas tiene cada una
      const [tareas] = await db.query(
        `SELECT t.*, COUNT(te.id) as total_entregas
         FROM tareas t
         LEFT JOIN tareas_entregas te ON t.id = te.tarea_id
         WHERE t.grupo_id = ? AND t.asignatura_id = ? AND t.docente_id = ?
         GROUP BY t.id
         ORDER BY t.fecha_creacion DESC`,
        [grupoId, asignaturaId, req.user.id]
      );
      res.json(tareas);
    } catch (error) {
      console.error("Error al obtener tareas (docente):", error);
      res.status(500).send({ message: "Error en el servidor." });
    }
  }
);

// POST (Docente): Crear una nueva tarea
docenteRouter.post(
  "/aula-virtual/:grupoId/:asignaturaId/tareas",
  async (req, res) => {
    try {
      const { grupoId, asignaturaId } = req.params;
      const { titulo, descripcion, fecha_limite } = req.body;
      const docente_id = req.user.id;

      // Validamos que el docente da esta clase
      const [[curso]] = await db.query(
        "SELECT * FROM grupo_asignaturas_docentes WHERE grupo_id = ? AND asignatura_id = ? AND docente_id = ?",
        [grupoId, asignaturaId, docente_id]
      );
      if (!curso) {
        return res.status(403).send({ message: "No tienes permiso." });
      }

      const [result] = await db.query(
        "INSERT INTO tareas (grupo_id, asignatura_id, docente_id, titulo, descripcion, fecha_limite) VALUES (?, ?, ?, ?, ?, ?)",
        [
          grupoId,
          asignaturaId,
          docente_id,
          titulo,
          descripcion || null,
          fecha_limite || null,
        ]
      );

      const newTaskId = result.insertId;

      // --- INICIA CÓDIGO DE NOTIFICACIÓN (NUEVO) ---
      try {
        // 1. Obtener el nombre de la asignatura
        const [[asignatura]] = await db.query(
          "SELECT nombre_asignatura FROM asignaturas WHERE id = ?",
          [asignaturaId]
        );
        const nombreAsignatura = asignatura
          ? asignatura.nombre_asignatura
          : "del curso";

        // 2. Definir mensaje y URL
        const mensaje = `Nueva tarea: '${titulo}' en ${nombreAsignatura}`;
        const urlDestino = `/alumno/grupo/${grupoId}/asignatura/${asignaturaId}/aula`;

        // 3. Obtener todos los alumnos del grupo
        const [alumnos] = await db.query(
          "SELECT alumno_id FROM grupo_alumnos WHERE grupo_id = ?",
          [grupoId]
        );
        const alumnoIds = alumnos.map((a) => a.alumno_id);

        if (alumnoIds.length > 0) {
          // 4. Crear notificaciones de campanita (web)
          const notifData = alumnos.map((a) => [
            a.alumno_id,
            mensaje,
            urlDestino,
          ]);
          await db.query(
            "INSERT INTO notificaciones (user_id, mensaje, url_destino) VALUES ?",
            [notifData]
          );

          // 5. Enviar Notificaciones Push (móvil)
          const [tokens] = await db.query(
            "SELECT token FROM push_tokens WHERE user_id IN (?)",
            [alumnoIds]
          );
          if (tokens.length > 0) {
            const messages = tokens.map((t) => ({
              to: t.token,
              sound: "default",
              title: "¡Nueva Tarea! 📝",
              body: mensaje,
            }));
            await fetch("https://exp.host/--/api/v2/push/send", {
              method: "POST",
              headers: {
                Accept: "application/json",
                "Accept-encoding": "gzip, deflate",
                "Content-Type": "application/json",
              },
              body: JSON.stringify(messages),
            });
          }
        }
        console.log(`Notificaciones de tarea creadas para el grupo ${grupoId}`);
      } catch (notifError) {
        // Si falla la notificación, no detenemos la creación de la tarea
        console.error("Error al crear notificaciones de tarea:", notifError);
      }
      // --- TERMINA CÓDIGO DE NOTIFICACIÓN ---

      res.status(201).send({ message: "Tarea creada", newTaskId: newTaskId });
    } catch (error) {
      console.error("Error al crear tarea:", error);
      res.status(500).send({ message: "Error en el servidor." });
    }
  }
);
// --- INICIA NUEVO CÓDIGO (AGREGAR) ---

// POST (Docente): Calificar una entrega
docenteRouter.post(
  "/aula-virtual/entrega/:entregaId/calificar",
  async (req, res) => {
    try {
      const { entregaId } = req.params;
      const { calificacion, comentario_docente } = req.body;
      const docente_id = req.user.id; // El docente que está calificando

      if (!calificacion) {
        return res
          .status(400)
          .send({ message: "La calificación es requerida." });
      }
      const calNum = parseFloat(calificacion);
      if (isNaN(calNum) || calNum < 0 || calNum > 100) {
        return res.status(400).send({
          message: "La calificación debe ser un número entre 0 y 100.",
        });
      }

      // 1. Verificamos que el docente tenga permiso sobre esta entrega
      const [[entrega]] = await db.query(
        `SELECT te.*, t.docente_id, t.titulo, t.grupo_id, t.asignatura_id
         FROM tareas_entregas te
         JOIN tareas t ON te.tarea_id = t.id
         WHERE te.id = ?`,
        [entregaId]
      );

      if (!entrega) {
        return res.status(404).send({ message: "Entrega no encontrada." });
      }
      if (entrega.docente_id !== docente_id) {
        return res
          .status(403)
          .send({ message: "No tienes permiso para calificar esta tarea." });
      }

      // 2. Actualizamos la calificación en la BD
      await db.query(
        "UPDATE tareas_entregas SET calificacion = ?, comentario_docente = ? WHERE id = ?",
        [calNum, comentario_docente || null, entregaId]
      );

      // --- 3. Notificar al Alumno ---
      try {
        const mensaje = `¡Calificación recibida! (${calNum}/100) en la tarea '${entrega.titulo}'`;
        const urlDestino = `/alumno/grupo/${entrega.grupo_id}/asignatura/${entrega.asignatura_id}/aula`;

        // Notificación de campanita (web)
        await db.query(
          "INSERT INTO notificaciones (user_id, mensaje, url_destino) VALUES (?, ?, ?)",
          [entrega.alumno_id, mensaje, urlDestino]
        );

        // Notificación Push (móvil)
        const [tokens] = await db.query(
          "SELECT token FROM push_tokens WHERE user_id = ?",
          [entrega.alumno_id]
        );
        if (tokens.length > 0) {
          const messages = tokens.map((t) => ({
            to: t.token,
            sound: "default",
            title: "¡Tarea Calificada! 💯",
            body: mensaje,
          }));
          await fetch("https://exp.host/--/api/v2/push/send", {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Accept-encoding": "gzip, deflate",
              "Content-Type": "application/json",
            },
            body: JSON.stringify(messages),
          });
        }
        console.log(
          `Notificación de calificación enviada al alumno ${entrega.alumno_id}`
        );
      } catch (notifError) {
        console.error(
          "Error al notificar al alumno sobre calificación:",
          notifError
        );
      }
      // --- Fin de Notificación ---

      res.send({ message: "Calificación guardada con éxito." });
    } catch (error) {
      console.error("Error al calificar entrega:", error);
      res.status(500).send({ message: "Error en el servidor." });
    }
  }
);
// --- INICIA NUEVO CÓDIGO (AGREGAR) ---

// GET (Docente): Ver detalles de una tarea y todas las entregas de alumnos
docenteRouter.get("/aula-virtual/tarea/:tareaId/entregas", async (req, res) => {
  try {
    const { tareaId } = req.params;
    const docente_id = req.user.id;

    // 1. Obtener detalles de la tarea y verificar permiso
    const [[tarea]] = await db.query(
      "SELECT * FROM tareas WHERE id = ? AND docente_id = ?",
      [tareaId, docente_id]
    );
    if (!tarea) {
      return res
        .status(404)
        .send({ message: "Tarea no encontrada o no te pertenece." });
    }

    // 2. Obtener TODOS los alumnos del grupo, y hacer LEFT JOIN con sus entregas
    // Esto nos permite ver quién ha entregado y quién no.
    const [alumnosConEntregas] = await db.query(
      `SELECT 
            u.id as alumno_id, 
            u.nombre, 
            u.apellido_paterno, 
            u.apellido_materno,
            te.id as entrega_id, 
            te.ruta_archivo, 
            te.nombre_original, 
            te.fecha_entrega, 
            te.comentario_alumno,
            te.calificacion,
            te.comentario_docente
         FROM grupo_alumnos ga
         JOIN usuarios u ON ga.alumno_id = u.id
         LEFT JOIN tareas_entregas te ON te.tarea_id = ? AND te.alumno_id = u.id
         WHERE ga.grupo_id = ?`,
      [tareaId, tarea.grupo_id]
    );

    res.json({ tarea, entregas: alumnosConEntregas });
  } catch (error) {
    console.error("Error al obtener entregas de la tarea:", error);
    res.status(500).send({ message: "Error en el servidor." });
  }
});
// --- INICIA NUEVO CÓDIGO (AGREGAR) ---

// POST (Docente): Subir un RECURSO de tipo ARCHIVO
docenteRouter.post(
  "/aula-virtual/:grupoId/:asignaturaId/recurso-archivo",
  uploadRecurso.single("archivo_recurso"), // <-- Usamos el nuevo multer
  async (req, res) => {
    try {
      const { grupoId, asignaturaId } = req.params;
      const { titulo } = req.body;
      const docente_id = req.user.id;

      if (!req.file || !titulo) {
        return res
          .status(400)
          .send({ message: "Se requiere un título y un archivo." });
      }

      // Construimos la ruta relativa para guardarla en la BD
      const rutaRelativa = `curso_G${grupoId}_A${asignaturaId}/${req.file.filename}`;

      await db.query(
        "INSERT INTO recursos_clase (grupo_id, asignatura_id, docente_id, titulo, tipo_recurso, ruta_o_url, nombre_original) VALUES (?, ?, ?, ?, 'archivo', ?, ?)",
        [
          grupoId,
          asignaturaId,
          docente_id,
          titulo,
          rutaRelativa,
          req.file.originalname,
        ]
      );
      res.status(201).send({ message: "Archivo subido con éxito." });
    } catch (error) {
      console.error("Error al subir recurso archivo:", error);
      res.status(500).send({ message: "Error en el servidor." });
    }
  }
);

// POST (Docente): Agregar un RECURSO de tipo ENLACE
docenteRouter.post(
  "/aula-virtual/:grupoId/:asignaturaId/recurso-enlace",
  async (req, res) => {
    try {
      const { grupoId, asignaturaId } = req.params;
      const { titulo, url } = req.body;
      const docente_id = req.user.id;

      if (!titulo || !url) {
        return res
          .status(400)
          .send({ message: "Se requiere un título y una URL." });
      }

      await db.query(
        "INSERT INTO recursos_clase (grupo_id, asignatura_id, docente_id, titulo, tipo_recurso, ruta_o_url) VALUES (?, ?, ?, ?, 'enlace', ?)",
        [grupoId, asignaturaId, docente_id, titulo, url]
      );
      res.status(201).send({ message: "Enlace guardado con éxito." });
    } catch (error) {
      console.error("Error al guardar recurso enlace:", error);
      res.status(500).send({ message: "Error en el servidor." });
    }
  }
);

// DELETE (Docente): Borrar un recurso
docenteRouter.delete("/aula-virtual/recurso/:recursoId", async (req, res) => {
  try {
    const { recursoId } = req.params;
    const docente_id = req.user.id;

    // 1. Validar que el recurso existe y pertenece al docente
    const [[recurso]] = await db.query(
      "SELECT * FROM recursos_clase WHERE id = ? AND docente_id = ?",
      [recursoId, docente_id]
    );

    if (!recurso) {
      return res
        .status(404)
        .send({ message: "Recurso no encontrado o no te pertenece." });
    }

    // 2. Si es un archivo, borrarlo del disco
    if (recurso.tipo_recurso === "archivo") {
      const filePath = path.join(recursosDir, recurso.ruta_o_url);
      fs.unlink(filePath, (err) => {
        if (err) console.error("Error al borrar archivo físico:", err);
      });
    }

    // 3. Borrar de la base de datos
    await db.query("DELETE FROM recursos_clase WHERE id = ?", [recursoId]);
    res.send({ message: "Recurso eliminado con éxito." });
  } catch (error) {
    console.error("Error al eliminar recurso:", error);
    res.status(500).send({ message: "Error en el servidor." });
  }
});

// GET (Ruta compartida): Obtener todos los recursos de la clase
const getRecursosClase = async (req, res) => {
  try {
    const { grupoId, asignaturaId } = req.params;
    // (Validación de permiso ya se hizo en la ruta principal)
    const [recursos] = await db.query(
      "SELECT * FROM recursos_clase WHERE grupo_id = ? AND asignatura_id = ? ORDER BY fecha_subida DESC",
      [grupoId, asignaturaId]
    );
    res.json(recursos);
  } catch (error) {
    console.error("Error al obtener recursos:", error);
    res.status(500).send({ message: "Error en el servidor." });
  }
};

// Asignamos la ruta a ambos routers
docenteRouter.get(
  "/aula-virtual/:grupoId/:asignaturaId/recursos",
  getRecursosClase
);
// --- TERMINA NUEVO CÓDIGO ---
apiRouter.use("/docente", docenteRouter); // Registra el router de docente en /api/docente

// --- RUTAS DE ALUMNO ---
const alumnoRouter = express.Router();
alumnoRouter.use(isAlumno); // Se asegura que solo alumnos entren
// --- REEMPLAZA LA RUTA /mi-grupo CON ESTO ---
alumnoRouter.get("/mi-grupo", async (req, res) => {
  const alumno_id = req.user.id;

  // 1. Obtenemos TODOS los grupos donde está el alumno
  const [misGrupos] = await db.query(
    "SELECT * FROM grupo_alumnos WHERE alumno_id = ?",
    [alumno_id]
  );

  if (!misGrupos || misGrupos.length === 0) {
    // Esto es correcto, el alumno puede no estar en grupos
    return res.json([]); // Devolvemos un array vacío
  }

  let responseData = [];

  // 2. Iteramos sobre cada grupo encontrado
  for (const miGrupo of misGrupos) {
    const grupoId = miGrupo.grupo_id;

    // Obtenemos los detalles de ESE grupo
    const [[grupo]] = await db.query(
      `SELECT g.*, c.nombre_ciclo FROM grupos g JOIN ciclos c ON g.ciclo_id = c.id WHERE g.id = ?`,
      [grupoId]
    );

    // Si el grupo no existe (caso raro), lo saltamos
    if (!grupo) continue;

    // Obtenemos las asignaturas de ESE grupo y la calificación del alumno
    const asignaturasSql = `
    SELECT a.id as asignatura_id, a.nombre_asignatura, a.clave_asignatura, u.nombre as docente_nombre, u.apellido_paterno as docente_apellido, cal.calificacion
    FROM asignaturas a
    LEFT JOIN grupo_asignaturas_docentes gad ON a.id = gad.asignatura_id AND gad.grupo_id = ?
    LEFT JOIN usuarios u ON gad.docente_id = u.id
    LEFT JOIN calificaciones cal ON cal.asignatura_id = a.id AND cal.alumno_id = ? AND cal.grupo_id = ?
    WHERE a.grado_id = ? AND a.plan_estudio_id = ?`; // <-- CORREGIDO: Añadido AND cal.grupo_id = ?

    const [asignaturas] = await db.query(asignaturasSql, [
      grupoId, // Para el JOIN gad
      alumno_id, // Para el JOIN cal
      grupoId, // <-- CORREGIDO: Para el JOIN cal (filtrar por grupo)
      grupo.grado_id, // Para el WHERE
      grupo.plan_estudio_id, // Para el WHERE
    ]);

    // 3. Agregamos este grupo y sus asignaturas al array de respuesta
    responseData.push({ grupo, asignaturas });
  }

  // 4. Devolvemos el array con todos los grupos
  res.json(responseData);
});
// --- INICIA NUEVO CÓDIGO (AGREGAR) ---

// GET (Alumno): Obtener la config del aula virtual
alumnoRouter.get(
  "/aula-virtual/:grupoId/:asignaturaId/config",
  async (req, res) => {
    try {
      const { grupoId, asignaturaId } = req.params;
      // Validar que el alumno está inscrito en este grupo
      const [[inscripcion]] = await db.query(
        "SELECT * FROM grupo_alumnos WHERE grupo_id = ? AND alumno_id = ?",
        [grupoId, req.user.id]
      );
      if (!inscripcion) {
        return res
          .status(403)
          .send({ message: "No estás inscrito en este curso." });
      }

      // Usamos la misma función helper para obtener o crear la config
      const config = await getOrCreateAulaConfig(grupoId, asignaturaId);
      res.json(config);
    } catch (error) {
      console.error("Error al obtener config de aula (alumno):", error);
      res.status(500).send({ message: "Error en el servidor." });
    }
  }
);
// --- INICIA NUEVO CÓDIGO (AGREGAR) ---

// GET (Alumno): Obtener listado de tareas
alumnoRouter.get(
  "/aula-virtual/:grupoId/:asignaturaId/tareas",
  async (req, res) => {
    try {
      const { grupoId, asignaturaId } = req.params;
      const alumno_id = req.user.id;
      // Validamos que el alumno está inscrito
      const [[inscripcion]] = await db.query(
        "SELECT * FROM grupo_alumnos WHERE grupo_id = ? AND alumno_id = ?",
        [grupoId, alumno_id]
      );
      if (!inscripcion) {
        return res.status(403).send({ message: "No estás inscrito." });
      }

      // Obtenemos las tareas y (MUY IMPORTANTE) verificamos si el alumno
      // ya hizo una entrega para esa tarea.
      const [tareas] = await db.query(
        `SELECT t.*, te.id as entrega_id, te.fecha_entrega, te.calificacion
         FROM tareas t
         LEFT JOIN tareas_entregas te ON t.id = te.tarea_id AND te.alumno_id = ?
         WHERE t.grupo_id = ? AND t.asignatura_id = ?
         ORDER BY t.fecha_creacion DESC`,
        [alumno_id, grupoId, asignaturaId]
      );
      res.json(tareas);
    } catch (error) {
      console.error("Error al obtener tareas (alumno):", error);
      res.status(500).send({ message: "Error en el servidor." });
    }
  }
);
// --- INICIA NUEVO CÓDIGO (AGREGAR) ---

// POST (Alumno): Entregar una tarea
alumnoRouter.post(
  "/aula-virtual/tarea/:tareaId/entregar",
  uploadTarea.single("archivo_tarea"), // <-- Usamos el multer de tareas
  async (req, res) => {
    try {
      const { tareaId } = req.params;
      const { comentario_alumno } = req.body;
      const alumno_id = req.user.id;

      if (!req.file) {
        return res.status(400).send({ message: "No se subió ningún archivo." });
      }

      const { filename, originalname } = req.file;

      const sql = `
        INSERT INTO tareas_entregas 
          (tarea_id, alumno_id, ruta_archivo, nombre_original, comentario_alumno, fecha_entrega)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON DUPLICATE KEY UPDATE
          ruta_archivo = VALUES(ruta_archivo),
          nombre_original = VALUES(nombre_original),
          comentario_alumno = VALUES(comentario_alumno),
          fecha_entrega = CURRENT_TIMESTAMP,
          calificacion = NULL, 
          comentario_docente = NULL
      `;

      await db.query(sql, [
        tareaId,
        alumno_id,
        filename,
        originalname,
        comentario_alumno || null,
      ]);

      // --- INICIA CÓDIGO DE NOTIFICACIÓN (NUEVO) ---
      try {
        // 1. Obtener datos de la tarea (título, docente, ids)
        const [[tarea]] = await db.query(
          "SELECT titulo, docente_id, grupo_id, asignatura_id FROM tareas WHERE id = ?",
          [tareaId]
        );

        if (tarea && tarea.docente_id) {
          // 2. Definir mensaje y URL
          const alumnoNombre = `${req.user.nombre} ${req.user.apellido_paterno}`;
          const mensaje = `Entrega de: '${alumnoNombre}' en la tarea '${tarea.titulo}'`;
          // (Eventualmente esta URL llevará a la página de calificación)
          const urlDestino = `/docente/grupo/${tarea.grupo_id}/asignatura/${tarea.asignatura_id}/aula`;

          // 3. Crear notificación de campanita (web)
          await db.query(
            "INSERT INTO notificaciones (user_id, mensaje, url_destino) VALUES (?, ?, ?)",
            [tarea.docente_id, mensaje, urlDestino]
          );

          // 4. Enviar Notificación Push (móvil)
          const [tokens] = await db.query(
            "SELECT token FROM push_tokens WHERE user_id = ?",
            [tarea.docente_id]
          );
          if (tokens.length > 0) {
            const messages = tokens.map((t) => ({
              to: t.token,
              sound: "default",
              title: "¡Tarea Entregada! 📥",
              body: mensaje,
            }));
            await fetch("https://exp.host/--/api/v2/push/send", {
              method: "POST",
              headers: {
                Accept: "application/json",
                "Accept-encoding": "gzip, deflate",
                "Content-Type": "application/json",
              },
              body: JSON.stringify(messages),
            });
          }
          console.log(
            `Notificación de entrega enviada al docente ${tarea.docente_id}`
          );
        }
      } catch (notifError) {
        // Si falla la notificación, no detenemos la entrega
        console.error(
          "Error al notificar al docente sobre la entrega:",
          notifError
        );
      }
      // --- TERMINA CÓDIGO DE NOTIFICACIÓN ---

      res.send({ message: "Tarea entregada con éxito." });
    } catch (error) {
      console.error("Error al entregar tarea:", error);
      res.status(500).send({ message: "Error en el servidor." });
    }
  }
);
// --- INICIA NUEVO CÓDIGO (AGREGAR) ---
// GET (Alumno): Obtener todos los recursos
alumnoRouter.get(
  "/aula-virtual/:grupoId/:asignaturaId/recursos",
  getRecursosClase // <-- Reutilizamos la misma función
);
// --- TERMINA NUEVO CÓDIGO ---
apiRouter.use("/alumno", alumnoRouter); // Registra el router de alumno en /api/alumno

// --- RUTAS DE ASPIRANTE ---
const aspiranteRouter = express.Router();
aspiranteRouter.use(isAspirante); // Se asegura que solo aspirantes entren

// 1. RUTA PARA OBTENER MI PROPIO EXPEDIENTE
aspiranteRouter.get("/mi-expediente", async (req, res) => {
  const aspirante_id = req.user.id; // Obtenemos el ID del token
  const [docs] = await db.query(
    "SELECT * FROM expediente_aspirantes WHERE aspirante_id = ?",
    [aspirante_id]
  );
  res.json(docs);
});

// 2. RUTA PARA SUBIR MI PROPIO DOCUMENTO
aspiranteRouter.post(
  "/upload",
  upload.single("documento"),
  async (req, res) => {
    const aspirante_id = req.user.id; // Obtenemos el ID del token
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

// 3. RUTA PARA BORRAR MI PROPIO DOCUMENTO
aspiranteRouter.delete("/expedientes/:id", async (req, res) => {
  const { id: docId } = req.params;
  const aspirante_id = req.user.id;

  const [[doc]] = await db.query(
    "SELECT * FROM expediente_aspirantes WHERE id = ?",
    [docId]
  );
  if (doc) {
    // --- VERIFICACIÓN DE PROPIEDAD ---
    if (doc.aspirante_id !== aspirante_id) {
      return res
        .status(403)
        .send({ message: "No tienes permiso para borrar este documento." });
    }
    // --- FIN DE VERIFICACIÓN ---

    fs.unlink(path.join(uploadsDir, doc.ruta_archivo), (err) => {
      if (err) console.error("Error al borrar archivo físico:", err);
    });
    await db.query("DELETE FROM expediente_aspirantes WHERE id = ?", [docId]);
    res.send({ message: "Documento eliminado" });
  } else {
    res.status(404).send({ message: "Documento no encontrado" });
  }
});

apiRouter.use("/aspirante", aspiranteRouter); // Registra el router de aspirante

// --- INICIO DEL SERVIDOR ---
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
