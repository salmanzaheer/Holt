// routes/files.js
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
const sharp = require("sharp");
const { authenticateToken } = require("../middleware/auth");
const db = require("../db/config");

const router = express.Router();

// Storage configuration
const STORAGE_PATH = process.env.STORAGE_PATH || "./storage";
const THUMBNAIL_PATH = path.join(STORAGE_PATH, "thumbnails");

// Ensure storage directories exist
(async () => {
  await fs.mkdir(STORAGE_PATH, { recursive: true });
  await fs.mkdir(THUMBNAIL_PATH, { recursive: true });
})();

// Multer configuration
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const userPath = path.join(STORAGE_PATH, `user_${req.user.id}`);
    await fs.mkdir(userPath, { recursive: true });
    cb(null, userPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit
  fileFilter: (req, file, cb) => {
    // Add file type validation here if needed
    cb(null, true);
  },
});

// Helper function to categorize files
function categorizeFile(mimeType) {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (
    mimeType.includes("pdf") ||
    mimeType.includes("document") ||
    mimeType.includes("text")
  )
    return "document";
  return "other";
}

// Helper function to generate thumbnails for images
async function generateThumbnail(filePath, filename, userId) {
  try {
    const thumbnailFilename = `thumb_${filename}`;
    const thumbnailFullPath = path.join(
      THUMBNAIL_PATH,
      `user_${userId}_${thumbnailFilename}`
    );

    await sharp(filePath)
      .resize(300, 300, { fit: "cover" })
      .toFile(thumbnailFullPath);

    return thumbnailFullPath;
  } catch (error) {
    console.error("Thumbnail generation error:", error);
    return null;
  }
}

// Upload file(s)
router.post(
  "/upload",
  authenticateToken,
  upload.array("files", 10),
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res
          .status(400)
          .json({ error: { message: "No files uploaded", status: 400 } });
      }

      const uploadedFiles = [];

      for (const file of req.files) {
        const category = categorizeFile(file.mimetype);
        let thumbnailPath = null;

        // Generate thumbnail for images
        if (category === "image") {
          thumbnailPath = await generateThumbnail(
            file.path,
            file.filename,
            req.user.id
          );
        }

        const result = await db.runAsync(
          `INSERT INTO files (user_id, filename, original_name, file_path, mime_type, file_size, thumbnail_path, category)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            req.user.id,
            file.filename,
            file.originalname,
            file.path,
            file.mimetype,
            file.size,
            thumbnailPath,
            category,
          ]
        );

        uploadedFiles.push({
          id: result.id,
          filename: file.originalname,
          size: file.size,
          category,
        });
      }

      res.status(201).json({
        message: "Files uploaded successfully",
        files: uploadedFiles,
      });
    } catch (error) {
      console.error("Upload error:", error);
      res
        .status(500)
        .json({ error: { message: "Upload failed", status: 500 } });
    }
  }
);

// Get all files for user
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { category, search } = req.query;
    let query =
      "SELECT id, original_name, mime_type, file_size, category, created_at, thumbnail_path FROM files WHERE user_id = ?";
    const params = [req.user.id];

    if (category) {
      query += " AND category = ?";
      params.push(category);
    }

    if (search) {
      query += " AND original_name LIKE ?";
      params.push(`%${search}%`);
    }

    query += " ORDER BY created_at DESC";

    const files = await db.allAsync(query, params);
    res.json({ files });
  } catch (error) {
    console.error("Get files error:", error);
    res
      .status(500)
      .json({ error: { message: "Failed to retrieve files", status: 500 } });
  }
});

// Download file
router.get("/download/:id", authenticateToken, async (req, res) => {
  try {
    const file = await db.getAsync(
      "SELECT * FROM files WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.id]
    );

    if (!file) {
      return res
        .status(404)
        .json({ error: { message: "File not found", status: 404 } });
    }

    res.download(file.file_path, file.original_name);
  } catch (error) {
    console.error("Download error:", error);
    res
      .status(500)
      .json({ error: { message: "Download failed", status: 500 } });
  }
});

// Delete file
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const file = await db.getAsync(
      "SELECT * FROM files WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.id]
    );

    if (!file) {
      return res
        .status(404)
        .json({ error: { message: "File not found", status: 404 } });
    }

    // Delete physical files
    await fs.unlink(file.file_path);
    if (file.thumbnail_path) {
      await fs.unlink(file.thumbnail_path).catch(() => {});
    }

    // Delete from database
    await db.runAsync("DELETE FROM files WHERE id = ?", [req.params.id]);

    res.json({ message: "File deleted successfully" });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ error: { message: "Delete failed", status: 500 } });
  }
});

module.exports = router;
