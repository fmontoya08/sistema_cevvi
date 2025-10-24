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

  const { asignatura_id, calificaciones } = req.body;
  // 'calificaciones' debe ser un arreglo: [{ alumno_id: 1, calificacion: 90 }, ...]

  if (!asignatura_id || !calificaciones || !Array.isArray(calificaciones)) {
    return res.status(400).send({ message: "Datos incompletos." });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 2. Iterar y guardar cada calificación
    for (const cal of calificaciones) {
      // Validamos que la calificación sea un número
      const calNum = parseFloat(cal.calificacion);
      if (isNaN(calNum) || calNum < 0 || calNum > 100) {
        // Si no es válida, la guardamos como NULL (sin calificar)
        await connection.query(
          "INSERT INTO calificaciones (alumno_id, asignatura_id, calificacion) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE calificacion = ?",
          [cal.alumno_id, asignatura_id, null, null]
        );
      } else {
        // Si es válida, la guardamos
        await connection.query(
          "INSERT INTO calificaciones (alumno_id, asignatura_id, calificacion) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE calificacion = ?",
          [cal.alumno_id, asignatura_id, calNum, calNum]
        );
      }
    }

    // 3. Confirmar la transacción
    await connection.commit();
    // --- INICIO CÓDIGO PARA ENVIAR NOTIFICACIÓN ---
    try {
      // Iteramos de nuevo sobre las calificaciones guardadas
      for (const cal of calificaciones) {
        // Solo si la calificación es válida (no null)
        const calNum = parseFloat(cal.calificacion);
        if (!isNaN(calNum) && calNum >= 0 && calNum <= 100) {
          const alumnoId = cal.alumno_id;

          // Buscamos los tokens de ESE alumno en la tabla push_tokens
          const [tokens] = await db.query(
            "SELECT token FROM push_tokens WHERE user_id = ?",
            [alumnoId]
          );

          // Si el alumno tiene tokens registrados...
          if (tokens.length > 0) {
            // Preparamos los mensajes para enviar a Expo
            const messages = tokens.map((t) => ({
              to: t.token, // El token del dispositivo
              sound: "default", // Sonido por defecto
              title: "¡Nueva Calificación! 📊", // Título de la notificación
              body: `Se ha registrado tu calificación para la asignatura.`, // Cuerpo del mensaje
              // data: { ... }, // Puedes añadir datos extra aquí si quieres
            }));

            // Enviamos la petición a la API de Expo para enviar las notificaciones
            await fetch("https://exp.host/--/api/v2/push/send", {
              method: "POST",
              headers: {
                Accept: "application/json",
                "Accept-encoding": "gzip, deflate",
                "Content-Type": "application/json",
              },
              body: JSON.stringify(messages), // Enviamos los mensajes como JSON
            });
            console.log(`Notificación enviada al alumno ${alumnoId}`);
          }
        }
      }
    } catch (notificationError) {
      // Si falla el envío de la notificación, solo mostramos el error en consola
      // No detenemos el proceso principal de guardar calificaciones
      console.error("Error al enviar notificación push:", notificationError);
    }
    // --- FIN CÓDIGO PARA ENVIAR NOTIFICACIÓN ---

    // Esta línea ya la tenías, es la respuesta al frontend
    res.send({ message: "Calificaciones guardadas con éxito." });
  } catch (error) {
    // <-- Tu bloque catch existente
    await connection.rollback();
    console.error("Error al guardar calificaciones:", error);
    res.status(500).send({ message: "Error en el servidor." });
  } finally {
    connection.release();
  }
});

