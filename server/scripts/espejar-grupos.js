#!/usr/bin/env node
/**
 * ESPEJO Excel -> BD (grupos + alumnos faltantes + adeudos anuales hojas viejas)
 *
 * Uso:
 *   node espejar-grupos.js            # dry-run (NO escribe nada)
 *   node espejar-grupos.js --apply    # aplica en BD (transacción + backup JSON)
 *
 * Qué hace (--apply), todo en UNA transacción:
 *   1. Crea los 3 grupos faltantes: Psicología 1/2/3 (Primero/Segundo/Tercero).
 *   2. Crea los alumnos en ROJO del match (no existen en BD), con matrícula
 *      20260151+, correo institucional, password = matrícula (bcrypt).
 *      - Verdes/amarillos NO se tocan.
 *      - Filas con OBS de BAJA ("baja", "BAJA 05/02/26") o de pase
 *        ("SE INTEGRA EN...") se EXCLUYEN y se reportan en notas.
 *   3. Vincula alumno -> grupo (grupo_alumnos + usuarios.grupo_id).
 *   4. Adeudos anuales (SOLO hojas viejas PSIC-1/2, PSCI-3): 1 adeudo pendiente
 *      "Adeudo YYYY" por año con saldo. Rojos de las 7 hojas vigentes NO llevan
 *      adeudo anual: sus mensualidades las crea importar-historial-mensual.js.
 *
 * No toca adeudos de alumnos existentes.
 */
const XLSX = require("xlsx");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const { normalizar, dividirNombre } = require("./import-parse");
const { listaAlumnos, ARCHIVO_DEFAULT } = require("../lector-pagos-aislado/grupos");
const { matchHoja } = require("../lector-pagos-aislado/match");

const APPLY = process.argv.includes("--apply");
const DOMINIO = "universidadsigloxxi.com";
const ADMIN_ID = 1;

const GRUPOS_NUEVOS = [
  { sheet: "PSIC-1", nombre: "PSIC-1", grado: "Primero" },
  { sheet: "PSIC-2", nombre: "PSIC-2", grado: "Segundo" },
  { sheet: "PSCI-3", nombre: "PSCI-3", grado: "Tercero" },
];
const HOJAS_VIEJAS = new Set(GRUPOS_NUEVOS.map((g) => g.sheet));
// PSIC-2 no trae columnas de año con encabezado: años en cols 40-43 (2025-2028)
const PSIC2_YEAR_COLS = [40, 41, 42, 43];
const PSIC2_BASE_YEAR = 2025;

const OBS_EXCLUIR = /baja|se integra/i;

let pool = null;

function obsDe(sheet, fila1based) {
  const wb = obsDe._wb || (obsDe._wb = XLSX.readFile(ARCHIVO_DEFAULT));
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheet], { header: 1, defval: "" });
  let hRow = -1;
  let obsCol = -1;
  let nameCol = -1;
  for (let i = 0; i < Math.min(rows.length, 12); i++) {
    const idx = (rows[i] || []).findIndex((c) => /NOMBRE\s+DEL\s+ALUMNO/i.test(String(c || "")));
    if (idx > -1) {
      hRow = i;
      nameCol = idx;
      obsCol = (rows[i] || []).findIndex((c) => /OBS/i.test(String(c || "")));
      break;
    }
  }
  if (obsCol < 0) obsCol = nameCol - 1;
  const r = rows[fila1based - 1] || [];
  return String(r[obsCol] || "").trim();
}

