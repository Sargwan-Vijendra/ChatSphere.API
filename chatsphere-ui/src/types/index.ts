export interface User {
    id: string;
    username: string;
    email?: string;
}

export interface Message {
    id: string;
    content: string;
    senderName: string;
    timestamp: string;
}

export interface Room {
    roomId: string; // Use roomId to match your controller logic
    name: string;
    creatorId: string;
    createdAt: string;
    description?: string;
    isPrivate?: boolean;
}

export interface SendMessageRequest {
    roomId: string;
    content: string;
}