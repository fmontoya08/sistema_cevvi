const XLSX = require("xlsx");

// ---------- normalización de nombres ----------
function normalizar(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// clave multiset ordenada para comparar "APELLIDOS NOMBRE" vs "NOMBRE APELLIDOS"
function claveMultiset(texto) {
  const tokens = normalizar(texto).split(" ").filter(Boolean);
  return tokens.sort().join(" ");
}

function parseNumero(valor) {
  if (valor === null || valor === undefined) return null;
  if (typeof valor === "number") return isFinite(valor) ? valor : null;
  const s = String(valor).trim();
  if (!s) return null;
  const limpio = s.replace(/[^\d.\-]/g, "");
  if (!limpio || /^[.\-]+$/.test(limpio)) return null;
  const n = Number(limpio);
  return isFinite(n) ? n : null;
}

// separa "APELLIDO PATERNO APELLIDO MATERNO NOMBRE..." en (ap, am, nombre)
// heurístico: primer token = ap, segundo = am, resto = nombre(s)
function dividirNombre(texto) {
  const tokens = normalizar(texto).split(" ").filter(Boolean);
  if (tokens.length === 1) return { ap: tokens[0], am: null, nombre: tokens[0] };
  if (tokens.length === 2) return { ap: tokens[0], am: null, nombre: tokens[1] };
  if (tokens.length === 3) return { ap: tokens[0], am: tokens[1], nombre: tokens[2] };
  return {
    ap: tokens[0],
    am: tokens[1],
    nombre: tokens.slice(2).join(" "),
  };
}

const HEADER_NAME_REGEX = /NOMBRE\s+DEL\s+ALUMNO/i;
const YEAR_REGEX = /^20\d\d$/;

// ---------- parseo de una hoja ----------
function parsearHoja(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return { hoja: sheetName, error: "hoja inexistente" };
  if (!sheet["!ref"]) return { hoja: sheetName, error: "hoja vacía", alumnos: [] };

  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
    raw: true,
  });

  // 1) fila del encabezado
  let hRow = -1;
  for (let i = 0; i < Math.min(rows.length, 12); i++) {
    const r = rows[i] || [];
    if (r.some((c) => c && HEADER_NAME_REGEX.test(String(c)))) {
      const idx = r.findIndex((c) => c && HEADER_NAME_REGEX.test(String(c)));
      const obs =
        r.findIndex((c) => c && /OBSERVACION/i.test(String(c))) > -1
          ? r.findIndex((c) => c && /OBSERVACION/i.test(String(c)))
          : null;
      hRow = i;
      // config
      let header = { nameCol: idx, obsCol: obs };
      return parsearFilas(rows, header, hRow, sheetName);
    }
  }
  return { hoja: sheetName, error: "no se encontró encabezado NOMBRE DEL ALUMNO", rows: rows.length };
}

function isSeccionEspecial(nombreTexto) {
  if (!nombreTexto) return false;
  const directo = ["BAJA", "BAJAS", "FUSIONADOS MAYO 2026B", "FUSIONADOS"];
  if (directo.some((d) => normalizar(d) === normalizar(nombreTexto))) return true;
  return /FUSIONADOS/i.test(nombreTexto) && normalizar(nombreTexto).split(" ").length <= 3;
}

