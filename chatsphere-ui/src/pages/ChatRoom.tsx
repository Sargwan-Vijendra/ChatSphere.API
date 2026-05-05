import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosInstance';
import { useSignalR } from '../hooks/useSignalR';
import { useAuth } from '../hooks/useAuth';
import DIDiagnostics from '../components/DIDiagnostics';
import type { Message, Room } from '../types';

const ChatRoom: React.FC = () => {
    const { logout } = useAuth();
    const navigate = useNavigate();

    // --- State Management ---
    const [rooms, setRooms] = useState<Room[]>([]);
    const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
    const [inputMessage, setInputMessage] = useState<string>('');
    const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
    const [newRoomName, setNewRoomName] = useState<string>('');
    const [showCreateModal, setShowCreateModal] = useState<boolean>(false);

    // SignalR Hook for Real-time Messaging
    const { messages, setMessages, sendMessage } = useSignalR(selectedRoom);
    const scrollRef = useRef<HTMLDivElement>(null);

    // --- 1. Fetch Rooms List ---
    useEffect(() => {
        const fetchRooms = async () => {
            try {
                const res = await api.get<Room[]>('/Rooms/RoomsList');
                setRooms(res.data);
                // Auto-select first room if none selected
                if (res.data.length > 0 && !selectedRoom) {
                    setSelectedRoom(res.data[0].roomId);
                }
            } catch (error) {
                console.error("Failed to load rooms:", error);
            }
        };

        fetchRooms();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // --- 2. Room Switching & Data Synchronization ---
    useEffect(() => {
        if (!selectedRoom) return;

        const syncRoomData = async () => {
            try {
                // Fetch Message History and Online Presence simultaneously
                const [msgRes, userRes] = await Promise.all([
                    api.get<Message[]>(`/messages/${selectedRoom}`),
                    api.get<string[]>(`/Rooms/${selectedRoom}/online`)
                ]);

                // .reverse() ensures the oldest history is at the top, newest at bottom
                setMessages(msgRes.data.reverse());
                setOnlineUsers(userRes.data);
            } catch (error) {
                console.error("Sync error for room:", selectedRoom, error);
            }
        };

        syncRoomData();
    }, [selectedRoom, setMessages]);

    // --- 3. Auto-scroll to Bottom ---
    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // --- 4. Room Actions ---
    const handleCreateRoom = async (e: React.BaseSyntheticEvent) => {
        e.preventDefault();
        if (!newRoomName.trim()) return;
        try {
            await api.post('/Rooms/CreateRoom', { name: newRoomName });
            setNewRoomName('');
            setShowCreateModal(false);
            // Refresh list after creation
            const res = await api.get<Room[]>('/Rooms/RoomsList');
            setRooms(res.data);
        } catch (error) {
            console.error("Creation error:", error);
            alert("Could not create room.");
        }
    };

    const handleDeleteRoom = async (roomId: string) => {
        if (!window.confirm("Are you sure you want to delete this room? This action is permanent.")) return;
        try {
            await api.delete(`/Rooms/DeleteRoom/${roomId}`);
            if (selectedRoom === roomId) setSelectedRoom(null);
            // Refresh list after deletion
            const res = await api.get<Room[]>('/Rooms/RoomsList');
            setRooms(res.data);
        } catch (error) {
            console.error("Deletion error:", error);
            alert("Delete failed.");
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <div style={layoutStyle}>
            {/* Sidebar: Room Management */}
            <div style={sidebarStyle}>
                <div style={sidebarHeader}>
                    <h2 style={{ fontSize: '20px', margin: 0, color: '#007bff' }}>ChatSphere</h2>
                    <button onClick={() => setShowCreateModal(true)} style={addBtnStyle} title="Create Room">+</button>
                </div>

                <div style={scrollArea}>
                    {rooms.map(room => (
                        <div key={room.roomId} style={roomWrapper}>
                            <div
                                onClick={() => setSelectedRoom(room.roomId)}
                                style={{
                                    ...roomItemStyle,
                                    backgroundColor: selectedRoom === room.roomId ? '#007bff' : 'transparent',
                                    color: selectedRoom === room.roomId ? 'white' : '#444'
                                }}
                            >
                                # {room.name}
                            </div>
                            <button
                                onClick={() => handleDeleteRoom(room.roomId)}
                                style={deleteBtnStyle}
                                title="Delete Room"
                            >
                                🗑️
                            </button>
                        </div>
                    ))}
                </div>

                <div style={userFooter}>
                    <button onClick={handleLogout} style={logoutBtnStyle}>Sign Out</button>
                </div>
            </div>

            {/* Main Chat Content */}
            <div style={mainChatStyle}>
                <div style={chatHeader}>
                    <h3 style={{ margin: 0 }}>
                        {rooms.find(r => r.roomId === selectedRoom)?.name || "Select a Room"}
                    </h3>
                </div>

                <div style={messageListStyle}>
                    {messages.map((msg, idx) => (
                        <div key={idx} style={messageBubble}>
                            <div style={senderName}>{msg.username}</div>
                            <div style={{ color: '#333' }}>{msg.content}</div>
                            <div style={timestampStyle}>{new Date(msg.timestamp).toLocaleTimeString()}</div>
                        </div>
                    ))}
                    <div ref={scrollRef} />
                </div>

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (inputMessage.trim()) {
                            sendMessage(inputMessage);
                            setInputMessage('');
                        }
                    }}
                    style={inputAreaStyle}
                >
                    <input
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        placeholder="Message this room..."
                        style={inputFieldStyle}
                    />
                    <button type="submit" style={sendButtonStyle}>Send</button>
                </form>

                {/* Proof of Concept: DI Lifetimes Dashboard */}
                <DIDiagnostics />
            </div>

            {/* Presence: Online Users */}
            <div style={presenceStyle}>
                <h4 style={presenceHeader}>Active Users ({onlineUsers.length})</h4>
                <div style={scrollArea}>
                    {onlineUsers.map(user => (
                        <div key={user} style={onlineUserRow}>
                            <span style={statusDot} /> {user}
                        </div>
                    ))}
                </div>
            </div>

            {/* Modal: Create Room */}
            {showCreateModal && (
                <div style={modalOverlay}>
                    <div style={modalBox}>
                        <h3 style={{ marginTop: 0 }}>New Channel</h3>
                        <form onSubmit={handleCreateRoom}>
                            <label style={{ fontSize: '12px', color: '#666' }}>Room Name</label>
                            <input
                                style={{ ...inputFieldStyle, width: '100%', marginTop: '5px' }}
                                value={newRoomName}
                                onChange={(e) => setNewRoomName(e.target.value)}
                                placeholder="e.g. general-chat"
                                autoFocus
                                required
                            />
                            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                                <button type="submit" style={{ ...sendButtonStyle, flex: 1 }}>Create</button>
                                <button type="button" onClick={() => setShowCreateModal(false)} style={cancelBtnStyle}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Professional UI Styles ---
const layoutStyle: React.CSSProperties = { display: 'flex', height: '100vh', backgroundColor: '#f0f2f5', fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif' };
const sidebarStyle: React.CSSProperties = { width: '280px', backgroundColor: '#fff', borderRight: '1px solid #ddd', display: 'flex', flexDirection: 'column' };
const sidebarHeader: React.CSSProperties = { padding: '25px 20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const scrollArea: React.CSSProperties = { flex: 1, overflowY: 'auto', padding: '10px' };
const roomWrapper: React.CSSProperties = { display: 'flex', alignItems: 'center', marginBottom: '5px', borderRadius: '8px', transition: 'background 0.2s' };
const roomItemStyle: React.CSSProperties = { flex: 1, padding: '12px 15px', cursor: 'pointer', borderRadius: '8px', fontSize: '14px', fontWeight: '600' };
const deleteBtnStyle: React.CSSProperties = { padding: '10px', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4, transition: 'opacity 0.2s' };
const addBtnStyle: React.CSSProperties = { width: '32px', height: '32px', borderRadius: '8px', border: 'none', backgroundColor: '#007bff', color: '#fff', cursor: 'pointer', fontSize: '20px', fontWeight: 'bold' };
const mainChatStyle: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#fff' };
const chatHeader: React.CSSProperties = { padding: '20px 25px', backgroundColor: '#fff', borderBottom: '1px solid #eee', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' };
const messageListStyle: React.CSSProperties = { flex: 1, overflowY: 'auto', padding: '25px', display: 'flex', flexDirection: 'column', gap: '15px' };
const messageBubble: React.CSSProperties = { padding: '14px 18px', backgroundColor: '#f8f9fa', borderRadius: '18px 18px 18px 2px', maxWidth: '70%', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', alignSelf: 'flex-start', border: '1px solid #f1f1f1' };
const senderName: React.CSSProperties = { fontWeight: 'bold', color: '#007bff', fontSize: '13px', marginBottom: '4px' };
const timestampStyle: React.CSSProperties = { fontSize: '10px', color: '#aaa', marginTop: '8px', textAlign: 'right' };
const inputAreaStyle: React.CSSProperties = { padding: '25px', backgroundColor: '#fff', display: 'flex', gap: '15px', borderTop: '1px solid #eee' };
const inputFieldStyle: React.CSSProperties = { flex: 1, padding: '15px', borderRadius: '12px', border: '1px solid #ddd', outline: 'none', fontSize: '15px', boxSizing: 'border-box' };
const sendButtonStyle: React.CSSProperties = { padding: '0 30px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s' };
const presenceStyle: React.CSSProperties = { width: '240px', backgroundColor: '#fff', borderLeft: '1px solid #ddd', display: 'flex', flexDirection: 'column' };
const presenceHeader: React.CSSProperties = { padding: '25px 20px', margin: 0, fontSize: '15px', color: '#666', borderBottom: '1px solid #eee', textTransform: 'uppercase', letterSpacing: '1px' };
const onlineUserRow: React.CSSProperties = { display: 'flex', alignItems: 'center', padding: '10px 20px', fontSize: '14px', fontWeight: '600', color: '#333' };
const statusDot: React.CSSProperties = { width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#28a745', marginRight: '12px', boxShadow: '0 0 5px rgba(40,167,69,0.5)' };
const userFooter: React.CSSProperties = { padding: '20px', borderTop: '1px solid #eee' };
const logoutBtnStyle: React.CSSProperties = { width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ff4d4f', color: '#ff4d4f', background: 'none', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s' };
const modalOverlay: React.CSSProperties = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' };
const modalBox: React.CSSProperties = { backgroundColor: '#fff', padding: '40px', borderRadius: '20px', width: '380px', boxShadow: '0 15px 35px rgba(0,0,0,0.2)' };
const cancelBtnStyle: React.CSSProperties = { padding: '12px 25px', borderRadius: '12px', border: '1px solid #ddd', cursor: 'pointer', background: 'none', fontWeight: '600' };

export default ChatRoom;