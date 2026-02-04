// client/src/config.js

const isLocal = window.location.hostname === "localhost";

const API_URL = isLocal
  ? "http://localhost:3001" // Si estás en tu PC
  : "https://api-universidad-c5o8.onrender.com"; // Si estás en Internet

export default API_URL;
