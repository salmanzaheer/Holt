const { Pool } = require("pg");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

const isPostgres = false;
let db;

// Abstract DB Interface
const dbInterface = {
  query: null, // (sql, params) -> { rows, rowCount }
  runAsync: async function (sql, params = []) {
    const { rows } = await this.query(sql, params);
    return rows; 
  },
  getAsync: async function (sql, params = []) {
    const { rows } = await this.query(sql, params);
    return rows[0];
  },
  allAsync: async function (sql, params = []) {
    const { rows } = await this.query(sql, params);
    return rows;
  }
};

if (isPostgres) {
  console.log("🔌 Connecting to PostgreSQL...");
  const pool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
  });

  dbInterface.query = async (sql, params) => {
    return pool.query(sql, params);
  };
  
  pool.on("connect", () => {
     console.log("✅ Connected to PostgreSQL database");
  });
  
  // Initialize immediately (async)
  (async () => {
      try {
          await initializeDatabase(dbInterface);
      } catch (e) {
          console.error("Init DB error", e);
      }
  })();
  
  db = dbInterface;

} else {
  console.log("⚠️ PG_HOST not found. Falling back to SQLite.");
  const dbPath = path.resolve(__dirname, "../data/hault.db");
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const sqliteDb = new sqlite3.Database(dbPath);
  
  dbInterface.query = (sql, params = []) => {
    return new Promise((resolve, reject) => {
      // Convert $n to ?
      const sqliteSql = sql.replace(/\$\d+/g, "?");
      
      // Check if it's a SELECT or INSERT/UPDATE or PRAGMA
      const method = sqliteSql.trim().toUpperCase().startsWith("SELECT") || sqliteSql.trim().toUpperCase().startsWith("PRAGMA") || sqliteSql.trim().toUpperCase().includes("RETURNING") ? "all" : "run";
      
      if (method === 'all') {
          // Regex check for RETURNING (Simulate INSERT RETURNING id)
          if (/\bRETURNING\b/i.test(sqliteSql)) {
             const cleanSql = sqliteSql.replace(/RETURNING .*/i, "");
             sqliteDb.run(cleanSql, params, function(err) {
                 if (err) return reject(err);
                 resolve({ rows: [{ id: this.lastID }], rowCount: this.changes });
             });
             return;
          }

          sqliteDb.all(sqliteSql, params, (err, rows) => {
            if (err) return reject(err);
            resolve({ rows, rowCount: rows.length });
          });
      } else {
          sqliteDb.run(sqliteSql, params, function(err) {
            if (err) return reject(err);
            resolve({ rows: [], rowCount: this.changes });
          });
      }
    });
  };

  db = dbInterface;
  
  sqliteDb.serialize(() => {
      initializeDatabase(db).then(() => console.log("✅ SQLite Initialized"));
  });
}

async function initializeDatabase(db) {
  try {
    const serialType = isPostgres ? "SERIAL PRIMARY KEY" : "INTEGER PRIMARY KEY AUTOINCREMENT";
    const timestampType = isPostgres ? "TIMESTAMP DEFAULT CURRENT_TIMESTAMP" : "DATETIME DEFAULT CURRENT_TIMESTAMP";
    const boolType = isPostgres ? "BOOLEAN" : "INTEGER"; 

    // Users table
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id ${serialType},
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        two_factor_secret VARCHAR(100),
        two_factor_enabled ${boolType} DEFAULT 0,
        created_at ${timestampType},
        updated_at ${timestampType}
      )
    `);

    // Folders
    await db.query(`
      CREATE TABLE IF NOT EXISTS folders (
        id ${serialType},
        user_id INTEGER NOT NULL,
        parent_id INTEGER,
        name VARCHAR(255) NOT NULL,
        created_at ${timestampType},
        updated_at ${timestampType},
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE
      )
    `);

    // Files table
    await db.query(`
      CREATE TABLE IF NOT EXISTS files (
        id ${serialType},
        user_id INTEGER NOT NULL,
        folder_id INTEGER,
        filename VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        file_size INTEGER NOT NULL,
        thumbnail_path VARCHAR(500),
        category VARCHAR(50),
        iv VARCHAR(255),
        created_at ${timestampType},
        updated_at ${timestampType},
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
      )
    `);

    // Passwords
    await db.query(`
      CREATE TABLE IF NOT EXISTS passwords (
        id ${serialType},
        user_id INTEGER NOT NULL,
        site_name VARCHAR(255) NOT NULL,
        site_url VARCHAR(500),
        username VARCHAR(255),
        encrypted_password VARCHAR(500) NOT NULL,
        iv VARCHAR(100) NOT NULL,
        notes TEXT,
        created_at ${timestampType},
        updated_at ${timestampType},
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Audit Logs
    await db.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id ${serialType},
        user_id INTEGER,
        action VARCHAR(100) NOT NULL,
        details TEXT,
        ip_address VARCHAR(50),
        user_agent VARCHAR(255),
        created_at ${timestampType},
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    
    // Shared files
    await db.query(`
      CREATE TABLE IF NOT EXISTS shared_files (
        id ${serialType},
        file_id INTEGER NOT NULL,
        shared_by INTEGER NOT NULL,
        shared_with INTEGER NOT NULL,
        permission VARCHAR(20) DEFAULT 'read',
        created_at ${timestampType},
        FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
        FOREIGN KEY (shared_by) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (shared_with) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    try { await db.query("CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id)"); } catch(e) {}
    try { await db.query("CREATE INDEX IF NOT EXISTS idx_files_category ON files(category)"); } catch(e) {}
    try { await db.query("CREATE INDEX IF NOT EXISTS idx_shared_files_shared_with ON shared_files(shared_with)"); } catch(e) {}

        console.log("✅ Database schema synced");

      } catch (err) {

        console.error("Error initializing database:", err);

      }

    }

    

    module.exports = {

        query: (sql, params) => db.query(sql, params),

        runAsync: (sql, params) => db.runAsync(sql, params),

        getAsync: (sql, params) => db.getAsync(sql, params),

        allAsync: (sql, params) => db.allAsync(sql, params),

        isPostgres

    };

    