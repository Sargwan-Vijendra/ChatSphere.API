import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosInstance';
import { useSignalR } from '../hooks/useSignalR';
import { useAuth } from '../hooks/useAuth';
import type { Message, Room } from '../types';

const ChatRoom: React.FC = () => {
    const { logout } = useAuth();
    const navigate = useNavigate();

    // --- State ---
    const [rooms, setRooms] = useState<Room[]>([]);
    const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
    const [joinedRoomIds, setJoinedRoomIds] = useState<Set<string>>(new Set());
    const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
    const [inputMessage, setInputMessage] = useState('');

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [newRoom, setNewRoom] = useState({ name: '', isPrivate: false, description: '' });

    // Helpers
    const currentRoom = rooms.find(r => r.roomId === selectedRoomId);
    const isUserMember = selectedRoomId ? joinedRoomIds.has(selectedRoomId) : false;

    // SignalR Hook -sendMessage handles the "Message Sending" feature
    const { messages, setMessages, sendMessage } = useSignalR(isUserMember ? selectedRoomId : null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // --- 1. Fetch Rooms & Initial Membership (On Mount) ---
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                // Hits your [HttpGet("RoomsList")]
                const res = await api.get<Room[]>('/Rooms/RoomsList');
                setRooms(res.data);

                const joined = res.data.filter(r => r.isMember).map(r => r.roomId);
                setJoinedRoomIds(new Set(joined));
            } catch (error) {
                console.error("Failed to load initial rooms:", error);
            }
        };
        loadInitialData();
    }, []);

    // --- 2. Switching Logic (WhatsApp Style) ---
    const handleRoomSelect = async (roomId: string) => {
        setSelectedRoomId(roomId); // This "picks" the room

        if (joinedRoomIds.has(roomId)) {
            try {
                // Hits [HttpGet("api/Messages/{roomId}")] and [HttpGet("api/Rooms/{roomId}/online")]
                const [msgRes, userRes] = await Promise.all([
                    api.get<Message[]>(`/Messages/${roomId}`),
                    api.get<string[]>(`/Rooms/${roomId}/online`)
                ]);
                setMessages(msgRes.data.reverse());
                setOnlineUsers(userRes.data);
            } catch (error) {
                console.error("Error switching rooms:", error);
            }
        } else {
            setMessages([]);
            setOnlineUsers([]);
        }
    };

    // --- 3. Join Logic (Matches your JoinRoom DTO) ---
    const onJoinRoom = async () => {
        if (!selectedRoomId) return;
        try {
            // Sends the joinRoomRequest object to [HttpPost("join/{id}")]
            await api.post(`/Rooms/join/${selectedRoomId}`, { roomId: selectedRoomId });

            setJoinedRoomIds(prev => new Set(prev).add(selectedRoomId));

            // Sync data now that membership is confirmed
            const [msgRes, userRes] = await Promise.all([
                api.get<Message[]>(`/Messages/${selectedRoomId}`),
                api.get<string[]>(`/Rooms/${selectedRoomId}/online`)
            ]);
            setMessages(msgRes.data.reverse());
            setOnlineUsers(userRes.data);
        } catch (error) {
            console.error("Join failed:", error);
            alert("Could not join room.");
        }
    };

    // --- 4. Room Management ---
    const onCreateRoom = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Hits [HttpPost("CreateRoom")]
            await api.post('/Rooms/CreateRoom', newRoom);
            setNewRoom({ name: '', isPrivate: false, description: '' });
            setShowModal(false);

            const res = await api.get<Room[]>('/Rooms/RoomsList');
            setRooms(res.data);
        } catch (error) {
            console.error("Creation error:", error);
        }
    };

    const onDeleteRoom = async (id: string) => {
        if (!window.confirm("Permanently delete this room?")) return;
        try {
            // Hits [HttpDelete("DeleteRoom/{id}")]
            await api.delete(`/Rooms/DeleteRoom/${id}`);
            if (selectedRoomId === id) setSelectedRoomId(null);
            const res = await api.get<Room[]>('/Rooms/RoomsList');
            setRooms(res.data);
        } catch (error) {
            console.error("Delete error:", error);
        }
    };

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    return (
        <div style={containerStyle}>
            {/* Sidebar */}
            <aside style={sidebarStyle}>
                <header style={sideHeader}>
                    <h2 style={{ fontSize: '18px', margin: 0 }}>ChatSphere</h2>
                    <button onClick={() => setShowModal(true)} style={actionBtn}>+</button>
                </header>

                <nav style={roomListNav}>
                    {rooms.map(room => (
                        <div key={room.roomId} style={roomItemWrapper}>
                            <div
                                onClick={() => handleRoomSelect(room.roomId)}
                                style={{
                                    ...roomItem,
                                    backgroundColor: selectedRoomId === room.roomId ? '#383a40' : 'transparent',
                                    color: selectedRoomId === room.roomId ? '#fff' : '#949ba4'
                                }}
                            >
                                <span>{room.isPrivate ? '🔒' : '#'}</span> {room.name}
                                {joinedRoomIds.has(room.roomId) && <span style={memberBadge}>Member</span>}
                            </div>
                            <button onClick={() => onDeleteRoom(room.roomId)} style={miniDelete}>×</button>
                        </div>
                    ))}
                </nav>

                <footer style={sideFooter}>
                    <button onClick={() => { logout(); navigate('/'); }} style={logoutBtn}>Logout</button>
                </footer>
            </aside>

            {/* Chat Body */}
            <main style={chatMain}>
                <header style={chatHeader}>
                    <div style={{ fontWeight: 'bold' }}>
                        {currentRoom ? `# ${currentRoom.name}` : "Select a Room"}
                    </div>
                </header>

                {selectedRoomId ? (
                    isUserMember ? (
                        <>
                            <div style={messageContainer}>
                                {messages.map((m, i) => (
                                    <div key={i} style={msgRow}>
                                        <div style={avatar}>{m.username[0].toUpperCase()}</div>
                                        <div>
                                            <div style={msgMeta}>
                                                <span style={msgUser}>{m.displayName || m.username}</span>
                                                <span style={msgTime}>{new Date(m.timestamp).toLocaleTimeString()}</span>
                                            </div>
                                            <div style={msgText}>{m.content}</div>
                                        </div>
                                    </div>
                                ))}
                                <div ref={scrollRef} />
                            </div>
                            <form style={inputForm} onSubmit={(e) => {
                                e.preventDefault();
                                if (inputMessage.trim()) {
                                    sendMessage(inputMessage);
                                    setInputMessage('');
                                }
                            }}>
                                <input
                                    style={inputStyle}
                                    value={inputMessage}
                                    onChange={(e) => setInputMessage(e.target.value)}
                                    placeholder={`Message #${currentRoom?.name}`}
                                />
                            </form>
                        </>
                    ) : (
                        <div style={joinOverlay}>
                            <h3>Join this Conversation</h3>
                            <p style={{ color: '#949ba4', marginBottom: '20px' }}>{currentRoom?.description || "No description provided."}</p>
                            <button onClick={onJoinRoom} style={joinBtnLarge}>Join Room</button>
                        </div>
                    )
                ) : (
                    <div style={joinPrompt}>Select a channel to start</div>
                )}
            </main>

            {/* Presence */}
            <aside style={presenceStyle}>
                <h4 style={presTitle}>Online — {onlineUsers.length}</h4>
                {onlineUsers.map(u => (
                    <div key={u} style={userRow}>
                        <div style={statusDot} /> {u}
                    </div>
                ))}
            </aside>

            {/* Modals */}
            {showModal && (
                <div style={modalOverlay}>
                    <div style={modalContent}>
                        <h3 style={{ marginTop: 0 }}>Create Channel</h3>
                        <form onSubmit={onCreateRoom}>
                            <input style={modalInput} placeholder="Name" value={newRoom.name} onChange={e => setNewRoom({ ...newRoom, name: e.target.value })} required />
                            <textarea style={{ ...modalInput, height: '60px' }} placeholder="Description" value={newRoom.description} onChange={e => setNewRoom({ ...newRoom, description: e.target.value })} />
                            <label style={checkLabel}>
                                <input type="checkbox" checked={newRoom.isPrivate} onChange={e => setNewRoom({ ...newRoom, isPrivate: e.target.checked })} />
                                Private Channel
                            </label>
                            <div style={modalActions}>
                                <button type="button" onClick={() => setShowModal(false)} style={cancelBtn}>Cancel</button>
                                <button type="submit" style={createBtn}>Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Professional Styles ---
const containerStyle: React.CSSProperties = { display: 'flex', height: '100vh', backgroundColor: '#313338', color: '#dbdee1', fontFamily: 'Inter, sans-serif' };
const sidebarStyle: React.CSSProperties = { width: '240px', backgroundColor: '#2b2d31', display: 'flex', flexDirection: 'column' };
const sideHeader: React.CSSProperties = { padding: '12px 16px', borderBottom: '1px solid #1f2124', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const roomListNav: React.CSSProperties = { flex: 1, padding: '8px', overflowY: 'auto' };
const roomItemWrapper: React.CSSProperties = { display: 'flex', alignItems: 'center', marginBottom: '2px' };
const roomItem: React.CSSProperties = { flex: 1, padding: '8px 12px', cursor: 'pointer', borderRadius: '4px', fontSize: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const miniDelete: React.CSSProperties = { padding: '8px', background: 'none', border: 'none', color: '#ed4245', cursor: 'pointer', fontSize: '18px' };
const memberBadge: React.CSSProperties = { fontSize: '10px', backgroundColor: '#5865f2', padding: '2px 6px', borderRadius: '10px' };
const chatMain: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#313338' };
const chatHeader: React.CSSProperties = { padding: '12px 16px', borderBottom: '1px solid #1f2124', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const messageContainer: React.CSSProperties = { flex: 1, overflowY: 'auto', padding: '16px' };
const msgRow: React.CSSProperties = { display: 'flex', gap: '16px', marginBottom: '18px' };
const avatar: React.CSSProperties = { width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#5865f2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' };
const msgMeta: React.CSSProperties = { display: 'flex', gap: '8px', marginBottom: '4px' };
const msgUser: React.CSSProperties = { color: '#fff', fontWeight: '600' };
const msgTime: React.CSSProperties = { fontSize: '12px', color: '#949ba4' };
const msgText: React.CSSProperties = { color: '#dbdee1' };
const inputForm: React.CSSProperties = { padding: '0 16px 24px' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '11px', borderRadius: '8px', backgroundColor: '#383a40', border: 'none', color: '#dbdee1', outline: 'none' };
const joinOverlay: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' };
const joinBtnLarge: React.CSSProperties = { padding: '12px 40px', backgroundColor: '#248046', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' };
const presenceStyle: React.CSSProperties = { width: '240px', backgroundColor: '#2b2d31', padding: '16px', borderLeft: '1px solid #1f2124' };
const presTitle: React.CSSProperties = { fontSize: '12px', textTransform: 'uppercase', color: '#949ba4', marginBottom: '16px' };
const userRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontSize: '14px' };
const statusDot: React.CSSProperties = { width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#23a55a' };
const modalOverlay: React.CSSProperties = { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 };
const modalContent: React.CSSProperties = { backgroundColor: '#313338', padding: '24px', borderRadius: '8px', width: '400px' };
const modalInput: React.CSSProperties = { width: '100%', padding: '12px', backgroundColor: '#1e1f22', border: 'none', borderRadius: '4px', color: '#fff', marginBottom: '16px', boxSizing: 'border-box' };
const checkLabel: React.CSSProperties = { display: 'flex', gap: '8px', marginBottom: '24px', fontSize: '14px', cursor: 'pointer' };
const actionBtn: React.CSSProperties = { background: 'none', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer' };
const createBtn: React.CSSProperties = { backgroundColor: '#5865f2', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer' };
const cancelBtn: React.CSSProperties = { background: 'none', border: 'none', color: '#fff', cursor: 'pointer' };
const logoutBtn: React.CSSProperties = { width: '100%', padding: '10px', backgroundColor: '#da373c', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' };
const sideFooter: React.CSSProperties = { padding: '16px', borderTop: '1px solid #1f2124' };
const modalActions: React.CSSProperties = { display: 'flex', justifyContent: 'flex-end', gap: '16px' };
const joinPrompt: React.CSSProperties = { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#949ba4', fontStyle: 'italic' };

export default ChatRoom;