"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LikeService = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class LikeService {
    static async create(userId, murmurId) {
        return await prisma.like.create({
            data: {
                userId,
                murmurId,
            },
        });
    }
    static async findByUserAndMurmur(userId, murmurId) {
        return await prisma.like.findUnique({
            where: {
                userId_murmurId: {
                    userId,
                    murmurId,
                },
            },
        });
    }
    static async delete(userId, murmurId) {
        try {
            await prisma.like.delete({
                where: {
                    userId_murmurId: {
                        userId,
                        murmurId,
                    },
                },
            });
            return true;
        }
        catch (error) {
            return false;
        }
    }
    static async like(userId, murmurId) {
        return await this.create(userId, murmurId);
    }
    static async unlike(userId, murmurId) {
        return await this.delete(userId, murmurId);
    }
    static async isUserLiked(userId, murmurId) {
        const like = await this.findByUserAndMurmur(userId, murmurId);
        return !!like;
    }
    static async getLikeCount(murmurId) {
        return await prisma.like.count({
            where: { murmurId },
        });
    }
    static async getLikesByMurmur(murmurId, limit = 20, offset = 0) {
        const likes = await prisma.like.findMany({
            where: { murmurId },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatar: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
        });
        const totalCount = await prisma.like.count({
            where: { murmurId },
        });
        return { likes, totalCount };
    }
    static async getLikesByUser(userId, limit = 20, offset = 0) {
        const likes = await prisma.like.findMany({
            where: { userId },
            include: {
                murmur: {
                    include: {
                        user: {
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
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
        });
        const totalCount = await prisma.like.count({
            where: { userId },
        });
        return { likes, totalCount };
    }
    static async getRecentLikes(murmurId, limit = 10) {
        return await prisma.like.findMany({
            where: { murmurId },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatar: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }
    static async deleteAllByMurmur(murmurId) {
        await prisma.like.deleteMany({
            where: { murmurId },
        });
    }
    static async deleteAllByUser(userId) {
        await prisma.like.deleteMany({
            where: { userId },
        });
    }
    static async getLikeStats(murmurId) {
        const [totalLikes, recentLikes] = await Promise.all([
            prisma.like.count({
                where: { murmurId },
            }),
            prisma.like.count({
                where: {
                    murmurId,
                    createdAt: {
                        gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
                    },
                },
            }),
        ]);
        return { totalLikes, recentLikes };
    }
    static async areUsersLiked(userIds, murmurId) {
        const likes = await prisma.like.findMany({
            where: {
                userId: { in: userIds },
                murmurId,
            },
            select: { userId: true },
        });
        const likedMap = {};
        userIds.forEach(id => {
            likedMap[id] = false;
        });
        likes.forEach((like) => {
            likedMap[like.userId] = true;
        });
        return likedMap;
    }
    static async getUsersWhoLikedMurmurs(murmurIds) {
        const likes = await prisma.like.findMany({
            where: {
                murmurId: { in: murmurIds },
            },
            select: {
                murmurId: true,
                userId: true,
            },
        });
        const likedUsersMap = {};
        murmurIds.forEach(id => {
            likedUsersMap[id] = [];
        });
        likes.forEach((like) => {
            if (likedUsersMap[like.murmurId]) {
                likedUsersMap[like.murmurId].push(like.userId);
            }
        });
        return likedUsersMap;
    }
}
exports.LikeService = LikeService;
exports.default = LikeService;
//# sourceMappingURL=Like.js.map