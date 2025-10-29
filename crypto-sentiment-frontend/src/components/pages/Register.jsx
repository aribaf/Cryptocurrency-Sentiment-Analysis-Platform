// src/pages/Register.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios'; 
const API_BASE = 'http://127.0.0.1:8000/api'; 

// Function to enforce basic password complexity (FR01-03)
const validatePassword = (password) => {
    if (password.length < 8) return "Password must be at least 8 characters.";
    if (!/[A-Z]/.test(password)) return "Password requires an uppercase letter.";
    if (!/[a-z]/.test(password)) return "Password requires a lowercase letter.";
    if (!/[0-9]/.test(password)) return "Password requires a number.";
    if (!/[!@#$%^&*()]/.test(password)) return "Password requires a special character.";
    return null; 
};

export default function Register() {
    const navigate = useNavigate();
    // We keep the state object clean, omitting 'fullname' since it's not used by the backend API
    const [formData, setFormData] = useState({ username: '', email: '', password: '', confirmPassword: '' });
    const [message, setMessage] = useState({ text: '', type: '' }); 

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setMessage({ text: '', type: '' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Client-side Validation (Password Match)
        if (formData.password !== formData.confirmPassword) {
            setMessage({ text: "Passwords do not match.", type: 'error' });
            return;
        }

        // Client-side Validation (Password Complexity Check)
        const passwordError = validatePassword(formData.password);
        if (passwordError) {
             setMessage({ text: passwordError, type: 'error' });
             return;
        }

        try {
            // FR01-01, FR01-02: Send data to the backend
            const response = await axios.post(`${API_BASE}/register`, {
                username: formData.username,
                email: formData.email,
                password: formData.password,
            });

            // FR01-06: Successful registration
            setMessage({ text: response.data.message, type: 'success' });
            
            // FR01-07: Redirect to login after successful registration (2 second delay)
            setTimeout(() => {
                navigate('/login');
            }, 2000);

        } catch (error) {
            // FR01-04: Display appropriate error message
            const errorMsg = error.response?.data?.detail?.message || "Registration failed. Please try again.";
            setMessage({ text: errorMsg, type: 'error' });
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-lg border border-gray-200">
                <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">Create an account</h1>
                <p className="text-center text-gray-500 mb-6 text-sm">Enter your details below to create your account</p>
                
                {/* Message Display (Success/Error) */}
                {message.text && (
                    <div className={`p-3 mb-4 rounded text-sm ${message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {message.text}
                    </div>
                )}
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* ⚠️ REMOVED Full Name input as it's not in the API model */}
                    
                    {/* Username Input: ADDED name attribute */}
                    <div>
                        <label htmlFor="username" className="block text-sm font-medium text-gray-700">Username</label>
                        <input type="text" id="username" name="username" value={formData.username} onChange={handleChange} required placeholder="johndoe" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                    </div>
                    
                    {/* Email Input: ADDED name attribute */}
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                        <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required placeholder="john.doe@example.com" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                    </div>
                    
                    {/* Password Input: ADDED name attribute */}
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                        <input type="password" id="password" name="password" value={formData.password} onChange={handleChange} required placeholder="********" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                    </div>
                    
                    {/* Confirm Password Input: ADDED name attribute */}
                    <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirm Password</label>
                        <input type="password" id="confirmPassword" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required placeholder="********" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                    </div>
                    
                    <button type="submit" className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                        Create account
                    </button>
                </form>

                <div className="mt-6 text-center text-sm">
                    Already have an account? 
                    <Link to="/login" className="ml-1 font-medium text-blue-600 hover:text-blue-500">
                        Sign in
                    </Link>
                </div>
            </div>
        </div>
    )
}