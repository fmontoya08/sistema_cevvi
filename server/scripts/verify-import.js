const { createPool } = require("./db.js");
const planJson = require("./cambios_previstos.json");

(async () => {
  const p = createPool();
  const ok = (c, m) => console.log(`${c ? "OK " : "XX "} ${m}`);

  const [con] = await p.query("SELECT COUNT(*) c FROM conceptos_pago WHERE nombre_concepto IN ('Adeudo 2026','Adeudo 2027','Adeudo 2028')");
  ok(con[0].c === 3, `conceptos Adeudo (2026-2028) presentes: ${con[0].c}`);

  const [gdet] = await p.query(
    `SELECT g.nombre_grupo, COUNT(ga.id) n FROM grupos g
     LEFT JOIN grupo_alumnos ga ON ga.grupo_id = g.id
     WHERE g.nombre_grupo IN ('PSIC-4','PEDA-4','PSICO-5','PSICO VIR-6','PEDA VIR-6','PEDA-5','PEDA-6','PSIC-1','PSIC-2','PSCI-3')
     GROUP BY g.nombre_grupo`
  );
  const expect = { "PSIC-4": 32, "PEDA-4": 35, "PSICO-5": 15, "PSICO VIR-6": 5, "PEDA VIR-6": 8, "PEDA-5": 17, "PEDA-6": 13, "PSIC-1": 34, "PSIC-2": 20, "PSCI-3": 27 };
  const got = {};
  for (const r of gdet) got[r.nombre_grupo] = r.n;
  for (const k of Object.keys(expect)) ok(got[k] === expect[k], `grupo ${k}: ${got[k]} alumnos (esperado ${expect[k]})`);

  const [ads] = await p.query(
    `SELECT c.nombre_concepto, COUNT(a.id) n, COALESCE(SUM(a.monto_a_pagar),0) s
     FROM adeudos_alumnos a JOIN conceptos_pago c ON c.id = a.concepto_id
     WHERE c.nombre_concepto IN ('Adeudo 2026','Adeudo 2027','Adeudo 2028')
     GROUP BY c.nombre_concepto`
  );
  const sums = {};
  for (const r of ads) sums[r.nombre_concepto] = { n: r.n, s: r.s };
  const e26 = planJson.sheets.reduce((a, sh) => a + (sh.estudiantes || []).reduce((x, al) => x + (al.porAnio[2026] || 0), 0), 0);
  const e27 = planJson.sheets.reduce((a, sh) => a + (sh.estudiantes || []).reduce((x, al) => x + (al.porAnio[2027] || 0), 0), 0);
  const e28 = planJson.sheets.reduce((a, sh) => a + (sh.estudiantes || []).reduce((x, al) => x + (al.porAnio[2028] || 0), 0), 0);
  ok(sums["Adeudo 2026"] && Number(sums["Adeudo 2026"].s) === e26, `Adeudo 2026: ${sums["Adeudo 2026"].n} filas, $${sums["Adeudo 2026"].s} (esperado ${e26})`);
  ok(sums["Adeudo 2027"] && Number(sums["Adeudo 2027"].s) === e27, `Adeudo 2027: ${sums["Adeudo 2027"].n} filas, $${sums["Adeudo 2027"].s} (esperado ${e27})`);
  ok(sums["Adeudo 2028"] && Number(sums["Adeudo 2028"].s) === e28, `Adeudo 2028: ${sums["Adeudo 2028"].n} filas, $${sums["Adeudo 2028"].s} (esperado ${e28})`);

  const [alumNew] = await p.query("SELECT COUNT(*) c FROM usuarios WHERE id > 2640000 AND matricula >= 20260092");
  ok(alumNew[0].c === 59, `usuarios nuevos creados: ${alumNew[0].c}`);

  await p.end();
})().catch((e) => { console.error("FAIL:", e.message); process.exit(1); });