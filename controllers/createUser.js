const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const sharp = require("sharp");
const { pool } = require("../db");
const blockedDomains = require("../utils/blockedDomains");
const cloudinary = require("../utils/cloudinary");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = "14d";

// Utility
function isBlockedEmail(email) {
  const domain = email?.split("@")[1]?.toLowerCase();
  return blockedDomains.includes(domain);
}

function normalizeGender(gender) {
  const g = gender?.trim().toUpperCase();
  return ["M", "F", "O", "C"].includes(g) ? g : null;
}

function isValidCoordinate(lat, lng) {
  return (
    !isNaN(lat) && !isNaN(lng) &&
    parseFloat(lat) >= -90 && parseFloat(lat) <= 90 &&
    parseFloat(lng) >= -180 && parseFloat(lng) <= 180
  );
}

function getMissingFields(body, file) {
  const required = [
    "first_name", "last_name", "phone", "email", "dob",
    "street_address", "city", "state", "password",
    "gender", "location_x", "location_y",
  ];
  const missing = required.filter((f) => !body[f]);
  if (!file) missing.push("pfp (profile picture)");
  return missing;
}

async function checkDuplicates(email, phone) {
  const [emailRes, phoneRes] = await Promise.all([
    pool.query("SELECT 1 FROM Users WHERE email = $1", [email]),
    pool.query("SELECT 1 FROM Users WHERE phone = $1", [phone]),
  ]);
  if (emailRes.rowCount > 0) return { error: "Email already exists" };
  if (phoneRes.rowCount > 0) return { error: "Phone already exists" };
  return null;
}

async function uploadProfilePicture(fileBuffer) {
  const processedBuffer = await sharp(fileBuffer)
    .resize(512, 512)
    .jpeg({ quality: 80 })
    .toBuffer();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "pfps",
        public_id: `pfp_${Date.now()}`,
        resource_type: "image",
      },
      (err, result) => {
        if (err || !result) {
          reject(err || new Error("No result from Cloudinary"));
        } else {
          resolve(result.secure_url);
        }
      }
    );
    const { Readable } = require("stream");
    Readable.from(processedBuffer).pipe(stream);
  });
}

async function insertLocation(client, street, city, state, country, lat, lng) {
  const result = await client.query(
    `INSERT INTO Locations (street_address, city, state, country, location_x, location_y)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING location_id`,
    [street, city, state, country, lat, lng]
  );
  return result.rows[0].location_id;
}

async function insertUser(client, data) {
  const result = await client.query(
    `INSERT INTO Users 
     (first_name, last_name, phone, email, dob, location_id, password_hash, gender, pfp_link)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING user_id`,
    [
      data.first_name,
      data.last_name,
      data.phone,
      data.email,
      data.dob,
      data.location_id,
      data.hash,
      data.normalizedGender,
      data.pfp_link,
    ]
  );
  return result.rows[0].user_id;
}

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

    const duplicateError = await checkDuplicates(email, phone);
    if (duplicateError) return res.status(409).json(duplicateError);

    
    let pfp_link;
    try {
      pfp_link = await uploadProfilePicture(file.buffer);
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
