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
export declare class FollowService {
    static create(followerId: string, followingId: string): Promise<Follow>;
    static findByFollowerAndFollowing(followerId: string, followingId: string): Promise<Follow | null>;
    static delete(followerId: string, followingId: string): Promise<boolean>;
    static getFollowers(userId: string, limit?: number, offset?: number): Promise<{
        followers: any[];
        totalCount: number;
    }>;
    static getFollowing(userId: string, limit?: number, offset?: number): Promise<{
        following: any[];
        totalCount: number;
    }>;
    static isFollowing(followerId: string, followingId: string): Promise<boolean>;
    static getFollowCounts(userId: string): Promise<{
        followersCount: number;
        followingCount: number;
    }>;
    static getRecentFollowers(userId: string, limit?: number): Promise<any[]>;
    static getRecentFollowing(userId: string, limit?: number): Promise<any[]>;
    static removeAllFollowsForUser(userId: string): Promise<void>;
}
export default FollowService;
//# sourceMappingURL=Follow.d.ts.map