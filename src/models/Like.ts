import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Type for Like model from Prisma
type Like = {
  id: string;
  userId: string;
  murmurId: string;
  createdAt: Date;
};

export interface ILikeCreate {
  userId: string;
  murmurId: string;
}

export class LikeService {
  // Create a like
  static async create(userId: string, murmurId: string): Promise<Like> {
    return await prisma.like.create({
      data: {
        userId,
        murmurId,
      },
    });
  }

  // Find like by user and murmur
  static async findByUserAndMurmur(userId: string, murmurId: string): Promise<Like | null> {
    return await prisma.like.findUnique({
      where: {
        userId_murmurId: {
          userId,
          murmurId,
        },
      },
    });
  }

  // Delete a like
  static async delete(userId: string, murmurId: string): Promise<boolean> {
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
    } catch (error) {
      return false;
    }
  }

  // Like a murmur (wrapper method)
  static async like(userId: string, murmurId: string): Promise<Like> {
    return await this.create(userId, murmurId);
  }

  // Unlike a murmur (wrapper method)
  static async unlike(userId: string, murmurId: string): Promise<boolean> {
    return await this.delete(userId, murmurId);
  }

  // Check if user liked a murmur
  static async isUserLiked(userId: string, murmurId: string): Promise<boolean> {
    const like = await this.findByUserAndMurmur(userId, murmurId);
    return !!like;
  }

  // Get like count for a murmur
  static async getLikeCount(murmurId: string): Promise<number> {
    return await prisma.like.count({
      where: { murmurId },
    });
  }

  // Get likes for a murmur (with user details)
  static async getLikesByMurmur(murmurId: string, limit: number = 20, offset: number = 0): Promise<{
    likes: Like[];
    totalCount: number;
  }> {
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

  // Get likes by user
  static async getLikesByUser(userId: string, limit: number = 20, offset: number = 0): Promise<{
    likes: Like[];
    totalCount: number;
  }> {
    const likes = await prisma.like.findMany({
      where: {
        userId,
        murmur: {
          replyToId: null,
          isDeleted: false,
        },
      },
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
      where: {
        userId,
        murmur: {
          replyToId: null,
          isDeleted: false,
        },
      },
    });

    return { likes, totalCount };
  }

  // Get recent likes for a murmur
  static async getRecentLikes(murmurId: string, limit: number = 10): Promise<Like[]> {
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

  // Delete all likes for a murmur (when murmur is deleted)
  static async deleteAllByMurmur(murmurId: string): Promise<void> {
    await prisma.like.deleteMany({
      where: { murmurId },
    });
  }

  // Delete all likes for a user (when user is deleted)
  static async deleteAllByUser(userId: string): Promise<void> {
    await prisma.like.deleteMany({
      where: { userId },
    });
  }

  // Get like statistics
  static async getLikeStats(murmurId: string): Promise<{
    totalLikes: number;
    recentLikes: number;
  }> {
    const [totalLikes, recentLikes] = await Promise.all([
      prisma.like.count({
        where: { murmurId },
      }),
      prisma.like.count({
        where: {
          murmurId,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      }),
    ]);

    return { totalLikes, recentLikes };
  }

  // Check if multiple users liked a murmur
  static async areUsersLiked(userIds: string[], murmurId: string): Promise<Record<string, boolean>> {
    const likes = await prisma.like.findMany({
      where: {
        userId: { in: userIds },
        murmurId,
      },
      select: { userId: true },
    });

    const likedMap: Record<string, boolean> = {};
    userIds.forEach(id => {
      likedMap[id] = false;
    });

    likes.forEach((like: any) => {
      likedMap[like.userId] = true;
    });

    return likedMap;
  }

  // Get users who liked multiple murmurs
  static async getUsersWhoLikedMurmurs(murmurIds: string[]): Promise<Record<string, string[]>> {
    const likes = await prisma.like.findMany({
      where: {
        murmurId: { in: murmurIds },
      },
      select: {
        murmurId: true,
        userId: true,
      },
    });

    const likedUsersMap: Record<string, string[]> = {};
    murmurIds.forEach(id => {
      likedUsersMap[id] = [];
    });

    likes.forEach((like: any) => {
      const murmurId = like.murmurId;
      if (likedUsersMap[murmurId]) {
        likedUsersMap[murmurId].push(like.userId);
      }
    });

    return likedUsersMap;
  }
}

export default LikeService;
