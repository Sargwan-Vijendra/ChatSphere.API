import React from 'react';
// Ensure Navigate is included in the curly braces here
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const ProtectedRoute: React.FC = () => {
    const { token } = useAuth();

    if (!token) {
        // This is where the 'Navigate' name is used
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;