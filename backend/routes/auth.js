// routes/auth.js
const express = require("express");
const bcrypt = require("bcrypt");
const speakeasy = require("speakeasy");
const qrcode = require("qrcode");
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
      return res.status(400).json({
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
      return res.status(409).json({
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
      return res.status(400).json({
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

    if (user.two_factor_enabled) {
      return res.json({
        message: "2FA token required",
        two_factor_required: true,
        user: { id: user.id },
      });
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

// Login with 2FA
router.post("/login/2fa", async (req, res) => {
  try {
    const { userId, token } = req.body;
    if (!userId || !token) {
      return res
        .status(400)
        .json({
          error: { message: "User ID and token required", status: 400 },
        });
    }

    const user = await db.getAsync("SELECT * FROM users WHERE id = ?", [
      userId,
    ]);

    if (!user || !user.two_factor_enabled || !user.two_factor_secret) {
      return res
        .status(401)
        .json({ error: { message: "2FA not enabled for user", status: 401 } });
    }

    const verified = speakeasy.totp.verify({
      secret: user.two_factor_secret,
      encoding: "base32",
      token,
    });

    if (verified) {
      const authToken = generateToken({
        id: user.id,
        username: user.username,
        email: user.email,
      });

      res.json({
        message: "Login successful",
        user: { id: user.id, username: user.username, email: user.email },
        token: authToken,
      });
    } else {
      res
        .status(401)
        .json({ error: { message: "Invalid 2FA token", status: 401 } });
    }
  } catch (error) {
    console.error("2FA login error:", error);
    res
      .status(500)
      .json({ error: { message: "2FA login failed", status: 500 } });
  }
});

// Verify token (check if user is authenticated)
router.get("/verify", authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// Generate 2FA secret and QR code
router.post("/2fa/generate", authenticateToken, async (req, res) => {
  try {
    const secret = speakeasy.generateSecret({
      name: `Hault:${req.user.email}`,
    });

    await db.runAsync("UPDATE users SET two_factor_secret = ? WHERE id = ?", [
      secret.base32,
      req.user.id,
    ]);

    qrcode.toDataURL(secret.otpauth_url, (err, data_url) => {
      if (err) {
        throw new Error("Failed to generate QR code");
      }
      res.json({
        message: "2FA secret generated",
        secret: secret.base32,
        qr_code: data_url,
      });
    });
  } catch (error) {
    console.error("2FA generation error:", error);
    res
      .status(500)
      .json({ error: { message: "2FA setup failed", status: 500 } });
  }
});

// Verify 2FA token and enable 2FA
router.post("/2fa/verify", authenticateToken, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res
        .status(400)
        .json({ error: { message: "2FA token is required", status: 400 } });
    }

    const user = await db.getAsync(
      "SELECT two_factor_secret FROM users WHERE id = ?",
      [req.user.id]
    );

    if (!user || !user.two_factor_secret) {
      return res
        .status(400)
        .json({ error: { message: "2FA is not set up", status: 400 } });
    }

    const verified = speakeasy.totp.verify({
      secret: user.two_factor_secret,
      encoding: "base32",
      token,
    });

    if (verified) {
      await db.runAsync(
        "UPDATE users SET two_factor_enabled = 1 WHERE id = ?",
        [req.user.id]
      );
      res.json({ message: "2FA enabled successfully" });
    } else {
      res
        .status(400)
        .json({ error: { message: "Invalid 2FA token", status: 400 } });
    }
  } catch (error) {
    console.error("2FA verification error:", error);
    res
      .status(500)
      .json({ error: { message: "2FA verification failed", status: 500 } });
  }
});

// Disable 2FA
router.post("/2fa/disable", authenticateToken, async (req, res) => {
  try {
    await db.runAsync(
      "UPDATE users SET two_factor_enabled = 0, two_factor_secret = NULL WHERE id = ?",
      [req.user.id]
    );
    res.json({ message: "2FA disabled successfully" });
  } catch (error) {
    console.error("2FA disable error:", error);
    res
      .status(500)
      .json({ error: { message: "2FA disable failed", status: 500 } });
  }
});

module.exports = router;
