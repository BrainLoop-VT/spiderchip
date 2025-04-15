import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setAuthToken } from "../services/api";

interface Credentials {
    email: string;
    password: string;
}

export default function Login() {
    const navigate = useNavigate();
    const [credentials, setCredentials] = useState<Credentials>({
        email: '',
        password: ''
    });

    const handleLogin = async () => {
        try {
            const response = await api.post('/auth/login', credentials);
            const { token } = response.data;
            
            // Token already includes "Bearer " prefix from backend
            setAuthToken(token);
            localStorage.setItem('token', token);
            
            navigate('/game');
        } catch (error) {
            console.error('Login failed:', error);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleLogin();
    };

    return (
        <form onSubmit={handleSubmit}>
            {}
        </form>
    );
}   