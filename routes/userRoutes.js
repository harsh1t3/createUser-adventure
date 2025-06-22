const express = require("express");
const router = express.Router();
const { createUser } = require("../controllers/createUser");
const upload = require("../utils/uploadMemory");

router.post("/users", upload.single("pfp"), createUser);

module.exports = router;
