const express = require("express");
const app = express();
require("dotenv").config();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
const userRoutes = require("./routes/userRoutes");
app.use("/api", userRoutes); // All user routes prefixed with /api

// Optional: Global error handler
const errorHandler = require("./utils/errorHandler");
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
