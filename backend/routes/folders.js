const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const db = require("../db/config");
const { logAudit } = require("../utils/audit");

// Create a folder
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { name, parentId } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: "Folder name is required" });
    }

    // Verify parent folder exists and belongs to user if parentId provided
    if (parentId) {
      const parent = await db.getAsync(
        "SELECT id FROM folders WHERE id = $1 AND user_id = $2",
        [parentId, req.user.id]
      );
      if (!parent) {
        return res.status(404).json({ error: "Parent folder not found" });
      }
    }

    const result = await db.runAsync(
      `INSERT INTO folders (user_id, name, parent_id) 
       VALUES ($1, $2, $3) RETURNING id, name, parent_id, created_at`,
      [req.user.id, name, parentId || null]
    );

    await logAudit(req, "CREATE_FOLDER", { folderId: result[0].id, name });
    
    res.status(201).json(result[0]);
  } catch (error) {
    console.error("Create folder error:", error);
    res.status(500).json({ error: "Failed to create folder" });
  }
});

// List folders (by parentId)
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { parentId } = req.query;
    
    let query = "SELECT * FROM folders WHERE user_id = $1";
    const params = [req.user.id];

    if (parentId && parentId !== 'null') {
      query += " AND parent_id = $2";
      params.push(parentId);
    } else {
      query += " AND parent_id IS NULL";
    }

    query += " ORDER BY name ASC";

    const folders = await db.allAsync(query, params);
    res.json({ folders });
  } catch (error) {
    console.error("List folders error:", error);
    res.status(500).json({ error: "Failed to list folders" });
  }
});

// Rename folder
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;
    const { id } = req.params;

    if (!name) return res.status(400).json({ error: "Name required" });

    const folder = await db.getAsync(
      "SELECT id FROM folders WHERE id = $1 AND user_id = $2",
      [id, req.user.id]
    );

    if (!folder) return res.status(404).json({ error: "Folder not found" });

    await db.runAsync(
      "UPDATE folders SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
      [name, id]
    );

    await logAudit(req, "RENAME_FOLDER", { folderId: id, newName: name });

    res.json({ message: "Folder renamed", id, name });
  } catch (error) {
    console.error("Rename folder error:", error);
    res.status(500).json({ error: "Failed to rename folder" });
  }
});

// Delete folder
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const folder = await db.getAsync(
      "SELECT id FROM folders WHERE id = $1 AND user_id = $2",
      [id, req.user.id]
    );

    if (!folder) return res.status(404).json({ error: "Folder not found" });

    // Note: Database ON DELETE SET NULL or CASCADE handles children based on config.
    // Based on our schema:
    // Files: SET NULL (Move to root)
    // Subfolders: CASCADE (Delete subfolders)
    // This is slightly inconsistent behaviour (files kept, subfolders deleted). 
    // Ideally we'd recurse, but for now we rely on DB.
    
    await db.runAsync("DELETE FROM folders WHERE id = $1", [id]);
    
    await logAudit(req, "DELETE_FOLDER", { folderId: id });

    res.json({ message: "Folder deleted" });
  } catch (error) {
    console.error("Delete folder error:", error);
    res.status(500).json({ error: "Failed to delete folder" });
  }
});

module.exports = router;
