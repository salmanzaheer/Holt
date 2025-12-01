// routes/files.js
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const fsp = require("fs").promises;
const sharp = require("sharp");
const jwt =require("jsonwebtoken");
const crypto = require("crypto");
const { authenticateToken } = require("../middleware/auth");
const db = require("../db/config");
const { logAudit } = require("../utils/audit");

const router = express.Router();

// Middleware to authenticate media requests via token in query param
const authenticateMediaToken = (req, res, next) => {
  const token = req.query.token;
  if (!token) {
    return res
      .status(401)
      .json({ error: { message: "Access token required", status: 401 } });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(403)
        .json({ error: { message: "Invalid or expired token", status: 403 } });
    }

    // Ensure the token is for the specific file being requested
    if (decoded.fileId !== req.params.id) {
      return res
        .status(403)
        .json({ error: { message: "Token-file mismatch", status: 403 } });
    }

    // Reconstruct the user object to be consistent with authenticateToken
    req.user = {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
    };
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
    await fsp.mkdir(userPath, { recursive: true });
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

// Encryption configuration
const ALGORITHM = "aes-256-cbc";
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "a".repeat(32); // Default key for demo purposes

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
      // Parse folderId from body (FormData)
      let folderId = req.body.folderId;
      if (folderId === "null" || folderId === "") folderId = null;

      // Verify folder belongs to user if provided
      if (folderId) {
         const folder = await db.getAsync("SELECT id FROM folders WHERE id = $1 AND user_id = $2", [folderId, req.user.id]);
         if (!folder) folderId = null; // Fallback to root if invalid
      }

      for (const file of req.files) {
        const category = categorizeFile(file.mimetype);
        let thumbnailPath = null;
        try {
          // Generate thumbnail for images
          if (category === "image") {
            thumbnailPath = await generateThumbnail(
              file.path,
              file.filename,
              req.user.id
            );
          }

          // Encrypt the file
          const iv = crypto.randomBytes(16);
          const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
          const encryptedPath = file.path + ".enc";

          const input = fs.createReadStream(file.path);
          const output = fs.createWriteStream(encryptedPath);

          await new Promise((resolve, reject) => {
            input
              .pipe(cipher)
              .pipe(output)
              .on("finish", resolve)
              .on("error", reject);
          });

          // Delete the original unencrypted file
          await fsp.unlink(file.path);
          const stat = await fsp.stat(encryptedPath);
          const encryptedSize = stat.size;

          const result = await db.runAsync(
            `INSERT INTO files (user_id, filename, original_name, file_path, mime_type, file_size, thumbnail_path, category, iv, folder_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
            [
              req.user.id,
              file.filename,
              file.originalname,
              encryptedPath,
              file.mimetype,
              encryptedSize,
              thumbnailPath,
              category,
              iv.toString("hex"),
              folderId
            ]
          );

          uploadedFiles.push({
            id: result.id,
            filename: file.originalname,
            size: file.size,
            category,
          });
        } catch (dbError) {
          // If the DB write fails, delete the orphaned file
          await fsp.unlink(file.path);
          if (thumbnailPath) {
            await fsp.unlink(thumbnailPath);
          }
          // Re-throw the error to be caught by the main catch block
          throw dbError;
        }
      }
      
      await logAudit(req, "UPLOAD_FILES", { count: uploadedFiles.length, folderId });

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

// Get all files for user (supports folder filtering)
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { category, search, folderId } = req.query;
    let query =
      "SELECT id, original_name, mime_type, file_size, category, created_at, thumbnail_path, folder_id FROM files WHERE user_id = $1";
    const params = [req.user.id];
    let paramIndex = 2;

    if (search) {
      // Global search ignores folders
      query += ` AND original_name LIKE $${paramIndex++}`;
      params.push(`%${search}%`);
    } else {
      // If not searching, respect folder structure
      if (folderId && folderId !== 'null') {
        query += ` AND folder_id = $${paramIndex++}`;
        params.push(folderId);
      } else if (category) {
         // If category filtering, typical to show all files of that type regardless of folder? 
         // Or specific folder? Let's assume global for category view (e.g. "All Images")
         // Logic: If category is present, ignore folder unless folder is explicitly asked?
         // Let's prioritize: if folderId is present, filter by it. If not, and category is present, global.
         // If neither, root (folder_id IS NULL).
         if (!folderId) {
             // Global category view
         }
      } else {
         // Root view
         query += ` AND folder_id IS NULL`;
      }
    }

    if (category) {
      query += ` AND category = $${paramIndex++}`;
      params.push(category);
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

// Move file
router.put("/move", authenticateToken, async (req, res) => {
  try {
    const { fileIds, targetFolderId } = req.body; // Expect array of IDs
    
    if (!fileIds || !Array.isArray(fileIds)) {
         return res.status(400).json({ error: { message: "fileIds array required" } });
    }

    // Verify target folder
    let targetId = targetFolderId;
    if (targetId === 'null' || targetId === '') targetId = null;
    if (targetId) {
        const folder = await db.getAsync("SELECT id FROM folders WHERE id = $1 AND user_id = $2", [targetId, req.user.id]);
        if (!folder) return res.status(404).json({ error: { message: "Target folder not found" } });
    }

    // Update
    // Use ANY($1) for array update if using PG properly, but simpler loop for compatibility/simplicity
    for (const id of fileIds) {
        await db.runAsync("UPDATE files SET folder_id = $1 WHERE id = $2 AND user_id = $3", [targetId, id, req.user.id]);
    }

    await logAudit(req, "MOVE_FILES", { count: fileIds.length, targetFolderId: targetId });

    res.json({ message: "Files moved successfully" });
  } catch (error) {
     console.error("Move error:", error);
     res.status(500).json({ error: { message: "Move failed" } });
  }
});

// Copy file
router.post("/copy", authenticateToken, async (req, res) => {
  try {
    const { fileIds, targetFolderId } = req.body;
    
    if (!fileIds || !Array.isArray(fileIds)) {
         return res.status(400).json({ error: { message: "fileIds array required" } });
    }
    
     // Verify target folder
    let targetId = targetFolderId;
    if (targetId === 'null' || targetId === '') targetId = null;
    if (targetId) {
        const folder = await db.getAsync("SELECT id FROM folders WHERE id = $1 AND user_id = $2", [targetId, req.user.id]);
        if (!folder) return res.status(404).json({ error: { message: "Target folder not found" } });
    }

    let copiedCount = 0;
    
    for (const id of fileIds) {
        const file = await db.getAsync("SELECT * FROM files WHERE id = $1 AND user_id = $2", [id, req.user.id]);
        if (!file) continue;

        // Generate new physical filenames
        const newFilename = Date.now() + "-" + Math.round(Math.random() * 1e9) + "-" + file.original_name + ".enc";
        const newFilePath = path.join(path.dirname(file.file_path), newFilename);
        
        // Copy file
        await fsp.copyFile(file.file_path, newFilePath);
        
        let newThumbPath = null;
        if (file.thumbnail_path) {
            const thumbName = path.basename(file.thumbnail_path);
            const newThumbName = "copy_" + Date.now() + "_" + thumbName;
            newThumbPath = path.join(path.dirname(file.thumbnail_path), newThumbName);
            await fsp.copyFile(file.thumbnail_path, newThumbPath);
        }

        // Insert record
        await db.runAsync(
            `INSERT INTO files (user_id, filename, original_name, file_path, mime_type, file_size, thumbnail_path, category, iv, folder_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              req.user.id,
              newFilename, // This is the "internal" filename, not original_name
              file.original_name, // Keep original name
              newFilePath,
              file.mime_type,
              file.file_size,
              newThumbPath,
              file.category,
              file.iv, // We reused the file content (encrypted), so IV is same. 
              // Ideally we decrypt/re-encrypt with new IV, but that's expensive for large files. 
              // Copying ciphertext + IV is acceptable if we trust the source wasn't compromised.
              targetId
            ]
        );
        copiedCount++;
    }

    await logAudit(req, "COPY_FILES", { count: copiedCount, targetFolderId: targetId });
    res.json({ message: `Copied ${copiedCount} files` });

  } catch (error) {
     console.error("Copy error:", error);
     res.status(500).json({ error: { message: "Copy failed" } });
  }
});

