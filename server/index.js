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

const perfilesDir = path.join(__dirname, "uploads/perfiles");
if (!fs.existsSync(perfilesDir)) {
  fs.mkdirSync(perfilesDir, { recursive: true });
}
app.use("/uploads/perfiles", express.static(perfilesDir));
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
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname),
    );
  },
});

const nodemailer = require("nodemailer"); // <--- AGREGAR AL INICIO

// --- CONFIGURACIÓN DEL CORREO (NODEMAILER) ---
// Úsalo con un correo real de Gmail o Outlook para pruebas
// --- CONFIGURACIÓN DEL CORREO (SMTP PROPIO) ---
const transporter = nodemailer.createTransport({
  host: "mail.puntocerodigital.com.mx", // <--- PONE AQUÍ TU SERVIDOR SMTP
  port: 465, // <--- PUERTO (465 es seguro SSL, 587 es TLS)
  secure: true, // <--- Pon TRUE si usas puerto 465. Pon FALSE si usas 587.
  auth: {
    user: "contacto@puntocerodigital.com.mx", // <--- Tu correo completo
    pass: "8T&=0Y)4w6C-+Bn&", // <--- La contraseña de ese correo
  },
  tls: {
    rejectUnauthorized: false, // <--- Agrega esto por si tu certificado SSL es compartido
  },
});

// --- FUNCIÓN DE CORREO (CON EMAIL, MATRÍCULA Y LOGO) ---
async function enviarCredenciales(email, nombre, matricula, rol) {
  const esDocente = rol === "docente";
  const titulo = esDocente
    ? "Bienvenido al Claustro Docente"
    : "¡Bienvenido a la Comunidad!";

  // Textos personalizados
  const textoIntro = esDocente
    ? "Es un honor darle la bienvenida. Aquí tiene sus credenciales para acceder al portal académico y gestionar sus grupos."
    : "Tu inscripción ha sido procesada exitosamente. Guarda estos datos, son tu llave de acceso a la plataforma.";

  // ⚠️ IMPORTANTE: Pon aquí el LINK PÚBLICO de tu logo (ej: https://tudominio.com/logo.png)
  // Mientras no tengas dominio, usa esta imagen genérica o sube tu logo a un sitio como imgur.com
  const logoUrl = "https://cdn-icons-png.flaticon.com/512/2991/2991195.png";

  const mailOptions = {
    from: '"Plataforma Escolar" <contacto@puntocerodigital.com.mx>',
    to: email,
    subject: `Tus Credenciales de Acceso - ${nombre}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
          
          /* HEADER ROJO VINO */
          .header { background-color: #a72a34; padding: 40px 20px; text-align: center; }
          .logo-circle { background: white; width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 15px auto; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
          .logo-img { width: 50px; height: 50px; object-fit: contain; }
          .header h1 { color: #ffffff; margin: 0; font-size: 22px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; }
          
          /* CONTENIDO */
          .content { padding: 40px 30px; color: #333333; }
          .welcome-text { font-size: 16px; line-height: 1.6; color: #4b5563; margin-bottom: 30px; text-align: center; }
          
          /* TARJETA DE CREDENCIALES */
          .card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 0; overflow: hidden; margin-bottom: 30px; }
          .card-header { background-color: #eff6ff; padding: 15px; text-align: center; border-bottom: 1px solid #e2e8f0; color: #1e3a8a; font-weight: bold; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; }
          
          .card-body { padding: 20px; }
          
          .field { margin-bottom: 20px; text-align: center; }
          .field:last-child { margin-bottom: 0; }
          .label { font-size: 11px; color: #64748b; text-transform: uppercase; margin-bottom: 6px; font-weight: 700; letter-spacing: 0.5px; }
          .value { font-size: 18px; color: #0f172a; font-family: Consolas, Monaco, 'Courier New', monospace; font-weight: 600; background: #ffffff; padding: 10px 15px; border-radius: 6px; border: 1px solid #cbd5e1; display: inline-block; min-width: 200px; }
          
          /* BOTÓN */
          .btn-container { text-align: center; margin-top: 30px; }
          .btn { background-color: #a72a34; color: #ffffff !important; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(167, 42, 52, 0.2); }
          .btn:hover { background-color: #802028; }

          .footer { background-color: #1f2937; color: #9ca3af; padding: 30px; text-align: center; font-size: 12px; line-height: 1.5; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo-circle">
               <img src="${logoUrl}" alt="Logo" class="logo-img">
            </div>
            <h1>${titulo}</h1>
          </div>
          
          <div class="content">
            <p class="welcome-text">
              Hola, <strong>${nombre}</strong>.<br>
              ${textoIntro}
            </p>
            
            <div class="card">
              <div class="card-header" style="background-color: #fdf2f2; color: #a72a34;">
                Credenciales de Acceso
              </div>
              <div class="card-body">
                
                <div class="field">
                  <div class="label">Correo Registrado</div>
                  <div class="value">${email}</div>
                </div>

                <div class="field">
                  <div class="label">Matrícula (Usuario)</div>
                  <div class="value" style="letter-spacing: 2px;">${matricula}</div>
                </div>
                
                <div class="field">
                  <div class="label">Contraseña Inicial</div>
                  <div class="value" style="letter-spacing: 2px;">${matricula}</div>
                </div>

              </div>
            </div>

            <p style="text-align: center; font-size: 13px; color: #6b7280; margin-bottom: 30px;">
              💡 <strong>Tip:</strong> Puedes cambiar tu contraseña en la sección "Mi Perfil" después de ingresar.
            </p>

            <div class="btn-container">
              <a href="http://localhost:3000" class="btn">Ingresar al Portal</a>
            </div>
          </div>

          <div class="footer">
            <p><strong>Universidad Digital</strong><br>Formando el futuro.</p>
            <p style="margin-top: 20px; font-size: 11px; color: #4b5563;">
              Este mensaje contiene información confidencial de acceso.<br>
              Si recibiste este correo por error, por favor elimínalo.
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Correo enviado a ${email} (${rol})`);
  } catch (error) {
    console.error("Error enviando correo:", error);
  }
}

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

// --- INICIA NUEVO CÓDIGO (AGREGAR) ---
// Configuración de Multer para FOTOS DE PERFIL
const perfilesStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, perfilesDir); // Guarda todas las fotos en la misma carpeta
  },
  filename: function (req, file, cb) {
    const userId = req.user.id; // Usamos el ID del usuario para el nombre
    const uniqueSuffix = Date.now();
    const ext = path.extname(file.originalname);
    // Ej: perfil_15_1678886400000.jpg
    cb(null, `perfil_${userId}_${uniqueSuffix}${ext}`);
  },
});

// Filtro para aceptar solo imágenes
const imageFileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Solo se permiten archivos de imagen."), false);
  }
};

const uploadPerfil = multer({
  storage: perfilesStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // Límite de 5MB
});
// --- TERMINA NUEVO CÓDIGO ---
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
    const [results] = await db.query(
      "SELECT id, email, password, nombre, apellido_paterno, rol, foto_perfil, activo FROM usuarios WHERE email = ?",
      [email],
    );

    if (results.length === 0) {
      return res
        .status(401)
        .send({ message: "Email o contraseña incorrectos" });
    }

    const user = results[0];

    // 2. AGREGAMOS ESTA VALIDACIÓN DE SEGURIDAD
    // Si activo es 0 (false), no dejamos pasar
    if (user.activo === 0) {
      return res.status(403).send({
        message: "Tu cuenta ha sido desactivada. Contacta al administrador.",
      });
    }
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
      foto_perfil: user.foto_perfil, // <-- Agrega foto_perfil
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "8h" });
    res.json({ token, user: payload });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Error en el servidor durante el login." });
  }
});

apiRouter.use(verifyToken);

// --- RUTA CORREGIDA: Obtener No Leídas ---
// NOTA: Asegúrate de usar la variable de router correcta (ej: apiRouter o app)
// Si tu código original decía 'apiRouter.get', usa 'apiRouter'. Si decía 'app.get', usa 'app'.

// --- RUTAS DE PERFIL Y SEGURIDAD (PARA TODOS LOS USUARIOS) ---

// 2. PUT /api/auth/perfil (Actualizar datos de contacto Y personales)
apiRouter.put("/auth/perfil", async (req, res) => {
  if (!req.user) return res.status(401).send({ message: "No autenticado" });

  const userId = req.user.id;
  // Recibimos los nuevos campos del frontend
  const { email, telefono, fecha_nacimiento, genero } = req.body;

  try {
    await db.query(
      "UPDATE usuarios SET email = ?, telefono = ?, fecha_nacimiento = ?, genero = ? WHERE id = ?",
      [
        email,
        telefono,
        fecha_nacimiento || null, // IMPORTANTE: Si viene vacío, guarda NULL para no causar error de fecha
        genero || null, // Igual para género
        userId,
      ],
    );
    res.send({ message: "Perfil actualizado correctamente" });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res
        .status(400)
        .send({ message: "El correo ya está en uso por otro usuario." });
    }
    console.error("Error al actualizar perfil:", error);
    res.status(500).send({ message: "Error en el servidor al actualizar." });
  }
});

// 2. CAMBIAR CONTRASEÑA
apiRouter.put("/auth/cambiar-password", async (req, res) => {
  if (!req.user) return res.status(401).send({ message: "No autenticado" });

  const userId = req.user.id;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).send({ message: "Faltan datos." });
  }

  try {
    // A) Obtener la contraseña actual de la BD
    const [[user]] = await db.query(
      "SELECT password FROM usuarios WHERE id = ?",
      [userId],
    );

    // B) Verificar que la contraseña actual sea correcta
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) {
      return res
        .status(401)
        .send({ message: "La contraseña actual es incorrecta." });
    }

    // C) Encriptar la nueva contraseña
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // D) Guardar
    await db.query("UPDATE usuarios SET password = ? WHERE id = ?", [
      hashedNewPassword,
      userId,
    ]);

    res.send({ message: "Contraseña actualizada con éxito." });
  } catch (error) {
    console.error("Error al cambiar contraseña:", error);
    res.status(500).send({ message: "Error en el servidor" });
  }
});

// --- RUTA CORREGIDA: Obtener No Leídas (CON VALIDACIÓN) ---
apiRouter.get("/notificaciones/no-leidas", verifyToken, async (req, res) => {
  // 1. VALIDACIÓN DE SEGURIDAD: Evita el crash si no hay usuario
  if (!req.user) {
    return res.status(401).send({ message: "No autenticado" });
  }

  const userId = req.user.id;
  try {
    const [notificaciones] = await db.query(
      `SELECT 
         id, 
         mensaje, 
         url_destino, 
         fecha as fecha_creacion
       FROM notificaciones 
       WHERE usuario_id = ? AND leido = 0 
       ORDER BY fecha DESC 
       LIMIT 10`,
      [userId],
    );

    const [[{ count }]] = await db.query(
      "SELECT COUNT(*) as count FROM notificaciones WHERE usuario_id = ? AND leido = 0",
      [userId],
    );

    res.json({ notificaciones, count });
  } catch (error) {
    console.error("Error al obtener notificaciones no leídas:", error);
    res.status(500).send({ message: "Error al cargar notificaciones" });
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
      [notificationId, userId],
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

// --- RUTA CORREGIDA: Marcar todas como leídas ---
apiRouter.put(
  "/notificaciones/marcar-todas-leidas",
  verifyToken,
  async (req, res) => {
    const userId = req.user.id;
    try {
      // Usamos 'leido = 1' y 'usuario_id'
      await db.query(
        "UPDATE notificaciones SET leido = 1 WHERE usuario_id = ? AND leido = 0",
        [userId],
      );
      res.json({ message: "Todas marcadas como leídas" });
    } catch (error) {
      console.error("Error al marcar notificaciones:", error);
      res.status(500).send({ message: "Error del servidor" });
    }
  },
);

// --- FIN RUTAS NOTIFICACIONES ---

// PUT /api/notificaciones/:id/marcar-leida
apiRouter.put("/notificaciones/:id/marcar-leida", async (req, res) => {
  // ... (el resto de esta ruta)
});

// --- RUTA CORREGIDA: Marcar todas como leídas ---
apiRouter.put(
  "/notificaciones/marcar-todas-leidas",
  verifyToken,
  async (req, res) => {
    // 1. VALIDACIÓN DE SEGURIDAD
    if (!req.user) {
      return res.status(401).send({ message: "No autenticado" });
    }

    const userId = req.user.id;
    try {
      await db.query(
        "UPDATE notificaciones SET leido = 1 WHERE usuario_id = ? AND leido = 0",
        [userId],
      );
      res.json({ message: "Todas marcadas como leídas" });
    } catch (error) {
      console.error("Error al marcar notificaciones:", error);
      res.status(500).send({ message: "Error del servidor" });
    }
  },
);

// --- FIN RUTAS NOTIFICACIONES ---
// --- FIN DEL BLOQUE PEGADO ---

// ... (El resto de tus rutas, como /register-push-token, continúan aquí)

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
      [notificationId, userId],
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
      [userId],
    );
    res.send({ message: "Todas las notificaciones marcadas como leídas" });
  } catch (error) {
    console.error(
      "Error al marcar todas las notificaciones como leídas:",
      error,
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
      [userId, token],
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
// --- FIN RUTAS PUSH TOKEN ---

// --- INICIA NUEVO CÓDIGO (RUTAS MI PERFIL) ---

// --- RUTAS DE PERFIL (SOLO INFORMACIÓN, SIN RECUPERACIÓN) ---

// 1. GET /api/mi-perfil (Trae TODOS los datos con nombres reales)
apiRouter.get("/mi-perfil", async (req, res) => {
  if (!req.user) return res.status(401).send({ message: "No autenticado." });
  try {
    const sql = `
      SELECT u.id, u.email, u.nombre, u.apellido_paterno, u.apellido_materno, u.rol, 
             u.foto_perfil, u.genero, u.telefono, u.curp, u.matricula, 
             DATE_FORMAT(u.fecha_nacimiento, '%Y-%m-%d') as fecha_nacimiento,
             c.nombre_carrera, s.nombre_sede, g.nombre_grupo
      FROM usuarios u
      LEFT JOIN carreras c ON u.carrera_id = c.id
      LEFT JOIN sedes s ON u.sede_id = s.id
      LEFT JOIN grupos g ON u.grupo_id = g.id
      WHERE u.id = ?
    `;
    const [[perfil]] = await db.query(sql, [req.user.id]);

    if (!perfil)
      return res.status(404).send({ message: "Perfil no encontrado." });
    res.json(perfil);
  } catch (error) {
    console.error("Error al obtener perfil:", error);
    res.status(500).send({ message: "Error en el servidor." });
  }
});

// 2. PUT /api/auth/perfil (Actualizar datos de contacto)
apiRouter.put("/auth/perfil", async (req, res) => {
  if (!req.user) return res.status(401).send({ message: "No autenticado" });
  const userId = req.user.id;
  const { email, telefono, fecha_nacimiento, genero } = req.body;

  try {
    await db.query(
      "UPDATE usuarios SET email = ?, telefono = ?, fecha_nacimiento = ?, genero = ? WHERE id = ?",
      [email, telefono, fecha_nacimiento, genero, userId],
    );
    res.send({ message: "Información actualizada correctamente" });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY")
      return res.status(400).send({ message: "El correo ya está en uso." });
    res.status(500).send({ message: "Error al actualizar." });
  }
});

// 3. PUT /api/auth/cambiar-password (Solo si conoce la actual)
apiRouter.put("/auth/cambiar-password", async (req, res) => {
  if (!req.user) return res.status(401).send({ message: "No autenticado" });
  const userId = req.user.id;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword)
    return res.status(400).send({ message: "Faltan datos." });

  try {
    const [[user]] = await db.query(
      "SELECT password FROM usuarios WHERE id = ?",
      [userId],
    );
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match)
      return res
        .status(401)
        .send({ message: "La contraseña actual es incorrecta." });

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.query("UPDATE usuarios SET password = ? WHERE id = ?", [
      hashed,
      userId,
    ]);
    res.send({ message: "Contraseña actualizada con éxito." });
  } catch (error) {
    res.status(500).send({ message: "Error al cambiar contraseña." });
  }
});

// POST /api/mi-perfil/foto - Subir/Actualizar foto de perfil
apiRouter.post(
  "/mi-perfil/foto",
  uploadPerfil.single("foto"), // Usamos el nuevo multer 'uploadPerfil'
  async (req, res) => {
    if (!req.user) {
      return res.status(401).send({ message: "No autenticado." });
    }
    if (!req.file) {
      return res.status(400).send({ message: "No se subió ninguna imagen." });
    }

    try {
      const nuevaFotoPath = req.file.filename; // Nombre del archivo guardado

      // (Opcional) Borrar foto anterior del disco si existe
      const [[usuarioActual]] = await db.query(
        "SELECT foto_perfil FROM usuarios WHERE id = ?",
        [req.user.id],
      );
      if (usuarioActual && usuarioActual.foto_perfil) {
        const oldPath = path.join(perfilesDir, usuarioActual.foto_perfil);
        fs.unlink(oldPath, (err) => {
          if (err && err.code !== "ENOENT")
            console.error("Error al borrar foto anterior:", err);
        });
      }

      // Actualizar la ruta de la foto en la base de datos
      await db.query("UPDATE usuarios SET foto_perfil = ? WHERE id = ?", [
        nuevaFotoPath,
        req.user.id,
      ]);

      // Devolver la nueva ruta de la foto para actualizar el frontend
      res.json({ foto_perfil: nuevaFotoPath });
    } catch (error) {
      console.error("Error al actualizar foto de perfil:", error);
      // Borrar el archivo recién subido si hubo error en la BD
      fs.unlink(req.file.path, (err) => {
        if (err)
          console.error("Error al borrar archivo subido tras error:", err);
      });
      res.status(500).send({ message: "Error en el servidor." });
    }
  },
  // Middleware para manejar errores específicos de Multer (ej. tipo de archivo, tamaño)
  (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
      // Error de Multer (ej. archivo muy grande)
      return res
        .status(400)
        .send({ message: `Error de Multer: ${error.message}` });
    } else if (error) {
      // Otro error (ej. filtro de tipo de archivo)
      return res.status(400).send({ message: error.message });
    }
    next();
  },
);