// Adeudos anuales de hojas viejas: { anio: monto } (monto > 0 = debe)
function adeudosAnuales(sheet) {
  const wb = XLSX.readFile(ARCHIVO_DEFAULT);
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheet], { header: 1, defval: "" });
  let hRow = -1;
  let nameCol = -1;
  for (let i = 0; i < Math.min(rows.length, 12); i++) {
    const idx = (rows[i] || []).findIndex((c) => /NOMBRE\s+DEL\s+ALUMNO/i.test(String(c || "")));
    if (idx > -1) {
      hRow = i;
      nameCol = idx;
      break;
    }
  }
  const header = rows[hRow] || [];
  // columnas de año por encabezado /^20\d\d$/
  const yearCols = [];
  header.forEach((h, c) => {
    if (/^20\d\d$/.test(String(h).trim())) yearCols.push({ anio: Number(String(h).trim()), col: c });
  });
  // convención de signo: si la mayoría de valores son negativos, debe = negativo
  let neg = 0;
  let pos = 0;
  for (let i = hRow + 1; i < rows.length; i++) {
    for (const y of yearCols.length ? yearCols : PSIC2_YEAR_COLS.map((col, k) => ({ anio: PSIC2_BASE_YEAR + k, col }))) {
      const v = Number((rows[i] || [])[y.col] || 0);
      if (v < 0) neg++;
      if (v > 0) pos++;
    }
  }
  const debeEsNegativo = neg >= pos;
  const cols = yearCols.length ? yearCols : PSIC2_YEAR_COLS.map((col, k) => ({ anio: PSIC2_BASE_YEAR + k, col }));
  const porAlumno = new Map(); // fila1based -> { anio: monto }
  for (let i = hRow + 1; i < rows.length; i++) {
    const nombre = String((rows[i] || [])[nameCol] || "").trim();
    if (!nombre) continue;
    const det = {};
    for (const y of cols) {
      const v = Number((rows[i] || [])[y.col] || 0);
      if (!v) continue;
      if (debeEsNegativo && v < 0) det[y.anio] = Math.round(Math.abs(v) * 100) / 100;
      else if (!debeEsNegativo && v > 0) det[y.anio] = Math.round(v * 100) / 100;
      else if (v > 0) porAlumno.notasCredito = true;
    }
    porAlumno.set(i + 1, det);
  }
  return { porAlumno, debeEsNegativo };
}

async function construirPlan() {
  pool = await require("./db").createPool();
  try {
    const [gruposBD] = await pool.query("SELECT * FROM grupos");
    const [carreras] = await pool.query("SELECT * FROM carreras");
    const [planes] = await pool.query("SELECT * FROM planes_estudio");
    const [sedes] = await pool.query("SELECT * FROM sedes");
    const [grados] = await pool.query("SELECT * FROM grados");
    const [ciclos] = await pool.query("SELECT * FROM ciclos");
    const [conceptos] = await pool.query("SELECT * FROM conceptos_pago");
    const [mats] = await pool.query("SELECT matricula FROM usuarios WHERE matricula REGEXP '^[0-9]+$' ORDER BY matricula DESC LIMIT 1");

    const normGrupos = new Map(gruposBD.map((g) => [normalizar(g.nombre_grupo), g]));
    const plan = { gruposCrear: [], alumnosCrear: [], adeudosCrear: [], conceptosCrear: [], excluidos: [], notas: [] };
    const conceptoIds = new Map(conceptos.map((c) => [c.nombre_concepto, c.id]));

    const carreraPsi = carreras.find((c) => /psicolog/i.test(c.nombre_carrera)).id;
    const planPsi = planes.find((p) => p.carrera_id === carreraPsi && /licenciatura/i.test(p.nombre_plan)).id;
    const sede = sedes[0].id;
    const ciclo = ciclos[0].id;
    const gradoId = (n) => grados.find((g) => normalizar(g.nombre_grado) === normalizar(n)).id;

    // 1) grupos faltantes
    for (const g of GRUPOS_NUEVOS) {
      if (normGrupos.has(normalizar(g.nombre))) {
        plan.notas.push(`Grupo ${g.nombre} ya existe; no se crea`);
        continue;
      }
      plan.gruposCrear.push({ ...g, carrera_id: carreraPsi, plan_estudio_id: planPsi, sede_id: sede, ciclo_id: ciclo, grado_id: gradoId(g.grado), modalidad: "presencial" });
    }

    // 2) y 3) alumnos rojos + adeudos anuales hojas viejas
    let maxMat = Math.max(Number((mats[0] && mats[0].matricula) || 20260150), 20260150);
    const anualesPorHoja = {};
    for (const h of HOJAS_VIEJAS) anualesPorHoja[h] = adeudosAnuales(h);

    const sheets = [...HOJAS_VIEJAS, "PSIC-4", "PSICO-5", "PSICO VIR-6", "PEDA VIR-6", "PEDA-4", "PEDA-5", "PEDA-6"];
    for (const sheet of sheets) {
      const m = await matchHoja(sheet);
      const grupoDestino = MAPEO_GRUPO_SHEET(sheet, plan, normGrupos);
      const nombres = new Map(listaAlumnos(ARCHIVO_DEFAULT, sheet).map((a) => [normalizar(a.nombre), a]));
      for (const f of m.alumnos) {
        if (f.estado !== "rojo") continue;
        const a = nombres.get(normalizar(f.nombreExcel));
        const obs = a ? obsDe(sheet, a.fila) : "";
        if (OBS_EXCLUIR.test(obs)) {
          plan.excluidos.push({ hoja: sheet, nombre: f.nombreExcel, obs, motivo: "OBS indica baja/pase; revisión manual" });
          continue;
        }
        maxMat++;
        const mat = String(maxMat);
        const div = dividirNombre(f.nombreExcel);
        const item = {
          hoja: sheet,
          nombreExcel: f.nombreExcel,
          grupo: grupoDestino,
          ap: div.ap,
          am: div.am,
          nombres: div.nombre,
          matricula: mat,
          email: `${mat}@${DOMINIO}`,
          obs,
        };
        plan.alumnosCrear.push(item);
        if (HOJAS_VIEJAS.has(sheet)) {
          const det = (anualesPorHoja[sheet].porAlumno.get(a.fila) || {});
          for (const [anio, monto] of Object.entries(det)) {
            const concepto = `Adeudo ${anio}`;
            if (!conceptoIds.has(concepto) && !plan.conceptosCrear.includes(concepto)) plan.conceptosCrear.push(concepto);
            item.adeudos = item.adeudos || [];
            item.adeudos.push({ anio: Number(anio), monto, concepto });
            plan.adeudosCrear.push({ matricula: mat, nombre: f.nombreExcel, anio: Number(anio), monto, concepto });
          }
        }
      }
    }
    plan.totalAdeudos = plan.adeudosCrear.length;
    plan.totalMonto = Math.round(plan.adeudosCrear.reduce((s, x) => s + x.monto, 0) * 100) / 100;
    return plan;
  } finally {
    await pool.end();
  }
}

