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
export declare class LikeService {
    static create(userId: string, murmurId: string): Promise<Like>;
    static findByUserAndMurmur(userId: string, murmurId: string): Promise<Like | null>;
    static delete(userId: string, murmurId: string): Promise<boolean>;
    static like(userId: string, murmurId: string): Promise<Like>;
    static unlike(userId: string, murmurId: string): Promise<boolean>;
    static isUserLiked(userId: string, murmurId: string): Promise<boolean>;
    static getLikeCount(murmurId: string): Promise<number>;
    static getLikesByMurmur(murmurId: string, limit?: number, offset?: number): Promise<{
        likes: Like[];
        totalCount: number;
    }>;
    static getLikesByUser(userId: string, limit?: number, offset?: number): Promise<{
        likes: Like[];
        totalCount: number;
    }>;
    static getRecentLikes(murmurId: string, limit?: number): Promise<Like[]>;
    static deleteAllByMurmur(murmurId: string): Promise<void>;
    static deleteAllByUser(userId: string): Promise<void>;
    static getLikeStats(murmurId: string): Promise<{
        totalLikes: number;
        recentLikes: number;
    }>;
    static areUsersLiked(userIds: string[], murmurId: string): Promise<Record<string, boolean>>;
    static getUsersWhoLikedMurmurs(murmurIds: string[]): Promise<Record<string, string[]>>;
}
export default LikeService;
//# sourceMappingURL=Like.d.ts.map