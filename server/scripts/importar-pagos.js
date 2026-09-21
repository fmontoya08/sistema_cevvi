#!/usr/bin/env node
/**
 * IMPORTAR PAGOS REALES (Excel) -> BD producción
 *
 * Uso:
 *   node importar-pagos.js            # dry-run (por defecto): NO escribe nada
 *   node importar-pagos.js --apply    # aplica los cambios en BD (transacción)
 *
 * Orden de operaciones (--apply), TODO en UNA transacción:
 *   1. Crear conceptos "Adeudo {año}" que falten.
 *   2. Crear grupos por pestaña (reusa el grupo de producción dominante si aplica).
 *   3. Crear alumnos faltantes (matrícula 2026NNNN, correo institucional placeholder,
 *      password = matrícula con bcrypt, SIN crear buzón cPanel).
 *   4. Vincular alumno -> grupo (grupo_alumnos + usuarios.grupo_id).
 *   5. Reemplazar adeudos: se BORRAN los adeudos existentes del alumno y se insertan
 *      los del Excel (1 fila por año, estatus pendiente).
 *   6. NO se toca a usuarios reales sin match en el Excel (solo se reportan).
 *   7. Borrar usuarios de prueba SOLO con --delete-test=ID,ID
 *
 * Salidas (dry-run y apply):
 *   - Consola: resumen + verificación vs Excel.
 *   - server/scripts/reporte_pendientes.xlsx (lista para invitar alumnos faltantes)
 *   - server/scripts/cambios_previstos.json
 */
const XLSX = require("xlsx");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const config = require("./import-config");
const { parsearArchivo, normalizar, levenshtein, tokens } = require("./import-parse");

const APPLY = process.argv.includes("--apply");
const DELETE_TEST = process.argv
  .find((a) => a.startsWith("--delete-test="))
  ?.split("=")[1]
  ?.split(",")
  .map((x) => Number(x.trim()))
  .filter(Boolean);

let pool = null;
async function sql(query, params) {
  const [rows] = await pool.query(query, params);
  return rows;
}

// ---------------------------------------------------------------- catálogos
async function cargarCatalogos() {
  const [usuarios] = await pool.query(
    "SELECT u.*, (SELECT g.nombre_grupo FROM grupos g WHERE g.id=u.grupo_id) AS nombre_grupo FROM usuarios u WHERE u.rol='alumno'"
  );
  const [adeudos] = await pool.query(
    "SELECT a.*, c.nombre_concepto FROM adeudos_alumnos a LEFT JOIN conceptos_pago c ON c.id=a.concepto_id"
  );
  const [conceptos] = await pool.query("SELECT * FROM conceptos_pago");
  const [grupos] = await pool.query("SELECT * FROM grupos");
  const [grupoAlumnos] = await pool.query("SELECT * FROM grupo_alumnos");
  const [carreras] = await pool.query("SELECT * FROM carreras");
  const [planes] = await pool.query("SELECT * FROM planes_estudio WHERE activo=1");
  const [sedes] = await pool.query("SELECT * FROM sedes WHERE activo=1");
  const [grados] = await pool.query("SELECT * FROM grados WHERE activo=1");
  const [ciclos] = await pool.query("SELECT * FROM ciclos WHERE activo=1");
  return { usuarios, adeudos, conceptos, grupos, grupoAlumnos, carreras, planes, sedes, grados, ciclos };
}

function btn(texto) {
  return `\n${"─".repeat(80)}\n${texto}\n${"─".repeat(80)}\n`;
}

// ---------------------------------------------------------------- matching difuso
function claveProd(u) {
  return normalizar(`${u.nombre} ${u.apellido_paterno} ${u.apellido_materno || ""}`);
}

// puntaje difuso multiset: 1 por token exacto, 0.5 por token con distancia<=2
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

