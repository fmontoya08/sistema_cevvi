const imaps = require("imap-simple");
const { simpleParser } = require("mailparser");
const express = require("express");
const axios = require("axios");
const mysql = require("mysql2/promise");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const MailComposer = require("nodemailer/lib/mail-composer");
const archiver = require("archiver");
const cron = require("node-cron");
const https = require("https");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Cron diario para auto-vencer pagos que ya pasaron su fecha
// Se ejecuta todos los días a las 02:00 AM
cron.schedule("0 2 * * *", async () => {
  try {
    if (db) {
      const [result] = await db.query(`
        UPDATE adeudos_alumnos 
        SET estatus_pago = 'vencido' 
        WHERE estatus_pago = 'pendiente' AND fecha_vencimiento < CURDATE()
      `);
      if (result.affectedRows > 0) {
        console.log(`[CRON] Pagos vencidos actualizados: ${result.affectedRows} registros`);
      }
    }
  } catch (e) {
    console.error("Error actualizando pagos vencidos:", e.message);
  }
});

// Cron mensual para generar cargos de mensualidad automáticamente
// Se ejecuta el 1er día de cada mes a las 06:00 AM
cron.schedule("0 6 1 * *", async () => {
  try {
    if (!db) return;

    const [conceptos] = await db.query(
      "SELECT id, nombre_concepto, monto_default FROM conceptos_pago WHERE tipo = 'RECURRENTE' LIMIT 1",
    );
    if (conceptos.length === 0) return;
    const concepto = conceptos[0];

    const ahora = new Date();
    const mesNum = ahora.getMonth() + 1;
    const año = ahora.getFullYear();
    const nombreMes = ahora.toLocaleString("es-MX", { month: "long" });
    const mesCapitalizado = nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1);

    // Último día del mes actual
    const ultimoDia = new Date(año, ahora.getMonth() + 1, 0);
    const fechaVencimiento = ultimoDia.toISOString().split("T")[0];

    const [alumnos] = await db.query(
      "SELECT id, nombre, apellido_paterno, apellido_materno FROM usuarios WHERE rol = 'alumno' AND activo = 1",
    );

    let generados = 0;

    for (const alumno of alumnos) {
      const [existentes] = await db.query(
        `SELECT COUNT(*) as total FROM adeudos_alumnos aa
         INNER JOIN conceptos_pago cp ON aa.concepto_id = cp.id
         WHERE aa.alumno_id = ? AND cp.tipo = 'RECURRENTE'
         AND MONTH(aa.fecha_vencimiento) = ? AND YEAR(aa.fecha_vencimiento) = ?`,
        [alumno.id, mesNum, año],
      );
      if (existentes[0].total > 0) continue;

      await db.query(
        "INSERT INTO adeudos_alumnos (alumno_id, concepto_id, monto_a_pagar, estatus_pago, fecha_vencimiento) VALUES (?, ?, ?, 'pendiente', ?)",
        [alumno.id, concepto.id, concepto.monto_default, fechaVencimiento],
      );

      const mensaje = `Se generó tu mensualidad de ${mesCapitalizado} ${año}`;

      await db.query(
        "INSERT INTO notificaciones (usuario_id, mensaje, url_destino, leido, fecha, tipo) VALUES (?, ?, ?, 0, NOW(), 'pago')",
        [alumno.id, mensaje, "/pagos"],
      );

      const [tokens] = await db.query(
        "SELECT token FROM push_tokens WHERE user_id = ?",
        [alumno.id],
      );
      if (tokens.length > 0) {
        fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            tokens.map((t) => ({
              to: t.token,
              sound: "default",
              channelId: "default",
              priority: "high",
              title: "Nueva Mensualidad Generada",
              body: mensaje,
              data: { url: "/pagos" },
            })),
          ),
        }).catch((err) => console.error("Error enviando push mensualidad:", err));
      }

      try {
        const [userData] = await db.query(
          "SELECT email_personal, email FROM usuarios WHERE id = ?",
          [alumno.id],
        );
        const correoDestino = userData[0]?.email_personal || userData[0]?.email;
        if (correoDestino) {
          await enviarAlertaCorreo(
            alumno.id,
            "Mensualidad Generada - Universidad Siglo XXI",
            "Nueva Mensualidad",
            `<p>Se ha generado tu mensualidad de <strong>$${parseFloat(concepto.monto_default).toFixed(2)} MXN</strong> correspondiente a <strong>${mesCapitalizado} ${año}</strong>.</p>
             <p>Fecha de vencimiento: <strong>${fechaVencimiento}</strong></p>
             <p>Realiza tu pago oportunamente para evitar la suspensión de tu acceso a la plataforma.</p>`,
          );
        }
      } catch (emailErr) {
        console.error(`Error enviando email a alumno ${alumno.id}:`, emailErr.message);
      }

      generados++;
    }

    if (generados > 0) {
      console.log(`[CRON MENSUAL] ${generados} mensualidades generadas correctamente.`);
    }
  } catch (e) {
    console.error("Error en cron mensual:", e.message);
  }
});

let db;

async function connectToDatabase() {
  try {
    db = await mysql.createPool(dbConfig);
    console.log("Conectado exitosamente a la base de datos MySQL.");

    // Asegurar que existe el concepto RECURRENTE de mensualidad
    const [conceptos] = await db.query(
      "SELECT id FROM conceptos_pago WHERE tipo = 'RECURRENTE' LIMIT 1",
    );
    if (conceptos.length === 0) {
      await db.query(
        "INSERT INTO conceptos_pago (nombre_concepto, monto_default, tipo, es_concepto_inscripcion) VALUES ('Mensualidad', 1000.00, 'RECURRENTE', 0)",
      );
      console.log("[INIT] Concepto 'Mensualidad' creado automáticamente.");
    }
  } catch (err) {
    console.error("Error al conectar a la base de datos:", err);
    process.exit(1);
  }
}

const JWT_SECRET = process.env.JWT_SECRET;
const CURP_REGEX =
  /^[A-Z]{1}[AEIOU]{1}[A-Z]{2}[0-9]{2}(0[1-9]|1[0-2])(0[1-9]|1[0-9]|2[0-9]|3[0-1])[HM]{1}(AS|BC|BS|CC|CS|CH|CL|CM|DF|DG|GT|GR|HG|JC|MC|MN|MS|NT|NL|OC|PL|QT|QR|SP|SL|SR|TC|TS|TL|VZ|YN|ZS|NE)[B-DF-HJ-NP-TV-Z]{3}[A-Z0-9]{1}[0-9]{1}$/;

// --- SERVIR ARCHIVOS ESTÁTICOS ---

// Directorio de BIBLIOTECA VIRTUAL
const bibliotecaDir = path.join(__dirname, "uploads/biblioteca");
if (!fs.existsSync(bibliotecaDir)) {
  fs.mkdirSync(bibliotecaDir, { recursive: true });
}
app.use("/uploads/biblioteca", express.static(bibliotecaDir));

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
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_PORT === "465",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// ==========================================
// FUNCIÓN DE CORREO (CORREGIDA PARA QUE LLEGUE AL PERSONAL)
// ==========================================
async function enviarCredenciales(
  destinatario,
  nombre,
  matricula,
  passPlataforma,
  correoInstitucional,
  passCorreo,
) {
  try {
    // 1. CONFIGURACIÓN DEL SERVIDOR (Tus credenciales reales)
    let transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASS,
      },
      family: 4,
    });

    // 2. DISEÑO DEL CORREO
    // (Si no tienes logo, usa este temporal, luego lo cambias)
    const logoUrl = "https://i.ibb.co/vz44485/logo-universidad-placeholder.png";

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden;">
        <div style="background-color: #a72a34; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">UNIVERSIDAD SIGLO XXI</h1>
        </div>
        <div style="padding: 30px; color: #333;">
          <h2 style="color: #a72a34;">¡Hola, ${nombre}!</h2>
          <p>Tu registro fue exitoso. Aquí tienes tus accesos oficiales:</p>
          
          <div style="background-color: #f9f9f9; padding: 15px; margin: 20px 0; border-left: 5px solid #a72a34;">
            <p><strong>👤 Usuario / Matrícula:</strong> ${matricula}</p>
            <p><strong>🔑 Contraseña Plataforma:</strong> ${passPlataforma}</p>
            <hr style="border: 0; border-top: 1px solid #ddd; margin: 10px 0;">
            <p><strong>📧 Correo Institucional:</strong> ${correoInstitucional}</p>
            <p><strong>🔐 Contraseña Correo:</strong> ${passCorreo}</p>
          </div>
          
          <p style="text-align: center; margin-top: 30px;">
            <a href="https://www.universidadsigloxxi.com/plataforma/login" style="background-color: #a72a34; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Iniciar Sesión</a>
          </p>
        </div>
      </div>
    `;

    // 3. ENVÍO (AQUÍ ESTABA EL ERROR ANTES)
    await transporter.sendMail({
      from: '"Universidad Siglo XXI" <franksnake08@gmail.com>', // Gmail forzará que salga de tu correo real, así que mejor ponlo aquí para evitar confusiones.
      to: destinatario,
      subject: "🎓 ¡Bienvenido! Tus Accesos Oficiales",
      html: htmlContent,
    });

    console.log(`✅ Correo enviado correctamente a: ${destinatario}`);
  } catch (error) {
    console.error("❌ Error enviando correo:", error);
  }
}

// ==========================================
// NUEVO: CONFIGURACIÓN CPANEL (NEUBOX)
// ==========================================
const CPANEL_CONFIG = {
  host: process.env.CPANEL_HOST,
  user: process.env.CPANEL_USER,
  password: process.env.CPANEL_PASS,
  domain: process.env.CPANEL_DOMAIN,
};

// ==========================================
// NUEVO: CONFIGURACIÓN CPANEL (MÉTODO PUENTE PHP)
// ==========================================
async function crearCorreoCpanel(usuario, passwordCorreo) {
  console.log(
    `[CPANEL-BRIDGE] Intentando crear correo: ${usuario}@universidadsigloxxi.com`,
  );

  try {
    // Apuntamos al archivo PHP que acabas de crear en public_html
    const bridgeUrl = `https://www.universidadsigloxxi.com/plataforma/crear_api_correo.php`;

    const formData = new URLSearchParams();
    formData.append("secreto", process.env.PHP_BRIDGE_SECRET);
    formData.append("email", usuario);
    formData.append("password", passwordCorreo);

    // Hacemos un POST web normal. ¡Los firewalls no bloquean esto!
    const response = await axios.post(bridgeUrl, formData, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    if (response.data && response.data.status === 1) {
      console.log("✅ Correo creado exitosamente mediante el Puente PHP.");
      return true;
    } else {
      const errorMsg = response.data.errors
        ? response.data.errors[0]
        : "Error desconocido";
      if (errorMsg.includes("already exists")) {
        console.log("⚠️ El correo ya existía. Todo en orden.");
        return true;
      }

      console.error("❌ Error en Puente PHP:", errorMsg);
      return false;
    }
  } catch (error) {
    console.error("❌ Error de conexión con el Puente PHP:", error.message);
    return false;
  }
}

