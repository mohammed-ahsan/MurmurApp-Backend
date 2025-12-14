import { PrismaClient, User } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export interface IUserCreate {
  username: string;
  email: string;
  displayName: string;
  password: string;
  avatar?: string;
  bio?: string;
}

export interface IUserUpdate {
  username?: string;
  email?: string;
  displayName?: string;
  avatar?: string;
  bio?: string;
}

export class UserService {
  // Create a new user
  static async create(userData: IUserCreate): Promise<Omit<User, 'password'>> {
    const hashedPassword = await bcrypt.hash(userData.password, 12);
    
    const user = await prisma.user.create({
      data: {
        ...userData,
        password: hashedPassword,
      },
    });

    // Remove password from response
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  // Find user by ID
  static async findById(id: string): Promise<Omit<User, 'password'> | null> {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) return null;

    // Remove password from response
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  // Find user by email
  static async findByEmail(email: string): Promise<Omit<User, 'password'> | null> {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) return null;

    // Remove password from response
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  // Find user by username
  static async findByUsername(username: string): Promise<Omit<User, 'password'> | null> {
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) return null;

    // Remove password from response
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  // Find user by email or username (for login)
  static async findByEmailOrUsername(identifier: string): Promise<User | null> {
    return await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase() },
          { username: identifier }
        ]
      },
    });
  }

  // Update user
  static async update(id: string, userData: IUserUpdate): Promise<Omit<User, 'password'> | null> {
    const user = await prisma.user.update({
      where: { id },
      data: userData,
    });

    if (!user) return null;

    // Remove password from response
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  // Delete user
  static async delete(id: string): Promise<boolean> {
    try {
      await prisma.user.delete({
        where: { id },
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  // Update last login
  static async updateLastLogin(id: string): Promise<void> {
    await prisma.user.update({
      where: { id },
      data: { lastLogin: new Date() },
    });
  }

  // Update user counts
  static async updateCounts(id: string, counts: {
    followersCount?: number;
    followingCount?: number;
    murmursCount?: number;
  }): Promise<void> {
    await prisma.user.update({
      where: { id },
      data: counts,
    });
  }

  // Search users
  static async search(query: string, limit: number = 20, offset: number = 0): Promise<Omit<User, 'password'>[]> {
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

  // Get user with relations
  static async getWithRelations(id: string): Promise<Omit<User, 'password'> | null> {
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

    if (!user) return null;

    // Remove password from response
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  // Verify password
  static async verifyPassword(user: User, candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, user.password);
  }
}

export default UserService;
