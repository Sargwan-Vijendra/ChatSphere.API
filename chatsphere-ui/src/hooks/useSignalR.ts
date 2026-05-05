import { useEffect, useState, useRef } from 'react';
import * as signalR from '@microsoft/signalr';

type SignalRMessage = {
    roomId: string;
    senderName: string;
    content: string;
    timestamp: string;
};

export const useSignalR = (token: string | null) => {
    const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
    const [messages, setMessages] = useState<SignalRMessage[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const messageQueue = useRef<{ roomId: string; content: string }[]>([]);
    const [incomingPopup, setIncomingPopup] = useState<{ message: string; roomId: string; sender: string } | null>(null);

    useEffect(() => {
        if (!token) return;

        const hubConnection = new signalR.HubConnectionBuilder()
            .withUrl(`https://localhost:7168/hubs/ChatHub?access_token=${token}`, {
                skipNegotiation: true,
                transport: signalR.HttpTransportType.WebSockets
            })
            .withAutomaticReconnect()
            .build();

        hubConnection.start()
            .then(() => {
                console.log('SignalR connected');
                setIsConnected(true);
                messageQueue.current.forEach(msg => {
                    hubConnection.invoke('SendMessage', msg.roomId, msg.content);
                });
                messageQueue.current = [];
            })
            .catch(() => console.error('SignalR error'));

        hubConnection.on('ReceiveMessage', (msg: SignalRMessage) => {
            console.log("Live Message Received:", msg);
            setMessages(prev => [...prev, msg]);

            // Show popup for this message
            setIncomingPopup({
                message: msg.content,
                roomId: msg.roomId,
                sender: msg.senderName,
            });
        });

        setConnection(hubConnection);

        return () => {
            hubConnection.stop();
        };
    }, [token]);

    const sendMessage = async (roomId: string, content: string) => {
        if (connection && isConnected) {
            try {
                await connection.invoke('SendMessage', roomId, content);
            } catch {
                messageQueue.current.push({ roomId, content });
            }
        } else {
            messageQueue.current.push({ roomId, content });
        }
    };

    const joinRoom = async (roomId: string) => {
        if (connection && isConnected) {
            await connection.invoke('JoinRoom', roomId);
        }
    };

    const leaveRoom = async (roomId: string) => {
        if (connection && isConnected) {
            await connection.invoke('LeaveRoom', roomId);
        }
    };

    return { messages, sendMessage, joinRoom, leaveRoom, isConnected, incomingPopup };  // ✅ Added incomingPopup here
};