const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { pool } = require("../db");
const cloudinary = require("../utils/cloudinary");
const {
  getMissingFields,
  normalizeGender,
  isBlockedEmail,
  isValidCoordinate,
  uploadProfilePicture,
  insertLocation,
  insertUser
} = require("../utils/createUserUtils");

require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = "14d";

exports.createUser = async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      first_name, last_name, phone, email, dob,
      street_address, city, state, country = "India",
      password, gender, location_x, location_y
    } = req.body;
    const file = req.file;

    const missingFields = getMissingFields(req.body, file);
    if (missingFields.length > 0) {
      return res.status(400).json({ error: "Missing required fields", details: missingFields });
    }

    if (isBlockedEmail(email)) {
      return res.status(400).json({ error: "Email domain is blocked" });
    }

    const normalizedGender = normalizeGender(gender);
    if (!normalizedGender) {
      return res.status(400).json({ error: "Invalid gender. Use M, F, O, or C." });
    }

    const lat = parseFloat(location_x);
    const lng = parseFloat(location_y);
    if (!isValidCoordinate(lat, lng)) {
      return res.status(400).json({ error: "Invalid coordinates" });
    }

    let pfp_link;
    try {
      pfp_link = await uploadProfilePicture(file.buffer, cloudinary);
    } catch (err) {
      console.error("[PFP Upload Error]", err);
      return res.status(500).json({ error: "Profile picture upload failed" });
    }

    await client.query("BEGIN");
    const location_id = await insertLocation(client, street_address, city, state, country, lat, lng);
    const hash = await bcrypt.hash(password, 10);
    const user_id = await insertUser(client, {
      first_name, last_name, phone, email, dob,
      location_id, hash, normalizedGender, pfp_link
    });

    const token = jwt.sign({ user_id, email }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
    await client.query("COMMIT");

    return res.status(201).json({ message: "User created successfully", token, user_id });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[Unhandled Error]", err);
    return res.status(500).json({ error: "Something went wrong" });
  } finally {
    client.release();
  }
};
