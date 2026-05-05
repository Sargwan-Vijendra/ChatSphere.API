import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSignalR } from '../hooks/useSignalR';
import axiosInstance from '../api/axiosInstance';
import type { Room, Message } from '../types';

interface RoomResponse extends Room {
    isMember?: boolean;
}

interface OnlineResponse {
    length: number;
    [key: string]: unknown;
}

interface MessageDto {
    messageId: number;
    content: string;
    timestamp: string;
    username: string;
    displayName: string | null;
}

const ChatRoom = () => {
    const { user, logout } = useAuth();
    const token = localStorage.getItem('token');
    const [rooms, setRooms] = useState<Room[]>([]);
    const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
    const [messageHistory, setMessageHistory] = useState<Message[]>([]);
    const [messageText, setMessageText] = useState('');
    const [newRoomName, setNewRoomName] = useState('');
    const [isCreatingRoom, setIsCreatingRoom] = useState(false);
    const [onlineCount, setOnlineCount] = useState(0);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [joinedRooms, setJoinedRooms] = useState<Set<string>>(new Set());

    // ✅ Popup state for incoming messages
    const [popup, setPopup] = useState<{ message: string; sender: string } | null>(null);

    // ✅ Destructure incomingPopup from the hook
    const { messages, joinRoom, leaveRoom: leaveSignalR, isConnected, incomingPopup } = useSignalR(token);

    // ✅ Auto‑hide popup after 3 seconds whenever a new popup appears
    useEffect(() => {
        if (incomingPopup) {
            const showTimer = setTimeout(() => {
                setPopup({ message: incomingPopup.message, sender: incomingPopup.sender });
            }, 0);
            const hideTimer = setTimeout(() => setPopup(null), 3000);
            return () => {
                clearTimeout(showTimer);
                clearTimeout(hideTimer);
            };
        }
    }, [incomingPopup]);

    useEffect(() => {
        const loadRooms = async () => {
            try {
                const response = await axiosInstance.get<RoomResponse[]>('/api/Rooms/RoomsList');
                setRooms(response.data);
                const joined = response.data
                    .filter((r) => r.isMember)
                    .map((r) => r.roomId);
                setJoinedRooms(new Set(joined));
            } catch (err) {
                console.error("Failed to load rooms", err);
            }
        };
        loadRooms();
    }, []);

    const loadMessages = async (roomId: string) => {
        const response = await axiosInstance.get<MessageDto[]>(`/api/Messages/${roomId}`);
        const mappedMessages: Message[] = response.data.map(msg => ({
            id: msg.messageId.toString(),
            content: msg.content,
            senderName: msg.username,
            timestamp: msg.timestamp
        }));
        setMessageHistory(mappedMessages);
    };

    const loadOnlineCount = async (roomId: string) => {
        try {
            const response = await axiosInstance.get<string[] | OnlineResponse>(`/api/Rooms/${roomId}/online`);
            if (Array.isArray(response.data)) {
                setOnlineCount(response.data.length);
            } else if (response.data && typeof response.data.length === 'number') {
                setOnlineCount(response.data.length);
            } else {
                setOnlineCount(0);
            }
        } catch (error) {
            console.error("Online count load failed", error);
        }
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messageHistory]);

    const lastMessageId = useRef('');

    useEffect(() => {
        if (currentRoom && messages.length > 0) {
            const lastMsg = messages[messages.length - 1];
            const msgKey = `${lastMsg.roomId}-${lastMsg.timestamp}`;
            if (lastMsg.roomId === currentRoom.roomId && msgKey !== lastMessageId.current) {
                lastMessageId.current = msgKey;
                setMessageHistory(prev => [...prev, {
                    id: Date.now().toString(),
                    content: lastMsg.content,
                    senderName: lastMsg.senderName,
                    timestamp: lastMsg.timestamp
                }]);
            }
        }
    }, [messages, currentRoom]);

    const handleJoinRoom = async (room: Room) => {
        setCurrentRoom(room);
        if (!joinedRooms.has(room.roomId)) {
            try {
                await axiosInstance.post('/api/Rooms/join', {
                    roomId: room.roomId,
                    role: "Member"
                });
                setJoinedRooms(prev => new Set(prev).add(room.roomId));
            } catch (error) {
                console.error("Join API error details:", error);
            }
        }
        await joinRoom(room.roomId);
        await loadMessages(room.roomId);
        await loadOnlineCount(room.roomId);
    };

    const handleLeaveRoom = async (roomId: string) => {
        const confirmed = window.confirm('Leave this room?');
        if (!confirmed) return;
        try {
            await axiosInstance.post('/api/Rooms/leave', { roomId: roomId });
            await leaveSignalR(roomId);
            setJoinedRooms(prev => {
                const next = new Set(prev);
                next.delete(roomId);
                return next;
            });
            const response = await axiosInstance.get<RoomResponse[]>('/api/Rooms/RoomsList');
            setRooms(response.data);
            if (currentRoom?.roomId === roomId) {
                setCurrentRoom(null);
                setMessageHistory([]);
            }
        } catch (err) {
            console.error("Leave failed", err);
        }
    };

    const handleDeleteRoom = async (roomId: string) => {
        const confirmed = window.confirm('Delete this room permanently?');
        if (!confirmed) return;
        try {
            await axiosInstance.delete(`/api/Rooms/DeleteRoom/${roomId}`);
            const response = await axiosInstance.get<RoomResponse[]>('/api/Rooms/RoomsList');
            setRooms(response.data);
            if (currentRoom?.roomId === roomId) {
                setCurrentRoom(null);
                setMessageHistory([]);
            }
        } catch (err) {
            console.error("Delete failed", err);
        }
    };

    const handleCreateRoom = async () => {
        if (!newRoomName.trim()) return;
        try {
            await axiosInstance.post('/api/Rooms/CreateRoom', {
                name: newRoomName,
                creatorId: user?.id
            });
            setNewRoomName('');
            setIsCreatingRoom(false);
            const response = await axiosInstance.get<RoomResponse[]>('/api/Rooms/RoomsList');
            setRooms(response.data);
        } catch (err) {
            console.error("Create failed", err);
        }
    };

    const handleSendMessage = async () => {
        if (!currentRoom || !messageText.trim()) return;
        try {
            await axiosInstance.post('/api/Messages/Send', {
                roomId: currentRoom.roomId,
                content: messageText
            });
            setMessageText('');
        } catch (error) {
            console.error("Message send failed:", error);
        }
    };

    return (
        <div style={{ display: 'flex', height: '100vh', backgroundColor: '#313338', color: '#fff' }}>
            <style>{`
                @keyframes slideInUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>

            {/* Sidebar */}
            <div style={{ width: 300, borderRight: '1px solid #1f2124', padding: 16, display: 'flex', flexDirection: 'column', backgroundColor: '#2b2d31' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                    <h3 style={{ margin: 0 }}>ChatSphere</h3>
                    <button onClick={() => setIsCreatingRoom(!isCreatingRoom)} style={{ background: '#5865f2', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                        {isCreatingRoom ? 'Cancel' : '+ New'}
                    </button>
                </div>

                {isCreatingRoom && (
                    <div style={{ marginBottom: 16, padding: 8, background: '#383a40', borderRadius: 4 }}>
                        <input
                            type="text"
                            value={newRoomName}
                            onChange={(e) => setNewRoomName(e.target.value)}
                            placeholder="Room name"
                            style={{ width: '100%', padding: 8, marginBottom: 8, borderRadius: 4, border: 'none', background: '#1e1f22', color: '#fff' }}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateRoom()}
                        />
                        <button onClick={handleCreateRoom} style={{ width: '100%', background: '#248046', border: 'none', color: '#fff', padding: 8, cursor: 'pointer' }}>Create</button>
                    </div>
                )}

                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {rooms.map((room) => (
                        <div
                            key={room.roomId}
                            onClick={() => handleJoinRoom(room)}
                            style={{
                                padding: 12,
                                marginBottom: 8,
                                background: currentRoom?.roomId === room.roomId ? '#383a40' : 'transparent',
                                borderRadius: 8,
                                cursor: 'pointer'
                            }}
                        >
                            <strong># {room.name}</strong>
                            {joinedRooms.has(room.roomId) && <span style={{ fontSize: '10px', color: '#248046' }}> (Joined)</span>}
                            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                <button onClick={(e) => { e.stopPropagation(); handleLeaveRoom(room.roomId); }} style={{ fontSize: 10, background: 'none', border: '1px solid #ed4245', color: '#ed4245', cursor: 'pointer' }}>Leave</button>
                                {user?.id === room.creatorId && (
                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteRoom(room.roomId); }} style={{ fontSize: 10, background: 'none', border: '1px solid #ed4245', color: '#ed4245', cursor: 'pointer' }}>Delete</button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #383a40' }}>
                    <div style={{ fontSize: 12, marginBottom: 8 }}>Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}</div>
                    <button onClick={logout} style={{ width: '100%', padding: 10, backgroundColor: '#ed4245', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Logout</button>
                </div>
            </div>

            {/* Chat Area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {currentRoom ? (
                    <>
                        <div style={{ padding: 16, borderBottom: '1px solid #1f2124' }}>
                            <h2 style={{ margin: 0 }}># {currentRoom.name}</h2>
                            <div style={{ fontSize: 12, color: '#949ba4' }}>👥 {onlineCount} online</div>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
                            {messageHistory.map((msg, idx) => (
                                <div key={idx} style={{ marginBottom: 12, textAlign: msg.senderName === user?.username ? 'right' : 'left' }}>
                                    <div style={{ display: 'inline-block', maxWidth: '70%' }}>
                                        <div style={{ fontSize: 11, color: '#949ba4', marginBottom: 2 }}>{msg.senderName}</div>
                                        <div style={{ padding: '8px 12px', borderRadius: 12, background: msg.senderName === user?.username ? '#5865f2' : '#383a40', color: '#fff' }}>{msg.content}</div>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        <div style={{ padding: 16, display: 'flex', gap: 8 }}>
                            <input
                                type="text"
                                value={messageText}
                                onChange={(e) => setMessageText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                placeholder={`Message #${currentRoom.name}`}
                                style={{ flex: 1, padding: 12, borderRadius: 8, background: '#383a40', border: 'none', color: '#fff' }}
                            />
                            <button onClick={handleSendMessage} style={{ padding: '0 20px', backgroundColor: '#5865f2', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Send</button>
                        </div>
                    </>
                ) : (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#949ba4' }}>Select a channel to start chatting</div>
                )}
            </div>

            {/* ✅ In-app popup for new messages */}
            {popup && (
                <div style={{
                    position: 'fixed',
                    bottom: '80px',
                    right: '20px',
                    backgroundColor: '#5865f2',
                    color: '#fff',
                    padding: '12px 20px',
                    borderRadius: '8px',
                    maxWidth: '300px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                    zIndex: 1000,
                    animation: 'slideInUp 0.3s ease-out',
                    fontSize: '14px',
                    pointerEvents: 'none'
                }}>
                    <strong>{popup.sender}</strong><br />
                    {popup.message.length > 50 ? popup.message.substring(0, 50) + '…' : popup.message}
                </div>
            )}
        </div>
    );
};

export default ChatRoom;