// src/App.jsx
import React from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
// Corrected path and capitalization
import Sidebar from './components/sidebar' 
import ForgotPassword from './components/pages/ForgotPassword'
// Public Pages
// Corrected path to components/pages/
import Home from './components/pages/Home' 
import Login from './components/pages/Login' 
import Register from './components/pages/Register' 

// Private Pages (Dashboard Views)
// Corrected path to components/pages/ and ensuring file names match (e.g., lowercase dashboard)
import Dashboard from './components/pages/dashboard' 
import SentimentAnalysis from './components/pages/SentimentAnalysis' 
import TrendPrediction from './components/pages/TrendPrediction' 
import Transactions from './components/pages/Transactions' 
import Payments from './components/pages/Payments' 
import Account from './components/pages/Account' 

// Existing views

import News from './components/pages/news'
import About from './components/pages/about'


export default function App(){
    const location = useLocation()
    
    // Determine if the current page should show the sidebar (i.e., is it a dashboard view?)
    const isDashboardLayout = ![
        '/', '/login', '/register', '/about'
    ].includes(location.pathname.toLowerCase())

    const renderDashboardRoutes = () => (
        <Routes>
            {/* New Main Views */}
            <Route path="/dashboard" element={<Dashboard/>} />
            <Route path="/analysis" element={<SentimentAnalysis/>} />
            <Route path="/prediction" element={<TrendPrediction/>} />
            <Route path="/transactions" element={<Transactions/>} />
            <Route path="/payments" element={<Payments/>} />
            <Route path="/account" element={<Account/>} />
            
            {/* Existing/Old Views */}

            <Route path="/news" element={<News/>} />
            <Route path="/about" element={<About/>} />
            <Route path="/" element={<Dashboard/>} /> {/* Default route after login */}
        </Routes>
    )

    const renderPublicRoutes = () => (
        <Routes>
            <Route path="/" element={<Home/>} />
            <Route path="/login" element={<Login/>} />
            <Route path="/register" element={<Register/>} />
            <Route path="/forgot-password" element={<ForgotPassword/>} />
            <Route path="*" element={<Home/>} /> {/* Fallback to Home page for public routes */}
        </Routes>
    )

    // Render the appropriate layout
    if (isDashboardLayout) {
        return (
            <div className="flex min-h-screen bg-gray-50 text-gray-900"> {/* Light background for dashboard */}
                <Sidebar />
                <main className="flex-1 p-6 overflow-auto">
                    {renderDashboardRoutes()}
                </main>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-white text-gray-900">
            {renderPublicRoutes()}
        </div>
    )
}