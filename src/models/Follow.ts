import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Type for Follow model from Prisma
type Follow = {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: Date;
};

export interface IFollowCreate {
  followerId: string;
  followingId: string;
}

export class FollowService {
  // Create a follow relationship
  static async create(followerId: string, followingId: string): Promise<Follow> {
    // Prevent self-follow
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

  // Find follow by follower and following
  static async findByFollowerAndFollowing(followerId: string, followingId: string): Promise<Follow | null> {
    return await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });
  }

  // Delete follow relationship
  static async delete(followerId: string, followingId: string): Promise<boolean> {
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
    } catch (error) {
      return false;
    }
  }

  // Get followers of a user
  static async getFollowers(userId: string, limit: number = 20, offset: number = 0): Promise<{
    followers: any[];
    totalCount: number;
  }> {
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

    const followers = follows.map((follow: any) => follow.follower);
    const totalCount = await prisma.follow.count({
      where: {
        followingId: userId,
      },
    });

    return { followers, totalCount };
  }

  // Get users that a user is following
  static async getFollowing(userId: string, limit: number = 20, offset: number = 0): Promise<{
    following: any[];
    totalCount: number;
  }> {
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

    const following = follows.map((follow: any) => follow.following);
    const totalCount = await prisma.follow.count({
      where: {
        followerId: userId,
      },
    });

    return { following, totalCount };
  }

  // Check if user is following another user
  static async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const follow = await this.findByFollowerAndFollowing(followerId, followingId);
    return !!follow;
  }

  // Get follow count for a user
  static async getFollowCounts(userId: string): Promise<{
    followersCount: number;
    followingCount: number;
  }> {
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

  // Get recent followers
  static async getRecentFollowers(userId: string, limit: number = 10): Promise<any[]> {
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

    return follows.map((follow: any) => follow.follower);
  }

  // Get recent following
  static async getRecentFollowing(userId: string, limit: number = 10): Promise<any[]> {
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

    return follows.map((follow: any) => follow.following);
  }

  // Remove all follows for a user (when user is deleted)
  static async removeAllFollowsForUser(userId: string): Promise<void> {
    await Promise.all([
      // Remove all follows where user is the follower
      prisma.follow.deleteMany({
        where: {
          followerId: userId,
        },
      }),
      // Remove all follows where user is being followed
      prisma.follow.deleteMany({
        where: {
          followingId: userId,
        },
      }),
    ]);
  }
}

export default FollowService;
