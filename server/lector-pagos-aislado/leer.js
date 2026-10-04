// Módulo AISLADO: lee Google Sheets (solo lectura, sin BD, sin tocar sistema).
// Uso: const { leerHoja } = require("./leer");
const XLSX = require("xlsx");

async function leerHoja(sheetId, gid) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  const res = await fetch(url, { redirect: "follow" });
  const ctype = res.headers.get("content-type") || "";
  if (res.status === 401 || res.status === 403) {
    const e = new Error(
      "SHEET_PRIVADO: el Google Sheet no es público. En Google Sheets: Compartir -> Acceso general -> Cualquiera con el enlace (Lector). Luego reintenta."
    );
    e.code = "SHEET_PRIVADO";
    e.status = res.status;
    throw e;
  }
  if (!res.ok) {
    throw new Error(`GOOGLE_${res.status}: no se pudo descargar el CSV del Sheet.`);
  }
  const texto = await res.text();
  if (texto.trimStart().startsWith("<!DOCTYPE") || ctype.includes("text/html")) {
    const e = new Error(
      "SHEET_PRIVADO: Google devolvió login HTML en vez de CSV. Comparte el Sheet como Lector para cualquiera con el enlace."
    );
    e.code = "SHEET_PRIVADO";
    throw e;
  }
  // Parsear CSV tal cual con xlsx (conserva filas/columnas originales)
  const wb = XLSX.read(texto, { type: "string" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const filas = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  const totalCols = filas.reduce((m, r) => Math.max(m, r.length), 0);
  return { sheetId, gid, url, totalFilas: filas.length, totalCols, filas };
}

module.exports = { leerHoja };
