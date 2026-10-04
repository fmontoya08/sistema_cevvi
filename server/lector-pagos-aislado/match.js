// Módulo AISLADO: match Excel <-> BD (solo lectura, puros SELECT).
// Semáforo por alumno:
//   verde    = existe en BD y está en SU grupo (pestaña mapeada)
//   amarillo = existe en BD pero en OTRO grupo, o match ambiguo
//   rojo     = no existe en BD (es quien falta)
// Pestañas sin grupo en BD (PSIC-1/2, PSCI-3, FORMATO): verde = existe en BD.
const { normalizar, tokens, levenshtein } = require("../scripts/import-parse");
const { listaAlumnos, obsDeHoja, ARCHIVO_DEFAULT } = require("./grupos");
const { createPool } = require("../scripts/db");

// Pestaña Excel -> nombre_grupo en BD (idénticos: grupos renombrados a la pestaña)
const MAPEO_GRUPO = {
  "PSIC-4": "PSIC-4",
  "PEDA-4": "PEDA-4",
  "PSICO-5": "PSICO-5",
  "PSICO VIR-6": "PSICO VIR-6",
  "PEDA VIR-6": "PEDA VIR-6",
  "PEDA-5": "PEDA-5",
  "PEDA-6": "PEDA-6",
  "PSIC-1": "PSIC-1",
  "PSIC-2": "PSIC-2",
  "PSCI-3": "PSCI-3",
};

const UMBRAL_COBERTURA = 0.6;
const UMBRAL_EXACTOS = 2;

let _pool = null;
async function pool() {
  if (!_pool) _pool = await createPool();
  return _pool;
}

function claveProd(u) {
  return normalizar(`${u.nombre} ${u.apellido_paterno} ${u.apellido_materno || ""}`);
}

function puntaje(a, b) {
  const ta = tokens(a);
  const tb = tokens(b);
  const base = Math.max(ta.length, tb.length);
  if (!base) return { cobertura: 0, exact: 0 };
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

function pasaUmbral(s) {
  return s.cobertura >= UMBRAL_COBERTURA && s.exact >= UMBRAL_EXACTOS;
}

// Mejor candidato dentro de una lista; null si no pasa umbral o hay empate
function mejorEn(nombreNorm, candidatos) {
  let mejor = null;
  let mejorScore = null;
  for (const u of candidatos) {
    const s = puntaje(u.clave, nombreNorm);
    if (!pasaUmbral(s)) continue;
    if (!mejorScore || s.cobertura > mejorScore.cobertura || (s.cobertura === mejorScore.cobertura && s.exact > mejorScore.exact)) {
      mejor = u;
      mejorScore = s;
    }
  }
  if (!mejor) return null;
  for (const u of candidatos) {
    if (u.id === mejor.id) continue;
    const s = puntaje(u.clave, nombreNorm);
    if (s.cobertura === mejorScore.cobertura && s.exact === mejorScore.exact) {
      return { ambiguo: true, score: mejorScore };
    }
  }
  return { alumno: mejor, score: mejorScore };
}

async function cargarAlumnos() {
  const p = await pool();
  const [rows] = await p.query(
    `SELECT u.id, u.nombre, u.apellido_paterno, u.apellido_materno, u.matricula, g.nombre_grupo
     FROM usuarios u LEFT JOIN grupos g ON g.id = u.grupo_id
     WHERE u.rol = 'alumno' AND u.activo = 1`
  );
  const [ga] = await p.query(
    `SELECT ga.alumno_id, g.nombre_grupo FROM grupo_alumnos ga JOIN grupos g ON g.id = ga.grupo_id`
  );
  const extra = new Map(); // alumno_id -> Set(nombre_grupo)
  for (const r of ga) {
    if (!extra.has(r.alumno_id)) extra.set(r.alumno_id, new Set());
    extra.get(r.alumno_id).add(r.nombre_grupo);
  }
  return rows.map((u) => {
    const grupos = new Set();
    if (u.nombre_grupo) grupos.add(u.nombre_grupo);
    if (extra.has(u.id)) for (const g of extra.get(u.id)) grupos.add(g);
    return {
      id: u.id,
      nombreBD: `${u.apellido_paterno} ${u.apellido_materno || ""} ${u.nombre}`.replace(/\s+/g, " ").trim(),
      matricula: u.matricula || "-",
      grupos: [...grupos],
      clave: claveProd(u),
    };
  });
}

async function matchHoja(sheet) {
  const grupoBD = MAPEO_GRUPO[sheet] || null;
  const nombres = listaAlumnos(ARCHIVO_DEFAULT, sheet);
  const alumnos = await cargarAlumnos();
  const enGrupo = grupoBD ? alumnos.filter((u) => u.grupos.includes(grupoBD)) : [];

  const filas = [];
  let verdes = 0;
  let amarillos = 0;
  let rojos = 0;

  for (const { nombre, fila } of nombres) {
    const norm = normalizar(nombre);
    const obs = obsDeHoja(sheet, fila);
    let f = { nombreExcel: nombre, estado: "rojo", nombreBD: "-", matricula: "-", grupoBD: "-", cobertura: 0, exact: 0, obs };

    if (grupoBD) {
      const m = mejorEn(norm, enGrupo);
      if (m && m.alumno) {
        f = { ...f, estado: "verde", nombreBD: m.alumno.nombreBD, matricula: m.alumno.matricula, grupoBD: grupoBD, cobertura: +m.score.cobertura.toFixed(2), exact: m.score.exact };
        verdes++;
      } else if (m && m.ambiguo) {
        f = { ...f, estado: "amarillo", nombreBD: "AMBIGUO (varios coinciden)", cobertura: +m.score.cobertura.toFixed(2), exact: m.score.exact };
        amarillos++;
      } else {
        const g = mejorEn(norm, alumnos);
        if (g && g.alumno) {
          f = { ...f, estado: "amarillo", nombreBD: g.alumno.nombreBD, matricula: g.alumno.matricula, grupoBD: g.alumno.grupos.join(", ") || "-", cobertura: +g.score.cobertura.toFixed(2), exact: g.score.exact };
          amarillos++;
        } else {
          rojos++;
        }
      }
    } else {
      // Sin grupo mapeado: verde = existe en BD
      const g = mejorEn(norm, alumnos);
      if (g && g.alumno) {
        f = { ...f, estado: "verde", nombreBD: g.alumno.nombreBD, matricula: g.alumno.matricula, grupoBD: g.alumno.grupos.join(", ") || "-", cobertura: +g.score.cobertura.toFixed(2), exact: g.score.exact };
        verdes++;
      } else {
        rojos++;
      }
    }
    filas.push(f);
  }

  return {
    pestana: sheet,
    grupoBD,
    total: filas.length,
    verdes,
    amarillos,
    rojos,
    alumnos: filas,
  };
}

module.exports = { matchHoja, MAPEO_GRUPO };
