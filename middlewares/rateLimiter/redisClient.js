require("dotenv").config();
const Redis = require("ioredis");

const redisOptions = {
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  password: process.env.REDIS_PASSWORD,
  enableOfflineQueue: false,
  retryStrategy: (times) => Math.min(times * 50, 2000),
};

// ❌ Skip TLS if disabled
if (process.env.REDIS_TLS === "true") {
  redisOptions.tls = {}; // Only add TLS when needed
}

const redisClient = new Redis(redisOptions);

redisClient.on("connect", () => {
  console.log("✅ Connected to Redis Cloud");
});

redisClient.on("error", (err) => {
  console.error("🔴 Redis error:", err);
});

module.exports = redisClient;
