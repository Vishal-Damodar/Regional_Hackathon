import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BackgroundBeamsWithCollision } from '../components/ui/background-beams-with-collision'; 

const LoginPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = (e) => {
        e.preventDefault();
        setError('');

        // --- SIMULATED LOGIN LOGIC ---
        // In a real application, you would send credentials to a backend API
        // and receive a token/user object.
        if (username === 'admin' && password === '12345') {
            console.log('Login successful! Redirecting to dashboard.');
            // Simulate setting an authentication status (e.g., storing a token)
            localStorage.setItem('isAuthenticated', 'true'); 
            
            // Redirect to the protected dashboard page
            navigate('/dashboard');
        } else {
            setError('Invalid credentials. Use admin/granttech to access.');
        }
    };

    return (
        <div className="min-h-screen w-full bg-neutral-950 relative flex flex-col items-center justify-center antialiased">
            <BackgroundBeamsWithCollision className="absolute top-0 left-0 w-full h-full z-0" />
            
            <div className="relative z-10 max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-2xl">
                <button 
                    onClick={() => navigate('/')} 
                    className="absolute top-4 left-4 text-sm text-neutral-400 hover:text-cyan-400 transition"
                >
                    &larr; Home
                </button>
                
                <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500 text-center mb-6">
                    Admin Login
                </h1>

                <p className="text-center text-sm text-neutral-400 mb-8">
                    Access the Knowledge Graph Ingestion Dashboard.
                </p>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-1" htmlFor="username">Username</label>
                        <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="admin"
                            required
                            className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:border-red-500 focus:ring-red-500 transition duration-300"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-1" htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:border-red-500 focus:ring-red-500 transition duration-300"
                        />
                    </div>

                    {error && (
                        <div className="text-sm text-red-400 bg-red-900/30 p-3 rounded-lg text-center">
                            {error}
                        </div>
                    )}
                    
                    <button
                        type="submit"
                        className="w-full py-3 rounded-lg text-lg font-bold transition duration-300 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-lg shadow-red-500/30"
                    >
                        Log In
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;