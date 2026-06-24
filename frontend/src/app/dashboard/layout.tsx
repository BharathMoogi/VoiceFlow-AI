"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronRight, Sparkles, Zap, Menu } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { getUserInfo } from "@/lib/api";


function getBreadcrumbs(pathname: string) {
  const segments = pathname.replace("/dashboard", "").split("/").filter(Boolean);
  const crumbs = [{ label: "Dashboard", href: "/dashboard" }];
  let path = "/dashboard";
  for (const seg of segments) {
    path += `/${seg}`;
    crumbs.push({
      label: seg.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      href: path,
    });
  }
  return crumbs;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const crumbs = getBreadcrumbs(pathname);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [hasNotifications, setHasNotifications] = useState(true);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [isPro, setIsPro] = useState(false);

  useEffect(() => {
    // 1. Initial theme load
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme === "light") {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    } else {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    }

    // 2. Initial notifications load
    const storedNotifications = localStorage.getItem("notifications");
    setHasNotifications(storedNotifications !== "false");

    // 2.5. Initial plan load
    const stored = getUserInfo();
    setIsPro(stored.plan === "pro");

    // 3. Listeners
    const handleThemeChange = () => {};
    const handleNotificationsChange = (e: any) => {
      setHasNotifications(e.detail);
    };
    const handlePlanChange = (e: any) => {
      setIsPro(e.detail === "pro");
    };

    window.addEventListener("themeChanged", handleThemeChange);
    window.addEventListener("notificationsChanged", handleNotificationsChange);
    window.addEventListener("planChanged", handlePlanChange);
    return () => {
      window.removeEventListener("themeChanged", handleThemeChange);
      window.removeEventListener("notificationsChanged", handleNotificationsChange);
      window.removeEventListener("planChanged", handlePlanChange);
    };
  }, []);


  return (
    <div className="flex min-h-screen text-foreground bg-background transition-colors duration-200">

      {/* Background ambient orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] orb-purple opacity-40 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-32 w-[500px] h-[500px] orb-blue opacity-30 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] orb-green opacity-20 rounded-full blur-3xl" />
        {/* Dot grid overlay */}
        <div className="absolute inset-0 dot-grid opacity-30" />
      </div>

      {/* Sidebar */}
      <div>
        <Sidebar mobileOpen={mobileSidebarOpen} onMobileClose={() => setMobileSidebarOpen(false)} />
      </div>

      {/* Main column */}
      <div className="relative z-10 flex-1 flex flex-col min-w-0">
        {/* Top header */}
        <header className="flex items-center justify-between px-6 py-3.5 border-b border-white/[0.05] sticky top-0 z-30 glass">
          <div className="flex items-center">
            {/* Hamburger button for mobile */}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="p-2 -ml-2 mr-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/[0.05] md:hidden transition-all duration-200"
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Breadcrumbs */}
            <nav className="flex items-center gap-1.5 text-sm">
            {crumbs.map((crumb, i) => (
              <React.Fragment key={crumb.href}>
                {i > 0 && (
                  <ChevronRight className="h-3.5 w-3.5 text-gray-700 flex-shrink-0" />
                )}
                {i === crumbs.length - 1 ? (
                  <span className="text-white font-semibold text-[13px]">
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="text-gray-500 hover:text-gray-300 transition-colors font-medium text-[13px]"
                  >
                    {crumb.label}
                  </Link>
                )}
              </React.Fragment>
            ))}
          </nav>
        </div>

          {/* Right controls */}
          <div className="flex items-center gap-2.5">
            {/* Upgrade badge */}
            <Link
              href="/dashboard/settings"
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all duration-200 group ${
                isPro 
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:border-emerald-500/40" 
                  : "bg-gradient-to-r from-violet-600/20 to-blue-600/20 border-violet-500/20 hover:border-violet-500/40 hover:from-violet-600/30 hover:to-blue-600/30 text-violet-300"
              }`}
            >
              <Sparkles className={`h-3 w-3 ${isPro ? "text-emerald-400" : "text-violet-400 group-hover:text-violet-300"}`} />
              <span className="text-[11px] font-semibold">
                {isPro ? "Pro Plan Active" : "Upgrade to Pro"}
              </span>
            </Link>


            {/* Notification bell */}
            <div className="relative">
              <button
                id="notifications-btn"
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                className="relative p-2 rounded-xl text-gray-500 hover:text-white hover:bg-white/[0.05] border border-transparent hover:border-white/[0.08] transition-all duration-200"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                {hasNotifications && (
                  <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-violet-500 ring-2 ring-background animate-pulse" />
                )}
              </button>

              {showNotifDropdown && (
                <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-2xl shadow-2xl p-4 z-50 animate-scale-up text-left">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
                    <span className="text-xs font-bold text-foreground">Notifications</span>
                    <button 
                      onClick={() => setHasNotifications(false)}
                      className="text-[10px] text-violet-400 hover:text-violet-300 font-bold"
                    >
                      Clear All
                    </button>
                  </div>
                  {hasNotifications ? (
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      <div className="flex items-start gap-2.5 p-1 rounded-lg hover:bg-white/[0.03]">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-foreground">Outbound Call Success</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">Campaign "Follow Up Call" reached 3 contacts.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5 p-1 rounded-lg hover:bg-white/[0.03]">
                        <span className="h-2 w-2 rounded-full bg-violet-400 mt-1.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-foreground">Voice Transcription Complete</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">Audio memo converted to email draft.</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground text-center py-4">No new notifications</p>
                  )}
                </div>
              )}
            </div>


            {/* Status badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 glow-green flex-shrink-0" />
              <span className="text-[11px] font-semibold text-emerald-400">
                AI Online
              </span>
            </div>

            {/* AI model indicator */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/[0.07] border border-blue-500/15">
              <Zap className="h-3 w-3 text-blue-400" />
              <span className="text-[11px] font-semibold text-blue-400">GPT-4o</span>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
