const express = require("express");
const mysql = require("mysql2/promise"); // Usamos la versión con promesas para un código más limpio
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());
app.use(express.json());

// --- CONFIGURACIÓN DE LA BASE DE DATOS ---
// Usamos una función async para poder usar await en la conexión
async function main() {
  const db = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "root",
    database: "universidad_db", // Cambiamos el nombre a uno más descriptivo
  });

  console.log("Conectado exitosamente a la base de datos MySQL.");

  // --- MIDDLEWARE DE AUTENTICACIÓN ---
  // Este middleware verificará el token en las rutas que lo necesiten
  const authMiddleware = (rolesPermitidos) => (req, res, next) => {
    const token = req.headers["authorization"]?.split(" ")[1];
    if (!token) {
      return res
        .status(403)
        .json({ message: "Acceso denegado, se requiere token." });
    }

    try {
      const decoded = jwt.verify(token, "tu_super_clave_secreta");
      req.user = decoded;

      // Si se especifican roles, verificamos que el usuario tenga uno de los roles permitidos
      if (rolesPermitidos && rolesPermitidos.length > 0) {
        if (!rolesPermitidos.includes(req.user.rol)) {
          return res
            .status(403)
            .json({ message: "No tienes permiso para realizar esta acción." });
        }
      }

      next();
    } catch (error) {
      res.status(401).json({ message: "Token inválido o expirado." });
    }
  };

  // --- RUTAS DE AUTENTICACIÓN ---

  // Registro de cualquier tipo de usuario (principalmente para el admin)
  app.post("/api/register", async (req, res) => {
    try {
      const {
        email,
        password,
        nombre,
        apellido_paterno,
        apellido_materno,
        rol,
        ...otrosDatos
      } = req.body;

      if (!["admin", "docente", "aspirante"].includes(rol)) {
        return res
          .status(400)
          .json({ message: "El rol especificado no es válido." });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = {
        email,
        password: hashedPassword,
        nombre,
        apellido_paterno,
        apellido_materno,
        rol,
        ...otrosDatos, // Esto incluye curp, telefono, etc.
      };

      const [result] = await db.query("INSERT INTO usuarios SET ?", newUser);
      res
        .status(201)
        .json({
          message: "Usuario registrado con éxito",
          userId: result.insertId,
        });
    } catch (error) {
      console.error("Error en /api/register:", error);
      if (error.code === "ER_DUP_ENTRY") {
        return res
          .status(409)
          .json({ message: "El correo electrónico ya está registrado." });
      }
      res.status(500).json({ message: "Error interno del servidor." });
    }
  });

  // Login para todos los usuarios
  app.post("/api/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const [rows] = await db.query("SELECT * FROM usuarios WHERE email = ?", [
        email,
      ]);

      if (rows.length === 0) {
        return res
          .status(401)
          .json({ message: "Email o contraseña incorrectos." });
      }

      const user = rows[0];
      const isPasswordCorrect = await bcrypt.compare(password, user.password);

      if (!isPasswordCorrect) {
        return res
          .status(401)
          .json({ message: "Email o contraseña incorrectos." });
      }

      const payload = {
        id: user.id,
        email: user.email,
        nombre: `${user.nombre} ${user.apellido_paterno}`,
        rol: user.rol,
      };

      const token = jwt.sign(payload, "tu_super_clave_secreta", {
        expiresIn: "8h",
      });

      res.json({
        message: "Login exitoso.",
        token,
        user: payload,
      });
    } catch (error) {
      console.error("Error en /api/login:", error);
      res.status(500).json({ message: "Error interno del servidor." });
    }
  });

  // --- RUTAS DEL ADMINISTRADOR (CRUDs) ---

  // Módulo: Asignaturas
  const asignaturasRouter = express.Router();
  asignaturasRouter.use(authMiddleware(["admin"])); // Solo admin puede gestionar asignaturas

  asignaturasRouter.post("/", async (req, res) => {
    const [result] = await db.query("INSERT INTO asignaturas SET ?", req.body);
    res.status(201).json({ id: result.insertId, ...req.body });
  });
  asignaturasRouter.get("/", async (req, res) => {
    const [rows] = await db.query(`
        SELECT a.*, p.nombre_plan, t.tipo, g.nombre_grado FROM asignaturas a
        LEFT JOIN planes_estudio p ON a.plan_estudio_id = p.id
        LEFT JOIN tipos_asignatura t ON a.tipo_asignatura_id = t.id
        LEFT JOIN grados g ON a.grado_id = g.id
      `);
    res.json(rows);
  });
  asignaturasRouter.put("/:id", async (req, res) => {
    await db.query("UPDATE asignaturas SET ? WHERE id = ?", [
      req.body,
      req.params.id,
    ]);
    res.json({ id: req.params.id, ...req.body });
  });
  asignaturasRouter.delete("/:id", async (req, res) => {
    await db.query("DELETE FROM asignaturas WHERE id = ?", [req.params.id]);
    res.status(204).send();
  });
  app.use("/api/asignaturas", asignaturasRouter);

  // Módulo: Grupos
  const gruposRouter = express.Router();
  gruposRouter.use(authMiddleware(["admin"]));

  gruposRouter.post("/", async (req, res) => {
    const [result] = await db.query("INSERT INTO grupos SET ?", req.body);
    res.status(201).json({ id: result.insertId, ...req.body });
  });
  gruposRouter.get("/", async (req, res) => {
    const [rows] = await db.query(`
        SELECT gr.*, c.nombre_ciclo, s.nombre_sede, p.nombre_plan, g.nombre_grado FROM grupos gr
        LEFT JOIN ciclos c ON gr.ciclo_id = c.id
        LEFT JOIN sedes s ON gr.sede_id = s.id
        LEFT JOIN planes_estudio p ON gr.plan_estudio_id = p.id
        LEFT JOIN grados g ON gr.grado_id = g.id
      `);
    res.json(rows);
  });
  gruposRouter.put("/:id", async (req, res) => {
    await db.query("UPDATE grupos SET ? WHERE id = ?", [
      req.body,
      req.params.id,
    ]);
    res.json({ id: req.params.id, ...req.body });
  });
  gruposRouter.delete("/:id", async (req, res) => {
    await db.query("DELETE FROM grupos WHERE id = ?", [req.params.id]);
    res.status(204).send();
  });
  app.use("/api/grupos", gruposRouter);

  // Módulo: Aspirantes y Alumnos
  const usersRouter = express.Router();
  usersRouter.use(authMiddleware(["admin"]));

  // Crear un usuario (aspirante o docente)
  usersRouter.post("/", async (req, res) => {
    try {
      const {
        email,
        password,
        nombre,
        apellido_paterno,
        apellido_materno,
        rol,
        ...otrosDatos
      } = req.body;
      if (!["docente", "aspirante"].includes(rol)) {
        return res
          .status(400)
          .json({ message: "Solo se pueden crear docentes o aspirantes." });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = {
        email,
        password: hashedPassword,
        nombre,
        apellido_paterno,
        apellido_materno,
        rol,
        ...otrosDatos,
      };
      const [result] = await db.query("INSERT INTO usuarios SET ?", newUser);
      res.status(201).json({ message: "Usuario creado", id: result.insertId });
    } catch (err) {
      if (err.code === "ER_DUP_ENTRY")
        return res.status(409).json({ message: "El correo ya existe" });
      res.status(500).json({ message: "Error al crear usuario" });
    }
  });

  // Obtener todos los usuarios (filtrado por rol)
  usersRouter.get("/", async (req, res) => {
    const { rol } = req.query;
    let query =
      "SELECT id, nombre, apellido_paterno, apellido_materno, email, rol, curp, telefono FROM usuarios";
    if (rol) {
      query += ` WHERE rol = ?`;
    }
    const [users] = await db.query(query, rol ? [rol] : []);
    res.json(users);
  });

  // Convertir un aspirante en alumno y asignarle un grupo
  usersRouter.put("/aspirantes/:id/asignar-grupo", async (req, res) => {
    const { grupo_id } = req.body;
    const aspirante_id = req.params.id;

    if (!grupo_id) {
      return res.status(400).json({ message: "Se requiere el ID del grupo." });
    }
    // TODO: Se podría verificar si el grupo tiene cupo antes de asignar.

    // Cambiamos el rol del usuario a 'alumno' y le asignamos su grupo
    await db.query(
      "UPDATE usuarios SET rol = 'alumno', grupo_id = ? WHERE id = ? AND rol = 'aspirante'",
      [grupo_id, aspirante_id]
    );

    res.json({ message: "Aspirante asignado a grupo y promovido a alumno." });
  });

  app.use("/api/usuarios", usersRouter);

  // NOTA: Aquí irían los endpoints para las tablas catálogo (sedes, carreras, etc.)
  // Ejemplo para sedes:
  app.get("/api/sedes", authMiddleware(["admin"]), async (req, res) => {
    const [sedes] = await db.query("SELECT * FROM sedes");
    res.json(sedes);
  });
  //... Y así para las demás tablas de catálogo (carreras, ciclos, etc).

  const PORT = 3001;
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
  });
}

main().catch(console.error);
