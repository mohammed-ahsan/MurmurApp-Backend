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
export declare class MurmurService {
    static create(userId: string, content: string): Promise<Murmur>;
    static findById(id: string): Promise<Murmur | null>;
    static softDelete(id: string): Promise<boolean>;
    static getTimeline(userId: string, limit?: number, offset?: number): Promise<{
        murmurs: Murmur[];
        totalCount: number;
    }>;
    static getPublicMurmurs(limit?: number, offset?: number): Promise<{
        murmurs: Murmur[];
        totalCount: number;
    }>;
    static getUserMurmurs(userId: string, limit?: number, offset?: number): Promise<{
        murmurs: Murmur[];
        totalCount: number;
    }>;
    static update(id: string, content: string): Promise<Murmur | null>;
    static incrementLikesCount(id: string): Promise<boolean>;
    static decrementLikesCount(id: string): Promise<boolean>;
    static incrementRepliesCount(id: string): Promise<boolean>;
    static decrementRepliesCount(id: string): Promise<boolean>;
    static search(query: string, limit?: number, offset?: number): Promise<{
        murmurs: Murmur[];
        totalCount: number;
    }>;
    static getTrending(limit?: number, offset?: number): Promise<{
        murmurs: Murmur[];
        totalCount: number;
    }>;
    static removeAllMurmursForUser(userId: string): Promise<void>;
}
export default MurmurService;
//# sourceMappingURL=Murmur.d.ts.map