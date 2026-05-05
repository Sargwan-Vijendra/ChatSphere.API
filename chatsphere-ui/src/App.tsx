import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import ChatRoom from './pages/ChatRoom';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/chat" element={
                        <ProtectedRoute>
                            <ChatRoom />
                        </ProtectedRoute>
                    } />
                    <Route path="/" element={<Navigate to="/chat" replace />} />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;