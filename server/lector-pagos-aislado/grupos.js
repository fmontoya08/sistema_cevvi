// Módulo AISLADO: identifica las pestañas (grupos) del Excel, solo lectura.
// No toca BD ni sistema. Lee el archivo local tal cual.
const path = require("path");
const XLSX = require("xlsx");

const ARCHIVO_DEFAULT = path.join(
  __dirname,
  "..",
  "..",
  "PAGOS PSICOLOGIA Y PEDAGOGIA SIGLO XXI, Actualizado al 1-jul-26.xlsx"
);

function listarGrupos(archivo = ARCHIVO_DEFAULT) {
  const wb = XLSX.readFile(archivo);
  return wb.SheetNames.map((sheet) => identificarHoja(wb, sheet));
}

function identificarHoja(wb, sheet) {
  const ws = wb.Sheets[sheet];
  const ref = ws["!ref"] || "";
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

  // Nombre del grupo: primeras 2 filas concatenadas (F1/F2 traen GRUPO: + nombre)
  const f1 = (rows[0] || []).map((c) => String(c || "").trim()).filter(Boolean).join(" | ");
  const f2 = (rows[1] || []).map((c) => String(c || "").trim()).filter(Boolean).join(" | ");
  const nombreGrupo = [f1, f2].filter(Boolean).join("  //  ").slice(0, 300);

  // Fila encabezado: la que contiene NOMBRE DEL ALUMNO (buscar en primeras 12)
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

  // Contar alumnos: desde hRow+1, columna nameCol con texto, saltando
  // sub-encabezados y secciones BAJA/FUSIONADOS
  const alumnos = listarNombres(rows, hRow, nameCol);
  const totalAlumnos = alumnos.length;
  const primerAlumno = totalAlumnos ? `${alumnos[0].nombre} (fila ${alumnos[0].fila})` : "";
  const ultimoAlumno = totalAlumnos ? `${alumnos[totalAlumnos - 1].nombre} (fila ${alumnos[totalAlumnos - 1].fila})` : "";

  const letraCol = nameCol > -1 ? String.fromCharCode(65 + nameCol) : "-";
  return {
    pestana: sheet,
    nombreGrupo,
    filaEncabezado: hRow > -1 ? hRow + 1 : null,
    colNombre: letraCol,
    totalAlumnos,
    ref,
    primerAlumno,
    ultimoAlumno,
  };
}

function listarNombres(rows, hRow, nameCol) {
  const alumnos = [];
  if (hRow < 0 || nameCol < 0) return alumnos;
  for (let i = hRow + 1; i < rows.length; i++) {
    const r = rows[i] || [];
    const nombre = String(r[nameCol] || "").trim();
    if (!nombre || !/[A-Za-zÁÉÍÓÚÑ]/i.test(nombre)) continue;
    if (/NOMBRE\s+DEL\s+ALUMNO/i.test(nombre)) continue;
    if (/^FUSIONADOS/i.test(nombre) || /^\s*BAJAS?\b/i.test(nombre)) continue;
    alumnos.push({ nombre, fila: i + 1 });
  }
  return alumnos;
}

function listaAlumnos(archivo, sheet) {
  const wb = XLSX.readFile(archivo || ARCHIVO_DEFAULT);
  if (!wb.SheetNames.includes(sheet)) throw new Error(`Hoja inexistente: ${sheet}`);
  const ws = wb.Sheets[sheet];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
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
  return listarNombres(rows, hRow, nameCol);
}

function detalleHoja(archivo, sheet, limite = 300) {
  const wb = XLSX.readFile(archivo);
  if (!wb.SheetNames.includes(sheet)) throw new Error(`Hoja inexistente: ${sheet}`);
  const ws = wb.Sheets[sheet];
  const filas = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  return { pestana: sheet, ref: ws["!ref"] || "", totalFilas: filas.length, filas: filas.slice(0, limite) };
}

module.exports = { listarGrupos, detalleHoja, identificarHoja, listaAlumnos, ARCHIVO_DEFAULT };
