const sharp = require("sharp");
const { Readable } = require("stream");
const blockedDomains = require("./blockedDomains");

// Validate missing fields
function getMissingFields(body, file) {
  const required = [
    "first_name", "last_name", "phone", "email", "dob",
    "street_address", "city", "state", "password",
    "gender", "location_x", "location_y"
  ];
  const missing = required.filter(f => !body[f]);
  if (!file) missing.push("pfp (profile picture)");
  return missing;
}

// Check for blocked email domains
function isBlockedEmail(email) {
  const domain = email?.split("@")[1]?.toLowerCase();
  return blockedDomains.includes(domain);
}

// Normalize gender input
function normalizeGender(gender) {
  const g = gender?.trim().toUpperCase();
  return ["M", "F", "O", "C"].includes(g) ? g : null;
}

// Validate lat/lng coordinates
function isValidCoordinate(lat, lng) {
  return (
    !isNaN(lat) &&
    !isNaN(lng) &&
    parseFloat(lat) >= -90 &&
    parseFloat(lat) <= 90 &&
    parseFloat(lng) >= -180 &&
    parseFloat(lng) <= 180
  );
}

// Upload and compress profile picture to Cloudinary
async function uploadProfilePicture(fileBuffer, cloudinary) {
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
    Readable.from(processedBuffer).pipe(stream);
  });
}

// Insert new location row
async function insertLocation(client, street, city, state, country, lat, lng) {
  const result = await client.query(
    `INSERT INTO Locations (street_address, city, state, country, location_x, location_y)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING location_id`,
    [street, city, state, country, lat, lng]
  );
  return result.rows[0].location_id;
}

// Insert user and return profile
async function insertUser(client, data) {
  const result = await client.query(
    `INSERT INTO Users 
     (first_name, last_name, phone, email, dob, location_id, password_hash, gender, pfp_link)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING user_id, first_name, last_name, email, phone, gender, pfp_link`,
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
  return result.rows[0]; // Return full user profile
}

module.exports = {
  getMissingFields,
  normalizeGender,
  isBlockedEmail,
  isValidCoordinate,
  uploadProfilePicture,
  insertLocation,
  insertUser
};
