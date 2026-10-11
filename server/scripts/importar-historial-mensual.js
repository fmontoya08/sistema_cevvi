#!/usr/bin/env node
/**
 * IMPORTAR HISTORIAL DE PAGOS MENSUAL (Excel -> BD producción)
 *
 * Convierte el libro de pagos del Excel en adeudos_alumnos mes a mes:
 *   - Celda con monto      -> adeudo estatus 'pagado'   (historial de pagos)
 *   - Celda vacía          -> adeudo estatus 'pendiente' (periodo 2026 sin cubrir)
 *   - Celda parcial "1000 (falta 400)" -> pagado 1000 + pendiente 400
 *   - Celda "BECA"         -> se omite (no genera adeudo)
 *   - PSIC-4: los pendientes salen de su columna ADEUDOS (lista de meses).
 *
 * Uso:
 *   node importar-historial-mensual.js            # dry-run (no escribe nada)
 *   node importar-historial-mensual.js --apply    # aplica en BD (transacción + backup)
 *
 * Alumnos sin cuenta en BD se reportan y NO se tocan.
 * Alumnos de producción que no estén en el Excel NO se tocan.
 */
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");
const config = require("./import-config");
const { parsearArchivo, normalizar, levenshtein, tokens } = require("./import-parse");

const APPLY = process.argv.includes("--apply");

let pool = null;
async function sql(query, params) {
  const [rows] = await pool.query(query, params);
  return rows;
}

// -------------------------------------------------------------- montos / celdas
const MES_MM = {
  Febrero: 2, Marzo: 3, Abril: 4, Mayo: 5, Junio: 6,
  Julio: 7, Agosto: 8, Septiembre: 9, Octubre: 10, Noviembre: 11, Diciembre: 12,
};

