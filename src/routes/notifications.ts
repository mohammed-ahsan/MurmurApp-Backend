import { Router, Response } from 'express';
import { AuthRequest, authenticate } from '../middleware/auth';
import NotificationService from '../models/Notification';

const router = Router();

// Get user notifications
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit as string) || 20;
    const cursor = req.query.cursor as string;

    const result = await NotificationService.getUserNotifications(
      userId,
      limit,
      cursor
    );

    return res.json({
      success: true,
      data: result.notifications,
      hasMore: result.hasMore,
      nextCursor: result.nextCursor,
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch notifications',
    });
  }
});

// Get unread count
router.get('/unread-count', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const count = await NotificationService.getUnreadCount(userId);

    return res.json({
      success: true,
      data: { count },
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch unread count',
    });
  }
});

// Mark notification as read
router.put('/:id/read', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;

    if (!notificationId) {
      return res.status(400).json({
        success: false,
        error: 'Notification ID is required',
      });
    }

    await NotificationService.markAsRead(notificationId, userId);

    return res.json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read',
    });
  }
});

// Mark all notifications as read
router.put('/read-all', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;

    await NotificationService.markAllAsRead(userId);

    return res.json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    console.error('Mark all as read error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to mark all notifications as read',
    });
  }
});

// Delete notification
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;

    if (!notificationId) {
      return res.status(400).json({
        success: false,
        error: 'Notification ID is required',
      });
    }

    await NotificationService.delete(notificationId, userId);

    return res.json({
      success: true,
      message: 'Notification deleted',
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete notification',
    });
  }
});

export default router;
