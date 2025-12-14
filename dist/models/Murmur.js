"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MurmurService = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class MurmurService {
    static async create(userId, content) {
        return await prisma.murmur.create({
            data: {
                userId,
                content,
            },
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
        });
    }
    static async findById(id) {
        return await prisma.murmur.findFirst({
            where: {
                id,
                isDeleted: false,
            },
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
        });
    }
    static async softDelete(id) {
        try {
            await prisma.murmur.update({
                where: { id },
                data: { isDeleted: true },
            });
            return true;
        }
        catch (error) {
            return false;
        }
    }
    static async getTimeline(userId, limit = 10, offset = 0) {
        const follows = await prisma.follow.findMany({
            where: { followerId: userId },
            select: { followingId: true },
        });
        const followingIds = follows.map((f) => f.followingId);
        followingIds.push(userId);
        const murmurs = await prisma.murmur.findMany({
            where: {
                userId: { in: followingIds },
                isDeleted: false,
            },
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
        const totalCount = await prisma.murmur.count({
            where: {
                userId: { in: followingIds },
                isDeleted: false,
            },
        });
        return { murmurs, totalCount };
    }
    static async getPublicMurmurs(limit = 10, offset = 0) {
        const murmurs = await prisma.murmur.findMany({
            where: { isDeleted: false },
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
        const totalCount = await prisma.murmur.count({
            where: { isDeleted: false },
        });
        return { murmurs, totalCount };
    }
    static async getUserMurmurs(userId, limit = 10, offset = 0) {
        const murmurs = await prisma.murmur.findMany({
            where: {
                userId,
                isDeleted: false,
            },
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
        const totalCount = await prisma.murmur.count({
            where: {
                userId,
                isDeleted: false,
            },
        });
        return { murmurs, totalCount };
    }
    static async update(id, content) {
        return await prisma.murmur.update({
            where: { id },
            data: { content },
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
        });
    }
    static async incrementLikesCount(id) {
        try {
            await prisma.murmur.update({
                where: { id },
                data: { likesCount: { increment: 1 } },
            });
            return true;
        }
        catch (error) {
            return false;
        }
    }
    static async decrementLikesCount(id) {
        try {
            await prisma.murmur.update({
                where: { id },
                data: { likesCount: { decrement: 1 } },
            });
            return true;
        }
        catch (error) {
            return false;
        }
    }
    static async incrementRepliesCount(id) {
        try {
            await prisma.murmur.update({
                where: { id },
                data: { repliesCount: { increment: 1 } },
            });
            return true;
        }
        catch (error) {
            return false;
        }
    }
    static async decrementRepliesCount(id) {
        try {
            await prisma.murmur.update({
                where: { id },
                data: { repliesCount: { decrement: 1 } },
            });
            return true;
        }
        catch (error) {
            return false;
        }
    }
    static async search(query, limit = 20, offset = 0) {
        const murmurs = await prisma.murmur.findMany({
            where: {
                isDeleted: false,
                content: {
                    contains: query,
                    mode: 'insensitive',
                },
            },
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
        const totalCount = await prisma.murmur.count({
            where: {
                isDeleted: false,
                content: {
                    contains: query,
                    mode: 'insensitive',
                },
            },
        });
        return { murmurs, totalCount };
    }
    static async getTrending(limit = 10, offset = 0) {
        const murmurs = await prisma.murmur.findMany({
            where: {
                isDeleted: false,
                createdAt: {
                    gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
                },
            },
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
            orderBy: { likesCount: 'desc' },
            take: limit,
            skip: offset,
        });
        const totalCount = await prisma.murmur.count({
            where: {
                isDeleted: false,
                createdAt: {
                    gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
                },
            },
        });
        return { murmurs, totalCount };
    }
    static async removeAllMurmursForUser(userId) {
        await prisma.murmur.updateMany({
            where: { userId },
            data: { isDeleted: true },
        });
    }
}
exports.MurmurService = MurmurService;
exports.default = MurmurService;
//# sourceMappingURL=Murmur.js.map