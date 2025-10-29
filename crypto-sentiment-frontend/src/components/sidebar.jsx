// src/components/Sidebar.jsx
import React from 'react'
import { NavLink } from 'react-router-dom'
// Assuming you have installed heroicons: npm install @heroicons/react
import { ChartPieIcon, ArrowTrendingUpIcon, WalletIcon, CreditCardIcon, UserIcon, ArrowLeftEndOnRectangleIcon } from '@heroicons/react/24/outline' 

const NavItem = ({to, children, Icon}) => (
    // ⚠️ Reverted styling: Dark sidebar text, blue active state
    <NavLink to={to} className={({isActive})=>`flex items-center px-4 py-3 rounded-md mb-1 transition-colors ${
        isActive
            ? 'bg-blue-600 text-white' // Active link: Blue background, white text
            : 'text-gray-500 hover:bg-gray-700 hover:text-white' // Inactive link: Dark background, light text on hover
    }`}>
        {Icon && <Icon className="w-5 h-5 mr-3" />}
        {children}
    </NavLink>
)

export default function Sidebar(){
    return (
        // ⚠️ Updated container style: Dark gray background (bg-gray-800)
        <aside className="w-64 bg-gray-800 border-r border-gray-700 p-4 flex flex-col"> 
            
            {/* Logo/Title */}
            <div className="mb-8 mt-2">
                {/* Text color changed to white/light gray */}
                <h2 className="text-2xl font-bold text-gray-100">CryptoSent</h2>
            </div>

            {/* Main Navigation */}
            <nav className="flex-1 space-y-1">
                {/* Routes remain the same */}
                <NavItem to="/dashboard" Icon={ChartPieIcon}>Dashboard</NavItem>
                <NavItem to="/analysis" Icon={ArrowTrendingUpIcon}>Sentiment Analysis</NavItem>
                <NavItem to="/prediction" Icon={ArrowTrendingUpIcon}>Trend Prediction</NavItem>
                <NavItem to="/transactions" Icon={WalletIcon}>Transactions</NavItem>
                <NavItem to="/payments" Icon={CreditCardIcon}>Payments</NavItem>
                <NavItem to="/account" Icon={UserIcon}>Account</NavItem>
            </nav>

            {/* Logout Link */}
            <div className="mt-auto">
                <NavLink to="/login" className="flex items-center px-4 py-3 rounded-md mb-1 text-gray-400 hover:bg-gray-700 transition-colors">
                    <ArrowLeftEndOnRectangleIcon className="w-5 h-5 mr-3" />
                    Logout
                </NavLink>
            </div>

            {/* Footer text color changed */}
            <div className="mt-4 pt-4 border-t border-gray-700 text-xs text-gray-500">v2.0</div>
        </aside>
    )
}