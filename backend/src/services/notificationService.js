import pool from '../db/pool.js';

export async function createNotification(userId, type, title, message) {
  await pool.query(
    `INSERT INTO notifications (user_id, type, title, message) VALUES ($1, $2, $3, $4)`,
    [userId, type, title, message]
  );
  return { userId, type, title, message };
}

export async function getUserNotifications(userId, limit = 50) {
  const res = await pool.query(
    `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [userId, limit]
  );
  return res.rows;
}

export async function markAsRead(userId, notificationId) {
  await pool.query(
    `UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2`,
    [notificationId, userId]
  );
}

export async function markAllRead(userId) {
  await pool.query(`UPDATE notifications SET is_read = true WHERE user_id = $1`, [userId]);
}

export async function getUnreadCount(userId) {
  const res = await pool.query(
    `SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false`,
    [userId]
  );
  return parseInt(res.rows[0].count);
}
