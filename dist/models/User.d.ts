import { User } from '@prisma/client';
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
export declare class UserService {
    static create(userData: IUserCreate): Promise<Omit<User, 'password'>>;
    static findById(id: string): Promise<Omit<User, 'password'> | null>;
    static findByEmail(email: string): Promise<Omit<User, 'password'> | null>;
    static findByUsername(username: string): Promise<Omit<User, 'password'> | null>;
    static findByEmailOrUsername(identifier: string): Promise<User | null>;
    static update(id: string, userData: IUserUpdate): Promise<Omit<User, 'password'> | null>;
    static delete(id: string): Promise<boolean>;
    static updateLastLogin(id: string): Promise<void>;
    static updateCounts(id: string, counts: {
        followersCount?: number;
        followingCount?: number;
        murmursCount?: number;
    }): Promise<void>;
    static search(query: string, limit?: number, offset?: number): Promise<Omit<User, 'password'>[]>;
    static getWithRelations(id: string): Promise<Omit<User, 'password'> | null>;
    static verifyPassword(user: User, candidatePassword: string): Promise<boolean>;
}
export default UserService;
//# sourceMappingURL=User.d.ts.map