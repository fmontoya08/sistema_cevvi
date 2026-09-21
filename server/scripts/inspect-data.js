const { createPool } = require("./db");
const fs = require("fs");
const path = require("path");

(async () => {
  const pool = createPool();
  try {
    const out = {};
    const dump = async (name, sql) => {
      const [rows] = await pool.query(sql);
      out[name] = rows;
      console.log(`${name}: ${rows.length} filas`);
    };

    await dump("usuarios", `SELECT id, email, email_personal, rol, nombre, apellido_paterno, apellido_materno,
      matricula, curp, carrera_id, sede_id, grupo_id, activo, estado_academico,
      DATE_FORMAT(fecha_creacion,'%Y-%m-%d %H:%i') as fecha_creacion
      FROM usuarios ORDER BY id`);
    await dump("adeudos_alumnos", `SELECT a.*, c.nombre_concepto FROM adeudos_alumnos a
      LEFT JOIN conceptos_pago c ON a.concepto_id = c.id ORDER BY a.alumno_id`);
    await dump("conceptos_pago", `SELECT * FROM conceptos_pago ORDER BY id`);
    await dump("grupos", `SELECT * FROM grupos ORDER BY id`);
    await dump("grupo_alumnos", `SELECT * FROM grupo_alumnos ORDER BY id`);
    await dump("sedes", `SELECT * FROM sedes ORDER BY id`);
    await dump("carreras", `SELECT * FROM carreras ORDER BY id`);
    await dump("planes_estudio", `SELECT * FROM planes_estudio ORDER BY id`);
    await dump("ciclos", `SELECT * FROM ciclos ORDER BY id`);
    await dump("grados", `SELECT * FROM grados ORDER BY id`);

    fs.writeFileSync(path.join(__dirname, "snapshot.json"), JSON.stringify(out, null, 2));
    console.log("\nSnapshot guardado en scripts/snapshot.json");
  } finally {
    await pool.end();
  }
})().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});