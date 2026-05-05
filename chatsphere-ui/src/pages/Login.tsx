import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';

const Login = () => {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();

    const handleSubmit = async (e: React.SyntheticEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const endpoint = isRegistering ? '/api/Auth/register' : '/api/Auth/login';
            const response = await axiosInstance.post(endpoint, { username, password });

            // FIX: Destructure flat properties from your C# AuthResponse
            const { token, userId, username: resUsername } = response.data;

            if (token) {
                // Map userId to id to match your User type
                login(token, { id: userId, username: resUsername });
                navigate('/chat');
            }
        } catch (err) {
            setError(err.response?.data?.message || (isRegistering ? 'Registration failed' : 'Login failed'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                background: '#f0f2f5'
            }}
        >
            <div
                style={{
                    background: 'white',
                    padding: 32,
                    borderRadius: 8,
                    width: 400,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
            >
                <h2 style={{ textAlign: 'center', marginBottom: 24 }}>
                    {isRegistering ? 'Create Account' : 'Welcome to ChatSphere'}
                </h2>

                {error && (
                    <div
                        style={{
                            background: '#fee',
                            color: '#c00',
                            padding: 8,
                            borderRadius: 4,
                            marginBottom: 16
                        }}
                    >
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        style={{
                            width: '100%',
                            padding: 12,
                            marginBottom: 12,
                            borderRadius: 4,
                            border: '1px solid #ddd'
                        }}
                        required
                        disabled={loading}
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={{
                            width: '100%',
                            padding: 12,
                            marginBottom: 16,
                            borderRadius: 4,
                            border: '1px solid #ddd'
                        }}
                        required
                        disabled={loading}
                    />
                    <button
                        type="submit"
                        style={{ width: '100%', padding: 12, marginBottom: 12 }}
                        disabled={loading}
                    >
                        {loading ? 'Please wait...' : isRegistering ? 'Register' : 'Login'}
                    </button>
                </form>

                <button
                    onClick={() => setIsRegistering(!isRegistering)}
                    style={{
                        width: '100%',
                        background: 'transparent',
                        border: 'none',
                        color: '#007bff',
                        cursor: 'pointer'
                    }}
                >
                    {isRegistering
                        ? 'Already have an account? Login'
                        : "Don't have an account? Register"}
                </button>
            </div>
        </div>
    );
};

export default Login;