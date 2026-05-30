const mysql = require('mysql2/promise');
require('dotenv').config();
async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false },
  });

  // 1. Ver aspirantes activos
  const [aspirantes] = await conn.execute("SELECT id, nombre, apellido_paterno, email, matricula, activo FROM usuarios WHERE rol = 'aspirante'");
  console.log('ASPIRANTES EN BD:');
  aspirantes.forEach(a => console.log('  ID:' + a.id + ' | ' + a.nombre + ' ' + a.apellido_paterno + ' | activo:' + a.activo + ' | ' + a.email));

  // 2. Ver documentos del aspirante ID 34
  const [docs] = await conn.execute("SELECT * FROM expediente_aspirantes WHERE aspirante_id = 34");
  console.log('\nDOCUMENTOS DEL ID 34:');
  if (docs.length === 0) {
    console.log('  No hay documentos');
  } else {
    docs.forEach(d => console.log('  ' + d.tipo_documento + ' | estatus:' + d.estatus + ' | archivo:' + d.nombre_original));
  }

  await conn.end();
}
run().catch(e => console.error(e.message));
