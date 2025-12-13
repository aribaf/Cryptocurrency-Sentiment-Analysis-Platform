// src/components/auth/VerifyOTP.jsx
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

// Match the API base logic used elsewhere (Login/Register)
const safeEnv = typeof process !== "undefined" && process.env ? process.env : {};
const API_BASE =
  safeEnv.REACT_APP_API_BASE ||
  "https://malisa-nonexaggerating-slobberingly.ngrok-free.dev/api";

export default function VerifyOTP() {
  const navigate = useNavigate();
  const location = useLocation();

  // Email passed from Login.jsx: navigate("/verify-otp", { state: { email } })
  const email = location.state?.email;

  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState({ text: "", type: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // If user somehow lands here without email in state, send them back to login
  useEffect(() => {
    if (!email) {
      navigate("/login", { replace: true });
    }
  }, [email, navigate]);

  if (!email) return null;

  const handleVerify = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ text: "", type: "" });

    // Simple OTP validation
    if (otp.length !== 6 || !/^\d+$/.test(otp)) {
      setMessage({ text: "Please enter a valid 6-digit OTP.", type: "error" });
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post(`${API_BASE}/auth/otp/verify`, {
        email,
        otp,
      });

      // Adjust this based on your backend response shape
      // Assuming it returns an access_token like normal login
      if (response.status === 200) {
        if (response.data.access_token) {
          localStorage.setItem("token", response.data.access_token);
        }
        if (response.data.username) {
          localStorage.setItem("username", response.data.username);
        }
        if (response.data.email) {
          localStorage.setItem("userEmail", response.data.email);
        }

        setMessage({
          text: "Verification successful! Redirecting...",
          type: "success",
        });

        setTimeout(() => navigate("/dashboard"), 1000);
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.detail || "Verification failed. Check your code.";
      setMessage({ text: errorMsg, type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    setMessage({ text: "", type: "" });
    try {
      const res = await axios.post(`${API_BASE}/auth/otp/request`, { email });
      setMessage({
        text: res.data.detail || "OTP resent to your email.",
        type: "success",
      });
    } catch (err) {
      const errorMsg =
        err.response?.data?.detail || "Failed to resend OTP. Try again.";
      setMessage({ text: errorMsg, type: "error" });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-cp-panel">
      <div className="w-full max-w-sm p-8 bg-cp-card rounded-xl shadow-2xl">
        <h2 className="text-xl sm:text-2xl font-extrabold text-white mb-2 text-center">
          Verify Your Login
        </h2>

        <p className="text-sm text-gray-400 mb-6 text-center">
          A 6-digit code has been sent to{" "}
          <span className="font-semibold text-white">{email}</span>.
        </p>

        <form onSubmit={handleVerify}>
          <div className="mb-6">
            <label
              htmlFor="otp"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
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
            <div
              className={`mb-4 text-xs font-medium p-2 rounded ${
                message.type === "error"
                  ? "bg-red-900/30 text-red-400"
                  : "bg-green-900/30 text-green-400"
              }`}
            >
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
          Didn&apos;t receive the code?
          <button
            onClick={handleResend}
            disabled={isResending}
            className="ml-1 font-medium text-cp-neon hover:text-cp-neon/80 disabled:opacity-60 transition-colors"
          >
            {isResending ? "Resending..." : "Resend Code"}
          </button>
        </div>
      </div>
    </div>
  );
}
