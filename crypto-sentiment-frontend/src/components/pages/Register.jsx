import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const safeEnv = typeof process !== "undefined" && process.env ? process.env : {};
const API_BASE = safeEnv.REACT_APP_API_BASE || "https://malisa-nonexaggerating-slobberingly.ngrok-free.dev/api";
const OAUTH_HOST = safeEnv.REACT_APP_OAUTH_HOST || "https://malisa-nonexaggerating-slobberingly.ngrok-free.dev";

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", username: "", password: "" });
  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = e => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);
    try {
      const res = await axios.post(`${API_BASE}/account/register`, formData);
      setMessage({ type: "success", text: res.data.detail || "Account created successfully. " });

      // optionally request OTP for verification
      try {
        await axios.post(`${API_BASE}/auth/otp/request`, { email: formData.email });
        setMessage(prev => ({
          ...prev,
          text: (prev?.text || "") + " Please check your email for the verification OTP."
        }));
        // Optional: Redirect to OTP verification page instead of dashboard
        // navigate('/verify-otp', { state: { email: formData.email } });
      } catch (otpError) {
        console.warn("Could not request OTP immediately:", otpError);
      }

      // ✅ Redirect user to dashboard after successful registration
      navigate("/dashboard");

    } catch (error) {
      const errorMsg = error.response?.data?.detail || "An unknown error occurred during registration.";
      setMessage({ type: "error", text: errorMsg });
    } finally {
      setIsLoading(false);
    }
  };

  // Google Sign-In
  const googleSignIn = () => {
    window.location.href = `${OAUTH_HOST}/api/auth/google/login`;
  };

  // --- THEME CONSTANTS (Matching the Login Page) ---
  const ACCENT_RED_ORANGE = 'bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/60';
  const ACCENT_NEON_YELLOW_TEXT = 'text-lime-400 hover:text-white transition';
  const INPUT_STYLE = 'w-full p-4 bg-gray-700/50 text-white border-b-2 border-transparent focus:outline-none focus:border-red-600 transition duration-300 placeholder-gray-500 text-base';
  const LABEL_STYLE = 'block mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider';

  return (
    <div className="flex items-center justify-center min-h-screen bg-black p-4 font-sans antialiased text-white relative">
      <div className="absolute top-10 right-10 w-4 h-4 bg-red-600 transform rotate-45"></div>
      <div className="absolute bottom-10 left-10 w-4 h-4 bg-lime-400 transform rotate-45"></div>

      <div className="w-full max-w-md bg-gray-900/90 backdrop-blur-sm p-8 md:p-12 rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-gray-800 relative z-10">
        <p className="text-sm tracking-[0.3em] text-center mb-8 text-lime-400 font-bold uppercase">
          @CRYPTOSWNT
        </p>

        <h1 className="text-2xl sm:text-3xl font-extrabold mb-10 text-center uppercase leading-tight">
          CREATE <br />
          <span className="text-red-600 tracking-widest">NEW IDENTITY</span>
        </h1>

        {message && (
          <div
            className={`p-3 mb-6 rounded border-l-4 font-medium text-sm ${
              message.type === "error"
                ? "bg-red-900/40 text-red-300 border-red-600"
                : "bg-lime-900/40 text-lime-300 border-lime-400"
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className={LABEL_STYLE}>Email Address</label>
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

          <div>
            <label className={LABEL_STYLE}>Username</label>
            <input
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="choose_handle"
              className={INPUT_STYLE}
              required
            />
          </div>

          <div>
            <label className={LABEL_STYLE}>Password</label>
            <input
              name="password"
              value={formData.password}
              onChange={handleChange}
              type="password"
              placeholder="secure_password"
              className={INPUT_STYLE}
              required
            />
          </div>

          <button
            type="submit"
            className={`w-full py-4 mt-8 text-white rounded-md font-bold uppercase tracking-widest transition disabled:bg-gray-700 disabled:shadow-none ${ACCENT_RED_ORANGE}`}
            disabled={isLoading}
          >
            {isLoading ? "PROVISIONING..." : "DEPLOY ACCOUNT"}
          </button>
        </form>

        <div className="my-8 border-t border-gray-700 pt-8 text-center">
          <p className="text-sm mb-6 text-gray-500 uppercase tracking-widest">
            — Or Use External Identity —
          </p>

          <button
            onClick={googleSignIn}
            className="w-full py-3 rounded-md bg-gray-800 text-gray-300 border border-gray-700 shadow-md hover:bg-gray-700 hover:text-white transition flex items-center justify-center space-x-3 font-medium"
          >
            {/* Google Icon */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
              <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,7.92-11.303,7.92c-6.769,0-12.263-5.494-12.263-12.264s5.494-12.264,12.263-12.264c3.18,0,6.046,1.107,8.336,3.018l5.657-5.657C34.046,6.01,29.283,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.684,43.821,21.31,43.611,20.083z"/>
              <path fill="#FF3D00" d="M6.306,14.691l6.084,4.526C14.542,14.771,18.969,12,24,12c3.059,0,5.852,1.194,7.938,3.167l5.657-5.657C34.046,6.01,29.283,4,24,4C12.955,4,4,12.955,4,24c0,3.585,0.912,6.945,2.443,9.889L12.55,28.67C11.668,26.477,11.166,24.238,11.166,24C11.166,20.015,12.915,16.516,16.036,14.691L6.306,14.691z"/>
              <path fill="#4CAF50" d="M11.166,35.309C12.915,38.484,16.036,41.485,20,41.485C25.045,41.485,29.283,39.01,31.789,35.656l-5.657-5.657C24.852,31.806,22.059,33,19.006,33C14.07,33,9.658,30.339,7.926,26.79l-6.084,4.526C4.912,34.055,4,37.415,4,41.485c0,1.385,0.179,2.756,0.389,4.083H43.611C43.821,44.756,44,43.385,44,42.485C44,38.515,43.088,35.155,41.557,32.211L35.473,27.685C34.66,30.413,32.992,32.485,31.11,34.077L11.166,35.309z"/>
              <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.128,0.512-0.347,1.011-0.655,1.489H35.342l5.657,5.657C42.821,32.083,43.611,29.412,43.611,26.485c0-1.07-0.091-2.124-0.264-3.155H24v-5.247H43.611z"/>
            </svg>
            <span>Sign Up with Google</span>
          </button>
        </div>

        <p className="mt-8 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <a
            onClick={() => navigate("/login")}
            className={`cursor-pointer font-bold ${ACCENT_NEON_YELLOW_TEXT}`}
          >
            Log in
          </a>
        </p>

        <div className="mt-12 flex flex-wrap justify-center space-x-3 text-xs font-mono text-gray-500">
          <span className="border border-gray-700 py-1 px-3 rounded-full mb-2">
            IMMUTABLE LEDGER
          </span>
          <span className="border border-gray-700 py-1 px-3 rounded-full mb-2">
            SECURE END-TO-END
          </span>
        </div>
      </div>
    </div>
  );
}