// --- TERMINA NUEVO CÓDIGO (RUTAS MI PERFIL) ---

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
          [cal.alumno_id, asignatura_id, grupo_id, null, null],
        );
      } else {
        // --- CORRECCIÓN AQUÍ ---
        await connection.query(
          "INSERT INTO calificaciones (alumno_id, asignatura_id, grupo_id, calificacion) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE calificacion = ?", // <-- CORREGIDO: Añadido grupo_id en columnas
          [cal.alumno_id, asignatura_id, grupo_id, calNum, calNum],
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
            [alumnoId, mensaje, urlDestino],
          );
          console.log(`-> Notificación web creada para alumno ${alumnoId}`);
        } catch (notifError) {
          // Si falla crear la notificación web, no detenemos el proceso principal
          console.error(
            `Error al crear notificación web para alumno ${alumnoId}:`,
            notifError,
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
            [alumnoId],
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

// --- INICIO: RUTAS DE GESTIÓN DE SOLICITUDES (ADMIN) ---

// --- RUTA DASHBOARD CORREGIDA ---
adminRouter.get("/dashboard-stats", async (req, res) => {
  try {
    const [counts] = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM usuarios WHERE rol = 'alumno' AND activo = 1) as total_alumnos,
        (SELECT COUNT(*) FROM usuarios WHERE rol = 'docente' AND activo = 1) as total_docentes,
        (SELECT COUNT(*) FROM usuarios WHERE rol = 'aspirante' AND activo = 1) as total_aspirantes,
        (SELECT COUNT(*) FROM grupos WHERE estatus = 'activo') as total_grupos_activos
    `);

    // CORRECCIÓN AQUÍ: Usamos 'fecha_creacion' en vez de 'created_at'
    const [ultimosAspirantes] = await db.query(`
        SELECT nombre, apellido_paterno, email, fecha_creacion 
        FROM usuarios WHERE rol = 'aspirante' AND activo = 1
        ORDER BY id DESC LIMIT 5
    `);

    res.json({
      stats: counts[0],
      recientes: ultimosAspirantes,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Error al obtener estadísticas" });
  }
});

// --- NUEVA RUTA: CREAR ASPIRANTE (ESPECIALIZADA) ---
adminRouter.post("/usuarios/crear-aspirante", async (req, res) => {
  const {
    nombre,
    apellido_paterno,
    apellido_materno,
    email,
    telefono,
    genero,
    curp,
    fecha_nacimiento,
    carrera_id,
    sede_id,
  } = req.body;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Insertamos usuario con contraseña TEMPORAL (luego la cambiamos por la matrícula)
    const passTemp = await bcrypt.hash("temp123", 10);

    // NOTA: Asumimos que agregaste columnas 'carrera_interes_id' y 'sede_interes_id' a usuarios
    // OJO: Si no las tienes, ejecuta: ALTER TABLE usuarios ADD COLUMN carrera_interes_id INT NULL, ADD COLUMN sede_interes_id INT NULL;

    const [result] = await connection.query(
      `INSERT INTO usuarios 
      (nombre, apellido_paterno, apellido_materno, email, password, telefono, genero, curp, fecha_nacimiento, rol, carrera_interes_id, sede_interes_id, activo) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'aspirante', ?, ?, 1)`,
      [
        nombre,
        apellido_paterno,
        apellido_materno,
        email,
        passTemp,
        telefono,
        genero,
        curp,
        fecha_nacimiento,
        carrera_id,
        sede_id,
      ],
    );

    const newId = result.insertId;

    // 2. Generar Matrícula (Año + ID con ceros) -> Ej: 20260045
    const year = new Date().getFullYear();
    const matricula = `${year}${String(newId).padStart(4, "0")}`;

    // 3. Hashear la Matrícula para que sea la contraseña
    const hashedMatricula = await bcrypt.hash(matricula, 10);

    // 4. Actualizar usuario con su Matrícula real y Contraseña (que es la misma matrícula)
    await connection.query(
      "UPDATE usuarios SET matricula = ?, password = ? WHERE id = ?",
      [matricula, hashedMatricula, newId],
    );

    await connection.commit();

    // 5. Enviar Correo (Fuera de la transacción para no bloquear)
    enviarCredenciales(email, nombre, matricula);

    res
      .status(201)
      .send({ message: "Aspirante registrado y notificado.", matricula });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).send({
      message:
        error.code === "ER_DUP_ENTRY"
          ? "Correo o CURP ya registrados."
          : "Error al crear aspirante",
    });
  } finally {
    connection.release();
  }
});

// --- NUEVA RUTA: CREAR DOCENTE (ESPECIALIZADA) ---
adminRouter.post("/usuarios/crear-docente", async (req, res) => {
  const {
    nombre,
    apellido_paterno,
    apellido_materno,
    email,
    telefono,
    genero,
    curp,
    fecha_nacimiento,
  } = req.body;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Insertar (Sin carrera/sede, rol docente)
    const passTemp = await bcrypt.hash("temp123", 10);
    const [result] = await connection.query(
      `INSERT INTO usuarios 
      (nombre, apellido_paterno, apellido_materno, email, password, telefono, genero, curp, fecha_nacimiento, rol, activo) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'docente', 1)`,
      [
        nombre,
        apellido_paterno,
        apellido_materno,
        email,
        passTemp,
        telefono,
        genero,
        curp,
        fecha_nacimiento,
      ],
    );

    const newId = result.insertId;

    // 2. Generar Matrícula de Docente (Podrías ponerle un prefijo 'D' si quieres, ej: D2026001)
    // Por ahora usaremos la misma lógica estándar
    const year = new Date().getFullYear();
    const matricula = `D${year}${String(newId).padStart(4, "0")}`; // Le puse una 'D' para diferenciar

    // 3. Hashear Matrícula
    const hashedMatricula = await bcrypt.hash(matricula, 10);

    // 4. Actualizar
    await connection.query(
      "UPDATE usuarios SET matricula = ?, password = ? WHERE id = ?",
      [matricula, hashedMatricula, newId],
    );

    await connection.commit();

    // 5. Enviar Correo
    enviarCredenciales(email, nombre, matricula);

    res
      .status(201)
      .send({ message: "Docente registrado y notificado.", matricula });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).send({ message: "Error al crear docente" });
  } finally {
    connection.release();
  }
});

// GET /api/admin/solicitudes - Ver todas las solicitudes (o filtrar por estatus)
adminRouter.get("/solicitudes", async (req, res) => {
  // Ya estamos protegidos por isAdmin, así que req.user existe
  const { estatus } = req.query; // Para filtrar ej: /solicitudes?estatus=solicitado
  let sql = `
    SELECT s.*, CONCAT(u.nombre, ' ', u.apellido_paterno) as nombre_alumno
    FROM solicitudes_alumnos s
    JOIN usuarios u ON s.alumno_id = u.id`;
  const params = [];

  // Lista de estatus válidos para filtrar
  const estatusValidos = [
    "solicitado",
    "en_revision",
    "listo_para_entrega",
    "rechazado",
    "cancelado",
  ];
  if (estatus && estatusValidos.includes(estatus)) {
    sql += " WHERE s.estatus = ?";
    params.push(estatus);
  }
  sql += " ORDER BY s.fecha_solicitud DESC";

  try {
    const [solicitudes] = await db.query(sql, params);
    res.json(solicitudes);
  } catch (error) {
    console.error("Error al obtener solicitudes:", error);
    res.status(500).send({ message: "Error en el servidor" });
  }
});

// PUT /api/admin/solicitudes/:id/estatus - Actualizar estatus y comentarios
adminRouter.put("/solicitudes/:id/estatus", async (req, res) => {
  const { id: solicitudId } = req.params;
  const adminId = req.user.id; // ID del admin que está haciendo el cambio
  const { nuevo_estatus, comentarios_admin } = req.body;

  // Validación del estatus recibido
  const estatusValidos = [
    "solicitado",
    "en_revision",
    "listo_para_entrega",
    "rechazado",
    "cancelado",
  ];
  if (!nuevo_estatus || !estatusValidos.includes(nuevo_estatus)) {
    return res.status(400).send({ message: "Estatus no válido." });
  }

  try {
    // 1. Actualizar la solicitud en la base de datos
    const [result] = await db.query(
      `UPDATE solicitudes_alumnos
       SET estatus = ?, comentarios_admin = ?, actualizado_por_usuario_id = ?
       WHERE id = ?`,
      [nuevo_estatus, comentarios_admin || null, adminId, solicitudId],
    );

    // Verificar si se actualizó algo
    if (result.affectedRows === 0) {
      return res.status(404).send({ message: "Solicitud no encontrada." });
    }

    // --- 2. Notificar al Alumno sobre la actualización ---
    try {
      // Obtener ID del alumno y tipo de solicitud para el mensaje
      const [[solicitud]] = await db.query(
        "SELECT alumno_id, tipo_solicitud FROM solicitudes_alumnos WHERE id = ?",
        [solicitudId],
      );
      const alumno_id = solicitud.alumno_id;

      // Construir el mensaje
      let mensajeAlumno = `Tu solicitud de '${solicitud.tipo_solicitud}' ha sido actualizada a: ${nuevo_estatus}.`;
      if (comentarios_admin) {
        mensajeAlumno += ` Comentario: ${comentarios_admin}`;
      }
      const urlDestinoAlumno = "/alumno/mis-solicitudes"; // Link para que el alumno vea sus solicitudes

      // Crear notificación web (campanita)
      await db.query(
        "INSERT INTO notificaciones (user_id, mensaje, url_destino) VALUES (?, ?, ?)",
        [alumno_id, mensajeAlumno, urlDestinoAlumno],
      );

      // Enviar notificación Push (móvil)
      const [tokens] = await db.query(
        "SELECT token FROM push_tokens WHERE user_id = ?",
        [alumno_id],
      );
      if (tokens.length > 0) {
        const messages = tokens.map((t) => ({
          to: t.token,
          sound: "default",
          title: "Actualización de Solicitud 🔄",
          body: mensajeAlumno,
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
        `Notificación de actualización enviada al alumno ${alumno_id}.`,
      );
    } catch (notifError) {
      console.error(
        "Error al notificar actualización de solicitud:",
        notifError,
      );
      // No detener la respuesta principal
    }
    // --- Fin Notificar Alumno ---

    res.send({ message: "Estatus de solicitud actualizado con éxito." });
  } catch (error) {
    console.error("Error al actualizar estatus de solicitud:", error);
    res.status(500).send({ message: "Error en el servidor" });
  }
});

// --- FIN: RUTAS DE GESTIÓN DE SOLICITUDES (ADMIN) ---

// ... (Aquí continúan las otras rutas del adminRouter que ya tenías)

// ... (justo después de const adminRouter = express.Router();)
// ... (y de adminRouter.use(isAdmin);)

// --- INICIO: NUEVAS RUTAS DE ANALÍTICAS ---

// Endpoint 1: Alumnos por Carrera (Gráfico de Pastel)
adminRouter.get("/analiticas/alumnos-por-carrera", async (req, res) => {
  try {
    const [data] = await db.query(`
      SELECT 
          c.nombre_carrera, 
          COUNT(DISTINCT ga.alumno_id) as total_alumnos
      FROM grupo_alumnos ga
      JOIN usuarios u ON ga.alumno_id = u.id AND u.rol = 'alumno'
      JOIN grupos g ON ga.grupo_id = g.id
      JOIN planes_estudio p ON g.plan_estudio_id = p.id
      JOIN carreras c ON p.carrera_id = c.id
      GROUP BY c.id;
    `);
    res.json(data);
  } catch (error) {
    console.error("Error en analiticas/alumnos-por-carrera:", error);
    res.status(500).send({ message: "Error en el servidor" });
  }
});

// Endpoint 2: Promedio General por Docente (Gráfico de Barras)
adminRouter.get("/analiticas/promedio-docentes", async (req, res) => {
  try {
    const [data] = await db.query(`
      SELECT
          CONCAT(u.nombre, ' ', u.apellido_paterno) as nombre_docente,
          AVG(c.calificacion) as promedio_general
      FROM calificaciones c
      JOIN grupo_asignaturas_docentes gad ON c.grupo_id = gad.grupo_id AND c.asignatura_id = gad.asignatura_id
      JOIN usuarios u ON gad.docente_id = u.id
      WHERE c.calificacion IS NOT NULL
      GROUP BY u.id
      ORDER BY promedio_general DESC;
    `);
    res.json(data);
  } catch (error) {
    console.error("Error en analiticas/promedio-docentes:", error);
    res.status(500).send({ message: "Error en el servidor" });
  }
});

// Endpoint 3: Índice de Reprobación por Asignatura (Gráfico de Barras)
adminRouter.get("/analiticas/reprobacion-asignaturas", async (req, res) => {
  try {
    // Asumimos que la calificación mínima aprobatoria es 70
    const [data] = await db.query(`
      SELECT
          a.nombre_asignatura,
          COUNT(c.id) as total_calificaciones,
          SUM(CASE WHEN c.calificacion < 70 THEN 1 ELSE 0 END) as total_reprobados,
          (SUM(CASE WHEN c.calificacion < 70 THEN 1 ELSE 0 END) / COUNT(c.id)) * 100 as indice_reprobacion_pct
      FROM calificaciones c
      JOIN asignaturas a ON c.asignatura_id = a.id
      WHERE c.calificacion IS NOT NULL
      GROUP BY a.id
      HAVING total_calificaciones > 0
      ORDER BY indice_reprobacion_pct DESC;
    `);
    res.json(data);
  } catch (error) {
    console.error("Error en analiticas/reprobacion-asignaturas:", error);
    res.status(500).send({ message: "Error en el servidor" });
  }
});

// --- FIN: NUEVAS RUTAS DE ANALÍTICAS ---

// ... (Aquí continúan tus otras rutas, como createCatalogCrudRoutes, etc.)

function createCatalogCrudRoutes(router, tableName, fields) {
  router.get(`/${tableName}`, async (req, res) =>
    res.json((await db.query(`SELECT * FROM ${tableName}`))[0]),
  );
  router.post(`/${tableName}`, async (req, res) => {
    const values = fields.map((f) => req.body[f]);
    const placeholders = fields.map(() => "?").join(", ");
    await db.query(
      `INSERT INTO ${tableName} (${fields.join(",")}) VALUES (${placeholders})`,
      values,
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
// --- RUTAS CRUD PERSONALIZADAS PARA PLANES DE ESTUDIO ---

// --- RUTAS PLANES DE ESTUDIO (CON SOFT DELETE) ---

// 1. GET: Activos (Solo activo = 1)
adminRouter.get("/planes_estudio", async (req, res) => {
  try {
    const sql = `
      SELECT p.*, c.nombre_carrera 
      FROM planes_estudio p 
      LEFT JOIN carreras c ON p.carrera_id = c.id
      WHERE p.activo = 1
      ORDER BY p.nombre_plan
    `;
    res.json((await db.query(sql))[0]);
  } catch (error) {
    res.status(500).send({ message: "Error al obtener planes" });
  }
});

// 2. GET: Eliminados (Papelera)
adminRouter.get("/planes_estudio/eliminados", async (req, res) => {
  try {
    const sql = `
      SELECT p.*, c.nombre_carrera 
      FROM planes_estudio p 
      LEFT JOIN carreras c ON p.carrera_id = c.id
      WHERE p.activo = 0
      ORDER BY p.nombre_plan
    `;
    res.json((await db.query(sql))[0]);
  } catch (error) {
    res.status(500).send({ message: "Error al obtener papelera" });
  }
});

// 3. POST: Crear
adminRouter.post("/planes_estudio", async (req, res) => {
  try {
    const { nombre_plan, carrera_id } = req.body;
    await db.query(
      "INSERT INTO planes_estudio (nombre_plan, carrera_id, activo) VALUES (?, ?, 1)",
      [nombre_plan, carrera_id || null],
    );
    res.status(201).send({ message: "Plan de estudio creado" });
  } catch (error) {
    res.status(500).send({ message: "Error al crear el plan" });
  }
});

// 4. PUT: Actualizar
adminRouter.put("/planes_estudio/:id", async (req, res) => {
  try {
    const { nombre_plan, carrera_id } = req.body;
    await db.query(
      "UPDATE planes_estudio SET nombre_plan = ?, carrera_id = ? WHERE id = ?",
      [nombre_plan, carrera_id || null, req.params.id],
    );
    res.send({ message: "Plan de estudio actualizado" });
  } catch (error) {
    res.status(500).send({ message: "Error al actualizar el plan" });
  }
});

// 5. DELETE: Soft Delete (Enviar a papelera)
adminRouter.delete("/planes_estudio/:id", async (req, res) => {
  try {
    await db.query("UPDATE planes_estudio SET activo = 0 WHERE id = ?", [
      req.params.id,
    ]);
    res.send({ message: "Plan de estudio enviado a la papelera" });
  } catch (error) {
    res.status(500).send({ message: "Error al eliminar el plan" });
  }
});

// 6. PUT: Restaurar (Sacar de papelera)
adminRouter.put("/planes_estudio/:id/reactivar", async (req, res) => {
  try {
    await db.query("UPDATE planes_estudio SET activo = 1 WHERE id = ?", [
      req.params.id,
    ]);
    res.send({ message: "Plan restaurado correctamente" });
  } catch (error) {
    res.status(500).send({ message: "Error al restaurar plan" });
  }
});

// POST /admin/planes_estudio
adminRouter.post("/planes_estudio", async (req, res) => {
  try {
    const { nombre_plan, carrera_id } = req.body;
    await db.query(
      "INSERT INTO planes_estudio (nombre_plan, carrera_id) VALUES (?, ?)",
      [nombre_plan, carrera_id || null],
    );
    res.status(201).send({ message: "Plan de estudio creado" });
  } catch (error) {
    res.status(500).send({ message: "Error al crear el plan" });
  }
});

// PUT /admin/planes_estudio/:id
adminRouter.put("/planes_estudio/:id", async (req, res) => {
  try {
    const { nombre_plan, carrera_id } = req.body;
    await db.query(
      "UPDATE planes_estudio SET nombre_plan = ?, carrera_id = ? WHERE id = ?",
      [nombre_plan, carrera_id || null, req.params.id],
    );
    res.send({ message: "Plan de estudio actualizado" });
  } catch (error) {
    res.status(500).send({ message: "Error al actualizar el plan" });
  }
});

// DELETE /admin/planes_estudio/:id
adminRouter.delete("/planes_estudio/:id", async (req, res) => {
  try {
    // (Opcional: podrías añadir lógica para no borrar si está en uso)
    await db.query("DELETE FROM planes_estudio WHERE id = ?", [req.params.id]);
    res.send({ message: "Plan de estudio eliminado" });
  } catch (error) {
    res.status(500).send({ message: "Error al eliminar el plan" });
  }
});

// GET Obtener calificaciones de un grupo y materia (Para llenar la tabla del Admin)
adminRouter.get("/calificaciones/:grupoId/:asignaturaId", async (req, res) => {
  const { grupoId, asignaturaId } = req.params;
  try {
    const [rows] = await db.query(
      "SELECT alumno_id, calificacion FROM calificaciones WHERE grupo_id = ? AND asignatura_id = ?",
      [grupoId, asignaturaId],
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Error al obtener calificaciones" });
  }
});

// --- RUTA ACTUALIZADA: Guardar Calificaciones + Push Android ---
adminRouter.post("/calificaciones/guardar-lote", async (req, res) => {
  const { grupo_id, asignatura_id, calificaciones } = req.body;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Nombre de materia
    const [materiaRows] = await connection.query(
      "SELECT nombre_asignatura FROM asignaturas WHERE id = ?",
      [asignatura_id],
    );
    const nombreMateria = materiaRows[0]?.nombre_asignatura || "Materia";

    // 2. Procesar cada alumno
    for (const item of calificaciones) {
      // A) Guardar en BD (Calificaciones)
      await connection.query(
        `
        INSERT INTO calificaciones (alumno_id, asignatura_id, grupo_id, calificacion)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE calificacion = VALUES(calificacion)
      `,
        [item.alumno_id, asignatura_id, grupo_id, item.calificacion],
      );

      // B) Guardar en BD (Notificaciones - Campanita)
      const mensaje = `Tu calificación en ${nombreMateria} ha sido actualizada: ${item.calificacion}`;
      await connection.query(
        "INSERT INTO notificaciones (usuario_id, mensaje, leido, fecha, tipo) VALUES (?, ?, 0, NOW(), 'calificacion')",
        [item.alumno_id, mensaje],
      );

      // C) --- ENVIAR PUSH (ANDROID/EXPO) ---
      // 1. Buscamos si el alumno tiene celular registrado
      const [tokens] = await connection.query(
        "SELECT token FROM push_tokens WHERE user_id = ?",
        [item.alumno_id],
      );

      if (tokens.length > 0) {
        // Preparamos los mensajes para Expo
        const expoMessages = tokens.map((t) => ({
          to: t.token,
          sound: "default",
          title: "Nueva Calificación",
          body: mensaje,
          data: { url: "/alumno/mis-calificaciones" },
        }));

        // Enviamos a Expo
        await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(expoMessages),
        });
      }
    }

    await connection.commit();
    res.send({ message: "Calificaciones guardadas y notificadas." });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).send({ message: "Error al guardar" });
  } finally {
    connection.release();
  }
});

// GET Mis Notificaciones (Para la campanita)
// Asegúrate de que esta ruta esté accesible para el rol 'alumno'
const commonRouter = express.Router(); // O usa tu router existente

// --- RUTA CORREGIDA: OBTENER NOTIFICACIONES ---
// (Pégalo reemplazando la ruta vieja que da error, aprox línea 280-300)

// Nota: Asegúrate de usar 'app.get' o 'apiRouter.get' según corresponda en esa parte de tu archivo.
// Si usas un router específico, cámbialo. Aquí asumo que usas 'app' o el router principal.

// --- REEMPLAZA TU RUTA DE NOTIFICACIONES POR ESTA ---
app.get("/api/notificaciones", verifyToken, async (req, res) => {
  const usuario_id = req.user.id;

  try {
    // AQUÍ ESTABA EL ERROR: Usamos los nombres reales de la tabla
    const sql = `
      SELECT 
        id, 
        mensaje, 
        url_destino, 
        leido,                   -- En la BD se llama 'leido', no 'leida'
        fecha as fecha_creacion  -- Alias para que el frontend lo entienda como 'fecha_creacion'
      FROM notificaciones 
      WHERE usuario_id = ?       -- En la BD se llama 'usuario_id', no 'user_id'
      ORDER BY fecha DESC        -- Ordenamos por 'fecha'
      LIMIT 20
    `;

    const [rows] = await db.query(sql, [usuario_id]);
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener notificaciones:", error); // Esto te ayudará a ver errores futuros
    res.status(500).send({ message: "Error al cargar notificaciones" });
  }
});

app.put("/api/notificaciones/marcar-leidas", verifyToken, async (req, res) => {
  const usuario_id = req.user.id;
  try {
    await db.query("UPDATE notificaciones SET leido = 1 WHERE usuario_id = ?", [
      usuario_id,
    ]);
    res.send({ message: "Leídas" });
  } catch (error) {
    res.status(500).send({ message: "Error" });
  }
});
// --- FIN RUTAS PLANES DE ESTUDIO ---

// AHORA SÍ, CONTINÚA CON LA LÍNEA ORIGINAL:
createCatalogCrudRoutes(adminRouter, "tipos_asignatura", ["tipo"]);
// ... (el resto de tus rutas)
createCatalogCrudRoutes(adminRouter, "tipos_asignatura", ["tipo"]);
// createCatalogCrudRoutes(adminRouter, "grados", ["nombre_grado"]);
// createCatalogCrudRoutes(adminRouter, "ciclos", ["nombre_ciclo"]);
createCatalogCrudRoutes(adminRouter, "sedes", ["nombre_sede", "direccion"]);
// createCatalogCrudRoutes(adminRouter, "carreras", ["nombre_carrera"]);

// ... (después del createCatalogCrudRoutes de "sedes")

// --- INICIO: CRUD PARA CONCEPTOS DE PAGO ---
// Usamos el genérico porque es un catálogo simple
createCatalogCrudRoutes(adminRouter, "conceptos_pago", [
  "nombre_concepto",
  "monto_default",
  "tipo",
  "es_concepto_inscripcion",
]);
// --- FIN: CRUD PARA CONCEPTOS DE PAGO ---
// --- GESTIÓN DE CICLO ACTUAL ---

// --- RUTAS ESPECÍFICAS PARA CICLOS (SOFT DELETE) ---

// ... (Tus rutas anteriores de Ciclos GET, POST, PUT, DELETE) ...

// --- RUTAS ESPECÍFICAS PARA GRADOS (SOFT DELETE) ---
// --- RUTAS CARRERAS (CORREGIDO: ELIMINAR LA LÍNEA createCatalogCrudRoutes DE CARRERAS) ---

// 1. GET: Carreras Activas (FILTRO IMPORTANTE: activo = 1)
adminRouter.get("/carreras", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM carreras WHERE activo = 1 ORDER BY nombre_carrera ASC",
    );
    res.json(rows);
  } catch (error) {
    res.status(500).send({ message: "Error al obtener carreras" });
  }
});

// 2. GET: Papelera (FILTRO IMPORTANTE: activo = 0)
adminRouter.get("/carreras/eliminadas", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM carreras WHERE activo = 0 ORDER BY nombre_carrera ASC",
    );
    res.json(rows);
  } catch (error) {
    res.status(500).send({ message: "Error al obtener papelera" });
  }
});

// 3. POST: Crear
adminRouter.post("/carreras", async (req, res) => {
  const { nombre_carrera } = req.body;
  try {
    // Al crear, forzamos activo = 1
    await db.query(
      "INSERT INTO carreras (nombre_carrera, activo) VALUES (?, 1)",
      [nombre_carrera],
    );
    res.status(201).send({ message: "Carrera creada exitosamente" });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY")
      return res.status(400).send({ message: "Esa carrera ya existe." });
    res.status(500).send({ message: "Error al crear carrera" });
  }
});

// 4. PUT: Editar
adminRouter.put("/carreras/:id", async (req, res) => {
  const { nombre_carrera } = req.body;
  try {
    await db.query("UPDATE carreras SET nombre_carrera = ? WHERE id = ?", [
      nombre_carrera,
      req.params.id,
    ]);
    res.send({ message: "Carrera actualizada" });
  } catch (error) {
    res.status(500).send({ message: "Error al actualizar" });
  }
});

// 5. DELETE: Soft Delete (ESTO ARREGLA EL "NO PUEDO ELIMINAR")
adminRouter.delete("/carreras/:id", async (req, res) => {
  try {
    // En lugar de DELETE FROM, hacemos UPDATE activo = 0
    await db.query("UPDATE carreras SET activo = 0 WHERE id = ?", [
      req.params.id,
    ]);
    res.send({ message: "Carrera enviada a la papelera" });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Error al eliminar" });
  }
});

// 6. PUT: Restaurar
adminRouter.put("/carreras/:id/reactivar", async (req, res) => {
  try {
    await db.query("UPDATE carreras SET activo = 1 WHERE id = ?", [
      req.params.id,
    ]);
    res.send({ message: "Carrera restaurada correctamente" });
  } catch (error) {
    res.status(500).send({ message: "Error al restaurar" });
  }
});

// 1. GET: Activos
adminRouter.get("/grados", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM grados WHERE activo = 1 ORDER BY nombre_grado",
    );
    res.json(rows);
  } catch (error) {
    res.status(500).send({ message: "Error al obtener grados" });
  }
});

// 2. GET: Eliminados (Papelera)
adminRouter.get("/grados/eliminados", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM grados WHERE activo = 0 ORDER BY nombre_grado",
    );
    res.json(rows);
  } catch (error) {
    res.status(500).send({ message: "Error al obtener papelera" });
  }
});

// 3. POST: Crear
adminRouter.post("/grados", async (req, res) => {
  const { nombre_grado } = req.body;
  try {
    await db.query("INSERT INTO grados (nombre_grado, activo) VALUES (?, 1)", [
      nombre_grado,
    ]);
    res.status(201).send({ message: "Grado creado" });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY")
      return res.status(400).send({ message: "El grado ya existe." });
    res.status(500).send({ message: "Error al crear" });
  }
});

// 4. PUT: Actualizar
adminRouter.put("/grados/:id", async (req, res) => {
  const { nombre_grado } = req.body;
  try {
    await db.query("UPDATE grados SET nombre_grado = ? WHERE id = ?", [
      nombre_grado,
      req.params.id,
    ]);
    res.send({ message: "Grado actualizado" });
  } catch (error) {
    res.status(500).send({ message: "Error al actualizar" });
  }
});

// 5. DELETE: Soft Delete
adminRouter.delete("/grados/:id", async (req, res) => {
  try {
    await db.query("UPDATE grados SET activo = 0 WHERE id = ?", [
      req.params.id,
    ]);
    res.send({ message: "Enviado a la papelera" });
  } catch (error) {
    res.status(500).send({ message: "Error al eliminar" });
  }
});

// 6. PUT: Restaurar
adminRouter.put("/grados/:id/reactivar", async (req, res) => {
  try {
    await db.query("UPDATE grados SET activo = 1 WHERE id = ?", [
      req.params.id,
    ]);
    res.send({ message: "Restaurado correctamente" });
  } catch (error) {
    res.status(500).send({ message: "Error al restaurar" });
  }
});
// 5. GET: Ver Papelera (Solo inactivos)
adminRouter.get("/ciclos/eliminados", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM ciclos WHERE activo = 0 ORDER BY nombre_ciclo DESC",
    );
    res.json(rows);
  } catch (error) {
    res.status(500).send({ message: "Error al cargar papelera" });
  }
});

// 6. PUT: Restaurar (Sacar de la papelera)
adminRouter.put("/ciclos/:id/reactivar", async (req, res) => {
  try {
    await db.query("UPDATE ciclos SET activo = 1 WHERE id = ?", [
      req.params.id,
    ]);
    res.send({ message: "Ciclo restaurado correctamente." });
  } catch (error) {
    res.status(500).send({ message: "Error al restaurar ciclo" });
  }
});

// 1. GET: Obtener solo los ciclos ACTIVOS
adminRouter.get("/ciclos", async (req, res) => {
  try {
    // Ordenamos: Primero el 'actual' (si existe), luego por nombre descendente (los más nuevos primero)
    const [rows] = await db.query(
      "SELECT * FROM ciclos WHERE activo = 1 ORDER BY actual DESC, nombre_ciclo DESC",
    );
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener ciclos:", error);
    res.status(500).send({ message: "Error al cargar ciclos" });
  }
});

// 2. POST: Crear nuevo ciclo
adminRouter.post("/ciclos", async (req, res) => {
  const { nombre_ciclo } = req.body;
  try {
    // Se crea activo por defecto (1) y no actual (0)
    await db.query(
      "INSERT INTO ciclos (nombre_ciclo, activo, actual) VALUES (?, 1, 0)",
      [nombre_ciclo],
    );
    res.status(201).send({ message: "Ciclo creado con éxito" });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY")
      return res
        .status(400)
        .send({ message: "El nombre del ciclo ya existe." });
    res.status(500).send({ message: "Error al crear ciclo" });
  }
});

// 3. PUT: Actualizar nombre
adminRouter.put("/ciclos/:id", async (req, res) => {
  const { nombre_ciclo } = req.body;
  try {
    await db.query("UPDATE ciclos SET nombre_ciclo = ? WHERE id = ?", [
      nombre_ciclo,
      req.params.id,
    ]);
    res.send({ message: "Ciclo actualizado" });
  } catch (error) {
    res.status(500).send({ message: "Error al actualizar" });
  }
});

// 4. DELETE: Soft Delete (Papelera)
adminRouter.delete("/ciclos/:id", async (req, res) => {
  try {
    // En lugar de borrar, marcamos activo = 0
    await db.query("UPDATE ciclos SET activo = 0 WHERE id = ?", [
      req.params.id,
    ]);
    res.send({ message: "Ciclo enviado a la papelera." });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Error al eliminar ciclo" });
  }
});

// 1. PUT: Fijar un ciclo como ACTUAL
adminRouter.put("/ciclos/:id/fijar-actual", async (req, res) => {
  const { id } = req.params;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    // Primero: Desactivar TODOS los ciclos
    await connection.query("UPDATE ciclos SET actual = 0");
    // Segundo: Activar SOLO el seleccionado
    await connection.query("UPDATE ciclos SET actual = 1 WHERE id = ?", [id]);

    await connection.commit();
    res.send({ message: "Ciclo establecido como actual." });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).send({ message: "Error al actualizar ciclo." });
  } finally {
    connection.release();
  }
});

// 2. GET: Obtener el nombre del ciclo actual (Para el Header)
// Nota: Usamos apiRouter para que sea accesible por admin, docente y alumno
apiRouter.get("/ciclo-actual", async (req, res) => {
  try {
    const [[ciclo]] = await db.query(
      "SELECT nombre_ciclo FROM ciclos WHERE actual = 1",
    );
    // Si no hay ninguno marcado, devolvemos null o un texto genérico
    res.json({ nombre: ciclo ? ciclo.nombre_ciclo : "Sin Ciclo Activo" });
  } catch (error) {
    res.status(500).send({ message: "Error" });
  }
});
// --- INICIO: RUTAS DE GESTIÓN FINANCIERA ---

// GET /admin/alumnos/:id/adeudos - Ver el estado de cuenta de un alumno
adminRouter.get("/alumnos/:id/adeudos", async (req, res) => {
  const { id: alumnoId } = req.params;
  try {
    const [adeudos] = await db.query(
      `SELECT aa.*, cp.nombre_concepto
       FROM adeudos_alumnos aa
       JOIN conceptos_pago cp ON aa.concepto_id = cp.id
       WHERE aa.alumno_id = ?
       ORDER BY aa.fecha_vencimiento ASC`,
      [alumnoId],
    );
    res.json(adeudos);
  } catch (error) {
    console.error("Error al obtener adeudos:", error);
    res.status(500).send({ message: "Error en el servidor" });
  }
});

// POST /admin/adeudos/generar-manual - Generar un nuevo adeudo manual
adminRouter.post("/adeudos/generar-manual", async (req, res) => {
  const { alumno_id, concepto_id, monto_a_pagar, fecha_vencimiento } = req.body;

  try {
    // 1. Insertar el adeudo
    await db.query(
      "INSERT INTO adeudos_alumnos (alumno_id, concepto_id, monto_a_pagar, fecha_vencimiento, estatus_pago) VALUES (?, ?, ?, ?, 'pendiente')",
      [alumno_id, concepto_id, monto_a_pagar, fecha_vencimiento || null],
    );

    // --- INICIO DE NOTIFICACIÓN ---
    try {
      // 2. Obtener nombre del concepto para el mensaje
      const [[concepto]] = await db.query(
        "SELECT nombre_concepto FROM conceptos_pago WHERE id = ?",
        [concepto_id],
      );
      const nombreConcepto = concepto
        ? concepto.nombre_concepto
        : "un nuevo cargo";

      const mensaje = `Se ha generado un nuevo cargo: ${nombreConcepto} por $${monto_a_pagar}`;
      const urlDestino = "/alumno/mis-pagos";

      // 3. Crear notificación web (campanita)
      await db.query(
        "INSERT INTO notificaciones (user_id, mensaje, url_destino) VALUES (?, ?, ?)",
        [alumno_id, mensaje, urlDestino],
      );

      // 4. Enviar notificación Push (móvil)
      const [tokens] = await db.query(
        "SELECT token FROM push_tokens WHERE user_id = ?",
        [alumno_id],
      );
      if (tokens.length > 0) {
        const messages = tokens.map((t) => ({
          to: t.token,
          sound: "default",
          title: "Nuevo Cargo Generado 💳",
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
    } catch (notifError) {
      console.error("Error al enviar notificación de adeudo:", notifError);
      // No detenemos la operación principal si la notificación falla
    }
    // --- FIN DE NOTIFICACIÓN ---

    res.status(201).send({ message: "Adeudo generado con éxito" });
  } catch (error) {
    console.error("Error al generar adeudo manual:", error);
    res.status(500).send({ message: "Error en el servidor" });
  }
});

// POST /admin/adeudos/:id/marcar-pagado - Registrar un pago (Ruta de Caja)
adminRouter.post("/adeudos/:id/marcar-pagado", async (req, res) => {
  const { id: adeudoId } = req.params;
  const adminId = req.user.id; // El admin/cajero que está registrando

  try {
    // 1. Obtener datos del adeudo ANTES de marcarlo como pagado
    const [[adeudo]] = await db.query(
      `SELECT aa.alumno_id, aa.estatus_pago, cp.nombre_concepto 
       FROM adeudos_alumnos aa
       JOIN conceptos_pago cp ON aa.concepto_id = cp.id
       WHERE aa.id = ?`,
      [adeudoId],
    );

    if (!adeudo) {
      return res.status(404).send({ message: "El adeudo no existe." });
    }
    if (adeudo.estatus_pago === "pagado") {
      return res.status(400).send({ message: "Este adeudo ya fue pagado." });
    }

    // 2. Actualizar el adeudo
    const [result] = await db.query(
      "UPDATE adeudos_alumnos SET estatus_pago = 'pagado', fecha_pago = CURRENT_TIMESTAMP, registrado_por_usuario_id = ? WHERE id = ?",
      [adminId, adeudoId],
    );

    if (result.affectedRows === 0) {
      // Esto es una doble verificación por si acaso
      return res
        .status(404)
        .send({ message: "No se pudo actualizar el adeudo." });
    }

    // --- INICIO DE NOTIFICACIÓN ---
    try {
      const alumno_id = adeudo.alumno_id;
      const nombreConcepto = adeudo.nombre_concepto;

      const mensaje = `¡Tu pago para "${nombreConcepto}" ha sido registrado!`;
      const urlDestino = "/alumno/mis-pagos";

      // 3. Crear notificación web (campanita)
      await db.query(
        "INSERT INTO notificaciones (user_id, mensaje, url_destino) VALUES (?, ?, ?)",
        [alumno_id, mensaje, urlDestino],
      );

      // 4. Enviar notificación Push (móvil)
      const [tokens] = await db.query(
        "SELECT token FROM push_tokens WHERE user_id = ?",
        [alumno_id],
      );
      if (tokens.length > 0) {
        const messages = tokens.map((t) => ({
          to: t.token,
          sound: "default",
          title: "¡Pago Registrado! ✅",
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
    } catch (notifError) {
      console.error("Error al enviar notificación de pago:", notifError);
    }
    // --- FIN DE NOTIFICACIÓN ---

    res.send({ message: "Pago registrado con éxito" });
  } catch (error) {
    console.error("Error al registrar pago:", error);
    res.status(500).send({ message: "Error en el servidor" });
  }
});

// --- FIN: RUTAS DE GESTIÓN FINANCIERA ---

// ... (Ahora sí, la ruta adminRouter.get("/usuarios", ...)

// --- RUTAS DE USUARIOS (CON SOFT DELETE) ---

// 1. GET: Lista de Usuarios (SOLO ACTIVOS)
// --- RUTA: OBTENER USUARIOS (CORREGIDA PARA VER TODOS LOS DATOS) ---
adminRouter.get("/usuarios", async (req, res) => {
  try {
    const sql = `
      SELECT 
        u.id, u.nombre, u.apellido_paterno, u.apellido_materno, 
        u.email, u.rol, u.matricula, u.foto_perfil, u.activo,
        u.telefono, u.curp, u.genero,
        u.carrera_id, u.sede_id,
        DATE_FORMAT(u.fecha_nacimiento, '%Y-%m-%d') as fecha_nacimiento,
        c.nombre_carrera, 
        s.nombre_sede
      FROM usuarios u
      -- El JOIN revisa ambas columnas por si acaso usas una u otra
      LEFT JOIN carreras c ON (u.carrera_id = c.id OR u.carrera_interes_id = c.id)
      LEFT JOIN sedes s ON (u.sede_id = s.id OR u.sede_interes_id = s.id)
      WHERE u.activo = 1
      ORDER BY u.id DESC
    `;
    const [rows] = await db.query(sql);
    res.json(rows);
  } catch (error) {
    console.error("Error al cargar usuarios:", error);
    res.status(500).send({ message: "Error al obtener usuarios" });
  }
});

// 2. GET: Papelera de Usuarios (SOLO ELIMINADOS)
adminRouter.get("/usuarios/eliminados", async (req, res) => {
  try {
    const sql = `
      SELECT u.id, u.email, u.nombre, u.apellido_paterno, u.rol, u.foto_perfil, u.matricula
      FROM usuarios u
      WHERE u.activo = 0
      ORDER BY u.id DESC
    `;
    const [rows] = await db.query(sql);
    res.json(rows);
  } catch (error) {
    res.status(500).send({ message: "Error al obtener papelera" });
  }
});

// 3. POST: Crear Usuario (Mantenemos tu lógica de crear, asegurando activo=1)
// (Asegúrate de que tu ruta POST /usuarios actual no cambie mucho,
// solo verifica que al insertar no necesitas pasar 'activo' porque el default es 1)

// 4. DELETE: Soft Delete (Enviar a papelera)
adminRouter.delete("/usuarios/:id", async (req, res) => {
  const userIdToDelete = parseInt(req.params.id);
  const myId = req.user.id;

  // Protección: No puedes eliminarte a ti mismo
  if (userIdToDelete === myId) {
    return res
      .status(400)
      .send({ message: "No puedes eliminar tu propia cuenta." });
  }

  try {
    await db.query("UPDATE usuarios SET activo = 0 WHERE id = ?", [
      userIdToDelete,
    ]);
    res.send({ message: "Usuario enviado a la papelera." });
  } catch (error) {
    res.status(500).send({ message: "Error al eliminar usuario." });
  }
});

// 5. PUT: Restaurar Usuario
adminRouter.put("/usuarios/:id/reactivar", async (req, res) => {
  try {
    await db.query("UPDATE usuarios SET activo = 1 WHERE id = ?", [
      req.params.id,
    ]);
    res.send({ message: "Usuario restaurado correctamente." });
  } catch (error) {
    res.status(500).send({ message: "Error al restaurar usuario." });
  }
});

// --- ACTUALIZA TAMBIÉN LA RUTA DE ELIMINADOS ---
adminRouter.get("/usuarios/eliminados", async (req, res) => {
  try {
    const sql = `
      SELECT u.*, c.nombre_carrera, s.nombre_sede,
      DATE_FORMAT(u.fecha_nacimiento, '%Y-%m-%d') as fecha_nacimiento
      FROM usuarios u
      LEFT JOIN carreras c ON u.carrera_interes_id = c.id
      LEFT JOIN sedes s ON u.sede_interes_id = s.id
      WHERE u.activo = 0
      ORDER BY u.id DESC
    `;
    const [rows] = await db.query(sql);
    res.json(rows);
  } catch (error) {
    res.status(500).send({ message: "Error al obtener papelera" });
  }
});
// 1. RUTA PARA VER LA PAPELERA (Usuarios desactivados)
adminRouter.get("/usuarios/eliminados", async (req, res) => {
  try {
    const [users] = await db.query(
      "SELECT id, nombre, apellido_paterno, apellido_materno, email, rol, telefono, curp, matricula, genero, DATE_FORMAT(fecha_nacimiento, '%Y-%m-%d') as fecha_nacimiento FROM usuarios WHERE activo = 0",
    );
    res.json(users);
  } catch (error) {
    res.status(500).send({ message: "Error al obtener la papelera" });
  }
});

// 2. RUTA PARA REACTIVAR USUARIO (Sacar de la papelera)
adminRouter.put("/usuarios/:id/reactivar", async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("UPDATE usuarios SET activo = 1 WHERE id = ?", [id]);
    res.send({ message: "Usuario reactivado correctamente" });
  } catch (error) {
    res.status(500).send({ message: "Error al reactivar usuario" });
  }
});

// --- CREAR USUARIO (CONSECUTIVO AUTOMÁTICO + CORREO DE BIENVENIDA) ---
adminRouter.post("/usuarios", async (req, res) => {
  const {
    nombre,
    apellido_paterno,
    apellido_materno,
    email,
    telefono,
    genero,
    curp,
    fecha_nacimiento,
    rol,
    carrera_id,
    sede_id,
  } = req.body;

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // 1. VALIDACIONES BÁSICAS
    if (curp && !CURP_REGEX.test(curp)) {
      await connection.rollback();
      return res
        .status(400)
        .send({ message: "El formato de la CURP es inválido." });
    }

    // Verificar duplicados antes de procesar
    const [existing] = await connection.query(
      "SELECT email, curp FROM usuarios WHERE email = ? OR curp = ?",
      [email, curp],
    );
    if (existing.length > 0) {
      await connection.rollback();
      const user = existing[0];
      if (user.curp === curp)
        return res.status(400).send({ message: "La CURP ya está registrada." });
      if (user.email === email)
        return res
          .status(400)
          .send({ message: "El correo ya está registrado." });
    }

    // 2. GENERAR MATRÍCULA AUTOMÁTICA (Lógica de Consecutivo)
    const currentYear = new Date().getFullYear().toString();

    // Buscamos la última matrícula de este año
    const [lastUser] = await connection.query(
      "SELECT matricula FROM usuarios WHERE matricula LIKE ? ORDER BY CAST(matricula AS UNSIGNED) DESC LIMIT 1",
      [`${currentYear}%`],
    );

    let nextSequence = 1;
    if (lastUser.length > 0 && lastUser[0].matricula) {
      const lastMatriculaStr = lastUser[0].matricula.toString();
      // Extraemos solo la parte numérica final (ignorando el año)
      const sequencePart = lastMatriculaStr.substring(4);
      nextSequence = parseInt(sequencePart, 10) + 1;
    }

    // Formamos la matrícula: 2026 + 0020
    const finalMatricula = `${currentYear}${nextSequence.toString().padStart(4, "0")}`;

    // 3. LA CONTRASEÑA ES LA MATRÍCULA
    const hashedPassword = await bcrypt.hash(finalMatricula, 10);

    // 4. INSERTAR EN BASE DE DATOS
    const sql = `
      INSERT INTO usuarios 
      (nombre, apellido_paterno, apellido_materno, email, password, telefono, genero, curp, fecha_nacimiento, rol, carrera_id, sede_id, matricula, activo) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `;

    await connection.query(sql, [
      nombre,
      apellido_paterno,
      apellido_materno || null,
      email,
      hashedPassword,
      telefono,
      genero,
      curp,
      fecha_nacimiento,
      rol,
      carrera_id || null,
      sede_id || null,
      finalMatricula,
    ]);

    await connection.commit();

    // 5. ENVÍO DE CORREO (¡RECUPERADO!)
    // Usamos la función que ya tienes definida arriba en tu archivo.
    // Le pasamos la matrícula como tercer argumento porque actúa como password inicial.
    try {
      // AHORA PASAMOS 'rol' AL FINAL PARA QUE EL CORREO SEPA QUÉ TEXTO USAR
      await enviarCredenciales(email, nombre, finalMatricula, rol);
      console.log("Correo de bienvenida enviado.");
    } catch (mailError) {
      console.error("Fallo envío correo:", mailError);
    }

    res.status(201).send({
      message: "Usuario creado y notificado.",
      matricula: finalMatricula,
    });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).send({ message: "Error en el servidor al crear usuario." });
  } finally {
    connection.release();
  }
});

adminRouter.get("/usuarios/:id", async (req, res) =>
  res.json(
    (
      await db.query(
        "SELECT id, nombre, apellido_paterno, email, rol, apellido_materno, genero, telefono, curp, DATE_FORMAT(fecha_nacimiento, '%Y-%m-%d') as fecha_nacimiento FROM usuarios WHERE id = ?", // <-- Campos agregados, fecha_nacimiento formateada
        [req.params.id],
      )
    )[0][0],
  ),
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
      "UPDATE usuarios SET nombre=?, apellido_paterno=?, apellido_materno=?, email=?, password=?, rol=?, genero=?, telefono=?, curp=?, fecha_nacimiento=?, carrera_id=?, sede_id=? WHERE id=?";
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
// Ruta para eliminar usuarios con manejo de errores de base de datos
adminRouter.delete("/usuarios/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // 1. CAMBIO PRINCIPAL: En lugar de borrar, actualizamos activo = 0
    const [result] = await db.query(
      "UPDATE usuarios SET activo = 0 WHERE id = ?",
      [id],
    );

    // 2. Verificamos si se encontró el usuario
    if (result.affectedRows === 0) {
      return res.status(404).send({ message: "Usuario no encontrado" });
    }

    // 3. Éxito
    res.send({ message: "Usuario desactivado correctamente." });
  } catch (error) {
    console.error("Error intentando desactivar usuario:", error.message);
    res
      .status(500)
      .send({ message: "Error interno del servidor al desactivar." });

    // 4. DETECCIÓN DEL ERROR DE LLAVE FORÁNEA (El que te sale en consola)
    if (error.code === "ER_ROW_IS_REFERENCED_2" || error.errno === 1451) {
      // Determinamos el mensaje según la tabla que bloquea (opcional, para ser más específico)
      let mensajeError =
        "No se puede eliminar: El usuario tiene datos asociados.";

      if (error.sqlMessage.includes("calificaciones")) {
        mensajeError =
          "No se puede eliminar: Este alumno tiene CALIFICACIONES registradas. Bórralas primero.";
      } else if (error.sqlMessage.includes("clases_sesiones")) {
        mensajeError =
          "No se puede eliminar: Este docente tiene CLASES O SESIONES asignadas.";
      } else if (error.sqlMessage.includes("tareas")) {
        mensajeError =
          "No se puede eliminar: El usuario tiene TAREAS entregadas.";
      }

      // Devolvemos status 409 (Conflicto) al frontend
      return res.status(409).send({ message: mensajeError });
    }

    // 5. Cualquier otro error inesperado
    res
      .status(500)
      .send({ message: "Error interno del servidor al eliminar." });
  }
});
adminRouter.get("/aspirantes", async (req, res) =>
  res.json(
    (
      await db.query(
        "SELECT id, nombre, apellido_paterno FROM usuarios WHERE rol = 'aspirante'",
      )
    )[0],
  ),
);
adminRouter.get("/docentes", async (req, res) =>
  res.json(
    (
      await db.query(
        "SELECT id, nombre, apellido_paterno FROM usuarios WHERE rol = 'docente'",
      )
    )[0],
  ),
);
// GET Alumnos Disponibles (Corrección: Solo muestra alumnos SIN grupo)
adminRouter.get("/grupos/:id/alumnos-disponibles", async (req, res) => {
  const { id: grupoId } = req.params;
  try {
    /*
    LOGICA CORREGIDA:
    Buscamos usuarios con rol 'aspirante' o 'alumno'
    que NO estén en la tabla 'grupo_alumnos' (en NINGÚN grupo).
    */
    const [alumnos] = await db.query(
      `SELECT id, nombre, apellido_paterno, rol
       FROM usuarios
       WHERE (rol = 'aspirante' OR rol = 'alumno')
       AND id NOT IN (
           SELECT alumno_id FROM grupo_alumnos
       )`,
      // Nota: Quitamos el "WHERE grupo_id = ?" de la subconsulta
      // para que excluya a cualquiera que ya tenga grupo.
    );
    res.json(alumnos);
  } catch (error) {
    console.error("Error al buscar alumnos disponibles:", error);
    res.status(500).send({ message: "Error en el servidor" });
  }
});
// --- RUTAS DE ASIGNATURAS CORREGIDAS ---

// GET Asignaturas (Solo activas)
adminRouter.get("/asignaturas", async (req, res) => {
  try {
    const sql = `
      SELECT a.*, p.nombre_plan, t.tipo as nombre_tipo, g.nombre_grado 
      FROM asignaturas a
      LEFT JOIN planes_estudio p ON a.plan_estudio_id = p.id
      LEFT JOIN tipos_asignatura t ON a.tipo_asignatura_id = t.id
      LEFT JOIN grados g ON a.grado_id = g.id
      WHERE a.activo = 1
      ORDER BY a.nombre_asignatura ASC
    `;
    const [rows] = await db.query(sql);
    res.json(rows);
  } catch (error) {
    console.error(error); // Agregué esto para que veas el error en la consola negra si vuelve a fallar
    res.status(500).send({ message: "Error al obtener asignaturas" });
  }
});

// --- RUTAS DE CATÁLOGOS (FALTANTES) ---

// Para el select de "Grados"
adminRouter.get("/grados", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM grados ORDER BY nombre_grado ASC",
    );
    res.json(rows);
  } catch (error) {
    res.status(500).send({ message: "Error al cargar grados" });
  }
});

// Para el select de "Tipos de Asignatura"
adminRouter.get("/tipos_asignatura", async (req, res) => {
  try {
    // IMPORTANTE: Aliamos 'tipo' como 'nombre_tipo' para que el frontend lo entienda
    const [rows] = await db.query(
      "SELECT id, tipo as nombre_tipo FROM tipos_asignatura ORDER BY tipo ASC",
    );
    res.json(rows);
  } catch (error) {
    res.status(500).send({ message: "Error al cargar tipos" });
  }
});

// DELETE Asignatura (Soft Delete)
adminRouter.delete("/asignaturas/:id", async (req, res) => {
  try {
    await db.query("UPDATE asignaturas SET activo = 0 WHERE id = ?", [
      req.params.id,
    ]);
    res.send({ message: "Asignatura enviada a la papelera" });
  } catch (error) {
    res.status(500).send({ message: "Error al eliminar asignatura" });
  }
});

// GET Eliminadas (Papelera)
adminRouter.get("/asignaturas/eliminadas", async (req, res) => {
  try {
    const sql = `
      SELECT a.*, p.nombre_plan, t.tipo as nombre_tipo, g.nombre_grado 
      FROM asignaturas a
      LEFT JOIN planes_estudio p ON a.plan_estudio_id = p.id
      LEFT JOIN tipos_asignatura t ON a.tipo_asignatura_id = t.id
      LEFT JOIN grados g ON a.grado_id = g.id
      WHERE a.activo = 0
    `;
    const [rows] = await db.query(sql);
    res.json(rows);
  } catch (error) {
    res.status(500).send({ message: "Error al obtener papelera" });
  }
});

// PUT Reactivar
adminRouter.put("/asignaturas/:id/reactivar", async (req, res) => {
  try {
    await db.query("UPDATE asignaturas SET activo = 1 WHERE id = ?", [
      req.params.id,
    ]);
    res.send({ message: "Asignatura recuperada correctamente" });
  } catch (error) {
    res.status(500).send({ message: "Error al reactivar asignatura" });
  }
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
    ],
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
    ],
  );
  res.send({ message: "Asignatura actualizada" });
});
// DELETE Asignatura (Soft Delete)
adminRouter.delete("/asignaturas/:id", async (req, res) => {
  try {
    await db.query("UPDATE asignaturas SET activo = 0 WHERE id = ?", [
      req.params.id,
    ]);
    res.send({ message: "Asignatura enviada a la papelera" });
  } catch (error) {
    res.status(500).send({ message: "Error al eliminar asignatura" });
  }
});
// --- RUTAS PAPELERA ASIGNATURAS ---

// GET Eliminadas
adminRouter.get("/asignaturas/eliminadas", async (req, res) => {
  try {
    const sql = `
      SELECT a.*, p.nombre_plan, t.nombre_tipo, g.nombre_grado 
      FROM asignaturas a
      LEFT JOIN planes_estudio p ON a.plan_estudio_id = p.id
      LEFT JOIN tipos_asignatura t ON a.tipo_asignatura_id = t.id
      LEFT JOIN grados g ON a.grado_id = g.id
      WHERE a.activo = 0
    `;
    const [rows] = await db.query(sql);
    res.json(rows);
  } catch (error) {
    res.status(500).send({ message: "Error al obtener papelera" });
  }
});

// PUT Reactivar
adminRouter.put("/asignaturas/:id/reactivar", async (req, res) => {
  try {
    await db.query("UPDATE asignaturas SET activo = 1 WHERE id = ?", [
      req.params.id,
    ]);
    res.send({ message: "Asignatura recuperada correctamente" });
  } catch (error) {
    res.status(500).send({ message: "Error al reactivar asignatura" });
  }
});
// GET Listado de Grupos (ACTIVOS Y FINALIZADOS)
adminRouter.get("/grupos", async (req, res) => {
  try {
    const sql = `
      SELECT g.*, p.nombre_plan, gr.nombre_grado 
      FROM grupos g
      LEFT JOIN planes_estudio p ON g.plan_estudio_id = p.id
      LEFT JOIN grados gr ON g.grado_id = gr.id
      -- Solo excluimos si tuvieras una columna 'eliminado', si no, quitamos el WHERE o filtramos basura
      -- Si usas soft delete: WHERE g.activo = 1 
      ORDER BY g.estatus ASC, g.nombre_grupo ASC
    `;
    const [rows] = await db.query(sql);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Error al obtener grupos" });
  }
});

// A) MODIFICAR: GET Detalles del Grupo (AHORA SOLO TRAE MATERIAS MANUALES)
adminRouter.get("/grupos/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [grupo] = await db.query("SELECT * FROM grupos WHERE id = ?", [id]);
    if (grupo.length === 0)
      return res.status(404).send({ message: "Grupo no encontrado" });
    const datosGrupo = grupo[0];

    // CAMBIO CLAVE: Usamos INNER JOIN con la tabla de relación.
    // Si no está en 'grupo_asignaturas_docentes', NO SALE.
    const sqlAsignaturas = `
      SELECT 
        a.id, 
        a.nombre_asignatura, 
        a.clave_asignatura, 
        gad.docente_id,
        u.nombre as nombre_docente,
        u.apellido_paterno as apellido_docente
      FROM grupo_asignaturas_docentes gad
      JOIN asignaturas a ON gad.asignatura_id = a.id
      LEFT JOIN usuarios u ON gad.docente_id = u.id
      WHERE gad.grupo_id = ?
      ORDER BY a.nombre_asignatura ASC
    `;

    const [asignaturas] = await db.query(sqlAsignaturas, [id]);

    const sqlAlumnos = `
      SELECT u.id, u.nombre, u.apellido_paterno, u.apellido_materno, u.email
      FROM usuarios u
      JOIN grupo_alumnos ga ON u.id = ga.alumno_id
      WHERE ga.grupo_id = ?
      ORDER BY u.apellido_paterno ASC
    `;
    const [alumnos] = await db.query(sqlAlumnos, [id]);

    res.json({ grupo: datosGrupo, asignaturas, alumnos });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Error al cargar grupo" });
  }
});

// --- RUTA ACTUALIZADA: Agregar Materia + Push Android ---
adminRouter.post("/grupos/:id/agregar-materia", async (req, res) => {
  const { id } = req.params;
  const { asignatura_id } = req.body;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Agregar materia
    await connection.query(
      "INSERT INTO grupo_asignaturas_docentes (grupo_id, asignatura_id, docente_id) VALUES (?, ?, NULL)",
      [id, asignatura_id],
    );

    // 2. Datos para el mensaje
    const [info] = await connection.query(
      "SELECT a.nombre_asignatura, g.nombre_grupo FROM asignaturas a, grupos g WHERE a.id = ? AND g.id = ?",
      [asignatura_id, id],
    );
    const mensaje = `Nueva materia agregada: "${info[0].nombre_asignatura}" en tu grupo.`;

    // 3. Obtener alumnos
    const [alumnos] = await connection.query(
      "SELECT alumno_id FROM grupo_alumnos WHERE grupo_id = ?",
      [id],
    );

    if (alumnos.length > 0) {
      // Lista de IDs para buscar tokens
      const idsAlumnos = alumnos.map((a) => a.alumno_id);

      // A) Insertar Campanita (BD)
      for (const idAlum of idsAlumnos) {
        await connection.query(
          "INSERT INTO notificaciones (usuario_id, mensaje, leido, fecha, tipo) VALUES (?, ?, 0, NOW(), 'sistema')",
          [idAlum, mensaje],
        );
      }

      // B) --- ENVIAR PUSH MASIVO (ANDROID) ---
      // Buscamos tokens de TODOS estos alumnos
      const [tokens] = await connection.query(
        "SELECT token FROM push_tokens WHERE user_id IN (?)",
        [idsAlumnos],
      );

      if (tokens.length > 0) {
        const expoMessages = tokens.map((t) => ({
          to: t.token,
          sound: "default",
          title: "Carga Académica Actualizada",
          body: mensaje,
        }));

        await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(expoMessages),
        });
      }
    }

    await connection.commit();
    res.send({ message: "Materia agregada." });
  } catch (error) {
    await connection.rollback();
    if (error.code === "ER_DUP_ENTRY")
      return res.status(400).send({ message: "Materia ya existe." });
    console.error(error);
    res.status(500).send({ message: "Error" });
  } finally {
    connection.release();
  }
});

// C) NUEVA: Eliminar Materia del Grupo
adminRouter.delete(
  "/grupos/:id/quitar-materia/:asignaturaId",
  async (req, res) => {
    const { id, asignaturaId } = req.params;
    try {
      await db.query(
        "DELETE FROM grupo_asignaturas_docentes WHERE grupo_id = ? AND asignatura_id = ?",
        [id, asignaturaId],
      );
      res.send({ message: "Materia quitada del grupo" });
    } catch (error) {
      res.status(500).send({ message: "Error al quitar materia" });
    }
  },
);

// D) NUEVA: Listar Materias Disponibles (Para el Select)
// Trae todas las materias que NO están ya en este grupo
adminRouter.get("/grupos/:id/materias-disponibles", async (req, res) => {
  const { id } = req.params;
  try {
    const sql = `
      SELECT * FROM asignaturas 
      WHERE activo = 1 
      AND id NOT IN (SELECT asignatura_id FROM grupo_asignaturas_docentes WHERE grupo_id = ?)
      ORDER BY nombre_asignatura ASC
    `;
    const [rows] = await db.query(sql, [id]);
    res.json(rows);
  } catch (error) {
    res.status(500).send({ message: "Error al cargar materias disponibles" });
  }
});

// 2. PUT CERRAR GRUPO (VALIDANDO CALIFICACIONES)
adminRouter.put("/grupos/:id/finalizar", async (req, res) => {
  const { id } = req.params;
  try {
    // Buscamos si falta alguna calificación
    // (Alumno del grupo + Materia del plan) QUE NO TENGA registro en 'calificaciones'
    const sqlFaltantes = `
      SELECT u.nombre, u.apellido_paterno, a.nombre_asignatura
      FROM grupo_alumnos ga
      JOIN grupos g ON ga.grupo_id = g.id
      JOIN asignaturas a ON a.plan_estudio_id = g.plan_estudio_id AND a.grado_id = g.grado_id AND a.activo = 1
      JOIN usuarios u ON ga.alumno_id = u.id
      LEFT JOIN calificaciones c ON c.alumno_id = ga.alumno_id AND c.asignatura_id = a.id AND c.grupo_id = ga.grupo_id
      WHERE ga.grupo_id = ? AND c.id IS NULL
    `;

    const [faltantes] = await db.query(sqlFaltantes, [id]);

    if (faltantes.length > 0) {
      const total = faltantes.length;
      const ejemplo = `${faltantes[0].nombre} en ${faltantes[0].nombre_asignatura}`;
      return res.status(400).send({
        message: `No se puede cerrar: Faltan ${total} calificaciones. (Ej: ${ejemplo})`,
      });
    }

    // Si todo ok, cerramos
    await db.query("UPDATE grupos SET estatus = 'finalizado' WHERE id = ?", [
      id,
    ]);
    res.send({ message: "Grupo cerrado exitosamente." });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Error al cerrar grupo" });
  }
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
    ],
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
    ],
  );
  res.send({ message: "Grupo actualizado" });
});
adminRouter.delete("/grupos/:id", async (req, res) => {
  try {
    // En lugar de DELETE, hacemos UPDATE al estatus
    await db.query("UPDATE grupos SET estatus = 'inactivo' WHERE id = ?", [
      req.params.id,
    ]);
    res.send({ message: "Grupo enviado a la papelera (inactivo)" });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Error al desactivar el grupo" });
  }
});
// --- NUEVAS RUTAS PARA PAPELERA DE GRUPOS ---

// GET /grupos/eliminados (Ver inactivos)
adminRouter.get("/grupos/eliminados", async (req, res) => {
  const sql = `
        SELECT g.*, c.nombre_ciclo, s.nombre_sede, p.nombre_plan, gr.nombre_grado
        FROM grupos g
        JOIN ciclos c ON g.ciclo_id = c.id
        JOIN sedes s ON g.sede_id = s.id
        JOIN planes_estudio p ON g.plan_estudio_id = p.id
        JOIN grados gr ON g.grado_id = gr.id
        WHERE g.estatus = 'inactivo'
        ORDER BY g.nombre_grupo ASC
    `;
  try {
    res.json((await db.query(sql))[0]);
  } catch (error) {
    res.status(500).send({ message: "Error al obtener papelera de grupos" });
  }
});

// PUT Reactivar Grupo
adminRouter.put("/grupos/:id/reactivar", async (req, res) => {
  try {
    await db.query("UPDATE grupos SET estatus = 'activo' WHERE id = ?", [
      req.params.id,
    ]);
    res.send({ message: "Grupo reactivado correctamente" });
  } catch (error) {
    res.status(500).send({ message: "Error al reactivar grupo" });
  }
});
// PUT Cerrar Grupo (Con validación estricta de calificaciones)
adminRouter.put("/grupos/:id/finalizar", async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Obtener datos del grupo para saber plan y grado
    const [grupo] = await db.query("SELECT * FROM grupos WHERE id = ?", [id]);
    if (grupo.length === 0)
      return res.status(404).send({ message: "Grupo no encontrado" });

    const { plan_estudio_id, grado_id } = grupo[0];

    // 2. LA CONSULTA MAESTRA: Buscar qué falta
    // Busca: Alumnos del grupo + Materias del plan/grado - Calificaciones existentes
    const sqlFaltantes = `
      SELECT 
        u.nombre, u.apellido_paterno, 
        a.nombre_asignatura
      FROM grupo_alumnos ga
      -- Cruzamos con las materias que DEBERÍAN tener
      JOIN asignaturas a 
        ON a.plan_estudio_id = ? AND a.grado_id = ? AND a.activo = 1
      JOIN usuarios u 
        ON ga.alumno_id = u.id
      -- Buscamos si existe la calificación
      LEFT JOIN calificaciones c 
        ON c.alumno_id = ga.alumno_id 
        AND c.asignatura_id = a.id
      -- FILTRO: Donde NO hay calificación (IS NULL) y el alumno pertenece al grupo
      WHERE ga.grupo_id = ? 
        AND c.id IS NULL
    `;

    const [faltantes] = await db.query(sqlFaltantes, [
      plan_estudio_id,
      grado_id,
      id,
    ]);

    // 3. Si hay faltantes, NO dejamos cerrar
    if (faltantes.length > 0) {
      // Preparamos un mensaje bonito con los primeros 3 ejemplos
      const ejemplos = faltantes
        .slice(0, 3)
        .map((f) => `${f.nombre} en ${f.nombre_asignatura}`)
        .join(", ");
      const total = faltantes.length;
      return res.status(400).send({
        message: `No se puede cerrar. Faltan ${total} calificaciones. Ej: ${ejemplos}...`,
      });
    }

    // 4. Si todo está perfecto, cerramos el grupo
    await db.query("UPDATE grupos SET estatus = 'finalizado' WHERE id = ?", [
      id,
    ]);

    res.send({
      message:
        "Ciclo cerrado correctamente. El grupo ahora está finalizado y listo para migrar.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Error al intentar cerrar el grupo" });
  }
});
// --- FIN RUTAS NUEVAS ---
adminRouter.post("/grupos/:id/asignar-docente", async (req, res) => {
  const { asignatura_id, docente_id } = req.body;
  const grupo_id = req.params.id;
  await db.query(
    "INSERT INTO grupo_asignaturas_docentes (grupo_id, asignatura_id, docente_id) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE docente_id = ?",
    [grupo_id, asignatura_id, docente_id || null, docente_id || null], // Permite desasignar con null
  );
  res.send({ message: "Docente asignado/actualizado" });
});

// POST Inscribir Alumno (Con validación de Grupo Único)
adminRouter.post("/grupos/:id/inscribir-alumno", async (req, res) => {
  const grupo_id = req.params.id;
  const { alumno_id } = req.body;
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // 1. VALIDACIÓN DE SEGURIDAD: Verificar si ya tiene grupo
    const [existingGroup] = await connection.query(
      `SELECT g.nombre_grupo 
       FROM grupo_alumnos ga
       JOIN grupos g ON ga.grupo_id = g.id
       WHERE ga.alumno_id = ?`,
      [alumno_id],
    );

    if (existingGroup.length > 0) {
      await connection.rollback();
      return res.status(400).send({
        message: `Este alumno ya pertenece al grupo "${existingGroup[0].nombre_grupo}". Usa la opción de Transferir.`,
      });
    }

    // 2. Inscribir al alumno al grupo
    await connection.query(
      "INSERT INTO grupo_alumnos (grupo_id, alumno_id) VALUES (?, ?)",
      [grupo_id, alumno_id],
    );

    // 3. Cambiar rol de 'aspirante' a 'alumno'
    await connection.query(
      "UPDATE usuarios SET rol = 'alumno' WHERE id = ? AND rol = 'aspirante'",
      [alumno_id],
    );

    // 4. Lógica Financiera (Generar Adeudos)
    const [conceptosInscripcion] = await connection.query(
      "SELECT id, monto_default FROM conceptos_pago WHERE es_concepto_inscripcion = TRUE",
    );

    if (conceptosInscripcion.length > 0) {
      const adeudos = conceptosInscripcion.map((concepto) => [
        alumno_id,
        concepto.id,
        concepto.monto_default,
        "pendiente",
        new Date(),
      ]);

      await connection.query(
        "INSERT INTO adeudos_alumnos (alumno_id, concepto_id, monto_a_pagar, estatus_pago, fecha_vencimiento) VALUES ?",
        [adeudos],
      );
    }

    await connection.commit();
    res.status(201).send({ message: "Alumno inscrito y adeudos generados" });
  } catch (error) {
    await connection.rollback();
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
      [grupo_id, alumnoId],
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
      [sourceGroupId],
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
      [values],
    );

    // 4. (Opcional pero recomendado) Cambiar el estado del grupo origen a 'inactivo' si no lo está ya
    await connection.query(
      "UPDATE grupos SET estatus = 'inactivo' WHERE id = ?",
      [sourceGroupId],
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

// --- RUTA ACTUALIZADA: Transferencia Inteligente (Mueve Alumno + Calificaciones) ---
adminRouter.post("/grupos/transferir-alumno", async (req, res) => {
  const { alumnoId, sourceGroupId, destinationGroupId } = req.body;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Verificar que el alumno esté en el grupo origen
    const [check] = await connection.query(
      "SELECT * FROM grupo_alumnos WHERE grupo_id = ? AND alumno_id = ?",
      [sourceGroupId, alumnoId],
    );
    if (check.length === 0) {
      await connection.rollback();
      return res
        .status(404)
        .send({ message: "El alumno no pertenece al grupo origen." });
    }

    // 2. Mover al alumno (Cambiar de Grupo)
    await connection.query(
      "UPDATE grupo_alumnos SET grupo_id = ? WHERE grupo_id = ? AND alumno_id = ?",
      [destinationGroupId, sourceGroupId, alumnoId],
    );

    // 3. --- MUDANZA DE CALIFICACIONES (LA MAGIA) ---
    // Buscamos calificaciones del alumno en el grupo VIEJO
    const [calificacionesViejas] = await connection.query(
      "SELECT id, asignatura_id FROM calificaciones WHERE alumno_id = ? AND grupo_id = ?",
      [alumnoId, sourceGroupId],
    );

    let notasMovidas = 0;

    // Para cada calificación vieja...
    for (const calif of calificacionesViejas) {
      // Verificamos si la materia existe en el grupo NUEVO (o si es compatible)
      // Como las materias son independientes del grupo (están en la tabla asignaturas),
      // simplemente verificamos si queremos mover la nota.

      // Validamos si esa asignatura "existe" en el nuevo grupo (está asignada)
      // Esto es opcional, pero recomendado para no mover basura.
      const [materiaEnNuevoGrupo] = await connection.query(
        "SELECT * FROM grupo_asignaturas_docentes WHERE grupo_id = ? AND asignatura_id = ?",
        [destinationGroupId, calif.asignatura_id],
      );

      // Si la materia existe en el nuevo grupo (o si decides moverlas siempre), actualizamos
      if (materiaEnNuevoGrupo.length > 0) {
        await connection.query(
          "UPDATE calificaciones SET grupo_id = ? WHERE id = ?",
          [destinationGroupId, calif.id],
        );
        notasMovidas++;
      }
    }

    // 4. Registrar en historial (Opcional pero útil)
    const mensaje = `Transferido del grupo ${sourceGroupId} al ${destinationGroupId}. Se migraron ${notasMovidas} calificaciones.`;
    await connection.query(
      "INSERT INTO notificaciones (usuario_id, mensaje, leido, fecha, tipo) VALUES (?, ?, 0, NOW(), 'sistema')",
      [alumnoId, mensaje],
    );

    await connection.commit();
    res.send({
      message: `Alumno transferido exitosamente. Se migraron ${notasMovidas} calificaciones.`,
    });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).send({ message: "Error al transferir alumno" });
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
  },
);
adminRouter.get("/aspirantes/:id/expediente", async (req, res) => {
  const { id } = req.params;
  const [docs] = await db.query(
    "SELECT * FROM expediente_aspirantes WHERE aspirante_id = ?",
    [id],
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
  },
);
adminRouter.delete("/expedientes/:id", async (req, res) => {
  const { id } = req.params;
  const [[doc]] = await db.query(
    "SELECT * FROM expediente_aspirantes WHERE id = ?",
    [id],
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

// --- MÓDULO MIGRACIÓN ---

// 1. Ejecutar Migración de Grupo (CORREGIDO: Incluye 'cupo' y 'sede_id')
adminRouter.post("/migracion/ejecutar", async (req, res) => {
  const { grupoOrigenId, nombreNuevo, cicloNuevoId, gradoNuevoId, modalidad } =
    req.body;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // A) Obtener datos del grupo viejo
    const [origen] = await connection.query(
      "SELECT * FROM grupos WHERE id = ?",
      [grupoOrigenId],
    );
    if (origen.length === 0) throw new Error("Grupo origen no encontrado");
    const infoOrigen = origen[0];

    // B) Cerrar el grupo viejo
    await connection.query(
      "UPDATE grupos SET estatus = 'finalizado' WHERE id = ?",
      [grupoOrigenId],
    );

    // C) Crear el NUEVO Grupo (AGREGAMOS 'sede_id')
    const [resGrupo] = await connection.query(
      `INSERT INTO grupos (
          nombre_grupo, 
          plan_estudio_id, 
          grado_id, 
          ciclo_id, 
          modalidad, 
          estatus, 
          cupo, 
          sede_id  -- <--- CAMPO NUEVO
       )
       VALUES (?, ?, ?, ?, ?, 'activo', ?, ?)`, // <--- AGREGAMOS UN ? AL FINAL
      [
        nombreNuevo,
        infoOrigen.plan_estudio_id,
        gradoNuevoId,
        cicloNuevoId,
        modalidad || infoOrigen.modalidad,
        infoOrigen.cupo || 35,
        infoOrigen.sede_id, // <--- COPIAMOS LA SEDE DEL GRUPO ANTERIOR
      ],
    );
    const nuevoGrupoId = resGrupo.insertId;

    // D) Mover a los alumnos
    const [alumnos] = await connection.query(
      "SELECT alumno_id FROM grupo_alumnos WHERE grupo_id = ?",
      [grupoOrigenId],
    );

    if (alumnos.length > 0) {
      const values = alumnos.map((a) => [nuevoGrupoId, a.alumno_id]);
      await connection.query(
        "INSERT INTO grupo_alumnos (grupo_id, alumno_id) VALUES ?",
        [values],
      );
    }

    await connection.commit();
    res.send({
      message: `Migración exitosa. Se creó el grupo "${nombreNuevo}" con ${alumnos.length} alumnos.`,
    });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).send({ message: "Error al migrar grupo" });
  } finally {
    connection.release();
  }
});

apiRouter.use("/admin", adminRouter); // Registra el router de admin en /api/admin

// --- AGREGA ESTA FUNCIÓN HELPER ---
// Verifica si un usuario (por ID y Rol) pertenece a un curso (grupo+asignatura)
async function checkUserCourseMembership(
  userId,
  userRol,
  grupoId,
  asignaturaId,
) {
  if (userRol === "docente") {
    const [[curso]] = await db.query(
      "SELECT * FROM grupo_asignaturas_docentes WHERE grupo_id = ? AND asignatura_id = ? AND docente_id = ?",
      [grupoId, asignaturaId, userId],
    );
    return !!curso; // Devuelve true si el docente da esta clase
  } else if (userRol === "alumno") {
    const [[inscripcion]] = await db.query(
      "SELECT * FROM grupo_alumnos WHERE grupo_id = ? AND alumno_id = ?",
      [grupoId, userId],
    );
    // Adicionalmente, verificamos que la asignatura pertenezca al plan/grado del grupo
    const [[grupoPlanGrado]] = await db.query(
      "SELECT plan_estudio_id, grado_id FROM grupos WHERE id = ?",
      [grupoId],
    );
    if (!grupoPlanGrado) return false;
    const [[asignaturaValida]] = await db.query(
      "SELECT id FROM asignaturas WHERE id = ? AND plan_estudio_id = ? AND grado_id = ?",
      [asignaturaId, grupoPlanGrado.plan_estudio_id, grupoPlanGrado.grado_id],
    );
    return !!inscripcion && !!asignaturaValida; // Devuelve true si está inscrito y la materia es del grupo
  } else if (userRol === "admin") {
    return true; // El admin tiene acceso a todo (podríamos refinar esto si quisiéramos)
  }
  return false; // Otros roles no tienen acceso
}
// --- FIN FUNCIÓN HELPER ---

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
  },
);
// --- RUTA BORRADA --- Ya no es necesaria, la movimos a /admin
// docenteRouter.post("/calificar", ... );
// --- INICIA NUEVO CÓDIGO (AGREGAR) ---

// Función helper para asegurar que existe una config (se usará en GET)
async function getOrCreateAulaConfig(grupoId, asignaturaId) {
  // Primero, intenta insertarlo. Si ya existe, 'IGNORE' no hará nada.
  await db.query(
    "INSERT IGNORE INTO aula_virtual_config (grupo_id, asignatura_id) VALUES (?, ?)",
    [grupoId, asignaturaId],
  );
  // Luego, selecciónalo. Ahora estamos seguros de que existe.
  const [[config]] = await db.query(
    `SELECT avc.*, g.modalidad, g.estatus 
     FROM aula_virtual_config avc
     JOIN grupos g ON avc.grupo_id = g.id 
     WHERE avc.grupo_id = ? AND avc.asignatura_id = ?`,
    [grupoId, asignaturaId],
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
        [grupoId, asignaturaId, req.user.id],
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
  },
);

// PUT (Docente): Actualizar la config del aula virtual
// PUT (Docente): Actualizar la config del aula virtual
docenteRouter.put(
  "/aula-virtual/:grupoId/:asignaturaId/config",
  async (req, res) => {
    try {
      const { grupoId, asignaturaId } = req.params;
      // Extraemos los nuevos campos del body
      const {
        enlace_videollamada,
        descripcion_curso,
        objetivos,
        evaluacion,
        horario,
        contacto_docente,
      } = req.body;

      // Validar que el docente da esta clase (igual que antes)
      const [[curso]] = await db.query(
        "SELECT * FROM grupo_asignaturas_docentes WHERE grupo_id = ? AND asignatura_id = ? AND docente_id = ?",
        [grupoId, asignaturaId, req.user.id],
      );
      if (!curso) {
        return res
          .status(403)
          .send({ message: "No tienes permiso sobre este curso." });
      }

      // Actualizamos la query INSERT...ON DUPLICATE KEY UPDATE
      const sql = `
        INSERT INTO aula_virtual_config (
          grupo_id, asignatura_id, enlace_videollamada, descripcion_curso, 
          objetivos, evaluacion, horario, contacto_docente 
        ) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?) 
        ON DUPLICATE KEY UPDATE 
          enlace_videollamada = VALUES(enlace_videollamada), 
          descripcion_curso = VALUES(descripcion_curso),
          objetivos = VALUES(objetivos),
          evaluacion = VALUES(evaluacion),
          horario = VALUES(horario),
          contacto_docente = VALUES(contacto_docente)
      `;

      // Añadimos los nuevos valores al array de parámetros
      const params = [
        grupoId,
        asignaturaId,
        enlace_videollamada || null,
        descripcion_curso || null,
        objetivos || null,
        evaluacion || null,
        horario || null,
        contacto_docente || null,
      ];

      await db.query(sql, params);

      // --- INICIA EL NUEVO CÓDIGO DE NOTIFICACIÓN ---
      try {
        const docenteNombre = `${req.user.nombre} ${req.user.apellido_paterno}`;
        const mensaje = `${docenteNombre} actualizó la información del curso.`;
        // (grupoId y asignaturaId están disponibles en req.params)
        const urlDestino = `/alumno/grupo/${grupoId}/asignatura/${asignaturaId}/aula`;

        // 1. Obtener alumnos del grupo
        const [alumnos] = await db.query(
          "SELECT alumno_id FROM grupo_alumnos WHERE grupo_id = ?",
          [grupoId],
        );

        if (alumnos.length > 0) {
          // 2. Preparar notificaciones
          const notificacionesParaInsertar = alumnos.map((alumno) => [
            alumno.alumno_id,
            mensaje,
            urlDestino,
          ]);

          // 3. Insertar
          await db.query(
            "INSERT INTO notificaciones (user_id, mensaje, url_destino) VALUES ?",
            [notificacionesParaInsertar],
          );
        }
      } catch (notifError) {
        console.error("Error al crear notificaciones de config:", notifError);
      }
      // --- TERMINA EL NUEVO CÓDIGO DE NOTIFICACIÓN ---

      res.send({ message: "Aula virtual actualizada con éxito." });
    } catch (error) {
      res.status(500).send({ message: "Error en el servidor." });
    }
  },
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
        [grupoId, asignaturaId, req.user.id],
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
        [grupoId, asignaturaId, req.user.id],
      );
      res.json(tareas);
    } catch (error) {
      console.error("Error al obtener tareas (docente):", error);
      res.status(500).send({ message: "Error en el servidor." });
    }
  },
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
        [grupoId, asignaturaId, docente_id],
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
        ],
      );

      const newTaskId = result.insertId;

      // --- INICIA CÓDIGO DE NOTIFICACIÓN (NUEVO) ---
      try {
        // 1. Obtener el nombre de la asignatura
        const [[asignatura]] = await db.query(
          "SELECT nombre_asignatura FROM asignaturas WHERE id = ?",
          [asignaturaId],
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
          [grupoId],
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
            [notifData],
          );

          // 5. Enviar Notificaciones Push (móvil)
          const [tokens] = await db.query(
            "SELECT token FROM push_tokens WHERE user_id IN (?)",
            [alumnoIds],
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
  },
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
        [entregaId],
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
        [calNum, comentario_docente || null, entregaId],
      );

      // --- 3. Notificar al Alumno ---
      try {
        const mensaje = `¡Calificación recibida! (${calNum}/100) en la tarea '${entrega.titulo}'`;
        const urlDestino = `/alumno/grupo/${entrega.grupo_id}/asignatura/${entrega.asignatura_id}/aula`;

        // Notificación de campanita (web)
        await db.query(
          "INSERT INTO notificaciones (user_id, mensaje, url_destino) VALUES (?, ?, ?)",
          [entrega.alumno_id, mensaje, urlDestino],
        );

        // Notificación Push (móvil)
        const [tokens] = await db.query(
          "SELECT token FROM push_tokens WHERE user_id = ?",
          [entrega.alumno_id],
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
          `Notificación de calificación enviada al alumno ${entrega.alumno_id}`,
        );
      } catch (notifError) {
        console.error(
          "Error al notificar al alumno sobre calificación:",
          notifError,
        );
      }
      // --- Fin de Notificación ---

      res.send({ message: "Calificación guardada con éxito." });
    } catch (error) {
      console.error("Error al calificar entrega:", error);
      res.status(500).send({ message: "Error en el servidor." });
    }
  },
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
      [tareaId, docente_id],
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
      [tareaId, tarea.grupo_id],
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
        ],
      );

      // --- INICIA EL NUEVO CÓDIGO DE NOTIFICACIÓN ---
      try {
        const docenteNombre = `${req.user.nombre} ${req.user.apellido_paterno}`;
        const mensaje = `${docenteNombre} agregó un nuevo recurso (archivo): '${titulo}'`;
        const urlDestino = `/alumno/grupo/${grupoId}/asignatura/${asignaturaId}/aula`;

        // 1. Obtener alumnos del grupo
        const [alumnos] = await db.query(
          "SELECT alumno_id FROM grupo_alumnos WHERE grupo_id = ?",
          [grupoId],
        );

        if (alumnos.length > 0) {
          // 2. Preparar notificaciones
          const notificacionesParaInsertar = alumnos.map((alumno) => [
            alumno.alumno_id,
            mensaje,
            urlDestino,
          ]);

          // 3. Insertar
          await db.query(
            "INSERT INTO notificaciones (user_id, mensaje, url_destino) VALUES ?",
            [notificacionesParaInsertar],
          );
        }
      } catch (notifError) {
        console.error(
          "Error al crear notificaciones de recurso (archivo):",
          notifError,
        );
      }
      // --- TERMINA EL NUEVO CÓDIGO DE NOTIFICACIÓN ---

      res.status(201).send({ message: "Archivo subido con éxito." });
    } catch (error) {
      console.error("Error al subir recurso archivo:", error);
      res.status(500).send({ message: "Error en el servidor." });
    }
  },
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
        [grupoId, asignaturaId, docente_id, titulo, url],
      );

      // --- INICIA EL NUEVO CÓDIGO DE NOTIFICACIÓN ---
      try {
        const docenteNombre = `${req.user.nombre} ${req.user.apellido_paterno}`;
        const mensaje = `${docenteNombre} agregó un nuevo recurso (enlace): '${titulo}'`;
        const urlDestino = `/alumno/grupo/${grupoId}/asignatura/${asignaturaId}/aula`;

        // 1. Obtener alumnos del grupo
        const [alumnos] = await db.query(
          "SELECT alumno_id FROM grupo_alumnos WHERE grupo_id = ?",
          [grupoId],
        );

        if (alumnos.length > 0) {
          // 2. Preparar notificaciones
          const notificacionesParaInsertar = alumnos.map((alumno) => [
            alumno.alumno_id,
            mensaje,
            urlDestino,
          ]);

          // 3. Insertar
          await db.query(
            "INSERT INTO notificaciones (user_id, mensaje, url_destino) VALUES ?",
            [notificacionesParaInsertar],
          );
        }
      } catch (notifError) {
        console.error(
          "Error al crear notificaciones de recurso (enlace):",
          notifError,
        );
      }
      // --- TERMINA EL NUEVO CÓDIGO DE NOTIFICACIÓN ---

      res.status(201).send({ message: "Enlace guardado con éxito." });
    } catch (error) {
      console.error("Error al guardar recurso enlace:", error);
      res.status(500).send({ message: "Error en el servidor." });
    }
  },
);

// DELETE (Docente): Borrar un recurso
docenteRouter.delete("/aula-virtual/recurso/:recursoId", async (req, res) => {
  try {
    const { recursoId } = req.params;
    const docente_id = req.user.id;

    // 1. Validar que el recurso existe y pertenece al docente
    const [[recurso]] = await db.query(
      "SELECT * FROM recursos_clase WHERE id = ? AND docente_id = ?",
      [recursoId, docente_id],
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
      [grupoId, asignaturaId],
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
  getRecursosClase,
);

// --- INICIA NUEVO CÓDIGO (AGREGAR) ---

// POST (Docente): Iniciar/Crear una Sesión de Clase para hoy
docenteRouter.post(
  "/aula-virtual/:grupoId/:asignaturaId/iniciar-sesion",
  async (req, res) => {
    try {
      const { grupoId, asignaturaId } = req.params;
      const docente_id = req.user.id;
      const { tema_sesion } = req.body; // Opcional
      const fecha_sesion = new Date().toISOString().slice(0, 10); // Fecha de hoy YYYY-MM-DD

      // Validar permiso
      const [[curso]] = await db.query(
        "SELECT * FROM grupo_asignaturas_docentes WHERE grupo_id = ? AND asignatura_id = ? AND docente_id = ?",
        [grupoId, asignaturaId, docente_id],
      );
      if (!curso) {
        return res.status(403).send({ message: "No tienes permiso." });
      }

      // Intentar insertar la sesión. Si ya existe para hoy, simplemente la obtendremos.
      await db.query(
        "INSERT IGNORE INTO clases_sesiones (grupo_id, asignatura_id, docente_id, fecha_sesion, tema_sesion) VALUES (?, ?, ?, ?, ?)",
        [grupoId, asignaturaId, docente_id, fecha_sesion, tema_sesion || null],
      );

      // Obtener el ID de la sesión (ya sea la recién creada o la existente)
      const [[sesion]] = await db.query(
        "SELECT id FROM clases_sesiones WHERE grupo_id = ? AND asignatura_id = ? AND fecha_sesion = ?",
        [grupoId, asignaturaId, fecha_sesion],
      );

      res.status(200).json({ sesionId: sesion.id }); // Devolver el ID para redirigir
    } catch (error) {
      console.error("Error al iniciar sesión de clase:", error);
      res.status(500).send({ message: "Error en el servidor." });
    }
  },
);

// GET (Docente): Obtener la lista de alumnos y su asistencia para UNA sesión
docenteRouter.get(
  "/aula-virtual/sesion/:sesionId/asistencia",
  async (req, res) => {
    try {
      const { sesionId } = req.params;
      const docente_id = req.user.id;

      // 1. Validar que la sesión pertenece al docente
      const [[sesion]] = await db.query(
        "SELECT * FROM clases_sesiones WHERE id = ? AND docente_id = ?",
        [sesionId, docente_id],
      );
      if (!sesion) {
        return res
          .status(404)
          .send({ message: "Sesión no encontrada o no te pertenece." });
      }

      // 2. Obtener TODOS los alumnos del grupo de esa sesión
      //    y hacer LEFT JOIN con la tabla de asistencia para esa sesión.
      const [alumnosAsistencia] = await db.query(
        `SELECT
          u.id as alumno_id,
          u.nombre,
          u.apellido_paterno,
          u.apellido_materno,
          COALESCE(a.estatus, 'ausente') as estatus -- Si no hay registro, por defecto es 'ausente'
       FROM grupo_alumnos ga
       JOIN usuarios u ON ga.alumno_id = u.id
       LEFT JOIN asistencia a ON a.alumno_id = u.id AND a.sesion_id = ?
       WHERE ga.grupo_id = ?`, // Usamos el grupo_id de la sesión
        [sesionId, sesion.grupo_id],
      );

      res.json({ sesion, alumnos: alumnosAsistencia });
    } catch (error) {
      console.error("Error al obtener lista de asistencia:", error);
      res.status(500).send({ message: "Error en el servidor." });
    }
  },
);

// POST (Docente): Guardar/Actualizar la asistencia para UNA sesión
docenteRouter.post(
  "/aula-virtual/sesion/:sesionId/asistencia",
  async (req, res) => {
    try {
      const { sesionId } = req.params;
      const docente_id = req.user.id;
      // Esperamos un objeto: { alumnoId1: 'presente', alumnoId2: 'ausente', ... }
      const asistencias = req.body.asistencias;

      if (!asistencias || typeof asistencias !== "object") {
        return res
          .status(400)
          .send({ message: "Formato de datos incorrecto." });
      }

      // 1. Validar que la sesión pertenece al docente
      const [[sesion]] = await db.query(
        "SELECT id FROM clases_sesiones WHERE id = ? AND docente_id = ?",
        [sesionId, docente_id],
      );
      if (!sesion) {
        return res
          .status(404)
          .send({ message: "Sesión no encontrada o no te pertenece." });
      }

      // 2. Usar una transacción para insertar/actualizar todas las asistencias
      const connection = await db.getConnection();
      try {
        await connection.beginTransaction();
        const promises = [];
        for (const alumnoId in asistencias) {
          const estatus = asistencias[alumnoId];
          // Validar estatus
          if (!["presente", "ausente", "justificado"].includes(estatus)) {
            throw new Error(
              `Estatus inválido '${estatus}' para alumno ${alumnoId}`,
            );
          }
          // Crear la query con ON DUPLICATE KEY UPDATE
          const sql = `
            INSERT INTO asistencia (sesion_id, alumno_id, estatus) 
            VALUES (?, ?, ?) 
            ON DUPLICATE KEY UPDATE estatus = VALUES(estatus)`;
          promises.push(connection.query(sql, [sesionId, alumnoId, estatus]));
        }
        await Promise.all(promises); // Ejecutar todas las queries
        await connection.commit(); // Confirmar transacción
        res.send({ message: "Asistencia guardada con éxito." });
      } catch (error) {
        await connection.rollback(); // Revertir en caso de error
        throw error; // Re-lanzar para el catch externo
      } finally {
        connection.release(); // Liberar conexión
      }
    } catch (error) {
      console.error("Error al guardar asistencia:", error);
      res.status(500).send({ message: "Error en el servidor." });
    }
  },
);

// Middleware para proteger rutas del foro
const canAccessForo = async (req, res, next) => {
  // --- AGREGA ESTAS DOS LÍNEAS ---
  console.log("canAccessForo Middleware - URL:", req.originalUrl);
  console.log("canAccessForo Middleware - Params:", req.params);
  // --- FIN AGREGAR ---
  if (!req.user) return res.status(401).send({ message: "No autenticado." });

  // Necesitamos grupoId y asignaturaId para verificar pertenencia
  // Intentamos obtenerlos de params o del body (para POST) o de la info del hilo (para respuestas)
  let grupoId, asignaturaId;
  if (req.params.grupoId && req.params.asignaturaId) {
    grupoId = req.params.grupoId;
    asignaturaId = req.params.asignaturaId;
  } else if (req.params.hiloId) {
    // Si estamos operando sobre un hilo, buscamos sus IDs
    const [[hiloInfo]] = await db.query(
      "SELECT grupo_id, asignatura_id FROM foros_hilos WHERE id = ?",
      [req.params.hiloId],
    );
    if (!hiloInfo)
      return res.status(404).send({ message: "Hilo no encontrado." });
    grupoId = hiloInfo.grupo_id;
    asignaturaId = hiloInfo.asignatura_id;
  } else {
    return res
      .status(400)
      .send({ message: "Faltan identificadores del curso." });
  }

  const hasAccess = await checkUserCourseMembership(
    req.user.id,
    req.user.rol,
    grupoId,
    asignaturaId,
  );
  if (!hasAccess) {
    return res
      .status(403)
      .send({ message: "No tienes permiso para acceder a este foro." });
  }
  // Si tiene acceso, guardamos los IDs para usarlos después si es necesario
  req.cursoInfo = { grupoId, asignaturaId };
  next();
};

const foroRouter = express.Router(); // Creamos un router específico para el foro

// foroRouter.use(canAccessForo);

// GET /api/foro/:grupoId/:asignaturaId/hilos - Obtener lista de hilos
foroRouter.get(
  "/:grupoId/:asignaturaId/hilos",
  canAccessForo,
  async (req, res) => {
    try {
      const [hilos] = await db.query(
        `SELECT fh.*, u.nombre as creador_nombre, u.apellido_paterno as creador_apellido, u.rol as creador_rol,
              (SELECT COUNT(*) FROM foros_respuestas fr WHERE fr.hilo_id = fh.id) as num_respuestas,
              (SELECT MAX(fecha_creacion) FROM foros_respuestas fr WHERE fr.hilo_id = fh.id) as ultima_respuesta_fecha
       FROM foros_hilos fh
       JOIN usuarios u ON fh.creado_por_usuario_id = u.id
       WHERE fh.grupo_id = ? AND fh.asignatura_id = ?
       ORDER BY ultima_respuesta_fecha DESC, fh.fecha_creacion DESC`, // Ordenar por actividad reciente
        [req.params.grupoId, req.params.asignaturaId],
      );
      res.json(hilos);
    } catch (error) {
      console.error("Error al obtener hilos del foro:", error);
      res.status(500).send({ message: "Error en el servidor." });
    }
  },
);

// POST /api/foro/:grupoId/:asignaturaId/hilos - Crear un nuevo hilo
foroRouter.post(
  "/:grupoId/:asignaturaId/hilos",
  canAccessForo,
  async (req, res) => {
    try {
      const { titulo, mensaje_original } = req.body;
      if (!titulo || !mensaje_original) {
        return res
          .status(400)
          .send({ message: "El título y el mensaje son requeridos." });
      }
      const [result] = await db.query(
        "INSERT INTO foros_hilos (grupo_id, asignatura_id, titulo, mensaje_original, creado_por_usuario_id) VALUES (?, ?, ?, ?, ?)",
        [
          req.params.grupoId,
          req.params.asignaturaId,
          titulo,
          mensaje_original,
          req.user.id,
        ],
      );

      // --- INICIA EL NUEVO CÓDIGO DE NOTIFICACIÓN ---
      try {
        const newHiloId = result.insertId;
        const creadorId = req.user.id;
        const creadorNombre = `${req.user.nombre} ${req.user.apellido_paterno}`;
        const mensaje = `${creadorNombre} inició un nuevo hilo: '${titulo}'`;
        const urlBase = `/grupo/${req.params.grupoId}/asignatura/${req.params.asignaturaId}/foro/hilo/${newHiloId}`;

        // 1. Obtener docente del curso
        const [[docente]] = await db.query(
          "SELECT docente_id FROM grupo_asignaturas_docentes WHERE grupo_id = ? AND asignatura_id = ?",
          [req.params.grupoId, req.params.asignaturaId],
        );

        // 2. Obtener alumnos del grupo
        const [alumnos] = await db.query(
          "SELECT alumno_id FROM grupo_alumnos WHERE grupo_id = ?",
          [req.params.grupoId],
        );

        const notificacionesParaInsertar = [];

        // 3. Notificar al docente (si no es el creador)
        if (docente && docente.docente_id !== creadorId) {
          notificacionesParaInsertar.push([
            docente.docente_id,
            mensaje,
            `/docente${urlBase}`, // URL para el docente
          ]);
        }

        // 4. Notificar a los alumnos (que no sean el creador)
        for (const alumno of alumnos) {
          if (alumno.alumno_id !== creadorId) {
            notificacionesParaInsertar.push([
              alumno.alumno_id,
              mensaje,
              `/alumno${urlBase}`, // URL para el alumno
            ]);
          }
        }

        // 5. Insertar todas las notificaciones
        if (notificacionesParaInsertar.length > 0) {
          await db.query(
            "INSERT INTO notificaciones (user_id, mensaje, url_destino) VALUES ?",
            [notificacionesParaInsertar],
          );
        }
        console.log(`Notificaciones creadas para nuevo hilo ${newHiloId}`);
      } catch (notifError) {
        console.error("Error al crear notificaciones de hilo:", notifError);
        // No detener la respuesta principal por esto
      }
      // --- TERMINA EL NUEVO CÓDIGO DE NOTIFICACIÓN ---

      res
        .status(201)
        .json({ message: "Hilo creado con éxito.", hiloId: result.insertId });
    } catch (error) {
      console.error("Error al crear hilo:", error);
      res.status(500).send({ message: "Error en el servidor." });
    }
  },
);

// GET /api/foro/hilo/:hiloId - Obtener detalles de un hilo y sus respuestas
foroRouter.get("/hilo/:hiloId", canAccessForo, async (req, res) => {
  try {
    const { hiloId } = req.params;
    // Obtener info del hilo
    const [[hilo]] = await db.query(
      `SELECT fh.*, u.nombre as creador_nombre, u.apellido_paterno as creador_apellido, u.rol as creador_rol
          FROM foros_hilos fh
          JOIN usuarios u ON fh.creado_por_usuario_id = u.id
          WHERE fh.id = ?`,
      [hiloId],
    );
    if (!hilo) return res.status(404).send({ message: "Hilo no encontrado." });

    // Obtener respuestas
    const [respuestas] = await db.query(
      `SELECT fr.*, u.nombre as creador_nombre, u.apellido_paterno as creador_apellido, u.rol as creador_rol
           FROM foros_respuestas fr
           JOIN usuarios u ON fr.creado_por_usuario_id = u.id
           WHERE fr.hilo_id = ?
           ORDER BY fr.fecha_creacion ASC`, // Mostrar respuestas en orden cronológico
      [hiloId],
    );

    res.json({ hilo, respuestas });
  } catch (error) {
    console.error("Error al obtener detalles del hilo:", error);
    res.status(500).send({ message: "Error en el servidor." });
  }
});

// POST /api/foro/hilo/:hiloId/respuestas - Publicar una respuesta
foroRouter.post("/hilo/:hiloId/respuestas", canAccessForo, async (req, res) => {
  try {
    const { mensaje } = req.body;
    if (!mensaje) {
      return res.status(400).send({ message: "El mensaje es requerido." });
    }
    await db.query(
      "INSERT INTO foros_respuestas (hilo_id, mensaje, creado_por_usuario_id) VALUES (?, ?, ?)",
      [req.params.hiloId, mensaje, req.user.id],
    );

    // --- INICIA EL NUEVO CÓDIGO DE NOTIFICACIÓN ---
    try {
      const { hiloId } = req.params;
      const replierId = req.user.id;
      const replierNombre = `${req.user.nombre} ${req.user.apellido_paterno}`;

      // 1. Obtener info del hilo (grupo, asignatura, título)
      const [[hilo]] = await db.query(
        "SELECT grupo_id, asignatura_id, titulo FROM foros_hilos WHERE id = ?",
        [hiloId],
      );

      if (!hilo) throw new Error("Hilo no encontrado para notificar");

      const { grupo_id, asignatura_id, titulo } = hilo;
      const mensaje = `${replierNombre} respondió en el hilo: '${titulo}'`;
      const urlBase = `/grupo/${grupo_id}/asignatura/${asignatura_id}/foro/hilo/${hiloId}`;

      // 2. Obtener todos los participantes (docente y alumnos)
      const [participantes] = await db.query(
        `(SELECT docente_id as user_id, 'docente' as rol FROM grupo_asignaturas_docentes WHERE grupo_id = ? AND asignatura_id = ?)
         UNION
         (SELECT alumno_id as user_id, 'alumno' as rol FROM grupo_alumnos WHERE grupo_id = ?)`,
        [grupo_id, asignatura_id, grupo_id],
      );

      const notificacionesParaInsertar = [];
      const notifiedUserIds = new Set();
      notifiedUserIds.add(replierId); // No notificar a quien respondió

      // 3. Iterar y construir notificaciones para todos los demás
      for (const p of participantes) {
        // Usamos Set.has() para asegurar que no notificamos al mismo usuario dos veces
        if (!notifiedUserIds.has(p.user_id)) {
          const urlDestino = `/${p.rol}${urlBase}`; // Crea la URL correcta (ej. /docente/... o /alumno/...)
          notificacionesParaInsertar.push([p.user_id, mensaje, urlDestino]);
          notifiedUserIds.add(p.user_id);
        }
      }

      // 4. Insertar todas las notificaciones
      if (notificacionesParaInsertar.length > 0) {
        await db.query(
          "INSERT INTO notificaciones (user_id, mensaje, url_destino) VALUES ?",
          [notificacionesParaInsertar],
        );
      }
      console.log(`Notificaciones creadas para respuesta en hilo ${hiloId}`);
    } catch (notifError) {
      console.error("Error al crear notificaciones de respuesta:", notifError);
      // No detener la respuesta principal por esto
    }
    // --- TERMINA EL NUEVO CÓDIGO DE NOTIFICACIÓN ---

    res.status(201).json({ message: "Respuesta publicada con éxito." });
  } catch (error) {
    console.error("Error al publicar respuesta:", error);
    res.status(500).send({ message: "Error en el servidor." });
  }
});

// Aplicar el middleware de protección a todas las rutas del foro y registrar el router
apiRouter.use("/foro", foroRouter);

// --- TERMINA NUEVO CÓDIGO (RUTAS FORO) ---

// --- RUTAS DE DOCENTE --- (Ahora estas líneas van después del bloque del foro)
// const docenteRouter = express.Router();
// docenteRouter.use(isDocente);
// // ... (resto de rutas de docente) ...
// apiRouter.use("/docente", docenteRouter);

apiRouter.use("/docente", docenteRouter); // Registra el router de docente en /api/docente

// --- RUTAS DE ALUMNO ---
const alumnoRouter = express.Router();

// --- INICIO: RUTAS DE SOLICITUDES (ALUMNO) ---

// GET /api/alumno/mis-solicitudes - Ver el historial de mis solicitudes
alumnoRouter.get("/mis-solicitudes", async (req, res) => {
  // Ya estamos protegidos por isAlumno, así que req.user existe
  const alumno_id = req.user.id;
  try {
    const [solicitudes] = await db.query(
      `SELECT id, tipo_solicitud, estatus, fecha_solicitud, fecha_ultima_actualizacion, comentarios_admin
       FROM solicitudes_alumnos
       WHERE alumno_id = ?
       ORDER BY fecha_solicitud DESC`,
      [alumno_id],
    );
    res.json(solicitudes);
  } catch (error) {
    console.error("Error al obtener mis solicitudes:", error);
    res.status(500).send({ message: "Error en el servidor" });
  }
});

// POST /api/alumno/solicitudes - Crear una nueva solicitud
alumnoRouter.post("/solicitudes", async (req, res) => {
  const alumno_id = req.user.id;
  const { tipo_solicitud, motivo } = req.body;

  if (!tipo_solicitud) {
    return res
      .status(400)
      .send({ message: "El tipo de solicitud es requerido." });
  }

  try {
    // 1. Insertar la solicitud en la base de datos
    await db.query(
      "INSERT INTO solicitudes_alumnos (alumno_id, tipo_solicitud, motivo, estatus) VALUES (?, ?, ?, 'solicitado')",
      [alumno_id, tipo_solicitud, motivo || null],
    );

    // --- 2. Notificar a los Administradores ---
    try {
      const alumnoNombre = `${req.user.nombre} ${req.user.apellido_paterno}`;
      const mensajeAdmin = `Nueva solicitud de '${tipo_solicitud}' recibida de: ${alumnoNombre}.`;
      const urlDestinoAdmin = "/admin/solicitudes"; // Link para que el admin vea la lista

      // Obtener IDs de todos los admins
      const [admins] = await db.query(
        "SELECT id FROM usuarios WHERE rol = 'admin'",
      );
      const adminIds = admins.map((a) => a.id);

      if (adminIds.length > 0) {
        // Crear notificaciones web (campanita) para cada admin
        const notifDataWeb = adminIds.map((adminId) => [
          adminId,
          mensajeAdmin,
          urlDestinoAdmin,
        ]);
        await db.query(
          "INSERT INTO notificaciones (user_id, mensaje, url_destino) VALUES ?",
          [notifDataWeb],
        );

        // Enviar notificaciones Push (móvil) a los admins
        const [tokens] = await db.query(
          "SELECT token FROM push_tokens WHERE user_id IN (?)",
          [adminIds],
        );
        if (tokens.length > 0) {
          const messages = tokens.map((t) => ({
            to: t.token,
            sound: "default",
            title: "Nueva Solicitud Recibida 📬",
            body: mensajeAdmin,
          }));
          // Asegúrate de tener: const fetch = require('node-fetch'); al inicio del archivo
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
        console.log("Notificaciones de nueva solicitud enviadas a admins.");
      }
    } catch (notifError) {
      console.error(
        "Error al notificar a admins sobre nueva solicitud:",
        notifError,
      );
      // No detener la respuesta principal si falla la notificación
    }
    // --- Fin Notificar Admins ---

    res.status(201).send({ message: "Solicitud enviada con éxito." });
  } catch (error) {
    console.error("Error al crear solicitud:", error);
    res.status(500).send({ message: "Error en el servidor" });
  }
});

// --- FIN: RUTAS DE SOLICITUDES (ALUMNO) ---

// ... (Aquí continúan las otras rutas del alumnoRouter que ya tenías)

alumnoRouter.use(isAlumno); // Se asegura que solo alumnos entren

// GET Mi Grupo (CORREGIDO PARA EVITAR ERROR 'UNDEFINED')
alumnoRouter.get("/mi-grupo", async (req, res) => {
  const alumno_id = req.user.id;

  try {
    // 1. Grupos del alumno
    const [misGrupos] = await db.query(
      "SELECT * FROM grupo_alumnos WHERE alumno_id = ?",
      [alumno_id],
    );

    if (!misGrupos || misGrupos.length === 0) return res.json([]);

    let responseData = [];

    // 2. Iteramos grupos
    for (const miGrupo of misGrupos) {
      const grupoId = miGrupo.grupo_id;

      // Info del grupo
      const [[grupo]] = await db.query(
        `SELECT g.*, c.nombre_ciclo 
         FROM grupos g 
         LEFT JOIN ciclos c ON g.ciclo_id = c.id 
         WHERE g.id = ?`,
        [grupoId],
      );
      if (!grupo) continue;

      // 3. Materias (Manuales)
      const asignaturasSql = `
        SELECT 
          a.id as asignatura_id, 
          a.nombre_asignatura, 
          a.clave_asignatura, 
          u.nombre as docente_nombre, 
          u.apellido_paterno as docente_apellido, 
          cal.calificacion
        FROM grupo_asignaturas_docentes gad
        JOIN asignaturas a ON gad.asignatura_id = a.id
        LEFT JOIN usuarios u ON gad.docente_id = u.id
        LEFT JOIN calificaciones cal 
          ON cal.asignatura_id = a.id 
          AND cal.alumno_id = ? 
          AND cal.grupo_id = ?
        WHERE gad.grupo_id = ?
        ORDER BY a.nombre_asignatura ASC
      `;

      const [asignaturas] = await db.query(asignaturasSql, [
        alumno_id,
        grupoId,
        grupoId,
      ]);

      // Calculamos promedio
      const totalMaterias = asignaturas.length;
      const materiasConCalif = asignaturas.filter(
        (a) => a.calificacion !== null && a.calificacion !== "",
      );
      const sumaCalif = materiasConCalif.reduce(
        (acc, curr) => acc + parseFloat(curr.calificacion),
        0,
      );
      const promedio =
        totalMaterias > 0 && materiasConCalif.length > 0
          ? (sumaCalif / materiasConCalif.length).toFixed(1)
          : 0;

      // --- AQUÍ ESTABA EL ERROR, CORREGIDO: ---
      // Envolvemos 'grupo' para que el frontend lo encuentre como infoGrupo.grupo.nombre_grupo
      responseData.push({
        grupo: grupo, // <--- CAMBIO IMPORTANTE: Lo envolvemos en un objeto 'grupo'
        asignaturas,
        promedio,
      });
    }

    res.json(responseData);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Error al cargar mi grupo" });
  }
});

// ... (después de /alumno/mi-grupo)

// --- INICIO: RUTA DE FINANZAS ALUMNO ---

// GET /api/alumno/mis-adeudos - Ver mi estado de cuenta
alumnoRouter.get("/mis-adeudos", async (req, res) => {
  const alumno_id = req.user.id;
  try {
    const [adeudos] = await db.query(
      `SELECT aa.*, cp.nombre_concepto
       FROM adeudos_alumnos aa
       JOIN conceptos_pago cp ON aa.concepto_id = cp.id
       WHERE aa.alumno_id = ?
       ORDER BY aa.estatus_pago ASC, aa.fecha_vencimiento ASC`,
      [alumno_id],
    );
    res.json(adeudos);
  } catch (error) {
    console.error("Error al obtener mis adeudos:", error);
    res.status(500).send({ message: "Error en el servidor" });
  }
});

// ... (dentro de alumnoRouter, después de /mis-adeudos)

// --- INICIO: RUTAS DE SOLICITUDES (ALUMNO) ---

// GET /api/alumno/mis-solicitudes - Ver el historial de mis solicitudes
alumnoRouter.get("/mis-solicitudes", async (req, res) => {
  const alumno_id = req.user.id;
  try {
    const [solicitudes] = await db.query(
      `SELECT id, tipo_solicitud, estatus, fecha_solicitud, fecha_ultima_actualizacion, comentarios_admin 
       FROM solicitudes_alumnos 
       WHERE alumno_id = ? 
       ORDER BY fecha_solicitud DESC`,
      [alumno_id],
    );
    res.json(solicitudes);
  } catch (error) {
    console.error("Error al obtener mis solicitudes:", error);
    res.status(500).send({ message: "Error en el servidor" });
  }
});

// POST /api/alumno/solicitudes - Crear una nueva solicitud
alumnoRouter.post("/solicitudes", async (req, res) => {
  const alumno_id = req.user.id;
  const { tipo_solicitud, motivo } = req.body;

  // Validación simple
  if (!tipo_solicitud) {
    return res
      .status(400)
      .send({ message: "El tipo de solicitud es requerido." });
  }

  try {
    // Insertar la solicitud
    await db.query(
      "INSERT INTO solicitudes_alumnos (alumno_id, tipo_solicitud, motivo, estatus) VALUES (?, ?, ?, 'solicitado')",
      [alumno_id, tipo_solicitud, motivo || null],
    );

    // --- INICIO: NOTIFICAR A LOS ADMINS ---
    try {
      const alumnoNombre = `${req.user.nombre} ${req.user.apellido_paterno}`;
      const mensaje = `Nueva solicitud de '${tipo_solicitud}' recibida de: ${alumnoNombre}.`;
      const urlDestino = "/admin/solicitudes"; // Lleva a la lista de solicitudes del admin

      // 1. Obtener los IDs de todos los administradores
      const [admins] = await db.query(
        "SELECT id FROM usuarios WHERE rol = 'admin'",
      );
      const adminIds = admins.map((a) => a.id);

      if (adminIds.length > 0) {
        // 2. Crear notificaciones web (campanita) para cada admin
        const notifDataWeb = adminIds.map((adminId) => [
          adminId,
          mensaje,
          urlDestino,
        ]);
        await db.query(
          "INSERT INTO notificaciones (user_id, mensaje, url_destino) VALUES ?",
          [notifDataWeb],
        );

        // 3. Enviar notificaciones Push (móvil) a los admins
        const [tokens] = await db.query(
          "SELECT token FROM push_tokens WHERE user_id IN (?)",
          [adminIds],
        );
        if (tokens.length > 0) {
          const messages = tokens.map((t) => ({
            to: t.token,
            sound: "default",
            title: "Nueva Solicitud Recibida 📬",
            body: mensaje,
          }));
          // Usamos fetch (asegúrate de tener node-fetch instalado y requerido al inicio del archivo)
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
        console.log("Notificaciones de nueva solicitud enviadas a admins.");
      }
    } catch (notifError) {
      console.error(
        "Error al notificar a admins sobre nueva solicitud:",
        notifError,
      );
      // No detenemos la respuesta principal si falla la notificación
    }
    // --- FIN: NOTIFICAR A LOS ADMINS ---

    res.status(201).send({ message: "Solicitud enviada con éxito." });
  } catch (error) {
    console.error("Error al crear solicitud:", error);
    res.status(500).send({ message: "Error en el servidor" });
  }
});

// GET (Alumno): Obtener la config del aula virtual
alumnoRouter.get(
  "/aula-virtual/:grupoId/:asignaturaId/config",
  async (req, res) => {
    try {
      const { grupoId, asignaturaId } = req.params;
      // Validar que el alumno está inscrito en este grupo
      const [[inscripcion]] = await db.query(
        "SELECT * FROM grupo_alumnos WHERE grupo_id = ? AND alumno_id = ?",
        [grupoId, req.user.id],
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
  },
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
        [grupoId, alumno_id],
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
        [alumno_id, grupoId, asignaturaId],
      );
      res.json(tareas);
    } catch (error) {
      console.error("Error al obtener tareas (alumno):", error);
      res.status(500).send({ message: "Error en el servidor." });
    }
  },
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
          [tareaId],
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
            [tarea.docente_id, mensaje, urlDestino],
          );

          // 4. Enviar Notificación Push (móvil)
          const [tokens] = await db.query(
            "SELECT token FROM push_tokens WHERE user_id = ?",
            [tarea.docente_id],
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
            `Notificación de entrega enviada al docente ${tarea.docente_id}`,
          );
        }
      } catch (notifError) {
        // Si falla la notificación, no detenemos la entrega
        console.error(
          "Error al notificar al docente sobre la entrega:",
          notifError,
        );
      }
      // --- TERMINA CÓDIGO DE NOTIFICACIÓN ---

      res.send({ message: "Tarea entregada con éxito." });
    } catch (error) {
      console.error("Error al entregar tarea:", error);
      res.status(500).send({ message: "Error en el servidor." });
    }
  },
);
// --- INICIA NUEVO CÓDIGO (AGREGAR) ---
// GET (Alumno): Obtener todos los recursos
alumnoRouter.get(
  "/aula-virtual/:grupoId/:asignaturaId/recursos",
  getRecursosClase, // <-- Reutilizamos la misma función
);

// --- INICIA NUEVO CÓDIGO (AGREGAR) ---
// GET (Alumno): Obtener MI historial de asistencia para UNA materia
alumnoRouter.get(
  "/aula-virtual/:grupoId/:asignaturaId/mis-asistencias",
  async (req, res) => {
    try {
      const { grupoId, asignaturaId } = req.params;
      const alumno_id = req.user.id;

      // Validar inscripción
      const [[inscripcion]] = await db.query(
        "SELECT * FROM grupo_alumnos WHERE grupo_id = ? AND alumno_id = ?",
        [grupoId, alumno_id],
      );
      if (!inscripcion) {
        return res.status(403).send({ message: "No estás inscrito." });
      }

      // Obtener todas las sesiones de esa clase Y mi estatus en cada una
      const [historial] = await db.query(
        `SELECT 
            cs.id as sesion_id, 
            cs.fecha_sesion, 
            cs.tema_sesion,
            COALESCE(a.estatus, 'ausente') as mi_estatus 
         FROM clases_sesiones cs
         LEFT JOIN asistencia a ON cs.id = a.sesion_id AND a.alumno_id = ?
         WHERE cs.grupo_id = ? AND cs.asignatura_id = ?
         ORDER BY cs.fecha_sesion DESC`,
        [alumno_id, grupoId, asignaturaId],
      );
      res.json(historial);
    } catch (error) {
      console.error("Error al obtener historial de asistencia:", error);
      res.status(500).send({ message: "Error en el servidor." });
    }
  },
);
// --- TERMINA NUEVO CÓDIGO ---

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
    [aspirante_id],
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
  },
);

// 3. RUTA PARA BORRAR MI PROPIO DOCUMENTO
aspiranteRouter.delete("/expedientes/:id", async (req, res) => {
  const { id: docId } = req.params;
  const aspirante_id = req.user.id;

  const [[doc]] = await db.query(
    "SELECT * FROM expediente_aspirantes WHERE id = ?",
    [docId],
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