// cantidad pagada al inicio de la celda: "1000 (falta 400)" -> 1000 ; "BECA" -> null
function montoInicialCelda(texto) {
  if (texto === null || texto === undefined) return null;
  const t = String(texto).trim();
  if (!t) return null;
  if (/^BECA/i.test(t) || /^#REF/i.test(t)) return 0; // becado/error: no cargo
  const m = t.match(/^[-+]?\d[\d,\.]*/);
  if (!m) return null;
  const n = Number(m[0].replace(/,/g, ""));
  return isFinite(n) ? n : null;
}

function esParcial(texto) {
  return texto !== null && texto !== undefined && /falta/i.test(String(texto));
}

// -------------------------------------------------------------- periodos 2026 por hoja
// Cada periodo: { tipo, nombre, mm }
function perS(nombre, tipo, mm) {
  return { tipo, nombre, mm };
}
const PERIODOS_2026 = {
  "PSIC-4 y 5": { dbl: ["PSIC-4 y 5", "PEDA-4"], celdas: (k) => [
    perS("Inscripción", "inscripcion", 2),
    perS("Febrero", "mensualidad", 2),
    perS("Marzo", "mensualidad", 3),
    perS("Abril", "mensualidad", 4),
    perS("Mayo", "reinscripcion", 5),
    perS("Junio", "mensualidad", 6),
    perS("Julio", "mensualidad", 7),
    perS("Agosto", "mensualidad", 8),
    perS("Septiembre", "reinscripcion", 9),
    perS("Octubre", "mensualidad", 10),
    perS("Noviembre", "mensualidad", 11),
    perS("Diciembre", "mensualidad", 12),
  ][k] },
  "PEDA-5": { celdas: (k) => [
    perS("Inscripción y Mayo", "insc_may", 5),
    perS("Junio", "mensualidad", 6),
    perS("Julio", "mensualidad", 7),
    perS("Agosto", "mensualidad", 8),
    perS("Septiembre", "reinscripcion", 9),
    perS("Octubre", "mensualidad", 10),
    perS("Noviembre", "mensualidad", 11),
    perS("Diciembre", "mensualidad", 12),
  ][k] },
  "PSICO-6": { dbl: ["PSICO-6", "PSICO VIR-6", "PEDA VIR-6", "PEDA-6"], celdas: (k) => [
    perS("Inscripción", "inscripcion", 9),
    perS("Septiembre", "mensualidad", 9),
    perS("Octubre", "mensualidad", 10),
    perS("Noviembre", "mensualidad", 11),
    perS("Diciembre", "mensualidad", 12),
  ][k] },
};

function periodosDeHoja(sheet) {
  if (PERIODOS_2026["PSIC-4 y 5"].dbl?.includes(sheet)) return PERIODOS_2026["PSIC-4 y 5"].celdas;
  if (PERIODOS_2026["PSICO-6"].dbl?.includes(sheet)) return PERIODOS_2026["PSICO-6"].celdas;
  if (sheet === "PEDA-5") return PERIODOS_2026["PEDA-5"].celdas;
  return null;
}

const ANIO = 2026;
const EM_MAP = { Febrero: "Febrero", Marzo: "Marzo", Abril: "Abril", Mayo: "Mayo", Junio: "Junio", Julio: "Julio", Agosto: "Agosto", Septiembre: "Septiembre", Octubre: "Octubre", Noviembre: "Noviembre", Diciembre: "Diciembre" };
const em = (mm) => EM_MAP[mm] || null;

function fechaVenc(p) {
  if (p.tipo === "insc_may") return `${ANIO}-05-05`;
  return `${ANIO}-${String(p.mm).padStart(2, "0")}-05`;
}
const ULTIMO_DIA = { 1: 31, 2: 28, 3: 31, 4: 30, 5: 31, 6: 30, 7: 31, 8: 31, 9: 30, 10: 31, 11: 30, 12: 31 };
function fechaPago(p) {
  if (p.tipo === "insc_may") return `${ANIO}-05-31`;
  return `${ANIO}-${String(p.mm).padStart(2, "0")}-${ULTIMO_DIA[p.mm]}`;
}

function cuotaDe(p) {
  if (p.tipo === "inscripcion") return 1500;
  if (p.tipo === "reinscripcion") return 1400;
  if (p.tipo === "insc_may") return 2500;
  return 1000;
}

function nombreConcepto(p) {
  if (p.tipo === "inscripcion") return "Inscripción 2026";
  if (p.tipo === "reinscripcion") return `Reinscripción ${p.nombre} 2026`;
  if (p.tipo === "insc_may") return "Inscripción y Mayo 2026";
  return `Mensualidad ${p.nombre} 2026`;
}

// ---------------------------------------------------------------- matching difuso
function claveProd(u) {
  return normalizar(`${u.nombre} ${u.apellido_paterno} ${u.apellido_materno || ""}`);
}
function puntajeFuzzy(a, b) {
  const ta = tokens(a);
  const tb = tokens(b);
  const base = Math.max(ta.length, tb.length);
  if (base === 0) return 0;
  const usados = new Array(tb.length).fill(false);
  let afin = 0;
  let exact = 0;
  for (const t of ta) {
    let bi = -1;
    let bd = Infinity;
    for (let j = 0; j < tb.length; j++) {
      if (usados[j]) continue;
      const d = levenshtein(t, tb[j]);
      if (d < bd) {
        bd = d;
        bi = j;
      }
    }
    if (bi >= 0 && bd <= 2) {
      usados[bi] = true;
      if (bd === 0) exact++;
      afin += bd === 0 ? 1 : 0.5;
    }
  }
  return { cobertura: afin / base, exact };
}
const UMBRAL_COBERTURA = 0.6;
const UMBRAL_EXACTOS = 2;
function mejorCandidato(nombre, alumnosProd) {
  let mejor = null;
  let mejorScore = null;
  for (const u of alumnosProd) {
    const s = puntajeFuzzy(claveProd(u), nombre);
    if (s.cobertura < UMBRAL_COBERTURA || s.exact < UMBRAL_EXACTOS) continue;
    if (!mejorScore || s.cobertura > mejorScore.cobertura) {
      mejor = u;
      mejorScore = s;
    }
  }
  if (mejor && mejorScore) {
    let empates = 0;
    for (const u of alumnosProd) {
      if (u.id === mejor.id) continue;
      const s = puntajeFuzzy(claveProd(u), nombre);
      if (s.cobertura === mejorScore.cobertura && s.exact === mejorScore.exact) empates++;
    }
    if (empates > 0) return null;
  }
  return mejor;
}

// ---------------------------------------------------------------- plan
async function construirPlan(data, catalogo) {
  const plan = {
    alumnos: [],
    sinCuenta: [],
    conceptosNuevos: [],
    totalPagado: 0,
    totalPendiente: 0,
    noEnExcel: [],
    notas: [],
    revisar: [],
  };
  const conceptoIds = new Map(catalogo.conceptos.map((c) => [c.nombre_concepto, c.id]));
  const wb = data.workbook;
  const usado = new Set();

  for (const cfg of config.sheets) {
    const celdas = periodosDeHoja(cfg.sheet);
    const sheet = wb.Sheets[cfg.sheet];
    const rows = sheet && sheet["!ref"] ? XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true }) : [];
    let hRow = -1;
    for (let i = 0; i < Math.min(rows.length, 12); i++) {
      const idx = (rows[i] || []).findIndex((c) => c && /NOMBRE\s+DEL\s+ALUMNO/i.test(String(c)));
      if (idx > -1) {
        hRow = i;
        break;
      }
    }
    if (hRow < 0 || !celdas) {
      if (hRow < 0) plan.notas.push(`Hoja ${cfg.sheet} sin encabezado; omitida`);
      continue;
    }
    // deducir columna del nombre real
    const nameCol = (rows[hRow] || []).findIndex((c) => c && /NOMBRE\s+DEL\s+ALUMNO/i.test(String(c)));
    let adeudCol = -1;
    const hr = rows[hRow] || [];
    const hrIdx = hr.findIndex((c) => c && /ADEUDOS/i.test(String(c)));
    if (hrIdx > -1) adeudCol = hrIdx;
    const obsCol = nameCol - 1;
    const numPeriodos = (() => {
      // contar celdas de periodo hasta que no haya fee en fila hRow+1
      // (usar el número fijo definido)
      return celdas({}) ? 0 : 0;
    })();
    const NPER = cfg.sheet === "PEDA-5" ? 8 : (PERIODOS_2026["PSIC-4 y 5"].dbl?.includes(cfg.sheet) ? 12 : 5);

    for (let i = hRow + 2; i < rows.length; i++) {
      const r = rows[i] || [];
      const nombre = String(r[nameCol] || "").trim();
      if (!nombre || !/[A-Za-zÁÉÍÓÚÑ]/.test(nombre)) continue;
      if (/NOMBRE\s+DEL\s+ALUMNO/i.test(nombre)) continue;
      if (/^FUSIONADOS/i.test(nombre.trim()) || /^BAJA/i.test(nombre.trim())) continue;

      const clave = normalizar(nombre).split(" ").sort().join(" ");
      if (usado.has(clave)) continue;
      usado.add(clave);

      const adeudosList = adeudCol >= 0 ? String(r[adeudCol] || "").trim() : "";
      const obs = obsCol >= 0 ? String(r[obsCol] || "").trim() : "";

      const movimientos = [];
      let totalPag = 0;
      let totalPend = 0;
      const pagadoPorPeriodo = {}; // nombre -> monto pagado
      const becado = {};

      // 1) pagos (celdas con monto)
      for (let k = 0; k < NPER; k++) {
        const p = celdas(k);
        const col = nameCol + 1 + k;
        const t = r[col] === null || r[col] === undefined ? "" : String(r[col]).trim();
        if (!t) continue;
        const pagado = montoInicialCelda(t);
        if (pagado === 0) {
          becado[p.nombre] = true; // BECA / #REF
          continue;
        }
        if (pagado !== null && pagado > 0) {
          pagadoPorPeriodo[p.nombre] = pagado;
          movimientos.push({
            concepto: nombreConcepto(p),
            monto: Math.round(pagado * 100) / 100,
            estatus: "pagado",
            fecha_vencimiento: fechaVenc(p),
            fecha_pago: fechaPago(p),
            periodo: p.nombre,
            parcial: esParcial(t),
          });
          totalPag += pagado;
        }
      }

      // 2) pendientes
      const pendMeses = new Map(); // nombre -> monto pendiente
      const esPsic4 = cfg.sheet === "PSIC-4 y 5";
      if (esPsic4) {
        // PSIC-4: autoridad = columna ADEUDOS (lista de meses) + notas "falta" en celdas
        if (adeudosList) {
          for (const raw of adeudosList.split(",")) {
            const tok = raw.trim().replace(/\.$/, "");
            if (!tok) continue;
            const m = tok.match(/^([A-Za-zÁÉÍÓÚÑ]+)\s*\/?\s*(?:Reinscripci[oó]n)?\s*-\s*(\d{2}|\d{4})$/i);
            if (!m) {
              plan.notas.push(`${cfg.sheet} ${nombre}: ADEUDO no parseado "${tok}"`);
              continue;
            }
            const mesNombre = em(capitalize(m[1]));
            if (!mesNombre) {
              plan.notas.push(`${cfg.sheet} ${nombre}: mes ADEUDO desconocido "${tok}"`);
              continue;
            }
            const anioTok = m[2].length === 2 ? `20${m[2]}` : m[2];
            if (Number(anioTok) !== ANIO) continue;
            let p = null;
            for (let k = 0; k < NPER; k++) {
              const pp = celdas(k);
              if (pp.nombre === mesNombre && pp.tipo !== "inscripcion") {
                p = pp;
                break;
              }
            }
            if (!p) {
              plan.notas.push(`${cfg.sheet} ${nombre}: ADEUDO "${tok}" no liga a periodo`);
              continue;
            }
            const falta = cuotaDe(p) - (pagadoPorPeriodo[p.nombre] || 0);
            if (falta > 0) pendMeses.set(p.nombre, falta);
          }
        }
        // celdas parciales "1000 (falta 400)" -> la diferencia también es pendiente
        for (let k = 0; k < NPER; k++) {
          const p = celdas(k);
          const col = nameCol + 1 + k;
          const t = r[col] === null || r[col] === undefined ? "" : String(r[col]).trim();
          if (esParcial(t)) {
            const pagado = montoInicialCelda(t);
            const falta = cuotaDe(p) - (pagado || 0);
            if (falta > 0) pendMeses.set(p.nombre, falta);
          }
        }
      } else if (cfg.sheet === "PEDA-4" || cfg.sheet === "PEDA-5") {
        // PEDA-4/PEDA-5: celdas vacías del periodo -> pendiente (cobran el 2026 completo,
        // coincide con el total negativo que la propia hoja trae en su columna/Adeudos)
        for (let k = 0; k < NPER; k++) {
          const p = celdas(k);
          const col = nameCol + 1 + k;
          const t = r[col] === null || r[col] === undefined ? "" : String(r[col]).trim();
          if (becado[p.nombre]) continue; // beca, no adeuda
          const pagado = montoInicialCelda(t);
          if (pagado === null) {
            pendMeses.set(p.nombre, cuotaDe(p));
          } else if (pagado > 0 && cuotaDe(p) - pagado > 0) {
            pendMeses.set(p.nombre, cuotaDe(p) - pagado);
          }
        }
      }
      // PSICO-5 / PSICO VIR-6 / PEDA VIR-6 / PEDA-6: la escuela no registra pendientes 2026
      // (su columna de año total está en 0 y no traen adeudo) -> solo historial de pagos.

      for (const [periodoNombre, monto] of pendMeses) {
        let p = null;
        for (let k = 0; k < NPER; k++) {
          const pp = celdas(k);
          if (pp.nombre === periodoNombre) {
            p = pp;
            break;
          }
        }
        if (!p) continue;
        const debeEstarPendiente = cfg.sheet !== "PSIC-4 y 5" || true;
        movimientos.push({
          concepto: nombreConcepto(p),
          monto: Math.round(monto * 100) / 100,
          estatus: "pendiente",
          fecha_vencimiento: fechaVenc(p),
          fecha_pago: null,
          periodo: p.nombre,
          parcial: false,
        });
        totalPend += monto;
      }

      // conceptos nuevos
      for (const m of movimientos) {
        if (!conceptoIds.has(m.concepto)) {
          conceptoIds.set(m.concepto, conceptoIds.size + 1); // placeholder; se resuelve en apply
          plan.conceptosNuevos.push(m.concepto);
        }
      }

      const cand = mejorCandidato(nombre, catalogo.usuarios) || null;
      const item = {
        hoja: cfg.sheet,
        fila: i + 1,
        nombreExcel: nombre,
        match: cand ? { id: cand.id, matricula: cand.matricula, nombreProd: `${cand.apellido_paterno} ${cand.apellido_materno || ""} ${cand.nombre}`.trim() } : null,
        adeudosList,
        obs,
        movimientos,
        totalPagado: Math.round(totalPag * 100) / 100,
        totalPendiente: Math.round(totalPend * 100) / 100,
      };
      if (!cand) {
        plan.sinCuenta.push(item);
        continue;
      }
      plan.alumnos.push(item);
    }
  }

  // dedup por alumno repetido en distintas hojas
  const porAlumno = new Map();
  for (const a of plan.alumnos) {
    if (porAlumno.has(a.match.id)) {
      const ex = porAlumno.get(a.match.id);
      const exKey = new Set(ex.movimientos.map((m) => `${m.periodo}:${m.concepto}`));
      const dup = a.movimientos.filter((m) => exKey.has(`${m.periodo}:${m.concepto}`));
      ex.movimientos.push(...a.movimientos);
      ex.hoja = `${ex.hoja}+${a.hoja}`;
      ex.totalPagado += a.totalPagado;
      ex.totalPendiente += a.totalPendiente;
      if (dup.length) plan.notas.push(`DUP ${a.nombreExcel}: ${dup.length} mov. coinciden entre hojas`);
    } else {
      porAlumno.set(a.match.id, a);
    }
  }
  plan.alumnos = [...porAlumno.values()];

  const idsExcel = new Set(plan.alumnos.map((a) => a.match.id));
  for (const u of catalogo.usuarios) {
    if (!idsExcel.has(u.id)) {
      plan.noEnExcel.push({ id: u.id, nombre: `${u.apellido_paterno} ${u.apellido_materno || ""} ${u.nombre}`.trim(), matricula: u.matricula });
    }
  }

  for (const a of plan.alumnos) {
    plan.totalPagado += a.totalPagado;
    plan.totalPendiente += a.totalPendiente;
  }
  return plan;
}

