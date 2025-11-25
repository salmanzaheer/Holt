// db/migrations.js
const db = require("./config");

function runMigrations() {
  db.serialize(() => {
    console.log("Running database migrations...");

    // Migration 1: Add 'iv' column to files table
    db.get("PRAGMA table_info(files)", (err, result) => {
      if (err) {
        console.error("Error checking files table schema:", err);
        return;
      }

      let columnExists = false;
      if (result) {
        for (let i = 0; i < result.length; i++) {
          if (result[i].name === "iv") {
            columnExists = true;
            break;
          }
        }
      }

      if (!columnExists) {
        db.run("ALTER TABLE files ADD COLUMN iv TEXT", (err) => {
          if (err) {
            console.error("Migration 1 error:", err.message);
          } else {
            console.log("✅ Migration 1: 'iv' column added to files table");
          }
        });
      } else {
        console.log("Migration 1: 'iv' column already exists");
      }
    });

    // Migration 2: Add 2FA columns to users table
    db.get("PRAGMA table_info(users)", (err, result) => {
      if (err) {
        console.error("Error checking users table schema:", err);
        return;
      }

      let secretExists = false;
      let enabledExists = false;
      if (result) {
        for (let i = 0; i < result.length; i++) {
          if (result[i].name === "two_factor_secret") {
            secretExists = true;
          }
          if (result[i].name === "two_factor_enabled") {
            enabledExists = true;
          }
        }
      }

      if (!secretExists) {
        db.run("ALTER TABLE users ADD COLUMN two_factor_secret TEXT", (err) => {
          if (err) {
            console.error("Migration 2 error (secret):", err.message);
          } else {
            console.log(
              "✅ Migration 2: 'two_factor_secret' column added to users table"
            );
          }
        });
      } else {
        console.log("Migration 2: 'two_factor_secret' column already exists");
      }

      if (!enabledExists) {
        db.run(
          "ALTER TABLE users ADD COLUMN two_factor_enabled INTEGER DEFAULT 0",
          (err) => {
            if (err) {
              console.error("Migration 2 error (enabled):", err.message);
            } else {
              console.log(
                "✅ Migration 2: 'two_factor_enabled' column added to users table"
              );
            }
          }
        );
      } else {
        console.log("Migration 2: 'two_factor_enabled' column already exists");
      }
    });

    // Add other migrations here in the future
  });
}

module.exports = { runMigrations };
