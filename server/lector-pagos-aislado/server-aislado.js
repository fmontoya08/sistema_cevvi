// Servidor AISLADO del lector de pagos. No se monta en server/index.js.
// Arranca solo: node server/lector-pagos-aislado/server-aislado.js  (puerto 3002)
const express = require("express");
const cors = require("cors");
const path = require("path");
const { leerHoja } = require("./leer");
const { listarGrupos, detalleHoja, ARCHIVO_DEFAULT } = require("./grupos");

const app = express();
app.use(cors());
app.use(express.json());

const DEFAULT_SHEET_ID = "1_HoKXfiAggbq5uRHNIjWkSj0ZJtqEdsc";
const DEFAULT_GID = "2127928750";

app.get("/api/info", (req, res) => {
  res.json({ defaultSheetId: DEFAULT_SHEET_ID, defaultGid: DEFAULT_GID });
});

app.get("/api/preview", async (req, res) => {
  const sheetId = (req.query.sheetId || DEFAULT_SHEET_ID).trim();
  const gid = (req.query.gid || DEFAULT_GID).trim();
  if (!sheetId || !gid) return res.status(400).json({ error: "Faltan sheetId y gid" });
  try {
    const data = await leerHoja(sheetId, gid);
    res.json({ ok: true, ...data });
  } catch (e) {
    res.status(e.code === "SHEET_PRIVADO" ? 401 : 500).json({ ok: false, error: e.message, code: e.code || "ERROR" });
  }
});

// Grupos = pestañas del Excel local (solo ver/identificar, sin BD)
app.get("/api/grupos", (req, res) => {
  try {
    const grupos = listarGrupos();
    res.json({ ok: true, archivo: ARCHIVO_DEFAULT, total: grupos.length, grupos });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get("/api/grupos/:hoja", (req, res) => {
  try {
    const limite = Math.min(Number(req.query.limite || 300), 1000);
    const data = detalleHoja(ARCHIVO_DEFAULT, req.params.hoja, limite);
    res.json({ ok: true, ...data });
  } catch (e) {
    res.status(404).json({ ok: false, error: e.message });
  }
});

// Sirve el visor
app.use(express.static(__dirname));

const PORT = process.env.LECTOR_PORT || 3002;
if (require.main === module) {
  app.listen(PORT, () => console.log(`[lector-aislado] http://localhost:${PORT}/preview.html`));
}
module.exports = app;
