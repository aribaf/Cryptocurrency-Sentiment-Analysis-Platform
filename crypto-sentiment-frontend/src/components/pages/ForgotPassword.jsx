// src/pages/ForgotPassword.jsx
import React from 'react';

export default function ForgotPassword() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-lg border border-gray-200 text-center">
        <h1 className="text-2xl font-bold mb-4">Reset Password</h1>
        <p className="text-gray-600 mb-6">Enter your email and we'll send you a link to reset your password.</p>
        <input 
            type="email" 
            placeholder="Email" 
            className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4"
        />
        <button className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            Send Reset Link
        </button>
        <p className="mt-4 text-sm text-gray-500">
            <a href="/login" className="text-blue-600 hover:underline">Back to Login</a>
        </p>
      </div>
    </div>
  );
}