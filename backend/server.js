// server.js
require("dotenv").config({
  path: require("path").resolve(__dirname, "./.env"),
});
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");

const authRoutes = require("./routes/auth");
const fileRoutes = require("./routes/files");
const userRoutes = require("./routes/users");
const sharingRoutes = require("./routes/sharing");
const { runMigrations } = require("./db/migrations");

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use("/api/", limiter);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/users", userRoutes);
app.use("/api/sharing", sharingRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || "Internal server error",
      status: err.status || 500,
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: { message: "Route not found", status: 404 } });
});

app.listen(PORT, () => {
  runMigrations();
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(
    `📁 File storage path: ${process.env.STORAGE_PATH || "./storage"}`
  );
});
