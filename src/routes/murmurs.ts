import express from 'express';
import { body, query, validationResult } from 'express-validator';
import MurmurService from '../models/Murmur';
import LikeService from '../models/Like';
import UserService from '../models/User';
import FollowService from '../models/Follow';
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

// Get timeline (murmurs from followed users)
router.get('/timeline', authenticate, [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
], handleValidationErrors, async (req: AuthRequest, res: express.Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    const userId = req.user.id;

    // Get users that the current user follows
    const { following } = await FollowService.getFollowing(userId, 1000, 0); // Get all following
    const followingIds = following.map((user: any) => user.id);
    
    // Include current user's murmurs as well
    followingIds.push(userId);

    // Get murmurs from followed users
    const { murmurs, totalCount } = await MurmurService.getTimeline(userId, limit, offset);

    // Get like counts and user's likes for each murmur
    const murmurIds = murmurs.map((m: any) => m.id);
    const likeCounts = await Promise.all(
      murmurIds.map((id: string) => LikeService.getLikeCount(id))
    );

    const userLikes = await Promise.all(
      murmurIds.map((id: string) => LikeService.isUserLiked(userId, id))
    );

    // Format response
    const formattedMurmurs = murmurs.map((murmur: any, index: number) => ({
      ...murmur,
      likesCount: likeCounts[index],
      isLikedByUser: userLikes[index],
    }));

    return res.json({
      success: true,
      data: {
        murmurs: formattedMurmurs,
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
    console.error('Get timeline error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch timeline',
    });
  }
});

// Get all murmurs (public feed)
router.get('/', [
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
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const { murmurs, totalCount } = await MurmurService.getPublicMurmurs(limit, offset);

    // Get like counts
    const murmurIds = murmurs.map((m: any) => m.id);
    const likeCounts = await Promise.all(
      murmurIds.map((id: string) => LikeService.getLikeCount(id))
    );

    // Format response
    const formattedMurmurs = murmurs.map((murmur: any, index: number) => ({
      ...murmur,
      likesCount: likeCounts[index],
    }));

    return res.json({
      success: true,
      data: {
        murmurs: formattedMurmurs,
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
    console.error('Get murmurs error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch murmurs',
    });
  }
});

// Get user's murmurs - This must come before /:id route
router.get('/user/:userId', [
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
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    // Check if user exists
    const user = await UserService.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const { murmurs, totalCount } = await MurmurService.getUserMurmurs(userId, limit, offset);

    // Get like counts
    const murmurIds = murmurs.map((m: any) => m.id);
    const likeCounts = await Promise.all(
      murmurIds.map((id: string) => LikeService.getLikeCount(id))
    );

    // Format response
    const formattedMurmurs = murmurs.map((murmur: any, index: number) => ({
      ...murmur,
      likesCount: likeCounts[index],
    }));

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
        },
        murmurs: formattedMurmurs,
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
    console.error('Get user murmurs error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch user murmurs',
    });
  }
});

// Get single murmur
router.get('/:id', optionalAuth, async (req: AuthRequest, res: express.Response) => {
  try {
    const murmurId = req.params.id;

    const murmur = await MurmurService.findById(murmurId);

    if (!murmur) {
      return res.status(404).json({
        success: false,
        error: 'Murmur not found',
      });
    }

    // Get like count
    const likesCount = await LikeService.getLikeCount(murmurId);

    // Check if current user liked this murmur
    let isLikedByUser = false;
    if (req.user) {
      isLikedByUser = await LikeService.isUserLiked(req.user.id, murmurId);
    }

    return res.json({
      success: true,
      data: {
        murmur: {
          ...murmur,
          likesCount,
          isLikedByUser,
        },
      },
    });
  } catch (error) {
    console.error('Get murmur error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch murmur',
    });
  }
});

// Create murmur
router.post('/', authenticate, [
  body('content')
    .isLength({ min: 1, max: 280 })
    .withMessage('Content must be between 1 and 280 characters')
    .trim(),
], handleValidationErrors, async (req: AuthRequest, res: express.Response) => {
  try {
    const { content } = req.body;
    const userId = req.user.id;

    const murmur = await MurmurService.create(userId, content);

    // Update user's murmur count
    await UserService.updateCounts(userId, { murmursCount: 1 });

    return res.status(201).json({
      success: true,
      message: 'Murmur created successfully',
      data: {
        murmur: {
          ...murmur,
          likesCount: 0,
          isLikedByUser: false,
        },
      },
    });
  } catch (error) {
    console.error('Create murmur error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create murmur',
    });
  }
});

// Delete murmur
router.delete('/:id', authenticate, async (req: AuthRequest, res: express.Response) => {
  try {
    const murmurId = req.params.id;
    const userId = req.user.id;

    const murmur = await MurmurService.findById(murmurId);
    if (!murmur || murmur.userId !== userId) {
      return res.status(404).json({
        success: false,
        error: 'Murmur not found or you do not have permission to delete it',
      });
    }

    // Soft delete
    await MurmurService.softDelete(murmurId);

    // Update user's murmur count
    await UserService.updateCounts(userId, { murmursCount: -1 });

    // Delete associated likes
    await LikeService.deleteAllByMurmur(murmurId);

    return res.json({
      success: true,
      message: 'Murmur deleted successfully',
    });
  } catch (error) {
    console.error('Delete murmur error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete murmur',
    });
  }
});

// Like/unlike murmur
router.post('/:id/like', authenticate, async (req: AuthRequest, res: express.Response) => {
  try {
    const murmurId = req.params.id;
    const userId = req.user.id;

    // Check if murmur exists
    const murmur = await MurmurService.findById(murmurId);
    if (!murmur) {
      return res.status(404).json({
        success: false,
        error: 'Murmur not found',
      });
    }

    // Check if already liked
    const isLiked = await LikeService.isUserLiked(userId, murmurId);

    if (isLiked) {
      // Unlike
      await LikeService.unlike(userId, murmurId);

      return res.json({
        success: true,
        message: 'Murmur unliked',
        data: {
          isLiked: false,
          likesCount: Math.max(0, await LikeService.getLikeCount(murmurId)),
        },
      });
    } else {
      // Like
      await LikeService.like(userId, murmurId);

      return res.json({
        success: true,
        message: 'Murmur liked',
        data: {
          isLiked: true,
          likesCount: await LikeService.getLikeCount(murmurId),
        },
      });
    }
  } catch (error) {
    console.error('Like murmur error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to like/unlike murmur',
    });
  }
});

export default router;
