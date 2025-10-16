const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());
app.use(express.json());

// --- CONECTA A TU BASE DE DATOS ---
const db = mysql.createConnection({
  host: "localhost",
  user: "root", // Cambia esto por tu usuario de MySQL
  password: "root", // Cambia esto por tu contraseña
  database: "cevvis_db", // Cambia esto por el nombre de tu BD
});

db.connect((err) => {
  if (err) {
    console.error("Error al conectar a la base de datos:", err);
    return;
  }
  console.log("Conectado exitosamente a la base de datos MySQL.");
});

// --- RUTA PARA REGISTRAR UN USUARIO ---
app.post("/register", async (req, res) => {
  const { email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  const sql = "INSERT INTO users (email, password) VALUES (?, ?)";
  db.query(sql, [email, hashedPassword], (err, result) => {
    if (err) return res.status(500).send("Error al registrar el usuario");
    res.status(201).send("Usuario registrado");
  });
});

// --- RUTA PARA INICIAR SESIÓN ---
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  const sql = "SELECT * FROM users WHERE email = ?";
  db.query(sql, [email], async (err, results) => {
    if (err || results.length === 0) {
      return res.status(401).send("Email o contraseña incorrectos");
    }

    const user = results[0];
    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      return res.status(401).send("Email o contraseña incorrectos");
    }

    const token = jwt.sign({ id: user.id }, "tu_clave_secreta", {
      expiresIn: "1h",
    });
    res.json({ token });
  });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
