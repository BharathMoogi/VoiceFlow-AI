"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronRight, Sparkles, Zap, Menu } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";

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

  return (
    <div className="flex min-h-screen text-white" style={{ background: "#030712" }}>
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
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-violet-600/20 to-blue-600/20 border border-violet-500/20 hover:border-violet-500/40 hover:from-violet-600/30 hover:to-blue-600/30 transition-all duration-200 group"
            >
              <Sparkles className="h-3 w-3 text-violet-400 group-hover:text-violet-300" />
              <span className="text-[11px] font-semibold text-violet-300 group-hover:text-violet-200">
                Pro Plan
              </span>
            </Link>

            {/* Notification bell */}
            <button
              id="notifications-btn"
              className="relative p-2 rounded-xl text-gray-500 hover:text-white hover:bg-white/[0.05] border border-transparent hover:border-white/[0.08] transition-all duration-200"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-violet-500 ring-2 ring-[#030712]" />
            </button>

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
