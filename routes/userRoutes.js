const express = require("express");
const router = express.Router();

// Controller
const { createUser } = require("../controllers/createUser");

// Middleware: In-memory image upload
const upload = require("../utils/uploadMemory");

// Route: Create a new user with PFP upload
router.post("/users", upload.single("pfp"), createUser);

module.exports = router;
