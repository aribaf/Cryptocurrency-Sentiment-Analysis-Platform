import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

// Safe access to env: prevents "process is not defined" in some bundlers
const safeEnv = typeof process !== "undefined" && process.env ? process.env : {};
const API_BASE = safeEnv.REACT_APP_API_BASE || "https://malisa-nonexaggerating-slobberingly.ngrok-free.dev/api";
const OAUTH_HOST = safeEnv.REACT_APP_OAUTH_HOST || "https://malisa-nonexaggerating-slobberingly.ngrok-free.dev";

export default function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = e => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Password login
  const handleSubmit = async e => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);
    try {
      const res = await axios.post(`${API_BASE}/auth/login`, formData);
      if (res.status === 200 && res.data.access_token) {
        localStorage.setItem("token", res.data.access_token);
        setMessage({ type: "success", text: "Login successful! Redirecting..." });
        navigate("/");
      }
    } catch (error) {
      const errorMsg = error.response?.data?.detail || "Authentication Failed. Check credentials.";
      setMessage({ type: "error", text: errorMsg });
    } finally {
      setIsLoading(false);
    }
  };

  // OTP request
  const requestOtp = async () => {
    if (!formData.email) {
      setMessage({ type: "error", text: "Please enter your email to request an OTP." });
      return;
    }
    setIsLoading(true);
    setMessage(null);
    try {
      const res = await axios.post(`${API_BASE}/auth/otp/request`, { email: formData.email });
      setMessage({ type: "success", text: res.data.detail || "OTP sent to your email." });
    } catch (error) {
      const errorMsg = error.response?.data?.detail || "Failed to request OTP.";
      setMessage({ type: "error", text: errorMsg });
    } finally {
      setIsLoading(false);
    }
  };

  // Google Sign-In
  const googleSignIn = () => {
    window.location.href = `${OAUTH_HOST}/api/auth/google/login`;
  };

  // --- THEME CONSTANTS ---
  const ACCENT_RED_ORANGE = 'bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/60';
  const ACCENT_NEON_YELLOW = 'text-lime-400 border-lime-400 hover:bg-lime-400 hover:text-black';
  const INPUT_STYLE = 'w-full p-4 bg-gray-700/50 text-white border-b-2 border-transparent focus:outline-none focus:border-red-600 transition duration-300 placeholder-gray-500 text-base';

  return (
    // Outer container: Deep Black background, p-4 ensures padding on small screens
    <div className="flex items-center justify-center min-h-screen bg-black p-4 font-sans antialiased text-white relative overflow-hidden">
      
      {/* Pseudo-elements for background design (retained for visual flair) */}
      <div className="absolute top-10 left-10 w-4 h-4 bg-lime-400 transform rotate-45"></div>
      <div className="absolute bottom-20 right-20 w-4 h-4 bg-red-600 transform rotate-45"></div>
      <div className="absolute top-1/2 left-1/4 w-3 h-3 bg-indigo-500 transform rotate-45 opacity-50 hidden md:block"></div> {/* Hidden on small screens */}

      {/* 1. LOGIN CARD WIDTH CHANGE: max-w-md (larger) */}
      <div className="w-full max-w-md bg-gray-900/90 backdrop-blur-sm p-8 md:p-12 rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-gray-800 relative z-10">
        
        {/* Logo/System Name */}
        <p className="text-sm tracking-[0.3em] text-center mb-8 text-red-600 font-bold uppercase">
          @CRYPTOSWNT
        </p>

        {/* Main Heading: Scaled for responsiveness */}
        <h1 className="text-2xl sm:text-3xl font-extrabold mb-10 text-center uppercase leading-tight">
          ACCESS YOUR <br />
          <span className="text-red-600 tracking-widest">DIGITAL IDENTITY</span>
        </h1>

        {/* Message Alert */}
        {message && (
          <div className={`p-3 mb-6 rounded border-l-4 font-medium text-sm ${
            message.type === 'error' 
              ? 'bg-red-900/40 text-red-300 border-red-600' 
              : 'bg-lime-900/40 text-lime-300 border-lime-400'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Input */}
          <div>
            <label className="block mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Email Address</label>
            <input
              name="email"
              value={formData.email}
              onChange={handleChange}
              type="email"
              placeholder="your@email.com"
              className={INPUT_STYLE}
              required
            />
          </div>

          {/* Password Input */}
          <div>
            <label className="block mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Password</label>
            <input
              name="password"
              value={formData.password}
              onChange={handleChange}
              type="password"
              placeholder="••••••••"
              className={INPUT_STYLE}
            />
          </div>

          {/* Login Button - Full width, prominent */}
          <button 
            type="submit" 
            className={`w-full py-4 mt-6 text-white rounded-md font-bold uppercase tracking-widest transition disabled:bg-gray-700 disabled:shadow-none ${ACCENT_RED_ORANGE}`} 
            disabled={isLoading}
          >
            {isLoading ? "INITIATING..." : "-- ACCESS ACCOUNT --"}
          </button>
        </form>

        {/* Links and secondary actions: Adjusted for better mobile layout */}
        <div className="mt-8 text-center space-y-4">
          
          {/* Register Link */}
          <p className="text-sm text-gray-400">
            No account yet? <a href="/register" className="text-lime-400 font-bold hover:underline transition">Register now</a>
          </p>
          
          {/* OTP and Google Sign-in: Use flex-col on mobile, then space-x on larger screens */}
          <div className="flex flex-col sm:flex-row justify-center items-center space-y-3 sm:space-y-0 sm:space-x-4 pt-2">
            <button 
              type="button" 
              onClick={requestOtp} 
              // Responsive button sizing
              className={`text-xs w-full sm:w-auto px-4 py-2 border rounded-full font-bold transition ${ACCENT_NEON_YELLOW}`}
              disabled={isLoading}
            >
              Send OTP
            </button>
            <button
              onClick={googleSignIn}
              // Responsive button sizing
              className="text-xs w-full sm:w-auto px-4 py-2 border border-gray-600 text-gray-300 rounded-full hover:border-white transition"
            >
              Sign In with Google
            </button>
          </div>
        </div>

        {/* Footer Security Tags */}
        <div className="mt-12 flex flex-wrap justify-center space-x-3 text-xs font-mono text-gray-500">
          <span className="border border-gray-700 py-1 px-3 rounded-full mb-2">256-BIT SECURED</span>
          <span className="border border-gray-700 py-1 px-3 rounded-full mb-2">DECENTRALIZED</span>
        </div>
      </div>
    </div>
  );
}