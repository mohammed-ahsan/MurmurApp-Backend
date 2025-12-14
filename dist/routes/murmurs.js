"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const Murmur_1 = __importDefault(require("../models/Murmur"));
const Like_1 = __importDefault(require("../models/Like"));
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
router.get('/timeline', auth_1.authenticate, [
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
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const userId = req.user.id;
        const { following } = await Follow_1.default.getFollowing(userId, 1000, 0);
        const followingIds = following.map((user) => user.id);
        followingIds.push(userId);
        const { murmurs, totalCount } = await Murmur_1.default.getTimeline(userId, limit, offset);
        const murmurIds = murmurs.map((m) => m.id);
        const likeCounts = await Promise.all(murmurIds.map((id) => Like_1.default.getLikeCount(id)));
        const userLikes = await Promise.all(murmurIds.map((id) => Like_1.default.isUserLiked(userId, id)));
        const formattedMurmurs = murmurs.map((murmur, index) => ({
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
    }
    catch (error) {
        console.error('Get timeline error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch timeline',
        });
    }
});
router.get('/', [
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
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const { murmurs, totalCount } = await Murmur_1.default.getPublicMurmurs(limit, offset);
        const murmurIds = murmurs.map((m) => m.id);
        const likeCounts = await Promise.all(murmurIds.map((id) => Like_1.default.getLikeCount(id)));
        const formattedMurmurs = murmurs.map((murmur, index) => ({
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
    }
    catch (error) {
        console.error('Get murmurs error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch murmurs',
        });
    }
});
router.get('/:id', auth_1.optionalAuth, async (req, res) => {
    try {
        const murmurId = req.params.id;
        const murmur = await Murmur_1.default.findById(murmurId);
        if (!murmur) {
            return res.status(404).json({
                success: false,
                error: 'Murmur not found',
            });
        }
        const likesCount = await Like_1.default.getLikeCount(murmurId);
        let isLikedByUser = false;
        if (req.user) {
            isLikedByUser = await Like_1.default.isUserLiked(req.user.id, murmurId);
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
    }
    catch (error) {
        console.error('Get murmur error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch murmur',
        });
    }
});
router.post('/', auth_1.authenticate, [
    (0, express_validator_1.body)('content')
        .isLength({ min: 1, max: 280 })
        .withMessage('Content must be between 1 and 280 characters')
        .trim(),
], handleValidationErrors, async (req, res) => {
    try {
        const { content } = req.body;
        const userId = req.user.id;
        const murmur = await Murmur_1.default.create(userId, content);
        await User_1.default.updateCounts(userId, { murmursCount: 1 });
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
    }
    catch (error) {
        console.error('Create murmur error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to create murmur',
        });
    }
});
router.delete('/:id', auth_1.authenticate, async (req, res) => {
    try {
        const murmurId = req.params.id;
        const userId = req.user.id;
        const murmur = await Murmur_1.default.findById(murmurId);
        if (!murmur || murmur.userId !== userId) {
            return res.status(404).json({
                success: false,
                error: 'Murmur not found or you do not have permission to delete it',
            });
        }
        await Murmur_1.default.softDelete(murmurId);
        await User_1.default.updateCounts(userId, { murmursCount: -1 });
        await Like_1.default.deleteAllByMurmur(murmurId);
        return res.json({
            success: true,
            message: 'Murmur deleted successfully',
        });
    }
    catch (error) {
        console.error('Delete murmur error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to delete murmur',
        });
    }
});
router.post('/:id/like', auth_1.authenticate, async (req, res) => {
    try {
        const murmurId = req.params.id;
        const userId = req.user.id;
        const murmur = await Murmur_1.default.findById(murmurId);
        if (!murmur) {
            return res.status(404).json({
                success: false,
                error: 'Murmur not found',
            });
        }
        const isLiked = await Like_1.default.isUserLiked(userId, murmurId);
        if (isLiked) {
            await Like_1.default.unlike(userId, murmurId);
            return res.json({
                success: true,
                message: 'Murmur unliked',
                data: {
                    isLiked: false,
                    likesCount: Math.max(0, await Like_1.default.getLikeCount(murmurId)),
                },
            });
        }
        else {
            await Like_1.default.like(userId, murmurId);
            return res.json({
                success: true,
                message: 'Murmur liked',
                data: {
                    isLiked: true,
                    likesCount: await Like_1.default.getLikeCount(murmurId),
                },
            });
        }
    }
    catch (error) {
        console.error('Like murmur error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to like/unlike murmur',
        });
    }
});
router.get('/user/:userId', [
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
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const user = await User_1.default.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
            });
        }
        const { murmurs, totalCount } = await Murmur_1.default.getUserMurmurs(userId, limit, offset);
        const murmurIds = murmurs.map((m) => m.id);
        const likeCounts = await Promise.all(murmurIds.map((id) => Like_1.default.getLikeCount(id)));
        const formattedMurmurs = murmurs.map((murmur, index) => ({
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
    }
    catch (error) {
        console.error('Get user murmurs error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch user murmurs',
        });
    }
});
exports.default = router;
//# sourceMappingURL=murmurs.js.map