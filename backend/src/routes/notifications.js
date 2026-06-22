import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getUserNotifications,
  markAsRead,
  markAllRead,
  getUnreadCount,
} from '../services/notificationService.js';

const router = Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const notifications = await getUserNotifications(req.user.id);
    const unread = await getUnreadCount(req.user.id);
    res.json({ notifications, unread });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/read-all', authenticate, async (req, res) => {
  try {
    await markAllRead(req.user.id);
    res.json({ message: 'All marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/read', authenticate, async (req, res) => {
  try {
    await markAsRead(req.user.id, req.params.id);
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
