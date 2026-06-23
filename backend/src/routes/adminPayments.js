/**
 * Payments management — deposits, withdrawals, transactions (mounted from admin.js).
 */
import { Router } from 'express';
import pool from '../db/pool.js';
import { auditLog } from '../services/auditService.js';
import { creditAccount, debitAccount } from '../services/walletService.js';
import { createNotification } from '../services/notificationService.js';

const router = Router();

function buildSearchFilter(search, params, alias = 'u') {
  if (!search?.trim()) return '';
  params.push(`%${search.trim().toLowerCase()}%`);
  const i = params.length;
  return ` AND (LOWER(${alias}.email) LIKE $${i} OR LOWER(${alias}.first_name) LIKE $${i} OR LOWER(${alias}.last_name) LIKE $${i} OR ${alias}.phone LIKE $${i})`;
}

router.get('/payments/stats', async (_req, res) => {
  try {
    const [pendingDep, pendingWdr, totals, revenue] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS c, COALESCE(SUM(amount), 0) AS amount FROM deposit_requests WHERE status = 'pending'`),
      pool.query(`SELECT COUNT(*)::int AS c, COALESCE(SUM(amount), 0) AS amount FROM withdrawal_requests WHERE status = 'pending'`),
      pool.query(`
        SELECT
          COALESCE(SUM(amount) FILTER (WHERE type = 'deposit' AND status = 'completed'), 0) AS total_deposits,
          COALESCE(SUM(CASE WHEN type = 'withdrawal' AND status = 'completed' THEN ABS(amount) ELSE 0 END), 0) AS total_withdrawals
        FROM transactions
      `),
      pool.query(`
        SELECT
          COALESCE(SUM(CASE WHEN status = 'lost' THEN stake ELSE 0 END), 0)
          - COALESCE(SUM(CASE WHEN status = 'won' THEN potential_win ELSE 0 END), 0) AS house_profit
        FROM bets WHERE status IN ('won', 'lost')
      `),
    ]);
    res.json({
      pendingDeposits: pendingDep.rows[0].c,
      pendingDepositsAmount: parseFloat(pendingDep.rows[0].amount),
      pendingWithdrawals: pendingWdr.rows[0].c,
      pendingWithdrawalsAmount: parseFloat(pendingWdr.rows[0].amount),
      totalDeposits: parseFloat(totals.rows[0].total_deposits),
      totalWithdrawals: parseFloat(totals.rows[0].total_withdrawals),
      totalRevenue: parseFloat(revenue.rows[0].house_profit),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/deposits', async (req, res) => {
  try {
    const { status, search } = req.query;
    const params = [];
    let filter = 'WHERE 1=1';
    if (status && status !== 'all') {
      params.push(status);
      filter += ` AND dr.status = $${params.length}`;
    }
    filter += buildSearchFilter(search, params);
    const result = await pool.query(
      `SELECT dr.*, u.email, u.first_name, u.last_name, u.phone AS user_phone
       FROM deposit_requests dr
       JOIN users u ON dr.user_id = u.id
       ${filter}
       ORDER BY dr.created_at DESC LIMIT 200`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/deposits/:id/approve', async (req, res) => {
  try {
    const dep = await pool.query('SELECT * FROM deposit_requests WHERE id = $1', [req.params.id]);
    if (!dep.rows[0] || dep.rows[0].status !== 'pending') {
      return res.status(400).json({ error: 'Invalid or already processed deposit' });
    }
    await pool.query(
      'UPDATE deposit_requests SET status = $1, reviewed_by = $2, reviewed_at = NOW() WHERE id = $3',
      ['approved', req.user.id, req.params.id]
    );
    await creditAccount(dep.rows[0].user_id, parseFloat(dep.rows[0].amount), 'deposit', req.params.id, 'Deposit approved');
    await createNotification(
      dep.rows[0].user_id,
      'deposit',
      'Deposit Approved',
      `Your deposit of GHS ${dep.rows[0].amount} has been approved and credited to your wallet.`
    );
    await auditLog(req.user.id, 'deposit_approved', 'deposit', req.params.id, {}, req.ip);
    res.json({ message: 'Deposit approved', id: req.params.id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/deposits/:id/reject', async (req, res) => {
  try {
    const { note } = req.body;
    const dep = await pool.query('SELECT * FROM deposit_requests WHERE id = $1', [req.params.id]);
    if (!dep.rows[0] || dep.rows[0].status !== 'pending') {
      return res.status(400).json({ error: 'Invalid deposit' });
    }
    await pool.query(
      'UPDATE deposit_requests SET status = $1, admin_note = $2, reviewed_by = $3, reviewed_at = NOW() WHERE id = $4',
      ['rejected', note || 'Rejected by admin', req.user.id, req.params.id]
    );
    await createNotification(
      dep.rows[0].user_id,
      'deposit',
      'Deposit Rejected',
      note || `Your deposit request of GHS ${dep.rows[0].amount} was rejected.`
    );
    await auditLog(req.user.id, 'deposit_rejected', 'deposit', req.params.id, { note }, req.ip);
    res.json({ message: 'Deposit rejected' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/deposits/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const result = await pool.query(
      'UPDATE deposit_requests SET status = $1, reviewed_by = $2, reviewed_at = NOW() WHERE id = $3 RETURNING *',
      [status, req.user.id, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
    await auditLog(req.user.id, 'deposit_status_changed', 'deposit', req.params.id, { status }, req.ip);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/deposits/:id', async (req, res) => {
  try {
    const dep = await pool.query('SELECT status FROM deposit_requests WHERE id = $1', [req.params.id]);
    if (!dep.rows[0]) return res.status(404).json({ error: 'Not found' });
    if (dep.rows[0].status === 'approved') {
      return res.status(400).json({ error: 'Cannot delete approved deposits' });
    }
    await pool.query('DELETE FROM deposit_requests WHERE id = $1', [req.params.id]);
    await auditLog(req.user.id, 'deposit_deleted', 'deposit', req.params.id, {}, req.ip);
    res.json({ message: 'Deposit request deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/withdrawals', async (req, res) => {
  try {
    const { status, search } = req.query;
    const params = [];
    let filter = 'WHERE 1=1';
    if (status && status !== 'all') {
      params.push(status);
      filter += ` AND wr.status = $${params.length}`;
    }
    filter += buildSearchFilter(search, params);
    const result = await pool.query(
      `SELECT wr.*, u.email, u.first_name, u.last_name
       FROM withdrawal_requests wr
       JOIN users u ON wr.user_id = u.id
       ${filter}
       ORDER BY wr.created_at DESC LIMIT 200`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/withdrawals/:id/approve', async (req, res) => {
  try {
    const wdr = await pool.query('SELECT * FROM withdrawal_requests WHERE id = $1', [req.params.id]);
    if (!wdr.rows[0] || wdr.rows[0].status !== 'pending') {
      return res.status(400).json({ error: 'Invalid or already processed withdrawal' });
    }
    await debitAccount(wdr.rows[0].user_id, parseFloat(wdr.rows[0].amount), 'withdrawal', req.params.id, 'Withdrawal approved');
    await pool.query(
      'UPDATE withdrawal_requests SET status = $1, reviewed_by = $2, reviewed_at = NOW() WHERE id = $3',
      ['completed', req.user.id, req.params.id]
    );
    await createNotification(
      wdr.rows[0].user_id,
      'withdrawal',
      'Withdrawal Approved',
      `Your withdrawal of GHS ${wdr.rows[0].amount} has been processed to ${wdr.rows[0].phone_number}.`
    );
    await auditLog(req.user.id, 'withdrawal_approved', 'withdrawal', req.params.id, {}, req.ip);
    res.json({ message: 'Withdrawal approved' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/withdrawals/:id/reject', async (req, res) => {
  try {
    const { note } = req.body;
    const wdr = await pool.query('SELECT * FROM withdrawal_requests WHERE id = $1', [req.params.id]);
    if (!wdr.rows[0] || wdr.rows[0].status !== 'pending') {
      return res.status(400).json({ error: 'Invalid withdrawal' });
    }
    await pool.query(
      'UPDATE withdrawal_requests SET status = $1, admin_note = $2, reviewed_by = $3, reviewed_at = NOW() WHERE id = $4',
      ['rejected', note || 'Rejected by admin', req.user.id, req.params.id]
    );
    await createNotification(
      wdr.rows[0].user_id,
      'withdrawal',
      'Withdrawal Rejected',
      note || `Your withdrawal request of GHS ${wdr.rows[0].amount} was rejected.`
    );
    await auditLog(req.user.id, 'withdrawal_rejected', 'withdrawal', req.params.id, { note }, req.ip);
    res.json({ message: 'Withdrawal rejected' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/withdrawals/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'approved', 'rejected', 'completed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const result = await pool.query(
      'UPDATE withdrawal_requests SET status = $1, reviewed_by = $2, reviewed_at = NOW() WHERE id = $3 RETURNING *',
      [status, req.user.id, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
    await auditLog(req.user.id, 'withdrawal_status_changed', 'withdrawal', req.params.id, { status }, req.ip);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/withdrawals/:id', async (req, res) => {
  try {
    const wdr = await pool.query('SELECT status FROM withdrawal_requests WHERE id = $1', [req.params.id]);
    if (!wdr.rows[0]) return res.status(404).json({ error: 'Not found' });
    if (wdr.rows[0].status === 'completed') {
      return res.status(400).json({ error: 'Cannot delete completed withdrawals' });
    }
    await pool.query('DELETE FROM withdrawal_requests WHERE id = $1', [req.params.id]);
    await auditLog(req.user.id, 'withdrawal_deleted', 'withdrawal', req.params.id, {}, req.ip);
    res.json({ message: 'Withdrawal request deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/transactions', async (req, res) => {
  try {
    const { status, type, search } = req.query;
    const params = [];
    let statusFilter = '';
    if (status && status !== 'all') {
      params.push(status);
      statusFilter = ` AND combined.status = $${params.length}`;
    }
    let typeFilter = '';
    if (type && type !== 'all') {
      params.push(type);
      typeFilter = ` AND combined.kind = $${params.length}`;
    }
    let searchFilter = '';
    if (search?.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      const i = params.length;
      searchFilter = ` AND (LOWER(combined.email) LIKE $${i} OR LOWER(combined.full_name) LIKE $${i})`;
    }

    const result = await pool.query(
      `SELECT * FROM (
        SELECT dr.id, 'deposit' AS kind, dr.user_id, u.email,
               TRIM(CONCAT(u.first_name, ' ', u.last_name)) AS full_name,
               dr.amount, dr.payment_method, dr.phone_number, dr.status,
               dr.screenshot_url, dr.admin_note, dr.created_at, dr.reviewed_at
        FROM deposit_requests dr JOIN users u ON dr.user_id = u.id
        UNION ALL
        SELECT wr.id, 'withdrawal' AS kind, wr.user_id, u.email,
               TRIM(CONCAT(u.first_name, ' ', u.last_name)) AS full_name,
               wr.amount, wr.payment_method, wr.phone_number, wr.status,
               NULL AS screenshot_url, wr.admin_note, wr.created_at, wr.reviewed_at
        FROM withdrawal_requests wr JOIN users u ON wr.user_id = u.id
        UNION ALL
        SELECT t.id, t.type AS kind, t.user_id, u.email,
               TRIM(CONCAT(u.first_name, ' ', u.last_name)) AS full_name,
               ABS(t.amount) AS amount, NULL AS payment_method, NULL AS phone_number,
               t.status, NULL AS screenshot_url, t.description AS admin_note,
               t.created_at, NULL AS reviewed_at
        FROM transactions t JOIN users u ON t.user_id = u.id
        WHERE t.type IN ('deposit', 'withdrawal', 'admin_credit', 'admin_debit')
      ) combined
      WHERE 1=1 ${statusFilter} ${typeFilter} ${searchFilter}
      ORDER BY combined.created_at DESC LIMIT 300`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/transactions/:id/status', async (req, res) => {
  try {
    const { status, kind } = req.body;
    if (!['pending', 'approved', 'rejected', 'completed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    let result;
    if (kind === 'deposit') {
      result = await pool.query(
        'UPDATE deposit_requests SET status = $1, reviewed_by = $2, reviewed_at = NOW() WHERE id = $3 RETURNING *',
        [status, req.user.id, req.params.id]
      );
    } else if (kind === 'withdrawal') {
      result = await pool.query(
        'UPDATE withdrawal_requests SET status = $1, reviewed_by = $2, reviewed_at = NOW() WHERE id = $3 RETURNING *',
        [status, req.user.id, req.params.id]
      );
    } else {
      result = await pool.query(
        'UPDATE transactions SET status = $1 WHERE id = $2 RETURNING *',
        [status, req.params.id]
      );
    }
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
    await auditLog(req.user.id, 'transaction_status_changed', kind || 'transaction', req.params.id, { status }, req.ip);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
