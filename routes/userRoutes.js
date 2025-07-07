const express = require("express");
const router = express.Router();
const { createUser } = require("../controllers/createUser");
const upload = require("../utils/uploadMemory");

// 🛡️ Rate limiter middleware
const rateLimiterMiddleware = require("../middlewares/applyRateLimiter");
const createUserLimiter = require("../middlewares/rateLimiter/createUserLimiter");

// POST /api/user/create
router.post(
  "/create",
  rateLimiterMiddleware(createUserLimiter),
  upload.single("pfp"),
  createUser
);

module.exports = router;
