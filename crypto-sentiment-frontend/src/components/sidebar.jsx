// src/components/sidebar.jsx
import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  ChartPieIcon,
  ArrowTrendingUpIcon,
  WalletIcon,
  CreditCardIcon,
  UserIcon,
  ArrowLeftEndOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import Logo from "../assets/WHITE.png";

// Single nav item component
const NavItem = ({ to, children, Icon, onClick }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex items-center px-4 py-3 rounded-lg mb-1 transition-all text-sm font-medium ${
        isActive
          ? "bg-cp-purple/20 text-cp-neon shadow-inner shadow-cp-purple/10"
          : "text-gray-400 hover:bg-cp-bg hover:text-white"
      }`
    }
    onClick={onClick}
  >
    {Icon && <Icon className="w-5 h-5 mr-3" />}
    {children}
  </NavLink>
);

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);

  const closeMobileMenu = () => setIsOpen(false);
  const toggleMobileMenu = () => setIsOpen((prev) => !prev);

  return (
    <>
      {/* Mobile top bar */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-cp-panel border-b border-gray-900 z-30">
        <div className="flex items-center gap-2">
          <img src={Logo} alt="logo" className="w-7 h-7 object-contain" />
          <h2 className="text-lg font-display font-black text-cp-neon">
            CRYPTO<span className="text-white">SENT</span>
          </h2>
        </div>
        <button
          onClick={toggleMobileMenu}
          className="p-2 rounded-md bg-cp-bg border border-white/10 text-gray-200"
        >
          {isOpen ? (
            <XMarkIcon className="w-6 h-6" />
          ) : (
            <Bars3Icon className="w-6 h-6" />
          )}
        </button>
      </header>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-10 md:hidden"
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar (fixed left, full height) */}
      <aside
        className={`
          fixed inset-y-0 left-0 w-64 h-screen bg-cp-panel border-r border-gray-900 p-4
          flex flex-col shadow-xl z-20 transform transition-transform duration-200
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0
        `}
      >
        {/* Logo/Title (desktop) */}
        <div className="mb-10 mt-2 hidden md:flex items-center gap-2">
          <img src={Logo} alt="logo" className="w-8 h-8 object-contain" />
          <h2 className="text-xl font-display font-black text-cp-neon">
            CRYPTO<span className="text-white">SENT</span>
          </h2>
        </div>

        {/* Logo/Title (inside drawer on mobile) */}
        <div className="mb-6 mt-2 flex md:hidden items-center gap-2">
          <img src={Logo} alt="logo" className="w-7 h-7 object-contain" />
          <h2 className="text-lg font-display font-black text-cp-neon">
            CRYPTO<span className="text-white">SENT</span>
          </h2>
        </div>

        {/* Scrollable nav area */}
        <div className="flex-1 overflow-y-auto pr-1">
          <nav className="space-y-2">
            <NavItem
              to="/dashboard"
              Icon={ChartPieIcon}
              onClick={closeMobileMenu}
            >
              Dashboard
            </NavItem>
            <NavItem
              to="/analysis"
              Icon={ArrowTrendingUpIcon}
              onClick={closeMobileMenu}
            >
              Sentiment Analysis
            </NavItem>
            <NavItem
              to="/prediction"
              Icon={ArrowTrendingUpIcon}
              onClick={closeMobileMenu}
            >
              Trend Prediction
            </NavItem>
            <NavItem
              to="/transactions"
              Icon={WalletIcon}
              onClick={closeMobileMenu}
            >
              Transactions
            </NavItem>
           
            <NavItem
              to="/account"
              Icon={UserIcon}
              onClick={closeMobileMenu}
            >
              Account
            </NavItem>
          </nav>
        </div>

        {/* Logout + version — always at bottom */}
        <div className="pt-4 border-t border-gray-800 mt-4">
          <NavLink
            to="/login"
            className="flex items-center px-4 py-3 rounded-lg text-gray-400 hover:bg-cp-bg hover:text-white transition-colors"
            onClick={closeMobileMenu}
          >
            <ArrowLeftEndOnRectangleIcon className="w-5 h-5 mr-3" />
            Logout
          </NavLink>

          <div className="mt-2 text-xs text-gray-600">v2.0</div>
        </div>
      </aside>
    </>
  );
}