function MAPEO_GRUPO_SHEET(sheet, plan, normGrupos) {
  const { MAPEO_GRUPO } = require("../lector-pagos-aislado/match");
  if (MAPEO_GRUPO[sheet]) return MAPEO_GRUPO[sheet];
  const g = GRUPOS_NUEVOS.find((x) => x.sheet === sheet);
  return g ? g.nombre : null;
}

function imprimir(plan) {
  console.log(`${APPLY ? "EJECUTANDO (--apply)" : "INFORME (dry-run, nada se escribe)"}`);
  console.log(`Grupos a crear   : ${plan.gruposCrear.length} -> ${plan.gruposCrear.map((g) => g.nombre).join(", ")}`);
  console.log(`Alumnos a crear  : ${plan.alumnosCrear.length}`);
  console.log(`Conceptos a crear: ${plan.conceptosCrear.length} -> [${plan.conceptosCrear.join(", ")}]`);
  console.log(`Adeudos anuales  : ${plan.adeudosCrear.length} por $${plan.totalMonto}`);
  console.log(`Excluidos (manual): ${plan.excluidos.length}`);
  const porHoja = {};
  for (const a of plan.alumnosCrear) porHoja[a.hoja] = (porHoja[a.hoja] || 0) + 1;
  console.log("Altas por hoja:", JSON.stringify(porHoja));
  for (const a of plan.alumnosCrear) {
    const ad = (a.adeudos || []).map((x) => `${x.anio}=$${x.monto}`).join(", ") || "sin adeudo anual";
    console.log(`  [${a.hoja}] ${a.nombreExcel} -> ${a.grupo} mat ${a.matricula} [${ad}]${a.obs ? " obs:" + a.obs.slice(0, 40) : ""}`);
  }
  if (plan.excluidos.length) {
    console.log("EXCLUIDOS (revisar manual):");
    for (const e of plan.excluidos) console.log(`  [${e.hoja}] ${e.nombre} obs:"${e.obs}"`);
  }
}