// ==========================================
// CAMBIAR CONTRASEÑA DE CORREO VÍA CPANEL UAPI
// ==========================================
async function cambiarPasswordCpanel(usuario, nuevoPassword) {
  const domain = CPANEL_CONFIG.domain;
  const logMsg = `[CPANEL-UAPI] Cambiando password para ${usuario}@${domain}`;
  console.log(logMsg);

  try {
    const url = `https://${CPANEL_CONFIG.host}:2083/execute/Email/passwd_pop`;
    const response = await axios.post(
      url,
      new URLSearchParams({
        email: usuario,
        password: nuevoPassword,
        domain: domain,
      }),
      {
        auth: {
          username: CPANEL_CONFIG.user,
          password: CPANEL_CONFIG.password,
        },
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
        timeout: 15000,
      },
    );

    if (response.data && response.data.status === 1) {
      console.log(`✅ ${logMsg} — Éxito`);
      return true;
    } else {
      const errMsg = response.data?.errors?.[0] || "Error desconocido";
      console.error(`❌ ${logMsg} — ${errMsg}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error en UAPI: ${error.message}`);
    return false;
  }
}

// --- NUEVA RUTA PÚBLICA PARA LLENAR LOS SELECTS ---
app.get("/api/public/catalogos", async (req, res) => {
  try {
    // Obtenemos Sedes y Carreras activas
    const [sedes] = await db.query(
      "SELECT id, nombre_sede FROM sedes WHERE activo = 1",
    );
    const [carreras] = await db.query(
      "SELECT id, nombre_carrera FROM carreras WHERE activo = 1",
    );

    res.json({ sedes, carreras });
  } catch (error) {
    console.error("Error al obtener catálogos públicos:", error);
    res.status(500).send({ message: "Error al cargar listas." });
  }
});

app.post("/api/public/registro-aspirante", async (req, res) => {
  const {
    nombre,
    apellido_paterno,
    apellido_materno,
    email_personal,
    telefono,
    domicilio,
    // --- NUEVOS CAMPOS ---
    colonia,
    edad,
    modalidad,
    escuela_procedencia,
    contacto_emergencia_nombre,
    contacto_emergencia_telefono,
    // ---------------------
    genero,
    curp,
    fecha_nacimiento,
    carrera_id,
    sede_id,
  } = req.body;

  // --- CORRECCIÓN: LIMPIEZA DE CURP (SEGURIDAD) ---
  // Esto asegura que aunque el frontend envíe minúsculas, aquí las convertimos
  const curpSanitized = curp ? curp.toUpperCase().trim() : "";
  // ------------------------------------------------

  const rol = "aspirante";
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Validaciones (Usando curpSanitized)
    if (curpSanitized && !CURP_REGEX.test(curpSanitized)) {
      await connection.rollback();
      return res
        .status(400)
        .send({ message: "El formato de la CURP es inválido." });
    }

    // 2. Chequeo de duplicados (Usando curpSanitized)
    const [existing] = await connection.query(
      "SELECT curp FROM usuarios WHERE curp = ?",
      [curpSanitized],
    );
    if (existing.length > 0) {
      await connection.rollback();
      return res.status(400).send({ message: "Esta CURP ya está registrada." });
    }

    // 3. Generar Matrícula
    const currentYear = new Date().getFullYear().toString();
    const [lastUser] = await connection.query(
      "SELECT matricula FROM usuarios WHERE matricula LIKE ? ORDER BY CAST(matricula AS UNSIGNED) DESC LIMIT 1",
      [`${currentYear}%`],
    );

    let nextSequence = 1;
    if (lastUser.length > 0 && lastUser[0].matricula) {
      nextSequence = parseInt(lastUser[0].matricula.substring(4)) + 1;
    }
    const finalMatricula = `${currentYear}${nextSequence.toString().padStart(4, "0")}`;

    // 4. Generar Credenciales
    const emailInstitucional = `${finalMatricula}@${CPANEL_CONFIG.domain}`;
    const passwordCorreoStrong = `Siglo.${finalMatricula}!`;
    const passwordHash = await bcrypt.hash(finalMatricula, 10);

    // 5. Crear en cPanel (¡ACTIVADO!)
    await crearCorreoCpanel(finalMatricula, passwordCorreoStrong);

    const fechaFinal = fecha_nacimiento === "" ? null : fecha_nacimiento;

    // 6. Guardar en BD (Usando curpSanitized)
    const sql = `
      INSERT INTO usuarios 
      (nombre, apellido_paterno, apellido_materno, email, email_personal, password, password_email, telefono, domicilio, colonia, edad, modalidad, escuela_procedencia, contacto_emergencia_nombre, contacto_emergencia_telefono, genero, curp, fecha_nacimiento, rol, carrera_id, sede_id, matricula, activo) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `;

    await connection.query(sql, [
      nombre,
      apellido_paterno,
      apellido_materno || null,
      emailInstitucional,
      email_personal,
      passwordHash,
      passwordCorreoStrong,
      telefono,
      domicilio || null,
      // --- VALORES NUEVOS ---
      colonia || null,
      edad || null,
      modalidad || "",
      escuela_procedencia || null,
      contacto_emergencia_nombre || null,
      contacto_emergencia_telefono || null,
      // ----------------------
      genero,
      curpSanitized, // <--- AQUÍ SE USA LA CURP LIMPIA
      fechaFinal,
      rol,
      carrera_id || 1,
      sede_id || 1,
      finalMatricula,
    ]);

    await connection.commit();

    // ==========================================
    // 7. ENVIAR CORREO DE BIENVENIDA AL ASPIRANTE
    // ==========================================
    if (email_personal) {
      try {
        await enviarCredenciales(
          email_personal, // Destinatario
          nombre, // Nombre del aspirante
          finalMatricula, // Usuario/Matrícula
          finalMatricula, // Contraseña de la plataforma
          emailInstitucional, // Correo institucional en cPanel
          passwordCorreoStrong, // Contraseña fuerte del correo
        );
        console.log("✅ Correo de bienvenida enviado al aspirante.");
      } catch (emailError) {
        console.error(
          "❌ Error enviando correo al nuevo aspirante:",
          emailError,
        );
        // No detenemos el proceso si falla el correo
      }
    }

    res.status(201).send({
      message: "Registro exitoso.",
      credenciales: {
        usuario: finalMatricula,
        correo: emailInstitucional,
        password: finalMatricula,
        password_correo: passwordCorreoStrong,
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error registro público:", error);
    res.status(500).send({
      message: "Error al registrar: " + (error.sqlMessage || error.message),
    });
  } finally {
    connection.release();
  }
});

// Función para generar un correo profesional evitando duplicados
async function generarEmailDocente(nombre, apellido_paterno, connection) {
  // Limpiamos acentos y caracteres especiales, tomamos primera letra del nombre + apellido
  const primeraLetra = nombre.trim().charAt(0).toLowerCase();
  const apellidoLimpio = apellido_paterno
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const baseEmail = `${primeraLetra}${apellidoLimpio}`;
  let emailPropuesto = `${baseEmail}@${CPANEL_CONFIG.domain}`;
  let contador = 1;

  // Ciclo para asegurar que el correo no exista ya en la BD
  while (true) {
    const [existe] = await connection.query(
      "SELECT id FROM usuarios WHERE email = ?",
      [emailPropuesto],
    );
    if (existe.length === 0) break; // Si está libre, salimos del ciclo

    // Si ya existe (ej. fmontoya), intentamos fmontoya2
    contador++;
    emailPropuesto = `${baseEmail}${contador}@${CPANEL_CONFIG.domain}`;
  }

  return {
    usuarioCpanel: emailPropuesto.split("@")[0], // Solo 'fmontoya'
    correoCompleto: emailPropuesto, // 'fmontoya@universidadsigloxxi.com'
  };
}

// Ruta Pública: Registro Docente
app.post("/api/public/registro-docente", async (req, res) => {
  const {
    nombre,
    apellido_paterno,
    apellido_materno,
    email_personal,
    telefono,
    domicilio,
    colonia,
    edad,
    contacto_emergencia_nombre,
    contacto_emergencia_telefono,
    genero,
    curp,
    fecha_nacimiento,
    sede_id,
  } = req.body;

  const curpSanitized = curp ? curp.toUpperCase().trim() : "";
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Validaciones
    if (curpSanitized && !CURP_REGEX.test(curpSanitized)) {
      await connection.rollback();
      return res
        .status(400)
        .send({ message: "El formato de la CURP es inválido." });
    }

    const [existing] = await connection.query(
      "SELECT curp FROM usuarios WHERE curp = ?",
      [curpSanitized],
    );
    if (existing.length > 0) {
      await connection.rollback();
      return res.status(400).send({ message: "Esta CURP ya está registrada." });
    }

    // 2. Generar Clave Docente (Ej: DOC2026001)
    const currentYear = new Date().getFullYear().toString();
    const prefix = `DOC${currentYear}`;
    const [lastDocente] = await connection.query(
      "SELECT matricula FROM usuarios WHERE matricula LIKE ? ORDER BY CAST(SUBSTRING(matricula, 8) AS UNSIGNED) DESC LIMIT 1",
      [`${prefix}%`],
    );

    let nextSequence = 1;
    if (lastDocente.length > 0 && lastDocente[0].matricula) {
      nextSequence = parseInt(lastDocente[0].matricula.substring(7)) + 1;
    }
    const claveDocente = `${prefix}${nextSequence.toString().padStart(3, "0")}`;

    // 3. Generar Correo Profesional (Ej: fmontoya@...)
    // (Asegúrate de tener la función generarEmailDocente que creamos en el paso anterior)
    const datosEmail = await generarEmailDocente(
      nombre,
      apellido_paterno,
      connection,
    );

    // 4. Generar Contraseñas
    const passwordCorreoStrong = `Docente.${claveDocente}!`;
    const passwordHash = await bcrypt.hash(claveDocente, 10);

    // 5. Crear correo en cPanel usando el prefijo
    await crearCorreoCpanel(datosEmail.usuarioCpanel, passwordCorreoStrong);

    const fechaFinal = fecha_nacimiento === "" ? null : fecha_nacimiento;

    // 6. Guardar en BD
    const sql = `
      INSERT INTO usuarios 
      (nombre, apellido_paterno, apellido_materno, email, email_personal, password, password_email, telefono, domicilio, colonia, edad, contacto_emergencia_nombre, contacto_emergencia_telefono, genero, curp, fecha_nacimiento, rol, sede_id, matricula, activo) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'docente', ?, ?, 1)
    `;

    await connection.query(sql, [
      nombre,
      apellido_paterno,
      apellido_materno || null,
      datosEmail.correoCompleto,
      email_personal,
      passwordHash,
      passwordCorreoStrong,
      telefono,
      domicilio || null,
      colonia || null,
      edad || null,
      contacto_emergencia_nombre || null,
      contacto_emergencia_telefono || null,
      genero,
      curpSanitized,
      fechaFinal,
      sede_id || null,
      claveDocente,
    ]);

    await connection.commit(); // <-- GUARDADO EXITOSO EN BD

    // ==========================================
    // 7. ENVIAR CORREO DE BIENVENIDA AL DOCENTE
    // ==========================================
    if (email_personal) {
      try {
        // Reutilizamos tu función enviarCredenciales pasándole los datos generados
        await enviarCredenciales(
          email_personal, // Destinatario
          nombre, // Nombre del docente
          claveDocente, // Clave/Usuario (Matrícula)
          claveDocente, // Contraseña de plataforma (la misma al inicio)
          datosEmail.correoCompleto, // Correo institucional
          passwordCorreoStrong, // Contraseña fuerte del correo
        );
      } catch (emailError) {
        console.error("❌ Error enviando correo al nuevo docente:", emailError);
        // Si falla, solo lo marcamos en consola, pero no detenemos el proceso
      }
    }

    // 8. Responder al Frontend (Abre el Modal Verde)
    res.status(201).send({
      message: "Registro exitoso.",
      credenciales: {
        usuario: claveDocente,
        correo: datosEmail.correoCompleto,
        password: claveDocente,
        password_correo: passwordCorreoStrong,
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error registro público docente:", error);
    res.status(500).send({
      message: "Error al registrar: " + (error.sqlMessage || error.message),
    });
  } finally {
    connection.release();
  }
});

// ==========================================
// RUTA PÚBLICA: REGISTRO CONTROL ESCOLAR
// ==========================================
app.post("/api/public/registro-control-escolar", async (req, res) => {
  const {
    nombre,
    apellido_paterno,
    apellido_materno,
    email_personal,
    telefono,
    domicilio,
    colonia,
    edad,
    contacto_emergencia_nombre,
    contacto_emergencia_telefono,
    genero,
    curp,
    fecha_nacimiento,
    sede_id,
  } = req.body;

  const curpSanitized = curp ? curp.toUpperCase().trim() : "";
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Validaciones de CURP
    if (curpSanitized && !CURP_REGEX.test(curpSanitized)) {
      await connection.rollback();
      return res
        .status(400)
        .send({ message: "El formato de la CURP es inválido." });
    }

    const [existing] = await connection.query(
      "SELECT curp FROM usuarios WHERE curp = ?",
      [curpSanitized],
    );
    if (existing.length > 0) {
      await connection.rollback();
      return res.status(400).send({ message: "Esta CURP ya está registrada." });
    }

    // 2. Generar Clave Administrativa (Ej: CE2026001) - "CE" de Control Escolar
    const currentYear = new Date().getFullYear().toString();
    const prefix = `CE${currentYear}`;
    const [lastRecord] = await connection.query(
      "SELECT matricula FROM usuarios WHERE matricula LIKE ? ORDER BY CAST(SUBSTRING(matricula, 7) AS UNSIGNED) DESC LIMIT 1",
      [`${prefix}%`],
    );

    let nextSequence = 1;
    if (lastRecord.length > 0 && lastRecord[0].matricula) {
      nextSequence = parseInt(lastRecord[0].matricula.substring(6)) + 1;
    }
    const claveCE = `${prefix}${nextSequence.toString().padStart(3, "0")}`;

    // 3. Generar Correo Profesional Automático (ej: alopez@...)
    // Reutilizamos tu función generarEmailDocente que sirve perfecto para esto
    const datosEmail = await generarEmailDocente(
      nombre,
      apellido_paterno,
      connection,
    );

    // 4. Generar Contraseñas Seguras
    const passwordCorreoStrong = `Admin.${claveCE}!`;
    const passwordHash = await bcrypt.hash(claveCE, 10);

    // 5. Crear correo real en cPanel mediante el puente PHP
    await crearCorreoCpanel(datosEmail.usuarioCpanel, passwordCorreoStrong);

    const fechaFinal = fecha_nacimiento === "" ? null : fecha_nacimiento;

    // 6. Guardar en Base de Datos con el rol 'control_escolar'
    const sql = `
      INSERT INTO usuarios 
      (nombre, apellido_paterno, apellido_materno, email, email_personal, password, password_email, telefono, domicilio, colonia, edad, contacto_emergencia_nombre, contacto_emergencia_telefono, genero, curp, fecha_nacimiento, rol, sede_id, matricula, activo) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'control_escolar', ?, ?, 1)
    `;

    await connection.query(sql, [
      nombre,
      apellido_paterno,
      apellido_materno || null,
      datosEmail.correoCompleto,
      email_personal,
      passwordHash,
      passwordCorreoStrong,
      telefono,
      domicilio || null,
      colonia || null,
      edad || null,
      contacto_emergencia_nombre || null,
      contacto_emergencia_telefono || null,
      genero,
      curpSanitized,
      fechaFinal,
      sede_id || null,
      claveCE,
    ]);

    await connection.commit();

    // 7. ENVIAR CORREO DE BIENVENIDA CON CREDENCIALES
    if (email_personal) {
      try {
        await enviarCredenciales(
          email_personal, // Destinatario
          nombre, // Nombre
          claveCE, // Usuario/Clave para iniciar sesión
          claveCE, // Contraseña de plataforma
          datosEmail.correoCompleto, // Correo de cPanel
          passwordCorreoStrong, // Contraseña fuerte del correo
        );
      } catch (emailError) {
        console.error(
          "❌ Error enviando correo a Control Escolar:",
          emailError,
        );
      }
    }

    // 8. Respuesta al Frontend para mostrar la tarjeta verde
    res.status(201).send({
      message: "Registro exitoso.",
      credenciales: {
        usuario: claveCE,
        correo: datosEmail.correoCompleto,
        password: claveCE,
        password_correo: passwordCorreoStrong,
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error registro control escolar:", error);
    res.status(500).send({
      message: "Error al registrar: " + (error.sqlMessage || error.message),
    });
  } finally {
    connection.release();
  }
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

// ===============================================
// PEGA ESTO AQUÍ ABAJO (YA QUE imageFileFilter EXISTE)
// ===============================================
const adminPerfilesStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, perfilesDir),
  filename: (req, file, cb) => {
    const userId = req.params.id; // Toma el ID de la URL
    cb(
      null,
      `perfil_${userId}_${Date.now()}${path.extname(file.originalname)}`,
    );
  },
});
const uploadAdminPerfil = multer({
  storage: adminPerfilesStorage,
  fileFilter: imageFileFilter,
});

// Multer para Biblioteca
const bibliotecaStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, bibliotecaDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "biblio_" + uniqueSuffix + path.extname(file.originalname));
  },
});
const uploadBiblioteca = multer({ storage: bibliotecaStorage });
// ===============================================
// --- TERMINA NUEVO CÓDIGO ---
// --- TERMINA NUEVO CÓDIGO ---
// --- CONFIGURACIÓN DE LA BASE DE DATOS ---
// --- CONFIGURACIÓN DE LA BASE DE DATOS (MODO NUBE) ---
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 4000, // <--- AQUÍ ESTÁ EL CAMBIO CLAVE
  ssl: {
    rejectUnauthorized: false, // <--- ESTO ES OBLIGATORIO PARA TiDB
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

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
  // Ahora permite el paso si el usuario es admin o control_escolar
  if (
    req.user &&
    (req.user.rol === "admin" || req.user.rol === "control_escolar")
  ) {
    return next();
  }
  return res.status(403).send({
    message: "Acceso denegado. Se requiere rol directivo o de control escolar.",
  });
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
apiRouter.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const [results] = await db.query(
      "SELECT id, email, password, nombre, apellido_paterno, rol, foto_perfil, activo, matricula, genero, estado_academico FROM usuarios WHERE email = ?",
      [email],
    );

    if (results.length === 0) {
      return res
        .status(401)
        .send({ message: "Email o contraseña incorrectos" });
    }

    const user = results[0];

    // VALIDACIÓN DE ESTADO ACADÉMICO (PUNTO 2)
    if (
      user.activo === 0 ||
      ["baja_temporal", "baja_definitiva", "suspendido"].includes(
        user.estado_academico,
      )
    ) {
      let razon = "desactivada";
      if (user.estado_academico === "baja_temporal") razon = "en Baja Temporal";
      if (user.estado_academico === "baja_definitiva")
        razon = "dada de Baja Definitiva";
      if (user.estado_academico === "suspendido") razon = "Suspendida";

      return res.status(403).send({
        message: `Tu cuenta está ${razon}. Por favor, contacta a Control Escolar.`,
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
      foto_perfil: user.foto_perfil,
      matricula: user.matricula,
      genero: user.genero,
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "8h" });
    res.json({ token, user: payload });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Error en el servidor durante el login." });
  }
});

// --- RUTA PÚBLICA: RECUPERAR CONTRASEÑA ---
apiRouter.post("/recuperar-password", async (req, res) => {
  const { email } = req.body;
  try {
    // 1. Extraemos TODOS los datos necesarios, incluyendo el correo institucional (email)
    const [users] = await db.query(
      "SELECT id, nombre, email, email_personal, matricula FROM usuarios WHERE email = ? OR email_personal = ? LIMIT 1",
      [email, email],
    );

    if (users.length === 0) {
      return res.status(404).send({
        message: "No se encontró ningún usuario registrado con este correo.",
      });
    }

    const user = users[0];

    // 2. Generar contraseña aleatoria
    const randomPass = "Siglo" + Math.floor(1000 + Math.random() * 9000);
    const hashedPass = await bcrypt.hash(randomPass, 10);

    // 3. Forzar actualización en la Base de Datos
    const [updateResult] = await db.query(
      "UPDATE usuarios SET password = ? WHERE id = ?",
      [hashedPass, user.id],
    );

    if (updateResult.affectedRows === 0) {
      throw new Error("No se pudo actualizar la base de datos");
    }

    // 4. Determinar a dónde enviar el correo (preferimos el personal, si no, al institucional)
    const correoDestino = user.email_personal || user.email;

    // 5. Correo con diseño que SÍ muestra su usuario real
    const htmlContent = `
      <div style="font-family: Arial; padding: 20px; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #a72a34;">Recuperación de Contraseña</h2>
        <p>Hola <strong>${user.nombre}</strong>,</p>
        <p>Se ha restablecido exitosamente tu contraseña para la Plataforma Universitaria.</p>
        <p>Para ingresar, debes usar estrictamente los siguientes datos:</p>
        
        <div style="background: #f9f9f9; padding: 15px; border-left: 5px solid #a72a34; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Usuario (Correo Institucional):</strong> <span style="color: #a72a34;">${user.email}</span></p>
          <p style="margin: 5px 0;"><strong>Matrícula:</strong> ${user.matricula || "N/A"}</p>
          <p style="margin: 5px 0;"><strong>Nueva Contraseña:</strong> <span style="font-size: 18px; font-weight: bold;">${randomPass}</span></p>
        </div>
        
        <p style="color: #555; font-size: 14px;"><em>* Nota: Asegúrate de iniciar sesión con el correo institucional mostrado arriba, no con tu correo personal. Te recomendamos cambiar tu contraseña desde la pestaña "Mi Perfil" al ingresar.</em></p>
        
        <p style="text-align: center; margin-top: 30px;">
          <a href="https://universidadsigloxxi.com/plataforma/login" style="background-color: #a72a34; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Ir a Iniciar Sesión</a>
        </p>
      </div>
    `;

    await transporter.sendMail({
      from: '"Control Escolar Siglo XXI" <contacto@puntocerodigital.com.mx>',
      to: correoDestino,
      subject: "🔑 Recuperación de Contraseña - Universidad Siglo XXI",
      html: htmlContent,
    });

    res.send({
      message: "Se ha restablecido la contraseña y enviado a tu correo.",
    });
  } catch (error) {
    console.error("Error al recuperar password:", error);
    res
      .status(500)
      .send({ message: "Error interno al restablecer contraseña." });
  }
});

apiRouter.use(verifyToken);

// ==========================================
// REGISTRO DE TOKENS PUSH (NOTIFICACIONES ANDROID)
// ==========================================
apiRouter.post("/register-push-token", async (req, res) => {
  try {
    if (!req.user) return res.status(401).send({ message: "No autenticado" });
    const { token } = req.body;
    if (!token) return res.status(400).send({ message: "Token requerido" });
    await db.query(
      "INSERT INTO push_tokens (user_id, token) VALUES (?, ?) ON DUPLICATE KEY UPDATE user_id = VALUES(user_id)",
      [req.user.id, token],
    );
    res.json({ message: "Token registrado" });
  } catch (error) {
    console.error("Error registrando push token:", error);
    res.status(500).send({ message: "Error al registrar token" });
  }
});

apiRouter.delete("/unregister-push-token", async (req, res) => {
  try {
    if (!req.user) return res.status(401).send({ message: "No autenticado" });
    const { token } = req.body;
    if (!token) return res.status(400).send({ message: "Token requerido" });
    await db.query(
      "DELETE FROM push_tokens WHERE token = ? AND user_id = ?",
      [token, req.user.id],
    );
    res.json({ message: "Token eliminado" });
  } catch (error) {
    console.error("Error eliminando push token:", error);
    res.status(500).send({ message: "Error al eliminar token" });
  }
});
// ==========================================

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

// ==========================================
// MÓDULO NOTIFICACIONES (VERSIÓN FINAL LIMPIA)
// ==========================================

// 1. OBTENER NOTIFICACIONES NO LEÍDAS (Para la campanita)
apiRouter.get("/notificaciones/no-leidas", verifyToken, async (req, res) => {
  if (!req.user) return res.status(401).send({ message: "No autenticado" });
  const userId = req.user.id;

  try {
    // IMPORTANTE: Aquí usamos los nombres reales de TU base de datos:
    // usuario_id (no user_id)
    // leido (no leida)
    // Y usamos "as link" para que el Frontend lo entienda.
    const [notificaciones] = await db.query(
      `SELECT 
         id, 
         mensaje, 
         url_destino as link, 
         leido as leida, 
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
    console.error("Error al obtener notificaciones:", error);
    res.status(500).send({ message: "Error al cargar notificaciones" });
  }
});

// 2. MARCAR UNA ESPECÍFICA COMO LEÍDA
apiRouter.put(
  "/notificaciones/:id/marcar-leida",
  verifyToken,
  async (req, res) => {
    const userId = req.user.id;
    const notifId = req.params.id;

    try {
      // CORRECCIÓN: Usamos 'leido' y 'usuario_id'
      const [result] = await db.query(
        "UPDATE notificaciones SET leido = 1 WHERE id = ? AND usuario_id = ?",
        [notifId, userId],
      );

      if (result.affectedRows > 0) {
        res.send({ message: "Notificación marcada como leída" });
      } else {
        res.status(404).send({ message: "No encontrada" });
      }
    } catch (error) {
      console.error("Error al marcar leída:", error);
      res.status(500).send({ message: "Error en el servidor" });
    }
  },
);

// 3. MARCAR TODAS COMO LEÍDAS
apiRouter.put(
  "/notificaciones/marcar-todas-leidas",
  verifyToken,
  async (req, res) => {
    const userId = req.user.id;
    try {
      // CORRECCIÓN: Usamos 'leido' y 'usuario_id'
      await db.query(
        "UPDATE notificaciones SET leido = 1 WHERE usuario_id = ? AND leido = 0",
        [userId],
      );
      res.json({ message: "Todas marcadas como leídas" });
    } catch (error) {
      console.error("Error al marcar todas:", error);
      res.status(500).send({ message: "Error del servidor" });
    }
  },
);

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

// --- RUTA: CALIFICAR GRUPO COMPLETO (CON CORREOS INTELIGENTES) ---
apiRouter.post("/calificar-grupo-completo", async (req, res) => {
  if (
    req.user.rol !== "admin" &&
    req.user.rol !== "docente" &&
    req.user.rol !== "control_escolar"
  ) {
    return res.status(403).send({ message: "Acceso denegado." });
  }

  const { asignatura_id, calificaciones, grupo_id } = req.body;

  if (
    !asignatura_id ||
    !grupo_id ||
    !calificaciones ||
    !Array.isArray(calificaciones)
  ) {
    return res.status(400).send({ message: "Datos incompletos." });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [materia] = await connection.query(
      "SELECT nombre_asignatura FROM asignaturas WHERE id = ?",
      [asignatura_id],
    );
    const nombreMateria = materia[0]?.nombre_asignatura || "una materia";

    for (const cal of calificaciones) {
      const alumnoId = cal.alumno_id;
      const calNum = parseFloat(cal.calificacion);

      // 1. Buscamos si el alumno ya tenía una calificación guardada
      const [notaAnteriorQuery] = await connection.query(
        "SELECT calificacion FROM calificaciones WHERE alumno_id = ? AND asignatura_id = ? AND grupo_id = ?",
        [alumnoId, asignatura_id, grupo_id],
      );

      // La calificación anterior, si existía
      const notaAnterior =
        notaAnteriorQuery.length > 0
          ? parseFloat(notaAnteriorQuery[0].calificacion)
          : null;
      let calificacionGuardada = null;

      // 2. Guardamos o actualizamos en BD
      if (isNaN(calNum) || calNum < 0 || calNum > 100) {
        await connection.query(
          "INSERT INTO calificaciones (alumno_id, asignatura_id, grupo_id, calificacion) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE calificacion = ?",
          [alumnoId, asignatura_id, grupo_id, null, null],
        );
      } else {
        await connection.query(
          "INSERT INTO calificaciones (alumno_id, asignatura_id, grupo_id, calificacion) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE calificacion = ?",
          [alumnoId, asignatura_id, grupo_id, calNum, calNum],
        );
        calificacionGuardada = calNum;
      }

      // 3. SOLO ENVIAMOS CORREO/NOTIFICACIÓN SI HUBO UN CAMBIO REAL
      // Si es un número válido y es diferente a lo que ya estaba en la base de datos
      if (
        calificacionGuardada !== null &&
        calificacionGuardada !== notaAnterior
      ) {
        try {
          const mensaje = `Nueva calificación en ${nombreMateria}: ${calificacionGuardada}`;
          const linkDestino = "/alumno/dashboard";

          // A) Campanita
          await connection.query(
            "INSERT INTO notificaciones (usuario_id, mensaje, url_destino, leido, fecha, tipo) VALUES (?, ?, ?, 0, NOW(), 'info')",
            [alumnoId, mensaje, linkDestino],
          );

          // B) Push Android
          const [tokens] = await connection.query(
            "SELECT token FROM push_tokens WHERE user_id = ?",
            [alumnoId],
          );
          if (tokens.length > 0) {
            const expoMessages = tokens.map((t) => ({
              to: t.token,
              sound: "default",
              channelId: "default",
              priority: "high",
              title: "Boleta Actualizada 📊",
              body: mensaje,
              data: { url: linkDestino },
            }));
            fetch("https://exp.host/--/api/v2/push/send", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(expoMessages),
            }).catch((e) => console.error(e));
          }

          // C) CORREO ELECTRÓNICO
          enviarAlertaCorreo(
            alumnoId,
            "🎓 Calificación Final Publicada",
            "Acta de Calificaciones",
            `<p>Tu calificación final para la materia <strong>${nombreMateria}</strong> ha sido publicada o actualizada en el sistema.</p>
             <p>Calificación obtenida: <strong style="font-size:18px; color:#a72a34;">${calificacionGuardada} / 100</strong>.</p>`,
          );
        } catch (e) {
          console.error(e);
        }
      }
    }

    await connection.commit();
    res.send({ message: "Calificaciones guardadas con éxito." });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).send({ message: "Error en el servidor." });
  } finally {
    connection.release();
  }
});

// ==============================================================
// MÓDULO DE CORREO UNIVERSAL (ADMIN, ALUMNO, DOCENTE)
// ==============================================================
// Nota: Usamos app.get con verifyToken para que cualquiera con sesión pueda entrar

// Función auxiliar (se mantiene igual)
async function getUserEmailCredentials(userId) {
  const [rows] = await db.query(
    "SELECT email, password_email FROM usuarios WHERE id = ?",
    [userId],
  );

  if (rows.length === 0 || !rows[0].password_email) {
    throw new Error(
      "No tienes un correo institucional asignado o falta tu contraseña de email.",
    );
  }
  return {
    user: rows[0].email,
    password: rows[0].password_email,
    host: "mail.universidadsigloxxi.com",
    imapPort: 993,
    smtpPort: 465,
    tls: true,
  };
}

// --- NUEVAS RUTAS PARA CONFIGURACIÓN DE CORREO ---

// 1. Verificar si el usuario ya configuró su correo
app.get("/api/email/status", verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT email, password_email FROM usuarios WHERE id = ?",
      [req.user.id],
    );

    if (rows.length === 0)
      return res.status(404).json({ error: "Usuario no encontrado" });

    const password = rows[0].password_email || "";
    res.json({
      email: rows[0].email,
      password: password,
      configurado: password.length > 0,
    });
  } catch (error) {
    console.error("Error status correo:", error);
    res.status(500).send("Error al verificar estado");
  }
});

// 2. Guardar la contraseña del correo (Solo la primera vez o si quiere cambiarla)
app.post("/api/email/configurar", verifyToken, async (req, res) => {
  const { password } = req.body;

  if (!password)
    return res.status(400).json({ error: "La contraseña es obligatoria" });

  try {
    // Actualizamos SOLO la contraseña del correo en la base de datos
    await db.query("UPDATE usuarios SET password_email = ? WHERE id = ?", [
      password,
      req.user.id,
    ]);

    res.json({ message: "Contraseña guardada correctamente" });
  } catch (error) {
    console.error("Error guardando password email:", error);
    res.status(500).send("Error al guardar configuración");
  }
});

// 3. Restablecer contraseña de correo automáticamente (cPanel + BD)
app.post("/api/email/restablecer-password", verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT email FROM usuarios WHERE id = ?",
      [req.user.id],
    );
    if (rows.length === 0)
      return res.status(404).json({ error: "Usuario no encontrado" });

    const emailLocal = rows[0].email.split("@")[0];
    const nuevoPassword = `Siglo.${Math.random().toString(36).slice(2, 8).toUpperCase()}!`;

    const exito = await cambiarPasswordCpanel(emailLocal, nuevoPassword);
    if (!exito)
      return res.status(500).json({ error: "No se pudo cambiar la contraseña en cPanel." });

    await db.query("UPDATE usuarios SET password_email = ? WHERE id = ?", [
      nuevoPassword,
      req.user.id,
    ]);

    res.json({
      message: "Contraseña restablecida correctamente",
      password: nuevoPassword,
      email: rows[0].email,
    });
  } catch (error) {
    console.error("Error restableciendo contraseña:", error);
    res.status(500).send("Error al restablecer contraseña");
  }
});

// ... Aquí siguen las rutas de inbox, mensaje, etc. que ya tenías ...

// 1. LEER CARPETA (Ruta Dinámica: Inbox, Enviados, Papelera)
app.get("/api/email/folder/:boxName", verifyToken, async (req, res) => {
  const { boxName } = req.params; // recibimos "inbox", "sent" o "trash"

  try {
    const mailConfig = await getUserEmailCredentials(req.user.id);

    // TRADUCCIÓN DE CARPETAS (Neubox/cPanel suele usar estos nombres)
    let folderSystemName = "INBOX";

    if (boxName === "sent") folderSystemName = "INBOX.Sent"; // O prueba solo "Sent" si falla
    if (boxName === "trash") folderSystemName = "INBOX.Trash"; // O prueba "Trash"
    if (boxName === "inbox") folderSystemName = "INBOX";

    console.log(`[EMAIL DEBUG] Abriendo carpeta: ${folderSystemName}`);

    const config = {
      imap: {
        user: mailConfig.user,
        password: mailConfig.password,
        host: mailConfig.host,
        port: mailConfig.imapPort,
        tls: true,
        authTimeout: 30000,
        tlsOptions: { rejectUnauthorized: false },
      },
    };

    const connection = await imaps.connect(config);

    // Intentamos abrir la carpeta solicitada
    try {
      await connection.openBox(folderSystemName);
    } catch (err) {
      console.log(
        `[EMAIL DEBUG] Carpeta ${folderSystemName} no encontrada, intentando nombre alternativo...`,
      );
      // Fallback simple: si falla INBOX.Sent, probamos Sent (a veces varía la config)
      if (boxName === "sent") await connection.openBox("Sent");
      else if (boxName === "trash") await connection.openBox("Trash");
      else throw err;
    }

    const searchCriteria = ["ALL"];
    const fetchOptions = {
      bodies: ["HEADER", "TEXT"],
      markSeen: false,
      struct: true,
    };

    const messages = await connection.search(searchCriteria, fetchOptions);
    const latestMessages = messages.slice(-15).reverse();

    const correos = await Promise.all(
      latestMessages.map(async (item) => {
        const header = item.parts.find((p) => p.which === "HEADER");
        return {
          id: item.attributes.uid,
          asunto: header?.body?.subject?.[0] || "(Sin Asunto)",
          de: header?.body?.from?.[0] || "Desconocido", // En "Enviados" esto serás tú
          para: header?.body?.to?.[0] || "", // En "Enviados" esto es útil ver
          fecha: header?.body?.date?.[0] || "",
        };
      }),
    );

    connection.end();
    res.json(correos);
  } catch (error) {
    console.error("Error leyendo carpeta:", error.message);
    if (error.message.includes("Authentication failed"))
      return res.status(401).json({ error: "Contraseña incorrecta." });
    if (error.message.includes("Timed out"))
      return res.status(504).json({ error: "Tiempo de espera agotado." });

    // Si la carpeta no existe
    if (
      error.message.includes("Box not found") ||
      error.message.includes("doesn't exist")
    ) {
      return res.status(404).json({ error: "Carpeta vacía o no encontrada." });
    }

    res.status(500).send("Error de conexión con correo.");
  }
});

// RUTA PARA LEER UN MENSAJE (SOPORTE COMPLETO DE ADJUNTOS)
app.get("/api/email/mensaje/:uid", verifyToken, async (req, res) => {
  const { uid } = req.params;
  // Leemos la carpeta desde el query param (ej: ?folder=sent)
  // Si no viene, asumimos INBOX.
  const folderParam = req.query.folder || "inbox";

  // Mapeo de nombres de carpeta del frontend a nombres reales del sistema IMAP
  let folderSystemName = "INBOX";
  if (folderParam === "sent") folderSystemName = "INBOX.Sent"; // O prueba "Sent"
  if (folderParam === "trash") folderSystemName = "INBOX.Trash"; // O prueba "Trash"

  try {
    const mailConfig = await getUserEmailCredentials(req.user.id);
    const config = {
      imap: {
        user: mailConfig.user,
        password: mailConfig.password,
        host: mailConfig.host,
        port: mailConfig.imapPort,
        tls: true,
        authTimeout: 10000,
        tlsOptions: { rejectUnauthorized: false },
      },
    };

    const connection = await imaps.connect(config);

    // Intentar abrir la carpeta correcta
    try {
      await connection.openBox(folderSystemName);
    } catch (e) {
      // Fallback: A veces los servidores llaman a la carpeta solo "Sent" en lugar de "INBOX.Sent"
      if (folderParam === "sent") await connection.openBox("Sent");
      else if (folderParam === "trash") await connection.openBox("Trash");
      else await connection.openBox("INBOX");
    }

    const searchCriteria = [["UID", parseInt(uid, 10)]];
    const fetchOptions = { bodies: [""], markSeen: true };
    const messages = await connection.search(searchCriteria, fetchOptions);

    if (!messages.length) {
      connection.end();
      return res.status(404).send("Correo no encontrado");
    }

    const all = messages[0].parts.find((part) => part.which === "");
    const parsed = await simpleParser(all.body);

    connection.end();

    // --- ESTA PARTE ES LA CLAVE PARA VER LOS ARCHIVOS ---
    const adjuntosProcesados = parsed.attachments
      ? parsed.attachments.map((att) => ({
          filename: att.filename,
          contentType: att.contentType,
          size: att.size,
          // Convertimos el contenido binario a Base64 para que el navegador lo entienda
          content: att.content.toString("base64"),
          contentId: att.contentId,
        }))
      : [];

    res.json({
      asunto: parsed.subject,
      de: parsed.from?.text,
      para: parsed.to?.text, // Importante para la carpeta Enviados
      fecha: parsed.date,
      html: parsed.html || parsed.textAsHtml || parsed.text,
      adjuntos: adjuntosProcesados, // <-- AQUÍ VAN TUS ARCHIVOS
    });
  } catch (error) {
    console.error("Error leyendo mensaje:", error);
    res.status(500).send("Error al abrir el correo");
  }
});

// 4. ELIMINAR/MOVER A PAPELERA
app.delete("/api/email/mensaje/:uid", verifyToken, async (req, res) => {
  const { uid } = req.params;
  const folderParam = req.query.folder || "inbox";

  let folderSystemName = "INBOX";
  if (folderParam === "sent") folderSystemName = "INBOX.Sent";
  if (folderParam === "trash") folderSystemName = "INBOX.Trash";

  const trashFolder = "INBOX.Trash";

  try {
    const mailConfig = await getUserEmailCredentials(req.user.id);
    const config = {
      imap: {
        user: mailConfig.user,
        password: mailConfig.password,
        host: mailConfig.host,
        port: mailConfig.imapPort,
        tls: true,
        authTimeout: 10000,
        tlsOptions: { rejectUnauthorized: false },
      },
    };

    const connection = await imaps.connect(config);

    let sourceBox = folderSystemName;
    try {
      await connection.openBox(sourceBox);
    } catch (e) {
      if (folderParam === "sent") await connection.openBox("Sent");
      else if (folderParam === "trash") await connection.openBox("Trash");
      else await connection.openBox("INBOX");
      sourceBox = connection.getBoxName();
    }

    // Intentar mover a papelera
    try {
      await connection.moveMessage(uid, trashFolder);
    } catch (moveErr) {
      // Si falla el move, intentar copiar + marcar eliminado
      await connection.copyMessage(uid, trashFolder);
      await connection.addFlags(uid, "\\Deleted");
      await connection.expunge();
    }

    connection.end();
    res.json({ message: "Correo movido a la papelera" });
  } catch (error) {
    console.error("Error eliminando correo:", error.message);
    res.status(500).send("Error al eliminar el correo");
  }
});

// 5. ENVIAR CORREO (UNIVERSAL - SOPORTE ADJUNTOS)
// Usamos 'upload.array' para procesar los archivos que vienen del frontend
app.post(
  "/api/email/enviar",
  verifyToken,
  upload.array("adjuntos"),
  async (req, res) => {
    try {
      // Multer procesa el form-data y pone los campos en req.body y los archivos en req.files
      const { destinatario, asunto, mensaje } = req.body;
      const files = req.files || [];

      // 1. Obtener credenciales del usuario
      const mailConfig = await getUserEmailCredentials(req.user.id);

      // 2. Configurar transporte SMTP
      let transporter = nodemailer.createTransport({
        host: mailConfig.host,
        port: mailConfig.smtpPort,
        secure: true,
        auth: { user: mailConfig.user, pass: mailConfig.password },
        tls: { rejectUnauthorized: false },
      });

      // 3. Preparar adjuntos para Nodemailer
      const attachments = files.map((f) => ({
        filename: f.originalname,
        path: f.path,
      }));

      // 4. Enviar correo real
      await transporter.sendMail({
        from: `"Universidad Siglo XXI" <${mailConfig.user}>`,
        to: destinatario,
        subject: asunto,
        html: mensaje,
        attachments: attachments, // <--- Aquí van los archivos
      });

      // 5. Guardar copia en "Enviados" (IMAP)
      try {
        // Necesitamos recrear el mail object con los adjuntos para guardarlo
        const mailOptions = {
          from: `"${mailConfig.user}" <${mailConfig.user}>`,
          to: destinatario,
          subject: asunto,
          html: mensaje,
          attachments: attachments,
          date: new Date(),
        };

        const mail = new MailComposer(mailOptions);
        const message = await mail.compile().build();

        const configImap = {
          imap: {
            user: mailConfig.user,
            password: mailConfig.password,
            host: mailConfig.host,
            port: mailConfig.imapPort,
            tls: true,
            authTimeout: 10000,
            tlsOptions: { rejectUnauthorized: false },
          },
        };

        const connection = await imaps.connect(configImap);
        // Intentar guardar en carpeta Sent
        try {
          await connection.append(message, { mailbox: "INBOX.Sent" });
        } catch (e) {
          // Si falla, intentar solo "Sent"
          await connection.append(message, { mailbox: "Sent" });
        }
        connection.end();
      } catch (saveError) {
        console.error(
          "Correo enviado, pero error al guardar en Enviados:",
          saveError,
        );
      }

      // 6. Limpiar archivos temporales del servidor (IMPORTANTE)
      files.forEach((f) => {
        fs.unlink(f.path, (err) => {
          if (err) console.error("Error borrando temp:", err);
        });
      });

      res.json({ message: "Enviado y guardado correctamente" });
    } catch (error) {
      console.error("Error envío:", error);
      res.status(500).send("Error al enviar: " + error.message);
    }
  },
);

// --- RUTAS DE ADMIN ---
const adminRouter = express.Router();
adminRouter.use(isAdmin); // ¡Importante! 'isAdmin' se aplica a todas las rutas de 'adminRouter'
// ==============================================================
// MÓDULO DE CORREO DINÁMICO (Multiusuario) - CON DEPURACIÓN
// ==============================================================

// Función auxiliar para obtener credenciales del usuario actual
async function getUserEmailCredentials(userId) {
  // Buscamos el email y el password_email del usuario en la BD
  const [rows] = await db.query(
    "SELECT email, password_email FROM usuarios WHERE id = ?",
    [userId],
  );

  // --- ZONA DE DEPURACIÓN (MIRA ESTO EN TU TERMINAL) ---
  console.log("----------------------------------------------------");
  console.log(`[EMAIL DEBUG] Intentando conectar usuario ID: ${userId}`);

  if (rows.length > 0) {
    console.log(`[EMAIL DEBUG] Email en BD: '${rows[0].email}'`);
    console.log(`[EMAIL DEBUG] Pass en BD:  '${rows[0].password_email}'`);
    // ^^^ Fíjate si las comillas '' muestran espacios vacíos al final del password
  } else {
    console.log("[EMAIL DEBUG] ERROR: Usuario no encontrado en BD");
  }
  console.log("----------------------------------------------------");
  // -----------------------------------------------------

  if (rows.length === 0 || !rows[0].password_email) {
    throw new Error(
      "No tienes un correo institucional asignado o falta tu contraseña de email.",
    );
  }

  return {
    user: rows[0].email, // El correo (ej. controlescolar@...)
    password: rows[0].password_email, // La contraseña real
    host: "mail.universidadsigloxxi.com",
    imapPort: 993,
    smtpPort: 465,
    tls: true,
  };
}

// --- DESCARGAR ZIP DE CREDENCIALES (PUNTO 7) ---
adminRouter.get("/exportar-credenciales", async (req, res) => {
  try {
    const [alumnos] = await db.query(
      "SELECT id, nombre, apellido_paterno, matricula, foto_perfil FROM usuarios WHERE rol IN ('alumno', 'aspirante') AND activo = 1",
    );

    // Configuramos la respuesta HTTP como un archivo ZIP descargable
    res.attachment("Fotos_Credenciales_Alumnos.zip");
    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.on("error", (err) => {
      throw err;
    });
    archive.pipe(res);

    // Creamos un CSV con los datos de todos
    let csvData = "Matricula,Nombre,Apellido,Foto_Archivo\n";

    alumnos.forEach((alumno) => {
      const nombreCarpeta =
        `${alumno.matricula || "SIN_MATRICULA"}_${alumno.apellido_paterno}_${alumno.nombre}`.replace(
          /[^a-zA-Z0-9_]/g,
          "_",
        );

      // Si tiene foto, la metemos a su carpeta
      if (alumno.foto_perfil) {
        const fotoPath = path.join(perfilesDir, alumno.foto_perfil);
        if (fs.existsSync(fotoPath)) {
          const extension = path.extname(alumno.foto_perfil);
          archive.file(fotoPath, {
            name: `Alumnos/${nombreCarpeta}/foto_perfil${extension}`,
          });
          csvData += `${alumno.matricula},${alumno.nombre},${alumno.apellido_paterno},foto_perfil${extension}\n`;
        }
      } else {
        csvData += `${alumno.matricula},${alumno.nombre},${alumno.apellido_paterno},SIN FOTO\n`;
      }
    });

    // Guardamos el excel/csv en la raíz del ZIP
    archive.append(csvData, { name: "Directorio_Alumnos.csv" });

    await archive.finalize();
  } catch (error) {
    console.error("Error al exportar ZIP:", error);
    res.status(500).send("Error generando el archivo ZIP.");
  }
});

// 1. LEER BANDEJA (Dinámico)
adminRouter.get("/email/inbox", async (req, res) => {
  try {
    // A) Obtenemos las credenciales DE ESTE usuario específico
    const mailConfig = await getUserEmailCredentials(req.user.id);

    // B) Configuramos la conexión con SUS datos
    const config = {
      imap: {
        user: mailConfig.user,
        password: mailConfig.password,
        host: mailConfig.host,
        port: mailConfig.imapPort,
        tls: true,
        authTimeout: 10000,
        tlsOptions: { rejectUnauthorized: false }, // Corrección SSL Neubox
      },
    };

    const connection = await imaps.connect(config);
    await connection.openBox("INBOX");

    const searchCriteria = ["ALL"];
    const fetchOptions = {
      bodies: ["HEADER", "TEXT"],
      markSeen: false,
      struct: true,
    };

    const messages = await connection.search(searchCriteria, fetchOptions);
    const latestMessages = messages.slice(-15).reverse();

    const correos = await Promise.all(
      latestMessages.map(async (item) => {
        const header = item.parts.find((p) => p.which === "HEADER");
        return {
          id: item.attributes.uid,
          asunto: header?.body?.subject?.[0] || "(Sin Asunto)",
          de: header?.body?.from?.[0] || "Desconocido",
          fecha: header?.body?.date?.[0] || "",
        };
      }),
    );

    connection.end();
    res.json(correos);
  } catch (error) {
    console.error("Error inbox dinámico:", error.message);

    // Devolvemos un error claro al frontend
    if (error.message.includes("Authentication failed")) {
      return res.status(401).json({
        error: "Contraseña de correo incorrecta en la Base de Datos.",
      });
    }
    if (error.message.includes("No tienes un correo")) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).send("Error al conectar con tu correo institucional.");
  }
});

adminRouter.get("/email/mensaje/:uid", async (req, res) => {
  const { uid } = req.params;
  try {
    const mailConfig = await getUserEmailCredentials(req.user.id);
    const config = {
      imap: {
        user: mailConfig.user,
        password: mailConfig.password,
        host: mailConfig.host,
        port: mailConfig.imapPort,
        tls: true,
        authTimeout: 10000,
        tlsOptions: { rejectUnauthorized: false },
      },
    };

    const connection = await imaps.connect(config);
    await connection.openBox("INBOX");

    const searchCriteria = [["UID", uid]];
    const fetchOptions = { bodies: [""], markSeen: true };
    const messages = await connection.search(searchCriteria, fetchOptions);

    if (!messages.length) {
      connection.end();
      return res.status(404).send("Correo no encontrado");
    }

    const all = messages[0].parts.find((part) => part.which === "");
    const parsed = await simpleParser(all.body);

    connection.end();

    // PROCESAR ADJUNTOS A BASE64 PARA EL FRONTEND
    const adjuntosProcesados = parsed.attachments
      ? parsed.attachments.map((att) => ({
          filename: att.filename,
          contentType: att.contentType,
          size: att.size,
          // Convertimos el buffer a string base64 para que React pueda mostrarlo
          content: att.content.toString("base64"),
          contentId: att.contentId,
        }))
      : [];

    res.json({
      asunto: parsed.subject,
      de: parsed.from?.text,
      fecha: parsed.date,
      html: parsed.html || parsed.textAsHtml || parsed.text,
      adjuntos: adjuntosProcesados, // <--- ENVIAMOS LOS ADJUNTOS
    });
  } catch (error) {
    console.error("Error mensaje dinámico:", error.message);
    res.status(500).send("Error al abrir el correo");
  }
});

// 2. RUTA ENVIAR CORREO (SOPORTE PARA ARCHIVOS)
// Usamos 'upload.array' para permitir múltiples archivos
adminRouter.post(
  "/email/enviar",
  upload.array("adjuntos"),
  async (req, res) => {
    try {
      const { destinatario, asunto, mensaje } = req.body;
      const files = req.files || []; // Archivos subidos por Multer

      const mailConfig = await getUserEmailCredentials(req.user.id);

      let transporter = nodemailer.createTransport({
        host: mailConfig.host,
        port: mailConfig.smtpPort,
        secure: true,
        auth: { user: mailConfig.user, pass: mailConfig.password },
        tls: { rejectUnauthorized: false },
      });

      // Preparamos los adjuntos para Nodemailer
      const attachments = files.map((f) => ({
        filename: f.originalname,
        path: f.path,
      }));

      await transporter.sendMail({
        from: `"Universidad Siglo XXI" <${mailConfig.user}>`,
        to: destinatario,
        subject: asunto,
        html: mensaje,
        attachments: attachments, // <--- AGREGAMOS ESTO
      });

      // Limpieza: Borrar archivos temporales después de enviar
      files.forEach((f) => {
        fs.unlink(f.path, (err) => {
          if (err) console.error("Error borrando temp:", err);
        });
      });

      res.json({ message: "Enviado correctamente" });
    } catch (error) {
      console.error("Error envío dinámico:", error.message);
      res.status(500).send("Error al enviar");
    }
  },
);

// --- RUTA: LISTAR CORREOS INSTITUCIONALES (ADMIN) ---
adminRouter.get("/email/institucionales", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        u.id,
        u.nombre,
        u.apellido_paterno,
        u.apellido_materno,
        u.matricula,
        u.email,
        u.email_personal,
        u.rol,
        CASE WHEN u.password_email IS NOT NULL AND u.password_email != '' THEN 1 ELSE 0 END as correo_configurado,
        DATE_FORMAT(u.fecha_creacion, '%Y-%m-%d') as fecha_creacion
      FROM usuarios u
      WHERE u.activo = 1
      ORDER BY u.id DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error("Error listando correos institucionales:", error);
    res.status(500).send("Error al obtener datos de correos");
  }
});

// Obtener contraseña de correo de un usuario específico (admin)
adminRouter.get("/email/institucionales/:id/password", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, nombre, apellido_paterno, email, password_email FROM usuarios WHERE id = ?",
      [req.params.id],
    );
    if (rows.length === 0)
      return res.status(404).json({ error: "Usuario no encontrado" });
    res.json({
      id: rows[0].id,
      nombre: `${rows[0].nombre} ${rows[0].apellido_paterno}`,
      email: rows[0].email,
      password: rows[0].password_email || "",
    });
  } catch (error) {
    console.error("Error obteniendo contraseña de correo:", error);
    res.status(500).send("Error al obtener contraseña");
  }
});

// Restablecer contraseña de correo de un usuario (admin)
adminRouter.post("/email/institucionales/:id/restablecer-password", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, email FROM usuarios WHERE id = ?",
      [req.params.id],
    );
    if (rows.length === 0)
      return res.status(404).json({ error: "Usuario no encontrado" });

    const emailLocal = rows[0].email.split("@")[0];
    const nuevoPassword = `Siglo.${Math.random().toString(36).slice(2, 8).toUpperCase()}!`;

    const exito = await cambiarPasswordCpanel(emailLocal, nuevoPassword);
    if (!exito)
      return res.status(500).json({ error: "No se pudo cambiar la contraseña en cPanel." });

    await db.query("UPDATE usuarios SET password_email = ? WHERE id = ?", [
      nuevoPassword,
      req.params.id,
    ]);

    res.json({
      message: "Contraseña restablecida correctamente",
      password: nuevoPassword,
      email: rows[0].email,
    });
  } catch (error) {
    console.error("Error restableciendo contraseña:", error);
    res.status(500).send("Error al restablecer contraseña");
  }
});

adminRouter.get("/alumnos/:id/finanzas", async (req, res) => {
  try {
    const [rows] = await db.query(
      `
      SELECT 
        a.id,
        c.nombre_concepto,
        a.monto_a_pagar,
        a.estatus_pago,
        a.fecha_vencimiento,
        a.fecha_pago,
        u.nombre, u.apellido_paterno, u.apellido_materno, u.matricula -- Datos del alumno
      FROM adeudos_alumnos a
      INNER JOIN conceptos_pago c ON a.concepto_id = c.id
      INNER JOIN usuarios u ON a.alumno_id = u.id
      WHERE a.alumno_id = ?
      ORDER BY a.fecha_vencimiento DESC
    `,
      [req.params.id],
    );
    res.json(rows);
  } catch (error) {
    res.status(500).send({ message: "Error al cargar finanzas" });
  }
});

// 2. CREAR CARGO MANUAL (MEJORADO CON NOTIFICACIONES)
adminRouter.post("/finanzas/cargo", async (req, res) => {
  const { alumno_id, concepto_id, fecha_vencimiento } = req.body;

  const connection = await db.getConnection(); // Usamos transacción para seguridad
  try {
    await connection.beginTransaction();

    // A) Obtenemos datos del concepto (Nombre y Monto)
    const [[concepto]] = await connection.query(
      "SELECT * FROM conceptos_pago WHERE id = ?",
      [concepto_id],
    );

    if (!concepto) {
      throw new Error("Concepto no encontrado");
    }

    // B) Insertamos el adeudo
    await connection.query(
      "INSERT INTO adeudos_alumnos (alumno_id, concepto_id, monto_a_pagar, estatus_pago, fecha_vencimiento) VALUES (?, ?, ?, 'pendiente', ?)",
      [alumno_id, concepto_id, concepto.monto_default, fecha_vencimiento],
    );

    // --- AQUÍ EMPIEZA LA MAGIA DE LAS NOTIFICACIONES ---

    // C) Creamos el mensaje y el link
    const mensaje = `Se ha generado un nuevo cargo: ${concepto.nombre_concepto} por $${concepto.monto_default}`;
    const linkPagos = "/alumno/mis-pagos"; // Link directo a la sección de pagos

    // D) Notificación Interna (Campanita)
    await connection.query(
      "INSERT INTO notificaciones (usuario_id, mensaje, url_destino, leido, fecha, tipo) VALUES (?, ?, ?, 0, NOW(), 'pago')",
      [alumno_id, mensaje, linkPagos],
    );

    // E) Notificación Push (Android)
    const [tokens] = await connection.query(
      "SELECT token FROM push_tokens WHERE user_id = ?",
      [alumno_id],
    );

    if (tokens.length > 0) {
      const expoMessages = tokens.map((t) => ({
        to: t.token,
        sound: "default",
        channelId: "default",
        priority: "high",
        title: "Nuevo Cargo Generado",
        body: mensaje,
        data: { url: linkPagos }, // Para abrir la app en la sección de pagos
      }));

      // Enviar a Expo (Sin await para no trabar la respuesta si tarda)
      fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(expoMessages),
      }).catch((err) => console.error("Error enviando push:", err));
    }

    await connection.commit();
    res.json({ message: "Cargo asignado y notificación enviada" });
  } catch (error) {
    await connection.rollback();
    console.error("Error asignando cargo:", error);
    res.status(500).send({ message: "Error al asignar cargo" });
  } finally {
    connection.release();
  }
});

// 3. REGISTRAR PAGO (Cobrar)
adminRouter.put("/finanzas/pagar/:adeudoId", async (req, res) => {
  try {
    await db.query(
      "UPDATE adeudos_alumnos SET estatus_pago = 'pagado', fecha_pago = NOW(), registrado_por_usuario_id = ? WHERE id = ?",
      [req.user.id, req.params.adeudoId], // Registramos quién cobró
    );
    res.json({ message: "Pago registrado exitosamente" });
  } catch (error) {
    res.status(500).send({ message: "Error al registrar pago" });
  }
});

// 4. ELIMINAR CARGO (Corrección de errores)
adminRouter.delete("/finanzas/cargo/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM adeudos_alumnos WHERE id = ?", [req.params.id]);
    res.json({ message: "Cargo eliminado" });
  } catch (error) {
    res.status(500).send({ message: "Error al eliminar cargo" });
  }
});

// --- RUTAS DE MIGRACIÓN (CORREGIDO PARA TABLA PIVOTE 'grupo_alumnos') ---

// 1. OBTENER ESTRUCTURA (Grupos disponibles)
adminRouter.get("/migracion-grupos/estructura", async (req, res) => {
  try {
    const sql = `
      SELECT 
        g.id, g.nombre_grupo, g.grado_id, g.ciclo_id,
        COALESCE(c.nombre_ciclo, 'Sin Ciclo') as nombre_ciclo,
        COALESCE(ca.nombre_carrera, 'Sin Carrera') as nombre_carrera,
        COALESCE(gr.nombre_grado, 'Sin Grado') as nombre_grado
      FROM grupos g
      LEFT JOIN ciclos c ON g.ciclo_id = c.id
      LEFT JOIN planes_estudio p ON g.plan_estudio_id = p.id
      LEFT JOIN carreras ca ON p.carrera_id = ca.id
      LEFT JOIN grados gr ON g.grado_id = gr.id
      WHERE g.estatus = 'activo'
      ORDER BY c.nombre_ciclo DESC, ca.nombre_carrera ASC, gr.nombre_grado ASC
    `;
    const [rows] = await db.query(sql);
    res.json(rows);
  } catch (error) {
    console.error("Error cargando grupos:", error);
    res.json([]);
  }
});

// 2. OBTENER ALUMNOS (Corrección: Usando tabla pivote 'grupo_alumnos')
adminRouter.get("/migracion-grupos/alumnos/:grupoId", async (req, res) => {
  try {
    const sql = `
      SELECT u.id, u.nombre, u.apellido_paterno, u.apellido_materno, u.matricula 
      FROM usuarios u
      INNER JOIN grupo_alumnos ga ON u.id = ga.alumno_id
      WHERE ga.grupo_id = ? AND u.rol = 'alumno'
      ORDER BY u.apellido_paterno ASC
    `;
    const [rows] = await db.query(sql, [req.params.grupoId]);
    res.json(rows);
  } catch (error) {
    console.error("Error cargando alumnos:", error);
    res.status(500).send({ message: "Error al cargar alumnos" });
  }
});

// 3. EJECUTAR MIGRACIÓN (Corrección: Actualizando 'grupo_alumnos')
adminRouter.post("/migracion-grupos/ejecutar", async (req, res) => {
  const { alumnosIds, nuevoGrupoId, grupoOrigenId } = req.body; // <--- Ojo: Recibimos grupoOrigenId

  if (!alumnosIds || !nuevoGrupoId || !grupoOrigenId) {
    return res.status(400).send({ message: "Datos incompletos." });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Actualizamos la inscripción en la tabla pivote
    // Movemos al alumno del grupo VIEJO al NUEVO
    const sql = `
      UPDATE grupo_alumnos 
      SET grupo_id = ? 
      WHERE grupo_id = ? AND alumno_id IN (?)
    `;
    await connection.query(sql, [nuevoGrupoId, grupoOrigenId, alumnosIds]);

    // Opcional: Si también quieres actualizar el campo 'grupo_id' en usuarios para tenerlo doble (por si acaso)
    await connection.query("UPDATE usuarios SET grupo_id = ? WHERE id IN (?)", [
      nuevoGrupoId,
      alumnosIds,
    ]);

    await connection.commit();
    res.json({ message: "Migración exitosa." });
  } catch (error) {
    await connection.rollback();
    console.error("Error en migración:", error);
    res.status(500).send({ message: "Error al migrar." });
  } finally {
    connection.release();
  }
});
// 2. OBTENER ALUMNOS DE UN GRUPO (ORIGEN)
// Corrección: Buscamos en 'usuarios' y quitamos el filtro 'activo' que no existe
adminRouter.get("/migracion-grupos/alumnos/:grupoId", async (req, res) => {
  try {
    const sql = `
      SELECT id, nombre, apellido_paterno, apellido_materno, matricula 
      FROM usuarios 
      WHERE grupo_id = ? AND rol = 'alumno'
      ORDER BY apellido_paterno ASC
    `;
    const [rows] = await db.query(sql, [req.params.grupoId]);
    res.json(rows);
  } catch (error) {
    console.error("Error cargando alumnos:", error);
    res.status(500).send({ message: "Error al cargar alumnos" });
  }
});

// 3. EJECUTAR MIGRACIÓN MASIVA
// Corrección: Actualizamos la tabla 'usuarios'
adminRouter.post("/migracion-grupos/ejecutar", async (req, res) => {
  const { alumnosIds, nuevoGrupoId } = req.body;

  if (!alumnosIds || alumnosIds.length === 0 || !nuevoGrupoId) {
    return res.status(400).send({ message: "Datos incompletos." });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Actualizamos el grupo_id en la tabla USUARIOS
    const sql = `UPDATE usuarios SET grupo_id = ? WHERE id IN (?)`;
    await connection.query(sql, [nuevoGrupoId, alumnosIds]);

    await connection.commit();
    res.json({ message: "Migración exitosa." });
  } catch (error) {
    await connection.rollback();
    console.error("Error en migración:", error);
    res.status(500).send({ message: "Error al migrar." });
  } finally {
    connection.release();
  }
});

// 2. OBTENER ALUMNOS DE UN GRUPO (ORIGEN)
adminRouter.get("/migracion-grupos/alumnos/:grupoId", async (req, res) => {
  try {
    // Buscamos usuarios con rol 'alumno' que pertenezcan a este grupo
    const sql = `
      SELECT id, nombre, apellido_paterno, apellido_materno, matricula 
      FROM usuarios 
      WHERE grupo_id = ? AND rol = 'alumno' AND activo = 1
      ORDER BY apellido_paterno ASC
    `;
    const [rows] = await db.query(sql, [req.params.grupoId]);
    res.json(rows);
  } catch (error) {
    console.error("Error cargando alumnos:", error);
    res.status(500).send({ message: "Error al cargar alumnos" });
  }
});

// 3. EJECUTAR MIGRACIÓN MASIVA
adminRouter.post("/migracion-grupos/ejecutar", async (req, res) => {
  const { alumnosIds, nuevoGrupoId } = req.body;

  if (!alumnosIds || alumnosIds.length === 0 || !nuevoGrupoId) {
    return res
      .status(400)
      .send({ message: "Datos incompletos para la migración." });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Actualizamos el grupo_id de todos los alumnos seleccionados
    // Usamos 'users' o 'usuarios' según tu tabla (en tu index.js veo que usas 'usuarios')
    const sql = `UPDATE usuarios SET grupo_id = ? WHERE id IN (?)`;

    // query espera el array de IDs directamente
    await connection.query(sql, [nuevoGrupoId, alumnosIds]);

    await connection.commit();
    res.json({
      message: `Se movieron ${alumnosIds.length} alumnos correctamente.`,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error en migración masiva:", error);
    res.status(500).send({ message: "Error en la migración masiva" });
  } finally {
    connection.release();
  }
});

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
        SELECT nombre, apellido_paterno, apellido_materno, email, fecha_creacion 
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
        "INSERT INTO notificaciones (usuario_id, mensaje, url_destino, leido, fecha, tipo) VALUES (?, ?, ?, 0, NOW(), 'sistema')",
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
          channelId: "default",
          priority: "high",
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

// --- RUTA: GUARDAR LOTE (MÉTODO CLÁSICO CON CORREOS) ---
// --- RUTA: GUARDAR LOTE (MÉTODO CLÁSICO CON CORREOS INTELIGENTES) ---
adminRouter.post("/calificaciones/guardar-lote", async (req, res) => {
  const { grupo_id, asignatura_id, calificaciones } = req.body;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [materiaRows] = await connection.query(
      "SELECT nombre_asignatura FROM asignaturas WHERE id = ?",
      [asignatura_id],
    );
    const nombreMateria = materiaRows[0]?.nombre_asignatura || "Materia";

    for (const item of calificaciones) {
      // 1. Buscamos si el alumno ya tenía una calificación guardada
      const [notaAnteriorQuery] = await connection.query(
        "SELECT calificacion FROM calificaciones WHERE alumno_id = ? AND asignatura_id = ? AND grupo_id = ?",
        [item.alumno_id, asignatura_id, grupo_id],
      );
      const notaAnterior =
        notaAnteriorQuery.length > 0
          ? parseFloat(notaAnteriorQuery[0].calificacion)
          : null;
      const notaNueva = parseFloat(item.calificacion);

      // 2. Guardamos en BD
      await connection.query(
        `INSERT INTO calificaciones (alumno_id, asignatura_id, grupo_id, calificacion) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE calificacion = VALUES(calificacion)`,
        [item.alumno_id, asignatura_id, grupo_id, item.calificacion],
      );

      // 3. SOLO NOTIFICAMOS SI LA CALIFICACIÓN ES DIFERENTE O NUEVA
      if (!isNaN(notaNueva) && notaNueva !== notaAnterior) {
        const mensaje = `Tu calificación en ${nombreMateria} ha sido actualizada: ${item.calificacion}`;

        // A) Campanita
        await connection.query(
          "INSERT INTO notificaciones (usuario_id, mensaje, leido, fecha, tipo) VALUES (?, ?, 0, NOW(), 'calificacion')",
          [item.alumno_id, mensaje],
        );

        // B) Push Android
        const [tokens] = await connection.query(
          "SELECT token FROM push_tokens WHERE user_id = ?",
          [item.alumno_id],
        );
        if (tokens.length > 0) {
          const expoMessages = tokens.map((t) => ({
            to: t.token,
            sound: "default",
            channelId: "default",
            priority: "high",
            title: "Nueva Calificación",
            body: mensaje,
            data: { url: "/alumno/mis-calificaciones" },
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

        // C) CORREO ELECTRÓNICO
        enviarAlertaCorreo(
          item.alumno_id,
          "🎓 Calificación Final Publicada",
          "Acta de Calificaciones",
          `<p>Tu calificación final para la materia <strong>${nombreMateria}</strong> ha sido publicada en el sistema.</p>
           <p>Calificación obtenida: <strong style="font-size:18px; color:#a72a34;">${item.calificacion} / 100</strong>.</p>`,
        );
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
// --- MIDDLEWARE DE AUTENTICACIÓN (Necesario para proteger rutas) ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (token == null) return res.sendStatus(401); // No hay token

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403); // Token inválido o expirado
    req.user = user;
    next();
  });
};

// --- RUTAS DE CONCEPTOS DE PAGO (ADMINISTRACIÓN) ---

// 1. LISTAR CONCEPTOS
adminRouter.get("/conceptos_pago", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM conceptos_pago ORDER BY id DESC",
    );
    res.json(rows);
  } catch (error) {
    res.status(500).send({ message: "Error al obtener conceptos" });
  }
});

// 2. CREAR CONCEPTO
adminRouter.post("/conceptos_pago", async (req, res) => {
  const { nombre_concepto, monto_default, tipo, es_concepto_inscripcion } =
    req.body;
  try {
    await db.query(
      "INSERT INTO conceptos_pago (nombre_concepto, monto_default, tipo, es_concepto_inscripcion) VALUES (?, ?, ?, ?)",
      [nombre_concepto, monto_default, tipo, es_concepto_inscripcion ? 1 : 0],
    );
    res.status(201).send({ message: "Concepto creado" });
  } catch (error) {
    res.status(500).send({ message: "Error al crear concepto" });
  }
});

// 3. EDITAR CONCEPTO
adminRouter.put("/conceptos_pago/:id", async (req, res) => {
  const { nombre_concepto, monto_default, tipo, es_concepto_inscripcion } =
    req.body;
  try {
    await db.query(
      "UPDATE conceptos_pago SET nombre_concepto=?, monto_default=?, tipo=?, es_concepto_inscripcion=? WHERE id=?",
      [
        nombre_concepto,
        monto_default,
        tipo,
        es_concepto_inscripcion ? 1 : 0,
        req.params.id,
      ],
    );
    res.send({ message: "Concepto actualizado" });
  } catch (error) {
    res.status(500).send({ message: "Error al actualizar" });
  }
});

// 4. ELIMINAR CONCEPTO
adminRouter.delete("/conceptos_pago/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM conceptos_pago WHERE id = ?", [req.params.id]);
    res.send({ message: "Concepto eliminado" });
  } catch (error) {
    res.status(500).send({ message: "Error al eliminar (puede estar en uso)" });
  }
});

// --- RUTA FINANZAS ALUMNO (ESTADO DE CUENTA) ---
app.get("/alumno/finanzas/resumen", authenticateToken, async (req, res) => {
  // Solo permitimos alumnos
  if (req.user.rol !== "alumno") return res.sendStatus(403);

  try {
    const alumnoId = req.user.id;

    const sql = `
      SELECT 
        a.id,
        c.nombre_concepto,
        a.monto_a_pagar,
        a.estatus_pago, -- 'pendiente','pagado','vencido'
        a.fecha_vencimiento,
        a.fecha_pago
      FROM adeudos_alumnos a
      INNER JOIN conceptos_pago c ON a.concepto_id = c.id
      WHERE a.alumno_id = ?
      ORDER BY a.fecha_vencimiento DESC
    `;

    const [rows] = await db.query(sql, [alumnoId]);
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener finanzas:", error);
    res.status(500).send({ message: "Error al cargar estado de cuenta" });
  }
});

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
// createCatalogCrudRoutes(adminRouter, "tipos_asignatura", ["tipo"]);
// ... (el resto de tus rutas)
// createCatalogCrudRoutes(adminRouter, "tipos_asignatura", ["tipo"]);
// createCatalogCrudRoutes(adminRouter, "grados", ["nombre_grado"]);
// createCatalogCrudRoutes(adminRouter, "ciclos", ["nombre_ciclo"]);
// createCatalogCrudRoutes(adminRouter, "sedes", ["nombre_sede", "direccion"]);
// createCatalogCrudRoutes(adminRouter, "carreras", ["nombre_carrera"]);

// ... (después del createCatalogCrudRoutes de "sedes")

// --- INICIO: CRUD PARA CONCEPTOS DE PAGO ---
// Usamos el genérico porque es un catálogo simple
// createCatalogCrudRoutes(adminRouter, "conceptos_pago", [
//   "nombre_concepto",
//   "monto_default",
//   "tipo",
//   "es_concepto_inscripcion",
// ]);
// // --- FIN: CRUD PARA CONCEPTOS DE PAGO ---
// --- GESTIÓN DE CICLO ACTUAL ---

// --- RUTAS ASIGNATURAS (ESTRATEGIA A PRUEBA DE FALLOS) ---

// 1. CATÁLOGOS (Traemos TODO para que el Frontend decida qué mostrar)
adminRouter.get("/catalogos/planes", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM planes_estudio WHERE activo = 1",
    );
    res.json(rows);
  } catch (e) {
    res.json([]);
  }
});

adminRouter.get("/catalogos/tipos-asignatura", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM tipos_asignatura");
    res.json(rows);
  } catch (e) {
    res.json([]);
  }
});

adminRouter.get("/catalogos/grados", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM grados WHERE activo = 1");
    res.json(rows);
  } catch (e) {
    res.json([]);
  }
});

// 2. CRUD ASIGNATURAS

// GET: Listar (Sin JOINs peligrosos, solo datos crudos + activo)
adminRouter.get("/asignaturas", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM asignaturas WHERE activo = 1 ORDER BY nombre_asignatura ASC",
    );
    res.json(rows);
  } catch (error) {
    res.status(500).send({ message: "Error al obtener asignaturas" });
  }
});

// GET: Papelera
adminRouter.get("/asignaturas/eliminadas", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM asignaturas WHERE activo = 0 ORDER BY nombre_asignatura ASC",
    );
    res.json(rows);
  } catch (error) {
    res.status(500).send({ message: "Error al obtener papelera" });
  }
});

// POST: Crear
adminRouter.post("/asignaturas", async (req, res) => {
  const {
    nombre_asignatura,
    clave_asignatura,
    creditos,
    calificacion_max,
    calificacion_min,
    plan_estudio_id,
    tipo_asignatura_id,
    grado_id,
  } = req.body;
  try {
    const sql = `INSERT INTO asignaturas (nombre_asignatura, clave_asignatura, creditos, calificacion_max, calificacion_min, plan_estudio_id, tipo_asignatura_id, grado_id, activo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`;
    await db.query(sql, [
      nombre_asignatura,
      clave_asignatura,
      creditos,
      calificacion_max || 100,
      calificacion_min || 70,
      plan_estudio_id,
      tipo_asignatura_id,
      grado_id,
    ]);
    res.status(201).send({ message: "Creado correctamente" });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY")
      return res.status(400).send({ message: "La clave ya existe." });
    res.status(500).send({ message: "Error al crear." });
  }
});

// PUT: Editar
adminRouter.put("/asignaturas/:id", async (req, res) => {
  const {
    nombre_asignatura,
    clave_asignatura,
    creditos,
    calificacion_max,
    calificacion_min,
    plan_estudio_id,
    tipo_asignatura_id,
    grado_id,
  } = req.body;
  try {
    const sql = `UPDATE asignaturas SET nombre_asignatura=?, clave_asignatura=?, creditos=?, calificacion_max=?, calificacion_min=?, plan_estudio_id=?, tipo_asignatura_id=?, grado_id=? WHERE id=?`;
    await db.query(sql, [
      nombre_asignatura,
      clave_asignatura,
      creditos,
      calificacion_max,
      calificacion_min,
      plan_estudio_id,
      tipo_asignatura_id,
      grado_id,
      req.params.id,
    ]);
    res.send({ message: "Actualizado correctamente" });
  } catch (error) {
    res.status(500).send({ message: "Error al actualizar" });
  }
});

// DELETE: Soft Delete
adminRouter.delete("/asignaturas/:id", async (req, res) => {
  try {
    await db.query("UPDATE asignaturas SET activo = 0 WHERE id = ?", [
      req.params.id,
    ]);
    res.send({ message: "Eliminado" });
  } catch (e) {
    res.status(500).send({ message: "Error" });
  }
});

// PUT: Restaurar
adminRouter.put("/asignaturas/:id/reactivar", async (req, res) => {
  try {
    await db.query("UPDATE asignaturas SET activo = 1 WHERE id = ?", [
      req.params.id,
    ]);
    res.send({ message: "Restaurado" });
  } catch (e) {
    res.status(500).send({ message: "Error" });
  }
});

// 1. GET: Activos
adminRouter.get("/conceptos-pagos", async (req, res) => {
  try {
    // CORREGIDO: FROM conceptos_pago
    const [rows] = await db.query(
      "SELECT * FROM conceptos_pago WHERE activo = 1 ORDER BY nombre_concepto ASC",
    );
    res.json(rows);
  } catch (error) {
    console.error(error); // Para ver el error real en consola
    res.status(500).send({ message: "Error al obtener conceptos" });
  }
});

// 2. GET: Papelera
adminRouter.get("/conceptos-pagos/eliminados", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM conceptos_pago WHERE activo = 0 ORDER BY nombre_concepto ASC",
    );
    res.json(rows);
  } catch (error) {
    res.status(500).send({ message: "Error al obtener papelera" });
  }
});

// 3. POST: Crear
adminRouter.post("/conceptos-pagos", async (req, res) => {
  const { nombre_concepto, monto } = req.body;
  try {
    await db.query(
      "INSERT INTO conceptos_pago (nombre_concepto, monto, activo) VALUES (?, ?, 1)",
      [nombre_concepto, monto || 0],
    );
    res.status(201).send({ message: "Concepto creado exitosamente" });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY")
      return res.status(400).send({ message: "Ese concepto ya existe." });
    res.status(500).send({ message: "Error al crear concepto" });
  }
});

// 4. PUT: Editar
adminRouter.put("/conceptos-pagos/:id", async (req, res) => {
  const { nombre_concepto, monto } = req.body;
  try {
    await db.query(
      "UPDATE conceptos_pago SET nombre_concepto = ?, monto = ? WHERE id = ?",
      [nombre_concepto, monto || 0, req.params.id],
    );
    res.send({ message: "Concepto actualizado" });
  } catch (error) {
    res.status(500).send({ message: "Error al actualizar" });
  }
});

// 5. DELETE: Soft Delete
adminRouter.delete("/conceptos-pagos/:id", async (req, res) => {
  try {
    await db.query("UPDATE conceptos_pago SET activo = 0 WHERE id = ?", [
      req.params.id,
    ]);
    res.send({ message: "Concepto enviado a la papelera" });
  } catch (error) {
    res.status(500).send({ message: "Error al eliminar" });
  }
});

// 6. PUT: Restaurar
adminRouter.put("/conceptos-pagos/:id/reactivar", async (req, res) => {
  try {
    await db.query("UPDATE conceptos_pago SET activo = 1 WHERE id = ?", [
      req.params.id,
    ]);
    res.send({ message: "Concepto restaurado correctamente" });
  } catch (error) {
    res.status(500).send({ message: "Error al restaurar" });
  }
});

// 1. GET: Sedes Activas (Solo activo = 1)
adminRouter.get("/sedes", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM sedes WHERE activo = 1 ORDER BY nombre_sede ASC",
    );
    res.json(rows);
  } catch (error) {
    res.status(500).send({ message: "Error al obtener sedes" });
  }
});

// 2. GET: Papelera (Solo activo = 0)
adminRouter.get("/sedes/eliminadas", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM sedes WHERE activo = 0 ORDER BY nombre_sede ASC",
    );
    res.json(rows);
  } catch (error) {
    res.status(500).send({ message: "Error al obtener papelera" });
  }
});

// 3. POST: Crear Sede
adminRouter.post("/sedes", async (req, res) => {
  const { nombre_sede } = req.body;
  try {
    await db.query("INSERT INTO sedes (nombre_sede, activo) VALUES (?, 1)", [
      nombre_sede,
    ]);
    res.status(201).send({ message: "Sede creada exitosamente" });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY")
      return res.status(400).send({ message: "Esa sede ya existe." });
    res.status(500).send({ message: "Error al crear sede" });
  }
});

// 4. PUT: Editar Sede
adminRouter.put("/sedes/:id", async (req, res) => {
  const { nombre_sede } = req.body;
  try {
    await db.query("UPDATE sedes SET nombre_sede = ? WHERE id = ?", [
      nombre_sede,
      req.params.id,
    ]);
    res.send({ message: "Sede actualizada" });
  } catch (error) {
    res.status(500).send({ message: "Error al actualizar" });
  }
});

// 5. DELETE: Soft Delete (ESTO ARREGLA EL ERROR AL BORRAR)
adminRouter.delete("/sedes/:id", async (req, res) => {
  try {
    // Marcamos como inactivo (0) en lugar de borrar físicamente
    await db.query("UPDATE sedes SET activo = 0 WHERE id = ?", [req.params.id]);
    res.send({ message: "Sede enviada a la papelera" });
  } catch (error) {
    res.status(500).send({ message: "Error al eliminar" });
  }
});

// 6. PUT: Restaurar Sede
adminRouter.put("/sedes/:id/reactivar", async (req, res) => {
  try {
    await db.query("UPDATE sedes SET activo = 1 WHERE id = ?", [req.params.id]);
    res.send({ message: "Sede restaurada correctamente" });
  } catch (error) {
    res.status(500).send({ message: "Error al restaurar" });
  }
});

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
        "INSERT INTO notificaciones (usuario_id, mensaje, url_destino, leido, fecha, tipo) VALUES (?, ?, ?, 0, NOW(), 'pago')",
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
          channelId: "default",
          priority: "high",
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
        "INSERT INTO notificaciones (usuario_id, mensaje, url_destino, leido, fecha, tipo) VALUES (?, ?, ?, 0, NOW(), 'pago')",
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
          channelId: "default",
          priority: "high",
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

// --- RUTA: OBTENER USUARIOS (CORREGIDA PARA VER TODOS LOS DATOS Y EL ESTADO ACADÉMICO) ---
adminRouter.get("/usuarios", async (req, res) => {
  try {
    const sql = `
      SELECT 
        u.id, u.nombre, u.apellido_paterno, u.apellido_materno, 
        u.email, u.email_personal, u.rol, u.matricula, u.foto_perfil, u.activo, u.estado_academico,
        u.telefono, u.curp, u.genero, u.edad, u.modalidad,
        u.domicilio, u.colonia, u.contacto_emergencia_nombre, u.contacto_emergencia_telefono,
        u.escuela_procedencia, u.carrera_id, u.sede_id,
        DATE_FORMAT(u.fecha_nacimiento, '%Y-%m-%d') as fecha_nacimiento,
        c.nombre_carrera, 
        s.nombre_sede
      FROM usuarios u
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

// --- RUTA: ACTUALIZAR USUARIO (AHORA GUARDA EL ESTADO ACADÉMICO) ---
adminRouter.put("/usuarios/:id", async (req, res) => {
  const {
    nombre,
    apellido_paterno,
    apellido_materno,
    email,
    email_personal,
    password,
    rol,
    genero,
    telefono,
    curp,
    fecha_nacimiento,
    edad,
    domicilio,
    colonia,
    contacto_emergencia_nombre,
    contacto_emergencia_telefono,
    escuela_procedencia,
    carrera_id,
    sede_id,
    modalidad,
    estado_academico,
  } = req.body;

  if (curp && !CURP_REGEX.test(curp)) {
    return res
      .status(400)
      .send({ message: "El formato de la CURP no es válido." });
  }

  let sql, params;

  // Campos base a actualizar
  const baseQuery = `nombre=?, apellido_paterno=?, apellido_materno=?, email=?, email_personal=?, 
                     rol=?, genero=?, telefono=?, curp=?, fecha_nacimiento=?, edad=?, 
                     domicilio=?, colonia=?, contacto_emergencia_nombre=?, contacto_emergencia_telefono=?, 
                     escuela_procedencia=?, carrera_id=?, sede_id=?, modalidad=?, estado_academico=?`;

  const baseParams = [
    nombre,
    apellido_paterno || null,
    apellido_materno || null,
    email,
    email_personal || null,
    rol,
    genero || null,
    telefono || null,
    curp || null,
    fecha_nacimiento || null,
    edad || null,
    domicilio || null,
    colonia || null,
    contacto_emergencia_nombre || null,
    contacto_emergencia_telefono || null,
    escuela_procedencia || null,
    carrera_id || null,
    sede_id || null,
    modalidad || null,
    estado_academico || "activo",
  ];

  if (password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    sql = `UPDATE usuarios SET ${baseQuery}, password=? WHERE id=?`;
    params = [...baseParams, hashedPassword, req.params.id];
  } else {
    sql = `UPDATE usuarios SET ${baseQuery} WHERE id=?`;
    params = [...baseParams, req.params.id];
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

// --- CREAR USUARIO ADMIN (ACTUALIZADO) ---
adminRouter.post("/usuarios", async (req, res) => {
  const {
    nombre,
    apellido_paterno,
    apellido_materno,
    email_personal, // <--- RECIBIMOS EL PERSONAL
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

    // ... (Validaciones de CURP igual que arriba) ...
    // Generar Matrícula (Misma lógica)
    const currentYear = new Date().getFullYear().toString();
    const [lastUser] = await connection.query(
      "SELECT matricula FROM usuarios WHERE matricula LIKE ? ORDER BY CAST(matricula AS UNSIGNED) DESC LIMIT 1",
      [`${currentYear}%`],
    );
    let nextSequence = 1;
    if (lastUser.length > 0 && lastUser[0].matricula)
      nextSequence = parseInt(lastUser[0].matricula.substring(4)) + 1;
    const finalMatricula = `${currentYear}${nextSequence.toString().padStart(4, "0")}`;

    const emailInstitucional = `${finalMatricula}@${CPANEL_CONFIG.domain}`;
    const passwordCorreoStrong = `Siglo.${finalMatricula}!`;
    const passwordPlataforma = finalMatricula;
    const passwordHash = await bcrypt.hash(passwordPlataforma, 10);

    await crearCorreoCpanel(finalMatricula, passwordCorreoStrong);

    const fechaFinal = fecha_nacimiento === "" ? null : fecha_nacimiento;
    const sql = `
      INSERT INTO usuarios 
      (nombre, apellido_paterno, apellido_materno, email, email_personal, password, password_email, telefono, genero, curp, fecha_nacimiento, rol, carrera_id, sede_id, matricula, activo) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `;

    await connection.query(sql, [
      nombre,
      apellido_paterno,
      apellido_materno || null,
      emailInstitucional,
      email_personal,
      passwordHash,
      passwordCorreoStrong,
      telefono,
      genero,
      curp,
      fechaFinal,
      rol,
      carrera_id || null,
      sede_id || null,
      finalMatricula,
    ]);

    await connection.commit();

    // Enviar correo al personal
    if (email_personal) {
      try {
        await enviarCredenciales(
          email_personal, // A quién se lo mandamos
          nombre, // Nombre del alumno
          finalMatricula, // Matrícula
          passwordPlataforma, // Contraseña sencilla (2026...)
          emailInstitucional, // Nuevo: correo inst
          passwordCorreoStrong, // Nuevo: contraseña fuerte (Siglo...)
        );
      } catch (e) {
        console.error("Fallo envío correo:", e);
      }
    }

    res.status(201).send({
      message: "Registro exitoso.",
      credenciales: {
        usuario: finalMatricula,
        correo: emailInstitucional,
        password: finalMatricula, // Contraseña Plataforma (Matrícula)
        password_correo: passwordCorreoStrong, // <--- ¡AGREGA ESTA LÍNEA EXACTA!
      },
    });
  } catch (error) {
    await connection.rollback();
    res
      .status(500)
      .send({ message: "Error: " + (error.sqlMessage || error.message) });
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
    email_personal,
    password,
    rol,
    genero,
    telefono,
    curp,
    fecha_nacimiento,
    edad,
    domicilio,
    colonia,
    contacto_emergencia_nombre,
    contacto_emergencia_telefono,
    escuela_procedencia,
    carrera_id,
    sede_id,
    modalidad,
  } = req.body;

  if (curp && !CURP_REGEX.test(curp)) {
    return res
      .status(400)
      .send({ message: "El formato de la CURP no es válido." });
  }

  let sql, params;

  // Campos base a actualizar
  const baseQuery = `nombre=?, apellido_paterno=?, apellido_materno=?, email=?, email_personal=?, 
                     rol=?, genero=?, telefono=?, curp=?, fecha_nacimiento=?, edad=?, 
                     domicilio=?, colonia=?, contacto_emergencia_nombre=?, contacto_emergencia_telefono=?, 
                     escuela_procedencia=?, carrera_id=?, sede_id=?, modalidad=?`;

  const baseParams = [
    nombre,
    apellido_paterno || null,
    apellido_materno || null,
    email,
    email_personal || null,
    rol,
    genero || null,
    telefono || null,
    curp || null,
    fecha_nacimiento || null,
    edad || null,
    domicilio || null,
    colonia || null,
    contacto_emergencia_nombre || null,
    contacto_emergencia_telefono || null,
    escuela_procedencia || null,
    carrera_id || null,
    sede_id || null,
    modalidad || null,
  ];

  if (password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    sql = `UPDATE usuarios SET ${baseQuery}, password=? WHERE id=?`;
    params = [...baseParams, hashedPassword, req.params.id];
  } else {
    sql = `UPDATE usuarios SET ${baseQuery} WHERE id=?`;
    params = [...baseParams, req.params.id];
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
// --- RUTAS ASIGNATURAS (ADAPTADAS A TU ESTRUCTURA SQL EXACTA) ---

// 1. GET: Activas (Con JOINs para traer nombres de planes, tipos y grados)
adminRouter.get("/asignaturas", async (req, res) => {
  try {
    const sql = `
      SELECT 
        a.*,
        p.nombre_plan,
        t.nombre_tipo_asignatura, 
        g.nombre_grado
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
    console.error(error);
    res.status(500).send({ message: "Error al obtener asignaturas" });
  }
});

// 2. GET: Papelera
adminRouter.get("/asignaturas/eliminadas", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM asignaturas WHERE activo = 0 ORDER BY nombre_asignatura ASC",
    );
    res.json(rows);
  } catch (error) {
    res.status(500).send({ message: "Error al obtener papelera" });
  }
});

// 3. POST: Crear
adminRouter.post("/asignaturas", async (req, res) => {
  // Extraemos EXACTAMENTE tus campos
  const {
    nombre_asignatura,
    clave_asignatura,
    creditos,
    calificacion_max,
    calificacion_min,
    plan_estudio_id,
    tipo_asignatura_id,
    grado_id,
  } = req.body;

  try {
    const sql = `
      INSERT INTO asignaturas 
      (nombre_asignatura, clave_asignatura, creditos, calificacion_max, calificacion_min, plan_estudio_id, tipo_asignatura_id, grado_id, activo) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `;

    await db.query(sql, [
      nombre_asignatura,
      clave_asignatura,
      creditos,
      calificacion_max || 100.0,
      calificacion_min || 70.0,
      plan_estudio_id,
      tipo_asignatura_id,
      grado_id,
    ]);

    res.status(201).send({ message: "Asignatura creada exitosamente" });
  } catch (error) {
    console.error(error);
    if (error.code === "ER_DUP_ENTRY")
      return res
        .status(400)
        .send({ message: "La clave de asignatura ya existe." });
    res.status(500).send({
      message:
        "Error al crear asignatura. Verifica que existan los Planes, Tipos y Grados seleccionados.",
    });
  }
});

// 4. PUT: Editar
adminRouter.put("/asignaturas/:id", async (req, res) => {
  const {
    nombre_asignatura,
    clave_asignatura,
    creditos,
    calificacion_max,
    calificacion_min,
    plan_estudio_id,
    tipo_asignatura_id,
    grado_id,
  } = req.body;

  try {
    const sql = `
      UPDATE asignaturas SET 
        nombre_asignatura=?, clave_asignatura=?, creditos=?, 
        calificacion_max=?, calificacion_min=?, 
        plan_estudio_id=?, tipo_asignatura_id=?, grado_id=?
      WHERE id=?
    `;

    await db.query(sql, [
      nombre_asignatura,
      clave_asignatura,
      creditos,
      calificacion_max,
      calificacion_min,
      plan_estudio_id,
      tipo_asignatura_id,
      grado_id,
      req.params.id,
    ]);
    res.send({ message: "Asignatura actualizada" });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Error al actualizar" });
  }
});

// 5. DELETE: Soft Delete
adminRouter.delete("/asignaturas/:id", async (req, res) => {
  try {
    await db.query("UPDATE asignaturas SET activo = 0 WHERE id = ?", [
      req.params.id,
    ]);
    res.send({ message: "Asignatura enviada a la papelera" });
  } catch (error) {
    res.status(500).send({ message: "Error al eliminar" });
  }
});

// 6. PUT: Restaurar
adminRouter.put("/asignaturas/:id/reactivar", async (req, res) => {
  try {
    await db.query("UPDATE asignaturas SET activo = 1 WHERE id = ?", [
      req.params.id,
    ]);
    res.send({ message: "Asignatura restaurada correctamente" });
  } catch (error) {
    res.status(500).send({ message: "Error al restaurar" });
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

      // --- CORRECCIÓN 1: CREAMOS EL LINK AL AULA ---
      // Formato: /alumno/grupo/ID_GRUPO/asignatura/ID_MATERIA/aula
      const linkAula = `/alumno/grupo/${id}/asignatura/${asignatura_id}/aula`;

      // A) Insertar Campanita (BD) - AHORA CON LINK
      for (const idAlum of idsAlumnos) {
        await connection.query(
          // Agregamos 'url_destino' a la consulta
          "INSERT INTO notificaciones (usuario_id, mensaje, url_destino, leido, fecha, tipo) VALUES (?, ?, ?, 0, NOW(), 'sistema')",
          [idAlum, mensaje, linkAula], // <--- Pasamos la variable linkAula
        );
      }

      // B) --- ENVIAR PUSH MASIVO (ANDROID) ---
      const [tokens] = await connection.query(
        "SELECT token FROM push_tokens WHERE user_id IN (?)",
        [idsAlumnos],
      );

      if (tokens.length > 0) {
        const expoMessages = tokens.map((t) => ({
          to: t.token,
          sound: "default",
          channelId: "default",
          priority: "high",
          title: "Carga Académica Actualizada",
          body: mensaje,
          data: { url: linkAula }, // <-- CORRECCIÓN 2: Enviamos el link al celular también
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

// ==========================================
// CERRAR GRUPO (VALIDACIÓN INTELIGENTE Y FORZADO)
// ==========================================
adminRouter.put("/grupos/:id/finalizar", async (req, res) => {
  const { id } = req.params;
  const { force } = req.body; // Detecta si el Admin dio click en "Forzar"

  try {
    // 1. Buscamos a los alumnos y las materias REALES asignadas a este grupo
    const sqlFaltantes = `
      SELECT u.nombre, u.apellido_paterno, a.nombre_asignatura
      FROM grupo_alumnos ga
      JOIN grupo_asignaturas_docentes gad ON gad.grupo_id = ga.grupo_id
      JOIN asignaturas a ON a.id = gad.asignatura_id
      JOIN usuarios u ON u.id = ga.alumno_id
      LEFT JOIN calificaciones c ON c.alumno_id = ga.alumno_id AND c.asignatura_id = a.id AND c.grupo_id = ga.grupo_id
      WHERE ga.grupo_id = ? AND (c.id IS NULL OR c.calificacion IS NULL)
    `;

    const [faltantes] = await db.query(sqlFaltantes, [id]);

    // 2. Si faltan notas Y el admin NO ha confirmado forzarlo, detenemos y avisamos:
    if (faltantes.length > 0 && !force) {
      const ejemplos = faltantes
        .slice(0, 3)
        .map((f) => `${f.nombre} en ${f.nombre_asignatura}`)
        .join(", ");
      return res.status(400).send({
        requiresConfirmation: true, // <-- Esta bandera activa la pregunta en tu App.js
        message: `Faltan ${faltantes.length} calificaciones por subir en este grupo.\n\nEjemplo: ${ejemplos}...`,
      });
    }

    // 3. Si no faltan notas, o si el admin decidió FORZAR, cerramos el grupo.
    await db.query("UPDATE grupos SET estatus = 'finalizado' WHERE id = ?", [
      id,
    ]);
    res.send({ message: "Grupo cerrado exitosamente." });
  } catch (error) {
    console.error("Error crítico al cerrar grupo:", error);
    res
      .status(500)
      .send({ message: "Error interno al intentar cerrar el grupo." });
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
  if (docente_id) {
    enviarAlertaCorreo(
      docente_id,
      "📚 Nueva Materia Asignada",
      "Asignación de Grupo",
      `<p>Se te ha asignado una nueva materia en el sistema. Ingresa a tu Portal Docente para ver los detalles y alumnos inscritos.</p>`,
    );
  }
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

// --- RUTAS DE REVISI�N DE ASPIRANTES ---

// 1. Listar aspirantes con estatus de documentos
adminRouter.get("/aspirantes/revision", async (req, res) => {
  try {
    const [aspirantes] = await db.query(
      "SELECT id, nombre, apellido_paterno, apellido_materno, email, matricula, foto_perfil FROM usuarios WHERE rol = 'aspirante' AND activo = 1 ORDER BY fecha_creacion DESC"
    );

    const docsRequeridos = ["acta_nacimiento", "curp", "certificado_bachillerato", "comprobante_domicilio"];

    const resultado = await Promise.all(
      aspirantes.map(async (a) => {
        const [docs] = await db.query(
          "SELECT tipo_documento, estatus FROM expediente_aspirantes WHERE aspirante_id = ?",
          [a.id]
        );
        const subidos = docs.length;
        const aprobados = docs.filter((d) => d.estatus === "aprobado").length;
        const rechazados = docs.filter((d) => d.estatus === "rechazado").length;
        const pendientes = docs.filter((d) => d.estatus === "pendiente").length;
        const faltantes = docsRequeridos.length - subidos;
        return { ...a, total_requeridos: docsRequeridos.length, subidos, aprobados, rechazados, pendientes, faltantes };
      })
    );

    res.json(resultado);
  } catch (error) {
    console.error("Error al listar aspirantes para revisi�n:", error);
    res.status(500).send({ message: "Error al obtener aspirantes" });
  }
});

// 2. Obtener documentos de un aspirante espec�fico
adminRouter.get("/aspirantes/:id/documentos", async (req, res) => {
  try {
    const [aspirante] = await db.query(
      "SELECT id, nombre, apellido_paterno, apellido_materno, email, matricula FROM usuarios WHERE id = ? AND rol = 'aspirante'",
      [req.params.id]
    );
    if (aspirante.length === 0) {
      return res.status(404).send({ message: "Aspirante no encontrado" });
    }

    const [docs] = await db.query(
      "SELECT e.*, u.nombre as revisado_por_nombre FROM expediente_aspirantes e LEFT JOIN usuarios u ON e.revisado_por = u.id WHERE e.aspirante_id = ? ORDER BY e.tipo_documento",
      [req.params.id]
    );

    const tiposRequeridos = [
      { id: "acta_nacimiento", nombre: "Acta de Nacimiento" },
      { id: "curp", nombre: "CURP" },
      { id: "certificado_bachillerato", nombre: "Certificado de Bachillerato" },
      { id: "comprobante_domicilio", nombre: "Comprobante de Domicilio" },
    ];

    const documentos = tiposRequeridos.map((tipo) => {
      const doc = docs.find((d) => d.tipo_documento === tipo.id);
      return doc
        ? { ...doc, tipo_nombre: tipo.nombre }
        : { tipo_documento: tipo.id, tipo_nombre: tipo.nombre, estatus: "no_subido" };
    });

    res.json({ aspirante: aspirante[0], documentos });
  } catch (error) {
    console.error("Error al obtener documentos del aspirante:", error);
    res.status(500).send({ message: "Error al obtener documentos" });
  }
});

// 3. Aprobar o rechazar un documento
adminRouter.put("/expedientes/:id/revisar", async (req, res) => {
  try {
    const { estatus, comentario } = req.body;
    if (!["aprobado", "rechazado"].includes(estatus)) {
      return res.status(400).send({ message: "Estatus inv�lido. Use aprobado o rechazado" });
    }

    const [[doc]] = await db.query("SELECT * FROM expediente_aspirantes WHERE id = ?", [req.params.id]);
    if (!doc) {
      return res.status(404).send({ message: "Documento no encontrado" });
    }

    await db.query(
      "UPDATE expediente_aspirantes SET estatus = ?, comentario = ?, revisado_por = ?, fecha_revision = NOW() WHERE id = ?",
      [estatus, comentario || null, req.user.id, req.params.id]
    );

    res.send({ message: "Documento " + (estatus === "aprobado" ? "aprobado" : "rechazado") });
  } catch (error) {
    console.error("Error al revisar documento:", error);
    res.status(500).send({ message: "Error al revisar documento" });
  }
});

// 4. Convertir aspirante a alumno
adminRouter.post("/aspirantes/:id/convertir", async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [aspirante] = await connection.query(
      "SELECT id, nombre, apellido_paterno FROM usuarios WHERE id = ? AND rol = 'aspirante'",
      [req.params.id]
    );
    if (aspirante.length === 0) {
      await connection.rollback();
      return res.status(404).send({ message: "Aspirante no encontrado" });
    }

    const [docs] = await connection.query(
      "SELECT tipo_documento, estatus FROM expediente_aspirantes WHERE aspirante_id = ?",
      [req.params.id]
    );

    const tiposRequeridos = ["acta_nacimiento", "curp", "certificado_bachillerato", "comprobante_domicilio"];
    const subidos = docs.map((d) => d.tipo_documento);
    const tiposFaltantes = tiposRequeridos.filter((t) => !subidos.includes(t));
    const rechazados = docs.filter((d) => d.estatus === "rechazado");

    if (tiposFaltantes.length > 0) {
      await connection.rollback();
      return res.status(400).send({ message: "Faltan documentos: " + tiposFaltantes.join(", ") });
    }
    if (rechazados.length > 0) {
      await connection.rollback();
      return res.status(400).send({ message: "Hay documentos rechazados. Revisa antes de convertir." });
    }

    await connection.query("UPDATE usuarios SET rol = 'alumno' WHERE id = ?", [req.params.id]);
    await connection.commit();
    res.send({ message: "Aspirante convertido a alumno exitosamente" });
  } catch (error) {
    await connection.rollback();
    console.error("Error al convertir aspirante:", error);
    res.status(500).send({ message: "Error al convertir aspirante" });
  } finally {
    connection.release();
  }
});

// --- M�DULO MIGRACI�N ---


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

// ==========================================
// NUEVO: EXPLORADOR DE ARCHIVOS (ADMIN)
// ==========================================
adminRouter.get("/archivos/explorar", async (req, res) => {
  try {
    // 1. Obtenemos la ruta que queremos ver (si está vacía, es la raíz 'uploads')
    const rutaSolicitada = req.query.ruta || "";

    // SEGURIDAD CRÍTICA: Evitar que alguien ponga ".." para salir de uploads
    if (rutaSolicitada.includes("..")) {
      return res
        .status(400)
        .send({ message: "Acceso denegado: Ruta inválida." });
    }

    // 2. Construimos la ruta completa usando tu variable global 'uploadsDir'
    // (uploadsDir ya está definida al inicio de tu index.js, línea 43)
    const rutaCompleta = path.join(uploadsDir, rutaSolicitada);

    // 3. Verificamos si existe
    if (!fs.existsSync(rutaCompleta)) {
      // Si no existe, mandamos lista vacía en vez de error para no romper el front
      return res.json([]);
    }

    // 4. Leemos el contenido
    const elementos = fs.readdirSync(rutaCompleta, { withFileTypes: true });

    // 5. Formateamos la respuesta
    const respuesta = elementos.map((dirent) => {
      // Calculamos la ruta relativa para seguir navegando
      // Ejemplo: si estamos en "perfiles" y vemos "foto.jpg", la ruta es "perfiles/foto.jpg"
      const rutaItem = rutaSolicitada
        ? path.join(rutaSolicitada, dirent.name)
        : dirent.name;

      // Corregimos las barras invertidas de Windows (\) por normales (/)
      const rutaWeb = rutaItem.replace(/\\/g, "/");

      return {
        nombre: dirent.name,
        tipo: dirent.isDirectory() ? "carpeta" : "archivo",
        ruta: rutaWeb,
        // URL para descargar/ver (apuntamos a tu carpeta estática /uploads)
        url: `/uploads/${rutaWeb}`,
      };
    });

    // Ordenamos: Carpetas primero, luego archivos alfabéticamente
    respuesta.sort((a, b) => {
      if (a.tipo === b.tipo) return a.nombre.localeCompare(b.nombre);
      return a.tipo === "carpeta" ? -1 : 1;
    });

    res.json(respuesta);
  } catch (error) {
    console.error("Error en explorador:", error);
    res.status(500).send({ message: "Error al leer archivos." });
  }
});

// ==========================================
// MÓDULO GOOGLE DRIVE (NUBE PRIVADA)
// ==========================================
const driveRouter = express.Router();
// No necesitamos verifyToken aquí si ya lo usaste globalmente en apiRouter,
// pero por seguridad lo dejamos o verificamos si apiRouter ya lo tiene.
// Como lo pegaremos dentro de apiRouter, heredará la seguridad.

// Helper: Obtener ruta raíz del usuario
const getUserRoot = (userId) =>
  path.join(uploadsDir, "drive", `usuario_${userId}`);

// 1. LISTAR ARCHIVOS (Soporte para carpetas compartidas)
driveRouter.get("/list", async (req, res) => {
  try {
    const userId = req.user.id;
    const rutaRelativa = req.query.ruta || "";
    // NUEVO: Recibimos el ID del dueño de la carpeta que estamos viendo
    const ownerIdParam = req.query.ownerId;

    if (rutaRelativa.includes(".."))
      return res.status(400).send({ message: "Ruta inválida" });

    // LÓGICA DE DUEÑO:
    // Si me mandan un ownerId y NO es el mío, significa que estoy explorando la carpeta de otro.
    // Si no mandan nada, asumo que es mi propia carpeta.
    const targetUserId =
      ownerIdParam && ownerIdParam !== "null" ? ownerIdParam : userId;

    // Construimos la ruta física basada en el usuario objetivo (Yo o el Admin)
    const userRoot = path.join(uploadsDir, "drive", `usuario_${targetUserId}`);
    const targetPath = path.join(userRoot, rutaRelativa);

    let respuesta = [];

    // A) LEER ARCHIVOS FÍSICOS (Del usuario objetivo)
    if (fs.existsSync(targetPath)) {
      const elementos = fs.readdirSync(targetPath, { withFileTypes: true });
      respuesta = elementos.map((dirent) => {
        const rutaClean = rutaRelativa
          ? path.join(rutaRelativa, dirent.name).replace(/\\/g, "/")
          : dirent.name;

        return {
          nombre: dirent.name,
          tipo: dirent.isDirectory() ? "carpeta" : "archivo",
          ruta: rutaClean,
          // La URL de descarga siempre debe apuntar al dueño real del archivo
          url: `/uploads/drive/usuario_${targetUserId}/${rutaClean}`,
          es_propio: parseInt(targetUserId) === userId, // ¿Es mío o prestado?
          owner_id: targetUserId, // Devolvemos quién es el dueño para seguir navegando
        };
      });
    }

    // B) LEER LO QUE ME COMPARTIERON (SOLO SI ESTOY EN MI RAÍZ)
    // Solo mostramos "Compartidos conmigo" si estoy en mi propia raíz (userId == targetUserId y sin ruta)
    if (parseInt(targetUserId) === userId && rutaRelativa === "") {
      const [compartidos] = await db.query(
        `SELECT dc.ruta_item, dc.tipo_item, dc.permiso, u.id as owner_id, u.nombre, u.apellido_paterno
         FROM drive_compartidos dc
         JOIN usuarios u ON dc.propietario_id = u.id
         WHERE dc.usuario_compartido_id = ?`,
        [userId],
      );

      const itemsCompartidos = compartidos.map((item) => {
        const nombreArchivo = path.basename(item.ruta_item);
        return {
          // Agregamos el nombre del dueño para identificar fácil
          nombre: `📁 ${nombreArchivo} (de ${item.nombre})`,
          tipo: item.tipo_item,
          ruta: item.ruta_item,
          url: `/uploads/drive/usuario_${item.owner_id}/${item.ruta_item}`,
          es_propio: false,
          permiso: item.permiso,
          owner_id: item.owner_id, // <--- IMPORTANTE: El ID del dueño real (Admin)
          es_compartido_root: true, // Marca para saber que este es el punto de entrada
        };
      });

      respuesta = [...respuesta, ...itemsCompartidos];
    }

    // Ordenar
    respuesta.sort((a, b) =>
      a.tipo === b.tipo ? 0 : a.tipo === "carpeta" ? -1 : 1,
    );

    res.json(respuesta);
  } catch (error) {
    console.error("Error Drive List:", error);
    res.status(500).send({ message: "Error al leer archivos" });
  }
});

// 2. CREAR CARPETA
driveRouter.post("/folder", async (req, res) => {
  try {
    const { nombre, rutaActual } = req.body;
    const cleanName = nombre.replace(/[^a-zA-Z0-9 _-]/g, "");
    const targetPath = path.join(
      getUserRoot(req.user.id),
      rutaActual || "",
      cleanName,
    );

    if (!fs.existsSync(targetPath)) {
      fs.mkdirSync(targetPath, { recursive: true });
      res.json({ message: "Carpeta creada" });
    } else {
      res.status(400).json({ message: "La carpeta ya existe" });
    }
  } catch (error) {
    res.status(500).send({ message: "Error al crear carpeta" });
  }
});

// 3. SUBIR ARCHIVO
const driveStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    // ✅ AGREGAR ESTOS LOGS
    console.log("📥 Backend recibió:");
    console.log("- rutaActual del body:", req.body.rutaActual);
    console.log("- Usuario ID:", req.user.id);

    const userPath = path.join(
      getUserRoot(req.user.id),
      req.body.rutaActual || "",
    );

    // ✅ AGREGAR ESTE LOG
    console.log("- Ruta completa destino:", userPath);

    if (!fs.existsSync(userPath)) fs.mkdirSync(userPath, { recursive: true });
    cb(null, userPath);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});
const uploadDrive = multer({ storage: driveStorage });

driveRouter.post("/upload", uploadDrive.single("archivo"), (req, res) => {
  res.json({ message: "Archivo subido correctamente" });
});

// 4. ELIMINAR
driveRouter.delete("/item", async (req, res) => {
  try {
    const { ruta, tipo } = req.query;
    const fullPath = path.join(getUserRoot(req.user.id), ruta);

    if (!fs.existsSync(fullPath))
      return res.status(404).send({ message: "No existe" });

    if (tipo === "carpeta") {
      fs.rmSync(fullPath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(fullPath);
    }
    res.json({ message: "Eliminado correctamente" });
  } catch (error) {
    res.status(500).send({ message: "Error al eliminar" });
  }
});

// Registrar el router
apiRouter.use("/drive", driveRouter);

apiRouter.use("/admin", adminRouter); // Registra el router de admin en /api/admin

// --- AGREGA ESTA FUNCIÓN HELPER ---
// Verifica si un usuario (por ID y Rol) pertenece a un curso (grupo+asignatura)
async function checkUserCourseMembership(
  userId,
  userRol,
  grupoId,
  asignaturaId,
) {
  // 1. Si es Admin, entra a todo
  if (userRol === "admin") return true;

  // 2. Si es Docente, verificamos que tenga la materia asignada
  if (userRol === "docente") {
    const [[curso]] = await db.query(
      "SELECT * FROM grupo_asignaturas_docentes WHERE grupo_id = ? AND asignatura_id = ? AND docente_id = ?",
      [grupoId, asignaturaId, userId],
    );
    return !!curso;
  }

  // 3. SI ES ALUMNO: Solo verificamos que esté inscrito en el grupo
  // (Simplificamos para evitar errores de permisos)
  if (userRol === "alumno") {
    const [[inscripcion]] = await db.query(
      "SELECT * FROM grupo_alumnos WHERE grupo_id = ? AND alumno_id = ?",
      [grupoId, userId],
    );
    return !!inscripcion;
  }

  return false;
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

// Función helper para asegurar que existe una config (se usará en GET)
async function getOrCreateAulaConfig(grupoId, asignaturaId) {
  // 1. Asegurar registro en tabla principal
  await db.query(
    "INSERT IGNORE INTO aula_virtual_config (grupo_id, asignatura_id) VALUES (?, ?)",
    [grupoId, asignaturaId],
  );

  // 2. Obtener datos generales
  const [[config]] = await db.query(
    `SELECT avc.*, g.modalidad, g.estatus, g.nombre_grupo, a.nombre_asignatura 
     FROM aula_virtual_config avc
     JOIN grupos g ON avc.grupo_id = g.id 
     JOIN asignaturas a ON avc.asignatura_id = a.id
     WHERE avc.grupo_id = ? AND avc.asignatura_id = ?`,
    [grupoId, asignaturaId],
  );

  // 3. Obtener Criterios de la tabla relacional
  const [criteriosDb] = await db.query(
    "SELECT nombre_criterio, porcentaje, tipo_origen FROM criterios_evaluacion WHERE grupo_id = ? AND asignatura_id = ?",
    [grupoId, asignaturaId],
  );

  // Formatear para el frontend
  if (config) {
    config.criterios = criteriosDb.length > 0 ? criteriosDb : [];
  }

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

// PUT (Docente): Actualizar Configuración y CRITERIOS DE EVALUACIÓN
docenteRouter.put(
  "/aula-virtual/:grupoId/:asignaturaId/config",
  async (req, res) => {
    const { grupoId, asignaturaId } = req.params;
    const {
      enlace_videollamada,
      descripcion_curso,
      objetivos,
      evaluacion, // Texto descriptivo opcional
      horario,
      contacto_docente,
      notificar_inicio,
      criterios, // ARRAY DE CRITERIOS (Este es el importante)
    } = req.body;

    const docente_id = req.user.id;

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Validar Permiso
      const [[curso]] = await connection.query(
        "SELECT * FROM grupo_asignaturas_docentes WHERE grupo_id = ? AND asignatura_id = ? AND docente_id = ?",
        [grupoId, asignaturaId, docente_id],
      );
      if (!curso) {
        await connection.rollback();
        return res.status(403).send({ message: "No tienes permiso." });
      }

      // 2. Guardar Configuración GENERAL (Solo textos y link)
      // Nota: Quitamos los campos de porcentaje de aquí para evitar errores si las columnas no existen
      const sqlConfig = `
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

      await connection.query(sqlConfig, [
        grupoId,
        asignaturaId,
        enlace_videollamada || null,
        descripcion_curso || null,
        objetivos || null,
        evaluacion || null,
        horario || null,
        contacto_docente || null,
      ]);

      // 3. GUARDAR CRITERIOS DINÁMICOS
      // Primero borramos los viejos para este curso y luego insertamos los nuevos
      if (criterios && Array.isArray(criterios)) {
        // A) Borrar criterios anteriores
        await connection.query(
          "DELETE FROM criterios_evaluacion WHERE grupo_id = ? AND asignatura_id = ?",
          [grupoId, asignaturaId],
        );

        // B) Insertar los nuevos (validando datos)
        for (const crit of criterios) {
          const nombre = crit.nombre || "Criterio";
          const pct = parseInt(crit.porcentaje) || 0;
          const tipo = crit.tipo || "manual";

          await connection.query(
            "INSERT INTO criterios_evaluacion (grupo_id, asignatura_id, nombre_criterio, porcentaje, tipo_origen) VALUES (?, ?, ?, ?, ?)",
            [grupoId, asignaturaId, nombre, pct, tipo],
          );
        }
      }

      // 4. LÓGICA DE NOTIFICACIONES (Si inició clase en vivo)
      // ... (Puedes mantener tu lógica de notificaciones aquí si la tenías) ...

      await connection.commit();
      res.send({ message: "Configuración guardada correctamente." });
    } catch (error) {
      await connection.rollback();
      console.error("Error al guardar config:", error); // Esto aparecerá en la terminal de Render
      res
        .status(500)
        .send({ message: "Error interno al guardar: " + error.message });
    } finally {
      connection.release();
    }
  },
);

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

// POST (Docente): Crear tarea + Notificaciones (Con Rúbricas)
docenteRouter.post(
  "/aula-virtual/:grupoId/:asignaturaId/tareas",
  async (req, res) => {
    console.log("➡️ INICIO: Creando tarea...");
    try {
      const { grupoId, asignaturaId } = req.params;
      const { titulo, descripcion, fecha_limite, rubricas } = req.body; // <-- SE AGREGÓ 'rubricas'
      const docente_id = req.user.id;

      // 1. Corrección de fecha
      const fechaFinal =
        fecha_limite && fecha_limite !== "" ? fecha_limite : null;

      // 2. Validar permiso
      const [[curso]] = await db.query(
        "SELECT * FROM grupo_asignaturas_docentes WHERE grupo_id = ? AND asignatura_id = ? AND docente_id = ?",
        [grupoId, asignaturaId, docente_id],
      );
      if (!curso) {
        return res.status(403).send({ message: "No tienes permiso." });
      }

      // Convertir rúbricas a JSON string si existen y tienen datos
      const rubricaJson =
        rubricas && rubricas.length > 0 ? JSON.stringify(rubricas) : null;

      // 3. Insertar Tarea (AHORA INCLUYE LA COLUMNA 'rubrica')
      const [result] = await db.query(
        "INSERT INTO tareas (grupo_id, asignatura_id, docente_id, titulo, descripcion, fecha_limite, rubrica, fecha_creacion) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())",
        [
          grupoId,
          asignaturaId,
          docente_id,
          titulo,
          descripcion || null,
          fechaFinal,
          rubricaJson, // <-- SE INSERTA EL JSON
        ],
      );
      const newTaskId = result.insertId;
      console.log(`✅ Tarea creada con ID: ${newTaskId}`);

      // 4. NOTIFICACIONES (Se mantiene tu código exacto)
      try {
        const [[materia]] = await db.query(
          "SELECT nombre_asignatura FROM asignaturas WHERE id = ?",
          [asignaturaId],
        );
        const nombreMateria = materia ? materia.nombre_asignatura : "Clase";

        const mensaje = `Nueva tarea en ${nombreMateria}: "${titulo}"`;
        const urlDestino = `/alumno/grupo/${grupoId}/asignatura/${asignaturaId}/aula`;

        const [alumnos] = await db.query(
          "SELECT alumno_id FROM grupo_alumnos WHERE grupo_id = ?",
          [grupoId],
        );

        for (const alumno of alumnos) {
          const idAlumno = alumno.alumno_id;
          await db.query(
            "INSERT INTO notificaciones (usuario_id, mensaje, url_destino, leido, fecha, tipo) VALUES (?, ?, ?, 0, NOW(), 'tarea')",
            [idAlumno, mensaje, urlDestino],
          );

          const [tokens] = await db.query(
            "SELECT token FROM push_tokens WHERE user_id = ?",
            [idAlumno],
          );

          if (tokens.length > 0) {
            const expoMessages = tokens.map((t) => ({
              to: t.token,
              sound: "default",
              channelId: "default",
              priority: "high",
              title: "Nueva Tarea 📚",
              body: mensaje,
              data: { url: urlDestino },
            }));

            fetch("https://exp.host/--/api/v2/push/send", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(expoMessages),
            }).catch((e) => console.error("Error push:", e));
          }
        }
      } catch (notifError) {
        console.error("⚠️ Error en notificación:", notifError.message);
      }

      res
        .status(201)
        .send({ message: "Tarea creada correctamente", newTaskId });
    } catch (error) {
      console.error("🔥 Error al crear tarea:", error);
      res
        .status(500)
        .send({ message: "Error en el servidor: " + error.message });
    }
  },
);

// POST (Docente): Calificar o Re-Calificar una entrega
docenteRouter.post(
  "/aula-virtual/entrega/:entregaId/calificar",
  async (req, res) => {
    try {
      const { entregaId } = req.params;
      const { calificacion, comentario_docente } = req.body;
      const docente_id = req.user.id;

      if (!calificacion && calificacion !== 0) {
        return res
          .status(400)
          .send({ message: "La calificación es requerida." });
      }
      const calNum = parseFloat(calificacion);

      // 1. Obtener datos PREVIOS de la entrega (para saber si ya estaba calificada)
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
        return res.status(403).send({ message: "No tienes permiso." });
      }

      // Verificamos si ya tenía nota antes
      const esRecalificacion = entrega.calificacion !== null;

      // 2. Actualizar en BD
      await db.query(
        "UPDATE tareas_entregas SET calificacion = ?, comentario_docente = ? WHERE id = ?",
        [calNum, comentario_docente || null, entregaId],
      );

      // --- 3. NOTIFICAR AL ALUMNO ---
      try {
        let mensaje = "";
        let tituloPush = "";

        if (esRecalificacion) {
          mensaje = `Tu calificación en '${entrega.titulo}' ha sido actualizada a: ${calNum}/100`;
          tituloPush = "Calificación Modificada 📝";
        } else {
          mensaje = `¡Calificación recibida! (${calNum}/100) en la tarea '${entrega.titulo}'`;
          tituloPush = "¡Tarea Calificada! 💯";
        }

        const urlDestino = `/alumno/grupo/${entrega.grupo_id}/asignatura/${entrega.asignatura_id}/aula`;

        // Campanita
        await db.query(
          "INSERT INTO notificaciones (usuario_id, mensaje, url_destino, leido, fecha, tipo) VALUES (?, ?, ?, 0, NOW(), 'calificacion')",
          [entrega.alumno_id, mensaje, urlDestino],
        );

        // Push Android
        const [tokens] = await db.query(
          "SELECT token FROM push_tokens WHERE user_id = ?",
          [entrega.alumno_id],
        );

        if (tokens.length > 0) {
          const messages = tokens.map((t) => ({
            to: t.token,
            sound: "default",
            channelId: "default",
            priority: "high",
            title: tituloPush,
            body: mensaje,
            data: { url: urlDestino },
          }));

          fetch("https://exp.host/--/api/v2/push/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(messages),
          }).catch((e) => console.error("Error push alumno:", e));
        }
      } catch (notifError) {
        console.error("Error notificación calificación:", notifError);
      }

      res.send({
        message: esRecalificacion
          ? "Calificación actualizada."
          : "Calificación guardada.",
      });
      enviarAlertaCorreo(
        entrega.alumno_id,
        "📝 Tarea Calificada",
        "Calificación Recibida",
        `<p>El docente ha calificado tu entrega para la tarea: <strong>${entrega.titulo}</strong>.</p>
         <p>Obtuviste: <strong>${calNum} / 100</strong>.</p>`,
      );
    } catch (error) {
      console.error("Error al calificar:", error);
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

// POST (Docente): Subir Recurso (ARCHIVO) + Notificación
docenteRouter.post(
  "/aula-virtual/:grupoId/:asignaturaId/recurso-archivo",
  uploadRecurso.single("archivo_recurso"),
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

      // 1. Validar Permiso
      const [[curso]] = await db.query(
        "SELECT * FROM grupo_asignaturas_docentes WHERE grupo_id = ? AND asignatura_id = ? AND docente_id = ?",
        [grupoId, asignaturaId, docente_id],
      );
      if (!curso) {
        return res.status(403).send({ message: "No tienes permiso." });
      }

      // 2. Guardar Recurso en BD
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

      // --- 3. NOTIFICACIONES (Igual que Tareas) ---
      try {
        // A) Nombre de la materia
        const [[materia]] = await db.query(
          "SELECT nombre_asignatura FROM asignaturas WHERE id = ?",
          [asignaturaId],
        );
        const nombreMateria = materia ? materia.nombre_asignatura : "Clase";

        const mensaje = `Nuevo material en ${nombreMateria}: "${titulo}"`;
        const urlDestino = `/alumno/grupo/${grupoId}/asignatura/${asignaturaId}/aula`;

        // B) Obtener Alumnos
        const [alumnos] = await db.query(
          "SELECT alumno_id FROM grupo_alumnos WHERE grupo_id = ?",
          [grupoId],
        );

        // C) Bucle de Notificación
        for (const alumno of alumnos) {
          const idAlumno = alumno.alumno_id;

          // Campanita
          await db.query(
            "INSERT INTO notificaciones (usuario_id, mensaje, url_destino, leido, fecha, tipo) VALUES (?, ?, ?, 0, NOW(), 'recurso')",
            [idAlumno, mensaje, urlDestino],
          );

          // Push Android
          const [tokens] = await db.query(
            "SELECT token FROM push_tokens WHERE user_id = ?",
            [idAlumno],
          );
          if (tokens.length > 0) {
            const messages = tokens.map((t) => ({
              to: t.token,
              sound: "default",
              channelId: "default",
              priority: "high",
              title: "Nuevo Material 📎", // Icono de clip para archivos
              body: mensaje,
              data: { url: urlDestino },
            }));
            fetch("https://exp.host/--/api/v2/push/send", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(messages),
            }).catch((e) => console.error("Error push:", e));
          }
        }
      } catch (notifError) {
        console.error("Error en notificaciones de recurso:", notifError);
      }

      res.status(201).send({ message: "Archivo subido y notificado." });
    } catch (error) {
      console.error("Error al subir recurso:", error);
      res.status(500).send({ message: "Error en el servidor." });
    }
  },
);

// POST (Docente): Subir Recurso (ENLACE) + Notificación
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

      // 1. Validar Permiso
      const [[curso]] = await db.query(
        "SELECT * FROM grupo_asignaturas_docentes WHERE grupo_id = ? AND asignatura_id = ? AND docente_id = ?",
        [grupoId, asignaturaId, docente_id],
      );
      if (!curso) {
        return res.status(403).send({ message: "No tienes permiso." });
      }

      // 2. Guardar Enlace en BD
      await db.query(
        "INSERT INTO recursos_clase (grupo_id, asignatura_id, docente_id, titulo, tipo_recurso, ruta_o_url) VALUES (?, ?, ?, ?, 'enlace', ?)",
        [grupoId, asignaturaId, docente_id, titulo, url],
      );

      // --- 3. NOTIFICACIONES ---
      try {
        const [[materia]] = await db.query(
          "SELECT nombre_asignatura FROM asignaturas WHERE id = ?",
          [asignaturaId],
        );
        const nombreMateria = materia ? materia.nombre_asignatura : "Clase";

        const mensaje = `Nuevo enlace en ${nombreMateria}: "${titulo}"`;
        const urlDestino = `/alumno/grupo/${grupoId}/asignatura/${asignaturaId}/aula`;

        const [alumnos] = await db.query(
          "SELECT alumno_id FROM grupo_alumnos WHERE grupo_id = ?",
          [grupoId],
        );

        for (const alumno of alumnos) {
          const idAlumno = alumno.alumno_id;

          // Campanita
          await db.query(
            "INSERT INTO notificaciones (usuario_id, mensaje, url_destino, leido, fecha, tipo) VALUES (?, ?, ?, 0, NOW(), 'recurso')",
            [idAlumno, mensaje, urlDestino],
          );

          // Push Android
          const [tokens] = await db.query(
            "SELECT token FROM push_tokens WHERE user_id = ?",
            [idAlumno],
          );
          if (tokens.length > 0) {
            const messages = tokens.map((t) => ({
              to: t.token,
              sound: "default",
              channelId: "default",
              priority: "high",
              title: "Nuevo Enlace 🔗", // Icono de link para enlaces
              body: mensaje,
              data: { url: urlDestino },
            }));
            fetch("https://exp.host/--/api/v2/push/send", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(messages),
            }).catch((e) => console.error("Error push:", e));
          }
        }
      } catch (notifError) {
        console.error("Error en notificaciones de enlace:", notifError);
      }

      res.status(201).send({ message: "Enlace guardado y notificado." });
    } catch (error) {
      console.error("Error al guardar enlace:", error);
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

// POST: Guardar calificaciones de criterios manuales (ej: Exposición, Maqueta)
docenteRouter.post("/calificar-criterio-manual", async (req, res) => {
  const { criterio_id, calificaciones } = req.body; // calificaciones = [{alumno_id, nota}, ...]

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    for (const item of calificaciones) {
      // Upsert: Si ya existe la nota la actualiza, si no, la crea
      await connection.query(
        `INSERT INTO calificaciones_criterios (criterio_id, alumno_id, calificacion) 
         VALUES (?, ?, ?) 
         ON DUPLICATE KEY UPDATE calificacion = VALUES(calificacion)`,
        [criterio_id, item.alumno_id, item.nota],
      );
    }

    await connection.commit();
    res.send({ message: "Notas guardadas correctamente." });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).send({ message: "Error al guardar notas." });
  } finally {
    connection.release();
  }
});

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

// --- RUTA CORREGIDA: GUARDAR ASISTENCIA (AVISA TODO: PRESENTE Y FALTA) ---
docenteRouter.post(
  "/aula-virtual/sesion/:sesionId/asistencia",
  async (req, res) => {
    try {
      const { sesionId } = req.params;
      const { asistencias } = req.body;
      const docente_id = req.user.id;

      if (!asistencias || typeof asistencias !== "object") {
        return res
          .status(400)
          .send({ message: "Formato de datos incorrecto." });
      }

      // 1. Obtener datos de la sesión y materia
      const [[sesion]] = await db.query(
        `SELECT s.id, s.grupo_id, s.asignatura_id, a.nombre_asignatura 
         FROM clases_sesiones s
         JOIN asignaturas a ON s.asignatura_id = a.id
         WHERE s.id = ? AND s.docente_id = ?`,
        [sesionId, docente_id],
      );

      if (!sesion) {
        return res
          .status(404)
          .send({ message: "Sesión no encontrada o no te pertenece." });
      }

      const connection = await db.getConnection();
      try {
        await connection.beginTransaction();

        for (const alumnoId in asistencias) {
          const estatus = asistencias[alumnoId];

          // Validar estatus válidos
          if (
            !["presente", "ausente", "justificado", "retardo"].includes(estatus)
          ) {
            continue;
          }

          // A) Guardar en BD
          await connection.query(
            `INSERT INTO asistencia (sesion_id, alumno_id, estatus) 
             VALUES (?, ?, ?) 
             ON DUPLICATE KEY UPDATE estatus = VALUES(estatus)`,
            [sesionId, alumnoId, estatus],
          );

          // B) --- NOTIFICACIONES (SIN FILTROS) ---
          // Ahora avisa SIEMPRE, sea presente, falta o retardo.

          const mensaje = `Asistencia: Se te ha marcado como ${estatus.toUpperCase()} en ${sesion.nombre_asignatura}`;
          const linkAula = `/alumno/grupo/${sesion.grupo_id}/asignatura/${sesion.asignatura_id}/aula`;

          // 1. Campanita
          await connection.query(
            "INSERT INTO notificaciones (usuario_id, mensaje, url_destino, leido, fecha, tipo) VALUES (?, ?, ?, 0, NOW(), 'asistencia')",
            [alumnoId, mensaje, linkAula],
          );

          // 2. Push Android
          const [tokens] = await connection.query(
            "SELECT token FROM push_tokens WHERE user_id = ?",
            [alumnoId],
          );

          if (tokens.length > 0) {
            const expoMessages = tokens.map((t) => ({
              to: t.token,
              sound: "default",
              channelId: "default",
              priority: "high",
              title: "Reporte de Asistencia 📅",
              body: mensaje,
              data: { url: linkAula },
            }));

            fetch("https://exp.host/--/api/v2/push/send", {
              method: "POST",
              headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
              },
              body: JSON.stringify(expoMessages),
            }).catch((e) => console.error(e));
          }
        }

        await connection.commit();
        res.send({ message: "Asistencia guardada y notificada." });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
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

// POST: Crear un nuevo hilo en el foro + Notificar a todos
foroRouter.post(
  "/:grupoId/:asignaturaId/hilos",
  canAccessForo,
  async (req, res) => {
    try {
      const { titulo, mensaje_original } = req.body;
      const { grupoId, asignaturaId } = req.params;
      const creadorId = req.user.id; // Quién escribe

      if (!titulo || !mensaje_original) {
        return res
          .status(400)
          .send({ message: "El título y el mensaje son requeridos." });
      }

      // 1. Guardar el Hilo
      const [result] = await db.query(
        "INSERT INTO foros_hilos (grupo_id, asignatura_id, titulo, mensaje_original, creado_por_usuario_id, fecha_creacion) VALUES (?, ?, ?, ?, ?, NOW())",
        [grupoId, asignaturaId, titulo, mensaje_original, creadorId],
      );

      const newHiloId = result.insertId;

      // --- 2. NOTIFICACIONES MASIVAS (A todo el salón) ---
      try {
        const nombreCreador = `${req.user.nombre} ${req.user.apellido_paterno}`;

        // Buscamos el nombre de la materia para que el mensaje sea claro
        const [[materia]] = await db.query(
          "SELECT nombre_asignatura FROM asignaturas WHERE id = ?",
          [asignaturaId],
        );
        const nombreMateria = materia ? materia.nombre_asignatura : "la clase";

        const mensajeNotif = `${nombreCreador} abrió un debate en ${nombreMateria}: "${titulo}"`;

        // URL universal: sirve tanto para el alumno como para el docente (el frontend redirige según el rol)
        // Ojo: Asegúrate que tu frontend maneje esta ruta o ajústala.
        // Si tu frontend separa rutas, el alumno va a /alumno/... y el docente a /docente/...
        // Para simplificar, guardaremos la ruta "base" y dejamos que el usuario navegue.
        // Pero para ser precisos, construiremos la URL según a quién le avisamos abajo.

        // A) Obtener al Docente del curso
        const [[docente]] = await db.query(
          "SELECT docente_id FROM grupo_asignaturas_docentes WHERE grupo_id = ? AND asignatura_id = ?",
          [grupoId, asignaturaId],
        );

        // B) Obtener a todos los Alumnos del grupo
        const [alumnos] = await db.query(
          "SELECT alumno_id FROM grupo_alumnos WHERE grupo_id = ?",
          [grupoId],
        );

        // Juntamos a todos los destinatarios en una lista única
        let destinatarios = [];

        // Agregamos alumnos
        alumnos.forEach((a) =>
          destinatarios.push({ id: a.alumno_id, rol: "alumno" }),
        );
        // Agregamos docente (si existe)
        if (docente)
          destinatarios.push({ id: docente.docente_id, rol: "docente" });

        // C) Bucle de envío
        for (const persona of destinatarios) {
          // NO notificar al que acaba de crear el hilo
          if (persona.id === creadorId) continue;

          // Definimos la URL correcta según el rol de quien recibe la alerta
          const urlDestino = `/${persona.rol}/grupo/${grupoId}/asignatura/${asignaturaId}/foro/hilo/${newHiloId}`;

          // 1. Campanita (BD)
          await db.query(
            "INSERT INTO notificaciones (usuario_id, mensaje, url_destino, leido, fecha, tipo) VALUES (?, ?, ?, 0, NOW(), 'foro')",
            [persona.id, mensajeNotif, urlDestino],
          );

          // 2. Push Android
          const [tokens] = await db.query(
            "SELECT token FROM push_tokens WHERE user_id = ?",
            [persona.id],
          );
          if (tokens.length > 0) {
            const messages = tokens.map((t) => ({
              to: t.token,
              sound: "default",
              channelId: "default",
              priority: "high",
              title: "Nuevo Tema en el Foro 💬",
              body: mensajeNotif,
              data: { url: urlDestino },
            }));

            fetch("https://exp.host/--/api/v2/push/send", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(messages),
            }).catch((e) => console.error("Error Push Foro:", e));
          }
        }
      } catch (e) {
        console.error("Error notificando hilo:", e);
      }

      res
        .status(201)
        .json({ message: "Hilo creado con éxito.", hiloId: newHiloId });
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

// POST: Responder a un hilo + Notificar
foroRouter.post("/hilo/:hiloId/respuestas", canAccessForo, async (req, res) => {
  try {
    const { mensaje } = req.body;
    const { hiloId } = req.params;
    const quienRespondeId = req.user.id;
    const nombreResponde = `${req.user.nombre} ${req.user.apellido_paterno}`;

    if (!mensaje) {
      return res.status(400).send({ message: "El mensaje es requerido." });
    }

    // 1. Guardar Respuesta
    await db.query(
      "INSERT INTO foros_respuestas (hilo_id, mensaje, creado_por_usuario_id, fecha_creacion) VALUES (?, ?, ?, NOW())",
      [hiloId, mensaje, quienRespondeId],
    );

    // --- 2. NOTIFICACIONES (Aquí avisamos que alguien contestó) ---
    try {
      // Necesitamos saber de qué grupo/materia es este hilo para buscar a la gente
      const [[hilo]] = await db.query(
        "SELECT grupo_id, asignatura_id, titulo FROM foros_hilos WHERE id = ?",
        [hiloId],
      );

      if (hilo) {
        const { grupo_id, asignatura_id, titulo } = hilo;
        const mensajeNotif = `${nombreResponde} respondió en: "${titulo}"`;

        // A) Buscar participantes (Docente + Alumnos)
        const [[docente]] = await db.query(
          "SELECT docente_id FROM grupo_asignaturas_docentes WHERE grupo_id = ? AND asignatura_id = ?",
          [grupo_id, asignatura_id],
        );
        const [alumnos] = await db.query(
          "SELECT alumno_id FROM grupo_alumnos WHERE grupo_id = ?",
          [grupo_id],
        );

        let destinatarios = [];
        alumnos.forEach((a) =>
          destinatarios.push({ id: a.alumno_id, rol: "alumno" }),
        );
        if (docente)
          destinatarios.push({ id: docente.docente_id, rol: "docente" });

        // B) Bucle de envío
        for (const persona of destinatarios) {
          // NO notificar al que está escribiendo la respuesta
          if (persona.id === quienRespondeId) continue;

          const urlDestino = `/${persona.rol}/grupo/${grupo_id}/asignatura/${asignatura_id}/foro/hilo/${hiloId}`;

          // Campanita
          await db.query(
            "INSERT INTO notificaciones (usuario_id, mensaje, url_destino, leido, fecha, tipo) VALUES (?, ?, ?, 0, NOW(), 'foro')",
            [persona.id, mensajeNotif, urlDestino],
          );

          // Push Android
          const [tokens] = await db.query(
            "SELECT token FROM push_tokens WHERE user_id = ?",
            [persona.id],
          );
          if (tokens.length > 0) {
            const messages = tokens.map((t) => ({
              to: t.token,
              sound: "default",
              channelId: "default",
              priority: "high",
              title: "Nueva Respuesta en Foro 🗣️",
              body: mensajeNotif,
              data: { url: urlDestino },
            }));
            fetch("https://exp.host/--/api/v2/push/send", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(messages),
            }).catch((e) => console.error(e));
          }
        }
      }
    } catch (e) {
      console.error("Error notificando respuesta:", e);
    }

    res.status(201).json({ message: "Respuesta publicada." });
  } catch (error) {
    console.error("Error al publicar respuesta:", error);
    res.status(500).send({ message: "Error en el servidor." });
  }
});

// Aplicar el middleware de protección a todas las rutas del foro y registrar el router
apiRouter.use("/foro", foroRouter);

// --- TERMINA NUEVO CÓDIGO (RUTAS FORO) ---

// --- RUTAS DE DOCENTE --- (Ahora estas líneas van después del bloque del foro)

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
          0,
          new Date(),
          'sistema',
        ]);
        await db.query(
          "INSERT INTO notificaciones (usuario_id, mensaje, url_destino, leido, fecha, tipo) VALUES ?",
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
            channelId: "default",
            priority: "high",
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
          0,
          new Date(),
          'sistema',
        ]);
        await db.query(
          "INSERT INTO notificaciones (usuario_id, mensaje, url_destino, leido, fecha, tipo) VALUES ?",
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
            channelId: "default",
            priority: "high",
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

// GET (Alumno): Obtener la config del aula virtual (CON BLOQUEO DE PAGO)
alumnoRouter.get(
  "/aula-virtual/:grupoId/:asignaturaId/config",
  async (req, res) => {
    try {
      const { grupoId, asignaturaId } = req.params;
      const alumnoId = req.user.id;

      // 1. Validar que el alumno está inscrito en este grupo
      const [[inscripcion]] = await db.query(
        "SELECT * FROM grupo_alumnos WHERE grupo_id = ? AND alumno_id = ?",
        [grupoId, alumnoId],
      );
      if (!inscripcion) {
        return res
          .status(403)
          .send({ message: "No estás inscrito en este curso." });
      }

      // 2. COMPROBACIÓN FINANCIERA (¿Tiene pagos vencidos?)
      const [[deuda]] = await db.query(
        "SELECT COUNT(*) as total_vencidos FROM adeudos_alumnos WHERE alumno_id = ? AND estatus_pago = 'vencido'",
        [alumnoId],
      );
      const tieneAdeudosVencidos = deuda.total_vencidos > 0;

      // 3. Obtener Config
      const config = await getOrCreateAulaConfig(grupoId, asignaturaId);

      // Inyectamos el estado de bloqueo al frontend
      config.bloqueado_por_pago = tieneAdeudosVencidos;

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

// POST (Alumno): Entregar o Actualizar tarea
alumnoRouter.post(
  "/aula-virtual/tarea/:tareaId/entregar",
  uploadTarea.single("archivo_tarea"),
  async (req, res) => {
    try {
      const { tareaId } = req.params;
      const { comentario_alumno } = req.body;
      const alumno_id = req.user.id;

      if (!req.file) {
        return res.status(400).send({ message: "No se subió ningún archivo." });
      }

      const { filename, originalname } = req.file;

      // 1. VERIFICAR ESTADO ANTERIOR (Para saber si es actualización)
      // Buscamos si ya existe una entrega de este alumno para esta tarea
      const [[entregaPrevia]] = await db.query(
        "SELECT id FROM tareas_entregas WHERE tarea_id = ? AND alumno_id = ?",
        [tareaId, alumno_id],
      );
      // 1. VALIDAR FECHA LÍMITE (Seguridad en Backend)
      const [[tareaOriginal]] = await db.query(
        "SELECT fecha_limite FROM tareas WHERE id = ?",
        [tareaId],
      );
      if (tareaOriginal && tareaOriginal.fecha_limite) {
        if (new Date() > new Date(tareaOriginal.fecha_limite)) {
          return res.status(403).send({
            message:
              "La fecha límite para esta tarea ha expirado. Envío bloqueado.",
          });
        }
      }

      const esActualizacion = !!entregaPrevia; // True si ya existía, False si es nueva

      // 2. GUARDAR O ACTUALIZAR EN BD
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

      // --- 3. NOTIFICACIÓN AL DOCENTE ---
      try {
        const [[tarea]] = await db.query(
          "SELECT titulo, docente_id, grupo_id, asignatura_id FROM tareas WHERE id = ?",
          [tareaId],
        );

        if (tarea && tarea.docente_id) {
          const alumnoNombre = `${req.user.nombre} ${req.user.apellido_paterno}`;

          // Lógica del mensaje dinámico
          let mensaje = "";
          let tituloPush = "";

          if (esActualizacion) {
            mensaje = `Actualización de entrega: '${alumnoNombre}' modificó su tarea en '${tarea.titulo}'`;
            tituloPush = "Tarea Actualizada 🔄";
          } else {
            mensaje = `Entrega de: '${alumnoNombre}' en la tarea '${tarea.titulo}'`;
            tituloPush = "¡Tarea Entregada! 📥";
          }

          const urlDestino = `/docente/grupo/${tarea.grupo_id}/asignatura/${tarea.asignatura_id}/aula`;

          // A) Campanita
          await db.query(
            "INSERT INTO notificaciones (usuario_id, mensaje, url_destino, leido, fecha, tipo) VALUES (?, ?, ?, 0, NOW(), 'tarea')",
            [tarea.docente_id, mensaje, urlDestino],
          );

          // B) Push Android
          const [tokens] = await db.query(
            "SELECT token FROM push_tokens WHERE user_id = ?",
            [tarea.docente_id],
          );

          if (tokens.length > 0) {
            const messages = tokens.map((t) => ({
              to: t.token,
              sound: "default",
              channelId: "default",
              priority: "high",
              title: tituloPush,
              body: mensaje,
              data: { url: urlDestino },
            }));

            fetch("https://exp.host/--/api/v2/push/send", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(messages),
            }).catch((e) => console.error("Error push docente:", e));
          }
        }
      } catch (notifError) {
        console.error("Error al notificar docente:", notifError);
      }

      res.send({
        message: esActualizacion
          ? "Tarea actualizada correctamente."
          : "Tarea entregada con éxito.",
      });
    } catch (error) {
      console.error("Error al entregar tarea:", error);
      res.status(500).send({ message: "Error en el servidor." });
    }
  },
);

alumnoRouter.get(
  "/aula-virtual/:grupoId/:asignaturaId/recursos",
  getRecursosClase, // <-- Reutilizamos la misma función
);

// --- RUTA CORREGIDA: MIS ASISTENCIAS (FORMATO DE FECHA LIMPIO) ---
alumnoRouter.get(
  "/aula-virtual/:grupoId/:asignaturaId/mis-asistencias",
  async (req, res) => {
    try {
      const { grupoId, asignaturaId } = req.params;
      const alumno_id = req.user.id;

      // 1. Validar inscripción
      const [[inscripcion]] = await db.query(
        "SELECT * FROM grupo_alumnos WHERE grupo_id = ? AND alumno_id = ?",
        [grupoId, alumno_id],
      );
      if (!inscripcion) {
        return res.status(403).send({ message: "No estás inscrito." });
      }

      // 2. Obtener historial con FECHA FORMATEADA
      // Usamos DATE_FORMAT para que la fecha salga bonita desde la base de datos
      const [historial] = await db.query(
        `SELECT 
            cs.id as sesion_id, 
            -- Aquí convertimos la fecha fea en algo legible (Día/Mes/Año Hora:Minuto AM/PM)
            DATE_FORMAT(cs.fecha_sesion, '%d/%m/%Y %h:%i %p') as fecha_bonita,
            cs.fecha_sesion, -- Mantenemos la original por si acaso
            cs.tema_sesion,
            COALESCE(a.estatus, 'ausente') as mi_estatus 
         FROM clases_sesiones cs
         LEFT JOIN asistencia a ON cs.id = a.sesion_id AND a.alumno_id = ?
         WHERE cs.grupo_id = ? AND cs.asignatura_id = ?
         ORDER BY cs.fecha_sesion DESC`,
        [alumno_id, grupoId, asignaturaId],
      );

      // 3. Agregamos el texto "Asistencia" explícitamente
      const respuesta = historial.map((item) => ({
        ...item,
        // Creamos un campo 'titulo' o reemplazamos fecha para que diga lo que quieres
        titulo_asistencia: `Asistencia: ${item.fecha_bonita}`,
        fecha_mostrar: item.fecha_bonita, // Usa este campo en tu frontend
      }));

      res.json(respuesta);
    } catch (error) {
      console.error("Error al obtener historial de asistencia:", error);
      res.status(500).send({ message: "Error en el servidor." });
    }
  },
);

// --- RUTA FALTANTE: DETALLE DE TAREA (INDISPENSABLE PARA APP MÓVIL) ---
alumnoRouter.get("/aula-virtual/tareas/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const alumno_id = req.user.id;

    // 1. Buscar la tarea básica
    const [tareas] = await db.query("SELECT * FROM tareas WHERE id = ?", [id]);

    if (tareas.length === 0) {
      return res.status(404).send({ message: "Tarea no encontrada." });
    }
    const tarea = tareas[0];

    // 2. Buscar si el alumno ya la entregó (para pintar el estado "Entregado" en el móvil)
    const [entregas] = await db.query(
      "SELECT * FROM tareas_entregas WHERE tarea_id = ? AND alumno_id = ?",
      [id, alumno_id],
    );

    // 3. Adjuntar la entrega al objeto tarea
    tarea.entrega_alumno = entregas.length > 0 ? entregas[0] : null;

    res.json(tarea);
  } catch (error) {
    console.error("Error al obtener detalle de tarea:", error);
    res.status(500).send({ message: "Error en el servidor." });
  }
});

// --- TERMINA NUEVO CÓDIGO ---
apiRouter.use("/alumno", alumnoRouter);
// Registra el router de alumno en /api/alumno

// --- AGREGA ESTO A TU INDEX.JS (DENTRO DE ALUMNO ROUTER) ---

// GET (Alumno): Obtener detalle de una tarea específica por ID
alumnoRouter.get("/aula-virtual/tareas/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const alumno_id = req.user.id;

    // 1. Buscar la tarea por ID
    const [tareas] = await db.query("SELECT * FROM tareas WHERE id = ?", [id]);

    if (tareas.length === 0) {
      return res.status(404).send({ message: "Tarea no encontrada." });
    }
    const tarea = tareas[0];

    // 2. Verificar si el alumno ya subió algo (para saber si mostrar "Entregado")
    const [entregas] = await db.query(
      "SELECT * FROM tareas_entregas WHERE tarea_id = ? AND alumno_id = ?",
      [id, alumno_id],
    );

    // 3. Adjuntar la entrega a la respuesta (si existe)
    // Esto es vital porque tu App móvil usa "tarea.entrega_alumno" para cambiar la vista
    tarea.entrega_alumno = entregas.length > 0 ? entregas[0] : null;

    res.json(tarea);
  } catch (error) {
    console.error("Error al obtener detalle de tarea:", error);
    res.status(500).send({ message: "Error en el servidor." });
  }
});

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

// ==========================================
// MÓDULO AULA VIRTUAL: MURO (STREAM)
// ==========================================

// 1. OBTENER PUBLICACIONES DEL MURO
app.get("/api/muro/:grupoId/:asignaturaId", verifyToken, async (req, res) => {
  const { grupoId, asignaturaId } = req.params;
  try {
    const [rows] = await db.query(
      `SELECT m.*, u.nombre, u.apellido_paterno, u.foto_perfil, u.rol 
       FROM muro_publicaciones m
       JOIN usuarios u ON m.usuario_id = u.id
       WHERE m.grupo_id = ? AND m.asignatura_id = ?
       ORDER BY m.fecha DESC`,
      [grupoId, asignaturaId],
    );
    res.json(rows);
  } catch (err) {
    console.error("Error al obtener muro:", err);
    res.status(500).send({ message: "Error al obtener publicaciones" });
  }
});

// 2. PUBLICAR EN EL MURO + NOTIFICACIONES (Campanita y Push)
app.post("/api/muro/publicar", verifyToken, async (req, res) => {
  try {
    // Nota: Tu frontend envía estos datos en el body
    const { grupo_id, asignatura_id, mensaje } = req.body;
    const usuario_id = req.user.id; // Quien publica (Docente o Alumno)

    if (!mensaje) {
      return res.status(400).send({ message: "El mensaje es requerido." });
    }

    // A) Guardar en Base de Datos
    // Aseguramos que 'tipo' tenga un valor por defecto 'anuncio'
    const sqlInsert = `
      INSERT INTO muro_publicaciones (grupo_id, asignatura_id, usuario_id, mensaje, fecha, tipo) 
      VALUES (?, ?, ?, ?, NOW(), 'anuncio')
    `;
    await db.query(sqlInsert, [grupo_id, asignatura_id, usuario_id, mensaje]);

    // --- B) NOTIFICACIONES MASIVAS ---
    try {
      const nombrePublica = `${req.user.nombre} ${req.user.apellido_paterno}`;

      // 1. Obtener nombre de la materia
      const [[materia]] = await db.query(
        "SELECT nombre_asignatura FROM asignaturas WHERE id = ?",
        [asignatura_id],
      );
      const nombreMateria = materia ? materia.nombre_asignatura : "la clase";

      // 2. Preparar el mensaje de alerta
      // Recortamos el mensaje si es muy largo para que quepa en la notificación
      const resumen =
        mensaje.length > 40 ? mensaje.substring(0, 40) + "..." : mensaje;
      const textoNotificacion = `Aviso de la materia ${nombreMateria}: ${nombrePublica} escribió "${resumen}"`;

      // 3. URL de destino (Universal para alumno y docente)
      // Ajusta esto si tus rutas de alumno y docente son muy diferentes
      // Por ahora apuntamos al portal de alumno que es el destinatario principal
      const urlDestino = `/alumno/grupo/${grupo_id}/asignatura/${asignatura_id}/muro`;

      // 4. Obtener destinatarios (Alumnos del grupo)
      // Usamos la tabla 'grupo_alumnos' que es la correcta según tus otros endpoints
      const [alumnos] = await db.query(
        "SELECT alumno_id FROM grupo_alumnos WHERE grupo_id = ?",
        [grupo_id],
      );

      // 5. Enviar a cada alumno (menos al que publicó si fuera un alumno)
      for (const alumno of alumnos) {
        const idDestino = alumno.alumno_id;

        // No notificarse a sí mismo
        if (idDestino === usuario_id) continue;

        // I. Insertar en Tabla Notificaciones (Campanita)
        // OJO: Usamos las columnas CORRECTAS: usuario_id, leido, fecha, tipo
        await db.query(
          "INSERT INTO notificaciones (usuario_id, mensaje, url_destino, leido, fecha, tipo) VALUES (?, ?, ?, 0, NOW(), 'aviso')",
          [idDestino, textoNotificacion, urlDestino],
        );

        // II. Enviar Push Notification (Android)
        const [tokens] = await db.query(
          "SELECT token FROM push_tokens WHERE user_id = ?",
          [idDestino],
        );

        if (tokens.length > 0) {
          const expoMessages = tokens.map((t) => ({
            to: t.token,
            sound: "default",
            channelId: "default",
            priority: "high",
            title: "Nuevo Aviso en el Muro 📢",
            body: textoNotificacion,
            data: { url: urlDestino },
          }));

          fetch("https://exp.host/--/api/v2/push/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(expoMessages),
          }).catch((e) => console.error("Error envío Push Muro:", e));
        }
      }
    } catch (notifError) {
      console.error("Error en sistema de notificaciones (Muro):", notifError);
      // No detenemos el flujo, el mensaje ya se guardó
    }

    res.status(201).send({ message: "Publicado correctamente." });
  } catch (err) {
    console.error("Error al publicar en muro:", err);
    res.status(500).send({ message: "Error interno al publicar." });
  }
});

// 3. ELIMINAR PUBLICACIÓN
app.delete("/api/muro/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const usuario_id = req.user.id;
  const rol = req.user.rol;

  try {
    // Si es admin o docente puede borrar cualquier mensaje
    if (rol === "admin" || rol === "docente") {
      await db.query("DELETE FROM muro_publicaciones WHERE id = ?", [id]);
    } else {
      // Si es alumno, solo puede borrar SU propio mensaje
      const [result] = await db.query(
        "DELETE FROM muro_publicaciones WHERE id = ? AND usuario_id = ?",
        [id, usuario_id],
      );
      if (result.affectedRows === 0) {
        return res
          .status(403)
          .send({ message: "No puedes eliminar este mensaje." });
      }
    }
    res.send({ message: "Mensaje eliminado." });
  } catch (err) {
    console.error("Error al eliminar del muro:", err);
    res.status(500).send({ message: "Error al eliminar." });
  }
});

// ==========================================
// CONFIGURACIÓN CONSOLIDADA DE EXÁMENES (CORREGIDA Y ORDENADA)
// ==========================================

// 1. OBTENER TODOS LOS EXÁMENES (Admin/Docente general)
apiRouter.get("/examenes", verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM examenes ORDER BY fecha_creacion DESC",
    );
    res.json(rows);
  } catch (error) {
    console.error("Error al listar exámenes:", error);
    res.status(500).send("Error al obtener la lista de exámenes");
  }
});

apiRouter.post("/examenes", verifyToken, async (req, res) => {
  // 1. EXTRAEMOS limite_tiempo DEL BODY
  const {
    titulo,
    descripcion,
    grupo_id,
    asignatura_id,
    preguntas,
    limite_tiempo,
  } = req.body;
  const docente_id = req.user.id;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 2. INSERTAMOS LA CABECERA DEL EXAMEN CON EL LÍMITE DE TIEMPO
    const [result] = await connection.query(
      "INSERT INTO examenes (titulo, descripcion, docente_id, grupo_id, asignatura_id, limite_tiempo, fecha_creacion) VALUES (?, ?, ?, ?, ?, ?, NOW())",
      [
        titulo,
        descripcion,
        docente_id,
        grupo_id,
        asignatura_id,
        limite_tiempo || 60,
      ], // <-- Por defecto 60 si lo deja en blanco
    );
    const examenId = result.insertId;

    // ... EL RESTO DEL CÓDIGO SE QUEDA EXACTAMENTE IGUAL (donde guarda las preguntas) ...
    // PASO B: Recorrer y guardar las Preguntas
    if (preguntas && preguntas.length > 0) {
      for (const p of preguntas) {
        // Insertamos la pregunta individual
        const [resPreg] = await connection.query(
          "INSERT INTO preguntas (examen_id, texto_pregunta, puntos, tipo) VALUES (?, ?, ?, ?)",
          [examenId, p.texto, p.puntos, p.tipo], // 'p.texto' viene del frontend
        );
        const preguntaId = resPreg.insertId;

        // PASO C: Si es opción múltiple, guardar sus Opciones
        if (
          p.tipo === "opcion_multiple" &&
          p.opciones &&
          p.opciones.length > 0
        ) {
          for (const op of p.opciones) {
            await connection.query(
              "INSERT INTO opciones (pregunta_id, texto_opcion, es_correcta) VALUES (?, ?, ?)",
              [preguntaId, op.texto, op.esCorrecta], // 'op.texto' y 'op.esCorrecta' vienen del frontend
            );
          }
        }
      }
    }

    await connection.commit(); // Confirmar cambios en la BD
    res.status(201).json({ message: "Examen creado exitosamente", examenId });
  } catch (error) {
    await connection.rollback(); // Si falla algo, deshacer todo
    console.error("Error al crear examen:", error);
    res.status(500).send("Error al guardar el examen");
  } finally {
    connection.release();
  }
});

