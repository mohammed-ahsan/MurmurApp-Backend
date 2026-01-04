import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Type for Murmur model from Prisma
type Murmur = {
  id: string;
  userId: string;
  content: string;
  likesCount: number;
  repliesCount: number;
  retweetsCount: number;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: string;
    username: string;
    displayName: string;
    avatar: string | null;
  };
};

export interface IMurmurCreate {
  userId: string;
  content: string;
}

export class MurmurService {
  // Create a new murmur
  static async create(userId: string, content: string, replyToId?: string): Promise<Murmur> {
    return await prisma.murmur.create({
      data: {
        userId,
        content,
        ...(replyToId && { replyToId }),
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

  // Find murmur by ID
  static async findById(id: string): Promise<Murmur | null> {
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

  // Soft delete murmur
  static async softDelete(id: string): Promise<boolean> {
    try {
      await prisma.murmur.update({
        where: { id },
        data: { isDeleted: true },
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  // Get timeline murmurs (from followed users)
  static async getTimeline(userId: string, limit: number = 10, offset: number = 0): Promise<{
    murmurs: Murmur[];
    totalCount: number;
  }> {
    // Get users that the current user follows
    const follows = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });

    const followingIds = follows.map((f: any) => f.followingId);

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

  // Get public murmurs
  static async getPublicMurmurs(limit: number = 10, offset: number = 0): Promise<{
    murmurs: Murmur[];
    totalCount: number;
  }> {
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

  // Get user's murmurs
  static async getUserMurmurs(userId: string, limit: number = 10, offset: number = 0): Promise<{
    murmurs: Murmur[];
    totalCount: number;
  }> {
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

  // Update murmur content
  static async update(id: string, content: string): Promise<Murmur | null> {
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

  // Increment like count
  static async incrementLikesCount(id: string): Promise<boolean> {
    try {
      await prisma.murmur.update({
        where: { id },
        data: { likesCount: { increment: 1 } },
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  // Decrement like count
  static async decrementLikesCount(id: string): Promise<boolean> {
    try {
      await prisma.murmur.update({
        where: { id },
        data: { likesCount: { decrement: 1 } },
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  // Increment replies count
  static async incrementRepliesCount(id: string): Promise<boolean> {
    try {
      await prisma.murmur.update({
        where: { id },
        data: { repliesCount: { increment: 1 } },
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  // Decrement replies count
  static async decrementRepliesCount(id: string): Promise<boolean> {
    try {
      await prisma.murmur.update({
        where: { id },
        data: { repliesCount: { decrement: 1 } },
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  // Search murmurs by content
  static async search(query: string, limit: number = 20, offset: number = 0): Promise<{
    murmurs: Murmur[];
    totalCount: number;
  }> {
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

  // Get trending murmurs (by likes count)
  static async getTrending(limit: number = 10, offset: number = 0): Promise<{
    murmurs: Murmur[];
    totalCount: number;
  }> {
    const murmurs = await prisma.murmur.findMany({
      where: {
        isDeleted: false,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
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

  // Remove all murmurs for a user (when user is deleted)
  static async removeAllMurmursForUser(userId: string): Promise<void> {
    await prisma.murmur.updateMany({
      where: { userId },
      data: { isDeleted: true },
    });
  }
}

export default MurmurService;
