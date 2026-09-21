const path = require("path");

module.exports = {
  excelFile: path.join(
    __dirname,
    "..",
    "..",
    "PAGOS PSICOLOGIA Y PEDAGOGIA SIGLO XXI, Actualizado al 1-jul-26.xlsx"
  ),
  // Pestañas vigentes 2026 (las únicas a cargar)
  sheets: [
    { sheet: "PSIC-4",      nombreGrupo: "Psicología 4",       carrera: "Psicología", modalidad: "presencial", grado: "Cuarto", grupoExistente: "Psicología IV" },
    { sheet: "PSICO-5",     nombreGrupo: "Psicología 5",       carrera: "Psicología", modalidad: "presencial", grado: "Quinto" },
    { sheet: "PSICO VIR-6", nombreGrupo: "Psicología 6 Virtual", carrera: "Psicología", modalidad: "virtual", grado: "Sexto" },
    { sheet: "PEDA VIR-6",  nombreGrupo: "Pedagogía 6 Virtual",  carrera: "Pedagogía",  modalidad: "virtual", grado: "Sexto" },
    { sheet: "PEDA-4",      nombreGrupo: "Pedagogía 4",        carrera: "Pedagogía",  modalidad: "presencial", grado: "Cuarto", grupoExistente: "PEDAGOGÍA XXI-1-A" },
    { sheet: "PEDA-5",      nombreGrupo: "Pedagogía 5",        carrera: "Pedagogía",  modalidad: "presencial", grado: "Quinto" },
    { sheet: "PEDA-6",      nombreGrupo: "Pedagogía 6",        carrera: "Pedagogía",  modalidad: "presencial", grado: "Sexto" },
  ],
  sede: "Oratorio San Luis Gonzaga",
  dominio: "universidadsigloxxi.com",
  adminUserId: 1, // admin @ universidadsigloxxi.com
  fechaVencimientoPorYear: { 2025: "2025-12-31", 2026: "2026-12-31", 2027: "2027-12-31", 2028: "2028-12-31" },
};