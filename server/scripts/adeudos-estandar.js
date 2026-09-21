#!/usr/bin/env node
/**
 * ADEUDOS ESTÁNDAR para alumnos activos sin ningún adeudo.
 *
 * Uso:
 *   node adeudos-estandar.js            # dry-run (por defecto): NO escribe nada
 *   node adeudos-estandar.js --apply    # aplica los cambios en BD (transacción)
 *
 * Por cada alumno (rol 'alumno', activo=1) SIN ningún adeudo se insertan 3 adeudos:
 *   Adeudo 2026 = $4,400   (referencia moda del Excel)
 *   Adeudo 2027 = $13,200
 *   Adeudo 2028 = $13,200
 * estatus 'pendiente', vencimiento 31-dic del año, registrado_por_usuario_id = admin (config.adminUserId).
 * Reutiliza conceptos "Adeudo {año}" existentes; los faltantes los crea (tipo UNICO).
 * Todo dentro de UNA transacción con respaldo previo en server/scripts/.
 */
const fs = require("fs");
const path = require("path");
const config = require("./import-config");

const APPLY = process.argv.includes("--apply");

const MONTO_POR_ANIO = { 2026: 4400.0, 2027: 13200.0, 2028: 13200.0 };
const ANIOS = [2026, 2027, 2028];

let pool = null;
async function sql(query, params) {
  const [rows] = await pool.query(query, params);
  return rows;
}

function btn(texto) {
  return `\n${"─".repeat(80)}\n${texto}\n${"─".repeat(80)}\n`;
}

async function cargarCatalogo() {
  const alumnos = await sql(
    `SELECT u.id, u.matricula,
            CONCAT_WS(' ', COALESCE(u.apellido_paterno, ''), COALESCE(u.apellido_materno, ''), u.nombre) AS nombre,
            (SELECT g.nombre_grupo FROM grupos g WHERE g.id = u.grupo_id) AS grupo
     FROM usuarios u
     WHERE u.rol = 'alumno' AND u.activo = 1
       AND NOT EXISTS (SELECT 1 FROM adeudos_alumnos a WHERE a.alumno_id = u.id)
     ORDER BY u.matricula`
  );
  const conceptos = await sql("SELECT * FROM conceptos_pago");
  const maxA = await sql("SELECT MAX(id) m FROM adeudos_alumnos");
  const maxC = await sql("SELECT MAX(id) m FROM conceptos_pago");
  return {
    alumnos,
    conceptos,
    maxAdeudoId: maxA[0]?.m || 0,
    maxConceptoId: maxC[0]?.m || 0,
  };
}

// ---------------------------------------------------------------- apply
async function aplicar(cat) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // respaldo previo (listado de afectados) antes de tocar nada
    const rutaBackup = path.join(__dirname, `backup_adeudos_estandar_${Date.now()}.json`);
    fs.writeFileSync(
      rutaBackup,
      JSON.stringify(
        {
          fecha: new Date().toISOString(),
          montos: MONTO_POR_ANIO,
          alumnosAfectados: cat.alumnos.map((u) => ({ matricula: u.matricula, nombre: u.nombre, grupo: u.grupo || null })),
          notas: "Respaldo ligero; estos alumnos tenían 0 adeudos antes de este script.",
        },
        null,
        2
      )
    );
    console.log(`Respaldo previo: ${rutaBackup}`);

    // conceptos
    const conceptoIds = new Map(cat.conceptos.map((c) => [c.nombre_concepto, c.id]));
    let nextConceptoId = cat.maxConceptoId;
    for (const anio of ANIOS) {
      const nombre = `Adeudo ${anio}`;
      if (!conceptoIds.has(nombre)) {
        nextConceptoId++;
        conceptoIds.set(nombre, nextConceptoId);
        await conn.query(
          "INSERT INTO conceptos_pago (id,nombre_concepto,monto_default,tipo,es_concepto_inscripcion,activo,monto) VALUES (?,?,0.00,'UNICO',0,1,0.00)",
          [nextConceptoId, nombre]
        );
        console.log(` + concepto ${nextConceptoId}: ${nombre}`);
      }
    }

    // adeudos
    let nextAdeudoId = cat.maxAdeudoId;
    let insertadas = 0;
    for (const u of cat.alumnos) {
      for (const anio of ANIOS) {
        nextAdeudoId += 10;
        await conn.query(
          "INSERT INTO adeudos_alumnos (id,alumno_id,concepto_id,monto_a_pagar,estatus_pago,fecha_vencimiento,registrado_por_usuario_id) VALUES (?,?,?,?,'pendiente',?,?)",
          [
            nextAdeudoId,
            u.id,
            conceptoIds.get(`Adeudo ${anio}`),
            MONTO_POR_ANIO[anio],
            config.fechaVencimientoPorYear[anio],
            config.adminUserId,
          ]
        );
        insertadas++;
      }
    }

    await conn.commit();
    console.log(btn(`TRANSACCIÓN APLICADA Y CONFIRMADA: ${insertadas} adeudos para ${cat.alumnos.length} alumnos.`));
  } catch (e) {
    await conn.rollback();
    console.error(btn(`!! ERROR, ROLLBACK: ${e.message}`));
    console.error(e.stack);
    process.exit(1);
  } finally {
    conn.release();
  }
}

// ---------------------------------------------------------------- main
(async () => {
  pool = await require("./db.js").createPool();
  try {
    const cat = await cargarCatalogo();

    console.log(btn(`${APPLY ? "EJECUTANDO (--apply)" : "INFORME (dry-run, nada se escribe)"}`));
    console.log(`Alumnos activos SIN ningún adeudo : ${cat.alumnos.length}   (esperado: 68)`);

    // concepto que faltaría
    const nombres = new Map(cat.conceptos.map((c) => [c.nombre_concepto, c.id]));
    const faltantes = ANIOS.filter((a) => !nombres.has(`Adeudo ${a}`));

    console.log(btn("ALUMNOS (matrícula | grupo | nombre)"));
    for (const u of cat.alumnos) {
      console.log(`  ${String(u.matricula).padEnd(9)} ${(u.grupo || "-").padEnd(22)} ${u.nombre}`);
    }

    console.log(btn("RESUMEN"));
    const total = ANIOS.reduce((s, a) => s + cat.alumnos.length * MONTO_POR_ANIO[a], 0);
    for (const a of ANIOS) {
      const parcial = cat.alumnos.length * MONTO_POR_ANIO[a];
      console.log(`  Adeudo ${a}: $${MONTO_POR_ANIO[a].toFixed(2)} x ${cat.alumnos.length} = $${parcial.toFixed(2)}`);
    }
    console.log(`  Adeudos a insertar: ${cat.alumnos.length * ANIOS.length}`);
    console.log(`  TOTAL GENERAL    : $${total.toFixed(2)}`);
    console.log(`  Conceptos faltantes que se crearían: [${faltantes.join(", ")}]`);

    if (!APPLY) {
      console.log(btn("DRY-RUN COMPLETADO — NO SE ESCRIBIÓ NADA EN BD"));
      console.log("Para aplicar:  node adeudos-estandar.js --apply");
      return;
    }

    await aplicar(cat);
  } finally {
    await pool.end();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});