// Stream file (video, audio)
router.get("/stream/:id", authenticateMediaToken, async (req, res) => {
  try {
    const file = await db.getAsync(
      "SELECT * FROM files WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.id]
    );

    if (!file) {
      return res
        .status(404)
        .json({ error: { message: "File not found", status: 404 } });
    }

    const filePath = file.file_path;
    const iv = Buffer.from(file.iv, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

    res.setHeader("Content-Type", file.mime_type);

    // For video seeking support, we need byte range handling. 
    // Decrypting the whole stream for ranges is tricky with AES-CBC (block chaining).
    // Real streaming with seeking requires random access decryption (AES-CTR or GCM) or decrypting on fly efficiently.
    // Current implementation pipes whole stream. Browser might buffer. 
    // Seeking might break because we can't start decrypting in middle of CBC chain easily without previous block.
    // FIX: For this scope, we stream continuously. If seeking needed, we'd need to rethink encryption mode.
    
    const fileStream = fs.createReadStream(filePath).pipe(decipher);
    fileStream.pipe(res);
  } catch (error) {
    console.error("Stream error:", error);
    res.status(500).json({ error: { message: "Stream failed", status: 500 } });
  }
});

// View file (images, documents)
router.get("/view/:id", authenticateMediaToken, async (req, res) => {
  try {
    const file = await db.getAsync(
      "SELECT * FROM files WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.id]
    );

    if (!file) {
      return res
        .status(404)
        .json({ error: { message: "File not found", status: 404 } });
    }

    const iv = Buffer.from(file.iv, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

    res.setHeader(
      "Content-Disposition",
      `inline; filename="${file.original_name}"`
    );
    res.setHeader("Content-Type", file.mime_type);

    const fileStream = fs.createReadStream(file.file_path).pipe(decipher);
    fileStream.pipe(res);
  } catch (error) {
    console.error("View error:", error);
    res.status(500).json({ error: { message: "View failed", status: 500 } });
  }
});

// Get thumbnail for a file
router.get("/thumbnail/:id", authenticateMediaToken, async (req, res) => {
  try {
    const file = await db.getAsync(
      "SELECT thumbnail_path FROM files WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.id]
    );

    if (!file || !file.thumbnail_path) {
      return res
        .status(404)
        .json({ error: { message: "Thumbnail not found", status: 404 } });
    }

    res.sendFile(file.thumbnail_path, { root: "/" }, (err) => {
      if (err) {
        console.error("Thumbnail send error:", err);
        res.status(err.status || 500).json({
          error: {
            message: "Failed to send thumbnail",
            status: err.status || 500,
          },
        });
      }
    });
  } catch (error) {
    console.error("Get thumbnail error:", error);
    res.status(500).json({
      error: { message: "Failed to retrieve thumbnail", status: 500 },
    });
  }
});

// Download file
router.get("/download/:id", authenticateToken, async (req, res) => {
  try {
    const file = await db.getAsync(
      "SELECT * FROM files WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.id]
    );

    if (!file) {
      return res
        .status(404)
        .json({ error: { message: "File not found", status: 404 } });
    }

    const iv = Buffer.from(file.iv, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${file.original_name}"`
    );
    res.setHeader("Content-Type", file.mime_type);

    const fileStream = fs.createReadStream(file.file_path).pipe(decipher);
    fileStream.pipe(res);
    
    await logAudit(req, "DOWNLOAD_FILE", { fileId: req.params.id });

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
      "SELECT * FROM files WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.id]
    );

    if (!file) {
      return res
        .status(404)
        .json({ error: { message: "File not found", status: 404 } });
    }

    // Delete physical files
    await fs.unlink(file.file_path).catch(() => {});
    if (file.thumbnail_path) {
      await fs.unlink(file.thumbnail_path).catch(() => {});
    }

    // Delete from database
    await db.runAsync("DELETE FROM files WHERE id = $1", [req.params.id]);

    await logAudit(req, "DELETE_FILE", { fileId: req.params.id, name: file.original_name });

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
      "SELECT id, original_name FROM files WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.id]
    );

    if (!file) {
      return res
        .status(404)
        .json({ error: { message: "File not found", status: 404 } });
    }

    await db.runAsync("UPDATE files SET original_name = $1 WHERE id = $2", [
      newName,
      req.params.id,
    ]);

    await logAudit(req, "RENAME_FILE", { fileId: req.params.id, oldName: file.original_name, newName });

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
      "SELECT id FROM files WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.id]
    );

    if (!file) {
      return res
        .status(404)
        .json({ error: { message: "File not found", status: 404 } });
    }

    // Create a short-lived token (e.g., 30 seconds)
    const payload = {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      fileId: req.params.id,
    };
    const mediaToken = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "30s",
    });

    res.json({ token: mediaToken });
  } catch (error) {
    console.error("Token generation error:", error);
    res
      .status(500)
      .json({ error: { message: "Token generation failed", status: 500 } });
  }
});

module.exports = router;
