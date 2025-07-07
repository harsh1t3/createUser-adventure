const express = require("express");
const router = express.Router();
const redisClient = require("../middlewares/rateLimiter/redisClient");

router.get("/redis", async (req, res) => {
  try {
    const pong = await redisClient.ping();
    if (pong === "PONG") {
      res.json({ redis: "up" });
    } else {
      res.status(500).json({ redis: "unreachable", response: pong });
    }
  } catch (err) {
    res.status(500).json({ redis: "down", error: err.message });
  }
});

module.exports = router;
