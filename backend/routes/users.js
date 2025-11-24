// routes/users.js
const express = require("express");
const { authenticateToken } = require("../middleware/auth");
const db = require("../db/config");

const router = express.Router();

// Get user profile
router.get("/profile", authenticateToken, async (req, res) => {
  try {
    const user = await db.getAsync(
      "SELECT id, username, email, created_at FROM users WHERE id = ?",
      [req.user.id]
    );

    if (!user) {
      return res
        .status(404)
        .json({ error: { message: "User not found", status: 404 } });
    }

    // Get file statistics
    const stats = await db.getAsync(
      `SELECT 
        COUNT(*) as total_files,
        SUM(file_size) as total_size,
        COUNT(CASE WHEN category = 'image' THEN 1 END) as images,
        COUNT(CASE WHEN category = 'video' THEN 1 END) as videos,
        COUNT(CASE WHEN category = 'audio' THEN 1 END) as audio,
        COUNT(CASE WHEN category = 'document' THEN 1 END) as documents
       FROM files WHERE user_id = ?`,
      [req.user.id]
    );

    res.json({
      user,
      stats: {
        totalFiles: stats.total_files || 0,
        totalSize: stats.total_size || 0,
        images: stats.images || 0,
        videos: stats.videos || 0,
        audio: stats.audio || 0,
        documents: stats.documents || 0,
      },
    });
  } catch (error) {
    console.error("Profile error:", error);
    res
      .status(500)
      .json({ error: { message: "Failed to get profile", status: 500 } });
  }
});

module.exports = router;
