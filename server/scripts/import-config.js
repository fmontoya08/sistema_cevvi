const path = require("path");

module.exports = {
  excelFile: path.join(
    __dirname,
    "..",
    "..",
    "PAGOS PSICOLOGIA Y PEDAGOGIA SIGLO XXI, Actualizado al 1-jul-26.xlsx"
  ),
  // Pestañas vigentes 2026 (las únicas a cargar)
  // NOTA: grupos en BD renombrados al nombre exacto de la pestaña (2026-10-04)
  sheets: [
    { sheet: "PSIC-4",      nombreGrupo: "PSIC-4",      carrera: "Psicología", modalidad: "presencial", grado: "Cuarto", grupoExistente: "PSIC-4" },
    { sheet: "PSICO-5",     nombreGrupo: "PSICO-5",     carrera: "Psicología", modalidad: "presencial", grado: "Quinto" },
    { sheet: "PSICO VIR-6", nombreGrupo: "PSICO VIR-6", carrera: "Psicología", modalidad: "virtual", grado: "Sexto" },
    { sheet: "PEDA VIR-6",  nombreGrupo: "PEDA VIR-6",  carrera: "Pedagogía",  modalidad: "virtual", grado: "Sexto" },
    { sheet: "PEDA-4",      nombreGrupo: "PEDA-4",      carrera: "Pedagogía",  modalidad: "presencial", grado: "Cuarto", grupoExistente: "PEDA-4" },
    { sheet: "PEDA-5",      nombreGrupo: "PEDA-5",      carrera: "Pedagogía",  modalidad: "presencial", grado: "Quinto" },
    { sheet: "PEDA-6",      nombreGrupo: "PEDA-6",      carrera: "Pedagogía",  modalidad: "presencial", grado: "Sexto" },
    { sheet: "PSIC-1",      nombreGrupo: "PSIC-1",      carrera: "Psicología", modalidad: "presencial", grado: "Primero" },
    { sheet: "PSIC-2",      nombreGrupo: "PSIC-2",      carrera: "Psicología", modalidad: "presencial", grado: "Segundo" },
    { sheet: "PSCI-3",      nombreGrupo: "PSCI-3",      carrera: "Psicología", modalidad: "presencial", grado: "Tercero" },
  ],
  sede: "Oratorio San Luis Gonzaga",
  dominio: "universidadsigloxxi.com",
  adminUserId: 1, // admin @ universidadsigloxxi.com
  fechaVencimientoPorYear: { 2025: "2025-12-31", 2026: "2026-12-31", 2027: "2027-12-31", 2028: "2028-12-31" },
};