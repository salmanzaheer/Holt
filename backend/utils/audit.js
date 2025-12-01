const db = require('../db/config');

async function logAudit(req, action, details = null) {
  try {
    const userId = req.user ? req.user.id : null;
    // standardized ip retrieval
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
    const agent = req.get('User-Agent') || null;
    
    await db.runAsync(
      `INSERT INTO audit_logs (user_id, action, details, ip_address, user_agent) 
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, action, details ? JSON.stringify(details) : null, ip, agent]
    );
  } catch (err) {
    console.error("Audit log failed:", err); 
    // Non-blocking error, don't crash request
  }
}

module.exports = { logAudit };
