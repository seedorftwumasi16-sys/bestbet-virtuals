import pool from '../db/pool.js';

export async function auditLog(userId, action, entityType, entityId, details, ip) {
  try {
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, action, entityType, entityId, JSON.stringify(details), ip]
    );
  } catch (err) {
    console.error('Audit log error:', err);
  }
}
