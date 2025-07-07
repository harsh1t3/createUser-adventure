const express = require("express");
const app = express();
require("dotenv").config();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
const userRoutes = require("./routes/userRoutes");
const healthRoutes = require("./routes/healthRoutes");

// Mount API routes
app.use("/api/user", userRoutes);

// Mount health check
app.use("/health", healthRoutes);

// Default route
app.get("/", (req, res) => {
  res.send("🩺 Paediprime API is up and running!");
});

// Global error handler (optional)
app.use((err, req, res, next) => {
  console.error("[Unhandled Error]", err);
  res.status(500).json({ error: "Internal server error" });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