// devuelve mejor candidato de producción (id) para un alumno de excel, o null
function mejorCandidato(al, alumnosProd) {
  let mejor = null;
  let mejorScore = null;
  for (const u of alumnosProd) {
    const s = puntajeFuzzy(claveProd(u), `${al.dividido.ap} ${al.dividido.am || ""} ${al.dividido.nombre}`);
    if (s.cobertura < UMBRAL_COBERTURA || s.exact < UMBRAL_EXACTOS) continue;
    if (!mejorScore || s.cobertura > mejorScore.cobertura) {
      mejor = u;
      mejorScore = s;
    }
  }
  if (mejor && mejorScore) {
    // descarta si otro candidato tiene el mismo score (ambigüedad) -> no forzar
    let empates = 0;
    for (const u of alumnosProd) {
      if (u.id === mejor.id) continue;
      const s = puntajeFuzzy(claveProd(u), `${al.dividido.ap} ${al.dividido.am || ""} ${al.dividido.nombre}`);
      if (s.cobertura === mejorScore.cobertura && s.exact === mejorScore.exact) empates++;
    }
    if (empates > 0) return null;
  }
  return mejor;
}

// ---------------------------------------------------------------- plan
function construirPlan(data, catalogo) {
  const plan = { sheets: [], conceptosNuevos: [], noEnExcel: [], omitidos: [], noCoincidenTotales: 0, nuevasMatriculas: [] };
  const mapaGrupos = new Map(catalogo.grupos.map((g) => [normalizar(g.nombre_grupo), g]));
  const carrerasIds = new Map(catalogo.carreras.map((c) => [c.nombre_carrera, c.id]));

  // id para conceptos/grupos nuevos y matrículas siguientes
  let nextConceptoId = Math.max(...catalogo.conceptos.map((c) => c.id), 0) + 1;
  let nextGrupoId = Math.max(...catalogo.grupos.map((g) => g.id), 0) + 1;
  let maxMatricula = Math.max(
    ...catalogo.usuarios
      .map((u) => u.matricula || "")
      .filter((m) => /^\d{8}$/.test(m))
      .map((m) => Number(m)),
    20260000
  );
  const conceptoIds = new Map(catalogo.conceptos.map((c) => [c.nombre_concepto, c.id]));

  const alumnosProd = catalogo.usuarios;
  const usado = new Set(); // claves de nombre ya cargadas (dedup entre pestañas)

  for (const cfg of config.sheets) {
    const hoja = data.hojas[cfg.sheet];
    if (!hoja || hoja.error) {
      plan.sheets.push({ cfg, error: hoja?.error || "sin datos", estudiantes: [] });
      continue;
    }
    const alumnosExcel = hoja.alumnos;
    if (!alumnosExcel.length) continue;

    // ----- grupo objetivo -----
    let grupo = null;
    const yaVirtual = /virtual/i.test(cfg.nombreGrupo);
    const nombreGrupo = cfg.modalidad === "virtual" && !yaVirtual ? `${cfg.nombreGrupo} Virtual` : cfg.nombreGrupo;
    const grupoExistente = cfg.grupoExistente || (cfg.modalidad === "virtual" ? cfg.nombreGrupo : cfg.nombreGrupo);
    if (grupoExistente) {
      const existente = mapaGrupos.get(normalizar(grupoExistente));
      if (existente) grupo = { accion: "reusar", id: existente.id, nombre: existente.nombre_grupo };
    }
    if (!grupo) {
      const existente = mapaGrupos.get(normalizar(nombreGrupo));
      grupo = existente
        ? { accion: "reusar", id: existente.id, nombre: nombreGrupo }
        : { accion: "crear", id: nextGrupoId++, nombre: nombreGrupo };
    }

    // ----- estudiantes -----
    const estudiantes = [];
    let saldoHoja = 0;
    for (const al of alumnosExcel) {
      if (al.seccion && al.seccion.startsWith("baja")) {
        plan.omitidos.push({
          nombre: al.nombre,
          hoja: cfg.sheet,
          seccion: al.seccion,
          porAnio: al.porAnio,
        });
        continue;
      }
      const clave = al.claveNorm;
      if (usado.has(clave)) continue; // ya apareció en otra pestaña
      usado.add(clave);

      const cand = mejorCandidato(al, alumnosProd) || null;
      const montoPorAnio = al.porAnio || {};
      const importe = Object.values(montoPorAnio).reduce((a, b) => a + b, 0) || 0;
      saldoHoja += importe;
      if (al.totalesCoinciden === false) plan.noCoincidenTotales++;

      let nuevaMatricula = null;
      let emailInstitucional = null;
      if (!cand) {
        maxMatricula++;
        nuevaMatricula = String(maxMatricula);
        emailInstitucional = `${nuevaMatricula}@${config.dominio}`;
        plan.nuevasMatriculas.push(nuevaMatricula);
      }

      const adeudos = [];
      for (const [anio, monto] of Object.entries(montoPorAnio)) {
        if (!monto || monto <= 0) continue;
        const nombreC = `Adeudo ${anio}`;
        if (!conceptoIds.has(nombreC)) {
          conceptoIds.set(nombreC, nextConceptoId++);
          plan.conceptosNuevos.push(nombreC);
        }
        adeudos.push({ anio: Number(anio), monto, concepto: nombreC });
      }

      estudiantes.push({
        filaExcel: al.fila,
        nombreExcel: al.nombre,
        dividido: al.dividido,
        match: cand
          ? {
              id: cand.id,
              nombreCompletoProd: `${cand.apellido_paterno} ${cand.apellido_materno || ""} ${cand.nombre}`.trim(),
              email: cand.email,
              matricula: cand.matricula,
            }
          : null,
        nuevaMatricula,
        emailInstitucional,
        porAnio: montoPorAnio,
        adeudos,
        saldo: Math.round(importe * 100) / 100,
        obs: al.obs,
      });
    }

    plan.sheets.push({
      cfg,
      grupo,
      estudiantes,
      totalAlumnos: estudiantes.length,
      saldoHoja,
      excelSaldoHoja: hoja.totalAdeudoHoja,
      excelSaldoDepurado: hoja.totalDepurado,
      coincidenciaSaldo: saldoHoja === Math.round(hoja.totalDepurado * 100) / 100,
    });
  }

  // ----- alumnos de producción que NO están en las pestañas cargadas -----
  const idsEnExcel = new Set();
  for (const sh of plan.sheets) {
    for (const s of sh.estudiantes) if (s.match?.id) idsEnExcel.add(s.match.id);
  }
  for (const u of catalogo.usuarios) {
    if (!idsEnExcel.has(u.id)) {
      plan.noEnExcel.push({
        id: u.id,
        nombre: `${u.apellido_paterno} ${u.apellido_materno || ""} ${u.nombre}`.trim(),
        email: u.email,
        matricula: u.matricula,
        grupo: u.nombre_grupo || null,
        adeudos: catalogo.adeudos.filter((a) => a.alumno_id === u.id).length,
      });
    }
  }

  return plan;
}

