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

  // Mostrar antes
  const [antes] = await conn.execute("SELECT id, nombre, apellido_paterno, email, matricula, rol FROM usuarios WHERE id = 34");
  console.log('ANTES:');
  console.log('  ID: ' + antes[0].id);
  console.log('  Nombre: ' + antes[0].nombre + ' ' + antes[0].apellido_paterno);
  console.log('  Email: ' + antes[0].email);
  console.log('  Matricula: ' + antes[0].matricula);
  console.log('  Rol: ' + antes[0].rol);

  // Cambiar rol
  await conn.execute("UPDATE usuarios SET rol = 'aspirante' WHERE id = 34");

  // Mostrar después
  const [despues] = await conn.execute("SELECT id, nombre, apellido_paterno, email, matricula, rol FROM usuarios WHERE id = 34");
  console.log('\nDESPUÉS:');
  console.log('  ID: ' + despues[0].id);
  console.log('  Nombre: ' + despues[0].nombre + ' ' + despues[0].apellido_paterno);
  console.log('  Email: ' + despues[0].email);
  console.log('  Matricula: ' + despues[0].matricula);
  console.log('  Rol: ' + despues[0].rol);

  await conn.end();
}
run().catch(e => console.error(e.message));