// 3. OBTENER EXAMEN PARA RESOLVER (Ruta Específica - DEBE IR ANTES DE LA GENÉRICA)
apiRouter.get("/examenes/:examenId/resolver", verifyToken, async (req, res) => {
  const { examenId } = req.params;
  try {
    const [examen] = await db.query("SELECT * FROM examenes WHERE id = ?", [
      examenId,
    ]);
    if (examen.length === 0)
      return res.status(404).send("Examen no encontrado");

    const [preguntas] = await db.query(
      "SELECT id, texto_pregunta, puntos, tipo FROM preguntas WHERE examen_id = ?",
      [examenId],
    );

    for (const p of preguntas) {
      if (p.tipo === "opcion_multiple") {
        const [ops] = await db.query(
          "SELECT id, texto_opcion FROM opciones WHERE pregunta_id = ?",
          [p.id],
        );
        p.opciones = ops;
      }
    }
    res.json({ examen: examen[0], preguntas });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error al cargar el examen");
  }
});

// 3. VER RESULTADOS DE UN EXAMEN (DOCENTE) - Con Total de Puntos
apiRouter.get(
  "/examenes/:examenId/resultados",
  verifyToken,
  async (req, res) => {
    try {
      const [rows] = await db.query(
        `SELECT i.id AS id_intento, i.calificacion, i.fecha_intento, 
              u.nombre, u.apellido_paterno,
              (SELECT IFNULL(SUM(puntos), 0) FROM preguntas WHERE examen_id = ?) AS puntos_maximos
       FROM intentos_examen i
       JOIN usuarios u ON i.alumno_id = u.id
       WHERE i.examen_id = ? 
       ORDER BY i.fecha_intento DESC`,
        [req.params.examenId, req.params.examenId], // <--- OJO: Se pasa el ID dos veces
      );
      res.json(rows);
    } catch (error) {
      console.error(error);
      res.status(500).send("Error al obtener resultados");
    }
  },
);

