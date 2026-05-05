import { useEffect, useState, useCallback, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import { useAuth } from './useAuth';
import type { Message } from '../types';

export const useSignalR = (roomId: string | null) => {
    const { token } = useAuth();
    const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);

    // Use a ref to prevent accidental multiple connections
    const isConnecting = useRef(false);

    useEffect(() => {
        if (!token || !roomId || isConnecting.current) return;

        isConnecting.current = true;

        const newConnection = new signalR.HubConnectionBuilder()
            .withUrl("https://localhost:7168/hubs/chat", {
                accessTokenFactory: () => token
            })
            .withAutomaticReconnect()
            .build();

        const startConnection = async () => {
            try {
                await newConnection.start();
                console.log('Connected to SignalR Hub');

                await newConnection.invoke("JoinRoom", roomId);

                newConnection.on("ReceiveMessage", (message: Message) => {
                    setMessages(prev => [...prev, message]);
                });

                // Set state only once at the end of the async flow
                setConnection(newConnection);
            } catch (err) {
                console.error('SignalR Connection Error: ', err);
            } finally {
                isConnecting.current = false;
            }
        };

        startConnection();

        return () => {
            if (newConnection) {
                // Use a fire-and-forget pattern for cleanup to avoid blocking
                newConnection.invoke("LeaveRoom", roomId).catch(() => { });
                newConnection.stop().catch(() => { });
                setConnection(null);
            }
        };
    }, [token, roomId]);

    const sendMessage = useCallback(async (content: string) => {
        if (connection?.state === signalR.HubConnectionState.Connected && roomId) {
            await connection.invoke("SendMessage", roomId, content);
        }
    }, [connection, roomId]);

    return { messages, setMessages, sendMessage, connection };
};