// ---------------------------------------------------------------- reportes
function escribirReporteXlsx(plan, ruta) {
  const wb = XLSX.utils.book_new();
  const pendientes = [];
  const resumen = [];
  for (const sh of plan.sheets) {
    for (const s of sh.estudiantes || []) {
      const pend = {
        Pestaña: sh.cfg.sheet,
        Grupo: sh.grupo.nombre,
        "Nombre (Excel)": s.nombreExcel,
        "Apellido Paterno": s.dividido.ap,
        "Apellido Materno": s.dividido.am || "",
        "Nombre(s)": s.dividido.nombre,
        Estatus: s.match ? "YA REGISTRADO" : "PENDIENTE DE REGISTRO",
        Matricula: s.match?.matricula || s.nuevaMatricula,
        "Correo institucional": s.match?.email || s.emailInstitucional,
        "Correo personal": s.match?.email || "",
        "Adeudo 2025": s.porAnio[2025] ?? "",
        "Adeudo 2026": s.porAnio[2026] ?? "",
        "Adeudo 2027": s.porAnio[2027] ?? "",
        "Adeudo 2028": s.porAnio[2028] ?? "",
        "Saldo total": s.saldo,
        Observaciones: s.obs,
      };
      pendientes.push(pend);
      resumen.push({
        Pestaña: sh.cfg.sheet,
        Grupo: sh.grupo.nombre,
        AcciónGrupo: sh.grupo.accion.toUpperCase(),
        Alumnos: sh.totalAlumnos,
        "Ya registrados": sh.estudiantes.filter((x) => x.match).length,
        "Por invitar": sh.estudiantes.filter((x) => !x.match).length,
        "Saldo según hoja (depurado)": sh.excelSaldoDepurado,
        "Saldo plan": sh.saldoHoja,
        Coincide: sh.coincidenciaSaldo ? "SÍ" : "NO",
      });
    }
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pendientes), "PENDIENTES");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumen), "RESUMEN");
  if (plan.omitidos.length) {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        plan.omitidos.map((o) => ({
          Nombre: o.nombre,
          Hoja: o.hoja,
          Seccion: o.seccion,
          "Adeudo 2025": o.porAnio[2025] ?? "",
          "Adeudo 2026": o.porAnio[2026] ?? "",
          "Adeudo 2027": o.porAnio[2027] ?? "",
          "Adeudo 2028": o.porAnio[2028] ?? "",
        }))
      ),
      "OMITIDOS"
    );
  }
  if (plan.noEnExcel.length) {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        plan.noEnExcel.map((u) => ({
          ID: u.id,
          Nombre: u.nombre,
          Email: u.email,
          Matricula: u.matricula,
          Grupo: u.grupo || "",
          Adeudos: u.adeudos,
        }))
      ),
      "NO_EN_EXCEL"
    );
  }
  XLSX.writeFile(wb, ruta);
}