// 5. ENTREGAR EXAMEN (ALUMNO) - Ahora guarda enteros y estado 'pendiente'
apiRouter.post(
  "/examenes/:examenId/entregar",
  verifyToken,
  async (req, res) => {
    const { examenId } = req.params;
    const { respuestas } = req.body;
    const alumnoId = req.user.id;

    // Protección extra: Si el frontend manda mal los datos, avisamos antes de romper el servidor
    if (!respuestas || !Array.isArray(respuestas)) {
      return res
        .status(400)
        .json({ message: "No se enviaron respuestas en el formato correcto." });
    }

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // Insertar intento con estado 'pendiente'
      const [result] = await connection.query(
        "INSERT INTO intentos_examen (examen_id, alumno_id, calificacion, estado) VALUES (?, ?, 0, 'pendiente')",
        [examenId, alumnoId],
      );
      const intentoId = result.insertId;

      for (const item of respuestas) {
        const preguntaId = item.pregunta_id;
        const valor = item.respuesta_valor;

        let puntos = 0;
        let opcionId = null;
        let respuestaTexto = null;

        const [preg] = await connection.query(
          "SELECT tipo FROM preguntas WHERE id = ?",
          [preguntaId],
        );

        if (preg.length === 0) continue;

        if (preg[0].tipo === "opcion_multiple") {
          // CORRECCIÓN 1: Si valor está vacío, aseguramos que sea NULL, si no, lo convertimos a Número
          opcionId = valor && valor !== "" ? parseInt(valor) : null;

          if (opcionId !== null) {
            // CORRECCIÓN 2: Se llama 'preguntas.puntos', no 'puntos_pregunta'
            const [correcta] = await connection.query(
              "SELECT opciones.es_correcta, preguntas.puntos FROM opciones JOIN preguntas ON opciones.pregunta_id = preguntas.id WHERE opciones.id = ?",
              [opcionId],
            );

            // Si es correcta, asignamos puntos (verificamos que sea 1 o true)
            if (
              correcta.length > 0 &&
              (correcta[0].es_correcta === 1 ||
                correcta[0].es_correcta === true)
            ) {
              puntos = parseFloat(correcta[0].puntos) || 0;
            }
          }
        } else {
          // Para preguntas abiertas
          respuestaTexto = valor && valor !== "" ? String(valor) : null;
        }

        // IMPORTANTE: Guardamos puntos redondeados (Math.round)
        await connection.query(
          "INSERT INTO respuestas_alumno (intento_id, pregunta_id, opcion_id, respuesta_texto, puntos_obtenidos) VALUES (?, ?, ?, ?, ?)",
          [intentoId, preguntaId, opcionId, respuestaTexto, Math.round(puntos)],
        );
      }

      // Calcular total y REDONDEARLO
      const [total] = await connection.query(
        "SELECT SUM(puntos_obtenidos) as nota FROM respuestas_alumno WHERE intento_id = ?",
        [intentoId],
      );

      // Guardamos la calificación como entero
      const notaFinal = Math.round(total[0].nota || 0);

      // Actualizamos el intento
      await connection.query(
        "UPDATE intentos_examen SET calificacion = ? WHERE id = ?",
        [notaFinal, intentoId],
      );

      await connection.commit();
      res.json({ message: "Examen entregado correctamente", intentoId });
    } catch (error) {
      await connection.rollback();
      console.error("🔥 Error al entregar el examen:", error); // <-- Te dará más pistas si falla
      res.status(500).json({
        message: "Error interno al guardar las respuestas: " + error.message,
      });
    } finally {
      connection.release();
    }
  },
);

