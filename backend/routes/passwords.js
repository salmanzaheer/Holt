const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const { authenticateToken } = require("../middleware/auth");
const db = require("../db/config");
const { logAudit } = require("../utils/audit");

const ALGORITHM = "aes-256-cbc";
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "a".repeat(32);

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return {
    iv: iv.toString('hex'),
    encryptedData: encrypted
  };
}

function decrypt(text, ivHex) {
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let decrypted = decipher.update(text, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// List passwords (metadata only)
router.get("/", authenticateToken, async (req, res) => {
  try {
    const passwords = await db.allAsync(
      `SELECT id, site_name, site_url, username, notes, created_at, updated_at 
       FROM passwords WHERE user_id = $1 ORDER BY site_name ASC`,
      [req.user.id]
    );
    res.json({ passwords });
  } catch (error) {
    console.error("List passwords error:", error);
    res.status(500).json({ error: "Failed to list passwords" });
  }
});

// Add password
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { site_name, site_url, username, password, notes } = req.body;

    if (!site_name || !password) {
      return res.status(400).json({ error: "Site name and password are required" });
    }

    const { iv, encryptedData } = encrypt(password);

    const result = await db.runAsync(
      `INSERT INTO passwords (user_id, site_name, site_url, username, encrypted_password, iv, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, site_name, created_at`,
      [req.user.id, site_name, site_url, username, encryptedData, iv, notes]
    );

    await logAudit(req, "CREATE_PASSWORD", { passwordId: result[0].id, site_name });

    res.status(201).json(result[0]);
  } catch (error) {
    console.error("Add password error:", error);
    res.status(500).json({ error: "Failed to add password" });
  }
});

// Get decrypted password
router.get("/:id/reveal", authenticateToken, async (req, res) => {
  try {
    const entry = await db.getAsync(
      "SELECT encrypted_password, iv FROM passwords WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.id]
    );

    if (!entry) return res.status(404).json({ error: "Password not found" });

    const decrypted = decrypt(entry.encrypted_password, entry.iv);

    // Log access to password!
    await logAudit(req, "REVEAL_PASSWORD", { passwordId: req.params.id });

    res.json({ password: decrypted });
  } catch (error) {
    console.error("Reveal password error:", error);
    res.status(500).json({ error: "Failed to reveal password" });
  }
});

// Update password
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const { site_name, site_url, username, password, notes } = req.body;
    const { id } = req.params;

    const existing = await db.getAsync(
      "SELECT id FROM passwords WHERE id = $1 AND user_id = $2",
      [id, req.user.id]
    );

    if (!existing) return res.status(404).json({ error: "Password not found" });

    // Construct dynamic update query
    let fields = [];
    let params = [];
    let paramIndex = 1;

    if (site_name) { fields.push(`site_name = $${paramIndex++}`); params.push(site_name); }
    if (site_url !== undefined) { fields.push(`site_url = $${paramIndex++}`); params.push(site_url); }
    if (username !== undefined) { fields.push(`username = $${paramIndex++}`); params.push(username); }
    if (notes !== undefined) { fields.push(`notes = $${paramIndex++}`); params.push(notes); }
    
    if (password) {
       const { iv, encryptedData } = encrypt(password);
       fields.push(`encrypted_password = $${paramIndex++}`); params.push(encryptedData);
       fields.push(`iv = $${paramIndex++}`); params.push(iv);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    
    params.push(id); // For WHERE clause

    if (fields.length === 1) { // Only updated_at
       return res.json({ message: "No changes detected" });
    }

    await db.runAsync(
      `UPDATE passwords SET ${fields.join(", ")} WHERE id = $${paramIndex}`,
      params
    );

    await logAudit(req, "UPDATE_PASSWORD", { passwordId: id });

    res.json({ message: "Password updated" });
  } catch (error) {
    console.error("Update password error:", error);
    res.status(500).json({ error: "Failed to update password" });
  }
});

// Delete password
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const existing = await db.getAsync(
        "SELECT id FROM passwords WHERE id = $1 AND user_id = $2",
        [id, req.user.id]
    );
  
    if (!existing) return res.status(404).json({ error: "Password not found" });

    await db.runAsync("DELETE FROM passwords WHERE id = $1", [id]);

    await logAudit(req, "DELETE_PASSWORD", { passwordId: id });

    res.json({ message: "Password deleted" });
  } catch (error) {
    console.error("Delete password error:", error);
    res.status(500).json({ error: "Failed to delete password" });
  }
});

module.exports = router;
