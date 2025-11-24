// routes/auth.js
const express = require("express");
const bcrypt = require("bcrypt");
const { generateToken, authenticateToken } = require("../middleware/auth");
const db = require("../db/config");

const router = express.Router();
const SALT_ROUNDS = 10;

// Register new user
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ error: { message: "All fields are required", status: 400 } });
    }

    if (password.length < 8) {
      return res
        .status(400)
        .json({
          error: {
            message: "Password must be at least 8 characters",
            status: 400,
          },
        });
    }

    // Check if user exists
    const existingUser = await db.getAsync(
      "SELECT id FROM users WHERE username = ? OR email = ?",
      [username, email]
    );

    if (existingUser) {
      return res
        .status(409)
        .json({
          error: { message: "Username or email already exists", status: 409 },
        });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const result = await db.runAsync(
      "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
      [username, email, passwordHash]
    );

    const token = generateToken({ id: result.id, username, email });

    res.status(201).json({
      message: "User created successfully",
      user: { id: result.id, username, email },
      token,
    });
  } catch (error) {
    console.error("Register error:", error);
    res
      .status(500)
      .json({ error: { message: "Registration failed", status: 500 } });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({
          error: { message: "Username and password required", status: 400 },
        });
    }

    // Find user
    const user = await db.getAsync(
      "SELECT * FROM users WHERE username = ? OR email = ?",
      [username, username]
    );

    if (!user) {
      return res
        .status(401)
        .json({ error: { message: "Invalid credentials", status: 401 } });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res
        .status(401)
        .json({ error: { message: "Invalid credentials", status: 401 } });
    }

    const token = generateToken({
      id: user.id,
      username: user.username,
      email: user.email,
    });

    res.json({
      message: "Login successful",
      user: { id: user.id, username: user.username, email: user.email },
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: { message: "Login failed", status: 500 } });
  }
});

// Verify token (check if user is authenticated)
router.get("/verify", authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
