import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import ChatRoom from './pages/ChatRoom'; // 1. Import your real ChatRoom

function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    {/* Public Route */}
                    <Route path="/" element={<Login />} />

                    {/* Private Routes */}
                    <Route element={<ProtectedRoute />}>
                        {/* 2. Swap ChatPlaceholder for ChatRoom */}
                        <Route path="/chat" element={<ChatRoom />} />
                    </Route>

                    {/* Catch-all */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;