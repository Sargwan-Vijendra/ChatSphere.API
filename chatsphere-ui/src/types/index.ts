// src/types/index.ts

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

// Add this exported member
export interface Room {
    roomId: string;
    name: string;
    description?: string;
}