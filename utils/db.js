const { Pool } = require("pg");
require("dotenv").config();

// Singleton connection pool
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  max: 20,                 // max clients in the pool
  idleTimeoutMillis: 30000, // close idle clients after 30s
  connectionTimeoutMillis: 5000 // return error after 5s if cannot connect
});

// Optional: log connection success once
pool.on("connect", () => {
  console.log("✅ PostgreSQL pool connected");
});

// Optional: catch and log pool errors
pool.on("error", (err) => {
  console.error("❌ Unexpected error on PostgreSQL pool:", err);
});

module.exports = {
  query: (text, params) => pool.query(text, params), // Quick queries
  getClient: () => pool.connect(),                   // Manual transactions
  pool                                               // direct access if needed
};