// 6. CALIFICAR MANUALMENTE (DOCENTE) - Marca como 'calificado' y usa enteros
apiRouter.put("/examenes/calificar-pregunta", verifyToken, async (req, res) => {
  const { respuestaId, puntosNuevos, intentoId } = req.body;
  try {
    // 1. Guardar los puntos nuevos redondeados
    await db.query(
      "UPDATE respuestas_alumno SET puntos_obtenidos = ? WHERE id = ?",
      [Math.round(puntosNuevos), respuestaId],
    );

    // 2. Recalcular total
    const [total] = await db.query(
      "SELECT SUM(puntos_obtenidos) as cal FROM respuestas_alumno WHERE intento_id = ?",
      [intentoId],
    );

    // 3. Actualizar calificación final (entero) y cambiar estado a 'calificado'
    const calificacionFinal = Math.round(total[0].cal || 0);

    await db.query(
      "UPDATE intentos_examen SET calificacion = ?, estado = 'calificado' WHERE id = ?",
      [calificacionFinal, intentoId],
    );

    res.json({
      message: "Calificación actualizada",
      nuevaCalificacion: calificacionFinal,
    });
  } catch (error) {
    res.status(500).send("Error al calificar");
  }
});

// 7. VER DETALLE INTENTO (Corregido)
apiRouter.get("/intentos/:intentoId", verifyToken, async (req, res) => {
  try {
    const [info] = await db.query(
      `SELECT i.id, i.calificacion, i.estado, u.nombre, u.apellido_paterno, e.titulo
       FROM intentos_examen i
       JOIN usuarios u ON i.alumno_id = u.id
       JOIN examenes e ON i.examen_id = e.id
       WHERE i.id = ?`,
      [req.params.intentoId],
    );

    if (info.length === 0) return res.status(404).send("No encontrado");

    // --- AQUÍ ESTABA EL ERROR ---
    // Faltaba agregar "p.puntos" en la lista de cosas que pedimos a la base de datos
    const [respuestas] = await db.query(
      `SELECT r.*, p.texto_pregunta, p.tipo, p.puntos, op.texto_opcion 
       FROM respuestas_alumno r
       JOIN preguntas p ON r.pregunta_id = p.id
       LEFT JOIN opciones op ON r.opcion_id = op.id
       WHERE r.intento_id = ?`,
      [req.params.intentoId],
    );

    res.json({ info: info[0], respuestas });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error al cargar el detalle");
  }
});

