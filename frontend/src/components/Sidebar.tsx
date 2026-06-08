"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquare,
  Mail,
  Mic,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Zap,
  User,
} from "lucide-react";

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Conversations",
    href: "/dashboard/conversations",
    icon: MessageSquare,
  },
  {
    label: "Email Generator",
    href: "/dashboard/email-generator",
    icon: Mail,
  },
  {
    label: "Voice Upload",
    href: "/dashboard/voice-upload",
    icon: Mic,
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    router.push("/login");
  };

  return (
    <aside
      className={`relative flex flex-col glass border-r border-zinc-800/60 transition-all duration-300 ease-in-out ${
        collapsed ? "w-16" : "w-64"
      } min-h-screen shrink-0`}
    >
      {/* Toggle button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-6 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-white hover:border-indigo-500/50 transition-all duration-200 shadow-md"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        id="sidebar-toggle"
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>

      {/* Logo */}
      <div className={`flex items-center gap-3 p-4 border-b border-zinc-800/60 ${collapsed ? "justify-center" : ""}`}>
        <div className="flex-shrink-0 p-2 bg-indigo-600/20 border border-indigo-500/30 rounded-xl">
          <Zap className="h-5 w-5 text-indigo-400" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-white leading-tight tracking-tight">VoiceFlow-AI</p>
            <p className="text-[10px] text-indigo-400/80 font-medium">AI Email Studio</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative ${
                isActive
                  ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/20 shadow-sm shadow-indigo-500/10"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60"
              } ${collapsed ? "justify-center" : ""}`}
              id={`nav-${item.label.toLowerCase().replace(/\s/g, "-")}`}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-indigo-400 rounded-r-full" />
              )}
              <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? "text-indigo-400" : "text-zinc-500 group-hover:text-zinc-300"}`} />
              {!collapsed && <span>{item.label}</span>}

              {/* Tooltip for collapsed state */}
              {collapsed && (
                <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-zinc-800 border border-zinc-700 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 shadow-xl">
                  {item.label}
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-zinc-800" />
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Profile + Logout */}
      <div className="p-3 border-t border-zinc-800/60 space-y-1">
        <div
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <div className="flex-shrink-0 h-7 w-7 rounded-full bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center shadow-sm">
            <User className="h-3.5 w-3.5 text-white" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-zinc-200 truncate">Demo User</p>
              <p className="text-[10px] text-zinc-500 truncate">demo@voiceflow.ai</p>
            </div>
          )}
        </div>
        <button
          onClick={handleLogout}
          id="logout-btn"
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-200 group ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <LogOut className="h-4 w-4 flex-shrink-0 group-hover:text-rose-400" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
};
