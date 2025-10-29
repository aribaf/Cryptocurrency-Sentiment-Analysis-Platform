// src/pages/Login.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
const API_BASE = 'http://127.0.0.1:8000/api';

export default function Login() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [message, setMessage] = useState({ text: '', type: '' }); 
    const [isLoading, setIsLoading] = useState(false); 

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setMessage({ text: '', type: '' });
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // FR02-01: Send credentials (using username field for email, as required by OAuth2PasswordRequestForm)
            const response = await axios.post(`${API_BASE}/login`, new URLSearchParams({
                username: formData.email, // FastAPI expects 'username' (which is the email)
                password: formData.password
            }), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            // FR02-04: Successful login
            setMessage({ text: response.data.message, type: 'success' });
            
            // 💡 Temporary Session Storage: Store a simple flag to show user is logged in
            localStorage.setItem('userLoggedIn', 'true'); 

            // FR02-05: Redirect to dashboard
            setTimeout(() => {
                navigate('/dashboard');
            }, 1000);


        } catch (error) {
            // FR02-03: Invalid credentials or API error
            const errorMsg = error.response?.data?.detail?.message || "Login failed. Check server status.";
            setMessage({ text: errorMsg, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };
    
    // --- Helper for FR03-01: Logout ---
    const handleLogout = () => {
        // FR03-02: Terminate session (clear local storage token/flag)
        localStorage.removeItem('userLoggedIn');
        // FR03-03: Redirect to login page
        navigate('/login');
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-lg border border-gray-200">
                <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">Login</h1>
                <p className="text-center text-gray-500 mb-6 text-sm">Enter your credentials to access your account</p>
                
                {/* Message Display (Success/Error) */}
                {message.text && (
                    <div className={`p-3 mb-4 rounded text-sm ${message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                        <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required placeholder="user@example.com" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                    </div>
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                        <input type="password" id="password" name="password" value={formData.password} onChange={handleChange} required placeholder="********" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                    </div>
                    
                    <div className="text-right">
                        <Link to="/forgot-password" className="text-sm text-blue-600 hover:text-blue-500">
                            Forgot password?
                        </Link>
                    </div>
                    
                    <button type="submit" disabled={isLoading} className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                        {isLoading ? 'Logging In...' : 'Login'}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm">
                    Don't have an account? 
                    <Link to="/register" className="ml-1 font-medium text-blue-600 hover:text-blue-500">
                        Sign up
                    </Link>
                </div>
            </div>
        </div>
    )
}