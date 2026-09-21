const mysql = require("mysql2/promise");
const path = require("path");
const fs = require("fs");

function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env");
  const env = {};
  if (fs.existsSync(envPath)) {
    for (const line of fs
      .readFileSync(envPath, "utf8")
      .split(/\r?\n/)
      .filter((l) => l && !l.trim().startsWith("#") && l.includes("="))) {
      const idx = line.indexOf("=");
      const key = line.slice(0, idx).trim().match(/[\w]+/)[0];
      env[key] = line.slice(idx + 1).trim();
    }
  }
  return env;
}

const env = loadEnv();

function createPool() {
  return mysql.createPool({
    host: env.DB_HOST,
    user: env.DB_USER,
    password: env.DB_PASS,
    database: env.DB_NAME,
    port: Number(env.DB_PORT || 3306),
    waitForConnections: true,
    connectionLimit: 5,
    ssl: { rejectUnauthorized: false },
  });
}

module.exports = { loadEnv, createPool };