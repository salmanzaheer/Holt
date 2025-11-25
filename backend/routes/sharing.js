// routes/sharing.js
const express = require("express");
const { authenticateToken } = require("../middleware/auth");
const db = require("../db/config");

const router = express.Router();

// Share a file with another user
router.post("/share", authenticateToken, async (req, res) => {
  try {
    const { fileId, email } = req.body;
    if (!fileId || !email) {
      return res.status(400).json({
        error: { message: "File ID and email are required", status: 400 },
      });
    }

    // Find the user to share with
    const sharedWithUser = await db.getAsync(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    if (!sharedWithUser) {
      return res.status(404).json({
        error: { message: "User to share with not found", status: 404 },
      });
    }

    if (sharedWithUser.id === req.user.id) {
      return res.status(400).json({
        error: {
          message: "You cannot share a file with yourself",
          status: 400,
        },
      });
    }

    // Check if the file exists and belongs to the user
    const file = await db.getAsync(
      "SELECT id FROM files WHERE id = ? AND user_id = ?",
      [fileId, req.user.id]
    );

    if (!file) {
      return res.status(404).json({
        error: {
          message: "File not found or you don't have permission to share it",
          status: 404,
        },
      });
    }

    // Check if the file is already shared with the user
    const existingShare = await db.getAsync(
      "SELECT id FROM shared_files WHERE file_id = ? AND shared_with = ?",
      [fileId, sharedWithUser.id]
    );

    if (existingShare) {
      return res.status(409).json({
        error: {
          message: "File is already shared with this user",
          status: 409,
        },
      });
    }

    // Share the file
    await db.runAsync(
      "INSERT INTO shared_files (file_id, shared_by, shared_with) VALUES (?, ?, ?)",
      [fileId, req.user.id, sharedWithUser.id]
    );

    res.status(201).json({ message: "File shared successfully" });
  } catch (error) {
    console.error("Share file error:", error);
    res
      .status(500)
      .json({ error: { message: "Failed to share file", status: 500 } });
  }
});

// Get files shared with the current user
router.get("/shared-with-me", authenticateToken, async (req, res) => {
  try {
    const files = await db.allAsync(
      `SELECT
         f.id,
         f.original_name,
         f.mime_type,
         f.file_size,
         f.category,
         f.created_at,
         u.email as shared_by
       FROM shared_files sf
       JOIN files f ON sf.file_id = f.id
       JOIN users u ON sf.shared_by = u.id
       WHERE sf.shared_with = ?`,
      [req.user.id]
    );

    res.json({ files });
  } catch (error) {
    console.error("Get shared files error:", error);
    res.status(500).json({
      error: { message: "Failed to retrieve shared files", status: 500 },
    });
  }
});

// Get files shared by the current user
router.get("/my-shares", authenticateToken, async (req, res) => {
  try {
    const files = await db.allAsync(
      `SELECT
         f.id,
         f.original_name,
         u.email as shared_with
       FROM shared_files sf
       JOIN files f ON sf.file_id = f.id
       JOIN users u ON sf.shared_with = u.id
       WHERE sf.shared_by = ?`,
      [req.user.id]
    );

    res.json({ files });
  } catch (error) {
    console.error("Get my shares error:", error);
    res.status(500).json({
      error: { message: "Failed to retrieve your shared files", status: 500 },
    });
  }
});

// Unshare a file
router.delete("/unshare", authenticateToken, async (req, res) => {
  try {
    const { fileId, email } = req.body;
    if (!fileId || !email) {
      return res
        .status(400)
        .json({
          error: { message: "File ID and email are required", status: 400 },
        });
    }

    const sharedWithUser = await db.getAsync(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    if (!sharedWithUser) {
      return res
        .status(404)
        .json({ error: { message: "User not found", status: 404 } });
    }

    await db.runAsync(
      "DELETE FROM shared_files WHERE file_id = ? AND shared_by = ? AND shared_with = ?",
      [fileId, req.user.id, sharedWithUser.id]
    );

    res.json({ message: "File unshared successfully" });
  } catch (error) {
    console.error("Unshare file error:", error);
    res
      .status(500)
      .json({ error: { message: "Failed to unshare file", status: 500 } });
  }
});

module.exports = router;
