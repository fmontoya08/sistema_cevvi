const { createPool } = require("./db.js");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

(async () => {
  const p = createPool();

  const [alumnos] = await p.query(
    "SELECT id, matricula, email, nombre, apellido_paterno, apellido_materno, password FROM usuarios WHERE rol = 'alumno'"
  );

  const aCambiar = [];
  for (const u of alumnos) {
    if (!u.matricula) continue;
    if (!/^\$2[aby]\$/.test(u.password || "")) {
      aCambiar.push(u);
      continue;
    }
    const ok = await bcrypt.compare(String(u.matricula), u.password);
    if (!ok) aCambiar.push(u);
  }

  console.log(`Alumnos totales: ${alumnos.length} | a uniformar: ${aCambiar.length}`);

  const ts = Date.now();
  const rutaBackup = path.join(__dirname, `backup_passwords_${ts}.json`);
  fs.writeFileSync(
    rutaBackup,
    JSON.stringify(aCambiar.map((u) => ({ id: u.id, matricula: u.matricula, email: u.email, password_anterior: u.password })), null, 2)
  );
  console.log(`Respaldo de hashes: ${rutaBackup}`);

  const conn = await p.getConnection();
  await conn.beginTransaction();
  for (const u of aCambiar) {
    const nuevoHash = bcrypt.hashSync(String(u.matricula), 10);
    await conn.query("UPDATE usuarios SET password = ? WHERE id = ?", [nuevoHash, u.id]);
  }
  await conn.commit();
  await conn.release();
  console.log(`Actualizados ${aCambiar.length} alumnos: password = matrícula`);

  const [post] = await p.query("SELECT id, matricula, password FROM usuarios WHERE rol = 'alumno'");
  let sinCoincidir = 0;
  for (const u of post) {
    if (!u.matricula || !/^\$2[aby]\$/.test(u.password || "")) { sinCoincidir++; continue; }
    const ok = await bcrypt.compare(String(u.matricula), u.password);
    if (!ok) sinCoincidir++;
  }
  console.log(sinCoincidir === 0 ? `VERIFICACION OK: los ${post.length} alumnos coinciden con su matrícula` : `AVISO: ${sinCoincidir} SIN coincidir`);

  const [detalle] = await p.query(
    "SELECT matricula, email, nombre, apellido_paterno, apellido_materno FROM usuarios WHERE rol = 'alumno' ORDER BY matricula"
  );
  const credenciales = detalle.map((u) => ({
    Matricula: u.matricula,
    "Correo institucional": u.email,
    Contrasena: u.matricula,
    Nombre: [(u.nombre || ""), (u.apellido_paterno || ""), (u.apellido_materno || "")].join(" ").trim(),
  }));

  const rutaReporte = path.join(__dirname, "reporte_pendientes.xlsx");
  const wb = fs.existsSync(rutaReporte) ? XLSX.readFile(rutaReporte) : XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(credenciales), "CREDENCIALES");
  XLSX.writeFile(wb, rutaReporte);
  console.log(`Reporte actualizado: ${rutaReporte} (hoja CREDENCIALES con ${credenciales.length} alumnos)`);

  await p.end();
})().catch((e) => { console.error("ERROR:", e.message); console.error(e.stack); process.exit(1); });