export interface AuthResponse {
    token: string;
    userId: string;
    username: string;
    expiresIn: number;
}

export interface Message {
    messageId: number;
    content: string;
    timestamp: string;
    username: string;
    displayName?: string;
}

export interface Room {
    roomId: string;
    name: string;
    description?: string;
    isPrivate: boolean;
    isMember?: boolean;
}

export interface JoinRoomRequest {
    roomId: string;
}