// src/components/sidebar.jsx
import React from 'react'
import { NavLink } from 'react-router-dom'
// Assuming you have installed heroicons: npm install @heroicons/react
import { ChartPieIcon, ArrowTrendingUpIcon, WalletIcon, CreditCardIcon, UserIcon, ArrowLeftEndOnRectangleIcon } from '@heroicons/react/24/outline' 
import Logo from "../assets/logo-white.svg"; // Import logo for use in the sidebar

// Define the NavItem component with the new theme logic
const NavItem = ({to, children, Icon}) => (
    <NavLink 
        to={to} 
        className={({isActive})=>`flex items-center px-4 py-3 rounded-lg mb-1 transition-all text-sm font-medium ${
        isActive
            // Active link: Subtle purple background, bright neon text, and shadow
            ? 'bg-cp-purple/20 text-cp-neon shadow-inner shadow-cp-purple/10' 
            // Inactive link: Gray text, hover dark background, hover white text
            : 'text-gray-400 hover:bg-cp-bg hover:text-white' 
    }`}>
        {Icon && <Icon className="w-5 h-5 mr-3" />}
        {children}
    </NavLink>
)

export default function Sidebar(){
    return (
        // Use custom panel color for the sidebar background
        <aside className="w-64 bg-cp-panel border-r border-gray-900 p-4 flex flex-col shadow-xl z-20"> 
            
            {/* Logo/Title */}
            <div className="mb-10 mt-2 flex items-center gap-2">
                <img src={Logo} alt="logo" className="w-8 h-8 object-contain" />
                {/* Accent the site name with the Neon color */}
                <h2 className="text-xl font-display font-black text-cp-neon">CRYPTO<span className="text-white">SENT</span></h2>
            </div>

            {/* Main Navigation */}
            <nav className="flex-1 space-y-2">
                <NavItem to="/dashboard" Icon={ChartPieIcon}>Dashboard</NavItem>
                <NavItem to="/analysis" Icon={ArrowTrendingUpIcon}>Sentiment Analysis</NavItem>
                <NavItem to="/prediction" Icon={ArrowTrendingUpIcon}>Trend Prediction</NavItem>
                <NavItem to="/transactions" Icon={WalletIcon}>Transactions</NavItem>
                <NavItem to="/payments" Icon={CreditCardIcon}>Payments</NavItem>
                <NavItem to="/account" Icon={UserIcon}>Account</NavItem>
            </nav>

            {/* Logout Link */}
            <div className="mt-auto">
                <div className="pt-4 border-t border-gray-800">
                    <NavLink to="/login" className="flex items-center px-4 py-3 rounded-lg text-gray-400 hover:bg-cp-bg hover:text-white transition-colors">
                        <ArrowLeftEndOnRectangleIcon className="w-5 h-5 mr-3" />
                        Logout
                    </NavLink>
                </div>
            </div>

            {/* Footer text color changed */}
            <div className="mt-2 pt-2 text-xs text-gray-600">v2.0</div>
        </aside>
    )
}