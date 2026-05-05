import axios from 'axios';

const api = axios.create({
    baseURL: 'https://localhost:7168/api', // Replace with your actual API port
});

// Add a request interceptor to attach the JWT token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;