// src/components/auth/VerifyOTP.jsx (New File)
import React, { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import axios from "axios";

// Match the API base used in Login.jsx
const API_BASE = "http://127.0.0.1:8000/api"; 

export default function VerifyOTP() {
  const navigate = useNavigate();
  // useLocation gets the state passed during navigation from Login.jsx
  const location = useLocation(); 
  const email = location.state?.email; 

  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState({ text: "", type: "" });
  const [isLoading, setIsLoading] = useState(false);

  // Guard clause: if user somehow landed here without an email, send them back
  if (!email) {
    navigate("/login"); 
    return null;
  }

  const handleVerify = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ text: "", type: "" });

    // Client-side validation for OTP format
    if (otp.length !== 6 || !/^\d+$/.test(otp)) {
        setMessage({ text: "Please enter a valid 6-digit OTP.", type: "error" });
        setIsLoading(false);
        return;
    }

    try {
      const response = await axios.post(`${API_BASE}/auth/verify-otp`, {
        email: email,
        otp: otp,
      });

      // OTP verified successfully (from the 200 OK response)
      if (response.data.success) {
        // Save the session data (matching your original Login.jsx logic)
        localStorage.setItem("userLoggedIn", "true");
        localStorage.setItem("userEmail", response.data.email);
        localStorage.setItem("username", response.data.username);
        
        setMessage({ text: "Verification successful! Redirecting...", type: "success" });
        setTimeout(() => navigate("/dashboard"), 1000); 
      }
    } catch (err) {
      const errorMsg = err.response?.data?.detail || "Verification failed. Check your code.";
      setMessage({ text: errorMsg, type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-cp-panel">
      <div className="w-full max-w-sm p-8 bg-cp-card rounded-xl shadow-2xl">
        <h2 className="text-xl sm:text-2xl font-extrabold text-white mb-2 text-center">
          Verify Your Login
        </h2>
        <p className="text-sm text-gray-400 mb-6 text-center">
          A 6-digit code has been sent to **{email}**.
        </p>

        <form onSubmit={handleVerify}>
          <div className="mb-6">
            <label htmlFor="otp" className="block text-sm font-medium text-gray-300 mb-2">
              OTP Code
            </label>
            <input 
              id="otp"
              type="text" 
              value={otp} 
              onChange={(e) => setOtp(e.target.value)} 
              maxLength="6"
              placeholder="Enter 6-digit code"
              className="w-full p-3 bg-cp-input border border-cp-border rounded-lg text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-cp-purple focus:ring-1 focus:ring-cp-purple transition-all"
              required
            />
          </div>

          {message.text && (
            <div className={`mb-4 text-xs font-medium p-2 rounded ${message.type === "error" ? "bg-red-900/30 text-red-400" : "bg-green-900/30 text-green-400"}`}>
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-1 py-2.5 px-4 rounded-lg shadow-lg text-xs sm:text-sm font-bold text-white bg-cp-orange hover:bg-cp-orange/90 disabled:opacity-60 transition-all uppercase tracking-[0.15em]"
          >
            {isLoading ? "Verifying..." : "Verify & Login"}
          </button>
        </form>

        <div className="mt-7 text-center text-xs sm:text-sm text-gray-400">
          Didn't receive the code?
          <button
            // You would create a function to resend the code here
            className="ml-1 font-medium text-cp-neon hover:text-cp-neon/80 transition-colors"
            onClick={() => { /* TODO: Implement resend logic */ }}
          >
            Resend Code
          </button>
        </div>
      </div>
    </div>
  );
}