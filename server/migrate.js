require("dotenv").config();
const mysql = require("mysql2/promise");

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 4000,
  ssl: { rejectUnauthorized: false },
  waitForConnections: true,
  connectionLimit: 1,
  queueLimit: 0,
};

async function run() {
  const connection = await mysql.createConnection(dbConfig);
  console.log("? Conectado a TiDB Cloud - BD: " + process.env.DB_NAME);

  try {
    console.log("\n--- EJECUTANDO MIGRACIÓN ---");

    // Verificar si la tabla existe
    const [tables] = await connection.execute(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'expediente_aspirantes'",
      [process.env.DB_NAME]
    );

    if (tables.length === 0) {
      console.log("?? La tabla expediente_aspirantes no existe. Creándola...");
      await connection.execute(`
        CREATE TABLE expediente_aspirantes (
          id INT NOT NULL AUTO_INCREMENT,
          aspirante_id INT NOT NULL,
          tipo_documento VARCHAR(100) NOT NULL,
          ruta_archivo VARCHAR(255) NOT NULL,
          nombre_original VARCHAR(255) NOT NULL,
          fecha_carga TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
          estatus ENUM("pendiente","aprobado","rechazado") DEFAULT "pendiente",
          comentario TEXT DEFAULT NULL,
          revisado_por INT DEFAULT NULL,
          fecha_revision TIMESTAMP NULL,
          PRIMARY KEY (id),
          UNIQUE KEY aspirante_id (aspirante_id, tipo_documento),
          CONSTRAINT expediente_aspirantes_ibfk_1 FOREIGN KEY (aspirante_id) REFERENCES usuarios (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
      `);
      console.log("? Tabla creada con las nuevas columnas");
    } else {
      // Verificar columnas existentes
      const [cols] = await connection.execute(
        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'expediente_aspirantes'",
        [process.env.DB_NAME]
      );
      const colNames = cols.map((c) => c.COLUMN_NAME);

      const migraciones = [
        { col: "estatus", sql: 'ALTER TABLE expediente_aspirantes ADD COLUMN estatus ENUM("pendiente","aprobado","rechazado") DEFAULT "pendiente"' },
        { col: "comentario", sql: "ALTER TABLE expediente_aspirantes ADD COLUMN comentario TEXT DEFAULT NULL" },
        { col: "revisado_por", sql: "ALTER TABLE expediente_aspirantes ADD COLUMN revisado_por INT DEFAULT NULL" },
        { col: "fecha_revision", sql: "ALTER TABLE expediente_aspirantes ADD COLUMN fecha_revision TIMESTAMP NULL" },
      ];

      for (const mig of migraciones) {
        if (!colNames.includes(mig.col)) {
          await connection.execute(mig.sql);
          console.log("? Columna '" + mig.col + "' agregada");
        } else {
          console.log("?? Columna '" + mig.col + "' ya existe");
        }
      }
    }

    console.log("\n--- ANÁLISIS DE LA BASE DE DATOS ---");
    const [allTables] = await connection.execute(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME",
      [process.env.DB_NAME]
    );

    for (const { TABLE_NAME } of allTables) {
      const [cols] = await connection.execute(
        "SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_DEFAULT, EXTRA FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION",
        [process.env.DB_NAME, TABLE_NAME]
      );
      console.log("\n?? " + TABLE_NAME);
      cols.forEach((c) => {
        const pk = c.COLUMN_KEY === "PRI" ? " ??" : "";
        const auto = c.EXTRA && c.EXTRA.includes("auto_increment") ? " ?" : "";
        const nullable = c.IS_NULLABLE === "YES" ? " NULL" : " NOT NULL";
        const def = c.COLUMN_DEFAULT !== null ? " DEFAULT " + c.COLUMN_DEFAULT : "";
        console.log("  " + c.COLUMN_NAME + " ? " + c.COLUMN_TYPE + nullable + def + pk + auto);
      });
    }

    console.log("\n? Migración y análisis completados.");
  } catch (err) {
    console.error("? Error:", err.message);
  } finally {
    await connection.end();
  }
}

run();
