"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
  Users,
  PhoneCall,
  Megaphone,
  Sliders,
  BarChart3,
  Edit2,
  Check,
  X
} from "lucide-react";
import { logout, getUserInfo, isLoggedIn, fetchMe, saveUserInfo, updateProfile } from "@/lib/api";

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Contacts",
    href: "/dashboard/contacts",
    icon: Users,
  },
  {
    label: "Agent Configs",
    href: "/dashboard/agent-configs",
    icon: Sliders,
  },
  {
    label: "Campaigns",
    href: "/dashboard/campaigns",
    icon: Megaphone,
  },
  {
    label: "Call History",
    href: "/dashboard/call-logs",
    icon: PhoneCall,
  },
  {
    label: "Analytics",
    href: "/dashboard/analytics",
    icon: BarChart3,
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
  const [userInfo, setUserInfo] = useState({ name: "User", email: "" });
  const [loggingOut, setLoggingOut] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);

  // Load user info from localStorage, then refresh from API
  useEffect(() => {
    const stored = getUserInfo();
    Promise.resolve().then(() => {
      setUserInfo(stored);
    });

    if (isLoggedIn()) {
      fetchMe()
        .then((profile) => {
          const name = profile.full_name || profile.email;
          saveUserInfo(name, profile.email);
          setUserInfo({ name, email: profile.email });
        })
        .catch(() => {
          // Token may be invalid — apiFetch will handle redirect
        });
    }
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } catch {
      // ignore errors during logout
    }
    router.push("/login");
  };

  const handleSaveName = async () => {
    if (!editNameValue.trim() || editNameValue === userInfo.name) {
      setIsEditingName(false);
      return;
    }
    setIsSavingName(true);
    try {
      await updateProfile(editNameValue);
      setUserInfo({ ...userInfo, name: editNameValue });
      setIsEditingName(false);
    } catch (error) {
      console.error("Failed to update profile name:", error);
      // fallback to old name
      setEditNameValue(userInfo.name);
    } finally {
      setIsSavingName(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      setIsEditingName(false);
      setEditNameValue(userInfo.name);
    }
  };

  return (
    <aside
      className={`relative flex flex-col bg-[#020617] border-r border-white/5 transition-all duration-300 ease-in-out ${
        collapsed ? "w-16" : "w-64"
      } min-h-screen shrink-0`}
    >
      {/* Toggle button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-6 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-[#0F172A] text-slate-400 hover:text-white hover:border-[#2563EB]/50 transition-all duration-200 shadow-md"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        id="sidebar-toggle"
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>

      {/* Logo */}
      <div className={`flex items-center gap-3 p-5 border-b border-white/5 ${collapsed ? "justify-center" : ""}`}>
        <div className="flex-shrink-0 relative h-9 w-9">
          <Image 
            src="/logo.png" 
            alt="VoiceFlow-AI Logo" 
            fill 
            className="object-contain"
          />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-white leading-tight tracking-tight">VoiceFlow-AI</p>
            <p className="text-[10px] text-[#06B6D4] font-medium tracking-wide">AI Email Studio</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
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
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative ${
                isActive
                  ? "bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] text-white shadow-lg shadow-[#2563EB]/15 border border-white/10"
                  : "text-slate-400 hover:text-white hover:bg-[#1E293B]/60"
              } ${collapsed ? "justify-center" : ""}`}
              id={`nav-${item.label.toLowerCase().replace(/\s/g, "-")}`}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#06B6D4] rounded-r-full" />
              )}
              <Icon className={`h-4.5 w-4.5 flex-shrink-0 ${isActive ? "text-white animate-pulse" : "text-slate-500 group-hover:text-slate-300"}`} />
              {!collapsed && <span>{item.label}</span>}

              {/* Tooltip for collapsed state */}
              {collapsed && (
                <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-[#0F172A] border border-white/10 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 shadow-xl">
                  {item.label}
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#0F172A]" />
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Profile + Logout */}
      <div className="p-3 border-t border-white/5 space-y-1">
        <div
          className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-tr from-[#2563EB] to-[#06B6D4] flex items-center justify-center shadow-md">
            <User className="h-4 w-4 text-white" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden flex-1 group/profile flex items-center justify-between pr-1">
              <div className="overflow-hidden flex-1">
                {isEditingName ? (
                  <div className="flex items-center gap-1">
                    <input
                      autoFocus
                      type="text"
                      className="text-xs font-semibold text-white bg-[#1E293B] border border-white/10 rounded px-1.5 py-0.5 w-full focus:outline-none focus:border-[#2563EB]"
                      value={editNameValue}
                      onChange={(e) => setEditNameValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={isSavingName}
                    />
                    <button onClick={handleSaveName} disabled={isSavingName} className="text-[#06B6D4] hover:text-[#06B6D4]/80">
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => { setIsEditingName(false); setEditNameValue(userInfo.name); }} disabled={isSavingName} className="text-rose-500 hover:text-rose-400">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-white truncate">{userInfo.name}</p>
                      <button 
                        onClick={() => { setEditNameValue(userInfo.name); setIsEditingName(true); }}
                        className="opacity-0 group-hover/profile:opacity-100 transition-opacity text-slate-500 hover:text-slate-300 ml-2"
                        aria-label="Edit profile name"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">{userInfo.email}</p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          id="logout-btn"
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all duration-200 group disabled:opacity-50 ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <LogOut className="h-4.5 w-4.5 flex-shrink-0 group-hover:text-rose-500" />
          {!collapsed && <span>{loggingOut ? "Logging out…" : "Logout"}</span>}
        </button>
      </div>
    </aside>
  );
};
