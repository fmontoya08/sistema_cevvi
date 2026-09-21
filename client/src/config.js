// client/src/config.js
// ============================================
// Produccion: VPS Teramont
// Local: node index.js en /server
// ============================================

const isLocal = window.location.hostname === "localhost";

const API_URL = isLocal
  ? "http://localhost:3001"
  : "https://api.universidadsigloxxi.com";

export default API_URL;
