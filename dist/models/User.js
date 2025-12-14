"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
class UserService {
    static async create(userData) {
        const hashedPassword = await bcryptjs_1.default.hash(userData.password, 12);
        const user = await prisma.user.create({
            data: {
                ...userData,
                password: hashedPassword,
            },
        });
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }
    static async findById(id) {
        const user = await prisma.user.findUnique({
            where: { id },
        });
        if (!user)
            return null;
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }
    static async findByEmail(email) {
        const user = await prisma.user.findUnique({
            where: { email },
        });
        if (!user)
            return null;
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }
    static async findByUsername(username) {
        const user = await prisma.user.findUnique({
            where: { username },
        });
        if (!user)
            return null;
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }
    static async findByEmailOrUsername(identifier) {
        return await prisma.user.findFirst({
            where: {
                OR: [
                    { email: identifier.toLowerCase() },
                    { username: identifier }
                ]
            },
        });
    }
    static async update(id, userData) {
        const user = await prisma.user.update({
            where: { id },
            data: userData,
        });
        if (!user)
            return null;
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }
    static async delete(id) {
        try {
            await prisma.user.delete({
                where: { id },
            });
            return true;
        }
        catch (error) {
            return false;
        }
    }
    static async updateLastLogin(id) {
        await prisma.user.update({
            where: { id },
            data: { lastLogin: new Date() },
        });
    }
    static async updateCounts(id, counts) {
        await prisma.user.update({
            where: { id },
            data: counts,
        });
    }
    static async search(query, limit = 20, offset = 0) {
        const users = await prisma.user.findMany({
            where: {
                OR: [
                    { username: { contains: query, mode: 'insensitive' } },
                    { displayName: { contains: query, mode: 'insensitive' } }
                ],
                isActive: true,
            },
            select: {
                id: true,
                username: true,
                email: true,
                displayName: true,
                avatar: true,
                bio: true,
                followersCount: true,
                followingCount: true,
                murmursCount: true,
                isActive: true,
                lastLogin: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: { followersCount: 'desc' },
            take: limit,
            skip: offset,
        });
        return users;
    }
    static async getWithRelations(id) {
        const user = await prisma.user.findUnique({
            where: { id },
            include: {
                murmurs: {
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                },
                followers: {
                    take: 10,
                    include: {
                        follower: {
                            select: {
                                id: true,
                                username: true,
                                displayName: true,
                                avatar: true,
                            },
                        },
                    },
                },
                following: {
                    take: 10,
                    include: {
                        following: {
                            select: {
                                id: true,
                                username: true,
                                displayName: true,
                                avatar: true,
                            },
                        },
                    },
                },
            },
        });
        if (!user)
            return null;
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }
    static async verifyPassword(user, candidatePassword) {
        return bcryptjs_1.default.compare(candidatePassword, user.password);
    }
}
exports.UserService = UserService;
exports.default = UserService;
//# sourceMappingURL=User.js.map