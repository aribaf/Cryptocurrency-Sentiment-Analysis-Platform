// src/components/auth/VerifyOTP.jsx
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

// ✅ Base URL WITHOUT /api
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

export default function VerifyOTP() {
  const navigate = useNavigate();
  const location = useLocation();

  // Email passed from Login.jsx
  const email = location.state?.email;

  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState({ text: "", type: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // Redirect if user lands here without email
  useEffect(() => {
    if (!email) {
      navigate("/login", { replace: true });
    }
  }, [email, navigate]);

  if (!email) return null;

  // =========================
  // VERIFY OTP
  // =========================
  const handleVerify = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ text: "", type: "" });

    if (!/^\d{6}$/.test(otp)) {
      setMessage({ text: "Please enter a valid 6-digit OTP.", type: "error" });
      setIsLoading(false);
      return;
    }

    try {
      const res = await axios.post(
        `${API_BASE}/api/auth/otp/verify`,
        { email, otp },
        { headers: { "Content-Type": "application/json" } }
      );

      if (res.status === 200 && res.data.access_token) {
        localStorage.setItem("token", res.data.access_token);
        localStorage.setItem("userEmail", email);

        setMessage({
          text: "Verification successful! Redirecting...",
          type: "success",
        });

        setTimeout(() => navigate("/dashboard"), 800);
      }
    } catch (err) {
      setMessage({
        text:
          err.response?.data?.detail ||
          "Verification failed. Please try again.",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // =========================
  // RESEND OTP
  // =========================
  const handleResend = async () => {
    setIsResending(true);
    setMessage({ text: "", type: "" });

    try {
      const res = await axios.post(
        `${API_BASE}/api/auth/otp/request`,
        { email },
        { headers: { "Content-Type": "application/json" } }
      );

      setMessage({
        text: res.data?.detail || "OTP resent to your email.",
        type: "success",
      });
    } catch (err) {
      setMessage({
        text:
          err.response?.data?.detail ||
          "Failed to resend OTP. Try again.",
        type: "error",
      });
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
            <label className="block text-sm font-medium text-gray-300 mb-2">
              OTP Code
            </label>
            <input
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
            className="w-full py-2.5 px-4 rounded-lg shadow-lg text-xs sm:text-sm font-bold text-white bg-cp-orange hover:bg-cp-orange/90 disabled:opacity-60 transition-all uppercase tracking-[0.15em]"
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
