// src/pages/Register.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

const API_BASE = "http://127.0.0.1:8000/api";

// Function to enforce basic password complexity (FR01-03)
const validatePassword = (password) => {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(password)) return "Password requires an uppercase letter.";
  if (!/[a-z]/.test(password)) return "Password requires a lowercase letter.";
  if (!/[0-9]/.test(password)) return "Password requires a number.";
  if (!/[!@#$%^&*()]/.test(password))
    return "Password requires a special character.";
  return null;
};

// Back icon
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

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState({ text: "", type: "" });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    setMessage({ text: "", type: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic trims
    const username = formData.username.trim();
    const email = formData.email.trim();

    // Password match
    if (formData.password !== formData.confirmPassword) {
      setMessage({ text: "Passwords do not match.", type: "error" });
      return;
    }

    // Complexity validation
    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      setMessage({ text: passwordError, type: "error" });
      return;
    }

    setIsLoading(true);
    setMessage({ text: "", type: "" });

    try {
      const response = await axios.post(`${API_BASE}/register`, {
        username,
        email,
        password: formData.password,
      });

      setMessage({
        text: response.data.message || "Registration successful.",
        type: "success",
      });

      // Redirect to login after successful registration
      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (error) {
      const errorMsg =
        error.response?.data?.detail?.message ||
        error.response?.data?.message ||
        "Registration failed. Please try again.";
      setMessage({ text: errorMsg, type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cp-bg px-4 py-10">
      <div
        className="
          w-full max-w-lg
          rounded-2xl
          bg-cp-panel
          border border-white/10
          shadow-[0_0_40px_rgba(0,0,0,0.7)]
          relative overflow-hidden
        "
      >
        {/* neon top accent */}
        <div className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-cp-purple via-cp-neon to-cp-magenta opacity-70" />

        <div className="p-6 sm:p-8 text-gray-200">
          {/* Back */}
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
              Join the platform
            </p>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-white">
              Create Account
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-2">
              Set up your access to the sentiment & transaction dashboard.
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

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <label
                htmlFor="username"
                className="block text-xs font-medium text-gray-300 mb-1.5"
              >
                Username
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                placeholder="johndoe"
                className="
                  mt-1 block w-full px-3.5 py-2.5
                  bg-cp-bg/90 border border-gray-700
                  rounded-lg shadow-sm
                  text-sm text-white
                  placeholder:text-gray-500
                  focus:outline-none focus:border-cp-purple focus:ring-1 focus:ring-cp-purple
                  transition-all
                "
              />
            </div>

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
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="john.doe@example.com"
                className="
                  mt-1 block w-full px-3.5 py-2.5
                  bg-cp-bg/90 border border-gray-700
                  rounded-lg shadow-sm
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
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="********"
                className="
                  mt-1 block w-full px-3.5 py-2.5
                  bg-cp-bg/90 border border-gray-700
                  rounded-lg shadow-sm
                  text-sm text-white
                  placeholder:text-gray-500
                  focus:outline-none focus:border-cp-purple focus:ring-1 focus:ring-cp-purple
                  transition-all
                "
              />
              <p className="mt-1 text-[11px] text-gray-500">
                Min 8 chars, incl. uppercase, lowercase, number & symbol.
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-xs font-medium text-gray-300 mb-1.5"
              >
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder="********"
                className="
                  mt-1 block w-full px-3.5 py-2.5
                  bg-cp-bg/90 border border-gray-700
                  rounded-lg shadow-sm
                  text-sm text-white
                  placeholder:text-gray-500
                  focus:outline-none focus:border-cp-purple focus:ring-1 focus:ring-cp-purple
                  transition-all
                "
              />
            </div>

            {/* CTA */}
            <button
              type="submit"
              disabled={isLoading}
              className="
                w-full mt-1
                py-2.5 px-4
                border border-transparent
                rounded-lg shadow-lg
                text-xs sm:text-sm font-bold
                text-white bg-cp-orange
                hover:bg-cp-orange/90
                disabled:opacity-60 disabled:cursor-not-allowed
                focus:outline-none focus:ring-2 focus:ring-offset-2
                focus:ring-cp-orange focus:ring-offset-cp-panel
                uppercase tracking-[0.15em]
                transition-all
              "
            >
              {isLoading ? "Creating..." : "Create Account"}
            </button>
          </form>

          <div className="mt-7 text-center text-xs sm:text-sm text-gray-400">
            Already have an account?
            <Link
              to="/login"
              className="ml-1 font-medium text-cp-neon hover:text-cp-neon/80 transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