async function aplicar(plan) {
  pool = await require("./db").createPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const conceptoIds = new Map((await conn.query("SELECT * FROM conceptos_pago"))[0].map((c) => [c.nombre_concepto, c.id]));
    for (const nombre of plan.conceptosCrear) {
      const [r] = await conn.query(
        "INSERT INTO conceptos_pago (nombre_concepto,monto_default,tipo,es_concepto_inscripcion,activo,monto) VALUES (?,?,?,?,?,?)",
        [nombre, 0.0, "UNICO", 0, 1, 0.0]
      );
      conceptoIds.set(nombre, r.insertId);
      console.log(` + concepto ${r.insertId}: ${nombre}`);
    }
    const grupoIds = {};
    const [g0] = await conn.query("SELECT * FROM grupos");
    for (const g of g0) grupoIds[normalizar(g.nombre_grupo)] = g.id;
    for (const g of plan.gruposCrear) {
      const [r] = await conn.query(
        "INSERT INTO grupos (nombre_grupo,cupo,ciclo_id,sede_id,plan_estudio_id,grado_id,estatus,modalidad,activo) VALUES (?,?,?,?,?,?,?,?,?)",
        [g.nombre, 40, g.ciclo_id, g.sede_id, g.plan_estudio_id, g.grado_id, "activo", g.modalidad, 1]
      );
      grupoIds[normalizar(g.nombre)] = r.insertId;
      console.log(` + grupo ${r.insertId}: ${g.nombre}`);
    }
    const creados = [];
    for (const a of plan.alumnosCrear) {
      const gid = grupoIds[normalizar(a.grupo)];
      if (!gid) throw new Error(`Sin grupo BD para ${a.nombreExcel} (${a.grupo})`);
      const pass = await bcrypt.hash(a.matricula, 10);
      const carreraId = /psicolog/i.test(a.grupo) ? 7 : 1;
      const [r] = await conn.query(
        `INSERT INTO usuarios (email,password,rol,nombre,apellido_paterno,apellido_materno,matricula,carrera_id,sede_id,grupo_id,activo,estado_academico,modalidad,sede_interes_id,carrera_interes_id)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [a.email, pass, "alumno", a.nombres, a.ap, a.am, a.matricula, carreraId, 6, gid, 1, "activo", "presencial", 6, carreraId]
      );
      await conn.query("INSERT INTO grupo_alumnos (grupo_id,alumno_id) VALUES (?,?)", [gid, r.insertId]);
      for (const ad of a.adeudos || []) {
        await conn.query(
          "INSERT INTO adeudos_alumnos (alumno_id,concepto_id,monto_a_pagar,estatus_pago,fecha_vencimiento,registrado_por_usuario_id) VALUES (?,?,?,?,?,?)",
          [r.insertId, conceptoIds.get(ad.concepto), ad.monto, "pendiente", `${ad.anio}-12-31`, ADMIN_ID]
        );
      }
      creados.push({ id: r.insertId, ...a });
      console.log(` + alumno ${r.insertId}: ${a.nombreExcel} mat ${a.matricula} (${a.grupo})`);
    }
    await conn.commit();
    console.log("\nTRANSACCION APLICADA Y CONFIRMADA.");
    const ruta = path.join(__dirname, `backup_espejo_${Date.now()}.json`);
    fs.writeFileSync(ruta, JSON.stringify({ fecha: new Date().toISOString(), creados }, null, 2));
    console.log(`Respaldo: ${ruta}`);
  } catch (e) {
    await conn.rollback();
    console.error(`!! ERROR, ROLLBACK: ${e.message}`);
    process.exit(1);
  } finally {
    conn.release();
    await pool.end();
  }
}

(async () => {
  const plan = await construirPlan();
  imprimir(plan);
  const ruta = path.join(__dirname, "plan_espejo.json");
  fs.writeFileSync(ruta, JSON.stringify(plan, null, 2));
  console.log(`\nPlan (JSON): ${ruta}`);
  if (APPLY) await aplicar(plan);
  else console.log("DRY-RUN COMPLETADO — NO SE ESCRIBIO NADA EN BD\nPara aplicar: node espejar-grupos.js --apply");
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
