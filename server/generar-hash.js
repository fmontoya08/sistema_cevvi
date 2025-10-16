const bcrypt = require("bcryptjs");

async function crearHash() {
  const password = "admin123"; // La contraseña que usarás para iniciar sesión
  const saltRounds = 10;

  try {
    const hash = await bcrypt.hash(password, saltRounds);
    console.log("--- Contraseña Hasheada ---");
    console.log(
      "Copia y pega la siguiente línea en tu archivo admin_user.sql:"
    );
    console.log(hash);
    console.log("---------------------------");
    console.log(`Contraseña original para login: ${password}`);
  } catch (error) {
    console.error("Error al generar el hash:", error);
  }
}

crearHash();
