/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState } from 'react'; // Removed unused useContext

interface AuthContextType {
    token: string | null;
    login: (token: string) => void;
    logout: () => void;
}

// ADD 'export' HERE so the hook can see it
export const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [token, setToken] = useState(localStorage.getItem('token'));

    const login = (newToken: string) => {
        localStorage.setItem('token', newToken);
        setToken(newToken);
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
    };

    return (
        <AuthContext.Provider value={{ token, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};