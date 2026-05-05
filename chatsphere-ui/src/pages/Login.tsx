import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import api from '../api/axiosInstance';
import { useAuth } from '../hooks/useAuth';
// Type-only import to satisfy verbatimModuleSyntax
import type { AuthResponse } from '../types';

const Login: React.FC = () => {
    // 1. Local State for Form Data
    const [username, setUsername] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    // 2. Handle Form Submission with explicit typing
    const handleSubmit = async (e: React.BaseSyntheticEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Send request to your .NET 8 Auth Controller
            const response = await api.post<AuthResponse>('/auth/login', {
                username,
                password
            });

            // If success, save token to AuthContext and LocalStorage
            login(response.data.token);

            // Redirect user to the protected chat area
            navigate('/chat');
        } catch (err: unknown) {
            // Handle Axios errors specifically to avoid 'any'
            if (axios.isAxiosError(err)) {
                setError(err.response?.data?.message || 'Invalid username or password');
            } else {
                setError('An unexpected system error occurred');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={containerStyle}>
            <div style={cardStyle}>
                <h2 style={{ textAlign: 'center', color: '#333', marginBottom: '20px' }}>ChatSphere</h2>
                <form onSubmit={handleSubmit}>
                    <div style={inputGroupStyle}>
                        <label style={labelStyle}>Username</label>
                        <input
                            type="text"
                            placeholder="Enter your username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            style={inputStyle}
                        />
                    </div>

                    <div style={inputGroupStyle}>
                        <label style={labelStyle}>Password</label>
                        <input
                            type="password"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            style={inputStyle}
                        />
                    </div>

                    {error && <div style={errorStyle}>{error}</div>}

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            ...buttonStyle,
                            backgroundColor: loading ? '#6c757d' : '#007bff'
                        }}
                    >
                        {loading ? 'Authenticating...' : 'Login'}
                    </button>
                </form>

                <p style={{ textAlign: 'center', marginTop: '15px', fontSize: '14px' }}>
                    Don't have an account? <span style={{ color: '#007bff', cursor: 'pointer' }}>Register</span>
                </p>
            </div>
        </div>
    );
};

// --- Professional Inline Styles ---
const containerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    backgroundColor: '#f4f7f6',
    fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif'
};

const cardStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: '400px',
    padding: '40px',
    backgroundColor: '#fff',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    borderRadius: '10px'
};

const inputGroupStyle: React.CSSProperties = {
    marginBottom: '20px'
};

const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '8px',
    fontWeight: '600',
    color: '#555'
};

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px',
    borderRadius: '5px',
    border: '1px solid #ddd',
    boxSizing: 'border-box',
    fontSize: '16px'
};

const buttonStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px',
    border: 'none',
    borderRadius: '5px',
    color: 'white',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background-color 0.3s ease'
};

const errorStyle: React.CSSProperties = {
    color: '#d9534f',
    backgroundColor: '#f2dede',
    padding: '10px',
    borderRadius: '4px',
    marginBottom: '20px',
    fontSize: '14px',
    textAlign: 'center'
};

export default Login;