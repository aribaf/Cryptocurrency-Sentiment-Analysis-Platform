// src/components/auth/Login.jsx (or wherever you keep it)
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

const API_BASE = "http://127.0.0.1:8000/api";

const ArrowLeftIcon = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
    className="w-5 h-5"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10.5 19.5L3 12m0 0 7.5-7.5M3 12h18"
    />
  </svg>
);

export default function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [message, setMessage] = useState({ text: "", type: "" });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setMessage({ text: "", type: "" });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage({ text: "", type: "" });
    setIsLoading(true);

    try {
      const response = await axios.post(
        `${API_BASE}/login`,
        new URLSearchParams({
          username: formData.email,
          password: formData.password,
        }),
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        }
      );

      const data = response.data;

      localStorage.setItem("userLoggedIn", "true");
      localStorage.setItem("userEmail", formData.email);

      if (data.user_id) {
        localStorage.setItem("userId", data.user_id);
      }
      if (data.user) {
        localStorage.setItem("username", data.user);
      }

      setMessage({
        text: data.message || "Login successful!",
        type: "success",
      });

      setTimeout(() => {
        navigate("/dashboard");
      }, 500);
    } catch (error) {
      const errorMsg =
        error.response?.data?.detail?.message ||
        error.response?.data?.message ||
        "Login failed. Please check your credentials.";

      setMessage({ text: errorMsg, type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cp-bg px-4">
      <div
        className="
          w-full max-w-md
          rounded-2xl
          bg-cp-panel
          border border-white/10
          shadow-[0_0_40px_rgba(0,0,0,0.7)]
          relative
          overflow-hidden
        "
      >
        {/* subtle neon border accent */}
        <div className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-cp-purple via-cp-neon to-cp-magenta opacity-70" />

        <div className="p-6 sm:p-8 text-gray-200">
          {/* Back Button */}
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="
              inline-flex items-center gap-1 text-xs font-medium
              text-gray-400 hover:text-cp-neon
              transition-colors mb-4
            "
          >
            <ArrowLeftIcon />
            Go Back
          </button>

          {/* Heading */}
          <div className="text-center mb-6">
            <p className="text-[11px] uppercase tracking-[0.25em] text-gray-500 mb-2">
              Welcome back
            </p>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-white">
              Access Account
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-2">
              Enter your credentials to access your sentiment dashboard.
            </p>
          </div>

          {/* Message */}
          {message.text && (
            <div
              className={`
                p-3 mb-5 rounded-md text-xs sm:text-sm font-mono
                border
                ${
                  message.type === "error"
                    ? "bg-red-900/40 text-red-200 border-red-700/70"
                    : "bg-emerald-900/40 text-emerald-200 border-emerald-700/70"
                }
              `}
            >
              {message.text}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium text-gray-300 mb-1.5"
              >
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="user@example.com"
                className="
                  block w-full px-3.5 py-2.5
                  bg-cp-bg/90
                  border border-gray-700
                  rounded-lg
                  text-sm text-white
                  placeholder:text-gray-500
                  focus:outline-none focus:border-cp-purple focus:ring-1 focus:ring-cp-purple
                  transition-all
                "
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium text-gray-300 mb-1.5"
              >
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                autoComplete="current-password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="********"
                className="
                  block w-full px-3.5 py-2.5
                  bg-cp-bg/90
                  border border-gray-700
                  rounded-lg
                  text-sm text-white
                  placeholder:text-gray-500
                  focus:outline-none focus:border-cp-purple focus:ring-1 focus:ring-cp-purple
                  transition-all
                "
              />
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-gray-400">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500/70" />
                <span>Secure OAuth2 login</span>
              </div>

              <Link
                to="/forgot-password"
                className="
                  font-medium text-cp-neon
                  hover:text-cp-neon/80
                  transition-colors
                "
              >
                Forgot password?
              </Link>
            </div>

            {/* CTA */}
            <button
              type="submit"
              disabled={isLoading}
              className="
                w-full mt-2
                py-2.5 px-4
                rounded-lg
                text-xs sm:text-sm font-bold
                tracking-[0.15em] uppercase
                bg-cp-orange text-white
                shadow-lg shadow-cp-orange/30
                hover:bg-cp-orange/90
                disabled:opacity-60 disabled:cursor-not-allowed
                focus:outline-none focus:ring-2 focus:ring-offset-2
                focus:ring-cp-orange focus:ring-offset-cp-panel
                transition-all
              "
            >
              {isLoading ? "Processing..." : "Login"}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-7 text-center text-xs sm:text-sm text-gray-400">
            Don&apos;t have an account?
            <Link
              to="/register"
              className="
                ml-1 font-medium text-cp-neon
                hover:text-cp-neon/80
                transition-colors
              "
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
