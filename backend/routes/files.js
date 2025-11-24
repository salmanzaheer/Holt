// routes/files.js
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const fsp = require("fs").promises;
const sharp = require("sharp");
const jwt = require("jsonwebtoken");
const { authenticateToken } = require("../middleware/auth");
const db = require("../db/config");

const router = express.Router();

// Middleware to authenticate media requests via token in query param
const authenticateMediaToken = (req, res, next) => {
  const token = req.query.token;
  if (!token) {
    return res.status(401).json({ error: { message: "Access token required", status: 401 } });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: { message: "Invalid or expired token", status: 403 } });
    }
    // Ensure the token is for the specific file being requested
    if (user.fileId !== req.params.id) {
       return res.status(403).json({ error: { message: "Token-file mismatch", status: 403 } });
    }
    req.user = user;
    next();
  });
};

// Storage configuration
const STORAGE_PATH = process.env.STORAGE_PATH || "./storage";
const THUMBNAIL_PATH = path.join(STORAGE_PATH, "thumbnails");

// Ensure storage directories exist
(async () => {
  await fsp.mkdir(STORAGE_PATH, { recursive: true });
  await fsp.mkdir(THUMBNAIL_PATH, { recursive: true });
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

// Stream file (video, audio)
router.get("/stream/:id", authenticateMediaToken, async (req, res) => {
  try {
    const file = await db.getAsync(
      "SELECT * FROM files WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.userId]
    );

    if (!file) {
      return res
        .status(404)
        .json({ error: { message: "File not found", status: 404 } });
    }

    const filePath = file.file_path;
    const stat = await fsp.stat(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });
      const head = {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunksize,
        "Content-Type": file.mime_type,
      };
      res.writeHead(206, head);
      fileStream.pipe(res);
    } else {
      const head = {
        "Content-Length": fileSize,
        "Content-Type": file.mime_type,
      };
      res.writeHead(200, head);
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (error) {
    console.error("Stream error:", error);
    res
      .status(500)
      .json({ error: { message: "Stream failed", status: 500 } });
  }
});

// View file (images, documents)
router.get("/view/:id", authenticateMediaToken, async (req, res) => {
  try {
    const file = await db.getAsync(
      "SELECT * FROM files WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.userId]
    );

    if (!file) {
      return res
        .status(404)
        .json({ error: { message: "File not found", status: 404 } });
    }

    res.setHeader("Content-Disposition", `inline; filename="${file.original_name}"`);
    res.sendFile(file.file_path, { root: "/" }, (err) => {
      if (err) {
        console.error("View file error:", err);
        res
         .status(err.status || 500)
         .json({ error: { message: "Failed to send file", status: err.status || 500 } });
      }
    });

  } catch (error) {
    console.error("View error:", error);
    res
      .status(500)
      .json({ error: { message: "View failed", status: 500 } });
  }
});

// Get thumbnail for a file
router.get("/thumbnail/:id", authenticateMediaToken, async (req, res) => {
  try {
    const file = await db.getAsync(
      "SELECT thumbnail_path FROM files WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.userId]
    );

    if (!file || !file.thumbnail_path) {
      return res
        .status(404)
        .json({ error: { message: "Thumbnail not found", status: 404 } });
    }

    res.sendFile(file.thumbnail_path, { root: "/" }, (err) => {
       if (err) {
        console.error("Thumbnail send error:", err);
        res
         .status(err.status || 500)
         .json({ error: { message: "Failed to send thumbnail", status: err.status || 500 } });
      }
    });

  } catch (error) {
    console.error("Get thumbnail error:", error);
    res
      .status(500)
      .json({ error: { message: "Failed to retrieve thumbnail", status: 500 } });
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

// Rename a file
router.patch("/:id", authenticateToken, async (req, res) => {
  try {
    const { newName } = req.body;
    if (!newName) {
      return res
        .status(400)
        .json({ error: { message: "New name is required", status: 400 } });
    }

    const file = await db.getAsync(
      "SELECT id, original_name FROM files WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.id]
    );

    if (!file) {
      return res
        .status(404)
        .json({ error: { message: "File not found", status: 404 } });
    }

    await db.runAsync("UPDATE files SET original_name = ? WHERE id = ?", [
      newName,
      req.params.id,
    ]);

    res.json({
      message: "File renamed successfully",
      file: { ...file, original_name: newName },
    });
  } catch (error) {
    console.error("Rename error:", error);
    res.status(500).json({ error: { message: "Rename failed", status: 500 } });
  }
});

// Generate a short-lived token for media access
router.get("/token/:id", authenticateToken, async (req, res) => {
  try {
    const file = await db.getAsync(
      "SELECT id FROM files WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.id]
    );

    if (!file) {
      return res
        .status(404)
        .json({ error: { message: "File not found", status: 404 } });
    }

    // Create a short-lived token (e.g., 30 seconds)
    const mediaToken = jwt.sign(
      { userId: req.user.id, fileId: req.params.id },
      process.env.JWT_SECRET,
      { expiresIn: "30s" }
    );

    res.json({ token: mediaToken });
  } catch (error) {
    console.error("Token generation error:", error);
    res
      .status(500)
      .json({ error: { message: "Token generation failed", status: 500 } });
  }
});

module.exports = router;