// --- FIN DE LA NUEVA RUTA ---

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
      "UPDATE usuarios SET nombre=?, apellido_paterno=?, apellido_materno=?, email=?, password=?, rol=?, genero=?, telefono=?, curp=?, fecha_nacimiento=? WHERE id=?";
    params = [
      nombre,
      apellido_paterno,
      apellido_materno,
      email,
      hashedPassword,
      rol,
      genero,
      telefono,
      curp,
      fecha_nacimiento,
      req.params.id,
    ];
  } else {
    sql =
      "UPDATE usuarios SET nombre=?, apellido_paterno=?, apellido_materno=?, email=?, rol=?, genero=?, telefono=?, curp=?, fecha_nacimiento=? WHERE id=?";
    params = [
      nombre,
      apellido_paterno,
      apellido_materno,
      email,
      rol,
      genero,
      telefono,
      curp,
      fecha_nacimiento,
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
  const [grupoRes] = await db.query("SELECT * FROM grupos WHERE id = ?", [
    grupoId,
  ]);
  if (grupoRes.length === 0)
    return res.status(404).send({ message: "Grupo no encontrado" });
  const asignaturasSql = `
        SELECT 
          a.id, a.nombre_asignatura, a.clave_asignatura, 
          u.id as docente_id, u.nombre as docente_nombre, u.apellido_paterno as docente_apellido,
          /* --- LÍNEAS NUEVAS --- */
          (SELECT COUNT(*) FROM calificaciones c WHERE c.asignatura_id = a.id AND c.alumno_id IN (SELECT ga.alumno_id FROM grupo_alumnos ga WHERE ga.grupo_id = ?)) as total_calificaciones,
          (SELECT COUNT(*) FROM grupo_alumnos ga WHERE ga.grupo_id = ?) as total_alumnos_grupo
          /* --- FIN LÍNEAS NUEVAS --- */
      FROM asignaturas a
      LEFT JOIN grupo_asignaturas_docentes gad ON a.id = gad.asignatura_id AND gad.grupo_id = ?
        LEFT JOIN usuarios u ON gad.docente_id = u.id
        WHERE a.grado_id = ? AND a.plan_estudio_id = ?`;
  const [asignaturas] = await db.query(asignaturasSql, [
    grupoId, // Para total_calificaciones
    grupoId, // Para total_alumnos_grupo
    grupoId, // Para gad.grupo_id (ya estaba)
    grupoRes[0].grado_id,
    grupoRes[0].plan_estudio_id,
  ]);
  const alumnosSql = `
        SELECT u.id, u.nombre, u.apellido_paterno, u.apellido_materno, u.email 
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

    await connection.commit();
    res.send({
      message: `Migración completada. ${result.affectedRows} de ${alumnos.length} alumnos fueron movidos.`,
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

    // Opcional: Asegurarse que el rol sigue siendo 'alumno'
    await connection.query("UPDATE usuarios SET rol = 'alumno' WHERE id = ?", [
      alumnoId,
    ]);

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

    // (Este SQL ya fue corregido para nombre completo)
    const alumnosSql = `
        SELECT u.id, CONCAT(u.nombre, ' ', u.apellido_paterno, ' ', IFNULL(u.apellido_materno, '')) as nombre_completo, c.calificacion
        FROM grupo_alumnos ga JOIN usuarios u ON ga.alumno_id = u.id
        LEFT JOIN calificaciones c ON c.alumno_id = u.id AND c.asignatura_id = ?
        WHERE ga.grupo_id = ? AND u.rol = 'alumno'`;

    const [alumnos] = await db.query(alumnosSql, [asignaturaId, grupoId]);
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
          /* --- LÍNEA NUEVA --- */
          (SELECT COUNT(*) FROM calificaciones cal WHERE cal.asignatura_id = a.id AND cal.alumno_id IN (SELECT ga.alumno_id FROM grupo_alumnos ga WHERE ga.grupo_id = g.id)) as total_calificaciones
          /* --- FIN LÍNEA NUEVA --- */
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
        LEFT JOIN calificaciones c ON c.alumno_id = u.id AND c.asignatura_id = ?
        WHERE ga.grupo_id = ? AND u.rol = 'alumno'`;
    const [alumnos] = await db.query(alumnosSql, [asignaturaId, grupoId]);
    res.json({ cursoInfo, alumnos });
  }
);
// --- NUEVA RUTA DE ADMIN PARA VER ALUMNOS DE UN CURSO ---
adminRouter.get(
  "/grupo/:grupoId/asignatura/:asignaturaId/alumnos",
  isAdmin, // <-- Asegúrate de que esté protegido por isAdmin
  async (req, res) => {
    const { grupoId, asignaturaId } = req.params;
    const cursoSql = `SELECT g.nombre_grupo, a.nombre_asignatura FROM grupos g, asignaturas a WHERE g.id = ? AND a.id = ?`;
    const [[cursoInfo]] = await db.query(cursoSql, [grupoId, asignaturaId]);

    // (Este SQL ya fue corregido para nombre completo)
    const alumnosSql = `
        SELECT u.id, CONCAT(u.nombre, ' ', u.apellido_paterno, ' ', IFNULL(u.apellido_materno, '')) as nombre_completo, c.calificacion
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

    // Obtenemos las asignaturas de ESE grupo
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

    // 3. Agregamos este grupo y sus asignaturas al array de respuesta
    responseData.push({ grupo, asignaturas });
  }

  // 4. Devolvemos el array con todos los grupos
  res.json(responseData);
});
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
