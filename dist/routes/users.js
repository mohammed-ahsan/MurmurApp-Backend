"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const User_1 = __importDefault(require("../models/User"));
const Follow_1 = __importDefault(require("../models/Follow"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
const handleValidationErrors = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: errors.array(),
        });
    }
    return next();
};
router.get('/:userId', auth_1.optionalAuth, async (req, res) => {
    try {
        const userId = req.params.userId;
        const user = await User_1.default.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
            });
        }
        let isFollowing = false;
        if (req.user) {
            const follow = await Follow_1.default.findByFollowerAndFollowing(req.user.id, userId);
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
    }
    catch (error) {
        console.error('Get user profile error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch user profile',
        });
    }
});
router.post('/:userId/follow', auth_1.authenticate, async (req, res) => {
    try {
        const targetUserId = req.params.userId;
        const currentUserId = req.user.id;
        const targetUser = await User_1.default.findById(targetUserId);
        if (!targetUser) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
            });
        }
        const existingFollow = await Follow_1.default.findByFollowerAndFollowing(currentUserId, targetUserId);
        if (existingFollow) {
            return res.status(409).json({
                success: false,
                error: 'Already following this user',
            });
        }
        await Follow_1.default.create(currentUserId, targetUserId);
        await Promise.all([
            User_1.default.updateCounts(currentUserId, { followingCount: 1 }),
            User_1.default.updateCounts(targetUserId, { followersCount: 1 }),
        ]);
        return res.json({
            success: true,
            message: 'User followed successfully',
            data: {
                isFollowing: true,
                followersCount: targetUser.followersCount + 1,
            },
        });
    }
    catch (error) {
        console.error('Follow user error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to follow user',
        });
    }
});
router.delete('/:userId/follow', auth_1.authenticate, async (req, res) => {
    try {
        const targetUserId = req.params.userId;
        const currentUserId = req.user.id;
        const targetUser = await User_1.default.findById(targetUserId);
        if (!targetUser) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
            });
        }
        const follow = await Follow_1.default.findByFollowerAndFollowing(currentUserId, targetUserId);
        if (!follow) {
            return res.status(409).json({
                success: false,
                error: 'Not following this user',
            });
        }
        await Follow_1.default.delete(currentUserId, targetUserId);
        await Promise.all([
            User_1.default.updateCounts(currentUserId, { followingCount: -1 }),
            User_1.default.updateCounts(targetUserId, { followersCount: -1 }),
        ]);
        return res.json({
            success: true,
            message: 'User unfollowed successfully',
            data: {
                isFollowing: false,
                followersCount: Math.max(0, targetUser.followersCount - 1),
            },
        });
    }
    catch (error) {
        console.error('Unfollow user error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to unfollow user',
        });
    }
});
router.get('/:userId/followers', [
    (0, express_validator_1.query)('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('limit')
        .optional()
        .isInt({ min: 1, max: 50 })
        .withMessage('Limit must be between 1 and 50'),
], handleValidationErrors, async (req, res) => {
    try {
        const userId = req.params.userId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const user = await User_1.default.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
            });
        }
        const { followers, totalCount } = await Follow_1.default.getFollowers(userId, limit, skip);
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
    }
    catch (error) {
        console.error('Get followers error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch followers',
        });
    }
});
router.get('/:userId/following', [
    (0, express_validator_1.query)('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('limit')
        .optional()
        .isInt({ min: 1, max: 50 })
        .withMessage('Limit must be between 1 and 50'),
], handleValidationErrors, async (req, res) => {
    try {
        const userId = req.params.userId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const user = await User_1.default.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
            });
        }
        const { following, totalCount } = await Follow_1.default.getFollowing(userId, limit, skip);
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
    }
    catch (error) {
        console.error('Get following error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch following',
        });
    }
});
router.get('/search/:query', [
    (0, express_validator_1.query)('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('limit')
        .optional()
        .isInt({ min: 1, max: 50 })
        .withMessage('Limit must be between 1 and 50'),
], handleValidationErrors, async (req, res) => {
    try {
        const query = req.params.query;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const users = await User_1.default.search(query, limit, skip);
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
    }
    catch (error) {
        console.error('Search users error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to search users',
        });
    }
});
exports.default = router;
//# sourceMappingURL=users.js.map