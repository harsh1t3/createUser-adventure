const bcrypt = require("bcrypt");
const { pool } = require("../db");
const cloudinary = require("../utils/cloudinary");
const { generateToken } = require("../utils/jwtUtils");
const {
  getMissingFields,
  normalizeGender,
  isBlockedEmail,
  isValidCoordinate,
  uploadProfilePicture,
  insertLocation,
  insertUser,
} = require("../utils/createUserUtils");

exports.createUser = async (req, res) => {
  const client = await pool.connect();

  const {
    first_name,
    last_name,
    phone,
    email,
    dob,
    street_address,
    city,
    state,
    country = "India",
    password,
    gender,
    location_x,
    location_y,
  } = req.body;

  const file = req.file;
  const lat = parseFloat(location_x);
  const lng = parseFloat(location_y);
  const errors = [];

  // Validate inputs
  const missing = getMissingFields(req.body, file);
  if (missing.length > 0) {
    errors.push({
      field: "general",
      message: "Missing required fields",
      details: missing,
    });
  }

  if (email && isBlockedEmail(email)) {
    errors.push({
      field: "email",
      message: "Email domain is blocked",
    });
  }

  const normalizedGender = normalizeGender(gender);
  if (gender && !normalizedGender) {
    errors.push({
      field: "gender",
      message: "Invalid gender. Use M, F, O, or C.",
    });
  }

  if ((location_x || location_y) && !isValidCoordinate(lat, lng)) {
    errors.push({
      field: "location",
      message: "Invalid coordinates for location_x or location_y",
    });
  }

  if (errors.length > 0) {
    return res
      .status(400)
      .json({ error: "Validation failed", issues: errors });
  }

  try {
    // Upload profile picture
    let pfp_link;
    try {
      pfp_link = await uploadProfilePicture(file.buffer, cloudinary);
    } catch (err) {
      console.error("[PFP Upload Error]", err);
      return res
        .status(500)
        .json({ error: "Profile picture upload failed" });
    }

    await client.query("BEGIN");

    const location_id = await insertLocation(
      client,
      street_address,
      city,
      state,
      country,
      lat,
      lng
    );

    const hash = await bcrypt.hash(password, 10);

    const user = await insertUser(client, {
      first_name,
      last_name,
      phone,
      email,
      dob,
      location_id,
      hash,
      normalizedGender,
      pfp_link,
    });

    const token = generateToken({ user_id: user.user_id, email });

    await client.query("COMMIT");

    return res.status(201).json({
      message: "User created successfully",
      token,
      user,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[Unhandled Error]", err);
    return res.status(500).json({ error: "Something went wrong" });
  } finally {
    client.release();
  }
};
