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
  User,
  Users,
  PhoneCall,
  Megaphone,
  Sliders,
  BarChart3,
  Edit2,
  Check,
  X,
  Sparkles,
  Languages,
} from "lucide-react";
import { logout, getUserInfo, isLoggedIn, fetchMe, saveUserInfo, updateProfile } from "@/lib/api";

const navSections = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard",   href: "/dashboard",              icon: LayoutDashboard },
      { label: "Analytics",   href: "/dashboard/analytics",    icon: BarChart3 },
    ],
  },
  {
    label: "Outreach",
    items: [
      { label: "Contacts",        href: "/dashboard/contacts",       icon: Users },
      { label: "Outbound AI Calls", href: "/dashboard/campaigns",    icon: Megaphone },
      { label: "Call History",    href: "/dashboard/call-logs",      icon: PhoneCall },
    ],
  },
  {
    label: "AI Tools",
    items: [
      { label: "Agent Configs",   href: "/dashboard/agent-configs",  icon: Sliders },
      { label: "Conversations",   href: "/dashboard/conversations",  icon: MessageSquare },
      { label: "Email Generator", href: "/dashboard/email-generator",icon: Mail },
      { label: "Voice Upload",    href: "/dashboard/voice-upload",   icon: Mic },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Settings",        href: "/dashboard/settings",       icon: Settings },
    ],
  },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen = false, onMobileClose }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [userInfo, setUserInfo] = useState({ name: "User", email: "" });
  const [loggingOut, setLoggingOut] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);

  useEffect(() => {
    const stored = getUserInfo();
    Promise.resolve().then(() => setUserInfo(stored));
    if (isLoggedIn()) {
      fetchMe()
        .then((profile) => {
          const name = profile.full_name || profile.email;
          saveUserInfo(name, profile.email);
          setUserInfo({ name, email: profile.email });
        })
        .catch(() => {});
    }
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try { await logout(); } catch {}
    router.push("/login");
  };

  const handleSaveName = async () => {
    if (!editNameValue.trim() || editNameValue === userInfo.name) {
      setIsEditingName(false);
      return;
    }
    // Optimistically update locally first — close editor immediately
    const newName = editNameValue.trim();
    setUserInfo({ ...userInfo, name: newName });
    saveUserInfo(newName, userInfo.email);
    setIsEditingName(false);
    setIsSavingName(true);
    try {
      await updateProfile(newName);
    } catch (error) {
      console.error("Failed to sync profile name to server:", error);
      // Keep local update even if server sync fails
    } finally {
      setIsSavingName(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSaveName();
    else if (e.key === "Escape") {
      setIsEditingName(false);
      setEditNameValue(userInfo.name);
    }
  };

  const userInitials = userInfo.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      {/* Backdrop for mobile — sits below sidebar but above content */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[199] md:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-[200] md:relative md:z-auto md:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col border-r border-white/[0.05] min-h-screen shrink-0 bg-[#0d1117] ${
          mobileOpen ? "translate-x-0 shadow-2xl shadow-black/60" : "-translate-x-full"
        } ${
          collapsed ? "md:w-[68px]" : "md:w-[240px]"
        } w-[240px]`}
        style={{ background: "#0d1117" }}
      >
        {/* Subtle top gradient line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />

        {/* Toggle button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-7 z-20 hidden md:flex h-6 w-6 items-center justify-center rounded-full bg-[#1F2937] border border-white/10 text-gray-400 hover:text-white hover:border-violet-500/40 hover:shadow-[0_0_12px_rgba(139,92,246,0.3)] transition-all duration-200 shadow-lg"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          id="sidebar-toggle"
        >
          {collapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </button>

      {/* Logo */}
      <div
        className={`flex items-center gap-3 px-4 py-5 border-b border-white/[0.05] ${
          collapsed ? "justify-center" : ""
        }`}
      >
        <div className="relative flex-shrink-0 h-8 w-8">
          <Image
            src="/logo.png"
            alt="VoiceFlow AI"
            fill
            className="object-contain"
            onError={() => {}}
          />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-[13px] font-bold text-white leading-tight tracking-tight">
              VoiceFlow
              <span className="gradient-text-purple"> AI</span>
            </p>
            <div className="flex items-center gap-1 mt-0.5">
              <Sparkles className="h-2.5 w-2.5 text-violet-400" />
              <p className="text-[10px] text-violet-400/80 font-medium tracking-wide">
                AI Sales Platform
              </p>
            </div>
            <p className="text-[9px] text-slate-600 mt-0.5 tracking-wide">
              by <span className="text-slate-500 font-semibold">Bharath Moogi</span>
              <span className="text-violet-500/60 ml-1">· Founder</span>
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2.5 py-3 space-y-5 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.label}>
            {!collapsed && (
              <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-600 select-none">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-violet-600/15 text-white nav-active-glow border border-violet-500/20"
                        : "text-gray-500 hover:text-gray-200 hover:bg-white/[0.04] border border-transparent"
                    } ${collapsed ? "justify-center" : ""}`}
                    id={`nav-${item.label.toLowerCase().replace(/\s/g, "-")}`}
                    onClick={onMobileClose}
                  >
                    {/* Active left bar */}
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-gradient-to-b from-violet-400 to-violet-600 rounded-r-full" />
                    )}

                    <Icon
                      className={`h-4 w-4 flex-shrink-0 transition-all duration-200 ${
                        isActive
                          ? "text-violet-400"
                          : "text-gray-600 group-hover:text-gray-300"
                      }`}
                    />

                    {!collapsed && (
                      <span className="truncate">{item.label}</span>
                    )}

                    {/* Active dot */}
                    {isActive && !collapsed && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-violet-400 flex-shrink-0" />
                    )}

                    {/* Tooltip (collapsed) */}
                    {collapsed && (
                      <div className="tooltip pointer-events-none absolute left-full ml-3 px-2.5 py-1.5 bg-[#1F2937] border border-white/10 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap z-50 shadow-2xl">
                        {item.label}
                        <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#1F2937]" />
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Profile + Logout */}
      <div className="px-2.5 py-3 border-t border-white/[0.05] space-y-1">
        {/* Profile */}
        <div
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl group/profile ${
            collapsed ? "justify-center" : ""
          }`}
        >
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-violet-600 via-purple-500 to-blue-500 flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-violet-500/20 flex-shrink-0">
              {userInitials || <User className="h-4 w-4" />}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-[#0d1117]" />
          </div>

          {!collapsed && (
            <div className="overflow-hidden flex-1 flex items-center justify-between">
              <div className="overflow-hidden flex-1">
                {isEditingName ? (
                  <div className="flex items-center gap-1">
                    <input
                      autoFocus
                      type="text"
                      className="text-xs font-semibold text-white bg-[#1F2937] border border-violet-500/40 rounded-lg px-2 py-0.5 w-full focus:outline-none premium-input transition-all"
                      value={editNameValue}
                      onChange={(e) => setEditNameValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={isSavingName}
                    />
                    <button
                      onClick={handleSaveName}
                      disabled={isSavingName}
                      className="text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingName(false);
                        setEditNameValue(userInfo.name);
                      }}
                      disabled={isSavingName}
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <p className="text-[13px] font-semibold text-white truncate">
                        {userInfo.name}
                      </p>
                      <button
                        onClick={() => {
                          setEditNameValue(userInfo.name);
                          setIsEditingName(true);
                        }}
                        className="opacity-0 group-hover/profile:opacity-100 transition-opacity text-gray-600 hover:text-gray-300 ml-2"
                        aria-label="Edit profile name"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                    </div>
                    <p className="text-[11px] text-gray-600 truncate">{userInfo.email}</p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          id="logout-btn"
          className={`w-full group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-gray-600 hover:text-red-400 hover:bg-red-500/[0.08] border border-transparent hover:border-red-500/10 transition-all duration-200 disabled:opacity-50 ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <LogOut className="h-4 w-4 flex-shrink-0 transition-colors group-hover:text-red-400" />
          {!collapsed && (
            <span>{loggingOut ? "Logging out…" : "Sign out"}</span>
          )}
        </button>
      </div>
    </aside>
  </>
);
};