function imprimirResumen(plan) {
  let creados = 0;
  let existentes = 0;
  let adeudosNuevos = 0;
  for (const sh of plan.sheets) {
    for (const s of sh.estudiantes || []) {
      if (s.match) existentes++;
      else creados++;
      adeudosNuevos += s.adeudos.length;
    }
  }
  console.log(btn(`${APPLY ? "EJECUTANDO (--apply)" : "INFORME (dry-run, nada se escribe)"}`));
  console.log(`Pestañas cargadas       : ${plan.sheets.length}`);
  console.log(`Alumnos en Excel        : ${existentes + creados} (${existentes} ya registrados, ${creados} nuevos a crear)`);
  console.log(`Matrículas nuevas       : ${plan.nuevasMatriculas.length} (desde ${plan.nuevasMatriculas[0] || "n/a"})`);
  console.log(`Adeudos a insertar      : ${adeudosNuevos}`);
  console.log(`Conceptos a crear       : [${plan.conceptosNuevos.join(", ")}]`);
  console.log(`Conteo no coincide Total: ${plan.noCoincidenTotales} filas`);
  console.log(`Alumnos omitidos (BAJA/FUSIONADOS o duplicados): ${plan.omitidos.length}`);

  console.log(btn("DETALLE POR PESTAÑA"));
  for (const sh of plan.sheets) {
    const nuevo = (sh.estudiantes || []).filter((s) => !s.match).length;
    const ok = sh.coincidenciaSaldo ? "OK" : `✘ (excel=${sh.excelSaldoHoja})`;
    console.log(
      `${sh.cfg.sheet.padEnd(12)} alumnos=${String(sh.totalAlumnos).padEnd(3)} nuevos=${nuevo} saldo=${sh.saldoHoja} ${ok}  grupo: ${sh.grupo.accion} ${sh.grupo.nombre}`
    );
    for (const s of sh.estudiantes || []) {
      const det = s.adeudos.map((a) => `${a.anio}=$${a.monto}`).join(", ") || "sin adeudo";
      const sta = s.match ? `YA REGISTRADO (${s.match.matricula})` : `NUEVO (mat ${s.nuevaMatricula})`;
      console.log(`   ${s.nombreExcel.padEnd(50)} ${sta.padEnd(28)} [Adeudos: ${det}]${s.obs ? "  obs:" + s.obs.slice(0, 30) : ""}`);
    }
  }

  console.log(btn("REVISIÓN FINAL vs EXCEL"));
  let okTotal = true;
  for (const sh of plan.sheets) {
    if (!sh.coincidenciaSaldo) okTotal = false;
    console.log(
      `${sh.cfg.sheet.padEnd(12)} excelDepurado=${sh.excelSaldoDepurado}${sh.excelSaldoHoja !== sh.excelSaldoDepurado ? ` (bruto ojo${sh.excelSaldoHoja})` : ""}  plan=${sh.saldoHoja}  ${sh.coincidenciaSaldo ? "OK" : "NO COINCIDE"}`
    );
  }
  console.log(okTotal ? "\nSaldo por hoja: TODO COINCIDE" : "\n⚠ Revisar columnas TOTALES vs suma de años");

  console.log(btn("ALUMNOS DE PRODUCCIÓN SIN MATCH (NO SE TOCAN)"));
  for (const u of plan.noEnExcel) {
    console.log(`   ${u.nombre.padEnd(50)} mat=${u.matricula || "-"} grupo=${u.grupo || "sin grupo"} adeudos=${u.adeudos}   (${u.id})`);
  }
}