// 8. OBTENER EXÁMENES POR GRUPO (Con Total de Puntos)
apiRouter.get(
  "/examenes/:grupoId/:asignaturaId",
  verifyToken,
  async (req, res) => {
    const { grupoId, asignaturaId } = req.params;
    const alumnoId = req.user.id;

    try {
      const [examenes] = await db.query(
        `SELECT e.*, 
       (SELECT COUNT(*) FROM intentos_examen i WHERE i.examen_id = e.id AND i.alumno_id = ?) as ya_contestado,
       (SELECT calificacion FROM intentos_examen i WHERE i.examen_id = e.id AND i.alumno_id = ? LIMIT 1) as mi_calificacion,
       (SELECT estado FROM intentos_examen i WHERE i.examen_id = e.id AND i.alumno_id = ? LIMIT 1) as estado_revision,
       (SELECT IFNULL(SUM(puntos), 0) FROM preguntas WHERE examen_id = e.id) as puntos_maximos
       FROM examenes e 
       WHERE e.grupo_id = ? AND e.asignatura_id = ? 
       ORDER BY e.fecha_creacion DESC`,
        [alumnoId, alumnoId, alumnoId, grupoId, asignaturaId],
      );

      const examenesProcesados = examenes.map((ex) => ({
        ...ex,
        contestado: ex.ya_contestado > 0,
        calificacion: Math.round(ex.mi_calificacion),
        estado: ex.estado_revision,
        puntos_maximos: ex.puntos_maximos, // <--- Enviamos el total al frontend
      }));

      res.json(examenesProcesados);
    } catch (error) {
      console.error(error);
      res.status(500).send("Error al obtener exámenes");
    }
  },
);

