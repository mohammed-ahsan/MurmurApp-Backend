import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class NotificationService {
  static async create(
    type: 'like' | 'follow' | 'reply',
    userId: string,
    actorId: string,
    murmurId?: string
  ) {
    // Don't create notification if user is acting on their own content
    if (userId === actorId) {
      return null;
    }

    // Check if notification already exists (to avoid duplicates)
    const existing = await prisma.notification.findFirst({
      where: {
        type,
        userId,
        actorId,
        ...(murmurId && { murmurId }),
      },
    });

    if (existing) {
      return existing;
    }

    const includeConfig: any = {
      actor: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatar: true,
        },
      },
    };

    if (murmurId) {
      includeConfig.murmur = {
        select: {
          id: true,
          content: true,
        },
      };
    }

    return await prisma.notification.create({
      data: {
        type,
        userId,
        actorId,
        ...(murmurId && { murmurId }),
      },
      include: includeConfig,
    });
  }

  static async getUserNotifications(
    userId: string,
    limit: number = 20,
    cursor?: string
  ) {
    const notifications = await prisma.notification.findMany({
      where: {
        userId,
      },
      include: {
        actor: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            bio: true,
            followersCount: true,
            followingCount: true,
            murmursCount: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        murmur: {
          select: {
            id: true,
            content: true,
            userId: true,
            likesCount: true,
            repliesCount: true,
            retweetsCount: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit + 1,
      ...(cursor && {
        cursor: {
          id: cursor,
        },
        skip: 1,
      }),
    });

    const hasMore = notifications.length > limit;
    const results = hasMore ? notifications.slice(0, -1) : notifications;

    return {
      notifications: results,
      hasMore,
      nextCursor: hasMore && results.length > 0 ? results[results.length - 1]?.id || null : null,
    };
  }

  static async markAsRead(notificationId: string, userId: string) {
    return await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId,
      },
      data: {
        isRead: true,
      },
    });
  }

  static async markAllAsRead(userId: string) {
    return await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });
  }

  static async getUnreadCount(userId: string) {
    return await prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  static async delete(notificationId: string, userId: string) {
    return await prisma.notification.deleteMany({
      where: {
        id: notificationId,
        userId,
      },
    });
  }
}

export default NotificationService;
