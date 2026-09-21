const { createPool } = require("./db");

(async () => {
  const pool = createPool();
  try {
    const [tables] = await pool.query("SHOW FULL TABLES");
    const tableNames = tables.map((r) => Object.values(r)[0]);
    console.log("=== TABLAS ===");
    console.log(tableNames.join(", "));

    const targets = [
      "usuarios",
      "adeudos_alumnos",
      "conceptos_pago",
      "grupos",
      "grupo_alumnos",
      "carreras",
      "sedes",
      "planes_estudio",
      "ciclos",
      "grados",
    ];
    for (const t of targets) {
      if (!tableNames.includes(t)) {
        console.log(`\n[${t}] NO EXISTE`);
        continue;
      }
      console.log(`\n=== DESCRIBE ${t} ===`);
      const [cols] = await pool.query(`DESCRIBE \`${t}\``);
      for (const c of cols) {
        console.log(
          `  ${c.Field} | ${c.Type} | ${c.Null === "YES" ? "null" : "NOTNULL"} | key=${c.Key} | def=${c.Default}`
        );
      }
    }
  } finally {
    await pool.end();
  }
})().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});