// --- ANALÍTICAS DETALLADAS (SÁBANA COMPLETA + PONDERACIÓN) ---
apiRouter.get(
  "/analiticas/:grupoId/:asignaturaId",
  verifyToken,
  async (req, res) => {
    const { grupoId, asignaturaId } = req.params;

    try {
      // 1. Obtener Configuración de Porcentajes
      const [criteriosDb] = await db.query(
        "SELECT id, nombre_criterio, porcentaje, tipo_origen FROM criterios_evaluacion WHERE grupo_id = ? AND asignatura_id = ?",
        [grupoId, asignaturaId],
      );

      // Defaults si no hay config
      const criterios =
        criteriosDb.length > 0
          ? criteriosDb
          : [
              {
                nombre_criterio: "Tareas",
                porcentaje: 40,
                tipo_origen: "sistema_tareas",
              },
              {
                nombre_criterio: "Examen",
                porcentaje: 40,
                tipo_origen: "sistema_examenes",
              },
              {
                nombre_criterio: "Asistencia",
                porcentaje: 20,
                tipo_origen: "sistema_asistencia",
              },
            ];

      // 2. Obtener Alumnos (CORREGIDO)
      const [alumnos] = await db.query(
        `SELECT u.id, u.nombre, u.apellido_paterno, u.apellido_materno, u.matricula, u.foto_perfil 
         FROM usuarios u JOIN grupo_alumnos ga ON u.id = ga.alumno_id
         WHERE ga.grupo_id = ? AND u.rol = 'alumno' ORDER BY u.apellido_paterno ASC`,
        [grupoId],
      );

      // 3. Obtener Tareas (Columnas y Notas)
      const [colsTareas] = await db.query(
        "SELECT id, titulo FROM tareas WHERE grupo_id = ? AND asignatura_id = ? ORDER BY fecha_creacion ASC",
        [grupoId, asignaturaId],
      );
      const [notasTareas] = await db.query(
        "SELECT te.alumno_id, te.tarea_id, te.calificacion FROM tareas_entregas te JOIN tareas t ON te.tarea_id = t.id WHERE t.grupo_id = ? AND t.asignatura_id = ?",
        [grupoId, asignaturaId],
      );

      // 4. Obtener Exámenes (Columnas y Notas)
      const [colsExamenes] = await db.query(
        `SELECT e.id, e.titulo, (SELECT IFNULL(SUM(puntos), 1) FROM preguntas WHERE examen_id = e.id) as max_puntos 
         FROM examenes e WHERE e.grupo_id = ? AND e.asignatura_id = ?`,
        [grupoId, asignaturaId],
      );
      const [notasExamenes] = await db.query(
        `SELECT ie.alumno_id, ie.calificacion, ie.examen_id FROM intentos_examen ie JOIN examenes e ON ie.examen_id = e.id WHERE e.grupo_id = ? AND e.asignatura_id = ?`,
        [grupoId, asignaturaId],
      );

      // 5. Obtener Notas Manuales (De la tabla nueva)
      const [notasManuales] = await db.query(
        "SELECT criterio_id, alumno_id, calificacion FROM calificaciones_criterios",
      );

      // 6. Obtener Asistencia
      const [[sesiones]] = await db.query(
        "SELECT COUNT(*) as total FROM clases_sesiones WHERE grupo_id = ? AND asignatura_id = ?",
        [grupoId, asignaturaId],
      );
      const totalSesiones = sesiones.total || 1;
      const [asistencias] = await db.query(
        `SELECT a.alumno_id, COUNT(*) as presentes FROM asistencia a JOIN clases_sesiones s ON a.sesion_id = s.id 
         WHERE s.grupo_id = ? AND s.asignatura_id = ? AND a.estatus = 'presente' GROUP BY a.alumno_id`,
        [grupoId, asignaturaId],
      );

      // --- CONSTRUIR FILAS MATEMÁTICAMENTE JUSTAS ---
      const filas = alumnos.map((alum) => {
        let fila = {
          id: alum.id,
          nombre: `${alum.apellido_paterno} ${alum.nombre}`,
          nombre_pila: alum.nombre,
          apellido_paterno: alum.apellido_paterno,
          apellido_materno: alum.apellido_materno,
          matricula: alum.matricula,
          foto_perfil: alum.foto_perfil,
          notas: {},
        };

        let sumaPonderada = 0;
        let pesoTotalAplicable = 0; // Ponderación dinámica

        // CALCULAR PROMEDIOS POR CATEGORÍA
        criterios.forEach((crit) => {
          let promedioCategoria = 0;
          let aplicaCategoria = false; // Solo aplica si hay datos reales para evaluar

          if (crit.tipo_origen === "sistema_tareas") {
            if (colsTareas.length > 0) {
              aplicaCategoria = true;
              let sum = 0;
              colsTareas.forEach((t) => {
                const entrega = notasTareas.find(
                  (n) => n.alumno_id === alum.id && n.tarea_id === t.id,
                );
                // Si entregó, toma la calificación. Si no entregó, toma 0.
                const val =
                  entrega && entrega.calificacion !== null
                    ? parseFloat(entrega.calificacion)
                    : 0;
                fila.notas[`tarea_${t.id}`] = val;
                sum += val;
              });
              promedioCategoria = sum / colsTareas.length;
            }
          } else if (crit.tipo_origen === "sistema_examenes") {
            if (colsExamenes.length > 0) {
              aplicaCategoria = true;
              let sum = 0;
              colsExamenes.forEach((ex) => {
                const intento = notasExamenes.find(
                  (n) => n.alumno_id === alum.id && n.examen_id === ex.id,
                );
                const raw =
                  intento && intento.calificacion !== null
                    ? parseFloat(intento.calificacion)
                    : 0;
                const max = parseFloat(ex.max_puntos) || 1; // Evitar división por 0
                const base100 = (raw / max) * 100;
                fila.notas[`examen_${ex.id}`] = Math.round(base100);
                sum += base100;
              });
              promedioCategoria = sum / colsExamenes.length;
            }
          } else if (crit.tipo_origen === "sistema_asistencia") {
            if (totalSesiones > 0) {
              aplicaCategoria = true;
              const asis = asistencias.find((a) => a.alumno_id === alum.id);
              const presentes = asis ? asis.presentes : 0;
              promedioCategoria = (presentes / totalSesiones) * 100;
              fila.notas[`asistencia_sys`] = Math.round(promedioCategoria);
            }
          } else if (crit.tipo_origen === "manual") {
            aplicaCategoria = true;
            const nota = notasManuales.find(
              (n) => n.criterio_id === crit.id && n.alumno_id === alum.id,
            );
            const val =
              nota && nota.calificacion !== null
                ? parseFloat(nota.calificacion)
                : 0;
            promedioCategoria = val;
            fila.notas[`manual_${crit.id}`] = val;
          }

          // Si esta categoría tiene actividades, la sumamos al peso total
          if (aplicaCategoria) {
            pesoTotalAplicable += crit.porcentaje;
            sumaPonderada += promedioCategoria * (crit.porcentaje / 100);
          }
        });

        // NORMALIZACIÓN: Si el profesor solo ha creado tareas (40%), sacamos la nota sobre ese 40%.
        if (pesoTotalAplicable > 0) {
          fila.promedioFinal = Math.round(
            sumaPonderada / (pesoTotalAplicable / 100),
          );
        } else {
          // Si no hay tareas, ni exámenes, ni clases tomadas, el promedio por defecto es 100
          fila.promedioFinal = 100;
        }

        return fila;
      });

      res.json({
        columnas: {
          tareas: colsTareas,
          examenes: colsExamenes,
          criterios: criterios,
        },
        filas,
      });

      res.json({
        columnas: {
          tareas: colsTareas,
          examenes: colsExamenes,
          criterios: criterios, // Aquí van los manuales y la configuración
        },
        filas,
      });
    } catch (error) {
      console.error(error);
      res.status(500).send("Error al generar sábana");
    }
  },
);

// --- INICIO DEL SERVIDOR ---
const PORT = 3001;
// ==========================================
// MÓDULO CALENDARIO (LADO ADMIN)
// ==========================================

// 1. Middleware de Seguridad (Admin y Control Escolar)
const verificarAdmin = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.sendStatus(401);

  const token = authHeader.split(" ")[1];
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);

    // AQUÍ ESTÁ LA CORRECCIÓN: Permitimos a admin Y a control_escolar
    const rol = user.rol.toLowerCase();
    if (rol !== "admin" && rol !== "control_escolar") {
      return res
        .status(403)
        .send("Acceso denegado: Solo administradores o control escolar.");
    }
    req.user = user;
    next();
  });
};

// 2. Rutas del Calendario Admin

// GET: Ver todos los eventos
app.get("/api/eventos-admin", verificarAdmin, async (req, res) => {
  try {
    const [eventos] = await db.query("SELECT * FROM eventos");
    res.json(eventos);
  } catch (error) {
    res.status(500).send("Error al obtener eventos");
  }
});

// POST: Crear nuevo evento
app.post("/api/eventos-admin", verificarAdmin, async (req, res) => {
  const { title, start, modalidad } = req.body;
  try {
    await db.query(
      "INSERT INTO eventos (title, start, modalidad, allDay) VALUES (?, ?, ?, ?)",
      [title, start, modalidad || "general", true],
    );
    res.json({ message: "Evento creado" });
  } catch (error) {
    res.status(500).send("Error al guardar");
  }
});

// DELETE: Borrar evento
app.delete("/api/eventos-admin/:id", verificarAdmin, async (req, res) => {
  try {
    await db.query("DELETE FROM eventos WHERE id = ?", [req.params.id]);
    res.json({ message: "Evento eliminado" });
  } catch (error) {
    res.status(500).send("Error al eliminar");
  }
});

// ==========================================
// MÓDULO CALENDARIO (LADO ALUMNO Y DOCENTE)
// ==========================================

// 1. Middleware COMPARTIDO (Permite Alumno y Docente)
const verificarLecturaCalendario = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.sendStatus(401);

  const token = authHeader.split(" ")[1];
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);

    const rol = user.rol.toLowerCase();

    // AQUÍ ESTÁ EL CAMBIO: Permitimos entrar si es alumno O docente
    if (rol !== "alumno" && rol !== "docente") {
      return res.status(403).send("Acceso denegado: Solo alumnos y docentes.");
    }
    req.user = user;
    next();
  });
};

// 2. Ruta Inteligente: Obtener eventos (AHORA GENERAL PARA TODOS)
app.get("/api/eventos-alumno", verificarLecturaCalendario, async (req, res) => {
  try {
    // Ya no filtramos por modalidad 'virtual' o 'presencial' porque el requerimiento
    // cambió a "forma general sin excluir a nadie".
    // Traemos TODOS los eventos.
    const [eventos] = await db.query("SELECT * FROM eventos");
    res.json(eventos);
  } catch (error) {
    console.error("Error calendario lectura:", error);
    res.status(500).send("Error al obtener calendario");
  }
});

// ==========================================
// MIDDLEWARE ESPECÍFICO PARA ALUMNOS (Restaurado para Finanzas)
// ==========================================
const verificarAlumno = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.sendStatus(401);

  const token = authHeader.split(" ")[1];
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);

    // Solo permitimos pasar si el rol es estrictamente 'alumno'
    if (user.rol.toLowerCase() !== "alumno") {
      return res.status(403).send("Acceso denegado: Solo alumnos.");
    }
    req.user = user;
    next();
  });
};

// ==========================================
// MÓDULO FINANZAS (ALUMNO)
// ==========================================

// Ruta: Obtener Estado de Cuenta
app.get("/api/alumno/finanzas/resumen", verificarAlumno, async (req, res) => {
  try {
    const { id } = req.user; // ID del alumno logueado

    const query = `
      SELECT 
        a.id, 
        c.nombre_concepto, 
        a.monto_a_pagar, 
        a.estatus_pago, 
        a.fecha_vencimiento, 
        a.fecha_pago 
      FROM adeudos_alumnos a 
      JOIN conceptos_pago c ON a.concepto_id = c.id 
      WHERE a.alumno_id = ? 
      ORDER BY a.fecha_vencimiento ASC
    `;

    const [pagos] = await db.query(query, [id]);
    res.json(pagos);
  } catch (error) {
    console.error("Error al obtener pagos:", error);
    res.status(500).send("Error del servidor al cargar finanzas");
  }
});


