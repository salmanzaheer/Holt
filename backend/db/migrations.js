// db/migrations.js
const db = require("./config");

async function runMigrations() {
  console.log("Running database migrations...");

  try {
    const isPostgres = db.isPostgres;
    
    // Helper to check column existence
    const hasColumn = async (table, column) => {
        try {
          if (isPostgres) {
              const res = await db.query(
                  "SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name = $2",
                  [table, column]
              );
              return res.rowCount > 0;
          } else {
              // SQLite
              // The helper wrapper handles PRAGMA now
              const cols = await db.allAsync(`PRAGMA table_info(${table})`);
              return cols.some(c => c.name === column);
          }
        } catch (e) {
          console.error(`Error checking column ${table}.${column}:`, e);
          return false;
        }
    };

    // Migration 1: Add 'iv' column to files table
    if (!(await hasColumn('files', 'iv'))) {
      try {
        await db.query("ALTER TABLE files ADD COLUMN iv TEXT");
        console.log("✅ Migration 1: 'iv' column added to files table");
      } catch(e) {
        // Ignore if already exists (race condition or bad check)
        if (!e.message.includes('duplicate')) console.error(e);
      }
    } else {
      console.log("Migration 1: 'iv' column already exists");
    }

    // Migration 2: Add 2FA columns to users table
    if (!(await hasColumn('users', 'two_factor_secret'))) {
      try {
        await db.query("ALTER TABLE users ADD COLUMN two_factor_secret TEXT");
        console.log("✅ Migration 2: 'two_factor_secret' column added to users table");
      } catch(e) {
        if (!e.message.includes('duplicate')) console.error(e);
      }
    } else {
      console.log("Migration 2: 'two_factor_secret' column already exists");
    }

    if (!(await hasColumn('users', 'two_factor_enabled'))) {
       const type = isPostgres ? "BOOLEAN DEFAULT false" : "INTEGER DEFAULT 0";
       try {
         await db.query(`ALTER TABLE users ADD COLUMN two_factor_enabled ${type}`);
         console.log("✅ Migration 2: 'two_factor_enabled' column added to users table");
       } catch(e) {
         if (!e.message.includes('duplicate')) console.error(e);
       }
    } else {
       console.log("Migration 2: 'two_factor_enabled' column already exists");
    }
    
    // Folder ID in files (Migration 3)
    if (!(await hasColumn('files', 'folder_id'))) {
        const type = isPostgres ? "INTEGER" : "INTEGER";
        try {
          await db.query(`ALTER TABLE files ADD COLUMN folder_id ${type}`);
          console.log("✅ Migration 3: 'folder_id' column added to files table");
        } catch(e) {
          if (!e.message.includes('duplicate')) console.error(e);
        }
    }

  } catch (err) {
    console.error("Error running migrations:", err);
  }
}

module.exports = { runMigrations };