// ---------------------------------------------------------------- apply
async function aplicar(plan, catalogo) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1) conceptos
    const conceptoIds = new Map(catalogo.conceptos.map((c) => [c.nombre_concepto, c.id]));
    let nextConceptoId = Math.max(...catalogo.conceptos.map((c) => c.id), 0) + 1;
    for (const nombre of plan.conceptosNuevos) {
      const id = nextConceptoId++;
      conceptoIds.set(nombre, id);
      await conn.query(
        "INSERT INTO conceptos_pago (id,nombre_concepto,monto_default,tipo,es_concepto_inscripcion,activo,monto) VALUES (?,?,0.00,'UNICO',0,1,0.00)",
        [id, nombre]
      );
      console.log(` + concepto ${id}: ${nombre}`);
    }

    // 2) grupos
    const carrerasIds = new Map(catalogo.carreras.map((c) => [c.nombre_carrera, c.id]));
    const planesDeLic = new Map();
    for (const p of catalogo.planes) {
      if (p.carrera_id != null && /licenciatura/i.test(p.nombre_plan || p.nombre || "") && !planesDeLic.has(p.carrera_id))
        planesDeLic.set(p.carrera_id, p);
    }
    const mapGrado = new Map(catalogo.grados.map((g) => [normalizar(g.nombre_grado), g.id]));
    const [maxG] = await conn.query("SELECT MAX(id) m FROM grupos");
    let nextGrupoId = maxG[0].m + 1;
    for (const sh of plan.sheets) {
      if (sh.grupo.accion === "crear") {
        sh.grupo.id = nextGrupoId++;
        const planEst = planesDeLic.get(carrerasIds.get(sh.cfg.carrera));
        await conn.query(
          "INSERT INTO grupos (id,nombre_grupo,cupo,ciclo_id,sede_id,plan_estudio_id,grado_id,estatus,modalidad,activo) VALUES (?,?,40,?,?,?,?,'activo',?,1)",
          [
            sh.grupo.id,
            sh.grupo.nombre,
            catalogo.ciclos[0].id,
            catalogo.sedes[0].id,
            planEst.id,
            mapGrado.get(normalizar(sh.cfg.grado)) || 1,
            sh.cfg.modalidad,
          ]
        );
        console.log(` + grupo ${sh.grupo.id}: ${sh.grupo.nombre} (${sh.cfg.grado}, ${sh.cfg.modalidad})`);
      }
    }

    // 3) alumnos
    const [maxU] = await conn.query("SELECT MAX(id) m FROM usuarios");
    let uid = maxU[0].m;
    const [maxGA] = await conn.query("SELECT MAX(id) m FROM grupo_alumnos");
    let gaid = maxGA[0].m;
    const [maxA] = await conn.query("SELECT MAX(id) m FROM adeudos_alumnos");
    let aid = maxA[0].m;
    let maxMatricula = Math.max(
      ...catalogo.usuarios.map((u) => u.matricula || "").filter((m) => /^\d{8}$/.test(m)).map((m) => Number(m)),
      20260000
    );
    const BCRYPT_CACHE = new Map();
    const bcryptDeMatricula = async (m) => {
      if (!BCRYPT_CACHE.has(m)) BCRYPT_CACHE.set(m, await bcrypt.hash(m, 10));
      return BCRYPT_CACHE.get(m);
    };

    for (const sh of plan.sheets) {
      for (const s of sh.estudiantes || []) {
        let alumnoId;
        if (s.match) {
          alumnoId = s.match.id;
          const [del] = await conn.query("SELECT id FROM adeudos_alumnos WHERE alumno_id=?", [alumnoId]);
          for (const d of del) {
            await conn.query("DELETE FROM adeudos_alumnos WHERE id=?", [d.id]);
          }
          if (del.length) console.log(` X reemplazo de adeudos de ${s.nombreExcel} (${del.length} eliminados)`);
        } else {
          maxMatricula++;
          const mat = String(maxMatricula);
          const email = `${mat}@${config.dominio}`;
          uid += 10;
          const pass = await bcryptDeMatricula(mat);
          const carreraId = carrerasIds.get(sh.cfg.carrera);
          await conn.query(
            `INSERT INTO usuarios (id,email,password,rol,nombre,apellido_paterno,apellido_materno,matricula,carrera_id,sede_id,grupo_id,activo,estado_academico,modalidad,sede_interes_id,carrera_interes_id)
             VALUES (?,?,?,'alumno',?,?,?,?,?,?,?,1,'activo',?,?,?)`,
            [uid, email, pass, s.dividido.nombre, s.dividido.ap, s.dividido.am, mat, carreraId, catalogo.sedes[0].id, sh.grupo.id, sh.cfg.modalidad, catalogo.sedes[0].id, carreraId]
          );
          alumnoId = uid;
          console.log(` + alumno ${uid}: ${s.dividido.ap} ${s.dividido.am || ""} ${s.dividido.nombre}  mat ${mat}  ${email}`);
        }

        // 4) vínculo grupo
        const [ya] = await conn.query("SELECT id FROM grupo_alumnos WHERE grupo_id=? AND alumno_id=?", [sh.grupo.id, alumnoId]);
        if (!ya.length) {
          gaid += 10;
          await conn.query("INSERT INTO grupo_alumnos (id,grupo_id,alumno_id) VALUES (?,?,?)", [gaid, sh.grupo.id, alumnoId]);
        }
        await conn.query("UPDATE usuarios SET grupo_id=?, carrera_id=?, sede_id=? WHERE id=?", [
          sh.grupo.id,
          carrerasIds.get(sh.cfg.carrera),
          catalogo.sedes[0].id,
          alumnoId,
        ]);

        // 5) adeudos del Excel
        for (const a of s.adeudos) {
          aid += 10;
          await conn.query(
            "INSERT INTO adeudos_alumnos (id,alumno_id,concepto_id,monto_a_pagar,estatus_pago,fecha_vencimiento,registrado_por_usuario_id) VALUES (?,?,?,?,'pendiente',?,?)",
            [aid, alumnoId, conceptoIds.get(a.concepto), a.monto, config.fechaVencimientoPorYear[a.anio] || `${a.anio}-12-31`, config.adminUserId]
          );
        }
      }
    }

    // 6) borrado explícito de usuarios de prueba
    if (DELETE_TEST && DELETE_TEST.length) {
      for (const id of DELETE_TEST) {
        await conn.query("DELETE FROM adeudos_alumnos WHERE alumno_id=?", [id]);
        await conn.query("DELETE FROM grupo_alumnos WHERE alumno_id=?", [id]);
        await conn.query("DELETE FROM usuarios WHERE id=?", [id]);
        console.log(` x borrado usuario de prueba ${id}`);
      }
    }

    await conn.commit();
    console.log("\nTRANSACCIÓN APLICADA Y CONFIRMADA.");
    const rutaBackup = path.join(__dirname, `backup_import_${Date.now()}.json`);
    fs.writeFileSync(
      rutaBackup,
      JSON.stringify(
        {
          fecha: new Date().toISOString(),
          usuariosAfectados: plan.sheets.flatMap((sh) => sh.estudiantes.map((s) => s.nombreExcel)),
          notas: "Respaldo ligero; ver snapshot.json para datos completos previos.",
        },
        null,
        2
      )
    );
    console.log(`Nota de respaldo en ${rutaBackup}`);
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
    const catalogo = await cargarCatalogos();
    const plan = construirPlan(data, catalogo);

    imprimirResumen(plan);

    const rutaXlsx = path.join(__dirname, "reporte_pendientes.xlsx");
    escribirReporteXlsx(plan, rutaXlsx);
    console.log(`\nReporte Excel: ${rutaXlsx}`);

    const rutaJson = path.join(__dirname, "cambios_previstos.json");
    fs.writeFileSync(rutaJson, JSON.stringify(plan, null, 2));
    console.log(`Cambios previstos (JSON): ${rutaJson}`);

    if (APPLY) {
      if (DELETE_TEST?.length) console.log(`Borrar usuarios de prueba: ${DELETE_TEST.join(", ")}`);
      await aplicar(plan, catalogo);
    } else {
      console.log(btn("DRY-RUN COMPLETADO — NO SE ESCRIBIÓ NADA EN BD"));
      console.log("Para aplicar:  node importar-pagos.js --apply");
      console.log("Para además borrar usuarios de prueba:  node importar-pagos.js --apply --delete-test=34,99");
    }
  } finally {
    await pool.end();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});