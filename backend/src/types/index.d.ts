export type SwipeDirection = 'like' | 'pass';
export interface UserProfile {
    id: string;
    name: string;
    role: string;
    industry: string;
    location: string;
    bio: string;
    avatarUrl: string;
    skills: string[];
}
export interface SwipeAction {
    userId: string;
    targetId: string;
    action: SwipeDirection;
    timestamp: number;
}
export interface MatchState {
    matchId: string;
    userId1: string;
    userId2: string;
    timestamp: number;
}
export interface SearchFilters {
    role?: string;
    industry?: string;
    location?: string;
}
//# sourceMappingURL=index.d.ts.map