function capitalize(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/^./, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------- reportes
function btn(texto) {
  return `\n${"─".repeat(80)}\n${texto}\n${"─".repeat(80)}\n`;
}

function imprimirResumen(plan) {
  console.log(btn(`${APPLY ? "EJECUTANDO (--apply)" : "INFORME (dry-run, nada se escribe)"}`));
  console.log(`Alumnos con cuenta (a importar)  : ${plan.alumnos.length}`);
  console.log(`Alumnos SIN cuenta (no se tocan) : ${plan.sinCuenta.length}`);
  console.log(`Conceptos nuevos                 : ${plan.conceptosNuevos.length} -> [${[...new Set(plan.conceptosNuevos)].join(", ")}]`);
  console.log(`Total PAGADO   (Excel)           : $${plan.totalPagado.toFixed(2)}`);
  console.log(`Total PENDIENTE (Excel)          : $${plan.totalPendiente.toFixed(2)}`);

  console.log(btn("ALUMNOS CON CUENTA"));
  for (const a of plan.alumnos) {
    const det = a.movimientos
      .map((m) => `${m.periodo.slice(0, 3)}${m.estatus === "pagado" ? "P" : "A"}$${m.monto}`)
      .join(" ");
    console.log(`  [${a.hoja}] ${a.nombreExcel.padEnd(44)} ${a.match.matricula} pag=$${a.totalPagado} pend=$${a.totalPendiente}`);
    if (a.obs) console.log(`       obs: ${a.obs.slice(0, 55)}`);
  }

  console.log(btn(`SIN CUENTA (${plan.sinCuenta.length}) — no importan`));
  for (const a of plan.sinCuenta)
    console.log(`  [${a.hoja}] ${a.nombreExcel.padEnd(44)} pag=$${a.totalPagado} pend=$${a.totalPendiente} ${a.adeudosList || ""}`);

  if (plan.notas.length) {
    console.log(btn("NOTAS"));
    for (const n of plan.notas) console.log("  ", n);
  }
}

// ---------------------------------------------------------------- aplicar
async function aplicar(plan, catalogo) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const conceptoIds = new Map(catalogo.conceptos.map((c) => [c.nombre_concepto, c.id]));
    let nextConceptoId = Math.max(...catalogo.conceptos.map((c) => c.id), 0) + 1;
    for (const nombre of [...new Set(plan.conceptosNuevos)]) {
      conceptoIds.set(nombre, nextConceptoId);
      await conn.query(
        "INSERT INTO conceptos_pago (id,nombre_concepto,monto_default,tipo,es_concepto_inscripcion,activo,monto) VALUES (?,?,0.00,'MENSUALIDAD',0,1,0.00)",
        [nextConceptoId, nombre]
      );
      console.log(` + concepto ${nextConceptoId}: ${nombre}`);
      nextConceptoId++;
    }

    const [maxA] = await conn.query("SELECT MAX(id) m FROM adeudos_alumnos");
    let aid = maxA[0].m;

    for (const a of plan.alumnos) {
      const alumnoId = a.match.id;
      const [del] = await conn.query("SELECT id FROM adeudos_alumnos WHERE alumno_id=?", [alumnoId]);
      for (const d of del) await conn.query("DELETE FROM adeudos_alumnos WHERE id=?", [d.id]);
      if (del.length) console.log(` X reemplazo de adeudos de ${a.nombreExcel} (${del.length} eliminados)`);

      for (const m of a.movimientos) {
        aid += 10;
        await conn.query(
          "INSERT INTO adeudos_alumnos (id,alumno_id,concepto_id,monto_a_pagar,estatus_pago,fecha_vencimiento,fecha_pago,registrado_por_usuario_id) VALUES (?,?,?,?,?,?,?,?)",
          [aid, alumnoId, conceptoIds.get(m.concepto), m.monto, m.estatus, m.fecha_vencimiento, m.fecha_pago, config.adminUserId]
        );
      }
      console.log(` + ${a.nombreExcel}: ${a.movimientos.length} movimientos (${a.totalPagado} pagado / ${a.totalPendiente} pendiente)`);
    }

    await conn.commit();
    console.log("\nTRANSACCIÓN APLICADA Y CONFIRMADA.");
    const rutaBackup = path.join(__dirname, `backup_historial_mensual_${Date.now()}.json`);
    fs.writeFileSync(
      rutaBackup,
      JSON.stringify(
        {
          fecha: new Date().toISOString(),
          alumnos: plan.alumnos.map((a) => ({ nombre: a.nombreExcel, id: a.match.id, movimientos: a.movimientos })),
          sinCuenta: plan.sinCuenta.map((a) => a.nombreExcel),
        },
        null,
        2
      )
    );
    console.log(`Respaldo: ${rutaBackup}`);
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
    console.log(btn("LECTURA DE EXCEL + BD"));
    const data = parsearArchivo(config.excelFile);
    const [usuarios] = await pool.query("SELECT u.* FROM usuarios u WHERE u.rol='alumno'");
    const [conceptos] = await pool.query("SELECT * FROM conceptos_pago");
    const catalogo = { usuarios, conceptos };
    const plan = await construirPlan(data, catalogo);
    imprimirResumen(plan);
    if (APPLY) {
      await aplicar(plan, catalogo);
    } else {
      console.log(btn("DRY-RUN COMPLETADO — NO SE ESCRIBIÓ NADA EN BD"));
      console.log("Para aplicar:  node importar-historial-mensual.js --apply");
    }
  } finally {
    await pool.end();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});