// ---------------------------------------------------------
// RUTA CORREGIDA: NOMBRES EXACTOS DE TU BASE DE DATOSsa
// ---------------------------------------------------------
apiRouter.get(
  "/docente/v2/grupo/:grupoId/asignatura/:asignaturaId/alumnos",
  verifyToken,
  async (req, res) => {
    const { grupoId, asignaturaId } = req.params;
    try {
      // 1. Obtener info del curso (CORREGIDO: nombre_asignatura y nombre_grupo)
      const [info] = await db.query(
        `SELECT a.nombre_asignatura, g.nombre_grupo
       FROM asignaturas a, grupos g
       WHERE a.id = ? AND g.id = ?`,
        [asignaturaId, grupoId],
      );

      // 2. Lista de Alumnos
      const [alumnos] = await db.query(
        `SELECT u.id, u.nombre, u.apellido_paterno, u.matricula, u.foto_perfil, c.calificacion
       FROM grupo_alumnos ga
       JOIN usuarios u ON ga.alumno_id = u.id
       LEFT JOIN calificaciones c ON c.alumno_id = u.id AND c.asignatura_id = ? AND c.grupo_id = ?
       WHERE ga.grupo_id = ? AND u.rol = 'alumno'
       ORDER BY u.apellido_paterno ASC`,
        [asignaturaId, grupoId, grupoId],
      );

      res.json({
        cursoInfo: info[0],
        alumnos: alumnos,
      });
    } catch (error) {
      console.error("Error al obtener alumnos:", error);
      res.status(500).send("Error al obtener alumnos");
    }
  },
);

// ==========================================
// MÓDULO DE COMPARTIR - DRIVE
// ==========================================

// 1. Obtener usuarios con quienes está compartido
apiRouter.get("/drive/compartidos", verifyToken, async (req, res) => {
  const { ruta, tipo } = req.query;
  const usuarioId = req.user.id;

  try {
    const [compartidos] = await db.query(
      `SELECT 
        dc.id,
        dc.permiso,
        dc.fecha_compartido,
        u.id as usuario_id,
        u.nombre,
        u.apellido_paterno,
        u.matricula,
        u.foto_perfil,
        u.rol
      FROM drive_compartidos dc
      JOIN usuarios u ON dc.usuario_compartido_id = u.id
      WHERE dc.ruta_item = ? 
        AND dc.tipo_item = ? 
        AND dc.propietario_id = ?
      ORDER BY dc.fecha_compartido DESC`,
      [ruta, tipo, usuarioId],
    );

    res.json(compartidos);
  } catch (error) {
    console.error("Error obteniendo compartidos:", error);
    res.status(500).send("Error al obtener usuarios compartidos");
  }
});

// 2. Buscar usuarios
apiRouter.get("/drive/buscar-usuarios", verifyToken, async (req, res) => {
  const { q } = req.query;
  const usuarioId = req.user.id;

  if (!q || q.length < 2) {
    return res.json([]);
  }

  try {
    const [usuarios] = await db.query(
      `SELECT 
        id, 
        nombre, 
        apellido_paterno, 
        apellido_materno,
        matricula, 
        foto_perfil, 
        rol,
        email_personal
      FROM usuarios 
      WHERE id != ? 
        AND (
          nombre LIKE ? 
          OR apellido_paterno LIKE ? 
          OR matricula LIKE ?
          OR email_personal LIKE ?
        )
        AND activo = 1
      LIMIT 10`,
      [usuarioId, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`],
    );

    res.json(usuarios);
  } catch (error) {
    console.error("Error buscando usuarios:", error);
    res.status(500).send("Error al buscar usuarios");
  }
});

// 3. Compartir archivo/carpeta
apiRouter.post("/drive/compartir", verifyToken, async (req, res) => {
  const { ruta, tipo, usuario_id, permiso } = req.body;
  const propietarioId = req.user.id;

  if (!ruta || !tipo || !usuario_id || !permiso) {
    return res.status(400).send("Faltan datos requeridos");
  }

  if (!["ver", "editar", "descargar"].includes(permiso)) {
    return res.status(400).send("Permiso inválido");
  }

  try {
    if (parseInt(usuario_id) === propietarioId) {
      return res.status(400).send("No puedes compartir contigo mismo");
    }

    await db.query(
      `INSERT INTO drive_compartidos 
        (ruta_item, tipo_item, propietario_id, usuario_compartido_id, permiso)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE permiso = ?`,
      [ruta, tipo, propietarioId, usuario_id, permiso, permiso],
    );

    res.json({ message: "Compartido exitosamente" });
  } catch (error) {
    console.error("Error compartiendo:", error);
    res.status(500).send("Error al compartir");
  }
});

// 4. Eliminar acceso
apiRouter.delete("/drive/compartir/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const usuarioId = req.user.id;

  try {
    const [result] = await db.query(
      `DELETE FROM drive_compartidos 
       WHERE id = ? AND propietario_id = ?`,
      [id, usuarioId],
    );

    if (result.affectedRows === 0) {
      return res.status(404).send("Compartido no encontrado");
    }

    res.json({ message: "Acceso eliminado" });
  } catch (error) {
    console.error("Error eliminando acceso:", error);
    res.status(500).send("Error al eliminar acceso");
  }
});

// 5. Cambiar permiso
apiRouter.put("/drive/compartir/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const { permiso } = req.body;
  const usuarioId = req.user.id;

  if (!["ver", "editar", "descargar"].includes(permiso)) {
    return res.status(400).send("Permiso inválido");
  }

  try {
    await db.query(
      `UPDATE drive_compartidos 
       SET permiso = ?
       WHERE id = ? AND propietario_id = ?`,
      [permiso, id, usuarioId],
    );

    res.json({ message: "Permiso actualizado" });
  } catch (error) {
    console.error("Error actualizando permiso:", error);
    res.status(500).send("Error al actualizar permiso");
  }
});

// 6. Generar enlace público
apiRouter.post("/drive/enlace-publico", verifyToken, async (req, res) => {
  const { ruta, tipo, dias_expiracion } = req.body;
  const usuarioId = req.user.id;

  try {
    const crypto = require("crypto");
    const token = crypto.randomBytes(32).toString("hex");

    let fechaExpiracion = null;
    if (dias_expiracion && dias_expiracion > 0) {
      fechaExpiracion = new Date();
      fechaExpiracion.setDate(fechaExpiracion.getDate() + dias_expiracion);
    }

    await db.query(
      `INSERT INTO drive_enlaces_publicos 
        (ruta_item, tipo_item, propietario_id, token, fecha_expiracion)
      VALUES (?, ?, ?, ?, ?)`,
      [ruta, tipo, usuarioId, token, fechaExpiracion],
    );

    const enlacePublico = `https://api-universidad-c5o8.onrender.com/drive/publico/${token}`;

    res.json({ enlace: enlacePublico, token });
  } catch (error) {
    console.error("Error generando enlace:", error);
    res.status(500).send("Error al generar enlace");
  }
});

// 7. Obtener enlace público existente
apiRouter.get("/drive/enlace-publico", verifyToken, async (req, res) => {
  const { ruta, tipo } = req.query;
  const usuarioId = req.user.id;

  try {
    const [enlaces] = await db.query(
      `SELECT token, fecha_expiracion
       FROM drive_enlaces_publicos
       WHERE ruta_item = ? AND tipo_item = ? AND propietario_id = ? AND activo = 1
       ORDER BY fecha_creacion DESC LIMIT 1`,
      [ruta, tipo, usuarioId],
    );

    if (enlaces.length === 0) {
      return res.json({ enlace: null });
    }

    const enlace = `https://universidadsigloxxi.com/drive/publico/${enlaces[0].token}`;
    res.json({ enlace });
  } catch (error) {
    console.error("Error obteniendo enlace:", error);
    res.status(500).send("Error al obtener enlace");
  }
});

// 8. Desactivar enlace
apiRouter.delete("/drive/enlace-publico", verifyToken, async (req, res) => {
  const { ruta, tipo } = req.query;
  const usuarioId = req.user.id;

  try {
    await db.query(
      `UPDATE drive_enlaces_publicos 
       SET activo = 0
       WHERE ruta_item = ? AND tipo_item = ? AND propietario_id = ?`,
      [ruta, tipo, usuarioId],
    );

    res.json({ message: "Enlace desactivado" });
  } catch (error) {
    console.error("Error desactivando enlace:", error);
    res.status(500).send("Error al desactivar enlace");
  }
});

// 9. DESCARGAR ARCHIVO PÚBLICO (SIN LOGIN)
app.get("/drive/publico/:token", async (req, res) => {
  const { token } = req.params;

  try {
    // 1. Buscar el token en la BD
    const [enlaces] = await db.query(
      `SELECT ruta_item, tipo_item, fecha_expiracion, propietario_id
       FROM drive_enlaces_publicos
       WHERE token = ? AND activo = 1`,
      [token],
    );

    if (enlaces.length === 0) {
      return res
        .status(404)
        .send("<h1>Error 404: Enlace no válido o eliminado.</h1>");
    }

    const enlace = enlaces[0];

    // 2. Verificar expiración
    if (
      enlace.fecha_expiracion &&
      new Date(enlace.fecha_expiracion) < new Date()
    ) {
      return res
        .status(410)
        .send("<h1>Error 410: Este enlace ha expirado.</h1>");
    }

    // 3. Construir la ruta física al archivo
    // NOTA: El archivo está en la carpeta del PROPIETARIO, no en 'publico'
    const rutaFisica = path.join(
      uploadsDir,
      "drive",
      `usuario_${enlace.propietario_id}`,
      enlace.ruta_item,
    );

    // 4. Verificar que el archivo existe en disco
    if (!fs.existsSync(rutaFisica)) {
      return res
        .status(404)
        .send("<h1>El archivo físico ya no existe en el servidor.</h1>");
    }

    // 5. ENVIAR EL ARCHIVO (Descarga directa)
    res.download(rutaFisica);
  } catch (error) {
    console.error("Error accediendo a recurso:", error);
    res.status(500).send("Error interno al procesar la descarga.");
  }
});

// ==========================================
// 1. EDITAR FECHA DE PAGO (CAJA)
// ==========================================
adminRouter.put("/finanzas/editar-fecha-pago/:adeudoId", async (req, res) => {
  const { fecha_pago } = req.body; // Formato YYYY-MM-DD
  try {
    // Le agregamos la hora actual para que MySQL lo acepte bien en DATETIME
    const fechaCompleta = `${fecha_pago} 12:00:00`;
    await db.query("UPDATE adeudos_alumnos SET fecha_pago = ? WHERE id = ?", [
      fechaCompleta,
      req.params.adeudoId,
    ]);
    res.send({ message: "Fecha de pago actualizada" });
  } catch (error) {
    console.error("Error al actualizar fecha de pago:", error);
    res.status(500).send({ message: "Error al actualizar fecha" });
  }
});

// ==========================================
// 2. SUBIR FOTO DE PERFIL DESDE ADMIN
// ==========================================
adminRouter.post(
  "/usuarios/:id/foto",
  uploadAdminPerfil.single("foto"),
  async (req, res) => {
    if (!req.file)
      return res.status(400).send({ message: "No se subió archivo" });

    try {
      const userId = req.params.id;
      const nuevaFoto = req.file.filename;

      // Borrar foto anterior si existe
      const [[user]] = await db.query(
        "SELECT foto_perfil FROM usuarios WHERE id = ?",
        [userId],
      );
      if (user && user.foto_perfil) {
        const oldPath = path.join(perfilesDir, user.foto_perfil);
        fs.unlink(oldPath, (err) => {
          /* Ignorar si no existe */
        });
      }

      await db.query("UPDATE usuarios SET foto_perfil = ? WHERE id = ?", [
        nuevaFoto,
        userId,
      ]);
      res.json({ foto_perfil: nuevaFoto, message: "Foto actualizada" });
    } catch (error) {
      res.status(500).send({ message: "Error al actualizar foto" });
    }
  },
);

// ==========================================
// 3. BIBLIOTECA VIRTUAL (RUTAS)
// ==========================================
// A) Leer todos los archivos (Ruta PÚBLICA PARA USUARIOS LOGUEADOS)
apiRouter.get("/biblioteca", verifyToken, async (req, res) => {
  try {
    const [archivos] = await db.query(`
      SELECT b.*, u.nombre, u.apellido_paterno 
      FROM biblioteca_virtual b 
      LEFT JOIN usuarios u ON b.subido_por = u.id 
      ORDER BY b.fecha_subida DESC
    `);
    res.json(archivos);
  } catch (error) {
    res.status(500).send({ message: "Error al cargar la biblioteca" });
  }
});

// B) Subir archivo a la biblioteca (SOLO ADMIN)
adminRouter.post(
  "/biblioteca",
  uploadBiblioteca.single("archivo"),
  async (req, res) => {
    const { titulo, descripcion } = req.body;
    if (!req.file)
      return res.status(400).send({ message: "Se requiere un archivo" });

    try {
      // Determinar el tipo de archivo básico para el ícono en frontend
      const ext = path.extname(req.file.originalname).toLowerCase();
      let tipo = "otro";
      if ([".pdf"].includes(ext)) tipo = "pdf";
      if ([".mp4", ".avi", ".mov"].includes(ext)) tipo = "video";
      if ([".jpg", ".jpeg", ".png"].includes(ext)) tipo = "imagen";
      if ([".doc", ".docx"].includes(ext)) tipo = "word";
      if ([".xls", ".xlsx"].includes(ext)) tipo = "excel";
      if ([".ppt", ".pptx"].includes(ext)) tipo = "powerpoint";

      await db.query(
        "INSERT INTO biblioteca_virtual (titulo, descripcion, ruta_archivo, nombre_original, tipo, subido_por) VALUES (?, ?, ?, ?, ?, ?)",
        [
          titulo,
          descripcion,
          req.file.filename,
          req.file.originalname,
          tipo,
          req.user.id,
        ],
      );
      res.status(201).send({ message: "Archivo subido a la biblioteca" });
    } catch (error) {
      res.status(500).send({ message: "Error al subir archivo" });
    }
  },
);

// C) Eliminar archivo de la biblioteca (SOLO ADMIN)
adminRouter.delete("/biblioteca/:id", async (req, res) => {
  try {
    const [[archivo]] = await db.query(
      "SELECT ruta_archivo FROM biblioteca_virtual WHERE id = ?",
      [req.params.id],
    );
    if (archivo) {
      fs.unlink(path.join(bibliotecaDir, archivo.ruta_archivo), (err) => {});
      await db.query("DELETE FROM biblioteca_virtual WHERE id = ?", [
        req.params.id,
      ]);
    }
    res.send({ message: "Archivo eliminado" });
  } catch (error) {
    res.status(500).send({ message: "Error al eliminar" });
  }
});

// --- MÓDULO ANUNCIOS GLOBALES (ADMIN) ---
adminRouter.get("/anuncios", async (req, res) => {
  try {
    const [anuncios] = await db.query(
      "SELECT a.*, u.nombre, u.apellido_paterno FROM anuncios_globales a JOIN usuarios u ON a.creado_por = u.id ORDER BY a.fecha_creacion DESC",
    );
    res.json(anuncios);
  } catch (error) {
    res.status(500).send({ message: "Error al obtener anuncios." });
  }
});

adminRouter.post("/anuncios", async (req, res) => {
  const { titulo, mensaje, dirigido_a } = req.body;
  const target = dirigido_a || "todos";

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Guardar el anuncio en la base de datos
    const [result] = await connection.query(
      "INSERT INTO anuncios_globales (titulo, mensaje, dirigido_a, creado_por, fecha_creacion) VALUES (?, ?, ?, ?, NOW())",
      [titulo, mensaje, target, req.user.id],
    );

    // ==========================================
    // 2. SISTEMA DE NOTIFICACIONES (CAMPANITA + PUSH)
    // ==========================================

    // A) Determinar a quién le vamos a avisar
    let userQuery = "";

    if (target === "todos") {
      userQuery =
        "SELECT id, rol FROM usuarios WHERE (rol = 'alumno' OR rol = 'docente') AND activo = 1";
    } else if (target === "alumnos") {
      userQuery =
        "SELECT id, rol FROM usuarios WHERE rol = 'alumno' AND activo = 1";
    } else if (target === "docentes") {
      userQuery =
        "SELECT id, rol FROM usuarios WHERE rol = 'docente' AND activo = 1";
    }

    if (userQuery !== "") {
      const [usuariosDestino] = await connection.query(userQuery);

      if (usuariosDestino.length > 0) {
        const idsDestino = usuariosDestino.map((u) => u.id);
        const mensajeNotif = `Aviso Institucional: ${titulo}`;

        // B) Guardar en la Campanita (Bucle para todos los afectados)
        for (const usuario of usuariosDestino) {
          // Si es alumno va al dashboard de alumno, si es docente al de docente
          const destinoUrl = `/${usuario.rol}/dashboard`;

          await connection.query(
            "INSERT INTO notificaciones (usuario_id, mensaje, url_destino, leido, fecha, tipo) VALUES (?, ?, ?, 0, NOW(), 'aviso')",
            [usuario.id, mensajeNotif, destinoUrl],
          );
        }

        // C) Enviar Push Notification (Móviles)
        const [tokens] = await connection.query(
          "SELECT token FROM push_tokens WHERE user_id IN (?)",
          [idsDestino],
        );

        if (tokens.length > 0) {
          const expoMessages = tokens.map((t) => ({
            to: t.token,
            sound: "default",
            channelId: "default",
            priority: "high",
            title: "📢 Aviso de Dirección",
            body: titulo,
          }));

          fetch("https://exp.host/--/api/v2/push/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(expoMessages),
          }).catch((e) => console.error("Error push anuncio:", e));
        }
        for (const usuario of usuariosDestino) {
          enviarAlertaCorreo(
            usuario.id,
            "📢 Nuevo Aviso Institucional",
            titulo,
            `<p>${mensaje}</p>`,
          );
        }
      }
    }

    await connection.commit();
    res.status(201).send({
      message: "Anuncio publicado y notificaciones enviadas con éxito.",
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error al publicar el anuncio:", error);
    res.status(500).send({ message: "Error al publicar el anuncio." });
  } finally {
    connection.release();
  }
});

adminRouter.delete("/anuncios/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM anuncios_globales WHERE id = ?", [
      req.params.id,
    ]);
    res.send({ message: "Anuncio eliminado." });
  } catch (error) {
    res.status(500).send({ message: "Error al eliminar." });
  }
});

// --- LEER ANUNCIOS (ALUMNOS Y DOCENTES) ---
apiRouter.get("/anuncios/feed", async (req, res) => {
  try {
    const rol = req.user.rol; // 'alumno' o 'docente'

    // CORRECCIÓN: Relacionamos el singular del rol con el plural del anuncio
    const [anuncios] = await db.query(
      `SELECT a.id, a.titulo, a.mensaje, a.fecha_creacion, u.nombre, u.apellido_paterno, u.foto_perfil 
       FROM anuncios_globales a 
       JOIN usuarios u ON a.creado_por = u.id 
       WHERE a.dirigido_a = 'todos' 
          OR (? = 'alumno' AND a.dirigido_a = 'alumnos') 
          OR (? = 'docente' AND a.dirigido_a = 'docentes')
       ORDER BY a.fecha_creacion DESC LIMIT 10`,
      [rol, rol],
    );
    res.json(anuncios);
  } catch (error) {
    console.error("Error al cargar el feed de anuncios:", error);
    res.status(500).send({ message: "Error al cargar el feed." });
  }
});

// ==========================================
// MÓDULO DE EQUIPOS / BREAKOUT ROOMS
// ==========================================

// 1. OBTENER LOS EQUIPOS ACTUALES DE LA CLASE
docenteRouter.get(
  "/aula-virtual/:grupoId/:asignaturaId/equipos",
  async (req, res) => {
    const { grupoId, asignaturaId } = req.params;
    try {
      const [equipos] = await db.query(
        "SELECT * FROM aula_equipos WHERE grupo_id = ? AND asignatura_id = ?",
        [grupoId, asignaturaId],
      );

      // Buscar los alumnos de cada equipo
      for (let equipo of equipos) {
        const [alumnos] = await db.query(
          `SELECT u.id, u.nombre, u.apellido_paterno, u.foto_perfil 
         FROM aula_equipo_alumnos aea 
         JOIN usuarios u ON aea.alumno_id = u.id 
         WHERE aea.equipo_id = ?`,
          [equipo.id],
        );
        equipo.alumnos = alumnos;
      }
      res.json(equipos);
    } catch (error) {
      res.status(500).send({ message: "Error al obtener equipos." });
    }
  },
);

// 2. GENERAR EQUIPOS AUTOMÁTICAMENTE
docenteRouter.post(
  "/aula-virtual/:grupoId/:asignaturaId/generar-equipos",
  async (req, res) => {
    const { grupoId, asignaturaId } = req.params;
    const { cantidad_equipos } = req.body; // Ej. 4 equipos

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // A) Borrar equipos anteriores si existían (Limpiar la casa)
      await connection.query(
        "DELETE FROM aula_equipos WHERE grupo_id = ? AND asignatura_id = ?",
        [grupoId, asignaturaId],
      );

      // B) Obtener a todos los alumnos del grupo
      const [alumnos] = await connection.query(
        "SELECT alumno_id FROM grupo_alumnos WHERE grupo_id = ?",
        [grupoId],
      );

      if (alumnos.length === 0)
        return res
          .status(400)
          .send({ message: "No hay alumnos para dividir." });

      // Mezclar alumnos al azar (Algoritmo Fisher-Yates)
      let mezclados = [...alumnos].sort(() => Math.random() - 0.5);

      // C) Crear los equipos y repartir alumnos
      for (let i = 1; i <= cantidad_equipos; i++) {
        const nombreEquipo = `Sala de Trabajo ${i}`;
        // Usamos Jitsi. Cada enlace debe ser único.
        const enlaceSala = `https://meet.jit.si/SIGLOXXI-G${grupoId}-A${asignaturaId}-Sala${i}-${Date.now()}`;

        // Insertar Equipo
        const [resEquipo] = await connection.query(
          "INSERT INTO aula_equipos (grupo_id, asignatura_id, nombre_equipo, enlace_sala) VALUES (?, ?, ?, ?)",
          [grupoId, asignaturaId, nombreEquipo, enlaceSala],
        );
        const nuevoEquipoId = resEquipo.insertId;

        // Asignar alumnos a este equipo (reparto equitativo)
        // Ejemplo: si son 10 alumnos y 2 equipos, mete 5 en cada uno.
        const pedazo = Math.ceil(mezclados.length / (cantidad_equipos - i + 1));
        const alumnosParaEsteEquipo = mezclados.splice(0, pedazo);

        for (let al of alumnosParaEsteEquipo) {
          await connection.query(
            "INSERT INTO aula_equipo_alumnos (equipo_id, alumno_id) VALUES (?, ?)",
            [nuevoEquipoId, al.alumno_id],
          );

          // ==========================================
          // NOTIFICAR AL ALUMNO QUE TIENE SALA NUEVA
          // ==========================================
          const mensaje = `El profesor te asignó a la ${nombreEquipo} para trabajar. Entra al Aula Virtual.`;
          const urlDestino = `/alumno/grupo/${grupoId}/asignatura/${asignaturaId}/aula`;

          await connection.query(
            "INSERT INTO notificaciones (usuario_id, mensaje, url_destino, leido, fecha, tipo) VALUES (?, ?, ?, 0, NOW(), 'sistema')",
            [al.alumno_id, mensaje, urlDestino],
          );
        }
      }

      await connection.commit();
      res.json({ message: "Equipos generados y alumnos notificados." });
    } catch (error) {
      await connection.rollback();
      console.error(error);
      res.status(500).send({ message: "Error al generar equipos." });
    } finally {
      connection.release();
    }
  },
);

// 3. ELIMINAR TODOS LOS EQUIPOS (Para regresar a clase normal)
docenteRouter.delete(
  "/aula-virtual/:grupoId/:asignaturaId/borrar-equipos",
  async (req, res) => {
    try {
      await db.query(
        "DELETE FROM aula_equipos WHERE grupo_id = ? AND asignatura_id = ?",
        [req.params.grupoId, req.params.asignaturaId],
      );
      res.json({ message: "Salas de trabajo cerradas." });
    } catch (error) {
      res.status(500).send({ message: "Error al cerrar salas." });
    }
  },
);

// OBTENER LA SALA DE EQUIPO DEL ALUMNO
alumnoRouter.get(
  "/aula-virtual/:grupoId/:asignaturaId/mi-equipo",
  async (req, res) => {
    try {
      const [equipo] = await db.query(
        `SELECT ae.nombre_equipo, ae.enlace_sala 
       FROM aula_equipos ae 
       JOIN aula_equipo_alumnos aea ON ae.id = aea.equipo_id 
       WHERE ae.grupo_id = ? AND ae.asignatura_id = ? AND aea.alumno_id = ?`,
        [req.params.grupoId, req.params.asignaturaId, req.user.id],
      );

      if (equipo.length > 0) {
        res.json(equipo[0]);
      } else {
        res.json(null); // No tiene equipo
      }
    } catch (error) {
      res.status(500).send("Error");
    }
  },
);

// --- INICIO: RUTA HISTORIAL DE CALIFICACIONES (ALUMNO) ---
alumnoRouter.get("/mis-calificaciones", async (req, res) => {
  const alumno_id = req.user.id;
  try {
    const sql = `
      SELECT 
        c.calificacion,
        a.nombre_asignatura,
        a.clave_asignatura,
        g.nombre_grupo,
        ci.nombre_ciclo
      FROM calificaciones c
      JOIN asignaturas a ON c.asignatura_id = a.id
      JOIN grupos g ON c.grupo_id = g.id
      LEFT JOIN ciclos ci ON g.ciclo_id = ci.id
      WHERE c.alumno_id = ? AND c.calificacion IS NOT NULL
      ORDER BY ci.id DESC, a.nombre_asignatura ASC
    `;
    const [calificaciones] = await db.query(sql, [alumno_id]);
    res.json(calificaciones);
  } catch (error) {
    console.error("Error al obtener historial de calificaciones:", error);
    res
      .status(500)
      .send({ message: "Error en el servidor al obtener calificaciones" });
  }
});
// --- FIN: RUTA HISTORIAL DE CALIFICACIONES (ALUMNO) ---
// ELIMINADO: CRON de mensualidades automáticas (se generaban cargos duplicados)

// ==========================================
// FUNCIÓN GLOBAL: ENVIAR ALERTAS POR CORREO
// ==========================================
async function enviarAlertaCorreo(usuarioId, asunto, titulo, mensajeHtml) {
  try {
    const [user] = await db.query(
      "SELECT email_personal, email, nombre FROM usuarios WHERE id = ?",
      [usuarioId],
    );
    if (user.length === 0) return;

    const correoDestino = user[0].email_personal || user[0].email;
    if (!correoDestino) return;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden;">
        <div style="background-color: #a72a34; padding: 20px; text-align: center;">
          <h2 style="color: white; margin: 0;">${titulo}</h2>
        </div>
        <div style="padding: 30px; color: #333;">
          <p>Hola <strong>${user[0].nombre}</strong>,</p>
          ${mensajeHtml}
          <p style="text-align: center; margin-top: 30px;">
            <a href="https://universidadsigloxxi.com/plataforma" style="background-color: #a72a34; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Ir a la Plataforma</a>
          </p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: '"Universidad Siglo XXI" <contacto@puntocerodigital.com.mx>',
      to: correoDestino,
      subject: asunto,
      html: htmlContent,
    });
  } catch (error) {
    console.error("Error enviando alerta correo:", error);
  }
}


app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
