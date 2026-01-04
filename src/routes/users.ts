import express from 'express';
import { query, validationResult } from 'express-validator';
import UserService from '../models/User';
import FollowService from '../models/Follow';
import NotificationService from '../models/Notification';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Validation middleware
const handleValidationErrors = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array(),
    });
  }
  return next();
};

// Get user profile
router.get('/:userId', optionalAuth, async (req: AuthRequest, res: express.Response) => {
  try {
    const userId = req.params.userId;
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
    }

    const user = await UserService.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Check if current user follows this user
    let isFollowing = false;
    if (req.user) {
      const follow = await FollowService.findByFollowerAndFollowing(req.user.id, userId);
      isFollowing = !!follow;
    }

    return res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatar: user.avatar,
          bio: user.bio,
          followersCount: user.followersCount,
          followingCount: user.followingCount,
          murmursCount: user.murmursCount,
          isFollowing,
          isOwnProfile: req.user?.id === userId,
        },
      },
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch user profile',
    });
  }
});

// Follow user
router.post('/:userId/follow', authenticate, async (req: AuthRequest, res: express.Response) => {
  try {
    const targetUserId = req.params.userId;
    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
    }
    
    const currentUserId = req.user.id;

    // Check if target user exists
    const targetUser = await UserService.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Check if already following
    const existingFollow = await FollowService.findByFollowerAndFollowing(currentUserId, targetUserId);

    if (existingFollow) {
      return res.status(409).json({
        success: false,
        error: 'Already following this user',
      });
    }

    // Create follow relationship
    await FollowService.create(currentUserId, targetUserId);

    // Update follower/following counts
    await Promise.all([
      UserService.updateCounts(currentUserId, { followingCount: 1 }),
      UserService.updateCounts(targetUserId, { followersCount: 1 }),
    ]);

    // Create notification for the followed user
    await NotificationService.create('follow', targetUserId, currentUserId);

    return res.json({
      success: true,
      message: 'User followed successfully',
      data: {
        isFollowing: true,
        followersCount: targetUser.followersCount + 1,
      },
    });
  } catch (error) {
    console.error('Follow user error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to follow user',
    });
  }
});

// Unfollow user
router.delete('/:userId/follow', authenticate, async (req: AuthRequest, res: express.Response) => {
  try {
    const targetUserId = req.params.userId;
    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
    }
    
    const currentUserId = req.user.id;

    // Check if target user exists
    const targetUser = await UserService.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Check if following
    const follow = await FollowService.findByFollowerAndFollowing(currentUserId, targetUserId);

    if (!follow) {
      return res.status(409).json({
        success: false,
        error: 'Not following this user',
      });
    }

    // Remove follow relationship
    await FollowService.delete(currentUserId, targetUserId);

    // Update follower/following counts
    await Promise.all([
      UserService.updateCounts(currentUserId, { followingCount: -1 }),
      UserService.updateCounts(targetUserId, { followersCount: -1 }),
    ]);

    return res.json({
      success: true,
      message: 'User unfollowed successfully',
      data: {
        isFollowing: false,
        followersCount: Math.max(0, targetUser.followersCount - 1),
      },
    });
  } catch (error) {
    console.error('Unfollow user error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to unfollow user',
    });
  }
});

// Get user's followers
router.get('/:userId/followers', [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
], handleValidationErrors, async (req: express.Request, res: express.Response) => {
  try {
    const userId = req.params.userId;
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
    }
    
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Check if user exists
    const user = await UserService.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Get followers
    const { followers, totalCount } = await FollowService.getFollowers(userId, limit, skip);

    return res.json({
      success: true,
      data: {
        followers,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNextPage: page * limit < totalCount,
          hasPreviousPage: page > 1,
        },
      },
    });
  } catch (error) {
    console.error('Get followers error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch followers',
    });
  }
});

// Get user's following
router.get('/:userId/following', [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
], handleValidationErrors, async (req: express.Request, res: express.Response) => {
  try {
    const userId = req.params.userId;
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
    }
    
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Check if user exists
    const user = await UserService.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Get following
    const { following, totalCount } = await FollowService.getFollowing(userId, limit, skip);

    return res.json({
      success: true,
      data: {
        following,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNextPage: page * limit < totalCount,
          hasPreviousPage: page > 1,
        },
      },
    });
  } catch (error) {
    console.error('Get following error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch following',
    });
  }
});

// Search users
router.get('/search/:query', [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
], handleValidationErrors, async (req: express.Request, res: express.Response) => {
  try {
    const query = req.params.query;
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required',
      });
    }
    
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Search users by username or display name
    const users = await UserService.search(query, limit, skip);

    // Get total count for pagination
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const totalCount = await prisma.user.count({
      where: {
        isActive: true,
        OR: [
          { username: { contains: query, mode: 'insensitive' } },
          { displayName: { contains: query, mode: 'insensitive' } },
        ],
      },
    });

    return res.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNextPage: page * limit < totalCount,
          hasPreviousPage: page > 1,
        },
      },
    });
  } catch (error) {
    console.error('Search users error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to search users',
    });
  }
});

export default router;
