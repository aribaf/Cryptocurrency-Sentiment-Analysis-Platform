// src/App.jsx
import React from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";

/* Layouts / common components */
import Sidebar from "./components/sidebar";

/* Public pages */
import Home from "./components/pages/Home";
import Login from "./components/pages/Login";
import Register from "./components/pages/Register";
import ForgotPassword from "./components/pages/ForgotPassword";
import About from "./components/pages/about";

/* Dashboard / private pages */
import Dashboard from "./components/pages/dashboard";
import SentimentAnalysis from "./components/pages/SentimentAnalysis";
import TrendPrediction from "./components/pages/TrendPrediction";
import Transactions from "./components/pages/Transactions";
import Payments from "./components/pages/Payments";
import Account from "./components/pages/Account";
import TransactionsPage from "./components/pages/Transactions";

/* Other views */
import News from "./components/pages/news";

/* New breakdown page */
import Breakdown from "./components/pages/Breakdown";

/**
 * AppRoutes expects to be rendered inside a Router (BrowserRouter),
 * which your main.jsx already provides.
 */
function AppRoutes() {
  const location = useLocation();

  // pages that should NOT show the sidebar (public pages)
  const PUBLIC_PATHS = ["/", "/login", "/register", "/about", "/forgot-password"];

  // show dashboard layout for everything else
  const isDashboardLayout = !PUBLIC_PATHS.includes(location.pathname.toLowerCase());

  // central Routes tree
  const routesTree = (
  <Routes>
    {/* Public routes */}
    <Route path="/" element={<Home />} />
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="/forgot-password" element={<ForgotPassword />} />
    <Route path="/about" element={<About />} />

    {/* Dashboard / private routes */}
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/analysis" element={<SentimentAnalysis />} />
    <Route path="/prediction" element={<TrendPrediction />} />
    <Route path="/transactions" element={<TransactionsPage />} />
    <Route path="/payments" element={<Payments />} />
    <Route path="/account" element={<Account />} />

    {/* Other */}
    <Route path="/news" element={<News />} />
    <Route path="/breakdown/:source" element={<Breakdown />} />

    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

  // render with or without sidebar
if (isDashboardLayout) {
    // UPDATED: Use dark theme for the dashboard layout
    return (
      <div className="flex min-h-screen bg-cp-bg text-gray-200">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">{routesTree}</main>
      </div>
    );
  }

// Also ensure the public route wrapper is using the theme correctly
// The original code was using inline style, switching to the new class
return <div className="min-h-screen bg-cp-bg text-gray-200">{routesTree}</div>;
}

/* top-level App should NOT include BrowserRouter because main.jsx... */
export default AppRoutes;