function parsearFilas(rows, header, hRow, sheetName) {
  const nameCol = header.nameCol;
  const obsCol = header.obsCol;
  const headerRow = rows[hRow] || [];

  // 2) columnas: pagos (mensuales/inscripciones), años de ADEUDO, totales
  const yearCols = new Map(); // year -> colIdx
  const payCols = []; // {col, nombre}
  let totalCol = -1;
  let titulCol = -1;

  for (let c = nameCol + 1; c < headerRow.length; c++) {
    const h = String(headerRow[c] || "").trim();
    if (YEAR_REGEX.test(h)) {
      yearCols.set(Number(h), c);
    } else if (/^TOTAL/i.test(h)) {
      totalCol = c;
    } else if (/^TITULA/i.test(h)) {
      titulCol = c;
    } else if (h && h !== "Fotografía") {
      const num = parseNumero(h);
      if (num === null || (num > 50000 && num < 50000)) payCols.push({ col: c, nombre: h });
      else if (num !== null) payCols.push({ col: c, nombre: `${h} (serial ${num})` });
      else payCols.push({ col: c, nombre: h });
    }
  }

  const alumnos = [];
  let seccion = "";
  for (let i = hRow + 1; i < rows.length; i++) {
    const r = rows[i] || [];
    const rawName = r[nameCol];
    const nombreTexto = String(rawName || "").trim();
    if (!nombreTexto || !/[A-Za-zÁÉÍÓÚÑ]/.test(nombreTexto)) continue;
    if (/NOMBRE\s+DEL\s+ALUMNO/i.test(nombreTexto)) continue; // sub-encabezado repetido

    if (isSeccionEspecial(nombreTexto)) {
      seccion = normalizar(nombreTexto);
      continue; // no es un alumno
    }
    const esBaja =
      seccion === "BAJA" ||
      seccion === "BAJAS" ||
      seccion === "FUSIONADOS" ||
      seccion === "FUSIONADOS MAYO 2026B" ||
      /^\s*(BAJA|BAJAS)\b/i.test(nombreTexto);

    const pagosPorCol = [];
    for (const p of payCols) {
      const v = r[p.col];
      if (v === null || v === undefined || String(v).trim() === "") continue;
      pagosPorCol.push({ concepto: p.nombre, col: p.col, monto: parseNumero(v), raw: v });
    }

    const porAnio = {};
    for (const [anio, col] of yearCols.entries()) {
      const n = parseNumero(r[col]);
      if (n !== null && n < 0) porAnio[anio] = Math.round(Math.abs(n) * 100) / 100;
      else if (n !== null) porAnio[anio] = 0;
    }

    const totalRaw = parseNumero(r[totalCol]);
    const sumaPorAnios = Object.values(porAnio).reduce((a, b) => a + b, 0);
    let sinTotales = true; // nada que revisar
    if (totalRaw !== null) {
      sinTotales = false;
    }

    alumnos.push({
      fila: i + 1,
      seccion: esBaja ? "baja" : seccion || "activo",
      no: parseNumero(r[0]),
      nombre: nombreTexto,
      nombreNorm: normalizar(nombreTexto),
      claveNorm: claveMultiset(nombreTexto),
      dividido: dividirNombre(nombreTexto),
      porAnio,
      sumaPorAnios,
      totales: totalRaw,
      totalesCoinciden: sinTotales ? null : Math.abs(Math.abs(totalRaw) - sumaPorAnios) < 0.01,
      pagosMensuales: pagosPorCol,
      obs: obsCol !== null ? String(r[obsCol] || "").trim() : "",
    });
  }

  const totalAdeudoHoja = alumnos.reduce((a, al) => a + (al.sumaPorAnios || 0), 0);
  const totalDepurado = alumnos
    .filter((al) => !(al.seccion || "").startsWith("baja"))
    .reduce((a, al) => a + (al.sumaPorAnios || 0), 0);

  return {
    hoja: sheetName,
    hRow,
    nameCol,
    obsCol,
    yearCols: Object.fromEntries([...yearCols.entries()]),
    totalCol: totalCol > -1 ? totalCol : null,
    alumnos,
    totalAdeudoHoja: Math.round(totalAdeudoHoja * 100) / 100,
    totalDepurado: Math.round(totalDepurado * 100) / 100,
  };
}

function parsearArchivo(file) {
  const workbook = XLSX.readFile(file);
  const hojas = {};
  for (const s of workbook.SheetNames) {
    hojas[s] = parsearHoja(workbook, s);
  }
  return { workbook, hojas };
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[m][n];
}

function tokens(texto) {
  return normalizar(texto).split(" ").filter(Boolean);
}

module.exports = { parsearArchivo, normalizar, claveMultiset, dividirNombre, parseNumero, levenshtein, tokens };