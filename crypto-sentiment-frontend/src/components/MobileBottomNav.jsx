import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  TrendingUp,
  MessageSquare,
  Newspaper,
  Settings,
} from "lucide-react";

const MobileBottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { icon: BarChart3, label: "Dashboard", path: "/dashboard" },
    { icon: TrendingUp, label: "Sentiment", path: "/analysis" },
    { icon: Newspaper, label: "Trends", path: "/prediction" },
    { icon: MessageSquare, label: "Transactions", path: "/transactions" },
    { icon: Settings, label: "Account", path: "/account" },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-cp-bg border-t border-gray-900 z-40 h-20 flex items-center">
      <div className="w-full flex justify-around items-center px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center w-16 h-16 rounded-lg transition-all ${
                active
                  ? "bg-cp-neon/20 text-cp-neon"
                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-900/50"
              }`}
              title={item.label}
            >
              <Icon size={24} />
              <span className="text-xs mt-1 font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
