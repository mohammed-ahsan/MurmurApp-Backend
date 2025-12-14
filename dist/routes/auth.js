"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
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
router.post('/register', [
    (0, express_validator_1.body)('username')
        .isLength({ min: 3, max: 30 })
        .withMessage('Username must be between 3 and 30 characters')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username can only contain letters, numbers, and underscores'),
    (0, express_validator_1.body)('email')
        .isEmail()
        .withMessage('Please provide a valid email')
        .normalizeEmail(),
    (0, express_validator_1.body)('displayName')
        .isLength({ min: 1, max: 50 })
        .withMessage('Display name must be between 1 and 50 characters')
        .trim(),
    (0, express_validator_1.body)('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
], handleValidationErrors, async (req, res) => {
    try {
        const { username, email, displayName, password } = req.body;
        const existingUserByEmail = await User_1.default.findByEmail(email);
        const existingUserByUsername = await User_1.default.findByUsername(username);
        if (existingUserByEmail) {
            return res.status(409).json({
                success: false,
                error: 'Email already registered',
            });
        }
        if (existingUserByUsername) {
            return res.status(409).json({
                success: false,
                error: 'Username already taken',
            });
        }
        const user = await User_1.default.create({
            username,
            email,
            displayName,
            password,
        });
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            throw new Error('JWT_SECRET is not defined in environment variables');
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id }, jwtSecret, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
        await User_1.default.updateLastLogin(user.id);
        return res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                user,
                token,
            },
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({
            success: false,
            error: 'Registration failed',
        });
    }
});
router.post('/login', [
    (0, express_validator_1.body)('identifier')
        .notEmpty()
        .withMessage('Email or username is required'),
    (0, express_validator_1.body)('password')
        .notEmpty()
        .withMessage('Password is required'),
], handleValidationErrors, async (req, res) => {
    try {
        const { identifier, password } = req.body;
        const user = await User_1.default.findByEmailOrUsername(identifier);
        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials',
            });
        }
        const isPasswordValid = await User_1.default.verifyPassword(user, password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials',
            });
        }
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            throw new Error('JWT_SECRET is not defined in environment variables');
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id }, jwtSecret, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
        await User_1.default.updateLastLogin(user.id);
        const { password: _, ...userWithoutPassword } = user;
        return res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: userWithoutPassword,
                token,
            },
        });
    }
    catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({
            success: false,
            error: 'Login failed',
        });
    }
});
router.get('/me', auth_1.authenticate, async (req, res) => {
    try {
        return res.json({
            success: true,
            data: {
                user: req.user,
            },
        });
    }
    catch (error) {
        console.error('Get current user error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to get user information',
        });
    }
});
router.put('/me', auth_1.authenticate, [
    (0, express_validator_1.body)('displayName')
        .optional()
        .isLength({ min: 1, max: 50 })
        .withMessage('Display name must be between 1 and 50 characters')
        .trim(),
    (0, express_validator_1.body)('bio')
        .optional()
        .isLength({ max: 160 })
        .withMessage('Bio must be less than 160 characters')
        .trim(),
], handleValidationErrors, async (req, res) => {
    try {
        const { displayName, bio } = req.body;
        const userId = req.user.id;
        const user = await User_1.default.update(userId, {
            displayName,
            bio,
        });
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
            });
        }
        return res.json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                user,
            },
        });
    }
    catch (error) {
        console.error('Update profile error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to update profile',
        });
    }
});
router.put('/me/password', auth_1.authenticate, [
    (0, express_validator_1.body)('currentPassword')
        .notEmpty()
        .withMessage('Current password is required'),
    (0, express_validator_1.body)('newPassword')
        .isLength({ min: 8 })
        .withMessage('New password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number'),
], handleValidationErrors, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;
        const userWithPassword = await User_1.default.findByEmailOrUsername(req.user.email);
        if (!userWithPassword) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
            });
        }
        const isCurrentPasswordValid = await User_1.default.verifyPassword(userWithPassword, currentPassword);
        if (!isCurrentPasswordValid) {
            return res.status(401).json({
                success: false,
                error: 'Current password is incorrect',
            });
        }
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
        });
        return res.json({
            success: true,
            message: 'Password changed successfully',
        });
    }
    catch (error) {
        console.error('Change password error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to change password',
        });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map