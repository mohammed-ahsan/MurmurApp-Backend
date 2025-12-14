"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FollowService = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class FollowService {
    static async create(followerId, followingId) {
        if (followerId === followingId) {
            throw new Error('Users cannot follow themselves');
        }
        return await prisma.follow.create({
            data: {
                followerId,
                followingId,
            },
        });
    }
    static async findByFollowerAndFollowing(followerId, followingId) {
        return await prisma.follow.findUnique({
            where: {
                followerId_followingId: {
                    followerId,
                    followingId,
                },
            },
        });
    }
    static async delete(followerId, followingId) {
        try {
            await prisma.follow.delete({
                where: {
                    followerId_followingId: {
                        followerId,
                        followingId,
                    },
                },
            });
            return true;
        }
        catch (error) {
            return false;
        }
    }
    static async getFollowers(userId, limit = 20, offset = 0) {
        const follows = await prisma.follow.findMany({
            where: {
                followingId: userId,
            },
            include: {
                follower: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatar: true,
                        followersCount: true,
                        followingCount: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: limit,
            skip: offset,
        });
        const followers = follows.map((follow) => follow.follower);
        const totalCount = await prisma.follow.count({
            where: {
                followingId: userId,
            },
        });
        return { followers, totalCount };
    }
    static async getFollowing(userId, limit = 20, offset = 0) {
        const follows = await prisma.follow.findMany({
            where: {
                followerId: userId,
            },
            include: {
                following: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatar: true,
                        followersCount: true,
                        followingCount: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: limit,
            skip: offset,
        });
        const following = follows.map((follow) => follow.following);
        const totalCount = await prisma.follow.count({
            where: {
                followerId: userId,
            },
        });
        return { following, totalCount };
    }
    static async isFollowing(followerId, followingId) {
        const follow = await this.findByFollowerAndFollowing(followerId, followingId);
        return !!follow;
    }
    static async getFollowCounts(userId) {
        const [followersCount, followingCount] = await Promise.all([
            prisma.follow.count({
                where: {
                    followingId: userId,
                },
            }),
            prisma.follow.count({
                where: {
                    followerId: userId,
                },
            }),
        ]);
        return { followersCount, followingCount };
    }
    static async getRecentFollowers(userId, limit = 10) {
        const follows = await prisma.follow.findMany({
            where: {
                followingId: userId,
            },
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
            orderBy: {
                createdAt: 'desc',
            },
            take: limit,
        });
        return follows.map((follow) => follow.follower);
    }
    static async getRecentFollowing(userId, limit = 10) {
        const follows = await prisma.follow.findMany({
            where: {
                followerId: userId,
            },
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
            orderBy: {
                createdAt: 'desc',
            },
            take: limit,
        });
        return follows.map((follow) => follow.following);
    }
    static async removeAllFollowsForUser(userId) {
        await Promise.all([
            prisma.follow.deleteMany({
                where: {
                    followerId: userId,
                },
            }),
            prisma.follow.deleteMany({
                where: {
                    followingId: userId,
                },
            }),
        ]);
    }
}
exports.FollowService = FollowService;
exports.default = FollowService;
//# sourceMappingURL=Follow.js.map