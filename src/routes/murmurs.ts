import express from 'express';
import { body, query, validationResult } from 'express-validator';
import MurmurService from '../models/Murmur';
import LikeService from '../models/Like';
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

    // Get murmurs from followed users (excluding current user's own murmurs)
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
router.get('/', optionalAuth, [
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

    // Exclude current user's murmurs if authenticated
    const excludeUserId = req.user?.id;
    const { murmurs, totalCount } = await MurmurService.getPublicMurmurs(limit, offset, excludeUserId);

    // Get like counts
    const murmurIds = murmurs.map((m: any) => m.id);
    const likeCounts = await Promise.all(
      murmurIds.map((id: string) => LikeService.getLikeCount(id))
    );

    // Check if current user liked each murmur (if authenticated)
    let userLikes: boolean[] = [];
    if (req.user) {
      userLikes = await Promise.all(
        murmurIds.map((id: string) => LikeService.isUserLiked(req.user.id, id))
      );
    }

    // Format response
    const formattedMurmurs = murmurs.map((murmur: any, index: number) => ({
      ...murmur,
      likesCount: likeCounts[index],
      isLikedByUser: req.user ? userLikes[index] : false,
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

// Get user's liked murmurs - This must come before user/:userId route
router.get('/user/:userId/likes', authenticate, [
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
    const userId = req.params.userId;
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
    }
    
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

    // Get user's likes
    const { likes, totalCount } = await LikeService.getLikesByUser(userId, limit, offset);

    // Extract murmurs from likes
    const murmurs = likes.map((like: any) => like.murmur).filter((murmur: any) => murmur && !murmur.isDeleted);

    // Get like counts and check if current user liked each murmur
    const murmurIds = murmurs.map((m: any) => m.id);
    const likeCounts = await Promise.all(
      murmurIds.map((id: string) => LikeService.getLikeCount(id))
    );

    const currentUserId = req.user.id;
    const userLikes = await Promise.all(
      murmurIds.map((id: string) => LikeService.isUserLiked(currentUserId, id))
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
          totalCount: murmurs.length,
          totalPages: Math.ceil(totalCount / limit),
          hasNextPage: page * limit < totalCount,
          hasPreviousPage: page > 1,
        },
      },
    });
  } catch (error) {
    console.error('Get user liked murmurs error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch user liked murmurs',
    });
  }
});

// Get user's murmurs - This must come before /:id route
router.get('/user/:userId', optionalAuth, [
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
    const userId = req.params.userId;
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
    }
    
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

    // Check if current user liked each murmur (if authenticated)
    let userLikes: boolean[] = [];
    if (req.user) {
      userLikes = await Promise.all(
        murmurIds.map((id: string) => LikeService.isUserLiked(req.user.id, id))
      );
    }

    // Format response
    const formattedMurmurs = murmurs.map((murmur: any, index: number) => ({
      ...murmur,
      likesCount: likeCounts[index],
      isLikedByUser: req.user ? userLikes[index] : false,
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
    if (!murmurId) {
      return res.status(400).json({
        success: false,
        error: 'Murmur ID is required',
      });
    }

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
  body('replyToId')
    .optional()
    .isString()
    .withMessage('Reply to ID must be a string'),
], handleValidationErrors, async (req: AuthRequest, res: express.Response) => {
  try {
    const { content, replyToId } = req.body;
    const userId = req.user.id;

    // If it's a reply, check if the parent murmur exists
    if (replyToId) {
      const parentMurmur = await MurmurService.findById(replyToId);
      if (!parentMurmur) {
        return res.status(404).json({
          success: false,
          error: 'Parent murmur not found',
        });
      }
    }

    const murmur = await MurmurService.create(userId, content, replyToId);

    // Update user's murmur count only if it's not a reply
    if (!replyToId) {
      await UserService.updateCounts(userId, { murmursCount: 1 });
    }

    // If it's a reply, create notification for the parent murmur author and increment reply count
    if (replyToId) {
      const parentMurmur = await MurmurService.findById(replyToId);
      if (parentMurmur) {
        await NotificationService.create('reply', parentMurmur.userId, userId, replyToId);
        await MurmurService.incrementRepliesCount(replyToId);
      }
    }

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
    if (!murmurId) {
      return res.status(400).json({
        success: false,
        error: 'Murmur ID is required',
      });
    }
    
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

    // Update user's murmur count only if it's not a reply
    if (!murmur.replyToId) {
      await UserService.updateCounts(userId, { murmursCount: -1 });
    } else {
      // If it's a reply, decrement the parent murmur's reply count
      await MurmurService.decrementRepliesCount(murmur.replyToId);
    }

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

// Get replies for a murmur
router.get('/:id/replies', optionalAuth, [
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
    const murmurId = req.params.id;
    if (!murmurId) {
      return res.status(400).json({
        success: false,
        error: 'Murmur ID is required',
      });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    const userId = req.user?.id;

    // Get replies
    const { replies, totalCount } = await MurmurService.getReplies(murmurId, limit, offset);

    // Get like counts and user's likes for each reply
    const replyIds = replies.map((r: any) => r.id);
    const likeCounts = await Promise.all(
      replyIds.map((id: string) => LikeService.getLikeCount(id))
    );

    const userLikes = userId ? await Promise.all(
      replyIds.map((id: string) => LikeService.isUserLiked(userId, id))
    ) : replyIds.map(() => false);

    // Format response
    const formattedReplies = replies.map((reply: any, index: number) => ({
      ...reply,
      likesCount: likeCounts[index],
      isLikedByUser: userLikes[index],
    }));

    return res.json({
      success: true,
      data: {
        replies: formattedReplies,
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
    console.error('Get replies error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch replies',
    });
  }
});

// Like/unlike murmur
router.post('/:id/like', authenticate, async (req: AuthRequest, res: express.Response) => {
  try {
    const murmurId = req.params.id;
    if (!murmurId) {
      return res.status(400).json({
        success: false,
        error: 'Murmur ID is required',
      });
    }
    
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

      // Create notification for the murmur author
      await NotificationService.create('like', murmur.userId, userId, murmurId);

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
